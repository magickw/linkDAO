/**
 * Unified Share Resolver Service
 * Handles resolution of share IDs across all content types
 * Future-proof for community posts, proposals, marketplace items, etc.
 */

import { db } from '../db';
import { statuses, posts, users, communities } from '../db/schema';
import { eq, or } from 'drizzle-orm';
import { isValidShareId } from '../utils/shareIdGenerator';
import { safeLogger } from '../utils/safeLogger';

export type ContentType = 'status' | 'community_post' | 'proposal' | 'marketplace_item' | 'comment';

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
      // Try statuses first (most common)
      const status = await this.resolveStatus(shareId);
      if (status) return status;

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
   * Resolve status by share ID
   */
  private async resolveStatus(shareId: string): Promise<ShareResolution | null> {
    const statusResult = await db
      .select({
        id: statuses.id,
        shareId: statuses.shareId,
        authorId: statuses.authorId,
        content: statuses.content,
        contentCid: statuses.contentCid,
        mediaCids: statuses.mediaCids,
        tags: statuses.tags,
        createdAt: statuses.createdAt,
        handle: users.handle,
        walletAddress: users.walletAddress,
        displayName: users.displayName,
      })
      .from(statuses)
      .leftJoin(users, eq(statuses.authorId, users.id))
      .where(eq(statuses.shareId, shareId))
      .limit(1);

    if (!statusResult || statusResult.length === 0) {
      return null;
    }

    const item = statusResult[0];
    const handle = item.handle || item.walletAddress?.slice(0, 8) || 'unknown';
    const name = item.displayName || handle;

    return {
      type: 'status',
      id: item.id,
      shareId: item.shareId,
      owner: {
        type: 'user',
        id: item.authorId,
        handle,
        name,
      },
      canonicalUrl: `/${handle}/statuses/${item.id}`,
      shareUrl: `/p/${shareId}`,
      data: item,
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
      canonicalUrl: `/communities/${encodeURIComponent(communitySlug)}/posts/${post.shareId}`,
      shareUrl: `/cp/${shareId}`, // Community post specific share prefix
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
      case 'status':
        // Statuses are public for now
        return true;

      case 'community_post':
        // Community posts are public for now
        // TODO: Add proper community membership checks
        return true;

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