import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { safeLogger } from '../../utils/safeLogger';
import { createAdapter } from '@socket.io/redis-adapter';
import { redisService } from '../redisService';

// Import specialized services (now in the same directory)
import { WebSocketService } from './webSocketService';
import { AdminWebSocketService } from './adminWebSocketService';
import { SellerWebSocketService } from './sellerWebSocketService';
import { LiveChatSocketService } from './liveChatSocketService';
import { OrderWebSocketService } from './orderWebSocketService';

export class UnifiedWebSocketManager {
  private static instance: UnifiedWebSocketManager;
  private io: Server | null = null;
  
  // Service instances
  private webSocketService: WebSocketService | null = null;
  private adminWebSocketService: AdminWebSocketService | null = null;
  private sellerWebSocketService: SellerWebSocketService | null = null;
  private liveChatSocketService: LiveChatSocketService | null = null;
  private orderWebSocketService: OrderWebSocketService | null = null;

  private constructor() {}

  public static getInstance(): UnifiedWebSocketManager {
    if (!UnifiedWebSocketManager.instance) {
      UnifiedWebSocketManager.instance = new UnifiedWebSocketManager();
    }
    return UnifiedWebSocketManager.instance;
  }

  public initialize(httpServer: HttpServer, config: any): void {
    if (this.io) {
      safeLogger.warn('UnifiedWebSocketManager already initialized');
      return;
    }

    safeLogger.info('Initializing Unified WebSocket Manager...');

    // Create single Socket.IO instance
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
        methods: ['GET', 'POST'],
        credentials: true
      },
      path: '/socket.io',
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Setup Redis adapter for scaling if Redis is connected
    if (redisService.isRedisConnected()) {
      const pubClient = redisService.getClient();
      const subClient = pubClient.duplicate();
      this.io.adapter(createAdapter(pubClient, subClient));
      safeLogger.info('WebSocket Redis adapter configured');
    }

    // Initialize specialized services with the shared IO instance or namespaces
    this.initializeServices();

    // Global connection handler
    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });

    safeLogger.info('Unified WebSocket Manager initialized successfully');
  }

  private initializeServices(): void {
    if (!this.io) return;

    // Initialize specialized services
    // Note: These services likely need refactoring to accept an existing IO instance
    // For now, we assume they can be instantiated or we delegate to their singleton initialization logic
    // if refactored to support dependency injection.
    
    // Legacy services often create their own IO. We need to refactor them to accept 'this.io'.
    // Assuming we will refactor them next.
    
    /* 
       Example refactored initialization:
       this.webSocketService = new WebSocketService(this.io);
       this.adminWebSocketService = new AdminWebSocketService(this.io.of('/admin'));
    */
  }

  private handleConnection(socket: Socket): void {
    safeLogger.info(`New WebSocket connection: ${socket.id}`);
    
    // Route to appropriate services based on auth/query params
    // This is where "Instance Routing" happens
    
    socket.on('disconnect', () => {
      safeLogger.info(`WebSocket disconnected: ${socket.id}`);
    });
  }

  public getIO(): Server {
    if (!this.io) {
      throw new Error('UnifiedWebSocketManager not initialized');
    }
    return this.io;
  }
  
  public shutdown(): void {
    if (this.io) {
      this.io.close();
      this.io = null;
      safeLogger.info('UnifiedWebSocketManager shut down');
    }
  }
}

export const unifiedWebSocketManager = UnifiedWebSocketManager.getInstance();
