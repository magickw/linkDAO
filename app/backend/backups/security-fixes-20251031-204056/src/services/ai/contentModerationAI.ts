import { openaiService } from './openaiService';
import { safeLogger } from '../utils/safeLogger';

/**
 * Content Moderation AI Service
 * Provides intelligent content moderation using AI analysis
 */
export class ContentModerationAI {
  /**
   * Analyze content for policy violations and safety issues
   */
  async analyzeContent(contentId: string, content: {
    type: 'post' | 'comment' | 'product' | 'profile' | 'dao_proposal';
    text: string;
    images?: string[];
    authorId: string;
    metadata?: Record<string, any>;
  }): Promise<{
    contentId: string;
    riskScore: number;
    moderation: any;
    action: 'approved' | 'flagged' | 'queued' | 'auto_removed';
    reasoning: string;
    recommendations: string[];
  }> {
    try {
      // Get AI analysis
      const moderation = await openaiService.moderateContent({
        text: content.text,
        images: content.images,
        metadata: {
          contentId,
          type: content.type,
          authorId: content.authorId,
          ...content.metadata,
        },
      });

      // Get author history for context
      const authorHistory = await this.getAuthorModerationHistory(content.authorId);

      // Calculate overall risk score
      const riskScore = this.calculateRiskScore(moderation, authorHistory);

      // Determine action based on risk
      let action: 'approved' | 'flagged' | 'queued' | 'auto_removed' = 'approved';
      let reasoning = 'Content passed AI moderation checks';

      if (riskScore > 0.9) {
        action = 'auto_removed';
        reasoning = 'High-risk content detected - automatically removed for safety';
      } else if (riskScore > 0.7) {
        action = 'flagged';
        reasoning = 'Potential policy violation - flagged for human review';
      } else if (riskScore > 0.5) {
        action = 'queued';
        reasoning = 'Minor concerns detected - queued for review';
      }

      return {
        contentId,
        riskScore,
        moderation,
        action,
        reasoning,
        recommendations: moderation.recommendations,
      };
    } catch (error) {
      safeLogger.error('Content analysis error:', error);
      // Fail safe - queue for manual review on AI errors
      return {
        contentId,
        riskScore: 0.6,
        moderation: null,
        action: 'queued',
        reasoning: 'AI analysis unavailable - queued for manual review',
        recommendations: ['Manual review required due to AI service error'],
      };
    }
  }

  /**
   * Batch analyze multiple pieces of content
   */
  async analyzeContentBatch(
    contents: Array<{
      contentId: string;
      type: string;
      text: string;
      authorId: string;
    }>
  ): Promise<Map<string, any>> {
    const results = new Map();

    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < contents.length; i += batchSize) {
      const batch = contents.slice(i, i + batchSize);
      const batchPromises = batch.map(content =>
        this.analyzeContent(content.contentId, content as any)
      );

      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.set(batch[index].contentId, result.value);
        } else {
          results.set(batch[index].contentId, {
            error: 'Analysis failed',
            action: 'queued',
          });
        }
      });
    }

    return results;
  }

  /**
   * Get contextual recommendations for moderators
   */
  async getModerationRecommendations(
    contentId: string,
    analysisResult: any
  ): Promise<{
    suggestedAction: string;
    explanation: string;
    similarCases: any[];
    precedents: any[];
  }> {
    // This would integrate with your case history
    // For now, return structured recommendations

    const { riskScore, moderation } = analysisResult;

    let suggestedAction = 'Approve';
    let explanation = 'Content appears safe and compliant';

    if (riskScore > 0.8) {
      suggestedAction = 'Remove';
      explanation = `High risk score (${(riskScore * 100).toFixed(1)}%). ${moderation.reasoning}`;
    } else if (riskScore > 0.6) {
      suggestedAction = 'Warn User';
      explanation = `Moderate risk detected. Consider warning the user about: ${moderation.recommendations.join(', ')}`;
    }

    return {
      suggestedAction,
      explanation,
      similarCases: [], // Would query historical similar cases
      precedents: [], // Would query how similar content was handled
    };
  }

  /**
   * Calculate overall risk score combining AI analysis and user history
   */
  private calculateRiskScore(
    moderation: any,
    history: { violations: number; warnings: number; recentFlags: number }
  ): number {
    // Get max category score from AI analysis
    const categoryScores = Object.values(moderation.categories) as number[];
    const maxCategoryScore = Math.max(...categoryScores);

    // Base score from AI
    let riskScore = maxCategoryScore;

    // Adjust based on confidence
    riskScore *= moderation.confidence;

    // Factor in author history
    const historyMultiplier = 1 + (history.violations * 0.15) + (history.warnings * 0.08) + (history.recentFlags * 0.05);

    // Apply history multiplier (capped at 2x)
    riskScore = Math.min(riskScore * Math.min(historyMultiplier, 2.0), 1.0);

    return riskScore;
  }

  /**
   * Get author's moderation history
   */
  private async getAuthorModerationHistory(authorId: string): Promise<{
    violations: number;
    warnings: number;
    recentFlags: number;
  }> {
    try {
      // In a real implementation, this would query your database
      // For now, return mock data
      // TODO: Integrate with actual moderation history database

      return {
        violations: 0,
        warnings: 0,
        recentFlags: 0,
      };

      /* Example database query:
      const violations = await db.moderationActions.count({
        userId: authorId,
        action: 'content_removed',
        createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
      });

      const warnings = await db.moderationActions.count({
        userId: authorId,
        action: 'warned',
        createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
      });

      const recentFlags = await db.contentReports.count({
        authorId,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });

      return { violations, warnings, recentFlags };
      */
    } catch (error) {
      safeLogger.error('Error fetching moderation history:', error);
      return { violations: 0, warnings: 0, recentFlags: 0 };
    }
  }
}

export const contentModerationAI = new ContentModerationAI();
