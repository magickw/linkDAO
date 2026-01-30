import { WebSocketClientService, initializeWebSocketClient, getWebSocketClient, shutdownWebSocketClient } from './webSocketClientService';
import { io, Socket } from 'socket.io-client';
import { ENV_CONFIG } from '@/config/environment';
import { enhancedAuthService } from './enhancedAuthService';

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
  lastPingTime: number;
  lastPongTime: number;
  missedPings: number;
  uptime: number;
}

interface ConnectionHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'disconnected';
  quality: number; // 0-100
  lastCheck: Date;
}

class WebSocketManager {
  private primaryConnection: WebSocketClientService | null = null;
  private liveChatConnection: Socket | null = null;
  private connections: Map<string, WebSocketClientService> = new Map();
  private metrics: Map<string, ConnectionMetrics> = new Map();
  private health: Map<string, ConnectionHealth> = new Map();
  private isShuttingDown = false;

  // Heartbeat configuration
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly HEALTH_CHECK_INTERVAL = 10000; // 10 seconds
  private readonly MAX_MISSED_PINGS = 3;
  private readonly CONNECTION_QUALITY_THRESHOLD = 50; // Below 50 is degraded

  // Connection pool for managing multiple feature connections
  private connectionPool: Map<string, {
    socket: Socket;
    subscribers: Set<string>;
    lastUsed: Date;
  }> = new Map();

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
      latency: 0,
      lastPingTime: 0,
      lastPongTime: 0,
      missedPings: 0,
      uptime: 0
    };

    const health: ConnectionHealth = {
      status: 'disconnected',
      quality: 100,
      lastCheck: new Date()
    };

    this.metrics.set(name, metrics);
    this.health.set(name, health);

    // Monitor connection events
    connection.on('connection_state_changed', (state: any) => {
      console.log(`WebSocket ${name} connection state changed:`, state);
      health.status = state.status || 'connected';
      health.lastCheck = new Date();
    });

    connection.on('error', (error: any) => {
      metrics.errorCount++;
      health.status = 'unhealthy';
      console.error(`WebSocket ${name} error:`, error);
    });

    // Start heartbeat for this connection
    this.startHeartbeat(name, connection);
  }

  // Setup monitoring for live chat connection
  private setupLiveChatMonitoring(): void {
    if (!this.liveChatConnection) return;

    const metrics: ConnectionMetrics = {
      connectTime: Date.now(),
      messageCount: 0,
      errorCount: 0,
      latency: 0,
      lastPingTime: 0,
      lastPongTime: 0,
      missedPings: 0,
      uptime: 0
    };

    const health: ConnectionHealth = {
      status: 'disconnected',
      quality: 100,
      lastCheck: new Date()
    };

    this.metrics.set('liveChat', metrics);
    this.health.set('liveChat', health);

    this.liveChatConnection.on('connect', () => {
      metrics.connectTime = Date.now();
      health.status = 'healthy';
      health.lastCheck = new Date();
      console.log('Live chat WebSocket connected');
    });

    this.liveChatConnection.on('disconnect', (reason) => {
      health.status = 'disconnected';
      console.log('Live chat WebSocket disconnected:', reason);
    });

    this.liveChatConnection.on('error', (error) => {
      metrics.errorCount++;
      health.status = 'unhealthy';
      console.error('Live chat WebSocket error:', error);
    });

    this.liveChatConnection.on('connect_error', (error) => {
      metrics.errorCount++;
      health.status = 'unhealthy';
      console.error('Live chat WebSocket connection error:', error);
    });

    // Setup heartbeat for live chat
    this.liveChatConnection.on('ping', () => {
      metrics.lastPingTime = Date.now();
      this.liveChatConnection?.emit('pong');
    });

    this.liveChatConnection.on('pong', () => {
      metrics.lastPongTime = Date.now();
      metrics.missedPings = 0;
      health.quality = 100;
    });

    // Start periodic health checks
    this.startHealthChecks();
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

  // Update live chat authentication and reconnect
  updateLiveChatAuth(token: string): void {
    if (this.liveChatConnection) {
      // Disconnect the old connection
      this.liveChatConnection.disconnect();

      // Update the auth token
      this.liveChatConnection.auth = { token };

      // Reconnect with the new token
      this.liveChatConnection.connect();
      console.log('Live chat WebSocket reconnected with new auth token');
    }
  }

  // Start heartbeat mechanism for a connection
  private startHeartbeat(name: string, connection: WebSocketClientService): void {
    // Send periodic pings to measure latency
    this.heartbeatInterval = setInterval(() => {
      const metrics = this.metrics.get(name);
      if (!metrics || !connection.isConnected()) return;

      metrics.lastPingTime = Date.now();
      
      // Measure latency by timing a simple operation
      const startTime = performance.now();
      connection.send('heartbeat', { timestamp: startTime }, (response: any) => {
        const endTime = performance.now();
        metrics.latency = endTime - startTime;
        metrics.lastPongTime = Date.now();
        metrics.missedPings = 0;

        // Update health based on latency
        const health = this.health.get(name);
        if (health) {
          health.quality = Math.max(0, 100 - (metrics.latency / 10)); // Degrade with latency
          health.status = health.quality >= this.CONNECTION_QUALITY_THRESHOLD ? 'healthy' : 'degraded';
          health.lastCheck = new Date();
        }
      });

      // Check for missed pings
      setTimeout(() => {
        if (Date.now() - metrics.lastPongTime > this.HEARTBEAT_INTERVAL) {
          metrics.missedPings++;
          const health = this.health.get(name);
          if (health) {
            health.status = metrics.missedPings >= this.MAX_MISSED_PINGS ? 'unhealthy' : 'degraded';
            health.quality = Math.max(0, 100 - (metrics.missedPings * 33));
          }
          
          // If too many missed pings, consider reconnecting
          if (metrics.missedPings >= this.MAX_MISSED_PINGS) {
            console.warn(`WebSocket ${name} missed ${metrics.missedPings} pings, reconnecting...`);
            this.reconnectPrimary();
          }
        }
      }, this.HEARTBEAT_INTERVAL * 0.5);

      // Update uptime
      metrics.uptime = Date.now() - metrics.connectTime;
    }, this.HEARTBEAT_INTERVAL);
  }

  // Start periodic health checks for all connections
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.health.forEach((health, name) => {
        const metrics = this.metrics.get(name);
        if (!metrics) return;

        // Calculate overall connection quality
        const errorRate = metrics.messageCount > 0 ? (metrics.errorCount / metrics.messageCount) * 100 : 0;
        const latencyScore = Math.max(0, 100 - (metrics.latency / 5)); // Latency up to 500ms
        const pingScore = Math.max(0, 100 - (metrics.missedPings * 25));

        health.quality = (latencyScore + pingScore) / 2;
        health.status = health.quality >= this.CONNECTION_QUALITY_THRESHOLD ? 'healthy' :
                     health.quality >= 25 ? 'degraded' : 'unhealthy';
        health.lastCheck = new Date();

        // Log degraded connections
        if (health.status !== 'healthy') {
          console.warn(`WebSocket ${name} health: ${health.status} (quality: ${health.quality.toFixed(1)}%)`);
        }
      });
    }, this.HEALTH_CHECK_INTERVAL);
  }

  // Get connection health status
  getHealthStatus(): Map<string, ConnectionHealth> {
    return new Map(this.health);
  }

  // Get pooled connections
  getPooledConnections(): Map<string, string[]> {
    const result = new Map<string, string[]>();
    this.connectionPool.forEach((pool, name) => {
      result.set(name, Array.from(pool.subscribers));
    });
    return result;
  }

  // Add subscriber to pooled connection
  addPoolSubscriber(connectionName: string, subscriberId: string): void {
    const pool = this.connectionPool.get(connectionName);
    if (pool) {
      pool.subscribers.add(subscriberId);
      pool.lastUsed = new Date();
    }
  }

  // Remove subscriber from pooled connection
  removePoolSubscriber(connectionName: string, subscriberId: string): void {
    const pool = this.connectionPool.get(connectionName);
    if (pool) {
      pool.subscribers.delete(subscriberId);
      
      // Clean up empty connections after timeout
      if (pool.subscribers.size === 0) {
        setTimeout(() => {
          const currentPool = this.connectionPool.get(connectionName);
          if (currentPool && currentPool.subscribers.size === 0) {
            currentPool.socket.disconnect();
            this.connectionPool.delete(connectionName);
            console.log(`Closed unused pooled connection: ${connectionName}`);
          }
        }, 60000); // Wait 1 minute before cleanup
      }
    }
  }

  // Get or create pooled connection for a feature
  async getPooledConnection(feature: string, options?: any): Promise<Socket> {
    let pool = this.connectionPool.get(feature);
    
    if (pool && pool.socket.connected) {
      pool.lastUsed = new Date();
      return pool.socket;
    }

    // Create new connection
    const backendUrl = ENV_CONFIG.BACKEND_URL || 'http://localhost:10000';
    const authToken = enhancedAuthService.getAuthToken();
    
    const socket = io(`${backendUrl}/${feature}`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      auth: { token: authToken },
      ...options
    });

    // Setup monitoring
    socket.on('connect', () => {
      const metrics: ConnectionMetrics = {
        connectTime: Date.now(),
        messageCount: 0,
        errorCount: 0,
        latency: 0,
        lastPingTime: 0,
        lastPongTime: 0,
        missedPings: 0,
        uptime: 0
      };
      this.metrics.set(feature, metrics);

      const health: ConnectionHealth = {
        status: 'healthy',
        quality: 100,
        lastCheck: new Date()
      };
      this.health.set(feature, health);

      console.log(`Pooled WebSocket connected: ${feature}`);
    });

    socket.on('error', (error) => {
      const metrics = this.metrics.get(feature);
      if (metrics) {
        metrics.errorCount++;
      }
      const health = this.health.get(feature);
      if (health) {
        health.status = 'unhealthy';
      }
      console.error(`Pooled WebSocket error (${feature}):`, error);
    });

    this.connectionPool.set(feature, {
      socket,
      subscribers: new Set(),
      lastUsed: new Date()
    });

    return socket;
  }

  // Shutdown cleanup - clear intervals
  override shutdown(): void {
    this.isShuttingDown = true;
    console.log('Shutting down WebSocketManager...');

    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Shutdown pooled connections
    this.connectionPool.forEach((pool, name) => {
      pool.socket.disconnect();
      console.log(`Shutdown pooled connection: ${name}`);
    });
    this.connectionPool.clear();

    // Call parent shutdown
    super.shutdown();
  }
}

// Export singleton instance
export const webSocketManager = WebSocketManager.getInstance();

// Helper function to initialize WebSocketManager with default config
export const initializeWebSocketManager = async (walletAddress: string): Promise<WebSocketManager> => {
  const backendUrl = ENV_CONFIG.BACKEND_URL || 'http://localhost:10000';
  // Socket.IO client handles protocol upgrade (HTTP -> WS), so we use the HTTP URL
  const authToken = enhancedAuthService.getAuthToken();

  const config: WebSocketConfig = {
    primary: {
      url: backendUrl,
      walletAddress,
      autoReconnect: true,
      reconnectAttempts: 10,
      reconnectDelay: 1000
    },
    liveChat: {
      url: backendUrl, // Use root namespace as configured in backend
      options: {
        auth: {
          token: authToken
        }
      }
    }
  };

  await webSocketManager.initialize(config);
  return webSocketManager;
};

export default WebSocketManager;