/**
 * Discount Code Service
 *
 * Handles discount code validation and application with database integration
 */

import { db } from '../db';
import { promoCodes } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

// Mapping local interface to schema promoCodes
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
        .from(promoCodes)
        .where(eq(promoCodes.code, code.toUpperCase()))
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
      if (discountCode.usageLimit && (discountCode.usageCount || 0) >= discountCode.usageLimit) {
        return {
          valid: false,
          error: 'This discount code has reached its usage limit',
          errorCode: 'USAGE_LIMIT_REACHED'
        };
      }

      // Check minimum purchase amount
      const minAmount = discountCode.minOrderAmount ? parseFloat(discountCode.minOrderAmount.toString()) : 0;
      if (minAmount > 0 && orderDetails.subtotal < minAmount) {
        return {
          valid: false,
          error: `Minimum purchase amount of $${minAmount} required`,
          errorCode: 'MIN_PURCHASE_NOT_MET'
        };
      }

      // Calculate discount amount
      let discountAmount = 0;
      let appliedTo: 'subtotal' | 'shipping' | 'total' = 'subtotal';
      const value = parseFloat(discountCode.discountValue.toString());

      switch (discountCode.discountType) {
        case 'percentage':
          discountAmount = (orderDetails.subtotal * value) / 100;
          if (discountCode.maxDiscountAmount) {
            const max = parseFloat(discountCode.maxDiscountAmount.toString());
            discountAmount = Math.min(discountAmount, max);
          }
          appliedTo = 'subtotal';
          break;

        case 'fixed_amount':
          discountAmount = Math.min(value, orderDetails.subtotal);
          appliedTo = 'subtotal';
          break;

        case 'shipping': // Assuming schema supports this or mapping appropriately
          discountAmount = orderDetails.shipping;
          appliedTo = 'shipping';
          break;
      }

      return {
        valid: true,
        discount: {
          code: discountCode.code,
          type: discountCode.discountType === 'fixed_amount' ? 'fixed' : discountCode.discountType as any,
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
        .update(promoCodes)
        .set({
          usageCount: sql`${promoCodes.usageCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(promoCodes.id, discountCodeId));

      safeLogger.info(`Discount code ${discountCodeId} used by user ${userId} for order ${orderId}`);
    } catch (error) {
      safeLogger.error('Error recording discount usage:', error);
      throw error;
    }
  }
}

export const discountCodeService = new DiscountCodeService();