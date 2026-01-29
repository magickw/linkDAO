/**
 * Data Transformation Utilities for Community Enhancements
 * Transforms existing API responses to enhanced data structures
 */

import {
  EnhancedCommunityData,
  EnhancedPost,
  UserProfile,
  PostType,
  NFTPreview,
  ProposalPreview,
  DeFiPreview,
  LinkPreview,
  WalletActivity
} from '../types/communityEnhancements';

// Helper function to calculate activity level
function calculateActivityLevel(postsToday: number, activeMembers: number): 'low' | 'medium' | 'high' | 'very-high' {
  const activityScore = postsToday + (activeMembers * 0.1);

  if (activityScore >= 100) return 'very-high';
  if (activityScore >= 50) return 'high';
  if (activityScore >= 20) return 'medium';
  return 'low';
}

// Legacy API response interfaces (what we currently receive)
interface LegacyCommunityResponse {
  id: string;
  name: string;
  description: string;
  member_count: number;
  icon_url?: string;
  banner_url?: string;
  created_at: string;
  user_joined?: boolean;
  user_role?: string;
}

interface LegacyPostResponse {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author_handle: string;
  author_avatar?: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  post_type?: string;
  flair?: string;
  is_pinned?: boolean;
}

interface LegacyUserResponse {
  id: string;
  handle: string;
  avatar_url?: string;
  wallet_address?: string;
  reputation_score?: number;
  ens_name?: string;
}

/**
 * Transform legacy community data to enhanced format
 */
export function transformCommunityData(
  legacyData: LegacyCommunityResponse,
  userMembershipData?: any,
  activityMetrics?: any,
  governanceData?: any
): EnhancedCommunityData {
  return {
    id: legacyData.id,
    name: legacyData.name,
    description: legacyData.description,
    memberCount: legacyData.member_count,
    
    // Visual enhancements with defaults
    icon: legacyData.icon_url || generateDefaultIcon(legacyData.name),
    bannerImage: legacyData.banner_url,
    brandColors: generateBrandColors(legacyData.name),
    
    // User-specific data
    userMembership: {
      isJoined: userMembershipData?.is_joined || legacyData.user_joined || false,
      joinDate: userMembershipData?.join_date ? new Date(userMembershipData.join_date) : new Date(),
      reputation: userMembershipData?.reputation || 0,
      tokenBalance: userMembershipData?.token_balance || 0,
      role: (legacyData.user_role as 'member' | 'moderator' | 'admin') || 'member'
    },
    
    // Activity metrics with defaults
    activityMetrics: {
      postsToday: activityMetrics?.posts_today || 0,
      activeMembers: activityMetrics?.active_members || Math.floor(legacyData.member_count * 0.1),
      trendingScore: activityMetrics?.trending_score || 0,
      engagementRate: activityMetrics?.engagement_rate || 0.05,
      activityLevel: calculateActivityLevel(activityMetrics?.posts_today || 0, activityMetrics?.active_members || Math.floor(legacyData.member_count * 0.1))
    },
    
    // Governance data with defaults
    governance: {
      activeProposals: governanceData?.active_proposals || 0,
      userVotingPower: governanceData?.user_voting_power || 0,
      participationRate: governanceData?.participation_rate || 0.15,
      nextDeadline: governanceData?.next_deadline ? new Date(governanceData.next_deadline) : undefined
    }
  };
}

/**
 * Transform legacy post data to enhanced format
 */
export function transformPostData(
  legacyData: LegacyPostResponse,
  authorData?: LegacyUserResponse,
  previewData?: any,
  realTimeData?: any
): EnhancedPost {
  const author = transformUserProfile(authorData || {
    id: legacyData.author_id,
    handle: legacyData.author_handle,
    avatar_url: legacyData.author_avatar
  });

  return {
    id: legacyData.id,
    title: legacyData.title,
    content: legacyData.content,
    author,
    timestamp: new Date(legacyData.created_at),
    
    // Type and categorization
    postType: mapPostType(legacyData.post_type),
    flair: legacyData.flair ? {
      id: legacyData.flair,
      name: legacyData.flair,
      color: '#3B82F6',
      backgroundColor: '#EFF6FF'
    } : undefined,
    priority: legacyData.is_pinned ? 'pinned' : 'normal',
    
    // Engagement data
    engagement: {
      upvotes: legacyData.upvotes,
      downvotes: legacyData.downvotes,
      comments: legacyData.comment_count,
      tips: [], // Will be populated by separate API call
      reactions: [] // Will be populated by separate API call
    },
    
    // Preview content
    previews: transformPreviewData(previewData),
    
    // Real-time data
    realTimeData: {
      isLive: realTimeData?.is_live || false,
      liveViewers: realTimeData?.live_viewers,
      recentActivity: realTimeData?.recent_activity || []
    }
  };
}

/**
 * Transform legacy user data to enhanced profile
 */
export function transformUserProfile(legacyData: Partial<LegacyUserResponse>): UserProfile {
  return {
    id: legacyData.id || '',
    handle: legacyData.handle || 'Unknown User',
    ensName: legacyData.ens_name,
    avatar: legacyData.avatar_url || generateDefaultAvatar(legacyData.handle || ''),
    reputation: legacyData.reputation_score || 0,
    badges: [], // Will be populated by separate API call
    walletAddress: legacyData.wallet_address || '',
    mutualConnections: 0, // Will be calculated separately
    isFollowing: false // Will be determined by separate API call
  };
}

/**
 * Transform preview data from various sources
 */
function transformPreviewData(previewData?: any): EnhancedPost['previews'] {
  if (!previewData) return {};

  const previews: EnhancedPost['previews'] = {};

  // NFT Preview
  if (previewData.nft) {
    previews.nft = {
      tokenId: previewData.nft.token_id,
      collection: previewData.nft.collection_name,
      image: previewData.nft.image_url,
      floorPrice: previewData.nft.floor_price,
      rarity: previewData.nft.rarity,
      marketData: previewData.nft.market_data ? {
        lastSale: previewData.nft.market_data.last_sale,
        volume24h: previewData.nft.market_data.volume_24h
      } : undefined
    };
  }

  // Proposal Preview
  if (previewData.proposal) {
    previews.proposal = {
      id: previewData.proposal.id,
      title: previewData.proposal.title,
      votingProgress: previewData.proposal.voting_progress,
      timeRemaining: previewData.proposal.time_remaining,
      currentStatus: previewData.proposal.status,
      votingPower: previewData.proposal.user_voting_power,
      participationRate: previewData.proposal.participation_rate
    };
  }

  // DeFi Preview
  if (previewData.defi) {
    previews.defi = {
      protocol: previewData.defi.protocol_name,
      apy: previewData.defi.apy,
      tvl: previewData.defi.tvl,
      riskLevel: previewData.defi.risk_level,
      yields: {
        current: previewData.defi.current_yield,
        historical: previewData.defi.historical_yields || []
      }
    };
  }

  // Link Preview
  if (previewData.link) {
    previews.link = {
      url: previewData.link.url,
      title: previewData.link.title,
      description: previewData.link.description,
      image: previewData.link.image_url,
      domain: previewData.link.domain
    };
  }

  return previews;
}

/**
 * Transform wallet activity data
 */
export function transformWalletActivity(legacyData: any[]): WalletActivity[] {
  return legacyData.map(activity => ({
    id: activity.id,
    type: mapActivityType(activity.type),
    amount: activity.amount,
    token: activity.token_symbol,
    timestamp: new Date(activity.created_at),
    description: activity.description || generateActivityDescription(activity),
    relatedUser: activity.related_user_id,
    celebratory: ['tip_received', 'badge_earned', 'reward_claimed'].includes(activity.type)
  }));
}

/**
 * Helper functions
 */
function mapPostType(legacyType?: string): PostType {
  const typeMap: Record<string, PostType> = {
    'governance': 'proposal',
    'analysis': 'analysis',
    'showcase': 'showcase',
    'discussion': 'discussion',
    'announcement': 'announcement'
  };
  
  return typeMap[legacyType || ''] || 'discussion';
}

function mapActivityType(legacyType: string): WalletActivity['type'] {
  const typeMap: Record<string, WalletActivity['type']> = {
    'tip': 'tip_received',
    'transaction': 'transaction',
    'badge': 'badge_earned',
    'reward': 'reward_claimed'
  };
  
  return typeMap[legacyType] || 'transaction';
}

function generateDefaultIcon(communityName: string): string {
  // Generate a deterministic default icon based on community name
  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];
  const colorIndex = communityName.length % colors.length;
  const initials = communityName.substring(0, 2).toUpperCase();
  
  // Return a data URL for a simple SVG icon
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="20" fill="${colors[colorIndex]}"/>
      <text x="20" y="26" text-anchor="middle" fill="white" font-family="Arial" font-size="14" font-weight="bold">${initials}</text>
    </svg>
  `)}`;
}

function generateDefaultAvatar(handle: string): string {
  // Generate a deterministic default avatar based on handle
  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];
  const colorIndex = handle.length % colors.length;
  const initial = handle.charAt(0).toUpperCase();
  
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="${colors[colorIndex]}"/>
      <text x="16" y="21" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">${initial}</text>
    </svg>
  `)}`;
}

function generateBrandColors(communityName: string): EnhancedCommunityData['brandColors'] {
  // Generate deterministic brand colors based on community name
  const colorSets = [
    { primary: '#3B82F6', secondary: '#1E40AF', accent: '#60A5FA' },
    { primary: '#EF4444', secondary: '#DC2626', accent: '#F87171' },
    { primary: '#10B981', secondary: '#059669', accent: '#34D399' },
    { primary: '#F59E0B', secondary: '#D97706', accent: '#FBBF24' },
    { primary: '#8B5CF6', secondary: '#7C3AED', accent: '#A78BFA' }
  ];
  
  const setIndex = communityName.length % colorSets.length;
  return colorSets[setIndex];
}

function generateActivityDescription(activity: any): string {
  switch (activity.type) {
    case 'tip':
      return `Received ${activity.amount} ${activity.token_symbol} tip`;
    case 'transaction':
      return `Transaction of ${activity.amount} ${activity.token_symbol}`;
    case 'badge':
      return `Earned ${activity.badge_name} badge`;
    case 'reward':
      return `Claimed ${activity.amount} ${activity.token_symbol} reward`;
    default:
      return 'Wallet activity';
  }
}

/**
 * Batch transformation utilities
 */
export function transformCommunityList(legacyData: LegacyCommunityResponse[]): EnhancedCommunityData[] {
  return legacyData.map(community => transformCommunityData(community));
}

export function transformPostList(legacyData: LegacyPostResponse[]): EnhancedPost[] {
  return legacyData.map(post => transformPostData(post));
}

/**
 * Validation helpers for transformed data
 */
export function validateEnhancedCommunity(data: EnhancedCommunityData): boolean {
  return !!(
    data.id &&
    data.name &&
    data.memberCount >= 0 &&
    data.userMembership &&
    data.activityMetrics &&
    data.governance
  );
}

export function validateEnhancedPost(data: EnhancedPost): boolean {
  return !!(
    data.id &&
    data.title &&
    data.author &&
    data.timestamp &&
    data.engagement
  );
}