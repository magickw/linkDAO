import { db } from '../db';
import { promoCodes } from '../db/schema';
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
     * Create a new promo code
     */
    async createPromoCode(input: CreatePromoCodeInput) {
        try {
            // Check if code already exists for this seller
            const existing = await db
                .select()
                .from(promoCodes)
                .where(and(eq(promoCodes.code, input.code), eq(promoCodes.sellerId, input.sellerId)))
                .limit(1);

            if (existing.length > 0) {
                throw new Error('Promo code already exists for this seller');
            }

            const [newPromo] = await db.insert(promoCodes).values({
                id: uuidv4(),
                ...input,
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
            // We search by code string first. 
            // Note: Codes might be duplicated across sellers, so we might need sellerId to distinguish
            // or we return all matching codes and filter.

            let query = db.select().from(promoCodes).where(eq(promoCodes.code, input.code));

            const potentialCodes = await query;

            if (potentialCodes.length === 0) {
                return { isValid: false, error: 'Promo code not found' };
            }

            // Filter based on context (seller/product)
            const validCode = potentialCodes.find(promo => {
                // 1. Check Seller ID match (if input sellerId provided)
                if (input.sellerId && promo.sellerId !== input.sellerId) return false;

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
                // Determine why it failed (simplified)
                const codeExists = potentialCodes.some(p => p.code === input.code);
                if (codeExists) {
                    // It existed but failed validation. 
                    // We could be more specific but "Invalid or expired" is safe.
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
        await db
            .update(promoCodes)
            .set({ usageCount: sql`${promoCodes.usageCount} + 1` })
            .where(and(eq(promoCodes.code, code), eq(promoCodes.sellerId, sellerId)));
    }

    /**
     * Get all promo codes for a seller
     */
    async getPromoCodes(sellerId: string) {
        try {
            const codes = await db
                .select()
                .from(promoCodes)
                .where(eq(promoCodes.sellerId, sellerId))
                .orderBy(sql`${promoCodes.createdAt} DESC`);

            return codes;
        } catch (error) {
            safeLogger.error('Error fetching promo codes:', error);
            throw error;
        }
    }
}

export const promoCodeService = new PromoCodeService();
