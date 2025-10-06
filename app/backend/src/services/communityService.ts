import { db } from '../db';
import { posts, users } from '../db/schema';
import { eq, desc, asc, and, or, like, inArray, sql, gt } from 'drizzle-orm';
import { feedService } from './feedService';

interface ListCommunitiesOptions {
  page: number;
  limit: number;
  category?: string;
  search?: string;
  sort: string;
  tags: string[];
}

interface CreateCommunityData {
  creatorAddress: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  tags: string[];
  isPublic: boolean;
  iconUrl?: string;
  bannerUrl?: string;
  rules: any[];
  governanceEnabled: boolean;
  stakingRequired: boolean;
  minimumStake: number;
}

interface UpdateCommunityData {
  communityId: string;
  userAddress: string;
  updateData: any;
}

interface JoinCommunityData {
  communityId: string;
  userAddress: string;
}

interface CreateCommunityPostData {
  communityId: string;
  authorAddress: string;
  content: string;
  mediaUrls: string[];
  tags: string[];
  pollData?: any;
}

interface ModerationData {
  communityId: string;
  moderatorAddress: string;
  action: string;
  targetId: string;
  reason?: string;
}

interface GovernanceProposalData {
  communityId: string;
  proposerAddress: string;
  title: string;
  description: string;
  type: string;
  votingDuration: number;
  requiredStake: number;
}

interface VoteData {
  communityId: string;
  proposalId: string;
  voterAddress: string;
  vote: string;
  stakeAmount: number;
}

export class CommunityService {
  // List communities with filtering (using dao field from posts)
  async listCommunities(options: ListCommunitiesOptions) {
    const { page, limit, category, search, sort, tags } = options;
    const offset = (page - 1) * limit;

    try {
      // Get unique DAOs from posts with post counts
      const communityList = await db
        .select({
          name: posts.dao,
          postCount: sql<number>`COUNT(*)`,
          latestPost: sql<Date>`MAX(${posts.createdAt})`
        })
        .from(posts)
        .where(sql`${posts.dao} IS NOT NULL AND ${posts.dao} != ''`)
        .groupBy(posts.dao)
        .orderBy(desc(sql<number>`COUNT(*)`))
        .limit(limit)
        .offset(offset);

      // Transform to match expected format
      const communities = communityList.map(item => ({
        id: item.name,
        name: item.name,
        displayName: item.name,
        description: `Community for ${item.name}`,
        category: 'general',
        tags: [],
        iconUrl: null,
        bannerUrl: null,
        memberCount: 0, // Would need separate tracking
        postCount: item.postCount,
        createdAt: item.latestPost,
        governanceEnabled: false
      }));

      return {
        communities,
        pagination: {
          page,
          limit,
          total: communities.length,
          totalPages: Math.ceil(communities.length / limit)
        }
      };
    } catch (error) {
      console.error('Error listing communities:', error);
      throw new Error('Failed to list communities');
    }
  }

  // Get trending communities
  async getTrendingCommunities(options: { page: number; limit: number; timeRange: string }) {
    const { page, limit, timeRange } = options;
    const offset = (page - 1) * limit;

    try {
      // Get trending communities based on recent post activity
      const timeFilter = this.buildTimeFilter(timeRange);
      
      const trendingCommunities = await db
        .select({
          name: posts.dao,
          postCount: sql<number>`COUNT(*)`,
          latestPost: sql<Date>`MAX(${posts.createdAt})`
        })
        .from(posts)
        .where(and(
          sql`${posts.dao} IS NOT NULL AND ${posts.dao} != ''`,
          timeFilter
        ))
        .groupBy(posts.dao)
        .orderBy(desc(sql<number>`COUNT(*)`))
        .limit(limit)
        .offset(offset);

      // Transform to match expected format
      const communities = trendingCommunities.map(item => ({
        id: item.name,
        name: item.name,
        displayName: item.name,
        description: `Community for ${item.name}`,
        category: 'general',
        iconUrl: null,
        memberCount: 0, // Would need separate tracking
        postCount: item.postCount,
        createdAt: item.latestPost
      }));

      return {
        communities,
        pagination: {
          page,
          limit,
          total: communities.length
        }
      };
    } catch (error) {
      console.error('Error getting trending communities:', error);
      throw new Error('Failed to get trending communities');
    }
  }

  // Get community details
  async getCommunityDetails(communityId: string, userAddress?: string) {
    try {
      // Get community info from posts with that DAO name
      const communityPosts = await db
        .select({
          postCount: sql<number>`COUNT(*)`,
          latestPost: sql<Date>`MAX(${posts.createdAt})`,
          firstPost: sql<Date>`MIN(${posts.createdAt})`
        })
        .from(posts)
        .where(eq(posts.dao, communityId))
        .groupBy(posts.dao);

      if (communityPosts.length === 0) {
        return null;
      }

      const communityData = {
        id: communityId,
        name: communityId,
        displayName: communityId,
        description: `Community for ${communityId}`,
        category: 'general',
        tags: [],
        iconUrl: null,
        bannerUrl: null,
        memberCount: 0, // Would need separate tracking
        postCount: communityPosts[0].postCount,
        createdAt: communityPosts[0].firstPost,
        governanceEnabled: false,
        isMember: false, // Would need membership tracking
        memberRole: null
      };

      return communityData;
    } catch (error) {
      console.error('Error getting community details:', error);
      throw new Error('Failed to get community details');
    }
  }

  // Create new community (simplified - no communities table)
  async createCommunity(data: CreateCommunityData) {
    // For now, return a mock community since communities table doesn't exist
    // This would need proper implementation when communities table is added
    const mockCommunity = {
      id: data.name,
      name: data.name,
      displayName: data.displayName,
      description: data.description,
      category: data.category,
      tags: data.tags,
      isPublic: data.isPublic,
      iconUrl: data.iconUrl,
      bannerUrl: data.bannerUrl,
      memberCount: 1,
      postCount: 0,
      createdAt: new Date(),
      governanceEnabled: data.governanceEnabled
    };

    return mockCommunity;
  }

  // Update community (simplified)
  async updateCommunity(data: UpdateCommunityData) {
    // For now, return null since communities table doesn't exist
    // This would need proper implementation when communities table is added
    return null;
  }

  // Join community (simplified)
  async joinCommunity(data: JoinCommunityData) {
    // For now, return success since we don't have membership tracking
    // This would need proper implementation when communities table is added
    return { 
      success: true, 
      data: {
        communityId: data.communityId,
        userAddress: data.userAddress,
        role: 'member',
        joinedAt: new Date()
      }
    };
  }

  // Leave community (simplified)
  async leaveCommunity(data: JoinCommunityData) {
    // For now, return success since we don't have membership tracking
    // This would need proper implementation when communities table is added
    return { success: true, data: null };
  }

  // Get community posts
  async getCommunityPosts(options: {
    communityId: string;
    page: number;
    limit: number;
    sort: string;
    timeRange: string;
  }) {
    const { communityId, page, limit, sort, timeRange } = options;

    try {
      // Use feedService to get posts filtered by community
      const feedOptions = {
        userAddress: '', // Not needed for community posts
        page,
        limit,
        sort,
        communities: [communityId],
        timeRange
      };

      return await feedService.getEnhancedFeed(feedOptions);
    } catch (error) {
      console.error('Error getting community posts:', error);
      throw new Error('Failed to get community posts');
    }
  }

  // Create post in community
  async createCommunityPost(data: CreateCommunityPostData) {
    const { communityId, authorAddress, content, mediaUrls, tags, pollData } = data;

    try {
      // Check if user is a member of the community
      const membership = await db
        .select()
        .from(communityMembers)
        .where(and(
          eq(communityMembers.communityId, communityId),
          eq(communityMembers.userAddress, authorAddress)
        ))
        .limit(1);

      if (membership.length === 0) {
        return { success: false, message: 'Must be a member to post in this community' };
      }

      // Create post using feedService
      const post = await feedService.createPost({
        authorAddress,
        content,
        communityId,
        mediaUrls,
        tags,
        pollData
      });

      return { success: true, data: post };
    } catch (error) {
      console.error('Error creating community post:', error);
      throw new Error('Failed to create community post');
    }
  }

  // Get community members (simplified)
  async getCommunityMembers(options: {
    communityId: string;
    page: number;
    limit: number;
    role?: string;
  }) {
    // For now, return empty members since we don't have membership tracking
    // This would need proper implementation when communities table is added
    return {
      members: [],
      pagination: {
        page: options.page,
        limit: options.limit,
        total: 0
      }
    };
  }

  // Get community statistics
  async getCommunityStats(communityId: string) {
    try {
      // Get stats from posts with that DAO name
      const stats = await db
        .select({
          postCount: sql<number>`COUNT(*)`,
          latestPost: sql<Date>`MAX(${posts.createdAt})`,
          firstPost: sql<Date>`MIN(${posts.createdAt})`
        })
        .from(posts)
        .where(eq(posts.dao, communityId))
        .groupBy(posts.dao);

      if (stats.length === 0) {
        return null;
      }

      return {
        memberCount: 0, // Would need membership tracking
        postCount: stats[0].postCount,
        createdAt: stats[0].firstPost,
        activeMembers: 0,
        postsThisWeek: 0, // Would need time-based query
        growthRate: 0
      };
    } catch (error) {
      console.error('Error getting community stats:', error);
      throw new Error('Failed to get community stats');
    }
  }

  // Moderate content (simplified)
  async moderateContent(data: ModerationData) {
    // For now, return success without actual moderation
    // This would need proper implementation when moderation system is added
    const moderationResult = {
      action: data.action,
      targetId: data.targetId,
      reason: data.reason,
      moderatorAddress: data.moderatorAddress,
      timestamp: new Date()
    };

    return { success: true, data: moderationResult };
  }

  // Get governance proposals (simplified)
  async getGovernanceProposals(options: {
    communityId: string;
    page: number;
    limit: number;
    status?: string;
  }) {
    // This would need a governance proposals table
    // For now, return empty array
    return {
      proposals: [],
      pagination: {
        page: options.page,
        limit: options.limit,
        total: 0,
        totalPages: 0
      }
    };
  }

  // Create governance proposal (simplified)
  async createGovernanceProposal(data: GovernanceProposalData) {
    // This would need governance implementation
    return { success: false, message: 'Governance not implemented yet' };
  }

  // Vote on proposal (simplified)
  async voteOnProposal(data: VoteData) {
    // This would need governance implementation
    return { success: false, message: 'Governance not implemented yet' };
  }

  // Search communities
  async searchCommunities(options: {
    query: string;
    page: number;
    limit: number;
    category?: string;
  }) {
    const { query, page, limit } = options;
    const offset = (page - 1) * limit;

    try {
      // Search communities by DAO name from posts
      const searchResults = await db
        .select({
          name: posts.dao,
          postCount: sql<number>`COUNT(*)`,
          latestPost: sql<Date>`MAX(${posts.createdAt})`
        })
        .from(posts)
        .where(and(
          sql`${posts.dao} IS NOT NULL AND ${posts.dao} != ''`,
          sql`LOWER(${posts.dao}) LIKE LOWER(${'%' + query + '%'})`
        ))
        .groupBy(posts.dao)
        .orderBy(desc(sql<number>`COUNT(*)`))
        .limit(limit)
        .offset(offset);

      // Transform to match expected format
      const communities = searchResults.map(item => ({
        id: item.name,
        name: item.name,
        displayName: item.name,
        description: `Community for ${item.name}`,
        category: 'general',
        iconUrl: null,
        memberCount: 0,
        postCount: item.postCount
      }));

      return {
        communities,
        pagination: {
          page,
          limit,
          total: communities.length
        }
      };
    } catch (error) {
      console.error('Error searching communities:', error);
      throw new Error('Failed to search communities');
    }
  }

  // Helper method to build time filter
  private buildTimeFilter(timeRange: string) {
    const now = new Date();
    let timeFilter;

    switch (timeRange) {
      case 'day':
        timeFilter = gt(posts.createdAt, new Date(now.getTime() - 24 * 60 * 60 * 1000));
        break;
      case 'week':
        timeFilter = gt(posts.createdAt, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
        break;
      case 'month':
        timeFilter = gt(posts.createdAt, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
        break;
      default:
        timeFilter = sql`1=1`;
    }

    return timeFilter;
  }
}

export const communityService = new CommunityService();