import { eq, and, desc, sql, gte, lte, inArray } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import { disputes, disputeEvidence, users, escrows } from '../db/schema';
import { aiEvidenceAnalysisService } from './aiEvidenceAnalysisService';
import { automatedCaseManagementService } from './automatedCaseManagementService';

export interface ResolutionRecommendation {
  disputeId: number;
  recommendedOutcome: DisputeOutcome;
  confidence: number; // 0-1
  reasoning: string[];
  precedentCases: PrecedentCase[];
  policyCompliance: PolicyComplianceCheck;
  impactAssessment: ImpactAssessment;
  alternativeOutcomes: AlternativeOutcome[];
  riskFactors: string[];
  implementationSteps: string[];
}

export interface DisputeOutcome {
  verdict: 'favor_buyer' | 'favor_seller' | 'partial_refund' | 'no_fault' | 'escalate';
  refundAmount?: number;
  refundPercentage?: number;
  additionalActions?: string[];
  reasoning: string;
}

export interface PrecedentCase {
  caseId: number;
  similarity: number; // 0-1
  outcome: DisputeOutcome;
  factors: string[];
  dateResolved: Date;
  arbitrator: string;
  satisfaction: number; // 0-1
}

export interface PolicyComplianceCheck {
  compliant: boolean;
  violatedPolicies: string[];
  requiredActions: string[];
  legalConsiderations: string[];
  platformRules: PolicyRule[];
}

export interface PolicyRule {
  ruleId: string;
  description: string;
  applicable: boolean;
  compliance: 'compliant' | 'violation' | 'unclear';
  impact: 'low' | 'medium' | 'high';
}

export interface ImpactAssessment {
  financialImpact: {
    buyer: number;
    seller: number;
    platform: number;
  };
  reputationImpact: {
    buyer: number; // -1 to 1
    seller: number; // -1 to 1
    platform: number; // -1 to 1
  };
  precedentImpact: {
    similarCases: number;
    policyImplications: string[];
  };
  userSatisfactionPrediction: {
    buyer: number; // 0-1
    seller: number; // 0-1
    overall: number; // 0-1
  };
}

export interface AlternativeOutcome {
  outcome: DisputeOutcome;
  probability: number; // 0-1
  pros: string[];
  cons: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface OutcomePrediction {
  disputeId: number;
  predictions: Array<{
    outcome: DisputeOutcome;
    probability: number;
    confidence: number;
    factors: string[];
  }>;
  modelVersion: string;
  predictionDate: Date;
}

export class ResolutionRecommendationService {
  /**
   * Generate comprehensive resolution recommendation
   */
  async generateResolutionRecommendation(disputeId: number): Promise<ResolutionRecommendation> {
    try {
      // Get dispute data and analysis
      const disputeData = await this.getDisputeData(disputeId);
      const evidenceAnalysis = await this.analyzeDisputeEvidence(disputeId);
      
      // Find precedent cases
      const precedentCases = await this.findPrecedentCases(disputeData, evidenceAnalysis);
      
      // Check policy compliance
      const policyCompliance = await this.checkPolicyCompliance(disputeData, evidenceAnalysis);
      
      // Calculate impact assessment
      const impactAssessment = await this.calculateImpactAssessment(disputeData, precedentCases);
      
      // Generate outcome prediction
      const outcomePrediction = await this.predictOutcome(disputeData, evidenceAnalysis, precedentCases);
      
      // Generate alternative outcomes
      const alternativeOutcomes = await this.generateAlternativeOutcomes(
        disputeData,
        outcomePrediction,
        precedentCases
      );
      
      // Assess risks
      const riskFactors = await this.assessRiskFactors(disputeData, outcomePrediction, impactAssessment);
      
      // Generate implementation steps
      const implementationSteps = this.generateImplementationSteps(outcomePrediction.recommendedOutcome);
      
      const recommendation: ResolutionRecommendation = {
        disputeId,
        recommendedOutcome: outcomePrediction.recommendedOutcome,
        confidence: outcomePrediction.confidence,
        reasoning: outcomePrediction.reasoning,
        precedentCases,
        policyCompliance,
        impactAssessment,
        alternativeOutcomes,
        riskFactors,
        implementationSteps
      };
      
      // Store recommendation
      await this.storeRecommendation(recommendation);
      
      return recommendation;
    } catch (error) {
      safeLogger.error('Error generating resolution recommendation:', error);
      throw error;
    }
  }

  /**
   * Find similar precedent cases
   */
  async findPrecedentCases(disputeData: any, evidenceAnalysis: any): Promise<PrecedentCase[]> {
    try {
      // Get resolved disputes for precedent analysis
      const resolvedDisputes = await db.select()
        .from(disputes)
        .where(eq(disputes.status, 'resolved'))
        .orderBy(desc(disputes.resolvedAt))
        .limit(100);

      const precedentCases: PrecedentCase[] = [];

      for (const resolvedDispute of resolvedDisputes) {
        // Calculate similarity
        const similarity = await this.calculateCaseSimilarity(disputeData, resolvedDispute);
        
        if (similarity > 0.6) { // High similarity threshold
          const precedent: PrecedentCase = {
            caseId: resolvedDispute.id,
            similarity,
            outcome: this.parseDisputeOutcome(resolvedDispute),
            factors: this.extractCaseFactors(resolvedDispute),
            dateResolved: new Date(resolvedDispute.resolvedAt!),
            arbitrator: resolvedDispute.resolverId || 'system',
            satisfaction: await this.getCaseSatisfactionScore(resolvedDispute.id)
          };
          
          precedentCases.push(precedent);
        }
      }

      // Sort by similarity and satisfaction
      return precedentCases
        .sort((a, b) => (b.similarity * b.satisfaction) - (a.similarity * a.satisfaction))
        .slice(0, 10); // Top 10 precedents
    } catch (error) {
      safeLogger.error('Error finding precedent cases:', error);
      return [];
    }
  }

  /**
   * Check policy compliance for proposed resolution
   */
  async checkPolicyCompliance(disputeData: any, evidenceAnalysis: any): Promise<PolicyComplianceCheck> {
    try {
      const policyRules = await this.getPlatformPolicyRules();
      const applicableRules = policyRules.filter(rule => 
        this.isRuleApplicable(rule, disputeData, evidenceAnalysis)
      );

      const violatedPolicies: string[] = [];
      const requiredActions: string[] = [];
      const legalConsiderations: string[] = [];

      for (const rule of applicableRules) {
        const compliance = await this.checkRuleCompliance(rule, disputeData, evidenceAnalysis);
        rule.compliance = compliance;

        if (compliance === 'violation') {
          violatedPolicies.push(rule.description);
          requiredActions.push(...this.getRequiredActionsForRule(rule));
        }

        if (rule.impact === 'high') {
          legalConsiderations.push(`High impact rule: ${rule.description}`);
        }
      }

      // Check for legal considerations
      if (disputeData.dispute.disputeType === 'fraud_suspected') {
        legalConsiderations.push('Potential fraud case - consider legal implications');
      }

      const financialAmount = parseFloat(disputeData.escrow?.amount || '0');
      if (financialAmount > 5000) {
        legalConsiderations.push('High-value dispute - ensure compliance with financial regulations');
      }

      return {
        compliant: violatedPolicies.length === 0,
        violatedPolicies,
        requiredActions,
        legalConsiderations,
        platformRules: applicableRules
      };
    } catch (error) {
      safeLogger.error('Error checking policy compliance:', error);
      return {
        compliant: true,
        violatedPolicies: [],
        requiredActions: [],
        legalConsiderations: [],
        platformRules: []
      };
    }
  }

  /**
   * Predict dispute outcome using ML models
   */
  async predictOutcome(
    disputeData: any,
    evidenceAnalysis: any,
    precedentCases: PrecedentCase[]
  ): Promise<{
    recommendedOutcome: DisputeOutcome;
    confidence: number;
    reasoning: string[];
  }> {
    try {
      // Extract features for ML prediction
      const features = await this.extractPredictionFeatures(disputeData, evidenceAnalysis);
      
      // Get precedent-based prediction
      const precedentPrediction = this.getPrecedentBasedPrediction(precedentCases);
      
      // Get rule-based prediction
      const rulePrediction = await this.getRuleBasedPrediction(disputeData, evidenceAnalysis);
      
      // Combine predictions (ensemble approach)
      const combinedPrediction = this.combinePredictions([precedentPrediction, rulePrediction]);
      
      // Generate reasoning
      const reasoning = this.generatePredictionReasoning(
        combinedPrediction,
        precedentCases,
        evidenceAnalysis
      );

      return {
        recommendedOutcome: combinedPrediction.outcome,
        confidence: combinedPrediction.confidence,
        reasoning
      };
    } catch (error) {
      safeLogger.error('Error predicting outcome:', error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive impact assessment
   */
  async calculateImpactAssessment(
    disputeData: any,
    precedentCases: PrecedentCase[]
  ): Promise<ImpactAssessment> {
    try {
      const escrowAmount = parseFloat(disputeData.escrow?.amount || '0');
      
      // Financial impact calculation
      const financialImpact = {
        buyer: this.calculateBuyerFinancialImpact(disputeData, escrowAmount),
        seller: this.calculateSellerFinancialImpact(disputeData, escrowAmount),
        platform: this.calculatePlatformFinancialImpact(disputeData, escrowAmount)
      };

      // Reputation impact calculation
      const reputationImpact = {
        buyer: await this.calculateReputationImpact(disputeData.dispute.reporterId, 'buyer'),
        seller: await this.calculateReputationImpact(disputeData.escrow?.sellerId, 'seller'),
        platform: this.calculatePlatformReputationImpact(disputeData)
      };

      // Precedent impact calculation
      const precedentImpact = {
        similarCases: precedentCases.length,
        policyImplications: this.analyzePolicyImplications(precedentCases)
      };

      // User satisfaction prediction
      const userSatisfactionPrediction = {
        buyer: await this.predictUserSatisfaction(disputeData, 'buyer'),
        seller: await this.predictUserSatisfaction(disputeData, 'seller'),
        overall: 0
      };
      userSatisfactionPrediction.overall = 
        (userSatisfactionPrediction.buyer + userSatisfactionPrediction.seller) / 2;

      return {
        financialImpact,
        reputationImpact,
        precedentImpact,
        userSatisfactionPrediction
      };
    } catch (error) {
      safeLogger.error('Error calculating impact assessment:', error);
      throw error;
    }
  }

  /**
   * Generate alternative resolution outcomes
   */
  async generateAlternativeOutcomes(
    disputeData: any,
    primaryPrediction: any,
    precedentCases: PrecedentCase[]
  ): Promise<AlternativeOutcome[]> {
    try {
      const alternatives: AlternativeOutcome[] = [];
      const escrowAmount = parseFloat(disputeData.escrow?.amount || '0');

      // Generate different outcome scenarios
      const scenarios = [
        {
          verdict: 'favor_buyer' as const,
          refundPercentage: 100,
          reasoning: 'Full refund to buyer'
        },
        {
          verdict: 'favor_seller' as const,
          refundPercentage: 0,
          reasoning: 'No refund - seller keeps payment'
        },
        {
          verdict: 'partial_refund' as const,
          refundPercentage: 50,
          reasoning: 'Split responsibility - partial refund'
        },
        {
          verdict: 'partial_refund' as const,
          refundPercentage: 75,
          reasoning: 'Mostly buyer favor - 75% refund'
        },
        {
          verdict: 'partial_refund' as const,
          refundPercentage: 25,
          reasoning: 'Mostly seller favor - 25% refund'
        }
      ];

      for (const scenario of scenarios) {
        // Skip if this is the primary recommendation
        if (scenario.verdict === primaryPrediction.recommendedOutcome.verdict &&
            scenario.refundPercentage === primaryPrediction.recommendedOutcome.refundPercentage) {
          continue;
        }

        const outcome: DisputeOutcome = {
          verdict: scenario.verdict,
          refundAmount: escrowAmount * (scenario.refundPercentage / 100),
          refundPercentage: scenario.refundPercentage,
          reasoning: scenario.reasoning
        };

        // Calculate probability based on precedents
        const probability = this.calculateOutcomeProbability(outcome, precedentCases);
        
        // Generate pros and cons
        const { pros, cons } = this.analyzeOutcomeProsCons(outcome, disputeData);
        
        // Assess risk level
        const riskLevel = this.assessOutcomeRisk(outcome, disputeData);

        alternatives.push({
          outcome,
          probability,
          pros,
          cons,
          riskLevel
        });
      }

      return alternatives.sort((a, b) => b.probability - a.probability);
    } catch (error) {
      safeLogger.error('Error generating alternative outcomes:', error);
      return [];
    }
  }

  // Private helper methods

  private async getDisputeData(disputeId: number): Promise<any> {
    const [dispute] = await db.select().from(disputes).where(eq(disputes.id, disputeId)).limit(1);
    const evidence = await db.select().from(disputeEvidence).where(eq(disputeEvidence.disputeId, disputeId));
    const [escrow] = dispute?.escrowId ? 
      await db.select().from(escrows).where(eq(escrows.id, dispute.escrowId)).limit(1) : [null];

    return { dispute, evidence, escrow };
  }

  private async analyzeDisputeEvidence(disputeId: number): Promise<any> {
    // Get evidence analysis results
    const evidence = await db.select().from(disputeEvidence).where(eq(disputeEvidence.disputeId, disputeId));
    
    const analysisResults = [];
    for (const item of evidence) {
      // Mock analysis - in production, retrieve stored analysis results
      analysisResults.push({
        evidenceId: item.id,
        authenticity: 0.8 + Math.random() * 0.15,
        relevance: 0.7 + Math.random() * 0.2,
        type: item.evidenceType
      });
    }

    return {
      totalEvidence: evidence.length,
      averageAuthenticity: analysisResults.reduce((sum, r) => sum + r.authenticity, 0) / analysisResults.length || 0,
      averageRelevance: analysisResults.reduce((sum, r) => sum + r.relevance, 0) / analysisResults.length || 0,
      evidenceTypes: [...new Set(evidence.map(e => e.evidenceType))],
      analysisResults
    };
  }

  private async calculateCaseSimilarity(disputeData: any, resolvedDispute: any): Promise<number> {
    let similarity = 0;

    // Compare dispute types
    if (disputeData.dispute.disputeType === resolvedDispute.disputeType) {
      similarity += 0.3;
    }

    // Compare financial amounts (normalized)
    const amount1 = parseFloat(disputeData.escrow?.amount || '0');
    const amount2 = parseFloat(resolvedDispute.amount || '0');
    const amountSimilarity = 1 - Math.abs(amount1 - amount2) / Math.max(amount1, amount2, 1);
    similarity += amountSimilarity * 0.2;

    // Compare evidence patterns
    const evidenceTypes1 = new Set(disputeData.evidence?.map((e: any) => e.evidenceType) || []);
    const evidenceTypes2 = new Set(JSON.parse(resolvedDispute.evidence || '[]').map((e: any) => e.evidenceType) || []);
    const evidenceIntersection = new Set([...evidenceTypes1].filter(x => evidenceTypes2.has(x)));
    const evidenceUnion = new Set([...evidenceTypes1, ...evidenceTypes2]);
    const evidenceSimilarity = evidenceUnion.size > 0 ? evidenceIntersection.size / evidenceUnion.size : 0;
    similarity += evidenceSimilarity * 0.3;

    // Compare time factors
    const daysDiff = Math.abs(
      (new Date().getTime() - new Date(disputeData.dispute.createdAt).getTime()) -
      (new Date(resolvedDispute.resolvedAt).getTime() - new Date(resolvedDispute.createdAt).getTime())
    ) / (1000 * 60 * 60 * 24);
    const timeSimilarity = Math.max(0, 1 - daysDiff / 30); // Similarity decreases over 30 days
    similarity += timeSimilarity * 0.2;

    return Math.min(1, similarity);
  }

  private parseDisputeOutcome(resolvedDispute: any): DisputeOutcome {
    const resolution = resolvedDispute.resolution ? JSON.parse(resolvedDispute.resolution) : {};
    
    return {
      verdict: resolution.verdict || 'no_fault',
      refundAmount: resolution.refundAmount || 0,
      refundPercentage: resolution.refundPercentage || 0,
      reasoning: resolution.reasoning || 'No reasoning provided'
    };
  }

  private extractCaseFactors(resolvedDispute: any): string[] {
    const factors = [];
    
    if (resolvedDispute.disputeType) {
      factors.push(`dispute_type:${resolvedDispute.disputeType}`);
    }
    
    const amount = parseFloat(resolvedDispute.amount || '0');
    if (amount > 1000) factors.push('high_value');
    else if (amount > 100) factors.push('medium_value');
    else factors.push('low_value');
    
    const evidence = JSON.parse(resolvedDispute.evidence || '[]');
    if (evidence.length > 3) factors.push('extensive_evidence');
    
    return factors;
  }

  private async getCaseSatisfactionScore(disputeId: number): Promise<number> {
    // Mock satisfaction score - in production, get from user feedback
    return 0.7 + Math.random() * 0.25;
  }

  private async getPlatformPolicyRules(): Promise<PolicyRule[]> {
    // Mock policy rules - in production, load from database
    return [
      {
        ruleId: 'refund_policy_001',
        description: 'Refunds must be processed within 14 days of dispute resolution',
        applicable: true,
        compliance: 'compliant',
        impact: 'medium'
      },
      {
        ruleId: 'fraud_policy_001',
        description: 'Suspected fraud cases must be escalated to security team',
        applicable: true,
        compliance: 'compliant',
        impact: 'high'
      },
      {
        ruleId: 'evidence_policy_001',
        description: 'All evidence must be verified before making resolution decisions',
        applicable: true,
        compliance: 'compliant',
        impact: 'high'
      }
    ];
  }

  private isRuleApplicable(rule: PolicyRule, disputeData: any, evidenceAnalysis: any): boolean {
    // Simple applicability check - in production, use more sophisticated logic
    if (rule.ruleId.includes('fraud') && disputeData.dispute.disputeType === 'fraud_suspected') {
      return true;
    }
    
    if (rule.ruleId.includes('refund')) {
      return true; // Refund rules apply to all disputes
    }
    
    if (rule.ruleId.includes('evidence') && evidenceAnalysis.totalEvidence > 0) {
      return true;
    }
    
    return false;
  }

  private async checkRuleCompliance(
    rule: PolicyRule,
    disputeData: any,
    evidenceAnalysis: any
  ): Promise<'compliant' | 'violation' | 'unclear'> {
    // Mock compliance check - in production, implement actual rule checking
    if (rule.ruleId.includes('evidence') && evidenceAnalysis.averageAuthenticity < 0.6) {
      return 'violation';
    }
    
    if (rule.ruleId.includes('fraud') && disputeData.dispute.disputeType === 'fraud_suspected') {
      // Check if case was escalated
      return Math.random() > 0.2 ? 'compliant' : 'violation';
    }
    
    return 'compliant';
  }

  private getRequiredActionsForRule(rule: PolicyRule): string[] {
    const actions = [];
    
    if (rule.ruleId.includes('fraud')) {
      actions.push('Escalate to security team');
      actions.push('Freeze related accounts');
    }
    
    if (rule.ruleId.includes('evidence')) {
      actions.push('Verify all evidence authenticity');
      actions.push('Request additional evidence if needed');
    }
    
    return actions;
  }

  private async extractPredictionFeatures(disputeData: any, evidenceAnalysis: any): Promise<any> {
    return {
      disputeType: disputeData.dispute.disputeType,
      escrowAmount: parseFloat(disputeData.escrow?.amount || '0'),
      evidenceCount: evidenceAnalysis.totalEvidence,
      evidenceAuthenticity: evidenceAnalysis.averageAuthenticity,
      evidenceRelevance: evidenceAnalysis.averageRelevance,
      daysSinceCreated: Math.floor((Date.now() - new Date(disputeData.dispute.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
      buyerReputation: 750, // Mock reputation
      sellerReputation: 680  // Mock reputation
    };
  }

  private getPrecedentBasedPrediction(precedentCases: PrecedentCase[]): any {
    if (precedentCases.length === 0) {
      return {
        outcome: { verdict: 'no_fault', reasoning: 'No precedent cases found' },
        confidence: 0.3
      };
    }

    // Weight precedents by similarity and satisfaction
    const weightedOutcomes: Record<string, number> = {};
    let totalWeight = 0;

    precedentCases.forEach(precedent => {
      const weight = precedent.similarity * precedent.satisfaction;
      const verdict = precedent.outcome.verdict;
      
      weightedOutcomes[verdict] = (weightedOutcomes[verdict] || 0) + weight;
      totalWeight += weight;
    });

    // Find most likely outcome
    let bestVerdict = 'no_fault';
    let bestWeight = 0;

    Object.entries(weightedOutcomes).forEach(([verdict, weight]) => {
      if (weight > bestWeight) {
        bestWeight = weight;
        bestVerdict = verdict;
      }
    });

    const confidence = totalWeight > 0 ? bestWeight / totalWeight : 0.3;

    return {
      outcome: {
        verdict: bestVerdict,
        reasoning: `Based on ${precedentCases.length} similar cases`
      },
      confidence
    };
  }

  private async getRuleBasedPrediction(disputeData: any, evidenceAnalysis: any): Promise<any> {
    let verdict = 'no_fault';
    let confidence = 0.5;
    const reasoning = [];

    // Rule-based decision logic
    if (evidenceAnalysis.averageAuthenticity < 0.5) {
      verdict = 'no_fault';
      confidence = 0.8;
      reasoning.push('Low evidence authenticity suggests insufficient proof');
    } else if (evidenceAnalysis.averageRelevance > 0.8 && evidenceAnalysis.averageAuthenticity > 0.8) {
      // High quality evidence - decide based on dispute type
      if (disputeData.dispute.disputeType === 'product_not_received') {
        verdict = 'favor_buyer';
        confidence = 0.9;
        reasoning.push('High quality evidence supports buyer claim of non-delivery');
      } else if (disputeData.dispute.disputeType === 'product_not_as_described') {
        verdict = 'partial_refund';
        confidence = 0.7;
        reasoning.push('Product quality issues warrant partial compensation');
      }
    }

    return {
      outcome: { verdict, reasoning: reasoning.join('; ') },
      confidence
    };
  }

  private combinePredictions(predictions: any[]): any {
    // Simple ensemble - weight by confidence
    const weightedOutcomes: Record<string, number> = {};
    let totalConfidence = 0;

    predictions.forEach(pred => {
      const verdict = pred.outcome.verdict;
      const weight = pred.confidence;
      
      weightedOutcomes[verdict] = (weightedOutcomes[verdict] || 0) + weight;
      totalConfidence += weight;
    });

    // Find best outcome
    let bestVerdict = 'no_fault';
    let bestWeight = 0;

    Object.entries(weightedOutcomes).forEach(([verdict, weight]) => {
      if (weight > bestWeight) {
        bestWeight = weight;
        bestVerdict = verdict;
      }
    });

    return {
      outcome: {
        verdict: bestVerdict,
        reasoning: 'Combined prediction from multiple models'
      },
      confidence: totalConfidence > 0 ? bestWeight / totalConfidence : 0.5
    };
  }

  private generatePredictionReasoning(
    prediction: any,
    precedentCases: PrecedentCase[],
    evidenceAnalysis: any
  ): string[] {
    const reasoning = [];

    if (precedentCases.length > 0) {
      reasoning.push(`Based on ${precedentCases.length} similar precedent cases`);
    }

    if (evidenceAnalysis.averageAuthenticity > 0.8) {
      reasoning.push('High evidence authenticity supports decision');
    } else if (evidenceAnalysis.averageAuthenticity < 0.6) {
      reasoning.push('Low evidence authenticity creates uncertainty');
    }

    if (evidenceAnalysis.totalEvidence > 5) {
      reasoning.push('Extensive evidence available for analysis');
    }

    reasoning.push(`Confidence level: ${Math.round(prediction.confidence * 100)}%`);

    return reasoning;
  }

  private calculateBuyerFinancialImpact(disputeData: any, escrowAmount: number): number {
    // Buyer's potential loss/gain
    return escrowAmount; // Maximum potential loss
  }

  private calculateSellerFinancialImpact(disputeData: any, escrowAmount: number): number {
    // Seller's potential loss/gain
    return escrowAmount; // Maximum potential loss
  }

  private calculatePlatformFinancialImpact(disputeData: any, escrowAmount: number): number {
    // Platform fees and processing costs
    return escrowAmount * 0.03; // 3% platform fee
  }

  private async calculateReputationImpact(userId: string, userType: 'buyer' | 'seller'): Promise<number> {
    // Mock reputation impact calculation
    return Math.random() * 0.4 - 0.2; // -0.2 to 0.2 range
  }

  private calculatePlatformReputationImpact(disputeData: any): number {
    // Platform reputation impact based on dispute handling
    const amount = parseFloat(disputeData.escrow?.amount || '0');
    if (amount > 1000) return -0.1; // High-value disputes have more impact
    return -0.02; // Small negative impact
  }

  private analyzePolicyImplications(precedentCases: PrecedentCase[]): string[] {
    const implications = [];
    
    const outcomes = precedentCases.map(p => p.outcome.verdict);
    const buyerFavorCount = outcomes.filter(o => o === 'favor_buyer').length;
    const sellerFavorCount = outcomes.filter(o => o === 'favor_seller').length;
    
    if (buyerFavorCount > sellerFavorCount * 2) {
      implications.push('Precedent strongly favors buyers in similar cases');
    } else if (sellerFavorCount > buyerFavorCount * 2) {
      implications.push('Precedent strongly favors sellers in similar cases');
    }
    
    return implications;
  }

  private async predictUserSatisfaction(disputeData: any, userType: 'buyer' | 'seller'): Promise<number> {
    // Mock satisfaction prediction
    return 0.6 + Math.random() * 0.3; // 0.6-0.9 range
  }

  private calculateOutcomeProbability(outcome: DisputeOutcome, precedentCases: PrecedentCase[]): number {
    if (precedentCases.length === 0) return 0.2;
    
    const matchingCases = precedentCases.filter(p => p.outcome.verdict === outcome.verdict);
    return matchingCases.length / precedentCases.length;
  }

  private analyzeOutcomeProsCons(outcome: DisputeOutcome, disputeData: any): { pros: string[]; cons: string[] } {
    const pros = [];
    const cons = [];
    
    switch (outcome.verdict) {
      case 'favor_buyer':
        pros.push('Protects buyer rights', 'Maintains platform trust');
        cons.push('Potential seller dissatisfaction', 'May encourage false claims');
        break;
      case 'favor_seller':
        pros.push('Protects seller interests', 'Prevents abuse');
        cons.push('May discourage buyer participation', 'Risk of buyer dissatisfaction');
        break;
      case 'partial_refund':
        pros.push('Balanced approach', 'Shared responsibility');
        cons.push('May not fully satisfy either party', 'Complex to implement');
        break;
      case 'no_fault':
        pros.push('Neutral stance', 'Preserves relationships');
        cons.push('May not address underlying issues', 'Potential for recurring disputes');
        break;
    }
    
    return { pros, cons };
  }

  private assessOutcomeRisk(outcome: DisputeOutcome, disputeData: any): 'low' | 'medium' | 'high' {
    const amount = parseFloat(disputeData.escrow?.amount || '0');
    
    if (amount > 1000 && outcome.verdict !== 'no_fault') {
      return 'high';
    }
    
    if (outcome.verdict === 'escalate') {
      return 'high';
    }
    
    if (outcome.verdict === 'partial_refund') {
      return 'medium';
    }
    
    return 'low';
  }

  private generateImplementationSteps(outcome: DisputeOutcome): string[] {
    const steps = [];
    
    steps.push('Review final recommendation with senior arbitrator');
    steps.push('Notify all parties of the decision');
    
    if (outcome.refundAmount && outcome.refundAmount > 0) {
      steps.push(`Process refund of $${outcome.refundAmount}`);
      steps.push('Update escrow status');
    }
    
    steps.push('Update user reputation scores');
    steps.push('Close dispute case');
    steps.push('Send satisfaction survey to parties');
    
    return steps;
  }

  private async assessRiskFactors(
    disputeData: any,
    prediction: any,
    impactAssessment: ImpactAssessment
  ): Promise<string[]> {
    const risks = [];
    
    if (prediction.confidence < 0.7) {
      risks.push('Low prediction confidence - manual review recommended');
    }
    
    if (impactAssessment.financialImpact.platform > 100) {
      risks.push('High financial impact on platform');
    }
    
    if (impactAssessment.reputationImpact.platform < -0.05) {
      risks.push('Negative platform reputation impact');
    }
    
    if (disputeData.dispute.disputeType === 'fraud_suspected') {
      risks.push('Potential legal implications');
    }
    
    return risks;
  }

  private async storeRecommendation(recommendation: ResolutionRecommendation): Promise<void> {
    // In production, store in dedicated table
    safeLogger.info(`Stored resolution recommendation for dispute ${recommendation.disputeId}`);
  }
}

export const resolutionRecommendationService = new ResolutionRecommendationService();
