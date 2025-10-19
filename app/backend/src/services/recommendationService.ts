import { DatabaseService } from './databaseService';
import { 
  users, 
  communities, 
  communityMembers, 
  communityStats, 
  posts, 
  userInteractions, 
  communityRecommendations, 
  userRecommendations, 
  trendingContent,
  communityEvents,
  eventRsvps
} from '../db/schema';
import { 
  eq, 
  desc, 
  sql, 
  and, 
  or, 
  ne, 
  count, 
  avg, 
  sum, 
  inArray, 
  gt, 
  gte, 
  lte,
  isNull
} from 'drizzle-orm';

export interface CommunityRecommendation {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  tags: string[];
  avatar: string;
  banner: string;
  memberCount: number;
  postCount: number;
  trendingScore: number;
  growthRate: number;
  recommendationScore: number;
  recommendationReason: string;
}

export interface UserRecommendation {
  userId: string;
  walletAddress: string;
  handle: string;
  avatarCid: string;
  reputationScore: number;
  recommendationScore: number;
  reasons: string[];
  mutualConnections: number;
  sharedInterests: string[];
}

export interface TrendingItem {
  id: string;
  type: 'community' | 'post' | 'user' | 'topic';
  title: string;
  score: number;
  rank: number;
  metadata: any;
}

export interface CommunityEvent {
  id: string;
  communityId: string;
  title: string;
  description: string;
  eventType: string;
  startTime: Date;
  endTime: Date;
  location: string;
  isRecurring: boolean;
  maxAttendees: number;
  currentAttendees: number;
  rsvpRequired: boolean;
  rsvpDeadline: Date;
}

export class RecommendationService {
  private databaseService: DatabaseService;

  constructor() {
    this.databaseService = new DatabaseService();
  }

  /**
   * Generate AI-powered community recommendations using collaborative filtering and content-based approaches
   */
  async generateCommunityRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<CommunityRecommendation[]> {
    const db = this.databaseService.getDatabase();

    try {
      // First get the user's wallet address
      const [currentUser] = await db
        .select({ walletAddress: users.walletAddress })
        .from(users)
        .where(eq(users.id, userId));
      
      if (!currentUser) {
        return [];
      }

      // Get user's current communities and their categories/tags
      const userCommunities = await db
        .select({
          communityId: communities.id,
          category: communities.category,
          tags: communities.tags,
        })
        .from(communityMembers)
        .innerJoin(communities, eq(communityMembers.communityId, communities.id))
        .where(
          and(
            eq(communityMembers.userAddress, currentUser.walletAddress),
            eq(communityMembers.isActive, true)
          )
        );

      const userCommunityIds = userCommunities.map(c => c.communityId);
      const userCategories = Array.from(new Set(userCommunities.map(c => c.category)));
      const userTags = userCommunities.reduce((allTags, community) => {
        const tags = community.tags ? JSON.parse(community.tags) : [];
        return [...allTags, ...tags];
      }, [] as string[]);

      // Get user's posting activity to understand interests
      const userPosts = await db
        .select({
          communityId: posts.communityId,
          tags: posts.tags,
        })
        .from(posts)
        .where(eq(posts.authorId, userId))
        .limit(50); // Recent posts to analyze interests

      const postTags = userPosts.reduce((allTags, post) => {
        const tags = post.tags ? JSON.parse(post.tags) : [];
        return [...allTags, ...tags];
      }, [] as string[]);

      const allUserTags = Array.from(new Set([...userTags, ...postTags]));

      // Find communities the user is not a member of
      const recommendations = await db
        .select({
          id: communities.id,
          name: communities.name,
          displayName: communities.displayName,
          description: communities.description,
          category: communities.category,
          tags: communities.tags,
          avatar: communities.avatar,
          banner: communities.banner,
          memberCount: communities.memberCount,
          postCount: communities.postCount,
          createdAt: communities.createdAt,
          trendingScore: communityStats.trendingScore,
          growthRate7d: communityStats.growthRate7d,
        })
        .from(communities)
        .leftJoin(communityStats, eq(communityStats.communityId, communities.id))
        .where(
          and(
            eq(communities.isPublic, true),
            // Exclude communities user is already a member of
            userCommunityIds.length > 0 
              ? sql`${communities.id} NOT IN (${userCommunityIds.map(id => `'${id}'`).join(',')})`
              : sql`1=1`
          )
        )
        .orderBy(desc(communityStats.trendingScore), desc(communities.memberCount));

      // Score recommendations based on user preferences
      const scoredRecommendations = recommendations.map(community => {
        const communityTags = community.tags ? JSON.parse(community.tags) : [];
        
        let score = 0;
        
        // Category match bonus
        if (userCategories.includes(community.category)) {
          score += 20;
        }
        
        // Tag overlap bonus
        const tagOverlap = allUserTags.filter(tag => communityTags.includes(tag)).length;
        score += tagOverlap * 10;
        
        // Trending score bonus
        score += community.trendingScore ? Number(community.trendingScore) * 0.1 : 0;
        
        // Growth rate bonus (growing communities)
        score += community.growthRate7d ? Number(community.growthRate7d) * 5 : 0;
        
        // Member count bonus (but not too large - sweet spot)
        const memberBonus = Math.min(community.memberCount / 100, 10);
        score += memberBonus;
        
        // Post activity bonus
        const postBonus = Math.min(community.postCount / 50, 5);
        score += postBonus;

        // Determine recommendation reason
        let reason = 'Trending community';
        if (tagOverlap > 0) {
          reason = `Matches your interests (${tagOverlap} shared tags)`;
        } else if (userCategories.includes(community.category)) {
          reason = `Similar to your other communities`;
        } else if (community.growthRate7d && Number(community.growthRate7d) > 0.1) {
          reason = 'Fast growing community';
        }

        return {
          id: community.id,
          name: community.name,
          displayName: community.displayName,
          description: community.description || '',
          category: community.category,
          tags: communityTags,
          avatar: community.avatar,
          banner: community.banner,
          memberCount: community.memberCount,
          postCount: community.postCount,
          createdAt: community.createdAt,
          trendingScore: community.trendingScore ? Number(community.trendingScore) : 0,
          growthRate: community.growthRate7d ? Number(community.growthRate7d) : 0,
          recommendationScore: score,
          recommendationReason: reason,
        };
      });

      // Return top recommendations
      return scoredRecommendations
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, limit);
    } catch (error) {
      console.error('Error generating community recommendations:', error);
      throw new Error('Failed to generate community recommendations');
    }
  }

  /**
   * Generate user recommendations using collaborative filtering
   */
  async generateUserRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<UserRecommendation[]> {
    const db = this.databaseService.getDatabase();

    try {
      // First get the user's wallet address
      const [currentUser] = await db
        .select({ walletAddress: users.walletAddress })
        .from(users)
        .where(eq(users.id, userId));
      
      if (!currentUser) {
        return [];
      }

      // Find users with similar community memberships (social graph)
      const similarUsers = await this.findSimilarUsers(userId);
      
      // Get users from similar communities but not yet connected
      const candidateUsers = new Map<string, { 
        userId: string; 
        similarityScore: number; 
        sharedCommunities: number 
      }>();

      for (const similarUser of similarUsers) {
        // Get communities this similar user is in
        const userCommunities = await db
          .select({
            communityId: communityMembers.communityId,
            communityName: communities.name,
            communityDisplayName: communities.displayName,
          })
          .from(communityMembers)
          .innerJoin(communities, eq(communityMembers.communityId, communities.id))
          .where(
            and(
              eq(communityMembers.userAddress, similarUser.userId), // Using wallet address
              eq(communityMembers.isActive, true)
            )
          );

        // Add to candidates
        for (const community of userCommunities) {
          if (!candidateUsers.has(similarUser.userId)) {
            candidateUsers.set(similarUser.userId, {
              userId: similarUser.userId,
              similarityScore: similarUser.similarity,
              sharedCommunities: 1
            });
          } else {
            const existing = candidateUsers.get(similarUser.userId)!;
            candidateUsers.set(similarUser.userId, {
              ...existing,
              sharedCommunities: existing.sharedCommunities + 1
            });
          }
        }
      }

      // Convert to array and score
      const candidates = Array.from(candidateUsers.values());
      
      // Get user interests for content-based filtering
      const userInterests = await this.getUserInterests(userId);
      
      // Score candidates
      const scoredRecommendations: UserRecommendation[] = [];
      
      for (const candidate of candidates) {
        // Get user profile
        const [userProfile] = await db
          .select({
            walletAddress: users.walletAddress,
            handle: users.handle,
            profileCid: users.profileCid,
          })
          .from(users)
          .where(eq(users.walletAddress, candidate.userId)) // Using wallet address
          .limit(1);

        if (!userProfile) continue;

        // Calculate recommendation score
        let score = 0;
        const reasons: string[] = [];
        
        // Social graph similarity score
        score += candidate.similarityScore * 50;
        reasons.push(`${candidate.sharedCommunities} shared communities`);
        
        // Get mutual connections
        const mutualConnections = await this.getMutualConnectionsCount(userId, candidate.userId);
        score += mutualConnections * 10;
        if (mutualConnections > 0) {
          reasons.push(`${mutualConnections} mutual connections`);
        }
        
        // Interest overlap score
        const candidateInterests = await this.getUserInterests(candidate.userId);
        const interestOverlap = this.calculateInterestOverlap(userInterests, candidateInterests);
        score += interestOverlap * 30;
        if (interestOverlap > 0) {
          reasons.push('Similar interests');
        }
        
        // Activity score
        const activityScore = await this.getUserActivityScore(candidate.userId);
        score += activityScore * 0.1;

        scoredRecommendations.push({
          userId: candidate.userId,
          walletAddress: userProfile.walletAddress,
          handle: userProfile.handle || '',
          avatarCid: userProfile.profileCid || '',
          reputationScore: activityScore,
          recommendationScore: score,
          reasons,
          mutualConnections,
          sharedInterests: userInterests.filter(interest => 
            candidateInterests.includes(interest)
          ),
        });
      }

      // Sort by score and return top recommendations
      scoredRecommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);
      return scoredRecommendations.slice(0, limit);
    } catch (error) {
      console.error('Error generating user recommendations:', error);
      throw new Error('Failed to generate user recommendations');
    }
  }

  /**
   * Get trending content across the platform
   */
  async getTrendingContent(
    timeframe: 'hourly' | 'daily' | 'weekly' = 'daily',
    limit: number = 20
  ): Promise<TrendingItem[]> {
    const db = this.databaseService.getDatabase();

    try {
      // Get precomputed trending content
      const trendingItems = await db
        .select({
          id: trendingContent.id,
          contentType: trendingContent.contentType,
          contentId: trendingContent.contentId,
          score: trendingContent.score,
          rank: trendingContent.rank,
          metadata: trendingContent.metadata,
          calculatedAt: trendingContent.calculatedAt,
        })
        .from(trendingContent)
        .where(eq(trendingContent.timeframe, timeframe))
        .orderBy(trendingContent.rank)
        .limit(limit);

      // Transform to returnable format
      return trendingItems.map(item => ({
        id: item.contentId,
        type: item.contentType as 'community' | 'post' | 'user' | 'topic',
        title: this.extractTitleFromMetadata(item.metadata),
        score: Number(item.score),
        rank: item.rank,
        metadata: item.metadata ? JSON.parse(item.metadata) : {},
      }));
    } catch (error) {
      console.error('Error getting trending content:', error);
      throw new Error('Failed to get trending content');
    }
  }

  /**
   * Calculate and update trending scores for all content types
   */
  async calculateTrendingContent(): Promise<void> {
    const db = this.databaseService.getDatabase();

    try {
      // Calculate trending communities
      await this.calculateTrendingCommunities();
      
      // Calculate trending posts (simplified implementation)
      await this.calculateTrendingPosts();
      
      // Calculate trending users (simplified implementation)
      await this.calculateTrendingUsers();
      
      // Calculate trending topics (simplified implementation)
      await this.calculateTrendingTopics();
    } catch (error) {
      console.error('Error calculating trending content:', error);
      throw new Error('Failed to calculate trending content');
    }
  }

  /**
   * Calculate trending communities based on recent activity
   */
  private async calculateTrendingCommunities(): Promise<void> {
    const db = this.databaseService.getDatabase();

    try {
      // Get recent community activity (last 24 hours for daily, last 7 days for weekly)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Calculate daily trending scores
      const dailyTrending = await db
        .select({
          communityId: communities.id,
          name: communities.name,
          displayName: communities.displayName,
          postCount: communities.postCount,
          memberCount: communities.memberCount,
        })
        .from(communities)
        .where(eq(communities.isPublic, true))
        .orderBy(desc(communities.postCount), desc(communities.memberCount))
        .limit(100);

      // Score communities based on activity and growth
      const scoredCommunities = dailyTrending.map(community => {
        // Base score on post count and member count
        let score = (community.postCount * 0.7) + (community.memberCount * 0.3);
        
        // Normalize score (simplified)
        score = Math.min(score / 100, 100);
        
        return {
          ...community,
          score
        };
      });

      // Sort by score and rank
      scoredCommunities.sort((a, b) => b.score - a.score);
      
      // Update trending content table for daily timeframe
      for (let i = 0; i < scoredCommunities.length; i++) {
        const community = scoredCommunities[i];
        
        await db
          .insert(trendingContent)
          .values({
            contentType: 'community',
            contentId: community.communityId,
            score: community.score,
            timeframe: 'daily',
            rank: i + 1,
            metadata: JSON.stringify({
              name: community.name,
              displayName: community.displayName,
              postCount: community.postCount,
              memberCount: community.memberCount
            }),
            calculatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [trendingContent.contentType, trendingContent.contentId, trendingContent.timeframe],
            set: {
              score: community.score,
              rank: i + 1,
              metadata: JSON.stringify({
                name: community.name,
                displayName: community.displayName,
                postCount: community.postCount,
                memberCount: community.memberCount
              }),
              calculatedAt: new Date(),
            }
          });
      }

      // Calculate weekly trending scores
      const weeklyTrending = await db
        .select({
          communityId: communities.id,
          name: communities.name,
          displayName: communities.displayName,
          postCount: communities.postCount,
          memberCount: communities.memberCount,
        })
        .from(communities)
        .leftJoin(communityStats, eq(communities.id, communityStats.communityId))
        .where(eq(communities.isPublic, true))
        .orderBy(desc(communityStats.posts7d), desc(communityStats.activeMembers7d))
        .limit(100);

      // Score communities based on weekly stats
      const weeklyScoredCommunities = weeklyTrending.map(community => {
        // Base score on weekly posts and active members
        let score = (community.postCount * 0.6) + (community.memberCount * 0.4);
        
        // Normalize score (simplified)
        score = Math.min(score / 50, 100);
        
        return {
          ...community,
          score
        };
      });

      // Sort by score and rank
      weeklyScoredCommunities.sort((a, b) => b.score - a.score);
      
      // Update trending content table for weekly timeframe
      for (let i = 0; i < weeklyScoredCommunities.length; i++) {
        const community = weeklyScoredCommunities[i];
        
        await db
          .insert(trendingContent)
          .values({
            contentType: 'community',
            contentId: community.communityId,
            score: community.score,
            timeframe: 'weekly',
            rank: i + 1,
            metadata: JSON.stringify({
              name: community.name,
              displayName: community.displayName,
              postCount: community.postCount,
              memberCount: community.memberCount
            }),
            calculatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [trendingContent.contentType, trendingContent.contentId, trendingContent.timeframe],
            set: {
              score: community.score,
              rank: i + 1,
              metadata: JSON.stringify({
                name: community.name,
                displayName: community.displayName,
                postCount: community.postCount,
                memberCount: community.memberCount
              }),
              calculatedAt: new Date(),
            }
          });
      }
    } catch (error) {
      console.error('Error calculating trending communities:', error);
    }
  }

  /**
   * Calculate trending posts (simplified implementation)
   */
  private async calculateTrendingPosts(): Promise<void> {
    // Simplified implementation - in a real system, this would analyze
    // recent post activity, reactions, views, and engagement
    console.log('Calculating trending posts...');
  }

  /**
   * Calculate trending users (simplified implementation)
   */
  private async calculateTrendingUsers(): Promise<void> {
    // Simplified implementation - in a real system, this would analyze
    // user activity, followers, posts, and engagement
    console.log('Calculating trending users...');
  }

  /**
   * Calculate trending topics (simplified implementation)
   */
  private async calculateTrendingTopics(): Promise<void> {
    // Simplified implementation - in a real system, this would analyze
    // hashtag usage, post tags, and topic mentions
    console.log('Calculating trending topics...');
  }

  /**
   * Get category-based trending communities
   */
  async getTrendingCommunitiesByCategory(
    category: string,
    timeframe: 'daily' | 'weekly' = 'daily',
    limit: number = 10
  ): Promise<CommunityRecommendation[]> {
    const db = this.databaseService.getDatabase();

    try {
      // Get trending communities in the specified category
      const trendingCommunities = await db
        .select({
          id: communities.id,
          name: communities.name,
          displayName: communities.displayName,
          description: communities.description,
          category: communities.category,
          tags: communities.tags,
          avatar: communities.avatar,
          banner: communities.banner,
          memberCount: communities.memberCount,
          postCount: communities.postCount,
          createdAt: communities.createdAt,
        })
        .from(communities)
        .leftJoin(communityStats, eq(communityStats.communityId, communities.id))
        .where(
          and(
            eq(communities.category, category),
            eq(communities.isPublic, true)
          )
        )
        .orderBy(
          timeframe === 'daily' 
            ? desc(communityStats.posts7d) 
            : desc(communityStats.posts30d)
        )
        .limit(limit);

      // Transform to recommendation format
      return trendingCommunities.map(community => ({
        id: community.id,
        name: community.name,
        displayName: community.displayName,
        description: community.description || '',
        category: community.category,
        tags: community.tags ? JSON.parse(community.tags) : [],
        avatar: community.avatar,
        banner: community.banner,
        memberCount: community.memberCount,
        postCount: community.postCount,
        createdAt: community.createdAt,
        trendingScore: 0, // Would be calculated from trendingContent table
        growthRate: 0, // Would be calculated from communityStats
        recommendationScore: community.postCount, // Simple scoring based on post count
        recommendationReason: `Trending in ${category}`,
      }));
    } catch (error) {
      console.error('Error getting trending communities by category:', error);
      throw new Error('Failed to get trending communities by category');
    }
  }

  /**
   * Get emerging communities (new but fast-growing)
   */
  async getEmergingCommunities(limit: number = 10): Promise<CommunityRecommendation[]> {
    const db = this.databaseService.getDatabase();

    try {
      // Get new communities with high growth rates
      const emergingCommunities = await db
        .select({
          id: communities.id,
          name: communities.name,
          displayName: communities.displayName,
          description: communities.description,
          category: communities.category,
          tags: communities.tags,
          avatar: communities.avatar,
          banner: communities.banner,
          memberCount: communities.memberCount,
          postCount: communities.postCount,
          createdAt: communities.createdAt,
          growthRate7d: communityStats.growthRate7d,
        })
        .from(communities)
        .leftJoin(communityStats, eq(communityStats.communityId, communities.id))
        .where(
          and(
            eq(communities.isPublic, true),
            sql`${communityStats.growthRate7d} >= 0.1` // At least 10% growth rate
          )
        )
        .orderBy(desc(communityStats.growthRate7d))
        .limit(limit);

      // Transform to recommendation format
      return emergingCommunities.map(community => ({
        id: community.id,
        name: community.name,
        displayName: community.displayName,
        description: community.description || '',
        category: community.category,
        tags: community.tags ? JSON.parse(community.tags) : [],
        avatar: community.avatar,
        banner: community.banner,
        memberCount: community.memberCount,
        postCount: community.postCount,
        createdAt: community.createdAt,
        trendingScore: 0, // Would be calculated from trendingContent table
        growthRate: community.growthRate7d ? Number(community.growthRate7d) : 0,
        recommendationScore: community.growthRate7d ? Number(community.growthRate7d) * 100 : 0,
        recommendationReason: 'Fast growing emerging community',
      }));
    } catch (error) {
      console.error('Error getting emerging communities:', error);
      throw new Error('Failed to get emerging communities');
    }
  }

  /**
   * Calculate collaborative filtering score for communities
   */
  private async calculateCommunityCollaborativeScore(
    currentUserId: string,
    candidateCommunityId: string
  ): Promise<number> {
    // Base score from similarity with other users
    let score = 0;

    // Boost for community activity
    const db = this.databaseService.getDatabase();
    const [communityStatsResult] = await db
      .select({
        memberCount: communities.memberCount,
        postCount: communities.postCount,
      })
      .from(communities)
      .where(eq(communities.id, candidateCommunityId))
      .limit(1);

    if (communityStatsResult) {
      score += communityStatsResult.memberCount * 0.1;
      score += communityStatsResult.postCount * 0.05;
    }

    return score;
  }

  /**
   * Find users with similar following patterns (social graph analysis)
   */
  private async findSimilarUsers(currentUserId: string): Promise<Array<{ userId: string; similarity: number }>> {
    const db = this.databaseService.getDatabase();

    try {
      // First get the user's wallet address
      const [currentUser] = await db
        .select({ walletAddress: users.walletAddress })
        .from(users)
        .where(eq(users.id, currentUserId));
      
      if (!currentUser) {
        return [];
      }

      // Get communities that current user is a member of
      const userCommunities = await db
        .select({ communityId: communityMembers.communityId })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.userAddress, currentUser.walletAddress),
            eq(communityMembers.isActive, true)
          )
        );

      const userCommunityIds = userCommunities.map(c => c.communityId);

      if (userCommunityIds.length === 0) {
        return [];
      }

      // Find other users who are members of similar communities
      const similarUsers = await db
        .select({
          userAddress: communityMembers.userAddress,
          commonCommunities: count(communityMembers.communityId),
        })
        .from(communityMembers)
        .where(
          and(
            inArray(communityMembers.communityId, userCommunityIds),
            ne(communityMembers.userAddress, currentUser.walletAddress),
            eq(communityMembers.isActive, true)
          )
        )
        .groupBy(communityMembers.userAddress)
        .having(sql`count(${communityMembers.communityId}) >= 1`) // At least 1 common community
        .orderBy(desc(count(communityMembers.communityId)))
        .limit(50);

      // Get user IDs for these wallet addresses
      const walletAddresses = similarUsers.map(u => u.userAddress);
      const userRecords = await db
        .select({ id: users.id, walletAddress: users.walletAddress })
        .from(users)
        .where(inArray(users.walletAddress, walletAddresses));

      const userMap = new Map(userRecords.map(u => [u.walletAddress, u.id]));

      // Calculate similarity scores based on Jaccard similarity
      return similarUsers.map(user => ({
        userId: userMap.get(user.userAddress) || user.userAddress, // fallback to wallet address if ID not found
        similarity: user.commonCommunities / userCommunityIds.length,
      }));
    } catch (error) {
      console.error('Error finding similar users:', error);
      return [];
    }
  }

  /**
   * Get mutual connections count between two users
   */
  private async getMutualConnectionsCount(userId1: string, userId2: string): Promise<number> {
    const db = this.databaseService.getDatabase();

    try {
      // Get wallet addresses for both users
      const [user1, user2] = await Promise.all([
        db
          .select({ walletAddress: users.walletAddress })
          .from(users)
          .where(eq(users.id, userId1))
          .limit(1),
        db
          .select({ walletAddress: users.walletAddress })
          .from(users)
          .where(eq(users.id, userId2))
          .limit(1)
      ]);

      if (!user1[0] || !user2[0]) {
        return 0;
      }

      // Get communities for both users
      const [user1Communities, user2Communities] = await Promise.all([
        db
          .select({ communityId: communityMembers.communityId })
          .from(communityMembers)
          .where(
            and(
              eq(communityMembers.userAddress, user1[0].walletAddress),
              eq(communityMembers.isActive, true)
            )
          ),
        db
          .select({ communityId: communityMembers.communityId })
          .from(communityMembers)
          .where(
            and(
              eq(communityMembers.userAddress, user2[0].walletAddress),
              eq(communityMembers.isActive, true)
            )
          )
      ]);

      const user1CommunityIds = new Set(user1Communities.map(c => c.communityId));
      const user2CommunityIds = new Set(user2Communities.map(c => c.communityId));

      // Count mutual communities
      let mutualCount = 0;
      for (const communityId of user1CommunityIds) {
        if (user2CommunityIds.has(communityId)) {
          mutualCount++;
        }
      }

      return mutualCount;
    } catch (error) {
      console.error('Error calculating mutual connections:', error);
      return 0;
    }
  }

  /**
   * Get user interests from their activity
   */
  private async getUserInterests(userId: string): Promise<string[]> {
    const db = this.databaseService.getDatabase();

    try {
      // Get interests from post tags
      const postTags = await db
        .select({ tags: posts.tags })
        .from(posts)
        .where(eq(posts.authorId, userId))
        .limit(50);

      const interests = new Set<string>();
      
      for (const post of postTags) {
        if (post.tags) {
          try {
            const tags = JSON.parse(post.tags);
            if (Array.isArray(tags)) {
              tags.forEach(tag => interests.add(tag.toLowerCase()));
            }
          } catch (error) {
            // Ignore parsing errors
          }
        }
      }

      return Array.from(interests).slice(0, 10);
    } catch (error) {
      console.error('Error getting user interests:', error);
      return [];
    }
  }

  /**
   * Find users by interests
   */
  private async findUsersByInterests(
    interests: string[],
    excludeUserId: string
  ): Promise<Array<{
    userId: string;
    reputationScore: number;
  }>> {
    const db = this.databaseService.getDatabase();

    try {
      if (interests.length === 0) {
        return [];
      }

      // Find users who have posted with similar tags
      const candidates = await db
        .select({
          authorId: posts.authorId,
          postCount: count(posts.id),
        })
        .from(posts)
        .where(
          and(
            ne(posts.authorId, excludeUserId),
            sql`${posts.tags} IS NOT NULL`
          )
        )
        .groupBy(posts.authorId)
        .orderBy(desc(count(posts.id)))
        .limit(100);

      return candidates
        .filter(candidate => candidate.authorId)
        .map(candidate => ({
          userId: candidate.authorId,
          reputationScore: candidate.postCount || 0,
        }));
    } catch (error) {
      console.error('Error finding users by interests:', error);
      return [];
    }
  }

  /**
   * Calculate user recommendation score
   */
  private async calculateUserRecommendationScore(
    currentUserId: string,
    candidateUserId: string,
    interests: string[]
  ): Promise<number> {
    let score = 0;

    // Interest overlap score
    const candidateInterests = await this.getUserInterests(candidateUserId);
    const interestOverlap = this.calculateInterestOverlap(interests, candidateInterests);
    score += interestOverlap * 100;

    // Activity score
    const activityScore = await this.getUserActivityScore(candidateUserId);
    score += activityScore * 0.05;

    return score;
  }

  /**
   * Calculate user activity score
   */
  private async getUserActivityScore(userId: string): Promise<number> {
    const db = this.databaseService.getDatabase();

    try {
      // Calculate activity score based on posts and interactions
      const [postCount] = await db
        .select({ count: count() })
        .from(posts)
        .where(eq(posts.authorId, userId));

      return postCount.count || 0;
    } catch (error) {
      console.error('Error calculating activity score:', error);
      return 0;
    }
  }

  /**
   * Calculate interest overlap using Jaccard similarity
   */
  private calculateInterestOverlap(interests1: string[], interests2: string[]): number {
    if (interests1.length === 0 || interests2.length === 0) {
      return 0;
    }

    const set1 = new Set(interests1.map(i => i.toLowerCase()));
    const set2 = new Set(interests2.map(i => i.toLowerCase()));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  /**
   * Extract title from metadata
   */
  private extractTitleFromMetadata(metadata: string | null): string {
    if (!metadata) return 'Untitled';
    
    try {
      const meta = JSON.parse(metadata);
      return meta.title || meta.name || 'Untitled';
    } catch (error) {
      return 'Untitled';
    }
  }

  /**
   * Record user interaction for recommendation training
   */
  async recordUserInteraction(
    userId: string,
    targetType: 'community' | 'post' | 'user',
    targetId: string,
    interactionType: 'view' | 'join' | 'follow' | 'like' | 'comment' | 'share',
    interactionValue: number = 1.0,
    metadata: any = {}
  ): Promise<void> {
    const db = this.databaseService.getDatabase();

    try {
      await db.insert(userInteractions).values({
        userId,
        targetType,
        targetId,
        interactionType,
        interactionValue,
        metadata: JSON.stringify(metadata),
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Error recording user interaction:', error);
      // Don't throw error as this is for analytics only
    }
  }

  /**
   * Precompute and store community recommendations
   */
  async precomputeCommunityRecommendations(userId: string): Promise<void> {
    try {
      const recommendations = await this.generateCommunityRecommendations(userId, 20);
      
      const db = this.databaseService.getDatabase();
      
      // Clear existing recommendations for this user
      await db
        .delete(communityRecommendations)
        .where(eq(communityRecommendations.userId, userId));
      
      // Insert new recommendations
      if (recommendations.length > 0) {
        await db.insert(communityRecommendations).values(
          recommendations.map(rec => ({
            userId,
            communityId: rec.id,
            score: rec.recommendationScore,
            reasons: JSON.stringify([rec.recommendationReason]),
            algorithmVersion: 'v1.0',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expire in 24 hours
            createdAt: new Date(),
            updatedAt: new Date(),
          }))
        );
      }
    } catch (error) {
      console.error('Error precomputing community recommendations:', error);
    }
  }

  /**
   * Precompute and store user recommendations
   */
  async precomputeUserRecommendations(userId: string): Promise<void> {
    try {
      const recommendations = await this.generateUserRecommendations(userId, 20);
      
      const db = this.databaseService.getDatabase();
      
      // Clear existing recommendations for this user
      await db
        .delete(userRecommendations)
        .where(eq(userRecommendations.userId, userId));
      
      // Insert new recommendations
      if (recommendations.length > 0) {
        await db.insert(userRecommendations).values(
          recommendations.map(rec => ({
            userId,
            recommendedUserId: rec.userId,
            score: rec.recommendationScore,
            reasons: JSON.stringify(rec.reasons),
            mutualConnections: rec.mutualConnections,
            sharedInterests: JSON.stringify(rec.sharedInterests),
            algorithmVersion: 'v1.0',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expire in 24 hours
            createdAt: new Date(),
            updatedAt: new Date(),
          }))
        );
      }
    } catch (error) {
      console.error('Error precomputing user recommendations:', error);
    }
  }

  /**
   * Get precomputed community recommendations for a user
   */
  async getPrecomputedCommunityRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<CommunityRecommendation[]> {
    const db = this.databaseService.getDatabase();

    try {
      // Get precomputed recommendations
      const precomputed = await db
        .select({
          communityId: communityRecommendations.communityId,
          score: communityRecommendations.score,
          reasons: communityRecommendations.reasons,
        })
        .from(communityRecommendations)
        .where(
          and(
            eq(communityRecommendations.userId, userId),
            or(
              isNull(communityRecommendations.expiresAt),
              gt(communityRecommendations.expiresAt, new Date())
            )
          )
        )
        .orderBy(desc(communityRecommendations.score))
        .limit(limit);

      if (precomputed.length === 0) {
        // If no precomputed recommendations, generate new ones
        return await this.generateCommunityRecommendations(userId, limit);
      }

      // Get community details
      const communityIds = precomputed.map(rec => rec.communityId);
      const communitiesResult = await db
        .select({
          id: communities.id,
          name: communities.name,
          displayName: communities.displayName,
          description: communities.description,
          category: communities.category,
          tags: communities.tags,
          avatar: communities.avatar,
          banner: communities.banner,
          memberCount: communities.memberCount,
          postCount: communities.postCount,
          createdAt: communities.createdAt,
          trendingScore: communityStats.trendingScore,
          growthRate7d: communityStats.growthRate7d,
        })
        .from(communities)
        .leftJoin(communityStats, eq(communityStats.communityId, communities.id))
        .where(inArray(communities.id, communityIds));

      // Combine recommendations with community details
      return precomputed.map(rec => {
        const community = communitiesResult.find(c => c.id === rec.communityId);
        if (!community) return null;

        const reasons = rec.reasons ? JSON.parse(rec.reasons) : ['Recommended for you'];

        return {
          id: community.id,
          name: community.name,
          displayName: community.displayName,
          description: community.description || '',
          category: community.category,
          tags: community.tags ? JSON.parse(community.tags) : [],
          avatar: community.avatar,
          banner: community.banner,
          memberCount: community.memberCount,
          postCount: community.postCount,
          createdAt: community.createdAt,
          trendingScore: community.trendingScore ? Number(community.trendingScore) : 0,
          growthRate: community.growthRate7d ? Number(community.growthRate7d) : 0,
          recommendationScore: Number(rec.score),
          recommendationReason: reasons[0] || 'Recommended for you',
        };
      }).filter(Boolean) as CommunityRecommendation[];
    } catch (error) {
      console.error('Error getting precomputed community recommendations:', error);
      // Fallback to generating new recommendations
      return await this.generateCommunityRecommendations(userId, limit);
    }
  }

  /**
   * Get precomputed user recommendations for a user
   */
  async getPrecomputedUserRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<UserRecommendation[]> {
    const db = this.databaseService.getDatabase();

    try {
      // Get precomputed recommendations
      const precomputed = await db
        .select({
          recommendedUserId: userRecommendations.recommendedUserId,
          score: userRecommendations.score,
          reasons: userRecommendations.reasons,
          mutualConnections: userRecommendations.mutualConnections,
          sharedInterests: userRecommendations.sharedInterests,
        })
        .from(userRecommendations)
        .where(
          and(
            eq(userRecommendations.userId, userId),
            or(
              isNull(userRecommendations.expiresAt),
              gt(userRecommendations.expiresAt, new Date())
            )
          )
        )
        .orderBy(desc(userRecommendations.score))
        .limit(limit);

      if (precomputed.length === 0) {
        // If no precomputed recommendations, generate new ones
        return await this.generateUserRecommendations(userId, limit);
      }

      // Get user details
      const userIds = precomputed.map(rec => rec.recommendedUserId);
      const usersResult = await db
        .select({
          id: users.id,
          walletAddress: users.walletAddress,
          handle: users.handle,
          profileCid: users.profileCid,
        })
        .from(users)
        .where(inArray(users.id, userIds));

      // Combine recommendations with user details
      return precomputed.map(rec => {
        const user = usersResult.find(u => u.id === rec.recommendedUserId);
        if (!user) return null;

        const reasons = rec.reasons ? JSON.parse(rec.reasons) : ['Recommended for you'];
        const sharedInterests = rec.sharedInterests ? JSON.parse(rec.sharedInterests) : [];

        return {
          userId: user.id,
          walletAddress: user.walletAddress,
          handle: user.handle || '',
          avatarCid: user.profileCid || '',
          reputationScore: 0, // Would be calculated from reputation service
          recommendationScore: Number(rec.score),
          reasons,
          mutualConnections: rec.mutualConnections || 0,
          sharedInterests,
        };
      }).filter(Boolean) as UserRecommendation[];
    } catch (error) {
      console.error('Error getting precomputed user recommendations:', error);
      // Fallback to generating new recommendations
      return await this.generateUserRecommendations(userId, limit);
    }
  }

  /**
   * Get friend-of-friend recommendations
   */
  async getFriendOfFriendRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<UserRecommendation[]> {
    const db = this.databaseService.getDatabase();

    try {
      // This is a simplified version - in a real implementation with a follows table,
      // we would find friends of friends who the user doesn't already follow
      
      // For now, we'll use community-based indirect connections as a proxy
      return await this.generateUserRecommendations(userId, limit);
    } catch (error) {
      console.error('Error getting friend-of-friend recommendations:', error);
      return [];
    }
  }

  /**
   * Analyze community overlap between users
   */
  private async analyzeCommunityOverlap(
    userId1: string,
    userId2: string
  ): Promise<{ overlapScore: number; sharedCommunities: string[] }> {
    const db = this.databaseService.getDatabase();

    try {
      // Get wallet addresses for both users
      const [user1, user2] = await Promise.all([
        db
          .select({ walletAddress: users.walletAddress })
          .from(users)
          .where(eq(users.id, userId1))
          .limit(1),
        db
          .select({ walletAddress: users.walletAddress })
          .from(users)
          .where(eq(users.id, userId2))
          .limit(1)
      ]);

      if (!user1[0] || !user2[0]) {
        return { overlapScore: 0, sharedCommunities: [] };
      }

      // Get communities for both users
      const [user1Communities, user2Communities] = await Promise.all([
        db
          .select({
            communityId: communities.id,
            communityName: communities.name,
            communityDisplayName: communities.displayName,
          })
          .from(communityMembers)
          .innerJoin(communities, eq(communityMembers.communityId, communities.id))
          .where(
            and(
              eq(communityMembers.userAddress, user1[0].walletAddress),
              eq(communityMembers.isActive, true)
            )
          ),
        db
          .select({
            communityId: communities.id,
            communityName: communities.name,
            communityDisplayName: communities.displayName,
          })
          .from(communityMembers)
          .innerJoin(communities, eq(communityMembers.communityId, communities.id))
          .where(
            and(
              eq(communityMembers.userAddress, user2[0].walletAddress),
              eq(communityMembers.isActive, true)
            )
          )
      ]);

      const user1CommunityMap = new Map(user1Communities.map(c => [c.communityId, c]));
      const sharedCommunities: string[] = [];

      // Find shared communities
      for (const community of user2Communities) {
        if (user1CommunityMap.has(community.communityId)) {
          sharedCommunities.push(community.communityDisplayName || community.communityName);
        }
      }

      // Calculate overlap score (Jaccard similarity)
      const unionSize = user1Communities.length + user2Communities.length - sharedCommunities.length;
      const overlapScore = unionSize > 0 ? sharedCommunities.length / unionSize : 0;

      return { overlapScore, sharedCommunities };
    } catch (error) {
      console.error('Error analyzing community overlap:', error);
      return { overlapScore: 0, sharedCommunities: [] };
    }
  }

  /**
   * Get event attendee count
   */
  private async getEventAttendeeCount(eventId: string): Promise<number> {
    const db = this.databaseService.getDatabase();

    try {
      const [result] = await db
        .select({ count: sum(eventRsvps.attendeesCount) })
        .from(eventRsvps)
        .where(
          and(
            eq(eventRsvps.eventId, eventId),
            eq(eventRsvps.status, 'confirmed')
          )
        );

      return result?.count ? Number(result.count) : 0;
    } catch (error) {
      console.error('Error getting event attendee count:', error);
      return 0;
    }
  }

  /**
   * Get upcoming events for a community
   */
  async getCommunityEvents(
    communityId: string,
    limit: number = 20
  ): Promise<CommunityEvent[]> {
    const db = this.databaseService.getDatabase();

    try {
      const events = await db
        .select({
          id: communityEvents.id,
          communityId: communityEvents.communityId,
          title: communityEvents.title,
          description: communityEvents.description,
          eventType: communityEvents.eventType,
          startTime: communityEvents.startTime,
          endTime: communityEvents.endTime,
          location: communityEvents.location,
          isRecurring: communityEvents.isRecurring,
          maxAttendees: communityEvents.maxAttendees,
          rsvpRequired: communityEvents.rsvpRequired,
          rsvpDeadline: communityEvents.rsvpDeadline,
        })
        .from(communityEvents)
        .where(
          and(
            eq(communityEvents.communityId, communityId),
            gte(communityEvents.startTime, new Date()) // Only future events
          )
        )
        .orderBy(communityEvents.startTime)
        .limit(limit);

      // Add attendee counts
      const eventsWithAttendees = await Promise.all(
        events.map(async (event) => {
          const attendeeCount = await this.getEventAttendeeCount(event.id);
          return {
            ...event,
            currentAttendees: attendeeCount,
          };
        })
      );

      return eventsWithAttendees;
    } catch (error) {
      console.error('Error getting community events:', error);
      throw new Error('Failed to get community events');
    }
  }

  /**
   * Create a new community event
   */
  async createCommunityEvent(
    eventData: {
      communityId: string;
      title: string;
      description: string;
      eventType: string;
      startTime: Date;
      endTime?: Date;
      location?: string;
      isRecurring?: boolean;
      recurrencePattern?: string;
      maxAttendees?: number;
      rsvpRequired?: boolean;
      rsvpDeadline?: Date;
      metadata?: any;
    }
  ): Promise<CommunityEvent> {
    const db = this.databaseService.getDatabase();

    try {
      const [newEvent] = await db
        .insert(communityEvents)
        .values({
          communityId: eventData.communityId,
          title: eventData.title,
          description: eventData.description,
          eventType: eventData.eventType,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          location: eventData.location,
          isRecurring: eventData.isRecurring || false,
          recurrencePattern: eventData.recurrencePattern,
          maxAttendees: eventData.maxAttendees,
          rsvpRequired: eventData.rsvpRequired || false,
          rsvpDeadline: eventData.rsvpDeadline,
          metadata: eventData.metadata ? JSON.stringify(eventData.metadata) : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Get current attendee count
      const attendeeCount = await this.getEventAttendeeCount(newEvent.id);

      return {
        id: newEvent.id,
        communityId: newEvent.communityId,
        title: newEvent.title,
        description: newEvent.description,
        eventType: newEvent.eventType,
        startTime: newEvent.startTime,
        endTime: newEvent.endTime || undefined,
        location: newEvent.location || '',
        isRecurring: newEvent.isRecurring || false,
        maxAttendees: newEvent.maxAttendees || 0,
        currentAttendees: attendeeCount,
        rsvpRequired: newEvent.rsvpRequired || false,
        rsvpDeadline: newEvent.rsvpDeadline || undefined,
      };
    } catch (error) {
      console.error('Error creating community event:', error);
      throw new Error('Failed to create community event');
    }
  }
}