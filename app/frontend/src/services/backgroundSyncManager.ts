/**
 * Background Sync Manager
 * Handles background sync events and network condition awareness
 */

import { OfflineAction, getOfflineActionQueue } from './offlineActionQueue';

export interface SyncEventHandler {
  tag: string;
  handler: (event: any) => Promise<void>;
}

export interface NetworkCondition {
  online: boolean;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export interface SyncConfig {
  maxSyncAttempts: number;
  syncTimeoutMs: number;
  batchSize: number;
  networkAwareSync: boolean;
  minConnectionQuality: 'slow-2g' | '2g' | '3g' | '4g';
}

export class BackgroundSyncManager {
  private syncHandlers: Map<string, SyncEventHandler> = new Map();
  private isOnline: boolean = navigator.onLine;
  private networkCondition: NetworkCondition | null = null;
  private syncInProgress: boolean = false;
  
  private readonly DEFAULT_CONFIG: SyncConfig = {
    maxSyncAttempts: 3,
    syncTimeoutMs: 30000, // 30 seconds
    batchSize: 10,
    networkAwareSync: true,
    minConnectionQuality: '2g'
  };

  private config: SyncConfig;

  constructor(config?: Partial<SyncConfig>) {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
    this.initialize();
  }

  /**
   * Initialize background sync manager
   */
  private async initialize(): Promise<void> {
    // Set up network condition monitoring
    this.setupNetworkMonitoring();
    
    // Register default sync handlers
    this.registerDefaultSyncHandlers();
    
    // Set up service worker message handling
    this.setupServiceWorkerMessaging();
    
    console.log('Background Sync Manager initialized');
  }

  /**
   * Register background sync events for different action types
   */
  async registerSync(tag: string, options?: { minDelay?: number }): Promise<void> {
    if (!('serviceWorker' in navigator) || !('sync' in ServiceWorkerRegistration.prototype)) {
      console.warn('Background Sync not supported, falling back to immediate sync');
      await this.fallbackSync(tag);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Register background sync with service worker
      // @ts-ignore: Background Sync API types not fully available
      await registration.sync.register(tag);
      
      console.log(`Background sync registered for tag: ${tag}`);
    } catch (error) {
      console.error('Failed to register background sync:', error);
      await this.fallbackSync(tag);
    }
  }

  /**
   * Register sync event handler
   */
  registerSyncHandler(tag: string, handler: (event: any) => Promise<void>): void {
    this.syncHandlers.set(tag, { tag, handler });
    console.log(`Sync handler registered for tag: ${tag}`);
  }

  /**
   * Handle sync event from service worker
   */
  async handleSyncEvent(event: any): Promise<void> {
    const { tag } = event;
    console.log(`Handling sync event for tag: ${tag}`);
    
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping');
      return;
    }

    // Check network conditions before syncing
    if (this.config.networkAwareSync && !this.isNetworkSuitable()) {
      console.log('Network conditions not suitable for sync, postponing');
      return;
    }

    this.syncInProgress = true;
    
    try {
      const handler = this.syncHandlers.get(tag);
      if (handler) {
        await Promise.race([
          handler.handler(event),
          this.createSyncTimeout()
        ]);
      } else {
        // Default sync handling
        await this.handleDefaultSync(tag);
      }
    } catch (error) {
      console.error(`Sync failed for tag ${tag}:`, error);
      throw error; // Re-throw to trigger retry
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Process queued actions with network condition awareness
   */
  async processQueuedActions(tag?: string): Promise<void> {
    if (!this.isOnline) {
      console.log('Offline, skipping queue processing');
      return;
    }

    // Check network quality for sync timing optimization
    const shouldDelay = this.shouldDelaySync();
    if (shouldDelay) {
      console.log('Poor network conditions, delaying sync');
      setTimeout(() => this.processQueuedActions(tag), 5000);
      return;
    }

    try {
      const queue = getOfflineActionQueue();
      if (!queue) return;
      
      const actions = await queue.getReadyActions();
      const filteredActions = tag ? 
        actions.filter(action => action.tags.includes(tag)) : 
        actions;

      if (filteredActions.length === 0) {
        console.log('No actions to process');
        return;
      }

      console.log(`Processing ${filteredActions.length} queued actions`);
      
      // Process actions in batches
      const batches = this.createBatches(filteredActions, this.config.batchSize);
      
      for (const batch of batches) {
        await this.processBatch(batch);
        
        // Small delay between batches to avoid overwhelming the server
        if (batches.length > 1) {
          await this.delay(100);
        }
      }
      
    } catch (error) {
      console.error('Failed to process queued actions:', error);
      throw error;
    }
  }

  /**
   * Create fallback mechanisms for browsers without background sync support
   */
  private async fallbackSync(tag: string): Promise<void> {
    console.log(`Using fallback sync for tag: ${tag}`);
    
    // Use setTimeout as fallback
    setTimeout(async () => {
      if (this.isOnline) {
        try {
          await this.processQueuedActions(tag);
        } catch (error) {
          console.error('Fallback sync failed:', error);
          // Retry with exponential backoff
          setTimeout(() => this.fallbackSync(tag), 5000);
        }
      } else {
        // Retry when online
        const onlineHandler = () => {
          window.removeEventListener('online', onlineHandler);
          this.fallbackSync(tag);
        };
        window.addEventListener('online', onlineHandler);
      }
    }, 1000);
  }

  /**
   * Get current network condition
   */
  getNetworkCondition(): NetworkCondition | null {
    return this.networkCondition;
  }

  /**
   * Check if network is suitable for sync operations
   */
  isNetworkSuitable(): boolean {
    if (!this.isOnline) return false;
    
    if (!this.config.networkAwareSync) return true;
    
    if (!this.networkCondition) return true; // Assume good if unknown
    
    // Check connection quality
    const qualityOrder = ['slow-2g', '2g', '3g', '4g'];
    const currentQualityIndex = qualityOrder.indexOf(this.networkCondition.effectiveType);
    const minQualityIndex = qualityOrder.indexOf(this.config.minConnectionQuality);
    
    if (currentQualityIndex < minQualityIndex) {
      return false;
    }
    
    // Check if user has data saver enabled
    if (this.networkCondition.saveData) {
      return false;
    }
    
    return true;
  }

  /**
   * Force sync all pending actions
   */
  async forceSyncAll(): Promise<void> {
    console.log('Force syncing all pending actions');
    
    try {
      await this.processQueuedActions();
    } catch (error) {
      console.error('Force sync failed:', error);
      throw error;
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    isOnline: boolean;
    networkCondition: NetworkCondition | null;
    syncInProgress: boolean;
    registeredHandlers: string[];
    queueStatus: any;
  }> {
    const queue = getOfflineActionQueue();
    const queueStatus = queue ? await queue.getOfflineStatus() : { isOnline: false, queueSize: 0 };
    
    return {
      isOnline: this.isOnline,
      networkCondition: this.networkCondition,
      syncInProgress: this.syncInProgress,
      registeredHandlers: Array.from(this.syncHandlers.keys()),
      queueStatus
    };
  }

  // Private helper methods

  private setupNetworkMonitoring(): void {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('Network came online, triggering sync');
      this.processQueuedActions().catch(console.error);
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('Network went offline');
    });

    // Monitor network quality if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateNetworkCondition = () => {
        this.networkCondition = {
          online: this.isOnline,
          effectiveType: connection.effectiveType || '4g',
          downlink: connection.downlink || 10,
          rtt: connection.rtt || 100,
          saveData: connection.saveData || false
        };
      };
      
      updateNetworkCondition();
      if (connection.addEventListener) {
        connection.addEventListener('change', updateNetworkCondition);
      }
    }
  }

  private registerDefaultSyncHandlers(): void {
    // Register handlers for different action types
    this.registerSyncHandler('posts-sync', async (event) => {
      await this.processQueuedActions('posts');
    });
    
    this.registerSyncHandler('comments-sync', async (event) => {
      await this.processQueuedActions('comments');
    });
    
    this.registerSyncHandler('reactions-sync', async (event) => {
      await this.processQueuedActions('reactions');
    });
    
    this.registerSyncHandler('messages-sync', async (event) => {
      await this.processQueuedActions('messages');
    });
    
    this.registerSyncHandler('community-sync', async (event) => {
      await this.processQueuedActions('community');
    });
    
    // Generic sync handler
    this.registerSyncHandler('offline-actions-sync', async (event) => {
      await this.processQueuedActions();
    });
  }

  private setupServiceWorkerMessaging(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, data } = event.data || {};
        
        switch (type) {
          case 'SYNC_EVENT':
            this.handleSyncEvent(data).catch(console.error);
            break;
          case 'NETWORK_STATUS_CHANGE':
            this.isOnline = data.online;
            break;
        }
      });
    }
  }

  private async handleDefaultSync(tag: string): Promise<void> {
    // Extract action type from tag
    const actionType = tag.replace('-sync', '');
    await this.processQueuedActions(actionType);
  }

  private shouldDelaySync(): boolean {
    if (!this.networkCondition) return false;
    
    // Delay sync on very slow connections
    if (this.networkCondition.effectiveType === 'slow-2g') {
      return true;
    }
    
    // Delay sync if RTT is very high (poor connection)
    if (this.networkCondition.rtt > 2000) {
      return true;
    }
    
    // Delay sync if downlink is very low
    if (this.networkCondition.downlink < 0.5) {
      return true;
    }
    
    return false;
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async processBatch(actions: OfflineAction[]): Promise<void> {
    const promises = actions.map(async (action) => {
      try {
        await this.processAction(action);
        const queue = getOfflineActionQueue();
        if (queue) {
          await queue.markActionCompleted(action.id);
        }
        console.log(`Action ${action.id} completed successfully`);
      } catch (error) {
        console.error(`Action ${action.id} failed:`, error);
        const queue = getOfflineActionQueue();
        if (queue) {
          await queue.retryWithBackoff(action);
        }
      }
    });
    
    await Promise.allSettled(promises);
  }

  private async processAction(action: OfflineAction): Promise<void> {
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
  }

  private getAuthToken(): string {
    // Get auth token from localStorage or other secure storage
    return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('auth_token') || '';
  }

  private createSyncTimeout(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Sync timeout'));
      }, this.config.syncTimeoutMs);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const backgroundSyncManager = new BackgroundSyncManager();