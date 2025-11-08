/**
 * Community-Specific WebSocket Service
 * Extends existing WebSocket service for community enhancements
 */

import { WebSocketService, webSocketService } from './webSocketService';
import { EventEmitter } from 'events';
import { cacheInvalidationService } from './communityCache';
import { 
  EnhancedPost, 
  GovernanceProposal, 
  WalletActivity,
  ActivityEvent 
} from '../types/communityEnhancements';

// Type assertion to ensure proper typing
const webSocketServiceTyped = webSocketService as any;

// Real-time event types
export interface CommunityRealTimeEvents {
  // Community updates
  'community:updated': { communityId: string; data: any };
  'community:member_joined': { communityId: string; userId: string; memberCount: number };
  'community:member_left': { communityId: string; userId: string; memberCount: number };
  
  // Post updates
  'post:created': { communityId: string; post: EnhancedPost };
  'post:updated': { communityId: string; postId: string; updates: Partial<EnhancedPost> };
  'post:deleted': { communityId: string; postId: string };
  'post:reaction': { communityId: string; postId: string; reaction: any };
  'post:tip': { communityId: string; postId: string; tip: any };
  
  // Governance updates
  'governance:proposal_created': { communityId: string; proposal: GovernanceProposal };
  'governance:proposal_updated': { communityId: string; proposalId: string; updates: any };
  'governance:vote_cast': { communityId: string; proposalId: string; vote: any };
  'governance:proposal_ended': { communityId: string; proposalId: string; result: any };
  
  // Activity updates
  'activity:new': { userId: string; activity: WalletActivity };
  'activity:tip_received': { userId: string; tip: any };
  'activity:badge_earned': { userId: string; badge: any };
  
  // Live updates
  'live:viewers_count': { postId: string; count: number };
  'live:comment_added': { postId: string; comment: any };
  'live:reaction_added': { postId: string; reaction: any };
}

// Message queue for offline scenarios
interface QueuedMessage {
  id: string;
  event: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

// Connection state
interface ConnectionState {
  isConnected: boolean;
  reconnectAttempts: number;
  lastConnected: number | null;
  subscribedCommunities: Set<string>;
  subscribedPosts: Set<string>;
}

/**
 * Enhanced Community WebSocket Service
 */
export class CommunityWebSocketService extends EventEmitter {
  private messageQueue: QueuedMessage[] = [];
  private connectionState: ConnectionState = {
    isConnected: false,
    reconnectAttempts: 0,
    lastConnected: null,
    subscribedCommunities: new Set(),
    subscribedPosts: new Set()
  };
  
  private eventListeners = new Map<string, Set<Function>>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private queueProcessInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.initializeWebSocketListeners();
    this.startHeartbeat();
    this.startQueueProcessor();
  }

  /**
   * Initialize WebSocket event listeners
   */
  private initializeWebSocketListeners(): void {
    // Connection events
    webSocketServiceTyped.on('connected', () => {
      this.connectionState.isConnected = true;
      this.connectionState.lastConnected = Date.now();
      this.connectionState.reconnectAttempts = 0;
      
      // Resubscribe to communities and posts
      this.resubscribeAll();
      
      // Process queued messages
      this.processMessageQueue();
      
      this.emit('connection:established');
    });

    webSocketServiceTyped.on('disconnected', () => {
      this.connectionState.isConnected = false;
      this.emit('connection:lost');
    });

    webSocketServiceTyped.on('error', (error: string) => {
      this.connectionState.reconnectAttempts++;
      this.emit('connection:error', error);
    });

    // Community-specific events
    this.setupCommunityEventListeners();
  }

  /**
   * Setup community-specific event listeners
   */
  private setupCommunityEventListeners(): void {
    // Community updates
    webSocketServiceTyped.on('community:updated', (data: any) => {
      cacheInvalidationService.handleRealTimeUpdate({
        type: 'community_updated',
        data: { communityId: data.communityId }
      });
      this.emit('community:updated', data);
    });

    webSocketServiceTyped.on('community:member_joined', (data: any) => {
      this.emit('community:member_joined', data);
    });

    webSocketServiceTyped.on('community:member_left', (data: any) => {
      this.emit('community:member_left', data);
    });

    // Post updates
    webSocketServiceTyped.on('post:created', (data: any) => {
      this.emit('post:created', data);
    });

    webSocketServiceTyped.on('post:updated', (data: any) => {
      this.emit('post:updated', data);
    });

    webSocketServiceTyped.on('post:reaction', (data: any) => {
      this.emit('post:reaction', data);
    });

    webSocketServiceTyped.on('post:tip', (data: any) => {
      this.emit('post:tip', data);
    });

    // Governance updates
    webSocketServiceTyped.on('governance:proposal_created', (data: any) => {
      this.emit('governance:proposal_created', data);
    });

    webSocketServiceTyped.on('governance:proposal_updated', (data: any) => {
      cacheInvalidationService.handleRealTimeUpdate({
        type: 'proposal_updated',
        data: { url: data.proposalUrl }
      });
      this.emit('governance:proposal_updated', data);
    });

    webSocketServiceTyped.on('governance:vote_cast', (data: any) => {
      this.emit('governance:vote_cast', data);
    });

    // Activity updates
    webSocketServiceTyped.on('activity:new', (data: any) => {
      this.emit('activity:new', data);
    });

    webSocketServiceTyped.on('activity:tip_received', (data: any) => {
      this.emit('activity:tip_received', data);
    });

    webSocketServiceTyped.on('activity:badge_earned', (data: any) => {
      this.emit('activity:badge_earned', data);
    });

    // Live updates
    webSocketServiceTyped.on('live:viewers_count', (data: any) => {
      this.emit('live:viewers_count', data);
    });

    webSocketServiceTyped.on('live:comment_added', (data: any) => {
      this.emit('live:comment_added', data);
    });
  }

  /**
   * Connect to WebSocket service
   */
  connect(): void {
    webSocketServiceTyped.connect();
  }

  /**
   * Disconnect from WebSocket service
   */
  disconnect(): void {
    this.connectionState.subscribedCommunities.clear();
    this.connectionState.subscribedPosts.clear();

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.queueProcessInterval) {
      clearInterval(this.queueProcessInterval);
    }

    webSocketServiceTyped.disconnect();
  }

  /**
   * Subscribe to community updates
   */
  subscribeToCommunity(communityId: string): void {
    if (this.connectionState.subscribedCommunities.has(communityId)) {
      return;
    }

    const message = {
      event: 'subscribe:community',
      data: { communityId }
    };

    if (this.connectionState.isConnected) {
      webSocketServiceTyped.send(message.event, message.data);
      this.connectionState.subscribedCommunities.add(communityId);
    } else {
      this.queueMessage(message.event, message.data);
    }
  }

  /**
   * Unsubscribe from community updates
   */
  unsubscribeFromCommunity(communityId: string): void {
    if (!this.connectionState.subscribedCommunities.has(communityId)) {
      return;
    }

    const message = {
      event: 'unsubscribe:community',
      data: { communityId }
    };

    if (this.connectionState.isConnected) {
      webSocketServiceTyped.send(message.event, message.data);
    }

    this.connectionState.subscribedCommunities.delete(communityId);
  }

  /**
   * Subscribe to post live updates
   */
  subscribeToPost(postId: string): void {
    if (this.connectionState.subscribedPosts.has(postId)) {
      return;
    }

    const message = {
      event: 'subscribe:post',
      data: { postId }
    };

    if (this.connectionState.isConnected) {
      webSocketServiceTyped.send(message.event, message.data);
      this.connectionState.subscribedPosts.add(postId);
    } else {
      this.queueMessage(message.event, message.data);
    }
  }

  /**
   * Unsubscribe from post live updates
   */
  unsubscribeFromPost(postId: string): void {
    if (!this.connectionState.subscribedPosts.has(postId)) {
      return;
    }

    const message = {
      event: 'unsubscribe:post',
      data: { postId }
    };

    if (this.connectionState.isConnected) {
      webSocketServiceTyped.send(message.event, message.data);
    }

    this.connectionState.subscribedPosts.delete(postId);
  }

  /**
   * Subscribe to governance updates for a community
   */
  subscribeToGovernance(communityId: string): void {
    const message = {
      event: 'subscribe:governance',
      data: { communityId }
    };

    if (this.connectionState.isConnected) {
      webSocketServiceTyped.send(message.event, message.data);
    } else {
      this.queueMessage(message.event, message.data);
    }
  }

  /**
   * Subscribe to wallet activity updates
   */
  subscribeToWalletActivity(userId: string): void {
    const message = {
      event: 'subscribe:activity',
      data: { userId }
    };

    if (this.connectionState.isConnected) {
      webSocketServiceTyped.send(message.event, message.data);
    } else {
      this.queueMessage(message.event, message.data);
    }
  }

  /**
   * Send real-time action (vote, tip, reaction)
   */
  sendAction(action: string, data: any): void {
    const message = {
      event: `action:${action}`,
      data
    };

    if (this.connectionState.isConnected) {
      webSocketServiceTyped.send(message.event, message.data);
    } else {
      this.queueMessage(message.event, message.data);
    }
  }



  /**
   * Queue message for offline scenarios
   */
  private queueMessage(event: string, data: any): void {
    const message: QueuedMessage = {
      id: `${Date.now()}-${Math.random()}`,
      event,
      data,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.messageQueue.push(message);

    // Limit queue size
    if (this.messageQueue.length > 100) {
      this.messageQueue.shift();
    }
  }

  /**
   * Process queued messages when connection is restored
   */
  private processMessageQueue(): void {
    if (!this.connectionState.isConnected || this.messageQueue.length === 0) {
      return;
    }

    const messagesToProcess = [...this.messageQueue];
    this.messageQueue = [];

    messagesToProcess.forEach(message => {
      try {
        webSocketServiceTyped.send(message.event, message.data);
      } catch (error) {
        console.error('Error processing queued message:', error);
        
        // Re-queue if retry count is low
        if (message.retryCount < 3) {
          message.retryCount++;
          this.messageQueue.push(message);
        }
      }
    });
  }

  /**
   * Resubscribe to all communities and posts after reconnection
   */
  private resubscribeAll(): void {
    // Resubscribe to communities
    this.connectionState.subscribedCommunities.forEach(communityId => {
      webSocketServiceTyped.send('subscribe:community', { communityId });
    });

    // Resubscribe to posts
    this.connectionState.subscribedPosts.forEach(postId => {
      webSocketServiceTyped.send('subscribe:post', { postId });
    });
  }

  /**
   * Start heartbeat to maintain connection
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.connectionState.isConnected) {
        webSocketServiceTyped.send('ping', { timestamp: Date.now() });
      }
    }, 30000); // Send ping every 30 seconds
  }

  /**
   * Start queue processor for offline messages
   */
  private startQueueProcessor(): void {
    this.queueProcessInterval = setInterval(() => {
      if (this.connectionState.isConnected && this.messageQueue.length > 0) {
        this.processMessageQueue();
      }
    }, 5000); // Process queue every 5 seconds
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    isConnected: boolean;
    reconnectAttempts: number;
    lastConnected: number | null;
    queuedMessages: number;
    subscribedCommunities: number;
    subscribedPosts: number;
  } {
    return {
      isConnected: this.connectionState.isConnected,
      reconnectAttempts: this.connectionState.reconnectAttempts,
      lastConnected: this.connectionState.lastConnected,
      queuedMessages: this.messageQueue.length,
      subscribedCommunities: this.connectionState.subscribedCommunities.size,
      subscribedPosts: this.connectionState.subscribedPosts.size
    };
  }

  /**
   * Clear message queue (useful for cleanup)
   */
  clearMessageQueue(): void {
    this.messageQueue = [];
  }
}

// Export singleton instance
export const communityWebSocketService = new CommunityWebSocketService();