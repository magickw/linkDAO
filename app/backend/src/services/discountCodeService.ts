/**
 * Discount Code Service
 *
 * Handles discount code validation and application with database integration
 */

import { db } from '../db';
import { discountCodes } from '../db/schema';
import { eq, and, gte, lte, or, isNull } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

export interface DiscountCode {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'shipping';
  value: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  startDate?: Date;
  endDate?: Date;
  usageLimit?: number;
  usageCount: number;
  perUserLimit?: number;
  applicableProducts?: string[];
  applicableCategories?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DiscountValidationResult {
  valid: boolean;
  discount?: {
    code: string;
    type: 'percentage' | 'fixed' | 'shipping';
    amount: number;
    appliedTo: 'subtotal' | 'shipping' | 'total';
  };
  error?: string;
  errorCode?:
    | 'INVALID_CODE'
    | 'EXPIRED'
    | 'NOT_STARTED'
    | 'USAGE_LIMIT_REACHED'
    | 'USER_LIMIT_REACHED'
    | 'MIN_PURCHASE_NOT_MET'
    | 'NOT_APPLICABLE_TO_ITEMS'
    | 'INACTIVE';
}

export class DiscountCodeService {
  /**
   * Validate and apply discount code
   */
  async validateDiscountCode(
    code: string,
    userId: string,
    orderDetails: {
      subtotal: number;
      shipping: number;
      items: Array<{ productId: string; category?: string; price: number; quantity: number }>;
    }
  ): Promise<DiscountValidationResult> {
    try {
      // Fetch discount code from database
      const [discountCode] = await db
        .select()
        .from(discountCodes)
        .where(eq(discountCodes.code, code.toUpperCase()))
        .limit(1);

      if (!discountCode) {
        return {
          valid: false,
          error: 'Invalid discount code',
          errorCode: 'INVALID_CODE'
        };
      }

      // Check if active
      if (!discountCode.isActive) {
        return {
          valid: false,
          error: 'This discount code is no longer active',
          errorCode: 'INACTIVE'
        };
      }

      // Check date validity
      const now = new Date();
      if (discountCode.startDate && now < new Date(discountCode.startDate)) {
        return {
          valid: false,
          error: 'This discount code is not yet valid',
          errorCode: 'NOT_STARTED'
        };
      }

      if (discountCode.endDate && now > new Date(discountCode.endDate)) {
        return {
          valid: false,
          error: 'This discount code has expired',
          errorCode: 'EXPIRED'
        };
      }

      // Check usage limits
      if (discountCode.usageLimit && discountCode.usageCount >= discountCode.usageLimit) {
        return {
          valid: false,
          error: 'This discount code has reached its usage limit',
          errorCode: 'USAGE_LIMIT_REACHED'
        };
      }

      // Check per-user limit
      if (discountCode.perUserLimit) {
        const userUsageCount = await this.getUserDiscountUsageCount(discountCode.id, userId);
        if (userUsageCount >= discountCode.perUserLimit) {
          return {
            valid: false,
            error: 'You have already used this discount code the maximum number of times',
            errorCode: 'USER_LIMIT_REACHED'
          };
        }
      }

      // Check minimum purchase amount
      if (discountCode.minPurchaseAmount && orderDetails.subtotal < discountCode.minPurchaseAmount) {
        return {
          valid: false,
          error: `Minimum purchase amount of $${discountCode.minPurchaseAmount} required`,
          errorCode: 'MIN_PURCHASE_NOT_MET'
        };
      }

      // Check applicable products/categories
      if (discountCode.applicableProducts && discountCode.applicableProducts.length > 0) {
        const hasApplicableProduct = orderDetails.items.some(item =>
          discountCode.applicableProducts!.includes(item.productId)
        );
        if (!hasApplicableProduct) {
          return {
            valid: false,
            error: 'This discount code does not apply to any items in your cart',
            errorCode: 'NOT_APPLICABLE_TO_ITEMS'
          };
        }
      }

      if (discountCode.applicableCategories && discountCode.applicableCategories.length > 0) {
        const hasApplicableCategory = orderDetails.items.some(item =>
          item.category && discountCode.applicableCategories!.includes(item.category)
        );
        if (!hasApplicableCategory) {
          return {
            valid: false,
            error: 'This discount code does not apply to any items in your cart',
            errorCode: 'NOT_APPLICABLE_TO_ITEMS'
          };
        }
      }

      // Calculate discount amount
      let discountAmount = 0;
      let appliedTo: 'subtotal' | 'shipping' | 'total' = 'subtotal';

      switch (discountCode.type) {
        case 'percentage':
          discountAmount = (orderDetails.subtotal * discountCode.value) / 100;
          if (discountCode.maxDiscountAmount) {
            discountAmount = Math.min(discountAmount, discountCode.maxDiscountAmount);
          }
          appliedTo = 'subtotal';
          break;

        case 'fixed':
          discountAmount = Math.min(discountCode.value, orderDetails.subtotal);
          appliedTo = 'subtotal';
          break;

        case 'shipping':
          discountAmount = orderDetails.shipping;
          appliedTo = 'shipping';
          break;
      }

      return {
        valid: true,
        discount: {
          code: discountCode.code,
          type: discountCode.type,
          amount: discountAmount,
          appliedTo
        }
      };
    } catch (error) {
      safeLogger.error('Error validating discount code:', error);
      return {
        valid: false,
        error: 'An error occurred while validating the discount code'
      };
    }
  }

  /**
   * Record discount code usage
   */
  async recordDiscountUsage(discountCodeId: string, userId: string, orderId: string): Promise<void> {
    try {
      // Increment usage count
      await db
        .update(discountCodes)
        .set({
          usageCount: db.$increment(discountCodes.usageCount, 1),
          updatedAt: new Date()
        })
        .where(eq(discountCodes.id, discountCodeId));

      // Record in usage history (assuming we have a discountCodeUsage table)
      // await db.insert(discountCodeUsage).values({
      //   discountCodeId,
      //   userId,
      //   orderId,
      //   usedAt: new Date()
      // });

      safeLogger.info(`Discount code ${discountCodeId} used by user ${userId} for order ${orderId}`);
    } catch (error) {
      safeLogger.error('Error recording discount usage:', error);
      throw error;
    }
  }

  /**
   * Get user's usage count for a specific discount code
   */
  private async getUserDiscountUsageCount(discountCodeId: string, userId: string): Promise<number> {
    try {
      // This would query a discountCodeUsage table
      // For now, return 0 as placeholder
      // const [result] = await db
      //   .select({ count: count() })
      //   .from(discountCodeUsage)
      //   .where(
      //     and(
      //       eq(discountCodeUsage.discountCodeId, discountCodeId),
      //       eq(discountCodeUsage.userId, userId)
      //     )
      //   );
      // return result?.count || 0;

      return 0;
    } catch (error) {
      safeLogger.error('Error getting user discount usage count:', error);
      return 0;
    }
  }

  /**
   * Create a new discount code (admin function)
   */
  async createDiscountCode(data: Omit<DiscountCode, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>): Promise<DiscountCode> {
    try {
      const [newCode] = await db
        .insert(discountCodes)
        .values({
          ...data,
          code: data.code.toUpperCase(),
          usageCount: 0
        })
        .returning();

      safeLogger.info(`Created discount code: ${newCode.code}`);
      return newCode as DiscountCode;
    } catch (error) {
      safeLogger.error('Error creating discount code:', error);
      throw error;
    }
  }

  /**
   * Deactivate a discount code
   */
  async deactivateDiscountCode(codeId: string): Promise<boolean> {
    try {
      await db
        .update(discountCodes)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(discountCodes.id, codeId));

      return true;
    } catch (error) {
      safeLogger.error('Error deactivating discount code:', error);
      return false;
    }
  }

  /**
   * Get active discount codes (for admin panel)
   */
  async getActiveDiscountCodes(): Promise<DiscountCode[]> {
    try {
      const codes = await db
        .select()
        .from(discountCodes)
        .where(eq(discountCodes.isActive, true));

      return codes as DiscountCode[];
    } catch (error) {
      safeLogger.error('Error fetching active discount codes:', error);
      return [];
    }
  }

  /**
   * Get discount code by ID
   */
  async getDiscountCodeById(id: string): Promise<DiscountCode | null> {
    try {
      const [code] = await db
        .select()
        .from(discountCodes)
        .where(eq(discountCodes.id, id))
        .limit(1);

      return code as DiscountCode || null;
    } catch (error) {
      safeLogger.error('Error fetching discount code:', error);
      return null;
    }
  }
}

export const discountCodeService = new DiscountCodeService();
