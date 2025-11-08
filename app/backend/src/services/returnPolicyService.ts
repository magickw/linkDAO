import { db } from '../db/index.js';
import { returnPolicies } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { safeLogger } from '../utils/logger.js';

export interface ReturnPolicyData {
  sellerId: string;
  acceptsReturns?: boolean;
  returnWindowDays?: number;
  extendedReturnWindowDays?: number;
  restockingFeePercentage?: number;
  restockingFeeAppliesTo?: string[];
  requiresOriginalPackaging?: boolean;
  requiresUnusedCondition?: boolean;
  requiresTagsAttached?: boolean;
  buyerPaysReturnShipping?: boolean;
  freeReturnShippingThreshold?: number;
  nonReturnableCategories?: string[];
  nonReturnableItems?: string[];
  finalSaleItems?: string[];
  offersStoreCredit?: boolean;
  storeCreditBonusPercentage?: number;
  offersExchanges?: boolean;
  policyTitle?: string;
  policyText: string;
  policyHighlights?: string[];
  autoApproveLowRisk?: boolean;
  autoApproveThresholdAmount?: number;
  requirePhotos?: boolean;
}

class ReturnPolicyService {
  async upsertReturnPolicy(policyData: ReturnPolicyData): Promise<any> {
    try {
      const [existingPolicy] = await db
        .select()
        .from(returnPolicies)
        .where(eq(returnPolicies.sellerId, policyData.sellerId));

      const policyRecord = {
        sellerId: policyData.sellerId,
        acceptsReturns: policyData.acceptsReturns ?? true,
        returnWindowDays: policyData.returnWindowDays ?? 30,
        extendedReturnWindowDays: policyData.extendedReturnWindowDays,
        restockingFeePercentage: policyData.restockingFeePercentage?.toString() ?? '0',
        restockingFeeAppliesTo: policyData.restockingFeeAppliesTo ? JSON.stringify(policyData.restockingFeeAppliesTo) : null,
        requiresOriginalPackaging: policyData.requiresOriginalPackaging ?? true,
        requiresUnusedCondition: policyData.requiresUnusedCondition ?? true,
        requiresTagsAttached: policyData.requiresTagsAttached ?? false,
        buyerPaysReturnShipping: policyData.buyerPaysReturnShipping ?? true,
        freeReturnShippingThreshold: policyData.freeReturnShippingThreshold?.toString(),
        nonReturnableCategories: policyData.nonReturnableCategories ? JSON.stringify(policyData.nonReturnableCategories) : null,
        nonReturnableItems: policyData.nonReturnableItems ? JSON.stringify(policyData.nonReturnableItems) : null,
        finalSaleItems: policyData.finalSaleItems ? JSON.stringify(policyData.finalSaleItems) : null,
        offersStoreCredit: policyData.offersStoreCredit ?? false,
        storeCreditBonusPercentage: policyData.storeCreditBonusPercentage?.toString() ?? '0',
        offersExchanges: policyData.offersExchanges ?? true,
        policyTitle: policyData.policyTitle ?? 'Return Policy',
        policyText: policyData.policyText,
        policyHighlights: policyData.policyHighlights ? JSON.stringify(policyData.policyHighlights) : null,
        autoApproveLowRisk: policyData.autoApproveLowRisk ?? false,
        autoApproveThresholdAmount: policyData.autoApproveThresholdAmount?.toString(),
        requirePhotos: policyData.requirePhotos ?? true,
        isActive: true,
        updatedAt: new Date()
      };

      if (existingPolicy) {
        const [updatedPolicy] = await db
          .update(returnPolicies)
          .set(policyRecord)
          .where(eq(returnPolicies.sellerId, policyData.sellerId))
          .returning();

        safeLogger.info(`Return policy updated for seller: ${policyData.sellerId}`);
        return this.formatPolicyResponse(updatedPolicy);
      } else {
        const newPolicyRecord = {
          id: uuidv4(),
          ...policyRecord,
          createdAt: new Date()
        };

        const [newPolicy] = await db
          .insert(returnPolicies)
          .values(newPolicyRecord)
          .returning();

        safeLogger.info(`Return policy created for seller: ${policyData.sellerId}`);
        return this.formatPolicyResponse(newPolicy);
      }
    } catch (error) {
      safeLogger.error('Error upserting return policy:', error);
      throw error;
    }
  }

  async getReturnPolicy(sellerId: string): Promise<any> {
    try {
      const [policy] = await db
        .select()
        .from(returnPolicies)
        .where(eq(returnPolicies.sellerId, sellerId));

      if (!policy) {
        return this.getDefaultPolicy(sellerId);
      }

      return this.formatPolicyResponse(policy);
    } catch (error) {
      safeLogger.error('Error fetching return policy:', error);
      throw error;
    }
  }

  private formatPolicyResponse(policy: any): any {
    return {
      ...policy,
      restockingFeeAppliesTo: policy.restockingFeeAppliesTo ? JSON.parse(policy.restockingFeeAppliesTo) : [],
      nonReturnableCategories: policy.nonReturnableCategories ? JSON.parse(policy.nonReturnableCategories) : [],
      nonReturnableItems: policy.nonReturnableItems ? JSON.parse(policy.nonReturnableItems) : [],
      finalSaleItems: policy.finalSaleItems ? JSON.parse(policy.finalSaleItems) : [],
      policyHighlights: policy.policyHighlights ? JSON.parse(policy.policyHighlights) : []
    };
  }

  private getDefaultPolicy(sellerId: string): any {
    return {
      id: null,
      sellerId,
      acceptsReturns: true,
      returnWindowDays: 30,
      restockingFeePercentage: '0',
      requiresOriginalPackaging: true,
      requiresUnusedCondition: true,
      buyerPaysReturnShipping: true,
      offersExchanges: true,
      policyTitle: 'Standard Return Policy',
      policyText: '30-day return window for unused items in original packaging.',
      isActive: true
    };
  }
}

export const returnPolicyService = new ReturnPolicyService();
