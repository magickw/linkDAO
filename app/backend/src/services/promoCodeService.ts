import { db } from '../db';
import { promoCodes, users, sellers } from '../db/schema';
import { eq, and, gte, lte, or, isNull, sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { v4 as uuidv4 } from 'uuid';

export interface CreatePromoCodeInput {
    code: string;
    sellerId: string;
    productId?: string;
    discountType: 'percentage' | 'fixed_amount';
    discountValue: number;
    minOrderAmount?: number;
    maxDiscountAmount?: number;
    startDate?: Date;
    endDate?: Date;
    usageLimit?: number;
}

export interface VerifyPromoCodeInput {
    code: string;
    sellerId?: string; // If validating for a specific seller's cart item
    productId?: string; // If validating for a specific product
    orderAmount: number;
}

export class PromoCodeService {
    /**
     * Helper to resolve seller ID (UUID) from wallet address if needed
     */
    private async resolveSellerId(sellerIdOrAddress: string): Promise<string> {
        safeLogger.info(`[PromoCodeService] Resolving seller ID for: ${sellerIdOrAddress}`);
        
        // If it's already a UUID, return it
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(sellerIdOrAddress)) {
            safeLogger.info(`[PromoCodeService] Already a UUID, returning: ${sellerIdOrAddress}`);
            return sellerIdOrAddress;
        }

        const normalizedAddress = sellerIdOrAddress.toLowerCase();
        safeLogger.info(`[PromoCodeService] Normalized address: ${normalizedAddress}`);

        // First, try to find the user in the users table
        const userResult = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.walletAddress, normalizedAddress))
            .limit(1);

        safeLogger.info(`[PromoCodeService] User table result count: ${userResult.length}`);
        
        if (userResult.length > 0) {
            safeLogger.info(`[PromoCodeService] Found user with ID: ${userResult[0].id}`);
            return userResult[0].id;
        }

        // If not found in users table, check if seller exists in sellers table
        const sellerResult = await db
            .select({ id: sellers.id, storeName: sellers.storeName })
            .from(sellers)
            .where(eq(sellers.walletAddress, normalizedAddress))
            .limit(1);

        safeLogger.info(`[PromoCodeService] Sellers table result count: ${sellerResult.length}`);

        if (sellerResult.length === 0) {
            safeLogger.error(`[PromoCodeService] Seller not found for address: ${sellerIdOrAddress}`);
            throw new Error(`Seller not found for address: ${sellerIdOrAddress}`);
        }

        const seller = sellerResult[0];
        safeLogger.info(`[PromoCodeService] Found seller with ID: ${seller.id}`);

        // Seller exists in sellers table but not in users table
        // Create a corresponding user record
        safeLogger.info(`[PromoCodeService] Creating user record for existing seller: ${normalizedAddress}`);
        const [newUser] = await db.insert(users).values({
            id: uuidv4(),
            walletAddress: normalizedAddress,
            displayName: seller.storeName || 'Seller',
            role: 'seller'
        }).returning();

        safeLogger.info(`[PromoCodeService] Created new user with ID: ${newUser.id}`);
        return newUser.id;
    }

    /**
     * Create a new promo code
     */
    async createPromoCode(input: CreatePromoCodeInput) {
        try {
            safeLogger.info(`[PromoCodeService] Creating promo code for sellerId: ${input.sellerId}`);
            const sellerId = await this.resolveSellerId(input.sellerId);
            safeLogger.info(`[PromoCodeService] Resolved sellerId to: ${sellerId}`);

            // Check if code already exists for this seller
            const existing = await db
                .select()
                .from(promoCodes)
                .where(and(eq(promoCodes.code, input.code), eq(promoCodes.sellerId, sellerId)))
                .limit(1);

            if (existing.length > 0) {
                throw new Error('Promo code already exists for this seller');
            }

            const [newPromo] = await db.insert(promoCodes).values({
                id: uuidv4(),
                ...input,
                sellerId, // Use resolved UUID
                discountValue: input.discountValue.toString(), // Convert to string for numeric
                minOrderAmount: input.minOrderAmount?.toString(),
                maxDiscountAmount: input.maxDiscountAmount?.toString(),
                usageCount: 0,
                isActive: true
            }).returning();

            safeLogger.info(`[PromoCodeService] Created promo code with ID: ${newPromo.id}`);
            return newPromo;
        } catch (error) {
            safeLogger.error('[PromoCodeService] Error creating promo code:', error);
            throw error;
        }
    }

    /**
     * Verify and return promo code details if valid
     */
    async verifyPromoCode(input: VerifyPromoCodeInput) {
        try {
            const now = new Date();

            // Find the promo code
            let query = db.select().from(promoCodes).where(eq(promoCodes.code, input.code));
            const potentialCodes = await query;

            if (potentialCodes.length === 0) {
                return { isValid: false, error: 'Promo code not found' };
            }

            // Resolve sellerId if provided
            let targetSellerId: string | undefined;
            if (input.sellerId) {
                try {
                    targetSellerId = await this.resolveSellerId(input.sellerId);
                } catch (e) {
                    // If seller not found, validation fails if code belongs to specific seller
                    // But here we can just ignore and let the loop fail
                }
            }

            // Filter based on context (seller/product)
            const validCode = potentialCodes.find(promo => {
                // 1. Check Seller ID match (if input sellerId provided)
                if (targetSellerId && promo.sellerId !== targetSellerId) return false;

                // 2. Check Product ID match (if promo is product-specific)
                if (promo.productId && promo.productId !== input.productId) return false;

                // 3. Check Active Status
                if (!promo.isActive) return false;

                // 4. Check Dates
                if (promo.startDate && new Date(promo.startDate) > now) return false;
                if (promo.endDate && new Date(promo.endDate) < now) return false;

                // 5. Check Usage Limit
                if (promo.usageLimit !== null && (promo.usageCount || 0) >= promo.usageLimit) return false;

                // 6. Check Min Order Amount
                if (promo.minOrderAmount && input.orderAmount < parseFloat(promo.minOrderAmount)) return false;

                return true;
            });

            if (!validCode) {
                const codeExists = potentialCodes.some(p => p.code === input.code);
                if (codeExists) {
                    return { isValid: false, error: 'Promo code is invalid, expired, or not applicable to this item' };
                }
                return { isValid: false, error: 'Promo code not found' };
            }

            // Calculate discount amount
            let discountAmount = 0;
            if (validCode.discountType === 'percentage') {
                discountAmount = (input.orderAmount * parseFloat(validCode.discountValue)) / 100;
            } else {
                discountAmount = parseFloat(validCode.discountValue);
            }

            // Apply max discount cap
            if (validCode.maxDiscountAmount && discountAmount > parseFloat(validCode.maxDiscountAmount)) {
                discountAmount = parseFloat(validCode.maxDiscountAmount);
            }

            // Ensure discount doesn't exceed order amount
            if (discountAmount > input.orderAmount) {
                discountAmount = input.orderAmount;
            }

            return {
                isValid: true,
                promoCode: {
                    code: validCode.code,
                    discountType: validCode.discountType,
                    discountValue: parseFloat(validCode.discountValue),
                    calculatedDiscount: discountAmount
                }
            };

        } catch (error) {
            safeLogger.error('Error verifying promo code:', error);
            throw error;
        }
    }

    /**
     * Track usage (should be called on checkout completion)
     */
    async trackUsage(code: string, sellerId: string) {
        const resolvedSellerId = await this.resolveSellerId(sellerId);
        await db
            .update(promoCodes)
            .set({ usageCount: sql`${promoCodes.usageCount} + 1` })
            .where(and(eq(promoCodes.code, code), eq(promoCodes.sellerId, resolvedSellerId)));
    }

    /**
     * Get all promo codes for a seller
     */
    async getPromoCodes(sellerId: string) {
        try {
            safeLogger.info(`[PromoCodeService] Fetching promo codes for sellerId: ${sellerId}`);
            const resolvedSellerId = await this.resolveSellerId(sellerId);
            safeLogger.info(`[PromoCodeService] Resolved sellerId to: ${resolvedSellerId}`);
            
            const codes = await db
                .select()
                .from(promoCodes)
                .where(eq(promoCodes.sellerId, resolvedSellerId))
                .orderBy(sql`${promoCodes.createdAt} DESC`);

            safeLogger.info(`[PromoCodeService] Found ${codes.length} promo codes`);
            return codes;
        } catch (error) {
            safeLogger.error('[PromoCodeService] Error fetching promo codes:', error);
            throw error;
        }
    }
}

export const promoCodeService = new PromoCodeService();
