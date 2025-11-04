import { Server } from 'socket.io';
import { safeLogger } from '../utils/safeLogger';
import { Server as HttpServer } from 'http';

interface WebSocketUser {
  userId: string;
  walletAddress: string;
  socketId: string;
  connectedAt: Date;
  lastSeen: Date;
  subscriptions: Set<string>;
  connectionState: 'connected' | 'reconnecting' | 'disconnected';
}

interface NotificationData {
  type: string;
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  timestamp?: Date;
}

interface Subscription {
  id: string;
  type: 'feed' | 'community' | 'conversation' | 'user' | 'global';
  target: string; // communityId, conversationId, userAddress, or 'all'
  filters?: {
    eventTypes?: string[];
    priority?: ('low' | 'medium' | 'high' | 'urgent')[];
  };
  createdAt: Date;
}

interface BroadcastMessage {
  event: string;
  data: any;
  targets: {
    type: 'user' | 'community' | 'conversation' | 'global';
    ids: string[];
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: Date;
}

export class WebSocketService {
  private io: Server;
  private connectedUsers: Map<string, WebSocketUser> = new Map();
  private userSockets: Map<string, Set<string>> = new Map(); // walletAddress -> Set of socketIds
  private subscriptions: Map<string, Subscription> = new Map(); // subscriptionId -> Subscription
  private userSubscriptions: Map<string, Set<string>> = new Map(); // walletAddress -> Set of subscriptionIds
  private messageQueue: Map<string, BroadcastMessage[]> = new Map(); // walletAddress -> queued messages
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectionTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(httpServer: HttpServer) {
    // Parse allowed origins from environment variables
    const frontendUrls = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [];
    const allowedOrigins = [
      ...frontendUrls,
      "http://localhost:3000",
      "http://localhost:3001",
      "https://www.linkdao.io",
      "https://linkdao.io",
      "https://app.linkdao.io",
      "https://marketplace.linkdao.io",
      "https://linkdao-backend.onrender.com",
      "https://api.linkdao.io"
    ];

    this.io = new Server(httpServer, {
      cors: {
        origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
          // Allow requests with no origin (like mobile apps or curl requests)
          if (!origin) return callback(null, true);
          
          if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        methods: ["GET", "POST"]
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    this.startHeartbeat();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      safeLogger.info(`Client connected: ${socket.id}`);

      // Handle user authentication
      socket.on('authenticate', (data: { walletAddress: string; reconnecting?: boolean }) => {
        const { walletAddress, reconnecting = false } = data;
        
        if (!walletAddress) {
          socket.emit('auth_error', { message: 'Wallet address required' });
          return;
        }

        // Clear any existing reconnection timeout
        if (this.reconnectionTimeouts.has(walletAddress)) {
          clearTimeout(this.reconnectionTimeouts.get(walletAddress)!);
          this.reconnectionTimeouts.delete(walletAddress);
        }

        // Store user connection
        const user: WebSocketUser = {
          userId: walletAddress,
          walletAddress,
          socketId: socket.id,
          connectedAt: new Date(),
          lastSeen: new Date(),
          subscriptions: new Set(),
          connectionState: 'connected'
        };

        this.connectedUsers.set(socket.id, user);

        // Track multiple sockets per user
        if (!this.userSockets.has(walletAddress)) {
          this.userSockets.set(walletAddress, new Set());
        }
        this.userSockets.get(walletAddress)!.add(socket.id);

        // Join user-specific room
        socket.join(`user:${walletAddress}`);

        // Restore subscriptions if reconnecting
        if (reconnecting && this.userSubscriptions.has(walletAddress)) {
          const userSubs = this.userSubscriptions.get(walletAddress)!;
          userSubs.forEach(subId => {
            const subscription = this.subscriptions.get(subId);
            if (subscription) {
              user.subscriptions.add(subId);
              this.joinSubscriptionRoom(socket, subscription);
            }
          });
        }

        // Send queued messages if any
        this.deliverQueuedMessages(walletAddress);

        socket.emit('authenticated', { 
          message: 'Successfully authenticated',
          connectedUsers: this.connectedUsers.size,
          reconnecting,
          subscriptions: Array.from(user.subscriptions)
        });

        // Broadcast user online status
        this.broadcastUserStatus(walletAddress, 'online');

        safeLogger.info(`User authenticated: ${walletAddress} (${socket.id}) - Reconnecting: ${reconnecting}`);
      });

      // Handle subscription management
      socket.on('subscribe', (data: { 
        type: 'feed' | 'community' | 'conversation' | 'user' | 'global';
        target: string;
        filters?: {
          eventTypes?: string[];
          priority?: ('low' | 'medium' | 'high' | 'urgent')[];
        };
      }) => {
        const user = this.connectedUsers.get(socket.id);
        if (!user) {
          socket.emit('subscription_error', { message: 'User not authenticated' });
          return;
        }

        const subscription: Subscription = {
          id: `${user.walletAddress}_${data.type}_${data.target}_${Date.now()}`,
          type: data.type,
          target: data.target,
          filters: data.filters,
          createdAt: new Date()
        };

        // Store subscription
        this.subscriptions.set(subscription.id, subscription);
        user.subscriptions.add(subscription.id);

        // Track user subscriptions
        if (!this.userSubscriptions.has(user.walletAddress)) {
          this.userSubscriptions.set(user.walletAddress, new Set());
        }
        this.userSubscriptions.get(user.walletAddress)!.add(subscription.id);

        // Join appropriate room
        this.joinSubscriptionRoom(socket, subscription);

        socket.emit('subscribed', { 
          subscriptionId: subscription.id,
          type: data.type,
          target: data.target
        });

        safeLogger.info(`User ${user.walletAddress} subscribed to ${data.type}:${data.target}`);
      });

      // Handle unsubscription
      socket.on('unsubscribe', (data: { subscriptionId: string }) => {
        const user = this.connectedUsers.get(socket.id);
        if (!user) {
          socket.emit('subscription_error', { message: 'User not authenticated' });
          return;
        }

        const subscription = this.subscriptions.get(data.subscriptionId);
        if (!subscription) {
          socket.emit('subscription_error', { message: 'Subscription not found' });
          return;
        }

        // Remove subscription
        this.subscriptions.delete(data.subscriptionId);
        user.subscriptions.delete(data.subscriptionId);
        if (this.userSubscriptions.has(user.walletAddress)) {
          this.userSubscriptions.get(user.walletAddress)!.delete(data.subscriptionId);
        }

        // Leave room
        this.leaveSubscriptionRoom(socket, subscription);

        socket.emit('unsubscribed', { subscriptionId: data.subscriptionId });

        safeLogger.info(`User ${user.walletAddress} unsubscribed from ${subscription.type}:${subscription.target}`);
      });

      // Handle user registration
      socket.on('register', (data: { address: string }) => {
        const user = this.connectedUsers.get(socket.id);
        if (!user) {
          socket.emit('registration_error', { message: 'User not authenticated' });
          return;
        }

        // Update user registration
        user.userId = data.address;
        safeLogger.info(`User registered: ${data.address}`);
      });

      // Handle typing indicators
      socket.on('typing:start', (data: { conversationId: string; userAddress: string }) => {
        socket.to(`conversation:${data.conversationId}`).emit('typing:start', data);
      });

      socket.on('typing:stop', (data: { conversationId: string; userAddress: string }) => {
        socket.to(`conversation:${data.conversationId}`).emit('typing:stop', data);
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        const user = this.connectedUsers.get(socket.id);
        if (user) {
          // Update user status
          user.connectionState = 'disconnected';
          user.lastSeen = new Date();

          // Remove socket from user tracking
          if (this.userSockets.has(user.walletAddress)) {
            this.userSockets.get(user.walletAddress)!.delete(socket.id);
            // If no more sockets for this user, schedule cleanup
            if (this.userSockets.get(user.walletAddress)!.size === 0) {
              this.scheduleUserCleanup(user.walletAddress);
            }
          }

          // Broadcast user offline status
          this.broadcastUserStatus(user.walletAddress, 'offline');

          safeLogger.info(`User disconnected: ${user.walletAddress} (${socket.id}) - Reason: ${reason}`);
        }

        // Clean up user data
        this.connectedUsers.delete(socket.id);
      });
    });
  }

  private joinSubscriptionRoom(socket: any, subscription: Subscription) {
    switch (subscription.type) {
      case 'feed':
        socket.join('feed');
        break;
      case 'community':
        socket.join(`community:${subscription.target}`);
        break;
      case 'conversation':
        socket.join(`conversation:${subscription.target}`);
        break;
      case 'user':
        socket.join(`user:${subscription.target}`);
        break;
      case 'global':
        socket.join('global');
        break;
    }
  }

  private leaveSubscriptionRoom(socket: any, subscription: Subscription) {
    switch (subscription.type) {
      case 'feed':
        socket.leave('feed');
        break;
      case 'community':
        socket.leave(`community:${subscription.target}`);
        break;
      case 'conversation':
        socket.leave(`conversation:${subscription.target}`);
        break;
      case 'user':
        socket.leave(`user:${subscription.target}`);
        break;
      case 'global':
        socket.leave('global');
        break;
    }
  }

  private broadcastUserStatus(walletAddress: string, status: 'online' | 'offline') {
    // Broadcast to user's followers or relevant communities
    this.io.to(`user:${walletAddress}`).emit('user:status', {
      walletAddress,
      status,
      timestamp: new Date()
    });
  }

  private scheduleUserCleanup(walletAddress: string) {
    // Schedule cleanup of user data after a delay if no active connections
    const timeout = setTimeout(() => {
      // Check if user still has active connections
      if (this.userSockets.has(walletAddress) && this.userSockets.get(walletAddress)!.size === 0) {
        // Remove user subscriptions
        if (this.userSubscriptions.has(walletAddress)) {
          const subscriptions = this.userSubscriptions.get(walletAddress)!;
          subscriptions.forEach(subId => {
            this.subscriptions.delete(subId);
          });
          this.userSubscriptions.delete(walletAddress);
        }

        // Remove user from connected users map
        const userEntries = Array.from(this.connectedUsers.entries());
        userEntries.forEach(([socketId, user]) => {
          if (user.walletAddress === walletAddress) {
            this.connectedUsers.delete(socketId);
          }
        });

        safeLogger.info(`Cleaned up user data for: ${walletAddress}`);
      }
    }, 30000); // 30 seconds

    this.reconnectionTimeouts.set(walletAddress, timeout);
  }

  // Message queuing for offline users
  private queueMessage(walletAddress: string, message: BroadcastMessage) {
    if (!this.messageQueue.has(walletAddress)) {
      this.messageQueue.set(walletAddress, []);
    }
    
    const queue = this.messageQueue.get(walletAddress)!;
    queue.push(message);
    
    // Limit queue size to prevent memory issues
    if (queue.length > 100) {
      queue.shift(); // Remove oldest message
    }
  }

  private deliverQueuedMessages(walletAddress: string) {
    const queue = this.messageQueue.get(walletAddress);
    if (!queue || queue.length === 0) return;

    // Send all queued messages
    queue.forEach(message => {
      this.sendToUser(walletAddress, message.event, {
        ...message.data,
        queued: true,
        originalTimestamp: message.timestamp
      });
    });

    // Clear the queue
    this.messageQueue.delete(walletAddress);
    
    safeLogger.info(`Delivered ${queue.length} queued messages to ${walletAddress}`);
  }

  // Heartbeat system
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const staleThreshold = 60000; // 1 minute

      this.connectedUsers.forEach((user, socketId) => {
        const timeSinceLastSeen = now.getTime() - user.lastSeen.getTime();
        
        if (timeSinceLastSeen > staleThreshold) {
          // Mark connection as potentially stale
          if (user.connectionState === 'connected') {
            user.connectionState = 'reconnecting';
            this.io.to(socketId).emit('connection_check');
          }
        }
      });
    }, 30000); // Check every 30 seconds
  }

  // Enhanced messaging with subscription filtering
  sendToUser(walletAddress: string, event: string, data: any, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium') {
    const message: BroadcastMessage = {
      event,
      data,
      targets: { type: 'user', ids: [walletAddress] },
      priority,
      timestamp: new Date()
    };

    if (this.isUserSockets.has(walletAddress) && this.userSockets.get(walletAddress)!.size > 0) {
      this.io.to(`user:${walletAddress}`).emit(event, {
        ...data,
        priority,
        timestamp: message.timestamp
      });
    } else {
      // Queue message for offline user
      this.queueMessage(walletAddress, message);
    }
  }

  // Send notification to community with subscription filtering
  sendToCommunity(communityId: string, event: string, data: any, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium') {
    const message = {
      ...data,
      priority,
      timestamp: new Date()
    };

    // Send to community room
    this.io.to(`community:${communityId}`).emit(event, message);
    
    // Also send to feed subscribers who might be interested
    this.io.to(`feed:${communityId}`).emit(event, message);
  }

  // Send notification to conversation with encryption support
  sendToConversation(conversationId: string, event: string, data: any, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium') {
    const message = {
      ...data,
      priority,
      timestamp: new Date()
    };

    this.io.to(`conversation:${conversationId}`).emit(event, message);
  }

  // Enhanced broadcast with subscription filtering
  broadcast(event: string, data: any, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium', filters?: {
    eventTypes?: string[];
    userTypes?: string[];
  }) {
    const message = {
      ...data,
      priority,
      timestamp: new Date()
    };

    if (filters) {
      // Send only to users with matching subscriptions
      this.connectedUsers.forEach((user) => {
        const userSubs = this.userSubscriptions.get(user.walletAddress);
        if (userSubs) {
          const hasMatchingSubscription = Array.from(userSubs).some(subId => {
            const subscription = this.subscriptions.get(subId);
            if (!subscription) return false;
            
            // Check event type filter
            if (filters.eventTypes && subscription.filters?.eventTypes) {
              return subscription.filters.eventTypes.includes(event);
            }
            
            // Check priority filter
            if (subscription.filters?.priority) {
              return subscription.filters.priority.includes(priority);
            }
            
            return subscription.type === 'global';
          });
          
          if (hasMatchingSubscription) {
            this.io.to(user.socketId).emit(event, message);
          }
        }
      });
    } else {
      // Broadcast to all
      this.io.emit(event, message);
    }
  }

  // Send real-time feed update with intelligent routing
  sendFeedUpdate(data: { postId: string; authorAddress: string; communityId?: string; contentType?: string }) {
    const priority = data.contentType === 'urgent' ? 'urgent' : 'medium';
    
    // Send to global feed subscribers
    this.broadcast('feed_update', {
      type: 'new_post',
      data
    }, priority, {
      eventTypes: ['feed_update', 'new_post']
    });

    // Send to community if specified
    if (data.communityId) {
      this.sendToCommunity(data.communityId, 'community_post', data, priority);
    }

    // Send to author's followers (if we had follower relationships)
    // This would be implemented when user relationships are added
  }

  // Send real-time message update with encryption metadata
  sendMessageUpdate(conversationId: string, messageData: any) {
    this.sendToConversation(conversationId, 'new_message', {
      ...messageData,
      encrypted: true, // Indicate that message content is encrypted
      deliveredAt: new Date()
    }, 'high'); // Messages have high priority
  }

  // Send real-time reaction update with aggregation
  sendReactionUpdate(postId: string, reactionData: any) {
    this.broadcast('reaction_update', {
      postId,
      ...reactionData,
      aggregated: true // Indicate this includes aggregated reaction counts
    }, 'low'); // Reactions have lower priority than messages
  }

  // Send real-time tip notification with transaction details
  sendTipNotification(recipientAddress: string, tipData: any) {
    this.sendToUser(recipientAddress, 'tip_received', {
      ...tipData,
      transactionHash: tipData.txHash,
      confirmations: tipData.confirmations || 0
    }, 'high'); // Tips are high priority
  }

  // Send system notification with categorization
  sendNotification(userAddress: string, notification: NotificationData) {
    const priority = notification.priority || 'medium';
    this.sendToUser(userAddress, 'notification', {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: notification.timestamp || new Date()
    }, priority);
  }

  // Send real-time community updates
  sendCommunityUpdate(communityId: string, updateType: string, data: any) {
    this.sendToCommunity(communityId, 'community_update', {
      type: updateType,
      communityId,
      ...data
    }, 'medium');
  }

  // Send typing indicators with timeout
  sendTypingIndicator(conversationId: string, userAddress: string, isTyping: boolean) {
    this.sendToConversation(conversationId, isTyping ? 'user_typing' : 'user_stopped_typing', {
      userAddress,
      conversationId,
      timestamp: new Date()
    }, 'low'); // Typing indicators are low priority
  }

  // Get comprehensive connection statistics
  getStats() {
    const now = new Date();
    const activeUsers = Array.from(this.connectedUsers.values()).filter(
      user => now.getTime() - user.lastSeen.getTime() < 60000 // Active in last minute
    );

    return {
      connectedUsers: this.connectedUsers.size,
      uniqueUsers: this.userSockets.size,
      activeUsers: activeUsers.length,
      totalSubscriptions: this.subscriptions.size,
      rooms: this.io.sockets.adapter.rooms.size,
      queuedMessages: Array.from(this.messageQueue.values()).reduce((total, queue) => total + queue.length, 0),
      reconnectionTimeouts: this.reconnectionTimeouts.size
    };
  }

  // Enhanced user online check with connection state
  isUserOnline(walletAddress: string): boolean {
    const isConnected = this.userSockets.has(walletAddress);
    if (!isConnected) return false;

    // Check if any of the user's sockets are in good state
    const socketIds = this.userSockets.get(walletAddress)!;
    return Array.from(socketIds).some(socketId => {
      const user = this.connectedUsers.get(socketId);
      return user && user.connectionState === 'connected';
    });
  }

  // Get user connection state
  getUserConnectionState(walletAddress: string): 'online' | 'reconnecting' | 'offline' {
    if (!this.userSockets.has(walletAddress)) return 'offline';

    const socketIds = this.userSockets.get(walletAddress)!;
    const states = Array.from(socketIds).map(socketId => {
      const user = this.connectedUsers.get(socketId);
      return user?.connectionState || 'disconnected';
    });

    if (states.includes('connected')) return 'online';
    if (states.includes('reconnecting')) return 'reconnecting';
    return 'offline';
  }

  // Get all connected users with enhanced info
  getConnectedUsers(): WebSocketUser[] {
    return Array.from(this.connectedUsers.values());
  }

  // Get user subscriptions
  getUserSubscriptions(walletAddress: string): Subscription[] {
    const userSubs = this.userSubscriptions.get(walletAddress);
    if (!userSubs) return [];

    return Array.from(userSubs)
      .map(subId => this.subscriptions.get(subId))
      .filter(sub => sub !== undefined) as Subscription[];
  }

  // Clean up stale connections and data
  cleanup() {
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    // Clean up stale users
    this.connectedUsers.forEach((user, socketId) => {
      if (now.getTime() - user.lastSeen.getTime() > staleThreshold) {
        safeLogger.info(`Cleaning up stale connection: ${user.walletAddress} (${socketId})`);
        
        // Remove from tracking
        this.connectedUsers.delete(socketId);
        
        const userSocketSet = this.userSockets.get(user.walletAddress);
        if (userSocketSet) {
          userSocketSet.delete(socketId);
          if (userSocketSet.size === 0) {
            this.userSockets.delete(user.walletAddress);
          }
        }
      }
    });

    // Clean up old subscriptions for offline users
    this.userSubscriptions.forEach((subs, walletAddress) => {
      if (!this.userSockets.has(walletAddress)) {
        subs.forEach(subId => this.subscriptions.delete(subId));
        this.userSubscriptions.delete(walletAddress);
      }
    });

    // Clean up old message queues
    this.messageQueue.forEach((queue, walletAddress) => {
      if (!this.userSockets.has(walletAddress)) {
        // Keep messages for up to 1 hour for offline users
        const cutoff = now.getTime() - (60 * 60 * 1000);
        const filteredQueue = queue.filter(msg => msg.timestamp.getTime() > cutoff);
        
        if (filteredQueue.length === 0) {
          this.messageQueue.delete(walletAddress);
        } else {
          this.messageQueue.set(walletAddress, filteredQueue);
        }
      }
    });
  }

  // Graceful shutdown with cleanup
  close() {
    safeLogger.info('Shutting down WebSocket service...');
    
    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Clear reconnection timeouts
    this.reconnectionTimeouts.forEach(timeout => clearTimeout(timeout));
    this.reconnectionTimeouts.clear();

    // Notify all connected users
    this.io.emit('server_shutdown', {
      message: 'Server is shutting down',
      timestamp: new Date()
    });

    // Close server
    this.io.close();
    
    safeLogger.info('WebSocket service shut down complete');
  }
}

let webSocketService: WebSocketService | null = null;
let cleanupInterval: NodeJS.Timeout | null = null;

export const initializeWebSocket = (httpServer: HttpServer): WebSocketService => {
  if (!webSocketService) {
    webSocketService = new WebSocketService(httpServer);
    
    // Start periodic cleanup (every 10 minutes)
    cleanupInterval = setInterval(() => {
      if (webSocketService) {
        webSocketService.cleanup();
      }
    }, 10 * 60 * 1000);
    
    safeLogger.info('WebSocket service initialized with real-time infrastructure');
  }
  return webSocketService;
};

export const getWebSocketService = (): WebSocketService | null => {
  return webSocketService;
};

export const shutdownWebSocket = (): void => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  
  if (webSocketService) {
    webSocketService.close();
    webSocketService = null;
  }
};
