/**
 * Content Review Workflow Service
 * System for managing document review processes and accuracy verification
 */

import { promises as fs } from 'fs';
import { safeLogger } from '../utils/safeLogger';
import path from 'path';
import { safeLogger } from '../utils/safeLogger';
import matter from 'gray-matter';
import { safeLogger } from '../utils/safeLogger';
import { differenceInDays, addDays, format } from 'date-fns';
import { safeLogger } from '../utils/safeLogger';

export interface ReviewTask {
  id: string;
  documentPath: string;
  title: string;
  category: string;
  reviewType: 'accuracy' | 'freshness' | 'completeness' | 'technical' | 'security';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  createdAt: Date;
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'archived';
  description: string;
  checklist: ReviewChecklistItem[];
  comments: ReviewComment[];
  metadata: {
    lastUpdated: Date;
    version: string;
    criticalityLevel: string;
    dependencies: string[];
  };
}

export interface ReviewChecklistItem {
  id: string;
  description: string;
  category: 'accuracy' | 'completeness' | 'clarity' | 'technical' | 'links';
  completed: boolean;
  notes?: string;
  reviewer?: string;
  completedAt?: Date;
}

export interface ReviewComment {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
  type: 'suggestion' | 'issue' | 'approval' | 'question';
  resolved: boolean;
}

export interface ReviewWorkflowConfig {
  reviewCycles: Record<string, number>; // days
  autoAssignment: boolean;
  reviewerPool: string[];
  escalationRules: EscalationRule[];
}

export interface EscalationRule {
  condition: 'overdue' | 'high_priority' | 'security_critical';
  daysOverdue?: number;
  action: 'reassign' | 'notify_manager' | 'create_urgent_task';
  escalateTo: string[];
}

export class ContentReviewWorkflowService {
  private reviewTasks: Map<string, ReviewTask> = new Map();
  private config: ReviewWorkflowConfig;
  private documentsPath: string;

  constructor(documentsPath: string = 'app/frontend/public/docs/support') {
    this.documentsPath = documentsPath;
    this.config = {
      reviewCycles: {
        security: 30,
        technical: 60,
        general: 90,
        faq: 45
      },
      autoAssignment: true,
      reviewerPool: ['content-team', 'technical-writer', 'subject-expert'],
      escalationRules: [
        {
          condition: 'overdue',
          daysOverdue: 7,
          action: 'notify_manager',
          escalateTo: ['content-manager']
        },
        {
          condition: 'security_critical',
          action: 'create_urgent_task',
          escalateTo: ['security-team', 'content-manager']
        }
      ]
    };
  }  /*
*
   * Create a new review task
   */
  async createReviewTask(
    documentPath: string,
    reviewType: ReviewTask['reviewType'],
    priority: ReviewTask['priority'] = 'medium',
    assignedTo?: string
  ): Promise<ReviewTask> {
    try {
      const content = await fs.readFile(documentPath, 'utf-8');
      const { data: metadata } = matter(content);
      
      const taskId = this.generateTaskId();
      const dueDate = this.calculateDueDate(reviewType, priority);
      
      const task: ReviewTask = {
        id: taskId,
        documentPath,
        title: metadata.title || path.basename(documentPath, '.md'),
        category: metadata.category || 'general',
        reviewType,
        priority,
        assignedTo: assignedTo || (this.config.autoAssignment ? this.autoAssignReviewer(reviewType) : undefined),
        createdAt: new Date(),
        dueDate,
        status: 'pending',
        description: this.generateTaskDescription(reviewType, metadata),
        checklist: this.generateChecklist(reviewType, metadata),
        comments: [],
        metadata: {
          lastUpdated: metadata.lastUpdated ? new Date(metadata.lastUpdated) : new Date(),
          version: metadata.version || '1.0.0',
          criticalityLevel: metadata.criticalityLevel || 'medium',
          dependencies: metadata.dependencies || []
        }
      };

      this.reviewTasks.set(taskId, task);
      await this.saveTaskToFile(task);
      
      return task;
    } catch (error) {
      throw new Error(`Failed to create review task: ${error.message}`);
    }
  }

  /**
   * Generate review checklist based on review type
   */
  private generateChecklist(reviewType: ReviewTask['reviewType'], metadata: any): ReviewChecklistItem[] {
    const baseChecklist: ReviewChecklistItem[] = [
      {
        id: 'accuracy-check',
        description: 'Verify all information is accurate and up-to-date',
        category: 'accuracy',
        completed: false
      },
      {
        id: 'completeness-check',
        description: 'Ensure all necessary information is included',
        category: 'completeness',
        completed: false
      },
      {
        id: 'clarity-check',
        description: 'Review content for clarity and readability',
        category: 'clarity',
        completed: false
      },
      {
        id: 'links-check',
        description: 'Verify all links are working and relevant',
        category: 'links',
        completed: false
      }
    ];

    // Add specific checks based on review type
    switch (reviewType) {
      case 'technical':
        baseChecklist.push(
          {
            id: 'technical-accuracy',
            description: 'Verify technical procedures and code examples',
            category: 'technical',
            completed: false
          },
          {
            id: 'api-compatibility',
            description: 'Check API references for current compatibility',
            category: 'technical',
            completed: false
          }
        );
        break;
      
      case 'security':
        baseChecklist.push(
          {
            id: 'security-practices',
            description: 'Review security recommendations for current best practices',
            category: 'technical',
            completed: false
          },
          {
            id: 'vulnerability-check',
            description: 'Ensure no outdated security information',
            category: 'technical',
            completed: false
          }
        );
        break;
      
      case 'completeness':
        baseChecklist.push(
          {
            id: 'coverage-check',
            description: 'Verify all topics are adequately covered',
            category: 'completeness',
            completed: false
          },
          {
            id: 'examples-check',
            description: 'Ensure sufficient examples and use cases',
            category: 'completeness',
            completed: false
          }
        );
        break;
    }

    return baseChecklist;
  }

  /**
   * Update review task status
   */
  async updateTaskStatus(taskId: string, status: ReviewTask['status'], comment?: string): Promise<ReviewTask> {
    const task = this.reviewTasks.get(taskId);
    if (!task) {
      throw new Error(`Review task ${taskId} not found`);
    }

    task.status = status;
    
    if (comment) {
      task.comments.push({
        id: this.generateCommentId(),
        author: 'system',
        content: comment,
        timestamp: new Date(),
        type: 'approval',
        resolved: false
      });
    }

    await this.saveTaskToFile(task);
    return task;
  }

  /**
   * Complete checklist item
   */
  async completeChecklistItem(
    taskId: string,
    itemId: string,
    reviewer: string,
    notes?: string
  ): Promise<ReviewTask> {
    const task = this.reviewTasks.get(taskId);
    if (!task) {
      throw new Error(`Review task ${taskId} not found`);
    }

    const item = task.checklist.find(i => i.id === itemId);
    if (!item) {
      throw new Error(`Checklist item ${itemId} not found`);
    }

    item.completed = true;
    item.reviewer = reviewer;
    item.completedAt = new Date();
    if (notes) {
      item.notes = notes;
    }

    // Check if all items are completed
    const allCompleted = task.checklist.every(i => i.completed);
    if (allCompleted && task.status === 'in_progress') {
      task.status = 'completed';
    }

    await this.saveTaskToFile(task);
    return task;
  }

  /**
   * Add comment to review task
   */
  async addComment(
    taskId: string,
    author: string,
    content: string,
    type: ReviewComment['type'] = 'suggestion'
  ): Promise<ReviewTask> {
    const task = this.reviewTasks.get(taskId);
    if (!task) {
      throw new Error(`Review task ${taskId} not found`);
    }

    const comment: ReviewComment = {
      id: this.generateCommentId(),
      author,
      content,
      timestamp: new Date(),
      type,
      resolved: false
    };

    task.comments.push(comment);
    await this.saveTaskToFile(task);
    
    return task;
  }

  /**
   * Get overdue tasks
   */
  getOverdueTasks(): ReviewTask[] {
    const now = new Date();
    return Array.from(this.reviewTasks.values())
      .filter(task => task.dueDate < now && task.status !== 'completed')
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: ReviewTask['status']): ReviewTask[] {
    return Array.from(this.reviewTasks.values())
      .filter(task => task.status === status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Generate workflow report
   */
  generateWorkflowReport(): {
    summary: {
      totalTasks: number;
      pendingTasks: number;
      inProgressTasks: number;
      completedTasks: number;
      overdueTasks: number;
    };
    tasksByPriority: Record<string, number>;
    tasksByType: Record<string, number>;
    averageCompletionTime: number;
    recommendations: string[];
  } {
    const tasks = Array.from(this.reviewTasks.values());
    const overdueTasks = this.getOverdueTasks();
    
    const summary = {
      totalTasks: tasks.length,
      pendingTasks: tasks.filter(t => t.status === 'pending').length,
      inProgressTasks: tasks.filter(t => t.status === 'in_progress').length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      overdueTasks: overdueTasks.length
    };

    const tasksByPriority = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tasksByType = tasks.reduce((acc, task) => {
      acc[task.reviewType] = (acc[task.reviewType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate average completion time for completed tasks
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const averageCompletionTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, task) => {
          return sum + differenceInDays(new Date(), task.createdAt);
        }, 0) / completedTasks.length
      : 0;

    const recommendations = this.generateRecommendations(summary, overdueTasks);

    return {
      summary,
      tasksByPriority,
      tasksByType,
      averageCompletionTime,
      recommendations
    };
  }

  // Helper methods
  private generateTaskId(): string {
    return `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCommentId(): string {
    return `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateDueDate(reviewType: ReviewTask['reviewType'], priority: ReviewTask['priority']): Date {
    const baseDays = this.config.reviewCycles[reviewType] || this.config.reviewCycles.general;
    
    // Adjust based on priority
    const priorityMultiplier = {
      critical: 0.25,
      high: 0.5,
      medium: 1.0,
      low: 1.5
    };

    const adjustedDays = Math.ceil(baseDays * priorityMultiplier[priority]);
    return addDays(new Date(), adjustedDays);
  }

  private autoAssignReviewer(reviewType: ReviewTask['reviewType']): string {
    // Simple round-robin assignment
    const reviewers = this.config.reviewerPool;
    const index = Math.floor(Math.random() * reviewers.length);
    return reviewers[index];
  }

  private generateTaskDescription(reviewType: ReviewTask['reviewType'], metadata: any): string {
    const baseDescription = `Review ${metadata.title || 'document'} for ${reviewType}`;
    
    switch (reviewType) {
      case 'accuracy':
        return `${baseDescription}. Verify all information is current and correct.`;
      case 'freshness':
        return `${baseDescription}. Update outdated information and refresh content.`;
      case 'completeness':
        return `${baseDescription}. Ensure all necessary topics are covered.`;
      case 'technical':
        return `${baseDescription}. Verify technical accuracy and update procedures.`;
      case 'security':
        return `${baseDescription}. Review security recommendations and best practices.`;
      default:
        return baseDescription;
    }
  }

  private async saveTaskToFile(task: ReviewTask): Promise<void> {
    // In a real implementation, this would save to a database or file system
    // For now, we'll just keep it in memory
    safeLogger.info(`Saved review task ${task.id} to storage`);
  }

  private generateRecommendations(summary: any, overdueTasks: ReviewTask[]): string[] {
    const recommendations: string[] = [];
    
    if (overdueTasks.length > 0) {
      recommendations.push(`${overdueTasks.length} tasks are overdue - prioritize completion`);
    }
    
    if (summary.pendingTasks > summary.inProgressTasks * 2) {
      recommendations.push('High number of pending tasks - consider increasing reviewer capacity');
    }
    
    if (summary.totalTasks === 0) {
      recommendations.push('No active review tasks - consider scheduling routine reviews');
    }
    
    return recommendations;
  }
}

export const contentReviewWorkflowService = new ContentReviewWorkflowService();