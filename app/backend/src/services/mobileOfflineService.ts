import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { 
  offlineContentCache, 
  offlineActionQueue,
  communities,
  posts,
  communityMembers,
  eq,
  and,
  inArray,
  desc,
  sql,
  count
} from '../db/schema';
import offlineService from './offlineService';

export class MobileOfflineService {
  /**
   * Prepare offline content for a user
   */
  async prepareOfflineContent(userAddress: string, communityIds: string[]): Promise<boolean> {
    try {
      // Cache user's communities
      const userCommunities = await db
        .select()
        .from(communities)
        .where(inArray(communities.id, communityIds));

      for (const community of userCommunities) {
        await offlineService.cacheContent(
          userAddress,
          'community',
          community.id,
          {
            id: community.id,
            name: community.name,
            displayName: community.displayName,
            description: community.description,
            avatar: community.avatar,
            banner: community.banner,
            memberCount: community.memberCount,
            postCount: community.postCount,
          },
          10, // High priority
          168 // 1 week expiration
        );
      }

      // Cache recent posts from user's communities
      const recentPosts = await db
        .select()
        .from(posts)
        .where(inArray(posts.communityId, communityIds))
        .orderBy(desc(posts.createdAt))
        .limit(100); // Limit to 100 most recent posts

      for (const post of recentPosts) {
        await offlineService.cacheContent(
          userAddress,
          'post',
          post.id,
          {
            id: post.id,
            communityId: post.communityId,
            authorId: post.authorId,
            content: post.content,
            title: post.title,
            tags: post.tags,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
          },
          5, // Medium priority
          72 // 3 days expiration
        );
      }

      return true;
    } catch (error) {
      safeLogger.error('Error preparing offline content:', error);
      return false;
    }
  }

  /**
   * Get offline content for a user
   */
  async getOfflineContent(userAddress: string): Promise<{
    communities: any[];
    posts: any[];
  }> {
    try {
      // Get cached communities
      const cachedCommunities = await db
        .select()
        .from(offlineContentCache)
        .where(and(
          eq(offlineContentCache.userAddress, userAddress),
          eq(offlineContentCache.contentType, 'community')
        ));

      const communities = cachedCommunities.map(item => ({
        ...JSON.parse(item.contentData),
        id: item.contentId,
      }));

      // Get cached posts
      const cachedPosts = await db
        .select()
        .from(offlineContentCache)
        .where(and(
          eq(offlineContentCache.userAddress, userAddress),
          eq(offlineContentCache.contentType, 'post')
        ))
        .orderBy(desc(offlineContentCache.accessedAt))
        .limit(50);

      const posts = cachedPosts.map(item => ({
        ...JSON.parse(item.contentData),
        id: item.contentId,
      }));

      return {
        communities,
        posts,
      };
    } catch (error) {
      safeLogger.error('Error getting offline content:', error);
      return {
        communities: [],
        posts: [],
      };
    }
  }

  /**
   * Sync offline actions
   */
  async syncOfflineActions(userAddress: string, actions: any[]): Promise<any[]> {
    try {
      const results = [];

      for (const action of actions) {
        try {
          // Queue the action for processing
          const actionId = await offlineService.queueOfflineAction(
            userAddress,
            action.type,
            action.data
          );

          if (actionId) {
            results.push({
              id: action.id,
              success: true,
              actionId,
            });
          } else {
            results.push({
              id: action.id,
              success: false,
              error: 'Failed to queue action',
            });
          }
        } catch (error) {
          results.push({
            id: action.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return results;
    } catch (error) {
      safeLogger.error('Error syncing offline actions:', error);
      throw error;
    }
  }

  /**
   * Process pending offline actions
   */
  async processPendingActions(): Promise<void> {
    try {
      // This would be called by a background job to process pending actions
      // For now, we'll just log that it would happen
      safeLogger.info('Processing pending offline actions...');
    } catch (error) {
      safeLogger.error('Error processing pending actions:', error);
    }
  }

  /**
   * Get user's community IDs
   */
  async getUserCommunityIds(userAddress: string): Promise<string[]> {
    try {
      const memberships = await db
        .select({ communityId: communityMembers.communityId })
        .from(communityMembers)
        .where(eq(communityMembers.userAddress, userAddress));

      return memberships.map(m => m.communityId);
    } catch (error) {
      safeLogger.error('Error getting user community IDs:', error);
      return [];
    }
  }

  /**
   * Get offline storage statistics
   */
  async getOfflineStats(userAddress: string): Promise<any> {
    try {
      const storageUsage = await offlineService.getStorageUsage(userAddress);
      
      // Get community membership count
      const communityCount = await db
        .select({ count: count() })
        .from(communityMembers)
        .where(eq(communityMembers.userAddress, userAddress));

      return {
        ...storageUsage,
        communityCount: communityCount[0]?.count || 0,
      };
    } catch (error) {
      safeLogger.error('Error getting offline stats:', error);
      return {};
    }
  }
}

export default new MobileOfflineService();
