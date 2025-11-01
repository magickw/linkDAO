import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { disputes, disputeEvidence, users, escrows, orders } from '../db/schema';
import { safeLogger } from '../utils/safeLogger';
import { aiEvidenceAnalysisService } from './aiEvidenceAnalysisService';
import { safeLogger } from '../utils/safeLogger';

export interface CaseCategorizationResult {
  category: DisputeCategory;
  subcategory: string;
  confidence: number;
  reasoning: string[];
  suggestedActions: string[];
}

export interface CasePriorityScore {
  score: number; // 1-10, higher is more urgent
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: PriorityFactor[];
  estimatedResolutionTime: number; // hours
  recommendedAssignee?: string;
}

export interface PriorityFactor {
  factor: string;
  weight: number;
  impact: number;
  description: string;
}

export interface CaseAssignment {
  disputeId: number;
  assigneeId: string;
  assigneeType: 'arbitrator' | 'specialist' | 'senior_moderator';
  confidence: number;
  reasoning: string[];
  workloadImpact: number;
}

export interface CaseTimeline {
  disputeId: number;
  milestones: CaseMilestone[];
  currentPhase: string;
  nextDeadline: Date;
  estimatedCompletion: Date;
  delayRisk: number; // 0-1
}

export interface CaseMilestone {
  id: string;
  name: string;
  description: string;
  dueDate: Date;
  completedDate?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  dependencies: string[];
  assignee?: string;
}

export enum DisputeCategory {
  PRODUCT_QUALITY = 'product_quality',
  DELIVERY_ISSUES = 'delivery_issues',
  PAYMENT_DISPUTES = 'payment_disputes',
  SELLER_CONDUCT = 'seller_conduct',
  BUYER_CONDUCT = 'buyer_conduct',
  TECHNICAL_ISSUES = 'technical_issues',
  POLICY_VIOLATIONS = 'policy_violations',
  FRAUD_SUSPECTED = 'fraud_suspected',
  REFUND_REQUESTS = 'refund_requests',
  WARRANTY_CLAIMS = 'warranty_claims'
}

export interface WorkloadMetrics {
  arbitratorId: string;
  activeCases: number;
  averageResolutionTime: number;
  successRate: number;
  specializations: string[];
  currentCapacity: number; // 0-1
  nextAvailable: Date;
}

export class AutomatedCaseManagementService {
  /**
   * Automatically categorize a dispute using ML
   */
  async categorizeDispute(disputeId: number): Promise<CaseCategorizationResult> {
    try {
      // Get dispute details
      const [dispute] = await db.select()
        .from(disputes)
        .where(eq(disputes.id, disputeId))
        .limit(1);

      if (!dispute) {
        throw new Error('Dispute not found');
      }

      // Get evidence for analysis
      const evidence = await db.select()
        .from(disputeEvidence)
        .where(eq(disputeEvidence.disputeId, disputeId));

      // Analyze dispute content
      const contentAnalysis = await this.analyzeDisputeContent(dispute, evidence);
      
      // Categorize based on content analysis
      const categorization = await this.performMLCategorization(contentAnalysis);
      
      // Store categorization results
      await this.storeCategorization(disputeId, categorization);
      
      return categorization;
    } catch (error) {
      safeLogger.error('Error categorizing dispute:', error);
      throw error;
    }
  }

  /**
   * Calculate priority score for a dispute
   */
  async calculatePriorityScore(disputeId: number): Promise<CasePriorityScore> {
    try {
      // Get dispute and related data
      const disputeData = await this.getDisputeData(disputeId);
      
      // Calculate priority factors
      const factors = await this.calculatePriorityFactors(disputeData);
      
      // Calculate overall score
      const score = this.calculateOverallPriorityScore(factors);
      
      // Determine priority level
      const level = this.determinePriorityLevel(score);
      
      // Estimate resolution time
      const estimatedResolutionTime = await this.estimateResolutionTime(disputeData, factors);
      
      // Find recommended assignee
      const recommendedAssignee = await this.findRecommendedAssignee(disputeData, factors);
      
      const priorityScore: CasePriorityScore = {
        score,
        level,
        factors,
        estimatedResolutionTime,
        recommendedAssignee
      };
      
      // Store priority score
      await this.storePriorityScore(disputeId, priorityScore);
      
      return priorityScore;
    } catch (error) {
      safeLogger.error('Error calculating priority score:', error);
      throw error;
    }
  }

  /**
   * Automatically assign dispute to best available arbitrator
   */
  async assignDisputeAutomatically(disputeId: number): Promise<CaseAssignment> {
    try {
      // Get dispute priority and categorization
      const priority = await this.calculatePriorityScore(disputeId);
      const categorization = await this.categorizeDispute(disputeId);
      
      // Get available arbitrators
      const availableArbitrators = await this.getAvailableArbitrators();
      
      // Score arbitrators for this case
      const arbitratorScores = await this.scoreArbitratorsForCase(
        disputeId,
        categorization,
        priority,
        availableArbitrators
      );
      
      // Select best arbitrator
      const bestArbitrator = arbitratorScores[0];
      
      if (!bestArbitrator) {
        throw new Error('No suitable arbitrator available');
      }
      
      // Create assignment
      const assignment: CaseAssignment = {
        disputeId,
        assigneeId: bestArbitrator.arbitratorId,
        assigneeType: bestArbitrator.type,
        confidence: bestArbitrator.score,
        reasoning: bestArbitrator.reasoning,
        workloadImpact: bestArbitrator.workloadImpact
      };
      
      // Execute assignment
      await this.executeAssignment(assignment);
      
      return assignment;
    } catch (error) {
      safeLogger.error('Error assigning dispute automatically:', error);
      throw error;
    }
  }

  /**
   * Create and track case timeline with milestones
   */
  async createCaseTimeline(disputeId: number): Promise<CaseTimeline> {
    try {
      // Get dispute data
      const disputeData = await this.getDisputeData(disputeId);
      
      // Generate milestones based on dispute type and complexity
      const milestones = await this.generateMilestones(disputeData);
      
      // Calculate timeline
      const timeline: CaseTimeline = {
        disputeId,
        milestones,
        currentPhase: milestones[0]?.name || 'initial_review',
        nextDeadline: milestones[0]?.dueDate || new Date(),
        estimatedCompletion: milestones[milestones.length - 1]?.dueDate || new Date(),
        delayRisk: await this.calculateDelayRisk(disputeData, milestones)
      };
      
      // Store timeline
      await this.storeTimeline(timeline);
      
      return timeline;
    } catch (error) {
      safeLogger.error('Error creating case timeline:', error);
      throw error;
    }
  }

  /**
   * Update case timeline and check for delays
   */
  async updateCaseTimeline(disputeId: number, milestoneId: string, status: string): Promise<CaseTimeline> {
    try {
      // Get current timeline
      const timeline = await this.getCaseTimeline(disputeId);
      
      // Update milestone
      const milestone = timeline.milestones.find(m => m.id === milestoneId);
      if (milestone) {
        milestone.status = status as any;
        if (status === 'completed') {
          milestone.completedDate = new Date();
        }
      }
      
      // Recalculate timeline
      timeline.currentPhase = this.getCurrentPhase(timeline.milestones);
      timeline.nextDeadline = this.getNextDeadline(timeline.milestones);
      timeline.delayRisk = await this.recalculateDelayRisk(timeline);
      
      // Check for delays and trigger alerts
      await this.checkForDelays(timeline);
      
      // Store updated timeline
      await this.storeTimeline(timeline);
      
      return timeline;
    } catch (error) {
      safeLogger.error('Error updating case timeline:', error);
      throw error;
    }
  }

  /**
   * Get workload metrics for all arbitrators
   */
  async getArbitratorWorkloadMetrics(): Promise<WorkloadMetrics[]> {
    try {
      // Get all arbitrators (mock implementation)
      const arbitrators = await this.getAllArbitrators();
      
      const metrics: WorkloadMetrics[] = [];
      
      for (const arbitrator of arbitrators) {
        const workloadMetrics = await this.calculateArbitratorWorkload(arbitrator.id);
        metrics.push(workloadMetrics);
      }
      
      return metrics.sort((a, b) => a.currentCapacity - b.currentCapacity);
    } catch (error) {
      safeLogger.error('Error getting arbitrator workload metrics:', error);
      throw error;
    }
  }

  /**
   * Optimize case routing based on current workloads
   */
  async optimizeCaseRouting(): Promise<{
    reassignments: Array<{ disputeId: number; fromArbitrator: string; toArbitrator: string; reason: string }>;
    recommendations: string[];
  }> {
    try {
      // Get current workload distribution
      const workloadMetrics = await this.getArbitratorWorkloadMetrics();
      
      // Get pending cases
      const pendingCases = await this.getPendingCases();
      
      // Identify optimization opportunities
      const reassignments = await this.identifyReassignmentOpportunities(workloadMetrics, pendingCases);
      
      // Generate recommendations
      const recommendations = this.generateRoutingRecommendations(workloadMetrics, pendingCases);
      
      return { reassignments, recommendations };
    } catch (error) {
      safeLogger.error('Error optimizing case routing:', error);
      throw error;
    }
  }

  // Private helper methods

  private async analyzeDisputeContent(dispute: any, evidence: any[]): Promise<any> {
    const contentAnalysis = {
      disputeReason: dispute.reason || '',
      evidenceCount: evidence.length,
      evidenceTypes: evidence.map(e => e.evidenceType),
      textContent: evidence.filter(e => e.evidenceType === 'text').map(e => e.description).join(' '),
      hasImages: evidence.some(e => e.evidenceType === 'image'),
      hasDocuments: evidence.some(e => e.evidenceType === 'document'),
      urgencyKeywords: this.extractUrgencyKeywords(dispute.reason || ''),
      complexityIndicators: this.extractComplexityIndicators(dispute, evidence)
    };
    
    return contentAnalysis;
  }

  private async performMLCategorization(contentAnalysis: any): Promise<CaseCategorizationResult> {
    // Mock ML categorization - in production, use trained models
    const categories = Object.values(DisputeCategory);
    
    // Simple rule-based categorization for demonstration
    let category = DisputeCategory.PRODUCT_QUALITY;
    let confidence = 0.7;
    const reasoning = [];
    
    const reason = contentAnalysis.disputeReason.toLowerCase();
    
    if (reason.includes('delivery') || reason.includes('shipping') || reason.includes('received')) {
      category = DisputeCategory.DELIVERY_ISSUES;
      confidence = 0.85;
      reasoning.push('Keywords indicate delivery-related issue');
    } else if (reason.includes('payment') || reason.includes('charge') || reason.includes('refund')) {
      category = DisputeCategory.PAYMENT_DISPUTES;
      confidence = 0.8;
      reasoning.push('Keywords indicate payment-related issue');
    } else if (reason.includes('fraud') || reason.includes('scam') || reason.includes('fake')) {
      category = DisputeCategory.FRAUD_SUSPECTED;
      confidence = 0.9;
      reasoning.push('Keywords indicate potential fraud');
    } else if (reason.includes('quality') || reason.includes('defect') || reason.includes('broken')) {
      category = DisputeCategory.PRODUCT_QUALITY;
      confidence = 0.8;
      reasoning.push('Keywords indicate product quality issue');
    }
    
    // Adjust confidence based on evidence
    if (contentAnalysis.evidenceCount > 3) {
      confidence += 0.1;
      reasoning.push('Multiple evidence items increase confidence');
    }
    
    const subcategory = this.determineSubcategory(category, contentAnalysis);
    const suggestedActions = this.generateSuggestedActions(category, contentAnalysis);
    
    return {
      category,
      subcategory,
      confidence: Math.min(0.95, confidence),
      reasoning,
      suggestedActions
    };
  }

  private async calculatePriorityFactors(disputeData: any): Promise<PriorityFactor[]> {
    const factors: PriorityFactor[] = [];
    
    // Financial impact factor
    const financialImpact = parseFloat(disputeData.escrow?.amount || '0');
    factors.push({
      factor: 'financial_impact',
      weight: 0.3,
      impact: Math.min(10, financialImpact / 100), // Scale to 1-10
      description: `Dispute value: $${financialImpact}`
    });
    
    // Time sensitivity factor
    const daysSinceCreated = Math.floor((Date.now() - new Date(disputeData.dispute.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    factors.push({
      factor: 'time_sensitivity',
      weight: 0.25,
      impact: Math.min(10, daysSinceCreated / 2), // Increases over time
      description: `${daysSinceCreated} days since creation`
    });
    
    // Complexity factor
    const complexityScore = this.calculateComplexityScore(disputeData);
    factors.push({
      factor: 'complexity',
      weight: 0.2,
      impact: complexityScore,
      description: `Case complexity score: ${complexityScore}/10`
    });
    
    // User reputation factor
    const reputationImpact = await this.calculateReputationImpact(disputeData);
    factors.push({
      factor: 'user_reputation',
      weight: 0.15,
      impact: reputationImpact,
      description: 'Based on user reputation scores'
    });
    
    // Evidence quality factor
    const evidenceQuality = await this.calculateEvidenceQuality(disputeData);
    factors.push({
      factor: 'evidence_quality',
      weight: 0.1,
      impact: evidenceQuality,
      description: 'Quality and completeness of evidence'
    });
    
    return factors;
  }

  private calculateOverallPriorityScore(factors: PriorityFactor[]): number {
    const weightedSum = factors.reduce((sum, factor) => {
      return sum + (factor.impact * factor.weight);
    }, 0);
    
    return Math.min(10, Math.max(1, weightedSum));
  }

  private determinePriorityLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 8) return 'critical';
    if (score >= 6) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  private async estimateResolutionTime(disputeData: any, factors: PriorityFactor[]): Promise<number> {
    // Base resolution time by category
    const baseTime = this.getBaseResolutionTime(disputeData.category);
    
    // Adjust based on complexity
    const complexityFactor = factors.find(f => f.factor === 'complexity');
    const complexityMultiplier = complexityFactor ? (1 + complexityFactor.impact / 10) : 1;
    
    // Adjust based on evidence quality
    const evidenceFactor = factors.find(f => f.factor === 'evidence_quality');
    const evidenceMultiplier = evidenceFactor ? (2 - evidenceFactor.impact / 10) : 1;
    
    return Math.round(baseTime * complexityMultiplier * evidenceMultiplier);
  }

  private async findRecommendedAssignee(disputeData: any, factors: PriorityFactor[]): Promise<string | undefined> {
    const availableArbitrators = await this.getAvailableArbitrators();
    
    if (availableArbitrators.length === 0) return undefined;
    
    // Score arbitrators based on specialization and workload
    const scores = availableArbitrators.map(arbitrator => {
      let score = 0;
      
      // Specialization match
      if (arbitrator.specializations.includes(disputeData.category)) {
        score += 5;
      }
      
      // Workload consideration
      score += (1 - arbitrator.currentCapacity) * 3;
      
      // Experience factor
      score += Math.min(2, arbitrator.casesHandled / 50);
      
      return { arbitratorId: arbitrator.id, score };
    });
    
    scores.sort((a, b) => b.score - a.score);
    return scores[0]?.arbitratorId;
  }

  private async generateMilestones(disputeData: any): Promise<CaseMilestone[]> {
    const milestones: CaseMilestone[] = [];
    const baseDate = new Date();
    
    // Initial review milestone
    milestones.push({
      id: 'initial_review',
      name: 'Initial Review',
      description: 'Review case details and evidence',
      dueDate: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000), // 1 day
      status: 'pending',
      dependencies: [],
      assignee: disputeData.assignee
    });
    
    // Evidence analysis milestone
    milestones.push({
      id: 'evidence_analysis',
      name: 'Evidence Analysis',
      description: 'Analyze submitted evidence',
      dueDate: new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days
      status: 'pending',
      dependencies: ['initial_review']
    });
    
    // Decision milestone
    milestones.push({
      id: 'decision',
      name: 'Decision',
      description: 'Make final decision on dispute',
      dueDate: new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
      status: 'pending',
      dependencies: ['evidence_analysis'],
      assignee: disputeData.assignee
    });
    
    // Resolution milestone
    milestones.push({
      id: 'resolution',
      name: 'Resolution',
      description: 'Implement decision and close case',
      dueDate: new Date(baseDate.getTime() + 10 * 24 * 60 * 60 * 1000), // 10 days
      status: 'pending',
      dependencies: ['decision']
    });
    
    return milestones;
  }

  private async calculateDelayRisk(disputeData: any, milestones: CaseMilestone[]): Promise<number> {
    let riskScore = 0;
    
    // Check for overdue milestones
    const overdueMilestones = milestones.filter(m => 
      m.status !== 'completed' && new Date() > m.dueDate
    );
    riskScore += overdueMilestones.length * 0.3;
    
    // Check complexity
    const complexity = this.calculateComplexityScore(disputeData);
    riskScore += complexity / 20; // 0-0.5 range
    
    // Check evidence quality
    const evidenceQuality = await this.calculateEvidenceQuality(disputeData);
    riskScore += (10 - evidenceQuality) / 20; // Higher risk for lower quality
    
    return Math.min(1, riskScore);
  }

  private extractUrgencyKeywords(text: string): string[] {
    const urgentKeywords = ['urgent', 'emergency', 'asap', 'immediately', 'critical', 'fraud', 'scam'];
    return urgentKeywords.filter(keyword => text.toLowerCase().includes(keyword));
  }

  private extractComplexityIndicators(dispute: any, evidence: any[]): any {
    return {
      multipleParties: false, // Would check for multiple involved parties
      crossBorderTransaction: false, // Would check transaction details
      highValue: parseFloat(dispute.amount || '0') > 1000,
      multipleEvidenceTypes: new Set(evidence.map(e => e.evidenceType)).size > 2,
      legalImplications: evidence.some(e => e.evidenceType === 'legal_document')
    };
  }

  private determineSubcategory(category: DisputeCategory, contentAnalysis: any): string {
    // Simple subcategory determination
    switch (category) {
      case DisputeCategory.PRODUCT_QUALITY:
        return contentAnalysis.disputeReason.includes('defect') ? 'manufacturing_defect' : 'quality_mismatch';
      case DisputeCategory.DELIVERY_ISSUES:
        return contentAnalysis.disputeReason.includes('late') ? 'delayed_delivery' : 'non_delivery';
      case DisputeCategory.PAYMENT_DISPUTES:
        return contentAnalysis.disputeReason.includes('unauthorized') ? 'unauthorized_charge' : 'refund_request';
      default:
        return 'general';
    }
  }

  private generateSuggestedActions(category: DisputeCategory, contentAnalysis: any): string[] {
    const actions = [];
    
    switch (category) {
      case DisputeCategory.FRAUD_SUSPECTED:
        actions.push('Escalate to fraud investigation team');
        actions.push('Freeze related accounts');
        actions.push('Request additional verification');
        break;
      case DisputeCategory.DELIVERY_ISSUES:
        actions.push('Contact shipping provider');
        actions.push('Request tracking information');
        actions.push('Verify delivery address');
        break;
      case DisputeCategory.PRODUCT_QUALITY:
        actions.push('Request product photos');
        actions.push('Contact seller for explanation');
        actions.push('Review return policy');
        break;
      default:
        actions.push('Review evidence thoroughly');
        actions.push('Contact both parties for clarification');
    }
    
    return actions;
  }

  private calculateComplexityScore(disputeData: any): number {
    let score = 1;
    
    // Financial complexity
    const amount = parseFloat(disputeData.escrow?.amount || '0');
    if (amount > 1000) score += 2;
    else if (amount > 500) score += 1;
    
    // Evidence complexity
    const evidenceCount = disputeData.evidence?.length || 0;
    if (evidenceCount > 5) score += 2;
    else if (evidenceCount > 2) score += 1;
    
    // Time complexity
    const daysSinceCreated = Math.floor((Date.now() - new Date(disputeData.dispute.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceCreated > 14) score += 2;
    else if (daysSinceCreated > 7) score += 1;
    
    return Math.min(10, score);
  }

  private async calculateReputationImpact(disputeData: any): Promise<number> {
    // Mock reputation calculation
    const buyerReputation = 750; // Mock reputation score
    const sellerReputation = 680; // Mock reputation score
    
    // Higher reputation users get higher priority
    const avgReputation = (buyerReputation + sellerReputation) / 2;
    return Math.min(10, avgReputation / 100);
  }

  private async calculateEvidenceQuality(disputeData: any): Promise<number> {
    const evidence = disputeData.evidence || [];
    
    if (evidence.length === 0) return 1;
    
    let qualityScore = 5; // Base score
    
    // Bonus for multiple evidence types
    const evidenceTypes = new Set(evidence.map((e: any) => e.evidenceType));
    qualityScore += evidenceTypes.size;
    
    // Bonus for verified evidence
    const verifiedCount = evidence.filter((e: any) => e.verified).length;
    qualityScore += verifiedCount * 0.5;
    
    return Math.min(10, qualityScore);
  }

  private getBaseResolutionTime(category: string): number {
    const baseTimes: Record<string, number> = {
      [DisputeCategory.FRAUD_SUSPECTED]: 168, // 7 days
      [DisputeCategory.PAYMENT_DISPUTES]: 72, // 3 days
      [DisputeCategory.DELIVERY_ISSUES]: 48, // 2 days
      [DisputeCategory.PRODUCT_QUALITY]: 96, // 4 days
      default: 72 // 3 days
    };
    
    return baseTimes[category] || baseTimes.default;
  }

  private async getAvailableArbitrators(): Promise<any[]> {
    // Mock arbitrator data
    return [
      {
        id: 'arbitrator_1',
        specializations: [DisputeCategory.PRODUCT_QUALITY, DisputeCategory.DELIVERY_ISSUES],
        currentCapacity: 0.7,
        casesHandled: 150,
        successRate: 0.92,
        type: 'arbitrator'
      },
      {
        id: 'arbitrator_2',
        specializations: [DisputeCategory.FRAUD_SUSPECTED, DisputeCategory.PAYMENT_DISPUTES],
        currentCapacity: 0.4,
        casesHandled: 200,
        successRate: 0.95,
        type: 'specialist'
      }
    ];
  }

  private async scoreArbitratorsForCase(
    disputeId: number,
    categorization: CaseCategorizationResult,
    priority: CasePriorityScore,
    arbitrators: any[]
  ): Promise<any[]> {
    return arbitrators.map(arbitrator => ({
      arbitratorId: arbitrator.id,
      type: arbitrator.type,
      score: this.calculateArbitratorScore(arbitrator, categorization, priority),
      reasoning: this.generateArbitratorReasoning(arbitrator, categorization),
      workloadImpact: arbitrator.currentCapacity + 0.1
    })).sort((a, b) => b.score - a.score);
  }

  private calculateArbitratorScore(arbitrator: any, categorization: CaseCategorizationResult, priority: CasePriorityScore): number {
    let score = 0;
    
    // Specialization match
    if (arbitrator.specializations.includes(categorization.category)) {
      score += 0.4;
    }
    
    // Capacity consideration
    score += (1 - arbitrator.currentCapacity) * 0.3;
    
    // Success rate
    score += arbitrator.successRate * 0.2;
    
    // Experience
    score += Math.min(0.1, arbitrator.casesHandled / 1000);
    
    return score;
  }

  private generateArbitratorReasoning(arbitrator: any, categorization: CaseCategorizationResult): string[] {
    const reasoning = [];
    
    if (arbitrator.specializations.includes(categorization.category)) {
      reasoning.push(`Specializes in ${categorization.category} cases`);
    }
    
    if (arbitrator.currentCapacity < 0.8) {
      reasoning.push('Has available capacity');
    }
    
    if (arbitrator.successRate > 0.9) {
      reasoning.push('High success rate');
    }
    
    return reasoning;
  }

  private async executeAssignment(assignment: CaseAssignment): Promise<void> {
    // Update dispute with assignment
    await db.update(disputes)
      .set({
        status: 'assigned',
        updatedAt: new Date()
      })
      .where(eq(disputes.id, assignment.disputeId));
    
    safeLogger.info(`Assigned dispute ${assignment.disputeId} to ${assignment.assigneeId}`);
  }

  private async getDisputeData(disputeId: number): Promise<any> {
    const [dispute] = await db.select().from(disputes).where(eq(disputes.id, disputeId)).limit(1);
    const evidence = await db.select().from(disputeEvidence).where(eq(disputeEvidence.disputeId, disputeId));
    
    return { dispute, evidence };
  }

  private async storeCategorization(disputeId: number, categorization: CaseCategorizationResult): Promise<void> {
    // In production, store in dedicated table
    safeLogger.info(`Stored categorization for dispute ${disputeId}:`, categorization.category);
  }

  private async storePriorityScore(disputeId: number, priorityScore: CasePriorityScore): Promise<void> {
    // In production, store in dedicated table
    safeLogger.info(`Stored priority score for dispute ${disputeId}:`, priorityScore.score);
  }

  private async storeTimeline(timeline: CaseTimeline): Promise<void> {
    // In production, store in dedicated table
    safeLogger.info(`Stored timeline for dispute ${timeline.disputeId}`);
  }

  private async getCaseTimeline(disputeId: number): Promise<CaseTimeline> {
    // Mock implementation - in production, retrieve from database
    return await this.createCaseTimeline(disputeId);
  }

  private getCurrentPhase(milestones: CaseMilestone[]): string {
    const inProgress = milestones.find(m => m.status === 'in_progress');
    if (inProgress) return inProgress.name;
    
    const nextPending = milestones.find(m => m.status === 'pending');
    return nextPending?.name || 'completed';
  }

  private getNextDeadline(milestones: CaseMilestone[]): Date {
    const pendingMilestones = milestones.filter(m => m.status === 'pending');
    if (pendingMilestones.length === 0) return new Date();
    
    return pendingMilestones.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0].dueDate;
  }

  private async recalculateDelayRisk(timeline: CaseTimeline): Promise<number> {
    // Recalculate delay risk based on current progress
    const overdueMilestones = timeline.milestones.filter(m => 
      m.status !== 'completed' && new Date() > m.dueDate
    );
    
    return Math.min(1, overdueMilestones.length * 0.25);
  }

  private async checkForDelays(timeline: CaseTimeline): Promise<void> {
    if (timeline.delayRisk > 0.5) {
      safeLogger.info(`High delay risk detected for dispute ${timeline.disputeId}`);
      // In production, trigger alerts and notifications
    }
  }

  private async getAllArbitrators(): Promise<any[]> {
    // Mock implementation
    return await this.getAvailableArbitrators();
  }

  private async calculateArbitratorWorkload(arbitratorId: string): Promise<WorkloadMetrics> {
    // Mock workload calculation
    return {
      arbitratorId,
      activeCases: Math.floor(Math.random() * 20) + 5,
      averageResolutionTime: Math.floor(Math.random() * 48) + 24,
      successRate: 0.8 + Math.random() * 0.15,
      specializations: [DisputeCategory.PRODUCT_QUALITY],
      currentCapacity: Math.random() * 0.8 + 0.2,
      nextAvailable: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000)
    };
  }

  private async getPendingCases(): Promise<any[]> {
    return await db.select()
      .from(disputes)
      .where(eq(disputes.status, 'pending'));
  }

  private async identifyReassignmentOpportunities(
    workloadMetrics: WorkloadMetrics[],
    pendingCases: any[]
  ): Promise<Array<{ disputeId: number; fromArbitrator: string; toArbitrator: string; reason: string }>> {
    const reassignments = [];
    
    // Find overloaded arbitrators
    const overloaded = workloadMetrics.filter(m => m.currentCapacity > 0.9);
    const underloaded = workloadMetrics.filter(m => m.currentCapacity < 0.6);
    
    for (const overloadedArbitrator of overloaded) {
      for (const underloadedArbitrator of underloaded) {
        // Mock reassignment logic
        if (Math.random() > 0.7) {
          reassignments.push({
            disputeId: Math.floor(Math.random() * 1000),
            fromArbitrator: overloadedArbitrator.arbitratorId,
            toArbitrator: underloadedArbitrator.arbitratorId,
            reason: 'Workload balancing'
          });
        }
      }
    }
    
    return reassignments;
  }

  private generateRoutingRecommendations(workloadMetrics: WorkloadMetrics[], pendingCases: any[]): string[] {
    const recommendations = [];
    
    const avgCapacity = workloadMetrics.reduce((sum, m) => sum + m.currentCapacity, 0) / workloadMetrics.length;
    
    if (avgCapacity > 0.8) {
      recommendations.push('Consider hiring additional arbitrators');
    }
    
    if (pendingCases.length > 50) {
      recommendations.push('High case volume detected - consider expedited processing');
    }
    
    const overloaded = workloadMetrics.filter(m => m.currentCapacity > 0.9);
    if (overloaded.length > 0) {
      recommendations.push(`${overloaded.length} arbitrators are overloaded - consider redistribution`);
    }
    
    return recommendations;
  }
}

export const automatedCaseManagementService = new AutomatedCaseManagementService();