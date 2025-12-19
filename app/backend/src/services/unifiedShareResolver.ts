/**
 * Unified Share Resolver Service
 * Handles resolution of share IDs across all content types
 * Future-proof for community posts, proposals, marketplace items, etc.
 */

import { db } from '../db';
import { quickPosts, posts, users, communities } from '../db/schema';
import { eq, or } from 'drizzle-orm';
import { isValidShareId } from '../utils/shareIdGenerator';
import { safeLogger } from '../utils/safeLogger';

export type ContentType = 'quick_post' | 'community_post' | 'proposal' | 'marketplace_item' | 'comment';

export interface ShareResolution {
  type: ContentType;
  id: string;
  shareId: string;
  owner: {
    type: 'user' | 'community';
    id: string;
    handle: string;
    name: string;
  };
  canonicalUrl: string;
  shareUrl: string;
  data: any; // The actual content data
}

export class UnifiedShareResolver {
  /**
   * Resolve a share ID to its content and owner
   */
  async resolve(shareId: string): Promise<ShareResolution | null> {
    // Validate share ID format
    if (!isValidShareId(shareId)) {
      safeLogger.warn(`Invalid share ID format: ${shareId}`);
      return null;
    }

    try {
      // Try quick posts first (most common)
      const quickPost = await this.resolveQuickPost(shareId);
      if (quickPost) return quickPost;

      // Try community posts
      const communityPost = await this.resolveCommunityPost(shareId);
      if (communityPost) return communityPost;

      // TODO: Add other content types as they're implemented
      // const proposal = await this.resolveProposal(shareId);
      // if (proposal) return proposal;

      // const marketplaceItem = await this.resolveMarketplaceItem(shareId);
      // if (marketplaceItem) return marketplaceItem;

      return null;
    } catch (error) {
      safeLogger.error(`Error resolving share ID ${shareId}:`, error);
      return null;
    }
  }

  /**
   * Resolve quick post by share ID
   */
  private async resolveQuickPost(shareId: string): Promise<ShareResolution | null> {
    const posts = await db
      .select({
        id: quickPosts.id,
        shareId: quickPosts.shareId,
        authorId: quickPosts.authorId,
        content: quickPosts.content,
        contentCid: quickPosts.contentCid,
        mediaCids: quickPosts.mediaCids,
        tags: quickPosts.tags,
        createdAt: quickPosts.createdAt,
        handle: users.handle,
        walletAddress: users.walletAddress,
        displayName: users.displayName,
      })
      .from(quickPosts)
      .leftJoin(users, eq(quickPosts.authorId, users.id))
      .where(eq(quickPosts.shareId, shareId))
      .limit(1);

    if (!posts || posts.length === 0) {
      return null;
    }

    const post = posts[0];
    const handle = post.handle || post.walletAddress?.slice(0, 8) || 'unknown';
    const name = post.displayName || handle;

    return {
      type: 'quick_post',
      id: post.id,
      shareId: post.shareId,
      owner: {
        type: 'user',
        id: post.authorId,
        handle,
        name,
      },
      canonicalUrl: `/${handle}/posts/${shareId}`,
      shareUrl: `/p/${shareId}`,
      data: post,
    };
  }

  /**
   * Resolve community post by share ID
   */
  private async resolveCommunityPost(shareId: string): Promise<ShareResolution | null> {
    const communityPosts = await db
      .select({
        id: posts.id,
        shareId: posts.shareId,
        authorId: posts.authorId,
        title: posts.title,
        content: posts.content,
        contentCid: posts.contentCid,
        mediaCids: posts.mediaCids,
        tags: posts.tags,
        communityId: posts.communityId,
        createdAt: posts.createdAt,
        authorHandle: users.handle,
        authorWallet: users.walletAddress,
        authorName: users.displayName,
        communitySlug: communities.slug,
        communityName: communities.name,
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .leftJoin(communities, eq(posts.communityId, communities.id))
      .where(eq(posts.shareId, shareId))
      .limit(1);

    if (!communityPosts || communityPosts.length === 0) {
      return null;
    }

    const post = communityPosts[0];
    
    // Only resolve posts that belong to a community
    if (!post.communityId) {
      return null;
    }

    const authorHandle = post.authorHandle || post.authorWallet?.slice(0, 8) || 'unknown';
    const authorName = post.authorName || authorHandle;
    const communitySlug = post.communitySlug || 'community';

    return {
      type: 'community_post',
      id: post.id.toString(),
      shareId: post.shareId,
      owner: {
        type: 'community',
        id: post.communityId,
        handle: communitySlug,
        name: post.communityName || communitySlug,
      },
      canonicalUrl: `/communities/${communitySlug}/posts/${shareId}`,
      shareUrl: `/cp/${shareId}`, // Optional: community post share prefix
      data: {
        ...post,
        authorHandle,
        authorName,
      },
    };
  }

  /**
   * Resolve proposal by share ID (placeholder for future)
   */
  private async resolveProposal(shareId: string): Promise<ShareResolution | null> {
    // TODO: Implement when proposals are added
    return null;
  }

  /**
   * Resolve marketplace item by share ID (placeholder for future)
   */
  private async resolveMarketplaceItem(shareId: string): Promise<ShareResolution | null> {
    // TODO: Implement when marketplace items are added
    return null;
  }

  /**
   * Check if user has permission to view content
   * Always returns false for non-existent or restricted content
   * Never reveals existence of restricted content
   */
  async checkPermission(shareId: string, userId?: string): Promise<boolean> {
    const resolution = await this.resolve(shareId);
    
    if (!resolution) {
      // Content doesn't exist
      return false;
    }

    // TODO: Add permission checks based on content type
    switch (resolution.type) {
      case 'quick_post':
        // Quick posts are public for now
        return true;
      
      case 'community_post':
        // TODO: Check community membership
        return false;
      
      case 'proposal':
        // TODO: Check DAO membership
        return false;
      
      case 'marketplace_item':
        // TODO: Check if item is public
        return false;
      
      default:
        return false;
    }
  }

  /**
   * Log analytics for share ID resolution
   */
  async logResolution(shareId: string, referrer?: string, userAgent?: string): Promise<void> {
    try {
      // TODO: Implement analytics logging
      safeLogger.info(`Share ID resolved: ${shareId}`, {
        referrer,
        userAgent: userAgent?.slice(0, 200), // Truncate for privacy
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      safeLogger.error('Failed to log share resolution:', error);
    }
  }
}

// Export singleton instance
export const unifiedShareResolver = new UnifiedShareResolver();