/**
 * Background Sync Integration Service
 * Integrates offline action queue and background sync with the existing cache service
 */

import { getOfflineActionQueue, OfflineAction } from './offlineActionQueue';
import { backgroundSyncManager } from './backgroundSyncManager';
import { serviceWorkerCacheService } from './serviceWorkerCacheService';

export interface BackgroundSyncIntegrationConfig {
  enableAutoSync: boolean;
  syncIntervalMs: number;
  maxQueueSize: number;
  enableNetworkAwareSync: boolean;
}

export class BackgroundSyncIntegration {
  private config: BackgroundSyncIntegrationConfig;
  private syncInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  private readonly DEFAULT_CONFIG: BackgroundSyncIntegrationConfig = {
    enableAutoSync: true,
    syncIntervalMs: 30000, // 30 seconds
    maxQueueSize: 1000,
    enableNetworkAwareSync: true
  };

  constructor(config?: Partial<BackgroundSyncIntegrationConfig>) {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the background sync integration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Offline action queue is ready to use (no initialization needed)
      
      // Initialize service worker cache service
      await serviceWorkerCacheService.initialize();
      
      // Set up sync event handlers
      this.setupSyncHandlers();
      
      // Set up periodic sync if enabled
      if (this.config.enableAutoSync) {
        this.startPeriodicSync();
      }
      
      // Set up network event listeners
      this.setupNetworkEventListeners();
      
      this.isInitialized = true;
      console.log('Background Sync Integration initialized');
    } catch (error) {
      console.error('Failed to initialize Background Sync Integration:', error);
      throw error;
    }
  }

  /**
   * Queue an action for offline processing
   */
  async queueAction(
    type: 'post' | 'comment' | 'reaction' | 'message' | 'community_join' | 'community_post',
    data: any,
    options?: {
      priority?: 'high' | 'medium' | 'low';
      tags?: string[];
      orderGroup?: string;
      dependencies?: string[];
      expiresAt?: number;
    }
  ): Promise<string> {
    const action = {
      type,
      data,
      priority: options?.priority || 'medium',
      tags: options?.tags || [type],
      orderGroup: options?.orderGroup,
      dependencies: options?.dependencies,
      expiresAt: options?.expiresAt,
      maxRetries: 3 // Add the missing maxRetries property
    };

    const queue = getOfflineActionQueue();
    const success = queue ? await queue.queueAction(action) : false;
    const actionId = success ? `action_${Date.now()}` : null;
    
    // Trigger immediate sync if network is available and suitable
    if (navigator.onLine && backgroundSyncManager.isNetworkSuitable()) {
      this.triggerSync(type).catch(console.error);
    }
    
    return actionId;
  }

  /**
   * Trigger background sync for specific action type
   */
  async triggerSync(actionType?: string): Promise<void> {
    try {
      const syncTag = actionType ? `${actionType}-sync` : 'offline-actions-sync';
      await backgroundSyncManager.registerSync(syncTag);
    } catch (error) {
      console.error('Failed to trigger sync:', error);
    }
  }

  /**
   * Force sync all pending actions
   */
  async forceSyncAll(): Promise<void> {
    try {
      await backgroundSyncManager.forceSyncAll();
    } catch (error) {
      console.error('Failed to force sync all:', error);
      throw error;
    }
  }

  /**
   * Get integration status
   */
  async getStatus(): Promise<{
    isInitialized: boolean;
    queueStatus: any;
    syncStats: any;
    cacheStats: any;
  }> {
    const queue = getOfflineActionQueue();
    const [queueStatus, syncStats, cacheStats] = await Promise.all([
      queue ? queue.getOfflineStatus() : { isOnline: false, queueSize: 0 },
      backgroundSyncManager.getSyncStats(),
      serviceWorkerCacheService.getCacheStats()
    ]);

    return {
      isInitialized: this.isInitialized,
      queueStatus,
      syncStats,
      cacheStats
    };
  }

  /**
   * Clear all queued actions
   */
  async clearQueue(): Promise<void> {
    const queue = getOfflineActionQueue();
    if (queue) {
      await queue.clearQueue();
    }
  }

  /**
   * Stop background sync integration
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    this.isInitialized = false;
    console.log('Background Sync Integration stopped');
  }

  // Private helper methods

  private setupSyncHandlers(): void {
    // Register sync handlers for different action types
    backgroundSyncManager.registerSyncHandler('posts-sync', async () => {
      await this.processSyncByType('post');
    });

    backgroundSyncManager.registerSyncHandler('comments-sync', async () => {
      await this.processSyncByType('comment');
    });

    backgroundSyncManager.registerSyncHandler('reactions-sync', async () => {
      await this.processSyncByType('reaction');
    });

    backgroundSyncManager.registerSyncHandler('messages-sync', async () => {
      await this.processSyncByType('message');
    });

    backgroundSyncManager.registerSyncHandler('community-sync', async () => {
      await this.processSyncByType('community_join');
      await this.processSyncByType('community_post');
    });

    backgroundSyncManager.registerSyncHandler('offline-actions-sync', async () => {
      await backgroundSyncManager.processQueuedActions();
    });
  }

  private async processSyncByType(actionType: string): Promise<void> {
    try {
      const queue = getOfflineActionQueue();
      if (!queue) return;

      const actions = await queue.getActionsByType(actionType);
      
      for (const action of actions) {
        try {
          await this.processAction(action);
          await queue.markActionCompleted(action.id);
        } catch (error) {
          console.error(`Failed to process ${actionType} action:`, error);
          await queue.retryWithBackoff(action);
        }
      }
    } catch (error) {
      console.error(`Failed to process ${actionType} sync:`, error);
    }
  }

  private async processAction(action: OfflineAction): Promise<void> {
    // This delegates to the background sync manager's action processing
    // The actual implementation is in backgroundSyncManager.processAction
    const { type, data } = action;
    
    switch (type) {
      case 'post':
        await this.processPostAction(data);
        break;
      case 'comment':
        await this.processCommentAction(data);
        break;
      case 'reaction':
        await this.processReactionAction(data);
        break;
      case 'message':
        await this.processMessageAction(data);
        break;
      case 'community_join':
        await this.processCommunityJoinAction(data);
        break;
      case 'community_post':
        await this.processCommunityPostAction(data);
        break;
      default:
        throw new Error(`Unknown action type: ${type}`);
    }
  }

  private async processPostAction(data: any): Promise<void> {
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Post creation failed: ${response.statusText}`);
    }
    
    // Invalidate feed cache after successful post
    await serviceWorkerCacheService.invalidateByTag('feed');
  }

  private async processCommentAction(data: any): Promise<void> {
    const response = await fetch(`/api/posts/${data.postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Comment creation failed: ${response.statusText}`);
    }
    
    // Invalidate post-specific cache
    await serviceWorkerCacheService.invalidateByTag(`post-${data.postId}`);
  }

  private async processReactionAction(data: any): Promise<void> {
    const response = await fetch(`/api/posts/${data.postId}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Reaction failed: ${response.statusText}`);
    }
    
    // Invalidate post-specific cache
    await serviceWorkerCacheService.invalidateByTag(`post-${data.postId}`);
  }

  private async processMessageAction(data: any): Promise<void> {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Message sending failed: ${response.statusText}`);
    }
    
    // Invalidate conversation cache
    await serviceWorkerCacheService.invalidateByTag(`conversation-${data.conversationId}`);
  }

  private async processCommunityJoinAction(data: any): Promise<void> {
    const response = await fetch(`/api/communities/${data.communityId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Community join failed: ${response.statusText}`);
    }
    
    // Invalidate community cache
    await serviceWorkerCacheService.invalidateByTag(`community-${data.communityId}`);
  }

  private async processCommunityPostAction(data: any): Promise<void> {
    const response = await fetch(`/api/communities/${data.communityId}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Community post failed: ${response.statusText}`);
    }
    
    // Invalidate community cache
    await serviceWorkerCacheService.invalidateByTag(`community-${data.communityId}`);
  }

  private getAuthToken(): string {
    return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('auth_token') || '';
  }

  private startPeriodicSync(): void {
    this.syncInterval = setInterval(async () => {
      if (navigator.onLine && backgroundSyncManager.isNetworkSuitable()) {
        try {
          await backgroundSyncManager.processQueuedActions();
        } catch (error) {
          console.error('Periodic sync failed:', error);
        }
      }
    }, this.config.syncIntervalMs);
  }

  private setupNetworkEventListeners(): void {
    // Listen for online events to trigger sync
    window.addEventListener('online', async () => {
      console.log('Network came online, triggering sync');
      try {
        await this.triggerSync();
      } catch (error) {
        console.error('Failed to trigger sync on network online:', error);
      }
    });

    // Listen for queue status updates
    window.addEventListener('offlineQueueStatusUpdate', async (event: any) => {
      const queue = getOfflineActionQueue();
      if (!queue) return;
      
      const queueStatus = await queue.getOfflineStatus();
      
      // Trigger sync if queue is getting large
      if (queueStatus.queueSize > this.config.maxQueueSize * 0.8) {
        console.log('Queue size threshold reached, triggering sync');
        await this.triggerSync();
      }
    });
  }
}

// Export singleton instance
export const backgroundSyncIntegration = new BackgroundSyncIntegration();