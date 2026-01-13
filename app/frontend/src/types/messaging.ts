export interface Message {
  id: string;
  conversationId: string;
  fromAddress: string;
  senderAddress?: string; // Alias for fromAddress for backend compatibility
  content: string;
  contentType: 'text' | 'image' | 'file' | 'post_share' | 'voice';
  timestamp: Date;
  encryptionKey?: string;
  deliveryStatus: 'sent' | 'delivered' | 'read';
  replyToId?: string;
  attachments?: MessageAttachment[];
  // Phase 5: Advanced features
  reactions?: Array<{ emoji: string; count: number; users: string[] }>;
  editedAt?: Date;
  deletedAt?: Date;
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: Date;
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'file';
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

// Add the missing MessageStatus type
export type MessageStatus = 'sent' | 'delivered' | 'read';

// Add the missing MessagePriority type
export type MessagePriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  lastActivity: Date;
  unreadCounts: Record<string, number>;
  isEncrypted: boolean;
  readBy?: string[]; // Users who have read the latest messages
  metadata: {
    title?: string;
    type: 'direct' | 'group' | 'announcement';
    communityId?: string;
  };
}

export interface EncryptedMessage {
  encryptedContent: number[];
  encryptedKey: number[];
  iv: number[];
}

export interface ConversationPreview {
  id: string;
  participants: string[];
  lastMessage?: {
    content: string;
    timestamp: Date;
    fromAddress: string;
  };
}

export interface ChatHistoryRequest {
  conversationId: string;
  limit?: number;
  offset?: number;
  before?: string;
  after?: string;
  unreadCount?: number;
  isEncrypted?: boolean;
}

export interface ChatHistoryResponse {
  messages: Message[];
  hasMore: boolean;
  nextCursor?: string;
  prevCursor?: string;
}

// Add the missing TypingIndicator type
export interface TypingIndicator {
  conversationId: string;
  userId: string;
  isTyping: boolean;
  timestamp: Date;
}

export interface MessageQueue {
  id: string;
  conversationId: string;
  content: string;
  contentType: 'text' | 'image' | 'file' | 'post_share';
  timestamp: Date;
  retryCount: number;
  status: 'pending' | 'sending' | 'failed';
}

export interface ConversationSettings {
  notifications: boolean;
  muteUntil?: Date;
  archived: boolean;
  pinned: boolean;
  customTitle?: string;
}

export interface MessageSearchResult {
  message: Message;
  conversation: Conversation;
  matchedText: string;
  context: Message[];
}

export interface ConversationFilter {
  type?: 'direct' | 'group' | 'announcement';
  hasUnread?: boolean;
  isArchived?: boolean;
  isPinned?: boolean;
  participantAddress?: string;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  fromAddress: string;
  emoji: string;
  timestamp: Date;
}

export interface ConversationMember {
  address: string;
  role: 'admin' | 'member';
  joinedAt: Date;
  permissions: {
    canSendMessages: boolean;
    canAddMembers: boolean;
    canRemoveMembers: boolean;
    canChangeSettings: boolean;
  };
}

export interface GroupConversation extends Conversation {
  name: string;
  description?: string;
  avatar?: string;
  members: ConversationMember[];
  settings: {
    isPublic: boolean;
    requireApproval: boolean;
    allowMemberInvites: boolean;
    maxMembers: number;
  };
}

export interface MessageDraft {
  conversationId: string;
  content: string;
  timestamp: Date;
  attachments?: MessageAttachment[];
}

export interface ConversationInvite {
  id: string;
  conversationId: string;
  fromAddress: string;
  toAddress: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: Date;
  expiresAt: Date;
}

export interface MessageDeliveryReceipt {
  messageId: string;
  recipientAddress: string;
  status: 'delivered' | 'read';
  timestamp: Date;
}

export interface ConversationBackup {
  conversationId: string;
  messages: Message[];
  participants: string[];
  metadata: Conversation['metadata'];
  createdAt: Date;
  encryptionKey: string;
}

export interface OfflineAction {
  id: string;
  type: 'send_message' | 'mark_read' | 'delete_message' | 'leave_conversation';
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

export interface ConversationAnalytics {
  conversationId: string;
  messageCount: number;
  participantActivity: Record<string, {
    messageCount: number;
    lastActive: Date;
    averageResponseTime: number;
  }>;
  peakActivityHours: number[];
  averageMessageLength: number;
  mediaShareCount: number;
}

export interface MessageNotification {
  id: string;
  conversationId: string;
  messageId: string;
  type: 'new_message' | 'mention' | 'reaction';
  title: string;
  body: string;
  data: any;
  timestamp: Date;
  read: boolean;
}

export interface ConversationPermissions {
  canSendMessages: boolean;
  canSendMedia: boolean;
  canAddMembers: boolean;
  canRemoveMembers: boolean;
  canChangeSettings: boolean;
  canDeleteMessages: boolean;
  canPinMessages: boolean;
}

export interface MessageSearchQuery {
  query: string;
  conversationId?: string;
  fromAddress?: string;
  contentType?: Message['contentType'];
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
}

export interface ConversationExport {
  format: 'json' | 'csv' | 'html';
  conversationId: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeMedia: boolean;
  includeMetadata: boolean;
}

export interface MessageEncryptionInfo {
  algorithm: string;
  keyId: string;
  version: number;
  metadata: Record<string, any>;
}

export interface ConversationSyncStatus {
  conversationId: string;
  lastSyncTimestamp: Date;
  pendingMessages: number;
  syncInProgress: boolean;
  lastError?: string;
}

export interface MessageValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedContent?: string;
}

export interface ConversationTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    bubble: {
      own: string;
      other: string;
    };
  };
  customCSS?: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  variables: string[];
  usage: number;
  createdAt: Date;
}

export interface ConversationShortcut {
  id: string;
  conversationId: string;
  name: string;
  description?: string;
  icon?: string;
  order: number;
}

export interface MessageSchedule {
  id: string;
  conversationId: string;
  content: string;
  contentType: Message['contentType'];
  scheduledFor: Date;
  status: 'scheduled' | 'sent' | 'cancelled' | 'failed';
  createdAt: Date;
}

export interface ConversationBot {
  id: string;
  name: string;
  address: string;
  description: string;
  commands: BotCommand[];
  permissions: ConversationPermissions;
  isActive: boolean;
}

export interface BotCommand {
  command: string;
  description: string;
  usage: string;
  parameters: BotCommandParameter[];
}

export interface BotCommandParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'address';
  required: boolean;
  description: string;
}

export interface MessageMention {
  id: string;
  messageId: string;
  mentionedAddress: string;
  startIndex: number;
  endIndex: number;
  type: 'user' | 'everyone' | 'here';
}

export interface ConversationPin {
  id: string;
  conversationId: string;
  messageId: string;
  pinnedBy: string;
  pinnedAt: Date;
  reason?: string;
}

export interface MessageThread {
  id: string;
  parentMessageId: string;
  conversationId: string;
  messages: Message[];
  participants: string[];
  createdAt: Date;
  lastActivity: Date;
}

export interface ConversationLabel {
  id: string;
  name: string;
  color: string;
  description?: string;
  conversationIds: string[];
}

export interface MessageFlag {
  id: string;
  messageId: string;
  flaggedBy: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

export interface ConversationMute {
  conversationId: string;
  mutedBy: string;
  mutedUntil?: Date;
  reason?: string;
  createdAt: Date;
}

export interface MessageQuote {
  id: string;
  originalMessageId: string;
  quotedInMessageId: string;
  quotedText: string;
  quotedBy: string;
  createdAt: Date;
}

export interface ConversationArchive {
  conversationId: string;
  archivedBy: string;
  archivedAt: Date;
  reason?: string;
  canRestore: boolean;
}

export interface MessageEditHistory {
  id: string;
  messageId: string;
  originalContent: string;
  editedContent: string;
  editedBy: string;
  editedAt: Date;
  reason?: string;
}

export interface ConversationRole {
  id: string;
  name: string;
  permissions: ConversationPermissions;
  color: string;
  priority: number;
  isDefault: boolean;
}

export interface MessagePoll {
  id: string;
  messageId: string;
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
  anonymous: boolean;
  expiresAt?: Date;
  createdBy: string;
  createdAt: Date;
}

export interface PollOption {
  id: string;
  text: string;
  votes: PollVote[];
  order: number;
}

export interface PollVote {
  id: string;
  optionId: string;
  voterAddress: string;
  votedAt: Date;
}

export interface MessageReminder {
  id: string;
  messageId: string;
  remindAt: Date;
  reminderText?: string;
  createdBy: string;
  createdAt: Date;
  status: 'pending' | 'sent' | 'cancelled';
}

export interface ConversationWidget {
  id: string;
  type: 'poll' | 'calendar' | 'todo' | 'file_share' | 'custom';
  conversationId: string;
  config: Record<string, any>;
  position: number;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface MessageTranslation {
  messageId: string;
  originalLanguage: string;
  targetLanguage: string;
  translatedContent: string;
  confidence: number;
  translatedAt: Date;
  translationService: string;
}

export interface ConversationInsight {
  conversationId: string;
  period: 'day' | 'week' | 'month';
  metrics: {
    messageCount: number;
    activeParticipants: number;
    averageResponseTime: number;
    sentimentScore: number;
    topKeywords: string[];
    peakActivityTime: string;
  };
  generatedAt: Date;
}

export interface MessageSummary {
  conversationId: string;
  period: {
    start: Date;
    end: Date;
  };
  summary: string;
  keyPoints: string[];
  participants: string[];
  messageCount: number;
  generatedAt: Date;
  generatedBy: 'ai' | 'user';
}

export interface ConversationIntegration {
  id: string;
  conversationId: string;
  type: 'webhook' | 'bot' | 'external_service';
  name: string;
  config: Record<string, any>;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  lastTriggered?: Date;
}

export interface MessageAutoReply {
  id: string;
  conversationId: string;
  trigger: {
    type: 'keyword' | 'pattern' | 'time' | 'user';
    value: string;
  };
  response: {
    content: string;
    contentType: Message['contentType'];
    delay?: number;
  };
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  usageCount: number;
}

export interface ConversationBackupSettings {
  conversationId: string;
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  retentionPeriod: number; // days
  includeMedia: boolean;
  encryptBackup: boolean;
  backupLocation: 'local' | 'cloud' | 'ipfs';
  lastBackup?: Date;
}

export interface MessageReactionSummary {
  messageId: string;
  reactions: Record<string, {
    count: number;
    users: string[];
  }>;
  totalReactions: number;
  topReaction?: string;
}

export interface ConversationCustomField {
  id: string;
  conversationId: string;
  name: string;
  value: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'json';
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageLinkPreview {
  messageId: string;
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  type: 'website' | 'image' | 'video' | 'audio' | 'document';
  metadata: Record<string, any>;
  generatedAt: Date;
}

export interface ConversationActivity {
  id: string;
  conversationId: string;
  type: 'message_sent' | 'member_added' | 'member_removed' | 'settings_changed' | 'file_shared';
  actorAddress: string;
  targetAddress?: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface MessageSearchIndex {
  messageId: string;
  conversationId: string;
  content: string;
  searchableContent: string;
  keywords: string[];
  language: string;
  lastIndexed: Date;
}

export interface ConversationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  settings: Partial<Conversation['metadata']>;
  defaultMembers?: string[];
  welcomeMessage?: string;
  rules?: string[];
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  usageCount: number;
}

export interface MessageDeliveryReport {
  messageId: string;
  totalRecipients: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  deliveryDetails: Record<string, {
    status: 'delivered' | 'read' | 'failed';
    timestamp?: Date;
    error?: string;
  }>;
  generatedAt: Date;
}

export interface ConversationCompliance {
  conversationId: string;
  retentionPolicy: {
    enabled: boolean;
    retentionPeriod: number; // days
    autoDelete: boolean;
  };
  auditLog: {
    enabled: boolean;
    events: string[];
  };
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  complianceFlags: string[];
  lastAudit?: Date;
}

export interface MessageSecurityScan {
  messageId: string;
  scanType: 'malware' | 'phishing' | 'spam' | 'content_policy';
  result: 'clean' | 'suspicious' | 'malicious';
  confidence: number;
  details: Record<string, any>;
  scannedAt: Date;
  scannerVersion: string;
}

export interface ConversationMetrics {
  conversationId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalMessages: number;
    uniqueParticipants: number;
    averageMessagesPerDay: number;
    averageResponseTime: number;
    messageTypes: Record<string, number>;
    participantActivity: Record<string, {
      messageCount: number;
      firstMessage: Date;
      lastMessage: Date;
      averageMessageLength: number;
    }>;
    peakHours: Record<string, number>;
    engagementScore: number;
  };
  generatedAt: Date;
}

export interface MessageContentAnalysis {
  messageId: string;
  analysis: {
    sentiment: {
      score: number;
      label: 'positive' | 'negative' | 'neutral';
      confidence: number;
    };
    topics: Array<{
      topic: string;
      confidence: number;
    }>;
    language: {
      detected: string;
      confidence: number;
    };
    readability: {
      score: number;
      level: string;
    };
    keywords: Array<{
      word: string;
      frequency: number;
      importance: number;
    }>;
  };
  analyzedAt: Date;
  analyzerVersion: string;
}

export interface ConversationRecommendation {
  type: 'similar_conversation' | 'suggested_participant' | 'related_content' | 'action_item';
  conversationId: string;
  recommendation: {
    title: string;
    description: string;
    confidence: number;
    data: Record<string, any>;
  };
  generatedAt: Date;
  status: 'pending' | 'accepted' | 'dismissed';
}

export interface MessageWorkflow {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'message_received' | 'keyword_detected' | 'user_joined' | 'scheduled';
    conditions: Record<string, any>;
  };
  actions: Array<{
    type: 'send_message' | 'add_member' | 'create_task' | 'webhook' | 'notification';
    config: Record<string, any>;
    delay?: number;
  }>;
  isActive: boolean;
  conversationId?: string;
  createdBy: string;
  createdAt: Date;
  executionCount: number;
  lastExecuted?: Date;
}

export interface ConversationHealth {
  conversationId: string;
  healthScore: number;
  factors: {
    activityLevel: number;
    participantEngagement: number;
    responseTime: number;
    contentQuality: number;
    technicalIssues: number;
  };
  recommendations: string[];
  lastAssessed: Date;
  trend: 'improving' | 'stable' | 'declining';
}

export interface MessageContextMenu {
  messageId: string;
  actions: Array<{
    id: string;
    label: string;
    icon?: string;
    action: string;
    permissions?: string[];
    separator?: boolean;
  }>;
  position: {
    x: number;
    y: number;
  };
  isVisible: boolean;
}

export interface ConversationSharing {
  conversationId: string;
  shareType: 'link' | 'invite' | 'embed';
  shareConfig: {
    expiresAt?: Date;
    maxUses?: number;
    requireApproval: boolean;
    allowedDomains?: string[];
    permissions: ConversationPermissions;
  };
  shareUrl: string;
  createdBy: string;
  createdAt: Date;
  usageCount: number;
  isActive: boolean;
}

export interface MessageBatch {
  id: string;
  messages: Message[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalCount: number;
  processedCount: number;
  failedCount: number;
  createdAt: Date;
  completedAt?: Date;
  errors?: string[];
}

export interface ConversationSnapshot {
  id: string;
  conversationId: string;
  name: string;
  description?: string;
  messageCount: number;
  participantCount: number;
  createdAt: Date;
  createdBy: string;
  dataUrl: string;
  size: number;
  format: 'json' | 'html' | 'pdf';
  isPublic: boolean;
  downloadCount: number;
}

export interface MessageVoiceNote {
  messageId: string;
  audioUrl: string;
  duration: number;
  waveform: number[];
  transcript?: string;
  language?: string;
  quality: 'low' | 'medium' | 'high';
  size: number;
  format: string;
}

export interface ConversationCalendar {
  conversationId: string;
  events: Array<{
    id: string;
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    participants: string[];
    location?: string;
    isRecurring: boolean;
    createdBy: string;
    createdAt: Date;
  }>;
  timezone: string;
  syncEnabled: boolean;
  externalCalendarId?: string;
}

export interface MessageGif {
  messageId: string;
  gifUrl: string;
  thumbnailUrl: string;
  title?: string;
  source: string;
  tags: string[];
  dimensions: {
    width: number;
    height: number;
  };
  size: number;
  duration?: number;
}

export interface ConversationGameState {
  conversationId: string;
  gameType: string;
  gameData: Record<string, any>;
  players: Array<{
    address: string;
    score: number;
    status: 'active' | 'inactive' | 'eliminated';
    joinedAt: Date;
  }>;
  status: 'waiting' | 'active' | 'paused' | 'completed';
  createdBy: string;
  createdAt: Date;
  lastMove?: Date;
}

export interface MessageSticker {
  messageId: string;
  stickerId: string;
  stickerUrl: string;
  stickerPack: string;
  animated: boolean;
  tags: string[];
  size: {
    width: number;
    height: number;
  };
}

export interface ConversationTopic {
  id: string;
  conversationId: string;
  name: string;
  description?: string;
  color: string;
  messageIds: string[];
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
  participantCount: number;
}

export interface MessageLocation {
  messageId: string;
  latitude: number;
  longitude: number;
  address?: string;
  placeName?: string;
  accuracy?: number;
  sharedAt: Date;
  expiresAt?: Date;
  isLive: boolean;
}

export interface ConversationPayment {
  id: string;
  conversationId: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  currency: string;
  message?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  transactionHash?: string;
  createdAt: Date;
  completedAt?: Date;
  fees?: {
    network: string;
    platform: string;
  };
}

export interface MessageContact {
  messageId: string;
  contact: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    avatar?: string;
    organization?: string;
    socialProfiles?: Record<string, string>;
  };
  sharedBy: string;
  sharedAt: Date;
}

export interface ConversationBookmark {
  id: string;
  conversationId: string;
  messageId?: string;
  name: string;
  description?: string;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  lastAccessed?: Date;
  accessCount: number;
}

export interface MessageCode {
  messageId: string;
  code: string;
  language: string;
  filename?: string;
  lineNumbers: boolean;
  theme: string;
  highlighted: boolean;
  executable: boolean;
  output?: string;
}

export interface ConversationForum {
  conversationId: string;
  topics: Array<{
    id: string;
    title: string;
    description: string;
    messageCount: number;
    lastActivity: Date;
    isPinned: boolean;
    isLocked: boolean;
    tags: string[];
    createdBy: string;
    createdAt: Date;
  }>;
  categories: Array<{
    id: string;
    name: string;
    description: string;
    color: string;
    topicIds: string[];
  }>;
  moderators: string[];
  rules: string[];
  settings: {
    allowAnonymous: boolean;
    requireApproval: boolean;
    allowVoting: boolean;
    allowTags: boolean;
  };
}

export interface MessageTask {
  messageId: string;
  task: {
    id: string;
    title: string;
    description?: string;
    assignedTo?: string[];
    dueDate?: Date;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
    tags: string[];
    checklist?: Array<{
      id: string;
      text: string;
      completed: boolean;
    }>;
    attachments?: string[];
    comments?: Array<{
      id: string;
      text: string;
      author: string;
      createdAt: Date;
    }>;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationWhiteboard {
  conversationId: string;
  whiteboardId: string;
  name: string;
  elements: Array<{
    id: string;
    type: 'text' | 'shape' | 'line' | 'image' | 'sticky_note';
    position: { x: number; y: number };
    size: { width: number; height: number };
    style: Record<string, any>;
    data: any;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  collaborators: Array<{
    address: string;
    cursor?: { x: number; y: number };
    selection?: string[];
    lastActive: Date;
  }>;
  permissions: {
    canEdit: string[];
    canView: string[];
    isPublic: boolean;
  };
  version: number;
  lastModified: Date;
}

export interface MessageMood {
  messageId: string;
  mood: {
    primary: string;
    intensity: number;
    tags: string[];
    color: string;
    emoji: string;
  };
  detectedAt: Date;
  confidence: number;
  source: 'user_selected' | 'ai_detected' | 'context_inferred';
}

export interface ConversationRitual {
  id: string;
  conversationId: string;
  name: string;
  description: string;
  schedule: {
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    time: string;
    timezone: string;
    days?: number[];
    customCron?: string;
  };
  actions: Array<{
    type: 'send_message' | 'create_poll' | 'share_memory' | 'celebration';
    config: Record<string, any>;
  }>;
  participants: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  lastExecuted?: Date;
  nextExecution?: Date;
  executionCount: number;
}

export interface MessageMemory {
  id: string;
  messageId: string;
  conversationId: string;
  title: string;
  description?: string;
  tags: string[];
  participants: string[];
  date: Date;
  location?: string;
  media: string[];
  reactions: Record<string, number>;
  isShared: boolean;
  createdBy: string;
  createdAt: Date;
  anniversary?: Date;
}

export interface ConversationMilestone {
  id: string;
  conversationId: string;
  type: 'message_count' | 'anniversary' | 'member_count' | 'custom';
  title: string;
  description: string;
  value: number;
  achievedAt: Date;
  celebrationMessage?: string;
  badge?: {
    name: string;
    icon: string;
    color: string;
  };
  participants: string[];
  isPublic: boolean;
}

export interface MessageWisdom {
  messageId: string;
  wisdom: {
    quote: string;
    author: string;
    category: string;
    tags: string[];
    relevanceScore: number;
  };
  sharedBy: string;
  sharedAt: Date;
  reactions: Record<string, number>;
  saves: number;
}

export interface ConversationSpirit {
  conversationId: string;
  spirit: {
    name: string;
    personality: string[];
    avatar: string;
    voice: {
      tone: string;
      style: string;
      vocabulary: string[];
    };
    knowledge: {
      domains: string[];
      expertise: Record<string, number>;
    };
    behavior: {
      helpfulness: number;
      humor: number;
      formality: number;
      creativity: number;
    };
  };
  isActive: boolean;
  interactions: number;
  lastInteraction?: Date;
  feedback: {
    positive: number;
    negative: number;
    suggestions: string[];
  };
  createdBy: string;
  createdAt: Date;
}

export interface MessageEnergy {
  messageId: string;
  energy: {
    level: number; // 0-100
    type: 'positive' | 'negative' | 'neutral' | 'mixed';
    sources: string[];
    impact: number;
    resonance: Record<string, number>;
  };
  measuredAt: Date;
  algorithm: string;
  confidence: number;
}

export interface ConversationHarmony {
  conversationId: string;
  harmony: {
    score: number; // 0-100
    factors: {
      participation: number;
      respect: number;
      collaboration: number;
      understanding: number;
      growth: number;
    };
    trends: Array<{
      date: Date;
      score: number;
      events: string[];
    }>;
    recommendations: string[];
  };
  lastAssessed: Date;
  assessmentFrequency: 'daily' | 'weekly' | 'monthly';
  isPublic: boolean;
}

export interface MessageMagic {
  messageId: string;
  magic: {
    type: 'synchronicity' | 'insight' | 'connection' | 'breakthrough' | 'serendipity';
    description: string;
    participants: string[];
    context: Record<string, any>;
    rarity: number; // 0-1
    impact: number; // 0-1
  };
  detectedAt: Date;
  algorithm: string;
  userConfirmed: boolean;
  celebrations: number;
}

export interface ConversationLegacy {
  conversationId: string;
  legacy: {
    stories: Array<{
      id: string;
      title: string;
      content: string;
      participants: string[];
      timeframe: { start: Date; end: Date };
      tags: string[];
      importance: number;
      createdBy: string;
      createdAt: Date;
    }>;
    artifacts: Array<{
      id: string;
      type: 'message' | 'media' | 'decision' | 'milestone';
      reference: string;
      significance: string;
      preservedAt: Date;
      preservedBy: string;
    }>;
    wisdom: Array<{
      id: string;
      insight: string;
      context: string;
      contributors: string[];
      applications: string[];
      discoveredAt: Date;
    }>;
    impact: {
      decisions: number;
      relationships: number;
      growth: number;
      innovation: number;
    };
  };
  isPublic: boolean;
  contributors: string[];
  lastUpdated: Date;
}

export interface MessageDivinity {
  messageId: string;
  divinity: {
    blessing: string;
    intention: string;
    gratitude: string[];
    connection: string[];
    transcendence: number; // 0-1
    love: number; // 0-1
    wisdom: number; // 0-1
    peace: number; // 0-1
  };
  blessedBy: string;
  blessedAt: Date;
  receivers: string[];
  manifestations: string[];
}

export interface ConversationSacred {
  conversationId: string;
  sacred: {
    purpose: string;
    values: string[];
    rituals: string[];
    guardians: string[];
    blessings: number;
    miracles: number;
    healings: number;
    awakenings: number;
    unity: number; // 0-1
    consciousness: number; // 0-1
  };
  consecrated: boolean;
  consecratedBy: string;
  consecratedAt?: Date;
  pilgrims: Array<{
    address: string;
    journey: string;
    offerings: string[];
    receivings: string[];
    transformation: string;
    joinedAt: Date;
  }>;
  mysteries: Array<{
    id: string;
    riddle: string;
    solution?: string;
    solvedBy?: string;
    solvedAt?: Date;
    wisdom: string;
  }>;
}

export interface MessageInfinity {
  messageId: string;
  infinity: {
    eternal: boolean;
    timeless: boolean;
    boundless: boolean;
    connections: string[];
    echoes: Array<{
      messageId: string;
      resonance: number;
      dimension: string;
    }>;
    fractals: Array<{
      pattern: string;
      scale: number;
      iterations: number;
    }>;
    consciousness: {
      awareness: number;
      presence: number;
      unity: number;
      love: number;
    };
  };
  transcendedAt: Date;
  witnesses: string[];
  dimensions: string[];
  frequencies: number[];
}

export interface ConversationOmniverse {
  conversationId: string;
  omniverse: {
    dimensions: Array<{
      id: string;
      name: string;
      frequency: number;
      inhabitants: string[];
      laws: string[];
      possibilities: string[];
    }>;
    portals: Array<{
      id: string;
      from: string;
      to: string;
      key: string;
      guardians: string[];
      isOpen: boolean;
    }>;
    consciousness: {
      collective: number;
      individual: Record<string, number>;
      evolution: Array<{
        stage: string;
        participants: string[];
        achievedAt: Date;
      }>;
    };
    creation: {
      thoughts: number;
      words: number;
      actions: number;
      manifestations: number;
    };
    love: {
      unconditional: number;
      compassion: number;
      forgiveness: number;
      gratitude: number;
      joy: number;
      peace: number;
      unity: number;
      infinity: number;
    };
  };
  activated: boolean;
  activatedBy: string;
  activatedAt?: Date;
  masters: string[];
  seekers: string[];
  awakened: string[];
  ascended: string[];
}