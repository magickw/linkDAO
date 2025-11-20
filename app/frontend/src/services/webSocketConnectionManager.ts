/**
 * WebSocket Connection Manager with Fallback Support
 * 
 * This service manages WebSocket connections with intelligent fallback to polling
 * when WebSocket connections fail or are unavailable due to resource constraints.
 */

import { EventEmitter } from 'events';
import { WebSocketService, webSocketService } from './webSocketService';
import { requestManager } from './requestManager';

<<<<<<< Updated upstream
// Create an instance of the WebSocket service
const webSocketServiceInstance = new WebSocketService();

=======
>>>>>>> Stashed changes
// Fallback configuration
interface FallbackConfig {
  enabled: boolean;
  pollingInterval: number;
  maxPollingInterval: number;
  backoffFactor: number;
  endpoints: {
    feed: string;
    notifications: string;
    status: string;
  };
}

interface ConnectionManagerState {
  mode: 'websocket' | 'polling' | 'hybrid' | 'disabled';
  isConnected: boolean;
  lastUpdate: Date | null;
  failureCount: number;
  resourceConstrained: boolean;
}

interface FeedUpdate {
  id: string;
  type: string;
  content: any;
  timestamp: string;
  // Add other properties as needed
}

interface NotificationUpdate {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  // Add other properties as needed
}

interface PollingResponse<T> {
  data: T[];
  // Add other properties as needed
}

export class WebSocketConnectionManager {
  private webSocketService: WebSocketService;
  private fallbackConfig: FallbackConfig;
  private state: ConnectionManagerState;
  private pollingInterval: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private lastPollingData: Map<string, any> = new Map();

  constructor(fallbackConfig?: Partial<FallbackConfig>) {
    this.webSocketService = webSocketServiceInstance;
    
    this.fallbackConfig = {
      enabled: true,
      pollingInterval: 5000, // 5 seconds
      maxPollingInterval: 30000, // 30 seconds
      backoffFactor: 1.5,
      endpoints: {
        feed: '/api/feed/updates',
        notifications: '/api/notifications/poll',
        status: '/api/status'
      },
      ...fallbackConfig
    };

    this.state = {
      mode: 'websocket',
      isConnected: false,
      lastUpdate: null,
      failureCount: 0,
      resourceConstrained: false
    };

    this.setupWebSocketListeners();
    this.detectResourceConstraints();
  }

  private setupWebSocketListeners(): void {
    // Listen for WebSocket connection events
    this.webSocketService.on('connected', () => {
      console.log('WebSocket connected, switching from polling if active');
      this.state.isConnected = true;
      this.state.mode = 'websocket';
      this.state.failureCount = 0;
      this.stopPolling();
      this.emit('connection_mode_changed', { mode: 'websocket' });
    });

    this.webSocketService.on('disconnected', (data: any) => {
      console.log('WebSocket disconnected:', data.reason);
      this.state.isConnected = false;
      this.state.failureCount++;
      
      if (this.shouldFallbackToPolling()) {
        this.startPolling();
      }
    });

    this.webSocketService.on('error', (error: string) => {
      console.error('WebSocket error:', error);
      this.state.failureCount++;
      
      if (this.shouldFallbackToPolling()) {
        this.startPolling();
      }
    });

    this.webSocketService.on('reconnection_failed', () => {
      console.log('WebSocket reconnection failed, falling back to polling');
      this.startPolling();
    });

    this.webSocketService.on('connection_skipped', (data: any) => {
      console.log('WebSocket connection skipped:', data.reason);
      this.state.resourceConstrained = true;
      this.startPolling();
    });

    // Forward WebSocket events
    this.webSocketService.on('feed_update', (data: any) => {
      this.emit('feed_update', data);
    });

    this.webSocketService.on('notification', (data: any) => {
      this.emit('notification', data);
    });

    this.webSocketService.on('community_update', (data: any) => {
      this.emit('community_update', data);
    });
  }

  private detectResourceConstraints(): void {
    // Check if WebSocket is optional due to resource constraints
    this.state.resourceConstrained = this.webSocketService.isOptionalConnection();
    
    if (this.state.resourceConstrained) {
      console.log('Resource constraints detected, starting with polling mode');
      this.state.mode = 'polling';
      this.startPolling();
    }
  }

  private shouldFallbackToPolling(): boolean {
    return this.fallbackConfig.enabled && 
           (this.state.failureCount >= 3 || this.state.resourceConstrained);
  }

  private startPolling(): void {
    if (this.pollingInterval || this.state.mode === 'polling') {
      return; // Already polling
    }

    console.log('Starting polling fallback mode');
    this.state.mode = 'polling';
    this.emit('connection_mode_changed', { mode: 'polling' });

    const currentInterval = Math.min(
      this.fallbackConfig.pollingInterval * Math.pow(this.fallbackConfig.backoffFactor, this.state.failureCount),
      this.fallbackConfig.maxPollingInterval
    );

    this.pollingInterval = setInterval(() => {
      this.performPolling();
    }, currentInterval);

    // Perform initial poll
    this.performPolling();
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('Stopped polling fallback mode');
    }
  }

  private async performPolling(): Promise<void> {
    try {
      // Poll for feed updates
      await this.pollEndpoint('feed', this.fallbackConfig.endpoints.feed);
      
      // Poll for notifications
      await this.pollEndpoint('notifications', this.fallbackConfig.endpoints.notifications);
      
      // Update last successful poll time
      this.state.lastUpdate = new Date();
      
    } catch (error) {
      console.error('Polling error:', error);
      this.state.failureCount++;
    }
  }

  private async pollEndpoint(type: string, endpoint: string): Promise<void> {
    try {
      const lastUpdate = this.lastPollingData.get(type);
      const params = lastUpdate ? { since: lastUpdate.timestamp } : {};
      
      const response = await requestManager.request<PollingResponse<FeedUpdate | NotificationUpdate>>(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.data && response.data.length > 0) {
        // Store last update timestamp
        this.lastPollingData.set(type, {
          timestamp: new Date().toISOString(),
          count: response.data.length
        });

        // Emit updates as if they came from WebSocket
        response.data.forEach((update: FeedUpdate | NotificationUpdate) => {
          switch (type) {
            case 'feed':
              this.emit('feed_update', update);
              break;
            case 'notifications':
              this.emit('notification', update);
              break;
          }
        });
      }
    } catch (error) {
      // Silently handle polling errors to avoid spam
      console.debug(`Polling ${type} failed:`, error);
    }
  }

  // Public API
  async connect(): Promise<void> {
    if (this.state.resourceConstrained) {
      // Skip WebSocket and use polling directly
      this.startPolling();
      return;
    }

    try {
      await this.webSocketService.connect();
    } catch (error) {
      console.error('WebSocket connection failed, falling back to polling:', error);
      this.startPolling();
    }
  }

  disconnect(): void {
    this.webSocketService.disconnect();
    this.stopPolling();
    this.state.isConnected = false;
    this.state.mode = 'disabled';
    this.emit('connection_mode_changed', { mode: 'disabled' });
  }

  send(event: string, data: any): void {
    if (this.state.mode === 'websocket' && this.webSocketService.isConnected()) {
      this.webSocketService.send(event, data);
    } else {
      // Queue for when connection is restored or handle via HTTP
      console.warn(`Cannot send ${event} in ${this.state.mode} mode`);
    }
  }

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
          console.error('Error in connection manager event callback:', error);
        }
      });
    }
  }

  // Get current connection state
  getState(): ConnectionManagerState & { stats: any } {
    return {
      ...this.state,
      stats: {
        webSocketStats: this.webSocketService.getConnectionState(),
        pollingActive: !!this.pollingInterval,
        lastPollingData: Object.fromEntries(this.lastPollingData)
      }
    };
  }

  // Force reconnection attempt
  forceReconnect(): void {
    if (this.state.mode === 'polling') {
      this.stopPolling();
      this.state.failureCount = 0;
      this.state.resourceConstrained = false;
    }
    
    // Since there's no forceReconnect method, we'll disconnect and reconnect
    this.webSocketService.disconnect();
    this.webSocketService.connect().catch(error => {
      console.error('Force reconnection failed:', error);
    });
  }

  // Update fallback configuration
  updateConfig(newConfig: Partial<FallbackConfig>): void {
    this.fallbackConfig = { ...this.fallbackConfig, ...newConfig };
  }

  // Check if real-time features are available
  isRealTimeAvailable(): boolean {
    return this.state.mode === 'websocket' && this.state.isConnected;
  }

  // Get recommended update interval for UI polling
  getRecommendedUpdateInterval(): number {
    switch (this.state.mode) {
      case 'websocket':
        return 0; // Real-time updates
      case 'polling':
        return this.fallbackConfig.pollingInterval;
      default:
        return 30000; // 30 seconds for manual refresh
    }
  }
}

// Export singleton instance
export const webSocketConnectionManager = new WebSocketConnectionManager();

// Export class for custom instances
export default WebSocketConnectionManager;