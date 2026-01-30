import { db } from '../db';
import { 
  eq, 
  and, 
  gte, 
  lte, 
  desc, 
  sql, 
  count, 
  sum, 
  avg,
  inArray,
  isNull
} from 'drizzle-orm';
import {
  posts, 
  reactions, 
  views, 
  bookmarks, 
  shares,
  users,
  communities
} from '../db/schema';

export interface ContentPerformanceMetrics {
  postId: string;
  title: string | null;
  authorId: string;
  authorHandle: string | null;
  communityId: string | null;
  communityName: string | null;
  createdAt: Date;
  
  // Engagement metrics
  viewCount: number;
  reactionCount: number;
  repostsCount: number;
  bookmarkCount: number;
  commentsCount: number;

  // Engagement rates
  viewToReactionRate: number; // percentage
  viewToRepostRate: number; // percentage
  viewToBookmarkRate: number; // percentage
  
  // Virality metrics
  viralityScore: number;
  reachEstimate: number;
  
  // Performance indicators
  engagementScore: number;
  trendingScore: number;
  qualityScore: number;
  
  // Time-based metrics
  firstEngagementTime: Date | null;
  timeToPeakEngagement: number; // hours
  engagementVelocity: number; // engagements per hour
  
  // Content characteristics
  contentType: 'text' | 'image' | 'video' | 'link' | 'mixed';
  tagCount: number;
  isTokenGated: boolean;
}

export interface ContentTrend {
  postId: string;
  title: string | null;
  trendType: 'rising' | 'falling' | 'stable' | 'viral';
  trendScore: number;
  engagementChange: number; // percentage change
  velocity: number; // engagements per hour
  createdAt: Date;
}

export interface ContentQualityMetrics {
  postId: string;
  title: string | null;
  qualityScore: number; // 0-100
  readabilityScore: number; // 0-100
  originalityScore: number; // 0-100
  engagementQuality: number; // 0-100
  sentimentScore: number; // -1 to 1
  flags: string[]; // quality issues detected
}

export interface ContentSharingAnalytics {
  postId: string;
  totalShares: number;
  sharesByTarget: Record<string, number>; // target_type -> count
  sharesOverTime: Array<{ date: Date; count: number }>;
  crossPostingRate: number; // percentage
  sharingVelocity: number; // shares per hour
}

export class ContentPerformanceService {
  /**
   * Get comprehensive performance metrics for a specific post
   */
  async getPostPerformanceMetrics(postId: string): Promise<ContentPerformanceMetrics> {
    try {
      // Get post data
      const postData = await db
        .select({
          id: posts.id,
          title: posts.title,
          authorId: posts.authorId,
          communityId: posts.communityId,
          createdAt: posts.createdAt,
          isTokenGated: posts.isTokenGated,
          tags: posts.tags
        })
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);

      if (postData.length === 0) {
        throw new Error('Post not found');
      }

      const post = postData[0];
      
      // Get author data
      const authorData = await db
        .select({ handle: users.handle })
        .from(users)
        .where(eq(users.id, post.authorId))
        .limit(1);
      
      const authorHandle = authorData.length > 0 ? authorData[0].handle : null;
      
      // Get community data
      let communityName = null;
      if (post.communityId) {
        const communityData = await db
          .select({ name: communities.name })
          .from(communities)
          .where(eq(communities.id, post.communityId))
          .limit(1);
        
        communityName = communityData.length > 0 ? communityData[0].name : null;
      }

      // Get engagement metrics
      const [viewCountResult, reactionCountResult, repostsCountResult, bookmarkCountResult, commentsCountResult] = await Promise.all([
        db.select({ count: count() }).from(views).where(eq(views.postId, postId)),
        db.select({ count: count() }).from(reactions).where(eq(reactions.postId, postId)),
        db.select({ count: count() }).from(posts).where(and(eq(posts.parentId, postId), eq(posts.isRepost, true))),
        db.select({ count: count() }).from(bookmarks).where(eq(bookmarks.postId, postId)),
        // For comment count, we would need to check replies to this post
        Promise.resolve([{ count: 0 }]) // Placeholder
      ]);

      const viewCount = viewCountResult[0].count;
      const reactionCount = reactionCountResult[0].count;
      const repostsCount = repostsCountResult[0].count;
      const bookmarkCount = bookmarkCountResult[0].count;
      const commentsCount = commentsCountResult[0].count;

      // Calculate engagement rates
      const viewToReactionRate = viewCount > 0 ? (reactionCount / viewCount) * 100 : 0;
      const viewToRepostRate = viewCount > 0 ? (repostsCount / viewCount) * 100 : 0;
      const viewToBookmarkRate = viewCount > 0 ? (bookmarkCount / viewCount) * 100 : 0;

      // Calculate engagement score (weighted composite)
      const engagementScore = Math.round(
        (viewCount * 0.1) +
        (reactionCount * 2) +
        (repostsCount * 3) +
        (bookmarkCount * 2) +
        (commentsCount * 2.5)
      );

      // Estimate virality score
      const viralityScore = Math.round(
        (repostsCount * 5) +
        (viewToRepostRate * 2) +
        (engagementScore * 0.1)
      );

      // Estimate reach
      const reachEstimate = viewCount + (repostsCount * 10); // Simplified model

      // Trending score (simplified)
      const trendingScore = Math.round(
        (reactionCount * 1.5) +
        (repostsCount * 2) +
        (bookmarkCount * 1.2) +
        (viewToReactionRate * 0.5)
      );

      // Quality score (simplified)
      const qualityScore = Math.round(
        (viewToReactionRate * 0.3) +
        (viewToRepostRate * 0.4) +
        (viewToBookmarkRate * 0.3)
      );

      // Determine content type based on media
      let contentType: 'text' | 'image' | 'video' | 'link' | 'mixed' = 'text';
      // This would require checking mediaCids field in a real implementation

      // Parse tags
      let tagCount = 0;
      if (post.tags) {
        try {
          const tags = JSON.parse(post.tags);
          tagCount = Array.isArray(tags) ? tags.length : 0;
        } catch (e) {
          tagCount = 0;
        }
      }

      // Time-based metrics (simplified)
      const firstEngagementTime = null; // Would require querying earliest engagement
      const timeToPeakEngagement = 0; // Would require time series analysis
      const engagementVelocity = 0; // Would require time series analysis

      return {
        postId,
        title: post.title,
        authorId: post.authorId,
        authorHandle,
        communityId: post.communityId,
        communityName,
        createdAt: post.createdAt,
        viewCount,
        reactionCount,
        repostsCount,
        bookmarkCount,
        commentsCount,
        viewToReactionRate,
        viewToRepostRate,
        viewToBookmarkRate,
        viralityScore,
        reachEstimate,
        engagementScore,
        trendingScore,
        qualityScore,
        firstEngagementTime,
        timeToPeakEngagement,
        engagementVelocity,
        contentType,
        tagCount,
        isTokenGated: post.isTokenGated || false
      };
    } catch (error) {
      console.error('Error getting post performance metrics:', error);
      throw new Error('Failed to retrieve post performance metrics');
    }
  }

  /**
   * Get performance metrics for multiple posts
   */
  async getPostsPerformanceMetrics(
    postIds: string[],
    timeRange?: { start: Date; end: Date }
  ): Promise<ContentPerformanceMetrics[]> {
    try {
      const metrics: ContentPerformanceMetrics[] = [];
      
      // Process posts in batches to avoid overwhelming the database
      const batchSize = 10;
      for (let i = 0; i < postIds.length; i += batchSize) {
        const batch = postIds.slice(i, i + batchSize);
        const batchMetrics = await Promise.all(
          batch.map(postId => this.getPostPerformanceMetrics(postId))
        );
        metrics.push(...batchMetrics);
      }
      
      return metrics;
    } catch (error) {
      console.error('Error getting posts performance metrics:', error);
      throw new Error('Failed to retrieve posts performance metrics');
    }
  }

  /**
   * Get trending content
   */
  async getTrendingContent(
    limit: number = 20,
    timeRange: { start: Date; end: Date } = { 
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), 
      end: new Date() 
    }
  ): Promise<ContentTrend[]> {
    try {
      // Get posts with high engagement in the time range
      const trendingPosts = await db
        .select({
          id: posts.id,
          title: posts.title,
          createdAt: posts.createdAt
        })
        .from(posts)
        .where(and(
          gte(posts.createdAt, timeRange.start),
          lte(posts.createdAt, timeRange.end)
        ))
        .orderBy(desc(posts.createdAt))
        .limit(limit * 2); // Get more posts to analyze

      // Calculate trends for each post
      const trends: ContentTrend[] = [];
      
      for (const post of trendingPosts) {
        try {
          const metrics = await this.getPostPerformanceMetrics(post.id.toString());
          
          // Simplified trend calculation
          let trendType: 'rising' | 'falling' | 'stable' | 'viral' = 'stable';
          let trendScore = metrics.trendingScore;
          let engagementChange = 0;
          let velocity = metrics.engagementVelocity || 1;
          
          if (metrics.trendingScore > 100) {
            trendType = 'viral';
          } else if (metrics.trendingScore > 50) {
            trendType = 'rising';
          } else if (metrics.trendingScore < 20) {
            trendType = 'falling';
          }
          
          trends.push({
            postId: post.id.toString(),
            title: post.title,
            trendType,
            trendScore,
            engagementChange,
            velocity,
            createdAt: post.createdAt
          });
        } catch (error) {
          // Skip posts that fail to load metrics
          continue;
        }
      }
      
      // Sort by trend score and limit
      return trends
        .sort((a, b) => b.trendScore - a.trendScore)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting trending content:', error);
      throw new Error('Failed to retrieve trending content');
    }
  }

  /**
   * Get content quality metrics
   */
  async getContentQualityMetrics(postId: string): Promise<ContentQualityMetrics> {
    try {
      const postData = await db
        .select({
          id: posts.id,
          title: posts.title,
          contentCid: posts.contentCid,
          createdAt: posts.createdAt
        })
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);

      if (postData.length === 0) {
        throw new Error('Post not found');
      }

      const post = postData[0];
      
      // Get performance metrics for quality calculation
      const performanceMetrics = await this.getPostPerformanceMetrics(postId);
      
      // Calculate quality scores (simplified models)
      const readabilityScore = Math.min(100, Math.max(0, 80 - (performanceMetrics.tagCount * 2)));
      const originalityScore = performanceMetrics.isTokenGated ? 90 : 70; // Simplified
      const engagementQuality = Math.min(100, performanceMetrics.viewToReactionRate * 10);
      const sentimentScore = 0.5; // Would require NLP analysis in real implementation
      
      // Overall quality score
      const qualityScore = Math.round(
        (readabilityScore * 0.3) + 
        (originalityScore * 0.2) + 
        (engagementQuality * 0.4) + 
        (sentimentScore * 10 * 0.1)
      );
      
      // Quality flags (simplified)
      const flags: string[] = [];
      if (readabilityScore < 40) flags.push('low_readability');
      if (originalityScore < 50) flags.push('low_originality');
      if (engagementQuality < 30) flags.push('poor_engagement');
      
      return {
        postId,
        title: post.title,
        qualityScore,
        readabilityScore,
        originalityScore,
        engagementQuality,
        sentimentScore,
        flags
      };
    } catch (error) {
      console.error('Error getting content quality metrics:', error);
      throw new Error('Failed to retrieve content quality metrics');
    }
  }

  /**
   * Get content sharing analytics
   */
  async getContentSharingAnalytics(postId: string): Promise<ContentSharingAnalytics> {
    try {
      // Get share data
      const shareData = await db
        .select({
          targetType: shares.targetType,
          createdAt: shares.createdAt
        })
        .from(shares)
        .where(eq(shares.postId, postId));
      
      // Calculate total shares
      const totalShares = shareData.length;
      
      // Group by target type
      const sharesByTarget: Record<string, number> = {};
      shareData.forEach(share => {
        sharesByTarget[share.targetType] = (sharesByTarget[share.targetType] || 0) + 1;
      });
      
      // Group by date for time series
      const sharesOverTime: Array<{ date: Date; count: number }> = [];
      const dateGroups: Record<string, number> = {};
      
      shareData.forEach(share => {
        const dateKey = share.createdAt.toDateString();
        dateGroups[dateKey] = (dateGroups[dateKey] || 0) + 1;
      });
      
      Object.entries(dateGroups).forEach(([dateStr, count]) => {
        sharesOverTime.push({
          date: new Date(dateStr),
          count
        });
      });
      
      // Calculate cross-posting rate (simplified)
      const communityShares = sharesByTarget['community'] || 0;
      const crossPostingRate = totalShares > 0 ? (communityShares / totalShares) * 100 : 0;
      
      // Calculate sharing velocity (shares per hour)
      if (shareData.length > 1) {
        const timeSpanMs = Math.max(1, 
          shareData[shareData.length - 1].createdAt.getTime() - 
          shareData[0].createdAt.getTime()
        );
        const timeSpanHours = timeSpanMs / (1000 * 60 * 60);
        var sharingVelocity = timeSpanHours > 0 ? totalShares / timeSpanHours : 0;
      } else {
        var sharingVelocity = totalShares > 0 ? 1 : 0;
      }
      
      return {
        postId,
        totalShares,
        sharesByTarget,
        sharesOverTime,
        crossPostingRate,
        sharingVelocity
      };
    } catch (error) {
      console.error('Error getting content sharing analytics:', error);
      throw new Error('Failed to retrieve content sharing analytics');
    }
  }

  /**
   * Get content performance summary for a user
   */
  async getUserContentPerformanceSummary(userId: string): Promise<{
    totalPosts: number;
    avgEngagementScore: number;
    topPerformingPost: ContentPerformanceMetrics | null;
    trendingPosts: number;
    totalViews: number;
    totalReactions: number;
    totalShares: number;
    qualityScore: number;
  }> {
    try {
      // Get user's posts
      const userPosts = await db
        .select({ id: posts.id })
        .from(posts)
        .where(eq(posts.authorId, userId));
      
      const postIds = userPosts.map(p => p.id.toString());
      const totalPosts = postIds.length;
      
      if (totalPosts === 0) {
        return {
          totalPosts: 0,
          avgEngagementScore: 0,
          topPerformingPost: null,
          trendingPosts: 0,
          totalViews: 0,
          totalReactions: 0,
          totalShares: 0,
          qualityScore: 0
        };
      }
      
      // Get performance metrics for all posts
      const postMetrics = await this.getPostsPerformanceMetrics(postIds);
      
      // Calculate aggregates
      const totalViews = postMetrics.reduce((sum, metrics) => sum + metrics.viewCount, 0);
      const totalReactions = postMetrics.reduce((sum, metrics) => sum + metrics.reactionCount, 0);
      const totalReposts = postMetrics.reduce((sum, metrics) => sum + metrics.repostsCount, 0);
      const avgEngagementScore = postMetrics.reduce((sum, metrics) => sum + metrics.engagementScore, 0) / postMetrics.length;
      const qualityScore = postMetrics.reduce((sum, metrics) => sum + metrics.qualityScore, 0) / postMetrics.length;
      const trendingPosts = postMetrics.filter(metrics => metrics.trendingScore > 50).length;
      
      // Find top performing post
      const topPerformingPost = postMetrics.length > 0 
        ? postMetrics.reduce((best, current) => 
            current.engagementScore > best.engagementScore ? current : best
          ) 
        : null;
      
      return {
        totalPosts,
        avgEngagementScore: Math.round(avgEngagementScore),
        topPerformingPost,
        trendingPosts,
        totalViews,
        totalReactions,
        totalShares,
        qualityScore: Math.round(qualityScore)
      };
    } catch (error) {
      console.error('Error getting user content performance summary:', error);
      throw new Error('Failed to retrieve user content performance summary');
    }
  }
}

export default new ContentPerformanceService();