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
  reconnectAttempts: number;
  lastReconnectAttempt?: Date;
}

export class EnhancedWebSocketService {
  private io: Server;
  private connectedUsers: Map<string, WebSocketUser> = new Map();
  private userSockets: Map<string, Set<string>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectionTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds

  constructor(httpServer: HttpServer) {
    const allowedOrigins = this.getAllowedOrigins();

    this.io = new Server(httpServer, {
      cors: {
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
          // Allow requests with no origin (mobile apps, curl, etc.)
          if (!origin) return callback(null, true);
          
          if (allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            safeLogger.warn(`WebSocket connection blocked from origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
          }
        },
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling'],
      allowEIO3: true, // Allow Engine.IO v3 clients
      connectTimeout: 45000,
      upgradeTimeout: 10000
    });

    this.setupEventHandlers();
    this.startHeartbeat();
    this.setupErrorHandling();
  }

  private getAllowedOrigins(): string[] {
    const frontendUrls = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [];
    return [
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
  }

  private setupErrorHandling() {
    this.io.engine.on("connection_error", (err) => {
      safeLogger.error("WebSocket connection error:", {
        message: err.message,
        description: err.description,
        context: err.context,
        type: err.type
      });
    });

    // Handle server-level errors
    this.io.on('error', (error) => {
      safeLogger.error('WebSocket server error:', error);
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      safeLogger.info(`WebSocket client connected: ${socket.id} from ${socket.handshake.address}`);

      // Set up error handling for this socket
      socket.on('error', (error) => {
        safeLogger.error(`Socket error for ${socket.id}:`, error);
      });

      // Handle connection errors
      socket.on('connect_error', (error) => {
        safeLogger.error(`Connection error for ${socket.id}:`, error);
      });

      // Handle user authentication with enhanced error handling
      socket.on('authenticate', async (data: { walletAddress: string; reconnecting?: boolean }) => {
        try {
          const { walletAddress, reconnecting = false } = data;
          
          if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            socket.emit('auth_error', { 
              message: 'Valid wallet address required',
              code: 'INVALID_WALLET_ADDRESS'
            });
            return;
          }

          // Clear any existing reconnection timeout
          if (this.reconnectionTimeouts.has(walletAddress)) {
            clearTimeout(this.reconnectionTimeouts.get(walletAddress)!);
            this.reconnectionTimeouts.delete(walletAddress);
          }

          // Create or update user connection
          const existingUser = Array.from(this.connectedUsers.values())
            .find(u => u.walletAddress === walletAddress);

          const user: WebSocketUser = {
            userId: walletAddress,
            walletAddress,
            socketId: socket.id,
            connectedAt: existingUser?.connectedAt || new Date(),
            lastSeen: new Date(),
            subscriptions: existingUser?.subscriptions || new Set(),
            connectionState: 'connected',
            reconnectAttempts: reconnecting ? (existingUser?.reconnectAttempts || 0) + 1 : 0,
            lastReconnectAttempt: reconnecting ? new Date() : undefined
          };

          this.connectedUsers.set(socket.id, user);

          // Track multiple sockets per user
          if (!this.userSockets.has(walletAddress)) {
            this.userSockets.set(walletAddress, new Set());
          }
          this.userSockets.get(walletAddress)!.add(socket.id);

          // Join user-specific room
          await socket.join(`user:${walletAddress}`);

          // Send authentication success response
          socket.emit('authenticated', { 
            message: 'Successfully authenticated',
            connectedUsers: this.connectedUsers.size,
            reconnecting,
            reconnectAttempts: user.reconnectAttempts,
            subscriptions: Array.from(user.subscriptions),
            serverTime: new Date().toISOString()
          });

          // Broadcast user online status (only if first connection)
          if (this.userSockets.get(walletAddress)!.size === 1) {
            this.broadcastUserStatus(walletAddress, 'online');
          }

          safeLogger.info(`User authenticated: ${walletAddress} (${socket.id}) - Reconnecting: ${reconnecting}, Attempts: ${user.reconnectAttempts}`);

        } catch (error) {
          safeLogger.error('Authentication error:', error);
          socket.emit('auth_error', { 
            message: 'Authentication failed',
            code: 'AUTH_FAILED',
            details: error.message
          });
        }
      });

      // Handle subscription with error handling
      socket.on('subscribe', (data: { 
        type: 'feed' | 'community' | 'conversation' | 'user' | 'global';
        target: string;
      }) => {
        try {
          const user = this.connectedUsers.get(socket.id);
          if (!user) {
            socket.emit('subscription_error', { 
              message: 'User not authenticated',
              code: 'NOT_AUTHENTICATED'
            });
            return;
          }

          const subscriptionId = `${user.walletAddress}_${data.type}_${data.target}_${Date.now()}`;
          user.subscriptions.add(subscriptionId);

          // Join appropriate room
          this.joinSubscriptionRoom(socket, data.type, data.target);

          socket.emit('subscribed', { 
            subscriptionId,
            type: data.type,
            target: data.target,
            timestamp: new Date().toISOString()
          });

          safeLogger.debug(`User ${user.walletAddress} subscribed to ${data.type}:${data.target}`);

        } catch (error) {
          safeLogger.error('Subscription error:', error);
          socket.emit('subscription_error', { 
            message: 'Subscription failed',
            code: 'SUBSCRIPTION_FAILED',
            details: error.message
          });
        }
      });

      // Handle unsubscribe
      socket.on('unsubscribe', (data: { subscriptionId: string }) => {
        try {
          const user = this.connectedUsers.get(socket.id);
          if (!user) {
            socket.emit('subscription_error', { 
              message: 'User not authenticated',
              code: 'NOT_AUTHENTICATED'
            });
            return;
          }

          user.subscriptions.delete(data.subscriptionId);
          socket.emit('unsubscribed', { 
            subscriptionId: data.subscriptionId,
            timestamp: new Date().toISOString()
          });

        } catch (error) {
          safeLogger.error('Unsubscribe error:', error);
          socket.emit('subscription_error', { 
            message: 'Unsubscribe failed',
            code: 'UNSUBSCRIBE_FAILED',
            details: error.message
          });
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

      // Enhanced disconnect handling
      socket.on('disconnect', (reason) => {
        try {
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
                this.scheduleUserCleanup(user.walletAddress, reason);
              }
            }

            safeLogger.info(`User disconnected: ${user.walletAddress} (${socket.id}) - Reason: ${reason}`);
          }

          // Clean up user data
          this.connectedUsers.delete(socket.id);

        } catch (error) {
          safeLogger.error('Disconnect handling error:', error);
        }
      });

      // Handle reconnection attempts
      socket.on('reconnect_attempt', (data: { walletAddress: string; attempt: number }) => {
        safeLogger.info(`Reconnection attempt ${data.attempt} for ${data.walletAddress}`);
      });
    });
  }

  private joinSubscriptionRoom(socket: any, type: string, target: string) {
    try {
      switch (type) {
        case 'feed':
          socket.join('feed');
          break;
        case 'community':
          socket.join(`community:${target}`);
          break;
        case 'conversation':
          socket.join(`conversation:${target}`);
          break;
        case 'user':
          socket.join(`user:${target}`);
          break;
        case 'global':
          socket.join('global');
          break;
        default:
          safeLogger.warn(`Unknown subscription type: ${type}`);
      }
    } catch (error) {
      safeLogger.error('Error joining subscription room:', error);
    }
  }

  private scheduleUserCleanup(walletAddress: string, reason?: string) {
    // Don't immediately mark as offline for certain disconnect reasons
    const gracefulReasons = ['transport close', 'client namespace disconnect'];
    const delay = gracefulReasons.includes(reason || '') ? 5000 : 1000;

    const timeout = setTimeout(() => {
      // Check if user has reconnected
      if (!this.userSockets.has(walletAddress) || this.userSockets.get(walletAddress)!.size === 0) {
        this.broadcastUserStatus(walletAddress, 'offline');
        this.userSockets.delete(walletAddress);
        this.reconnectionTimeouts.delete(walletAddress);
      }
    }, delay);

    this.reconnectionTimeouts.set(walletAddress, timeout);
  }

  private broadcastUserStatus(walletAddress: string, status: 'online' | 'offline') {
    try {
      this.io.emit('user_status_change', {
        walletAddress,
        status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error broadcasting user status:', error);
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      try {
        const now = new Date();
        const staleThreshold = 5 * 60 * 1000; // 5 minutes

        // Check for stale connections
        for (const [socketId, user] of this.connectedUsers.entries()) {
          if (now.getTime() - user.lastSeen.getTime() > staleThreshold) {
            safeLogger.warn(`Removing stale connection for user ${user.walletAddress}`);
            this.connectedUsers.delete(socketId);
            
            // Clean up user sockets
            if (this.userSockets.has(user.walletAddress)) {
              this.userSockets.get(user.walletAddress)!.delete(socketId);
              if (this.userSockets.get(user.walletAddress)!.size === 0) {
                this.userSockets.delete(user.walletAddress);
                this.broadcastUserStatus(user.walletAddress, 'offline');
              }
            }
          }
        }

        // Emit heartbeat to all connected clients
        this.io.emit('heartbeat', {
          timestamp: now.toISOString(),
          connectedUsers: this.connectedUsers.size
        });

      } catch (error) {
        safeLogger.error('Heartbeat error:', error);
      }
    }, 30000); // Every 30 seconds
  }

  // Public methods for broadcasting messages
  public broadcastToUser(walletAddress: string, event: string, data: any) {
    try {
      this.io.to(`user:${walletAddress}`).emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error(`Error broadcasting to user ${walletAddress}:`, error);
    }
  }

  public sendToUser(walletAddress: string, event: string, data: any, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium') {
    // For now, we'll just use broadcastToUser since we don't have priority handling in socket.io
    // In a more advanced implementation, you could use different rooms or channels based on priority
    return this.broadcastToUser(walletAddress, event, data);
  }

  public broadcastToCommunity(communityId: string, event: string, data: any) {
    try {
      this.io.to(`community:${communityId}`).emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error(`Error broadcasting to community ${communityId}:`, error);
    }
  }

  public broadcastGlobal(event: string, data: any) {
    try {
      this.io.emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error broadcasting globally:', error);
    }
  }

  // Get connection statistics
  public getStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      totalSockets: this.io.sockets.sockets.size,
      uniqueUsers: this.userSockets.size,
      reconnectionTimeouts: this.reconnectionTimeouts.size
    };
  }

  // Graceful shutdown
  public async shutdown() {
    try {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }

      // Clear all reconnection timeouts
      for (const timeout of this.reconnectionTimeouts.values()) {
        clearTimeout(timeout);
      }
      this.reconnectionTimeouts.clear();

      // Notify all clients of shutdown
      this.io.emit('server_shutdown', {
        message: 'Server is shutting down',
        timestamp: new Date().toISOString()
      });

      // Close all connections
      this.io.close();
      
      safeLogger.info('WebSocket service shut down gracefully');
    } catch (error) {
      safeLogger.error('Error during WebSocket shutdown:', error);
    }
  }
}

// Export singleton instance
let webSocketService: EnhancedWebSocketService | null = null;

export function initializeEnhancedWebSocket(httpServer: HttpServer): EnhancedWebSocketService {
  if (!webSocketService) {
    webSocketService = new EnhancedWebSocketService(httpServer);
  }
  return webSocketService;
}

export function getWebSocketService(): EnhancedWebSocketService | null {
  return webSocketService;
}

export function shutdownEnhancedWebSocket() {
  if (webSocketService) {
    webSocketService.shutdown();
    webSocketService = null;
  }
}