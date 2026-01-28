import { safeLogger } from '../../utils/safeLogger';
import { openaiService } from './ai/openaiService';

interface ModerationResult {
  isApproved: boolean;
  riskScore: number; // 0-100
  categories: ModerationCategory[];
  reasoning: string;
  suggestedActions: string[];
  confidence: number; // 0-100
  timestamp: number;
}

interface ModerationCategory {
  category: 'spam' | 'harassment' | 'hate_speech' | 'violence' | 'misinformation' | 'inappropriate' | 'self_harm' | 'illegal' | 'copyright';
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedPhrases: string[];
}

interface ContentToModerate {
  type: 'post' | 'comment' | 'message' | 'profile';
  content: string;
  authorAddress: string;
  communityId?: string;
  context?: {
    previousViolations?: number;
    userReputation?: number;
    communityRules?: string[];
  };
}

export class AIModerationService {
  private static instance: AIModerationService;
  private moderationCache: Map<string, ModerationResult> = new Map();
  private readonly CACHE_TTL = 300000; // 5 minutes

  private constructor() {}

  public static getInstance(): AIModerationService {
    if (!AIModerationService.instance) {
      AIModerationService.instance = new AIModerationService();
    }
    return AIModerationService.instance;
  }

  /**
   * Moderate content using AI analysis
   */
  async moderateContent(content: ContentToModerate): Promise<ModerationResult> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(content);
      const cached = this.moderationCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
        return cached;
      }

      // Perform AI moderation
      const result = await this.performAIModeration(content);

      // Cache the result
      this.moderationCache.set(cacheKey, {
        ...result,
        timestamp: Date.now()
      } as any);

      return result;
    } catch (error) {
      safeLogger.error('AI moderation error:', error);
      // Return safe default on error
      return this.getDefaultModerationResult();
    }
  }

  /**
   * Batch moderate multiple content items
   */
  async moderateBatch(contents: ContentToModerate[]): Promise<ModerationResult[]> {
    try {
      const results = await Promise.all(
        contents.map(content => this.moderateContent(content))
      );
      return results;
    } catch (error) {
      safeLogger.error('Batch moderation error:', error);
      return contents.map(() => this.getDefaultModerationResult());
    }
  }

  /**
   * Get moderation statistics for a community
   */
  async getCommunityModerationStats(communityId: string, timeRange: 'day' | 'week' | 'month' = 'week'): Promise<{
    totalModerated: number;
    approved: number;
    rejected: number;
    flaggedForReview: number;
    topCategories: Array<{ category: string; count: number }>;
    averageRiskScore: number;
  }> {
    // This would typically query your database for moderation statistics
    // For now, return mock data
    return {
      totalModerated: 1250,
      approved: 1120,
      rejected: 85,
      flaggedForReview: 45,
      topCategories: [
        { category: 'spam', count: 45 },
        { category: 'inappropriate', count: 25 },
        { category: 'harassment', count: 15 }
      ],
      averageRiskScore: 12.5
    };
  }

  /**
   * Update moderation model with community feedback
   */
  async updateModerationFeedback(
    contentId: string,
    originalResult: ModerationResult,
    userFeedback: 'approved' | 'rejected' | 'escalated'
  ): Promise<void> {
    try {
      // Log feedback for model improvement
      safeLogger.info('Moderation feedback received', {
        contentId,
        originalRiskScore: originalResult.riskScore,
        userFeedback
      });

      // In a real implementation, this would:
      // 1. Store feedback in a database
      // 2. Use feedback to fine-tune the AI model
      // 3. Update moderation thresholds based on community preferences
    } catch (error) {
      safeLogger.error('Error updating moderation feedback:', error);
    }
  }

  /**
   * Get suggested moderation actions based on content analysis
   */
  async getSuggestedActions(content: ContentToModerate, result: ModerationResult): Promise<string[]> {
    const actions: string[] = [];

    // Base actions on risk score
    if (result.riskScore >= 80) {
      actions.push('auto_reject', 'report_admin', 'temporarily_restrict_user');
    } else if (result.riskScore >= 60) {
      actions.push('flag_for_review', 'require_approval');
    } else if (result.riskScore >= 40) {
      actions.push('add_warning', 'monitor_user');
    }

    // Category-specific actions
    result.categories.forEach(category => {
      switch (category.category) {
        case 'spam':
          actions.push('rate_limit_user', 'mark_as_spam');
          break;
        case 'harassment':
        case 'hate_speech':
          actions.push('immediate_review', 'potential_ban');
          break;
        case 'violence':
          actions.push('immediate_review', 'report_to_authorities');
          break;
        case 'misinformation':
          actions.push('add_fact_check_label', 'reduce_visibility');
          break;
        case 'inappropriate':
          actions.push('age_restriction', 'content_warning');
          break;
      }
    });

    // Consider user history
    if (content.context?.previousViolations && content.context.previousViolations > 3) {
      actions.push('escalate_to_admin', 'temporary_suspension');
    }

    // Remove duplicates and return
    return [...new Set(actions)];
  }

  private async performAIModeration(content: ContentToModerate): Promise<ModerationResult> {
    try {
      // Prepare context for AI
      const context = {
        contentType: content.type,
        content: content.content,
        communityRules: content.context?.communityRules || [],
        userHistory: {
          previousViolations: content.context?.previousViolations || 0,
          reputation: content.context?.userReputation || 0
        },
        moderationGuidelines: this.getModerationGuidelines()
      };

      // Call AI service for content analysis
      const aiResponse = await openaiService.generateInsight({
        type: 'content_moderation' as any,
        context
      });

      // Parse AI response into structured result
      return this.parseAIResponse(aiResponse, content);
    } catch (error) {
      safeLogger.error('AI moderation service error:', error);
      throw error;
    }
  }

  private parseAIResponse(aiResponse: any, content: ContentToModerate): ModerationResult {
    try {
      // Parse the AI response (this would depend on your AI service output format)
      const analysis = aiResponse.analysis || {};

      // Extract categories
      const categories: ModerationCategory[] = (analysis.categories || []).map((cat: any) => ({
        category: cat.type,
        confidence: cat.confidence || 0,
        severity: cat.severity || 'medium',
        detectedPhrases: cat.detectedPhrases || []
      }));

      // Calculate overall risk score
      const riskScore = this.calculateRiskScore(categories, content.context);

      // Determine if content is approved
      const isApproved = riskScore < 50 && !categories.some(cat => cat.severity === 'critical');

      // Generate reasoning
      const reasoning = analysis.reasoning || this.generateReasoning(categories, riskScore);

      // Get suggested actions
      const suggestedActions = analysis.suggestedActions || [];

      return {
        isApproved,
        riskScore,
        categories,
        reasoning,
        suggestedActions,
        confidence: analysis.confidence || 85,
        timestamp: Date.now()
      };
    } catch (error) {
      safeLogger.error('Error parsing AI response:', error);
      return this.getDefaultModerationResult();
    }
  }

  private calculateRiskScore(categories: ModerationCategory[], context?: any): number {
    if (categories.length === 0) return 0;

    let totalScore = 0;
    let maxSeverity = 0;

    categories.forEach(category => {
      let categoryScore = category.confidence;

      // Adjust based on severity
      switch (category.severity) {
        case 'critical':
          categoryScore *= 3;
          maxSeverity = Math.max(maxSeverity, 4);
          break;
        case 'high':
          categoryScore *= 2;
          maxSeverity = Math.max(maxSeverity, 3);
          break;
        case 'medium':
          maxSeverity = Math.max(maxSeverity, 2);
          break;
        case 'low':
          maxSeverity = Math.max(maxSeverity, 1);
          break;
      }

      // Adjust based on category type
      switch (category.category) {
        case 'hate_speech':
        case 'violence':
        case 'self_harm':
        case 'illegal':
          categoryScore *= 1.5;
          break;
        case 'spam':
        case 'inappropriate':
          categoryScore *= 1.2;
          break;
      }

      totalScore += categoryScore;
    });

    // Adjust based on user history
    if (context?.previousViolations > 0) {
      totalScore *= (1 + context.previousViolations * 0.1);
    }

    return Math.min(100, Math.round(totalScore));
  }

  private generateReasoning(categories: ModerationCategory[], riskScore: number): string {
    if (categories.length === 0) {
      return 'Content appears to be compliant with community guidelines.';
    }

    const highSeverityCategories = categories.filter(cat => cat.severity === 'high' || cat.severity === 'critical');
    const detectedTypes = categories.map(cat => cat.category).join(', ');

    let reasoning = `Content flagged for: ${detectedTypes}. `;

    if (highSeverityCategories.length > 0) {
      reasoning += `High severity issues detected including ${highSeverityCategories.map(cat => cat.category).join(', ')}. `;
    }

    reasoning += `Risk score: ${riskScore}/100. `;

    if (categories.some(cat => cat.detectedPhrases.length > 0)) {
      const phrases = categories.flatMap(cat => cat.detectedPhrases).slice(0, 3);
      reasoning += `Detected concerning phrases: "${phrases.join('", "')}".`;
    }

    return reasoning;
  }

  private getModerationGuidelines(): string {
    return `
      Community Guidelines:
      1. No spam, excessive self-promotion, or repetitive content
      2. No harassment, hate speech, or personal attacks
      3. No violent, graphic, or sexually explicit content
      4. No misinformation or harmful conspiracy theories
      5. No illegal activities or content that violates laws
      6. Respect copyright and intellectual property rights
      7. No self-harm promotion or content
      8. Maintain civil and constructive discourse
      
      Consider context, intent, and community standards when evaluating content.
    `;
  }

  private getDefaultModerationResult(): ModerationResult {
    return {
      isApproved: true,
      riskScore: 0,
      categories: [],
      reasoning: 'Unable to perform automated moderation. Content approved by default.',
      suggestedActions: [],
      confidence: 0,
      timestamp: Date.now()
    };
  }

  private generateCacheKey(content: ContentToModerate): string {
    const contentHash = Buffer.from(content.content).toString('base64').substring(0, 16);
    return `${content.type}:${content.authorAddress}:${contentHash}`;
  }

  /**
   * Clean up old cache entries
   */
  cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.moderationCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.moderationCache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate?: number;
  } {
    return {
      size: this.moderationCache.size
      // hitRate would be calculated from actual usage metrics
    };
  }
}

export const aiModerationService = AIModerationService.getInstance();