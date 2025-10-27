import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import http from 'http';

interface AdminUser {
  adminId: string;
  email: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'analyst';
  permissions: string[];
}

interface BroadcastMessage {
  event: string;
  data: any;
  roomFilters?: string[];
  timestamp: number;
}

interface WebSocketMetrics {
  totalConnections: number;
  connectionsByRole: Record<string, number>;
  messagesSent: number;
  messagesReceived: number;
  errors: number;
  uptime: number;
}

const MAX_CONNECTIONS_PER_INSTANCE = parseInt(process.env.MAX_WS_CONNECTIONS || '5000');
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_PUBLISH_CHANNEL = 'admin_websocket_broadcast';

/**
 * Scalable WebSocket Manager with Redis Pub/Sub for multi-instance support
 */
export class ScalableWebSocketManager {
  private io: SocketIOServer;
  private pubClient: Redis;
  private subClient: Redis;
  private connectedClients: Map<string, AdminUser>;
  private metrics: WebSocketMetrics;
  private startTime: number;

  constructor(httpServer: http.Server) {
    this.connectedClients = new Map();
    this.startTime = Date.now();
    this.metrics = {
      totalConnections: 0,
      connectionsByRole: {},
      messagesSent: 0,
      messagesReceived: 0,
      errors: 0,
      uptime: 0,
    };

    // Initialize Redis clients for pub/sub
    this.pubClient = new Redis(REDIS_URL, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.subClient = new Redis(REDIS_URL, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    // Initialize Socket.IO with Redis adapter
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3006',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6, // 1MB
      allowEIO3: true,
    });

    // Set up Redis adapter for multi-instance support
    this.io.adapter(createAdapter(this.pubClient, this.subClient));

    // Set up Redis pub/sub listener for cross-instance broadcasts
    this.setupRedisPubSub();

    // Set up Socket.IO event handlers
    this.setupSocketHandlers();

    console.log('Scalable WebSocket Manager initialized with Redis adapter');
  }

  /**
   * Set up Redis pub/sub for cross-instance communication
   */
  private setupRedisPubSub() {
    this.subClient.subscribe(REDIS_PUBLISH_CHANNEL, (err) => {
      if (err) {
        console.error('Failed to subscribe to Redis channel:', err);
      } else {
        console.log(`Subscribed to Redis channel: ${REDIS_PUBLISH_CHANNEL}`);
      }
    });

    this.subClient.on('message', (channel, message) => {
      if (channel === REDIS_PUBLISH_CHANNEL) {
        try {
          const broadcast: BroadcastMessage = JSON.parse(message);
          this.handleBroadcastMessage(broadcast);
        } catch (error) {
          console.error('Error parsing broadcast message:', error);
        }
      }
    });
  }

  /**
   * Handle broadcast messages from Redis
   */
  private handleBroadcastMessage(broadcast: BroadcastMessage) {
    const { event, data, roomFilters } = broadcast;

    if (roomFilters && roomFilters.length > 0) {
      // Broadcast to specific rooms
      roomFilters.forEach(room => {
        this.io.to(room).emit(event, data);
      });
    } else {
      // Broadcast to all connected clients
      this.io.emit(event, data);
    }

    this.metrics.messagesSent++;
  }

  /**
   * Set up Socket.IO connection handlers
   */
  private setupSocketHandlers() {
    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });

    this.io.on('error', (error) => {
      console.error('Socket.IO error:', error);
      this.metrics.errors++;
    });
  }

  /**
   * Handle new client connection
   */
  private async handleConnection(socket: Socket) {
    try {
      // Authenticate the connection
      const adminUser = await this.authenticateSocket(socket);
      
      if (!adminUser) {
        socket.emit('error', { message: 'Authentication failed' });
        socket.disconnect();
        return;
      }

      // Store client info
      this.connectedClients.set(socket.id, adminUser);
      this.metrics.totalConnections++;
      this.metrics.connectionsByRole[adminUser.role] = 
        (this.metrics.connectionsByRole[adminUser.role] || 0) + 1;

      console.log(`Admin connected: ${adminUser.email} (${adminUser.role})`);

      // Join role-based room
      socket.join(`role:${adminUser.role}`);
      
      // Join admin-specific room
      socket.join(`admin:${adminUser.adminId}`);

      // Send connection success
      socket.emit('connected', {
        message: 'WebSocket connection established',
        adminId: adminUser.adminId,
        role: adminUser.role,
      });

      // Set up event handlers for this socket
      this.setupSocketEventHandlers(socket, adminUser);

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket, adminUser);
      });

    } catch (error) {
      console.error('Connection handling error:', error);
      this.metrics.errors++;
      socket.disconnect();
    }
  }

  /**
   * Authenticate socket connection
   */
  private async authenticateSocket(socket: Socket): Promise<AdminUser | null> {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return null;
      }

      // Verify JWT token (simplified - implement proper JWT verification)
      // In production, use proper JWT verification with your auth service
      const adminUser: AdminUser = {
        adminId: socket.handshake.auth.adminId,
        email: socket.handshake.auth.email,
        role: socket.handshake.auth.role || 'admin',
        permissions: socket.handshake.auth.permissions || [],
      };

      return adminUser;
    } catch (error) {
      console.error('Socket authentication error:', error);
      return null;
    }
  }

  /**
   * Set up event handlers for authenticated socket
   */
  private setupSocketEventHandlers(socket: Socket, adminUser: AdminUser) {
    // Subscribe to dashboard updates
    socket.on('subscribe:dashboard', () => {
      socket.join('dashboard_updates');
      socket.emit('subscribed', { topic: 'dashboard' });
    });

    // Subscribe to moderation updates
    socket.on('subscribe:moderation', () => {
      socket.join('moderation_updates');
      socket.emit('subscribed', { topic: 'moderation' });
    });

    // Subscribe to analytics updates
    socket.on('subscribe:analytics', () => {
      socket.join('analytics_updates');
      socket.emit('subscribed', { topic: 'analytics' });
    });

    // Handle custom events
    socket.on('admin:action', (data) => {
      this.metrics.messagesReceived++;
      this.handleAdminAction(socket, adminUser, data);
    });

    // Ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
  }

  /**
   * Handle admin actions via WebSocket
   */
  private handleAdminAction(socket: Socket, adminUser: AdminUser, data: any) {
    console.log(`Admin action from ${adminUser.email}:`, data.action);
    
    // Emit confirmation
    socket.emit('action:acknowledged', {
      action: data.action,
      timestamp: Date.now(),
    });

    // Broadcast to other admins if needed
    if (data.broadcast) {
      this.broadcastToAdmins(data.action, data.payload, {
        excludeSocketId: socket.id,
      });
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(socket: Socket, adminUser: AdminUser) {
    console.log(`Admin disconnected: ${adminUser.email}`);
    
    this.connectedClients.delete(socket.id);
    this.metrics.totalConnections--;
    this.metrics.connectionsByRole[adminUser.role]--;
  }

  /**
   * Broadcast message to all admins across all server instances
   */
  async broadcastToAdmins(
    event: string,
    data: any,
    options?: { roomFilters?: string[]; excludeSocketId?: string }
  ): Promise<void> {
    try {
      const broadcast: BroadcastMessage = {
        event,
        data,
        roomFilters: options?.roomFilters,
        timestamp: Date.now(),
      };

      // Publish to Redis for cross-instance broadcast
      await this.pubClient.publish(
        REDIS_PUBLISH_CHANNEL,
        JSON.stringify(broadcast)
      );

      // Also emit locally
      if (options?.excludeSocketId) {
        this.io.except(options.excludeSocketId).emit(event, data);
      } else {
        this.io.emit(event, data);
      }

      this.metrics.messagesSent++;
    } catch (error) {
      console.error('Broadcast error:', error);
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Send message to specific admin
   */
  async sendToAdmin(adminId: string, event: string, data: any): Promise<void> {
    this.io.to(`admin:${adminId}`).emit(event, data);
    this.metrics.messagesSent++;
  }

  /**
   * Send message to admins with specific role
   */
  async sendToRole(role: string, event: string, data: any): Promise<void> {
    this.io.to(`role:${role}`).emit(event, data);
    this.metrics.messagesSent++;
  }

  /**
   * Get current metrics
   */
  getMetrics(): WebSocketMetrics {
    this.metrics.uptime = Math.floor((Date.now() - this.startTime) / 1000);
    return { ...this.metrics };
  }

  /**
   * Health check endpoint handler
   */
  getHealthStatus(): {
    healthy: boolean;
    connections: number;
    maxConnections: number;
    uptime: number;
    redisConnected: boolean;
  } {
    const isHealthy = 
      this.connectedClients.size < MAX_CONNECTIONS_PER_INSTANCE &&
      this.pubClient.status === 'ready' &&
      this.subClient.status === 'ready';

    return {
      healthy: isHealthy,
      connections: this.connectedClients.size,
      maxConnections: MAX_CONNECTIONS_PER_INSTANCE,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      redisConnected: this.pubClient.status === 'ready',
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down WebSocket manager...');
    
    // Disconnect all clients
    this.io.disconnectSockets();
    
    // Close Redis connections
    await this.pubClient.quit();
    await this.subClient.quit();
    
    // Close Socket.IO server
    this.io.close();
    
    console.log('WebSocket manager shut down successfully');
  }
}

// Export singleton instance (will be initialized in main server file)
let wsManager: ScalableWebSocketManager | null = null;

export function initializeWebSocketManager(httpServer: http.Server): ScalableWebSocketManager {
  if (!wsManager) {
    wsManager = new ScalableWebSocketManager(httpServer);
  }
  return wsManager;
}

export function getWebSocketManager(): ScalableWebSocketManager {
  if (!wsManager) {
    throw new Error('WebSocket manager not initialized');
  }
  return wsManager;
}
