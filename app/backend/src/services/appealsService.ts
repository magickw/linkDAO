import { databaseService } from './databaseService';
import { moderationCases, moderationAppeals, appealJurors, moderationAuditLog, reputationHistory } from '../db/schema';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import { z } from 'zod';

// Types and interfaces
export interface AppealSubmission {
  caseId: number;
  appellantId: string;
  reasoning: string;
  stakeAmount: string;
  evidenceUrls?: string[];
  contactInfo?: string;
}

export interface AppealCase {
  id: number;
  caseId: number;
  appellantId: string;
  status: 'open' | 'jury_selection' | 'voting' | 'decided' | 'executed';
  stakeAmount: string;
  juryDecision?: 'uphold' | 'overturn' | 'partial';
  decisionCid?: string;
  createdAt: Date;
  reasoning?: string;
  evidenceUrls?: string[];
  originalCase?: {
    id: number;
    contentId: string;
    contentType: string;
    decision: string;
    reasonCode: string;
    confidence: number;
    evidenceCid?: string;
  };
}

export interface AppealStatusUpdate {
  appealId: number;
  status: 'open' | 'jury_selection' | 'voting' | 'decided' | 'executed';
  juryDecision?: 'uphold' | 'overturn' | 'partial';
  decisionCid?: string;
  executedBy?: string;
}

export interface StakeValidation {
  isValid: boolean;
  requiredStake: string;
  userBalance: string;
  reason?: string;
}

// Validation schemas
const AppealSubmissionSchema = z.object({
  caseId: z.number().positive(),
  appellantId: z.string().uuid(),
  reasoning: z.string().min(50).max(2000),
  stakeAmount: z.string().regex(/^\d+(\.\d{1,8})?$/),
  evidenceUrls: z.array(z.string().url()).optional(),
  contactInfo: z.string().email().optional()
});

const AppealStatusUpdateSchema = z.object({
  appealId: z.number().positive(),
  status: z.enum(['open', 'jury_selection', 'voting', 'decided', 'executed']),
  juryDecision: z.enum(['uphold', 'overturn', 'partial']).optional(),
  decisionCid: z.string().optional(),
  executedBy: z.string().optional()
});

export class AppealsService {
  private getDb() {
    return databaseService.getDatabase();
  }

  /**
   * Submit a new appeal for a moderation case
   */
  async submitAppeal(submission: AppealSubmission): Promise<{ success: boolean; appealId?: number; error?: string }> {
    try {
      // Validate input
      const validatedSubmission = AppealSubmissionSchema.parse(submission);

      // Check if case exists and is appealable
      const db = this.getDb();
      const moderationCase = await db
        .select()
        .from(moderationCases)
        .where(eq(moderationCases.id, validatedSubmission.caseId))
        .limit(1);

      if (moderationCase.length === 0) {
        return { success: false, error: 'Moderation case not found' };
      }

      const caseData = moderationCase[0];

      // Check if case is in appealable state
      if (!['blocked', 'quarantined'].includes(caseData.status || '')) {
        return { success: false, error: 'Case is not in an appealable state' };
      }

      // Check if user is the content owner
      if (caseData.userId !== validatedSubmission.appellantId) {
        return { success: false, error: 'Only content owner can appeal this case' };
      }

      // Check if appeal already exists
      const existingAppeal = await db
        .select()
        .from(moderationAppeals)
        .where(eq(moderationAppeals.caseId, validatedSubmission.caseId))
        .limit(1);

      if (existingAppeal.length > 0) {
        return { success: false, error: 'Appeal already exists for this case' };
      }

      // Validate stake amount
      const stakeValidation = await this.validateStakeAmount(
        validatedSubmission.appellantId,
        validatedSubmission.stakeAmount,
        caseData.decision || 'block'
      );

      if (!stakeValidation.isValid) {
        return { success: false, error: stakeValidation.reason || 'Invalid stake amount' };
      }

      // Create appeal record
      const appealResult = await db
        .insert(moderationAppeals)
        .values({
          caseId: validatedSubmission.caseId,
          appellantId: validatedSubmission.appellantId,
          status: 'open',
          stakeAmount: validatedSubmission.stakeAmount
        })
        .returning({ id: moderationAppeals.id });

      const appealId = appealResult[0].id;

      // Update moderation case status
      await db
        .update(moderationCases)
        .set({ 
          status: 'appealed',
          updatedAt: new Date()
        })
        .where(eq(moderationCases.id, validatedSubmission.caseId));

      // Log appeal submission in audit trail
      await this.logAppealActivity(
        appealId,
        'appeal_submitted',
        validatedSubmission.appellantId,
        {
          caseId: validatedSubmission.caseId,
          stakeAmount: validatedSubmission.stakeAmount,
          reasoning: validatedSubmission.reasoning,
          evidenceUrls: validatedSubmission.evidenceUrls
        }
      );

      // Store appeal evidence and reasoning (this would typically go to IPFS)
      await this.storeAppealEvidence(appealId, {
        reasoning: validatedSubmission.reasoning,
        evidenceUrls: validatedSubmission.evidenceUrls || [],
        submissionTimestamp: new Date(),
        appellantId: validatedSubmission.appellantId
      });

      return { success: true, appealId };
    } catch (error) {
      console.error('Error submitting appeal:', error);
      if (error instanceof z.ZodError) {
        return { success: false, error: 'Invalid appeal data: ' + error.errors.map(e => e.message).join(', ') };
      }
      return { success: false, error: 'Failed to submit appeal' };
    }
  }

  /**
   * Get appeal case details with original moderation case
   */
  async getAppealCase(appealId: number): Promise<AppealCase | null> {
    try {
      const db = this.getDb();
      const result = await db
        .select({
          appeal: moderationAppeals,
          originalCase: moderationCases
        })
        .from(moderationAppeals)
        .leftJoin(moderationCases, eq(moderationAppeals.caseId, moderationCases.id))
        .where(eq(moderationAppeals.id, appealId))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const { appeal, originalCase } = result[0];

      // Get appeal evidence (would typically be from IPFS)
      const evidence = await this.getAppealEvidence(appealId);

      return {
        id: appeal.id,
        caseId: appeal.caseId,
        appellantId: appeal.appellantId,
        status: appeal.status as any,
        stakeAmount: appeal.stakeAmount || '0',
        juryDecision: appeal.juryDecision as any,
        decisionCid: appeal.decisionCid || undefined,
        createdAt: appeal.createdAt || new Date(),
        reasoning: evidence?.reasoning,
        evidenceUrls: evidence?.evidenceUrls,
        originalCase: originalCase ? {
          id: originalCase.id,
          contentId: originalCase.contentId,
          contentType: originalCase.contentType,
          decision: originalCase.decision || 'unknown',
          reasonCode: originalCase.reasonCode || 'unknown',
          confidence: parseFloat(originalCase.confidence || '0'),
          evidenceCid: originalCase.evidenceCid || undefined
        } : undefined
      };
    } catch (error) {
      console.error('Error getting appeal case:', error);
      return null;
    }
  }

  /**
   * Update appeal status and workflow state
   */
  async updateAppealStatus(update: AppealStatusUpdate): Promise<{ success: boolean; error?: string }> {
    try {
      const validatedUpdate = AppealStatusUpdateSchema.parse(update);

      // Get current appeal
      const db = this.getDb();
      const currentAppeal = await db
        .select()
        .from(moderationAppeals)
        .where(eq(moderationAppeals.id, validatedUpdate.appealId))
        .limit(1);

      if (currentAppeal.length === 0) {
        return { success: false, error: 'Appeal not found' };
      }

      const appeal = currentAppeal[0];

      // Validate state transition
      const isValidTransition = this.isValidStatusTransition(
        appeal.status as any,
        validatedUpdate.status
      );

      if (!isValidTransition) {
        return { 
          success: false, 
          error: `Invalid status transition from ${appeal.status} to ${validatedUpdate.status}` 
        };
      }

      // Update appeal record
      const updateData: any = {
        status: validatedUpdate.status,
        updatedAt: new Date()
      };

      if (validatedUpdate.juryDecision) {
        updateData.juryDecision = validatedUpdate.juryDecision;
      }

      if (validatedUpdate.decisionCid) {
        updateData.decisionCid = validatedUpdate.decisionCid;
      }

      await db
        .update(moderationAppeals)
        .set(updateData)
        .where(eq(moderationAppeals.id, validatedUpdate.appealId));

      // Log status change
      await this.logAppealActivity(
        validatedUpdate.appealId,
        'status_updated',
        validatedUpdate.executedBy || 'system',
        {
          oldStatus: appeal.status,
          newStatus: validatedUpdate.status,
          juryDecision: validatedUpdate.juryDecision,
          decisionCid: validatedUpdate.decisionCid
        }
      );

      // Handle status-specific actions
      await this.handleStatusTransition(validatedUpdate.appealId, validatedUpdate.status, appeal);

      return { success: true };
    } catch (error) {
      console.error('Error updating appeal status:', error);
      if (error instanceof z.ZodError) {
        return { success: false, error: 'Invalid update data: ' + error.errors.map(e => e.message).join(', ') };
      }
      return { success: false, error: 'Failed to update appeal status' };
    }
  }

  /**
   * Get appeals for a specific user
   */
  async getUserAppeals(
    userId: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<{ appeals: AppealCase[]; total: number; page: number; limit: number }> {
    try {
      const offset = (page - 1) * limit;

      // Get total count
      const db = this.getDb();
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(moderationAppeals)
        .where(eq(moderationAppeals.appellantId, userId));

      const total = totalResult[0]?.count || 0;

      // Get appeals with original cases
      const results = await db
        .select({
          appeal: moderationAppeals,
          originalCase: moderationCases
        })
        .from(moderationAppeals)
        .leftJoin(moderationCases, eq(moderationAppeals.caseId, moderationCases.id))
        .where(eq(moderationAppeals.appellantId, userId))
        .orderBy(desc(moderationAppeals.createdAt))
        .limit(limit)
        .offset(offset);

      const appeals: AppealCase[] = [];

      for (const { appeal, originalCase } of results) {
        const evidence = await this.getAppealEvidence(appeal.id);

        appeals.push({
          id: appeal.id,
          caseId: appeal.caseId,
          appellantId: appeal.appellantId,
          status: appeal.status as any,
          stakeAmount: appeal.stakeAmount || '0',
          juryDecision: appeal.juryDecision as any,
          decisionCid: appeal.decisionCid || undefined,
          createdAt: appeal.createdAt || new Date(),
          reasoning: evidence?.reasoning,
          evidenceUrls: evidence?.evidenceUrls,
          originalCase: originalCase ? {
            id: originalCase.id,
            contentId: originalCase.contentId,
            contentType: originalCase.contentType,
            decision: originalCase.decision || 'unknown',
            reasonCode: originalCase.reasonCode || 'unknown',
            confidence: parseFloat(originalCase.confidence || '0'),
            evidenceCid: originalCase.evidenceCid || undefined
          } : undefined
        });
      }

      return { appeals, total, page, limit };
    } catch (error) {
      console.error('Error getting user appeals:', error);
      return { appeals: [], total: 0, page, limit };
    }
  }

  /**
   * Get appeals by status for administrative purposes
   */
  async getAppealsByStatus(
    status: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ appeals: AppealCase[]; total: number; page: number; limit: number }> {
    try {
      const offset = (page - 1) * limit;

      // Get total count
      const db = this.getDb();
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(moderationAppeals)
        .where(eq(moderationAppeals.status, status));

      const total = totalResult[0]?.count || 0;

      // Get appeals with original cases
      const results = await db
        .select({
          appeal: moderationAppeals,
          originalCase: moderationCases
        })
        .from(moderationAppeals)
        .leftJoin(moderationCases, eq(moderationAppeals.caseId, moderationCases.id))
        .where(eq(moderationAppeals.status, status))
        .orderBy(asc(moderationAppeals.createdAt)) // Oldest first for processing
        .limit(limit)
        .offset(offset);

      const appeals: AppealCase[] = [];

      for (const { appeal, originalCase } of results) {
        const evidence = await this.getAppealEvidence(appeal.id);

        appeals.push({
          id: appeal.id,
          caseId: appeal.caseId,
          appellantId: appeal.appellantId,
          status: appeal.status as any,
          stakeAmount: appeal.stakeAmount || '0',
          juryDecision: appeal.juryDecision as any,
          decisionCid: appeal.decisionCid || undefined,
          createdAt: appeal.createdAt || new Date(),
          reasoning: evidence?.reasoning,
          evidenceUrls: evidence?.evidenceUrls,
          originalCase: originalCase ? {
            id: originalCase.id,
            contentId: originalCase.contentId,
            contentType: originalCase.contentType,
            decision: originalCase.decision || 'unknown',
            reasonCode: originalCase.reasonCode || 'unknown',
            confidence: parseFloat(originalCase.confidence || '0'),
            evidenceCid: originalCase.evidenceCid || undefined
          } : undefined
        });
      }

      return { appeals, total, page, limit };
    } catch (error) {
      console.error('Error getting appeals by status:', error);
      return { appeals: [], total: 0, page, limit };
    }
  }

  /**
   * Validate stake amount for appeal
   */
  private async validateStakeAmount(
    userId: string,
    stakeAmount: string,
    originalDecision: string
  ): Promise<StakeValidation> {
    try {
      const stake = parseFloat(stakeAmount);

      // Define minimum stake requirements based on decision severity
      const minimumStakes = {
        'block': 100,    // Higher stake for blocked content
        'limit': 50,     // Medium stake for limited content
        'quarantine': 25 // Lower stake for quarantined content
      };

      const requiredStake = minimumStakes[originalDecision as keyof typeof minimumStakes] || 100;

      if (stake < requiredStake) {
        return {
          isValid: false,
          requiredStake: requiredStake.toString(),
          userBalance: '0', // Would check actual balance from wallet/reputation system
          reason: `Minimum stake of ${requiredStake} tokens required for ${originalDecision} appeals`
        };
      }

      // TODO: Check actual user token balance from wallet/reputation system
      // For now, assume user has sufficient balance
      const userBalance = '1000'; // Placeholder

      if (parseFloat(userBalance) < stake) {
        return {
          isValid: false,
          requiredStake: requiredStake.toString(),
          userBalance,
          reason: 'Insufficient token balance for stake'
        };
      }

      return {
        isValid: true,
        requiredStake: requiredStake.toString(),
        userBalance
      };
    } catch (error) {
      console.error('Error validating stake amount:', error);
      return {
        isValid: false,
        requiredStake: '0',
        userBalance: '0',
        reason: 'Error validating stake amount'
      };
    }
  }

  /**
   * Check if status transition is valid
   */
  private isValidStatusTransition(
    currentStatus: 'open' | 'jury_selection' | 'voting' | 'decided' | 'executed',
    newStatus: 'open' | 'jury_selection' | 'voting' | 'decided' | 'executed'
  ): boolean {
    const validTransitions = {
      'open': ['jury_selection'],
      'jury_selection': ['voting'],
      'voting': ['decided'],
      'decided': ['executed']
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Handle status-specific transition actions
   */
  private async handleStatusTransition(
    appealId: number,
    newStatus: string,
    appeal: any
  ): Promise<void> {
    try {
      switch (newStatus) {
        case 'jury_selection':
          // TODO: Trigger jury selection process
          await this.logAppealActivity(appealId, 'jury_selection_started', 'system', {});
          break;

        case 'voting':
          // TODO: Start voting period
          await this.logAppealActivity(appealId, 'voting_started', 'system', {});
          break;

        case 'decided':
          // TODO: Process jury decision
          await this.logAppealActivity(appealId, 'decision_reached', 'system', {});
          break;

        case 'executed':
          // TODO: Execute appeal outcome (restore content, refund stake, etc.)
          await this.executeAppealOutcome(appealId, appeal);
          break;
      }
    } catch (error) {
      console.error('Error handling status transition:', error);
    }
  }

  /**
   * Execute appeal outcome
   */
  private async executeAppealOutcome(appealId: number, appeal: any): Promise<void> {
    try {
      // Get full appeal details
      const appealCase = await this.getAppealCase(appealId);
      if (!appealCase) return;

      // Update original moderation case based on jury decision
      if (appealCase.juryDecision === 'overturn') {
        // Restore content
        const db = this.getDb();
        await db
          .update(moderationCases)
          .set({ 
            status: 'allowed',
            updatedAt: new Date()
          })
          .where(eq(moderationCases.id, appealCase.caseId));

        // Restore user reputation
        await this.updateUserReputation(
          appealCase.appellantId,
          'successful_appeal',
          0.1, // Reputation boost for successful appeal
          appealCase.id
        );

        // TODO: Refund stake + reward
      } else if (appealCase.juryDecision === 'uphold') {
        // Keep original decision
        // TODO: Slash stake
        
        // Apply reputation penalty for frivolous appeal
        await this.updateUserReputation(
          appealCase.appellantId,
          'failed_appeal',
          -0.05, // Small penalty for failed appeal
          appealCase.id
        );
      }

      await this.logAppealActivity(appealId, 'outcome_executed', 'system', {
        juryDecision: appealCase.juryDecision,
        stakeAmount: appealCase.stakeAmount
      });
    } catch (error) {
      console.error('Error executing appeal outcome:', error);
    }
  }

  /**
   * Update user reputation based on appeal outcome
   */
  private async updateUserReputation(
    userId: string,
    impactType: string,
    impactValue: number,
    appealId: number
  ): Promise<void> {
    try {
      // TODO: Get current reputation from reputation system
      const currentReputation = 1.0; // Placeholder
      const newReputation = Math.max(0, Math.min(1, currentReputation + impactValue));

      // Log reputation change
      const db = this.getDb();
      await db.insert(reputationHistory).values({
        userId,
        impactType,
        impactValue,
        previousScore: currentReputation,
        newScore: newReputation,
        reason: `Appeal outcome: ${impactType}`,
        relatedEntityType: 'appeal',
        relatedEntityId: appealId.toString(),
        createdAt: new Date()
      });

      // TODO: Update actual reputation in reputation system
    } catch (error) {
      console.error('Error updating user reputation:', error);
    }
  }

  /**
   * Log appeal activity to audit trail
   */
  private async logAppealActivity(
    appealId: number,
    actionType: string,
    actorId: string,
    details: any
  ): Promise<void> {
    try {
      const db = this.getDb();
      await db.insert(moderationAuditLog).values({
        actionType: `appeal_${actionType}`,
        actorId,
        actorType: actorId === 'system' ? 'system' : 'user',
        newState: {
          appealId,
          ...details
        },
        reasoning: `Appeal ${actionType}`,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error logging appeal activity:', error);
    }
  }

  /**
   * Store appeal evidence (placeholder for IPFS integration)
   */
  private async storeAppealEvidence(appealId: number, evidence: any): Promise<string> {
    try {
      // TODO: Store in IPFS and return CID
      // For now, store in database as JSON
      const evidenceJson = JSON.stringify(evidence);
      
      // This would typically be stored in IPFS
      // For now, we'll use a placeholder hash
      const evidenceCid = `appeal_evidence_${appealId}_${Date.now()}`;
      
      return evidenceCid;
    } catch (error) {
      console.error('Error storing appeal evidence:', error);
      return '';
    }
  }

  /**
   * Get appeal evidence (placeholder for IPFS integration)
   */
  private async getAppealEvidence(appealId: number): Promise<any> {
    try {
      // TODO: Retrieve from IPFS
      // For now, return placeholder data
      return {
        reasoning: 'Appeal reasoning would be stored here',
        evidenceUrls: [],
        submissionTimestamp: new Date()
      };
    } catch (error) {
      console.error('Error getting appeal evidence:', error);
      return null;
    }
  }
}

export const appealsService = new AppealsService();