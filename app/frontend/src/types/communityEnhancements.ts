/**
 * Enhanced Community Page Types
 * Core type definitions for community page enhancements
 */

// Enhanced Community Data Model
export interface EnhancedCommunityData {
  // Base community data
  id: string;
  name: string;
  description: string;
  memberCount: number;
  
  // Visual enhancements
  icon: string;
  bannerImage?: string;
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  
  // User-specific data
  userMembership: {
    isJoined: boolean;
    joinDate: Date;
    reputation: number;
    tokenBalance: number;
    role?: 'member' | 'moderator' | 'admin';
  };
  
  // Activity metrics
  activityMetrics: {
    postsToday: number;
    activeMembers: number;
    trendingScore: number;
    engagementRate: number;
    activityLevel: 'low' | 'medium' | 'high' | 'very-high';
  };
  
  // Governance data
  governance: {
    activeProposals: number;
    userVotingPower: number;
    participationRate: number;
    nextDeadline?: Date;
  };
}

// Enhanced Post Model
export interface EnhancedPost {
  // Base post data
  id: string;
  title: string;
  content: string;
  author: UserProfile;
  timestamp: Date;
  
  // Type and categorization
  postType: PostType;
  flair?: PostFlair;
  priority: 'pinned' | 'featured' | 'normal';
  
  // Engagement data
  engagement: {
    upvotes: number;
    downvotes: number;
    comments: number;
    tips: TipData[];
    reactions: ReactionData[];
  };
  
  // Preview content
  previews: {
    nft?: NFTPreview;
    proposal?: ProposalPreview;
    defi?: DeFiPreview;
    link?: LinkPreview;
    media?: MediaPreview;
  };
  
  // Real-time data
  realTimeData: {
    isLive: boolean;
    liveViewers?: number;
    recentActivity: ActivityEvent[];
  };
}

// Post Types
export type PostType = 'proposal' | 'analysis' | 'showcase' | 'discussion' | 'announcement';

export interface PostFlair {
  id: string;
  name: string;
  color: string;
  backgroundColor: string;
}

// User Profile for Enhanced Features
export interface UserProfile {
  id: string;
  handle: string;
  ensName?: string;
  avatar: string;
  reputation: number;
  badges: Badge[];
  walletAddress: string;
  mutualConnections: number;
  isFollowing: boolean;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// Tip and Reaction Data
export interface TipData {
  id: string;
  amount: number;
  token: string;
  tipper: string;
  timestamp: Date;
}

export interface ReactionData {
  id: string;
  type: string;
  count: number;
  userReacted: boolean;
}

// Preview Content Types
export interface NFTPreview {
  tokenId: string;
  collection: string;
  image: string;
  floorPrice?: number;
  rarity?: string;
  marketData?: {
    lastSale: number;
    volume24h: number;
  };
}

export interface ProposalPreview {
  id: string;
  title: string;
  votingProgress: number;
  timeRemaining: number;
  currentStatus: 'active' | 'passed' | 'failed' | 'pending';
  votingPower?: number;
  participationRate: number;
}

export interface DeFiPreview {
  protocol: string;
  apy: number;
  tvl: number;
  riskLevel: 'low' | 'medium' | 'high';
  yields: {
    current: number;
    historical: number[];
  };
}

export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image?: string;
  domain: string;
}

export interface MediaPreview {
  type: 'image' | 'video' | 'audio';
  url: string;
  thumbnail?: string;
  duration?: number;
}

// Activity Events
export interface ActivityEvent {
  id: string;
  type: 'comment' | 'reaction' | 'tip' | 'vote';
  timestamp: Date;
  user: string;
  data: any;
}

// Filter and Sorting Models
export interface FilterConfiguration {
  id: string;
  name: string;
  filters: AppliedFilter[];
  sortOrder: SortOption;
  isDefault: boolean;
  isCustom: boolean;
}

export interface AppliedFilter {
  type: 'postType' | 'flair' | 'author' | 'timeRange' | 'engagement';
  value: string | string[];
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
}

export type SortOption = 'hot' | 'new' | 'top' | 'rising' | 'mostTipped' | 'controversial' | 'trending';

// Filter Options
export interface FilterOption {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  combinableWith?: string[];
}

// Governance Models
export interface GovernanceProposal {
  id: string;
  title: string;
  description: string;
  votingProgress: VotingProgress;
  deadline: Date;
  userHasVoted: boolean;
  priority: 'urgent' | 'normal' | 'low';
}

export interface VotingProgress {
  totalVotes: number;
  yesVotes: number;
  noVotes: number;
  abstainVotes: number;
  participationRate: number;
}

// Wallet Activity
export interface WalletActivity {
  id: string;
  type: 'tip_received' | 'transaction' | 'badge_earned' | 'reward_claimed';
  amount?: number;
  token?: string;
  timestamp: Date;
  description: string;
  relatedUser?: string;
  celebratory?: boolean;
}

// Animation Configuration
export interface AnimationConfig {
  duration: number;
  easing: string;
  scale?: number;
  color?: string;
}

// Component Props Interfaces
export interface CommunityIconListProps {
  communities: EnhancedCommunityData[];
  selectedCommunity?: string;
  onCommunitySelect: (communityId: string) => void;
  showBadges?: boolean;
}

export interface MultiSelectFiltersProps {
  availableFilters: FilterOption[];
  selectedFilters: string[];
  onFiltersChange: (filters: string[]) => void;
  allowCombinations?: boolean;
}

export interface PostTypeIndicatorProps {
  postType: PostType;
  priority?: 'high' | 'medium' | 'low';
  animated?: boolean;
}

export interface InlinePreviewProps {
  content: PreviewableContent;
  previewType: PreviewType;
  onPreviewClick?: () => void;
  loadingState?: boolean;
}

export interface PreviewableContent {
  nft?: NFTPreview;
  proposal?: ProposalPreview;
  defi?: DeFiPreview;
  link?: LinkPreview;
}

export type PreviewType = 'nft' | 'proposal' | 'defi' | 'link' | 'media';

export interface MicroInteractionProps {
  children: React.ReactNode;
  interactionType: 'hover' | 'click' | 'vote' | 'tip';
  animationConfig?: AnimationConfig;
  hapticFeedback?: boolean;
}

export interface GovernanceWidgetProps {
  activeProposals: GovernanceProposal[];
  userVotingPower: number;
  onVoteClick: (proposalId: string) => void;
  showProgressBars?: boolean;
}

export interface WalletActivityFeedProps {
  activities: WalletActivity[];
  maxItems?: number;
  showRealTimeUpdates?: boolean;
  onActivityClick?: (activity: WalletActivity) => void;
}

export interface MiniProfileCardProps {
  userId: string;
  trigger: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  showWalletInfo?: boolean;
  showMutualConnections?: boolean;
}

// Error Boundary State
export interface ErrorBoundaryState {
  hasError: boolean;
  errorType: 'network' | 'rendering' | 'data' | 'unknown';
  retryCount: number;
  fallbackComponent?: React.ComponentType<{ error: Error; retry: () => void }>;
}

// Performance Monitoring
export interface PerformanceMetrics {
  renderTime: number;
  loadTime: number;
  interactionTime: number;
  memoryUsage: number;
}

// Cache Configuration
export interface CacheConfig {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
  strategy: 'lru' | 'fifo' | 'lfu';
}

// Connection Status
export interface ConnectionStatus {
  isConnected: boolean;
  isOnline: boolean;
  quality: 'excellent' | 'good' | 'poor' | 'offline';
  reconnectAttempts: number;
  lastHeartbeat: Date | null;
  queuedUpdates: number;
}

// Live Update Indicator
export interface LiveUpdateIndicator {
  type: 'new_posts' | 'new_comments' | 'new_reactions' | 'live_discussion';
  count: number;
  lastUpdate: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  contextId: string; // postId, discussionId, etc.
}