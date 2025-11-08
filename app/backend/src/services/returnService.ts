import { db } from '../db/index.ts';
import { 
  returns, 
  returnPolicies, 
  returnStatusHistory, 
  refundTransactions 
} from '../db/schema.ts';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { safeLogger } from '../utils/logger.ts';

export interface CreateReturnRequest {
  orderId: string;
  buyerId: string;
  sellerId: string;
  returnReason: string;
  returnReasonDetails?: string;
  itemsToReturn: Array<{
    itemId: string;
    quantity: number;
    reason: string;
    photos?: string[];
  }>;
  originalAmount: number;
}

export interface RefundRequest {
  returnId: string;
  amount?: number;
  reason?: string;
  refundMethod: 'original_payment' | 'store_credit' | 'exchange';
}

class ReturnService {
  /**
   * Create a new return request with risk assessment
   */
  async createReturn(request: CreateReturnRequest): Promise<any> {
    try {
      // Check if return policy allows returns
      const [policy] = await db
        .select()
        .from(returnPolicies)
        .where(eq(returnPolicies.sellerId, request.sellerId));

      if (policy && !policy.acceptsReturns) {
        throw new Error('Seller does not accept returns');
      }

      // Calculate risk score (simplified implementation)
      const riskScore = this.calculateRiskScore(request);
      const riskLevel = riskScore < 30 ? 'low' : riskScore < 70 ? 'medium' : 'high';
      const requiresManualReview = riskScore > 50;

      // Determine initial status
      let initialStatus = 'requested';
      if (riskLevel === 'low' && policy?.autoApproveLowRisk) {
        initialStatus = 'approved';
      }

      // Create return record
      const returnRecord = {
        id: uuidv4(),
        orderId: request.orderId,
        buyerId: request.buyerId,
        sellerId: request.sellerId,
        returnReason: request.returnReason,
        returnReasonDetails: request.returnReasonDetails,
        itemsToReturn: JSON.stringify(request.itemsToReturn),
        status: initialStatus,
        originalAmount: request.originalAmount,
        riskScore,
        riskLevel,
        requiresManualReview,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const [newReturn] = await db
        .insert(returns)
        .values(returnRecord)
        .returning();

      // Add status history
      await this.addStatusHistory(newReturn.id, null, initialStatus, 'Return created');

      safeLogger.info(`Return request created: ${newReturn.id}`);
      return this.formatReturnResponse(newReturn);
    } catch (error) {
      safeLogger.error('Error creating return request:', error);
      throw error;
    }
  }

  /**
   * Get a specific return by ID
   */
  async getReturn(returnId: string): Promise<any> {
    try {
      const [returnRecord] = await db
        .select()
        .from(returns)
        .where(eq(returns.id, returnId));

      if (!returnRecord) {
        throw new Error('Return not found');
      }

      return this.formatReturnResponse(returnRecord);
    } catch (error) {
      safeLogger.error('Error fetching return:', error);
      throw error;
    }
  }

  /**
   * Get returns for a user (buyer or seller)
   */
  async getReturnsForUser(
    userId: string, 
    role: 'buyer' | 'seller', 
    limit: number = 20, 
    offset: number = 0
  ): Promise<any[]> {
    try {
      const condition = role === 'buyer' 
        ? eq(returns.buyerId, userId) 
        : eq(returns.sellerId, userId);

      const returnRecords = await db
        .select()
        .from(returns)
        .where(condition)
        .orderBy(desc(returns.createdAt))
        .limit(limit)
        .offset(offset);

      return returnRecords.map(this.formatReturnResponse);
    } catch (error) {
      safeLogger.error('Error fetching user returns:', error);
      throw error;
    }
  }

  /**
   * Approve a return request
   */
  async approveReturn(returnId: string, approverId: string, notes?: string): Promise<void> {
    try {
      const [returnRecord] = await db
        .update(returns)
        .set({
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: approverId,
          updatedAt: new Date()
        })
        .where(eq(returns.id, returnId))
        .returning();

      if (!returnRecord) {
        throw new Error('Return not found');
      }

      // Add status history
      await this.addStatusHistory(returnId, 'requested', 'approved', notes || 'Return approved');

      safeLogger.info(`Return approved: ${returnId} by ${approverId}`);
    } catch (error) {
      safeLogger.error('Error approving return:', error);
      throw error;
    }
  }

  /**
   * Reject a return request
   */
  async rejectReturn(returnId: string, rejectorId: string, reason: string): Promise<void> {
    try {
      const [returnRecord] = await db
        .update(returns)
        .set({
          status: 'rejected',
          rejectedAt: new Date(),
          rejectedBy: rejectorId,
          rejectionReason: reason,
          updatedAt: new Date()
        })
        .where(eq(returns.id, returnId))
        .returning();

      if (!returnRecord) {
        throw new Error('Return not found');
      }

      // Add status history
      await this.addStatusHistory(returnId, 'requested', 'rejected', reason);

      safeLogger.info(`Return rejected: ${returnId} by ${rejectorId}`);
    } catch (error) {
      safeLogger.error('Error rejecting return:', error);
      throw error;
    }
  }

  /**
   * Process a refund for a return
   */
  async processRefund(request: RefundRequest): Promise<any> {
    try {
      // Get return details
      const [returnRecord] = await db
        .select()
        .from(returns)
        .where(eq(returns.id, request.returnId));

      if (!returnRecord) {
        throw new Error('Return not found');
      }

      // Determine refund amount
      const refundAmount = request.amount || returnRecord.originalAmount;

      // Validate refund amount
      if (refundAmount > returnRecord.originalAmount) {
        throw new Error('Refund amount cannot exceed original amount');
      }

      // Update return status
      await db
        .update(returns)
        .set({
          refundAmount,
          refundMethod: request.refundMethod,
          refundStatus: 'processing',
          updatedAt: new Date()
        })
        .where(eq(returns.id, request.returnId));

      // Create refund transaction record
      const refundTransaction = {
        id: uuidv4(),
        returnId: request.returnId,
        orderId: returnRecord.orderId,
        amount: refundAmount,
        currency: 'USD', // In a real implementation, this would come from the order
        refundType: 'full',
        provider: 'stripe', // In a real implementation, this would be determined dynamically
        status: 'pending',
        initiatedAt: new Date(),
        metadata: JSON.stringify({
          reason: request.reason,
          refundMethod: request.refundMethod
        })
      };

      const [newTransaction] = await db
        .insert(refundTransactions)
        .values(refundTransaction)
        .returning();

      // Add status history
      await this.addStatusHistory(
        request.returnId, 
        returnRecord.status, 
        'refund_processing', 
        `Refund initiated for ${refundAmount}`
      );

      safeLogger.info(`Refund processing started for return: ${request.returnId}`);
      return {
        id: newTransaction.id,
        status: 'pending',
        amount: refundAmount,
        currency: 'USD'
      };
    } catch (error) {
      safeLogger.error('Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Add entry to return status history
   */
  private async addStatusHistory(
    returnId: string,
    fromStatus: string | null,
    toStatus: string,
    notes?: string
  ): Promise<void> {
    try {
      await db.insert(returnStatusHistory).values({
        id: uuidv4(),
        returnId,
        fromStatus,
        toStatus,
        notes,
        createdAt: new Date()
      });
    } catch (error) {
      safeLogger.error('Error adding status history:', error);
    }
  }

  /**
   * Calculate risk score for a return request (simplified implementation)
   */
  private calculateRiskScore(request: CreateReturnRequest): number {
    let score = 0;

    // Higher amounts = higher risk
    if (request.originalAmount > 1000) {
      score += 30;
    } else if (request.originalAmount > 500) {
      score += 15;
    }

    // Certain reasons may indicate higher risk
    if (request.returnReason === 'changed_mind') {
      score += 10;
    }

    // Multiple items = higher risk
    if (request.itemsToReturn.length > 3) {
      score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Format return response to parse JSON fields
   */
  private formatReturnResponse(returnRecord: any): any {
    return {
      ...returnRecord,
      itemsToReturn: returnRecord.itemsToReturn ? JSON.parse(returnRecord.itemsToReturn) : [],
      riskFactors: returnRecord.riskFactors ? JSON.parse(returnRecord.riskFactors) : []
    };
  }
}

export const returnService = new ReturnService();