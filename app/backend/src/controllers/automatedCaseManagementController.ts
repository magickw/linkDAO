import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { automatedCaseManagementService } from '../services/automatedCaseManagementService';

export class AutomatedCaseManagementController {
  /**
   * Categorize a dispute automatically
   */
  async categorizeDispute(req: Request, res: Response): Promise<void> {
    try {
      const { disputeId } = req.params;

      if (!disputeId) {
        res.status(400).json({ error: 'Dispute ID is required' });
        return;
      }

      const categorization = await automatedCaseManagementService.categorizeDispute(parseInt(disputeId));

      res.json({
        success: true,
        categorization
      });

    } catch (error) {
      safeLogger.error('Error categorizing dispute:', error);
      res.status(500).json({ 
        error: 'Failed to categorize dispute',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Calculate priority score for a dispute
   */
  async calculatePriorityScore(req: Request, res: Response): Promise<void> {
    try {
      const { disputeId } = req.params;

      if (!disputeId) {
        res.status(400).json({ error: 'Dispute ID is required' });
        return;
      }

      const priorityScore = await automatedCaseManagementService.calculatePriorityScore(parseInt(disputeId));

      res.json({
        success: true,
        priorityScore
      });

    } catch (error) {
      safeLogger.error('Error calculating priority score:', error);
      res.status(500).json({ 
        error: 'Failed to calculate priority score',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Automatically assign dispute to best available arbitrator
   */
  async assignDisputeAutomatically(req: Request, res: Response): Promise<void> {
    try {
      const { disputeId } = req.params;

      if (!disputeId) {
        res.status(400).json({ error: 'Dispute ID is required' });
        return;
      }

      const assignment = await automatedCaseManagementService.assignDisputeAutomatically(parseInt(disputeId));

      res.json({
        success: true,
        assignment
      });

    } catch (error) {
      safeLogger.error('Error assigning dispute automatically:', error);
      res.status(500).json({ 
        error: 'Failed to assign dispute automatically',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create case timeline with milestones
   */
  async createCaseTimeline(req: Request, res: Response): Promise<void> {
    try {
      const { disputeId } = req.params;

      if (!disputeId) {
        res.status(400).json({ error: 'Dispute ID is required' });
        return;
      }

      const timeline = await automatedCaseManagementService.createCaseTimeline(parseInt(disputeId));

      res.json({
        success: true,
        timeline
      });

    } catch (error) {
      safeLogger.error('Error creating case timeline:', error);
      res.status(500).json({ 
        error: 'Failed to create case timeline',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update case timeline milestone
   */
  async updateCaseTimeline(req: Request, res: Response): Promise<void> {
    try {
      const { disputeId, milestoneId } = req.params;
      const { status } = req.body;

      if (!disputeId || !milestoneId || !status) {
        res.status(400).json({ error: 'Dispute ID, milestone ID, and status are required' });
        return;
      }

      const timeline = await automatedCaseManagementService.updateCaseTimeline(
        parseInt(disputeId),
        milestoneId,
        status
      );

      res.json({
        success: true,
        timeline
      });

    } catch (error) {
      safeLogger.error('Error updating case timeline:', error);
      res.status(500).json({ 
        error: 'Failed to update case timeline',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get arbitrator workload metrics
   */
  async getArbitratorWorkloadMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await automatedCaseManagementService.getArbitratorWorkloadMetrics();

      res.json({
        success: true,
        metrics
      });

    } catch (error) {
      safeLogger.error('Error getting arbitrator workload metrics:', error);
      res.status(500).json({ 
        error: 'Failed to get arbitrator workload metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Optimize case routing
   */
  async optimizeCaseRouting(req: Request, res: Response): Promise<void> {
    try {
      const optimization = await automatedCaseManagementService.optimizeCaseRouting();

      res.json({
        success: true,
        optimization
      });

    } catch (error) {
      safeLogger.error('Error optimizing case routing:', error);
      res.status(500).json({ 
        error: 'Failed to optimize case routing',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Batch process multiple disputes
   */
  async batchProcessDisputes(req: Request, res: Response): Promise<void> {
    try {
      const { disputeIds, operations } = req.body;

      if (!Array.isArray(disputeIds) || disputeIds.length === 0) {
        res.status(400).json({ error: 'Dispute IDs array is required' });
        return;
      }

      if (!Array.isArray(operations) || operations.length === 0) {
        res.status(400).json({ error: 'Operations array is required' });
        return;
      }

      const results = [];
      const errors = [];

      for (const disputeId of disputeIds) {
        try {
          const disputeResults: any = { disputeId };

          for (const operation of operations) {
            switch (operation) {
              case 'categorize':
                disputeResults.categorization = await automatedCaseManagementService.categorizeDispute(disputeId);
                break;
              case 'prioritize':
                disputeResults.priority = await automatedCaseManagementService.calculatePriorityScore(disputeId);
                break;
              case 'assign':
                disputeResults.assignment = await automatedCaseManagementService.assignDisputeAutomatically(disputeId);
                break;
              case 'timeline':
                disputeResults.timeline = await automatedCaseManagementService.createCaseTimeline(disputeId);
                break;
            }
          }

          results.push(disputeResults);

        } catch (error) {
          errors.push({
            disputeId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      res.json({
        success: true,
        processed: results.length,
        failed: errors.length,
        results,
        errors
      });

    } catch (error) {
      safeLogger.error('Error in batch processing:', error);
      res.status(500).json({ 
        error: 'Failed to batch process disputes',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get case management analytics
   */
  async getCaseManagementAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { timeframe = '30d' } = req.query;

      // Mock analytics data
      const analytics = {
        timeframe,
        totalCases: 1250,
        categorizedCases: 1180,
        averageCategorizationAccuracy: 0.92,
        averagePriorityScore: 6.2,
        averageAssignmentTime: 2.5, // hours
        averageResolutionTime: 72, // hours
        workloadDistribution: {
          balanced: 0.75,
          overloaded: 0.15,
          underutilized: 0.10
        },
        categoryDistribution: {
          product_quality: 0.35,
          delivery_issues: 0.25,
          payment_disputes: 0.20,
          fraud_suspected: 0.10,
          other: 0.10
        },
        priorityDistribution: {
          critical: 0.05,
          high: 0.20,
          medium: 0.45,
          low: 0.30
        },
        automationMetrics: {
          categorizationAutomation: 0.94,
          assignmentAutomation: 0.87,
          timelinePredictionAccuracy: 0.89
        }
      };

      res.json({
        success: true,
        analytics
      });

    } catch (error) {
      safeLogger.error('Error getting case management analytics:', error);
      res.status(500).json({ 
        error: 'Failed to get case management analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get case recommendations
   */
  async getCaseRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { disputeId } = req.params;

      if (!disputeId) {
        res.status(400).json({ error: 'Dispute ID is required' });
        return;
      }

      // Get categorization and priority to generate recommendations
      const categorization = await automatedCaseManagementService.categorizeDispute(parseInt(disputeId));
      const priority = await automatedCaseManagementService.calculatePriorityScore(parseInt(disputeId));

      const recommendations = {
        disputeId: parseInt(disputeId),
        category: categorization.category,
        priority: priority.level,
        suggestedActions: categorization.suggestedActions,
        timelineRecommendations: this.generateTimelineRecommendations(priority),
        resourceRecommendations: this.generateResourceRecommendations(categorization, priority),
        riskMitigation: this.generateRiskMitigation(categorization, priority)
      };

      res.json({
        success: true,
        recommendations
      });

    } catch (error) {
      safeLogger.error('Error getting case recommendations:', error);
      res.status(500).json({ 
        error: 'Failed to get case recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Private helper methods

  private generateTimelineRecommendations(priority: any): string[] {
    const recommendations = [];

    if (priority.level === 'critical') {
      recommendations.push('Expedite all milestones by 50%');
      recommendations.push('Assign senior arbitrator immediately');
    } else if (priority.level === 'high') {
      recommendations.push('Reduce standard timeline by 25%');
      recommendations.push('Monitor progress daily');
    } else if (priority.level === 'low') {
      recommendations.push('Standard timeline acceptable');
      recommendations.push('Weekly progress reviews sufficient');
    }

    return recommendations;
  }

  private generateResourceRecommendations(categorization: any, priority: any): string[] {
    const recommendations = [];

    if (categorization.category === 'fraud_suspected') {
      recommendations.push('Assign fraud specialist');
      recommendations.push('Involve legal team if necessary');
    }

    if (priority.level === 'critical') {
      recommendations.push('Allocate additional resources');
      recommendations.push('Consider escalation to senior management');
    }

    if (categorization.confidence < 0.7) {
      recommendations.push('Manual review of categorization recommended');
    }

    return recommendations;
  }

  private generateRiskMitigation(categorization: any, priority: any): string[] {
    const risks = [];

    if (priority.level === 'critical') {
      risks.push('High visibility case - ensure quality resolution');
      risks.push('Monitor for escalation to external authorities');
    }

    if (categorization.category === 'fraud_suspected') {
      risks.push('Potential legal implications');
      risks.push('Reputational risk for platform');
    }

    if (priority.estimatedResolutionTime > 168) { // > 1 week
      risks.push('Extended resolution time may impact user satisfaction');
    }

    return risks;
  }
}

export const automatedCaseManagementController = new AutomatedCaseManagementController();
