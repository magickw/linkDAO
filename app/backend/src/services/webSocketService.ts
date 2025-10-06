import { Server } from 'socket.io';
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
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
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
      console.log(`Client connected: ${socket.id}`);

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

        console.log(`User authenticated: ${walletAddress} (${socket.id}) - Reconnecting: ${reconnecting}`);
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

        console.log(`User ${user.walletAddress} subscribed to ${data.type}:${data.target}`);
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

        const userSubs = this.userSubscriptions.get(user.walletAddress);
        if (userSubs) {
          userSubs.delete(data.subscriptionId);
        }

        // Leave room
        this.leaveSubscriptionRoom(socket, subscription);

        socket.emit('unsubscribed', { subscriptionId: data.subscriptionId });

        console.log(`User ${user.walletAddress} unsubscribed from ${subscription.type}:${subscription.target}`);
      });

      // Handle joining community rooms (legacy support)
      socket.on('join_community', (data: { communityId: string }) => {
        const { communityId } = data;
        socket.join(`community:${communityId}`);
        socket.emit('joined_community', { communityId });
        console.log(`Socket ${socket.id} joined community: ${communityId}`);
      });

      // Handle leaving community rooms (legacy support)
      socket.on('leave_community', (data: { communityId: string }) => {
        const { communityId } = data;
        socket.leave(`community:${communityId}`);
        socket.emit('left_community', { communityId });
        console.log(`Socket ${socket.id} left community: ${communityId}`);
      });

      // Handle joining conversation rooms (legacy support)
      socket.on('join_conversation', (data: { conversationId: string }) => {
        const { conversationId } = data;
        socket.join(`conversation:${conversationId}`);
        socket.emit('joined_conversation', { conversationId });
        console.log(`Socket ${socket.id} joined conversation: ${conversationId}`);
      });

      // Handle leaving conversation rooms (legacy support)
      socket.on('leave_conversation', (data: { conversationId: string }) => {
        const { conversationId } = data;
        socket.leave(`conversation:${conversationId}`);
        socket.emit('left_conversation', { conversationId });
        console.log(`Socket ${socket.id} left conversation: ${conversationId}`);
      });

      // Handle typing indicators
      socket.on('typing_start', (data: { conversationId: string }) => {
        const user = this.connectedUsers.get(socket.id);
        if (user) {
          socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
            userAddress: user.walletAddress,
            conversationId: data.conversationId
          });
        }
      });

      socket.on('typing_stop', (data: { conversationId: string }) => {
        const user = this.connectedUsers.get(socket.id);
        if (user) {
          socket.to(`conversation:${data.conversationId}`).emit('user_stopped_typing', {
            userAddress: user.walletAddress,
            conversationId: data.conversationId
          });
        }
      });

      // Handle connection state updates
      socket.on('connection_state', (data: { state: 'stable' | 'unstable' | 'reconnecting' }) => {
        const user = this.connectedUsers.get(socket.id);
        if (user) {
          user.connectionState = data.state === 'stable' ? 'connected' : 'reconnecting';
          user.lastSeen = new Date();
          
          // Broadcast connection state to relevant users
          this.broadcastUserStatus(user.walletAddress, data.state);
        }
      });

      // Handle heartbeat
      socket.on('heartbeat', () => {
        const user = this.connectedUsers.get(socket.id);
        if (user) {
          user.lastSeen = new Date();
          user.connectionState = 'connected';
        }
        socket.emit('heartbeat_ack', { timestamp: new Date().toISOString() });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        const user = this.connectedUsers.get(socket.id);
        
        if (user) {
          // Update connection state
          user.connectionState = 'disconnected';
          
          // Remove from user sockets tracking
          const userSocketSet = this.userSockets.get(user.walletAddress);
          if (userSocketSet) {
            userSocketSet.delete(socket.id);
            
            // If no more sockets for this user, set up reconnection timeout
            if (userSocketSet.size === 0) {
              this.userSockets.delete(user.walletAddress);
              this.setupReconnectionTimeout(user.walletAddress);
              this.broadcastUserStatus(user.walletAddress, 'offline');
            }
          }

          // Remove from connected users
          this.connectedUsers.delete(socket.id);
          
          console.log(`User disconnected: ${user.walletAddress} (${socket.id}) - Reason: ${reason}`);
        } else {
          console.log(`Client disconnected: ${socket.id} - Reason: ${reason}`);
        }
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        const user = this.connectedUsers.get(socket.id);
        if (user) {
          user.lastSeen = new Date();
        }
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });
    });
  }

  // Helper methods for subscription management
  private joinSubscriptionRoom(socket: any, subscription: Subscription) {
    const roomName = this.getSubscriptionRoomName(subscription);
    socket.join(roomName);
  }

  private leaveSubscriptionRoom(socket: any, subscription: Subscription) {
    const roomName = this.getSubscriptionRoomName(subscription);
    socket.leave(roomName);
  }

  private getSubscriptionRoomName(subscription: Subscription): string {
    switch (subscription.type) {
      case 'feed':
        return `feed:${subscription.target}`;
      case 'community':
        return `community:${subscription.target}`;
      case 'conversation':
        return `conversation:${subscription.target}`;
      case 'user':
        return `user:${subscription.target}`;
      case 'global':
        return 'global';
      default:
        return `unknown:${subscription.target}`;
    }
  }

  // Connection state management
  private setupReconnectionTimeout(walletAddress: string) {
    // Clear existing timeout if any
    if (this.reconnectionTimeouts.has(walletAddress)) {
      clearTimeout(this.reconnectionTimeouts.get(walletAddress)!);
    }

    // Set up new timeout (5 minutes)
    const timeout = setTimeout(() => {
      // Clean up user subscriptions if still not reconnected
      const userSubs = this.userSubscriptions.get(walletAddress);
      if (userSubs && !this.userSockets.has(walletAddress)) {
        userSubs.forEach(subId => {
          this.subscriptions.delete(subId);
        });
        this.userSubscriptions.delete(walletAddress);
        
        // Clear message queue
        this.messageQueue.delete(walletAddress);
        
        console.log(`Cleaned up subscriptions for disconnected user: ${walletAddress}`);
      }
      
      this.reconnectionTimeouts.delete(walletAddress);
    }, 5 * 60 * 1000); // 5 minutes

    this.reconnectionTimeouts.set(walletAddress, timeout);
  }

  private broadcastUserStatus(walletAddress: string, status: 'online' | 'offline' | 'stable' | 'unstable' | 'reconnecting') {
    // Broadcast to users who might be interested in this user's status
    // This could be optimized based on actual relationships/followers
    this.io.emit('user_status_update', {
      userAddress: walletAddress,
      status,
      timestamp: new Date().toISOString()
    });
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
    
    console.log(`Delivered ${queue.length} queued messages to ${walletAddress}`);
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

    if (this.isUserOnline(walletAddress)) {
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
        console.log(`Cleaning up stale connection: ${user.walletAddress} (${socketId})`);
        
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
    console.log('Shutting down WebSocket service...');
    
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
    
    console.log('WebSocket service shut down complete');
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
    
    console.log('WebSocket service initialized with real-time infrastructure');
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