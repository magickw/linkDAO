/**
 * Community Real-Time Update Service
 * Handles live content updates without disrupting user experience
 * Requirements: 8.1, 8.5, 8.7
 */

import { communityWebSocketService } from './communityWebSocketService';
import { realTimeNotificationService } from './realTimeNotificationService';
import { 
  EnhancedPost, 
  GovernanceProposal, 
  WalletActivity,
  ActivityEvent,
  LiveUpdateIndicator,
  ConnectionStatus
} from '../types/communityEnhancements';

// Live update types
export interface LiveContentUpdate {
  type: 'post_created' | 'post_updated' | 'comment_added' | 'reaction_added' | 'tip_received';
  postId?: string;
  communityId?: string;
  data: any;
  timestamp: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface ContentUpdateIndicator {
  id: string;
  type: 'new_posts' | 'new_comments' | 'new_reactions' | 'live_discussion';
  count: number;
  lastUpdate: Date;
  contextId: string;
  visible: boolean;
  dismissed: boolean;
}

export interface OfflineUpdateQueue {
  updates: LiveContentUpdate[];
  indicators: ContentUpdateIndicator[];
  lastSync: Date;
}

// Connection state management
interface RealTimeConnectionState {
  isConnected: boolean;
  isOnline: boolean;
  reconnectAttempts: number;
  lastHeartbeat: Date | null;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
}

/**
 * Community Real-Time Update Service
 */
export class CommunityRealTimeUpdateService {
  private updateQueue: LiveContentUpdate[] = [];
  private indicators: Map<string, ContentUpdateIndicator> = new Map();
  private offlineQueue: OfflineUpdateQueue = {
    updates: [],
    indicators: [],
    lastSync: new Date()
  };
  
  private connectionState: RealTimeConnectionState = {
    isConnected: false,
    isOnline: navigator.onLine,
    reconnectAttempts: 0,
    lastHeartbeat: null,
    connectionQuality: 'offline'
  };

  private listeners = new Map<string, Set<Function>>();
  private updateBatchTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionCheckInterval: NodeJS.Timeout | null = null;

  private readonly BATCH_DELAY = 2000; // 2 seconds
  private readonly MAX_BATCH_SIZE = 10;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly CONNECTION_CHECK_INTERVAL = 5000; // 5 seconds

  constructor() {
    this.initializeEventListeners();
    this.startHeartbeat();
    this.startConnectionMonitoring();
    this.loadOfflineQueue();
  }

  /**
   * Initialize WebSocket and network event listeners
   */
  private initializeEventListeners(): void {
    // WebSocket connection events
    communityWebSocketService.on('connection:established', () => {
      this.connectionState.isConnected = true;
      this.connectionState.reconnectAttempts = 0;
      this.updateConnectionQuality();
      this.syncOfflineUpdates();
      this.emit('connection:status_changed', this.getConnectionStatus());
    });

    communityWebSocketService.on('connection:lost', () => {
      this.connectionState.isConnected = false;
      this.updateConnectionQuality();
      this.emit('connection:status_changed', this.getConnectionStatus());
    });

    communityWebSocketService.on('connection:error', () => {
      this.connectionState.reconnectAttempts++;
      this.updateConnectionQuality();
      this.emit('connection:status_changed', this.getConnectionStatus());
    });

    // Content update events
    communityWebSocketService.on('post:created', (data: any) => {
      this.handleLiveUpdate({
        type: 'post_created',
        postId: data.post.id,
        communityId: data.communityId,
        data: data.post,
        timestamp: new Date(),
        priority: 'normal'
      });
    });

    communityWebSocketService.on('post:updated', (data: any) => {
      this.handleLiveUpdate({
        type: 'post_updated',
        postId: data.postId,
        communityId: data.communityId,
        data: data.updates,
        timestamp: new Date(),
        priority: 'low'
      });
    });

    communityWebSocketService.on('live:comment_added', (data: any) => {
      this.handleLiveUpdate({
        type: 'comment_added',
        postId: data.postId,
        data: data.comment,
        timestamp: new Date(),
        priority: 'normal'
      });
    });

    communityWebSocketService.on('live:reaction_added', (data: any) => {
      this.handleLiveUpdate({
        type: 'reaction_added',
        postId: data.postId,
        data: data.reaction,
        timestamp: new Date(),
        priority: 'low'
      });
    });

    communityWebSocketService.on('post:tip', (data: any) => {
      this.handleLiveUpdate({
        type: 'tip_received',
        postId: data.postId,
        communityId: data.communityId,
        data: data.tip,
        timestamp: new Date(),
        priority: 'high'
      });
    });

    // Network status events
    window.addEventListener('online', () => {
      this.connectionState.isOnline = true;
      this.updateConnectionQuality();
      this.syncOfflineUpdates();
      this.emit('connection:online');
    });

    window.addEventListener('offline', () => {
      this.connectionState.isOnline = false;
      this.updateConnectionQuality();
      this.emit('connection:offline');
    });

    // Page visibility events
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.syncOfflineUpdates();
        this.emit('page:visible');
      }
    });
  }

  /**
   * Handle incoming live updates
   */
  private handleLiveUpdate(update: LiveContentUpdate): void {
    if (!this.connectionState.isOnline) {
      this.queueOfflineUpdate(update);
      return;
    }

    // Add to update queue
    this.updateQueue.push(update);

    // Create or update indicator
    this.updateIndicator(update);

    // Process immediately for urgent updates
    if (update.priority === 'urgent') {
      this.processUpdateBatch();
    } else {
      this.scheduleBatchProcessing();
    }
  }

  /**
   * Update content indicators
   */
  private updateIndicator(update: LiveContentUpdate): void {
    const contextId = update.postId || update.communityId || 'global';
    const indicatorId = `${update.type}_${contextId}`;
    
    const existing = this.indicators.get(indicatorId);
    
    if (existing) {
      existing.count++;
      existing.lastUpdate = update.timestamp;
    } else {
      const indicator: ContentUpdateIndicator = {
        id: indicatorId,
        type: this.mapUpdateTypeToIndicatorType(update.type),
        count: 1,
        lastUpdate: update.timestamp,
        contextId,
        visible: true,
        dismissed: false
      };
      
      this.indicators.set(indicatorId, indicator);
    }

    this.emit('indicator:updated', this.indicators.get(indicatorId));
  }

  /**
   * Map update types to indicator types
   */
  private mapUpdateTypeToIndicatorType(updateType: string): 'new_posts' | 'new_comments' | 'new_reactions' | 'live_discussion' {
    switch (updateType) {
      case 'post_created':
        return 'new_posts';
      case 'comment_added':
        return 'new_comments';
      case 'reaction_added':
      case 'tip_received':
        return 'new_reactions';
      default:
        return 'live_discussion';
    }
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatchProcessing(): void {
    if (this.updateBatchTimeout) {
      return; // Already scheduled
    }

    // Process batch if it reaches max size
    if (this.updateQueue.length >= this.MAX_BATCH_SIZE) {
      this.processUpdateBatch();
      return;
    }

    // Schedule batch processing
    this.updateBatchTimeout = setTimeout(() => {
      this.processUpdateBatch();
    }, this.BATCH_DELAY);
  }

  /**
   * Process batched updates
   */
  private processUpdateBatch(): void {
    if (this.updateQueue.length === 0) return;

    const batch = [...this.updateQueue];
    this.updateQueue = [];

    if (this.updateBatchTimeout) {
      clearTimeout(this.updateBatchTimeout);
      this.updateBatchTimeout = null;
    }

    // Group updates by type and context
    const groupedUpdates = this.groupUpdatesByContext(batch);

    // Emit batch update
    this.emit('updates:batch', {
      updates: groupedUpdates,
      timestamp: new Date(),
      count: batch.length
    });

    // Emit individual updates
    batch.forEach(update => {
      this.emit('update:received', update);
      this.emit(`update:${update.type}`, update);
    });
  }

  /**
   * Group updates by context for better UX
   */
  private groupUpdatesByContext(updates: LiveContentUpdate[]): Record<string, LiveContentUpdate[]> {
    return updates.reduce((groups, update) => {
      const context = update.postId || update.communityId || 'global';
      if (!groups[context]) {
        groups[context] = [];
      }
      groups[context].push(update);
      return groups;
    }, {} as Record<string, LiveContentUpdate[]>);
  }

  /**
   * Queue updates for offline scenarios
   */
  private queueOfflineUpdate(update: LiveContentUpdate): void {
    this.offlineQueue.updates.push(update);
    
    // Limit offline queue size
    if (this.offlineQueue.updates.length > 100) {
      this.offlineQueue.updates.shift();
    }

    this.saveOfflineQueue();
    this.emit('offline:update_queued', update);
  }

  /**
   * Sync offline updates when connection is restored
   */
  private syncOfflineUpdates(): void {
    if (this.offlineQueue.updates.length === 0) {
      return;
    }

    const updates = [...this.offlineQueue.updates];
    this.offlineQueue.updates = [];
    this.offlineQueue.lastSync = new Date();

    // Process offline updates
    updates.forEach(update => {
      this.handleLiveUpdate(update);
    });

    this.saveOfflineQueue();
    this.emit('offline:sync_completed', { count: updates.length });
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.connectionState.isConnected) {
        this.connectionState.lastHeartbeat = new Date();
        communityWebSocketService.sendAction('heartbeat', { timestamp: Date.now() });
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Start connection quality monitoring
   */
  private startConnectionMonitoring(): void {
    this.connectionCheckInterval = setInterval(() => {
      this.updateConnectionQuality();
    }, this.CONNECTION_CHECK_INTERVAL);
  }

  /**
   * Update connection quality assessment
   */
  private updateConnectionQuality(): void {
    if (!this.connectionState.isOnline) {
      this.connectionState.connectionQuality = 'offline';
      return;
    }

    if (!this.connectionState.isConnected) {
      this.connectionState.connectionQuality = 'poor';
      return;
    }

    const now = Date.now();
    const lastHeartbeat = this.connectionState.lastHeartbeat?.getTime() || 0;
    const timeSinceHeartbeat = now - lastHeartbeat;

    if (timeSinceHeartbeat < this.HEARTBEAT_INTERVAL * 1.5) {
      this.connectionState.connectionQuality = 'excellent';
    } else if (timeSinceHeartbeat < this.HEARTBEAT_INTERVAL * 2) {
      this.connectionState.connectionQuality = 'good';
    } else {
      this.connectionState.connectionQuality = 'poor';
    }
  }

  /**
   * Save offline queue to localStorage
   */
  private saveOfflineQueue(): void {
    try {
      localStorage.setItem('community_offline_queue', JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.warn('Could not save offline queue:', error);
    }
  }

  /**
   * Load offline queue from localStorage
   */
  private loadOfflineQueue(): void {
    try {
      const stored = localStorage.getItem('community_offline_queue');
      if (stored) {
        this.offlineQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Could not load offline queue:', error);
    }
  }

  /**
   * Public API Methods
   */

  /**
   * Subscribe to live updates for a specific context
   */
  subscribeToContext(contextId: string, contextType: 'post' | 'community' | 'user'): void {
    switch (contextType) {
      case 'post':
        communityWebSocketService.subscribeToPost(contextId);
        break;
      case 'community':
        communityWebSocketService.subscribeToCommunity(contextId);
        break;
      case 'user':
        communityWebSocketService.subscribeToWalletActivity(contextId);
        break;
    }
  }

  /**
   * Unsubscribe from live updates
   */
  unsubscribeFromContext(contextId: string, contextType: 'post' | 'community' | 'user'): void {
    switch (contextType) {
      case 'post':
        communityWebSocketService.unsubscribeFromPost(contextId);
        break;
      case 'community':
        communityWebSocketService.unsubscribeFromCommunity(contextId);
        break;
    }
  }

  /**
   * Dismiss an indicator
   */
  dismissIndicator(indicatorId: string): void {
    const indicator = this.indicators.get(indicatorId);
    if (indicator) {
      indicator.dismissed = true;
      indicator.visible = false;
      this.emit('indicator:dismissed', indicator);
    }
  }

  /**
   * Clear all indicators for a context
   */
  clearIndicators(contextId?: string): void {
    if (contextId) {
      for (const [id, indicator] of this.indicators.entries()) {
        if (indicator.contextId === contextId) {
          this.indicators.delete(id);
        }
      }
    } else {
      this.indicators.clear();
    }
    
    this.emit('indicators:cleared', contextId);
  }

  /**
   * Get current indicators
   */
  getIndicators(contextId?: string): ContentUpdateIndicator[] {
    const indicators = Array.from(this.indicators.values());
    
    if (contextId) {
      return indicators.filter(indicator => 
        indicator.contextId === contextId && indicator.visible && !indicator.dismissed
      );
    }
    
    return indicators.filter(indicator => indicator.visible && !indicator.dismissed);
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return {
      isConnected: this.connectionState.isConnected,
      isOnline: this.connectionState.isOnline,
      quality: this.connectionState.connectionQuality,
      reconnectAttempts: this.connectionState.reconnectAttempts,
      lastHeartbeat: this.connectionState.lastHeartbeat,
      queuedUpdates: this.offlineQueue.updates.length
    };
  }

  /**
   * Force sync offline updates
   */
  forceSyncOfflineUpdates(): void {
    this.syncOfflineUpdates();
  }

  /**
   * Clear offline queue
   */
  clearOfflineQueue(): void {
    this.offlineQueue.updates = [];
    this.offlineQueue.indicators = [];
    this.saveOfflineQueue();
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
          console.error(`Error in real-time update listener for event ${event}:`, error);
        }
      });
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.updateBatchTimeout) {
      clearTimeout(this.updateBatchTimeout);
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
    
    this.listeners.clear();
    this.indicators.clear();
    this.updateQueue = [];
  }
}

// Export singleton instance
export const communityRealTimeUpdateService = new CommunityRealTimeUpdateService();
export default communityRealTimeUpdateService;