import { db } from '../db';
import { promoCodes, users } from '../db/schema';
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
        // If it's already a UUID, return it
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(sellerIdOrAddress)) {
            return sellerIdOrAddress;
        }

        // Otherwise assume it's a wallet address and look up the user
        const user = await db.query.users.findFirst({
            where: eq(users.walletAddress, sellerIdOrAddress),
            columns: { id: true }
        });

        if (!user) {
            throw new Error(`Seller not found for address: ${sellerIdOrAddress}`);
        }

        return user.id;
    }

    /**
     * Create a new promo code
     */
    async createPromoCode(input: CreatePromoCodeInput) {
        try {
            const sellerId = await this.resolveSellerId(input.sellerId);

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

            return newPromo;
        } catch (error) {
            safeLogger.error('Error creating promo code:', error);
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
            const resolvedSellerId = await this.resolveSellerId(sellerId);
            const codes = await db
                .select()
                .from(promoCodes)
                .where(eq(promoCodes.sellerId, resolvedSellerId))
                .orderBy(sql`${promoCodes.createdAt} DESC`);

            return codes;
        } catch (error) {
            safeLogger.error('Error fetching promo codes:', error);
            throw error;
        }
    }
}

export const promoCodeService = new PromoCodeService();
