/**
 * Unified Share Resolver Service
 * Handles resolution of share IDs across all content types
 * Future-proof for community posts, proposals, marketplace items, etc.
 */

import { statuses, posts, users, communities } from '../db/schema';
import { eq } from 'drizzle-orm';
import { isValidShareId, decodeBase62ToUuid } from '../utils/shareIdGenerator';
import { safeLogger } from '../utils/safeLogger';
import { databaseService } from './databaseService';

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
    safeLogger.info(`[UnifiedShareResolver] Resolving share ID: ${shareId}`);

    // Validate share ID format
    if (!isValidShareId(shareId)) {
      safeLogger.warn(`[UnifiedShareResolver] Invalid share ID format: ${shareId}`);
      return null;
    }

    try {
      // 1. Try direct lookup by shareId (most common)
      const status = await this.resolveStatus(shareId);
      if (status) {
        safeLogger.info(`[UnifiedShareResolver] Resolved status for share ID: ${shareId}`);
        return status;
      }

      const communityPost = await this.resolveCommunityPost(shareId);
      if (communityPost) {
        safeLogger.info(`[UnifiedShareResolver] Resolved community post for share ID: ${shareId}`);
        return communityPost;
      }

      // 2. Fallback: Try to decode as Base62 UUID (legacy/alternative format)
      try {
        const decodedUuid = decodeBase62ToUuid(shareId);
        // Valid UUIDs are 36 chars (including hyphens)
        if (decodedUuid && decodedUuid.length === 36) {
          safeLogger.info(`[UnifiedShareResolver] shareId ${shareId} not found, trying as decoded UUID: ${decodedUuid}`);
          
          const statusByUuid = await this.resolveStatusById(decodedUuid);
          if (statusByUuid) {
            safeLogger.info(`[UnifiedShareResolver] Resolved status by decoded UUID: ${decodedUuid}`);
            return statusByUuid;
          }

          const communityPostByUuid = await this.resolveCommunityPostById(decodedUuid);
          if (communityPostByUuid) {
            safeLogger.info(`[UnifiedShareResolver] Resolved community post by decoded UUID: ${decodedUuid}`);
            return communityPostByUuid;
          }
        }
      } catch (decodeError) {
        // Not a valid base62 UUID, ignore
        safeLogger.debug(`[UnifiedShareResolver] shareId ${shareId} is not a valid base62 UUID`);
      }

      safeLogger.warn(`[UnifiedShareResolver] Content not found for share ID: ${shareId}`);
      return null;
    } catch (error) {
      safeLogger.error(`[UnifiedShareResolver] Error resolving share ID ${shareId}:`, error);
      return null;
    }
  }

  /**
   * Resolve status by share ID
   */
  private async resolveStatus(shareId: string): Promise<ShareResolution | null> {
    const db = databaseService.getDatabase();
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

    return this.mapStatusResult(statusResult[0]);
  }

  /**
   * Resolve status by UUID (fallback)
   */
  private async resolveStatusById(id: string): Promise<ShareResolution | null> {
    const db = databaseService.getDatabase();
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
      .where(eq(statuses.id, id))
      .limit(1);

    if (!statusResult || statusResult.length === 0) {
      return null;
    }

    return this.mapStatusResult(statusResult[0]);
  }

  private mapStatusResult(item: any): ShareResolution {
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
      shareUrl: `/p/${item.shareId}`,
      data: item,
    };
  }

  /**
   * Resolve community post by share ID
   */
  private async resolveCommunityPost(shareId: string): Promise<ShareResolution | null> {
    const db = databaseService.getDatabase();
    
    // First check if it exists
    const basicPost = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.shareId, shareId))
      .limit(1);

    if (!basicPost || basicPost.length === 0) return null;

    return this.fetchCommunityPostDetails(eq(posts.shareId, shareId));
  }

  /**
   * Resolve community post by UUID (fallback)
   */
  private async resolveCommunityPostById(id: string): Promise<ShareResolution | null> {
    const db = databaseService.getDatabase();
    
    // First check if it exists
    const basicPost = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);

    if (!basicPost || basicPost.length === 0) return null;

    return this.fetchCommunityPostDetails(eq(posts.id, id));
  }

  private async fetchCommunityPostDetails(whereClause: any): Promise<ShareResolution | null> {
    const db = databaseService.getDatabase();
    
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
      .where(whereClause)
      .limit(1);

    if (!communityPosts || communityPosts.length === 0) return null;

    const post = communityPosts[0];

    // Only resolve posts that belong to a community
    if (!post.communityId) return null;

    const authorHandle = post.authorHandle || post.authorWallet?.slice(0, 8) || 'unknown';
    const authorName = post.authorName || authorHandle;
    const communitySlug = post.communitySlug || 'community';

    // Canonical URL should point to the community post page
    const canonicalUrl = `/communities/${encodeURIComponent(communitySlug)}/posts/${post.shareId}`;

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
      canonicalUrl,
      shareUrl: `/cp/${post.shareId}`,
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