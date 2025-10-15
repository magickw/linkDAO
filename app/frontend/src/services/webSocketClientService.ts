import { io, Socket } from 'socket.io-client';

interface WebSocketClientConfig {
  url: string;
  walletAddress: string;
  autoReconnect: boolean;
  reconnectAttempts: number;
  reconnectDelay: number;
}

interface Subscription {
  id: string;
  type: 'feed' | 'community' | 'conversation' | 'user' | 'global';
  target: string;
  filters?: {
    eventTypes?: string[];
    priority?: ('low' | 'medium' | 'high' | 'urgent')[];
  };
}

interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  lastConnected?: Date;
  reconnectAttempts: number;
  error?: string;
}

interface QueuedMessage {
  event: string;
  data: any;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export class WebSocketClientService {
  private socket: Socket | null = null;
  private config: WebSocketClientConfig;
  private connectionState: ConnectionState = {
    status: 'disconnected',
    reconnectAttempts: 0
  };
  private subscriptions: Map<string, Subscription> = new Map();
  private messageQueue: QueuedMessage[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private isReconnecting = false;

  constructor(config: WebSocketClientConfig) {
    this.config = config;
    this.setupEventListeners();
  }

  // Connection Management
  async connect(): Promise<void> {
    if (this.socket?.connected) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.connectionState.status = 'connecting';
        this.emit('connection_state_changed', this.connectionState);

        this.socket = io(this.config.url, {
          transports: ['websocket', 'polling'],
          timeout: 20000,
          reconnection: false, // We handle reconnection manually
          forceNew: true
        });

        this.setupSocketEventHandlers();

        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          this.connectionState = {
            status: 'connected',
            lastConnected: new Date(),
            reconnectAttempts: 0
          };
          this.emit('connection_state_changed', this.connectionState);
          
          // Authenticate
          this.authenticate();
          
          // Start heartbeat
          this.startHeartbeat();
          
          // Process queued messages
          this.processMessageQueue();
          
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          this.connectionState = {
            status: 'error',
            reconnectAttempts: this.connectionState.reconnectAttempts,
            error: error.message
          };
          this.emit('connection_state_changed', this.connectionState);
          reject(error);
        });

      } catch (error) {
        this.connectionState = {
          status: 'error',
          reconnectAttempts: this.connectionState.reconnectAttempts,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        this.emit('connection_state_changed', this.connectionState);
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.isReconnecting = false;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopHeartbeat();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.connectionState = {
      status: 'disconnected',
      reconnectAttempts: 0
    };
    this.emit('connection_state_changed', this.connectionState);
  }

  private setupSocketEventHandlers(): void {
    if (!this.socket) return;

    // Authentication responses
    this.socket.on('authenticated', (data) => {
      console.log('WebSocket authenticated:', data);
      this.emit('authenticated', data);
      
      // Restore subscriptions if reconnecting
      if (this.isReconnecting) {
        this.restoreSubscriptions();
        this.isReconnecting = false;
      }
    });

    this.socket.on('auth_error', (error) => {
      console.error('WebSocket authentication error:', error);
      this.emit('auth_error', error);
    });

    // Subscription responses
    this.socket.on('subscribed', (data) => {
      console.log('Subscribed to:', data);
      this.emit('subscribed', data);
    });

    this.socket.on('unsubscribed', (data) => {
      console.log('Unsubscribed from:', data);
      this.emit('unsubscribed', data);
    });

    this.socket.on('subscription_error', (error) => {
      console.error('Subscription error:', error);
      this.emit('subscription_error', error);
    });

    // Real-time updates
    this.socket.on('feed_update', (data) => {
      this.emit('feed_update', data);
    });

    this.socket.on('community_post', (data) => {
      this.emit('community_post', data);
    });

    this.socket.on('community_update', (data) => {
      this.emit('community_update', data);
    });

    this.socket.on('new_message', (data) => {
      this.emit('new_message', data);
    });

    this.socket.on('reaction_update', (data) => {
      this.emit('reaction_update', data);
    });

    this.socket.on('tip_received', (data) => {
      this.emit('tip_received', data);
    });

    this.socket.on('notification', (data) => {
      this.emit('notification', data);
    });

    this.socket.on('user_status_update', (data) => {
      this.emit('user_status_update', data);
    });

    // Typing indicators
    this.socket.on('user_typing', (data) => {
      this.emit('user_typing', data);
    });

    this.socket.on('user_stopped_typing', (data) => {
      this.emit('user_stopped_typing', data);
    });

    // Connection health
    this.socket.on('heartbeat_ack', (data) => {
      this.emit('heartbeat_ack', data);
    });

    this.socket.on('connection_check', () => {
      this.sendHeartbeat();
    });

    this.socket.on('server_shutdown', (data) => {
      console.warn('Server shutting down:', data);
      this.emit('server_shutdown', data);
    });

    // Disconnection handling
    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.stopHeartbeat();
      
      this.connectionState = {
        status: 'disconnected',
        reconnectAttempts: this.connectionState.reconnectAttempts
      };
      this.emit('connection_state_changed', this.connectionState);
      this.emit('disconnected', { reason });

      // Attempt reconnection if enabled and not manually disconnected
      if (this.config.autoReconnect && reason !== 'io client disconnect') {
        this.attemptReconnection();
      }
    });
  }

  private authenticate(): void {
    if (!this.socket?.connected) return;

    this.socket.emit('authenticate', {
      walletAddress: this.config.walletAddress,
      reconnecting: this.isReconnecting
    });
  }

  private attemptReconnection(): void {
    if (this.isReconnecting || this.connectionState.reconnectAttempts >= this.config.reconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.isReconnecting = true;
    this.connectionState.status = 'reconnecting';
    this.connectionState.reconnectAttempts++;
    this.emit('connection_state_changed', this.connectionState);

    const delay = this.config.reconnectDelay * Math.pow(2, this.connectionState.reconnectAttempts - 1);
    
    this.reconnectTimeout = setTimeout(() => {
      console.log(`Attempting reconnection (${this.connectionState.reconnectAttempts}/${this.config.reconnectAttempts})`);
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
        this.attemptReconnection();
      });
    }, delay);
  }

  // Subscription Management
  subscribe(type: 'feed' | 'community' | 'conversation' | 'user' | 'global', target: string, filters?: {
    eventTypes?: string[];
    priority?: ('low' | 'medium' | 'high' | 'urgent')[];
  }): string {
    const subscriptionId = `${type}_${target}_${Date.now()}`;
    
    const subscription: Subscription = {
      id: subscriptionId,
      type,
      target,
      filters
    };

    this.subscriptions.set(subscriptionId, subscription);

    if (this.socket?.connected) {
      this.socket.emit('subscribe', {
        type,
        target,
        filters
      });
    }

    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    this.subscriptions.delete(subscriptionId);

    if (this.socket?.connected) {
      this.socket.emit('unsubscribe', { subscriptionId });
    }
  }

  private restoreSubscriptions(): void {
    this.subscriptions.forEach((subscription) => {
      if (this.socket?.connected) {
        this.socket.emit('subscribe', {
          type: subscription.type,
          target: subscription.target,
          filters: subscription.filters
        });
      }
    });
  }

  // Legacy room management (for backward compatibility)
  joinCommunity(communityId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join_community', { communityId });
    }
  }

  leaveCommunity(communityId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave_community', { communityId });
    }
  }

  joinConversation(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join_conversation', { conversationId });
    }
  }

  leaveConversation(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave_conversation', { conversationId });
    }
  }

  // Typing indicators
  startTyping(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('typing_start', { conversationId });
    }
  }

  stopTyping(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('typing_stop', { conversationId });
    }
  }

  // Connection state management
  updateConnectionState(state: 'stable' | 'unstable' | 'reconnecting'): void {
    if (this.socket?.connected) {
      this.socket.emit('connection_state', { state });
    }
  }

  // Heartbeat system
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000); // Send heartbeat every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private sendHeartbeat(): void {
    if (this.socket?.connected) {
      this.socket.emit('heartbeat');
    }
  }

  // Message queuing for offline scenarios
  private queueMessage(event: string, data: any, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'): void {
    this.messageQueue.push({
      event,
      data,
      timestamp: new Date(),
      priority
    });

    // Limit queue size
    if (this.messageQueue.length > 100) {
      this.messageQueue.shift();
    }
  }

  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    // Sort by priority and timestamp
    this.messageQueue.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp.getTime() - b.timestamp.getTime();
    });

    // Process queued messages
    const messages = [...this.messageQueue];
    this.messageQueue = [];

    messages.forEach(message => {
      if (this.socket?.connected) {
        this.socket.emit(message.event, message.data);
      }
    });

    console.log(`Processed ${messages.length} queued messages`);
  }

  // Event system
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
          console.error('Error in WebSocket event callback:', error);
        }
      });
    }
  }

  // Utility methods
  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    // Handle online/offline events
    window.addEventListener('online', () => {
      if (!this.socket?.connected && this.config.autoReconnect) {
        this.connect().catch(console.error);
      }
    });

    window.addEventListener('offline', () => {
      this.updateConnectionState('unstable');
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.socket?.connected) {
        this.sendHeartbeat();
      }
    });
  }

  // Public API
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  getSubscriptions(): Subscription[] {
    return Array.from(this.subscriptions.values());
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket() {
    return this.socket;
  }

  getUrl(): string {
    return this.config.url;
  }

  getQueuedMessageCount(): number {
    return this.messageQueue.length;
  }

  // Send custom message (for extensibility)
  send(event: string, data: any, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      this.queueMessage(event, data, priority);
    }
  }
}

// Singleton instance
let webSocketClientService: WebSocketClientService | null = null;

export const initializeWebSocketClient = (config: WebSocketClientConfig): WebSocketClientService => {
  if (webSocketClientService) {
    webSocketClientService.disconnect();
  }
  
  webSocketClientService = new WebSocketClientService(config);
  return webSocketClientService;
};

export const getWebSocketClient = (): WebSocketClientService | null => {
  return webSocketClientService;
};

export const shutdownWebSocketClient = (): void => {
  if (webSocketClientService) {
    webSocketClientService.disconnect();
    webSocketClientService = null;
  }
};

export default WebSocketClientService;