export interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'loop' | 'parallel' | 'human_review' | 'delay';
  config: {
    // Action step
    action?: 'send_email' | 'send_notification' | 'update_user' | 'moderate_content' | 'webhook' | 'custom';
    params?: Record<string, any>;
    
    // Condition step
    condition?: {
      field: string;
      operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'regex' | 'in';
      value: any;
    };
    ifTrue?: string; // Next step ID
    ifFalse?: string; // Next step ID
    
    // Loop step
    iterator?: string; // Array field to iterate
    loopSteps?: WorkflowStep[];
    maxIterations?: number;
    breakCondition?: {
      field: string;
      operator: string;
      value: any;
    };
    
    // Parallel step
    parallelBranches?: WorkflowStep[][];
    waitForAll?: boolean; // Wait for all branches or proceed when first completes
    
    // Human review step
    assignTo?: string[]; // List of admin IDs or roles
    reviewForm?: FormField[];
    timeout?: number; // Timeout in seconds
    escalationRules?: EscalationRule[];
    
    // Delay step
    delayMs?: number;
  };
  retryPolicy?: RetryPolicy;
  errorHandling?: ErrorHandling;
  nextStep?: string;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number' | 'date';
  options?: string[];
  required?: boolean;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
  };
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'fixed' | 'exponential' | 'linear';
  backoffMs: number;
  retryableErrors?: string[];
}

export interface ErrorHandling {
  onError: 'fail' | 'continue' | 'retry' | 'escalate' | 'fallback';
  fallbackStep?: string;
  notifyOnError?: boolean;
  notifyRecipients?: string[];
}

export interface EscalationRule {
  condition: 'timeout' | 'no_response' | 'custom';
  timeoutMinutes?: number;
  escalateTo: string[]; // Admin IDs or roles
  message?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'manual' | 'event' | 'schedule' | 'webhook';
    event?: string;
    schedule?: string; // Cron expression
  };
  steps: WorkflowStep[];
  variables?: Record<string, any>;
  metadata?: {
    author: string;
    createdAt: Date;
    updatedAt: Date;
    version: number;
  };
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  context: Record<string, any>;
  currentStep?: string;
  executionLog: ExecutionLogEntry[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface ExecutionLogEntry {
  stepId: string;
  stepName: string;
  status: 'success' | 'failed' | 'skipped' | 'retrying';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  result?: any;
  error?: string;
  retryCount?: number;
}

export interface WorkflowResult {
  success: boolean;
  executionId: string;
  finalContext: Record<string, any>;
  error?: string;
  executionTime: number;
}

/**
 * Enhanced Workflow Automation Engine
 * Supports conditional logic, loops, parallel execution, and human review steps
 */
export class EnhancedWorkflowEngine {
  private executionStore: Map<string, WorkflowExecution>;
  private humanReviewQueue: Map<string, {
    executionId: string;
    stepId: string;
    assignedTo: string[];
    timeout: NodeJS.Timeout;
  }>;

  constructor() {
    this.executionStore = new Map();
    this.humanReviewQueue = new Map();
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflow: WorkflowTemplate,
    initialContext: Record<string, any>
  ): Promise<WorkflowResult> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: workflow.id,
      status: 'running',
      context: { ...initialContext, ...workflow.variables },
      executionLog: [],
      startedAt: new Date(),
    };

    this.executionStore.set(executionId, execution);

    try {
      // Execute workflow steps
      await this.executeSteps(workflow.steps, execution);

      execution.status = 'completed';
      execution.completedAt = new Date();

      return {
        success: true,
        executionId,
        finalContext: execution.context,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.error = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        executionId,
        finalContext: execution.context,
        error: execution.error,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute workflow steps sequentially
   */
  private async executeSteps(
    steps: WorkflowStep[],
    execution: WorkflowExecution
  ): Promise<void> {
    let currentIndex = 0;

    while (currentIndex < steps.length) {
      const step = steps[currentIndex];
      execution.currentStep = step.id;

      const logEntry: ExecutionLogEntry = {
        stepId: step.id,
        stepName: step.name,
        status: 'success',
        startTime: new Date(),
      };

      try {
        const result = await this.executeStep(step, execution);
        
        logEntry.endTime = new Date();
        logEntry.duration = logEntry.endTime.getTime() - logEntry.startTime.getTime();
        logEntry.result = result;

        execution.executionLog.push(logEntry);

        // Handle conditional branching
        if (step.type === 'condition' && step.config.condition) {
          const nextStepId = result ? step.config.ifTrue : step.config.ifFalse;
          if (nextStepId) {
            const nextStepIndex = steps.findIndex(s => s.id === nextStepId);
            if (nextStepIndex >= 0) {
              currentIndex = nextStepIndex;
              continue;
            }
          }
        }

        // Move to next step
        if (step.nextStep) {
          const nextStepIndex = steps.findIndex(s => s.id === step.nextStep);
          if (nextStepIndex >= 0) {
            currentIndex = nextStepIndex;
            continue;
          }
        }

        currentIndex++;
      } catch (error) {
        logEntry.status = 'failed';
        logEntry.error = error instanceof Error ? error.message : String(error);
        logEntry.endTime = new Date();
        logEntry.duration = logEntry.endTime.getTime() - logEntry.startTime.getTime();

        execution.executionLog.push(logEntry);

        // Handle error based on error handling policy
        const shouldContinue = await this.handleStepError(step, error, execution);
        if (!shouldContinue) {
          throw error;
        }

        currentIndex++;
      }
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(
    step: WorkflowStep,
    execution: WorkflowExecution
  ): Promise<any> {
    switch (step.type) {
      case 'action':
        return await this.executeActionStep(step, execution);
      
      case 'condition':
        return await this.executeConditionStep(step, execution);
      
      case 'loop':
        return await this.executeLoopStep(step, execution);
      
      case 'parallel':
        return await this.executeParallelStep(step, execution);
      
      case 'human_review':
        return await this.executeHumanReviewStep(step, execution);
      
      case 'delay':
        return await this.executeDelayStep(step, execution);
      
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  /**
   * Execute action step
   */
  private async executeActionStep(
    step: WorkflowStep,
    execution: WorkflowExecution
  ): Promise<any> {
    const { action, params } = step.config;
    const resolvedParams = this.resolveParams(params || {}, execution.context);

    switch (action) {
      case 'send_email':
        return await this.sendEmail(resolvedParams);
      
      case 'send_notification':
        return await this.sendNotification(resolvedParams);
      
      case 'update_user':
        return await this.updateUser(resolvedParams);
      
      case 'moderate_content':
        return await this.moderateContent(resolvedParams);
      
      case 'webhook':
        return await this.callWebhook(resolvedParams);
      
      case 'custom':
        return await this.executeCustomAction(resolvedParams);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Execute condition step
   */
  private async executeConditionStep(
    step: WorkflowStep,
    execution: WorkflowExecution
  ): Promise<boolean> {
    const { condition } = step.config;
    if (!condition) {
      throw new Error('Condition configuration is required');
    }

    const fieldValue = this.getNestedValue(execution.context, condition.field);
    return this.evaluateCondition(fieldValue, condition.operator, condition.value);
  }

  /**
   * Execute loop step
   */
  private async executeLoopStep(
    step: WorkflowStep,
    execution: WorkflowExecution
  ): Promise<any[]> {
    const { iterator, loopSteps, maxIterations, breakCondition } = step.config;
    
    if (!iterator || !loopSteps) {
      throw new Error('Loop configuration incomplete');
    }

    const items = this.getNestedValue(execution.context, iterator);
    if (!Array.isArray(items)) {
      throw new Error(`Iterator field ${iterator} is not an array`);
    }

    const results: any[] = [];
    const iterations = maxIterations ? Math.min(items.length, maxIterations) : items.length;

    for (let i = 0; i < iterations; i++) {
      // Create loop context
      const loopContext = {
        ...execution.context,
        $item: items[i],
        $index: i,
        $isFirst: i === 0,
        $isLast: i === items.length - 1,
      };

      // Create temporary execution for loop
      const loopExecution = {
        ...execution,
        context: loopContext,
      };

      // Execute loop steps
      await this.executeSteps(loopSteps, loopExecution);
      
      // Update main context with loop results
      execution.context = { ...execution.context, ...loopExecution.context };
      results.push(loopExecution.context.$item);

      // Check break condition
      if (breakCondition) {
        const shouldBreak = this.evaluateCondition(
          this.getNestedValue(execution.context, breakCondition.field),
          breakCondition.operator,
          breakCondition.value
        );
        if (shouldBreak) break;
      }
    }

    return results;
  }

  /**
   * Execute parallel step
   */
  private async executeParallelStep(
    step: WorkflowStep,
    execution: WorkflowExecution
  ): Promise<any[]> {
    const { parallelBranches, waitForAll } = step.config;
    
    if (!parallelBranches || parallelBranches.length === 0) {
      throw new Error('Parallel branches configuration required');
    }

    const branchPromises = parallelBranches.map(async (branchSteps) => {
      const branchExecution = {
        ...execution,
        context: { ...execution.context },
      };
      await this.executeSteps(branchSteps, branchExecution);
      return branchExecution.context;
    });

    if (waitForAll === false) {
      // Return when first branch completes
      return [await Promise.race(branchPromises)];
    } else {
      // Wait for all branches
      return await Promise.all(branchPromises);
    }
  }

  /**
   * Execute human review step
   */
  private async executeHumanReviewStep(
    step: WorkflowStep,
    execution: WorkflowExecution
  ): Promise<any> {
    const { assignTo, reviewForm, timeout, escalationRules } = step.config;
    
    if (!assignTo || assignTo.length === 0) {
      throw new Error('Human review requires assignees');
    }

    // Pause execution and wait for human review
    execution.status = 'paused';

    return new Promise((resolve, reject) => {
      const reviewKey = `review_${execution.id}_${step.id}`;
      
      // Set up timeout
      const timeoutHandle = timeout ? setTimeout(() => {
        this.handleReviewTimeout(execution, step, escalationRules || []);
        reject(new Error('Human review timeout'));
      }, timeout * 1000) : null;

      this.humanReviewQueue.set(reviewKey, {
        executionId: execution.id,
        stepId: step.id,
        assignedTo: assignTo,
        timeout: timeoutHandle as any,
      });

      // In a real implementation, this would be resolved when an admin submits the review
      // For now, we'll simulate immediate resolution
      setTimeout(() => {
        execution.status = 'running';
        if (timeoutHandle) clearTimeout(timeoutHandle);
        this.humanReviewQueue.delete(reviewKey);
        resolve({ approved: true, notes: 'Auto-approved for testing' });
      }, 100);
    });
  }

  /**
   * Execute delay step
   */
  private async executeDelayStep(
    step: WorkflowStep,
    execution: WorkflowExecution
  ): Promise<void> {
    const { delayMs } = step.config;
    if (delayMs) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  /**
   * Handle step execution error
   */
  private async handleStepError(
    step: WorkflowStep,
    error: any,
    execution: WorkflowExecution
  ): Promise<boolean> {
    const errorHandling = step.errorHandling;
    
    if (!errorHandling) {
      return false; // Stop execution
    }

    switch (errorHandling.onError) {
      case 'continue':
        return true; // Continue to next step
      
      case 'retry':
        if (step.retryPolicy) {
          return await this.retryStep(step, execution);
        }
        return false;
      
      case 'escalate':
        await this.escalateError(step, error, execution, errorHandling);
        return false;
      
      case 'fallback':
        if (errorHandling.fallbackStep) {
          // Would need to jump to fallback step
          return true;
        }
        return false;
      
      case 'fail':
      default:
        return false;
    }
  }

  /**
   * Retry step execution
   */
  private async retryStep(
    step: WorkflowStep,
    execution: WorkflowExecution
  ): Promise<boolean> {
    const policy = step.retryPolicy!;
    let attempt = 0;

    while (attempt < policy.maxAttempts) {
      attempt++;
      
      // Calculate backoff delay
      let delay = policy.backoffMs;
      if (policy.backoffStrategy === 'exponential') {
        delay = policy.backoffMs * Math.pow(2, attempt - 1);
      } else if (policy.backoffStrategy === 'linear') {
        delay = policy.backoffMs * attempt;
      }

      await new Promise(resolve => setTimeout(resolve, delay));

      try {
        await this.executeStep(step, execution);
        return true; // Retry successful
      } catch (error) {
        if (attempt === policy.maxAttempts) {
          return false; // All retries exhausted
        }
      }
    }

    return false;
  }

  // Helper methods (implementations would be more complex in production)
  
  private resolveParams(params: Record<string, any>, context: Record<string, any>): Record<string, any> {
    const resolved: Record<string, any> = {};
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        const path = value.slice(2, -2).trim();
        resolved[key] = this.getNestedValue(context, path);
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private evaluateCondition(fieldValue: any, operator: string, compareValue: any): boolean {
    switch (operator) {
      case 'eq': return fieldValue === compareValue;
      case 'neq': return fieldValue !== compareValue;
      case 'gt': return fieldValue > compareValue;
      case 'lt': return fieldValue < compareValue;
      case 'gte': return fieldValue >= compareValue;
      case 'lte': return fieldValue <= compareValue;
      case 'contains': return String(fieldValue).includes(String(compareValue));
      case 'regex': return new RegExp(compareValue).test(String(fieldValue));
      case 'in': return Array.isArray(compareValue) && compareValue.includes(fieldValue);
      default: return false;
    }
  }

  private async sendEmail(params: any): Promise<void> {
    safeLogger.info('Sending email:', params);
  }

  private async sendNotification(params: any): Promise<void> {
    safeLogger.info('Sending notification:', params);
  }

  private async updateUser(params: any): Promise<void> {
    safeLogger.info('Updating user:', params);
  }

  private async moderateContent(params: any): Promise<void> {
    safeLogger.info('Moderating content:', params);
  }

  private async callWebhook(params: any): Promise<any> {
    safeLogger.info('Calling webhook:', params);
    return {};
  }

  private async executeCustomAction(params: any): Promise<any> {
    safeLogger.info('Executing custom action:', params);
    return {};
  }

  private async escalateError(
    step: WorkflowStep,
    error: any,
    execution: WorkflowExecution,
    errorHandling: ErrorHandling
  ): Promise<void> {
    safeLogger.info('Escalating error:', { step: step.name, error, execution: execution.id });
  }

  private handleReviewTimeout(
    execution: WorkflowExecution,
    step: WorkflowStep,
    escalationRules: EscalationRule[]
  ): void {
    safeLogger.info('Review timeout:', { execution: execution.id, step: step.name });
  }

  /**
   * Get workflow execution status
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executionStore.get(executionId);
  }

  /**
   * Cancel workflow execution
   */
  async cancelExecution(executionId: string): Promise<void> {
    const execution = this.executionStore.get(executionId);
    if (execution) {
      execution.status = 'cancelled';
      execution.completedAt = new Date();
    }
  }
}

// Export singleton
export const enhancedWorkflowEngine = new EnhancedWorkflowEngine();
