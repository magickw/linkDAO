/**
 * Content Sharing Service
 * Handles sharing content between feed, communities, and messages
 * Implements requirements 4.2, 4.5, 4.6 from the interconnected social platform spec
 */

import { EnhancedPost } from '../types/feed';
import { Community } from '../types/communityEnhancements';
import { Conversation, Message } from '../types/messaging';

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

class ContentSharingService {
  private static instance: ContentSharingService;

  static getInstance(): ContentSharingService {
    if (!ContentSharingService.instance) {
      ContentSharingService.instance = new ContentSharingService();
    }
    return ContentSharingService.instance;
  }

  /**
   * Generate shareable content object from various content types
   */
  async generateShareableContent(
    contentId: string,
    contentType: ShareableContent['type']
  ): Promise<ShareableContent> {
    try {
      const response = await fetch(`/api/content/shareable/${contentType}/${contentId}`);
      if (!response.ok) throw new Error('Failed to generate shareable content');
      
      return await response.json();
    } catch (error) {
      console.error('Error generating shareable content:', error);
      throw error;
    }
  }

  /**
   * Generate content preview for message sharing
   */
  async generateContentPreview(content: ShareableContent): Promise<ContentPreview> {
    try {
      const response = await fetch('/api/content/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) throw new Error('Failed to generate content preview');
      
      return await response.json();
    } catch (error) {
      console.error('Error generating content preview:', error);
      throw error;
    }
  }

  /**
   * Share content to direct message
   */
  async shareToDirectMessage(
    content: ShareableContent,
    options: ShareToMessageOptions,
    currentUserAddress: string
  ): Promise<Message> {
    try {
      // Generate content preview
      const preview = await this.generateContentPreview(content);

      // Prepare message payload
      const messagePayload = {
        conversationId: options.conversationId,
        recipientAddress: options.recipientAddress,
        contentType: 'shared_content',
        content: {
          type: 'content_share',
          preview,
          originalContent: content,
          message: options.message || '',
        },
        fromAddress: currentUserAddress,
      };

      const response = await fetch('/api/messages/share-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUserAddress}`,
        },
        body: JSON.stringify(messagePayload),
      });

      if (!response.ok) throw new Error('Failed to share content to message');
      
      return await response.json();
    } catch (error) {
      console.error('Error sharing content to message:', error);
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
  ): Promise<Message> {
    try {
      // Get community details
      const communityResponse = await fetch(`/api/communities/${communityId}`);
      if (!communityResponse.ok) throw new Error('Community not found');
      
      const community: Community = await communityResponse.json();

      // Generate shareable content for community
      const shareableContent: ShareableContent = {
        id: community.id,
        type: 'community',
        title: community.displayName,
        description: community.description,
        imageUrl: community.iconUrl,
        url: `/communities/${community.id}`,
        metadata: {
          memberCount: community.memberCount,
          category: community.category,
          tags: community.tags,
        },
      };

      // Create invitation message
      const invitationPayload = {
        recipientAddress,
        contentType: 'community_invitation',
        content: {
          type: 'community_invitation',
          community: shareableContent,
          inviterAddress,
          message: customMessage || `Hey! I think you'd be interested in joining the ${community.displayName} community.`,
          invitationUrl: `/communities/${communityId}/join?inviter=${inviterAddress}`,
        },
        fromAddress: inviterAddress,
      };

      const response = await fetch('/api/messages/community-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${inviterAddress}`,
        },
        body: JSON.stringify(invitationPayload),
      });

      if (!response.ok) throw new Error('Failed to send community invitation');
      
      return await response.json();
    } catch (error) {
      console.error('Error creating community invitation:', error);
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
    try {
      const response = await fetch('/api/posts/cross-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAddress}`,
        },
        body: JSON.stringify({
          originalPostId,
          targetCommunityIds: options.targetCommunityIds,
          attribution: options.attribution,
          customMessage: options.customMessage,
        }),
      });

      if (!response.ok) throw new Error('Failed to cross-post content');
      
      return await response.json();
    } catch (error) {
      console.error('Error cross-posting content:', error);
      throw error;
    }
  }

  /**
   * Get sharing analytics for content
   */
  async getSharingAnalytics(contentId: string, contentType: string): Promise<{
    totalShares: number;
    sharesByPlatform: Record<string, number>;
    recentShares: Array<{
      sharedAt: string;
      sharedBy: string;
      platform: string;
    }>;
  }> {
    try {
      const response = await fetch(`/api/content/${contentType}/${contentId}/sharing-analytics`);
      if (!response.ok) throw new Error('Failed to get sharing analytics');
      
      return await response.json();
    } catch (error) {
      console.error('Error getting sharing analytics:', error);
      return {
        totalShares: 0,
        sharesByPlatform: {},
        recentShares: [],
      };
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
      await fetch('/api/analytics/sharing-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAddress}`,
        },
        body: JSON.stringify({
          contentId,
          contentType,
          shareType,
          userAddress,
          metadata,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Error tracking sharing event:', error);
      // Don't throw error for analytics tracking failures
    }
  }
}

export const contentSharingService = ContentSharingService.getInstance();
export default contentSharingService;