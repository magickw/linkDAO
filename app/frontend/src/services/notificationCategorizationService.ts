/**
 * Notification Categorization Service
 * Handles notification categories, priorities, and filtering
 * Requirements: 8.1, 8.3, 8.4
 */

import { 
  RealTimeNotification, 
  NotificationCategory, 
  NotificationPriority,
  NotificationSettings 
} from '../types/realTimeNotifications';

// Enhanced notification categories
export enum EnhancedNotificationCategory {
  // Core categories
  MENTION = 'mention',
  TIP = 'tip',
  GOVERNANCE = 'governance',
  COMMUNITY = 'community',
  REACTION = 'reaction',
  COMMENT = 'comment',
  FOLLOW = 'follow',
  SYSTEM = 'system',
  
  // Enhanced categories
  PROPOSAL_DEADLINE = 'proposal_deadline',
  COMMUNITY_MILESTONE = 'community_milestone',
  BADGE_EARNED = 'badge_earned',
  REPUTATION_CHANGE = 'reputation_change',
  WALLET_ACTIVITY = 'wallet_activity',
  SECURITY_ALERT = 'security_alert',
  MARKET_UPDATE = 'market_update',
  SOCIAL_PROOF = 'social_proof'
}

// Notification filters
export interface NotificationFilter {
  id: string;
  name: string;
  description: string;
  categories: EnhancedNotificationCategory[];
  priorities: NotificationPriority[];
  keywords?: string[];
  excludeKeywords?: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  userFilters?: {
    includeUsers?: string[];
    excludeUsers?: string[];
    followedOnly?: boolean;
    mutualConnectionsOnly?: boolean;
  };
  isActive: boolean;
  isDefault: boolean;
}

// Notification grouping
export interface NotificationGroup {
  id: string;
  category: EnhancedNotificationCategory;
  title: string;
  notifications: RealTimeNotification[];
  count: number;
  latestTimestamp: Date;
  priority: NotificationPriority;
  isCollapsed: boolean;
  summary?: string;
}

// Notification history
export interface NotificationHistoryEntry {
  id: string;
  notification: RealTimeNotification;
  readAt?: Date;
  dismissedAt?: Date;
  actionTaken?: string;
  context?: Record<string, any>;
}

// Category configuration
export interface CategoryConfig {
  category: EnhancedNotificationCategory;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  defaultPriority: NotificationPriority;
  groupable: boolean;
  batchable: boolean;
  maxBatchSize?: number;
  batchDelay?: number;
  soundEnabled: boolean;
  desktopEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
}

/**
 * Notification Categorization Service
 */
export class NotificationCategorizationService {
  private filters: Map<string, NotificationFilter> = new Map();
  private groups: Map<string, NotificationGroup> = new Map();
  private history: NotificationHistoryEntry[] = [];
  private categoryConfigs: Map<EnhancedNotificationCategory, CategoryConfig> = new Map();
  
  private listeners = new Map<string, Set<Function>>();
  
  private readonly MAX_HISTORY_SIZE = 1000;
  private readonly DEFAULT_BATCH_DELAY = 5000;
  private readonly DEFAULT_MAX_BATCH_SIZE = 5;

  constructor() {
    this.initializeCategoryConfigs();
    this.initializeDefaultFilters();
    this.loadUserPreferences();
  }

  /**
   * Initialize category configurations
   */
  private initializeCategoryConfigs(): void {
    const configs: CategoryConfig[] = [
      {
        category: EnhancedNotificationCategory.MENTION,
        displayName: 'Mentions',
        description: 'When someone mentions you in a post or comment',
        icon: 'at-sign',
        color: '#3B82F6',
        defaultPriority: NotificationPriority.HIGH,
        groupable: true,
        batchable: false,
        soundEnabled: true,
        desktopEnabled: true,
        emailEnabled: true,
        pushEnabled: true
      },
      {
        category: EnhancedNotificationCategory.TIP,
        displayName: 'Tips',
        description: 'When you receive tips or crypto payments',
        icon: 'zap',
        color: '#F59E0B',
        defaultPriority: NotificationPriority.HIGH,
        groupable: true,
        batchable: true,
        maxBatchSize: 3,
        batchDelay: 3000,
        soundEnabled: true,
        desktopEnabled: true,
        emailEnabled: false,
        pushEnabled: true
      },
      {
        category: EnhancedNotificationCategory.GOVERNANCE,
        displayName: 'Governance',
        description: 'Voting reminders and proposal updates',
        icon: 'vote',
        color: '#8B5CF6',
        defaultPriority: NotificationPriority.URGENT,
        groupable: true,
        batchable: false,
        soundEnabled: true,
        desktopEnabled: true,
        emailEnabled: true,
        pushEnabled: true
      },
      {
        category: EnhancedNotificationCategory.COMMUNITY,
        displayName: 'Community',
        description: 'Community announcements and events',
        icon: 'users',
        color: '#10B981',
        defaultPriority: NotificationPriority.NORMAL,
        groupable: true,
        batchable: true,
        maxBatchSize: 5,
        soundEnabled: false,
        desktopEnabled: true,
        emailEnabled: false,
        pushEnabled: false
      },
      {
        category: EnhancedNotificationCategory.REACTION,
        displayName: 'Reactions',
        description: 'Likes, reactions, and engagement on your content',
        icon: 'heart',
        color: '#EC4899',
        defaultPriority: NotificationPriority.LOW,
        groupable: true,
        batchable: true,
        maxBatchSize: 10,
        batchDelay: 10000,
        soundEnabled: false,
        desktopEnabled: false,
        emailEnabled: false,
        pushEnabled: false
      },
      {
        category: EnhancedNotificationCategory.COMMENT,
        displayName: 'Comments',
        description: 'New comments on your posts',
        icon: 'message-circle',
        color: '#06B6D4',
        defaultPriority: NotificationPriority.NORMAL,
        groupable: true,
        batchable: true,
        maxBatchSize: 5,
        soundEnabled: false,
        desktopEnabled: true,
        emailEnabled: false,
        pushEnabled: true
      },
      {
        category: EnhancedNotificationCategory.FOLLOW,
        displayName: 'Followers',
        description: 'New followers and social connections',
        icon: 'user-plus',
        color: '#84CC16',
        defaultPriority: NotificationPriority.NORMAL,
        groupable: true,
        batchable: true,
        maxBatchSize: 5,
        soundEnabled: false,
        desktopEnabled: true,
        emailEnabled: false,
        pushEnabled: false
      },
      {
        category: EnhancedNotificationCategory.PROPOSAL_DEADLINE,
        displayName: 'Proposal Deadlines',
        description: 'Urgent voting deadlines approaching',
        icon: 'clock',
        color: '#EF4444',
        defaultPriority: NotificationPriority.URGENT,
        groupable: false,
        batchable: false,
        soundEnabled: true,
        desktopEnabled: true,
        emailEnabled: true,
        pushEnabled: true
      },
      {
        category: EnhancedNotificationCategory.BADGE_EARNED,
        displayName: 'Badges',
        description: 'Achievement badges and milestones',
        icon: 'award',
        color: '#F59E0B',
        defaultPriority: NotificationPriority.HIGH,
        groupable: true,
        batchable: false,
        soundEnabled: true,
        desktopEnabled: true,
        emailEnabled: false,
        pushEnabled: true
      },
      {
        category: EnhancedNotificationCategory.SECURITY_ALERT,
        displayName: 'Security',
        description: 'Security alerts and suspicious activity',
        icon: 'shield-alert',
        color: '#EF4444',
        defaultPriority: NotificationPriority.URGENT,
        groupable: false,
        batchable: false,
        soundEnabled: true,
        desktopEnabled: true,
        emailEnabled: true,
        pushEnabled: true
      },
      {
        category: EnhancedNotificationCategory.SYSTEM,
        displayName: 'System',
        description: 'System updates and maintenance notices',
        icon: 'settings',
        color: '#6B7280',
        defaultPriority: NotificationPriority.NORMAL,
        groupable: true,
        batchable: true,
        soundEnabled: false,
        desktopEnabled: true,
        emailEnabled: false,
        pushEnabled: false
      }
    ];

    configs.forEach(config => {
      this.categoryConfigs.set(config.category, config);
    });
  }

  /**
   * Initialize default filters
   */
  private initializeDefaultFilters(): void {
    const defaultFilters: NotificationFilter[] = [
      {
        id: 'all',
        name: 'All Notifications',
        description: 'Show all notifications',
        categories: Object.values(EnhancedNotificationCategory),
        priorities: Object.values(NotificationPriority),
        isActive: true,
        isDefault: true
      },
      {
        id: 'important',
        name: 'Important Only',
        description: 'High priority and urgent notifications',
        categories: Object.values(EnhancedNotificationCategory),
        priorities: [NotificationPriority.HIGH, NotificationPriority.URGENT],
        isActive: false,
        isDefault: false
      },
      {
        id: 'mentions_tips',
        name: 'Mentions & Tips',
        description: 'Direct mentions and tip notifications',
        categories: [EnhancedNotificationCategory.MENTION, EnhancedNotificationCategory.TIP],
        priorities: Object.values(NotificationPriority),
        isActive: false,
        isDefault: false
      },
      {
        id: 'governance',
        name: 'Governance Only',
        description: 'Governance and voting notifications',
        categories: [
          EnhancedNotificationCategory.GOVERNANCE, 
          EnhancedNotificationCategory.PROPOSAL_DEADLINE
        ],
        priorities: Object.values(NotificationPriority),
        isActive: false,
        isDefault: false
      },
      {
        id: 'social',
        name: 'Social Activity',
        description: 'Comments, reactions, and social interactions',
        categories: [
          EnhancedNotificationCategory.COMMENT,
          EnhancedNotificationCategory.REACTION,
          EnhancedNotificationCategory.FOLLOW,
          EnhancedNotificationCategory.SOCIAL_PROOF
        ],
        priorities: Object.values(NotificationPriority),
        isActive: false,
        isDefault: false
      }
    ];

    defaultFilters.forEach(filter => {
      this.filters.set(filter.id, filter);
    });
  }

  /**
   * Load user preferences from storage
   */
  private loadUserPreferences(): void {
    try {
      const stored = localStorage.getItem('notification_categorization_preferences');
      if (stored) {
        const preferences = JSON.parse(stored);
        
        // Load custom filters
        if (preferences.filters) {
          preferences.filters.forEach((filter: NotificationFilter) => {
            this.filters.set(filter.id, filter);
          });
        }
        
        // Load category config overrides
        if (preferences.categoryConfigs) {
          Object.entries(preferences.categoryConfigs).forEach(([category, config]) => {
            const existing = this.categoryConfigs.get(category as EnhancedNotificationCategory);
            if (existing) {
              this.categoryConfigs.set(category as EnhancedNotificationCategory, {
                ...existing,
                ...config as Partial<CategoryConfig>
              });
            }
          });
        }
      }
    } catch (error) {
      console.warn('Could not load notification categorization preferences:', error);
    }
  }

  /**
   * Save user preferences to storage
   */
  private saveUserPreferences(): void {
    try {
      const customFilters = Array.from(this.filters.values()).filter(f => !f.isDefault);
      const categoryConfigOverrides: Record<string, Partial<CategoryConfig>> = {};
      
      // Save only user-modified category configs
      this.categoryConfigs.forEach((config, category) => {
        // Compare with default config to see if modified
        // For now, save all configs - in production, you'd compare with defaults
        categoryConfigOverrides[category] = {
          soundEnabled: config.soundEnabled,
          desktopEnabled: config.desktopEnabled,
          emailEnabled: config.emailEnabled,
          pushEnabled: config.pushEnabled,
          batchable: config.batchable,
          maxBatchSize: config.maxBatchSize,
          batchDelay: config.batchDelay
        };
      });

      const preferences = {
        filters: customFilters,
        categoryConfigs: categoryConfigOverrides
      };

      localStorage.setItem('notification_categorization_preferences', JSON.stringify(preferences));
    } catch (error) {
      console.warn('Could not save notification categorization preferences:', error);
    }
  }

  /**
   * Categorize a notification
   */
  categorizeNotification(notification: RealTimeNotification): {
    category: EnhancedNotificationCategory;
    priority: NotificationPriority;
    shouldGroup: boolean;
    shouldBatch: boolean;
  } {
    // Map base category to enhanced category
    let enhancedCategory: EnhancedNotificationCategory;
    
    // Direct mapping for base categories
    switch (notification.category) {
      case NotificationCategory.MENTION:
        enhancedCategory = EnhancedNotificationCategory.MENTION;
        break;
      case NotificationCategory.TIP:
        enhancedCategory = EnhancedNotificationCategory.TIP;
        break;
      case NotificationCategory.GOVERNANCE:
        enhancedCategory = EnhancedNotificationCategory.GOVERNANCE;
        break;
      case NotificationCategory.COMMUNITY:
        enhancedCategory = EnhancedNotificationCategory.COMMUNITY;
        break;
      case NotificationCategory.REACTION:
        enhancedCategory = EnhancedNotificationCategory.REACTION;
        break;
      case NotificationCategory.COMMENT:
        enhancedCategory = EnhancedNotificationCategory.COMMENT;
        break;
      case NotificationCategory.FOLLOW:
        enhancedCategory = EnhancedNotificationCategory.FOLLOW;
        break;
      case NotificationCategory.SYSTEM:
        enhancedCategory = EnhancedNotificationCategory.SYSTEM;
        break;
      default:
        enhancedCategory = EnhancedNotificationCategory.SYSTEM;
    }
    
    // Apply category-specific logic
    if (notification.category === NotificationCategory.GOVERNANCE) {
      // Check if it's a deadline notification
      if (notification.metadata?.action === 'voting_ending' || 
          notification.metadata?.timeRemaining < 3600000) { // 1 hour
        enhancedCategory = EnhancedNotificationCategory.PROPOSAL_DEADLINE;
      }
    }
    
    if (notification.category === NotificationCategory.TIP) {
      // Large tips get higher priority
      if (notification.metadata?.tipAmount > 100) {
        notification.priority = NotificationPriority.URGENT;
      }
    }

    const config = this.categoryConfigs.get(enhancedCategory);
    
    return {
      category: enhancedCategory,
      priority: notification.priority,
      shouldGroup: config?.groupable ?? false,
      shouldBatch: config?.batchable ?? false
    };
  }

  /**
   * Filter notifications based on active filters
   */
  filterNotifications(notifications: RealTimeNotification[]): RealTimeNotification[] {
    const activeFilters = Array.from(this.filters.values()).filter(f => f.isActive);
    
    if (activeFilters.length === 0) {
      return notifications;
    }

    return notifications.filter(notification => {
      return activeFilters.some(filter => this.matchesFilter(notification, filter));
    });
  }

  /**
   * Check if notification matches filter
   */
  private matchesFilter(notification: RealTimeNotification, filter: NotificationFilter): boolean {
    const { category } = this.categorizeNotification(notification);
    
    // Check category
    if (!filter.categories.includes(category)) {
      return false;
    }
    
    // Check priority
    if (!filter.priorities.includes(notification.priority)) {
      return false;
    }
    
    // Check keywords
    if (filter.keywords && filter.keywords.length > 0) {
      const content = `${notification.title} ${notification.message}`.toLowerCase();
      const hasKeyword = filter.keywords.some(keyword => 
        content.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) {
        return false;
      }
    }
    
    // Check exclude keywords
    if (filter.excludeKeywords && filter.excludeKeywords.length > 0) {
      const content = `${notification.title} ${notification.message}`.toLowerCase();
      const hasExcludeKeyword = filter.excludeKeywords.some(keyword => 
        content.includes(keyword.toLowerCase())
      );
      if (hasExcludeKeyword) {
        return false;
      }
    }
    
    // Check time range
    if (filter.timeRange) {
      const notificationTime = new Date(notification.timestamp);
      if (notificationTime < filter.timeRange.start || notificationTime > filter.timeRange.end) {
        return false;
      }
    }
    
    // Check user filters
    if (filter.userFilters) {
      let userId: string | undefined;
      
      // Safely extract user ID based on notification type
      if (notification.metadata && typeof notification.metadata === 'object') {
        userId = (notification.metadata as any).mentionedBy || 
                (notification.metadata as any).tipperAddress || 
                (notification.metadata as any).reactorAddress;
      }
      
      if (filter.userFilters.includeUsers && filter.userFilters.includeUsers.length > 0) {
        if (!userId || !filter.userFilters.includeUsers.includes(userId)) {
          return false;
        }
      }
      
      if (filter.userFilters.excludeUsers && filter.userFilters.excludeUsers.length > 0) {
        if (userId && filter.userFilters.excludeUsers.includes(userId)) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Group notifications by category and context
   */
  groupNotifications(notifications: RealTimeNotification[]): NotificationGroup[] {
    const groups = new Map<string, NotificationGroup>();
    
    notifications.forEach(notification => {
      const { category, shouldGroup } = this.categorizeNotification(notification);
      
      if (!shouldGroup) {
        // Create individual group for non-groupable notifications
        const groupId = `${category}_${notification.id}`;
        groups.set(groupId, {
          id: groupId,
          category,
          title: notification.title,
          notifications: [notification],
          count: 1,
          latestTimestamp: notification.timestamp,
          priority: notification.priority,
          isCollapsed: false
        });
        return;
      }
      
      // Group by category and context
      let contextId = 'general';
      if (notification.metadata && typeof notification.metadata === 'object') {
        contextId = (notification.metadata as any).postId || 
                   (notification.metadata as any).communityId || 
                   'general';
      }
      const groupId = `${category}_${contextId}`;
      
      const existing = groups.get(groupId);
      if (existing) {
        existing.notifications.push(notification);
        existing.count++;
        existing.latestTimestamp = new Date(Math.max(
          existing.latestTimestamp.getTime(),
          notification.timestamp.getTime()
        ));
        // Use highest priority
        if (notification.priority === NotificationPriority.URGENT) {
          existing.priority = NotificationPriority.URGENT;
        } else if (notification.priority === NotificationPriority.HIGH && 
                   existing.priority !== NotificationPriority.URGENT) {
          existing.priority = NotificationPriority.HIGH;
        }
      } else {
        const config = this.categoryConfigs.get(category);
        groups.set(groupId, {
          id: groupId,
          category,
          title: this.generateGroupTitle(category, [notification]),
          notifications: [notification],
          count: 1,
          latestTimestamp: notification.timestamp,
          priority: notification.priority,
          isCollapsed: false,
          summary: this.generateGroupSummary(category, [notification])
        });
      }
    });
    
    // Update group titles and summaries
    groups.forEach(group => {
      if (group.count > 1) {
        group.title = this.generateGroupTitle(group.category, group.notifications);
        group.summary = this.generateGroupSummary(group.category, group.notifications);
      }
    });
    
    return Array.from(groups.values()).sort((a, b) => 
      b.latestTimestamp.getTime() - a.latestTimestamp.getTime()
    );
  }

  /**
   * Generate group title
   */
  private generateGroupTitle(category: EnhancedNotificationCategory, notifications: RealTimeNotification[]): string {
    const config = this.categoryConfigs.get(category);
    const count = notifications.length;
    
    if (count === 1) {
      return notifications[0].title;
    }
    
    switch (category) {
      case EnhancedNotificationCategory.MENTION:
        return `${count} new mentions`;
      case EnhancedNotificationCategory.TIP:
        return `${count} tips received`;
      case EnhancedNotificationCategory.COMMENT:
        return `${count} new comments`;
      case EnhancedNotificationCategory.REACTION:
        return `${count} new reactions`;
      case EnhancedNotificationCategory.FOLLOW:
        return `${count} new followers`;
      default:
        return `${count} ${config?.displayName.toLowerCase() || 'notifications'}`;
    }
  }

  /**
   * Generate group summary
   */
  private generateGroupSummary(category: EnhancedNotificationCategory, notifications: RealTimeNotification[]): string {
    const count = notifications.length;
    
    if (count === 1) {
      return notifications[0].message;
    }
    
    switch (category) {
      case EnhancedNotificationCategory.TIP:
        const totalAmount = notifications.reduce((sum, n) => {
          const tipAmount = n.metadata && typeof n.metadata === 'object' ? (n.metadata as any).tipAmount : 0;
          return sum + (tipAmount || 0);
        }, 0);
        return `Total: ${totalAmount} tokens from ${count} tips`;
      
      case EnhancedNotificationCategory.MENTION:
        const uniqueUsers = new Set(notifications.map(n => {
          return n.metadata && typeof n.metadata === 'object' ? (n.metadata as any).mentionedBy : undefined;
        }).filter(Boolean)).size;
        return `${uniqueUsers} users mentioned you in ${count} posts`;
      
      case EnhancedNotificationCategory.COMMENT:
        const uniqueCommenters = new Set(notifications.map(n => {
          return n.metadata && typeof n.metadata === 'object' ? (n.metadata as any).author : undefined;
        }).filter(Boolean)).size;
        return `${uniqueCommenters} users commented on your posts`;
      
      default:
        return `${count} notifications`;
    }
  }

  /**
   * Add notification to history
   */
  addToHistory(notification: RealTimeNotification, action?: string): void {
    const entry: NotificationHistoryEntry = {
      id: `${notification.id}_${Date.now()}`,
      notification,
      actionTaken: action
    };
    
    this.history.unshift(entry);
    
    // Limit history size
    if (this.history.length > this.MAX_HISTORY_SIZE) {
      this.history = this.history.slice(0, this.MAX_HISTORY_SIZE);
    }
    
    this.emit('history:updated', entry);
  }

  /**
   * Mark notification as read in history
   */
  markAsReadInHistory(notificationId: string): void {
    const entry = this.history.find(h => h.notification.id === notificationId);
    if (entry && !entry.readAt) {
      entry.readAt = new Date();
      this.emit('history:read', entry);
    }
  }

  /**
   * Mark notification as dismissed in history
   */
  markAsDismissedInHistory(notificationId: string): void {
    const entry = this.history.find(h => h.notification.id === notificationId);
    if (entry && !entry.dismissedAt) {
      entry.dismissedAt = new Date();
      this.emit('history:dismissed', entry);
    }
  }

  /**
   * Public API Methods
   */

  /**
   * Get all filters
   */
  getFilters(): NotificationFilter[] {
    return Array.from(this.filters.values());
  }

  /**
   * Get active filters
   */
  getActiveFilters(): NotificationFilter[] {
    return Array.from(this.filters.values()).filter(f => f.isActive);
  }

  /**
   * Add or update filter
   */
  setFilter(filter: NotificationFilter): void {
    this.filters.set(filter.id, filter);
    this.saveUserPreferences();
    this.emit('filter:updated', filter);
  }

  /**
   * Remove filter
   */
  removeFilter(filterId: string): void {
    const filter = this.filters.get(filterId);
    if (filter && !filter.isDefault) {
      this.filters.delete(filterId);
      this.saveUserPreferences();
      this.emit('filter:removed', filterId);
    }
  }

  /**
   * Activate filter
   */
  activateFilter(filterId: string): void {
    const filter = this.filters.get(filterId);
    if (filter) {
      filter.isActive = true;
      this.saveUserPreferences();
      this.emit('filter:activated', filter);
    }
  }

  /**
   * Deactivate filter
   */
  deactivateFilter(filterId: string): void {
    const filter = this.filters.get(filterId);
    if (filter) {
      filter.isActive = false;
      this.saveUserPreferences();
      this.emit('filter:deactivated', filter);
    }
  }

  /**
   * Get category configurations
   */
  getCategoryConfigs(): CategoryConfig[] {
    return Array.from(this.categoryConfigs.values());
  }

  /**
   * Update category configuration
   */
  updateCategoryConfig(category: EnhancedNotificationCategory, updates: Partial<CategoryConfig>): void {
    const existing = this.categoryConfigs.get(category);
    if (existing) {
      this.categoryConfigs.set(category, { ...existing, ...updates });
      this.saveUserPreferences();
      this.emit('category:updated', { category, config: this.categoryConfigs.get(category) });
    }
  }

  /**
   * Get notification history
   */
  getHistory(limit?: number): NotificationHistoryEntry[] {
    return limit ? this.history.slice(0, limit) : this.history;
  }

  /**
   * Clear notification history
   */
  clearHistory(): void {
    this.history = [];
    this.emit('history:cleared');
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalNotifications: number;
    unreadCount: number;
    categoryBreakdown: Record<string, number>;
    priorityBreakdown: Record<string, number>;
  } {
    const totalNotifications = this.history.length;
    const unreadCount = this.history.filter(h => !h.readAt).length;
    
    const categoryBreakdown: Record<string, number> = {};
    const priorityBreakdown: Record<string, number> = {};
    
    this.history.forEach(entry => {
      const { category } = this.categorizeNotification(entry.notification);
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
      priorityBreakdown[entry.notification.priority] = (priorityBreakdown[entry.notification.priority] || 0) + 1;
    });
    
    return {
      totalNotifications,
      unreadCount,
      categoryBreakdown,
      priorityBreakdown
    };
  }

  /**
   * Event system
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in notification categorization listener for event ${event}:`, error);
        }
      });
    }
  }
}

// Export singleton instance
export const notificationCategorizationService = new NotificationCategorizationService();
export default notificationCategorizationService;