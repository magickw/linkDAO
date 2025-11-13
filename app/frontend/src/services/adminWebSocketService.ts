import { io, Socket } from 'socket.io-client';

interface AdminUser {
  adminId: string;
  email: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'analyst';
  permissions: string[];
}

interface DashboardConfig {
  layout: LayoutConfig[];
  refreshInterval: number;
  autoRefresh: boolean;
  theme: 'light' | 'dark' | 'auto';
  notifications: NotificationPreferences;
}

interface LayoutConfig {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert' | 'custom';
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, any>;
  visible: boolean;
}

interface NotificationPreferences {
  enabled: boolean;
  categories: string[];
  priority: ('low' | 'medium' | 'high' | 'critical')[];
  sound: boolean;
  desktop: boolean;
}

interface ConnectionHealth {
  status: 'healthy' | 'degraded' | 'unstable' | 'disconnected' | 'connecting';
  latency: number;
  lastHeartbeat: Date;
  reconnectCount: number;
  dataQuality: 'high' | 'medium' | 'low';
}

interface AdminAlert {
  id: string;
  type: 'anomaly' | 'threshold' | 'security' | 'system' | 'business';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data: Record<string, any>;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}

type EventCallback = (data: any) => void;
type ConnectionCallback = (connected: boolean, health?: ConnectionHealth) => void;

export class AdminWebSocketManager {
  private socket: Socket | null = null;
  private adminUser: AdminUser | null = null;
  private dashboardConfig: DashboardConfig | null = null;
  private isAuthenticated = false;
  private connectionHealth: ConnectionHealth;
  private connectionListeners: Set<ConnectionCallback> = new Set();
  private eventListeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5; // Reduced from 10 to prevent resource exhaustion
  private reconnectDelay = 2000; // Increased delay to reduce rapid reconnection attempts
  private isConnecting = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private latencyCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.connectionHealth = {
      status: 'disconnected',
      latency: 0,
      lastHeartbeat: new Date(),
      reconnectCount: 0,
      dataQuality: 'high'
    };
  }

  private attemptReconnection(): void {
    if (!this.adminUser || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Reconnection attempts exhausted or no user to reconnect with');
      this.connectionHealth.status = 'disconnected';
      this.notifyConnectionListeners(false);
      return;
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      10000 // Max 10 seconds (reduced from 30)
    );

    console.log(`Attempting reconnection in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);

    setTimeout(async () => {
      if (!this.socket || this.socket.connected) {
        return; // Already connected
      }

      this.reconnectAttempts++;
      this.connectionHealth.status = 'connecting';

      // Force disconnect before reconnecting to clean up resources
      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
      }

      // Try to reconnect
      try {
        await this.connect(this.adminUser, this.dashboardConfig || undefined);
      } catch (error) {
        console.error('Reconnection failed:', error);
        // Add extra delay before next attempt
        setTimeout(() => this.attemptReconnection(), 2000);
      }
    }, delay);
  }

  // Connection management
  public async connect(adminUser: AdminUser, dashboardConfig?: DashboardConfig): Promise<void> {
    if (this.isConnecting) {
      console.log('Admin WebSocket connection already in progress');
      return;
    }

    if (this.socket?.connected) {
      console.log('Admin WebSocket already connected');
      return;
    }

    this.isConnecting = true;

    this.adminUser = adminUser;
    this.dashboardConfig = dashboardConfig || this.getDefaultDashboardConfig();

    const serverUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';
    
    this.socket = io(`${serverUrl}/admin`, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
      forceNew: true,
      // Add additional connection options for better reliability
      randomizationFactor: 0.5,
      autoConnect: false // We'll manually connect after setting up handlers
    });

    this.setupEventHandlers();
    
    // Set initial connection status
    this.connectionHealth.status = 'connecting';
    
    // Attempt connection
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 15000);

      this.socket!.once('connect', () => {
      console.log('Admin WebSocket connected');
      this.connectionHealth.status = 'healthy';
      this.reconnectAttempts = 0;
      this.isConnecting = false;
      this.notifyConnectionListeners(true);
    });

    this.socket!.once('connect_error', (error) => {
      console.error('Admin WebSocket connection error:', error);
      this.connectionHealth.status = 'unstable';
      this.isConnecting = false;
      reject(new Error(`Connection failed: ${error.message}`));
    });

      // Manual connect
      this.socket!.connect();
    });
  }

  public disconnect(): void {
    if (this.socket) {
      // Remove all listeners to prevent memory leaks
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.isAuthenticated = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.connectionHealth.status = 'disconnected';
    console.log('Admin WebSocket disconnected');
  }

  private async authenticate(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.adminUser) {
        reject(new Error('Socket or admin user not available'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, 10000);

      this.socket.once('admin_authenticated', (data) => {
        clearTimeout(timeout);
        this.isAuthenticated = true;
        this.connectionHealth.status = 'healthy';
        this.startHeartbeat();
        this.startLatencyCheck();
        this.notifyConnectionListeners(true);
        
        console.log('Admin authenticated:', data);
        resolve();
      });

      this.socket.once('admin_auth_error', (error) => {
        clearTimeout(timeout);
        console.error('Admin authentication failed:', error);
        this.connectionHealth.status = 'unstable';
        reject(new Error(error.message || 'Authentication failed'));
      });

      // Send authentication request
      this.socket.emit('admin_authenticate', {
        adminId: this.adminUser!.adminId,
        email: this.adminUser!.email,
        role: this.adminUser!.role,
        permissions: this.adminUser!.permissions,
        dashboardConfig: this.dashboardConfig
      });
    });
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Admin WebSocket connected');
      this.connectionHealth.status = 'healthy';
      this.reconnectAttempts = 0;
      
      // Re-authenticate if we were previously authenticated
      if (this.adminUser && !this.isAuthenticated) {
        this.authenticate()
          .then(() => {
            console.log('Re-authentication successful');
          })
          .catch((error) => {
            console.error('Re-authentication failed:', error);
            this.notifyConnectionListeners(false);
          });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Admin WebSocket disconnected:', reason);
      this.connectionHealth.status = 'disconnected';
      this.isAuthenticated = false;
      this.cleanup();
      this.notifyConnectionListeners(false);
      
      // Attempt reconnection if it was not intentional
      if (reason !== 'io client disconnect' && reason !== 'io server disconnect') {
        this.attemptReconnection();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Admin WebSocket connection error:', error);
      this.connectionHealth.status = 'unstable';
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.notifyConnectionListeners(false);
      }
    });

    // Heartbeat and health monitoring
    this.socket.on('admin_heartbeat_ack', (data) => {
      this.connectionHealth.lastHeartbeat = new Date();
      this.connectionHealth.status = 'healthy';
      
      // Calculate latency if we have server load data
      if (data.serverLoad) {
        this.updateConnectionQuality(data.serverLoad);
      }
    });

    this.socket.on('admin_connection_check', () => {
      // Respond to server connection check
      this.sendConnectionHealth();
    });

    // Dashboard events
    this.socket.on('dashboard_initial_data', (data) => {
      this.emit('dashboard_initial_data', data);
    });

    this.socket.on('dashboard_update', (data) => {
      this.emit('dashboard_update', data);
    });

    this.socket.on('dashboard_config_updated', (data) => {
      this.dashboardConfig = data.config;
      this.emit('dashboard_config_updated', data);
    });

    this.socket.on('dashboard_error', (error) => {
      console.error('Dashboard error:', error);
      this.emit('dashboard_error', error);
    });

    // Metrics events
    this.socket.on('metrics_subscribed', (data) => {
      this.emit('metrics_subscribed', data);
    });

    this.socket.on('metrics_update', (data) => {
      this.emit('metrics_update', data);
    });

    this.socket.on('queued_metrics', (data) => {
      this.emit('queued_metrics', data);
    });

    // Alert events
    this.socket.on('admin_alert', (alert) => {
      this.handleAlert(alert);
    });

    this.socket.on('alert_acknowledged', (data) => {
      this.emit('alert_acknowledged', data);
    });

    this.socket.on('queued_alerts', (data) => {
      this.emit('queued_alerts', data);
    });

    // Admin action events
    this.socket.on('admin_action_broadcast', (data) => {
      this.emit('admin_action_broadcast', data);
    });

    // Server events
    this.socket.on('admin_server_shutdown', (data) => {
      console.warn('Admin server shutting down:', data);
      this.emit('server_shutdown', data);
      // Attempt to reconnect after a delay
      setTimeout(() => {
        this.attemptReconnection();
      }, 5000);
    });

    // Error handling
    this.socket.on('subscription_error', (error) => {
      console.error('Subscription error:', error);
      this.emit('subscription_error', error);
    });

    this.socket.on('config_error', (error) => {
      console.error('Config error:', error);
      this.emit('config_error', error);
    });
  }

  // Dashboard configuration
  public async updateDashboardConfig(config: Partial<DashboardConfig>): Promise<void> {
    if (!this.socket || !this.isAuthenticated) {
      throw new Error('Not connected or authenticated');
    }

    this.dashboardConfig = { ...this.dashboardConfig!, ...config };
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Dashboard config update timeout'));
      }, 5000);

      this.socket!.once('dashboard_config_updated', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket!.once('config_error', (error) => {
        clearTimeout(timeout);
        reject(new Error(error.message));
      });

      this.socket!.emit('update_dashboard_config', { config });
    });
  }

  // Metrics subscription
  public async subscribeToMetrics(categories: string[], interval: number = 5000, filters?: Record<string, any>): Promise<void> {
    if (!this.socket || !this.isAuthenticated) {
      throw new Error('Not connected or authenticated');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Metrics subscription timeout'));
      }, 5000);

      this.socket!.once('metrics_subscribed', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket!.once('subscription_error', (error) => {
        clearTimeout(timeout);
        reject(new Error(error.message));
      });

      this.socket!.emit('subscribe_metrics', { categories, interval, filters });
    });
  }

  // Alert management
  public acknowledgeAlert(alertId: string): void {
    if (!this.socket || !this.isAuthenticated) {
      throw new Error('Not connected or authenticated');
    }

    this.socket.emit('acknowledge_alert', { alertId });
  }

  private handleAlert(alert: AdminAlert): void {
    // Show desktop notification if enabled
    if (this.dashboardConfig?.notifications.desktop && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(alert.title, {
          body: alert.message,
          icon: '/admin-icon.png',
          tag: alert.id
        });
      }
    }

    // Play sound if enabled
    if (this.dashboardConfig?.notifications.sound) {
      this.playNotificationSound(alert.severity);
    }

    this.emit('admin_alert', alert);
  }

  private playNotificationSound(severity: string): void {
    try {
      const audio = new Audio(`/sounds/alert-${severity}.mp3`);
      audio.volume = 0.5;
      audio.play().catch(console.error);
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  }

  // Admin actions
  public logAdminAction(action: string, target: string, details: Record<string, any>): void {
    if (!this.socket || !this.isAuthenticated) {
      return;
    }

    this.socket.emit('admin_action', { action, target, details });
  }

  // Connection health monitoring
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('admin_heartbeat');
      }
    }, 30000); // Every 30 seconds
  }

  private startLatencyCheck(): void {
    this.latencyCheckInterval = setInterval(() => {
      this.measureLatency();
    }, 60000); // Every minute
  }

  private measureLatency(): void {
    if (!this.socket?.connected) return;

    const startTime = Date.now();
    
    this.socket.emit('ping', { timestamp: startTime });
    
    this.socket.once('pong', () => {
      const latency = Date.now() - startTime;
      this.connectionHealth.latency = latency;
      this.updateConnectionQuality();
    });
  }

  private updateConnectionQuality(serverLoad?: any): void {
    const { latency } = this.connectionHealth;
    
    // Determine data quality based on latency and server load
    if (latency < 100) {
      this.connectionHealth.dataQuality = 'high';
    } else if (latency < 500) {
      this.connectionHealth.dataQuality = 'medium';
    } else {
      this.connectionHealth.dataQuality = 'low';
    }

    // Adjust based on server load if available
    if (serverLoad && serverLoad.cpu > 80) {
      this.connectionHealth.dataQuality = 'medium';
    }

    this.sendConnectionHealth();
  }

  private sendConnectionHealth(): void {
    if (!this.socket?.connected) return;

    this.socket.emit('connection_health', {
      latency: this.connectionHealth.latency,
      quality: this.connectionHealth.dataQuality
    });
  }

  // Event management
  public on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  public off(event: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  public onConnection(callback: ConnectionCallback): void {
    this.connectionListeners.add(callback);
  }

  public offConnection(callback: ConnectionCallback): void {
    this.connectionListeners.delete(callback);
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach(callback => {
      try {
        callback(connected, this.connectionHealth);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }

  // Utility methods
  private cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.latencyCheckInterval) {
      clearInterval(this.latencyCheckInterval);
      this.latencyCheckInterval = null;
    }
  }

  private getDefaultDashboardConfig(): DashboardConfig {
    return {
      layout: [
        {
          id: 'system-overview',
          type: 'metric',
          position: { x: 0, y: 0, w: 6, h: 4 },
          config: { metric: 'system' },
          visible: true
        },
        {
          id: 'user-metrics',
          type: 'chart',
          position: { x: 6, y: 0, w: 6, h: 4 },
          config: { chartType: 'line', metric: 'users' },
          visible: true
        }
      ],
      refreshInterval: 5000,
      autoRefresh: true,
      theme: 'light',
      notifications: {
        enabled: true,
        categories: ['system', 'security', 'business'],
        priority: ['medium', 'high', 'critical'],
        sound: true,
        desktop: true
      }
    };
  }

  // Public getters
  public get isConnected(): boolean {
    return this.socket?.connected && this.isAuthenticated || false;
  }

  public get connectionStatus(): ConnectionHealth {
    return { ...this.connectionHealth };
  }

  public get currentConfig(): DashboardConfig | null {
    return this.dashboardConfig ? { ...this.dashboardConfig } : null;
  }

  public get currentUser(): AdminUser | null {
    return this.adminUser ? { ...this.adminUser } : null;
  }

  // Static factory method
  public static async create(adminUser: AdminUser, dashboardConfig?: DashboardConfig): Promise<AdminWebSocketManager> {
    const manager = new AdminWebSocketManager();
    await manager.connect(adminUser, dashboardConfig);
    return manager;
  }
}

// Singleton instance for global access
let managerInstance: AdminWebSocketManager | null = null;
let isInitializing = false;

export const getAdminWebSocketManager = (): AdminWebSocketManager | null => {
  return managerInstance;
};

export const initializeAdminWebSocketManager = async (
  adminUser: AdminUser,
  dashboardConfig?: DashboardConfig
): Promise<AdminWebSocketManager> => {
  // Prevent multiple initializations
  if (isInitializing) {
    console.log('Admin WebSocket manager is already initializing...');
    // Wait for initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (managerInstance) {
      return managerInstance;
    }
  }

  if (managerInstance && managerInstance.isConnected) {
    console.log('Admin WebSocket manager already connected, reusing existing connection');
    return managerInstance;
  }

  isInitializing = true;
  
  try {
    if (!managerInstance) {
      managerInstance = new AdminWebSocketManager();
    }
    await managerInstance.connect(adminUser, dashboardConfig);
    return managerInstance;
  } finally {
    isInitializing = false;
  }
};

export const shutdownAdminWebSocketManager = (): void => {
  if (managerInstance) {
    managerInstance.disconnect();
    managerInstance = null;
  }
};