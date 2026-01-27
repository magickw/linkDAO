import { db } from '../../db';
import { safeLogger } from '../utils/safeLogger';
import { posts, users, communities, communityMembers, communityStats, communityCategories, reactions } from '../db/schema';
import { eq, desc, asc, and, or, like, inArray, sql, gt, lt, count, avg, sum, isNull, ne } from 'drizzle-orm';

// Import optional tables conditionally
let communityGovernanceProposals: any;
let communityGovernanceVotes: any;
let communityModerationActions: any;
let communityDelegations: any;
let communityProxyVotes: any;
let communityMultiSigApprovals: any;
let communityAutomatedExecutions: any;
let communityTokenGatedContent: any;
let communityUserContentAccess: any;
let communitySubscriptionTiers: any;
let communityUserSubscriptions: any;
let communityTreasuryPools: any;
let communityCreatorRewards: any;
let communityStaking: any;
let communityStakingRewards: any;
let communityReferralPrograms: any;
let communityUserReferrals: any;

try {
  const schema = require('../db/schema');
  communityGovernanceProposals = schema.communityGovernanceProposals;
  communityGovernanceVotes = schema.communityGovernanceVotes;
  communityModerationActions = schema.communityModerationActions;
  communityDelegations = schema.communityDelegations;
  communityProxyVotes = schema.communityProxyVotes;
  communityMultiSigApprovals = schema.communityMultiSigApprovals;
  communityAutomatedExecutions = schema.communityAutomatedExecutions;
  communityTokenGatedContent = schema.communityTokenGatedContent;
  communityUserContentAccess = schema.communityUserContentAccess;
  communitySubscriptionTiers = schema.communitySubscriptionTiers;
  communityUserSubscriptions = schema.communityUserSubscriptions;
  communityTreasuryPools = schema.communityTreasuryPools;
  communityCreatorRewards = schema.communityCreatorRewards;
  communityStaking = schema.communityStaking;
  communityStakingRewards = schema.communityStakingRewards;
  communityReferralPrograms = schema.communityReferralPrograms;
  communityUserReferrals = schema.communityUserReferrals;
} catch (error) {
  safeLogger.warn('Some community tables not available:', error.message);
}
import { feedService } from './feedService';
import { generateShareId } from '../utils/shareIdGenerator';
import { sanitizeInput, sanitizeObject, validateLength, InputSanitizer, SANITIZATION_CONFIGS } from '../utils/sanitizer';
import { communityCacheService, CommunityCacheService } from './communityCacheService';
import { socialMediaIntegrationService } from './socialMediaIntegrationService';
import { SocialPlatform } from './oauth/baseOAuthProvider';

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
  slug: string;
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
  title?: string;
  content: string;
  mediaUrls: string[];
  tags: string[];
  pollData?: any;
  shareToSocialMedia?: {
    twitter?: boolean;
    facebook?: boolean;
    linkedin?: boolean;
    threads?: boolean;
  };
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
  executionDelay?: number; // delay in seconds before execution
  metadata?: any; // additional data for specific proposal types
}

interface VoteData {
  communityId: string;
  proposalId: string;
  voterAddress: string;
  vote: string;
  stakeAmount: number;
}

interface DelegationData {
  communityId: string;
  delegatorAddress: string;
  delegateAddress: string;
  expiryDate?: Date;
  metadata?: any;
}

interface ProxyVoteData {
  proposalId: string;
  proxyAddress: string;
  voterAddress: string;
  vote: string;
  reason?: string;
}

interface MultiSigApprovalData {
  proposalId: string;
  approverAddress: string;
  signature?: string;
  metadata?: any;
}

interface AutomatedExecutionData {
  proposalId: string;
  executionType: 'scheduled' | 'recurring' | 'dependent';
  executionTime?: Date;
  recurrencePattern?: string;
  dependencyProposalId?: string;
  metadata?: any;
}

export class CommunityService {
  // Helper method to safely parse JSON
  private safeJsonParse(input: string | null | undefined, defaultValue: any): any {
    if (!input) {
      return defaultValue;
    }
    try {
      return JSON.parse(input);
    } catch (error) {
      safeLogger.warn(`Failed to parse JSON for input: ${input.substring(0, 100)}...`, error);
      return defaultValue;
    }
  }

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
          slug: communities.slug,
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

      // Platform-wide blockchain addresses from environment variables
      const PLATFORM_TREASURY_ADDRESS = process.env.GOVERNANCE_ADDRESS || '0x27a78A860445DFFD9073aFd7065dd421487c0F8A';
      const PLATFORM_GOVERNANCE_TOKEN = process.env.LDAO_TOKEN_ADDRESS || '0xc9F690B45e33ca909bB9ab97836091673232611B';

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
        treasuryAddress: PLATFORM_TREASURY_ADDRESS, // Use platform-wide address
        governanceToken: PLATFORM_GOVERNANCE_TOKEN, // Use platform-wide token
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
      safeLogger.error('Error listing communities:', error);
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
          slug: communities.slug,
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
        slug: item.slug,
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
      safeLogger.error('Error getting trending communities:', error);

      // Return fallback empty result instead of throwing error
      return {
        communities: [],
        pagination: {
          page,
          limit,
          total: 0
        }
      };
    }
  }

  // Get user's community memberships
  async getUserCommunityMemberships(userAddress: string) {
    try {
      const memberships = await db
        .select({
          communityId: communityMembers.communityId,
          role: communityMembers.role,
          reputation: communityMembers.reputation,
          contributions: communityMembers.contributions,
          joinedAt: communityMembers.joinedAt,
          isActive: communityMembers.isActive,
        })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.userAddress, userAddress),
            eq(communityMembers.isActive, true)
          )
        );

      return memberships.map(membership => ({
        communityId: membership.communityId,
        role: membership.role,
        reputation: membership.reputation,
        contributions: membership.contributions,
        joinedAt: membership.joinedAt,
        isActive: membership.isActive,
      }));
    } catch (error) {
      safeLogger.error('Error getting user community memberships:', error);
      throw new Error('Failed to get user community memberships');
    }
  }

  // Get community details with membership info
  async getCommunityDetails(communityId: string, userAddress?: string) {
    try {
      safeLogger.info(`Fetching community details for ID: ${communityId}, userAddress: ${userAddress || 'none'}`);

      // Generate cache key
      const cacheKey = CommunityCacheService.generateCommunityKey(communityId, 'details', userAddress || 'anonymous');

      // Try to get from cache first
      const cached = await communityCacheService.get(cacheKey);
      if (cached) {
        safeLogger.info(`Community details found in cache for ID: ${communityId}`);
        return cached;
      }

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
          creatorAddress: communities.creatorAddress, // Add creatorAddress
          treasuryAddress: communities.treasuryAddress,
          governanceToken: communities.governanceToken,
          settings: communities.settings,
          createdAt: communities.createdAt,
          updatedAt: communities.updatedAt,
        })
        .from(communities)
        .where(eq(communities.id, communityId))
        .limit(1);

      safeLogger.info(`Community query result count: ${communityResult.length}`);

      if (communityResult.length === 0) {
        safeLogger.warn(`Community not found in database for ID: ${communityId}`);
        return null;
      }

      const community = communityResult[0];
      safeLogger.info(`Found community: ${community.name} (${community.displayName})`);

      // Get user membership if userAddress provided
      let membership = null;
      if (userAddress) {
        // Normalize address to lowercase for case-insensitive matching
        const normalizedUserAddress = userAddress.toLowerCase();

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
              eq(communityMembers.userAddress, normalizedUserAddress)
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

      // Platform-wide blockchain addresses
      const PLATFORM_TREASURY_ADDRESS = '0x27a78A860445DFFD9073aFd7065dd421487c0F8A';
      const PLATFORM_GOVERNANCE_TOKEN = '0xc9F690B45e33ca909bB9ab97836091673232611B';

      const communityData = {
        id: community.id,
        name: community.name,
        displayName: community.displayName,
        description: community.description || '',
        rules: this.safeJsonParse(community.rules, []),
        category: community.category,
        tags: this.safeJsonParse(community.tags, []),
        avatar: community.avatar,
        banner: community.banner,
        memberCount: community.memberCount,
        postCount: community.postCount,
        isPublic: community.isPublic,
        moderators: this.safeJsonParse(community.moderators, []),
        creatorAddress: community.creatorAddress, // Add creatorAddress
        treasuryAddress: PLATFORM_TREASURY_ADDRESS, // Use platform-wide address
        governanceToken: PLATFORM_GOVERNANCE_TOKEN, // Use platform-wide token
        settings: this.safeJsonParse(community.settings, {
          allowedPostTypes: [],
          requireApproval: false,
          minimumReputation: 0,
          stakingRequirements: []
        }),
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

      safeLogger.info(`Successfully retrieved community details for: ${community.displayName}`);

      // Cache the result
      await communityCacheService.set(cacheKey, communityData, {
        ttl: 600, // 10 minutes
        tags: ['community', 'details', communityId]
      });

      return communityData;
    } catch (error) {
      safeLogger.error('Error getting community details', { communityId, error });

      // Handle database connection errors specifically
      if (error.message?.includes('database') || error.message?.includes('connection') || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        safeLogger.error('Database connection error when fetching community details');
        throw new Error('Service temporarily unavailable');
      }

      // Return a more graceful error response instead of throwing
      return null;
    }
  }

  // Get community by slug with membership info
  async getCommunityBySlug(slug: string, userAddress?: string) {
    try {
      // Get community details by slug
      const communityResult = await db
        .select({
          id: communities.id,
          name: communities.name,
          slug: communities.slug,
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
          creatorAddress: communities.creatorAddress, // Add creatorAddress
          treasuryAddress: communities.treasuryAddress,
          governanceToken: communities.governanceToken,
          settings: communities.settings,
          createdAt: communities.createdAt,
          updatedAt: communities.updatedAt,
        })
        .from(communities)
        .where(eq(communities.slug, slug))
        .limit(1);

      if (communityResult.length === 0) {
        return null;
      }

      const community = communityResult[0];

      // Get user membership if userAddress provided
      let membership = null;
      if (userAddress) {
        // Normalize address to lowercase for case-insensitive matching
        const normalizedUserAddress = userAddress.toLowerCase();

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
              eq(communityMembers.communityId, community.id),
              eq(communityMembers.userAddress, normalizedUserAddress)
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
        .where(eq(communityStats.communityId, community.id))
        .limit(1);

      const stats = statsResult[0] || null;

      // Platform-wide blockchain addresses
      const PLATFORM_TREASURY_ADDRESS = '0x27a78A860445DFFD9073aFd7065dd421487c0F8A';
      const PLATFORM_GOVERNANCE_TOKEN = '0xc9F690B45e33ca909bB9ab97836091673232611B';

      const communityData = {
        id: community.id,
        name: community.name,
        slug: community.slug,
        displayName: community.displayName,
        description: community.description || '',
        rules: this.safeJsonParse(community.rules, []),
        category: community.category,
        tags: this.safeJsonParse(community.tags, []),
        avatar: community.avatar,
        banner: community.banner,
        memberCount: community.memberCount,
        postCount: community.postCount,
        isPublic: community.isPublic,
        moderators: this.safeJsonParse(community.moderators, []),
        creatorAddress: community.creatorAddress, // Add creatorAddress
        treasuryAddress: PLATFORM_TREASURY_ADDRESS, // Use platform-wide address
        governanceToken: PLATFORM_GOVERNANCE_TOKEN, // Use platform-wide token
        settings: this.safeJsonParse(community.settings, {
          allowedPostTypes: [],
          requireApproval: false,
          minimumReputation: 0,
          stakingRequirements: []
        }),
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
      safeLogger.error('Error getting community by slug', { slug, error });

      // Handle database connection errors specifically
      if (error.message?.includes('database') || error.message?.includes('connection') || error.code === 'ECONNREFUSED') {
        safeLogger.error('Database connection error when fetching community by slug', { slug });
        // Return a service unavailable response
        throw new Error('Service temporarily unavailable');
      }

      // Return a more graceful error response instead of throwing for other errors
      return null;
    }
  }

  // Create new community with real database operations
  async createCommunity(data: CreateCommunityData) {
    try {
      // Normalize creator address to lowercase for consistent comparisons
      const normalizedCreatorAddress = data.creatorAddress.toLowerCase();

      // Validate slug format
      if (!/^[a-z0-9-]+$/.test(data.slug)) {
        throw new Error('Slug can only contain lowercase letters, numbers, and hyphens');
      }

      if (/^-|-$/.test(data.slug)) {
        throw new Error('Slug cannot start or end with a hyphen');
      }

      if (data.slug.length < 3) {
        throw new Error('Slug must be at least 3 characters long');
      }

      // Check if community name already exists
      const existingCommunity = await db
        .select({ id: communities.id })
        .from(communities)
        .where(eq(communities.name, data.name))
        .limit(1);

      if (existingCommunity.length > 0) {
        throw new Error('Community name already exists');
      }

      // Check if community slug already exists
      const existingSlug = await db
        .select({ id: communities.id })
        .from(communities)
        .where(eq(communities.slug, data.slug))
        .limit(1);

      if (existingSlug.length > 0) {
        throw new Error('Community slug already exists');
      }

      // Platform-wide blockchain addresses
      const PLATFORM_TREASURY_ADDRESS = '0x27a78A860445DFFD9073aFd7065dd421487c0F8A';
      const PLATFORM_GOVERNANCE_TOKEN = '0xc9F690B45e33ca909bB9ab97836091673232611B';

      // Prepare community data
      const communityData = {
        name: data.name,
        slug: data.slug,
        displayName: data.displayName,
        description: data.description,
        rules: JSON.stringify(data.rules || []),
        category: data.category,
        tags: JSON.stringify(data.tags || []),
        isPublic: data.isPublic,
        avatar: data.iconUrl || null,
        banner: data.bannerUrl || null,
        creatorAddress: normalizedCreatorAddress, // Store normalized address
        moderators: JSON.stringify([normalizedCreatorAddress]),
        treasuryAddress: PLATFORM_TREASURY_ADDRESS, // Use platform-wide treasury address
        governanceToken: PLATFORM_GOVERNANCE_TOKEN, // Use platform-wide governance token
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
            tokenAddress: data.governanceToken || PLATFORM_GOVERNANCE_TOKEN,
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
          userAddress: normalizedCreatorAddress,
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
        creatorAddress: normalizedCreatorAddress,
        treasuryAddress: PLATFORM_TREASURY_ADDRESS, // Return platform address
        governanceToken: PLATFORM_GOVERNANCE_TOKEN, // Return platform token
      };
    } catch (error) {
      safeLogger.error('Error creating community:', error);

      // Provide more detailed error information
      if (error.code === '42703') {
        // PostgreSQL error: undefined_column
        throw new Error(`Database schema error: A required column is missing from the communities table. Please run database migrations.`);
      }

      throw new Error('Failed to create community');
    }
  }

  // Update community with proper implementation
  async updateCommunity(data: UpdateCommunityData) {
    const { communityId, userAddress, updateData } = data;
    // Normalize user address to lowercase for consistent comparisons
    const normalizedUserAddress = userAddress.toLowerCase();

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

      // Validate slug if provided
      if (sanitizedUpdateData.slug) {
        if (!/^[a-z0-9-]+$/.test(sanitizedUpdateData.slug)) {
          throw new Error('Slug can only contain lowercase letters, numbers, and hyphens');
        }

        if (/^-|-$/.test(sanitizedUpdateData.slug)) {
          throw new Error('Slug cannot start or end with a hyphen');
        }

        if (sanitizedUpdateData.slug.length < 3) {
          throw new Error('Slug must be at least 3 characters long');
        }

        // Check if slug is already taken by another community
        const existingSlug = await db
          .select({ id: communities.id })
          .from(communities)
          .where(and(
            eq(communities.slug, sanitizedUpdateData.slug),
            ne(communities.id, communityId)
          ))
          .limit(1);

        if (existingSlug.length > 0) {
          throw new Error('This slug is already taken by another community');
        }
      }
      // Check if user has permission to update
      // First check communityMembers table for admin/moderator role
      const membershipResult = await db
        .select({ role: communityMembers.role })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.userAddress, normalizedUserAddress),
            eq(communityMembers.isActive, true),
            or(
              eq(communityMembers.role, 'admin'),
              eq(communityMembers.role, 'moderator')
            )
          )
        )
        .limit(1);

      let hasPermission = membershipResult.length > 0;

      // If not in communityMembers, also check if user is creator or in moderators array
      if (!hasPermission) {
        const communityData = await db
          .select({
            creatorAddress: communities.creatorAddress,
            moderators: communities.moderators
          })
          .from(communities)
          .where(eq(communities.id, communityId))
          .limit(1);

        if (communityData.length > 0) {
          const community = communityData[0];
          // Check if user is the creator
          if (community.creatorAddress?.toLowerCase() === normalizedUserAddress) {
            hasPermission = true;
          }
          // Check if user is in moderators array
          if (!hasPermission && community.moderators) {
            const moderatorsList = this.safeJsonParse(community.moderators, []);
            if (Array.isArray(moderatorsList)) {
              hasPermission = moderatorsList.some(
                (mod: string) => mod.toLowerCase() === normalizedUserAddress
              );
            }
          }
        }
      }

      if (!hasPermission) {
        throw new Error('Only community admins or moderators can update community settings');
      }

      // Prepare update data
      const updateFields: any = {};

      if (sanitizedUpdateData.displayName !== undefined && sanitizedUpdateData.displayName !== '') {
        updateFields.displayName = sanitizedUpdateData.displayName;
      }

      // Only update slug if it's a valid non-empty string (validation already done above)
      if (sanitizedUpdateData.slug !== undefined && sanitizedUpdateData.slug !== '') {
        updateFields.slug = sanitizedUpdateData.slug;
      }

      if (sanitizedUpdateData.description !== undefined) {
        updateFields.description = sanitizedUpdateData.description;
      }

      if (sanitizedUpdateData.category !== undefined && sanitizedUpdateData.category !== '') {
        updateFields.category = sanitizedUpdateData.category;
      }

      if (sanitizedUpdateData.tags !== undefined) {
        updateFields.tags = JSON.stringify(sanitizedUpdateData.tags);
      }

      // Only update avatar if it has a value (prevent accidental clearing)
      if (sanitizedUpdateData.avatar !== undefined && sanitizedUpdateData.avatar !== '') {
        updateFields.avatar = sanitizedUpdateData.avatar;
      }

      // Only update banner if it has a value (prevent accidental clearing)
      if (sanitizedUpdateData.banner !== undefined && sanitizedUpdateData.banner !== '') {
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

      // Ignore treasuryAddress and governanceToken updates - use platform-wide addresses
      // This ensures all communities use the same treasury and governance token
      if (sanitizedUpdateData.treasuryAddress !== undefined) {
        // Silently ignore - we use platform-wide addresses
      }

      if (sanitizedUpdateData.governanceToken !== undefined) {
        // Silently ignore - we use platform-wide addresses
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

      // Platform-wide blockchain addresses
      const PLATFORM_TREASURY_ADDRESS = '0x27a78A860445DFFD9073aFd7065dd421487c0F8A';
      const PLATFORM_GOVERNANCE_TOKEN = '0xc9F690B45e33ca909bB9ab97836091673232611B';

      return {
        id: community.id,
        name: community.name,
        slug: community.slug,
        displayName: community.displayName,
        description: community.description || '',
        category: community.category,
        tags: this.safeJsonParse(community.tags, []),
        avatar: community.avatar,
        banner: community.banner,
        memberCount: community.memberCount,
        postCount: community.postCount,
        isPublic: community.isPublic,
        rules: this.safeJsonParse(community.rules, []),
        moderators: this.safeJsonParse(community.moderators, []),
        creatorAddress: community.creatorAddress,
        settings: this.safeJsonParse(community.settings, {
          allowedPostTypes: [],
          requireApproval: false,
          minimumReputation: 0,
          stakingRequirements: []
        }),
        createdAt: community.createdAt,
        updatedAt: community.updatedAt,
        treasuryAddress: PLATFORM_TREASURY_ADDRESS, // Return platform address
        governanceToken: PLATFORM_GOVERNANCE_TOKEN, // Return platform token
      };
    } catch (error) {
      safeLogger.error('Error updating community:', error);
      throw new Error('Failed to update community');
    }
  }

  /**
   * Get all communities with basic information
   * This method is used for AI recommendations and other services that need access to all communities
   */
  async getAllCommunities(): Promise<any[]> {
    try {
      // Get all public communities with basic information
      const communitiesList = await db
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
          isPublic: communities.isPublic,
          createdAt: communities.createdAt,
          creatorAddress: communities.creatorAddress,
          moderators: communities.moderators,
          trendingScore: communityStats.trendingScore,
          growthRate7d: communityStats.growthRate7d,
        })
        .from(communities)
        .leftJoin(communityStats, eq(communities.id, communityStats.communityId))
        .where(eq(communities.isPublic, true));

      // Transform to expected format
      return communitiesList.map(community => ({
        id: community.id,
        name: community.name,
        displayName: community.displayName,
        description: community.description || '',
        category: community.category,
        tags: community.tags ? JSON.parse(community.tags) : [],
        avatar: community.avatar,
        memberCount: community.memberCount,
        postCount: community.postCount,
        isPublic: community.isPublic,
        createdAt: community.createdAt,
        creatorAddress: community.creatorAddress,
        moderators: community.moderators ? JSON.parse(community.moderators) : [],
        trendingScore: community.trendingScore ? Number(community.trendingScore) : 0,
        growthRate: community.growthRate7d ? Number(community.growthRate7d) : 0,
      }));
    } catch (error) {
      safeLogger.error('Error getting all communities:', error);
      throw new Error('Failed to get all communities');
    }
  }

  // Get detailed membership info for a user in a specific community
  async getMembership(communityId: string, userAddress: string) {
    try {
      const normalizedUserAddress = userAddress.toLowerCase();

      const membership = await db
        .select({
          id: communityMembers.id,
          communityId: communityMembers.communityId,
          userAddress: communityMembers.userAddress,
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
            eq(communityMembers.userAddress, normalizedUserAddress)
          )
        )
        .limit(1);

      if (membership.length === 0) {
        return null; // Not a member or not found
      }

      return membership[0];
    } catch (error) {
      safeLogger.error('Error getting membership:', error);
      throw new Error('Failed to get membership');
    }
  }

  // Join community with real membership tracking
  async joinCommunity(data: JoinCommunityData) {
    // Normalize user address to lowercase for consistent comparisons
    const normalizedUserAddress = data.userAddress.toLowerCase();

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
            eq(communityMembers.userAddress, normalizedUserAddress)
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
          userAddress: normalizedUserAddress,
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
          userAddress: normalizedUserAddress,
          role: 'member',
          reputation: 0,
          contributions: 0,
          joinedAt: membershipResult[0].joinedAt,
          isActive: true,
        }
      };
    } catch (error) {
      safeLogger.error('Error joining community:', error);
      throw new Error('Failed to join community');
    }
  }

  // Leave community with real membership tracking
  async leaveCommunity(data: JoinCommunityData) {
    // Normalize user address to lowercase for consistent comparisons
    const normalizedUserAddress = data.userAddress.toLowerCase();

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
            eq(communityMembers.userAddress, normalizedUserAddress)
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
      safeLogger.error('Error leaving community:', error);
      throw new Error('Failed to leave community');
    }
  }

  // Delete community post
  async deletePost(communityId: string, postId: string, userAddress: string): Promise<{ success: boolean; message?: string }> {
    try {
      const normalizedUserAddress = userAddress.toLowerCase();

      // Check if post exists and belongs to community
      const post = await db
        .select({
          id: posts.id,
          authorId: posts.authorId,
          communityId: posts.communityId
        })
        .from(posts)
        .where(
          and(
            eq(posts.id, postId),
            eq(posts.communityId, communityId)
          )
        )
        .limit(1);

      if (post.length === 0) {
        return { success: false, message: 'Post not found in this community' };
      }

      if (!post[0].authorId) {
        return { success: false, message: 'Invalid post data' };
      }

      // Check author ownership
      const user = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.walletAddress, normalizedUserAddress))
        .limit(1);

      if (user.length === 0) {
        return { success: false, message: 'User not found' };
      }

      const isAuthor = post[0].authorId === user[0].id;

      // Check moderator permissions if not author
      let isModerator = false;
      if (!isAuthor) {
        isModerator = await this.checkModeratorPermission(communityId, normalizedUserAddress);
      }

      if (!isAuthor && !isModerator) {
        return { success: false, message: 'Not authorized to delete this post' };
      }

      // Delete the post
      await db.delete(posts).where(eq(posts.id, postId));

      // Update community post count
      await db
        .update(communities)
        .set({
          postCount: sql`${communities.postCount} - 1`,
          updatedAt: new Date()
        })
        .where(eq(communities.id, communityId));

      return { success: true };
    } catch (error) {
      safeLogger.error('Error in CommunityService.deletePost:', error);
      throw error;
    }
  }

  // Update community post
  async updatePost(communityId: string, postId: string, userAddress: string, data: { title?: string, content?: string, mediaUrls?: string[], tags?: string[] }): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const normalizedUserAddress = userAddress.toLowerCase();

      // Check if post exists and belongs to community
      const post = await db
        .select({
          id: posts.id,
          authorId: posts.authorId,
          communityId: posts.communityId
        })
        .from(posts)
        .where(
          and(
            eq(posts.id, postId),
            eq(posts.communityId, communityId)
          )
        )
        .limit(1);

      if (post.length === 0) {
        return { success: false, message: 'Post not found in this community' };
      }

      if (!post[0].authorId) {
        return { success: false, message: 'Invalid post data' };
      }

      // Check author ownership (only author can edit content)
      const user = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.walletAddress, normalizedUserAddress))
        .limit(1);

      if (user.length === 0) {
        return { success: false, message: 'User not found' };
      }

      const isAuthor = post[0].authorId === user[0].id;

      if (!isAuthor) {
        return { success: false, message: 'Only the author can edit this post' };
      }

      // Prepare update data
      const updateValues: any = {
        updatedAt: new Date()
      };

      if (data.title !== undefined) updateValues.title = data.title;
      if (data.content !== undefined) updateValues.content = InputSanitizer.sanitizeString(data.content, {
        allowedTags: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'br', 'hr',
          'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
          'a', 'code', 'pre', 'blockquote',
          'ul', 'ol', 'li',
          'img', 'iframe', 'div', 'span'
        ],
        allowedAttributes: {
          'a': ['href', 'title', 'target', 'rel', 'class'],
          'img': ['src', 'alt', 'title', 'width', 'height', 'class'],
          'iframe': ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder', 'class'],
          'div': ['class', 'style'],
          'span': ['class', 'style'],
          'p': ['class', 'style'],
          '*': ['class', 'id']
        },
        stripUnknown: true,
        maxLength: 50000,
        preserveWhitespace: true
      }).sanitized;
      if (data.mediaUrls !== undefined) updateValues.mediaUrls = JSON.stringify(data.mediaUrls);
      if (data.tags !== undefined) updateValues.tags = JSON.stringify(data.tags);

      // Perform update
      const updatedPost = await db
        .update(posts)
        .set(updateValues)
        .where(eq(posts.id, postId))
        .returning();

      if (updatedPost.length === 0) {
        return { success: false, message: 'Failed to update post' };
      }

      // Format response
      const result = {
        ...updatedPost[0],
        mediaUrls: this.safeJsonParse(updatedPost[0].mediaUrls, []),
        tags: this.safeJsonParse(updatedPost[0].tags, [])
      };

      return { success: true, data: result };
    } catch (error) {
      safeLogger.error('Error in CommunityService.updatePost:', error);
      throw error;
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
        .select({
          name: communities.name,
          slug: communities.slug,
          avatar: communities.avatar,
          displayName: communities.displayName
        })
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
          content: posts.content,
          contentCid: posts.contentCid,
          shareId: posts.shareId, // Include shareId for share URLs
          parentId: posts.parentId,
          mediaCids: posts.mediaCids,
          tags: posts.tags,
          stakedValue: posts.stakedValue,
          reputationScore: posts.reputationScore,
          dao: posts.dao,
          communityId: posts.communityId,
          createdAt: posts.createdAt,
          views: posts.views, // Include view count
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
      const transformedPosts = await Promise.all(postsResult.map(async post => {
        // Lazily generate shareId if missing
        let shareId = post.shareId;
        if (!shareId) {
          shareId = generateShareId();
          // Fire and forget update to persist shareId (or await it to be safe)
          await db.update(posts).set({ shareId }).where(eq(posts.id, post.id));
        }

        return {
          id: post.id.toString(),
          shareId, // Include clean shareId
          authorId: post.authorId,
          authorAddress: post.authorAddress,
          authorHandle: post.authorHandle,
          title: post.title,
          content: post.content,
          contentCid: post.contentCid,
          parentId: post.parentId,
          mediaCids: post.mediaCids ? JSON.parse(post.mediaCids) : [],
          tags: post.tags ? JSON.parse(post.tags) : [],
          stakedValue: post.stakedValue ? Number(post.stakedValue) : 0,
          reputationScore: post.reputationScore || 0,
          dao: post.dao,
          communityId: post.communityId,
          createdAt: post.createdAt,
          views: post.views || 0, // Include view count
          // Include community metadata for frontend display
          community: communityResult[0] ? {
            id: communityId,
            name: communityResult[0].name,
            displayName: communityResult[0].displayName || communityResult[0].name,
            slug: communityResult[0].slug,
            avatar: communityResult[0].avatar
          } : null
        };
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
      safeLogger.error('Error getting community posts:', error);
      throw new Error('Failed to get community posts');
    }
  }

  // Get posts from all communities the user follows (aggregated feed)
  async getFollowedCommunitiesPosts(options: {
    userAddress: string;
    page: number;
    limit: number;
    sort: string;
    timeRange: string;
  }) {
    const { userAddress, page, limit, sort, timeRange } = options;

    try {
      const offset = (page - 1) * limit;
      const timeFilter = this.buildTimeFilter(timeRange);

      // Normalize user address
      const normalizedAddress = userAddress.toLowerCase();

      // Get user ID
      const user = await db.select({ id: users.id })
        .from(users)
        .where(sql`LOWER(${users.walletAddress}) = LOWER(${normalizedAddress})`)
        .limit(1);

      if (user.length === 0) {
        // Return empty for non-existent users
        return {
          posts: [],
          pagination: { page, limit, total: 0, totalPages: 0 }
        };
      }

      const userId = user[0].id;

      // Get communities user is a member of
      const memberships = await db
        .select({ communityId: communityMembers.communityId })
        .from(communityMembers)
        .where(and(
          eq(communityMembers.userAddress, normalizedAddress),
          eq(communityMembers.isActive, true)
        ));

      let communityIds = memberships.map(m => m.communityId);

      // Always include all public communities for discovery, but prioritize joined communities
      const allCommunitiesResult = await db
        .select({ id: communities.id })
        .from(communities)
        .where(eq(communities.isPublic, true));

      // Add public communities that the user hasn't joined yet
      const publicCommunityIds = allCommunitiesResult.map(c => c.id);
      const newCommunities = publicCommunityIds.filter(id => !communityIds.includes(id));
      communityIds.push(...newCommunities);

      // Debug logging
      console.log(`[COMMUNITY FEED DEBUG] User ${userAddress} has access to ${communityIds.length} communities:`, communityIds);

      if (communityIds.length === 0) {
        console.log(`[COMMUNITY FEED DEBUG] No communities available for user ${userAddress}`);
        return {
          posts: [],
          pagination: { page, limit, total: 0, totalPages: 0 }
        };
      }

      // Build sort order
      let orderBy;
      switch (sort) {
        case 'new':
        case 'newest':
          orderBy = desc(posts.createdAt);
          break;
        case 'old':
        case 'oldest':
          orderBy = asc(posts.createdAt);
          break;
        case 'top':
        case 'popular':
          orderBy = desc(posts.stakedValue);
          break;
        case 'hot':
        case 'rising':
          // Hot/rising uses a combination of recent + engagement
          orderBy = desc(sql`(COALESCE(CAST(${posts.stakedValue} AS DECIMAL), 0) / (EXTRACT(EPOCH FROM (NOW() - ${posts.createdAt})) / 3600 + 2))`);
          break;
        default:
          orderBy = desc(posts.createdAt);
      }

      // Get community metadata for all relevant communities
      const communitiesData = await db
        .select({
          id: communities.id,
          name: communities.name,
          displayName: communities.displayName,
          slug: communities.slug,
          avatar: communities.avatar
        })
        .from(communities)
        .where(inArray(communities.id, communityIds));

      const communityMap = new Map(communitiesData.map(c => [c.id, c]));

      // Query posts from these communities
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
          authorAddress: users.walletAddress,
          authorHandle: users.handle,
          shareId: posts.shareId, // Include shareId
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .where(and(
          or(...communityIds.map(id => eq(posts.communityId, id))),
          timeFilter,
          isNull(posts.parentId) // Only top-level posts
        ))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);

      // Debug logging
      console.log(`[COMMUNITY FEED DEBUG] Query returned ${postsResult.length} posts for user ${userAddress}`);

      // Transform posts with community metadata
      const transformedPosts = await Promise.all(postsResult.map(async post => {
        // Lazily generate shareId if missing
        let shareId = post.shareId;
        if (!shareId) {
          shareId = generateShareId();
          await db.update(posts).set({ shareId }).where(eq(posts.id, post.id));
        }

        return {
          id: post.id.toString(),
          shareId, // Include clean shareId
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
          // Include community metadata for frontend display
          community: post.communityId && communityMap.has(post.communityId) ? {
            id: post.communityId,
            name: communityMap.get(post.communityId)?.name || 'Unknown',
            displayName: communityMap.get(post.communityId)?.displayName || communityMap.get(post.communityId)?.name || 'Unknown',
            slug: communityMap.get(post.communityId)?.slug || '',
            avatar: communityMap.get(post.communityId)?.avatar || null
          } : null
        };
      }));

      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(posts)
        .where(and(
          or(...communityIds.map(id => eq(posts.communityId, id))),
          timeFilter,
          isNull(posts.parentId)
        ));

      const total = totalResult[0]?.count || 0;

      // Debug logging
      console.log(`[COMMUNITY FEED DEBUG] Total posts available: ${total} for user ${userAddress}`);

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
      safeLogger.error('Error getting followed communities posts:', error);
      throw new Error('Failed to get followed communities posts');
    }
  }

  // Create community post
  async createCommunityPost(data: CreateCommunityPostData) {
    const { communityId, authorAddress, title, content, mediaUrls, tags, pollData, shareToSocialMedia } = data;
    // Normalize author address to lowercase for consistent comparisons
    const normalizedAuthorAddress = authorAddress.toLowerCase();

    try {
      // Validate input - increased limit for rich text
      validateLength(content, 50000, 'Post content');

      // 1. Check if community exists and its public status
      const communityResult = await db
        .select({ 
          id: communities.id, 
          isPublic: communities.isPublic,
          memberCount: communities.memberCount 
        })
        .from(communities)
        .where(eq(communities.id, communityId))
        .limit(1);

      if (communityResult.length === 0) {
        throw new Error('Community not found');
      }

      const community = communityResult[0];

      // 2. Check membership or eligibility to post
      const membershipResult = await db
        .select({ role: communityMembers.role, isActive: communityMembers.isActive })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.userAddress, normalizedAuthorAddress)
          )
        )
        .limit(1);

      const isMember = membershipResult.length > 0 && membershipResult[0].isActive;

      if (!isMember) {
        // If not a member, check if the community is public
        if (!community.isPublic) {
          throw new Error('This community is private. You must be a member to post.');
        }

        // Auto-join the user to the public community
        safeLogger.info(`Auto-joining user ${normalizedAuthorAddress} to public community ${communityId} upon posting`);
        
        await db
          .insert(communityMembers)
          .values({
            communityId: communityId,
            userAddress: normalizedAuthorAddress,
            role: 'member',
            reputation: 0,
            contributions: 0,
            isActive: true,
          })
          .onConflictDoUpdate({
            target: [communityMembers.communityId, communityMembers.userAddress],
            set: { isActive: true, updatedAt: new Date() }
          });

        // Update community member count
        await db
          .update(communities)
          .set({
            memberCount: community.memberCount + 1,
            updatedAt: new Date()
          })
          .where(eq(communities.id, communityId));
      } else if (membershipResult[0].role === 'banned') {
        // Explicitly check for banned status if we implement it in the role field
        throw new Error('You are blocked from posting in this community.');
      }

      // 3. Get or create user ID from the users table
      const userResult = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`LOWER(${users.walletAddress}) = LOWER(${normalizedAuthorAddress})`)
        .limit(1);

      if (userResult.length === 0) {
        // Create user if not exists
        const newUser = await db
          .insert(users)
          .values({
            walletAddress: normalizedAuthorAddress,
            role: 'user',
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        if (newUser.length === 0) {
          throw new Error('Failed to create user');
        }
        userResult.push(newUser[0]);
      }

      // Create the post
      const newPost = await db
        .insert(posts)
        .values({
          communityId,
          authorId: userResult[0].id,
          title: title || null,
          content: InputSanitizer.sanitizeString(content, SANITIZATION_CONFIGS.RICH_TEXT).sanitized,
          contentCid: `local-${Date.now()}`, // Temporary CID for local content
          mediaCids: mediaUrls ? JSON.stringify(mediaUrls) : null,
          tags: tags ? JSON.stringify(tags) : null,
          shareId: generateShareId(), // Generate short, shareable ID for URLs
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      // Update community post count
      await db
        .update(communities)
        .set({
          postCount: sql`${communities.postCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(communities.id, communityId));

      // Update user's contribution count
      await db
        .update(communityMembers)
        .set({
          contributions: sql`${communityMembers.contributions} + 1`,
          lastActivityAt: new Date()
        })
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.userAddress, normalizedAuthorAddress)
          )
        );

      // Send push notifications to community members
      try {
        const { pushNotificationService } = await import('./pushNotificationService');
        await pushNotificationService.notifyNewPost(
          communityId,
          newPost[0].id.toString(),
          normalizedAuthorAddress,
          content
        );
      } catch (notificationError) {
        safeLogger.warn('Failed to send push notifications for new post:', notificationError);
        // Don't fail the post creation if notifications fail
      }

      // Check for mentions in the post content and send mention notifications
      try {
        const mentionRegex = /@([a-zA-Z0-9_]+)/g;
        const mentions = content.match(mentionRegex);

        if (mentions) {
          const { pushNotificationService } = await import('./pushNotificationService');

          for (const mention of mentions) {
            const mentionedAddress = mention.substring(1).toLowerCase(); // Remove @ symbol and normalize

            // Verify that the mentioned user is a community member
            const mentionedMembership = await db
              .select()
              .from(communityMembers)
              .where(
                and(
                  eq(communityMembers.communityId, communityId),
                  eq(communityMembers.userAddress, mentionedAddress),
                  eq(communityMembers.isActive, true)
                )
              )
              .limit(1);

            if (mentionedMembership.length > 0) {
              await pushNotificationService.notifyMention(
                mentionedAddress,
                communityId,
                newPost[0].id.toString(),
                normalizedAuthorAddress
              );
            }
          }
        }
      } catch (mentionError) {
        safeLogger.warn('Failed to send mention notifications:', mentionError);
        // Don't fail the post creation if mention notifications fail
      }

      // Handle social media cross-posting
      if (shareToSocialMedia) {
        const platformsToPost: SocialPlatform[] = [];

        if (shareToSocialMedia.twitter) platformsToPost.push('twitter');
        if (shareToSocialMedia.facebook) platformsToPost.push('facebook');
        if (shareToSocialMedia.linkedin) platformsToPost.push('linkedin');
        if (shareToSocialMedia.threads) platformsToPost.push('threads');

        if (platformsToPost.length > 0) {
          // Process asynchronously to not block the response
          socialMediaIntegrationService.postToConnectedPlatforms(
            newPost[0].id.toString(),
            userResult[0].id,
            platformsToPost,
            content,
            mediaUrls,
            'post' // This is a community post
          ).then(results => {
            safeLogger.info('Social media cross-posting results:', results);
          }).catch(error => {
            safeLogger.error('Error in social media cross-posting:', error);
          });
        }
      }

      return {
        success: true,
        data: {
          id: newPost[0].id,
          communityId,
          authorId: userResult[0].id,
          authorAddress: normalizedAuthorAddress,
          content,
          mediaUrls,
          tags,
          createdAt: newPost[0].createdAt
        }
      };
    } catch (error) {
      safeLogger.error('Error creating community post:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create post'
      };
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
      safeLogger.error('Error getting community members:', error);
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
      safeLogger.error('Error getting community stats:', error);
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
      safeLogger.error('Error updating community stats:', error);
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
        .where(eq(posts.id, postId));

      // Record moderation action only if table exists
      if (communityModerationActions) {
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
      }

      return { success: true, message: 'Post approved successfully' };
    } catch (error) {
      safeLogger.error('Error approving post:', error);
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
        .where(eq(posts.id, postId));

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
      safeLogger.error('Error rejecting post:', error);
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
        })
        .from(posts)
        .where(
          eq(posts.communityId, communityId)
        )
        .orderBy(desc(posts.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        items: pendingPosts,
        pagination: { page, limit, total: pendingPosts.length }
      };
    } catch (error) {
      safeLogger.error('Error getting moderation queue:', error);
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
      safeLogger.error('Error flagging content:', error);
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
      safeLogger.error('Error moderating content:', error);
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

      // Check if governance proposals table exists
      if (!communityGovernanceProposals) {
        // Return empty result when table doesn't exist
        return {
          proposals: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          }
        };
      }

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
        requiredStake: Number(proposal.requiredStake),
        executionDelay: proposal.executionDelay,
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
      safeLogger.error('Error getting governance proposals:', error);
      throw new Error('Failed to get governance proposals');
    }
  }

  // Create governance proposal with real implementation
  async createGovernanceProposal(data: GovernanceProposalData) {
    const { communityId, proposerAddress, title, description, type, votingDuration, requiredStake = 0, executionDelay, metadata = {} } = data;

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

      // Validate proposal type and metadata
      const validation = this.validateProposalType(type, metadata);
      if (!validation.isValid) {
        return { success: false, message: validation.error };
      }

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
          requiredStake: requiredStake.toString(),
          executionDelay: executionDelay || null,
          metadata: JSON.stringify(metadata),
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
          requiredStake: Number(newProposal.requiredStake),
          executionDelay: newProposal.executionDelay,
          metadata: newProposal.metadata ? JSON.parse(newProposal.metadata) : null,
          createdAt: newProposal.createdAt,
        }
      };
    } catch (error) {
      safeLogger.error('Error creating governance proposal:', error);
      throw new Error('Failed to create governance proposal');
    }
  }

  // Vote on governance proposal
  async voteOnProposal(data: {
    communityId: string;
    proposalId: string;
    voterAddress: string;
    vote: string;
    stakeAmount: number;
  }): Promise<{ success: boolean; data?: any; message?: string }> {
    const { communityId, proposalId, voterAddress, vote, stakeAmount } = data;

    try {
      // Check if proposal exists and is in voting period
      const proposalResult = await db
        .select()
        .from(communityGovernanceProposals)
        .where(
          and(
            eq(communityGovernanceProposals.id, proposalId),
            eq(communityGovernanceProposals.communityId, communityId)
          )
        )
        .limit(1);

      if (proposalResult.length === 0) {
        return { success: false, message: 'Proposal not found' };
      }

      const proposal = proposalResult[0];
      const now = new Date();

      // Check if proposal is in active voting period
      if (proposal.status !== 'active' && proposal.status !== 'pending') {
        return { success: false, message: 'Proposal is not in voting period' };
      }

      if (new Date(proposal.votingStartTime) > now) {
        return { success: false, message: 'Voting has not started yet' };
      }

      if (new Date(proposal.votingEndTime) < now) {
        return { success: false, message: 'Voting has ended' };
      }

      // Check if user is a community member
      const membershipResult = await db
        .select({ role: communityMembers.role })
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
        return { success: false, message: 'Only community members can vote' };
      }

      // Check if user has already voted
      const existingVoteResult = await db
        .select()
        .from(communityGovernanceVotes)
        .where(
          and(
            eq(communityGovernanceVotes.proposalId, proposalId),
            eq(communityGovernanceVotes.voterAddress, voterAddress)
          )
        )
        .limit(1);

      if (existingVoteResult.length > 0) {
        return { success: false, message: 'You have already voted on this proposal' };
      }

      // Check if user meets minimum stake requirement
      if (stakeAmount < Number(proposal.requiredStake)) {
        return { success: false, message: `Minimum stake of ${proposal.requiredStake} tokens required` };
      }

      // Start transaction
      await db.transaction(async (tx) => {
        // Create the vote record
        await tx
          .insert(communityGovernanceVotes)
          .values({
            proposalId,
            voterAddress,
            vote,
            stakeAmount: stakeAmount.toString(),
            votingPower: stakeAmount.toString(), // For now, voting power equals stake amount
            votedAt: new Date(),
          });

        // Update proposal vote counts
        const voteColumn = vote === 'yes' ? communityGovernanceProposals.yesVotes :
          vote === 'no' ? communityGovernanceProposals.noVotes :
            communityGovernanceProposals.abstainVotes;

        await tx
          .update(communityGovernanceProposals)
          .set({
            [voteColumn]: sql`${voteColumn} + ${stakeAmount}`,
            totalVotes: sql`${communityGovernanceProposals.totalVotes} + ${stakeAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(communityGovernanceProposals.id, proposalId));

        // Update proposal status to active if it was pending
        if (proposal.status === 'pending') {
          await tx
            .update(communityGovernanceProposals)
            .set({
              status: 'active',
              votingStartTime: now,
              updatedAt: new Date(),
            })
            .where(eq(communityGovernanceProposals.id, proposalId));
        }
      });

      // Get updated proposal data
      const updatedProposalResult = await db
        .select()
        .from(communityGovernanceProposals)
        .where(eq(communityGovernanceProposals.id, proposalId))
        .limit(1);

      const updatedProposal = updatedProposalResult[0];

      // Check if quorum is reached and voting period has ended
      const totalVotes = Number(updatedProposal.totalVotes);
      const quorumReached = totalVotes >= Number(updatedProposal.quorum);
      const votingEnded = new Date(updatedProposal.votingEndTime) <= now;

      if (votingEnded && quorumReached) {
        // Calculate if proposal passes
        const yesVotes = Number(updatedProposal.yesVotes);
        const noVotes = Number(updatedProposal.noVotes);
        const totalYesNoVotes = yesVotes + noVotes;
        const majorityPercentage = totalYesNoVotes > 0 ? (yesVotes / totalYesNoVotes) * 100 : 0;

        const passes = majorityPercentage >= updatedProposal.requiredMajority;

        await db
          .update(communityGovernanceProposals)
          .set({
            status: passes ? 'passed' : 'rejected',
            quorumReached: true,
            updatedAt: new Date(),
          })
          .where(eq(communityGovernanceProposals.id, proposalId));
      }

      return {
        success: true,
        data: {
          proposalId,
          voterAddress,
          vote,
          stakeAmount,
          votingPower: stakeAmount,
          votedAt: now,
        }
      };
    } catch (error) {
      safeLogger.error('Error voting on proposal:', error);
      return { success: false, message: 'Failed to cast vote' };
    }
  }

  // Create delegation
  async createDelegation(data: {
    communityId: string;
    delegatorAddress: string;
    delegateAddress: string;
    expiryDate?: Date;
    metadata?: any;
  }): Promise<{ success: boolean; data?: any; message?: string }> {
    const { communityId, delegatorAddress, delegateAddress, expiryDate, metadata } = data;

    try {
      // Check if community exists
      const communityResult = await db
        .select({ id: communities.id })
        .from(communities)
        .where(eq(communities.id, communityId))
        .limit(1);

      if (communityResult.length === 0) {
        return { success: false, message: 'Community not found' };
      }

      // Check if delegator is a community member
      const delegatorMembershipResult = await db
        .select({ role: communityMembers.role })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.userAddress, delegatorAddress),
            eq(communityMembers.isActive, true)
          )
        )
        .limit(1);

      if (delegatorMembershipResult.length === 0) {
        return { success: false, message: 'Delegator must be a community member' };
      }

      // Check if delegate is a community member
      const delegateMembershipResult = await db
        .select({ role: communityMembers.role })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.userAddress, delegateAddress),
            eq(communityMembers.isActive, true)
          )
        )
        .limit(1);

      if (delegateMembershipResult.length === 0) {
        return { success: false, message: 'Delegate must be a community member' };
      }

      // Check if delegation already exists
      const existingDelegationResult = await db
        .select()
        .from(communityDelegations)
        .where(
          and(
            eq(communityDelegations.communityId, communityId),
            eq(communityDelegations.delegatorAddress, delegatorAddress),
            or(
              isNull(communityDelegations.expiryDate),
              gt(communityDelegations.expiryDate, new Date())
            )
          )
        )
        .limit(1);

      if (existingDelegationResult.length > 0) {
        return { success: false, message: 'Active delegation already exists' };
      }

      // Create the delegation
      const delegationResult = await db
        .insert(communityDelegations)
        .values({
          communityId,
          delegatorAddress,
          delegateAddress,
          expiryDate: expiryDate || null,
          metadata: metadata ? JSON.stringify(metadata) : null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      const newDelegation = delegationResult[0];

      return {
        success: true,
        data: {
          id: newDelegation.id,
          communityId: newDelegation.communityId,
          delegatorAddress: newDelegation.delegatorAddress,
          delegateAddress: newDelegation.delegateAddress,
          expiryDate: newDelegation.expiryDate,
          isActive: newDelegation.isActive,
          metadata: newDelegation.metadata ? JSON.parse(newDelegation.metadata) : null,
          createdAt: newDelegation.createdAt,
        }
      };
    } catch (error) {
      safeLogger.error('Error creating delegation:', error);
      return { success: false, message: 'Failed to create delegation' };
    }
  }

  // Revoke delegation
  async revokeDelegation(data: {
    communityId: string;
    delegatorAddress: string;
  }): Promise<{ success: boolean; data?: any; message?: string }> {
    const { communityId, delegatorAddress } = data;

    try {
      // Find and revoke the active delegation
      const revokeResult = await db
        .update(communityDelegations)
        .set({
          isActive: false,
          revokedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(communityDelegations.communityId, communityId),
            eq(communityDelegations.delegatorAddress, delegatorAddress),
            eq(communityDelegations.isActive, true)
          )
        )
        .returning();

      if (revokeResult.length === 0) {
        return { success: false, message: 'No active delegation found' };
      }

      return {
        success: true,
        data: {
          revokedAt: new Date(),
        }
      };
    } catch (error) {
      safeLogger.error('Error revoking delegation:', error);
      return { success: false, message: 'Failed to revoke delegation' };
    }
  }

  // Get delegations as delegate
  async getDelegationsAsDelegate(data: {
    communityId: string;
    delegateAddress: string;
    page: number;
    limit: number;
  }): Promise<any> {
    const { communityId, delegateAddress, page, limit } = data;
    const offset = (page - 1) * limit;

    try {
      // Get active delegations where user is the delegate
      const delegationsResult = await db
        .select({
          id: communityDelegations.id,
          delegatorAddress: communityDelegations.delegatorAddress,
          delegateAddress: communityDelegations.delegateAddress,
          expiryDate: communityDelegations.expiryDate,
          isActive: communityDelegations.isActive,
          createdAt: communityDelegations.createdAt,
          revokedAt: communityDelegations.revokedAt,
          metadata: communityDelegations.metadata,
        })
        .from(communityDelegations)
        .where(
          and(
            eq(communityDelegations.communityId, communityId),
            eq(communityDelegations.delegateAddress, delegateAddress),
            eq(communityDelegations.isActive, true),
            or(
              isNull(communityDelegations.expiryDate),
              gt(communityDelegations.expiryDate, new Date())
            )
          )
        )
        .orderBy(desc(communityDelegations.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const totalCountResult = await db
        .select({ count: count() })
        .from(communityDelegations)
        .where(
          and(
            eq(communityDelegations.communityId, communityId),
            eq(communityDelegations.delegateAddress, delegateAddress),
            eq(communityDelegations.isActive, true),
            or(
              isNull(communityDelegations.expiryDate),
              gt(communityDelegations.expiryDate, new Date())
            )
          )
        );

      const total = totalCountResult[0]?.count || 0;

      const delegations = delegationsResult.map(delegation => ({
        id: delegation.id,
        delegatorAddress: delegation.delegatorAddress,
        delegateAddress: delegation.delegateAddress,
        expiryDate: delegation.expiryDate,
        isActive: delegation.isActive,
        metadata: delegation.metadata ? JSON.parse(delegation.metadata) : null,
        createdAt: delegation.createdAt,
        revokedAt: delegation.revokedAt,
      }));

      return {
        delegations,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      safeLogger.error('Error getting delegations:', error);
      throw new Error('Failed to get delegations');
    }
  }

  // Create proxy vote
  async createProxyVote(data: {
    proposalId: string;
    proxyAddress: string;
    voterAddress: string;
    vote: string;
    reason?: string;
  }): Promise<{ success: boolean; data?: any; message?: string }> {
    const { proposalId, proxyAddress, voterAddress, vote, reason } = data;

    try {
      // Check if proposal exists and is in voting period
      const proposalResult = await db
        .select({
          id: communityGovernanceProposals.id,
          communityId: communityGovernanceProposals.communityId,
          status: communityGovernanceProposals.status,
          votingStartTime: communityGovernanceProposals.votingStartTime,
          votingEndTime: communityGovernanceProposals.votingEndTime,
        })
        .from(communityGovernanceProposals)
        .where(eq(communityGovernanceProposals.id, proposalId))
        .limit(1);

      if (proposalResult.length === 0) {
        return { success: false, message: 'Proposal not found' };
      }

      const proposal = proposalResult[0];
      const now = new Date();

      // Check if proposal is in active voting period
      if (proposal.status !== 'active' && proposal.status !== 'pending') {
        return { success: false, message: 'Proposal is not in voting period' };
      }

      if (new Date(proposal.votingStartTime) > now) {
        return { success: false, message: 'Voting has not started yet' };
      }

      if (new Date(proposal.votingEndTime) < now) {
        return { success: false, message: 'Voting has ended' };
      }

      // Check if proxy is a community member
      const proxyMembershipResult = await db
        .select({ role: communityMembers.role })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, proposal.communityId),
            eq(communityMembers.userAddress, proxyAddress),
            eq(communityMembers.isActive, true)
          )
        )
        .limit(1);

      if (proxyMembershipResult.length === 0) {
        return { success: false, message: 'Proxy must be a community member' };
      }

      // Check if voter is a community member
      const voterMembershipResult = await db
        .select({ role: communityMembers.role })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, proposal.communityId),
            eq(communityMembers.userAddress, voterAddress),
            eq(communityMembers.isActive, true)
          )
        )
        .limit(1);

      if (voterMembershipResult.length === 0) {
        return { success: false, message: 'Voter must be a community member' };
      }

      // Check if delegation exists from voter to proxy
      const delegationResult = await db
        .select()
        .from(communityDelegations)
        .where(
          and(
            eq(communityDelegations.communityId, proposal.communityId),
            eq(communityDelegations.delegatorAddress, voterAddress),
            eq(communityDelegations.delegateAddress, proxyAddress),
            eq(communityDelegations.isActive, true),
            or(
              isNull(communityDelegations.expiryDate),
              gt(communityDelegations.expiryDate, new Date())
            )
          )
        )
        .limit(1);

      if (delegationResult.length === 0) {
        return { success: false, message: 'No active delegation found from voter to proxy' };
      }

      // Check if voter has already voted directly
      const existingVoteResult = await db
        .select()
        .from(communityGovernanceVotes)
        .where(
          and(
            eq(communityGovernanceVotes.proposalId, proposalId),
            eq(communityGovernanceVotes.voterAddress, voterAddress)
          )
        )
        .limit(1);

      if (existingVoteResult.length > 0) {
        return { success: false, message: 'Voter has already voted directly' };
      }

      // Check if proxy vote already exists
      const existingProxyVoteResult = await db
        .select()
        .from(communityProxyVotes)
        .where(
          and(
            eq(communityProxyVotes.proposalId, proposalId),
            eq(communityProxyVotes.voterAddress, voterAddress)
          )
        )
        .limit(1);

      if (existingProxyVoteResult.length > 0) {
        return { success: false, message: 'Proxy vote already exists for this voter' };
      }

      // Create the proxy vote record
      const proxyVoteResult = await db
        .insert(communityProxyVotes)
        .values({
          proposalId,
          proxyAddress,
          voterAddress,
          vote,
          reason: reason || null,
          createdAt: new Date(),
        })
        .returning();

      const newProxyVote = proxyVoteResult[0];

      return {
        success: true,
        data: {
          id: newProxyVote.id,
          proposalId: newProxyVote.proposalId,
          proxyAddress: newProxyVote.proxyAddress,
          voterAddress: newProxyVote.voterAddress,
          vote: newProxyVote.vote,
          reason: newProxyVote.reason,
          createdAt: newProxyVote.createdAt,
        }
      };
    } catch (error) {
      safeLogger.error('Error creating proxy vote:', error);
      return { success: false, message: 'Failed to create proxy vote' };
    }
  }

  // Create subscription tier
  async createSubscriptionTier(data: {
    communityId: string;
    name: string;
    description?: string;
    price: string;
    currency: string;
    benefits: string[];
    accessLevel: string;
    durationDays: number;
    isActive?: boolean;
    metadata?: any;
  }): Promise<{ success: boolean; data?: any; message?: string }> {
    const { communityId, name, description, price, currency, benefits, accessLevel, durationDays, isActive = true, metadata } = data;

    try {
      // Check if community exists
      const communityResult = await db
        .select({ id: communities.id })
        .from(communities)
        .where(eq(communities.id, communityId))
        .limit(1);

      if (communityResult.length === 0) {
        return { success: false, message: 'Community not found' };
      }

      // Create the subscription tier
      const tierResult = await db
        .insert(communitySubscriptionTiers)
        .values({
          communityId,
          name,
          description: description || null,
          price,
          currency,
          benefits: JSON.stringify(benefits),
          accessLevel,
          durationDays,
          isActive,
          metadata: metadata ? JSON.stringify(metadata) : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      const newTier = tierResult[0];

      return {
        success: true,
        data: {
          id: newTier.id,
          communityId: newTier.communityId,
          name: newTier.name,
          description: newTier.description,
          price: newTier.price,
          currency: newTier.currency,
          benefits: JSON.parse(newTier.benefits),
          accessLevel: newTier.accessLevel,
          durationDays: newTier.durationDays,
          isActive: newTier.isActive,
          metadata: newTier.metadata ? JSON.parse(newTier.metadata) : null,
          createdAt: newTier.createdAt,
        }
      };
    } catch (error) {
      safeLogger.error('Error creating subscription tier:', error);
      return { success: false, message: 'Failed to create subscription tier' };
    }
  }

  // Get subscription tiers for a community
  async getSubscriptionTiers(communityId: string): Promise<any[]> {
    try {
      const tiersResult = await db
        .select()
        .from(communitySubscriptionTiers)
        .where(
          and(
            eq(communitySubscriptionTiers.communityId, communityId),
            eq(communitySubscriptionTiers.isActive, true)
          )
        )
        .orderBy(communitySubscriptionTiers.price);

      return tiersResult.map(tier => ({
        id: tier.id,
        communityId: tier.communityId,
        name: tier.name,
        description: tier.description,
        price: tier.price,
        currency: tier.currency,
        benefits: JSON.parse(tier.benefits),
        accessLevel: tier.accessLevel,
        durationDays: tier.durationDays,
        isActive: tier.isActive,
        metadata: tier.metadata ? JSON.parse(tier.metadata) : null,
        createdAt: tier.createdAt,
      }));
    } catch (error) {
      safeLogger.error('Error getting subscription tiers:', error);
      throw new Error('Failed to get subscription tiers');
    }
  }

  // Subscribe user to a tier
  async subscribeUser(data: {
    communityId: string;
    tierId: string;
    userAddress: string;
    paymentTxHash?: string;
    metadata?: any;
  }): Promise<{ success: boolean; data?: any; message?: string }> {
    const { communityId, tierId, userAddress, paymentTxHash, metadata } = data;

    try {
      // Check if subscription tier exists and is active
      const tierResult = await db
        .select()
        .from(communitySubscriptionTiers)
        .where(
          and(
            eq(communitySubscriptionTiers.id, tierId),
            eq(communitySubscriptionTiers.communityId, communityId),
            eq(communitySubscriptionTiers.isActive, true)
          )
        )
        .limit(1);

      if (tierResult.length === 0) {
        return { success: false, message: 'Subscription tier not found or inactive' };
      }

      const tier = tierResult[0];

      // Check if user is a community member
      const membershipResult = await db
        .select({ role: communityMembers.role })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.userAddress, userAddress),
            eq(communityMembers.isActive, true)
          )
        )
        .limit(1);

      if (membershipResult.length === 0) {
        return { success: false, message: 'User must be a community member' };
      }

      // Check if user already has an active subscription
      const existingSubscriptionResult = await db
        .select()
        .from(communityUserSubscriptions)
        .where(
          and(
            eq(communityUserSubscriptions.tierId, tierId),
            eq(communityUserSubscriptions.userAddress, userAddress),
            eq(communityUserSubscriptions.status, 'active'),
            gt(communityUserSubscriptions.expiresAt, new Date())
          )
        )
        .limit(1);

      if (existingSubscriptionResult.length > 0) {
        return { success: false, message: 'User already has an active subscription' };
      }

      // Calculate expiry date
      const now = new Date();
      const expiresAt = new Date(now.getTime() + tier.durationDays * 24 * 60 * 60 * 1000);

      // Create the subscription
      const subscriptionResult = await db
        .insert(communityUserSubscriptions)
        .values({
          tierId,
          userAddress,
          status: 'active',
          startedAt: now,
          expiresAt,
          paymentTxHash: paymentTxHash || null,
          metadata: metadata ? JSON.stringify(metadata) : null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const newSubscription = subscriptionResult[0];

      return {
        success: true,
        data: {
          id: newSubscription.id,
          tierId: newSubscription.tierId,
          userAddress: newSubscription.userAddress,
          status: newSubscription.status,
          startedAt: newSubscription.startedAt,
          expiresAt: newSubscription.expiresAt,
          paymentTxHash: newSubscription.paymentTxHash,
          metadata: newSubscription.metadata ? JSON.parse(newSubscription.metadata) : null,
          createdAt: newSubscription.createdAt,
        }
      };
    } catch (error) {
      safeLogger.error('Error subscribing user:', error);
      return { success: false, message: 'Failed to subscribe user' };
    }
  }

  // Get user subscriptions
  async getUserSubscriptions(userAddress: string, communityId?: string): Promise<any[]> {
    try {
      let whereConditions = [
        eq(communityUserSubscriptions.userAddress, userAddress),
        eq(communityUserSubscriptions.status, 'active'),
        gt(communityUserSubscriptions.expiresAt, new Date())
      ];

      if (communityId) {
        whereConditions.push(eq(communitySubscriptionTiers.communityId, communityId));
      }

      const subscriptionsResult = await db
        .select({
          subscription: communityUserSubscriptions,
          tier: communitySubscriptionTiers,
        })
        .from(communityUserSubscriptions)
        .innerJoin(communitySubscriptionTiers, eq(communityUserSubscriptions.tierId, communitySubscriptionTiers.id))
        .where(and(...whereConditions))
        .orderBy(desc(communityUserSubscriptions.startedAt));

      return subscriptionsResult.map(({ subscription, tier }) => ({
        id: subscription.id,
        tierId: subscription.tierId,
        userAddress: subscription.userAddress,
        status: subscription.status,
        startedAt: subscription.startedAt,
        expiresAt: subscription.expiresAt,
        paymentTxHash: subscription.paymentTxHash,
        metadata: subscription.metadata ? JSON.parse(subscription.metadata) : null,
        tier: {
          id: tier.id,
          communityId: tier.communityId,
          name: tier.name,
          description: tier.description,
          price: tier.price,
          currency: tier.currency,
          benefits: JSON.parse(tier.benefits),
          accessLevel: tier.accessLevel,
          durationDays: tier.durationDays,
        },
        createdAt: subscription.createdAt,
      }));
    } catch (error) {
      safeLogger.error('Error getting user subscriptions:', error);
      throw new Error('Failed to get user subscriptions');
    }
  }

  // Create checkout session (placeholder for Stripe integration)
  async createCheckoutSession(data: {
    tierId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ success: boolean; data?: any; message?: string }> {
    const { tierId, successUrl, cancelUrl } = data;

    try {
      // Get subscription tier details
      const tierResult = await db
        .select({
          id: communitySubscriptionTiers.id,
          name: communitySubscriptionTiers.name,
          price: communitySubscriptionTiers.price,
          currency: communitySubscriptionTiers.currency,
        })
        .from(communitySubscriptionTiers)
        .where(eq(communitySubscriptionTiers.id, tierId))
        .limit(1);

      if (tierResult.length === 0) {
        return { success: false, message: 'Subscription tier not found' };
      }

      const tier = tierResult[0];

      // TODO: Integrate with Stripe API
      // For now, return a mock session ID
      const mockSessionId = `cs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        success: true,
        data: {
          sessionId: mockSessionId,
          tier: {
            id: tier.id,
            name: tier.name,
            price: tier.price,
            currency: tier.currency,
          },
          successUrl,
          cancelUrl,
        }
      };
    } catch (error) {
      safeLogger.error('Error creating checkout session:', error);
      return { success: false, message: 'Failed to create checkout session' };
    }
  }

  // Process crypto payment (placeholder for blockchain integration)
  async processCryptoPayment(data: {
    tierId: string;
    paymentTxHash: string;
    userAddress: string;
  }): Promise<{ success: boolean; data?: any; message?: string }> {
    const { tierId, paymentTxHash, userAddress } = data;

    try {
      // Get subscription tier details
      const tierResult = await db
        .select({
          id: communitySubscriptionTiers.id,
          communityId: communitySubscriptionTiers.communityId,
          price: communitySubscriptionTiers.price,
          currency: communitySubscriptionTiers.currency,
        })
        .from(communitySubscriptionTiers)
        .where(eq(communitySubscriptionTiers.id, tierId))
        .limit(1);

      if (tierResult.length === 0) {
        return { success: false, message: 'Subscription tier not found' };
      }

      const tier = tierResult[0];

      // TODO: Verify payment transaction on blockchain
      // For now, assume payment is valid

      // Create subscription
      const subscriptionResult = await this.subscribeUser({
        communityId: tier.communityId,
        tierId,
        userAddress,
        paymentTxHash,
      });

      if (!subscriptionResult.success) {
        return subscriptionResult;
      }

      return {
        success: true,
        data: {
          ...subscriptionResult.data,
          paymentTxHash,
          verifiedAt: new Date(),
        }
      };
    } catch (error) {
      safeLogger.error('Error processing crypto payment:', error);
      return { success: false, message: 'Failed to process crypto payment' };
    }
  }

  // Search communities with advanced filtering
  async searchCommunities(data: {
    query: string;
    page: number;
    limit: number;
    category?: string;
    sort?: string;
  }): Promise<any> {
    const { query, page, limit, category, sort = 'relevance' } = data;
    const offset = (page - 1) * limit;

    try {
      // Build search conditions
      const whereConditions = [];

      // Search query - search in name, displayName, description, and tags
      const searchTerm = `%${query.toLowerCase()}%`;
      whereConditions.push(
        or(
          like(communities.name, searchTerm),
          like(communities.displayName, searchTerm),
          like(communities.description, searchTerm),
          sql`EXISTS (
            SELECT 1 FROM json_array_elements_text(${communities.tags}::json) AS tag 
            WHERE LOWER(tag) LIKE ${searchTerm}
          )`
        )
      );

      // Category filter
      if (category) {
        whereConditions.push(eq(communities.category, category));
      }

      // Only public communities
      whereConditions.push(eq(communities.isPublic, true));

      const whereClause = and(...whereConditions);

      // Determine sort order
      let orderBy;
      switch (sort) {
        case 'newest':
          orderBy = desc(communities.createdAt);
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
        case 'relevance':
        default:
          // Relevance sorting: prioritize exact name matches, then display name matches
          orderBy = [
            // Exact name match first
            sql`CASE WHEN LOWER(${communities.name}) = ${query.toLowerCase()} THEN 1 ELSE 2 END`,
            // Display name match
            sql`CASE WHEN LOWER(${communities.displayName}) = ${query.toLowerCase()} THEN 1 ELSE 2 END`,
            // Member count as secondary sort
            desc(communities.memberCount)
          ];
          break;
      }

      // Get communities with stats
      const communityList = await db
        .select({
          id: communities.id,
          name: communities.name,
          slug: communities.slug,
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

      // Transform to expected format and calculate relevance score
      const transformedCommunities = communityList.map(item => {
        const name = item.name || '';
        const displayName = item.displayName || '';
        const description = item.description || '';
        const tags = item.tags ? JSON.parse(item.tags) : [];

        // Calculate relevance score
        let relevanceScore = 0;
        const queryLower = query.toLowerCase();

        if (name.toLowerCase() === queryLower) relevanceScore += 100;
        if (displayName.toLowerCase() === queryLower) relevanceScore += 90;
        if (name.toLowerCase().startsWith(queryLower)) relevanceScore += 80;
        if (displayName.toLowerCase().startsWith(queryLower)) relevanceScore += 70;
        if (name.toLowerCase().includes(queryLower)) relevanceScore += 60;
        if (displayName.toLowerCase().includes(queryLower)) relevanceScore += 50;
        if (description && description.toLowerCase().includes(queryLower)) relevanceScore += 30;
        if (tags.some((tag: string) => tag.toLowerCase().includes(queryLower))) relevanceScore += 40;

        return {
          id: item.id,
          name: item.name,
          slug: item.slug,
          displayName: item.displayName,
          description: description || '',
          category: item.category,
          tags: tags,
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
          relevanceScore,
        };
      });

      // Sort by relevance score if using relevance sort
      if (sort === 'relevance') {
        transformedCommunities.sort((a, b) => b.relevanceScore - a.relevanceScore);
      }

      return {
        communities: transformedCommunities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        searchMeta: {
          query,
          category,
          sort,
          totalResults: total,
        }
      };
    } catch (error) {
      safeLogger.error('Error searching communities:', error);
      throw new Error('Failed to search communities');
    }
  }

  // Check if user has access to token-gated content
  async checkContentAccess(contentId: string, userAddress: string): Promise<boolean> {
    try {
      // Check if user has direct access
      const directAccess = await db
        .select()
        .from(communityUserContentAccess)
        .where(
          and(
            eq(communityUserContentAccess.contentId, contentId),
            eq(communityUserContentAccess.userAddress, userAddress),
            or(
              isNull(communityUserContentAccess.accessExpiresAt),
              gt(communityUserContentAccess.accessExpiresAt, new Date())
            )
          )
        )
        .limit(1);

      if (directAccess.length > 0) {
        return ['view', 'interact', 'full'].includes(directAccess[0].accessLevel);
      }

      // Check if user has an active subscription that grants access
      const content = await db
        .select({
          communityId: communityTokenGatedContent.communityId,
          subscriptionTier: communityTokenGatedContent.subscriptionTier,
        })
        .from(communityTokenGatedContent)
        .where(eq(communityTokenGatedContent.id, contentId))
        .limit(1);

      if (content.length === 0) {
        return false; // Content not found
      }

      const { communityId, subscriptionTier } = content[0];

      // Check for active subscription
      if (subscriptionTier) {
        const userSubscription = await db
          .select()
          .from(communityUserSubscriptions)
          .where(
            and(
              eq(communityUserSubscriptions.userId, userAddress),
              eq(communityUserSubscriptions.communityId, communityId),
              eq(communityUserSubscriptions.status, 'active'),
              gt(communityUserSubscriptions.endDate, new Date())
            )
          )
          .limit(1);

        if (userSubscription.length > 0) {
          // Check if subscription tier matches or provides access
          const subscriptionTierData = await db
            .select()
            .from(communitySubscriptionTiers)
            .where(eq(communitySubscriptionTiers.id, userSubscription[0].tierId))
            .limit(1);

          if (subscriptionTierData.length > 0) {
            // For now, we'll assume any active subscription grants access
            // In a real implementation, you'd check if the specific tier grants access
            return true;
          }
        }
      }

      // Check token/NFT ownership requirements
      const gatedContent = await db
        .select()
        .from(communityTokenGatedContent)
        .where(eq(communityTokenGatedContent.id, contentId))
        .limit(1);

      if (gatedContent.length === 0) {
        return false;
      }

      const gated = gatedContent[0];

      // For token balance requirements, we would integrate with blockchain APIs
      // For now, we'll return false as we don't have blockchain integration
      if (gated.gatingType === 'token_balance' && gated.minimumBalance) {
        // In a real implementation, check user's token balance
        // This would require blockchain integration
        return false;
      }

      // For NFT ownership, we would check user's NFT holdings
      if (gated.gatingType === 'nft_ownership' && gated.tokenAddress) {
        // In a real implementation, check user's NFT ownership
        // This would require blockchain integration
        return false;
      }

      return false;
    } catch (error) {
      safeLogger.error('Error checking content access:', error);
      return false;
    }
  }

  // Grant access to token-gated content
  async grantContentAccess(contentId: string, userAddress: string, accessLevel: string = 'view'): Promise<boolean> {
    try {
      // Check if content exists
      const content = await db
        .select()
        .from(communityTokenGatedContent)
        .where(eq(communityTokenGatedContent.id, contentId))
        .limit(1);

      if (content.length === 0) {
        throw new Error('Content not found');
      }

      // Grant access
      await db
        .insert(communityUserContentAccess)
        .values({
          contentId,
          userAddress,
          accessLevel,
          accessGrantedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [communityUserContentAccess.contentId, communityUserContentAccess.userAddress],
          set: {
            accessLevel,
            accessGrantedAt: new Date(),
            updatedAt: new Date(),
          }
        });

      return true;
    } catch (error) {
      safeLogger.error('Error granting content access:', error);
      return false;
    }
  }

  // Create token-gated content
  async createTokenGatedContent(data: {
    communityId: string;
    postId?: string;
    gatingType: 'token_balance' | 'nft_ownership' | 'subscription';
    tokenAddress?: string;
    tokenId?: string;
    minimumBalance?: string;
    subscriptionTier?: string;
    accessType?: string;
    metadata?: any;
  }): Promise<any> {
    try {
      // Create the token-gated content record
      const result = await db
        .insert(communityTokenGatedContent)
        .values({
          communityId: data.communityId,
          postId: data.postId,
          gatingType: data.gatingType,
          tokenAddress: data.tokenAddress,
          tokenId: data.tokenId,
          minimumBalance: data.minimumBalance,
          subscriptionTier: data.subscriptionTier,
          accessType: data.accessType || 'view',
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        })
        .returning();

      const newContent = result[0];

      return {
        id: newContent.id,
        communityId: newContent.communityId,
        postId: newContent.postId,
        gatingType: newContent.gatingType,
        tokenAddress: newContent.tokenAddress,
        tokenId: newContent.tokenId,
        minimumBalance: newContent.minimumBalance ? Number(newContent.minimumBalance) : null,
        subscriptionTier: newContent.subscriptionTier,
        accessType: newContent.accessType,
        metadata: newContent.metadata ? JSON.parse(newContent.metadata) : null,
        createdAt: newContent.createdAt,
        updatedAt: newContent.updatedAt,
      };
    } catch (error) {
      safeLogger.error('Error creating token-gated content:', error);
      throw new Error('Failed to create token-gated content');
    }
  }

  // Get token-gated content by post ID
  async getTokenGatedContentByPost(postId: string): Promise<any> {
    try {
      const content = await db
        .select()
        .from(communityTokenGatedContent)
        .where(eq(communityTokenGatedContent.postId, postId))
        .limit(1);

      if (content.length === 0) {
        return null;
      }

      const gatedContent = content[0];

      return {
        id: gatedContent.id,
        communityId: gatedContent.communityId,
        postId: gatedContent.postId,
        gatingType: gatedContent.gatingType,
        tokenAddress: gatedContent.tokenAddress,
        tokenId: gatedContent.tokenId,
        minimumBalance: gatedContent.minimumBalance ? Number(gatedContent.minimumBalance) : null,
        subscriptionTier: gatedContent.subscriptionTier,
        accessType: gatedContent.accessType,
        metadata: gatedContent.metadata ? JSON.parse(gatedContent.metadata) : null,
        createdAt: gatedContent.createdAt,
        updatedAt: gatedContent.updatedAt,
      };
    } catch (error) {
      safeLogger.error('Error getting token-gated content:', error);
      throw new Error('Failed to get token-gated content');
    }
  }

  // Create subscription tier
  async createSubscriptionTierV2_Duplicate(data: {
    communityId: string;
    name: string;
    description?: string;
    price: string;
    currency: string;
    benefits: string[];
    accessLevel: string;
    durationDays?: number;
    isActive?: boolean;
    metadata?: any;
  }): Promise<any> {
    try {
      const result = await db
        .insert(communitySubscriptionTiers)
        .values({
          communityId: data.communityId,
          name: data.name,
          description: data.description,
          price: data.price,
          currency: data.currency,
          benefits: data.benefits ? JSON.stringify(data.benefits) : null,
          accessLevel: data.accessLevel,
          durationDays: data.durationDays,
          isActive: data.isActive !== undefined ? data.isActive : true,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        })
        .returning();

      const newTier = result[0];

      return {
        id: newTier.id,
        communityId: newTier.communityId,
        name: newTier.name,
        description: newTier.description,
        price: Number(newTier.price),
        currency: newTier.currency,
        benefits: newTier.benefits ? JSON.parse(newTier.benefits) : [],
        accessLevel: newTier.accessLevel,
        durationDays: newTier.durationDays,
        isActive: newTier.isActive,
        metadata: newTier.metadata ? JSON.parse(newTier.metadata) : null,
        createdAt: newTier.createdAt,
        updatedAt: newTier.updatedAt,
      };
    } catch (error) {
      safeLogger.error('Error creating subscription tier:', error);
      throw new Error('Failed to create subscription tier');
    }
  }

  // Get subscription tiers for a community
  async getSubscriptionTiersV2_Duplicate(communityId: string): Promise<any[]> {
    try {
      const tiers = await db
        .select()
        .from(communitySubscriptionTiers)
        .where(
          and(
            eq(communitySubscriptionTiers.communityId, communityId),
            eq(communitySubscriptionTiers.isActive, true)
          )
        )
        .orderBy(asc(communitySubscriptionTiers.price));

      return tiers.map(tier => ({
        id: tier.id,
        communityId: tier.communityId,
        name: tier.name,
        description: tier.description,
        price: Number(tier.price),
        currency: tier.currency,
        benefits: tier.benefits ? JSON.parse(tier.benefits) : [],
        accessLevel: tier.accessLevel,
        durationDays: tier.durationDays,
        isActive: tier.isActive,
        metadata: tier.metadata ? JSON.parse(tier.metadata) : null,
        createdAt: tier.createdAt,
        updatedAt: tier.updatedAt,
      }));
    } catch (error) {
      safeLogger.error('Error getting subscription tiers:', error);
      throw new Error('Failed to get subscription tiers');
    }
  }

  // Subscribe user to a tier
  async subscribeUserV2_Duplicate(data: {
    userId: string;
    communityId: string;
    tierId: string;
    paymentTxHash?: string;
    metadata?: any;
  }): Promise<any> {
    try {
      // Check if tier exists and is active
      const tier = await db
        .select()
        .from(communitySubscriptionTiers)
        .where(
          and(
            eq(communitySubscriptionTiers.id, data.tierId),
            eq(communitySubscriptionTiers.isActive, true)
          )
        )
        .limit(1);

      if (tier.length === 0) {
        throw new Error('Subscription tier not found or inactive');
      }

      const subscriptionTier = tier[0];

      // Calculate subscription period
      const startDate = new Date();
      const endDate = new Date(startDate);
      if (subscriptionTier.durationDays) {
        endDate.setDate(startDate.getDate() + subscriptionTier.durationDays);
      } else {
        // Default to 30 days if no duration specified
        endDate.setDate(startDate.getDate() + 30);
      }

      // Create subscription
      const result = await db
        .insert(communityUserSubscriptions)
        .values({
          userId: data.userId,
          communityId: data.communityId,
          tierId: data.tierId,
          startDate,
          endDate,
          status: 'active',
          paymentTxHash: data.paymentTxHash,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        })
        .returning();

      const newSubscription = result[0];

      return {
        id: newSubscription.id,
        userId: newSubscription.userId,
        communityId: newSubscription.communityId,
        tierId: newSubscription.tierId,
        startDate: newSubscription.startDate,
        endDate: newSubscription.endDate,
        status: newSubscription.status,
        paymentTxHash: newSubscription.paymentTxHash,
        metadata: newSubscription.metadata ? JSON.parse(newSubscription.metadata) : null,
        createdAt: newSubscription.createdAt,
        updatedAt: newSubscription.updatedAt,
      };
    } catch (error) {
      safeLogger.error('Error subscribing user:', error);
      throw new Error('Failed to subscribe user');
    }
  }

  // Get user subscriptions
  async getUserSubscriptionsV2_Duplicate(userId: string, communityId?: string): Promise<any[]> {
    try {
      const whereConditions = [eq(communityUserSubscriptions.userId, userId)];

      if (communityId) {
        whereConditions.push(eq(communityUserSubscriptions.communityId, communityId));
      }

      const subscriptions = await db
        .select({
          subscription: communityUserSubscriptions,
          tier: communitySubscriptionTiers,
        })
        .from(communityUserSubscriptions)
        .leftJoin(communitySubscriptionTiers, eq(communityUserSubscriptions.tierId, communitySubscriptionTiers.id))
        .where(and(...whereConditions))
        .orderBy(desc(communityUserSubscriptions.createdAt));

      return subscriptions.map(sub => ({
        id: sub.subscription.id,
        userId: sub.subscription.userId,
        communityId: sub.subscription.communityId,
        tierId: sub.subscription.tierId,
        startDate: sub.subscription.startDate,
        endDate: sub.subscription.endDate,
        status: sub.subscription.status,
        paymentTxHash: sub.subscription.paymentTxHash,
        metadata: sub.subscription.metadata ? JSON.parse(sub.subscription.metadata) : null,
        createdAt: sub.subscription.createdAt,
        updatedAt: sub.subscription.updatedAt,
        tier: sub.tier ? {
          id: sub.tier.id,
          communityId: sub.tier.communityId,
          name: sub.tier.name,
          description: sub.tier.description,
          price: Number(sub.tier.price),
          currency: sub.tier.currency,
          benefits: sub.tier.benefits ? JSON.parse(sub.tier.benefits) : [],
          accessLevel: sub.tier.accessLevel,
          durationDays: sub.tier.durationDays,
          isActive: sub.tier.isActive,
        } : null,
      }));
    } catch (error) {
      safeLogger.error('Error getting user subscriptions:', error);
      throw new Error('Failed to get user subscriptions');
    }
  }

  // Revenue Sharing and Treasury Management Methods

  // Create or update community treasury pool
  async createOrUpdateTreasuryPool(data: {
    communityId: string;
    tokenAddress: string;
    tokenSymbol: string;
    contributionAmount: string;
  }): Promise<any> {
    try {
      // Check if pool exists
      const existingPool = await db
        .select()
        .from(communityTreasuryPools)
        .where(
          and(
            eq(communityTreasuryPools.communityId, data.communityId),
            eq(communityTreasuryPools.tokenAddress, data.tokenAddress),
            eq(communityTreasuryPools.isActive, true)
          )
        )
        .limit(1);

      if (existingPool.length > 0) {
        // Update existing pool
        const updatedPool = await db
          .update(communityTreasuryPools)
          .set({
            balance: sql`${communityTreasuryPools.balance} + ${data.contributionAmount}`,
            totalContributions: sql`${communityTreasuryPools.totalContributions} + ${data.contributionAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(communityTreasuryPools.id, existingPool[0].id))
          .returning();

        return {
          id: updatedPool[0].id,
          communityId: updatedPool[0].communityId,
          tokenAddress: updatedPool[0].tokenAddress,
          tokenSymbol: updatedPool[0].tokenSymbol,
          balance: Number(updatedPool[0].balance),
          totalContributions: Number(updatedPool[0].totalContributions),
          totalDistributions: Number(updatedPool[0].totalDistributions),
          isActive: updatedPool[0].isActive,
          createdAt: updatedPool[0].createdAt,
          updatedAt: updatedPool[0].updatedAt,
        };
      } else {
        // Create new pool
        const newPool = await db
          .insert(communityTreasuryPools)
          .values({
            communityId: data.communityId,
            tokenAddress: data.tokenAddress,
            tokenSymbol: data.tokenSymbol,
            balance: data.contributionAmount,
            totalContributions: data.contributionAmount,
            totalDistributions: "0",
            isActive: true,
          })
          .returning();

        return {
          id: newPool[0].id,
          communityId: newPool[0].communityId,
          tokenAddress: newPool[0].tokenAddress,
          tokenSymbol: newPool[0].tokenSymbol,
          balance: Number(newPool[0].balance),
          totalContributions: Number(newPool[0].totalContributions),
          totalDistributions: Number(newPool[0].totalDistributions),
          isActive: newPool[0].isActive,
          createdAt: newPool[0].createdAt,
          updatedAt: newPool[0].updatedAt,
        };
      }
    } catch (error) {
      safeLogger.error('Error creating or updating treasury pool:', error);
      throw new Error('Failed to create or update treasury pool');
    }
  }

  // Distribute creator rewards from community fees
  async distributeCreatorRewards(data: {
    communityId: string;
    postId?: string;
    creatorAddress: string;
    rewardAmount: string;
    tokenAddress: string;
    tokenSymbol: string;
    distributionType: string;
    metadata?: any;
  }): Promise<any> {
    try {
      const reward = await db
        .insert(communityCreatorRewards)
        .values({
          communityId: data.communityId,
          postId: data.postId,
          creatorAddress: data.creatorAddress,
          rewardAmount: data.rewardAmount,
          tokenAddress: data.tokenAddress,
          tokenSymbol: data.tokenSymbol,
          distributionType: data.distributionType,
          status: 'pending',
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        })
        .returning();

      const newReward = reward[0];

      return {
        id: newReward.id,
        communityId: newReward.communityId,
        postId: newReward.postId,
        creatorAddress: newReward.creatorAddress,
        rewardAmount: Number(newReward.rewardAmount),
        tokenAddress: newReward.tokenAddress,
        tokenSymbol: newReward.tokenSymbol,
        distributionType: newReward.distributionType,
        status: newReward.status,
        metadata: newReward.metadata ? JSON.parse(newReward.metadata) : null,
        createdAt: newReward.createdAt,
        distributedAt: newReward.distributedAt,
      };
    } catch (error) {
      safeLogger.error('Error distributing creator rewards:', error);
      throw new Error('Failed to distribute creator rewards');
    }
  }

  // Get creator rewards for a user
  async getCreatorRewards(userAddress: string, communityId?: string): Promise<any[]> {
    try {
      const whereConditions = [eq(communityCreatorRewards.creatorAddress, userAddress)];

      if (communityId) {
        whereConditions.push(eq(communityCreatorRewards.communityId, communityId));
      }

      const rewards = await db
        .select()
        .from(communityCreatorRewards)
        .where(and(...whereConditions))
        .orderBy(desc(communityCreatorRewards.createdAt));

      return rewards.map(reward => ({
        id: reward.id,
        communityId: reward.communityId,
        postId: reward.postId,
        creatorAddress: reward.creatorAddress,
        rewardAmount: Number(reward.rewardAmount),
        tokenAddress: reward.tokenAddress,
        tokenSymbol: reward.tokenSymbol,
        distributionType: reward.distributionType,
        transactionHash: reward.transactionHash,
        status: reward.status,
        metadata: reward.metadata ? JSON.parse(reward.metadata) : null,
        createdAt: reward.createdAt,
        distributedAt: reward.distributedAt,
      }));
    } catch (error) {
      safeLogger.error('Error getting creator rewards:', error);
      throw new Error('Failed to get creator rewards');
    }
  }

  // Stake tokens for rewards
  async stakeTokens(data: {
    communityId: string;
    userAddress: string;
    stakedAmount: string;
    tokenAddress: string;
    tokenSymbol: string;
    metadata?: any;
  }): Promise<any> {
    try {
      // Check if user already has an active stake
      const existingStake = await db
        .select()
        .from(communityStaking)
        .where(
          and(
            eq(communityStaking.communityId, data.communityId),
            eq(communityStaking.userAddress, data.userAddress),
            eq(communityStaking.tokenAddress, data.tokenAddress),
            eq(communityStaking.isActive, true)
          )
        )
        .limit(1);

      if (existingStake.length > 0) {
        // Update existing stake
        const updatedStake = await db
          .update(communityStaking)
          .set({
            stakedAmount: sql`${communityStaking.stakedAmount} + ${data.stakedAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(communityStaking.id, existingStake[0].id))
          .returning();

        return {
          id: updatedStake[0].id,
          communityId: updatedStake[0].communityId,
          userAddress: updatedStake[0].userAddress,
          stakedAmount: Number(updatedStake[0].stakedAmount),
          tokenAddress: updatedStake[0].tokenAddress,
          tokenSymbol: updatedStake[0].tokenSymbol,
          stakedAt: updatedStake[0].stakedAt,
          unstakedAt: updatedStake[0].unstakedAt,
          rewardsEarned: Number(updatedStake[0].rewardsEarned),
          isActive: updatedStake[0].isActive,
          metadata: updatedStake[0].metadata ? JSON.parse(updatedStake[0].metadata) : null,
          createdAt: updatedStake[0].createdAt,
          updatedAt: updatedStake[0].updatedAt,
        };
      } else {
        // Create new stake
        const newStake = await db
          .insert(communityStaking)
          .values({
            communityId: data.communityId,
            userAddress: data.userAddress,
            stakedAmount: data.stakedAmount,
            tokenAddress: data.tokenAddress,
            tokenSymbol: data.tokenSymbol,
            rewardsEarned: "0",
            isActive: true,
            metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          })
          .returning();

        return {
          id: newStake[0].id,
          communityId: newStake[0].communityId,
          userAddress: newStake[0].userAddress,
          stakedAmount: Number(newStake[0].stakedAmount),
          tokenAddress: newStake[0].tokenAddress,
          tokenSymbol: newStake[0].tokenSymbol,
          stakedAt: newStake[0].stakedAt,
          unstakedAt: newStake[0].unstakedAt,
          rewardsEarned: Number(newStake[0].rewardsEarned),
          isActive: newStake[0].isActive,
          metadata: newStake[0].metadata ? JSON.parse(newStake[0].metadata) : null,
          createdAt: newStake[0].createdAt,
          updatedAt: newStake[0].updatedAt,
        };
      }
    } catch (error) {
      safeLogger.error('Error staking tokens:', error);
      throw new Error('Failed to stake tokens');
    }
  }

  // Unstake tokens
  async unstakeTokens(stakingId: string, userAddress: string): Promise<any> {
    try {
      const unstaked = await db
        .update(communityStaking)
        .set({
          isActive: false,
          unstakedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(communityStaking.id, stakingId),
            eq(communityStaking.userAddress, userAddress)
          )
        )
        .returning();

      if (unstaked.length === 0) {
        throw new Error('Staking record not found or unauthorized');
      }

      const stake = unstaked[0];

      return {
        id: stake.id,
        communityId: stake.communityId,
        userAddress: stake.userAddress,
        stakedAmount: Number(stake.stakedAmount),
        tokenAddress: stake.tokenAddress,
        tokenSymbol: stake.tokenSymbol,
        stakedAt: stake.stakedAt,
        unstakedAt: stake.unstakedAt,
        rewardsEarned: Number(stake.rewardsEarned),
        isActive: stake.isActive,
        metadata: stake.metadata ? JSON.parse(stake.metadata) : null,
        createdAt: stake.createdAt,
        updatedAt: stake.updatedAt,
      };
    } catch (error) {
      safeLogger.error('Error unstaking tokens:', error);
      throw new Error('Failed to unstake tokens');
    }
  }

  // Get user staking information
  async getUserStaking(userAddress: string, communityId?: string): Promise<any[]> {
    try {
      const whereConditions = [eq(communityStaking.userAddress, userAddress)];

      if (communityId) {
        whereConditions.push(eq(communityStaking.communityId, communityId));
      }

      const stakes = await db
        .select()
        .from(communityStaking)
        .where(and(...whereConditions))
        .orderBy(desc(communityStaking.stakedAt));

      return stakes.map(stake => ({
        id: stake.id,
        communityId: stake.communityId,
        userAddress: stake.userAddress,
        stakedAmount: Number(stake.stakedAmount),
        tokenAddress: stake.tokenAddress,
        tokenSymbol: stake.tokenSymbol,
        stakedAt: stake.stakedAt,
        unstakedAt: stake.unstakedAt,
        rewardsEarned: Number(stake.rewardsEarned),
        isActive: stake.isActive,
        metadata: stake.metadata ? JSON.parse(stake.metadata) : null,
        createdAt: stake.createdAt,
        updatedAt: stake.updatedAt,
      }));
    } catch (error) {
      safeLogger.error('Error getting user staking information:', error);
      throw new Error('Failed to get user staking information');
    }
  }

  // Distribute staking rewards
  async distributeStakingRewards(data: {
    stakingId: string;
    userAddress: string;
    rewardAmount: string;
    tokenAddress: string;
    tokenSymbol: string;
    rewardType: string;
    metadata?: any;
  }): Promise<any> {
    try {
      const reward = await db
        .insert(communityStakingRewards)
        .values({
          stakingId: data.stakingId,
          userAddress: data.userAddress,
          rewardAmount: data.rewardAmount,
          tokenAddress: data.tokenAddress,
          tokenSymbol: data.tokenSymbol,
          rewardType: data.rewardType,
          status: 'pending',
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        })
        .returning();

      const newReward = reward[0];

      // Update user's total rewards earned
      await db
        .update(communityStaking)
        .set({
          rewardsEarned: sql`${communityStaking.rewardsEarned} + ${data.rewardAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(communityStaking.id, data.stakingId));

      return {
        id: newReward.id,
        stakingId: newReward.stakingId,
        userAddress: newReward.userAddress,
        rewardAmount: Number(newReward.rewardAmount),
        tokenAddress: newReward.tokenAddress,
        tokenSymbol: newReward.tokenSymbol,
        rewardType: newReward.rewardType,
        transactionHash: newReward.transactionHash,
        status: newReward.status,
        metadata: newReward.metadata ? JSON.parse(newReward.metadata) : null,
        createdAt: newReward.createdAt,
        distributedAt: newReward.distributedAt,
      };
    } catch (error) {
      safeLogger.error('Error distributing staking rewards:', error);
      throw new Error('Failed to distribute staking rewards');
    }
  }

  // Create referral program
  async createReferralProgram(data: {
    communityId: string;
    name: string;
    description?: string;
    rewardAmount: string;
    rewardToken: string;
    rewardTokenSymbol: string;
    referralLimit?: number;
    startDate: Date;
    endDate?: Date;
    metadata?: any;
  }): Promise<any> {
    try {
      const program = await db
        .insert(communityReferralPrograms)
        .values({
          communityId: data.communityId,
          name: data.name,
          description: data.description,
          rewardAmount: data.rewardAmount,
          rewardToken: data.rewardToken,
          rewardTokenSymbol: data.rewardTokenSymbol,
          referralLimit: data.referralLimit,
          isActive: true,
          startDate: data.startDate,
          endDate: data.endDate,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        })
        .returning();

      const newProgram = program[0];

      return {
        id: newProgram.id,
        communityId: newProgram.communityId,
        name: newProgram.name,
        description: newProgram.description,
        rewardAmount: Number(newProgram.rewardAmount),
        rewardToken: newProgram.rewardToken,
        rewardTokenSymbol: newProgram.rewardTokenSymbol,
        referralLimit: newProgram.referralLimit,
        isActive: newProgram.isActive,
        startDate: newProgram.startDate,
        endDate: newProgram.endDate,
        metadata: newProgram.metadata ? JSON.parse(newProgram.metadata) : null,
        createdAt: newProgram.createdAt,
        updatedAt: newProgram.updatedAt,
      };
    } catch (error) {
      safeLogger.error('Error creating referral program:', error);
      throw new Error('Failed to create referral program');
    }
  }

  // Record user referral
  async recordUserReferral(data: {
    programId: string;
    referrerAddress: string;
    referredAddress: string;
    rewardAmount: string;
    rewardToken: string;
    rewardTokenSymbol: string;
    metadata?: any;
  }): Promise<any> {
    try {
      // Check if referral already exists
      const existingReferral = await db
        .select()
        .from(communityUserReferrals)
        .where(
          and(
            eq(communityUserReferrals.programId, data.programId),
            eq(communityUserReferrals.referrerAddress, data.referrerAddress),
            eq(communityUserReferrals.referredAddress, data.referredAddress)
          )
        )
        .limit(1);

      if (existingReferral.length > 0) {
        throw new Error('Referral already recorded');
      }

      const referral = await db
        .insert(communityUserReferrals)
        .values({
          programId: data.programId,
          referrerAddress: data.referrerAddress,
          referredAddress: data.referredAddress,
          rewardAmount: data.rewardAmount,
          rewardToken: data.rewardToken,
          rewardTokenSymbol: data.rewardTokenSymbol,
          rewardStatus: 'pending',
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        })
        .returning();

      const newReferral = referral[0];

      return {
        id: newReferral.id,
        programId: newReferral.programId,
        referrerAddress: newReferral.referrerAddress,
        referredAddress: newReferral.referredAddress,
        rewardAmount: Number(newReferral.rewardAmount),
        rewardToken: newReferral.rewardToken,
        rewardTokenSymbol: newReferral.rewardTokenSymbol,
        rewardStatus: newReferral.rewardStatus,
        transactionHash: newReferral.transactionHash,
        metadata: newReferral.metadata ? JSON.parse(newReferral.metadata) : null,
        createdAt: newReferral.createdAt,
        rewardedAt: newReferral.rewardedAt,
      };
    } catch (error) {
      safeLogger.error('Error recording user referral:', error);
      throw new Error('Failed to record user referral');
    }
  }

  // Get referral program details
  async getReferralProgram(programId: string): Promise<any> {
    try {
      const program = await db
        .select()
        .from(communityReferralPrograms)
        .where(eq(communityReferralPrograms.id, programId))
        .limit(1);

      if (program.length === 0) {
        return null;
      }

      const prog = program[0];

      return {
        id: prog.id,
        communityId: prog.communityId,
        name: prog.name,
        description: prog.description,
        rewardAmount: Number(prog.rewardAmount),
        rewardToken: prog.rewardToken,
        rewardTokenSymbol: prog.rewardTokenSymbol,
        referralLimit: prog.referralLimit,
        isActive: prog.isActive,
        startDate: prog.startDate,
        endDate: prog.endDate,
        metadata: prog.metadata ? JSON.parse(prog.metadata) : null,
        createdAt: prog.createdAt,
        updatedAt: prog.updatedAt,
      };
    } catch (error) {
      safeLogger.error('Error getting referral program:', error);
      throw new Error('Failed to get referral program');
    }
  }

  // Get user referrals
  async getUserReferrals(userAddress: string, programId?: string): Promise<any[]> {
    try {
      const whereConditions = [
        or(
          eq(communityUserReferrals.referrerAddress, userAddress),
          eq(communityUserReferrals.referredAddress, userAddress)
        )
      ];

      if (programId) {
        whereConditions.push(eq(communityUserReferrals.programId, programId));
      }

      const referrals = await db
        .select()
        .from(communityUserReferrals)
        .where(and(...whereConditions))
        .orderBy(desc(communityUserReferrals.createdAt));

      return referrals.map(referral => ({
        id: referral.id,
        programId: referral.programId,
        referrerAddress: referral.referrerAddress,
        referredAddress: referral.referredAddress,
        rewardAmount: Number(referral.rewardAmount),
        rewardToken: referral.rewardToken,
        rewardTokenSymbol: referral.rewardTokenSymbol,
        rewardStatus: referral.rewardStatus,
        transactionHash: referral.transactionHash,
        metadata: referral.metadata ? JSON.parse(referral.metadata) : null,
        createdAt: referral.createdAt,
        rewardedAt: referral.rewardedAt,
      }));
    } catch (error) {
      safeLogger.error('Error getting user referrals:', error);
      throw new Error('Failed to get user referrals');
    }
  }

  // Helper method to build time filter
  private buildTimeFilter(timeRange: string) {
    const now = new Date();
    switch (timeRange) {
      case 'hour':
        return gt(posts.createdAt, new Date(now.getTime() - 60 * 60 * 1000));
      case 'day':
        return gt(posts.createdAt, new Date(now.getTime() - 24 * 60 * 60 * 1000));
      case 'week':
        return gt(posts.createdAt, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
      case 'month':
        return gt(posts.createdAt, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
      case 'year':
        return gt(posts.createdAt, new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000));
      default:
        return undefined; // 'all' - no time filter
    }
  }
  /**
   * Search for authors within communities
   */
  async searchAuthors(query: string): Promise<any[]> {
    try {
      const authors = await db
        .select({
          id: users.id,
          username: users.handle,
          address: users.walletAddress,
          // Using available columns since ensName, avatar, reputation, and isVerified don't exist
        })
        .from(users)
        .leftJoin(posts, eq(posts.authorId, users.id))
        .where(
          or(
            like(users.handle, `%${query}%`),
            like(users.walletAddress, `%${query}%`)
          )
        )
        .groupBy(users.id, users.handle, users.walletAddress)
        .having(gt(count(posts.id), 0)) // Only users who have posted
        .limit(10);

      return authors.map(author => ({
        id: author.id,
        username: author.username || author.address,
        displayName: author.username || author.address,
        address: author.address,
        avatar: null, // No avatar column in users table
        reputation: 0, // No reputation column in users table
        isVerified: false, // No isVerified column in users table
        postCount: 0 // Could be calculated if needed
      }));
    } catch (error) {
      safeLogger.error('Error searching authors:', error);
      throw new Error('Failed to search authors');
    }
  }

  /**
   * Calculate voting power based on user reputation and role
   */
  async calculateVotingPower(communityId: string, voterAddress: string): Promise<number> {
    try {
      // Get member info
      const memberResult = await db
        .select({
          role: communityMembers.role,
          reputation: communityMembers.reputation,
        })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.userAddress, voterAddress),
            eq(communityMembers.isActive, true)
          )
        )
        .limit(1);

      if (memberResult.length === 0) {
        return 1; // Base voting power for non-members
      }

      const member = memberResult[0];
      let votingPower = 1;

      // Role-based multipliers
      switch (member.role) {
        case 'admin':
          votingPower *= 3;
          break;
        case 'moderator':
          votingPower *= 2;
          break;
        case 'member':
          votingPower *= 1;
          break;
        default:
          votingPower *= 1;
      }

      // Reputation-based bonus (add 1% per 100 reputation points)
      const reputation = member.reputation || 0;
      const reputationBonus = Math.floor(reputation / 100) * 0.01;
      votingPower *= (1 + reputationBonus);

      return Math.floor(votingPower * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      safeLogger.error('Error calculating voting power:', error);
      return 1;
    }
  }

  /**
   * Update proposal status based on voting results
   */
  async updateProposalStatus(proposalId: string): Promise<void> {
    try {
      // Get proposal
      const proposalResult = await db
        .select()
        .from(communityGovernanceProposals)
        .where(eq(communityGovernanceProposals.id, proposalId))
        .limit(1);

      if (proposalResult.length === 0) {
        throw new Error('Proposal not found');
      }

      const proposal = proposalResult[0];
      const now = new Date();

      // Check if voting period has ended
      if (now < proposal.votingEndTime) {
        return; // Voting still in progress
      }

      // Calculate results
      const totalVotes = Number(proposal.totalVotes);
      const yesVotes = Number(proposal.yesVotes);
      const noVotes = Number(proposal.noVotes);
      const quorum = Number(proposal.quorum);

      // Check if quorum reached
      const quorumReached = totalVotes >= quorum;

      // Check if proposal passed (majority vote)
      const yesPercentage = totalVotes > 0 ? (yesVotes / totalVotes) * 100 : 0;
      const passed = quorumReached && yesPercentage >= proposal.requiredMajority;

      // Determine new status
      let newStatus: string;
      if (proposal.status === 'cancelled') {
        return; // Don't change cancelled proposals
      } else if (!quorumReached) {
        newStatus = 'failed';
      } else if (passed) {
        newStatus = 'passed';
      } else {
        newStatus = 'failed';
      }

      // Calculate execution ETA if passed and has execution delay
      let executionEta: Date | null = null;
      if (newStatus === 'passed' && proposal.executionDelay) {
        executionEta = new Date(now.getTime() + proposal.executionDelay * 1000);
      }

      // Update proposal
      await db
        .update(communityGovernanceProposals)
        .set({
          status: newStatus,
          quorumReached,
          executionEta,
          updatedAt: now,
        })
        .where(eq(communityGovernanceProposals.id, proposalId));

    } catch (error) {
      safeLogger.error('Error updating proposal status:', error);
      throw new Error('Failed to update proposal status');
    }
  }

  /**
   * Validate proposal type and metadata
   */
  private validateProposalType(type: string, metadata: any): { isValid: boolean; error?: string } {
    // Basic validation - in a real implementation, you would have more specific validation
    // based on the proposal type and required metadata fields

    if (!type) {
      return { isValid: false, error: 'Proposal type is required' };
    }

    // Add validation logic based on proposal type
    switch (type) {
      case 'general':
        // General proposals don't require special metadata
        return { isValid: true };
      case 'parameter_change':
        if (!metadata || !metadata.parameter || !metadata.newValue) {
          return { isValid: false, error: 'Parameter change proposals require parameter and newValue in metadata' };
        }
        return { isValid: true };
      case 'treasury':
        if (!metadata || !metadata.amount || !metadata.recipient) {
          return { isValid: false, error: 'Treasury proposals require amount and recipient in metadata' };
        }
        return { isValid: true };
      case 'membership':
        if (!metadata || !metadata.action || !metadata.address) {
          return { isValid: false, error: 'Membership proposals require action and address in metadata' };
        }
        return { isValid: true };
      default:
        // Allow unknown types but warn
        safeLogger.warn(`Unknown proposal type: ${type}`);
        return { isValid: true };
    }
  }

  /**
   * Execute a passed governance proposal
   */
  async executeProposal(proposalId: string, executorAddress: string): Promise<any> {
    try {
      // Get proposal
      const proposalResult = await db
        .select()
        .from(communityGovernanceProposals)
        .where(eq(communityGovernanceProposals.id, proposalId))
        .limit(1);

      if (proposalResult.length === 0) {
        return { success: false, message: 'Proposal not found' };
      }

      const proposal = proposalResult[0];
      const now = new Date();

      // Check if proposal can be executed
      if (proposal.status !== 'passed') {
        return { success: false, message: 'Proposal has not passed' };
      }

      if (proposal.executedAt) {
        return { success: false, message: 'Proposal already executed' };
      }

      // Check execution delay
      if (proposal.executionEta && now < proposal.executionEta) {
        return {
          success: false,
          message: `Proposal cannot be executed until ${proposal.executionEta.toISOString()}`
        };
      }

      // Check if executor is authorized (admin or moderator)
      const memberResult = await db
        .select({ role: communityMembers.role })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, proposal.communityId),
            eq(communityMembers.userAddress, executorAddress),
            eq(communityMembers.isActive, true)
          )
        )
        .limit(1);

      if (memberResult.length === 0) {
        return { success: false, message: 'Not a community member' };
      }

      const isAuthorized = ['admin', 'moderator'].includes(memberResult[0].role);
      if (!isAuthorized) {
        return { success: false, message: 'Only admins or moderators can execute proposals' };
      }

      // Execute proposal based on type
      const metadata = proposal.metadata ? JSON.parse(proposal.metadata) : {};
      let executionResult: any = {};

      switch (proposal.type) {
        case 'settings_update':
          executionResult = await this.executeSettingsUpdate(proposal.communityId, metadata);
          break;
        case 'member_promotion':
          executionResult = await this.executeMemberPromotion(proposal.communityId, metadata);
          break;
        case 'treasury_allocation':
          executionResult = await this.executeTreasuryAllocation(proposal.communityId, metadata);
          break;
        case 'rule_change':
          executionResult = await this.executeRuleChange(proposal.communityId, metadata);
          break;
        default:
          executionResult = { success: true, message: 'Generic proposal executed' };
      }

      // Mark proposal as executed
      await db
        .update(communityGovernanceProposals)
        .set({
          status: 'executed',
          executedAt: now,
          updatedAt: now,
          metadata: JSON.stringify({ ...metadata, executionResult }),
        })
        .where(eq(communityGovernanceProposals.id, proposalId));

      return {
        success: true,
        message: 'Proposal executed successfully',
        executionResult
      };

    } catch (error) {
      safeLogger.error('Error executing proposal:', error);
      return { success: false, message: 'Failed to execute proposal' };
    }
  }

  // Helper methods for proposal execution

  private async executeSettingsUpdate(communityId: string, metadata: any): Promise<any> {
    try {
      const { settings } = metadata;
      await db
        .update(communities)
        .set({
          settings: JSON.stringify(settings),
          updatedAt: new Date(),
        })
        .where(eq(communities.id, communityId));
      return { success: true, message: 'Community settings updated' };
    } catch (error) {
      safeLogger.error('Error executing settings update:', error);
      return { success: false, message: 'Failed to update settings' };
    }
  }

  private async executeMemberPromotion(communityId: string, metadata: any): Promise<any> {
    try {
      const { memberAddress, newRole } = metadata;
      await db
        .update(communityMembers)
        .set({
          role: newRole,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.userAddress, memberAddress)
          )
        );
      return { success: true, message: `Member promoted to ${newRole}` };
    } catch (error) {
      safeLogger.error('Error executing member promotion:', error);
      return { success: false, message: 'Failed to promote member' };
    }
  }

  private async executeTreasuryAllocation(communityId: string, metadata: any): Promise<any> {
    try {
      const { amount, recipient, tokenAddress } = metadata;
      // This would integrate with smart contracts for actual treasury transfers
      // For now, just record the allocation intent
      return {
        success: true,
        message: `Treasury allocation of ${amount} approved for ${recipient}`,
        note: 'Smart contract execution required'
      };
    } catch (error) {
      safeLogger.error('Error executing treasury allocation:', error);
      return { success: false, message: 'Failed to allocate treasury funds' };
    }
  }

  // Get communities created by a user
  async getCommunitiesCreatedByUser(userAddress: string, page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;

      // Get communities created by the user
      const userCommunities = await db
        .select({
          id: communities.id,
          name: communities.name,
          slug: communities.slug,
          displayName: communities.displayName,
          description: communities.description,
          category: communities.category,
          tags: communities.tags,
          isPublic: communities.isPublic,
          memberCount: communities.memberCount,
          postCount: communities.postCount,
          avatar: communities.avatar,
          banner: communities.banner,
          createdAt: communities.createdAt,
          updatedAt: communities.updatedAt,
          creatorAddress: communities.creatorAddress
        })
        .from(communities)
        .where(eq(communities.creatorAddress, userAddress))
        .orderBy(desc(communities.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const totalCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(communities)
        .where(eq(communities.creatorAddress, userAddress));

      return {
        communities: userCommunities,
        pagination: {
          page,
          limit,
          total: totalCount[0]?.count || 0,
          totalPages: Math.ceil((totalCount[0]?.count || 0) / limit)
        }
      };
    } catch (error) {
      safeLogger.error('Error getting communities created by user:', error);
      throw new Error('Failed to retrieve user communities');
    }
  }

  // Get communities user is a member of (but didn't create)
  async getCommunitiesUserIsMemberOf(userAddress: string, page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;

      // Get communities the user is a member of (excluding ones they created)
      const memberCommunities = await db
        .select({
          id: communities.id,
          name: communities.name,
          slug: communities.slug,
          displayName: communities.displayName,
          description: communities.description,
          category: communities.category,
          tags: communities.tags,
          isPublic: communities.isPublic,
          memberCount: communities.memberCount,
          postCount: communities.postCount,
          avatar: communities.avatar,
          banner: communities.banner,
          createdAt: communities.createdAt,
          updatedAt: communities.updatedAt,
          creatorAddress: communities.creatorAddress,
          userRole: communityMembers.role,
          joinedAt: communityMembers.joinedAt
        })
        .from(communities)
        .innerJoin(communityMembers, eq(communities.id, communityMembers.communityId))
        .where(
          and(
            eq(communityMembers.userAddress, userAddress),
            ne(communities.creatorAddress, userAddress) // Exclude communities they created
          )
        )
        .orderBy(desc(communities.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const totalCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(communities)
        .innerJoin(communityMembers, eq(communities.id, communityMembers.communityId))
        .where(
          and(
            eq(communityMembers.userAddress, userAddress),
            ne(communities.creatorAddress, userAddress) // Exclude communities they created
          )
        );

      return {
        communities: memberCommunities,
        pagination: {
          page,
          limit,
          total: totalCount[0]?.count || 0,
          totalPages: Math.ceil((totalCount[0]?.count || 0) / limit)
        }
      };
    } catch (error) {
      safeLogger.error('Error getting communities user is member of:', error);
    }
  }

  // Get all communities for the user (both created and followed)
  async getMyCommunities(userAddress: string, page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;

      // Get communities created by the user and communities the user is a member of
      // Use UNION to combine both queries and remove duplicates
      const myCommunities = await db
        .selectDistinct({
          id: communities.id,
          name: communities.name,
          slug: communities.slug,
          displayName: communities.displayName,
          description: communities.description,
          category: communities.category,
          tags: communities.tags,
          isPublic: communities.isPublic,
          memberCount: communities.memberCount,
          postCount: communities.postCount,
          avatar: communities.avatar,
          banner: communities.banner,
          createdAt: communities.createdAt,
          updatedAt: communities.updatedAt,
          creatorAddress: communities.creatorAddress
        })
        .from(communities)
        .leftJoin(communityMembers, eq(communities.id, communityMembers.communityId))
        .where(
          or(
            eq(communities.creatorAddress, userAddress),
            eq(communityMembers.userAddress, userAddress)
          )
        )
        .orderBy(desc(communities.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const totalCount = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${communities.id})` })
        .from(communities)
        .leftJoin(communityMembers, eq(communities.id, communityMembers.communityId))
        .where(
          or(
            eq(communities.creatorAddress, userAddress),
            eq(communityMembers.userAddress, userAddress)
          )
        );

      return {
        communities: myCommunities,
        pagination: {
          page,
          limit,
          total: totalCount[0]?.count || 0,
          totalPages: Math.ceil((totalCount[0]?.count || 0) / limit)
        }
      };
    } catch (error) {
      safeLogger.error('Error getting my communities:', error);
      throw new Error('Failed to retrieve my communities');
    }
  }

  private async executeRuleChange(communityId: string, metadata: any): Promise<any> {
    try {
      const { rules } = metadata;
      await db
        .update(communities)
        .set({
          rules: JSON.stringify(rules),
          updatedAt: new Date(),
        })
        .where(eq(communities.id, communityId));
      return { success: true, message: 'Community rules updated' };
    } catch (error) {
      safeLogger.error('Error executing rule change:', error);
      return { success: false, message: 'Failed to update rules' };
    }
  }

  // Check if user has admin permission in community
  async checkAdminPermission(communityId: string, userAddress: string): Promise<boolean> {
    try {
      const membership = await db
        .select({ role: communityMembers.role })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.userAddress, userAddress),
            eq(communityMembers.isActive, true)
          )
        )
        .limit(1);

      return membership.length > 0 && membership[0].role === 'admin';
    } catch (error) {
      safeLogger.error('Error checking admin permission:', error);
      return false;
    }
  }

  // Check if user has moderator or admin permission in community
  async checkModeratorPermission(communityId: string, userAddress: string): Promise<boolean> {
    try {
      const membership = await db
        .select({ role: communityMembers.role })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.userAddress, userAddress),
            eq(communityMembers.isActive, true)
          )
        )
        .limit(1);

      return membership.length > 0 &&
        (membership[0].role === 'admin' || membership[0].role === 'moderator');
    } catch (error) {
      safeLogger.error('Error checking moderator permission:', error);
      return false;
    }
  }

  // Check if user is a member of the community
  async checkMembership(communityId: string, userAddress: string): Promise<boolean> {
    try {
      const membership = await db
        .select({ isActive: communityMembers.isActive })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.userAddress, userAddress)
          )
        )
        .limit(1);

      return membership.length > 0 && membership[0].isActive;
    } catch (error) {
      safeLogger.error('Error checking membership:', error);
      return false;
    }
  }

  // Build time filter for queries
  // Build sort order for queries
  private buildSortOrder(sort: string) {
    switch (sort) {
      case 'hot':
        return desc(sql`(posts.reputationScore * 0.7 + posts.stakedValue * 0.3)`);
      case 'top':
        return desc(sql`posts.reputationScore`);
      case 'new':
        return desc(posts.createdAt);
      case 'rising':
        return desc(sql`(posts.reputationScore / EXTRACT(EPOCH FROM (NOW() - posts.createdAt)))`);
      default:
        return desc(posts.createdAt);
    }
  }

  // Get all community posts (for discovery)
  private async getAllCommunityPosts(options: {
    page: number;
    limit: number;
    sort: string;
    timeRange: string;
  }) {
    const { page, limit, sort, timeRange } = options;

    try {
      const offset = (page - 1) * limit;
      const timeFilter = this.buildTimeFilter(timeRange);
      const orderBy = this.buildSortOrder(sort);

      // Get public communities
      const publicCommunities = await db
        .select({ id: communities.id })
        .from(communities)
        .where(eq(communities.isPublic, true));

      const communityIds = publicCommunities.map(c => c.id);

      if (communityIds.length === 0) {
        return { posts: [], pagination: { page, limit, total: 0, totalPages: 0 } };
      }

      // Get community metadata
      const communitiesData = await db
        .select({
          id: communities.id,
          name: communities.name,
          displayName: communities.displayName,
          slug: communities.slug,
          avatar: communities.avatar
        })
        .from(communities)
        .where(inArray(communities.id, communityIds));

      const communityMap = new Map(communitiesData.map(c => [c.id, c]));

      // Query posts
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
          authorAddress: users.walletAddress,
          authorHandle: users.handle,
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .where(
          and(
            inArray(posts.communityId, communityIds),
            timeFilter || sql`1=1`,
            isNull(posts.parentId)
          )
        )
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);

      // Transform posts
      const transformedPosts = postsResult.map(post => ({
        ...post,
        mediaCids: post.mediaCids ? JSON.parse(post.mediaCids) : [],
        tags: post.tags ? JSON.parse(post.tags) : [],
        stakedValue: post.stakedValue ? Number(post.stakedValue) : 0,
        reputationScore: post.reputationScore || 0,
        community: post.communityId && communityMap.has(post.communityId) ? {
          id: post.communityId,
          name: communityMap.get(post.communityId)?.name || 'Unknown',
          displayName: communityMap.get(post.communityId)?.displayName || 'Unknown',
          slug: communityMap.get(post.communityId)?.slug || '',
          avatar: communityMap.get(post.communityId)?.avatar || null
        } : null
      }));

      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(posts)
        .where(
          and(
            inArray(posts.communityId, communityIds),
            timeFilter || sql`1=1`,
            isNull(posts.parentId)
          )
        );

      return {
        posts: transformedPosts,
        pagination: {
          page,
          limit,
          total: totalResult[0]?.count || 0,
          totalPages: Math.ceil((totalResult[0]?.count || 0) / limit)
        }
      };
    } catch (error) {
      safeLogger.error('Error getting all community posts:', error);
      return { posts: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
  }
}

export const communityService = new CommunityService();
