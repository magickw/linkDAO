import { databaseService } from './databaseService';
import { moderationCases, contentReports } from '../db/schema';
import { eq, desc, and, gte, lte, sql, ne, isNotNull } from 'drizzle-orm';
import crypto from 'crypto';

export interface CaseFeatures {
  contentType: string;
  textFeatures: TextFeatures;
  visualFeatures?: VisualFeatures;
  contextFeatures: ContextFeatures;
  behavioralFeatures: BehavioralFeatures;
}

export interface TextFeatures {
  length: number;
  wordCount: number;
  sentimentScore: number;
  toxicityScore: number;
  keyPhrases: string[];
  languagePatterns: LanguagePattern[];
  semanticEmbedding?: number[]; // Vector representation
}

export interface VisualFeatures {
  imageHash?: string;
  colorHistogram?: number[];
  objectDetections?: string[];
  faceCount?: number;
  explicitContent?: boolean;
}

export interface ContextFeatures {
  userReputation: number;
  communityId?: string;
  timeOfDay: number;
  dayOfWeek: number;
  reportCount: number;
  reporterReputations: number[];
}

export interface BehavioralFeatures {
  postingFrequency: number;
  engagementPattern: number;
  networkConnections: number;
  previousViolations: number;
}

export interface LanguagePattern {
  pattern: string;
  frequency: number;
  context: string;
}

export interface SimilarCase {
  caseId: string;
  similarity: number;
  outcome: string;
  reasoning: string;
  moderatorId?: string;
  confidence: number;
  features: CaseFeatures;
  createdAt: Date;
  processingTime: number;
  appealStatus?: string;
}

export interface CasePrecedent {
  precedentId: string;
  caseIds: string[];
  pattern: string;
  consistency: number;
  outcomes: OutcomePattern[];
  confidence: number;
  applicability: string[];
  lastUpdated: Date;
}

export interface OutcomePattern {
  outcome: string;
  frequency: number;
  averageConfidence: number;
  moderatorConsensus: number;
}

export interface ConsistencyAnalysis {
  overallConsistency: number;
  patternConsistency: PatternConsistency[];
  moderatorConsistency: ModeratorConsistency[];
  recommendations: string[];
}

export interface PatternConsistency {
  pattern: string;
  consistency: number;
  caseCount: number;
  dominantOutcome: string;
  outliers: string[];
}

export interface ModeratorConsistency {
  moderatorId: string;
  consistency: number;
  caseCount: number;
  agreementRate: number;
  specializations: string[];
}

export interface DecisionRecommendation {
  recommendedOutcome: string;
  confidence: number;
  reasoning: string;
  precedents: SimilarCase[];
  riskFactors: string[];
  mitigatingFactors: string[];
}

export class SimilarCaseMatchingService {
  private readonly SIMILARITY_THRESHOLD = 0.7;
  private readonly MAX_SIMILAR_CASES = 10;
  private readonly FEATURE_WEIGHTS = {
    textSimilarity: 0.35,
    contextSimilarity: 0.25,
    behavioralSimilarity: 0.20,
    visualSimilarity: 0.20
  };

  /**
   * Find similar cases for a given moderation case
   */
  async findSimilarCases(caseId: string, limit: number = this.MAX_SIMILAR_CASES): Promise<SimilarCase[]> {
    try {
      // Get the target case
      const targetCase = await this.getCaseById(caseId);
      if (!targetCase) {
        throw new Error('Case not found');
      }

      // Extract features from the target case
      const targetFeatures = await this.extractCaseFeatures(targetCase);

      // Get candidate cases for comparison
      const candidateCases = await this.getCandidateCases(targetCase, 100);

      // Calculate similarities
      const similarities: SimilarCase[] = [];
      
      for (const candidate of candidateCases) {
        const candidateFeatures = await this.extractCaseFeatures(candidate);
        const similarity = this.calculateSimilarity(targetFeatures, candidateFeatures);
        
        if (similarity >= this.SIMILARITY_THRESHOLD) {
          similarities.push({
            caseId: candidate.id.toString(),
            similarity,
            outcome: candidate.status || 'unknown',
            reasoning: candidate.reasoning || 'No reasoning provided',
            moderatorId: candidate.assignedModeratorId || undefined,
            confidence: candidate.confidence || 0.5,
            features: candidateFeatures,
            createdAt: candidate.createdAt || new Date(),
            processingTime: this.calculateProcessingTime(candidate),
            appealStatus: candidate.appealStatus
          });
        }
      }

      // Sort by similarity and return top matches
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

    } catch (error) {
      console.error('Error finding similar cases:', error);
      throw new Error('Failed to find similar cases');
    }
  }

  /**
   * Build case precedent database from historical decisions
   */
  async buildPrecedentDatabase(): Promise<CasePrecedent[]> {
    try {
      const db = databaseService.getDatabase();
      
      // Get all resolved cases from the last year
      const resolvedCases = await db
        .select()
        .from(moderationCases)
        .where(
          and(
            ne(moderationCases.status, 'pending'),
            gte(moderationCases.createdAt, new Date(Date.now() - 365 * 24 * 60 * 60 * 1000))
          )
        )
        .orderBy(desc(moderationCases.createdAt));

      // Group cases by similar patterns
      const patternGroups = await this.groupCasesByPattern(resolvedCases);

      // Build precedents from pattern groups
      const precedents: CasePrecedent[] = [];
      
      for (const [pattern, cases] of patternGroups.entries()) {
        if (cases.length >= 3) { // Minimum cases to establish precedent
          const precedent = await this.createPrecedentFromCases(pattern, cases);
          precedents.push(precedent);
        }
      }

      return precedents.sort((a, b) => b.confidence - a.confidence);

    } catch (error) {
      console.error('Error building precedent database:', error);
      throw new Error('Failed to build precedent database');
    }
  }

  /**
   * Analyze decision consistency across similar cases
   */
  async analyzeConsistency(timeRange: number = 30): Promise<ConsistencyAnalysis> {
    try {
      const db = databaseService.getDatabase();
      const cutoffDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
      
      // Get recent resolved cases
      const recentCases = await db
        .select()
        .from(moderationCases)
        .where(
          and(
            ne(moderationCases.status, 'pending'),
            gte(moderationCases.createdAt, cutoffDate)
          )
        );

      // Analyze pattern consistency
      const patternConsistency = await this.analyzePatternConsistency(recentCases);
      
      // Analyze moderator consistency
      const moderatorConsistency = await this.analyzeModeratorConsistency(recentCases);
      
      // Calculate overall consistency
      const overallConsistency = this.calculateOverallConsistency(patternConsistency, moderatorConsistency);
      
      // Generate recommendations
      const recommendations = this.generateConsistencyRecommendations(patternConsistency, moderatorConsistency);

      return {
        overallConsistency,
        patternConsistency,
        moderatorConsistency,
        recommendations
      };

    } catch (error) {
      console.error('Error analyzing consistency:', error);
      throw new Error('Failed to analyze decision consistency');
    }
  }

  /**
   * Get decision recommendation based on similar cases and precedents
   */
  async getDecisionRecommendation(caseId: string): Promise<DecisionRecommendation> {
    try {
      // Find similar cases
      const similarCases = await this.findSimilarCases(caseId, 5);
      
      // Get relevant precedents
      const precedents = await this.getRelevantPrecedents(caseId);
      
      // Analyze outcomes from similar cases
      const outcomeAnalysis = this.analyzeOutcomes(similarCases, precedents);
      
      // Generate recommendation
      const recommendation = this.generateRecommendation(outcomeAnalysis, similarCases);
      
      return recommendation;

    } catch (error) {
      console.error('Error generating decision recommendation:', error);
      throw new Error('Failed to generate decision recommendation');
    }
  }

  /**
   * Extract features from a moderation case
   */
  private async extractCaseFeatures(case_: any): Promise<CaseFeatures> {
    // Extract text features
    const textFeatures = await this.extractTextFeatures(case_.contentId, case_.contentType);
    
    // Extract visual features if applicable
    const visualFeatures = await this.extractVisualFeatures(case_.contentId, case_.contentType);
    
    // Extract context features
    const contextFeatures = await this.extractContextFeatures(case_);
    
    // Extract behavioral features
    const behavioralFeatures = await this.extractBehavioralFeatures(case_.userId);

    return {
      contentType: case_.contentType || 'post',
      textFeatures,
      visualFeatures,
      contextFeatures,
      behavioralFeatures
    };
  }

  /**
   * Extract text-based features from content
   */
  private async extractTextFeatures(contentId: string, contentType: string): Promise<TextFeatures> {
    // This would integrate with the actual content storage system
    // For now, returning mock features
    
    const mockText = "Sample content text"; // Would fetch actual content
    
    return {
      length: mockText.length,
      wordCount: mockText.split(/\s+/).length,
      sentimentScore: this.calculateSentiment(mockText),
      toxicityScore: this.calculateToxicity(mockText),
      keyPhrases: this.extractKeyPhrases(mockText),
      languagePatterns: this.extractLanguagePatterns(mockText)
    };
  }

  /**
   * Extract visual features from media content
   */
  private async extractVisualFeatures(contentId: string, contentType: string): Promise<VisualFeatures | undefined> {
    if (contentType !== 'image' && contentType !== 'video') {
      return undefined;
    }

    // This would integrate with computer vision services
    return {
      imageHash: this.generateImageHash(contentId),
      colorHistogram: [0.2, 0.3, 0.5], // Mock color distribution
      objectDetections: ['person', 'text'],
      faceCount: 1,
      explicitContent: false
    };
  }

  /**
   * Extract contextual features
   */
  private async extractContextFeatures(case_: any): Promise<ContextFeatures> {
    const db = databaseService.getDatabase();
    
    // Get report count for this content
    const reportCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(contentReports)
      .where(eq(contentReports.contentId, case_.contentId));

    const createdAt = case_.createdAt || new Date();
    
    return {
      userReputation: case_.userReputation || 0,
      communityId: case_.communityId,
      timeOfDay: createdAt.getHours(),
      dayOfWeek: createdAt.getDay(),
      reportCount: reportCount[0]?.count || 0,
      reporterReputations: [0.8, 0.9, 0.7] // Mock reporter reputations
    };
  }

  /**
   * Extract behavioral features for a user
   */
  private async extractBehavioralFeatures(userId: string): Promise<BehavioralFeatures> {
    const db = databaseService.getDatabase();
    
    // Get user's moderation history
    const userHistory = await db
      .select()
      .from(moderationCases)
      .where(eq(moderationCases.userId, userId))
      .orderBy(desc(moderationCases.createdAt))
      .limit(50);

    const violationCount = userHistory.filter(case_ => case_.status === 'blocked').length;
    
    return {
      postingFrequency: this.calculatePostingFrequency(userHistory),
      engagementPattern: 0.5, // Mock engagement score
      networkConnections: 100, // Mock network size
      previousViolations: violationCount
    };
  }

  /**
   * Calculate similarity between two cases
   */
  private calculateSimilarity(features1: CaseFeatures, features2: CaseFeatures): number {
    // Text similarity
    const textSim = this.calculateTextSimilarity(features1.textFeatures, features2.textFeatures);
    
    // Context similarity
    const contextSim = this.calculateContextSimilarity(features1.contextFeatures, features2.contextFeatures);
    
    // Behavioral similarity
    const behavioralSim = this.calculateBehavioralSimilarity(features1.behavioralFeatures, features2.behavioralFeatures);
    
    // Visual similarity (if both have visual features)
    const visualSim = (features1.visualFeatures && features2.visualFeatures) 
      ? this.calculateVisualSimilarity(features1.visualFeatures, features2.visualFeatures)
      : 0.5; // Neutral if one doesn't have visual features

    // Weighted combination
    return (
      textSim * this.FEATURE_WEIGHTS.textSimilarity +
      contextSim * this.FEATURE_WEIGHTS.contextSimilarity +
      behavioralSim * this.FEATURE_WEIGHTS.behavioralSimilarity +
      visualSim * this.FEATURE_WEIGHTS.visualSimilarity
    );
  }

  /**
   * Calculate text similarity between two text features
   */
  private calculateTextSimilarity(text1: TextFeatures, text2: TextFeatures): number {
    // Length similarity
    const lengthSim = 1 - Math.abs(text1.length - text2.length) / Math.max(text1.length, text2.length, 1);
    
    // Sentiment similarity
    const sentimentSim = 1 - Math.abs(text1.sentimentScore - text2.sentimentScore);
    
    // Toxicity similarity
    const toxicitySim = 1 - Math.abs(text1.toxicityScore - text2.toxicityScore);
    
    // Key phrase overlap
    const phraseOverlap = this.calculatePhraseOverlap(text1.keyPhrases, text2.keyPhrases);
    
    return (lengthSim + sentimentSim + toxicitySim + phraseOverlap) / 4;
  }

  /**
   * Calculate context similarity
   */
  private calculateContextSimilarity(context1: ContextFeatures, context2: ContextFeatures): number {
    // Community similarity
    const communitySim = context1.communityId === context2.communityId ? 1 : 0;
    
    // Time similarity
    const timeSim = 1 - Math.abs(context1.timeOfDay - context2.timeOfDay) / 24;
    
    // Report count similarity
    const reportSim = 1 - Math.abs(context1.reportCount - context2.reportCount) / Math.max(context1.reportCount, context2.reportCount, 1);
    
    // User reputation similarity
    const reputationSim = 1 - Math.abs(context1.userReputation - context2.userReputation) / Math.max(context1.userReputation, context2.userReputation, 1);
    
    return (communitySim + timeSim + reportSim + reputationSim) / 4;
  }

  /**
   * Calculate behavioral similarity
   */
  private calculateBehavioralSimilarity(behavior1: BehavioralFeatures, behavior2: BehavioralFeatures): number {
    // Posting frequency similarity
    const freqSim = 1 - Math.abs(behavior1.postingFrequency - behavior2.postingFrequency) / Math.max(behavior1.postingFrequency, behavior2.postingFrequency, 1);
    
    // Violation history similarity
    const violationSim = 1 - Math.abs(behavior1.previousViolations - behavior2.previousViolations) / Math.max(behavior1.previousViolations, behavior2.previousViolations, 1);
    
    // Engagement similarity
    const engagementSim = 1 - Math.abs(behavior1.engagementPattern - behavior2.engagementPattern);
    
    return (freqSim + violationSim + engagementSim) / 3;
  }

  /**
   * Calculate visual similarity
   */
  private calculateVisualSimilarity(visual1: VisualFeatures, visual2: VisualFeatures): number {
    let similarity = 0;
    let factors = 0;
    
    // Image hash similarity
    if (visual1.imageHash && visual2.imageHash) {
      similarity += visual1.imageHash === visual2.imageHash ? 1 : 0;
      factors++;
    }
    
    // Face count similarity
    if (visual1.faceCount !== undefined && visual2.faceCount !== undefined) {
      similarity += 1 - Math.abs(visual1.faceCount - visual2.faceCount) / Math.max(visual1.faceCount, visual2.faceCount, 1);
      factors++;
    }
    
    // Explicit content similarity
    if (visual1.explicitContent !== undefined && visual2.explicitContent !== undefined) {
      similarity += visual1.explicitContent === visual2.explicitContent ? 1 : 0;
      factors++;
    }
    
    return factors > 0 ? similarity / factors : 0.5;
  }

  // Helper methods
  private async getCaseById(caseId: string): Promise<any> {
    const db = databaseService.getDatabase();
    const cases = await db
      .select()
      .from(moderationCases)
      .where(eq(moderationCases.id, parseInt(caseId)))
      .limit(1);
    
    return cases[0] || null;
  }

  private async getCandidateCases(targetCase: any, limit: number): Promise<any[]> {
    const db = databaseService.getDatabase();
    
    return await db
      .select()
      .from(moderationCases)
      .where(
        and(
          ne(moderationCases.id, targetCase.id),
          eq(moderationCases.contentType, targetCase.contentType),
          isNotNull(moderationCases.status)
        )
      )
      .orderBy(desc(moderationCases.createdAt))
      .limit(limit);
  }

  private calculateProcessingTime(case_: any): number {
    if (!case_.createdAt || !case_.updatedAt) return 0;
    return (case_.updatedAt.getTime() - case_.createdAt.getTime()) / (1000 * 60); // minutes
  }

  private calculateSentiment(text: string): number {
    // Simplified sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'amazing'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible'];
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score += 0.1;
      if (negativeWords.includes(word)) score -= 0.1;
    });
    
    return Math.max(-1, Math.min(1, score));
  }

  private calculateToxicity(text: string): number {
    // Simplified toxicity detection
    const toxicWords = ['hate', 'stupid', 'idiot', 'kill'];
    const words = text.toLowerCase().split(/\s+/);
    const toxicCount = words.filter(word => toxicWords.includes(word)).length;
    
    return Math.min(toxicCount / words.length * 10, 1);
  }

  private extractKeyPhrases(text: string): string[] {
    // Simplified key phrase extraction
    return text.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5);
  }

  private extractLanguagePatterns(text: string): LanguagePattern[] {
    // Simplified pattern extraction
    const patterns: LanguagePattern[] = [];
    
    if (text.includes('!!!')) {
      patterns.push({ pattern: 'excessive_exclamation', frequency: 1, context: 'emotional' });
    }
    
    if (/[A-Z]{3,}/.test(text)) {
      patterns.push({ pattern: 'all_caps', frequency: 1, context: 'shouting' });
    }
    
    return patterns;
  }

  private generateImageHash(contentId: string): string {
    // Generate a mock image hash
    return crypto.createHash('md5').update(contentId).digest('hex').substring(0, 16);
  }

  private calculatePostingFrequency(history: any[]): number {
    if (history.length < 2) return 0;
    
    const timeSpan = history[0].createdAt.getTime() - history[history.length - 1].createdAt.getTime();
    const days = timeSpan / (1000 * 60 * 60 * 24);
    
    return history.length / Math.max(days, 1);
  }

  private calculatePhraseOverlap(phrases1: string[], phrases2: string[]): number {
    const set1 = new Set(phrases1);
    const set2 = new Set(phrases2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private async groupCasesByPattern(cases: any[]): Promise<Map<string, any[]>> {
    const groups = new Map<string, any[]>();
    
    for (const case_ of cases) {
      const pattern = this.generateCasePattern(case_);
      
      if (!groups.has(pattern)) {
        groups.set(pattern, []);
      }
      groups.get(pattern)!.push(case_);
    }
    
    return groups;
  }

  private generateCasePattern(case_: any): string {
    // Generate a pattern string based on case characteristics
    const riskLevel = case_.riskScore > 0.8 ? 'high' : case_.riskScore > 0.5 ? 'medium' : 'low';
    return `${case_.contentType}_${riskLevel}_risk`;
  }

  private async createPrecedentFromCases(pattern: string, cases: any[]): Promise<CasePrecedent> {
    const outcomes = this.analyzeOutcomesFromCases(cases);
    const consistency = this.calculatePatternConsistency(cases);
    
    return {
      precedentId: crypto.randomUUID(),
      caseIds: cases.map(c => c.id.toString()),
      pattern,
      consistency,
      outcomes,
      confidence: consistency,
      applicability: [pattern],
      lastUpdated: new Date()
    };
  }

  private analyzeOutcomesFromCases(cases: any[]): OutcomePattern[] {
    const outcomeMap = new Map<string, { count: number; confidenceSum: number }>();
    
    cases.forEach(case_ => {
      const outcome = case_.status || 'unknown';
      const confidence = case_.confidence || 0.5;
      
      if (!outcomeMap.has(outcome)) {
        outcomeMap.set(outcome, { count: 0, confidenceSum: 0 });
      }
      
      const current = outcomeMap.get(outcome)!;
      current.count++;
      current.confidenceSum += confidence;
    });
    
    return Array.from(outcomeMap.entries()).map(([outcome, data]) => ({
      outcome,
      frequency: data.count / cases.length,
      averageConfidence: data.confidenceSum / data.count,
      moderatorConsensus: data.count / cases.length // Simplified consensus calculation
    }));
  }

  private calculatePatternConsistency(cases: any[]): number {
    if (cases.length < 2) return 1;
    
    const outcomes = cases.map(c => c.status);
    const uniqueOutcomes = new Set(outcomes);
    
    // Higher consistency when fewer unique outcomes
    return 1 - (uniqueOutcomes.size - 1) / (cases.length - 1);
  }

  private async analyzePatternConsistency(cases: any[]): Promise<PatternConsistency[]> {
    const patternGroups = await this.groupCasesByPattern(cases);
    
    return Array.from(patternGroups.entries()).map(([pattern, patternCases]) => {
      const outcomes = patternCases.map(c => c.status);
      const outcomeCount = new Map<string, number>();
      
      outcomes.forEach(outcome => {
        outcomeCount.set(outcome, (outcomeCount.get(outcome) || 0) + 1);
      });
      
      const dominantOutcome = Array.from(outcomeCount.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
      
      const consistency = this.calculatePatternConsistency(patternCases);
      
      return {
        pattern,
        consistency,
        caseCount: patternCases.length,
        dominantOutcome,
        outliers: [] // Would identify cases with different outcomes
      };
    });
  }

  private async analyzeModeratorConsistency(cases: any[]): Promise<ModeratorConsistency[]> {
    const moderatorGroups = new Map<string, any[]>();
    
    cases.forEach(case_ => {
      const moderatorId = case_.assignedModeratorId;
      if (moderatorId) {
        if (!moderatorGroups.has(moderatorId)) {
          moderatorGroups.set(moderatorId, []);
        }
        moderatorGroups.get(moderatorId)!.push(case_);
      }
    });
    
    return Array.from(moderatorGroups.entries()).map(([moderatorId, moderatorCases]) => ({
      moderatorId,
      consistency: this.calculateModeratorConsistencyScore(moderatorCases),
      caseCount: moderatorCases.length,
      agreementRate: 0.85, // Would calculate from peer reviews
      specializations: ['general'] // Would derive from case patterns
    }));
  }

  private calculateModeratorConsistencyScore(cases: any[]): number {
    // Simplified consistency calculation
    // In practice, would compare with peer decisions on similar cases
    return 0.8; // Mock consistency score
  }

  private calculateOverallConsistency(patternConsistency: PatternConsistency[], moderatorConsistency: ModeratorConsistency[]): number {
    const avgPatternConsistency = patternConsistency.reduce((sum, p) => sum + p.consistency, 0) / patternConsistency.length;
    const avgModeratorConsistency = moderatorConsistency.reduce((sum, m) => sum + m.consistency, 0) / moderatorConsistency.length;
    
    return (avgPatternConsistency + avgModeratorConsistency) / 2;
  }

  private generateConsistencyRecommendations(patternConsistency: PatternConsistency[], moderatorConsistency: ModeratorConsistency[]): string[] {
    const recommendations: string[] = [];
    
    const lowConsistencyPatterns = patternConsistency.filter(p => p.consistency < 0.7);
    if (lowConsistencyPatterns.length > 0) {
      recommendations.push(`Review guidelines for ${lowConsistencyPatterns.length} inconsistent patterns`);
    }
    
    const inconsistentModerators = moderatorConsistency.filter(m => m.consistency < 0.7);
    if (inconsistentModerators.length > 0) {
      recommendations.push(`Provide additional training for ${inconsistentModerators.length} moderators`);
    }
    
    return recommendations;
  }

  private async getRelevantPrecedents(caseId: string): Promise<CasePrecedent[]> {
    // Would retrieve precedents from database
    // For now, returning empty array
    return [];
  }

  private analyzeOutcomes(similarCases: SimilarCase[], precedents: CasePrecedent[]): any {
    const outcomeCount = new Map<string, number>();
    const confidenceSum = new Map<string, number>();
    
    similarCases.forEach(case_ => {
      const outcome = case_.outcome;
      outcomeCount.set(outcome, (outcomeCount.get(outcome) || 0) + 1);
      confidenceSum.set(outcome, (confidenceSum.get(outcome) || 0) + case_.confidence);
    });
    
    return {
      outcomes: Array.from(outcomeCount.entries()).map(([outcome, count]) => ({
        outcome,
        frequency: count / similarCases.length,
        averageConfidence: (confidenceSum.get(outcome) || 0) / count
      })),
      totalCases: similarCases.length
    };
  }

  private generateRecommendation(outcomeAnalysis: any, similarCases: SimilarCase[]): DecisionRecommendation {
    const dominantOutcome = outcomeAnalysis.outcomes
      .sort((a: any, b: any) => b.frequency - a.frequency)[0];
    
    return {
      recommendedOutcome: dominantOutcome?.outcome || 'review',
      confidence: dominantOutcome?.averageConfidence || 0.5,
      reasoning: `Based on ${outcomeAnalysis.totalCases} similar cases, ${dominantOutcome?.outcome} is the most common outcome (${(dominantOutcome?.frequency * 100).toFixed(1)}%)`,
      precedents: similarCases.slice(0, 3),
      riskFactors: ['Pattern matches high-risk cases'],
      mitigatingFactors: ['User has good reputation history']
    };
  }
}

export const similarCaseMatchingService = new SimilarCaseMatchingService();