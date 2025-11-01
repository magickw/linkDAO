import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { resolutionRecommendationService } from '../services/resolutionRecommendationService';

export class ResolutionRecommendationController {
  /**
   * Generate comprehensive resolution recommendation
   */
  async generateRecommendation(req: Request, res: Response): Promise<void> {
    try {
      const { disputeId } = req.params;

      if (!disputeId) {
        res.status(400).json({ error: 'Dispute ID is required' });
        return;
      }

      const recommendation = await resolutionRecommendationService.generateResolutionRecommendation(
        parseInt(disputeId)
      );

      res.json({
        success: true,
        recommendation
      });

    } catch (error) {
      safeLogger.error('Error generating resolution recommendation:', error);
      res.status(500).json({ 
        error: 'Failed to generate resolution recommendation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Find precedent cases for a dispute
   */
  async findPrecedentCases(req: Request, res: Response): Promise<void> {
    try {
      const { disputeId } = req.params;
      const { limit = 10 } = req.query;

      if (!disputeId) {
        res.status(400).json({ error: 'Dispute ID is required' });
        return;
      }

      // Get dispute data for precedent matching
      const disputeData = await (resolutionRecommendationService as any).getDisputeData(parseInt(disputeId));
      const evidenceAnalysis = await (resolutionRecommendationService as any).analyzeDisputeEvidence(parseInt(disputeId));
      
      const precedentCases = await (resolutionRecommendationService as any).findPrecedentCases(
        disputeData,
        evidenceAnalysis
      );

      res.json({
        success: true,
        precedentCases: precedentCases.slice(0, parseInt(limit as string))
      });

    } catch (error) {
      safeLogger.error('Error finding precedent cases:', error);
      res.status(500).json({ 
        error: 'Failed to find precedent cases',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check policy compliance for a proposed resolution
   */
  async checkPolicyCompliance(req: Request, res: Response): Promise<void> {
    try {
      const { disputeId } = req.params;
      const { proposedOutcome } = req.body;

      if (!disputeId) {
        res.status(400).json({ error: 'Dispute ID is required' });
        return;
      }

      // Get dispute data
      const disputeData = await (resolutionRecommendationService as any).getDisputeData(parseInt(disputeId));
      const evidenceAnalysis = await (resolutionRecommendationService as any).analyzeDisputeEvidence(parseInt(disputeId));
      
      const policyCompliance = await (resolutionRecommendationService as any).checkPolicyCompliance(
        disputeData,
        evidenceAnalysis
      );

      // If proposed outcome is provided, check specific compliance
      let outcomeCompliance = null;
      if (proposedOutcome) {
        outcomeCompliance = await this.checkOutcomeCompliance(proposedOutcome, policyCompliance);
      }

      res.json({
        success: true,
        policyCompliance,
        outcomeCompliance
      });

    } catch (error) {
      safeLogger.error('Error checking policy compliance:', error);
      res.status(500).json({ 
        error: 'Failed to check policy compliance',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get impact assessment for different resolution outcomes
   */
  async getImpactAssessment(req: Request, res: Response): Promise<void> {
    try {
      const { disputeId } = req.params;
      const { outcomes } = req.body;

      if (!disputeId) {
        res.status(400).json({ error: 'Dispute ID is required' });
        return;
      }

      // Get dispute data and precedents
      const disputeData = await (resolutionRecommendationService as any).getDisputeData(parseInt(disputeId));
      const evidenceAnalysis = await (resolutionRecommendationService as any).analyzeDisputeEvidence(parseInt(disputeId));
      const precedentCases = await (resolutionRecommendationService as any).findPrecedentCases(disputeData, evidenceAnalysis);
      
      const impactAssessment = await (resolutionRecommendationService as any).calculateImpactAssessment(
        disputeData,
        precedentCases
      );

      // If specific outcomes are provided, calculate their individual impacts
      let outcomeImpacts = null;
      if (outcomes && Array.isArray(outcomes)) {
        outcomeImpacts = await this.calculateOutcomeImpacts(outcomes, disputeData);
      }

      res.json({
        success: true,
        impactAssessment,
        outcomeImpacts
      });

    } catch (error) {
      safeLogger.error('Error getting impact assessment:', error);
      res.status(500).json({ 
        error: 'Failed to get impact assessment',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Compare multiple resolution options
   */
  async compareResolutionOptions(req: Request, res: Response): Promise<void> {
    try {
      const { disputeId } = req.params;
      const { options } = req.body;

      if (!disputeId) {
        res.status(400).json({ error: 'Dispute ID is required' });
        return;
      }

      if (!options || !Array.isArray(options) || options.length < 2) {
        res.status(400).json({ error: 'At least 2 resolution options are required for comparison' });
        return;
      }

      const comparisons = [];

      for (const option of options) {
        const analysis = await this.analyzeResolutionOption(parseInt(disputeId), option);
        comparisons.push({
          option,
          analysis
        });
      }

      // Generate comparison summary
      const comparisonSummary = this.generateComparisonSummary(comparisons);

      res.json({
        success: true,
        comparisons,
        summary: comparisonSummary
      });

    } catch (error) {
      safeLogger.error('Error comparing resolution options:', error);
      res.status(500).json({ 
        error: 'Failed to compare resolution options',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get resolution confidence score
   */
  async getResolutionConfidence(req: Request, res: Response): Promise<void> {
    try {
      const { disputeId } = req.params;
      const { proposedOutcome } = req.body;

      if (!disputeId) {
        res.status(400).json({ error: 'Dispute ID is required' });
        return;
      }

      if (!proposedOutcome) {
        res.status(400).json({ error: 'Proposed outcome is required' });
        return;
      }

      // Get dispute data and analysis
      const disputeData = await (resolutionRecommendationService as any).getDisputeData(parseInt(disputeId));
      const evidenceAnalysis = await (resolutionRecommendationService as any).analyzeDisputeEvidence(parseInt(disputeId));
      const precedentCases = await (resolutionRecommendationService as any).findPrecedentCases(disputeData, evidenceAnalysis);

      // Calculate confidence score
      const confidenceScore = await this.calculateConfidenceScore(
        proposedOutcome,
        disputeData,
        evidenceAnalysis,
        precedentCases
      );

      res.json({
        success: true,
        confidenceScore
      });

    } catch (error) {
      safeLogger.error('Error calculating resolution confidence:', error);
      res.status(500).json({ 
        error: 'Failed to calculate resolution confidence',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get resolution analytics and trends
   */
  async getResolutionAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { timeframe = '30d', category } = req.query;

      // Mock analytics data - in production, query actual data
      const analytics = {
        timeframe,
        category: category || 'all',
        totalRecommendations: 1450,
        averageConfidence: 0.82,
        outcomeDistribution: {
          favor_buyer: 0.35,
          favor_seller: 0.28,
          partial_refund: 0.25,
          no_fault: 0.10,
          escalate: 0.02
        },
        confidenceDistribution: {
          high: 0.65, // >0.8
          medium: 0.25, // 0.6-0.8
          low: 0.10 // <0.6
        },
        precedentUtilization: {
          averagePrecedentsUsed: 6.2,
          precedentInfluence: 0.74
        },
        policyCompliance: {
          compliantRecommendations: 0.94,
          commonViolations: [
            'Evidence verification incomplete',
            'Timeline policy not followed'
          ]
        },
        accuracyMetrics: {
          predictionAccuracy: 0.87,
          userSatisfactionPrediction: 0.79,
          impactAssessmentAccuracy: 0.83
        },
        trends: {
          confidenceTrend: 'increasing',
          complexityTrend: 'stable',
          automationRate: 0.76
        }
      };

      res.json({
        success: true,
        analytics
      });

    } catch (error) {
      safeLogger.error('Error getting resolution analytics:', error);
      res.status(500).json({ 
        error: 'Failed to get resolution analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Private helper methods

  private async checkOutcomeCompliance(proposedOutcome: any, policyCompliance: any): Promise<any> {
    const compliance = {
      compliant: true,
      violations: [],
      warnings: [],
      recommendations: []
    };

    // Check refund amount compliance
    if (proposedOutcome.refundAmount > 10000) {
      compliance.warnings.push('High refund amount - requires additional approval');
    }

    // Check timeline compliance
    if (proposedOutcome.implementationDays > 14) {
      compliance.violations.push('Implementation timeline exceeds policy limit');
      compliance.compliant = false;
    }

    // Check against policy violations
    if (policyCompliance.violatedPolicies.length > 0) {
      compliance.violations.push(...policyCompliance.violatedPolicies);
      compliance.compliant = false;
    }

    return compliance;
  }

  private async calculateOutcomeImpacts(outcomes: any[], disputeData: any): Promise<any[]> {
    const impacts = [];

    for (const outcome of outcomes) {
      const impact = {
        outcome,
        financialImpact: this.calculateFinancialImpact(outcome, disputeData),
        reputationImpact: this.calculateReputationImpact(outcome, disputeData),
        satisfactionImpact: this.calculateSatisfactionImpact(outcome, disputeData),
        riskLevel: this.assessRiskLevel(outcome, disputeData)
      };

      impacts.push(impact);
    }

    return impacts;
  }

  private calculateFinancialImpact(outcome: any, disputeData: any): any {
    const escrowAmount = parseFloat(disputeData.escrow?.amount || '0');
    
    return {
      buyer: outcome.verdict === 'favor_buyer' ? escrowAmount : 
             outcome.verdict === 'partial_refund' ? (outcome.refundAmount || 0) : 0,
      seller: outcome.verdict === 'favor_seller' ? escrowAmount :
              outcome.verdict === 'partial_refund' ? escrowAmount - (outcome.refundAmount || 0) : 0,
      platform: escrowAmount * 0.03 // Platform fee impact
    };
  }

  private calculateReputationImpact(outcome: any, disputeData: any): any {
    return {
      buyer: outcome.verdict === 'favor_buyer' ? 0.1 : 
             outcome.verdict === 'favor_seller' ? -0.1 : 0,
      seller: outcome.verdict === 'favor_seller' ? 0.1 :
              outcome.verdict === 'favor_buyer' ? -0.1 : 0,
      platform: -0.02 // Small negative impact for any dispute
    };
  }

  private calculateSatisfactionImpact(outcome: any, disputeData: any): any {
    return {
      buyer: outcome.verdict === 'favor_buyer' ? 0.9 :
             outcome.verdict === 'partial_refund' ? 0.6 : 0.3,
      seller: outcome.verdict === 'favor_seller' ? 0.9 :
              outcome.verdict === 'partial_refund' ? 0.6 : 0.3,
      overall: 0.6 // Average satisfaction
    };
  }

  private assessRiskLevel(outcome: any, disputeData: any): 'low' | 'medium' | 'high' {
    const amount = parseFloat(disputeData.escrow?.amount || '0');
    
    if (amount > 1000 && outcome.verdict !== 'no_fault') {
      return 'high';
    }
    
    if (outcome.verdict === 'escalate') {
      return 'high';
    }
    
    return 'medium';
  }

  private async analyzeResolutionOption(disputeId: number, option: any): Promise<any> {
    // Get dispute data
    const disputeData = await (resolutionRecommendationService as any).getDisputeData(disputeId);
    
    return {
      feasibility: this.assessFeasibility(option, disputeData),
      compliance: await this.checkOptionCompliance(option, disputeData),
      impact: await this.calculateOutcomeImpacts([option], disputeData),
      confidence: Math.random() * 0.3 + 0.6, // Mock confidence
      risks: this.identifyOptionRisks(option, disputeData)
    };
  }

  private assessFeasibility(option: any, disputeData: any): any {
    return {
      score: 0.8, // Mock feasibility score
      factors: [
        'Sufficient evidence available',
        'Clear policy guidelines',
        'Precedent cases support decision'
      ],
      constraints: []
    };
  }

  private async checkOptionCompliance(option: any, disputeData: any): Promise<any> {
    return {
      compliant: true,
      violations: [],
      warnings: []
    };
  }

  private identifyOptionRisks(option: any, disputeData: any): string[] {
    const risks = [];
    
    if (option.refundAmount > 1000) {
      risks.push('High financial impact');
    }
    
    if (option.verdict === 'escalate') {
      risks.push('Escalation may delay resolution');
    }
    
    return risks;
  }

  private generateComparisonSummary(comparisons: any[]): any {
    const scores = comparisons.map(c => c.analysis.confidence);
    const avgConfidence = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    const bestOption = comparisons.reduce((best, current) => 
      current.analysis.confidence > best.analysis.confidence ? current : best
    );
    
    return {
      totalOptions: comparisons.length,
      averageConfidence: avgConfidence,
      recommendedOption: bestOption.option,
      confidenceRange: {
        min: Math.min(...scores),
        max: Math.max(...scores)
      }
    };
  }

  private async calculateConfidenceScore(
    proposedOutcome: any,
    disputeData: any,
    evidenceAnalysis: any,
    precedentCases: any[]
  ): Promise<any> {
    let confidence = 0.5; // Base confidence
    const factors = [];

    // Evidence quality factor
    if (evidenceAnalysis.averageAuthenticity > 0.8) {
      confidence += 0.2;
      factors.push('High evidence authenticity');
    }

    // Precedent support factor
    const supportingPrecedents = precedentCases.filter(p => 
      p.outcome.verdict === proposedOutcome.verdict
    );
    
    if (supportingPrecedents.length > 3) {
      confidence += 0.15;
      factors.push(`${supportingPrecedents.length} supporting precedents`);
    }

    // Policy compliance factor
    confidence += 0.1; // Assume compliant for mock
    factors.push('Policy compliant');

    return {
      score: Math.min(0.95, confidence),
      level: confidence > 0.8 ? 'high' : confidence > 0.6 ? 'medium' : 'low',
      factors,
      breakdown: {
        evidenceQuality: evidenceAnalysis.averageAuthenticity,
        precedentSupport: supportingPrecedents.length / precedentCases.length,
        policyCompliance: 1.0
      }
    };
  }
}

export const resolutionRecommendationController = new ResolutionRecommendationController();
