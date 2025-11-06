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

interface WebSocketServiceConfig {
  resourceAware?: boolean;
  maxConnections?: number;
  memoryThreshold?: number;
  enableHeartbeat?: boolean;
  heartbeatInterval?: number;
  messageQueueLimit?: number;
  connectionTimeout?: number;
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
  private config: WebSocketServiceConfig;
  private isResourceConstrained: boolean = false;

  constructor(httpServer: HttpServer, config: WebSocketServiceConfig = {}) {
    this.config = {
      resourceAware: config.resourceAware ?? true,
      maxConnections: config.maxConnections ?? 1000,
      memoryThreshold: config.memoryThreshold ?? 400, // MB
      enableHeartbeat: config.enableHeartbeat ?? true,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      messageQueueLimit: config.messageQueueLimit ?? 50,
      connectionTimeout: config.connectionTimeout ?? 60000,
      ...config
    };

    this.detectResourceConstraints();
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

    // Adjust configuration based on resource constraints
    const socketConfig: any = {
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
      pingTimeout: this.isResourceConstrained ? 90000 : 60000,
      pingInterval: this.isResourceConstrained ? 45000 : 25000,
      transports: this.isResourceConstrained ? ['polling'] : ['websocket', 'polling'],
      maxHttpBufferSize: this.isResourceConstrained ? 1e5 : 1e6, // 100KB vs 1MB
      connectTimeout: this.config.connectionTimeout
    };

    // Disable compression on resource-constrained environments
    if (this.isResourceConstrained) {
      socketConfig.compression = false;
      socketConfig.httpCompression = false;
    }

    this.io = new Server(httpServer, socketConfig);

    this.setupEventHandlers();
    
    if (this.config.enableHeartbeat && !this.isResourceConstrained) {
      this.startHeartbeat();
    }

    safeLogger.info(`WebSocket service initialized with resource awareness: ${this.isResourceConstrained ? 'constrained' : 'normal'} mode`);
  }

  private detectResourceConstraints(): void {
    // Check environment variables for resource constraints
    const isRenderFree = process.env.RENDER_SERVICE_TYPE === 'free' || 
                        process.env.NODE_ENV === 'production' && !process.env.RENDER_SERVICE_TYPE;
    
    const memoryLimit = process.env.MEMORY_LIMIT ? parseInt(process.env.MEMORY_LIMIT) : 512;
    const isLowMemory = memoryLimit < 1024; // Less than 1GB

    // Check current memory usage
    const memUsage = process.memoryUsage();
    const memUsageMB = memUsage.heapUsed / 1024 / 1024;
    const isHighMemoryUsage = memUsageMB > this.config.memoryThreshold!;

    this.isResourceConstrained = isRenderFree || isLowMemory || isHighMemoryUsage || 
                                process.env.DISABLE_WEBSOCKET_FEATURES === 'true';

    if (this.isResourceConstrained) {
      // Reduce limits for resource-constrained environments
      this.config.maxConnections = Math.min(this.config.maxConnections!, 100);
      this.config.messageQueueLimit = Math.min(this.config.messageQueueLimit!, 20);
      this.config.heartbeatInterval = Math.max(this.config.heartbeatInterval!, 60000);
    }

    safeLogger.info('WebSocket resource constraints detected:', {
      isResourceConstrained: this.isResourceConstrained,
      memoryUsageMB: Math.round(memUsageMB),
      memoryThreshold: this.config.memoryThreshold,
      maxConnections: this.config.maxConnections
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      // Check connection limits
      if (this.connectedUsers.size >= this.config.maxConnections!) {
        safeLogger.warn(`Connection limit reached (${this.config.maxConnections}), rejecting connection: ${socket.id}`);
        socket.emit('connection_rejected', { 
          reason: 'server_full',
          message: 'Server is at capacity. Please try again later.'
        });
        socket.disconnect(true);
        return;
      }

      safeLogger.info(`Client connected: ${socket.id} (${this.connectedUsers.size + 1}/${this.config.maxConnections})`);

      // Send resource constraint information to client
      socket.emit('server_info', {
        resourceConstrained: this.isResourceConstrained,
        features: {
          heartbeat: this.config.enableHeartbeat && !this.isResourceConstrained,
          compression: !this.isResourceConstrained,
          realTimeUpdates: !this.isResourceConstrained
        }
      });

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

  // Message queuing for offline users with resource awareness
  private queueMessage(walletAddress: string, message: BroadcastMessage) {
    if (!this.messageQueue.has(walletAddress)) {
      this.messageQueue.set(walletAddress, []);
    }
    
    const queue = this.messageQueue.get(walletAddress)!;
    queue.push(message);
    
    // Limit queue size based on resource constraints
    const queueLimit = this.config.messageQueueLimit!;
    if (queue.length > queueLimit) {
      // Remove oldest messages, prioritizing by importance
      queue.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
      
      // Keep only the most important messages
      queue.splice(queueLimit);
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

  // Heartbeat system with resource awareness
  private startHeartbeat() {
    if (!this.config.enableHeartbeat) return;

    const heartbeatInterval = this.isResourceConstrained ? 
      this.config.heartbeatInterval! * 2 : // Less frequent on constrained systems
      this.config.heartbeatInterval!;

    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const staleThreshold = heartbeatInterval * 2; // 2x heartbeat interval

      this.connectedUsers.forEach((user, socketId) => {
        const timeSinceLastSeen = now.getTime() - user.lastSeen.getTime();
        
        if (timeSinceLastSeen > staleThreshold) {
          // Mark connection as potentially stale
          if (user.connectionState === 'connected') {
            user.connectionState = 'reconnecting';
            
            // Only send connection check if not resource constrained
            if (!this.isResourceConstrained) {
              this.io.to(socketId).emit('connection_check');
            }
          }
        }
      });

      // Memory cleanup on resource-constrained systems
      if (this.isResourceConstrained && Math.random() < 0.1) { // 10% chance
        this.performMemoryCleanup();
      }
    }, heartbeatInterval);
  }

  private performMemoryCleanup(): void {
    const now = new Date();
    const cleanupThreshold = 5 * 60 * 1000; // 5 minutes

    // Clean up old message queues
    this.messageQueue.forEach((queue, walletAddress) => {
      const filteredQueue = queue.filter(msg => 
        now.getTime() - msg.timestamp.getTime() < cleanupThreshold
      );
      
      if (filteredQueue.length === 0) {
        this.messageQueue.delete(walletAddress);
      } else if (filteredQueue.length < queue.length) {
        this.messageQueue.set(walletAddress, filteredQueue);
      }
    });

    // Clean up stale reconnection timeouts
    this.reconnectionTimeouts.forEach((timeout, walletAddress) => {
      if (!this.userSockets.has(walletAddress)) {
        clearTimeout(timeout);
        this.reconnectionTimeouts.delete(walletAddress);
      }
    });

    safeLogger.debug('Memory cleanup performed', {
      messageQueues: this.messageQueue.size,
      reconnectionTimeouts: this.reconnectionTimeouts.size
    });
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

    if (this.userSockets.has(walletAddress) && this.userSockets.get(walletAddress)!.size > 0) {
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

  // Get comprehensive connection statistics with resource info
  getStats() {
    const now = new Date();
    const activeUsers = Array.from(this.connectedUsers.values()).filter(
      user => now.getTime() - user.lastSeen.getTime() < 60000 // Active in last minute
    );

    const memUsage = process.memoryUsage();

    return {
      connectedUsers: this.connectedUsers.size,
      uniqueUsers: this.userSockets.size,
      activeUsers: activeUsers.length,
      totalSubscriptions: this.subscriptions.size,
      rooms: this.io.sockets.adapter.rooms.size,
      queuedMessages: Array.from(this.messageQueue.values()).reduce((total, queue) => total + queue.length, 0),
      reconnectionTimeouts: this.reconnectionTimeouts.size,
      resourceConstraints: {
        isConstrained: this.isResourceConstrained,
        memoryUsageMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        memoryThresholdMB: this.config.memoryThreshold,
        maxConnections: this.config.maxConnections,
        heartbeatEnabled: this.config.enableHeartbeat && !this.isResourceConstrained
      }
    };
  }

  // Check if WebSocket features should be disabled
  shouldDisableFeatures(): boolean {
    const memUsage = process.memoryUsage();
    const memUsageMB = memUsage.heapUsed / 1024 / 1024;
    
    return this.isResourceConstrained || 
           memUsageMB > this.config.memoryThreshold! ||
           this.connectedUsers.size > this.config.maxConnections! * 0.9;
  }

  // Gracefully degrade service
  enableGracefulDegradation(): void {
    safeLogger.warn('Enabling WebSocket graceful degradation mode');
    
    // Disable heartbeat to save resources
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Reduce message queue limits
    this.config.messageQueueLimit = Math.min(this.config.messageQueueLimit!, 10);

    // Notify clients about degraded service
    this.io.emit('service_degraded', {
      message: 'Service is running in degraded mode due to resource constraints',
      features: {
        heartbeat: false,
        realTimeUpdates: false,
        messageQueue: this.config.messageQueueLimit
      }
    });
  }

  // Check resource health
  checkResourceHealth(): { healthy: boolean; metrics: any } {
    const memUsage = process.memoryUsage();
    const memUsageMB = memUsage.heapUsed / 1024 / 1024;
    const connectionRatio = this.connectedUsers.size / this.config.maxConnections!;

    const healthy = memUsageMB < this.config.memoryThreshold! && 
                   connectionRatio < 0.9 &&
                   !this.isResourceConstrained;

    return {
      healthy,
      metrics: {
        memoryUsageMB: Math.round(memUsageMB),
        memoryThresholdMB: this.config.memoryThreshold,
        connectionRatio: Math.round(connectionRatio * 100),
        connectedUsers: this.connectedUsers.size,
        maxConnections: this.config.maxConnections,
        isResourceConstrained: this.isResourceConstrained
      }
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

// Export configuration interface
export type { WebSocketServiceConfig };

export const initializeWebSocket = (httpServer: HttpServer, config?: WebSocketServiceConfig): WebSocketService => {
  if (!webSocketService) {
    // Detect resource constraints from environment
    const isResourceConstrained = process.env.RENDER_SERVICE_TYPE === 'free' || 
                                 process.env.DISABLE_WEBSOCKET_FEATURES === 'true' ||
                                 process.env.NODE_ENV === 'production' && !process.env.RENDER_SERVICE_TYPE;

    const defaultConfig: WebSocketServiceConfig = {
      resourceAware: true,
      maxConnections: isResourceConstrained ? 50 : 1000,
      memoryThreshold: isResourceConstrained ? 200 : 400,
      enableHeartbeat: !isResourceConstrained,
      heartbeatInterval: isResourceConstrained ? 60000 : 30000,
      messageQueueLimit: isResourceConstrained ? 20 : 100,
      connectionTimeout: 60000,
      ...config
    };

    webSocketService = new WebSocketService(httpServer, defaultConfig);
    
    // Start periodic cleanup with resource-aware intervals
    const cleanupIntervalMs = isResourceConstrained ? 5 * 60 * 1000 : 10 * 60 * 1000; // 5 or 10 minutes
    
    cleanupInterval = setInterval(() => {
      if (webSocketService) {
        webSocketService.cleanup();
        
        // Check resource health and enable degradation if needed
        const health = webSocketService.checkResourceHealth();
        if (!health.healthy && !webSocketService.shouldDisableFeatures()) {
          webSocketService.enableGracefulDegradation();
        }
      }
    }, cleanupIntervalMs);
    
    safeLogger.info('WebSocket service initialized with resource-aware configuration', {
      resourceConstrained: isResourceConstrained,
      config: defaultConfig
    });
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
