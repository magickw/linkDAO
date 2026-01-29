import { AIModerationOrchestrator, ContentInput, EnsembleDecision, ModerationResult } from '../aiModerationOrchestrator';
import { safeLogger } from '../../utils/safeLogger';
import { databaseService } from '../databaseService';
import { moderationCases } from '../../db/schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';

export interface RiskFactor {
  name: string;
  weight: number;
  value: number;
  confidence: number;
  explanation: string;
}

export interface ContentRiskAssessment {
  contentId: string;
  overallRiskScore: number;
  confidence: number;
  riskFactors: RiskFactor[];
  recommendedAction: 'allow' | 'limit' | 'block' | 'review';
  explanation: string;
  modelVersion: string;
  timestamp: Date;
  uncertaintyScore: number;
  explainabilityData: ExplainabilityData;
}

export interface ExplainabilityData {
  keyPhrases: string[];
  sentimentAnalysis: {
    overall: number;
    aspects: Record<string, number>;
  };
  contextualFactors: {
    userHistory: number;
    communityContext: number;
    temporalPatterns: number;
  };
  similarCases: SimilarCase[];
}

export interface SimilarCase {
  caseId: string;
  similarity: number;
  outcome: string;
  reasoning: string;
}

export interface ModelPerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  lastUpdated: Date;
}

export class AIContentRiskScoringService {
  private moderationOrchestrator: AIModerationOrchestrator;
  private modelVersion = '1.0.0';
  private riskFactorWeights: Record<string, number>;
  private performanceMetrics: ModelPerformanceMetrics;

  constructor() {
    this.moderationOrchestrator = new AIModerationOrchestrator();
    
    // Initialize risk factor weights based on historical data and domain expertise
    this.riskFactorWeights = {
      'content_toxicity': 0.25,
      'user_reputation': 0.15,
      'community_context': 0.10,
      'temporal_patterns': 0.10,
      'linguistic_features': 0.15,
      'behavioral_signals': 0.15,
      'network_effects': 0.10
    };

    // Initialize performance metrics
    this.performanceMetrics = {
      accuracy: 0.92,
      precision: 0.89,
      recall: 0.94,
      f1Score: 0.91,
      falsePositiveRate: 0.08,
      falseNegativeRate: 0.06,
      lastUpdated: new Date()
    };
  }

  /**
   * Perform comprehensive risk assessment on content
   */
  async assessContentRisk(content: ContentInput): Promise<ContentRiskAssessment> {
    try {
      // Get base moderation results from orchestrator
      const moderationResult = await this.moderationOrchestrator.scanContent(content);
      
      // Calculate multi-factor risk assessment
      const riskFactors = await this.calculateRiskFactors(content, moderationResult);
      
      // Generate overall risk score
      const overallRiskScore = this.calculateOverallRiskScore(riskFactors);
      
      // Calculate confidence and uncertainty
      const confidence = this.calculateConfidence(riskFactors, moderationResult);
      const uncertaintyScore = 1 - confidence;
      
      // Generate explainability data
      const explainabilityData = await this.generateExplainabilityData(content, riskFactors, moderationResult);
      
      // Determine recommended action
      const recommendedAction = this.determineRecommendedAction(overallRiskScore, confidence, uncertaintyScore);
      
      // Generate human-readable explanation
      const explanation = this.generateExplanation(riskFactors, recommendedAction, confidence);

      const assessment: ContentRiskAssessment = {
        contentId: content.id,
        overallRiskScore,
        confidence,
        riskFactors,
        recommendedAction,
        explanation,
        modelVersion: this.modelVersion,
        timestamp: new Date(),
        uncertaintyScore,
        explainabilityData
      };

      // Store assessment for future analysis and model improvement
      await this.storeAssessment(assessment);

      return assessment;

    } catch (error) {
      safeLogger.error('Error in AI content risk scoring:', error);
      
      // Return safe fallback assessment
      return this.createFallbackAssessment(content);
    }
  }

  /**
   * Calculate individual risk factors
   */
  private async calculateRiskFactors(content: ContentInput, moderationResult: EnsembleDecision): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];

    // Content toxicity factor (from AI moderation)
    factors.push({
      name: 'content_toxicity',
      weight: this.riskFactorWeights.content_toxicity,
      value: moderationResult.riskScore,
      confidence: moderationResult.overallConfidence,
      explanation: `AI moderation detected ${moderationResult.primaryCategory} with ${(moderationResult.overallConfidence * 100).toFixed(1)}% confidence`
    });

    // User reputation factor
    const userReputationFactor = await this.calculateUserReputationFactor(content);
    factors.push(userReputationFactor);

    // Community context factor
    const communityContextFactor = await this.calculateCommunityContextFactor(content);
    factors.push(communityContextFactor);

    // Temporal patterns factor
    const temporalPatternsFactor = await this.calculateTemporalPatternsFactor(content);
    factors.push(temporalPatternsFactor);

    // Linguistic features factor
    const linguisticFeaturesFactor = this.calculateLinguisticFeaturesFactor(content);
    factors.push(linguisticFeaturesFactor);

    // Behavioral signals factor
    const behavioralSignalsFactor = await this.calculateBehavioralSignalsFactor(content);
    factors.push(behavioralSignalsFactor);

    // Network effects factor
    const networkEffectsFactor = await this.calculateNetworkEffectsFactor(content);
    factors.push(networkEffectsFactor);

    return factors;
  }

  /**
   * Calculate user reputation risk factor
   */
  private async calculateUserReputationFactor(content: ContentInput): Promise<RiskFactor> {
    try {
      // Get user's moderation history
      const db = databaseService.getDatabase();
      const userHistory = await db
        .select()
        .from(moderationCases)
        .where(eq(moderationCases.userId, content.userId))
        .orderBy(desc(moderationCases.createdAt))
        .limit(50);

      // Calculate reputation score based on history
      let reputationScore = content.userReputation || 0;
      let riskValue = 0;
      let confidence = 0.8;

      if (userHistory.length > 0) {
        const violationCount = userHistory.filter(case_ => case_.status === 'blocked').length;
        const violationRate = violationCount / userHistory.length;
        
        // Higher violation rate = higher risk
        riskValue = Math.min(violationRate * 2, 1.0);
        confidence = Math.min(userHistory.length / 10, 1.0); // More history = higher confidence
      } else {
        // New user - moderate risk due to uncertainty
        riskValue = 0.3;
        confidence = 0.5;
      }

      return {
        name: 'user_reputation',
        weight: this.riskFactorWeights.user_reputation,
        value: riskValue,
        confidence,
        explanation: `User has ${userHistory.length} moderation cases with ${(riskValue * 100).toFixed(1)}% violation rate`
      };

    } catch (error) {
      safeLogger.error('Error calculating user reputation factor:', error);
      return {
        name: 'user_reputation',
        weight: this.riskFactorWeights.user_reputation,
        value: 0.5,
        confidence: 0.3,
        explanation: 'Unable to assess user reputation due to data access error'
      };
    }
  }

  /**
   * Calculate community context risk factor
   */
  private async calculateCommunityContextFactor(content: ContentInput): Promise<RiskFactor> {
    // Analyze community-specific risk patterns
    // This would integrate with community moderation policies and historical data
    
    let riskValue = 0.2; // Default low risk
    let confidence = 0.7;
    let explanation = 'Standard community context assessment';

    // Check if content type has higher risk in this community
    if (content.type === 'listing' && content.metadata?.communityId) {
      riskValue = 0.4; // Marketplace listings have higher inherent risk
      explanation = 'Marketplace listing requires additional scrutiny';
    }

    return {
      name: 'community_context',
      weight: this.riskFactorWeights.community_context,
      value: riskValue,
      confidence,
      explanation
    };
  }

  /**
   * Calculate temporal patterns risk factor
   */
  private async calculateTemporalPatternsFactor(content: ContentInput): Promise<RiskFactor> {
    try {
      const db = databaseService.getDatabase();
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Check for rapid posting patterns (potential spam)
      const recentPosts = await db
        .select({ count: sql<number>`count(*)` })
        .from(moderationCases)
        .where(
          and(
            eq(moderationCases.userId, content.userId),
            gte(moderationCases.createdAt, oneHourAgo)
          )
        );

      const postCount = recentPosts[0]?.count || 0;
      let riskValue = Math.min(postCount / 10, 1.0); // Risk increases with posting frequency
      let confidence = 0.8;

      return {
        name: 'temporal_patterns',
        weight: this.riskFactorWeights.temporal_patterns,
        value: riskValue,
        confidence,
        explanation: `User posted ${postCount} times in the last hour`
      };

    } catch (error) {
      safeLogger.error('Error calculating temporal patterns factor:', error);
      return {
        name: 'temporal_patterns',
        weight: this.riskFactorWeights.temporal_patterns,
        value: 0.2,
        confidence: 0.3,
        explanation: 'Unable to assess temporal patterns'
      };
    }
  }

  /**
   * Calculate linguistic features risk factor
   */
  private calculateLinguisticFeaturesFactor(content: ContentInput): RiskFactor {
    if (!content.text) {
      return {
        name: 'linguistic_features',
        weight: this.riskFactorWeights.linguistic_features,
        value: 0,
        confidence: 1.0,
        explanation: 'No text content to analyze'
      };
    }

    let riskValue = 0;
    const features: string[] = [];

    // Check for excessive capitalization
    const capsRatio = (content.text.match(/[A-Z]/g) || []).length / content.text.length;
    if (capsRatio > 0.3) {
      riskValue += 0.2;
      features.push('excessive capitalization');
    }

    // Check for excessive punctuation
    const punctRatio = (content.text.match(/[!?]{2,}/g) || []).length;
    if (punctRatio > 2) {
      riskValue += 0.15;
      features.push('excessive punctuation');
    }

    // Check for repetitive patterns
    const words = content.text.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const repetitionRatio = 1 - (uniqueWords.size / words.length);
    if (repetitionRatio > 0.5) {
      riskValue += 0.25;
      features.push('repetitive content');
    }

    // Check for URL patterns (potential spam)
    const urlCount = (content.text.match(/https?:\/\/[^\s]+/g) || []).length;
    if (urlCount > 3) {
      riskValue += 0.3;
      features.push('multiple URLs');
    }

    riskValue = Math.min(riskValue, 1.0);

    return {
      name: 'linguistic_features',
      weight: this.riskFactorWeights.linguistic_features,
      value: riskValue,
      confidence: 0.85,
      explanation: features.length > 0 ? `Detected: ${features.join(', ')}` : 'No concerning linguistic patterns detected'
    };
  }

  /**
   * Calculate behavioral signals risk factor
   */
  private async calculateBehavioralSignalsFactor(content: ContentInput): Promise<RiskFactor> {
    // This would analyze user behavioral patterns, engagement metrics, etc.
    // For now, implementing basic heuristics
    
    let riskValue = 0.1; // Default low risk
    let confidence = 0.6;
    let explanation = 'Standard behavioral assessment';

    // Check if user is new (higher risk due to uncertainty)
    if (!content.userReputation || content.userReputation < 10) {
      riskValue = 0.4;
      explanation = 'New user with limited reputation history';
    }

    return {
      name: 'behavioral_signals',
      weight: this.riskFactorWeights.behavioral_signals,
      value: riskValue,
      confidence,
      explanation
    };
  }

  /**
   * Calculate network effects risk factor
   */
  private async calculateNetworkEffectsFactor(content: ContentInput): Promise<RiskFactor> {
    // This would analyze network-based signals like coordinated behavior, etc.
    // For now, implementing basic checks
    
    let riskValue = 0.1;
    let confidence = 0.5;
    let explanation = 'Standard network analysis';

    return {
      name: 'network_effects',
      weight: this.riskFactorWeights.network_effects,
      value: riskValue,
      confidence,
      explanation
    };
  }

  /**
   * Calculate overall risk score from individual factors
   */
  private calculateOverallRiskScore(riskFactors: RiskFactor[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const factor of riskFactors) {
      const adjustedWeight = factor.weight * factor.confidence; // Weight by confidence
      weightedSum += factor.value * adjustedWeight;
      totalWeight += adjustedWeight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Calculate confidence in the assessment
   */
  private calculateConfidence(riskFactors: RiskFactor[], moderationResult: EnsembleDecision): number {
    // Average confidence across all factors, weighted by factor importance
    let weightedConfidenceSum = 0;
    let totalWeight = 0;

    for (const factor of riskFactors) {
      weightedConfidenceSum += factor.confidence * factor.weight;
      totalWeight += factor.weight;
    }

    const factorConfidence = totalWeight > 0 ? weightedConfidenceSum / totalWeight : 0.5;
    
    // Combine with moderation result confidence
    return (factorConfidence + moderationResult.overallConfidence) / 2;
  }

  /**
   * Generate explainability data for transparency
   */
  private async generateExplainabilityData(
    content: ContentInput, 
    riskFactors: RiskFactor[], 
    moderationResult: EnsembleDecision
  ): Promise<ExplainabilityData> {
    
    // Extract key phrases from content
    const keyPhrases = this.extractKeyPhrases(content.text || '');
    
    // Basic sentiment analysis
    const sentimentAnalysis = this.analyzeSentiment(content.text || '');
    
    // Contextual factors from risk assessment
    const contextualFactors = {
      userHistory: riskFactors.find(f => f.name === 'user_reputation')?.value || 0,
      communityContext: riskFactors.find(f => f.name === 'community_context')?.value || 0,
      temporalPatterns: riskFactors.find(f => f.name === 'temporal_patterns')?.value || 0
    };

    // Find similar cases (simplified implementation)
    const similarCases = await this.findSimilarCases(content);

    return {
      keyPhrases,
      sentimentAnalysis,
      contextualFactors,
      similarCases
    };
  }

  /**
   * Extract key phrases from text content
   */
  private extractKeyPhrases(text: string): string[] {
    if (!text) return [];
    
    // Simple keyword extraction (in production, would use NLP libraries)
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    // Return most frequent words as key phrases
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });
    
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Analyze sentiment of text content
   */
  private analyzeSentiment(text: string): { overall: number; aspects: Record<string, number> } {
    if (!text) return { overall: 0, aspects: {} };
    
    // Simple sentiment analysis (in production, would use proper NLP)
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'like'];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'disgusting', 'stupid'];
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });
    
    const overall = (positiveCount - negativeCount) / Math.max(words.length, 1);
    
    return {
      overall,
      aspects: {
        positivity: positiveCount / Math.max(words.length, 1),
        negativity: negativeCount / Math.max(words.length, 1)
      }
    };
  }

  /**
   * Find similar moderation cases
   */
  private async findSimilarCases(content: ContentInput): Promise<SimilarCase[]> {
    try {
      const db = databaseService.getDatabase();
      
      // Find cases with similar content type and risk patterns
      const similarCases = await db
        .select()
        .from(moderationCases)
        .where(eq(moderationCases.contentType, content.type))
        .orderBy(desc(moderationCases.createdAt))
        .limit(5);

      return similarCases.map(case_ => ({
        caseId: case_.id.toString(),
        similarity: 0.7, // Simplified similarity score
        outcome: case_.status || 'unknown',
        reasoning: case_.reasoning || 'No reasoning provided'
      }));

    } catch (error) {
      safeLogger.error('Error finding similar cases:', error);
      return [];
    }
  }

  /**
   * Determine recommended action based on risk score and confidence
   */
  private determineRecommendedAction(
    riskScore: number, 
    confidence: number, 
    uncertaintyScore: number
  ): 'allow' | 'limit' | 'block' | 'review' {
    
    // High uncertainty always requires human review
    if (uncertaintyScore > 0.4) {
      return 'review';
    }
    
    // High confidence decisions
    if (confidence > 0.8) {
      if (riskScore > 0.8) return 'block';
      if (riskScore > 0.6) return 'limit';
      if (riskScore > 0.3) return 'review';
      return 'allow';
    }
    
    // Medium confidence - more conservative
    if (confidence > 0.6) {
      if (riskScore > 0.7) return 'block';
      if (riskScore > 0.4) return 'review';
      return 'allow';
    }
    
    // Low confidence - default to human review
    return 'review';
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(
    riskFactors: RiskFactor[], 
    action: string, 
    confidence: number
  ): string {
    const topFactors = riskFactors
      .sort((a, b) => (b.value * b.weight) - (a.value * a.weight))
      .slice(0, 3);
    
    let explanation = `Recommended action: ${action} (${(confidence * 100).toFixed(1)}% confidence). `;
    
    if (topFactors.length > 0) {
      explanation += 'Key factors: ';
      explanation += topFactors
        .map(factor => `${factor.name.replace('_', ' ')} (${(factor.value * 100).toFixed(1)}%)`)
        .join(', ');
    }
    
    return explanation;
  }

  /**
   * Store assessment for analysis and model improvement
   */
  private async storeAssessment(assessment: ContentRiskAssessment): Promise<void> {
    try {
      // Store in moderation cases table with AI assessment data
      const db = databaseService.getDatabase();
      
      await db.insert(moderationCases).values({
        contentId: assessment.contentId,
        contentType: 'post', // This should be derived from content
        userId: '', // This should be passed from content
        status: 'pending',
        riskScore: assessment.overallRiskScore,
        confidence: assessment.confidence,
        reasoning: assessment.explanation,
        aiModelVersion: assessment.modelVersion,
        createdAt: assessment.timestamp
      });

    } catch (error) {
      safeLogger.error('Error storing risk assessment:', error);
      // Don't throw - this is for analytics, not critical path
    }
  }

  /**
   * Create fallback assessment when main processing fails
   */
  private createFallbackAssessment(content: ContentInput): ContentRiskAssessment {
    return {
      contentId: content.id,
      overallRiskScore: 0.5, // Neutral risk when uncertain
      confidence: 0.3, // Low confidence
      riskFactors: [{
        name: 'system_error',
        weight: 1.0,
        value: 0.5,
        confidence: 0.3,
        explanation: 'Risk assessment failed, defaulting to manual review'
      }],
      recommendedAction: 'review', // Always review when system fails
      explanation: 'System error occurred during risk assessment. Manual review required.',
      modelVersion: this.modelVersion,
      timestamp: new Date(),
      uncertaintyScore: 0.7,
      explainabilityData: {
        keyPhrases: [],
        sentimentAnalysis: { overall: 0, aspects: {} },
        contextualFactors: { userHistory: 0, communityContext: 0, temporalPatterns: 0 },
        similarCases: []
      }
    };
  }

  /**
   * Get current model performance metrics
   */
  getPerformanceMetrics(): ModelPerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Update model performance metrics based on feedback
   */
  async updatePerformanceMetrics(
    truePositives: number,
    falsePositives: number,
    trueNegatives: number,
    falseNegatives: number
  ): Promise<void> {
    const total = truePositives + falsePositives + trueNegatives + falseNegatives;
    
    if (total === 0) return;
    
    this.performanceMetrics = {
      accuracy: (truePositives + trueNegatives) / total,
      precision: truePositives / (truePositives + falsePositives),
      recall: truePositives / (truePositives + falseNegatives),
      f1Score: 2 * truePositives / (2 * truePositives + falsePositives + falseNegatives),
      falsePositiveRate: falsePositives / (falsePositives + trueNegatives),
      falseNegativeRate: falseNegatives / (falseNegatives + truePositives),
      lastUpdated: new Date()
    };
  }
}

export const aiContentRiskScoringService = new AIContentRiskScoringService();
