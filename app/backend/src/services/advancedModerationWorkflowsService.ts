import { databaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { moderationCases, moderationActions, contentReports, moderationAppeals } from '../db/schema';
import { eq, and, gte, lte, desc, sql, count } from 'drizzle-orm';
import { aiContentModerationService } from './aiContentModerationService';

export interface ModerationWorkflow {
  id: string;
  name: string;
  description: string;
  stages: ModerationStage[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModerationStage {
  id: string;
  name: string;
  order: number;
  criteria: ModerationCriteria;
  action: ModerationAction;
  requiredApprovals: number;
  assignedRoles: string[];
}

export interface ModerationCriteria {
  contentType: string[];
  riskThreshold: number;
  userReputationThreshold: number;
  communityContext: string[];
  flagsRequired: number;
}

export interface ModerationAction {
  type: 'allow' | 'limit' | 'block' | 'review' | 'escalate';
  duration?: number; // For temporary actions
  notificationRequired: boolean;
  autoExecute: boolean;
}

export interface ModerationCase {
  id: string;
  contentId: string;
  contentType: string;
  userId: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'escalated';
  decision?: string; // Moderation decision details
  reasonCode?: string; // Reason code for moderation action
  confidence?: number; // Confidence score for automated decisions
  vendorScores?: Record<string, number>; // Scores from different moderation vendors
  evidenceCid?: string; // IPFS CID for evidence
  riskScore: number;
  currentStage: string;
  assignedModerators: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AutomatedModerationRule {
  id: string;
  name: string;
  description: string;
  conditions: RuleCondition[];
  action: ModerationAction;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  threshold?: number;
}

export class AdvancedModerationWorkflowsService {
  private workflows: Map<string, ModerationWorkflow>;
  private rules: Map<string, AutomatedModerationRule>;

  constructor() {
    this.workflows = new Map();
    this.rules = new Map();
    this.initializeDefaultWorkflows();
    this.initializeDefaultRules();
  }

  /**
   * Initialize default moderation workflows
   */
  private initializeDefaultWorkflows(): void {
    // Standard content moderation workflow
    const standardWorkflow: ModerationWorkflow = {
      id: 'standard-content-moderation',
      name: 'Standard Content Moderation',
      description: 'Standard workflow for all content moderation',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      stages: [
        {
          id: 'initial-ai-review',
          name: 'Initial AI Review',
          order: 1,
          criteria: {
            contentType: ['post', 'comment', 'listing'],
            riskThreshold: 0.3,
            userReputationThreshold: 0,
            communityContext: [],
            flagsRequired: 0
          },
          action: {
            type: 'review',
            notificationRequired: false,
            autoExecute: true
          },
          requiredApprovals: 0,
          assignedRoles: ['ai-system']
        },
        {
          id: 'moderator-review',
          name: 'Moderator Review',
          order: 2,
          criteria: {
            contentType: ['post', 'comment', 'listing'],
            riskThreshold: 0.5,
            userReputationThreshold: 50,
            communityContext: [],
            flagsRequired: 1
          },
          action: {
            type: 'review',
            notificationRequired: true,
            autoExecute: false
          },
          requiredApprovals: 1,
          assignedRoles: ['moderator']
        },
        {
          id: 'escalated-review',
          name: 'Escalated Review',
          order: 3,
          criteria: {
            contentType: ['post', 'comment', 'listing'],
            riskThreshold: 0.8,
            userReputationThreshold: 0,
            communityContext: [],
            flagsRequired: 3
          },
          action: {
            type: 'review',
            notificationRequired: true,
            autoExecute: false
          },
          requiredApprovals: 2,
          assignedRoles: ['senior-moderator', 'admin']
        }
      ]
    };

    this.workflows.set(standardWorkflow.id, standardWorkflow);

    // High-risk content workflow
    const highRiskWorkflow: ModerationWorkflow = {
      id: 'high-risk-content',
      name: 'High-Risk Content Moderation',
      description: 'Enhanced workflow for high-risk content',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      stages: [
        {
          id: 'immediate-flag',
          name: 'Immediate Flag',
          order: 1,
          criteria: {
            contentType: ['post', 'comment', 'listing'],
            riskThreshold: 0.9,
            userReputationThreshold: 0,
            communityContext: [],
            flagsRequired: 1
          },
          action: {
            type: 'limit',
            duration: 3600, // 1 hour
            notificationRequired: true,
            autoExecute: true
          },
          requiredApprovals: 0,
          assignedRoles: ['ai-system']
        },
        {
          id: 'admin-review',
          name: 'Administrator Review',
          order: 2,
          criteria: {
            contentType: ['post', 'comment', 'listing'],
            riskThreshold: 0.9,
            userReputationThreshold: 0,
            communityContext: [],
            flagsRequired: 1
          },
          action: {
            type: 'review',
            notificationRequired: true,
            autoExecute: false
          },
          requiredApprovals: 1,
          assignedRoles: ['admin']
        }
      ]
    };

    this.workflows.set(highRiskWorkflow.id, highRiskWorkflow);
  }

  /**
   * Initialize default automated moderation rules
   */
  private initializeDefaultRules(): void {
    // Auto-block extreme spam
    const spamRule: AutomatedModerationRule = {
      id: 'auto-block-spam',
      name: 'Auto-Block Extreme Spam',
      description: 'Automatically block content identified as extreme spam',
      priority: 100,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      conditions: [
        {
          field: 'riskScore',
          operator: 'greater_than',
          value: 0.95
        },
        {
          field: 'spamProbability',
          operator: 'greater_than',
          value: 0.9
        }
      ],
      action: {
        type: 'block',
        notificationRequired: true,
        autoExecute: true
      }
    };

    this.rules.set(spamRule.id, spamRule);

    // Auto-limit high-risk content
    const highRiskRule: AutomatedModerationRule = {
      id: 'auto-limit-high-risk',
      name: 'Auto-Limit High-Risk Content',
      description: 'Automatically limit content with high risk scores',
      priority: 50,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      conditions: [
        {
          field: 'riskScore',
          operator: 'greater_than',
          value: 0.8
        }
      ],
      action: {
        type: 'limit',
        duration: 86400, // 24 hours
        notificationRequired: true,
        autoExecute: true
      }
    };

    this.rules.set(highRiskRule.id, highRiskRule);

    // Auto-review moderate-risk content
    const moderateRiskRule: AutomatedModerationRule = {
      id: 'auto-review-moderate-risk',
      name: 'Auto-Review Moderate-Risk Content',
      description: 'Flag moderate-risk content for human review',
      priority: 25,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      conditions: [
        {
          field: 'riskScore',
          operator: 'greater_than',
          value: 0.6
        }
      ],
      action: {
        type: 'review',
        notificationRequired: true,
        autoExecute: true
      }
    };

    this.rules.set(moderateRiskRule.id, moderateRiskRule);
  }

  /**
   * Get all active moderation workflows
   */
  async getActiveWorkflows(): Promise<ModerationWorkflow[]> {
    const activeWorkflows: ModerationWorkflow[] = [];
    
    for (const [id, workflow] of this.workflows.entries()) {
      if (workflow.isActive) {
        activeWorkflows.push(workflow);
      }
    }
    
    return activeWorkflows;
  }

  /**
   * Get a specific moderation workflow by ID
   */
  async getWorkflowById(workflowId: string): Promise<ModerationWorkflow | null> {
    return this.workflows.get(workflowId) || null;
  }

  /**
   * Create a new moderation workflow
   */
  async createWorkflow(workflow: Omit<ModerationWorkflow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<ModerationWorkflow> {
    const workflowId = workflow.id || `workflow-${Date.now()}`;
    const newWorkflow: ModerationWorkflow = {
      id: workflowId,
      name: workflow.name,
      description: workflow.description,
      stages: workflow.stages,
      isActive: workflow.isActive,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.workflows.set(workflowId, newWorkflow);
    return newWorkflow;
  }

  /**
   * Update an existing moderation workflow
   */
  async updateWorkflow(workflowId: string, updates: Partial<ModerationWorkflow>): Promise<ModerationWorkflow | null> {
    const existingWorkflow = this.workflows.get(workflowId);
    if (!existingWorkflow) {
      return null;
    }

    const updatedWorkflow: ModerationWorkflow = {
      ...existingWorkflow,
      ...updates,
      updatedAt: new Date()
    };

    this.workflows.set(workflowId, updatedWorkflow);
    return updatedWorkflow;
  }

  /**
   * Delete a moderation workflow
   */
  async deleteWorkflow(workflowId: string): Promise<boolean> {
    return this.workflows.delete(workflowId);
  }

  /**
   * Get all active automated moderation rules
   */
  async getActiveRules(): Promise<AutomatedModerationRule[]> {
    const activeRules: AutomatedModerationRule[] = [];
    
    for (const [id, rule] of this.rules.entries()) {
      if (rule.isActive) {
        activeRules.push(rule);
      }
    }
    
    return activeRules;
  }

  /**
   * Get a specific automated moderation rule by ID
   */
  async getRuleById(ruleId: string): Promise<AutomatedModerationRule | null> {
    return this.rules.get(ruleId) || null;
  }

  /**
   * Create a new automated moderation rule
   */
  async createRule(rule: Omit<AutomatedModerationRule, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<AutomatedModerationRule> {
    const ruleId = rule.id || `rule-${Date.now()}`;
    const newRule: AutomatedModerationRule = {
      id: ruleId,
      name: rule.name,
      description: rule.description,
      conditions: rule.conditions,
      action: rule.action,
      priority: rule.priority,
      isActive: rule.isActive,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.rules.set(ruleId, newRule);
    return newRule;
  }

  /**
   * Update an existing automated moderation rule
   */
  async updateRule(ruleId: string, updates: Partial<AutomatedModerationRule>): Promise<AutomatedModerationRule | null> {
    const existingRule = this.rules.get(ruleId);
    if (!existingRule) {
      return null;
    }

    const updatedRule: AutomatedModerationRule = {
      ...existingRule,
      ...updates,
      updatedAt: new Date()
    };

    this.rules.set(ruleId, updatedRule);
    return updatedRule;
  }

  /**
   * Delete an automated moderation rule
   */
  async deleteRule(ruleId: string): Promise<boolean> {
    return this.rules.delete(ruleId);
  }

  /**
   * Process content through moderation workflows
   */
  async processContent(content: { id: string; text?: string; userId: string; type: string }): Promise<ModerationCase> {
    try {
      // First, run AI moderation on the content
      const moderationReport = await aiContentModerationService.moderateContent(content);
      
      // Create a moderation case
      const moderationCase: ModerationCase = {
        id: `case-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        contentId: content.id,
        contentType: content.type,
        userId: content.userId,
        status: 'pending',
        riskScore: moderationReport.overallRiskScore,
        currentStage: 'initial',
        assignedModerators: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Determine which workflow to use based on risk score
      let workflowId = 'standard-content-moderation';
      if (moderationReport.overallRiskScore > 0.8) {
        workflowId = 'high-risk-content';
      }

      const workflow = await this.getWorkflowById(workflowId);
      if (workflow) {
        // Apply workflow stages
        for (const stage of workflow.stages) {
          if (await this.evaluateStageCriteria(stage.criteria, content, moderationReport)) {
            moderationCase.currentStage = stage.id;
            moderationCase.status = 'in_review';
            moderationCase.assignedModerators = stage.assignedRoles;
            
            // Apply stage action if autoExecute is true
            if (stage.action.autoExecute) {
              await this.executeModerationAction(stage.action, content.id, content.userId);
              moderationCase.status = stage.action.type === 'review' ? 'in_review' : 
                                     stage.action.type === 'block' ? 'rejected' : 'approved';
            }
            break;
          }
        }
      }

      // Store moderation case
      await this.storeModerationCase(moderationCase);

      return moderationCase;

    } catch (error) {
      safeLogger.error('Error processing content through moderation workflow:', error);
      
      // Create a fallback moderation case
      const fallbackCase: ModerationCase = {
        id: `case-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        contentId: content.id,
        contentType: content.type,
        userId: content.userId,
        status: 'pending',
        riskScore: 0.5,
        currentStage: 'error',
        assignedModerators: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.storeModerationCase(fallbackCase);
      return fallbackCase;
    }
  }

  /**
   * Evaluate if content meets stage criteria
   */
  private async evaluateStageCriteria(
    criteria: ModerationCriteria, 
    content: { id: string; text?: string; userId: string; type: string },
    report: any
  ): Promise<boolean> {
    // Check content type
    if (criteria.contentType.length > 0 && !criteria.contentType.includes(content.type)) {
      return false;
    }

    // Check risk threshold
    if (report.overallRiskScore < criteria.riskThreshold) {
      return false;
    }

    // Check flags required
    if (criteria.flagsRequired > 0) {
      const db = databaseService.getDatabase();
      const flagCount = await db
        .select({ count: count(contentReports.id) })
        .from(contentReports)
        .where(eq(contentReports.contentId, content.id));
      
      if ((flagCount[0]?.count || 0) < criteria.flagsRequired) {
        return false;
      }
    }

    return true;
  }

  /**
   * Execute a moderation action
   */
  private async executeModerationAction(
    action: ModerationAction, 
    contentId: string, 
    userId: string
  ): Promise<void> {
    try {
      const db = databaseService.getDatabase();
      
      // Store moderation action
      await db.insert(moderationActions).values({
        userId,
        contentId,
        action: action.type,
        durationSec: action.duration || 0,
        appliedBy: 'system',
        rationale: `Automated action based on workflow rule`,
        createdAt: new Date()
      });

      // Send notification if required
      if (action.notificationRequired) {
        await this.sendModerationNotification(contentId, action.type);
      }

    } catch (error) {
      safeLogger.error('Error executing moderation action:', error);
    }
  }

  /**
   * Send moderation notification
   */
  private async sendModerationNotification(contentId: string, action: string): Promise<void> {
    // In a real implementation, this would send notifications to users
    safeLogger.info(`Sending moderation notification for content ${contentId}: ${action}`);
  }

  /**
   * Store moderation case in database
   */
  private async storeModerationCase(moderationCase: ModerationCase): Promise<void> {
    try {
      const db = databaseService.getDatabase();
      
      // Store in moderation cases table
      await db.insert(moderationCases).values({
        contentId: moderationCase.contentId,
        contentType: moderationCase.contentType,
        userId: moderationCase.userId,
        status: moderationCase.status,
        riskScore: moderationCase.riskScore,
        createdAt: moderationCase.createdAt,
        updatedAt: moderationCase.updatedAt
      });

    } catch (error) {
      safeLogger.error('Error storing moderation case:', error);
    }
  }

  /**
   * Get moderation statistics
   */
  async getModerationStatistics(timeRange: '24h' | '7d' | '30d' = '7d'): Promise<any> {
    try {
      const db = databaseService.getDatabase();
      
      // Calculate time range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
      }

      // Get total moderation cases
      const totalCases = await db
        .select({ count: count(moderationCases.id) })
        .from(moderationCases)
        .where(gte(moderationCases.createdAt, startDate));

      // Get cases by status
      const casesByStatus = await db
        .select({ 
          status: moderationCases.status,
          count: count(moderationCases.id)
        })
        .from(moderationCases)
        .where(gte(moderationCases.createdAt, startDate))
        .groupBy(moderationCases.status);

      // Get average risk score
      const avgRiskScore = await db
        .select({ 
          avg: sql<number>`AVG(risk_score)`
        })
        .from(moderationCases)
        .where(gte(moderationCases.createdAt, startDate));

      // Get total actions taken
      const totalActions = await db
        .select({ count: count(moderationActions.id) })
        .from(moderationActions)
        .where(gte(moderationActions.createdAt, startDate));

      return {
        totalCases: totalCases[0]?.count || 0,
        casesByStatus,
        averageRiskScore: avgRiskScore[0]?.avg || 0,
        totalActions: totalActions[0]?.count || 0,
        timeRange,
        periodStart: startDate,
        periodEnd: endDate
      };

    } catch (error) {
      safeLogger.error('Error getting moderation statistics:', error);
      return {
        totalCases: 0,
        casesByStatus: [],
        averageRiskScore: 0,
        totalActions: 0,
        timeRange,
        periodStart: new Date(),
        periodEnd: new Date()
      };
    }
  }
}

export const advancedModerationWorkflowsService = new AdvancedModerationWorkflowsService();
