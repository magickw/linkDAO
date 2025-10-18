import { Request, Response } from 'express';
import { moderationWorkflowOptimizationService } from '../services/moderationWorkflowOptimizationService';
import { z } from 'zod';

// Validation schemas
const OptimizationRequestSchema = z.object({
  includeAssignments: z.boolean().optional().default(true),
  maxTasks: z.number().min(1).max(1000).optional().default(100),
  timeHorizon: z.number().min(1).max(24).optional().default(8) // hours
});

const WorkloadBalancingSchema = z.object({
  moderatorIds: z.array(z.string()).optional(),
  redistributeExisting: z.boolean().optional().default(false),
  considerSpecializations: z.boolean().optional().default(true)
});

const BottleneckAnalysisSchema = z.object({
  timeRange: z.enum(['1h', '6h', '24h', '7d', '30d']).optional().default('24h'),
  includeRecommendations: z.boolean().optional().default(true)
});

export class ModerationWorkflowOptimizationController {

  /**
   * Optimize the moderation queue with intelligent prioritization
   */
  async optimizeQueue(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = OptimizationRequestSchema.parse(req.body);
      
      const optimization = await moderationWorkflowOptimizationService.optimizeQueue();
      
      // Limit results based on request parameters
      const limitedTasks = optimization.reorderedTasks.slice(0, validatedInput.maxTasks);
      const limitedAssignments = validatedInput.includeAssignments 
        ? optimization.assignments.filter(a => 
            limitedTasks.some(t => t.id === a.taskId)
          )
        : [];

      res.json({
        success: true,
        data: {
          optimizedTasks: limitedTasks,
          assignments: limitedAssignments,
          estimatedCompletionTime: optimization.estimatedCompletionTime,
          reasoning: optimization.reasoning,
          optimization: {
            totalTasksAnalyzed: optimization.reorderedTasks.length,
            tasksReturned: limitedTasks.length,
            assignmentsCreated: limitedAssignments.length,
            timeHorizon: validatedInput.timeHorizon
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error optimizing moderation queue:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid optimization parameters',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error during queue optimization'
      });
    }
  }

  /**
   * Get comprehensive workflow metrics and analytics
   */
  async getWorkflowMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await moderationWorkflowOptimizationService.getWorkflowMetrics();
      
      res.json({
        success: true,
        data: {
          metrics,
          summary: {
            queueHealth: this.assessQueueHealth(metrics),
            performanceGrade: this.calculatePerformanceGrade(metrics),
            recommendations: this.generateRecommendations(metrics)
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error retrieving workflow metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving metrics'
      });
    }
  }

  /**
   * Analyze workflow bottlenecks with detailed insights
   */
  async analyzeBottlenecks(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = BottleneckAnalysisSchema.parse(req.query);
      
      const bottlenecks = await moderationWorkflowOptimizationService.analyzeBottlenecks();
      
      // Sort bottlenecks by severity
      const sortedBottlenecks = bottlenecks.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });

      res.json({
        success: true,
        data: {
          bottlenecks: sortedBottlenecks,
          analysis: {
            totalBottlenecks: bottlenecks.length,
            criticalCount: bottlenecks.filter(b => b.severity === 'critical').length,
            highCount: bottlenecks.filter(b => b.severity === 'high').length,
            averageWaitTime: bottlenecks.reduce((sum, b) => sum + b.averageWaitTime, 0) / bottlenecks.length,
            totalTasksAffected: bottlenecks.reduce((sum, b) => sum + b.taskCount, 0)
          },
          timeRange: validatedInput.timeRange
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error analyzing bottlenecks:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid analysis parameters',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error during bottleneck analysis'
      });
    }
  }

  /**
   * Balance workload across moderators
   */
  async balanceWorkload(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = WorkloadBalancingSchema.parse(req.body);
      
      // Get current optimization to understand workload distribution
      const optimization = await moderationWorkflowOptimizationService.optimizeQueue();
      
      // Analyze workload distribution
      const workloadDistribution = this.analyzeWorkloadDistribution(optimization.assignments);
      
      res.json({
        success: true,
        data: {
          currentDistribution: workloadDistribution,
          balancingRecommendations: this.generateBalancingRecommendations(workloadDistribution),
          optimizedAssignments: optimization.assignments,
          parameters: validatedInput
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error balancing workload:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid workload balancing parameters',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error during workload balancing'
      });
    }
  }

  /**
   * Get efficiency tracking and analytics for moderators
   */
  async getEfficiencyTracking(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await moderationWorkflowOptimizationService.getWorkflowMetrics();
      
      // Enhanced efficiency analysis
      const efficiencyAnalysis = {
        moderatorEfficiency: metrics.moderatorEfficiency,
        teamAverages: {
          averageTasksCompleted: metrics.moderatorEfficiency.reduce((sum, m) => sum + m.tasksCompleted, 0) / metrics.moderatorEfficiency.length,
          averageProcessingTime: metrics.moderatorEfficiency.reduce((sum, m) => sum + m.averageTime, 0) / metrics.moderatorEfficiency.length,
          averageAccuracy: metrics.moderatorEfficiency.reduce((sum, m) => sum + m.accuracyRate, 0) / metrics.moderatorEfficiency.length,
          averageEfficiency: metrics.moderatorEfficiency.reduce((sum, m) => sum + m.efficiency, 0) / metrics.moderatorEfficiency.length
        },
        topPerformers: metrics.moderatorEfficiency
          .sort((a, b) => b.efficiency - a.efficiency)
          .slice(0, 5),
        improvementOpportunities: this.identifyImprovementOpportunities(metrics.moderatorEfficiency)
      };

      res.json({
        success: true,
        data: efficiencyAnalysis,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error retrieving efficiency tracking:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving efficiency data'
      });
    }
  }

  /**
   * Get workflow optimization recommendations
   */
  async getOptimizationRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await moderationWorkflowOptimizationService.getWorkflowMetrics();
      const bottlenecks = await moderationWorkflowOptimizationService.analyzeBottlenecks();
      
      const recommendations = {
        immediate: this.generateImmediateRecommendations(metrics, bottlenecks),
        shortTerm: this.generateShortTermRecommendations(metrics, bottlenecks),
        longTerm: this.generateLongTermRecommendations(metrics, bottlenecks),
        priority: this.prioritizeRecommendations(metrics, bottlenecks)
      };

      res.json({
        success: true,
        data: {
          recommendations,
          basedOn: {
            queueLength: metrics.queueLength,
            averageProcessingTime: metrics.averageProcessingTime,
            slaCompliance: metrics.slaCompliance,
            criticalBottlenecks: bottlenecks.filter(b => b.severity === 'critical').length
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error generating optimization recommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error generating recommendations'
      });
    }
  }

  // Helper methods for analysis and recommendations

  private assessQueueHealth(metrics: any): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    const queueLength = metrics.queueLength || 0;
    const slaCompliance = metrics.slaCompliance || 0;
    const avgProcessingTime = metrics.averageProcessingTime || 0;
    
    if (queueLength < 10 && slaCompliance > 0.95 && avgProcessingTime < 30) return 'excellent';
    if (queueLength < 25 && slaCompliance > 0.90 && avgProcessingTime < 60) return 'good';
    if (queueLength < 50 && slaCompliance > 0.80 && avgProcessingTime < 120) return 'fair';
    if (queueLength < 100 && slaCompliance > 0.70) return 'poor';
    return 'critical';
  }

  private calculatePerformanceGrade(metrics: any): string {
    const slaCompliance = metrics.slaCompliance || 0;
    const throughput = metrics.throughputPerHour || 0;
    const avgEfficiency = metrics.moderatorEfficiency?.reduce((sum: number, m: any) => sum + m.efficiency, 0) / (metrics.moderatorEfficiency?.length || 1) || 0;
    
    const score = (slaCompliance * 0.4 + Math.min(throughput / 10, 1) * 0.3 + avgEfficiency * 0.3) * 100;
    
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'C+';
    if (score >= 65) return 'C';
    return 'D';
  }

  private generateRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];
    
    if (metrics.queueLength > 50) {
      recommendations.push('Consider adding more moderators to reduce queue length');
    }
    
    if (metrics.slaCompliance < 0.8) {
      recommendations.push('Improve SLA compliance by optimizing task prioritization');
    }
    
    if (metrics.averageProcessingTime > 60) {
      recommendations.push('Provide additional training to reduce processing time');
    }
    
    const criticalBottlenecks = metrics.bottlenecks?.filter((b: any) => b.severity === 'critical').length || 0;
    if (criticalBottlenecks > 0) {
      recommendations.push(`Address ${criticalBottlenecks} critical bottlenecks immediately`);
    }
    
    return recommendations;
  }

  private analyzeWorkloadDistribution(assignments: any[]): any {
    const moderatorWorkloads = new Map<string, { tasks: number; totalTime: number }>();
    
    assignments.forEach(assignment => {
      const current = moderatorWorkloads.get(assignment.moderatorId) || { tasks: 0, totalTime: 0 };
      const taskTime = (assignment.estimatedCompletionTime.getTime() - assignment.estimatedStartTime.getTime()) / (1000 * 60);
      
      moderatorWorkloads.set(assignment.moderatorId, {
        tasks: current.tasks + 1,
        totalTime: current.totalTime + taskTime
      });
    });
    
    const workloads = Array.from(moderatorWorkloads.entries()).map(([moderatorId, workload]) => ({
      moderatorId,
      ...workload,
      averageTaskTime: workload.totalTime / workload.tasks
    }));
    
    return {
      moderators: workloads,
      distribution: {
        minTasks: Math.min(...workloads.map(w => w.tasks)),
        maxTasks: Math.max(...workloads.map(w => w.tasks)),
        avgTasks: workloads.reduce((sum, w) => sum + w.tasks, 0) / workloads.length,
        standardDeviation: this.calculateStandardDeviation(workloads.map(w => w.tasks))
      }
    };
  }

  private generateBalancingRecommendations(distribution: any): string[] {
    const recommendations: string[] = [];
    const { minTasks, maxTasks, standardDeviation } = distribution.distribution;
    
    if (maxTasks - minTasks > 5) {
      recommendations.push('Significant workload imbalance detected - redistribute tasks');
    }
    
    if (standardDeviation > 3) {
      recommendations.push('High workload variance - consider moderator specializations');
    }
    
    const overloadedModerators = distribution.moderators.filter((m: any) => m.tasks > distribution.distribution.avgTasks * 1.5);
    if (overloadedModerators.length > 0) {
      recommendations.push(`${overloadedModerators.length} moderators are overloaded`);
    }
    
    return recommendations;
  }

  private identifyImprovementOpportunities(moderatorEfficiency: any[]): any[] {
    return moderatorEfficiency
      .filter(m => m.efficiency < 0.7 || m.accuracyRate < 0.9)
      .map(m => ({
        moderatorId: m.moderatorId,
        issues: [
          ...(m.efficiency < 0.7 ? ['Low efficiency - consider additional training'] : []),
          ...(m.accuracyRate < 0.9 ? ['Low accuracy - review decision patterns'] : []),
          ...(m.averageTime > 45 ? ['Slow processing - optimize workflow'] : [])
        ],
        priority: m.efficiency < 0.5 || m.accuracyRate < 0.8 ? 'high' : 'medium'
      }));
  }

  private generateImmediateRecommendations(metrics: any, bottlenecks: any[]): string[] {
    const recommendations: string[] = [];
    
    const criticalBottlenecks = bottlenecks.filter(b => b.severity === 'critical');
    criticalBottlenecks.forEach(bottleneck => {
      recommendations.push(`Critical bottleneck in ${bottleneck.stage}: ${bottleneck.recommendations[0]}`);
    });
    
    if (metrics.queueLength > 100) {
      recommendations.push('Queue critically overloaded - activate emergency protocols');
    }
    
    return recommendations;
  }

  private generateShortTermRecommendations(metrics: any, bottlenecks: any[]): string[] {
    const recommendations: string[] = [];
    
    if (metrics.slaCompliance < 0.8) {
      recommendations.push('Implement automated task prioritization to improve SLA compliance');
    }
    
    if (metrics.averageProcessingTime > 60) {
      recommendations.push('Conduct moderator training sessions to reduce processing time');
    }
    
    return recommendations;
  }

  private generateLongTermRecommendations(metrics: any, bottlenecks: any[]): string[] {
    const recommendations: string[] = [];
    
    recommendations.push('Implement machine learning for predictive workload management');
    recommendations.push('Develop specialized moderation tracks for different content types');
    recommendations.push('Create automated quality assurance systems');
    
    return recommendations;
  }

  private prioritizeRecommendations(metrics: any, bottlenecks: any[]): any[] {
    const allRecommendations = [
      ...this.generateImmediateRecommendations(metrics, bottlenecks).map(r => ({ text: r, priority: 'critical', timeframe: 'immediate' })),
      ...this.generateShortTermRecommendations(metrics, bottlenecks).map(r => ({ text: r, priority: 'high', timeframe: 'short-term' })),
      ...this.generateLongTermRecommendations(metrics, bottlenecks).map(r => ({ text: r, priority: 'medium', timeframe: 'long-term' }))
    ];
    
    return allRecommendations.sort((a, b) => {
      const priorityOrder = { critical: 3, high: 2, medium: 1 };
      return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
    });
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }
}

export const moderationWorkflowOptimizationController = new ModerationWorkflowOptimizationController();