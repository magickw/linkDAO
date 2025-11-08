import { io, Socket } from 'socket.io-client';

// Get the WebSocket URL from environment variables, fallback to backend URL
// Dynamically detect WebSocket URL based on environment
const getWebSocketUrl = () => {
  // In browser, use current origin
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}`;
  }
  // Fallback for SSR
  return process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';
};

const WS_URL = getWebSocketUrl();

// Add fallback URLs
const WS_FALLBACK_URLS = [
  process.env.NEXT_PUBLIC_WS_URL,
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace('http://', 'ws://').replace('https://', 'wss://'),
  // Only use localhost in development
  ...(process.env.NODE_ENV === 'development' ? ['ws://localhost:10000'] : [])
].filter(Boolean) as string[];

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
  private currentUrlIndex: number = 0;

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

  // Try connecting with different URLs as fallback
  async connect(): Promise<void> {
    if (this.socket?.connected) {
      return Promise.resolve();
    }

    // Skip connection if resource-constrained and WebSocket is optional
    if (this.isOptional && this.config.resourceAware) {
      // Silently skip connection
      this.emit('connection_skipped', { reason: 'resource_constraints' });
      return Promise.resolve();
    }

    // Try different URLs if we've had multiple failures
    if (this.connectionState.reconnectAttempts > 3) {
      this.currentUrlIndex = (this.currentUrlIndex + 1) % WS_FALLBACK_URLS.length;
    }

    const currentUrl = WS_FALLBACK_URLS[this.currentUrlIndex] || this.config.url || WS_URL;

    return new Promise<void>((resolve, reject) => {
      try {
        this.connectionState.isReconnecting = false;
        
        // Determine transport method based on constraints
        const transports = this.fallbackToPolling ? 
          ['polling', 'websocket'] : 
          ['websocket', 'polling'];

        // Add additional options for better connection handling
        this.socket = io(currentUrl, {
          transports,
          reconnection: false, // We handle reconnection manually
          reconnectionAttempts: 0,
          timeout: this.config.connectionTimeout,
          forceNew: true,
          upgrade: !this.fallbackToPolling,
          rememberUpgrade: false,
          // Add path configuration for better compatibility
          path: '/socket.io/'
        });

        this.setupSocketEventHandlers(resolve, reject);

      } catch (error) {
        this.handleConnectionError(error as Error);
        reject(error);
      }
    });
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
        console.warn('WebSocket unavailable, using polling fallback');
      }
      this.handleConnectionError(error);
      reject?.(error);
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
      console.warn('WebSocket unavailable, using polling fallback');
      this.fallbackToPolling = true;
    }
    
    // Reset current URL index after too many failures to try primary URL again
    if (this.connectionState.reconnectAttempts > 5) {
      this.currentUrlIndex = 0;
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
      console.warn('WebSocket reconnection failed, falling back to polling');
      this.fallbackToPolling = true;
      this.connectionState.reconnectAttempts = 0;
      setTimeout(() => this.connect(), 5000);
    } else {
      // If already using polling, try to reconnect with WebSocket after a delay
      setTimeout(() => {
        this.fallbackToPolling = false;
        this.connectionState.reconnectAttempts = 0;
        this.currentUrlIndex = 0;
        this.connect();
      }, 30000); // Try WebSocket again after 30 seconds
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
    if (this.resourceConstraints.networkLatency < 100) {
      this.connectionState.connectionQuality = 'excellent';
    } else if (this.resourceConstraints.networkLatency < 300) {
      this.connectionState.connectionQuality = 'good';
    } else {
      this.connectionState.connectionQuality = 'poor';
    }
  }

  disconnect() {
    this.connectionState.isReconnecting = false;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopHeartbeat();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.connectionState.isConnected = false;
    this.emit('disconnected', { reason: 'manual_disconnect' });
  }

  register(address: string) {
    if (this.socket?.connected) {
      this.socket.emit('register', address);
    } else if (this.config.enableFallback) {
      // Queue the registration for when connection is restored
      this.once('connected', () => {
        this.socket?.emit('register', address);
      });
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
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
      listeners.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in WebSocket listener for event ${event}:`, error);
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

  // Force reconnection (useful for manual retry)
  forceReconnect(): void {
    if (this.socket?.connected) {
      this.disconnect();
    }
    this.connectionState.reconnectAttempts = 0;
    this.currentUrlIndex = 0; // Reset to primary URL
    this.connect();
  }

  // Update configuration at runtime
  updateConfig(newConfig: Partial<WebSocketConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get connection statistics
  getStats() {
    return {
      isConnected: this.connectionState.isConnected,
      isReconnecting: this.connectionState.isReconnecting,
      reconnectAttempts: this.connectionState.reconnectAttempts,
      lastConnected: this.connectionState.lastConnected,
      connectionQuality: this.connectionState.connectionQuality,
      isOptional: this.isOptional,
      fallbackToPolling: this.fallbackToPolling,
      resourceConstraints: this.resourceConstraints,
      currentUrl: WS_FALLBACK_URLS[this.currentUrlIndex] || this.config.url || WS_URL
    };
  }
}

// Export a singleton instance with resource-aware configuration
export const webSocketService = new WebSocketService({
  resourceAware: true,
  enableFallback: true,
  maxReconnectAttempts: 10,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  backoffFactor: 2
});

// Export the class for custom instances
export { WebSocketService };
export type { WebSocketConfig, ConnectionState, ResourceConstraints };