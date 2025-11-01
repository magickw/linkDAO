import { databaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { evidenceStorageService } from './evidenceStorageService';
import { safeLogger } from '../utils/safeLogger';
import { auditLoggingService } from './auditLoggingService';
import { safeLogger } from '../utils/safeLogger';
import { reputationService } from './reputationService';
import { safeLogger } from '../utils/safeLogger';
import { notificationService } from './notificationService';
import { safeLogger } from '../utils/safeLogger';
import { ModerationCase, ModerationAction, ModerationDecision } from '../models/ModerationModels';
import { safeLogger } from '../utils/safeLogger';
import { ModeratorProfile } from './moderatorAuthService';
import { safeLogger } from '../utils/safeLogger';

export interface PolicyTemplate {
  id: string;
  name: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: ModerationDecision;
  reasonCode: string;
  description: string;
  rationale: string;
  durationSec?: number;
  reputationImpact: number;
  isActive: boolean;
}

export interface DecisionRequest {
  caseId: number;
  decision: ModerationDecision;
  reasonCode: string;
  rationale: string;
  templateId?: string;
  customDuration?: number;
  escalate?: boolean;
  notifyUser?: boolean;
  additionalEvidence?: {
    screenshots?: string[];
    notes?: string;
    externalReferences?: string[];
  };
}

export interface DecisionResult {
  success: boolean;
  actionId?: number;
  evidenceCid?: string;
  reputationChange?: number;
  error?: string;
}

export interface BulkDecisionRequest {
  caseIds: number[];
  decision: ModerationDecision;
  reasonCode: string;
  rationale: string;
  templateId?: string;
}

export class ModeratorDecisionService {
  private static instance: ModeratorDecisionService;

  public static getInstance(): ModeratorDecisionService {
    if (!ModeratorDecisionService.instance) {
      ModeratorDecisionService.instance = new ModeratorDecisionService();
    }
    return ModeratorDecisionService.instance;
  }

  /**
   * Process a moderation decision
   */
  async processDecision(
    moderator: ModeratorProfile,
    request: DecisionRequest
  ): Promise<DecisionResult> {
    try {
      // Validate the case exists and is assigned to moderator
      const moderationCase = await this.validateCaseAccess(request.caseId, moderator.id);
      if (!moderationCase) {
        return { success: false, error: 'Case not found or not assigned to moderator' };
      }

      // Get policy template if specified
      let template: PolicyTemplate | null = null;
      if (request.templateId) {
        template = await this.getPolicyTemplate(request.templateId);
        if (!template) {
          return { success: false, error: 'Policy template not found' };
        }
      }

      // Validate moderator can make this decision
      const canDecide = await this.validateDecisionPermissions(moderator, moderationCase, request);
      if (!canDecide.allowed) {
        return { success: false, error: canDecide.reason };
      }

      // Create evidence bundle
      const evidenceCid = await this.createEvidenceBundle(
        moderationCase,
        moderator,
        request,
        template
      );

      // Apply the decision
      const actionId = await this.applyDecision(
        moderationCase,
        moderator,
        request,
        template,
        evidenceCid
      );

      // Update reputation if applicable
      let reputationChange = 0;
      if (request.decision === 'block' || request.decision === 'limit') {
        reputationChange = await this.applyReputationImpact(
          moderationCase.userId,
          request.decision,
          template?.reputationImpact || -10
        );
      }

      // Send notifications
      if (request.notifyUser !== false) {
        await this.notifyUser(moderationCase, request, template);
      }

      // Log the decision
      await this.logDecision(moderator, moderationCase, request, actionId);

      // Release case assignment
      await this.releaseCaseAssignment(request.caseId, moderator.id);

      return {
        success: true,
        actionId,
        evidenceCid,
        reputationChange
      };
    } catch (error) {
      safeLogger.error('Error processing moderation decision:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Process bulk decisions
   */
  async processBulkDecisions(
    moderator: ModeratorProfile,
    request: BulkDecisionRequest
  ): Promise<{
    successful: number[];
    failed: { caseId: number; error: string }[];
    totalProcessed: number;
  }> {
    const successful: number[] = [];
    const failed: { caseId: number; error: string }[] = [];

    // Check bulk action permission
    if (!moderator.permissions.canAccessBulkActions) {
      return {
        successful: [],
        failed: request.caseIds.map(id => ({ caseId: id, error: 'Bulk actions not permitted' })),
        totalProcessed: 0
      };
    }

    // Process each case
    for (const caseId of request.caseIds) {
      try {
        const decisionRequest: DecisionRequest = {
          caseId,
          decision: request.decision,
          reasonCode: request.reasonCode,
          rationale: request.rationale,
          templateId: request.templateId,
          notifyUser: false // Bulk notifications handled separately
        };

        const result = await this.processDecision(moderator, decisionRequest);
        
        if (result.success) {
          successful.push(caseId);
        } else {
          failed.push({ caseId, error: result.error || 'Unknown error' });
        }
      } catch (error) {
        failed.push({ 
          caseId, 
          error: error instanceof Error ? error.message : 'Processing error' 
        });
      }
    }

    // Send bulk notification summary
    if (successful.length > 0) {
      await this.sendBulkNotificationSummary(moderator, successful, request);
    }

    return {
      successful,
      failed,
      totalProcessed: successful.length + failed.length
    };
  }

  /**
   * Get available policy templates
   */
  async getPolicyTemplates(
    contentType?: string,
    severity?: string
  ): Promise<PolicyTemplate[]> {
    try {
      let whereClause = 'WHERE is_active = true';
      const params: any[] = [];
      
      if (contentType) {
        params.push(contentType);
        whereClause += ` AND (content_types IS NULL OR $${params.length} = ANY(content_types))`;
      }
      
      if (severity) {
        params.push(severity);
        whereClause += ` AND severity = $${params.length}`;
      }

      const result = await databaseService.query(`
        SELECT * FROM policy_templates 
        ${whereClause}
        ORDER BY category, severity, name
      `, params);

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        category: row.category,
        severity: row.severity,
        action: row.action,
        reasonCode: row.reason_code,
        description: row.description,
        rationale: row.rationale,
        durationSec: row.duration_sec,
        reputationImpact: row.reputation_impact,
        isActive: row.is_active
      }));
    } catch (error) {
      safeLogger.error('Error getting policy templates:', error);
      return [];
    }
  }

  /**
   * Get moderator decision history
   */
  async getDecisionHistory(
    moderatorId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    decisions: Array<{
      action: ModerationAction;
      case: ModerationCase;
      createdAt: Date;
      rationale: string;
      appealStatus?: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const offset = (page - 1) * limit;
      
      // Get total count
      const countResult = await databaseService.query(`
        SELECT COUNT(*) as total
        FROM moderation_actions ma
        WHERE ma.applied_by = $1
      `, [moderatorId]);
      
      const total = parseInt(countResult.rows[0].total);
      
      // Get decisions with case details
      const result = await databaseService.query(`
        SELECT 
          ma.*,
          mc.*,
          appeal.status as appeal_status
        FROM moderation_actions ma
        JOIN moderation_cases mc ON ma.content_id = mc.content_id
        LEFT JOIN moderation_appeals appeal ON appeal.case_id = mc.id
        WHERE ma.applied_by = $1
        ORDER BY ma.created_at DESC
        LIMIT $2 OFFSET $3
      `, [moderatorId, limit, offset]);

      const decisions = result.rows.map(row => ({
        action: {
          id: row.id,
          userId: row.user_id,
          contentId: row.content_id,
          action: row.action,
          durationSec: row.duration_sec,
          appliedBy: row.applied_by,
          rationale: row.rationale,
          createdAt: row.created_at
        },
        case: {
          id: row.id,
          contentId: row.content_id,
          contentType: row.content_type,
          userId: row.user_id,
          status: row.status,
          riskScore: parseFloat(row.risk_score),
          decision: row.decision,
          reasonCode: row.reason_code,
          confidence: parseFloat(row.confidence),
          vendorScores: row.vendor_scores || {},
          evidenceCid: row.evidence_cid,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        },
        createdAt: row.created_at,
        rationale: row.rationale,
        appealStatus: row.appeal_status
      }));

      return {
        decisions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      safeLogger.error('Error getting decision history:', error);
      return {
        decisions: [],
        pagination: { page, limit, total: 0, totalPages: 0 }
      };
    }
  }

  /**
   * Validate case access for moderator
   */
  private async validateCaseAccess(caseId: number, moderatorId: string): Promise<ModerationCase | null> {
    try {
      const result = await databaseService.query(`
        SELECT mc.*, qa.assigned_to
        FROM moderation_cases mc
        LEFT JOIN queue_assignments qa ON qa.case_id = mc.id AND qa.is_active = true
        WHERE mc.id = $1
      `, [caseId]);

      if (!result.rows.length) {
        return null;
      }

      const row = result.rows[0];
      
      // Check if assigned to this moderator or unassigned
      if (row.assigned_to && row.assigned_to !== moderatorId) {
        return null;
      }

      return {
        id: row.id,
        contentId: row.content_id,
        contentType: row.content_type,
        userId: row.user_id,
        status: row.status,
        riskScore: parseFloat(row.risk_score),
        decision: row.decision,
        reasonCode: row.reason_code,
        confidence: parseFloat(row.confidence),
        vendorScores: row.vendor_scores || {},
        evidenceCid: row.evidence_cid,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      safeLogger.error('Error validating case access:', error);
      return null;
    }
  }

  /**
   * Validate moderator permissions for decision
   */
  private async validateDecisionPermissions(
    moderator: ModeratorProfile,
    moderationCase: ModerationCase,
    request: DecisionRequest
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check basic decision permission
    if (!moderator.permissions.canMakeDecisions) {
      return { allowed: false, reason: 'No decision-making permissions' };
    }

    // Check content type permission
    if (!moderator.permissions.allowedContentTypes.includes('*') &&
        !moderator.permissions.allowedContentTypes.includes(moderationCase.contentType)) {
      return { allowed: false, reason: 'Content type not permitted' };
    }

    // Check severity level (based on risk score)
    const severity = this.getRiskSeverity(moderationCase.riskScore);
    if (!moderator.permissions.allowedSeverityLevels.includes('*') &&
        !moderator.permissions.allowedSeverityLevels.includes(severity)) {
      return { allowed: false, reason: 'Severity level not permitted' };
    }

    return { allowed: true };
  }

  /**
   * Get policy template by ID
   */
  private async getPolicyTemplate(templateId: string): Promise<PolicyTemplate | null> {
    try {
      const result = await databaseService.query(`
        SELECT * FROM policy_templates WHERE id = $1 AND is_active = true
      `, [templateId]);

      if (!result.rows.length) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        category: row.category,
        severity: row.severity,
        action: row.action,
        reasonCode: row.reason_code,
        description: row.description,
        rationale: row.rationale,
        durationSec: row.duration_sec,
        reputationImpact: row.reputation_impact,
        isActive: row.is_active
      };
    } catch (error) {
      safeLogger.error('Error getting policy template:', error);
      return null;
    }
  }

  /**
   * Create evidence bundle for decision
   */
  private async createEvidenceBundle(
    moderationCase: ModerationCase,
    moderator: ModeratorProfile,
    request: DecisionRequest,
    template: PolicyTemplate | null
  ): Promise<string | undefined> {
    try {
      const evidenceBundle = {
        caseId: moderationCase.id,
        contentHash: moderationCase.contentId,
        decisionRationale: request.rationale,
        policyTemplate: template ? {
          id: template.id,
          name: template.name,
          category: template.category
        } : null,
        moderatorInfo: {
          id: moderator.id,
          role: moderator.role
        },
        vendorScores: moderationCase.vendorScores,
        additionalEvidence: request.additionalEvidence,
        timestamp: new Date(),
        policyVersion: '1.0'
      };

      return await evidenceStorageService.storeEvidenceBundle(evidenceBundle);
    } catch (error) {
      safeLogger.error('Error creating evidence bundle:', error);
      return undefined;
    }
  }

  /**
   * Apply the moderation decision
   */
  private async applyDecision(
    moderationCase: ModerationCase,
    moderator: ModeratorProfile,
    request: DecisionRequest,
    template: PolicyTemplate | null,
    evidenceCid?: string
  ): Promise<number> {
    try {
      // Insert moderation action
      const actionResult = await databaseService.query(`
        INSERT INTO moderation_actions (
          user_id, content_id, action, duration_sec, applied_by, rationale, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id
      `, [
        moderationCase.userId,
        moderationCase.contentId,
        this.mapDecisionToAction(request.decision),
        request.customDuration || template?.durationSec || 0,
        moderator.id,
        request.rationale
      ]);

      const actionId = actionResult.rows[0].id;

      // Update moderation case
      await databaseService.query(`
        UPDATE moderation_cases 
        SET 
          status = $1,
          decision = $2,
          reason_code = $3,
          evidence_cid = $4,
          updated_at = NOW()
        WHERE id = $5
      `, [
        this.mapDecisionToStatus(request.decision),
        request.decision,
        request.reasonCode,
        evidenceCid,
        moderationCase.id
      ]);

      return actionId;
    } catch (error) {
      safeLogger.error('Error applying decision:', error);
      throw error;
    }
  }

  /**
   * Apply reputation impact
   */
  private async applyReputationImpact(
    userId: string,
    decision: ModerationDecision,
    impact: number
  ): Promise<number> {
    try {
      return await reputationService.updateReputation(userId, {
        type: 'violation',
        value: impact,
        reason: `Moderation decision: ${decision}`,
        source: 'moderation'
      });
    } catch (error) {
      safeLogger.error('Error applying reputation impact:', error);
      return 0;
    }
  }

  /**
   * Notify user of moderation decision
   */
  private async notifyUser(
    moderationCase: ModerationCase,
    request: DecisionRequest,
    template: PolicyTemplate | null
  ): Promise<void> {
    try {
      const message = template 
        ? `Your content has been ${request.decision} for: ${template.description}`
        : `Your content has been ${request.decision}. Reason: ${request.rationale}`;

      await notificationService.sendNotification({
        userId: moderationCase.userId,
        type: 'moderation_decision',
        title: 'Content Moderation Decision',
        message,
        metadata: {
          contentId: moderationCase.contentId,
          decision: request.decision,
          reasonCode: request.reasonCode,
          canAppeal: request.decision === 'block'
        }
      });
    } catch (error) {
      safeLogger.error('Error notifying user:', error);
    }
  }

  /**
   * Log moderation decision
   */
  private async logDecision(
    moderator: ModeratorProfile,
    moderationCase: ModerationCase,
    request: DecisionRequest,
    actionId: number
  ): Promise<void> {
    try {
      await auditLoggingService.logModerationAction({
        caseId: moderationCase.id,
        actionType: 'decision',
        actorId: moderator.id,
        actorType: 'moderator',
        oldState: { status: moderationCase.status },
        newState: { 
          decision: request.decision,
          reasonCode: request.reasonCode,
          actionId 
        },
        reasoning: request.rationale,
        createdAt: new Date()
      });
    } catch (error) {
      safeLogger.error('Error logging decision:', error);
    }
  }

  /**
   * Release case assignment
   */
  private async releaseCaseAssignment(caseId: number, moderatorId: string): Promise<void> {
    try {
      await databaseService.query(`
        UPDATE queue_assignments 
        SET is_active = false, completed_at = NOW()
        WHERE case_id = $1 AND assigned_to = $2 AND is_active = true
      `, [caseId, moderatorId]);
    } catch (error) {
      safeLogger.error('Error releasing case assignment:', error);
    }
  }

  /**
   * Send bulk notification summary
   */
  private async sendBulkNotificationSummary(
    moderator: ModeratorProfile,
    successfulCases: number[],
    request: BulkDecisionRequest
  ): Promise<void> {
    // Implementation would send summary notifications
    safeLogger.info(`Bulk action completed by ${moderator.id}: ${successfulCases.length} cases processed`);
  }

  /**
   * Map decision to action type
   */
  private mapDecisionToAction(decision: ModerationDecision): string {
    const mapping: Record<ModerationDecision, string> = {
      'allow': 'approve',
      'limit': 'limit',
      'block': 'block',
      'review': 'escalate'
    };
    return mapping[decision] || 'review';
  }

  /**
   * Map decision to case status
   */
  private mapDecisionToStatus(decision: ModerationDecision): string {
    const mapping: Record<ModerationDecision, string> = {
      'allow': 'allowed',
      'limit': 'quarantined',
      'block': 'blocked',
      'review': 'under_review'
    };
    return mapping[decision] || 'under_review';
  }

  /**
   * Get risk severity level
   */
  private getRiskSeverity(riskScore: number): string {
    if (riskScore >= 0.8) return 'critical';
    if (riskScore >= 0.6) return 'high';
    if (riskScore >= 0.3) return 'medium';
    return 'low';
  }
}

export const moderatorDecisionService = ModeratorDecisionService.getInstance();