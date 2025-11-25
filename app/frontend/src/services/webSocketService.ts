import { io, Socket } from 'socket.io-client';
import ENV_CONFIG from '@/config/environment';

// Use the centralized environment configuration for WebSocket URL
const WS_URL = ENV_CONFIG.WS_URL;

interface WebSocketConfig {
  url?: string;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
  backoffFactor?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
  resourceAware?: boolean;
  enableFallback?: boolean;
}

interface ConnectionState {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastConnected: Date | null;
  lastError: Error | null;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'unknown';
}

interface ResourceConstraints {
  memoryUsage: number;
  connectionCount: number;
  networkLatency: number;
  isLowPowerMode: boolean;
}

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private config: WebSocketConfig;
  private connectionState: ConnectionState;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private resourceConstraints: ResourceConstraints;
  private fallbackToPolling: boolean = false;
  private isOptional: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  // MEMORY OPTIMIZATION: Limits and cleanup
  private readonly MAX_LISTENERS_PER_EVENT = 20;
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;
  private listenerCounts: Map<string, number> = new Map();

  constructor(config: WebSocketConfig = {}) {
    this.config = {
      url: config.url || WS_URL,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      reconnectDelay: config.reconnectDelay || 1000,
      maxReconnectDelay: config.maxReconnectDelay || 30000,
      backoffFactor: config.backoffFactor || 2,
      heartbeatInterval: config.heartbeatInterval || 30000,
      connectionTimeout: config.connectionTimeout || 20000,
      resourceAware: config.resourceAware ?? true,
      enableFallback: config.enableFallback ?? true,
      ...config
    };

    this.connectionState = {
      isConnected: false,
      isReconnecting: false,
      reconnectAttempts: 0,
      lastConnected: null,
      lastError: null,
      connectionQuality: 'unknown'
    };

    this.resourceConstraints = {
      memoryUsage: 0,
      connectionCount: 0,
      networkLatency: 0,
      isLowPowerMode: false
    };

    this.detectResourceConstraints();
    this.setupVisibilityHandlers();
    
    // MEMORY OPTIMIZATION: Start periodic cleanup
    this.startPeriodicCleanup();
  }

  private detectResourceConstraints(): void {
    if (typeof window === 'undefined') return;

    // Check for resource constraints
    const navigator = window.navigator as any;
    
    // Check for low-power mode or data saver
    this.isOptional = !!(
      navigator.connection?.saveData ||
      navigator.deviceMemory && navigator.deviceMemory < 4 ||
      navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4
    );

    // Monitor memory usage if available
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      this.resourceConstraints.memoryUsage = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
    }

    // Check network conditions
    if (navigator.connection) {
      const connection = navigator.connection;
      this.resourceConstraints.networkLatency = connection.rtt || 0;
      this.resourceConstraints.isLowPowerMode = connection.saveData || false;
      
      // Use polling for slow connections
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        this.fallbackToPolling = true;
      }
    }

    // Silently detect constraints without logging
  }

  private setupVisibilityHandlers(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Reduce activity when page is hidden
        this.pauseHeartbeat();
      } else {
        // Resume activity when page becomes visible
        this.resumeHeartbeat();
        if (this.config.resourceAware && !this.socket?.connected) {
          this.attemptReconnection();
        }
      }
    });

    // Handle online/offline events
    window.addEventListener('online', () => {
      if (!this.socket?.connected && this.config.enableFallback) {
        this.attemptReconnection();
      }
    });

    window.addEventListener('offline', () => {
      this.emit('network_offline');
    });
  }

  connect(): Promise<void> {
    if (this.socket?.connected) {
      return Promise.resolve();
    }

    // If connection is already in progress, return the existing promise
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Skip connection if resource-constrained and WebSocket is optional
    if (this.isOptional && this.config.resourceAware) {
      // Silently skip connection
      this.emit('connection_skipped', { reason: 'resource_constraints' });
      return Promise.resolve();
    }

    this.connectionPromise = new Promise<void>((resolve, reject) => {
      try {
        this.connectionState.isReconnecting = false;
        
        // Parse URL to determine if path is already included
        let socketUrl = this.config.url!;
        let socketPath = '/socket.io/';
        
        try {
          const parsedUrl = new URL(this.config.url!);
          // If the URL already includes the socket.io path, extract it
          if (parsedUrl.pathname && parsedUrl.pathname.includes('socket.io')) {
            socketPath = parsedUrl.pathname;
            // Remove the path from the URL
            parsedUrl.pathname = '';
            socketUrl = parsedUrl.toString().replace(/\/$/, '');
          }
        } catch (error) {
          // If URL parsing fails, use defaults
          console.warn('Failed to parse WebSocket URL, using defaults');
        }

        // Add additional options for better connection handling
        this.socket = io(socketUrl, {
          path: socketPath,
          transports: ['websocket', 'polling'],
          reconnection: false, // We handle reconnection manually
          reconnectionAttempts: 0,
          timeout: this.config.connectionTimeout,
          forceNew: true,
          upgrade: true,
          rememberUpgrade: false,
          // Add CORS bypass options
          withCredentials: true,
          extraHeaders: {
            'X-Client-Type': 'web'
          }
        });

        this.setupSocketEventHandlers(resolve, reject);

      } catch (error) {
        this.handleConnectionError(error as Error);
        reject(error);
        this.connectionPromise = null; // Clear the connection promise on error
      }
    });

    return this.connectionPromise;
  }

  private setupSocketEventHandlers(resolve?: () => void, reject?: (error: Error) => void): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      // Silently connect without logging
      this.connectionState.isConnected = true;
      this.connectionState.isReconnecting = false;
      this.connectionState.reconnectAttempts = 0;
      this.connectionState.lastConnected = new Date();
      this.connectionState.lastError = null;
      this.connectionState.connectionQuality = 'good';

      this.startHeartbeat();
      this.emit('connected');
      resolve?.();
      this.connectionPromise = null; // Clear the connection promise
    });

    this.socket.on('disconnect', (reason) => {
      // Silently disconnect without logging
      this.connectionState.isConnected = false;
      this.stopHeartbeat();
      
      this.emit('disconnected', { reason });

      // Attempt reconnection based on disconnect reason
      if (this.shouldReconnect(reason)) {
        this.attemptReconnection();
      }
    });

    this.socket.on('connect_error', (error) => {
      // Only log first error to reduce console spam
      if (this.connectionState.reconnectAttempts === 0) {
        console.warn('WebSocket connection error:', error.message);
        console.warn('WebSocket URL:', this.config.url);
        console.warn('WebSocket transport:', this.socket?.io?.opts?.transports);
      }
      this.handleConnectionError(error);
      reject?.(error);
      this.connectionPromise = null; // Clear the connection promise on connection error
    });

    this.socket.on('reconnect_failed', () => {
      // Silently handle reconnection failure
      this.handleReconnectionFailure();
    });

    // Listen for all custom events and emit them to local listeners
    this.socket.onAny((event, ...args) => {
      this.emit(event, ...args);
    });

    // Handle heartbeat responses
    this.socket.on('pong', () => {
      this.updateConnectionQuality();
    });
  }

  private shouldReconnect(reason: string): boolean {
    // Don't reconnect for certain reasons
    const noReconnectReasons = [
      'io client disconnect',
      'transport close',
      'forced close'
    ];

    if (noReconnectReasons.includes(reason)) {
      return false;
    }

    // Don't reconnect if resource-constrained and optional
    if (this.isOptional && this.config.resourceAware) {
      return false;
    }

    return this.connectionState.reconnectAttempts < this.config.maxReconnectAttempts!;
  }

  private attemptReconnection(): void {
    if (this.connectionState.isReconnecting || 
        this.connectionState.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      this.handleReconnectionFailure();
      return;
    }

    this.connectionState.isReconnecting = true;
    this.connectionState.reconnectAttempts++;

    // Calculate exponential backoff delay
    const baseDelay = this.config.reconnectDelay!;
    const backoffDelay = baseDelay * Math.pow(this.config.backoffFactor!, this.connectionState.reconnectAttempts - 1);
    const delay = Math.min(backoffDelay, this.config.maxReconnectDelay!);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    const finalDelay = delay + jitter;

    // Only log first few reconnection attempts to reduce console spam
    if (this.connectionState.reconnectAttempts <= 2) {
      console.log(`WebSocket reconnecting (attempt ${this.connectionState.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
    }

    this.emit('reconnecting', {
      attempt: this.connectionState.reconnectAttempts,
      maxAttempts: this.config.maxReconnectAttempts,
      delay: finalDelay
    });

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch((error) => {
        // Silently retry without logging every failure
        this.attemptReconnection();
      });
    }, finalDelay);
  }

  private handleConnectionError(error: Error): void {
    this.connectionState.lastError = error;
    this.connectionState.connectionQuality = 'poor';
    this.emit('error', error.message);

    // Switch to polling if WebSocket fails repeatedly
    if (this.connectionState.reconnectAttempts > 3 && !this.fallbackToPolling) {
      // Silently switch to polling
      this.fallbackToPolling = true;
      console.log('Switching to polling mode after multiple WebSocket failures');
    }
  }

  private handleReconnectionFailure(): void {
    // Silently handle max reconnection attempts
    this.connectionState.isReconnecting = false;
    
    this.emit('reconnection_failed', {
      attempts: this.connectionState.reconnectAttempts,
      lastError: this.connectionState.lastError
    });

    // Fallback to polling if enabled
    if (this.config.enableFallback && !this.fallbackToPolling) {
      // Silently fallback to polling
      this.fallbackToPolling = true;
      this.connectionState.reconnectAttempts = 0;
      setTimeout(() => this.connect(), 5000);
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private pauseHeartbeat(): void {
    this.stopHeartbeat();
  }

  private resumeHeartbeat(): void {
    if (this.socket?.connected) {
      this.startHeartbeat();
    }
  }

  private updateConnectionQuality(): void {
    // Simple quality assessment based on response time
  }

  // Public API methods
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
      this.listenerCounts.set(event, 0);
    }
    
    const eventListeners = this.listeners.get(event)!;
    const currentCount = this.listenerCounts.get(event)!;
    
    // MEMORY OPTIMIZATION: Limit listeners per event
    if (currentCount >= this.MAX_LISTENERS_PER_EVENT) {
      console.warn(`Too many listeners for event '${event}'. Removing oldest listener.`);
      const removed = eventListeners.shift();
      if (removed) {
        this.listenerCounts.set(event, currentCount - 1);
      }
    }
    
    eventListeners.push(callback);
    this.listenerCounts.set(event, eventListeners.length);
  }

  off(event: string, callback: Function) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
        const currentCount = this.listenerCounts.get(event) || 0;
        this.listenerCounts.set(event, Math.max(0, currentCount - 1));
      }
    }
  }

  once(event: string, callback: Function) {
    const onceWrapper = (...args: any[]) => {
      this.off(event, onceWrapper);
      callback(...args);
    };
    this.on(event, onceWrapper);
  }

  emit(event: string, ...args: any[]) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      // MEMORY OPTIMIZATION: Create a copy to avoid modification during iteration
      const listenersCopy = [...listeners];
      listenersCopy.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in WebSocket listener for event ${event}:`, error);
          // MEMORY OPTIMIZATION: Remove problematic listeners
          this.off(event, callback);
        }
      });
    }
  }

  send(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else if (this.config.enableFallback) {
      // Silently queue message for when connection is restored
      this.once('connected', () => {
        this.socket?.emit(event, data);
      });
    } else {
      // Silently fail - WebSocket is optional
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  getResourceConstraints(): ResourceConstraints {
    return { ...this.resourceConstraints };
  }

  isOptionalConnection(): boolean {
    return this.isOptional;
  }

  /**
   * MEMORY OPTIMIZATION: Periodic cleanup
   */
  private startPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.CLEANUP_INTERVAL);
  }

  private performCleanup(): void {
    try {
      let totalListenersRemoved = 0;
      
      // Clean up empty listener arrays
      for (const [event, listeners] of this.listeners.entries()) {
        if (listeners.length === 0) {
          this.listeners.delete(event);
          this.listenerCounts.delete(event);
        } else if (listeners.length > this.MAX_LISTENERS_PER_EVENT) {
          // Remove excess listeners
          const excess = listeners.length - this.MAX_LISTENERS_PER_EVENT;
          listeners.splice(0, excess);
          this.listenerCounts.set(event, this.MAX_LISTENERS_PER_EVENT);
          totalListenersRemoved += excess;
        }
      }
      
      if (totalListenersRemoved > 0) {
        console.log(`WebSocket cleanup: removed ${totalListenersRemoved} excess listeners`);
      }
    } catch (error) {
      console.error('Error during WebSocket cleanup:', error);
    }
  }

  /**
   * MEMORY OPTIMIZATION: Get memory usage statistics
   */
  public getMemoryUsage(): {
    totalEvents: number;
    totalListeners: number;
    maxListenersPerEvent: number;
    listenerCounts: Record<string, number>;
  } {
    const totalListeners = Array.from(this.listenerCounts.values())
      .reduce((total, count) => total + count, 0);
    
    return {
      totalEvents: this.listeners.size,
      totalListeners,
      maxListenersPerEvent: this.MAX_LISTENERS_PER_EVENT,
      listenerCounts: Object.fromEntries(this.listenerCounts)
    };
  }

  /**
   * MEMORY OPTIMIZATION: Clear all listeners for an event
   */
  public clearListeners(event: string): void {
    this.listeners.delete(event);
    this.listenerCounts.delete(event);
    console.log(`Cleared all listeners for event: ${event}`);
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.connectionState.isConnected = false;
    this.emit('disconnected', { reason: 'manual_disconnect' });
  }

  getQueuedMessageCount(): number {
    return 0; // Not implemented in this version
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();

export { WebSocketService };