import { Server } from 'socket.io';
import { safeLogger } from '../utils/safeLogger';
import { Server as HttpServer } from 'http';
import { getWebSocketService } from './webSocketService';

interface AdminUser {
  adminId: string;
  email: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'analyst';
  socketId: string;
  connectedAt: Date;
  lastSeen: Date;
  permissions: Set<string>;
  dashboardConfig: DashboardConfig;
  connectionHealth: ConnectionHealth;
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

interface ConnectionHealth {
  status: 'healthy' | 'degraded' | 'unstable';
  latency: number;
  lastHeartbeat: Date;
  reconnectCount: number;
  dataQuality: 'high' | 'medium' | 'low';
}

interface NotificationPreferences {
  enabled: boolean;
  categories: string[];
  priority: ('low' | 'medium' | 'high' | 'critical')[];
  sound: boolean;
  desktop: boolean;
}

interface AdminMetrics {
  timestamp: Date;
  type: 'system' | 'user' | 'business' | 'security';
  category: string;
  value: number | string | object;
  metadata: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
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

export class AdminWebSocketService {
  private io: Server;
  private connectedAdmins: Map<string, AdminUser> = new Map();
  private adminSessions: Map<string, Set<string>> = new Map(); // adminId -> Set of socketIds
  private metricsBuffer: Map<string, AdminMetrics[]> = new Map(); // adminId -> buffered metrics
  private alertQueue: Map<string, AdminAlert[]> = new Map(); // adminId -> queued alerts
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private connectionMonitor: NodeJS.Timeout | null = null;

  constructor(httpServer: HttpServer) {
    // Get the existing Socket.IO instance or create a new one
    const existingService = getWebSocketService();
    if (existingService && (existingService as any).io) {
      this.io = (existingService as any).io;
    } else {
      this.io = new Server(httpServer, {
        cors: {
          origin: process.env.FRONTEND_URL || "http://localhost:3000",
          methods: ["GET", "POST"]
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket', 'polling']
      });
    }

    this.setupAdminEventHandlers();
    this.startAdminServices();
  }

  private setupAdminEventHandlers() {
    // Create admin namespace
    const adminNamespace = this.io.of('/admin');

    adminNamespace.on('connection', (socket) => {
      safeLogger.info(`Admin client connected: ${socket.id}`);

      // Handle admin authentication
      socket.on('admin_authenticate', async (data: { 
        adminId: string; 
        email: string; 
        role: string; 
        permissions: string[];
        dashboardConfig?: DashboardConfig;
      }) => {
        const { adminId, email, role, permissions, dashboardConfig } = data;
        
        if (!adminId || !email || !role) {
          socket.emit('admin_auth_error', { message: 'Invalid admin credentials' });
          return;
        }

        // Validate admin role
        const validRoles = ['super_admin', 'admin', 'moderator', 'analyst'];
        if (!validRoles.includes(role)) {
          socket.emit('admin_auth_error', { message: 'Invalid admin role' });
          return;
        }

        // Create admin user session
        const adminUser: AdminUser = {
          adminId,
          email,
          role: role as AdminUser['role'],
          socketId: socket.id,
          connectedAt: new Date(),
          lastSeen: new Date(),
          permissions: new Set(permissions),
          dashboardConfig: dashboardConfig || this.getDefaultDashboardConfig(),
          connectionHealth: {
            status: 'healthy',
            latency: 0,
            lastHeartbeat: new Date(),
            reconnectCount: 0,
            dataQuality: 'high'
          }
        };

        this.connectedAdmins.set(socket.id, adminUser);

        // Track multiple sessions per admin
        if (!this.adminSessions.has(adminId)) {
          this.adminSessions.set(adminId, new Set());
        }
        this.adminSessions.get(adminId)!.add(socket.id);

        // Join admin-specific rooms
        socket.join(`admin:${adminId}`);
        socket.join(`role:${role}`);
        socket.join('admin:all');

        // Send authentication success with initial data
        socket.emit('admin_authenticated', {
          message: 'Successfully authenticated as admin',
          adminId,
          role,
          permissions: Array.from(adminUser.permissions),
          dashboardConfig: adminUser.dashboardConfig,
          connectedAdmins: this.connectedAdmins.size,
          serverTime: new Date().toISOString()
        });

        // Send queued alerts and metrics
        this.deliverQueuedData(adminId);

        // Start real-time data stream for this admin
        this.startAdminDataStream(socket, adminUser);

        safeLogger.info(`Admin authenticated: ${email} (${role}) - ${socket.id}`);
      });

      // Handle dashboard configuration updates
      socket.on('update_dashboard_config', (data: { config: DashboardConfig }) => {
        const admin = this.connectedAdmins.get(socket.id);
        if (!admin) {
          socket.emit('config_error', { message: 'Admin not authenticated' });
          return;
        }

        admin.dashboardConfig = { ...admin.dashboardConfig, ...data.config };
        
        // Persist configuration (would integrate with database)
        this.persistDashboardConfig(admin.adminId, admin.dashboardConfig);

        socket.emit('dashboard_config_updated', { 
          config: admin.dashboardConfig,
          timestamp: new Date().toISOString()
        });

        safeLogger.info(`Dashboard config updated for admin: ${admin.adminId}`);
      });

      // Handle real-time metric subscriptions
      socket.on('subscribe_metrics', (data: { 
        categories: string[];
        interval: number;
        filters?: Record<string, any>;
      }) => {
        const admin = this.connectedAdmins.get(socket.id);
        if (!admin) {
          socket.emit('subscription_error', { message: 'Admin not authenticated' });
          return;
        }

        // Validate subscription permissions
        const hasPermission = data.categories.every(category => 
          this.hasMetricPermission(admin, category)
        );

        if (!hasPermission) {
          socket.emit('subscription_error', { message: 'Insufficient permissions for requested metrics' });
          return;
        }

        // Join metric-specific rooms
        data.categories.forEach(category => {
          socket.join(`metrics:${category}`);
        });

        socket.emit('metrics_subscribed', {
          categories: data.categories,
          interval: data.interval,
          timestamp: new Date().toISOString()
        });

        safeLogger.info(`Admin ${admin.adminId} subscribed to metrics: ${data.categories.join(', ')}`);
      });

      // Handle alert acknowledgment
      socket.on('acknowledge_alert', (data: { alertId: string }) => {
        const admin = this.connectedAdmins.get(socket.id);
        if (!admin) return;

        this.acknowledgeAlert(data.alertId, admin.adminId);
        
        // Broadcast acknowledgment to other admin sessions
        socket.to('admin:all').emit('alert_acknowledged', {
          alertId: data.alertId,
          acknowledgedBy: admin.adminId,
          timestamp: new Date().toISOString()
        });

        safeLogger.info(`Alert ${data.alertId} acknowledged by admin: ${admin.adminId}`);
      });

      // Handle connection health monitoring
      socket.on('connection_health', (data: { latency: number; quality: string }) => {
        const admin = this.connectedAdmins.get(socket.id);
        if (!admin) return;

        admin.connectionHealth.latency = data.latency;
        admin.connectionHealth.dataQuality = data.quality as ConnectionHealth['dataQuality'];
        admin.connectionHealth.lastHeartbeat = new Date();
        admin.lastSeen = new Date();

        // Adjust data streaming based on connection quality
        this.adjustDataStreamForConnection(socket, admin);
      });

      // Handle admin heartbeat
      socket.on('admin_heartbeat', () => {
        const admin = this.connectedAdmins.get(socket.id);
        if (admin) {
          admin.lastSeen = new Date();
          admin.connectionHealth.lastHeartbeat = new Date();
          admin.connectionHealth.status = 'healthy';
        }
        
        socket.emit('admin_heartbeat_ack', { 
          timestamp: new Date().toISOString(),
          serverLoad: this.getServerLoad()
        });
      });

      // Handle admin action logging
      socket.on('admin_action', (data: {
        action: string;
        target: string;
        details: Record<string, any>;
      }) => {
        const admin = this.connectedAdmins.get(socket.id);
        if (!admin) return;

        // Log admin action for audit trail
        this.logAdminAction(admin, data);

        // Broadcast action to other admins if significant
        if (this.isSignificantAction(data.action)) {
          socket.to('admin:all').emit('admin_action_broadcast', {
            adminId: admin.adminId,
            action: data.action,
            target: data.target,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        const admin = this.connectedAdmins.get(socket.id);
        
        if (admin) {
          // Update connection health
          admin.connectionHealth.status = 'unstable';
          
          // Remove from admin sessions tracking
          const adminSessionSet = this.adminSessions.get(admin.adminId);
          if (adminSessionSet) {
            adminSessionSet.delete(socket.id);
            
            // If no more sessions for this admin, clean up
            if (adminSessionSet.size === 0) {
              this.adminSessions.delete(admin.adminId);
              this.setupAdminReconnectionTimeout(admin.adminId);
            }
          }

          // Remove from connected admins
          this.connectedAdmins.delete(socket.id);
          
          safeLogger.info(`Admin disconnected: ${admin.email} (${socket.id}) - Reason: ${reason}`);
        }
      });
    });
  }

  private startAdminServices() {
    // Start admin heartbeat monitoring
    this.heartbeatInterval = setInterval(() => {
      this.monitorAdminConnections();
    }, 30000); // Every 30 seconds

    // Start metrics collection and broadcasting
    this.metricsInterval = setInterval(() => {
      this.collectAndBroadcastMetrics();
    }, 5000); // Every 5 seconds

    // Start connection quality monitoring
    this.connectionMonitor = setInterval(() => {
      this.monitorConnectionQuality();
    }, 60000); // Every minute
  }

  private startAdminDataStream(socket: any, admin: AdminUser) {
    // Send initial dashboard data
    this.sendInitialDashboardData(socket, admin);

    // Set up periodic data updates based on dashboard config
    const interval = admin.dashboardConfig.refreshInterval || 5000;
    
    const dataStreamInterval = setInterval(() => {
      if (!this.connectedAdmins.has(socket.id)) {
        clearInterval(dataStreamInterval);
        return;
      }

      this.sendDashboardUpdate(socket, admin);
    }, interval);

    // Store interval for cleanup
    (socket as any).adminDataInterval = dataStreamInterval;
  }

  private async sendInitialDashboardData(socket: any, admin: AdminUser) {
    try {
      const dashboardData = await this.generateDashboardData(admin);
      
      socket.emit('dashboard_initial_data', {
        data: dashboardData,
        timestamp: new Date().toISOString(),
        config: admin.dashboardConfig
      });
    } catch (error) {
      safeLogger.error('Error sending initial dashboard data:', error);
      socket.emit('dashboard_error', { 
        message: 'Failed to load initial dashboard data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async sendDashboardUpdate(socket: any, admin: AdminUser) {
    try {
      const updateData = await this.generateDashboardUpdate(admin);
      
      socket.emit('dashboard_update', {
        data: updateData,
        timestamp: new Date().toISOString(),
        connectionHealth: admin.connectionHealth
      });
    } catch (error) {
      safeLogger.error('Error sending dashboard update:', error);
    }
  }

  private async generateDashboardData(admin: AdminUser): Promise<Record<string, any>> {
    // This would integrate with actual data sources
    return {
      systemMetrics: await this.getSystemMetrics(admin),
      userMetrics: await this.getUserMetrics(admin),
      businessMetrics: await this.getBusinessMetrics(admin),
      securityMetrics: await this.getSecurityMetrics(admin),
      alerts: await this.getActiveAlerts(admin)
    };
  }

  private async generateDashboardUpdate(admin: AdminUser): Promise<Record<string, any>> {
    // Generate incremental updates based on what changed
    return {
      systemMetrics: await this.getSystemMetricsUpdate(admin),
      alerts: await this.getNewAlerts(admin),
      timestamp: new Date().toISOString()
    };
  }

  // Metric collection methods (would integrate with actual monitoring systems)
  private async getSystemMetrics(admin: AdminUser): Promise<Record<string, any>> {
    if (!this.hasMetricPermission(admin, 'system')) return {};
    
    return {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100,
      network: Math.random() * 1000,
      activeConnections: this.connectedAdmins.size,
      uptime: process.uptime()
    };
  }

  private async getUserMetrics(admin: AdminUser): Promise<Record<string, any>> {
    if (!this.hasMetricPermission(admin, 'users')) return {};
    
    return {
      totalUsers: 10000 + Math.floor(Math.random() * 1000),
      activeUsers: 500 + Math.floor(Math.random() * 100),
      newRegistrations: Math.floor(Math.random() * 50),
      userGrowthRate: (Math.random() * 10).toFixed(2)
    };
  }

  private async getBusinessMetrics(admin: AdminUser): Promise<Record<string, any>> {
    if (!this.hasMetricPermission(admin, 'business')) return {};
    
    return {
      revenue: 50000 + Math.random() * 10000,
      transactions: 1000 + Math.floor(Math.random() * 200),
      conversionRate: (Math.random() * 5).toFixed(2),
      averageOrderValue: 100 + Math.random() * 50
    };
  }

  private async getSecurityMetrics(admin: AdminUser): Promise<Record<string, any>> {
    if (!this.hasMetricPermission(admin, 'security')) return {};
    
    return {
      threatLevel: 'low',
      blockedRequests: Math.floor(Math.random() * 100),
      suspiciousActivity: Math.floor(Math.random() * 10),
      securityScore: 85 + Math.random() * 15
    };
  }

  private async getSystemMetricsUpdate(admin: AdminUser): Promise<Record<string, any>> {
    return this.getSystemMetrics(admin);
  }

  private async getActiveAlerts(admin: AdminUser): Promise<AdminAlert[]> {
    // Return mock alerts for now
    return [];
  }

  private async getNewAlerts(admin: AdminUser): Promise<AdminAlert[]> {
    // Return new alerts since last update
    return [];
  }

  // Permission and security methods
  private hasMetricPermission(admin: AdminUser, category: string): boolean {
    if (admin.role === 'super_admin') return true;
    
    const permissionMap: Record<string, string[]> = {
      'system': ['admin', 'super_admin'],
      'users': ['admin', 'moderator', 'analyst', 'super_admin'],
      'business': ['admin', 'analyst', 'super_admin'],
      'security': ['admin', 'super_admin']
    };
    
    return permissionMap[category]?.includes(admin.role) || false;
  }

  private isSignificantAction(action: string): boolean {
    const significantActions = [
      'user_ban', 'user_unban', 'content_delete', 'system_config_change',
      'security_alert_resolve', 'emergency_action'
    ];
    return significantActions.includes(action);
  }

  // Connection monitoring and health
  private monitorAdminConnections() {
    const now = new Date();
    const staleThreshold = 60000; // 1 minute

    this.connectedAdmins.forEach((admin, socketId) => {
      const timeSinceLastSeen = now.getTime() - admin.lastSeen.getTime();
      
      if (timeSinceLastSeen > staleThreshold) {
        admin.connectionHealth.status = 'degraded';
        
        // Send connection check
        this.io.of('/admin').to(socketId).emit('admin_connection_check', {
          timestamp: now.toISOString()
        });
      }
    });
  }

  private monitorConnectionQuality() {
    this.connectedAdmins.forEach((admin, socketId) => {
      // Adjust streaming based on connection health
      this.adjustDataStreamForConnection(
        this.io.of('/admin').sockets.get(socketId),
        admin
      );
    });
  }

  private adjustDataStreamForConnection(socket: any, admin: AdminUser) {
    if (!socket) return;

    const { connectionHealth } = admin;
    
    // Adjust update frequency based on connection quality
    let newInterval = admin.dashboardConfig.refreshInterval || 5000;
    
    if (connectionHealth.dataQuality === 'low') {
      newInterval *= 2; // Reduce frequency for poor connections
    } else if (connectionHealth.latency > 1000) {
      newInterval *= 1.5; // Slightly reduce for high latency
    }

    // Update the data stream interval if needed
    if ((socket as any).adminDataInterval) {
      clearInterval((socket as any).adminDataInterval);
      
      const dataStreamInterval = setInterval(() => {
        if (!this.connectedAdmins.has(socket.id)) {
          clearInterval(dataStreamInterval);
          return;
        }
        this.sendDashboardUpdate(socket, admin);
      }, newInterval);
      
      (socket as any).adminDataInterval = dataStreamInterval;
    }
  }

  // Data management methods
  private setupAdminReconnectionTimeout(adminId: string) {
    setTimeout(() => {
      // Clean up queued data for disconnected admin
      this.metricsBuffer.delete(adminId);
      this.alertQueue.delete(adminId);
      safeLogger.info(`Cleaned up data for disconnected admin: ${adminId}`);
    }, 5 * 60 * 1000); // 5 minutes
  }

  private deliverQueuedData(adminId: string) {
    // Send queued metrics
    const queuedMetrics = this.metricsBuffer.get(adminId);
    if (queuedMetrics && queuedMetrics.length > 0) {
      this.sendToAdmin(adminId, 'queued_metrics', {
        metrics: queuedMetrics,
        count: queuedMetrics.length
      });
      this.metricsBuffer.delete(adminId);
    }

    // Send queued alerts
    const queuedAlerts = this.alertQueue.get(adminId);
    if (queuedAlerts && queuedAlerts.length > 0) {
      this.sendToAdmin(adminId, 'queued_alerts', {
        alerts: queuedAlerts,
        count: queuedAlerts.length
      });
      this.alertQueue.delete(adminId);
    }
  }

  private collectAndBroadcastMetrics() {
    // Collect current metrics and broadcast to subscribed admins
    this.connectedAdmins.forEach(async (admin) => {
      try {
        const metrics = await this.generateDashboardUpdate(admin);
        this.sendToAdminSocket(admin.socketId, 'metrics_update', metrics);
      } catch (error) {
        safeLogger.error('Error broadcasting metrics to admin:', admin.adminId, error);
      }
    });
  }

  // Utility methods
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

  private persistDashboardConfig(adminId: string, config: DashboardConfig) {
    // This would integrate with database to persist admin preferences
    safeLogger.info(`Persisting dashboard config for admin: ${adminId}`);
  }

  private logAdminAction(admin: AdminUser, action: any) {
    // This would integrate with audit logging system
    safeLogger.info(`Admin action logged: ${admin.adminId} - ${action.action}`);
  }

  private acknowledgeAlert(alertId: string, adminId: string) {
    // This would update alert status in database
    safeLogger.info(`Alert ${alertId} acknowledged by ${adminId}`);
  }

  private getServerLoad(): Record<string, any> {
    return {
      cpu: process.cpuUsage(),
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      connections: this.connectedAdmins.size
    };
  }

  // Public API methods
  public sendToAdmin(adminId: string, event: string, data: any) {
    this.io.of('/admin').to(`admin:${adminId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  public sendToAdminSocket(socketId: string, event: string, data: any) {
    this.io.of('/admin').to(socketId).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  public sendToRole(role: string, event: string, data: any) {
    this.io.of('/admin').to(`role:${role}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  public broadcastToAllAdmins(event: string, data: any) {
    this.io.of('/admin').to('admin:all').emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  public sendAlert(alert: AdminAlert, targetAdmins?: string[]) {
    const alertData = {
      ...alert,
      timestamp: new Date().toISOString()
    };

    if (targetAdmins) {
      targetAdmins.forEach(adminId => {
        this.sendToAdmin(adminId, 'admin_alert', alertData);
      });
    } else {
      this.broadcastToAllAdmins('admin_alert', alertData);
    }
  }

  public getAdminStats() {
    return {
      connectedAdmins: this.connectedAdmins.size,
      uniqueAdmins: this.adminSessions.size,
      queuedMetrics: Array.from(this.metricsBuffer.values()).reduce((total, buffer) => total + buffer.length, 0),
      queuedAlerts: Array.from(this.alertQueue.values()).reduce((total, queue) => total + queue.length, 0)
    };
  }

  public isAdminOnline(adminId: string): boolean {
    return this.adminSessions.has(adminId);
  }

  public getConnectedAdmins(): AdminUser[] {
    return Array.from(this.connectedAdmins.values());
  }

  // Cleanup and shutdown
  public cleanup() {
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    // Clean up stale admin connections
    this.connectedAdmins.forEach((admin, socketId) => {
      if (now.getTime() - admin.lastSeen.getTime() > staleThreshold) {
        safeLogger.info(`Cleaning up stale admin connection: ${admin.adminId} (${socketId})`);
        this.connectedAdmins.delete(socketId);
        
        const adminSessionSet = this.adminSessions.get(admin.adminId);
        if (adminSessionSet) {
          adminSessionSet.delete(socketId);
          if (adminSessionSet.size === 0) {
            this.adminSessions.delete(admin.adminId);
          }
        }
      }
    });
  }

  public close() {
    safeLogger.info('Shutting down Admin WebSocket service...');
    
    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    if (this.connectionMonitor) {
      clearInterval(this.connectionMonitor);
    }

    // Notify all connected admins
    this.broadcastToAllAdmins('admin_server_shutdown', {
      message: 'Admin server is shutting down',
      timestamp: new Date().toISOString()
    });

    safeLogger.info('Admin WebSocket service shut down complete');
  }
}

let adminWebSocketService: AdminWebSocketService | null = null;

export const initializeAdminWebSocket = (httpServer: HttpServer): AdminWebSocketService => {
  if (!adminWebSocketService) {
    adminWebSocketService = new AdminWebSocketService(httpServer);
    safeLogger.info('Admin WebSocket service initialized');
  }
  return adminWebSocketService;
};

export const getAdminWebSocketService = (): AdminWebSocketService | null => {
  return adminWebSocketService;
};

export const shutdownAdminWebSocket = (): void => {
  if (adminWebSocketService) {
    adminWebSocketService.close();
    adminWebSocketService = null;
  }
};
