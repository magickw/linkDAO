import { db } from '../../db';
import {
  disputes,
  disputeEvidence,
  orders,
  users,
} from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { safeLogger } from '../../utils/safeLogger';
import { orderEventEmitterService } from './orderEventEmitterService';
import { webhookTriggerService } from './webhookTriggerService';

interface CreateDisputeInput {
  escrowId: string;
  reporterId: string;
  reason: string;
  orderId?: string;
}

interface AddEvidenceInput {
  disputeId: number;
  submitterId: string;
  evidenceType: string;
  ipfsHash: string;
  description?: string;
}

interface ResolveDisputeInput {
  disputeId: number;
  resolution: string;
  resolutionDetails?: string;
}

/**
 * Service for managing dispute resolution workflow
 * Uses existing disputes table from main schema
 */
class DisputeResolutionService {
  /**
   * Create a new dispute
   */
  async createDispute(input: CreateDisputeInput): Promise<number> {
    try {
      // Create dispute
      const [dispute] = await db
        .insert(disputes)
        .values({
          escrowId: input.escrowId as any,
          reporterId: input.reporterId as any,
          reason: input.reason,
          status: 'open',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: disputes.id });

      safeLogger.info(
        `Created dispute ${dispute.id} by ${input.reporterId}`
      );

      // Emit dispute initiated event if we have orderId
      if (input.orderId) {
        try {
          await orderEventEmitterService.emitDisputeInitiated(
            input.orderId,
            dispute.id,
            input.reporterId,
            input.reason
          );
        } catch (error) {
          safeLogger.warn('Error emitting dispute initiated event:', error);
        }
      }

      return dispute.id;
    } catch (error) {
      safeLogger.error('Error creating dispute:', error);
      throw error;
    }
  }

  /**
   * Add evidence to a dispute
   */
  async addEvidence(input: AddEvidenceInput): Promise<void> {
    try {
      // Verify dispute exists
      const [dispute] = await db
        .select()
        .from(disputes)
        .where(eq(disputes.id, input.disputeId))
        .limit(1);

      if (!dispute) {
        throw new Error(`Dispute ${input.disputeId} not found`);
      }

      // Add evidence
      await db.insert(disputeEvidence).values({
        disputeId: input.disputeId as any,
        submitterId: input.submitterId as any,
        evidenceType: input.evidenceType,
        ipfsHash: input.ipfsHash,
        description: input.description,
        timestamp: new Date(),
      });

      safeLogger.info(
        `Added ${input.evidenceType} evidence to dispute ${input.disputeId}`
      );
    } catch (error) {
      safeLogger.error('Error adding evidence:', error);
      throw error;
    }
  }

  /**
   * Get dispute details with evidence
   */
  async getDisputeDetails(disputeId: number): Promise<any> {
    try {
      // Get dispute
      const [dispute] = await db
        .select()
        .from(disputes)
        .where(eq(disputes.id, disputeId))
        .limit(1);

      if (!dispute) {
        throw new Error(`Dispute ${disputeId} not found`);
      }

      // Get evidence
      const evidence = await db
        .select()
        .from(disputeEvidence)
        .where(eq(disputeEvidence.disputeId, disputeId));

      return {
        dispute,
        evidence,
      };
    } catch (error) {
      safeLogger.error('Error getting dispute details:', error);
      throw error;
    }
  }

  /**
   * Resolve a dispute
   */
  async resolveDispute(input: ResolveDisputeInput): Promise<void> {
    try {
      // Verify dispute exists
      const [dispute] = await db
        .select()
        .from(disputes)
        .where(eq(disputes.id, input.disputeId))
        .limit(1);

      if (!dispute) {
        throw new Error(`Dispute ${input.disputeId} not found`);
      }

      if (dispute.status !== 'open' && dispute.status !== 'in_review') {
        throw new Error(`Dispute ${input.disputeId} is already resolved`);
      }

      // Update dispute with resolution
      await db
        .update(disputes)
        .set({
          status: 'resolved',
          resolution: input.resolution,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(disputes.id, input.disputeId));

      safeLogger.info(
        `Resolved dispute ${input.disputeId} with resolution: ${input.resolution}`
      );
    } catch (error) {
      safeLogger.error('Error resolving dispute:', error);
      throw error;
    }
  }

  /**
   * Get all disputes with filtering
   */
  async getDisputes(status?: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      const conditions = status ? [eq(disputes.status, status)] : [];

      const allDisputes = await db
        .select()
        .from(disputes)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(disputes.createdAt))
        .limit(limit)
        .offset(offset);

      return allDisputes;
    } catch (error) {
      safeLogger.error('Error getting disputes:', error);
      throw error;
    }
  }
}

export const disputeResolutionService = new DisputeResolutionService();
