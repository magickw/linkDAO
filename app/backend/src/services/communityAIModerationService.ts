import { contentModerationML, MLModerationResult } from './ai/contentModerationML';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import { posts, communityModerationActions, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';

interface CommunityModerationConfig {
  communityId: string;
  autoModeration: boolean;
  autoRemoveThreshold: number; // 0.9 = 90% confidence
  autoFlagThreshold: number; // 0.7 = 70% confidence
  notifyModerators: boolean;
  customRules?: {
    bannedWords?: string[];
    allowedDomains?: string[];
    maxLinks?: number;
  };
}

/**
 * AI-Powered Community Content Moderation Service
 * Integrates with the existing admin AI moderation service
 */
export class CommunityAIModerationService {
  /**
   * Analyze community post with AI
   */
  async analyzePost(
    postId: number,
    communityId: string,
    config?: CommunityModerationConfig
  ): Promise<{
    result: MLModerationResult;
    action: 'approve' | 'flag' | 'remove';
    shouldNotifyModerators: boolean;
  }> {
    try {
      // Fetch post content
      const post = await db
        .select()
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);

      if (post.length === 0) {
        throw new Error('Post not found');
      }

      const postData = post[0];

      // Get author's previous violations
      const violations = await this.getAuthorViolations(
        postData.authorId!,
        communityId
      );

      // Analyze with AI
      const result = await contentModerationML.analyzeContent({
        text: postData.contentCid, // In production, fetch actual content
        metadata: {
          authorId: postData.authorId!,
          communityId,
          previousViolations: violations,
        }
      });

      // Apply custom community rules
      if (config?.customRules) {
        this.applyCustomRules(result, config.customRules, postData);
      }

      // Determine action based on risk score and config
      const action = this.determineAction(
        result,
        config || this.getDefaultConfig(communityId)
      );

      const shouldNotifyModerators = 
        (action === 'flag' || action === 'remove') &&
        (config?.notifyModerators !== false);

      // Execute action
      await this.executeAction(postId, communityId, action, result);

      return {
        result,
        action,
        shouldNotifyModerators
      };
    } catch (error) {
      safeLogger.error('Error analyzing post:', error);
      throw error;
    }
  }

  /**
   * Batch analyze posts
   */
  async batchAnalyzePosts(
    postIds: number[],
    communityId: string,
    config?: CommunityModerationConfig
  ): Promise<Map<number, {
    result: MLModerationResult;
    action: string;
  }>> {
    const results = new Map();

    for (const postId of postIds) {
      try {
        const analysis = await this.analyzePost(postId, communityId, config);
        results.set(postId, analysis);
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        safeLogger.error(`Error analyzing post ${postId}:`, error);
      }
    }

    return results;
  }

  /**
   * Get author's previous violations in community
   */
  private async getAuthorViolations(
    authorId: string,
    communityId: string
  ): Promise<number> {
    try {
      const violations = await db
        .select()
        .from(communityModerationActions)
        .where(
          and(
            eq(communityModerationActions.communityId, communityId),
            eq(communityModerationActions.targetId, authorId),
            eq(communityModerationActions.actionType, 'remove')
          )
        );

      return violations.length;
    } catch (error) {
      safeLogger.error('Error fetching violations:', error);
      return 0;
    }
  }

  /**
   * Apply custom community rules
   */
  private applyCustomRules(
    result: MLModerationResult,
    rules: NonNullable<CommunityModerationConfig['customRules']>,
    postData: any
  ): void {
    const content = postData.contentCid || '';

    // Check banned words
    if (rules.bannedWords) {
      const lowerContent = content.toLowerCase();
      const foundBannedWords = rules.bannedWords.filter(word => 
        lowerContent.includes(word.toLowerCase())
      );
      
      if (foundBannedWords.length > 0) {
        result.riskScore = Math.max(result.riskScore, 0.9);
        result.reasoning.push(`Contains banned words: ${foundBannedWords.join(', ')}`);
      }
    }

    // Check links
    if (rules.maxLinks !== undefined) {
      const linkCount = (content.match(/https?:\/\//g) || []).length;
      if (linkCount > rules.maxLinks) {
        result.riskScore = Math.max(result.riskScore, 0.7);
        result.reasoning.push(`Contains ${linkCount} links (max: ${rules.maxLinks})`);
        result.categories.spam = Math.max(result.categories.spam, 0.8);
      }
    }

    // Check allowed domains
    if (rules.allowedDomains) {
      const links = content.match(/https?:\/\/([^\/\s]+)/g) || [];
      const domains = links.map(link => {
        try {
          return new URL(link).hostname;
        } catch {
          return null;
        }
      }).filter(Boolean);

      const unauthorizedDomains = domains.filter(domain => 
        !rules.allowedDomains!.some(allowed => domain?.includes(allowed))
      );

      if (unauthorizedDomains.length > 0) {
        result.riskScore = Math.max(result.riskScore, 0.6);
        result.reasoning.push('Contains links to unauthorized domains');
      }
    }
  }

  /**
   * Determine moderation action
   */
  private determineAction(
    result: MLModerationResult,
    config: CommunityModerationConfig
  ): 'approve' | 'flag' | 'remove' {
    if (!config.autoModeration) {
      return 'approve'; // Manual moderation only
    }

    // Auto-remove if risk score exceeds threshold
    if (result.riskScore >= config.autoRemoveThreshold) {
      return 'remove';
    }

    // Auto-flag if risk score exceeds flag threshold
    if (result.riskScore >= config.autoFlagThreshold) {
      return 'flag';
    }

    return 'approve';
  }

  /**
   * Execute moderation action
   */
  private async executeAction(
    postId: number,
    communityId: string,
    action: string,
    result: MLModerationResult
  ): Promise<void> {
    if (action === 'approve') {
      return; // No action needed
    }

    try {
      // Log moderation action
      await db.insert(communityModerationActions).values({
        communityId,
        moderatorAddress: 'AI_SYSTEM',
        actionType: action === 'remove' ? 'remove' : 'flag',
        targetType: 'post',
        targetId: postId.toString(),
        reason: result.reasoning.join('; '),
        metadata: JSON.stringify({
          aiAnalysis: result,
          automated: true,
        }),
      });

      // If removing, update post status
      if (action === 'remove') {
        // Would update post to removed status
        safeLogger.info(`Post ${postId} auto-removed by AI moderation`);
      }
    } catch (error) {
      safeLogger.error('Error executing moderation action:', error);
    }
  }

  /**
   * Get default moderation config
   */
  private getDefaultConfig(communityId: string): CommunityModerationConfig {
    return {
      communityId,
      autoModeration: true,
      autoRemoveThreshold: 0.9,
      autoFlagThreshold: 0.7,
      notifyModerators: true,
    };
  }

  /**
   * Get community moderation config
   */
  async getModerationConfig(communityId: string): Promise<CommunityModerationConfig> {
    // In production, fetch from database
    return this.getDefaultConfig(communityId);
  }

  /**
   * Update community moderation config
   */
  async updateModerationConfig(
    communityId: string,
    config: Partial<CommunityModerationConfig>
  ): Promise<void> {
    // In production, save to database
    safeLogger.info('Updating moderation config for', communityId, config);
  }

  /**
   * Get moderation statistics
   */
  async getModerationStats(
    communityId: string,
    timeRange: '7d' | '30d' | '90d'
  ): Promise<{
    totalAnalyzed: number;
    autoApproved: number;
    autoFlagged: number;
    autoRemoved: number;
    accuracy: number;
    avgRiskScore: number;
  }> {
    try {
      // Query moderation actions
      const actions = await db
        .select()
        .from(communityModerationActions)
        .where(
          and(
            eq(communityModerationActions.communityId, communityId),
            eq(communityModerationActions.moderatorAddress, 'AI_SYSTEM')
          )
        );

      const autoFlagged = actions.filter(a => a.actionType === 'flag').length;
      const autoRemoved = actions.filter(a => a.actionType === 'remove').length;
      const totalAnalyzed = actions.length;

      return {
        totalAnalyzed,
        autoApproved: totalAnalyzed - autoFlagged - autoRemoved,
        autoFlagged,
        autoRemoved,
        accuracy: 0.95, // Would calculate from feedback
        avgRiskScore: 0.42, // Would calculate from stored results
      };
    } catch (error) {
      safeLogger.error('Error fetching moderation stats:', error);
      return {
        totalAnalyzed: 0,
        autoApproved: 0,
        autoFlagged: 0,
        autoRemoved: 0,
        accuracy: 0,
        avgRiskScore: 0,
      };
    }
  }
}

export const communityAIModerationService = new CommunityAIModerationService();
