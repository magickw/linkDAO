import { db } from '../db';
import { eq, and, or, desc, asc, sql, inArray } from 'drizzle-orm';
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
  RuleAction
} from '../types/workflow';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

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

      logger.info(`Workflow template created: ${template.id}`, { templateId: template.id, name: template.name });
      this.emit('templateCreated', template);
      
      return template;
    } catch (error) {
      logger.error('Failed to create workflow template', { error, templateData });
      throw new Error(`Failed to create workflow template: ${error.message}`);
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
      throw new Error(`Failed to get workflow template: ${error.message}`);
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

      return templates;
    } catch (error) {
      logger.error('Failed to list workflow templates', { error, category, isActive });
      throw new Error(`Failed to list workflow templates: ${error.message}`);
    }
  }

  async updateTemplate(templateId: string, updates: Partial<WorkflowTemplate>, updatedBy?: string): Promise<WorkflowTemplate> {
    try {
      const template = await db.transaction(async (tx) => {
        // Update template
        const [updatedTemplate] = await tx.update(workflowTemplates)
          .set({
            ...updates,
            updatedBy,
            updatedAt: new Date()
          })
          .where(eq(workflowTemplates.id, templateId))
          .returning();

        if (!updatedTemplate) {
          throw new Error(`Workflow template not found: ${templateId}`);
        }

        return updatedTemplate;
      });

      logger.info(`Workflow template updated: ${template.id}`, { templateId: template.id, name: template.name });
      this.emit('templateUpdated', template);
      
      return template;
    } catch (error) {
      logger.error('Failed to update workflow template', { error, templateId, updates });
      throw new Error(`Failed to update workflow template: ${error.message}`);
    }
  }

  // Workflow Execution
  async executeWorkflow(request: ExecuteWorkflowRequest): Promise<WorkflowInstance> {
    try {
      const template = await this.getTemplate(request.templateId);
      if (!template) {
        throw new Error(`Workflow template not found: ${request.templateId}`);
      }

      if (!template.isActive) {
        throw new Error(`Workflow template is not active: ${request.templateId}`);
      }

      // Create workflow instance
      const [instance] = await db.insert(workflowInstances).values({
        templateId: request.templateId,
        status: 'pending',
        priority: request.priority || 5,
        contextData: request.contextData
      }).returning();

      // Add to execution queue
      this.executionQueue.set(instance.id, instance);

      logger.info(`Workflow instance created and queued: ${instance.id}`, { 
        instanceId: instance.id, 
        templateId: request.templateId 
      });

      this.emit('workflowQueued', instance);
      return instance;
    } catch (error) {
      logger.error('Failed to execute workflow', { error, request });
      throw new Error(`Failed to execute workflow: ${error.message}`);
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
      throw new Error(`Failed to get workflow instance: ${error.message}`);
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

      logger.info(`Task completed: ${request.taskId}`, { 
        taskId: request.taskId, 
        completedBy, 
        status: request.status 
      });

      this.emit('taskCompleted', { taskId: request.taskId, completedBy, status: request.status });
    } catch (error) {
      logger.error('Failed to complete task', { error, request, completedBy });
      throw new Error(`Failed to complete task: ${error.message}`);
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
      throw new Error(`Failed to get user tasks: ${error.message}`);
    }
  }

  // Rule Engine Integration
  async createRule(rule: Omit<WorkflowRule, 'id' | 'createdAt' | 'updatedAt'>, createdBy?: string): Promise<WorkflowRule> {
    try {
      const [newRule] = await db.insert(workflowRules).values({
        ...rule,
        createdBy
      }).returning();

      this.ruleEngine.addRule(newRule);
      
      logger.info(`Workflow rule created: ${newRule.id}`, { ruleId: newRule.id, name: newRule.name });
      return newRule;
    } catch (error) {
      logger.error('Failed to create workflow rule', { error, rule });
      throw new Error(`Failed to create workflow rule: ${error.message}`);
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

  // Analytics and Monitoring
  async getWorkflowAnalytics(templateId?: string, timeRange?: { start: Date; end: Date }): Promise<WorkflowAnalytics> {
    try {
      const conditions = [];
      if (templateId) conditions.push(eq(workflowInstances.templateId, templateId));
      if (timeRange) {
        conditions.push(
          and(
            sql`${workflowInstances.createdAt} >= ${timeRange.start}`,
            sql`${workflowInstances.createdAt} <= ${timeRange.end}`
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
          avg: sql<number>`avg(extract(epoch from (completed_at - started_at)))` 
        })
        .from(workflowInstances)
        .where(and(whereClause, eq(workflowInstances.status, 'completed')));

      // Get bottlenecks (steps with longest average execution time)
      const bottlenecks = await db
        .select({
          stepId: workflowStepExecutions.stepId,
          averageTime: sql<number>`avg(extract(epoch from (completed_at - started_at)))`,
          frequency: sql<number>`count(*)`
        })
        .from(workflowStepExecutions)
        .innerJoin(workflowInstances, eq(workflowStepExecutions.instanceId, workflowInstances.id))
        .where(and(whereClause, eq(workflowStepExecutions.status, 'completed')))
        .groupBy(workflowStepExecutions.stepId)
        .orderBy(desc(sql`avg(extract(epoch from (completed_at - started_at)))`))
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

      return {
        totalExecutions: totalExecutions.count,
        successRate,
        averageExecutionTime: avgExecutionTime.avg || 0,
        bottlenecks: bottlenecks.map(b => ({
          stepId: b.stepId,
          stepName: `Step ${b.stepId}`, // TODO: Get actual step name
          averageTime: b.averageTime,
          frequency: b.frequency,
          impact: b.averageTime > 300 ? 'high' : b.averageTime > 60 ? 'medium' : 'low'
        })),
        slaBreaches: 0, // TODO: Calculate SLA breaches
        topFailureReasons: failureReasons.map(f => ({
          reason: f.reason || 'Unknown',
          count: f.count,
          percentage: totalExecutions.count > 0 ? (f.count / totalExecutions.count) * 100 : 0
        }))
      };
    } catch (error) {
      logger.error('Failed to get workflow analytics', { error, templateId, timeRange });
      throw new Error(`Failed to get workflow analytics: ${error.message}`);
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
        throw new Error(`Workflow instance not found: ${instanceId}`);
      }

      const template = await this.getTemplate(instance.templateId);
      if (!template) {
        throw new Error(`Workflow template not found: ${instance.templateId}`);
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

      logger.info(`Workflow completed: ${instanceId}`, { instanceId });
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
          throw new Error(`Unknown step type: ${step.stepType}`);
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

  private async resolveAssignment(assignmentRules: AssignmentRule[], contextData?: Record<string, any>): Promise<string | null> {
    // Simple implementation - in production, this would be more sophisticated
    for (const rule of assignmentRules || []) {
      if (rule.type === 'user' && rule.criteria.userId) {
        return rule.criteria.userId;
      }
      // TODO: Implement other assignment types (role, skill, workload, round_robin)
    }
    return null;
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
          logger.warn(`Unknown action type: ${stepConfig.actionType}`);
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
            logger.warn(`Unknown rule action type: ${action.type}`);
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

// Import statements for database tables (these would be defined in the schema)
const workflowTemplates = {} as any;
const workflowInstances = {} as any;
const workflowSteps = {} as any;
const workflowStepExecutions = {} as any;
const workflowTaskAssignments = {} as any;
const workflowRules = {} as any;
const workflowMetrics = {} as any;

export default WorkflowAutomationEngine;
