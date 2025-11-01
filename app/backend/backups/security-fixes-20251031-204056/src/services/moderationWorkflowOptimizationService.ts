import { databaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { moderationCases, users, moderationAuditLog } from '../db/schema';
import { safeLogger } from '../utils/safeLogger';
import { eq, desc, and, gte, lte, sql, count, avg, sum } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { aiContentRiskScoringService } from './aiContentRiskScoringService';
import { safeLogger } from '../utils/safeLogger';

export interface ModerationTask {
  id: string;
  contentId: string;
  contentType: string;
  priority: number;
  estimatedComplexity: number;
  estimatedTimeMinutes: number;
  assignedModeratorId?: string;
  riskScore: number;
  confidence: number;
  createdAt: Date;
  dueDate: Date;
  tags: string[];
  metadata: Record<string, any>;
}

export interface ModeratorWorkload {
  moderatorId: string;
  currentTasks: number;
  averageCompletionTime: number;
  specializations: string[];
  performanceScore: number;
  availabilityHours: number;
  timezone: string;
  maxConcurrentTasks: number;
}

export interface WorkflowMetrics {
  averageProcessingTime: number;
  queueLength: number;
  throughputPerHour: number;
  bottlenecks: BottleneckAnalysis[];
  moderatorEfficiency: ModeratorEfficiency[];
  slaCompliance: number;
}

export interface BottleneckAnalysis {
  stage: string;
  averageWaitTime: number;
  taskCount: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export interface ModeratorEfficiency {
  moderatorId: string;
  tasksCompleted: number;
  averageTime: number;
  accuracyRate: number;
  specializations: string[];
  efficiency: number;
}

export interface QueueOptimizationResult {
  reorderedTasks: ModerationTask[];
  assignments: TaskAssignment[];
  estimatedCompletionTime: number;
  reasoning: string;
}

export interface TaskAssignment {
  taskId: string;
  moderatorId: string;
  priority: number;
  estimatedStartTime: Date;
  estimatedCompletionTime: Date;
  confidence: number;
}

export class ModerationWorkflowOptimizationService {
  private priorityWeights = {
    riskScore: 0.4,
    urgency: 0.3,
    complexity: 0.2,
    userImpact: 0.1
  };

  private slaTargets = {
    high: 30, // minutes
    medium: 120, // minutes  
    low: 480 // minutes
  };

  /**
   * Optimize the moderation queue using intelligent prioritization
   */
  async optimizeQueue(): Promise<QueueOptimizationResult> {
    try {
      // Get current pending tasks
      const pendingTasks = await this.getPendingTasks();
      
      // Get current moderator workloads
      const moderatorWorkloads = await this.getModeratorWorkloads();
      
      // Calculate priority scores for all tasks
      const prioritizedTasks = await this.calculateTaskPriorities(pendingTasks);
      
      // Optimize task assignments
      const assignments = await this.optimizeTaskAssignments(prioritizedTasks, moderatorWorkloads);
      
      // Reorder tasks based on optimization
      const reorderedTasks = this.reorderTasksByOptimization(prioritizedTasks, assignments);
      
      // Calculate estimated completion time
      const estimatedCompletionTime = this.calculateEstimatedCompletionTime(assignments);
      
      return {
        reorderedTasks,
        assignments,
        estimatedCompletionTime,
        reasoning: this.generateOptimizationReasoning(assignments, moderatorWorkloads)
      };

    } catch (error) {
      safeLogger.error('Error optimizing moderation queue:', error);
      throw new Error('Failed to optimize moderation queue');
    }
  }

  /**
   * Get all pending moderation tasks
   */
  private async getPendingTasks(): Promise<ModerationTask[]> {
    const db = databaseService.getDatabase();
    
    const cases = await db
      .select()
      .from(moderationCases)
      .where(eq(moderationCases.status, 'pending'))
      .orderBy(desc(moderationCases.createdAt));

    return cases.map(case_ => ({
      id: case_.id.toString(),
      contentId: case_.contentId,
      contentType: case_.contentType || 'post',
      priority: this.calculateBasePriority(case_.riskScore || 0),
      estimatedComplexity: this.estimateComplexity(case_),
      estimatedTimeMinutes: this.estimateProcessingTime(case_),
      riskScore: case_.riskScore || 0,
      confidence: case_.confidence || 0.5,
      createdAt: case_.createdAt || new Date(),
      dueDate: this.calculateDueDate(case_),
      tags: this.extractTags(case_),
      metadata: case_.metadata || {}
    }));
  }

  /**
   * Get current workload for all moderators
   */
  private async getModeratorWorkloads(): Promise<ModeratorWorkload[]> {
    const db = databaseService.getDatabase();
    
    // Get moderators with their current workloads
    const moderatorStats = await db
      .select({
        moderatorId: moderationCases.assignedModeratorId,
        currentTasks: count(moderationCases.id),
        avgTime: avg(sql`EXTRACT(EPOCH FROM (updated_at - created_at))/60`)
      })
      .from(moderationCases)
      .where(eq(moderationCases.status, 'under_review'))
      .groupBy(moderationCases.assignedModeratorId);

    // Get all moderators (assuming they have a role or permission)
    const allModerators = await db
      .select()
      .from(users)
      .limit(50); // Simplified - would filter by moderator role

    return allModerators.map(moderator => {
      const stats = moderatorStats.find(s => s.moderatorId === moderator.id);
      
      return {
        moderatorId: moderator.id,
        currentTasks: stats?.currentTasks || 0,
        averageCompletionTime: stats?.avgTime || 30,
        specializations: this.getModeratorSpecializations(moderator.id),
        performanceScore: this.calculateModeratorPerformance(moderator.id),
        availabilityHours: 8, // Default 8 hours
        timezone: 'UTC', // Default timezone
        maxConcurrentTasks: 10 // Default max tasks
      };
    });
  }

  /**
   * Calculate priority scores for tasks using multiple factors
   */
  private async calculateTaskPriorities(tasks: ModerationTask[]): Promise<ModerationTask[]> {
    return tasks.map(task => {
      // Risk score factor (0-1)
      const riskFactor = Math.min(task.riskScore, 1.0);
      
      // Urgency factor based on age (0-1)
      const ageHours = (Date.now() - task.createdAt.getTime()) / (1000 * 60 * 60);
      const urgencyFactor = Math.min(ageHours / 24, 1.0); // Max urgency after 24 hours
      
      // Complexity factor (inverse - simpler tasks get higher priority for quick wins)
      const complexityFactor = 1 - Math.min(task.estimatedComplexity / 10, 1.0);
      
      // User impact factor (based on content type and user reputation)
      const userImpactFactor = this.calculateUserImpactFactor(task);
      
      // Calculate weighted priority score
      const priorityScore = 
        (riskFactor * this.priorityWeights.riskScore) +
        (urgencyFactor * this.priorityWeights.urgency) +
        (complexityFactor * this.priorityWeights.complexity) +
        (userImpactFactor * this.priorityWeights.userImpact);
      
      return {
        ...task,
        priority: priorityScore
      };
    });
  }

  /**
   * Optimize task assignments to moderators
   */
  private async optimizeTaskAssignments(
    tasks: ModerationTask[], 
    moderators: ModeratorWorkload[]
  ): Promise<TaskAssignment[]> {
    const assignments: TaskAssignment[] = [];
    const sortedTasks = [...tasks].sort((a, b) => b.priority - a.priority);
    
    // Create a working copy of moderator workloads
    const workingModerators = moderators.map(m => ({
      ...m,
      scheduledTasks: 0,
      nextAvailableTime: new Date()
    }));

    for (const task of sortedTasks) {
      // Find the best moderator for this task
      const bestModerator = this.findBestModeratorForTask(task, workingModerators);
      
      if (bestModerator) {
        const estimatedStartTime = new Date(bestModerator.nextAvailableTime);
        const estimatedCompletionTime = new Date(
          estimatedStartTime.getTime() + (task.estimatedTimeMinutes * 60 * 1000)
        );
        
        assignments.push({
          taskId: task.id,
          moderatorId: bestModerator.moderatorId,
          priority: task.priority,
          estimatedStartTime,
          estimatedCompletionTime,
          confidence: this.calculateAssignmentConfidence(task, bestModerator)
        });
        
        // Update moderator's next available time
        bestModerator.nextAvailableTime = estimatedCompletionTime;
        bestModerator.scheduledTasks++;
      }
    }

    return assignments;
  }

  /**
   * Find the best moderator for a specific task
   */
  private findBestModeratorForTask(
    task: ModerationTask, 
    moderators: (ModeratorWorkload & { scheduledTasks: number; nextAvailableTime: Date })[]
  ): (ModeratorWorkload & { scheduledTasks: number; nextAvailableTime: Date }) | null {
    
    // Filter available moderators
    const availableModerators = moderators.filter(m => 
      m.scheduledTasks < m.maxConcurrentTasks
    );
    
    if (availableModerators.length === 0) {
      return null;
    }
    
    // Score each moderator for this task
    const scoredModerators = availableModerators.map(moderator => {
      let score = 0;
      
      // Performance score factor
      score += moderator.performanceScore * 0.4;
      
      // Workload factor (prefer less loaded moderators)
      const workloadFactor = 1 - (moderator.scheduledTasks / moderator.maxConcurrentTasks);
      score += workloadFactor * 0.3;
      
      // Specialization factor
      const hasSpecialization = moderator.specializations.some(spec => 
        task.tags.includes(spec) || task.contentType === spec
      );
      score += hasSpecialization ? 0.2 : 0;
      
      // Availability factor (prefer moderators available sooner)
      const availabilityDelay = moderator.nextAvailableTime.getTime() - Date.now();
      const availabilityFactor = Math.max(0, 1 - (availabilityDelay / (1000 * 60 * 60))); // 1 hour max delay
      score += availabilityFactor * 0.1;
      
      return { moderator, score };
    });
    
    // Return the highest scoring moderator
    scoredModerators.sort((a, b) => b.score - a.score);
    return scoredModerators[0]?.moderator || null;
  }

  /**
   * Reorder tasks based on optimization results
   */
  private reorderTasksByOptimization(
    tasks: ModerationTask[], 
    assignments: TaskAssignment[]
  ): ModerationTask[] {
    // Create a map of task assignments for quick lookup
    const assignmentMap = new Map(assignments.map(a => [a.taskId, a]));
    
    // Sort tasks by their assignment priority and estimated start time
    return tasks.sort((a, b) => {
      const assignmentA = assignmentMap.get(a.id);
      const assignmentB = assignmentMap.get(b.id);
      
      if (!assignmentA && !assignmentB) return b.priority - a.priority;
      if (!assignmentA) return 1;
      if (!assignmentB) return -1;
      
      // Sort by estimated start time, then by priority
      const timeDiff = assignmentA.estimatedStartTime.getTime() - assignmentB.estimatedStartTime.getTime();
      return timeDiff !== 0 ? timeDiff : b.priority - a.priority;
    });
  }

  /**
   * Calculate estimated completion time for all assignments
   */
  private calculateEstimatedCompletionTime(assignments: TaskAssignment[]): number {
    if (assignments.length === 0) return 0;
    
    // Find the latest completion time
    const latestCompletion = Math.max(
      ...assignments.map(a => a.estimatedCompletionTime.getTime())
    );
    
    return (latestCompletion - Date.now()) / (1000 * 60); // Return minutes
  }

  /**
   * Generate reasoning for optimization decisions
   */
  private generateOptimizationReasoning(
    assignments: TaskAssignment[], 
    moderators: ModeratorWorkload[]
  ): string {
    const totalTasks = assignments.length;
    const averageConfidence = assignments.reduce((sum, a) => sum + a.confidence, 0) / totalTasks;
    const moderatorsUsed = new Set(assignments.map(a => a.moderatorId)).size;
    
    return `Optimized ${totalTasks} tasks across ${moderatorsUsed} moderators with ${(averageConfidence * 100).toFixed(1)}% average confidence. ` +
           `Prioritization based on risk score (40%), urgency (30%), complexity (20%), and user impact (10%). ` +
           `Assignments consider moderator performance, workload, specializations, and availability.`;
  }

  /**
   * Analyze workflow bottlenecks
   */
  async analyzeBottlenecks(): Promise<BottleneckAnalysis[]> {
    const db = databaseService.getDatabase();
    
    try {
      // Analyze queue wait times by status
      const statusAnalysis = await db
        .select({
          status: moderationCases.status,
          count: count(moderationCases.id),
          avgWaitTime: avg(sql`EXTRACT(EPOCH FROM (updated_at - created_at))/60`)
        })
        .from(moderationCases)
        .where(gte(moderationCases.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))) // Last 7 days
        .groupBy(moderationCases.status);

      const bottlenecks: BottleneckAnalysis[] = [];

      for (const status of statusAnalysis) {
        const avgWaitTime = status.avgWaitTime || 0;
        const taskCount = status.count || 0;
        
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
        const recommendations: string[] = [];
        
        // Determine severity based on wait time and task count
        if (avgWaitTime > 240 || taskCount > 100) { // 4 hours or 100+ tasks
          severity = 'critical';
          recommendations.push('Immediate attention required');
          recommendations.push('Consider adding more moderators');
        } else if (avgWaitTime > 120 || taskCount > 50) { // 2 hours or 50+ tasks
          severity = 'high';
          recommendations.push('Increase moderator capacity');
          recommendations.push('Optimize task prioritization');
        } else if (avgWaitTime > 60 || taskCount > 25) { // 1 hour or 25+ tasks
          severity = 'medium';
          recommendations.push('Monitor closely');
          recommendations.push('Consider workflow improvements');
        }
        
        if (recommendations.length === 0) {
          recommendations.push('Performance within acceptable limits');
        }
        
        bottlenecks.push({
          stage: status.status || 'unknown',
          averageWaitTime: avgWaitTime,
          taskCount: taskCount,
          severity,
          recommendations
        });
      }

      return bottlenecks;

    } catch (error) {
      safeLogger.error('Error analyzing bottlenecks:', error);
      return [];
    }
  }

  /**
   * Get workflow efficiency metrics
   */
  async getWorkflowMetrics(): Promise<WorkflowMetrics> {
    const db = databaseService.getDatabase();
    
    try {
      // Calculate average processing time
      const processingTimeResult = await db
        .select({
          avgTime: avg(sql`EXTRACT(EPOCH FROM (updated_at - created_at))/60`)
        })
        .from(moderationCases)
        .where(
          and(
            eq(moderationCases.status, 'resolved'),
            gte(moderationCases.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
          )
        );

      // Calculate current queue length
      const queueLengthResult = await db
        .select({ count: count(moderationCases.id) })
        .from(moderationCases)
        .where(eq(moderationCases.status, 'pending'));

      // Calculate throughput (tasks completed per hour in last 24 hours)
      const throughputResult = await db
        .select({ count: count(moderationCases.id) })
        .from(moderationCases)
        .where(
          and(
            eq(moderationCases.status, 'resolved'),
            gte(moderationCases.updatedAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
          )
        );

      // Get bottleneck analysis
      const bottlenecks = await this.analyzeBottlenecks();

      // Get moderator efficiency
      const moderatorEfficiency = await this.calculateModeratorEfficiencies();

      // Calculate SLA compliance
      const slaCompliance = await this.calculateSLACompliance();

      return {
        averageProcessingTime: processingTimeResult[0]?.avgTime || 0,
        queueLength: queueLengthResult[0]?.count || 0,
        throughputPerHour: (throughputResult[0]?.count || 0) / 24,
        bottlenecks,
        moderatorEfficiency,
        slaCompliance
      };

    } catch (error) {
      safeLogger.error('Error calculating workflow metrics:', error);
      throw new Error('Failed to calculate workflow metrics');
    }
  }

  /**
   * Calculate moderator efficiency metrics
   */
  private async calculateModeratorEfficiencies(): Promise<ModeratorEfficiency[]> {
    const db = databaseService.getDatabase();
    
    try {
      const moderatorStats = await db
        .select({
          moderatorId: moderationCases.assignedModeratorId,
          tasksCompleted: count(moderationCases.id),
          avgTime: avg(sql`EXTRACT(EPOCH FROM (updated_at - created_at))/60`)
        })
        .from(moderationCases)
        .where(
          and(
            eq(moderationCases.status, 'resolved'),
            gte(moderationCases.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
          )
        )
        .groupBy(moderationCases.assignedModeratorId);

      return moderatorStats
        .filter(stat => stat.moderatorId)
        .map(stat => ({
          moderatorId: stat.moderatorId!,
          tasksCompleted: stat.tasksCompleted || 0,
          averageTime: stat.avgTime || 0,
          accuracyRate: 0.95, // Placeholder - would calculate from appeals/reversals
          specializations: this.getModeratorSpecializations(stat.moderatorId!),
          efficiency: this.calculateEfficiencyScore(stat.tasksCompleted || 0, stat.avgTime || 0)
        }));

    } catch (error) {
      safeLogger.error('Error calculating moderator efficiencies:', error);
      return [];
    }
  }

  /**
   * Calculate SLA compliance rate
   */
  private async calculateSLACompliance(): Promise<number> {
    const db = databaseService.getDatabase();
    
    try {
      const cases = await db
        .select({
          riskScore: moderationCases.riskScore,
          processingTime: sql<number>`EXTRACT(EPOCH FROM (updated_at - created_at))/60`
        })
        .from(moderationCases)
        .where(
          and(
            eq(moderationCases.status, 'resolved'),
            gte(moderationCases.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
          )
        );

      if (cases.length === 0) return 1.0;

      let compliantCases = 0;
      
      for (const case_ of cases) {
        const riskScore = case_.riskScore || 0;
        const processingTime = case_.processingTime || 0;
        
        let slaTarget: number;
        if (riskScore > 0.8) slaTarget = this.slaTargets.high;
        else if (riskScore > 0.5) slaTarget = this.slaTargets.medium;
        else slaTarget = this.slaTargets.low;
        
        if (processingTime <= slaTarget) {
          compliantCases++;
        }
      }

      return compliantCases / cases.length;

    } catch (error) {
      safeLogger.error('Error calculating SLA compliance:', error);
      return 0.5; // Default to 50% if calculation fails
    }
  }

  // Helper methods
  private calculateBasePriority(riskScore: number): number {
    return Math.min(riskScore * 10, 10);
  }

  private estimateComplexity(case_: any): number {
    // Simplified complexity estimation
    let complexity = 1;
    
    if (case_.contentType === 'listing') complexity += 2;
    if (case_.riskScore > 0.8) complexity += 3;
    if (case_.metadata?.hasMedia) complexity += 1;
    
    return Math.min(complexity, 10);
  }

  private estimateProcessingTime(case_: any): number {
    const baseTime = 15; // 15 minutes base
    const complexity = this.estimateComplexity(case_);
    return baseTime + (complexity * 5);
  }

  private calculateDueDate(case_: any): Date {
    const riskScore = case_.riskScore || 0;
    const createdAt = case_.createdAt || new Date();
    
    let slaMinutes: number;
    if (riskScore > 0.8) slaMinutes = this.slaTargets.high;
    else if (riskScore > 0.5) slaMinutes = this.slaTargets.medium;
    else slaMinutes = this.slaTargets.low;
    
    return new Date(createdAt.getTime() + (slaMinutes * 60 * 1000));
  }

  private extractTags(case_: any): string[] {
    const tags: string[] = [];
    
    if (case_.contentType) tags.push(case_.contentType);
    if (case_.riskScore > 0.8) tags.push('high-risk');
    if (case_.metadata?.category) tags.push(case_.metadata.category);
    
    return tags;
  }

  private calculateUserImpactFactor(task: ModerationTask): number {
    // Simplified user impact calculation
    let impact = 0.5; // Base impact
    
    if (task.contentType === 'listing') impact += 0.3;
    if (task.riskScore > 0.7) impact += 0.2;
    
    return Math.min(impact, 1.0);
  }

  private getModeratorSpecializations(moderatorId: string): string[] {
    // Placeholder - would retrieve from moderator profile
    return ['general', 'marketplace'];
  }

  private calculateModeratorPerformance(moderatorId: string): number {
    // Placeholder - would calculate from historical data
    return 0.85; // 85% performance score
  }

  private calculateAssignmentConfidence(task: ModerationTask, moderator: any): number {
    let confidence = 0.7; // Base confidence
    
    // Increase confidence if moderator has relevant specialization
    const hasSpecialization = moderator.specializations.some((spec: string) => 
      task.tags.includes(spec) || task.contentType === spec
    );
    if (hasSpecialization) confidence += 0.2;
    
    // Adjust based on moderator performance
    confidence = confidence * moderator.performanceScore;
    
    return Math.min(confidence, 1.0);
  }

  private calculateEfficiencyScore(tasksCompleted: number, averageTime: number): number {
    if (tasksCompleted === 0 || averageTime === 0) return 0;
    
    // Efficiency = tasks per hour, normalized to 0-1 scale
    const tasksPerHour = tasksCompleted / (averageTime / 60);
    return Math.min(tasksPerHour / 10, 1.0); // Assume 10 tasks/hour is maximum efficiency
  }
}

export const moderationWorkflowOptimizationService = new ModerationWorkflowOptimizationService();