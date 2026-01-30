import { AppNotification } from '../types/notifications';

/**
 * Enhanced Offline Sync Service
 * Provides improved offline notification handling with better sync strategies
 */

interface EnhancedOfflineNotification {
  id: string;
  notification: AppNotification;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  lastAttempt?: Date;
  nextRetry?: Date;
  error?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface SyncQueue {
  pending: EnhancedOfflineNotification[];
  syncing: EnhancedOfflineNotification[];
  failed: EnhancedOfflineNotification[];
  synced: EnhancedOfflineNotification[];
}

interface ConflictResolutionStrategy {
  type: 'latest_wins' | 'merge' | 'manual' | 'discard';
  data?: Record<string, any>;
}

export class EnhancedOfflineSyncService {
  private static instance: EnhancedOfflineSyncService;
  private queue: SyncQueue = {
    pending: [],
    syncing: [],
    failed: [],
    synced: []
  };
  
  private listeners = new Map<string, Set<Function>>();
  private syncInterval: NodeJS.Timeout | null = null;
  private retryInterval: NodeJS.Timeout | null = null;
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  
  // Configuration
  private readonly STORAGE_KEY = 'enhanced_offline_notifications';
  private readonly MAX_QUEUE_SIZE = 2000;
  private readonly MAX_STORAGE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly SYNC_INTERVAL = 15000; // 15 seconds for normal sync
  private readonly RETRY_INTERVAL = 30000; // 30 seconds for retries
  private readonly MAX_RETRY_ATTEMPTS = 5;
  private readonly BASE_RETRY_DELAY = 5000; // 5 seconds
  private readonly BACKOFF_MULTIPLIER = 2;
  
  // Enhanced sync strategies
  private readonly SYNC_STRATEGIES = {
    BATCH_SIZE: 20, // Process 20 notifications at a time
    PRIORITY_ORDER: ['urgent', 'high', 'medium', 'low'],
    CONFLICT_RESOLUTION: 'latest_wins' as const,
    NETWORK_AWARE_SYNC: true
  };

  private constructor() {
    this.loadFromStorage();
    this.setupEventListeners();
    this.startSyncProcesses();
  }

  static getInstance(): EnhancedOfflineSyncService {
    if (!EnhancedOfflineSyncService.instance) {
      EnhancedOfflineSyncService.instance = new EnhancedOfflineSyncService();
    }
    return EnhancedOfflineSyncService.instance;
  }

  /**
   * Setup event listeners for online/offline and visibility changes
   */
  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.emit('connection:online');
      this.triggerImmediateSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.emit('connection:offline');
    });

    // Handle page visibility changes for better battery life
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.triggerImmediateSync();
      }
    });

    // Handle beforeunload to save queue state
    window.addEventListener('beforeunload', () => {
      this.saveToStorage();
    });
  }

  /**
   * Start sync processes with different intervals
   */
  private startSyncProcesses(): void {
    // Regular sync interval
    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.hasPendingNotifications()) {
        this.syncPendingNotifications();
      }
    }, this.SYNC_INTERVAL);

    // Retry failed notifications
    this.retryInterval = setInterval(() => {
      if (this.isOnline && this.hasFailedNotifications()) {
        this.retryFailedNotifications();
      }
    }, this.RETRY_INTERVAL);
  }

  /**
   * Queue notification for offline storage with enhanced metadata
   */
  queueNotification(notification: AppNotification): void {
    // Check if notification already exists
    const existingIndex = this.queue.pending.findIndex(n => n.notification.id === notification.id);
    if (existingIndex !== -1) {
      console.log('Notification already queued, updating:', notification.id);
      this.queue.pending[existingIndex].notification = notification;
      this.queue.pending[existingIndex].lastAttempt = new Date();
      this.saveToStorage();
      return;
    }

    // Create enhanced notification entry
    const enhancedNotification: EnhancedOfflineNotification = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      notification,
      status: 'pending',
      retryCount: 0,
      priority: notification.priority,
      lastAttempt: new Date()
    };

    // Add to pending queue
    this.queue.pending.unshift(enhancedNotification);
    
    // Enforce queue size limits
    this.enforceQueueLimits();
    
    // Save to storage
    this.saveToStorage();
    
    this.emit('notification:queued', enhancedNotification);
    console.log('Notification queued for offline sync:', notification.id);
  }

  /**
   * Enhanced sync with batch processing and priority handling
   */
  private async syncPendingNotifications(): Promise<void> {
    if (!this.isOnline || this.queue.syncing.length > 0) {
      return;
    }

    // Get notifications to sync based on priority and batch size
    const notificationsToSync = this.getNotificationsToSync();
    if (notificationsToSync.length === 0) return;

    console.log(`Starting sync of ${notificationsToSync.length} notifications`);

    // Move notifications to syncing state
    this.moveToSyncing(notificationsToSync);
    
    try {
      // Process in batches
      const batches = this.createBatches(notificationsToSync, this.SYNC_STRATEGIES.BATCH_SIZE);
      
      for (const batch of batches) {
        await this.processBatch(batch);
        // Small delay between batches to prevent overwhelming the server
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      this.emit('sync:completed', { count: notificationsToSync.length });
      console.log('Sync completed successfully');
      
    } catch (error) {
      console.error('Sync failed:', error);
      this.handleSyncFailure(notificationsToSync, error);
      this.emit('sync:error', { error, count: notificationsToSync.length });
    }
  }

  /**
   * Get notifications to sync prioritized by importance
   */
  private getNotificationsToSync(): EnhancedOfflineNotification[] {
    // Sort by priority and age
    const sortedPending = [...this.queue.pending].sort((a, b) => {
      // Higher priority first
      const priorityOrder = this.SYNC_STRATEGIES.PRIORITY_ORDER;
      const priorityDiff = priorityOrder.indexOf(b.priority) - priorityOrder.indexOf(a.priority);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Older notifications first
      return (a.lastAttempt?.getTime() || 0) - (b.lastAttempt?.getTime() || 0);
    });

    return sortedPending.slice(0, this.SYNC_STRATEGIES.BATCH_SIZE);
  }

  /**
   * Create batches of notifications for processing
   */
  private createBatches(notifications: EnhancedOfflineNotification[], batchSize: number): EnhancedOfflineNotification[][] {
    const batches: EnhancedOfflineNotification[][] = [];
    
    for (let i = 0; i < notifications.length; i += batchSize) {
      batches.push(notifications.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * Process a batch of notifications
   */
  private async processBatch(batch: EnhancedOfflineNotification[]): Promise<void> {
    // In a real implementation, this would make API calls
    // For demo purposes, we'll simulate successful processing
    
    for (const notificationEntry of batch) {
      try {
        // Simulate API call
        await this.simulateApiCall(notificationEntry.notification);
        
        // Mark as synced
        this.markAsSynced(notificationEntry.id);
        
      } catch (error) {
        // Handle individual notification failure
        this.handleIndividualFailure(notificationEntry, error);
      }
    }
  }

  /**
   * Simulate API call for demonstration
   */
  private async simulateApiCall(notification: AppNotification): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    // Simulate 95% success rate
    if (Math.random() > 0.05) {
      return; // Success
    } else {
      throw new Error('API call failed');
    }
  }

  /**
   * Enhanced retry mechanism with exponential backoff
   */
  private async retryFailedNotifications(): Promise<void> {
    const retryableNotifications = this.queue.failed.filter(notification => {
      return notification.retryCount < this.MAX_RETRY_ATTEMPTS && 
             (!notification.nextRetry || new Date() >= notification.nextRetry);
    });

    if (retryableNotifications.length === 0) return;

    console.log(`Retrying ${retryableNotifications.length} failed notifications`);

    for (const notification of retryableNotifications) {
      try {
        await this.simulateApiCall(notification.notification);
        
        // Move from failed to synced
        this.removeFromFailed(notification.id);
        const syncedEntry: EnhancedOfflineNotification = {
          ...notification,
          status: 'synced',
          lastAttempt: new Date()
        };
        this.queue.synced.push(syncedEntry);
        
        this.emit('notification:resynced', syncedEntry);
        
      } catch (error) {
        // Increment retry count and calculate next retry time
        notification.retryCount++;
        notification.lastAttempt = new Date();
        notification.nextRetry = new Date(Date.now() + 
          this.calculateBackoffDelay(notification.retryCount));
        notification.error = error instanceof Error ? error.message : String(error);
        
        this.emit('notification:retry_failed', { notification, error });
      }
    }

    this.saveToStorage();
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(retryCount: number): number {
    return this.BASE_RETRY_DELAY * Math.pow(this.BACKOFF_MULTIPLIER, retryCount - 1);
  }

  /**
   * Conflict resolution for failed notifications
   */
  resolveConflict(
    notificationId: string, 
    strategy: ConflictResolutionStrategy
  ): boolean {
    const failedNotification = this.queue.failed.find(n => n.id === notificationId);
    if (!failedNotification) return false;

    switch (strategy.type) {
      case 'latest_wins':
        // Use the latest version and retry
        failedNotification.status = 'pending';
        failedNotification.retryCount = 0;
        failedNotification.nextRetry = new Date();
        this.queue.pending.push(failedNotification);
        this.queue.failed = this.queue.failed.filter(n => n.id !== notificationId);
        break;
        
      case 'merge':
        // Merge with existing data
        failedNotification.status = 'pending';
        failedNotification.retryCount = 0;
        failedNotification.nextRetry = new Date();
        failedNotification.notification.data = {
          ...failedNotification.notification.data,
          ...strategy.data
        };
        this.queue.pending.push(failedNotification);
        this.queue.failed = this.queue.failed.filter(n => n.id !== notificationId);
        break;
        
      case 'discard':
        // Remove the conflicting notification
        this.queue.failed = this.queue.failed.filter(n => n.id !== notificationId);
        break;
    }

    this.saveToStorage();
    this.emit('conflict:resolved', { notificationId, strategy });
    return true;
  }

  /**
   * Storage management with size optimization
   */
  private saveToStorage(): void {
    try {
      // Clean up old synced notifications (keep last 100)
      if (this.queue.synced.length > 100) {
        this.queue.synced = this.queue.synced.slice(0, 100);
      }

      const serialized = JSON.stringify(this.queue);
      
      // Check storage size
      if (serialized.length > this.MAX_STORAGE_SIZE) {
        this.optimizeStorage();
        return; // Recursive call after optimization
      }

      localStorage.setItem(this.STORAGE_KEY, serialized);
      
    } catch (error) {
      console.error('Error saving to storage:', error);
      this.emit('storage:error', error);
    }
  }

  /**
   * Optimize storage by removing old data
   */
  private optimizeStorage(): void {
    // Remove old synced notifications
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 1 week ago
    this.queue.synced = this.queue.synced.filter(n => 
      n.lastAttempt && n.lastAttempt > cutoffDate
    );

    // Reduce failed notifications
    this.queue.failed = this.queue.failed
      .sort((a, b) => (b.lastAttempt?.getTime() || 0) - (a.lastAttempt?.getTime() || 0))
      .slice(0, 50);

    this.saveToStorage();
  }

  /**
   * Load from storage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;

      const parsedQueue: SyncQueue = JSON.parse(stored);
      
      // Validate and migrate data structure if needed
      this.queue = {
        pending: parsedQueue.pending || [],
        syncing: parsedQueue.syncing || [],
        failed: parsedQueue.failed || [],
        synced: parsedQueue.synced || []
      };

      this.emit('storage:loaded', {
        pending: this.queue.pending.length,
        failed: this.queue.failed.length,
        synced: this.queue.synced.length
      });

    } catch (error) {
      console.error('Error loading from storage:', error);
      this.clearQueue();
      this.emit('storage:error', error);
    }
  }

  // Helper methods for queue management
  private moveToSyncing(notifications: EnhancedOfflineNotification[]): void {
    notifications.forEach(notification => {
      notification.status = 'syncing';
      notification.lastAttempt = new Date();
    });
    
    this.queue.syncing.push(...notifications);
    this.queue.pending = this.queue.pending.filter(n => 
      !notifications.some(syncing => syncing.id === n.id)
    );
    
    this.saveToStorage();
  }

  private markAsSynced(notificationId: string): void {
    const syncingIndex = this.queue.syncing.findIndex(n => n.id === notificationId);
    if (syncingIndex !== -1) {
      const [notification] = this.queue.syncing.splice(syncingIndex, 1);
      notification.status = 'synced';
      notification.lastAttempt = new Date();
      this.queue.synced.push(notification);
      this.saveToStorage();
    }
  }

  private handleSyncFailure(notifications: EnhancedOfflineNotification[], error: unknown): void {
    notifications.forEach(notification => {
      notification.status = 'failed';
      notification.retryCount++;
      notification.lastAttempt = new Date();
      notification.nextRetry = new Date(Date.now() + this.calculateBackoffDelay(1));
      notification.error = error instanceof Error ? error.message : String(error);
    });
    
    this.queue.failed.push(...notifications);
    this.queue.syncing = this.queue.syncing.filter(n => 
      !notifications.some(failed => failed.id === n.id)
    );
    
    this.saveToStorage();
  }

  private handleIndividualFailure(notification: EnhancedOfflineNotification, error: unknown): void {
    const syncingIndex = this.queue.syncing.findIndex(n => n.id === notification.id);
    if (syncingIndex !== -1) {
      const [failedNotification] = this.queue.syncing.splice(syncingIndex, 1);
      failedNotification.status = 'failed';
      failedNotification.retryCount++;
      failedNotification.lastAttempt = new Date();
      failedNotification.nextRetry = new Date(Date.now() + this.calculateBackoffDelay(1));
      failedNotification.error = error instanceof Error ? error.message : String(error);
      this.queue.failed.push(failedNotification);
    }
  }

  private removeFromFailed(notificationId: string): void {
    this.queue.failed = this.queue.failed.filter(n => n.id !== notificationId);
  }

  private enforceQueueLimits(): void {
    // Limit pending queue size
    if (this.queue.pending.length > this.MAX_QUEUE_SIZE) {
      // Remove oldest pending notifications
      this.queue.pending = this.queue.pending.slice(0, this.MAX_QUEUE_SIZE);
    }
  }

  // Public API methods
  hasPendingNotifications(): boolean {
    return this.queue.pending.length > 0;
  }

  hasFailedNotifications(): boolean {
    return this.queue.failed.some(n => 
      n.retryCount < this.MAX_RETRY_ATTEMPTS && 
      (!n.nextRetry || new Date() >= n.nextRetry)
    );
  }

  getQueueStats(): {
    pending: number;
    syncing: number;
    failed: number;
    synced: number;
    total: number;
  } {
    return {
      pending: this.queue.pending.length,
      syncing: this.queue.syncing.length,
      failed: this.queue.failed.length,
      synced: this.queue.synced.length,
      total: this.queue.pending.length + this.queue.syncing.length + 
             this.queue.failed.length + this.queue.synced.length
    };
  }

  clearQueue(): void {
    this.queue = {
      pending: [],
      syncing: [],
      failed: [],
      synced: []
    };
    localStorage.removeItem(this.STORAGE_KEY);
    this.emit('queue:cleared');
  }

  // Event emitter methods
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Cleanup
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
    }
    this.saveToStorage();
  }
}

// Export singleton instance
export const enhancedOfflineSyncService = EnhancedOfflineSyncService.getInstance();