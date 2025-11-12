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
    this.setupSocketEventHandlers();
  }

  // Connection Management
  async connect(): Promise<void> {
    if (this.socket?.connected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.connectionState.status = 'connecting';
        this.emit('connection_state_changed', this.connectionState);

        // Parse URL to determine if path is already included
        let socketUrl = this.config.url;
        let socketPath = '/socket.io/';
        
        try {
          const parsedUrl = new URL(this.config.url);
          // If the URL already includes the socket.io path, extract it
          if (parsedUrl.pathname && parsedUrl.pathname.includes('socket.io')) {
            socketPath = parsedUrl.pathname;
            // Remove the path from the URL
            parsedUrl.pathname = '';
            socketUrl = parsedUrl.toString().replace(/\/$/, '');
          } else {
            // Ensure we have the correct path for Socket.IO
            socketPath = '/socket.io/';
          }
        } catch (error) {
          // If URL parsing fails, use defaults
          console.warn('Failed to parse WebSocket URL, using defaults:', error);
        }

        // Store the resolve/reject references for later use
        const originalResolve = resolve;
        let resolved = false;

        this.socket = io(socketUrl, {
          path: socketPath,
          transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
          timeout: 30000, // Increase timeout to 30 seconds
          reconnection: false, // We handle reconnection manually
          forceNew: true,
          withCredentials: true, // Enable credentials for better CORS handling
          extraHeaders: {
            'X-Client-Type': 'web',
            'X-Client-Version': '1.0.0'
          },
          // Additional options to improve connection reliability
          upgrade: true,
          rememberUpgrade: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          randomizationFactor: 0.5
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
          
          if (!resolved) {
            resolved = true;
            originalResolve();
          }
        });

        this.socket.on('connect_error', (error) => {
          console.warn('WebSocket connection error (will attempt polling fallback):', error.message);
          console.warn('WebSocket URL:', socketUrl);
          console.warn('WebSocket path:', socketPath);
          console.warn('WebSocket transport options:', this.socket?.io?.opts?.transports);
          
          // Emit a warning but don't reject immediately to allow polling fallback
          this.connectionState = {
            status: 'error',
            reconnectAttempts: this.connectionState.reconnectAttempts,
            error: error.message
          };
          this.emit('connection_state_changed', this.connectionState);
          
          // Don't reject immediately, let Socket.IO handle the transport fallback
          // The connect event will fire if polling works
        });

        // Handle case where connection fails completely after all transports
        this.socket.on('reconnect_failed', () => {
          if (!resolved) {
            resolved = true;
            reject(new Error('All connection attempts failed'));
          }
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

    // Connection events
    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.emit('disconnected', { reason });

      // Attempt reconnection if enabled
      if (this.config.autoReconnect && reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('WebSocket reconnect attempt:', attemptNumber);
      this.connectionState = {
        status: 'reconnecting',
        reconnectAttempts: attemptNumber
      };
      this.emit('connection_state_changed', this.connectionState);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected on attempt:', attemptNumber);
      this.connectionState = {
        status: 'connected',
        lastConnected: new Date(),
        reconnectAttempts: attemptNumber
      };
      this.emit('connection_state_changed', this.connectionState);
      
      // Re-authenticate after reconnection
      this.authenticate();
      
      // Restore subscriptions
      this.restoreSubscriptions();
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('WebSocket reconnection error:', error);
      this.emit('reconnect_error', error);
    });

    // Listen for all custom events and emit them to local listeners
    this.socket.onAny((event, ...args) => {
      this.emit(event, ...args);
    });

    // Heartbeat responses
    this.socket.on('pong', () => {
      // Heartbeat response received
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.connectionState.reconnectAttempts >= this.config.reconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.connectionState.reconnectAttempts++;
    this.isReconnecting = true;

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
        this.scheduleReconnect(); // Try again
      });
    }, this.config.reconnectDelay * this.connectionState.reconnectAttempts); // Exponential backoff
  }

  private authenticate(): void {
    if (this.socket?.connected && this.config.walletAddress) {
      this.socket.emit('authenticate', {
        walletAddress: this.config.walletAddress,
        reconnecting: this.isReconnecting
      });
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 30000); // 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.socket?.connected) {
      const message = this.messageQueue.shift();
      if (message) {
        this.socket.emit(message.event, message.data);
      }
    }
  }

  private restoreSubscriptions(): void {
    this.subscriptions.forEach((subscription) => {
      this.socket?.emit('subscribe', {
        type: subscription.type,
        target: subscription.target,
        filters: subscription.filters
      });
    });
  }

  // Event handling
  private emit(event: string, ...args: any[]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in WebSocket listener for event ${event}:`, error);
        }
      });
    }
  }

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
      if (listeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  // Subscription management
  subscribe(
    type: 'feed' | 'community' | 'conversation' | 'user' | 'global',
    target: string,
    filters?: {
      eventTypes?: string[];
      priority?: ('low' | 'medium' | 'high' | 'urgent')[];
    }
  ): string {
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
    if (subscription) {
      if (this.socket?.connected) {
        this.socket.emit('unsubscribe', {
          subscriptionId: subscription.id
        });
      }
      this.subscriptions.delete(subscriptionId);
    }
  }

  // Legacy room methods
  joinCommunity(communityId: string): void {
    this.subscribe('community', communityId);
  }

  leaveCommunity(communityId: string): void {
    // Find subscription by community ID
    const subscriptionId = Array.from(this.subscriptions.entries())
      .find(([_, sub]) => sub.type === 'community' && sub.target === communityId)?.[0];
    
    if (subscriptionId) {
      this.unsubscribe(subscriptionId);
    }
  }

  joinConversation(conversationId: string): void {
    this.subscribe('conversation', conversationId);
  }

  leaveConversation(conversationId: string): void {
    // Find subscription by conversation ID
    const subscriptionId = Array.from(this.subscriptions.entries())
      .find(([_, sub]) => sub.type === 'conversation' && sub.target === conversationId)?.[0];
    
    if (subscriptionId) {
      this.unsubscribe(subscriptionId);
    }
  }

  // Typing indicators
  startTyping(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('typing:start', {
        conversationId,
        userAddress: this.config.walletAddress
      });
    }
  }

  stopTyping(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('typing:stop', {
        conversationId,
        userAddress: this.config.walletAddress
      });
    }
  }

  // Message sending with queuing
  send(event: string, data: any, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'): void {
    const message: QueuedMessage = {
      event,
      data,
      timestamp: new Date(),
      priority
    };

    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(message);
      // Keep queue size reasonable
      if (this.messageQueue.length > 100) {
        this.messageQueue.shift();
      }
    }
  }

  // Utility methods
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
  sendCustomMessage(event: string, data: any, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'): void {
    this.send(event, data, priority);
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