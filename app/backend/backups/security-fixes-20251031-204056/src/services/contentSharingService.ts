/**
 * Content Sharing Service
 * Backend service for handling content sharing between features
 * Implements requirements 4.2, 4.5, 4.6 from the interconnected social platform spec
 */

import { db } from '../db/connection';
import { posts, communities, users, messages, conversations, sharingEvents } from '../db/schema';
import { eq, and, desc, sql, inArray, gte } from 'drizzle-orm';
import { messagingService } from './messagingService';
import { communityService } from './communityService';
import { logger } from '../utils/logger';

export interface ShareableContent {
  id: string;
  type: 'post' | 'community' | 'user_profile' | 'nft' | 'governance_proposal';
  title: string;
  description?: string;
  imageUrl?: string;
  url: string;
  metadata?: Record<string, any>;
  authorAddress?: string;
  communityId?: string;
}

export interface ContentPreview {
  id: string;
  type: ShareableContent['type'];
  title: string;
  description: string;
  imageUrl?: string;
  metadata: {
    authorName?: string;
    authorAddress?: string;
    communityName?: string;
    createdAt: string;
    engagement?: {
      likes: number;
      comments: number;
      shares: number;
    };
  };
}

export interface ShareToMessageOptions {
  conversationId?: string;
  recipientAddress?: string;
  message?: string;
}

export interface CrossPostOptions {
  targetCommunityIds: string[];
  attribution: {
    originalCommunityId?: string;
    originalAuthor: string;
    originalPostId: string;
  };
  customMessage?: string;
}

class ContentSharingService {
  /**
   * Generate shareable content object from various content types
   */
  async generateShareableContent(
    contentId: string,
    contentType: ShareableContent['type']
  ): Promise<ShareableContent> {
    try {
      switch (contentType) {
        case 'post':
          return await this.generatePostShareableContent(contentId);
        case 'community':
          return await this.generateCommunityShareableContent(contentId);
        case 'user_profile':
          return await this.generateUserProfileShareableContent(contentId);
        default:
          throw new Error(`Unsupported content type: ${contentType}`);
      }
    } catch (error) {
      logger.error('Error generating shareable content:', error);
      throw error;
    }
  }

  /**
   * Generate content preview for message sharing
   */
  async generateContentPreview(content: ShareableContent): Promise<ContentPreview> {
    try {
      const basePreview: ContentPreview = {
        id: content.id,
        type: content.type,
        title: content.title,
        description: content.description || '',
        imageUrl: content.imageUrl,
        metadata: {
          authorAddress: content.authorAddress,
          createdAt: new Date().toISOString(),
        }
      };

      // Enhance preview with additional metadata based on content type
      switch (content.type) {
        case 'post':
          return await this.enhancePostPreview(basePreview, content.id);
        case 'community':
          return await this.enhanceCommunityPreview(basePreview, content.id);
        default:
          return basePreview;
      }
    } catch (error) {
      logger.error('Error generating content preview:', error);
      throw error;
    }
  }

  /**
   * Share content to direct message
   */
  async shareToDirectMessage(
    content: ShareableContent,
    options: ShareToMessageOptions,
    userAddress: string
  ): Promise<any> {
    try {
      // Generate content preview
      const preview = await this.generateContentPreview(content);

      // Prepare message content
      const messageContent = {
        type: 'shared_content',
        preview,
        originalContent: content,
        message: options.message || '',
      };

      let conversationId = options.conversationId;

      // Create new conversation if needed
      if (!conversationId && options.recipientAddress) {
        const conversation = await messagingService.createConversation(
          [userAddress, options.recipientAddress],
          { type: 'direct' }
        );
        conversationId = conversation.id;
      }

      if (!conversationId) {
        throw new Error('No conversation ID or recipient address provided');
      }

      // Send the message
      const message = await messagingService.sendMessage({
        conversationId,
        fromAddress: userAddress,
        content: JSON.stringify(messageContent),
        contentType: 'shared_content'
      });

      // Track sharing event
      await this.trackSharingEvent(
        content.id,
        content.type,
        'direct_message',
        userAddress,
        { conversationId, recipientAddress: options.recipientAddress }
      );

      return message;
    } catch (error) {
      logger.error('Error sharing content to message:', error);
      throw error;
    }
  }

  /**
   * Create community invitation message
   */
  async createCommunityInvitation(
    communityId: string,
    recipientAddress: string,
    inviterAddress: string,
    customMessage?: string
  ): Promise<any> {
    try {
      // Get community details
      const community = await db
        .select()
        .from(communities)
        .where(eq(communities.id, communityId))
        .limit(1);

      if (community.length === 0) {
        throw new Error('Community not found');
      }

      const communityData = community[0];

      // Generate shareable content for community
      const shareableContent: ShareableContent = {
        id: communityData.id,
        type: 'community',
        title: communityData.displayName,
        description: communityData.description,
        imageUrl: communityData.iconUrl,
        url: `/communities/${communityData.id}`,
        metadata: {
          memberCount: communityData.memberCount,
          category: communityData.category,
          tags: communityData.tags,
        },
      };

      // Create invitation message content
      const invitationContent = {
        type: 'community_invitation',
        community: shareableContent,
        inviterAddress,
        message: customMessage || `Hey! I think you'd be interested in joining the ${communityData.displayName} community.`,
        invitationUrl: `/communities/${communityId}/join?inviter=${inviterAddress}`,
      };

      // Create or get conversation
      const conversation = await messagingService.createConversation(
        [inviterAddress, recipientAddress],
        { type: 'direct' }
      );

      // Send invitation message
      const message = await messagingService.sendMessage({
        conversationId: conversation.id,
        fromAddress: inviterAddress,
        content: JSON.stringify(invitationContent),
        contentType: 'community_invitation'
      });

      // Track sharing event
      await this.trackSharingEvent(
        communityId,
        'community',
        'direct_message',
        inviterAddress,
        { type: 'invitation', recipientAddress }
      );

      return message;
    } catch (error) {
      logger.error('Error creating community invitation:', error);
      throw error;
    }
  }

  /**
   * Cross-post content between communities
   */
  async crossPostToCommunities(
    originalPostId: string,
    options: CrossPostOptions,
    userAddress: string
  ): Promise<{ success: string[]; failed: string[] }> {
    const results = { success: [], failed: [] };

    try {
      // Get original post
      const originalPost = await db
        .select()
        .from(posts)
        .where(eq(posts.id, originalPostId))
        .limit(1);

      if (originalPost.length === 0) {
        throw new Error('Original post not found');
      }

      const post = originalPost[0];

      // Create cross-posts for each target community
      for (const communityId of options.targetCommunityIds) {
        try {
          // Create cross-post with attribution
          const crossPostContent = options.customMessage 
            ? `${options.customMessage}\n\n--- Cross-posted from ${options.attribution.originalAuthor} ---\n\n${post.content}`
            : `--- Cross-posted from ${options.attribution.originalAuthor} ---\n\n${post.content}`;

          const crossPost = await db.insert(posts).values({
            authorAddress: userAddress,
            communityId,
            content: crossPostContent,
            mediaUrls: post.mediaUrls,
            tags: post.tags,
            metadata: {
              ...post.metadata,
              crossPost: true,
              originalPostId: originalPostId,
              originalAuthor: options.attribution.originalAuthor,
              originalCommunityId: options.attribution.originalCommunityId,
            }
          }).returning();

          results.success.push(communityId);

          // Track sharing event
          await this.trackSharingEvent(
            originalPostId,
            'post',
            'community_cross_post',
            userAddress,
            { targetCommunityId: communityId, crossPostId: crossPost[0].id }
          );
        } catch (error) {
          logger.error(`Error cross-posting to community ${communityId}:`, error);
          results.failed.push(communityId);
        }
      }

      return results;
    } catch (error) {
      logger.error('Error cross-posting content:', error);
      throw error;
    }
  }

  /**
   * Get sharing analytics for content
   */
  async getSharingAnalytics(
    contentId: string,
    contentType: string,
    timeRange: string = 'all'
  ): Promise<{
    totalShares: number;
    sharesByPlatform: Record<string, number>;
    recentShares: Array<{
      sharedAt: string;
      sharedBy: string;
      platform: string;
    }>;
  }> {
    try {
      let timeFilter = sql`1=1`;
      
      if (timeRange !== 'all') {
        const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720; // 30d
        timeFilter = gte(sharingEvents.createdAt, sql`NOW() - INTERVAL ${hours} HOUR`);
      }

      // Get sharing events
      const events = await db
        .select()
        .from(sharingEvents)
        .where(
          and(
            eq(sharingEvents.contentId, contentId),
            eq(sharingEvents.contentType, contentType),
            timeFilter
          )
        )
        .orderBy(desc(sharingEvents.createdAt));

      // Calculate analytics
      const totalShares = events.length;
      const sharesByPlatform = events.reduce((acc, event) => {
        acc[event.shareType] = (acc[event.shareType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const recentShares = events.slice(0, 10).map(event => ({
        sharedAt: event.createdAt.toISOString(),
        sharedBy: event.userAddress,
        platform: event.shareType
      }));

      return {
        totalShares,
        sharesByPlatform,
        recentShares
      };
    } catch (error) {
      logger.error('Error getting sharing analytics:', error);
      throw error;
    }
  }

  /**
   * Track sharing event for analytics
   */
  async trackSharingEvent(
    contentId: string,
    contentType: string,
    shareType: 'direct_message' | 'community_cross_post' | 'external_share',
    userAddress: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await db.insert(sharingEvents).values({
        contentId,
        contentType,
        shareType,
        userAddress,
        metadata: metadata || {},
        createdAt: new Date()
      });
    } catch (error) {
      logger.error('Error tracking sharing event:', error);
      // Don't throw error for analytics tracking failures
    }
  }

  /**
   * Validate sharing permissions
   */
  async validateSharingPermissions(
    contentId: string,
    contentType: string,
    userAddress: string
  ): Promise<boolean> {
    try {
      switch (contentType) {
        case 'post':
          // Check if post exists and is not deleted
          const post = await db
            .select()
            .from(posts)
            .where(and(eq(posts.id, contentId), eq(posts.isDeleted, false)))
            .limit(1);
          return post.length > 0;

        case 'community':
          // Check if community exists and is public or user is a member
          const community = await db
            .select()
            .from(communities)
            .where(eq(communities.id, contentId))
            .limit(1);
          
          if (community.length === 0) return false;
          if (community[0].isPublic) return true;
          
          return await communityService.checkMembership(contentId, userAddress);

        default:
          return true;
      }
    } catch (error) {
      logger.error('Error validating sharing permissions:', error);
      return false;
    }
  }

  /**
   * Get user's sharing history
   */
  async getUserSharingHistory(
    userAddress: string,
    options: {
      page: number;
      limit: number;
      contentType?: string;
      shareType?: string;
    }
  ): Promise<{
    events: any[];
    totalCount: number;
    hasMore: boolean;
  }> {
    try {
      const offset = (options.page - 1) * options.limit;
      
      let whereConditions = [eq(sharingEvents.userAddress, userAddress)];
      
      if (options.contentType) {
        whereConditions.push(eq(sharingEvents.contentType, options.contentType));
      }
      
      if (options.shareType) {
        whereConditions.push(eq(sharingEvents.shareType, options.shareType as any));
      }

      const events = await db
        .select()
        .from(sharingEvents)
        .where(and(...whereConditions))
        .orderBy(desc(sharingEvents.createdAt))
        .limit(options.limit)
        .offset(offset);

      const totalCount = await db
        .select({ count: sql`count(*)` })
        .from(sharingEvents)
        .where(and(...whereConditions));

      return {
        events,
        totalCount: Number(totalCount[0].count),
        hasMore: offset + events.length < Number(totalCount[0].count)
      };
    } catch (error) {
      logger.error('Error getting user sharing history:', error);
      throw error;
    }
  }

  /**
   * Get trending shared content
   */
  async getTrendingSharedContent(options: {
    timeRange: string;
    contentType?: string;
    limit: number;
  }): Promise<any[]> {
    try {
      const hours = options.timeRange === '24h' ? 24 : options.timeRange === '7d' ? 168 : 720;
      
      let whereConditions = [gte(sharingEvents.createdAt, sql`NOW() - INTERVAL ${hours} HOUR`)];
      
      if (options.contentType) {
        whereConditions.push(eq(sharingEvents.contentType, options.contentType));
      }

      const trendingContent = await db
        .select({
          contentId: sharingEvents.contentId,
          contentType: sharingEvents.contentType,
          shareCount: sql`count(*)`.as('shareCount')
        })
        .from(sharingEvents)
        .where(and(...whereConditions))
        .groupBy(sharingEvents.contentId, sharingEvents.contentType)
        .orderBy(desc(sql`count(*)`))
        .limit(options.limit);

      // Enhance with content details
      const enhancedContent = await Promise.all(
        trendingContent.map(async (item) => {
          try {
            const shareableContent = await this.generateShareableContent(
              item.contentId,
              item.contentType as any
            );
            return {
              ...shareableContent,
              shareCount: Number(item.shareCount)
            };
          } catch (error) {
            logger.error(`Error enhancing trending content ${item.contentId}:`, error);
            return null;
          }
        })
      );

      return enhancedContent.filter(item => item !== null);
    } catch (error) {
      logger.error('Error getting trending shared content:', error);
      throw error;
    }
  }

  // Private helper methods

  private async generatePostShareableContent(postId: string): Promise<ShareableContent> {
    const post = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (post.length === 0) {
      throw new Error('Post not found');
    }

    const postData = post[0];
    
    return {
      id: postData.id,
      type: 'post',
      title: postData.content.substring(0, 100) + (postData.content.length > 100 ? '...' : ''),
      description: postData.content,
      imageUrl: postData.mediaUrls?.[0],
      url: `/posts/${postData.id}`,
      authorAddress: postData.authorAddress,
      communityId: postData.communityId,
      metadata: postData.metadata
    };
  }

  private async generateCommunityShareableContent(communityId: string): Promise<ShareableContent> {
    const community = await db
      .select()
      .from(communities)
      .where(eq(communities.id, communityId))
      .limit(1);

    if (community.length === 0) {
      throw new Error('Community not found');
    }

    const communityData = community[0];
    
    return {
      id: communityData.id,
      type: 'community',
      title: communityData.displayName,
      description: communityData.description,
      imageUrl: communityData.iconUrl,
      url: `/communities/${communityData.id}`,
      metadata: {
        memberCount: communityData.memberCount,
        category: communityData.category,
        tags: communityData.tags
      }
    };
  }

  private async generateUserProfileShareableContent(userAddress: string): Promise<ShareableContent> {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.address, userAddress))
      .limit(1);

    if (user.length === 0) {
      throw new Error('User not found');
    }

    const userData = user[0];
    
    return {
      id: userData.address,
      type: 'user_profile',
      title: userData.displayName || `${userData.address.slice(0, 6)}...${userData.address.slice(-4)}`,
      description: userData.bio || '',
      imageUrl: userData.avatarUrl,
      url: `/profile/${userData.address}`,
      authorAddress: userData.address,
      metadata: {
        joinedAt: userData.createdAt,
        reputation: userData.reputation
      }
    };
  }

  private async enhancePostPreview(preview: ContentPreview, postId: string): Promise<ContentPreview> {
    // Get engagement data
    const engagementData = await db
      .select({
        likes: sql`count(case when reaction_type = 'like' then 1 end)`.as('likes'),
        comments: sql`count(case when reaction_type = 'comment' then 1 end)`.as('comments')
      })
      .from(sql`post_reactions`)
      .where(sql`post_id = ${postId}`)
      .groupBy(sql`post_id`);

    if (engagementData.length > 0) {
      preview.metadata.engagement = {
        likes: Number(engagementData[0].likes),
        comments: Number(engagementData[0].comments),
        shares: 0 // Will be filled by sharing analytics
      };
    }

    return preview;
  }

  private async enhanceCommunityPreview(preview: ContentPreview, communityId: string): Promise<ContentPreview> {
    const community = await db
      .select()
      .from(communities)
      .where(eq(communities.id, communityId))
      .limit(1);

    if (community.length > 0) {
      preview.metadata.communityName = community[0].displayName;
    }

    return preview;
  }
}

export const contentSharingService = new ContentSharingService();