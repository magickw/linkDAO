import { WebSocketClientService, initializeWebSocketClient, getWebSocketClient, shutdownWebSocketClient } from './webSocketClientService';
import { io, Socket } from 'socket.io-client';
import { ENV_CONFIG } from '@/config/environment';

interface WebSocketConfig {
  primary: {
    url: string;
    walletAddress: string;
    autoReconnect: boolean;
    reconnectAttempts: number;
    reconnectDelay: number;
  };
  liveChat?: {
    url: string;
    options?: any;
  };
}

interface ConnectionMetrics {
  connectTime: number;
  messageCount: number;
  errorCount: number;
  latency: number;
}

class WebSocketManager {
  private primaryConnection: WebSocketClientService | null = null;
  private liveChatConnection: Socket | null = null;
  private connections: Map<string, WebSocketClientService> = new Map();
  private metrics: Map<string, ConnectionMetrics> = new Map();
  private isShuttingDown = false;

  // Singleton pattern
  private static instance: WebSocketManager;

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  // Primary connection for general app functionality
  getPrimaryConnection(): WebSocketClientService | null {
    return this.primaryConnection;
  }

  // Live chat connection (separate for performance isolation)
  getLiveChatConnection(): Socket | null {
    return this.liveChatConnection;
  }

  // Initialize all connections
  async initialize(config: WebSocketConfig): Promise<void> {
    if (this.isShuttingDown) {
      console.warn('Cannot initialize WebSocketManager while shutting down');
      return;
    }

    try {
      // Initialize primary connection
      this.primaryConnection = initializeWebSocketClient(config.primary);
      this.setupConnectionMonitoring('primary', this.primaryConnection);

      // Initialize live chat connection separately if configured
      if (config.liveChat) {
        this.liveChatConnection = io(config.liveChat.url, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
          ...config.liveChat.options
        });
        
        this.setupLiveChatMonitoring();
      }

      console.log('WebSocketManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WebSocketManager:', error);
      throw error;
    }
  }

  // Setup monitoring for primary connection
  private setupConnectionMonitoring(name: string, connection: WebSocketClientService): void {
    const metrics: ConnectionMetrics = {
      connectTime: Date.now(),
      messageCount: 0,
      errorCount: 0,
      latency: 0
    };

    this.metrics.set(name, metrics);

    // Monitor connection events
    connection.on('connection_state_changed', (state: any) => {
      console.log(`WebSocket ${name} connection state changed:`, state);
    });

    connection.on('error', (error: any) => {
      metrics.errorCount++;
      console.error(`WebSocket ${name} error:`, error);
    });
  }

  // Setup monitoring for live chat connection
  private setupLiveChatMonitoring(): void {
    if (!this.liveChatConnection) return;

    const metrics: ConnectionMetrics = {
      connectTime: Date.now(),
      messageCount: 0,
      errorCount: 0,
      latency: 0
    };

    this.metrics.set('liveChat', metrics);

    this.liveChatConnection.on('connect', () => {
      metrics.connectTime = Date.now();
      console.log('Live chat WebSocket connected');
    });

    this.liveChatConnection.on('disconnect', (reason) => {
      console.log('Live chat WebSocket disconnected:', reason);
    });

    this.liveChatConnection.on('error', (error) => {
      metrics.errorCount++;
      console.error('Live chat WebSocket error:', error);
    });

    this.liveChatConnection.on('connect_error', (error) => {
      metrics.errorCount++;
      console.error('Live chat WebSocket connection error:', error);
    });
  }

  // Cleanup all connections
  shutdown(): void {
    this.isShuttingDown = true;
    console.log('Shutting down WebSocketManager...');

    try {
      // Shutdown primary connection
      shutdownWebSocketClient();
      this.primaryConnection = null;

      // Shutdown live chat connection
      if (this.liveChatConnection) {
        this.liveChatConnection.disconnect();
        this.liveChatConnection = null;
      }

      // Clear connections map
      this.connections.clear();

      // Clear metrics
      this.metrics.clear();

      console.log('WebSocketManager shutdown completed');
    } catch (error) {
      console.error('Error during WebSocketManager shutdown:', error);
    } finally {
      this.isShuttingDown = false;
    }
  }

  // Get connection metrics
  getMetrics(): Map<string, ConnectionMetrics> {
    return new Map(this.metrics);
  }

  // Check if manager is initialized
  isInitialized(): boolean {
    return this.primaryConnection !== null;
  }

  // Reconnect primary connection
  async reconnectPrimary(): Promise<void> {
    if (this.primaryConnection) {
      try {
        await this.primaryConnection.connect();
      } catch (error) {
        console.error('Failed to reconnect primary WebSocket:', error);
        throw error;
      }
    }
  }

  // Reconnect live chat connection
  reconnectLiveChat(): void {
    if (this.liveChatConnection) {
      this.liveChatConnection.connect();
    }
  }
}

// Export singleton instance
export const webSocketManager = WebSocketManager.getInstance();

// Helper function to initialize WebSocketManager with default config
export const initializeWebSocketManager = async (walletAddress: string): Promise<WebSocketManager> => {
  const backendUrl = ENV_CONFIG.BACKEND_URL || 'http://localhost:10000';
  const wsUrl = backendUrl.replace(/^http/, 'ws');
  
  const config: WebSocketConfig = {
    primary: {
      url: wsUrl,
      walletAddress,
      autoReconnect: true,
      reconnectAttempts: 10,
      reconnectDelay: 1000
    },
    liveChat: {
      url: `${wsUrl}/chat/user`
    }
  };

  await webSocketManager.initialize(config);
  return webSocketManager;
};

export default WebSocketManager;