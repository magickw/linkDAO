import { db } from '../db';
import { posts, users, communities, communityMembers, communityStats, communityCategories, reactions, communityGovernanceProposals, communityGovernanceVotes, communityModerationActions } from '../db/schema';
import { eq, desc, asc, and, or, like, inArray, sql, gt, count, avg, sum, isNull } from 'drizzle-orm';
import { feedService } from './feedService';
import { sanitizeInput, sanitizeObject, validateLength } from '../utils/sanitizer';

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
  governanceToken?: string;
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
  // List communities with filtering and caching
  async listCommunities(options: ListCommunitiesOptions) {
    const { page, limit, category, search, sort, tags } = options;
    const offset = (page - 1) * limit;

    try {
      // Build where conditions
      const whereConditions = [];
      
      if (category) {
        whereConditions.push(eq(communities.category, category));
      }
      
      if (search) {
        const sanitizedSearch = sanitizeInput(search);
        validateLength(sanitizedSearch, 100, 'Search query');
        whereConditions.push(
          or(
            like(communities.displayName, `%${sanitizedSearch}%`),
            like(communities.description, `%${sanitizedSearch}%`),
            like(communities.name, `%${sanitizedSearch}%`)
          )
        );
      }
      
      if (tags && tags.length > 0) {
        // Search in JSON tags array
        whereConditions.push(
          sql`EXISTS (
            SELECT 1 FROM json_array_elements_text(${communities.tags}::json) AS tag 
            WHERE tag = ANY(${tags})
          )`
        );
      }

      // Add public filter
      whereConditions.push(eq(communities.isPublic, true));

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Determine sort order
      let orderBy;
      switch (sort) {
        case 'newest':
          orderBy = desc(communities.createdAt);
          break;
        case 'oldest':
          orderBy = asc(communities.createdAt);
          break;
        case 'members':
          orderBy = desc(communities.memberCount);
          break;
        case 'posts':
          orderBy = desc(communities.postCount);
          break;
        case 'name':
          orderBy = asc(communities.displayName);
          break;
        default:
          orderBy = desc(communities.memberCount);
      }

      // Get communities with stats
      const communityList = await db
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
          isPublic: communities.isPublic,
          createdAt: communities.createdAt,
          updatedAt: communities.updatedAt,
          treasuryAddress: communities.treasuryAddress,
          governanceToken: communities.governanceToken,
          // Get trending score from stats
          trendingScore: communityStats.trendingScore,
          growthRate7d: communityStats.growthRate7d,
        })
        .from(communities)
        .leftJoin(communityStats, eq(communities.id, communityStats.communityId))
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const totalResult = await db
        .select({ count: count() })
        .from(communities)
        .where(whereClause);

      const total = totalResult[0]?.count || 0;

      // Transform to expected format
      const transformedCommunities = communityList.map(item => ({
        id: item.id,
        name: item.name,
        displayName: item.displayName,
        description: item.description || '',
        category: item.category,
        tags: item.tags ? JSON.parse(item.tags) : [],
        avatar: item.avatar,
        banner: item.banner,
        memberCount: item.memberCount,
        postCount: item.postCount,
        isPublic: item.isPublic,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        treasuryAddress: item.treasuryAddress,
        governanceToken: item.governanceToken,
        trendingScore: item.trendingScore ? Number(item.trendingScore) : 0,
        growthRate: item.growthRate7d ? Number(item.growthRate7d) : 0,
      }));

      return {
        communities: transformedCommunities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error listing communities:', error);
      throw new Error('Failed to list communities');
    }
  }

  // Get trending communities with real analytics
  async getTrendingCommunities(options: { page: number; limit: number; timeRange: string }) {
    const { page, limit, timeRange } = options;
    const offset = (page - 1) * limit;

    try {
      // Get trending communities based on trending score and recent activity
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
          trendingScore: communityStats.trendingScore,
          growthRate7d: communityStats.growthRate7d,
          posts7d: communityStats.posts7d,
          activeMembers7d: communityStats.activeMembers7d,
        })
        .from(communities)
        .leftJoin(communityStats, eq(communities.id, communityStats.communityId))
        .where(eq(communities.isPublic, true))
        .orderBy(
          desc(communityStats.trendingScore),
          desc(communityStats.growthRate7d),
          desc(communities.memberCount)
        )
        .limit(limit)
        .offset(offset);

      // Transform to expected format
      const transformedCommunities = trendingCommunities.map(item => ({
        id: item.id,
        name: item.name,
        displayName: item.displayName,
        description: item.description || '',
        category: item.category,
        tags: item.tags ? JSON.parse(item.tags) : [],
        avatar: item.avatar,
        banner: item.banner,
        memberCount: item.memberCount,
        postCount: item.postCount,
        createdAt: item.createdAt,
        trendingScore: item.trendingScore ? Number(item.trendingScore) : 0,
        growthRate: item.growthRate7d ? Number(item.growthRate7d) : 0,
        recentPosts: item.posts7d || 0,
        activeMembers: item.activeMembers7d || 0,
      }));

      return {
        communities: transformedCommunities,
        pagination: {
          page,
          limit,
          total: transformedCommunities.length
        }
      };
    } catch (error) {
      console.error('Error getting trending communities:', error);
      throw new Error('Failed to get trending communities');
    }
  }

  // Get community details with membership info
  async getCommunityDetails(communityId: string, userAddress?: string) {
    try {
      // Get community details
      const communityResult = await db
        .select({
          id: communities.id,
          name: communities.name,
          displayName: communities.displayName,
          description: communities.description,
          rules: communities.rules,
          category: communities.category,
          tags: communities.tags,
          avatar: communities.avatar,
          banner: communities.banner,
          memberCount: communities.memberCount,
          postCount: communities.postCount,
          isPublic: communities.isPublic,
          moderators: communities.moderators,
          treasuryAddress: communities.treasuryAddress,
          governanceToken: communities.governanceToken,
          settings: communities.settings,
          createdAt: communities.createdAt,
          updatedAt: communities.updatedAt,
        })
        .from(communities)
        .where(eq(communities.id, communityId))
        .limit(1);

      if (communityResult.length === 0) {
        return null;
      }

      const community = communityResult[0];

      // Get user membership if userAddress provided
      let membership = null;
      if (userAddress) {
        const membershipResult = await db
          .select({
            role: communityMembers.role,
            reputation: communityMembers.reputation,
            contributions: communityMembers.contributions,
            joinedAt: communityMembers.joinedAt,
            isActive: communityMembers.isActive,
          })
          .from(communityMembers)
          .where(
            and(
              eq(communityMembers.communityId, communityId),
              eq(communityMembers.userAddress, userAddress)
            )
          )
          .limit(1);

        if (membershipResult.length > 0) {
          membership = membershipResult[0];
        }
      }

      // Get community statistics
      const statsResult = await db
        .select()
        .from(communityStats)
        .where(eq(communityStats.communityId, communityId))
        .limit(1);

      const stats = statsResult[0] || null;

      const communityData = {
        id: community.id,
        name: community.name,
        displayName: community.displayName,
        description: community.description || '',
        rules: community.rules ? JSON.parse(community.rules) : [],
        category: community.category,
        tags: community.tags ? JSON.parse(community.tags) : [],
        avatar: community.avatar,
        banner: community.banner,
        memberCount: community.memberCount,
        postCount: community.postCount,
        isPublic: community.isPublic,
        moderators: community.moderators ? JSON.parse(community.moderators) : [],
        treasuryAddress: community.treasuryAddress,
        governanceToken: community.governanceToken,
        settings: community.settings ? JSON.parse(community.settings) : null,
        createdAt: community.createdAt,
        updatedAt: community.updatedAt,
        // User-specific data
        isMember: membership !== null,
        memberRole: membership?.role || null,
        memberReputation: membership?.reputation || 0,
        memberContributions: membership?.contributions || 0,
        memberJoinedAt: membership?.joinedAt || null,
        // Statistics
        stats: stats ? {
          activeMembers7d: stats.activeMembers7d,
          activeMembers30d: stats.activeMembers30d,
          posts7d: stats.posts7d,
          posts30d: stats.posts30d,
          engagementRate: Number(stats.engagementRate),
          growthRate7d: Number(stats.growthRate7d),
          growthRate30d: Number(stats.growthRate30d),
          trendingScore: Number(stats.trendingScore),
        } : null,
      };

      return communityData;
    } catch (error) {
      console.error('Error getting community details:', error);
      throw new Error('Failed to get community details');
    }
  }

  // Create new community with real database operations
  async createCommunity(data: CreateCommunityData) {
    try {
      // Check if community name already exists
      const existingCommunity = await db
        .select({ id: communities.id })
        .from(communities)
        .where(eq(communities.name, data.name))
        .limit(1);

      if (existingCommunity.length > 0) {
        throw new Error('Community name already exists');
      }

      // Prepare community data
      const communityData = {
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        rules: JSON.stringify(data.rules || []),
        category: data.category,
        tags: JSON.stringify(data.tags || []),
        isPublic: data.isPublic,
        avatar: data.iconUrl || null,
        banner: data.bannerUrl || null,
        moderators: JSON.stringify([data.creatorAddress]),
        treasuryAddress: data.governanceEnabled ? null : null, // Will be set later
        governanceToken: data.governanceEnabled ? null : null, // Will be set later
        settings: JSON.stringify({
          allowedPostTypes: [
            { id: 'discussion', name: 'Discussion', description: 'General discussion posts', enabled: true },
            { id: 'news', name: 'News', description: 'News and updates', enabled: true },
            { id: 'question', name: 'Question', description: 'Ask questions', enabled: true }
          ],
          requireApproval: false,
          minimumReputation: 0,
          stakingRequirements: data.stakingRequired ? [{
            action: 'post',
            tokenAddress: data.governanceToken || '',
            minimumAmount: data.minimumStake.toString(),
            lockDuration: 86400 // 24 hours
          }] : []
        }),
        memberCount: 1, // Creator is first member
        postCount: 0,
      };

      // Create community
      const newCommunityResult = await db
        .insert(communities)
        .values(communityData)
        .returning();

      const newCommunity = newCommunityResult[0];

      // Add creator as admin member
      await db
        .insert(communityMembers)
        .values({
          communityId: newCommunity.id,
          userAddress: data.creatorAddress,
          role: 'admin',
          reputation: 100, // Starting reputation for creator
          contributions: 1, // Creating community counts as contribution
          isActive: true,
        });

      // Initialize community stats
      await db
        .insert(communityStats)
        .values({
          communityId: newCommunity.id,
          activeMembers7d: 1,
          activeMembers30d: 1,
          posts7d: 0,
          posts30d: 0,
          engagementRate: "0",
          growthRate7d: "0",
          growthRate30d: "0",
          trendingScore: "0",
        });

      return {
        id: newCommunity.id,
        name: newCommunity.name,
        displayName: newCommunity.displayName,
        description: newCommunity.description,
        category: newCommunity.category,
        tags: JSON.parse(newCommunity.tags || '[]'),
        isPublic: newCommunity.isPublic,
        avatar: newCommunity.avatar,
        banner: newCommunity.banner,
        memberCount: newCommunity.memberCount,
        postCount: newCommunity.postCount,
        createdAt: newCommunity.createdAt,
        governanceEnabled: data.governanceEnabled,
        creatorAddress: data.creatorAddress,
      };
    } catch (error) {
      console.error('Error creating community:', error);
      throw new Error('Failed to create community');
    }
  }

  // Update community with proper implementation
  async updateCommunity(data: UpdateCommunityData) {
    const { communityId, userAddress, updateData } = data;

    try {
      // Sanitize all input data
      const sanitizedUpdateData = sanitizeObject(updateData);
      
      // Validate input lengths
      if (sanitizedUpdateData.displayName) {
        validateLength(sanitizedUpdateData.displayName, 100, 'Display name');
      }
      if (sanitizedUpdateData.description) {
        validateLength(sanitizedUpdateData.description, 1000, 'Description');
      }
      // Check if user has permission to update (must be admin or moderator)
      const membershipResult = await db
        .select({ role: communityMembers.role })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.userAddress, userAddress),
            eq(communityMembers.isActive, true),
            or(
              eq(communityMembers.role, 'admin'),
              eq(communityMembers.role, 'moderator')
            )
          )
        )
        .limit(1);

      if (membershipResult.length === 0) {
        throw new Error('Only community admins or moderators can update community settings');
      }

      // Prepare update data
      const updateFields: any = {};
      
      if (sanitizedUpdateData.displayName !== undefined) {
        updateFields.displayName = sanitizedUpdateData.displayName;
      }
      
      if (sanitizedUpdateData.description !== undefined) {
        updateFields.description = sanitizedUpdateData.description;
      }
      
      if (sanitizedUpdateData.category !== undefined) {
        updateFields.category = sanitizedUpdateData.category;
      }
      
      if (sanitizedUpdateData.tags !== undefined) {
        updateFields.tags = JSON.stringify(sanitizedUpdateData.tags);
      }
      
      if (sanitizedUpdateData.avatar !== undefined) {
        updateFields.avatar = sanitizedUpdateData.avatar;
      }
      
      if (sanitizedUpdateData.banner !== undefined) {
        updateFields.banner = sanitizedUpdateData.banner;
      }
      
      if (sanitizedUpdateData.isPublic !== undefined) {
        updateFields.isPublic = sanitizedUpdateData.isPublic;
      }
      
      if (sanitizedUpdateData.rules !== undefined) {
        updateFields.rules = JSON.stringify(sanitizedUpdateData.rules);
      }
      
      if (sanitizedUpdateData.settings !== undefined) {
        updateFields.settings = JSON.stringify(sanitizedUpdateData.settings);
      }

      // Update the community
      const updatedCommunity = await db
        .update(communities)
        .set({
          ...updateFields,
          updatedAt: new Date(),
        })
        .where(eq(communities.id, communityId))
        .returning();

      if (updatedCommunity.length === 0) {
        throw new Error('Community not found');
      }

      const community = updatedCommunity[0];
      
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
        isPublic: community.isPublic,
        rules: community.rules ? JSON.parse(community.rules) : [],
        settings: community.settings ? JSON.parse(community.settings) : {},
        createdAt: community.createdAt,
        updatedAt: community.updatedAt,
      };
    } catch (error) {
      console.error('Error updating community:', error);
      throw new Error('Failed to update community');
    }
  }

  // Join community with real membership tracking
  async joinCommunity(data: JoinCommunityData) {
    try {
      // Check if community exists and is public
      const communityResult = await db
        .select({ 
          id: communities.id, 
          isPublic: communities.isPublic,
          memberCount: communities.memberCount 
        })
        .from(communities)
        .where(eq(communities.id, data.communityId))
        .limit(1);

      if (communityResult.length === 0) {
        return { success: false, message: 'Community not found' };
      }

      const community = communityResult[0];

      if (!community.isPublic) {
        return { success: false, message: 'Community is private' };
      }

      // Check if user is already a member
      const existingMembership = await db
        .select({ id: communityMembers.id })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, data.communityId),
            eq(communityMembers.userAddress, data.userAddress)
          )
        )
        .limit(1);

      if (existingMembership.length > 0) {
        return { success: false, message: 'Already a member of this community' };
      }

      // Add membership
      const membershipResult = await db
        .insert(communityMembers)
        .values({
          communityId: data.communityId,
          userAddress: data.userAddress,
          role: 'member',
          reputation: 0,
          contributions: 0,
          isActive: true,
        })
        .returning();

      // Update community member count
      await db
        .update(communities)
        .set({ 
          memberCount: community.memberCount + 1,
          updatedAt: new Date()
        })
        .where(eq(communities.id, data.communityId));

      // Update community stats
      await this.updateCommunityStats(data.communityId);

      return { 
        success: true, 
        data: {
          id: membershipResult[0].id,
          communityId: data.communityId,
          userAddress: data.userAddress,
          role: 'member',
          reputation: 0,
          contributions: 0,
          joinedAt: membershipResult[0].joinedAt,
          isActive: true,
        }
      };
    } catch (error) {
      console.error('Error joining community:', error);
      throw new Error('Failed to join community');
    }
  }

  // Leave community with real membership tracking
  async leaveCommunity(data: JoinCommunityData) {
    try {
      // Check if user is a member
      const membershipResult = await db
        .select({ 
          id: communityMembers.id,
          role: communityMembers.role 
        })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, data.communityId),
            eq(communityMembers.userAddress, data.userAddress)
          )
        )
        .limit(1);

      if (membershipResult.length === 0) {
        return { success: false, message: 'Not a member of this community' };
      }

      const membership = membershipResult[0];

      // Prevent admin from leaving (they need to transfer ownership first)
      if (membership.role === 'admin') {
        return { success: false, message: 'Admin cannot leave community. Transfer ownership first.' };
      }

      // Remove membership
      await db
        .delete(communityMembers)
        .where(eq(communityMembers.id, membership.id));

      // Update community member count
      const communityResult = await db
        .select({ memberCount: communities.memberCount })
        .from(communities)
        .where(eq(communities.id, data.communityId))
        .limit(1);

      if (communityResult.length > 0) {
        await db
          .update(communities)
          .set({ 
            memberCount: Math.max(0, communityResult[0].memberCount - 1),
            updatedAt: new Date()
          })
          .where(eq(communities.id, data.communityId));
      }

      // Update community stats
      await this.updateCommunityStats(data.communityId);

      return { success: true, data: null };
    } catch (error) {
      console.error('Error leaving community:', error);
      throw new Error('Failed to leave community');
    }
  }

  // Get community posts with enhanced filtering
  async getCommunityPosts(options: {
    communityId: string;
    page: number;
    limit: number;
    sort: string;
    timeRange: string;
  }) {
    const { communityId, page, limit, sort, timeRange } = options;

    try {
      // Get posts for this community using both communityId and dao fields
      const offset = (page - 1) * limit;
      const timeFilter = this.buildTimeFilter(timeRange);

      // Build sort order
      let orderBy;
      switch (sort) {
        case 'newest':
          orderBy = desc(posts.createdAt);
          break;
        case 'oldest':
          orderBy = asc(posts.createdAt);
          break;
        case 'popular':
          orderBy = desc(posts.stakedValue);
          break;
        default:
          orderBy = desc(posts.createdAt);
      }

      // Get community name for dao field matching
      const communityResult = await db
        .select({ name: communities.name })
        .from(communities)
        .where(eq(communities.id, communityId))
        .limit(1);

      const communityName = communityResult[0]?.name;

      // Build where conditions for posts
      const whereConditions = [];
      
      // Match by community ID or dao name (for backward compatibility)
      if (communityName) {
        whereConditions.push(
          or(
            eq(posts.communityId, communityId),
            eq(posts.dao, communityName)
          )
        );
      } else {
        whereConditions.push(eq(posts.communityId, communityId));
      }

      if (timeFilter) {
        whereConditions.push(timeFilter);
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Get posts with author information
      const postsResult = await db
        .select({
          id: posts.id,
          authorId: posts.authorId,
          title: posts.title,
          contentCid: posts.contentCid,
          parentId: posts.parentId,
          mediaCids: posts.mediaCids,
          tags: posts.tags,
          stakedValue: posts.stakedValue,
          reputationScore: posts.reputationScore,
          dao: posts.dao,
          communityId: posts.communityId,
          createdAt: posts.createdAt,
          // Author info
          authorAddress: users.walletAddress,
          authorHandle: users.handle,
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);

      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(posts)
        .where(whereClause);

      const total = totalResult[0]?.count || 0;

      // Transform posts to expected format
      const transformedPosts = postsResult.map(post => ({
        id: post.id.toString(),
        authorId: post.authorId,
        authorAddress: post.authorAddress,
        authorHandle: post.authorHandle,
        title: post.title,
        contentCid: post.contentCid,
        parentId: post.parentId,
        mediaCids: post.mediaCids ? JSON.parse(post.mediaCids) : [],
        tags: post.tags ? JSON.parse(post.tags) : [],
        stakedValue: post.stakedValue ? Number(post.stakedValue) : 0,
        reputationScore: post.reputationScore || 0,
        dao: post.dao,
        communityId: post.communityId,
        createdAt: post.createdAt,
      }));

      return {
        posts: transformedPosts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting community posts:', error);
      throw new Error('Failed to get community posts');
    }
  }

  // Create post in community with validation
  async createCommunityPost(data: CreateCommunityPostData) {
    const { communityId, authorAddress, content, mediaUrls, tags, pollData } = data;

    try {
      // Check if user is a member of the community
      const membership = await db
        .select({
          id: communityMembers.id,
          role: communityMembers.role,
          reputation: communityMembers.reputation,
        })
        .from(communityMembers)
        .where(and(
          eq(communityMembers.communityId, communityId),
          eq(communityMembers.userAddress, authorAddress),
          eq(communityMembers.isActive, true)
        ))
        .limit(1);

      if (membership.length === 0) {
        return { success: false, message: 'Must be a member to post in this community' };
      }

      // Get community settings to check posting requirements
      const communityResult = await db
        .select({
          name: communities.name,
          settings: communities.settings,
          isPublic: communities.isPublic,
        })
        .from(communities)
        .where(eq(communities.id, communityId))
        .limit(1);

      if (communityResult.length === 0) {
        return { success: false, message: 'Community not found' };
      }

      const community = communityResult[0];
      const settings = community.settings ? JSON.parse(community.settings) : null;

      // Check minimum reputation requirement
      if (settings?.minimumReputation && membership[0].reputation < settings.minimumReputation) {
        return { 
          success: false, 
          message: `Minimum reputation of ${settings.minimumReputation} required to post` 
        };
      }

      // Get user ID for post creation
      const userResult = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.walletAddress, authorAddress))
        .limit(1);

      if (userResult.length === 0) {
        return { success: false, message: 'User not found' };
      }

      const userId = userResult[0].id;

      // Create the post
      const postData = {
        authorId: userId,
        contentCid: content, // In real implementation, this would be IPFS CID
        mediaCids: JSON.stringify(mediaUrls || []),
        tags: JSON.stringify(tags || []),
        dao: community.name, // For backward compatibility
        communityId: communityId,
        reputationScore: membership[0].reputation,
        stakedValue: "0", // Would be calculated based on staking requirements
      };

      const newPostResult = await db
        .insert(posts)
        .values(postData)
        .returning();

      const newPost = newPostResult[0];

      // Update community post count
      await db
        .update(communities)
        .set({ 
          postCount: sql`${communities.postCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(communities.id, communityId));

      // Update member contributions
      await db
        .update(communityMembers)
        .set({ 
          contributions: sql`${communityMembers.contributions} + 1`,
          lastActivityAt: new Date()
        })
        .where(eq(communityMembers.id, membership[0].id));

      // Update community stats
      await this.updateCommunityStats(communityId);

      return { 
        success: true, 
        data: {
          id: newPost.id.toString(),
          authorId: newPost.authorId,
          authorAddress,
          contentCid: newPost.contentCid,
          mediaCids: JSON.parse(newPost.mediaCids || '[]'),
          tags: JSON.parse(newPost.tags || '[]'),
          communityId: newPost.communityId,
          dao: newPost.dao,
          createdAt: newPost.createdAt,
          stakedValue: Number(newPost.stakedValue),
          reputationScore: newPost.reputationScore,
        }
      };
    } catch (error) {
      console.error('Error creating community post:', error);
      throw new Error('Failed to create community post');
    }
  }

  // Get community members with real data
  async getCommunityMembers(options: {
    communityId: string;
    page: number;
    limit: number;
    role?: string;
  }) {
    const { communityId, page, limit, role } = options;
    const offset = (page - 1) * limit;

    try {
      // Build where conditions
      const whereConditions = [
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.isActive, true)
      ];

      if (role) {
        whereConditions.push(eq(communityMembers.role, role));
      }

      const whereClause = and(...whereConditions);

      // Get members with user information
      const membersResult = await db
        .select({
          id: communityMembers.id,
          userAddress: communityMembers.userAddress,
          role: communityMembers.role,
          reputation: communityMembers.reputation,
          contributions: communityMembers.contributions,
          joinedAt: communityMembers.joinedAt,
          lastActivityAt: communityMembers.lastActivityAt,
          // User info
          userHandle: users.handle,
          userProfileCid: users.profileCid,
        })
        .from(communityMembers)
        .leftJoin(users, eq(communityMembers.userAddress, users.walletAddress))
        .where(whereClause)
        .orderBy(
          desc(communityMembers.reputation),
          desc(communityMembers.contributions),
          desc(communityMembers.joinedAt)
        )
        .limit(limit)
        .offset(offset);

      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(communityMembers)
        .where(whereClause);

      const total = totalResult[0]?.count || 0;

      // Transform to expected format
      const transformedMembers = membersResult.map(member => ({
        id: member.id,
        userAddress: member.userAddress,
        userHandle: member.userHandle,
        userProfileCid: member.userProfileCid,
        role: member.role,
        reputation: member.reputation,
        contributions: member.contributions,
        joinedAt: member.joinedAt,
        lastActivityAt: member.lastActivityAt,
      }));

      return {
        members: transformedMembers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting community members:', error);
      throw new Error('Failed to get community members');
    }
  }

  // Get community statistics with real analytics
  async getCommunityStats(communityId: string) {
    try {
      // Get community basic info
      const communityResult = await db
        .select({
          id: communities.id,
          name: communities.name,
          memberCount: communities.memberCount,
          postCount: communities.postCount,
          createdAt: communities.createdAt,
        })
        .from(communities)
        .where(eq(communities.id, communityId))
        .limit(1);

      if (communityResult.length === 0) {
        return null;
      }

      const community = communityResult[0];

      // Get detailed stats
      const statsResult = await db
        .select()
        .from(communityStats)
        .where(eq(communityStats.communityId, communityId))
        .limit(1);

      const stats = statsResult[0];

      // Calculate real-time stats if needed
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get recent post counts
      const recentPostsResult = await db
        .select({
          posts7d: sql<number>`COUNT(CASE WHEN ${posts.createdAt} >= ${weekAgo} THEN 1 END)`,
          posts30d: sql<number>`COUNT(CASE WHEN ${posts.createdAt} >= ${monthAgo} THEN 1 END)`,
        })
        .from(posts)
        .where(
          or(
            eq(posts.communityId, communityId),
            eq(posts.dao, community.name)
          )
        );

      const recentPosts = recentPostsResult[0] || { posts7d: 0, posts30d: 0 };

      // Get active members (members who posted or joined recently)
      const activeMembersResult = await db
        .select({
          activeMembers7d: sql<number>`COUNT(CASE WHEN ${communityMembers.lastActivityAt} >= ${weekAgo} THEN 1 END)`,
          activeMembers30d: sql<number>`COUNT(CASE WHEN ${communityMembers.lastActivityAt} >= ${monthAgo} THEN 1 END)`,
        })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.isActive, true)
          )
        );

      const activeMembers = activeMembersResult[0] || { activeMembers7d: 0, activeMembers30d: 0 };

      return {
        communityId,
        memberCount: community.memberCount,
        postCount: community.postCount,
        createdAt: community.createdAt,
        // Recent activity
        posts7d: recentPosts.posts7d,
        posts30d: recentPosts.posts30d,
        activeMembers7d: activeMembers.activeMembers7d,
        activeMembers30d: activeMembers.activeMembers30d,
        // Analytics (from stats table if available)
        engagementRate: stats ? Number(stats.engagementRate) : 0,
        growthRate7d: stats ? Number(stats.growthRate7d) : 0,
        growthRate30d: stats ? Number(stats.growthRate30d) : 0,
        trendingScore: stats ? Number(stats.trendingScore) : 0,
        lastCalculatedAt: stats?.lastCalculatedAt || null,
      };
    } catch (error) {
      console.error('Error getting community stats:', error);
      throw new Error('Failed to get community stats');
    }
  }

  // Helper method to update community statistics
  private async updateCommunityStats(communityId: string) {
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get community name for dao field matching
      const communityResult = await db
        .select({ name: communities.name, memberCount: communities.memberCount })
        .from(communities)
        .where(eq(communities.id, communityId))
        .limit(1);

      if (communityResult.length === 0) return;

      const community = communityResult[0];

      // Calculate active members
      const activeMembersResult = await db
        .select({
          activeMembers7d: sql<number>`COUNT(CASE WHEN ${communityMembers.lastActivityAt} >= ${weekAgo} THEN 1 END)`,
          activeMembers30d: sql<number>`COUNT(CASE WHEN ${communityMembers.lastActivityAt} >= ${monthAgo} THEN 1 END)`,
        })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.isActive, true)
          )
        );

      const activeMembers = activeMembersResult[0] || { activeMembers7d: 0, activeMembers30d: 0 };

      // Calculate recent posts
      const recentPostsResult = await db
        .select({
          posts7d: sql<number>`COUNT(CASE WHEN ${posts.createdAt} >= ${weekAgo} THEN 1 END)`,
          posts30d: sql<number>`COUNT(CASE WHEN ${posts.createdAt} >= ${monthAgo} THEN 1 END)`,
        })
        .from(posts)
        .where(
          or(
            eq(posts.communityId, communityId),
            eq(posts.dao, community.name)
          )
        );

      const recentPosts = recentPostsResult[0] || { posts7d: 0, posts30d: 0 };

      // Calculate engagement rate (active members / total members)
      const engagementRate = community.memberCount > 0 
        ? activeMembers.activeMembers7d / community.memberCount 
        : 0;

      // Calculate growth rate (simplified - would need historical data for accurate calculation)
      const growthRate7d = 0; // Would need previous week's member count
      const growthRate30d = 0; // Would need previous month's member count

      // Calculate trending score (combination of recent activity and growth)
      const trendingScore = (recentPosts.posts7d * 2) + (activeMembers.activeMembers7d * 1.5) + (engagementRate * 100);

      // Update or insert stats
      await db
        .insert(communityStats)
        .values({
          communityId,
          activeMembers7d: activeMembers.activeMembers7d,
          activeMembers30d: activeMembers.activeMembers30d,
          posts7d: recentPosts.posts7d,
          posts30d: recentPosts.posts30d,
          engagementRate: engagementRate.toString(),
          growthRate7d: growthRate7d.toString(),
          growthRate30d: growthRate30d.toString(),
          trendingScore: trendingScore.toString(),
          lastCalculatedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: communityStats.communityId,
          set: {
            activeMembers7d: activeMembers.activeMembers7d,
            activeMembers30d: activeMembers.activeMembers30d,
            posts7d: recentPosts.posts7d,
            posts30d: recentPosts.posts30d,
            engagementRate: engagementRate.toString(),
            growthRate7d: growthRate7d.toString(),
            growthRate30d: growthRate30d.toString(),
            trendingScore: trendingScore.toString(),
            lastCalculatedAt: now,
            updatedAt: now,
          }
        });

    } catch (error) {
      console.error('Error updating community stats:', error);
      // Don't throw error as this is a background operation
    }
  }

  // Approve post with real implementation
  async approvePost(postId: string, moderatorAddress: string, communityId: string) {
    try {
      // Update post status to approved
      await db
        .update(posts)
        .set({ 
          status: 'approved',
          updatedAt: new Date()
        })
        .where(eq(posts.id, parseInt(postId)));

      // Record moderation action
      await db
        .insert(communityModerationActions)
        .values({
          communityId,
          moderatorAddress,
          action: 'approve_post',
          targetType: 'post',
          targetId: postId,
          reason: 'Post approved by moderator',
          metadata: JSON.stringify({ postId, action: 'approve' }),
        });

      return { success: true, message: 'Post approved successfully' };
    } catch (error) {
      console.error('Error approving post:', error);
      throw new Error('Failed to approve post');
    }
  }

  // Reject post with real implementation
  async rejectPost(postId: string, moderatorAddress: string, communityId: string, reason: string) {
    try {
      // Update post status to rejected
      await db
        .update(posts)
        .set({ 
          status: 'rejected',
          updatedAt: new Date()
        })
        .where(eq(posts.id, parseInt(postId)));

      // Record moderation action
      await db
        .insert(communityModerationActions)
        .values({
          communityId,
          moderatorAddress,
          action: 'reject_post',
          targetType: 'post',
          targetId: postId,
          reason: reason || 'Post rejected by moderator',
          metadata: JSON.stringify({ postId, action: 'reject', reason }),
        });

      return { success: true, message: 'Post rejected successfully' };
    } catch (error) {
      console.error('Error rejecting post:', error);
      throw new Error('Failed to reject post');
    }
  }

  // Get moderation queue
  async getModerationQueue(communityId: string, options: {
    page: number;
    limit: number;
    type?: 'posts' | 'reports' | 'all';
  }) {
    const { page, limit, type = 'all' } = options;
    const offset = (page - 1) * limit;

    try {
      // Get pending posts requiring approval
      const pendingPosts = await db
        .select({
          id: posts.id,
          type: sql`'post'`,
          title: posts.title,
          authorId: posts.authorId,
          createdAt: posts.createdAt,
          status: posts.status,
        })
        .from(posts)
        .where(and(
          eq(posts.communityId, communityId),
          eq(posts.status, 'pending')
        ))
        .orderBy(desc(posts.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        items: pendingPosts,
        pagination: { page, limit, total: pendingPosts.length }
      };
    } catch (error) {
      console.error('Error getting moderation queue:', error);
      throw new Error('Failed to get moderation queue');
    }
  }

  // Flag content for review
  async flagContent(data: {
    communityId: string;
    reporterAddress: string;
    targetType: 'post' | 'comment' | 'user';
    targetId: string;
    reason: string;
    category: 'spam' | 'harassment' | 'inappropriate' | 'other';
  }) {
    try {
      // Record the flag/report
      await db
        .insert(communityModerationActions)
        .values({
          communityId: data.communityId,
          moderatorAddress: data.reporterAddress,
          action: 'flag_content',
          targetType: data.targetType,
          targetId: data.targetId,
          reason: data.reason,
          metadata: JSON.stringify({
            category: data.category,
            reporterAddress: data.reporterAddress,
            flaggedAt: new Date()
          }),
        });

      return { success: true, message: 'Content flagged for review' };
    } catch (error) {
      console.error('Error flagging content:', error);
      throw new Error('Failed to flag content');
    }
  }

  // Moderate content with real implementation and audit trail
  async moderateContent(data: ModerationData) {
    const { communityId, moderatorAddress, action, targetId, reason } = data;

    try {
      // Check if user has moderation permissions
      const membershipResult = await db
        .select({ role: communityMembers.role })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.userAddress, moderatorAddress),
            eq(communityMembers.isActive, true),
            or(
              eq(communityMembers.role, 'admin'),
              eq(communityMembers.role, 'moderator')
            )
          )
        )
        .limit(1);

      if (membershipResult.length === 0) {
        return { success: false, message: 'Only community moderators or admins can perform moderation actions' };
      }

      // Perform moderation action based on type
      let result;
      switch (action) {
        case 'approve':
          return await this.approvePost(targetId, moderatorAddress, communityId);
          
        case 'reject':
          return await this.rejectPost(targetId, moderatorAddress, communityId, reason || 'Content rejected by moderator');
          
        case 'ban':
          // Ban a user from the community
          await db
            .update(communityMembers)
            .set({
              isActive: false,
              role: 'banned',
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(communityMembers.communityId, communityId),
                eq(communityMembers.userAddress, targetId)
              )
            );
          
          result = {
            action: 'ban',
            targetId,
            status: 'banned',
            reason: reason || 'User banned by moderator',
            moderatorAddress,
            timestamp: new Date()
          };
          break;
          
        case 'unban':
          // Unban a user from the community
          await db
            .update(communityMembers)
            .set({
              isActive: true,
              role: 'member',
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(communityMembers.communityId, communityId),
                eq(communityMembers.userAddress, targetId)
              )
            );
          
          result = {
            action: 'unban',
            targetId,
            status: 'unbanned',
            reason: reason || 'User unbanned by moderator',
            moderatorAddress,
            timestamp: new Date()
          };
          break;
          
        case 'promote':
          // Promote a user to moderator
          await db
            .update(communityMembers)
            .set({
              role: 'moderator',
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(communityMembers.communityId, communityId),
                eq(communityMembers.userAddress, targetId)
              )
            );
          
          result = {
            action: 'promote',
            targetId,
            status: 'promoted',
            reason: reason || 'User promoted to moderator',
            moderatorAddress,
            timestamp: new Date()
          };
          break;
          
        case 'demote':
          // Demote a user from moderator to member
          await db
            .update(communityMembers)
            .set({
              role: 'member',
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(communityMembers.communityId, communityId),
                eq(communityMembers.userAddress, targetId)
              )
            );
          
          result = {
            action: 'demote',
            targetId,
            status: 'demoted',
            reason: reason || 'User demoted from moderator',
            moderatorAddress,
            timestamp: new Date()
          };
          break;
          
        default:
          return { success: false, message: 'Invalid moderation action' };
      }

      // Record moderation action in audit trail
      await db
        .insert(communityModerationActions)
        .values({
          communityId,
          moderatorAddress,
          action,
          targetType: 'user',
          targetId,
          reason: reason || '',
          metadata: JSON.stringify(result),
          createdAt: new Date(),
        });

      return { success: true, data: result };
    } catch (error) {
      console.error('Error moderating content:', error);
      throw new Error('Failed to moderate content');
    }
  }

  // Get governance proposals with real data
  async getGovernanceProposals(options: {
    communityId: string;
    page: number;
    limit: number;
    status?: string;
  }) {
    const { communityId, page, limit, status } = options;
    const offset = (page - 1) * limit;

    try {
      // Build where conditions
      const whereConditions = [eq(communityGovernanceProposals.communityId, communityId)];
      
      if (status) {
        whereConditions.push(eq(communityGovernanceProposals.status, status));
      }

      const whereClause = and(...whereConditions);

      // Get proposals
      const proposalsResult = await db
        .select()
        .from(communityGovernanceProposals)
        .where(whereClause)
        .orderBy(desc(communityGovernanceProposals.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(communityGovernanceProposals)
        .where(whereClause);

      const total = totalResult[0]?.count || 0;

      // Transform proposals to expected format
      const transformedProposals = proposalsResult.map(proposal => ({
        id: proposal.id,
        communityId: proposal.communityId,
        proposerAddress: proposal.proposerAddress,
        title: proposal.title,
        description: proposal.description,
        type: proposal.type,
        status: proposal.status,
        votingStartTime: proposal.votingStartTime,
        votingEndTime: proposal.votingEndTime,
        executionEta: proposal.executionEta,
        executedAt: proposal.executedAt,
        cancelledAt: proposal.cancelledAt,
        yesVotes: Number(proposal.yesVotes),
        noVotes: Number(proposal.noVotes),
        abstainVotes: Number(proposal.abstainVotes),
        totalVotes: Number(proposal.totalVotes),
        quorum: Number(proposal.quorum),
        quorumReached: proposal.quorumReached,
        requiredMajority: proposal.requiredMajority,
        metadata: proposal.metadata ? JSON.parse(proposal.metadata) : null,
        createdAt: proposal.createdAt,
        updatedAt: proposal.updatedAt,
      }));

      return {
        proposals: transformedProposals,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting governance proposals:', error);
      throw new Error('Failed to get governance proposals');
    }
  }

  // Create governance proposal with real implementation
  async createGovernanceProposal(data: GovernanceProposalData) {
    const { communityId, proposerAddress, title, description, type, votingDuration } = data;

    try {
      // Check if user is a member of the community
      const membershipResult = await db
        .select({ id: communityMembers.id, role: communityMembers.role })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.userAddress, proposerAddress),
            eq(communityMembers.isActive, true)
          )
        )
        .limit(1);

      if (membershipResult.length === 0) {
        return { success: false, message: 'Only community members can create proposals' };
      }

      // Check if community exists
      const communityResult = await db
        .select({ id: communities.id })
        .from(communities)
        .where(eq(communities.id, communityId))
        .limit(1);

      if (communityResult.length === 0) {
        return { success: false, message: 'Community not found' };
      }

      // Calculate voting times
      const now = new Date();
      const votingStartTime = now;
      const votingEndTime = new Date(now.getTime() + votingDuration * 60 * 1000); // votingDuration in minutes

      // Get community settings for governance parameters
      const settingsResult = await db
        .select({ settings: communities.settings })
        .from(communities)
        .where(eq(communities.id, communityId))
        .limit(1);

      const settings = settingsResult[0]?.settings ? JSON.parse(settingsResult[0].settings) : {};
      const requiredMajority = settings.governance?.requiredMajority || 50;
      const quorum = settings.governance?.quorum || 10;

      // Create the proposal
      const proposalResult = await db
        .insert(communityGovernanceProposals)
        .values({
          communityId,
          proposerAddress,
          title,
          description,
          type,
          status: 'pending',
          votingStartTime,
          votingEndTime,
          requiredMajority,
          quorum: quorum.toString(),
          metadata: JSON.stringify({}),
        })
        .returning();

      const newProposal = proposalResult[0];

      return { 
        success: true, 
        data: {
          id: newProposal.id,
          communityId: newProposal.communityId,
          proposerAddress: newProposal.proposerAddress,
          title: newProposal.title,
          description: newProposal.description,
          type: newProposal.type,
          status: newProposal.status,
          votingStartTime: newProposal.votingStartTime,
          votingEndTime: newProposal.votingEndTime,
          requiredMajority: newProposal.requiredMajority,
          quorum: Number(newProposal.quorum),
          createdAt: newProposal.createdAt,
        }
      };
    } catch (error) {
      console.error('Error creating governance proposal:', error);
      throw new Error('Failed to create governance proposal');
    }
  }

  // Calculate voting power with role-based multipliers
  private async calculateVotingPower(communityId: string, voterAddress: string): Promise<number> {
    const member = await db
      .select({ reputation: communityMembers.reputation, role: communityMembers.role })
      .from(communityMembers)
      .where(and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.userAddress, voterAddress)
      ))
      .limit(1);

    if (member.length === 0) return 0;

    let votingPower = member[0].reputation || 1;
    
    // Role-based multipliers
    if (member[0].role === 'admin') votingPower *= 3;
    else if (member[0].role === 'moderator') votingPower *= 2;
    
    return Math.max(1, votingPower);
  }

  // Update proposal status based on voting period and results
  async updateProposalStatus(proposalId: string) {
    const now = new Date();
    
    const proposal = await db
      .select()
      .from(communityGovernanceProposals)
      .where(eq(communityGovernanceProposals.id, proposalId))
      .limit(1);

    if (proposal.length === 0) return;

    const p = proposal[0];
    let newStatus = p.status;

    // Check if voting period ended
    if (now > p.votingEndTime && (p.status === 'active' || p.status === 'pending')) {
      const totalVotes = Number(p.yesVotes) + Number(p.noVotes) + Number(p.abstainVotes);
      const yesPercentage = totalVotes > 0 ? (Number(p.yesVotes) / totalVotes) * 100 : 0;
      
      if (totalVotes >= Number(p.quorum)) {
        newStatus = yesPercentage >= p.requiredMajority ? 'passed' : 'rejected';
      } else {
        newStatus = 'failed'; // Didn't reach quorum
      }

      await db
        .update(communityGovernanceProposals)
        .set({ status: newStatus, updatedAt: now })
        .where(eq(communityGovernanceProposals.id, proposalId));
    }
  }

  // Execute passed proposals
  async executeProposal(proposalId: string, executorAddress: string) {
    const proposal = await db
      .select()
      .from(communityGovernanceProposals)
      .where(eq(communityGovernanceProposals.id, proposalId))
      .limit(1);

    if (proposal.length === 0 || proposal[0].status !== 'passed') {
      return { success: false, message: 'Proposal cannot be executed' };
    }

    const p = proposal[0];
    const metadata = p.metadata ? JSON.parse(p.metadata) : {};

    try {
      // Execute based on proposal type
      switch (p.type) {
        case 'settings_update':
          await db
            .update(communities)
            .set({ 
              settings: JSON.stringify(metadata.newSettings),
              updatedAt: new Date()
            })
            .where(eq(communities.id, p.communityId));
          break;
          
        case 'member_promotion':
          await db
            .update(communityMembers)
            .set({ 
              role: metadata.newRole,
              updatedAt: new Date()
            })
            .where(and(
              eq(communityMembers.communityId, p.communityId),
              eq(communityMembers.userAddress, metadata.targetAddress)
            ));
          break;
          
        default:
          return { success: false, message: 'Unknown proposal type' };
      }

      // Mark as executed
      await db
        .update(communityGovernanceProposals)
        .set({ 
          status: 'executed',
          executedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(communityGovernanceProposals.id, proposalId));

      return { success: true, message: 'Proposal executed successfully' };
    } catch (error) {
      console.error('Error executing proposal:', error);
      return { success: false, message: 'Failed to execute proposal' };
    }
  }

  // Vote on proposal with real implementation
  async voteOnProposal(data: VoteData) {
    const { communityId, proposalId, voterAddress, vote } = data;

    try {
      // Check if user is a member of the community
      const membershipResult = await db
        .select({ id: communityMembers.id })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.userAddress, voterAddress),
            eq(communityMembers.isActive, true)
          )
        )
        .limit(1);

      if (membershipResult.length === 0) {
        return { success: false, message: 'Only community members can vote on proposals' };
      }

      // Check if proposal exists and is active
      const proposalResult = await db
        .select({ 
          id: communityGovernanceProposals.id,
          status: communityGovernanceProposals.status,
          votingStartTime: communityGovernanceProposals.votingStartTime,
          votingEndTime: communityGovernanceProposals.votingEndTime,
          yesVotes: communityGovernanceProposals.yesVotes,
          noVotes: communityGovernanceProposals.noVotes,
          abstainVotes: communityGovernanceProposals.abstainVotes,
          totalVotes: communityGovernanceProposals.totalVotes,
          requiredMajority: communityGovernanceProposals.requiredMajority,
          quorum: communityGovernanceProposals.quorum,
        })
        .from(communityGovernanceProposals)
        .where(eq(communityGovernanceProposals.id, proposalId))
        .limit(1);

      if (proposalResult.length === 0) {
        return { success: false, message: 'Proposal not found' };
      }

      const proposal = proposalResult[0];
      
      // Check if proposal is active for voting
      const now = new Date();
      if (proposal.status !== 'pending' && proposal.status !== 'active') {
        return { success: false, message: 'Proposal is not open for voting' };
      }
      
      if (now < proposal.votingStartTime) {
        return { success: false, message: 'Voting has not started yet' };
      }
      
      if (now > proposal.votingEndTime) {
        return { success: false, message: 'Voting period has ended' };
      }

      // Check if user has already voted
      const existingVote = await db
        .select({ id: communityGovernanceVotes.id })
        .from(communityGovernanceVotes)
        .where(
          and(
            eq(communityGovernanceVotes.proposalId, proposalId),
            eq(communityGovernanceVotes.voterAddress, voterAddress)
          )
        )
        .limit(1);

      if (existingVote.length > 0) {
        return { success: false, message: 'You have already voted on this proposal' };
      }

      // Calculate voting power with role multipliers
      const votingPower = await this.calculateVotingPower(communityId, voterAddress);

      // Record the vote
      await db
        .insert(communityGovernanceVotes)
        .values({
          proposalId,
          voterAddress,
          voteChoice: vote,
          votingPower: votingPower.toString(),
        });

      // Update proposal vote counts
      let voteUpdate;
      switch (vote) {
        case 'yes':
          voteUpdate = {
            yesVotes: sql`${communityGovernanceProposals.yesVotes} + ${votingPower}`,
            totalVotes: sql`${communityGovernanceProposals.totalVotes} + ${votingPower}`,
          };
          break;
        case 'no':
          voteUpdate = {
            noVotes: sql`${communityGovernanceProposals.noVotes} + ${votingPower}`,
            totalVotes: sql`${communityGovernanceProposals.totalVotes} + ${votingPower}`,
          };
          break;
        case 'abstain':
          voteUpdate = {
            abstainVotes: sql`${communityGovernanceProposals.abstainVotes} + ${votingPower}`,
            totalVotes: sql`${communityGovernanceProposals.totalVotes} + ${votingPower}`,
          };
          break;
        default:
          return { success: false, message: 'Invalid vote choice' };
      }

      await db
        .update(communityGovernanceProposals)
        .set({
          ...voteUpdate,
          updatedAt: new Date(),
        })
        .where(eq(communityGovernanceProposals.id, proposalId));

      // Check if quorum is reached and update status
      await this.updateProposalStatus(proposalId);

      return { 
        success: true, 
        data: {
          proposalId,
          voterAddress,
          vote,
          votingPower,
        }
      };
    } catch (error) {
      console.error('Error voting on proposal:', error);
      throw new Error('Failed to vote on proposal');
    }
  }

  // Search communities with enhanced filtering
  async searchCommunities(options: {
    query: string;
    page: number;
    limit: number;
    category?: string;
  }) {
    const { query, page, limit, category } = options;
    const offset = (page - 1) * limit;

    try {
      // Build where conditions for search
      const whereConditions = [eq(communities.isPublic, true)];

      // Add search conditions
      if (query && query.trim()) {
        const sanitizedQuery = sanitizeInput(query);
        validateLength(sanitizedQuery, 100, 'Search query');
        const searchTerm = `%${sanitizedQuery.toLowerCase()}%`;
        whereConditions.push(
          or(
            sql`LOWER(${communities.displayName}) LIKE ${searchTerm}`,
            sql`LOWER(${communities.description}) LIKE ${searchTerm}`,
            sql`LOWER(${communities.name}) LIKE ${searchTerm}`,
            sql`EXISTS (
              SELECT 1 FROM json_array_elements_text(${communities.tags}::json) AS tag 
              WHERE LOWER(tag) LIKE ${searchTerm}
            )`
          )
        );
      }

      // Add category filter
      if (category) {
        whereConditions.push(eq(communities.category, category));
      }

      const whereClause = and(...whereConditions);

      // Get search results with stats
      const searchResults = await db
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
          // Include trending score for relevance
          trendingScore: communityStats.trendingScore,
        })
        .from(communities)
        .leftJoin(communityStats, eq(communities.id, communityStats.communityId))
        .where(whereClause)
        .orderBy(
          desc(communityStats.trendingScore),
          desc(communities.memberCount),
          desc(communities.postCount)
        )
        .limit(limit)
        .offset(offset);

      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(communities)
        .where(whereClause);

      const total = totalResult[0]?.count || 0;

      // Transform to expected format
      const transformedCommunities = searchResults.map(item => ({
        id: item.id,
        name: item.name,
        displayName: item.displayName,
        description: item.description || '',
        category: item.category,
        tags: item.tags ? JSON.parse(item.tags) : [],
        avatar: item.avatar,
        banner: item.banner,
        memberCount: item.memberCount,
        postCount: item.postCount,
        createdAt: item.createdAt,
        trendingScore: item.trendingScore ? Number(item.trendingScore) : 0,
      }));

      return {
        communities: transformedCommunities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error searching communities:', error);
      throw new Error('Failed to search communities');
    }
  }

  // Get community categories
  async getCommunityCategories() {
    try {
      const categories = await db
        .select({
          id: communityCategories.id,
          name: communityCategories.name,
          slug: communityCategories.slug,
          description: communityCategories.description,
          icon: communityCategories.icon,
          color: communityCategories.color,
          sortOrder: communityCategories.sortOrder,
        })
        .from(communityCategories)
        .where(eq(communityCategories.isActive, true))
        .orderBy(asc(communityCategories.sortOrder), asc(communityCategories.name));

      return categories;
    } catch (error) {
      console.error('Error getting community categories:', error);
      throw new Error('Failed to get community categories');
    }
  }

  // Calculate and update trending communities based on engagement metrics
  async calculateTrendingCommunities(timeRange: '1h' | '6h' | '24h' | '7d' = '24h') {
    try {
      const now = new Date();
      let timeFilter: Date;

      switch (timeRange) {
        case '1h':
          timeFilter = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '6h':
          timeFilter = new Date(now.getTime() - 6 * 60 * 60 * 1000);
          break;
        case '24h':
          timeFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          timeFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
      }

      // Calculate trending scores for all communities
      const trendingData = await db
        .select({
          communityId: communities.id,
          communityName: communities.name,
          memberCount: communities.memberCount,
          // Recent posts count
          recentPosts: sql<number>`COUNT(CASE WHEN ${posts.createdAt} >= ${timeFilter} THEN 1 END)`,
          // Recent reactions/engagement
          recentReactions: sql<number>`COUNT(CASE WHEN ${reactions.createdAt} >= ${timeFilter} THEN 1 END)`,
          // Total staked value in recent posts
          recentStakedValue: sql<number>`COALESCE(SUM(CASE WHEN ${posts.createdAt} >= ${timeFilter} THEN ${posts.stakedValue}::numeric ELSE 0 END), 0)`,
          // Active members (posted or reacted recently)
          activeMembersCount: sql<number>`COUNT(DISTINCT CASE WHEN ${communityMembers.lastActivityAt} >= ${timeFilter} THEN ${communityMembers.userAddress} END)`,
        })
        .from(communities)
        .leftJoin(posts, or(eq(posts.communityId, communities.id), eq(posts.dao, communities.name)))
        .leftJoin(reactions, eq(reactions.postId, posts.id))
        .leftJoin(communityMembers, eq(communityMembers.communityId, communities.id))
        .where(eq(communities.isPublic, true))
        .groupBy(communities.id, communities.name, communities.memberCount);

      // Calculate trending scores and update stats
      for (const community of trendingData) {
        const engagementRate = community.memberCount > 0 
          ? community.activeMembersCount / community.memberCount 
          : 0;

        // Trending score formula: combines recent activity, engagement, and staked value
        const trendingScore = 
          (community.recentPosts * 10) + 
          (community.recentReactions * 5) + 
          (Number(community.recentStakedValue) * 0.1) + 
          (engagementRate * 100) +
          (community.activeMembersCount * 15);

        // Update community stats
        await db
          .insert(communityStats)
          .values({
            communityId: community.communityId,
            trendingScore: trendingScore.toString(),
            engagementRate: engagementRate.toString(),
            lastCalculatedAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: communityStats.communityId,
            set: {
              trendingScore: trendingScore.toString(),
              engagementRate: engagementRate.toString(),
              lastCalculatedAt: now,
              updatedAt: now,
            }
          });
      }

      return { success: true, calculatedAt: now, communitiesProcessed: trendingData.length };
    } catch (error) {
      console.error('Error calculating trending communities:', error);
      throw new Error('Failed to calculate trending communities');
    }
  }

  // Get detailed community analytics
  async getCommunityAnalytics(communityId: string, timeRange: '7d' | '30d' | '90d' = '30d') {
    try {
      const now = new Date();
      let startDate: Date;

      switch (timeRange) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
      }

      // Get community name for dao field matching
      const communityResult = await db
        .select({ name: communities.name, memberCount: communities.memberCount })
        .from(communities)
        .where(eq(communities.id, communityId))
        .limit(1);

      if (communityResult.length === 0) {
        throw new Error('Community not found');
      }

      const community = communityResult[0];

      // Get post analytics
      const postAnalytics = await db
        .select({
          totalPosts: sql<number>`COUNT(*)`,
          totalStakedValue: sql<number>`COALESCE(SUM(${posts.stakedValue}::numeric), 0)`,
          avgStakedValue: sql<number>`COALESCE(AVG(${posts.stakedValue}::numeric), 0)`,
          uniqueAuthors: sql<number>`COUNT(DISTINCT ${posts.authorId})`,
        })
        .from(posts)
        .where(
          and(
            or(
              eq(posts.communityId, communityId),
              eq(posts.dao, community.name)
            ),
            gt(posts.createdAt, startDate)
          )
        );

      // Get member analytics
      const memberAnalytics = await db
        .select({
          newMembers: sql<number>`COUNT(CASE WHEN ${communityMembers.joinedAt} >= ${startDate} THEN 1 END)`,
          activeMembers: sql<number>`COUNT(CASE WHEN ${communityMembers.lastActivityAt} >= ${startDate} THEN 1 END)`,
          totalContributions: sql<number>`COALESCE(SUM(${communityMembers.contributions}), 0)`,
          avgReputation: sql<number>`COALESCE(AVG(${communityMembers.reputation}), 0)`,
        })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.isActive, true)
          )
        );

      // Get engagement analytics
      const engagementAnalytics = await db
        .select({
          totalReactions: sql<number>`COUNT(*)`,
          totalReactionValue: sql<number>`COALESCE(SUM(${reactions.amount}::numeric), 0)`,
          uniqueReactors: sql<number>`COUNT(DISTINCT ${reactions.userId})`,
        })
        .from(reactions)
        .innerJoin(posts, eq(reactions.postId, posts.id))
        .where(
          and(
            or(
              eq(posts.communityId, communityId),
              eq(posts.dao, community.name)
            ),
            gt(reactions.createdAt, startDate)
          )
        );

      // Get daily activity breakdown
      const dailyActivity = await db
        .select({
          date: sql<string>`DATE(${posts.createdAt})`,
          postCount: sql<number>`COUNT(*)`,
          uniqueAuthors: sql<number>`COUNT(DISTINCT ${posts.authorId})`,
        })
        .from(posts)
        .where(
          and(
            or(
              eq(posts.communityId, communityId),
              eq(posts.dao, community.name)
            ),
            gt(posts.createdAt, startDate)
          )
        )
        .groupBy(sql`DATE(${posts.createdAt})`)
        .orderBy(sql`DATE(${posts.createdAt})`);

      // Calculate growth metrics
      const previousPeriodStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
      
      const previousPeriodPosts = await db
        .select({
          count: sql<number>`COUNT(*)`
        })
        .from(posts)
        .where(
          and(
            or(
              eq(posts.communityId, communityId),
              eq(posts.dao, community.name)
            ),
            gt(posts.createdAt, previousPeriodStart),
            sql`${posts.createdAt} <= ${startDate}`
          )
        );

      const currentPosts = postAnalytics[0]?.totalPosts || 0;
      const previousPosts = previousPeriodPosts[0]?.count || 0;
      const postGrowthRate = previousPosts > 0 ? ((currentPosts - previousPosts) / previousPosts) * 100 : 0;

      return {
        communityId,
        timeRange,
        period: {
          startDate,
          endDate: now,
        },
        posts: {
          total: postAnalytics[0]?.totalPosts || 0,
          totalStakedValue: Number(postAnalytics[0]?.totalStakedValue || 0),
          averageStakedValue: Number(postAnalytics[0]?.avgStakedValue || 0),
          uniqueAuthors: postAnalytics[0]?.uniqueAuthors || 0,
          growthRate: postGrowthRate,
        },
        members: {
          total: community.memberCount,
          newMembers: memberAnalytics[0]?.newMembers || 0,
          activeMembers: memberAnalytics[0]?.activeMembers || 0,
          totalContributions: memberAnalytics[0]?.totalContributions || 0,
          averageReputation: Number(memberAnalytics[0]?.avgReputation || 0),
          engagementRate: community.memberCount > 0 
            ? (memberAnalytics[0]?.activeMembers || 0) / community.memberCount 
            : 0,
        },
        engagement: {
          totalReactions: engagementAnalytics[0]?.totalReactions || 0,
          totalReactionValue: Number(engagementAnalytics[0]?.totalReactionValue || 0),
          uniqueReactors: engagementAnalytics[0]?.uniqueReactors || 0,
          averageReactionsPerPost: currentPosts > 0 
            ? (engagementAnalytics[0]?.totalReactions || 0) / currentPosts 
            : 0,
        },
        dailyActivity: dailyActivity.map(day => ({
          date: day.date,
          posts: day.postCount,
          uniqueAuthors: day.uniqueAuthors,
        })),
      };
    } catch (error) {
      console.error('Error getting community analytics:', error);
      throw new Error('Failed to get community analytics');
    }
  }

  // Get member count calculations with real data
  async calculateMemberCounts(communityId: string) {
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const memberStats = await db
        .select({
          totalMembers: sql<number>`COUNT(*)`,
          activeMembers7d: sql<number>`COUNT(CASE WHEN ${communityMembers.lastActivityAt} >= ${weekAgo} THEN 1 END)`,
          activeMembers30d: sql<number>`COUNT(CASE WHEN ${communityMembers.lastActivityAt} >= ${monthAgo} THEN 1 END)`,
          newMembers7d: sql<number>`COUNT(CASE WHEN ${communityMembers.joinedAt} >= ${weekAgo} THEN 1 END)`,
          newMembers30d: sql<number>`COUNT(CASE WHEN ${communityMembers.joinedAt} >= ${monthAgo} THEN 1 END)`,
          moderatorCount: sql<number>`COUNT(CASE WHEN ${communityMembers.role} IN ('moderator', 'admin') THEN 1 END)`,
        })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.isActive, true)
          )
        );

      const stats = memberStats[0];

      return {
        total: stats?.totalMembers || 0,
        active7d: stats?.activeMembers7d || 0,
        active30d: stats?.activeMembers30d || 0,
        new7d: stats?.newMembers7d || 0,
        new30d: stats?.newMembers30d || 0,
        moderators: stats?.moderatorCount || 0,
        engagementRate7d: stats?.totalMembers > 0 ? (stats.activeMembers7d / stats.totalMembers) : 0,
        engagementRate30d: stats?.totalMembers > 0 ? (stats.activeMembers30d / stats.totalMembers) : 0,
        growthRate7d: stats?.totalMembers > 0 ? (stats.newMembers7d / stats.totalMembers) : 0,
        growthRate30d: stats?.totalMembers > 0 ? (stats.newMembers30d / stats.totalMembers) : 0,
      };
    } catch (error) {
      console.error('Error calculating member counts:', error);
      throw new Error('Failed to calculate member counts');
    }
  }

  // Get related communities based on shared members and similar content
  async getRelatedCommunities(communityId: string, limit: number = 5) {
    try {
      // Get communities that share members with the target community
      const relatedByMembers = await db
        .select({
          communityId: communities.id,
          communityName: communities.name,
          displayName: communities.displayName,
          description: communities.description,
          category: communities.category,
          tags: communities.tags,
          avatar: communities.avatar,
          memberCount: communities.memberCount,
          postCount: communities.postCount,
          sharedMembers: sql<number>`COUNT(DISTINCT ${communityMembers.userAddress})`,
          trendingScore: communityStats.trendingScore,
        })
        .from(communities)
        .innerJoin(communityMembers, eq(communityMembers.communityId, communities.id))
        .leftJoin(communityStats, eq(communityStats.communityId, communities.id))
        .where(
          and(
            sql`${communityMembers.userAddress} IN (
              SELECT user_address FROM community_members 
              WHERE community_id = ${communityId} AND is_active = true
            )`,
            sql`${communities.id} != ${communityId}`,
            eq(communities.isPublic, true)
          )
        )
        .groupBy(
          communities.id, 
          communities.name, 
          communities.displayName,
          communities.description,
          communities.category,
          communities.tags,
          communities.avatar,
          communities.memberCount,
          communities.postCount,
          communityStats.trendingScore
        )
        .orderBy(desc(sql<number>`COUNT(DISTINCT ${communityMembers.userAddress})`))
        .limit(limit);

      // Get the target community's category and tags for similarity matching
      const targetCommunity = await db
        .select({
          category: communities.category,
          tags: communities.tags,
        })
        .from(communities)
        .where(eq(communities.id, communityId))
        .limit(1);

      if (targetCommunity.length === 0) {
        return [];
      }

      const targetTags = targetCommunity[0].tags ? JSON.parse(targetCommunity[0].tags) : [];
      const targetCategory = targetCommunity[0].category;

      // Get communities in the same category (if we need more recommendations)
      const relatedByCategory = await db
        .select({
          id: communities.id,
          name: communities.name,
          displayName: communities.displayName,
          description: communities.description,
          category: communities.category,
          tags: communities.tags,
          avatar: communities.avatar,
          memberCount: communities.memberCount,
          postCount: communities.postCount,
          trendingScore: communityStats.trendingScore,
        })
        .from(communities)
        .leftJoin(communityStats, eq(communityStats.communityId, communities.id))
        .where(
          and(
            eq(communities.category, targetCategory),
            sql`${communities.id} != ${communityId}`,
            eq(communities.isPublic, true),
            // Exclude communities already found by shared members
            sql`${communities.id} NOT IN (${relatedByMembers.map(c => `'${c.communityId}'`).join(',') || "''"})`,
          )
        )
        .orderBy(desc(communityStats.trendingScore), desc(communities.memberCount))
        .limit(Math.max(0, limit - relatedByMembers.length));

      // Combine and score recommendations
      const allRecommendations = [
        ...relatedByMembers.map(c => ({
          id: c.communityId,
          name: c.communityName,
          displayName: c.displayName,
          description: c.description || '',
          category: c.category,
          tags: c.tags ? JSON.parse(c.tags) : [],
          avatar: c.avatar,
          memberCount: c.memberCount,
          postCount: c.postCount,
          trendingScore: c.trendingScore ? Number(c.trendingScore) : 0,
          recommendationScore: (c.sharedMembers * 10) + (c.trendingScore ? Number(c.trendingScore) : 0),
          recommendationReason: `${c.sharedMembers} shared members`,
        })),
        ...relatedByCategory.map(c => {
          const communityTags = c.tags ? JSON.parse(c.tags) : [];
          const tagOverlap = targetTags.filter(tag => communityTags.includes(tag)).length;
          const score = (tagOverlap * 5) + (c.trendingScore ? Number(c.trendingScore) : 0);
          
          return {
            id: c.id,
            name: c.name,
            displayName: c.displayName,
            description: c.description || '',
            category: c.category,
            tags: communityTags,
            avatar: c.avatar,
            memberCount: c.memberCount,
            postCount: c.postCount,
            trendingScore: c.trendingScore ? Number(c.trendingScore) : 0,
            recommendationScore: score,
            recommendationReason: tagOverlap > 0 
              ? `Similar interests (${tagOverlap} shared tags)` 
              : `Same category: ${c.category}`,
          };
        })
      ];

      // Sort by recommendation score and return top results
      return allRecommendations
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, limit);

    } catch (error) {
      console.error('Error getting related communities:', error);
      throw new Error('Failed to get related communities');
    }
  }

  // Get personalized community recommendations for a user
  async getPersonalizedRecommendations(userAddress: string, limit: number = 10) {
    try {
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
            eq(communityMembers.userAddress, userAddress),
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
          dao: posts.dao,
          communityId: posts.communityId,
          tags: posts.tags,
        })
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(eq(users.walletAddress, userAddress))
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
      console.error('Error getting personalized recommendations:', error);
      throw new Error('Failed to get personalized recommendations');
    }
  }

  // Get communities by category with filtering
  async getCommunitiesByCategory(category: string, options: {
    page?: number;
    limit?: number;
    sort?: 'trending' | 'members' | 'newest' | 'posts';
  } = {}) {
    const { page = 1, limit = 20, sort = 'trending' } = options;
    const offset = (page - 1) * limit;

    try {
      // Build sort order
      let orderBy;
      switch (sort) {
        case 'trending':
          orderBy = [desc(communityStats.trendingScore), desc(communities.memberCount)];
          break;
        case 'members':
          orderBy = [desc(communities.memberCount)];
          break;
        case 'newest':
          orderBy = [desc(communities.createdAt)];
          break;
        case 'posts':
          orderBy = [desc(communities.postCount)];
          break;
        default:
          orderBy = [desc(communityStats.trendingScore)];
      }

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
        .where(
          and(
            eq(communities.category, category),
            eq(communities.isPublic, true)
          )
        )
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset);

      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(communities)
        .where(
          and(
            eq(communities.category, category),
            eq(communities.isPublic, true)
          )
        );

      const total = totalResult[0]?.count || 0;

      // Transform results
      const transformedCommunities = communitiesResult.map(community => ({
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
      }));

      return {
        communities: transformedCommunities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting communities by category:', error);
      throw new Error('Failed to get communities by category');
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