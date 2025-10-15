/**
 * WebSocket connection manager for efficient real-time updates
 * Manages multiple WebSocket connections and optimizes resource usage
 */

import { WebSocketClientService, initializeWebSocketClient, getWebSocketClient } from './webSocketClientService';

interface ConnectionPool {
  primary: WebSocketClientService | null;
  secondary: WebSocketClientService | null;
  backup: WebSocketClientService | null;
}

interface ConnectionConfig {
  primaryUrl: string;
  secondaryUrl?: string;
  backupUrl?: string;
  walletAddress: string;
  maxConnections: number;
  loadBalancing: boolean;
  failoverEnabled: boolean;
  healthCheckInterval: number;
}

interface ConnectionHealth {
  url: string;
  isConnected: boolean;
  latency: number;
  lastPing: Date;
  errorCount: number;
  reconnectAttempts: number;
}

interface SubscriptionDistribution {
  connectionId: 'primary' | 'secondary' | 'backup';
  subscriptionCount: number;
  load: number;
}

export class WebSocketConnectionManager {
  private static instance: WebSocketConnectionManager;
  private connectionPool: ConnectionPool = {
    primary: null,
    secondary: null,
    backup: null
  };
  private config!: ConnectionConfig;
  private healthStatus: Map<string, ConnectionHealth> = new Map();
  private subscriptionDistribution: Map<string, SubscriptionDistribution> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isActive = false;

  // Event listeners
  private listeners: Map<string, Set<Function>> = new Map();

  // Load balancing
  private currentConnectionIndex = 0;
  private subscriptionCounts: Map<string, number> = new Map();

  static getInstance(): WebSocketConnectionManager {
    if (!WebSocketConnectionManager.instance) {
      WebSocketConnectionManager.instance = new WebSocketConnectionManager();
    }
    return WebSocketConnectionManager.instance;
  }

  /**
   * Initialize connection manager
   */
  initialize(config: ConnectionConfig): void {
    this.config = config;
    console.log('Initializing WebSocket connection manager');
  }

  /**
   * Start connection manager
   */
  async start(): Promise<void> {
    if (this.isActive) return;
    
    this.isActive = true;
    console.log('Starting WebSocket connection manager');

    try {
      // Initialize primary connection
      await this.initializePrimaryConnection();

      // Initialize secondary connections if configured
      if (this.config.secondaryUrl && this.config.maxConnections > 1) {
        await this.initializeSecondaryConnection();
      }

      if (this.config.backupUrl && this.config.maxConnections > 2) {
        await this.initializeBackupConnection();
      }

      // Start health monitoring
      this.startHealthMonitoring();

      this.emit('manager_started', { connectionCount: this.getActiveConnectionCount() });
    } catch (error) {
      console.error('Error starting connection manager:', error);
      this.emit('manager_error', { error });
    }
  }

  /**
   * Stop connection manager
   */
  stop(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    console.log('Stopping WebSocket connection manager');

    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Disconnect all connections
    Object.values(this.connectionPool).forEach(connection => {
      if (connection) {
        connection.disconnect();
      }
    });

    // Clear connection pool
    this.connectionPool = {
      primary: null,
      secondary: null,
      backup: null
    };

    // Clear health status
    this.healthStatus.clear();
    this.subscriptionDistribution.clear();
    this.subscriptionCounts.clear();

    this.emit('manager_stopped');
  }

  /**
   * Get optimal connection for new subscription
   */
  getOptimalConnection(): WebSocketClientService | null {
    if (!this.config.loadBalancing) {
      // Use primary connection if load balancing is disabled
      return this.connectionPool.primary;
    }

    // Find connection with lowest load
    let optimalConnection: WebSocketClientService | null = null;
    let lowestLoad = Infinity;

    Object.entries(this.connectionPool).forEach(([key, connection]) => {
      if (connection && connection.isConnected()) {
        const subscriptionCount = this.subscriptionCounts.get(key) || 0;
        if (subscriptionCount < lowestLoad) {
          lowestLoad = subscriptionCount;
          optimalConnection = connection;
        }
      }
    });

    return optimalConnection || this.connectionPool.primary;
  }

  /**
   * Subscribe with automatic connection selection
   */
  subscribe(
    type: 'feed' | 'community' | 'conversation' | 'user' | 'global',
    target: string,
    filters?: any
  ): { subscriptionId: string; connectionId: string } | null {
    const connection = this.getOptimalConnection();
    if (!connection) {
      console.error('No available connections for subscription');
      return null;
    }

    const subscriptionId = connection.subscribe(type, target, filters);
    const connectionId = this.getConnectionId(connection);

    // Update subscription count
    const currentCount = this.subscriptionCounts.get(connectionId) || 0;
    this.subscriptionCounts.set(connectionId, currentCount + 1);

    // Update distribution tracking
    this.updateSubscriptionDistribution(connectionId, subscriptionId);

    console.log(`Subscribed to ${type}:${target} on ${connectionId} connection`);

    return { subscriptionId, connectionId };
  }

  /**
   * Unsubscribe from specific connection
   */
  unsubscribe(subscriptionId: string, connectionId: string): void {
    const connection = this.getConnectionById(connectionId);
    if (connection) {
      connection.unsubscribe(subscriptionId);
      
      // Update subscription count
      const currentCount = this.subscriptionCounts.get(connectionId) || 0;
      this.subscriptionCounts.set(connectionId, Math.max(0, currentCount - 1));

      // Remove from distribution tracking
      this.subscriptionDistribution.delete(subscriptionId);

      console.log(`Unsubscribed ${subscriptionId} from ${connectionId} connection`);
    }
  }

  /**
   * Send message through optimal connection
   */
  send(event: string, data: any, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'): void {
    const connection = this.getOptimalConnection();
    if (connection) {
      connection.send(event, data, priority);
    } else {
      console.error('No available connections for sending message');
    }
  }

  /**
   * Broadcast message to all connections
   */
  broadcast(event: string, data: any): void {
    Object.values(this.connectionPool).forEach(connection => {
      if (connection && connection.isConnected()) {
        connection.send(event, data);
      }
    });
  }

  /**
   * Get connection health status
   */
  getHealthStatus(): Map<string, ConnectionHealth> {
    return new Map(this.healthStatus);
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    activeConnections: number;
    totalSubscriptions: number;
    averageLatency: number;
    connectionHealth: { [key: string]: ConnectionHealth };
    loadDistribution: { [key: string]: number };
  } {
    const activeConnections = this.getActiveConnectionCount();
    const totalSubscriptions = Array.from(this.subscriptionCounts.values())
      .reduce((sum, count) => sum + count, 0);
    
    const latencies = Array.from(this.healthStatus.values())
      .filter(health => health.isConnected)
      .map(health => health.latency);
    const averageLatency = latencies.length > 0 
      ? latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length 
      : 0;

    const connectionHealth: { [key: string]: ConnectionHealth } = {};
    this.healthStatus.forEach((health, key) => {
      connectionHealth[key] = health;
    });

    const loadDistribution: { [key: string]: number } = {};
    this.subscriptionCounts.forEach((count, key) => {
      loadDistribution[key] = count;
    });

    return {
      activeConnections,
      totalSubscriptions,
      averageLatency,
      connectionHealth,
      loadDistribution
    };
  }

  /**
   * Force reconnection of specific connection
   */
  async reconnectConnection(connectionId: 'primary' | 'secondary' | 'backup'): Promise<void> {
    const connection = this.connectionPool[connectionId];
    if (connection) {
      console.log(`Reconnecting ${connectionId} connection`);
      
      try {
        connection.disconnect();
        await connection.connect();
        
        this.updateHealthStatus(connectionId, connection);
        this.emit('connection_reconnected', { connectionId });
      } catch (error) {
        console.error(`Error reconnecting ${connectionId} connection:`, error);
        this.emit('connection_error', { connectionId, error });
      }
    }
  }

  /**
   * Initialize primary connection
   */
  private async initializePrimaryConnection(): Promise<void> {
    console.log('Initializing primary WebSocket connection');
    
    this.connectionPool.primary = initializeWebSocketClient({
      url: this.config.primaryUrl,
      walletAddress: this.config.walletAddress,
      autoReconnect: true,
      reconnectAttempts: 5,
      reconnectDelay: 1000
    });

    await this.connectionPool.primary.connect();
    this.setupConnectionEventHandlers('primary', this.connectionPool.primary);
    this.updateHealthStatus('primary', this.connectionPool.primary);
    this.subscriptionCounts.set('primary', 0);
  }

  /**
   * Initialize secondary connection
   */
  private async initializeSecondaryConnection(): Promise<void> {
    if (!this.config.secondaryUrl) return;
    
    console.log('Initializing secondary WebSocket connection');
    
    this.connectionPool.secondary = new WebSocketClientService({
      url: this.config.secondaryUrl,
      walletAddress: this.config.walletAddress,
      autoReconnect: true,
      reconnectAttempts: 3,
      reconnectDelay: 2000
    });

    await this.connectionPool.secondary.connect();
    this.setupConnectionEventHandlers('secondary', this.connectionPool.secondary);
    this.updateHealthStatus('secondary', this.connectionPool.secondary);
    this.subscriptionCounts.set('secondary', 0);
  }

  /**
   * Initialize backup connection
   */
  private async initializeBackupConnection(): Promise<void> {
    if (!this.config.backupUrl) return;
    
    console.log('Initializing backup WebSocket connection');
    
    this.connectionPool.backup = new WebSocketClientService({
      url: this.config.backupUrl,
      walletAddress: this.config.walletAddress,
      autoReconnect: true,
      reconnectAttempts: 2,
      reconnectDelay: 5000
    });

    await this.connectionPool.backup.connect();
    this.setupConnectionEventHandlers('backup', this.connectionPool.backup);
    this.updateHealthStatus('backup', this.connectionPool.backup);
    this.subscriptionCounts.set('backup', 0);
  }

  /**
   * Set up event handlers for connection
   */
  private setupConnectionEventHandlers(
    connectionId: 'primary' | 'secondary' | 'backup',
    connection: WebSocketClientService
  ): void {
    connection.on('connection_state_changed', (state: any) => {
      this.handleConnectionStateChange(connectionId, state);
    });

    connection.on('disconnected', (data: any) => {
      this.handleConnectionDisconnected(connectionId, data);
    });

    connection.on('heartbeat_ack', (data: any) => {
      this.handleHeartbeatAck(connectionId, data);
    });

    // Forward all events to manager listeners
    const eventTypes = [
      'feed_update', 'community_post', 'community_update', 'new_message',
      'reaction_update', 'tip_received', 'notification', 'user_status_update'
    ];

    eventTypes.forEach(eventType => {
      connection.on(eventType, (data: any) => {
        this.emit(eventType, { ...data, connectionId });
      });
    });
  }

  /**
   * Handle connection state changes
   */
  private handleConnectionStateChange(
    connectionId: 'primary' | 'secondary' | 'backup',
    state: any
  ): void {
    console.log(`Connection ${connectionId} state changed:`, state.status);
    
    const connection = this.connectionPool[connectionId];
    if (connection) {
      this.updateHealthStatus(connectionId, connection);
    }

    // Handle failover if primary connection fails
    if (connectionId === 'primary' && state.status === 'error' && this.config.failoverEnabled) {
      this.handlePrimaryConnectionFailure();
    }

    this.emit('connection_state_changed', { connectionId, state });
  }

  /**
   * Handle connection disconnected
   */
  private handleConnectionDisconnected(
    connectionId: 'primary' | 'secondary' | 'backup',
    data: any
  ): void {
    console.log(`Connection ${connectionId} disconnected:`, data.reason);
    
    const health = this.healthStatus.get(connectionId);
    if (health) {
      health.isConnected = false;
      health.errorCount++;
    }

    this.emit('connection_disconnected', { connectionId, data });
  }

  /**
   * Handle heartbeat acknowledgment
   */
  private handleHeartbeatAck(
    connectionId: 'primary' | 'secondary' | 'backup',
    data: any
  ): void {
    const health = this.healthStatus.get(connectionId);
    if (health) {
      health.lastPing = new Date();
      health.latency = data.latency || 0;
    }
  }

  /**
   * Handle primary connection failure
   */
  private handlePrimaryConnectionFailure(): void {
    console.log('Primary connection failed, attempting failover');
    
    // Try to use secondary connection as primary
    if (this.connectionPool.secondary && this.connectionPool.secondary.isConnected()) {
      console.log('Failing over to secondary connection');
      // In a real implementation, you would migrate subscriptions
      this.emit('failover_activated', { from: 'primary', to: 'secondary' });
    } else if (this.connectionPool.backup && this.connectionPool.backup.isConnected()) {
      console.log('Failing over to backup connection');
      this.emit('failover_activated', { from: 'primary', to: 'backup' });
    } else {
      console.error('No backup connections available for failover');
      this.emit('failover_failed', { reason: 'No backup connections available' });
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health check on all connections
   */
  private performHealthCheck(): void {
    Object.entries(this.connectionPool).forEach(([key, connection]) => {
      if (connection) {
        this.updateHealthStatus(key as keyof ConnectionPool, connection);
        
        // Send ping to measure latency
        const startTime = Date.now();
        connection.send('ping', { timestamp: startTime });
      }
    });
  }

  /**
   * Update health status for connection
   */
  private updateHealthStatus(
    connectionId: string,
    connection: WebSocketClientService
  ): void {
    const existing = this.healthStatus.get(connectionId);
    
    this.healthStatus.set(connectionId, {
      url: (typeof (connection as any).getUrl === 'function') ? (connection as any).getUrl() : '',
      isConnected: connection.isConnected(),
      latency: existing?.latency || 0,
      lastPing: existing?.lastPing || new Date(),
      errorCount: existing?.errorCount || 0,
      reconnectAttempts: existing?.reconnectAttempts || 0
    });
  }

  /**
   * Update subscription distribution tracking
   */
  private updateSubscriptionDistribution(connectionId: string, subscriptionId: string): void {
    const subscriptionCount = this.subscriptionCounts.get(connectionId) || 0;
    const totalSubscriptions = Array.from(this.subscriptionCounts.values())
      .reduce((sum, count) => sum + count, 0);
    
    const load = totalSubscriptions > 0 ? subscriptionCount / totalSubscriptions : 0;

    this.subscriptionDistribution.set(subscriptionId, {
      connectionId: connectionId as 'primary' | 'secondary' | 'backup',
      subscriptionCount,
      load
    });
  }

  /**
   * Get connection by ID
   */
  private getConnectionById(connectionId: string): WebSocketClientService | null {
    return this.connectionPool[connectionId as keyof ConnectionPool] || null;
  }

  /**
   * Get connection ID for connection instance
   */
  private getConnectionId(connection: WebSocketClientService): string {
    for (const [key, conn] of Object.entries(this.connectionPool)) {
      if (conn === connection) {
        return key;
      }
    }
    return 'unknown';
  }

  /**
   * Get active connection count
   */
  private getActiveConnectionCount(): number {
    return Object.values(this.connectionPool)
      .filter(connection => connection && connection.isConnected())
      .length;
  }

  /**
   * Event system
   */
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
          console.error('Error in WebSocket connection manager event callback:', error);
        }
      });
    }
  }
}

// Export singleton instance
export const webSocketConnectionManager = WebSocketConnectionManager.getInstance();

// Export types
export type {
  ConnectionConfig,
  ConnectionHealth,
  SubscriptionDistribution
};