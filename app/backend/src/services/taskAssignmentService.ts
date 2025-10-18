import { db } from '../db/connection';
import { eq, and, or, desc, asc, sql, inArray, lt, gte } from 'drizzle-orm';
import { 
  WorkflowTaskAssignment, 
  WorkflowEscalation,
  AssignmentRule,
  TaskStatus,
  EscalationRule,
  NotificationTemplate
} from '../types/workflow';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

export interface UserWorkload {
  userId: string;
  activeTasks: number;
  averageCompletionTime: number;
  skillLevel: number;
  availability: 'available' | 'busy' | 'unavailable';
}

export interface AssignmentContext {
  taskType: string;
  priority: number;
  requiredSkills?: string[];
  department?: string;
  complexity?: 'low' | 'medium' | 'high';
  estimatedDuration?: number;
}

export interface EscalationContext {
  taskId: string;
  currentAssignee: string;
  escalationReason: 'timeout' | 'no_response' | 'manual' | 'sla_breach' | 'complexity';
  originalDueDate?: Date;
  attempts: number;
}

export class TaskAssignmentService extends EventEmitter {
  private static instance: TaskAssignmentService;
  private assignmentStrategies: Map<string, AssignmentStrategy> = new Map();
  private escalationRules: Map<string, EscalationRule[]> = new Map();
  private userWorkloadCache: Map<string, UserWorkload> = new Map();
  private roundRobinCounters: Map<string, number> = new Map();

  constructor() {
    super();
    this.initializeAssignmentStrategies();
    this.startWorkloadMonitoring();
    this.startEscalationMonitoring();
  }

  static getInstance(): TaskAssignmentService {
    if (!TaskAssignmentService.instance) {
      TaskAssignmentService.instance = new TaskAssignmentService();
    }
    return TaskAssignmentService.instance;
  }

  // Task Assignment Methods
  async assignTask(
    stepExecutionId: string,
    assignmentRules: AssignmentRule[],
    context: AssignmentContext,
    assignedBy?: string
  ): Promise<WorkflowTaskAssignment> {
    try {
      const assignedTo = await this.resolveAssignment(assignmentRules, context);
      if (!assignedTo) {
        throw new Error('Could not resolve task assignment');
      }

      const dueDate = this.calculateDueDate(context);
      
      const [taskAssignment] = await db.insert(workflowTaskAssignments).values({
        stepExecutionId,
        assignedTo,
        assignedBy,
        taskType: context.taskType,
        taskData: context,
        priority: context.priority,
        dueDate,
        status: 'assigned'
      }).returning();

      // Update user workload
      await this.updateUserWorkload(assignedTo, 1);

      // Send assignment notification
      await this.sendAssignmentNotification(taskAssignment);

      // Set up escalation monitoring
      await this.scheduleEscalationCheck(taskAssignment.id, dueDate);

      logger.info(`Task assigned: ${taskAssignment.id}`, {
        taskId: taskAssignment.id,
        assignedTo,
        assignedBy,
        taskType: context.taskType
      });

      this.emit('taskAssigned', { taskAssignment, context });
      return taskAssignment;
    } catch (error) {
      logger.error('Failed to assign task', { error, stepExecutionId, context });
      throw new Error(`Failed to assign task: ${error.message}`);
    }
  }

  async reassignTask(
    taskId: string,
    newAssignee: string,
    reason: string,
    reassignedBy: string
  ): Promise<void> {
    try {
      const task = await this.getTaskAssignment(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      const oldAssignee = task.assignedTo;

      await db.transaction(async (tx) => {
        // Update task assignment
        await tx.update(workflowTaskAssignments)
          .set({
            assignedTo: newAssignee,
            assignedBy: reassignedBy,
            assignedAt: new Date()
          })
          .where(eq(workflowTaskAssignments.id, taskId));

        // Update workload counters
        await this.updateUserWorkload(oldAssignee, -1);
        await this.updateUserWorkload(newAssignee, 1);
      });

      // Send reassignment notifications
      await this.sendReassignmentNotification(taskId, oldAssignee, newAssignee, reason);

      logger.info(`Task reassigned: ${taskId}`, {
        taskId,
        oldAssignee,
        newAssignee,
        reason,
        reassignedBy
      });

      this.emit('taskReassigned', { taskId, oldAssignee, newAssignee, reason });
    } catch (error) {
      logger.error('Failed to reassign task', { error, taskId, newAssignee });
      throw new Error(`Failed to reassign task: ${error.message}`);
    }
  }

  async resolveAssignment(rules: AssignmentRule[], context: AssignmentContext): Promise<string | null> {
    for (const rule of rules) {
      try {
        const strategy = this.assignmentStrategies.get(rule.type);
        if (strategy) {
          const assignee = await strategy.assign(rule, context);
          if (assignee) {
            return assignee;
          }
        }
      } catch (error) {
        logger.warn(`Assignment rule failed: ${rule.type}`, { error, rule, context });
        // Try fallback rule if available
        if (rule.fallback) {
          const fallbackAssignee = await this.resolveAssignment([rule.fallback], context);
          if (fallbackAssignee) {
            return fallbackAssignee;
          }
        }
      }
    }
    return null;
  }

  // Escalation Methods
  async escalateTask(
    taskId: string,
    escalationContext: EscalationContext,
    escalatedBy?: string
  ): Promise<WorkflowEscalation> {
    try {
      const task = await this.getTaskAssignment(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      // Determine escalation target
      const escalatedTo = await this.resolveEscalation(task, escalationContext);
      if (!escalatedTo) {
        throw new Error('Could not resolve escalation target');
      }

      // Create escalation record
      const [escalation] = await db.insert(workflowEscalations).values({
        assignmentId: taskId,
        escalationLevel: escalationContext.attempts + 1,
        escalatedTo,
        escalatedBy,
        escalationReason: escalationContext.escalationReason,
        escalationData: escalationContext
      }).returning();

      // Update task assignment
      await db.update(workflowTaskAssignments)
        .set({
          assignedTo: escalatedTo,
          status: 'escalated',
          assignedAt: new Date()
        })
        .where(eq(workflowTaskAssignments.id, taskId));

      // Update workload counters
      await this.updateUserWorkload(task.assignedTo, -1);
      await this.updateUserWorkload(escalatedTo, 1);

      // Send escalation notifications
      await this.sendEscalationNotification(escalation, task);

      logger.info(`Task escalated: ${taskId}`, {
        taskId,
        escalatedFrom: task.assignedTo,
        escalatedTo,
        reason: escalationContext.escalationReason,
        level: escalation.escalationLevel
      });

      this.emit('taskEscalated', { escalation, task, context: escalationContext });
      return escalation;
    } catch (error) {
      logger.error('Failed to escalate task', { error, taskId, escalationContext });
      throw new Error(`Failed to escalate task: ${error.message}`);
    }
  }

  async resolveEscalation(
    task: WorkflowTaskAssignment,
    context: EscalationContext
  ): Promise<string | null> {
    try {
      // Get escalation rules for this task type
      const rules = this.escalationRules.get(task.taskType) || [];
      
      for (const rule of rules) {
        if (this.matchesEscalationCondition(rule, context)) {
          if (typeof rule.escalateTo === 'string') {
            return rule.escalateTo;
          } else {
            // Resolve using assignment rule
            return await this.resolveAssignment([rule.escalateTo], {
              taskType: task.taskType,
              priority: Math.min(task.priority + 1, 10), // Increase priority
              complexity: 'high' // Escalated tasks are considered high complexity
            });
          }
        }
      }

      // Default escalation: find supervisor or admin
      return await this.findSupervisor(task.assignedTo);
    } catch (error) {
      logger.error('Failed to resolve escalation', { error, task, context });
      return null;
    }
  }

  // Workload Management
  async getUserWorkload(userId: string): Promise<UserWorkload> {
    try {
      // Check cache first
      const cached = this.userWorkloadCache.get(userId);
      if (cached) {
        return cached;
      }

      // Calculate workload from database
      const [activeTasksResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(workflowTaskAssignments)
        .where(
          and(
            eq(workflowTaskAssignments.assignedTo, userId),
            inArray(workflowTaskAssignments.status, ['assigned', 'in_progress'])
          )
        );

      const [avgCompletionResult] = await db
        .select({ 
          avg: sql<number>`avg(extract(epoch from (completed_at - assigned_at)))` 
        })
        .from(workflowTaskAssignments)
        .where(
          and(
            eq(workflowTaskAssignments.assignedTo, userId),
            eq(workflowTaskAssignments.status, 'completed')
          )
        );

      const workload: UserWorkload = {
        userId,
        activeTasks: activeTasksResult.count,
        averageCompletionTime: avgCompletionResult.avg || 0,
        skillLevel: await this.getUserSkillLevel(userId),
        availability: await this.getUserAvailability(userId)
      };

      // Cache for 5 minutes
      this.userWorkloadCache.set(userId, workload);
      setTimeout(() => this.userWorkloadCache.delete(userId), 5 * 60 * 1000);

      return workload;
    } catch (error) {
      logger.error('Failed to get user workload', { error, userId });
      throw new Error(`Failed to get user workload: ${error.message}`);
    }
  }

  async balanceWorkload(): Promise<void> {
    try {
      // Get all users with active tasks
      const userWorkloads = await this.getAllUserWorkloads();
      
      // Identify overloaded and underloaded users
      const avgWorkload = userWorkloads.reduce((sum, w) => sum + w.activeTasks, 0) / userWorkloads.length;
      const overloaded = userWorkloads.filter(w => w.activeTasks > avgWorkload * 1.5);
      const underloaded = userWorkloads.filter(w => w.activeTasks < avgWorkload * 0.5 && w.availability === 'available');

      // Redistribute tasks from overloaded to underloaded users
      for (const overloadedUser of overloaded) {
        const tasksToReassign = Math.floor((overloadedUser.activeTasks - avgWorkload) / 2);
        
        if (tasksToReassign > 0 && underloaded.length > 0) {
          const tasks = await this.getReassignableTasks(overloadedUser.userId, tasksToReassign);
          
          for (const task of tasks) {
            const targetUser = this.selectBestAssignee(underloaded, {
              taskType: task.taskType,
              priority: task.priority
            });
            
            if (targetUser) {
              await this.reassignTask(
                task.id,
                targetUser.userId,
                'Workload balancing',
                'system'
              );
            }
          }
        }
      }

      logger.info('Workload balancing completed', { 
        overloadedUsers: overloaded.length,
        underloadedUsers: underloaded.length
      });
    } catch (error) {
      logger.error('Failed to balance workload', { error });
    }
  }

  // SLA and Performance Tracking
  async trackSLACompliance(taskId: string): Promise<void> {
    try {
      const task = await this.getTaskAssignment(taskId);
      if (!task || !task.dueDate) return;

      const now = new Date();
      const isOverdue = now > task.dueDate;
      const timeToDeadline = task.dueDate.getTime() - now.getTime();

      if (isOverdue && task.status !== 'completed') {
        // SLA breach - escalate
        await this.escalateTask(taskId, {
          taskId,
          currentAssignee: task.assignedTo,
          escalationReason: 'sla_breach',
          originalDueDate: task.dueDate,
          attempts: 0
        });
      } else if (timeToDeadline < 30 * 60 * 1000 && task.status === 'assigned') {
        // 30 minutes to deadline - send reminder
        await this.sendDeadlineReminder(task);
      }
    } catch (error) {
      logger.error('Failed to track SLA compliance', { error, taskId });
    }
  }

  // Private Helper Methods
  private initializeAssignmentStrategies(): void {
    this.assignmentStrategies.set('user', new UserAssignmentStrategy());
    this.assignmentStrategies.set('role', new RoleAssignmentStrategy());
    this.assignmentStrategies.set('skill', new SkillAssignmentStrategy());
    this.assignmentStrategies.set('workload', new WorkloadAssignmentStrategy(this));
    this.assignmentStrategies.set('round_robin', new RoundRobinAssignmentStrategy(this));
  }

  private startWorkloadMonitoring(): void {
    // Monitor workload every 5 minutes
    setInterval(async () => {
      try {
        await this.balanceWorkload();
      } catch (error) {
        logger.error('Workload monitoring error', { error });
      }
    }, 5 * 60 * 1000);
  }

  private startEscalationMonitoring(): void {
    // Check for escalations every minute
    setInterval(async () => {
      try {
        await this.checkPendingEscalations();
      } catch (error) {
        logger.error('Escalation monitoring error', { error });
      }
    }, 60 * 1000);
  }

  private async checkPendingEscalations(): Promise<void> {
    try {
      const overdueTasks = await db.query.workflowTaskAssignments.findMany({
        where: and(
          inArray(workflowTaskAssignments.status, ['assigned', 'in_progress']),
          lt(workflowTaskAssignments.dueDate, new Date())
        )
      });

      for (const task of overdueTasks) {
        await this.trackSLACompliance(task.id);
      }
    } catch (error) {
      logger.error('Failed to check pending escalations', { error });
    }
  }

  private calculateDueDate(context: AssignmentContext): Date {
    const baseMinutes = context.estimatedDuration || 60;
    const priorityMultiplier = context.priority > 7 ? 0.5 : context.priority < 4 ? 2 : 1;
    const complexityMultiplier = context.complexity === 'high' ? 2 : context.complexity === 'low' ? 0.5 : 1;
    
    const totalMinutes = baseMinutes * priorityMultiplier * complexityMultiplier;
    return new Date(Date.now() + totalMinutes * 60 * 1000);
  }

  private async getTaskAssignment(taskId: string): Promise<WorkflowTaskAssignment | null> {
    try {
      return await db.query.workflowTaskAssignments.findFirst({
        where: eq(workflowTaskAssignments.id, taskId)
      });
    } catch (error) {
      logger.error('Failed to get task assignment', { error, taskId });
      return null;
    }
  }

  private async updateUserWorkload(userId: string, delta: number): Promise<void> {
    // Update cached workload
    const cached = this.userWorkloadCache.get(userId);
    if (cached) {
      cached.activeTasks = Math.max(0, cached.activeTasks + delta);
    }
  }

  private async getUserSkillLevel(userId: string): Promise<number> {
    // TODO: Implement skill level calculation based on user profile and performance
    return 5; // Default skill level
  }

  private async getUserAvailability(userId: string): Promise<'available' | 'busy' | 'unavailable'> {
    // TODO: Implement availability checking (calendar integration, status, etc.)
    return 'available';
  }

  private async getAllUserWorkloads(): Promise<UserWorkload[]> {
    // TODO: Implement efficient bulk workload calculation
    return [];
  }

  private async getReassignableTasks(userId: string, limit: number): Promise<WorkflowTaskAssignment[]> {
    try {
      return await db.query.workflowTaskAssignments.findMany({
        where: and(
          eq(workflowTaskAssignments.assignedTo, userId),
          eq(workflowTaskAssignments.status, 'assigned')
        ),
        orderBy: asc(workflowTaskAssignments.priority),
        limit
      });
    } catch (error) {
      logger.error('Failed to get reassignable tasks', { error, userId });
      return [];
    }
  }

  private selectBestAssignee(candidates: UserWorkload[], context: AssignmentContext): UserWorkload | null {
    if (candidates.length === 0) return null;

    // Score candidates based on workload, skill level, and availability
    const scored = candidates.map(candidate => ({
      ...candidate,
      score: this.calculateAssignmentScore(candidate, context)
    }));

    // Return candidate with highest score
    return scored.reduce((best, current) => 
      current.score > best.score ? current : best
    );
  }

  private calculateAssignmentScore(candidate: UserWorkload, context: AssignmentContext): number {
    let score = 100;
    
    // Penalize high workload
    score -= candidate.activeTasks * 10;
    
    // Reward high skill level
    score += candidate.skillLevel * 5;
    
    // Penalize unavailability
    if (candidate.availability === 'busy') score -= 20;
    if (candidate.availability === 'unavailable') score -= 50;
    
    // Reward fast completion times
    if (candidate.averageCompletionTime > 0) {
      score += Math.max(0, 100 - candidate.averageCompletionTime / 60); // Bonus for sub-hour completion
    }
    
    return Math.max(0, score);
  }

  private matchesEscalationCondition(rule: EscalationRule, context: EscalationContext): boolean {
    return rule.condition === context.escalationReason;
  }

  private async findSupervisor(userId: string): Promise<string | null> {
    // TODO: Implement supervisor lookup from organizational hierarchy
    return null;
  }

  private async scheduleEscalationCheck(taskId: string, dueDate: Date): Promise<void> {
    // TODO: Implement escalation scheduling (could use job queue)
  }

  private async sendAssignmentNotification(task: WorkflowTaskAssignment): Promise<void> {
    // TODO: Implement notification sending
  }

  private async sendReassignmentNotification(
    taskId: string, 
    oldAssignee: string, 
    newAssignee: string, 
    reason: string
  ): Promise<void> {
    // TODO: Implement reassignment notification
  }

  private async sendEscalationNotification(
    escalation: WorkflowEscalation, 
    task: WorkflowTaskAssignment
  ): Promise<void> {
    // TODO: Implement escalation notification
  }

  private async sendDeadlineReminder(task: WorkflowTaskAssignment): Promise<void> {
    // TODO: Implement deadline reminder notification
  }
}

// Assignment Strategy Interfaces and Implementations
interface AssignmentStrategy {
  assign(rule: AssignmentRule, context: AssignmentContext): Promise<string | null>;
}

class UserAssignmentStrategy implements AssignmentStrategy {
  async assign(rule: AssignmentRule, context: AssignmentContext): Promise<string | null> {
    return rule.criteria.userId || null;
  }
}

class RoleAssignmentStrategy implements AssignmentStrategy {
  async assign(rule: AssignmentRule, context: AssignmentContext): Promise<string | null> {
    // TODO: Implement role-based assignment
    return null;
  }
}

class SkillAssignmentStrategy implements AssignmentStrategy {
  async assign(rule: AssignmentRule, context: AssignmentContext): Promise<string | null> {
    // TODO: Implement skill-based assignment
    return null;
  }
}

class WorkloadAssignmentStrategy implements AssignmentStrategy {
  constructor(private taskService: TaskAssignmentService) {}

  async assign(rule: AssignmentRule, context: AssignmentContext): Promise<string | null> {
    // TODO: Implement workload-based assignment
    return null;
  }
}

class RoundRobinAssignmentStrategy implements AssignmentStrategy {
  constructor(private taskService: TaskAssignmentService) {}

  async assign(rule: AssignmentRule, context: AssignmentContext): Promise<string | null> {
    // TODO: Implement round-robin assignment
    return null;
  }
}

// Import statements for database tables (these would be defined in the schema)
const workflowTaskAssignments = {} as any;
const workflowEscalations = {} as any;

export default TaskAssignmentService;