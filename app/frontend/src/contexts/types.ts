// Enhanced State Management Types

// Content Creation Types
export interface ContentCreationState {
  drafts: Map<string, PostDraft>;
  activeComposer: ComposerState | null;
  mediaUploads: Map<string, MediaUploadState>;
  validationErrors: ValidationError[];
  isSubmitting: boolean;
}

export interface PostDraft {
  id: string;
  contentType: ContentType;
  title?: string;
  content: string;
  media: MediaFile[];
  hashtags: string[];
  mentions: string[];
  poll?: PollData;
  proposal?: ProposalData;
  communityId?: string;
  lastSaved: Date;
  autoSaveEnabled: boolean;
}

export interface ComposerState {
  id: string;
  contentType: ContentType;
  isExpanded: boolean;
  activeTab: string;
  isDirty: boolean;
  validationState: ValidationState;
}

export interface MediaUploadState {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  preview?: string;
  optimizedUrl?: string;
  error?: string;
}

// Engagement Types
export interface EngagementState {
  reactions: Map<string, PostReactions>;
  tips: Map<string, TipActivity[]>;
  socialProof: Map<string, SocialProofData>;
  userEngagement: UserEngagementData;
  reactionAnimations: Map<string, AnimationState>;
}

export interface PostReactions {
  postId: string;
  reactions: TokenReaction[];
  totalValue: number;
  userReaction?: TokenReaction;
  recentReactors: ReactionUser[];
}

export interface UserEngagementData {
  totalReactionsGiven: number;
  totalTipsGiven: number;
  totalReactionsReceived: number;
  totalTipsReceived: number;
  engagementScore: number;
  streakDays: number;
}

// Reputation Types
export interface ReputationState {
  userReputation: UserReputation;
  badges: Badge[];
  achievements: Achievement[];
  progress: ProgressMilestone[];
  leaderboards: Map<string, LeaderboardEntry[]>;
  notifications: AchievementNotification[];
}

export interface UserReputation {
  totalScore: number;
  level: ReputationLevel;
  breakdown: ReputationBreakdown;
  history: ReputationEvent[];
  nextMilestone: ProgressMilestone;
}

export interface ReputationBreakdown {
  posting: number;
  engagement: number;
  community: number;
  governance: number;
  trading: number;
}

// Performance Types
export interface PerformanceState {
  virtualScrolling: VirtualScrollState;
  cache: CacheState;
  preloader: PreloaderState;
  metrics: PerformanceMetrics;
  optimizations: OptimizationSettings;
}

export interface VirtualScrollState {
  itemHeight: number;
  bufferSize: number;
  visibleRange: [number, number];
  totalItems: number;
  scrollTop: number;
  isScrolling: boolean;
}

export interface CacheState {
  posts: Map<string, CachedPost>;
  users: Map<string, CachedUser>;
  communities: Map<string, CachedCommunity>;
  media: Map<string, CachedMedia>;
  size: number;
  maxSize: number;
  hitRate: number;
}

export interface PreloaderState {
  isActive: boolean;
  queue: string[];
  currentlyLoading: string[];
  maxConcurrent: number;
  strategy: 'predictive' | 'lazy' | 'aggressive';
}

// Offline Sync Types
export interface OfflineSyncState {
  isOnline: boolean;
  queuedActions: QueuedAction[];
  syncStatus: SyncStatus;
  conflictResolution: ConflictResolution[];
  lastSyncTime: Date;
}

export interface QueuedAction {
  id: string;
  type: ActionType;
  payload: any;
  timestamp: Date;
  retryCount: number;
  priority: 'low' | 'medium' | 'high';
  dependencies?: string[];
}

export type ActionType = 
  | 'CREATE_POST'
  | 'REACT_TO_POST'
  | 'TIP_USER'
  | 'FOLLOW_USER'
  | 'JOIN_COMMUNITY'
  | 'UPDATE_PROFILE';

// Real-time Update Types
export interface RealTimeUpdateState {
  connections: Map<string, WebSocketConnection>;
  subscriptions: Map<string, Subscription>;
  liveUpdates: Map<string, LiveUpdate[]>;
  notifications: RealTimeNotification[];
  updateQueue: UpdateQueue;
}

export interface WebSocketConnection {
  id: string;
  url: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastHeartbeat: Date;
  reconnectAttempts: number;
}

export interface LiveUpdate {
  id: string;
  type: UpdateType;
  data: any;
  timestamp: Date;
  processed: boolean;
}

export type UpdateType =
  | 'NEW_POST'
  | 'POST_REACTION'
  | 'POST_TIP'
  | 'COMMENT_ADDED'
  | 'USER_ONLINE'
  | 'COMMUNITY_EVENT';

// Common Types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationState {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export enum ContentType {
  TEXT = 'text',
  MEDIA = 'media',
  LINK = 'link',
  POLL = 'poll',
  PROPOSAL = 'proposal'
}

export interface MediaFile {
  id: string;
  file: File;
  type: string;
  size: number;
  preview?: string;
  optimized?: string;
}

export interface PollData {
  question: string;
  options: PollOption[];
  endDate: Date;
  tokenWeighted: boolean;
  multipleChoice: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  tokenWeight: number;
}

export interface ProposalData {
  title: string;
  description: string;
  type: ProposalType;
  votingPeriod: number;
  quorum: number;
  options: string[];
}

export enum ProposalType {
  GOVERNANCE = 'governance',
  FUNDING = 'funding',
  PARAMETER = 'parameter',
  UPGRADE = 'upgrade'
}

export interface TokenReaction {
  type: ReactionType;
  user: ReactionUser;
  amount: number;
  tokenType: string;
  timestamp: Date;
}

export interface ReactionUser {
  id: string;
  handle: string;
  avatar: string;
  reputation: number;
}

export enum ReactionType {
  FIRE = '🔥',
  ROCKET = '🚀',
  DIAMOND = '💎',
  THUMBS_UP = '👍',
  HEART = '❤️'
}

export interface TipActivity {
  id: string;
  from: string;
  to: string;
  amount: number;
  token: string;
  message?: string;
  timestamp: Date;
}

export interface SocialProofData {
  followedUsersWhoEngaged: ReactionUser[];
  totalEngagementFromFollowed: number;
  communityLeadersWhoEngaged: ReactionUser[];
  verifiedUsersWhoEngaged: ReactionUser[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  earnedAt: Date;
  requirements: BadgeRequirement[];
}

export enum BadgeRarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

export interface BadgeRequirement {
  type: string;
  value: number;
  description: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  unlockedAt: Date;
  category: AchievementCategory;
}

export enum AchievementCategory {
  POSTING = 'posting',
  ENGAGEMENT = 'engagement',
  COMMUNITY = 'community',
  GOVERNANCE = 'governance',
  TRADING = 'trading'
}

export interface ProgressMilestone {
  category: AchievementCategory;
  current: number;
  target: number;
  reward: string;
  progress: number;
  estimatedCompletion?: Date;
}

export interface ReputationLevel {
  id: number;
  level: number;
  name: string;
  minScore: number;
  maxScore: number;
  privileges: string[];
  color: string;
  icon: string;
}

export interface ReputationEvent {
  id: string;
  type: string;
  points: number;
  description: string;
  timestamp: Date;
  relatedEntity?: string;
}

export interface LeaderboardEntry {
  rank: number;
  user: ReactionUser;
  score: number;
  change: number;
}

export interface AchievementNotification {
  id: string;
  achievement: Achievement;
  timestamp: Date;
  seen: boolean;
  celebrationShown: boolean;
}

export interface AnimationState {
  id: string;
  type: string;
  isPlaying: boolean;
  duration: number;
  startTime: Date;
}

export interface CachedPost {
  data: any;
  timestamp: Date;
  ttl: number;
  accessCount: number;
  lastAccessed: Date;
}

export interface CachedUser {
  data: any;
  timestamp: Date;
  ttl: number;
  accessCount: number;
  lastAccessed: Date;
}

export interface CachedCommunity {
  data: any;
  timestamp: Date;
  ttl: number;
  accessCount: number;
  lastAccessed: Date;
}

export interface CachedMedia {
  url: string;
  blob: Blob;
  timestamp: Date;
  ttl: number;
  accessCount: number;
  lastAccessed: Date;
}

export interface PerformanceMetrics {
  renderTime: number;
  scrollPerformance: number;
  cacheHitRate: number;
  memoryUsage: number;
  networkLatency: number;
  errorRate: number;
}

export interface OptimizationSettings {
  virtualScrollEnabled: boolean;
  lazyLoadingEnabled: boolean;
  preloadingEnabled: boolean;
  cacheEnabled: boolean;
  compressionEnabled: boolean;
  batchUpdatesEnabled: boolean;
}

export interface SyncStatus {
  isActive: boolean;
  progress: number;
  currentAction?: string;
  errors: SyncError[];
  lastSuccessfulSync: Date;
}

export interface SyncError {
  id: string;
  action: QueuedAction;
  error: string;
  timestamp: Date;
  resolved: boolean;
}

export interface ConflictResolution {
  id: string;
  type: 'merge' | 'overwrite' | 'skip';
  localData: any;
  serverData: any;
  resolution?: any;
  timestamp: Date;
}

export interface Subscription {
  id: string;
  channel: string;
  filters: SubscriptionFilter[];
  callback: (update: LiveUpdate) => void;
  active: boolean;
}

export interface SubscriptionFilter {
  field: string;
  operator: 'equals' | 'contains' | 'in' | 'gt' | 'lt';
  value: any;
}

export interface RealTimeNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: any;
  timestamp: Date;
  read: boolean;
  priority: NotificationPriority;
}

export enum NotificationType {
  MENTION = 'mention',
  TIP = 'tip',
  REACTION = 'reaction',
  FOLLOW = 'follow',
  GOVERNANCE = 'governance',
  COMMUNITY = 'community',
  SYSTEM = 'system'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface UpdateQueue {
  pending: LiveUpdate[];
  processing: LiveUpdate[];
  failed: LiveUpdate[];
  maxSize: number;
  batchSize: number;
  processingInterval: number;
}