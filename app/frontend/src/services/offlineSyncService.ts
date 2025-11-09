/**
 * Offline Support and Sync Service
 * Handles offline notification queuing, sync, and conflict resolution
 * Requirements: 8.7, 10.7
 */

import { 
  RealTimeNotification, 
  NotificationCategory, 
  NotificationPriority 
} from '../types/realTimeNotifications';
import { LiveContentUpdate } from './communityRealTimeUpdateService';

// Offline action types
export interface OfflineAction {
  id: string;
  type: 'vote' | 'tip' | 'comment' | 'reaction' | 'follow' | 'join_community' | 'create_post';
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'normal' | 'low';
  contextId?: string; // postId, communityId, etc.
  userId: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';
  conflictData?: any;
  lastAttempt?: Date;
  nextRetry?: Date;
}

// Offline notification queue
export interface OfflineNotificationQueue {
  notifications: RealTimeNotification[];
  updates: LiveContentUpdate[];
  actions: OfflineAction[];
  lastSync: Date;
  syncInProgress: boolean;
}

// Sync result
export interface SyncResult {
  success: boolean;
  syncedNotifications: number;
  syncedUpdates: number;
  syncedActions: number;
  failedActions: OfflineAction[];
  conflicts: OfflineAction[];
  errors: string[];
}

// Conflict resolution strategy
export type ConflictResolutionStrategy = 'server_wins' | 'client_wins' | 'merge' | 'manual';

// Offline storage interface
interface OfflineStorage {
  notifications: RealTimeNotification[];
  updates: LiveContentUpdate[];
  actions: OfflineAction[];
  metadata: {
    lastSync: string;
    syncInProgress: boolean;
    totalSize: number;
    version: string;
  };
}

/**
 * Offline Support and Sync Service
 */
export class OfflineSyncService {
  private queue: OfflineNotificationQueue = {
    notifications: [],
    updates: [],
    actions: [],
    lastSync: new Date(),
    syncInProgress: false
  };

  private listeners = new Map<string, Set<Function>>();
  private syncInterval: NodeJS.Timeout | null = null;
  private retryInterval: NodeJS.Timeout | null = null;
  
  private readonly STORAGE_KEY = 'offline_sync_queue';
  private readonly MAX_QUEUE_SIZE = 1000;
  private readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly SYNC_INTERVAL = 30000; // 30 seconds
  private readonly RETRY_INTERVAL = 60000; // 1 minute
  private readonly MAX_RETRY_ATTEMPTS = 5;
  private readonly STORAGE_VERSION = '1.0';

  constructor() {
    this.loadFromStorage();
    this.startSyncInterval();
    this.startRetryInterval();
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for online/offline events
   */
  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.emit('connection:online');
      this.syncWhenOnline();
    });

    window.addEventListener('offline', () => {
      this.emit('connection:offline');
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine) {
        this.syncWhenOnline();
      }
    });

    // Handle beforeunload to save queue
    window.addEventListener('beforeunload', () => {
      this.saveToStorage();
    });
  }

  /**
   * Start sync interval
   */
  private startSyncInterval(): void {
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.queue.syncInProgress) {
        this.syncWhenOnline();
      }
    }, this.SYNC_INTERVAL);
  }

  /**
   * Start retry interval for failed actions
   */
  private startRetryInterval(): void {
    this.retryInterval = setInterval(() => {
      if (navigator.onLine && !this.queue.syncInProgress) {
        this.retryFailedActions();
      }
    }, this.RETRY_INTERVAL);
  }

  /**
   * Queue notification for offline storage
   */
  queueNotification(notification: RealTimeNotification): void {
    // Check if notification already exists
    const exists = this.queue.notifications.some(n => n.id === notification.id);
    if (exists) return;

    this.queue.notifications.unshift(notification);
    this.trimQueue();
    this.saveToStorage();
    
    this.emit('notification:queued', notification);
  }

  /**
   * Queue content update for offline storage
   */
  queueUpdate(update: LiveContentUpdate): void {
    // Check if update already exists
    const exists = this.queue.updates.some(u => 
      u.type === update.type && 
      u.postId === update.postId && 
      u.timestamp.getTime() === update.timestamp.getTime()
    );
    if (exists) return;

    this.queue.updates.unshift(update);
    this.trimQueue();
    this.saveToStorage();
    
    this.emit('update:queued', update);
  }

  /**
   * Queue action for offline execution
   */
  queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount' | 'status'>): string {
    const offlineAction: OfflineAction = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      retryCount: 0,
      status: 'pending',
      ...action
    };

    this.queue.actions.unshift(offlineAction);
    this.trimQueue();
    this.saveToStorage();
    
    this.emit('action:queued', offlineAction);
    
    return offlineAction.id;
  }

  /**
   * Trim queue to prevent excessive memory usage
   */
  private trimQueue(): void {
    // Trim notifications
    if (this.queue.notifications.length > this.MAX_QUEUE_SIZE) {
      this.queue.notifications = this.queue.notifications.slice(0, this.MAX_QUEUE_SIZE);
    }

    // Trim updates
    if (this.queue.updates.length > this.MAX_QUEUE_SIZE) {
      this.queue.updates = this.queue.updates.slice(0, this.MAX_QUEUE_SIZE);
    }

    // Trim actions (keep failed and pending actions)
    const importantActions = this.queue.actions.filter(a => 
      a.status === 'pending' || a.status === 'failed' || a.status === 'conflict'
    );
    const otherActions = this.queue.actions.filter(a => 
      a.status !== 'pending' && a.status !== 'failed' && a.status !== 'conflict'
    );
    
    if (importantActions.length + otherActions.length > this.MAX_QUEUE_SIZE) {
      const maxOtherActions = Math.max(0, this.MAX_QUEUE_SIZE - importantActions.length);
      this.queue.actions = [...importantActions, ...otherActions.slice(0, maxOtherActions)];
    }
  }

  /**
   * Sync when coming online
   */
  private async syncWhenOnline(): Promise<void> {
    if (this.queue.syncInProgress) return;

    try {
      await this.syncAll();
    } catch (error) {
      console.error('Error during online sync:', error);
      this.emit('sync:error', error);
    }
  }

  /**
   * Sync all queued items
   */
  async syncAll(): Promise<SyncResult> {
    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline');
    }

    if (this.queue.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.queue.syncInProgress = true;
    this.saveToStorage();
    
    const result: SyncResult = {
      success: false,
      syncedNotifications: 0,
      syncedUpdates: 0,
      syncedActions: 0,
      failedActions: [],
      conflicts: [],
      errors: []
    };

    try {
      this.emit('sync:started');

      // Sync notifications (usually just marking as received)
      result.syncedNotifications = await this.syncNotifications();

      // Sync updates (usually just acknowledging receipt)
      result.syncedUpdates = await this.syncUpdates();

      // Sync actions (the most complex part)
      const actionResult = await this.syncActions();
      result.syncedActions = actionResult.synced;
      result.failedActions = actionResult.failed;
      result.conflicts = actionResult.conflicts;

      this.queue.lastSync = new Date();
      result.success = true;

      this.emit('sync:completed', result);

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
      this.emit('sync:error', error);
    } finally {
      this.queue.syncInProgress = false;
      this.saveToStorage();
    }

    return result;
  }

  /**
   * Sync queued notifications
   */
  private async syncNotifications(): Promise<number> {
    const notifications = [...this.queue.notifications];
    
    if (notifications.length === 0) return 0;

    try {
      // In a real implementation, you might send these to the server
      // to acknowledge receipt or update read status
      
      // For now, we'll just clear them as they're already processed
      this.queue.notifications = [];
      
      return notifications.length;
    } catch (error) {
      console.error('Error syncing notifications:', error);
      throw error;
    }
  }

  /**
   * Sync queued updates
   */
  private async syncUpdates(): Promise<number> {
    const updates = [...this.queue.updates];
    
    if (updates.length === 0) return 0;

    try {
      // In a real implementation, you might send these to the server
      // to acknowledge receipt or request latest state
      
      // For now, we'll just clear them as they're already processed
      this.queue.updates = [];
      
      return updates.length;
    } catch (error) {
      console.error('Error syncing updates:', error);
      throw error;
    }
  }

  /**
   * Sync queued actions
   */
  private async syncActions(): Promise<{
    synced: number;
    failed: OfflineAction[];
    conflicts: OfflineAction[];
  }> {
    const pendingActions = this.queue.actions.filter(a => a.status === 'pending');
    
    if (pendingActions.length === 0) {
      return { synced: 0, failed: [], conflicts: [] };
    }

    const result = {
      synced: 0,
      failed: [] as OfflineAction[],
      conflicts: [] as OfflineAction[]
    };

    // Sort actions by priority and timestamp
    const sortedActions = pendingActions.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp.getTime() - b.timestamp.getTime();
    });

    for (const action of sortedActions) {
      try {
        action.status = 'syncing';
        action.lastAttempt = new Date();
        
        const syncResult = await this.syncSingleAction(action);
        
        if (syncResult.success) {
          action.status = 'synced';
          result.synced++;
        } else if (syncResult.conflict) {
          action.status = 'conflict';
          action.conflictData = syncResult.conflictData;
          result.conflicts.push(action);
        } else {
          action.status = 'failed';
          action.retryCount++;
          
          if (action.retryCount >= action.maxRetries) {
            result.failed.push(action);
          } else {
            // Schedule retry
            action.nextRetry = new Date(Date.now() + this.getRetryDelay(action.retryCount));
            action.status = 'pending';
          }
        }
        
      } catch (error) {
        console.error(`Error syncing action ${action.id}:`, error);
        action.status = 'failed';
        action.retryCount++;
        
        if (action.retryCount >= action.maxRetries) {
          result.failed.push(action);
        } else {
          action.nextRetry = new Date(Date.now() + this.getRetryDelay(action.retryCount));
          action.status = 'pending';
        }
      }
    }

    return result;
  }

  /**
   * Sync a single action
   */
  private async syncSingleAction(action: OfflineAction): Promise<{
    success: boolean;
    conflict?: boolean;
    conflictData?: any;
  }> {
    // Simulate API call based on action type
    switch (action.type) {
      case 'vote':
        return this.syncVoteAction(action);
      case 'tip':
        return this.syncTipAction(action);
      case 'comment':
        return this.syncCommentAction(action);
      case 'reaction':
        return this.syncReactionAction(action);
      case 'follow':
        return this.syncFollowAction(action);
      case 'join_community':
        return this.syncJoinCommunityAction(action);
      case 'create_post':
        return this.syncCreatePostAction(action);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Sync vote action
   */
  private async syncVoteAction(action: OfflineAction): Promise<any> {
    // Simulate API call
    const response = await this.makeApiCall('/api/governance/vote', {
      method: 'POST',
      body: JSON.stringify(action.data)
    });

    if (response.status === 409) {
      // Conflict - user already voted
      return {
        success: false,
        conflict: true,
        conflictData: await response.json()
      };
    }

    if (!response.ok) {
      throw new Error(`Vote sync failed: ${response.statusText}`);
    }

    return { success: true };
  }

  /**
   * Sync tip action
   */
  private async syncTipAction(action: OfflineAction): Promise<any> {
    // Simulate API call
    const response = await this.makeApiCall('/api/tips', {
      method: 'POST',
      body: JSON.stringify(action.data)
    });

    if (response.status === 409) {
      // Conflict - insufficient balance or duplicate tip
      return {
        success: false,
        conflict: true,
        conflictData: await response.json()
      };
    }

    if (!response.ok) {
      throw new Error(`Tip sync failed: ${response.statusText}`);
    }

    return { success: true };
  }

  /**
   * Sync comment action
   */
  private async syncCommentAction(action: OfflineAction): Promise<any> {
    // Simulate API call
    const response = await this.makeApiCall('/api/comments', {
      method: 'POST',
      body: JSON.stringify(action.data)
    });

    if (response.status === 409) {
      // Conflict - post was deleted or user was banned
      return {
        success: false,
        conflict: true,
        conflictData: await response.json()
      };
    }

    if (!response.ok) {
      throw new Error(`Comment sync failed: ${response.statusText}`);
    }

    return { success: true };
  }

  /**
   * Sync reaction action
   */
  private async syncReactionAction(action: OfflineAction): Promise<any> {
    // Simulate API call
    const response = await this.makeApiCall('/api/reactions', {
      method: 'POST',
      body: JSON.stringify(action.data)
    });

    if (!response.ok) {
      throw new Error(`Reaction sync failed: ${response.statusText}`);
    }

    return { success: true };
  }

  /**
   * Sync follow action
   */
  private async syncFollowAction(action: OfflineAction): Promise<any> {
    // Simulate API call
    const response = await this.makeApiCall('/api/social/follow', {
      method: 'POST',
      body: JSON.stringify(action.data)
    });

    if (!response.ok) {
      throw new Error(`Follow sync failed: ${response.statusText}`);
    }

    return { success: true };
  }

  /**
   * Sync join community action
   */
  private async syncJoinCommunityAction(action: OfflineAction): Promise<any> {
    // Simulate API call
    const response = await this.makeApiCall('/api/communities/join', {
      method: 'POST',
      body: JSON.stringify(action.data)
    });

    if (!response.ok) {
      throw new Error(`Join community sync failed: ${response.statusText}`);
    }

    return { success: true };
  }

  /**
   * Sync create post action
   */
  private async syncCreatePostAction(action: OfflineAction): Promise<any> {
    // Simulate API call
    const response = await this.makeApiCall('/api/posts', {
      method: 'POST',
      body: JSON.stringify(action.data)
    });

    if (response.status === 409) {
      // Conflict - duplicate post or community restrictions
      return {
        success: false,
        conflict: true,
        conflictData: await response.json()
      };
    }

    if (!response.ok) {
      throw new Error(`Create post sync failed: ${response.statusText}`);
    }

    return { success: true };
  }

  /**
   * Make API call with proper headers
   */
  private async makeApiCall(url: string, options: RequestInit): Promise<Response> {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getAuthToken()}`
    };

    return fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    });
  }

  /**
   * Get authentication token
   */
  private getAuthToken(): string {
    // In a real implementation, get from auth service
    return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('auth_token') || '';
  }

  /**
   * Retry failed actions
   */
  private async retryFailedActions(): Promise<void> {
    const now = new Date();
    const actionsToRetry = this.queue.actions.filter(a => 
      a.status === 'pending' && 
      a.nextRetry && 
      a.nextRetry <= now &&
      a.retryCount < a.maxRetries
    );

    if (actionsToRetry.length === 0) return;

    this.emit('retry:started', { count: actionsToRetry.length });

    for (const action of actionsToRetry) {
      try {
        action.status = 'syncing';
        action.lastAttempt = new Date();
        
        const syncResult = await this.syncSingleAction(action);
        
        if (syncResult.success) {
          action.status = 'synced';
          this.emit('retry:success', action);
        } else if (syncResult.conflict) {
          action.status = 'conflict';
          action.conflictData = syncResult.conflictData;
          this.emit('retry:conflict', action);
        } else {
          action.status = 'failed';
          action.retryCount++;
          
          if (action.retryCount < action.maxRetries) {
            action.nextRetry = new Date(Date.now() + this.getRetryDelay(action.retryCount));
            action.status = 'pending';
          }
          
          this.emit('retry:failed', action);
        }
        
      } catch (error) {
        console.error(`Error retrying action ${action.id}:`, error);
        action.status = 'failed';
        action.retryCount++;
        
        if (action.retryCount < action.maxRetries) {
          action.nextRetry = new Date(Date.now() + this.getRetryDelay(action.retryCount));
          action.status = 'pending';
        }
        
        this.emit('retry:failed', action);
      }
    }

    this.saveToStorage();
  }

  /**
   * Get retry delay with exponential backoff
   */
  private getRetryDelay(retryCount: number): number {
    const baseDelay = 5000; // 5 seconds
    const maxDelay = 300000; // 5 minutes
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return delay + jitter;
  }

  /**
   * Resolve conflict manually
   */
  resolveConflict(
    actionId: string, 
    strategy: ConflictResolutionStrategy, 
    customData?: any
  ): boolean {
    const action = this.queue.actions.find(a => a.id === actionId);
    if (!action || action.status !== 'conflict') {
      return false;
    }

    switch (strategy) {
      case 'server_wins':
        // Discard local action
        action.status = 'synced';
        break;
        
      case 'client_wins':
        // Retry with force flag
        action.status = 'pending';
        action.data.force = true;
        action.retryCount = 0;
        action.nextRetry = new Date();
        break;
        
      case 'merge':
        // Merge data and retry
        action.status = 'pending';
        action.data = { ...action.data, ...customData };
        action.retryCount = 0;
        action.nextRetry = new Date();
        break;
        
      case 'manual':
        // Use custom resolution data
        action.status = 'pending';
        action.data = customData || action.data;
        action.retryCount = 0;
        action.nextRetry = new Date();
        break;
    }

    this.saveToStorage();
    this.emit('conflict:resolved', { action, strategy });
    
    return true;
  }

  /**
   * Save queue to localStorage
   */
  private saveToStorage(): void {
    try {
      const storage: OfflineStorage = {
        notifications: this.queue.notifications,
        updates: this.queue.updates,
        actions: this.queue.actions,
        metadata: {
          lastSync: this.queue.lastSync.toISOString(),
          syncInProgress: this.queue.syncInProgress,
          totalSize: 0,
          version: this.STORAGE_VERSION
        }
      };

      const serialized = JSON.stringify(storage);
      storage.metadata.totalSize = serialized.length;

      // Check storage size limit
      if (serialized.length > this.MAX_STORAGE_SIZE) {
        this.trimStorageToFit();
        return; // Will recursively call saveToStorage
      }

      localStorage.setItem(this.STORAGE_KEY, serialized);
      
    } catch (error) {
      console.error('Error saving offline queue to storage:', error);
      this.emit('storage:error', error);
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;

      const storage: OfflineStorage = JSON.parse(stored);
      
      // Check version compatibility
      if (storage.metadata.version !== this.STORAGE_VERSION) {
        console.warn('Offline storage version mismatch, clearing queue');
        this.clearQueue();
        return;
      }

      this.queue = {
        notifications: storage.notifications || [],
        updates: storage.updates || [],
        actions: storage.actions || [],
        lastSync: new Date(storage.metadata.lastSync),
        syncInProgress: false // Always reset sync flag on load
      };

      this.emit('storage:loaded', {
        notifications: this.queue.notifications.length,
        updates: this.queue.updates.length,
        actions: this.queue.actions.length
      });
      
    } catch (error) {
      console.error('Error loading offline queue from storage:', error);
      this.clearQueue();
      this.emit('storage:error', error);
    }
  }

  /**
   * Trim storage to fit size limit
   */
  private trimStorageToFit(): void {
    // Remove oldest synced actions first
    const syncedActions = this.queue.actions.filter(a => a.status === 'synced');
    if (syncedActions.length > 0) {
      this.queue.actions = this.queue.actions.filter(a => a.status !== 'synced');
      this.saveToStorage();
      return;
    }

    // Remove oldest notifications
    if (this.queue.notifications.length > 100) {
      this.queue.notifications = this.queue.notifications.slice(0, 100);
      this.saveToStorage();
      return;
    }

    // Remove oldest updates
    if (this.queue.updates.length > 100) {
      this.queue.updates = this.queue.updates.slice(0, 100);
      this.saveToStorage();
      return;
    }

    console.warn('Unable to trim storage to fit size limit');
  }

  /**
   * Public API Methods
   */

  /**
   * Get queue status
   */
  getQueueStatus(): {
    notifications: number;
    updates: number;
    actions: {
      pending: number;
      syncing: number;
      synced: number;
      failed: number;
      conflicts: number;
    };
    lastSync: Date;
    syncInProgress: boolean;
    isOnline: boolean;
  } {
    const actionCounts = this.queue.actions.reduce((counts, action) => {
      counts[action.status]++;
      return counts;
    }, { pending: 0, syncing: 0, synced: 0, failed: 0, conflict: 0 });

    return {
      notifications: this.queue.notifications.length,
      updates: this.queue.updates.length,
      actions: {
        pending: actionCounts.pending,
        syncing: actionCounts.syncing,
        synced: actionCounts.synced,
        failed: actionCounts.failed,
        conflicts: actionCounts.conflict
      },
      lastSync: this.queue.lastSync,
      syncInProgress: this.queue.syncInProgress,
      isOnline: navigator.onLine
    };
  }

  /**
   * Get failed actions
   */
  getFailedActions(): OfflineAction[] {
    return this.queue.actions.filter(a => a.status === 'failed');
  }

  /**
   * Get conflicted actions
   */
  getConflictedActions(): OfflineAction[] {
    return this.queue.actions.filter(a => a.status === 'conflict');
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.queue = {
      notifications: [],
      updates: [],
      actions: [],
      lastSync: new Date(),
      syncInProgress: false
    };
    
    this.saveToStorage();
    this.emit('queue:cleared');
  }

  /**
   * Force sync now
   */
  async forceSyncNow(): Promise<SyncResult> {
    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline');
    }
    
    return this.syncAll();
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
          console.error(`Error in offline sync listener for event ${event}:`, error);
        }
      });
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
    }
    
    this.saveToStorage();
    this.listeners.clear();
  }
}

// Export singleton instance
export const offlineSyncService = new OfflineSyncService();
export default offlineSyncService;