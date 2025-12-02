
import { db } from '../db';
import {
  workflowTemplates,
  workflowInstances,
  workflowSteps,
  workflowStepExecutions,
  workflowTaskAssignments,
  workflowRules,
  workflowMetrics,
  workflowDecisions,
  workflowApprovalCriteria,
  returns,
  returnPolicies,
  disputes,
  users
} from '../db/schema';

import { eq, and, or, desc, asc, sql, inArray, gt, lte } from 'drizzle-orm';
import {
  WorkflowTemplate,
  WorkflowInstance,
  WorkflowStep,
  WorkflowStepExecution,
  WorkflowTaskAssignment,
  WorkflowRule,
  WorkflowMetric,
  CreateWorkflowTemplateRequest,
  ExecuteWorkflowRequest,
  CompleteTaskRequest,
  WorkflowStatus,
  StepExecutionStatus,
  TaskStatus,
  WorkflowAnalytics,
  AssignmentRule,
  RuleCondition,
  RuleAction,
  WorkflowCategory,
  TriggerType,
  TriggerConfig,
  StepType,
  StepConfig,
  RuleType,
  TaskType,
  WorkflowDecision,
  WorkflowDecisionType,
  ApprovalCriteria,
  AutoApprovalResult
} from '../types/workflow';

import { logger } from '../utils/logger';
import { EventEmitter } from 'events';
import { taskAssignmentService } from './taskAssignmentService';
import { fraudDetectionEngine } from './fraudDetectionEngine';
import { returnFraudDetectionService } from './returnFraudDetectionService';
import { aiContentRiskScoringService } from './aiContentRiskScoringService';

export class WorkflowAutomationEngine extends EventEmitter {
  private static instance: WorkflowAutomationEngine;
  private executionQueue: Map<string, WorkflowInstance> = new Map();
  private activeExecutions: Set<string> = new Set();
  private ruleEngine: RuleEngine;

  constructor() {
    super();
    this.ruleEngine = new RuleEngine();
    this.startExecutionProcessor();
  }

  static getInstance(): WorkflowAutomationEngine {
    if (!WorkflowAutomationEngine.instance) {
      WorkflowAutomationEngine.instance = new WorkflowAutomationEngine();
    }
    return WorkflowAutomationEngine.instance;
  }

  // Template Management
  async createTemplate(templateData: CreateWorkflowTemplateRequest, createdBy?: string): Promise<WorkflowTemplate> {
    try {
      const template = await db.transaction(async (tx) => {
        // Create template
        const [newTemplate] = await tx.insert(workflowTemplates).values({
          name: templateData.name,
          description: templateData.description,
          category: templateData.category,
          triggerType: templateData.triggerType,
          triggerConfig: templateData.triggerConfig,
          createdBy
        }).returning();

        // Create steps
        const steps = await Promise.all(
          templateData.steps.map((step, index) =>
            tx.insert(workflowSteps).values({
              templateId: newTemplate.id,
              stepOrder: index + 1,
              stepType: step.stepType,
              stepConfig: step.stepConfig,
              conditions: step.conditions,
              timeoutMinutes: step.timeoutMinutes || 60,
              retryCount: step.retryCount || 0
            }).returning()
          )
        );

        return { ...newTemplate, steps: steps.flat() };
      });

      logger.info(`Workflow template created: ${template.id} `, { templateId: template.id, name: template.name });
      this.emit('templateCreated', template);

      return {
        ...template,
        category: template.category as WorkflowCategory,
        triggerType: template.triggerType as TriggerType,
        triggerConfig: template.triggerConfig as unknown as TriggerConfig,
        steps: template.steps.map(step => ({
          ...step,
          stepType: step.stepType as StepType,
          stepConfig: step.stepConfig as unknown as StepConfig,
          conditions: step.conditions as unknown as Record<string, any>
        }))
      };

    } catch (error) {
      logger.error('Failed to create workflow template', { error, templateData });
      throw new Error(`Failed to create workflow template: ${error.message} `);
    }
  }

  async getTemplate(templateId: string): Promise<WorkflowTemplate | null> {
    try {
      const template = await db.query.workflowTemplates.findFirst({
        where: eq(workflowTemplates.id, templateId),
        with: {
          steps: {
            orderBy: asc(workflowSteps.stepOrder)
          }
        }
      });

      return template || null;
    } catch (error) {
      logger.error('Failed to get workflow template', { error, templateId });
      throw new Error(`Failed to get workflow template: ${error.message} `);
    }
  }

  async listTemplates(category?: string, isActive?: boolean): Promise<WorkflowTemplate[]> {
    try {
      const conditions = [];
      if (category) conditions.push(eq(workflowTemplates.category, category));
      if (isActive !== undefined) conditions.push(eq(workflowTemplates.isActive, isActive));

      const templates = await db.query.workflowTemplates.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: desc(workflowTemplates.createdAt)
      });

      return templates.map(t => ({
        ...t,
        category: t.category as WorkflowCategory,
        triggerType: t.triggerType as TriggerType,
        triggerConfig: t.triggerConfig as unknown as TriggerConfig
      }));

    } catch (error) {
      logger.error('Failed to list workflow templates', { error, category, isActive });
      throw new Error(`Failed to list workflow templates: ${error.message} `);
    }
  }

  async updateTemplate(templateId: string, updates: Partial<WorkflowTemplate>, updatedBy?: string): Promise<WorkflowTemplate> {
    try {
      const template = await db.transaction(async (tx) => {
        // Update template
        const [updatedTemplate] = await tx.update(workflowTemplates)
          .set({
            ...updates,
            updatedAt: new Date()
          })
          .where(eq(workflowTemplates.id, templateId))
          .returning();

        if (!updatedTemplate) {
          throw new Error(`Workflow template not found: ${templateId} `);
        }

        return updatedTemplate;
      });

      logger.info(`Workflow template updated: ${template.id} `, { templateId: template.id, name: template.name });
      this.emit('templateUpdated', template);

      return {
        ...template,
        category: template.category as WorkflowCategory,
        triggerType: template.triggerType as TriggerType,
        triggerConfig: template.triggerConfig as unknown as TriggerConfig
      };
    } catch (error) {
      logger.error('Failed to update workflow template', { error, templateId, updates });
      throw new Error(`Failed to update workflow template: ${error.message} `);
    }
  }

  // Workflow Execution
  async executeWorkflow(request: ExecuteWorkflowRequest): Promise<WorkflowInstance> {
    try {
      const template = await this.getTemplate(request.templateId);
      if (!template) {
        throw new Error(`Workflow template not found: ${request.templateId} `);
      }

      if (!template.isActive) {
        throw new Error(`Workflow template is not active: ${request.templateId} `);
      }

      // Create workflow instance
      const [instance] = await db.insert(workflowInstances).values({
        templateId: request.templateId,
        status: 'pending',
        priority: request.priority || 5,
        contextData: request.contextData
      }).returning();

      // Add to execution queue
      const typedInstance: WorkflowInstance = {
        ...instance,
        status: instance.status as WorkflowStatus,
        contextData: instance.contextData as unknown as Record<string, any>
      };
      this.executionQueue.set(instance.id, typedInstance);

      logger.info(`Workflow instance created and queued: ${instance.id} `, {
        instanceId: instance.id,
        templateId: request.templateId
      });

      return {
        ...instance,
        status: instance.status as WorkflowStatus,
        contextData: instance.contextData as unknown as Record<string, any>
      };

    } catch (error) {
      logger.error('Failed to execute workflow', { error, request });
      throw new Error(`Failed to execute workflow: ${error.message} `);
    }
  }

  async getWorkflowInstance(instanceId: string): Promise<WorkflowInstance | null> {
    try {
      const instance = await db.query.workflowInstances.findFirst({
        where: eq(workflowInstances.id, instanceId),
        with: {
          template: true,
          stepExecutions: {
            with: {
              step: true,
              taskAssignments: true
            },
            orderBy: asc(workflowStepExecutions.createdAt)
          }
        }
      });

      return instance || null;
    } catch (error) {
      logger.error('Failed to get workflow instance', { error, instanceId });
      throw new Error(`Failed to get workflow instance: ${error.message} `);
    }
  }

  // Task Management
  async completeTask(request: CompleteTaskRequest, completedBy: string): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        // Update task assignment
        await tx.update(workflowTaskAssignments)
          .set({
            status: request.status,
            completionData: request.completionData,
            completedAt: new Date()
          })
          .where(eq(workflowTaskAssignments.id, request.taskId));

        // Get task assignment details
        const taskAssignment = await tx.query.workflowTaskAssignments.findFirst({
          where: eq(workflowTaskAssignments.id, request.taskId),
          with: {
            stepExecution: {
              with: {
                instance: true
              }
            }
          }
        });

        if (taskAssignment) {
          // Update step execution
          await tx.update(workflowStepExecutions)
            .set({
              status: request.status === 'completed' ? 'completed' : 'failed',
              outputData: request.completionData,
              completedAt: new Date()
            })
            .where(eq(workflowStepExecutions.id, taskAssignment.stepExecutionId));

          // Continue workflow execution if task completed successfully
          if (request.status === 'completed') {
            this.continueWorkflowExecution(taskAssignment.stepExecution.instanceId);
          }
        }
      });

      logger.info(`Task completed: ${request.taskId} `, {
        taskId: request.taskId,
        completedBy,
        status: request.status
      });

      this.emit('taskCompleted', { taskId: request.taskId, completedBy, status: request.status });
    } catch (error) {
      logger.error('Failed to complete task', { error, request, completedBy });
      throw new Error(`Failed to complete task: ${error.message} `);
    }
  }

  async getUserTasks(userId: string, status?: TaskStatus[]): Promise<WorkflowTaskAssignment[]> {
    try {
      const conditions = [eq(workflowTaskAssignments.assignedTo, userId)];
      if (status && status.length > 0) {
        conditions.push(inArray(workflowTaskAssignments.status, status));
      }

      const tasks = await db.query.workflowTaskAssignments.findMany({
        where: and(...conditions),
        with: {
          stepExecution: {
            with: {
              instance: {
                with: {
                  template: true
                }
              },
              step: true
            }
          }
        },
        orderBy: [
          desc(workflowTaskAssignments.priority),
          asc(workflowTaskAssignments.dueDate)
        ]
      });

      return tasks;
    } catch (error) {
      logger.error('Failed to get user tasks', { error, userId, status });
      throw new Error(`Failed to get user tasks: ${error.message} `);
    }
  }

  // Auto-Approval System
  async evaluateAutoApproval(context: {
    entityType: 'return' | 'dispute' | 'refund' | 'verification';
    entityId: string;
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    amount?: number;
    userId?: string;
    sellerId?: string;
    historicalData?: Record<string, any>;
  }): Promise<AutoApprovalResult> {
    try {
      // Get approval criteria for entity type
      const criteria = await this.getApprovalCriteria(context.entityType);
      const decision = await this.makeAutoApprovalDecision(context, criteria);
      
      // Log the decision
      await this.logApprovalDecision(context, decision);
      
      // Emit event for workflow triggers
      this.emit('autoApprovalEvaluated', { context, decision });
      
      return decision;
    } catch (error) {
      logger.error('Failed to evaluate auto-approval', { error, context });
      return {
        approved: false,
        reason: 'System error during evaluation',
        confidence: 0,
        requiresManualReview: true
      };
    }
  }

  async createApprovalCriteria(criteria: Omit<ApprovalCriteria, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApprovalCriteria> {
    try {
      const [newCriteria] = await db.insert(workflowApprovalCriteria).values(criteria).returning();
      
      logger.info(`Approval criteria created: ${newCriteria.id}`, { 
        criteriaId: newCriteria.id, 
        entityType: criteria.entityType 
      });
      
      return newCriteria;
    } catch (error) {
      logger.error('Failed to create approval criteria', { error, criteria });
      throw new Error(`Failed to create approval criteria: ${error.message}`);
    }
  }

  async getApprovalCriteria(entityType: string): Promise<ApprovalCriteria[]> {
    try {
      const criteria = await db.query.workflowApprovalCriteria.findMany({
        where: and(
          eq(workflowApprovalCriteria.entityType, entityType),
          eq(workflowApprovalCriteria.isActive, true)
        ),
        orderBy: desc(workflowApprovalCriteria.priority)
      });
      
      return criteria;
    } catch (error) {
      logger.error('Failed to get approval criteria', { error, entityType });
      throw new Error(`Failed to get approval criteria: ${error.message}`);
    }
  }

  private async makeAutoApprovalDecision(
    context: {
      entityType: 'return' | 'dispute' | 'refund' | 'verification';
      entityId: string;
      riskScore: number;
      riskLevel: 'low' | 'medium' | 'high';
      amount?: number;
      userId?: string;
      sellerId?: string;
      historicalData?: Record<string, any>;
    },
    criteria: ApprovalCriteria[]
  ): Promise<AutoApprovalResult> {
    let totalScore = 0;
    let maxScore = 0;
    let appliedCriteria: string[] = [];
    let rejectionReasons: string[] = [];

    for (const criterion of criteria) {
      const criterionScore = await this.evaluateCriterion(context, criterion);
      totalScore += criterionScore.score;
      maxScore += criterionScore.maxScore;
      
      if (criterionScore.applied) {
        appliedCriteria.push(criterion.name);
      }
      
      if (criterionScore.rejectionReason) {
        rejectionReasons.push(criterionScore.rejectionReason);
      }
    }

    const confidence = maxScore > 0 ? (totalScore / maxScore) : 0;
    const approved = confidence >= 0.7 && rejectionReasons.length === 0;
    const requiresManualReview = confidence < 0.5 || rejectionReasons.length > 0;

    return {
      approved,
      reason: approved ? 'Auto-approved based on criteria' : rejectionReasons.join(', ') || 'Does not meet approval criteria',
      confidence,
      requiresManualReview,
      appliedCriteria,
      score: totalScore,
      maxScore
    };
  }

  private async evaluateCriterion(
    context: {
      entityType: 'return' | 'dispute' | 'refund' | 'verification';
      entityId: string;
      riskScore: number;
      riskLevel: 'low' | 'medium' | 'high';
      amount?: number;
      userId?: string;
      sellerId?: string;
      historicalData?: Record<string, any>;
    },
    criterion: ApprovalCriteria
  ): Promise<{
    score: number;
    maxScore: number;
    applied: boolean;
    rejectionReason?: string;
  }> {
    let score = 0;
    let maxScore = 100;
    let applied = false;
    let rejectionReason: string | undefined;

    // Risk-based evaluation
    if (criterion.maxRiskScore !== undefined) {
      if (context.riskScore > criterion.maxRiskScore) {
        rejectionReason = `Risk score ${context.riskScore} exceeds maximum ${criterion.maxRiskScore}`;
        return { score: 0, maxScore, applied: false, rejectionReason };
      }
      score += 30;
    }

    // Amount-based evaluation
    if (criterion.maxAmount !== undefined && context.amount !== undefined) {
      if (context.amount > criterion.maxAmount) {
        rejectionReason = `Amount ${context.amount} exceeds maximum ${criterion.maxAmount}`;
        return { score: 0, maxScore, applied: false, rejectionReason };
      }
      score += 25;
    }

    // User history evaluation
    if (context.userId && criterion.requirePositiveHistory) {
      const userHistory = await this.evaluateUserHistory(context.userId, context.entityType);
      if (!userHistory.hasPositiveHistory) {
        rejectionReason = 'User does not have sufficient positive history';
        return { score: 0, maxScore, applied: false, rejectionReason };
      }
      score += 25;
    }

    // Fraud detection integration
    if (criterion.requireFraudCheck) {
      const fraudCheck = await this.performFraudCheck(context);
      if (fraudCheck.isSuspicious) {
        rejectionReason = `Fraud check failed: ${fraudCheck.reason}`;
        return { score: 0, maxScore, applied: false, rejectionReason };
      }
      score += 20;
    }

    applied = score > 0;
    return { score, maxScore, applied, rejectionReason };
  }

  private async evaluateUserHistory(userId: string, entityType: string): Promise<{
    hasPositiveHistory: boolean;
    completionRate: number;
    disputeRate: number;
    averageRating: number;
  }> {
    try {
      // Get user statistics based on entity type
      let completionRate = 0.95; // Default high completion rate
      let disputeRate = 0.02; // Default low dispute rate
      let averageRating = 4.5; // Default good rating

      if (entityType === 'return') {
        // Get return-specific statistics
        const [returnStats] = await db
          .select({
            totalReturns: sql<number>`count(*)`,
            approvedReturns: sql<number>`count(case when status = 'approved' then 1 end)`,
            disputedReturns: sql<number>`count(case when status = 'disputed' then 1 end)`
          })
          .from(returns)
          .where(eq(returns.buyerId, userId));

        if (returnStats.totalReturns > 0) {
          completionRate = returnStats.approvedReturns / returnStats.totalReturns;
          disputeRate = returnStats.disputedReturns / returnStats.totalReturns;
        }
      }

      const hasPositiveHistory = completionRate > 0.9 && disputeRate < 0.1 && averageRating > 4.0;
      
      return {
        hasPositiveHistory,
        completionRate,
        disputeRate,
        averageRating
      };
    } catch (error) {
      logger.error('Failed to evaluate user history', { error, userId, entityType });
      return {
        hasPositiveHistory: false,
        completionRate: 0,
        disputeRate: 1,
        averageRating: 0
      };
    }
  }

  private async performFraudCheck(context: {
    entityType: string;
    entityId: string;
    riskScore: number;
    userId?: string;
    sellerId?: string;
  }): Promise<{
    isSuspicious: boolean;
    reason?: string;
    confidence: number;
  }> {
    try {
      let fraudCheck;

      switch (context.entityType) {
        case 'return':
          fraudCheck = await returnFraudDetectionService.calculateRiskScore({
            returnId: context.entityId,
            buyerId: context.userId!,
            sellerId: context.sellerId!,
            reason: 'workflow_evaluation',
            amount: 0
          });
          break;
        case 'dispute':
          fraudCheck = await fraudDetectionEngine.analyzeTransaction({
            transactionId: context.entityId,
            userId: context.userId!,
            amount: 0,
            paymentMethod: 'unknown',
            userContext: {
              accountAge: 30,
              transactionHistory: [],
              verificationStatus: 'unverified'
            }
          });
          break;
        default:
          return { isSuspicious: false, confidence: 1.0 };
      }

      return {
        isSuspicious: fraudCheck.recommendation === 'auto_reject' || fraudCheck.riskScore > 70,
        reason: fraudCheck.reason,
        confidence: fraudCheck.riskScore / 100
      };
    } catch (error) {
      logger.error('Failed to perform fraud check', { error, context });
      return { isSuspicious: true, reason: 'Fraud check failed', confidence: 0.5 };
    }
  }

  private async logApprovalDecision(
    context: {
      entityType: 'return' | 'dispute' | 'refund' | 'verification';
      entityId: string;
      riskScore: number;
      riskLevel: 'low' | 'medium' | 'high';
    },
    decision: AutoApprovalResult
  ): Promise<void> {
    try {
      await db.insert(workflowDecisions).values({
        entityType: context.entityType,
        entityId: context.entityId,
        decisionType: decision.approved ? 'auto_approved' : 'auto_rejected',
        reason: decision.reason,
        confidence: decision.confidence,
        riskScore: context.riskScore,
        riskLevel: context.riskLevel,
        criteria: decision.appliedCriteria,
        metadata: {
          score: decision.score,
          maxScore: decision.maxScore,
          requiresManualReview: decision.requiresManualReview
        }
      });

      logger.info(`Auto-approval decision logged: ${context.entityId}`, {
        entityId: context.entityId,
        decision: decision.approved ? 'approved' : 'rejected',
        confidence: decision.confidence
      });
    } catch (error) {
      logger.error('Failed to log approval decision', { error, context, decision });
    }
  }

  async createWorkflowRule(
    rule: Omit<typeof workflowRules.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>,
    createdBy: string
  ): Promise<{
      success: boolean;
      ruleId?: string;
      error?: string;
    }> {
    try {
      const [newRule] = await db.insert(workflowRules).values({
        ...rule,
        createdBy
      }).returning();

      const typedRule: WorkflowRule = {
        ...newRule,
        ruleType: newRule.ruleType as RuleType,
        conditions: newRule.conditions as unknown as RuleCondition[],
        actions: newRule.actions as unknown as RuleAction[]
      };
      this.ruleEngine.addRule(typedRule);

      logger.info(`Workflow rule created: ${newRule.id} `, { ruleId: newRule.id, name: newRule.name });
      return {
        success: true,
        ruleId: newRule.id
      };

    } catch (error) {
      logger.error('Failed to create workflow rule', { error, rule });
      return {
        success: false,
        error: `Failed to create workflow rule: ${error.message}`
      };
    }
  }

  async evaluateRules(eventType: string, eventData: Record<string, any>): Promise<void> {
    try {
      const triggeredRules = await this.ruleEngine.evaluateRules(eventType, eventData);

      for (const rule of triggeredRules) {
        await this.executeRuleActions(rule, eventData);
      }
    } catch (error) {
      logger.error('Failed to evaluate rules', { error, eventType, eventData });
    }
  }

  // Error Recovery System
  async recoverFailedWorkflow(instanceId: string, recoveryStrategy?: string): Promise<boolean> {
    try {
      const instance = await this.getWorkflowInstance(instanceId);
      if (!instance) {
        throw new Error(`Workflow instance not found: ${instanceId}`);
      }

      if (instance.status !== 'failed') {
        logger.warn(`Workflow instance is not failed, skipping recovery: ${instanceId}`, {
          instanceId,
          status: instance.status
        });
        return false;
      }

      logger.info(`Attempting workflow recovery: ${instanceId}`, {
        instanceId,
        recoveryStrategy: recoveryStrategy || 'default'
      });

      // Analyze failure and determine recovery approach
      const failureAnalysis = await this.analyzeWorkflowFailure(instanceId);
      
      switch (recoveryStrategy || 'retry') {
        case 'retry':
          return await this.retryFailedWorkflow(instanceId, failureAnalysis);
        case 'rollback':
          return await this.rollbackWorkflow(instanceId, failureAnalysis);
        case 'escalate':
          return await this.escalateFailedWorkflow(instanceId, failureAnalysis);
        case 'skip':
          return await this.skipFailedStep(instanceId, failureAnalysis);
        default:
          return await this.retryFailedWorkflow(instanceId, failureAnalysis);
      }
    } catch (error) {
      logger.error('Failed to recover workflow', { error, instanceId, recoveryStrategy });
      return false;
    }
  }

  private async analyzeWorkflowFailure(instanceId: string): Promise<{
    failurePoint: string;
    errorType: string;
    retryable: boolean;
    escalationRequired: boolean;
  }> {
    try {
      const stepExecutions = await db.query.workflowStepExecutions.findMany({
        where: eq(workflowStepExecutions.instanceId, instanceId),
        orderBy: desc(workflowStepExecutions.createdAt)
      });

      const failedStep = stepExecutions.find(step => step.status === 'failed');
      if (!failedStep) {
        return {
          failurePoint: 'unknown',
          errorType: 'unknown',
          retryable: false,
          escalationRequired: true
        };
      }

      const errorMessage = failedStep.errorMessage || '';
      const errorType = this.categorizeError(errorMessage);
      const retryable = this.isRetryableError(errorType);
      const escalationRequired = !retryable || stepExecutions.filter(s => s.stepId === failedStep.stepId).length > 3;

      return {
        failurePoint: failedStep.stepId,
        errorType,
        retryable,
        escalationRequired
      };
    } catch (error) {
      logger.error('Failed to analyze workflow failure', { error, instanceId });
      return {
        failurePoint: 'unknown',
        errorType: 'analysis_failed',
        retryable: false,
        escalationRequired: true
      };
    }
  }

  private categorizeError(errorMessage: string): string {
    if (errorMessage.includes('timeout')) return 'timeout';
    if (errorMessage.includes('network')) return 'network';
    if (errorMessage.includes('validation')) return 'validation';
    if (errorMessage.includes('authorization')) return 'authorization';
    if (errorMessage.includes('rate_limit')) return 'rate_limit';
    if (errorMessage.includes('dependency')) return 'dependency';
    return 'unknown';
  }

  private isRetryableError(errorType: string): boolean {
    const retryableErrors = ['timeout', 'network', 'rate_limit', 'dependency'];
    return retryableErrors.includes(errorType);
  }

  private async retryFailedWorkflow(
    instanceId: string, 
    failureAnalysis: { failurePoint: string; retryable: boolean }
  ): Promise<boolean> {
    if (!failureAnalysis.retryable) {
      return false;
    }

    try {
      // Reset the failed step
      await db.update(workflowStepExecutions)
        .set({ 
          status: 'pending',
          errorMessage: null,
          startedAt: null,
          completedAt: null
        })
        .where(and(
          eq(workflowStepExecutions.instanceId, instanceId),
          eq(workflowStepExecutions.stepId, failureAnalysis.failurePoint)
        ));

      // Reset workflow instance
      await db.update(workflowInstances)
        .set({ 
          status: 'running',
          errorMessage: null
        })
        .where(eq(workflowInstances.id, instanceId));

      // Add back to execution queue
      const instance = await this.getWorkflowInstance(instanceId);
      if (instance) {
        this.executionQueue.set(instanceId, instance);
      }

      logger.info(`Workflow retry initiated: ${instanceId}`, { instanceId, failurePoint: failureAnalysis.failurePoint });
      return true;
    } catch (error) {
      logger.error('Failed to retry workflow', { error, instanceId });
      return false;
    }
  }

  private async rollbackWorkflow(
    instanceId: string, 
    failureAnalysis: { failurePoint: string }
  ): Promise<boolean> {
    try {
      // Mark workflow as rolled back
      await db.update(workflowInstances)
        .set({ 
          status: 'rolled_back',
          errorMessage: `Rolled back due to failure at step: ${failureAnalysis.failurePoint}`
        })
        .where(eq(workflowInstances.id, instanceId));

      logger.info(`Workflow rolled back: ${instanceId}`, { instanceId, failurePoint: failureAnalysis.failurePoint });
      return true;
    } catch (error) {
      logger.error('Failed to rollback workflow', { error, instanceId });
      return false;
    }
  }

  private async escalateFailedWorkflow(
    instanceId: string, 
    failureAnalysis: { failurePoint: string; errorType: string }
  ): Promise<boolean> {
    try {
      // Create escalation task
      await taskAssignmentService.createEscalationTask({
        taskId: instanceId,
        currentAssignee: 'system',
        escalationReason: 'manual',
        originalDueDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });

      // Mark workflow as escalated
      await db.update(workflowInstances)
        .set({ 
          status: 'escalated',
          errorMessage: `Escalated due to ${failureAnalysis.errorType} error at step: ${failureAnalysis.failurePoint}`
        })
        .where(eq(workflowInstances.id, instanceId));

      logger.info(`Workflow escalated: ${instanceId}`, { 
        instanceId, 
        failurePoint: failureAnalysis.failurePoint,
        errorType: failureAnalysis.errorType 
      });
      return true;
    } catch (error) {
      logger.error('Failed to escalate workflow', { error, instanceId });
      return false;
    }
  }

  private async skipFailedStep(
    instanceId: string, 
    failureAnalysis: { failurePoint: string }
  ): Promise<boolean> {
    try {
      // Mark failed step as skipped
      await db.update(workflowStepExecutions)
        .set({ 
          status: 'skipped',
          completedAt: new Date(),
          errorMessage: 'Step skipped due to failure recovery'
        })
        .where(and(
          eq(workflowStepExecutions.instanceId, instanceId),
          eq(workflowStepExecutions.stepId, failureAnalysis.failurePoint)
        ));

      // Continue workflow execution
      this.continueWorkflowExecution(instanceId);

      logger.info(`Failed step skipped: ${instanceId}`, { 
        instanceId, 
        skippedStep: failureAnalysis.failurePoint 
      });
      return true;
    } catch (error) {
      logger.error('Failed to skip step', { error, instanceId });
      return false;
    }
  }

  // Enhanced Analytics and Monitoring
  async getWorkflowAnalytics(templateId?: string, timeRange?: { start: Date; end: Date }): Promise<WorkflowAnalytics> {
    try {
      const conditions = [];
      if (templateId) conditions.push(eq(workflowInstances.templateId, templateId));
      if (timeRange) {
        conditions.push(
          and(
            sql`${workflowInstances.createdAt} >= ${timeRange.start} `,
            sql`${workflowInstances.createdAt} <= ${timeRange.end} `
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get basic metrics
      const [totalExecutions] = await db
        .select({ count: sql<number>`count(*)` })
        .from(workflowInstances)
        .where(whereClause);

      const [successfulExecutions] = await db
        .select({ count: sql<number>`count(*)` })
        .from(workflowInstances)
        .where(and(whereClause, eq(workflowInstances.status, 'completed')));

      const [avgExecutionTime] = await db
        .select({
          avg: sql<number>`avg(extract(epoch from(completed_at - started_at)))`
        })
        .from(workflowInstances)
        .where(and(whereClause, eq(workflowInstances.status, 'completed')));

      // Get bottlenecks (steps with longest average execution time)
      const bottlenecks = await db
        .select({
          stepId: workflowStepExecutions.stepId,
          averageTime: sql<number>`avg(extract(epoch from(completed_at - started_at)))`,
          frequency: sql<number>`count(*)`
        })
        .from(workflowStepExecutions)
        .innerJoin(workflowInstances, eq(workflowStepExecutions.instanceId, workflowInstances.id))
        .where(and(whereClause, eq(workflowStepExecutions.status, 'completed')))
        .groupBy(workflowStepExecutions.stepId)
        .orderBy(desc(sql`avg(extract(epoch from(completed_at - started_at)))`))
        .limit(5);

      // Get failure reasons
      const failureReasons = await db
        .select({
          reason: workflowInstances.errorMessage,
          count: sql<number>`count(*)`
        })
        .from(workflowInstances)
        .where(and(whereClause, eq(workflowInstances.status, 'failed')))
        .groupBy(workflowInstances.errorMessage)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

      const successRate = totalExecutions.count > 0
        ? (successfulExecutions.count / totalExecutions.count) * 100
        : 0;

      // Calculate SLA breaches (workflows taking longer than expected)
      const slaBreaches = await db
        .select({ count: sql<number>`count(*)` })
        .from(workflowInstances)
        .where(and(
          whereClause,
          eq(workflowInstances.status, 'completed'),
          sql`extract(epoch from (completed_at - started_at)) > 3600` // > 1 hour
        ));

      // Get efficiency metrics
      const efficiencyMetrics = await db
        .select({
          avgSteps: sql<number>`avg(step_count)`,
          avgTaskCompletionTime: sql<number>`avg(task_completion_time)`,
          automationRate: sql<number>`sum(case when auto_approved then 1 else 0 end) / count(*)`
        })
        .from(workflowInstances)
        .where(whereClause);

      // Get resource utilization
      const resourceUtilization = await db
        .select({
          userId: workflowTaskAssignments.assignedTo,
          taskCount: sql<number>`count(*)`,
          avgCompletionTime: sql<number>`avg(extract(epoch from (completed_at - assigned_at)))`,
          successRate: sql<number>`sum(case when status = 'completed' then 1 else 0 end) / count(*)`
        })
        .from(workflowTaskAssignments)
        .innerJoin(workflowStepExecutions, eq(workflowTaskAssignments.stepExecutionId, workflowStepExecutions.id))
        .innerJoin(workflowInstances, eq(workflowStepExecutions.instanceId, workflowInstances.id))
        .where(whereClause)
        .groupBy(workflowTaskAssignments.assignedTo)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

      return {
        totalExecutions: totalExecutions.count,
        successRate,
        averageExecutionTime: avgExecutionTime.avg || 0,
        bottlenecks: bottlenecks.map(b => ({
          stepId: b.stepId,
          stepName: `Step ${b.stepId}`,
          averageTime: b.averageTime,
          frequency: b.frequency,
          impact: b.averageTime > 300 ? 'high' : b.averageTime > 60 ? 'medium' : 'low'
        })),
        slaBreaches: slaBreaches[0]?.count || 0,
        topFailureReasons: failureReasons.map(f => ({
          reason: f.reason || 'Unknown',
          count: f.count,
          percentage: totalExecutions.count > 0 ? (f.count / totalExecutions.count) * 100 : 0
        })),
        efficiency: {
          averageSteps: efficiencyMetrics[0]?.avgSteps || 0,
          averageTaskCompletionTime: efficiencyMetrics[0]?.avgTaskCompletionTime || 0,
          automationRate: efficiencyMetrics[0]?.automationRate || 0
        },
        resourceUtilization: resourceUtilization.map(r => ({
          userId: r.userId,
          taskCount: r.taskCount,
          averageCompletionTime: r.avgCompletionTime,
          successRate: r.successRate
        })),
        optimizationSuggestions: this.generateOptimizationSuggestions({
          bottlenecks: bottlenecks.map(b => ({
            stepId: b.stepId,
            averageTime: b.averageTime,
            frequency: b.frequency
          })),
          failureReasons: failureReasons.map(f => ({
            reason: f.reason || 'Unknown',
            count: f.count
          })),
          slaBreaches: slaBreaches[0]?.count || 0,
          successRate
        })
      };
    } catch (error) {
      logger.error('Failed to get workflow analytics', { error, templateId, timeRange });
      throw new Error(`Failed to get workflow analytics: ${error.message} `);
    }
  }

  // Private Methods
  private startExecutionProcessor(): void {
    setInterval(async () => {
      await this.processExecutionQueue();
    }, 5000); // Process queue every 5 seconds
  }

  private async processExecutionQueue(): Promise<void> {
    try {
      const queuedInstances = Array.from(this.executionQueue.values())
        .filter(instance => !this.activeExecutions.has(instance.id))
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 10); // Process up to 10 workflows concurrently

      for (const instance of queuedInstances) {
        this.activeExecutions.add(instance.id);
        this.executeWorkflowInstance(instance.id).finally(() => {
          this.activeExecutions.delete(instance.id);
          this.executionQueue.delete(instance.id);
        });
      }
    } catch (error) {
      logger.error('Error processing execution queue', { error });
    }
  }

  private async executeWorkflowInstance(instanceId: string): Promise<void> {
    try {
      const instance = await this.getWorkflowInstance(instanceId);
      if (!instance) {
        throw new Error(`Workflow instance not found: ${instanceId} `);
      }

      const template = await this.getTemplate(instance.templateId);
      if (!template) {
        throw new Error(`Workflow template not found: ${instance.templateId} `);
      }

      // Update instance status to running
      await db.update(workflowInstances)
        .set({ status: 'running', startedAt: new Date() })
        .where(eq(workflowInstances.id, instanceId));

      // Execute steps in order
      const steps = template.steps?.sort((a, b) => a.stepOrder - b.stepOrder) || [];

      for (const step of steps) {
        const success = await this.executeWorkflowStep(instanceId, step, instance.contextData);
        if (!success) {
          await this.markWorkflowFailed(instanceId, `Step ${step.stepOrder} failed`);
          return;
        }
      }

      // Mark workflow as completed
      await db.update(workflowInstances)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(workflowInstances.id, instanceId));

      logger.info(`Workflow completed: ${instanceId} `, { instanceId });
      this.emit('workflowCompleted', { instanceId });

    } catch (error) {
      logger.error('Failed to execute workflow instance', { error, instanceId });
      await this.markWorkflowFailed(instanceId, error.message);
    }
  }

  private async executeWorkflowStep(
    instanceId: string,
    step: WorkflowStep,
    contextData?: Record<string, any>
  ): Promise<boolean> {
    try {
      // Create step execution record
      const [stepExecution] = await db.insert(workflowStepExecutions).values({
        instanceId,
        stepId: step.id,
        status: 'running',
        inputData: contextData,
        startedAt: new Date()
      }).returning();

      // Check step conditions
      if (step.conditions && !this.evaluateConditions(step.conditions, contextData)) {
        await db.update(workflowStepExecutions)
          .set({ status: 'skipped', completedAt: new Date() })
          .where(eq(workflowStepExecutions.id, stepExecution.id));
        return true;
      }

      // Execute step based on type
      let success = false;
      switch (step.stepType) {
        case 'action':
          success = await this.executeAction(stepExecution.id, step.stepConfig, contextData);
          break;
        case 'assignment':
          success = await this.createTaskAssignment(stepExecution.id, step.stepConfig, contextData);
          break;
        case 'notification':
          success = await this.sendNotification(stepExecution.id, step.stepConfig, contextData);
          break;
        case 'condition':
          success = this.evaluateConditions(step.stepConfig, contextData);
          break;
        default:
          throw new Error(`Unknown step type: ${step.stepType} `);
      }

      if (success) {
        await db.update(workflowStepExecutions)
          .set({ status: 'completed', completedAt: new Date() })
          .where(eq(workflowStepExecutions.id, stepExecution.id));
      } else {
        await db.update(workflowStepExecutions)
          .set({ status: 'failed', completedAt: new Date() })
          .where(eq(workflowStepExecutions.id, stepExecution.id));
      }

      return success;
    } catch (error) {
      logger.error('Failed to execute workflow step', { error, instanceId, stepId: step.id });
      return false;
    }
  }

  private async createTaskAssignment(
    stepExecutionId: string,
    stepConfig: any,
    contextData?: Record<string, any>
  ): Promise<boolean> {
    try {
      const assignedTo = await this.resolveAssignment(stepConfig.assignmentRules, contextData);
      if (!assignedTo) {
        throw new Error('Could not resolve task assignment');
      }

      const dueDate = stepConfig.dueInMinutes
        ? new Date(Date.now() + stepConfig.dueInMinutes * 60000)
        : undefined;

      await db.insert(workflowTaskAssignments).values({
        stepExecutionId,
        assignedTo,
        taskType: stepConfig.taskType,
        taskData: stepConfig.taskData || contextData || {},
        priority: stepConfig.priority || 5,
        dueDate,
        status: 'assigned'
      });

      return false; // Task assignments require manual completion
    } catch (error) {
      logger.error('Failed to create task assignment', { error, stepExecutionId, stepConfig });
      return false;
    }
  }

  private async resolveAssignment(
    assignmentRules: AssignmentRule[], 
    contextData?: Record<string, any>
  ): Promise<string | null> {
    try {
      // Use the task assignment service for intelligent routing
      const assignmentContext = {
        taskType: contextData?.taskType || 'workflow_task',
        priority: contextData?.priority || 5,
        requiredSkills: contextData?.requiredSkills,
        department: contextData?.department,
        complexity: this.assessComplexity(contextData),
        estimatedDuration: contextData?.estimatedDuration
      };

      // Delegate to task assignment service for intelligent routing
      const assignedUser = await taskAssignmentService.assignTask(
        assignmentContext,
        contextData?.assignmentStrategy || 'intelligent'
      );

      if (assignedUser) {
        logger.info(`Task assigned intelligently to user: ${assignedUser}`, {
          assignmentContext,
          strategy: contextData?.assignmentStrategy || 'intelligent'
        });
        return assignedUser;
      }

      // Fallback to simple assignment rules
      for (const rule of assignmentRules || []) {
        if (rule.type === 'user' && rule.criteria.userId) {
          return rule.criteria.userId;
        }
        if (rule.type === 'role' && rule.criteria.role) {
          // Find user with specific role
          const [user] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.role, rule.criteria.role))
            .limit(1);
          
          if (user) return user.id;
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to resolve assignment', { error, assignmentRules, contextData });
      return null;
    }
  }

  private assessComplexity(contextData?: Record<string, any>): 'low' | 'medium' | 'high' {
    if (!contextData) return 'medium';

    let complexityScore = 0;
    
    // Risk-based complexity
    if (contextData.riskScore) {
      if (contextData.riskScore > 70) complexityScore += 3;
      else if (contextData.riskScore > 40) complexityScore += 2;
      else complexityScore += 1;
    }
    
    // Amount-based complexity
    if (contextData.amount) {
      if (contextData.amount > 1000) complexityScore += 3;
      else if (contextData.amount > 100) complexityScore += 2;
      else complexityScore += 1;
    }
    
    // Entity type complexity
    switch (contextData.entityType) {
      case 'dispute': complexityScore += 2; break;
      case 'verification': complexityScore += 1; break;
      case 'return': complexityScore += 1; break;
      default: complexityScore += 1;
    }
    
    // Historical data complexity
    if (contextData.historicalData) {
      if (contextData.historicalData.previousDisputes > 0) complexityScore += 2;
      if (contextData.historicalData.userComplaints > 0) complexityScore += 1;
    }

    if (complexityScore >= 6) return 'high';
    if (complexityScore >= 3) return 'medium';
    return 'low';
  }

  private async executeAction(
    stepExecutionId: string,
    stepConfig: any,
    contextData?: Record<string, any>
  ): Promise<boolean> {
    try {
      // Execute the action based on actionType
      switch (stepConfig.actionType) {
        case 'update_status':
          // Update some entity status
          return true;
        case 'send_email':
          // Send email notification
          return true;
        case 'call_api':
          // Make external API call
          return true;
        default:
          logger.warn(`Unknown action type: ${stepConfig.actionType} `);
          return false;
      }
    } catch (error) {
      logger.error('Failed to execute action', { error, stepExecutionId, stepConfig });
      return false;
    }
  }

  private async sendNotification(
    stepExecutionId: string,
    stepConfig: any,
    contextData?: Record<string, any>
  ): Promise<boolean> {
    try {
      // Send notification based on configuration
      // This would integrate with the notification service
      return true;
    } catch (error) {
      logger.error('Failed to send notification', { error, stepExecutionId, stepConfig });
      return false;
    }
  }

  private evaluateConditions(conditions: Record<string, any>, contextData?: Record<string, any>): boolean {
    // Simple condition evaluation - in production, this would be more sophisticated
    try {
      // TODO: Implement proper condition evaluation logic
      return true;
    } catch (error) {
      logger.error('Failed to evaluate conditions', { error, conditions, contextData });
      return false;
    }
  }

  private async markWorkflowFailed(instanceId: string, errorMessage: string): Promise<void> {
    try {
      await db.update(workflowInstances)
        .set({
          status: 'failed',
          errorMessage,
          completedAt: new Date()
        })
        .where(eq(workflowInstances.id, instanceId));

      this.emit('workflowFailed', { instanceId, errorMessage });
    } catch (error) {
      logger.error('Failed to mark workflow as failed', { error, instanceId, errorMessage });
    }
  }

  private async continueWorkflowExecution(instanceId: string): Promise<void> {
    // Add the instance back to the queue for continued execution
    const instance = await this.getWorkflowInstance(instanceId);
    if (instance && instance.status === 'running') {
      this.executionQueue.set(instanceId, instance);
    }
  }

  private generateOptimizationSuggestions(analytics: {
    bottlenecks: Array<{ stepId: string; averageTime: number; frequency: number }>;
    failureReasons: Array<{ reason: string; count: number }>;
    slaBreaches: number;
    successRate: number;
  }): string[] {
    const suggestions: string[] = [];

    // Bottleneck suggestions
    const highImpactBottlenecks = analytics.bottlenecks.filter(b => b.averageTime > 300);
    if (highImpactBottlenecks.length > 0) {
      suggestions.push(`Optimize ${highImpactBottlenecks.length} high-impact bottlenecks with average execution time > 5 minutes`);
    }

    // Failure rate suggestions
    if (analytics.successRate < 90) {
      suggestions.push(`Improve success rate from ${analytics.successRate.toFixed(1)}% to target 95%+`);
    }

    // SLA breach suggestions
    if (analytics.slaBreaches > 0) {
      suggestions.push(`Investigate ${analytics.slaBreaches} SLA breaches and optimize workflow execution time`);
    }

    // Common failure suggestions
    const topFailures = analytics.failureReasons.slice(0, 3);
    topFailures.forEach(failure => {
      suggestions.push(`Address common failure: "${failure.reason}" (${failure.count} occurrences)`);
    });

    // Automation suggestions
    if (analytics.bottlenecks.some(b => b.frequency > 100 && b.averageTime < 60)) {
      suggestions.push('Consider automating high-frequency, low-complexity tasks to reduce manual workload');
    }

    return suggestions;
  }

  private async executeRuleActions(rule: WorkflowRule, eventData: Record<string, any>): Promise<void> {
    try {
      for (const action of rule.actions) {
        switch (action.type) {
          case 'create_workflow':
            await this.executeWorkflow({
              templateId: action.parameters.templateId,
              contextData: { ...eventData, ...action.parameters.contextData },
              priority: action.parameters.priority
            });
            break;
          case 'send_notification':
            // Send notification
            break;
          case 'update_data':
            // Update data
            break;
          case 'call_api':
            // Call external API
            break;
          default:
            logger.warn(`Unknown rule action type: ${action.type} `);
        }
      }
    } catch (error) {
      logger.error('Failed to execute rule actions', { error, ruleId: rule.id, eventData });
    }
  }
}

// Rule Engine for evaluating workflow rules
class RuleEngine {
  private rules: Map<string, WorkflowRule[]> = new Map();

  addRule(rule: WorkflowRule): void {
    const ruleType = rule.ruleType;
    if (!this.rules.has(ruleType)) {
      this.rules.set(ruleType, []);
    }
    this.rules.get(ruleType)!.push(rule);
  }

  async evaluateRules(eventType: string, eventData: Record<string, any>): Promise<WorkflowRule[]> {
    const triggeredRules: WorkflowRule[] = [];
    const triggerRules = this.rules.get('trigger') || [];

    for (const rule of triggerRules) {
      if (rule.isActive && this.evaluateRuleConditions(rule.conditions, eventData)) {
        triggeredRules.push(rule);
      }
    }

    return triggeredRules.sort((a, b) => b.priority - a.priority);
  }

  private evaluateRuleConditions(conditions: RuleCondition[], eventData: Record<string, any>): boolean {
    if (!conditions || conditions.length === 0) return true;

    let result = true;
    let currentLogicalOperator = 'AND';

    for (const condition of conditions) {
      const conditionResult = this.evaluateCondition(condition, eventData);

      if (currentLogicalOperator === 'AND') {
        result = result && conditionResult;
      } else if (currentLogicalOperator === 'OR') {
        result = result || conditionResult;
      }

      if (condition.logicalOperator) {
        currentLogicalOperator = condition.logicalOperator;
      }
    }

    return result;
  }

  private evaluateCondition(condition: RuleCondition, eventData: Record<string, any>): boolean {
    const fieldValue = this.getNestedValue(eventData, condition.field);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'regex':
        return new RegExp(condition.value).test(String(fieldValue));
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      default:
        return false;
    }
  }

  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}


export default WorkflowAutomationEngine;
