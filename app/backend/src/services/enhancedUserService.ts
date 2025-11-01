import { DatabaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { users, follows, posts, reactions, tips } from '../db/schema';
import { eq, desc, sql, and, or, ne, count, avg, sum } from 'drizzle-orm';

export interface UserProfile {
  id: string;
  walletAddress: string;
  handle: string;
  ens?: string;
  avatarCid?: string;
  bioCid?: string;
  followers: number;
  following: number;
  reputationScore: number;
  postCount: number;
  totalTipsReceived: number;
  totalReactionsReceived: number;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SuggestedUser {
  id: string;
  handle: string;
  ens?: string;
  avatarCid?: string;
  followers: number;
  reputationScore: number;
  mutualConnections: number;
  reasonForSuggestion: string;
}

export interface UserSearchResult {
  id: string;
  handle: string;
  ens?: string;
  avatarCid?: string;
  followers: number;
  reputationScore: number;
  matchScore: number;
}

export interface UserRecommendationFilters {
  minReputationScore?: number;
  maxResults?: number;
  excludeFollowed?: boolean;
  communityId?: string;
  interests?: string[];
}

export interface UserSearchFilters {
  query: string;
  minFollowers?: number;
  minReputationScore?: number;
  maxResults?: number;
  sortBy?: 'relevance' | 'followers' | 'reputation' | 'recent';
}

export class EnhancedUserService {
  private databaseService: DatabaseService;

  constructor() {
    this.databaseService = new DatabaseService();
  }

  /**
   * Get user profile with comprehensive statistics
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const db = this.databaseService.getDatabase();

    try {
      // Get basic user data
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return null;
      }

      // Get follower count
      const [followerCount] = await db
        .select({ count: count() })
        .from(follows)
        .where(eq(follows.followingId, userId));

      // Get following count
      const [followingCount] = await db
        .select({ count: count() })
        .from(follows)
        .where(eq(follows.followerId, userId));

      // Get post count
      const [postCount] = await db
        .select({ count: count() })
        .from(posts)
        .where(eq(posts.authorId, userId));

      // Get total tips received
      const [tipsReceived] = await db
        .select({ total: sum(tips.amount) })
        .from(tips)
        .where(eq(tips.toUserId, userId));

      // Get total reactions received on user's posts
      const [reactionsReceived] = await db
        .select({ count: count() })
        .from(reactions)
        .innerJoin(posts, eq(posts.id, reactions.postId))
        .where(eq(posts.authorId, userId));

      // Calculate reputation score based on various factors
      const reputationScore = this.calculateReputationScore({
        followers: followerCount.count || 0,
        posts: postCount.count || 0,
        tipsReceived: Number(tipsReceived.total || 0),
        reactionsReceived: reactionsReceived.count || 0,
      });

      return {
        id: user.id,
        walletAddress: user.walletAddress,
        handle: user.handle || '',
        ens: '', // Would need ENS resolution service
        avatarCid: '', // Would need to be stored in user profile
        bioCid: user.profileCid || '',
        followers: followerCount.count || 0,
        following: followingCount.count || 0,
        reputationScore,
        postCount: postCount.count || 0,
        totalTipsReceived: Number(tipsReceived.total || 0),
        totalReactionsReceived: reactionsReceived.count || 0,
        isVerified: false, // Would need verification system
        createdAt: user.createdAt || new Date(),
        updatedAt: user.createdAt || new Date(),
      };
    } catch (error) {
      safeLogger.error('Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * Get user profile by wallet address
   */
  async getUserProfileByAddress(walletAddress: string): Promise<UserProfile | null> {
    const db = this.databaseService.getDatabase();

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.walletAddress, walletAddress))
        .limit(1);

      if (!user) {
        return null;
      }

      return this.getUserProfile(user.id);
    } catch (error) {
      safeLogger.error('Error fetching user profile by address:', error);
      return null;
    }
  }

  /**
   * Get user profile by handle
   */
  async getUserProfileByHandle(handle: string): Promise<UserProfile | null> {
    const db = this.databaseService.getDatabase();

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.handle, handle))
        .limit(1);

      if (!user) {
        return null;
      }

      return this.getUserProfile(user.id);
    } catch (error) {
      safeLogger.error('Error fetching user profile by handle:', error);
      return null;
    }
  }

  /**
   * Get suggested users based on various algorithms
   */
  async getSuggestedUsers(
    currentUserId: string,
    filters: UserRecommendationFilters = {}
  ): Promise<SuggestedUser[]> {
    const {
      minReputationScore = 100,
      maxResults = 10,
      excludeFollowed = true,
      communityId,
    } = filters;

    const db = this.databaseService.getDatabase();

    try {
      // Get users that current user is already following (to exclude)
      const followedUsers = excludeFollowed
        ? await db
            .select({ id: follows.followingId })
            .from(follows)
            .where(eq(follows.followerId, currentUserId))
        : [];

      const followedUserIds = followedUsers.map(f => f.id);

      // Get users with high activity and reputation
      const candidateUsers = await db
        .select({
          id: users.id,
          handle: users.handle,
          walletAddress: users.walletAddress,
          profileCid: users.profileCid,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(
          and(
            ne(users.id, currentUserId),
            ...(followedUserIds.length > 0 ? [sql`${users.id} NOT IN ${followedUserIds}`] : [])
          )
        )
        .limit(50); // Get more candidates to filter and rank

      // Calculate suggestion scores for each candidate
      const suggestions: SuggestedUser[] = [];

      for (const user of candidateUsers) {
        const profile = await this.getUserProfile(user.id);
        if (!profile || profile.reputationScore < minReputationScore) {
          continue;
        }

        // Calculate mutual connections
        const mutualConnections = await this.getMutualConnectionsCount(
          currentUserId,
          user.id
        );

        // Determine reason for suggestion
        let reasonForSuggestion = 'Active community member';
        if (mutualConnections > 0) {
          reasonForSuggestion = `${mutualConnections} mutual connection${mutualConnections > 1 ? 's' : ''}`;
        } else if (profile.reputationScore > 500) {
          reasonForSuggestion = 'High reputation member';
        } else if (profile.postCount > 10) {
          reasonForSuggestion = 'Active contributor';
        }

        suggestions.push({
          id: user.id,
          handle: profile.handle,
          ens: profile.ens,
          avatarCid: profile.avatarCid,
          followers: profile.followers,
          reputationScore: profile.reputationScore,
          mutualConnections,
          reasonForSuggestion,
        });
      }

      // Sort by suggestion score (mutual connections + reputation + activity)
      suggestions.sort((a, b) => {
        const scoreA = a.mutualConnections * 10 + a.reputationScore + a.followers;
        const scoreB = b.mutualConnections * 10 + b.reputationScore + b.followers;
        return scoreB - scoreA;
      });

      return suggestions.slice(0, maxResults);
    } catch (error) {
      safeLogger.error('Error getting suggested users:', error);
      return [];
    }
  }

  /**
   * Search users by query
   */
  async searchUsers(filters: UserSearchFilters): Promise<UserSearchResult[]> {
    const {
      query,
      minFollowers = 0,
      minReputationScore = 0,
      maxResults = 20,
      sortBy = 'relevance',
    } = filters;

    const db = this.databaseService.getDatabase();

    try {
      // Search users by handle or wallet address
      const searchResults = await db
        .select({
          id: users.id,
          handle: users.handle,
          walletAddress: users.walletAddress,
          profileCid: users.profileCid,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(
          or(
            sql`${users.handle} ILIKE ${`%${query}%`}`,
            sql`${users.walletAddress} ILIKE ${`%${query}%`}`
          )
        )
        .limit(maxResults * 2); // Get more to filter

      const results: UserSearchResult[] = [];

      for (const user of searchResults) {
        const profile = await this.getUserProfile(user.id);
        if (
          !profile ||
          profile.followers < minFollowers ||
          profile.reputationScore < minReputationScore
        ) {
          continue;
        }

        // Calculate match score based on query relevance
        const matchScore = this.calculateMatchScore(query, user.handle || '', user.walletAddress);

        results.push({
          id: user.id,
          handle: profile.handle,
          ens: profile.ens,
          avatarCid: profile.avatarCid,
          followers: profile.followers,
          reputationScore: profile.reputationScore,
          matchScore,
        });
      }

      // Sort results based on sortBy parameter
      results.sort((a, b) => {
        switch (sortBy) {
          case 'followers':
            return b.followers - a.followers;
          case 'reputation':
            return b.reputationScore - a.reputationScore;
          case 'recent':
            return 0; // Would need createdAt comparison
          case 'relevance':
          default:
            return b.matchScore - a.matchScore;
        }
      });

      return results.slice(0, maxResults);
    } catch (error) {
      safeLogger.error('Error searching users:', error);
      return [];
    }
  }

  /**
   * Follow a user
   */
  async followUser(followerId: string, followingId: string): Promise<boolean> {
    if (followerId === followingId) {
      return false;
    }

    const db = this.databaseService.getDatabase();

    try {
      // Check if already following
      const [existingFollow] = await db
        .select()
        .from(follows)
        .where(
          and(
            eq(follows.followerId, followerId),
            eq(follows.followingId, followingId)
          )
        )
        .limit(1);

      if (existingFollow) {
        return false; // Already following
      }

      // Create follow relationship
      await db.insert(follows).values({
        followerId,
        followingId,
        createdAt: new Date(),
      });

      return true;
    } catch (error) {
      safeLogger.error('Error following user:', error);
      return false;
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    const db = this.databaseService.getDatabase();

    try {
      await db
        .delete(follows)
        .where(
          and(
            eq(follows.followerId, followerId),
            eq(follows.followingId, followingId)
          )
        );

      return true;
    } catch (error) {
      safeLogger.error('Error unfollowing user:', error);
      return false;
    }
  }

  /**
   * Get followers of a user
   */
  async getFollowers(userId: string, limit = 50): Promise<UserProfile[]> {
    const db = this.databaseService.getDatabase();

    try {
      const followers = await db
        .select({ followerId: follows.followerId })
        .from(follows)
        .where(eq(follows.followingId, userId))
        .limit(limit);

      const profiles: UserProfile[] = [];
      for (const follower of followers) {
        const profile = await this.getUserProfile(follower.followerId);
        if (profile) {
          profiles.push(profile);
        }
      }

      return profiles;
    } catch (error) {
      safeLogger.error('Error getting followers:', error);
      return [];
    }
  }

  /**
   * Get users that a user is following
   */
  async getFollowing(userId: string, limit = 50): Promise<UserProfile[]> {
    const db = this.databaseService.getDatabase();

    try {
      const following = await db
        .select({ followingId: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, userId))
        .limit(limit);

      const profiles: UserProfile[] = [];
      for (const follow of following) {
        const profile = await this.getUserProfile(follow.followingId);
        if (profile) {
          profiles.push(profile);
        }
      }

      return profiles;
    } catch (error) {
      safeLogger.error('Error getting following:', error);
      return [];
    }
  }

  /**
   * Check if user A is following user B
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const db = this.databaseService.getDatabase();

    try {
      const [follow] = await db
        .select()
        .from(follows)
        .where(
          and(
            eq(follows.followerId, followerId),
            eq(follows.followingId, followingId)
          )
        )
        .limit(1);

      return !!follow;
    } catch (error) {
      safeLogger.error('Error checking follow status:', error);
      return false;
    }
  }

  /**
   * Get trending users based on recent activity
   */
  async getTrendingUsers(limit = 10): Promise<UserProfile[]> {
    const db = this.databaseService.getDatabase();

    try {
      // Get users with recent high activity (posts, reactions, tips)
      const recentActiveUsers = await db
        .select({
          authorId: posts.authorId,
          postCount: count(posts.id),
        })
        .from(posts)
        .where(sql`${posts.createdAt} > NOW() - INTERVAL '7 days'`)
        .groupBy(posts.authorId)
        .orderBy(desc(count(posts.id)))
        .limit(limit * 2);

      const profiles: UserProfile[] = [];
      for (const user of recentActiveUsers) {
        if (user.authorId) {
          const profile = await this.getUserProfile(user.authorId);
          if (profile) {
            profiles.push(profile);
          }
        }
      }

      // Sort by reputation score and recent activity
      profiles.sort((a, b) => {
        const scoreA = a.reputationScore + a.postCount;
        const scoreB = b.reputationScore + b.postCount;
        return scoreB - scoreA;
      });

      return profiles.slice(0, limit);
    } catch (error) {
      safeLogger.error('Error getting trending users:', error);
      return [];
    }
  }

  /**
   * Private helper methods
   */
  private calculateReputationScore(metrics: {
    followers: number;
    posts: number;
    tipsReceived: number;
    reactionsReceived: number;
  }): number {
    const { followers, posts, tipsReceived, reactionsReceived } = metrics;

    // Weighted reputation calculation
    const followerScore = followers * 2;
    const postScore = posts * 5;
    const tipScore = tipsReceived * 10;
    const reactionScore = reactionsReceived * 3;

    return Math.floor(followerScore + postScore + tipScore + reactionScore);
  }

  private calculateMatchScore(query: string, handle: string, walletAddress: string): number {
    const queryLower = query.toLowerCase();
    const handleLower = handle.toLowerCase();
    const addressLower = walletAddress.toLowerCase();

    let score = 0;

    // Exact match gets highest score
    if (handleLower === queryLower) {
      score += 100;
    } else if (handleLower.startsWith(queryLower)) {
      score += 80;
    } else if (handleLower.includes(queryLower)) {
      score += 60;
    }

    // Address match
    if (addressLower.includes(queryLower)) {
      score += 40;
    }

    return score;
  }

  private async getMutualConnectionsCount(userId1: string, userId2: string): Promise<number> {
    const db = this.databaseService.getDatabase();

    try {
      // Get users that both userId1 and userId2 follow
      const [result] = await db
        .select({ count: count() })
        .from(follows)
        .innerJoin(
          sql`(SELECT following_id FROM follows WHERE follower_id = ${userId2}) AS user2_follows`,
          sql`follows.following_id = user2_follows.following_id`
        )
        .where(eq(follows.followerId, userId1));

      return result.count || 0;
    } catch (error) {
      safeLogger.error('Error calculating mutual connections:', error);
      return 0;
    }
  }
}
