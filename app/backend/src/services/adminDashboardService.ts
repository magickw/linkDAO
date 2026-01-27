
import { MarketplaceOrder as Order } from '../models/Order';
import { db } from '../db';
import { orders, orderEvents } from '../db/schema';
import { sql, eq, count, sum, avg, desc } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { cacheService } from './cacheService';

// --- Existing Dashboard Interfaces ---

interface DashboardConfig {
  layout: LayoutConfig[];
  refreshInterval: number;
  autoRefresh: boolean;
  theme: 'light' | 'dark' | 'auto';
  notifications: NotificationPreferences;
  gridSize: { cols: number; rows: number };
  compactMode: boolean;
}

interface LayoutConfig {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert' | 'custom';
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, any>;
  visible: boolean;
  minimized?: boolean;
}

interface NotificationPreferences {
  enabled: boolean;
  categories: string[];
  priority: ('low' | 'medium' | 'high' | 'critical')[];
  sound: boolean;
  desktop: boolean;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  dateFormat: string;
  notifications: NotificationPreferences;
  accessibility: {
    highContrast: boolean;
    reducedMotion: boolean;
    screenReader: boolean;
  };
}

interface DashboardMetrics {
  systemMetrics: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
    activeConnections: number;
    uptime: number;
  };
  userMetrics: {
    totalUsers: number;
    activeUsers: number;
    newRegistrations: number;
    userGrowthRate: string;
  };
  businessMetrics: {
    revenue: number;
    transactions: number;
    conversionRate: string;
    averageOrderValue: number;
  };
  securityMetrics: {
    threatLevel: string;
    blockedRequests: number;
    suspiciousActivity: number;
    securityScore: number;
  };
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
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}

// --- New Order Management Interfaces ---

export interface AdminOrderMetrics {
  totalOrders: number;
  totalRevenue: number; // Sum of order amounts
  averageOrderValue: number; // Average order amount
  ordersByStatus: Record<string, number>;
  recentGrowth: number; // Percentage growth in orders
}

export interface AdminOrderFilters {
  status?: string | string[];
  startDate?: Date;
  endDate?: Date;
  sellerId?: string;
  buyerId?: string;
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: string;
}

export interface AdminOrderDetails extends Order {
  timeline: any[]; // Order events
  auditLog: any[]; // Admin actions on this order
  availableActions: string[]; // List of actions admin can perform (e.g. 'refund', 'override_status')
  riskScore?: number;
}

export interface IAdminDashboardService {
  // Order Management Methods
  getOrderMetrics(): Promise<AdminOrderMetrics>;
  getOrders(filters: AdminOrderFilters, page: number, limit: number): Promise<{ orders: Order[], total: number }>;
  getOrderDetails(orderId: string): Promise<AdminOrderDetails | null>;
  getDelayedOrders(page: number, limit: number): Promise<{ orders: Order[], total: number }>;
  performAdminAction(orderId: string, action: string, adminId: string, reason: string, metadata?: any): Promise<void>;

  // Existing Dashboard Methods (Implicitly part of the service, added here for completeness if needed)
  getDashboardConfig(adminId: string): Promise<DashboardConfig>;
  getDashboardMetrics(adminId: string, options?: any): Promise<DashboardMetrics>;
}

import { FinancialMonitoringService } from './financialMonitoringService'; // New Import

// ... existing imports

export class AdminDashboardService implements IAdminDashboardService {
  // OPTIMIZED: In-memory storage with size limits and cleanup
  // In production, this would use a database
  private dashboardConfigs: Map<string, DashboardConfig> = new Map();
  private userPreferences: Map<string, UserPreferences> = new Map();
  private alerts: Map<string, AdminAlert> = new Map();
  private usageAnalytics: Map<string, any> = new Map();
  private financialService: FinancialMonitoringService; // New property

  // OPTIMIZED: Cleanup intervals and size limits
  private maxMapSize = 1000;
  private cleanupInterval: NodeJS.Timeout;
  private actionHistoryLimit = 100;

  constructor() {
    this.financialService = new FinancialMonitoringService(); // Initialize
    this.initializeDefaultData();
    this.setupPeriodicCleanup();
  }

  private setupPeriodicCleanup(): void {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredData();
    }, 5 * 60 * 1000);
  }

  private cleanupExpiredData(): void {
    try {
      // Clean up old alerts (older than 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const alertsToDelete = Array.from(this.alerts.entries())
        .filter(([_, alert]) => alert.timestamp < sevenDaysAgo)
        .map(([id, _]) => id);

      alertsToDelete.forEach(id => this.alerts.delete(id));

      // Clean up old analytics (older than 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const analyticsToDelete = Array.from(this.usageAnalytics.entries())
        .filter(([_, analytics]) => analytics.lastActive < thirtyDaysAgo)
        .map(([id, _]) => id);

      analyticsToDelete.forEach(id => this.usageAnalytics.delete(id));

      // Enforce size limits
      this.enforceMapSizeLimits();

      if (alertsToDelete.length > 0 || analyticsToDelete.length > 0) {
        console.log(`Cleaned up ${alertsToDelete.length} alerts and ${analyticsToDelete.length} analytics records`);
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  private enforceMapSizeLimits(): void {
    // Clean up oldest entries if maps get too large
    const cleanupMap = <K, V>(map: Map<K, V>, maxSize: number) => {
      if (map.size > maxSize) {
        const entries = Array.from(map.entries());
        const toDelete = entries.slice(0, entries.length - maxSize);
        toDelete.forEach(([key]) => map.delete(key));
      }
    };

    cleanupMap(this.dashboardConfigs, this.maxMapSize);
    cleanupMap(this.userPreferences, this.maxMapSize);
    cleanupMap(this.alerts, this.maxMapSize);
    cleanupMap(this.usageAnalytics, this.maxMapSize);
  }

  private initializeDefaultData() {
    // Initialize with some sample alerts
    const sampleAlerts: AdminAlert[] = [
      {
        id: 'alert-1',
        type: 'system',
        severity: 'high',
        title: 'High CPU Usage',
        message: 'CPU usage has exceeded 85% for the last 10 minutes',
        data: { cpu: 87, threshold: 85, duration: '10m' },
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        acknowledged: false
      },
      {
        id: 'alert-2',
        type: 'security',
        severity: 'critical',
        title: 'Suspicious Login Activity',
        message: 'Multiple failed login attempts detected from IP 192.168.1.100',
        data: { ip: '192.168.1.100', attempts: 15, timeWindow: '5m' },
        timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        acknowledged: false
      },
      {
        id: 'alert-3',
        type: 'business',
        severity: 'medium',
        title: 'Transaction Volume Drop',
        message: 'Transaction volume is 25% below average for this time period',
        data: { current: 150, average: 200, drop: 25 },
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        acknowledged: true,
        acknowledgedBy: 'admin-1',
        acknowledgedAt: new Date(Date.now() - 10 * 60 * 1000)
      }
    ];

    sampleAlerts.forEach(alert => {
      this.alerts.set(alert.id, alert);
    });
  }

  // --- Order Management Implementation (Task 14) ---

  /**
   * Get high-level metrics for the admin dashboard (Orders)
   */
  async getOrderMetrics(): Promise<AdminOrderMetrics> {
    try {
      // 1. Total Orders & Revenue
      const totals = await db.select({
        count: count(),
        revenue: sum(orders.totalAmount)
      }).from(orders);

      const totalOrders = totals[0]?.count || 0;
      const totalRevenue = Number(totals[0]?.revenue || 0);

      // 2. Average Order Value
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // 3. Orders by Status
      const byStatus = await db.select({
        status: orders.status,
        count: count()
      }).from(orders)
        .groupBy(orders.status);

      const ordersByStatus: Record<string, number> = {};
      byStatus.forEach(item => {
        if (item.status) {
          ordersByStatus[item.status] = item.count;
        }
      });

      // 4. Recent Growth (orders in last 30 days vs previous 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const recentOrders = await db.select({ count: count() })
        .from(orders)
        .where(sql`${orders.createdAt} >= ${thirtyDaysAgo}`);

      const previousOrders = await db.select({ count: count() })
        .from(orders)
        .where(sql`${orders.createdAt} >= ${sixtyDaysAgo} AND ${orders.createdAt} < ${thirtyDaysAgo}`);

      const recentCount = recentOrders[0]?.count || 0;
      const previousCount = previousOrders[0]?.count || 0;

      const recentGrowth = previousCount > 0
        ? ((recentCount - previousCount) / previousCount) * 100
        : 0;

      return {
        totalOrders,
        totalRevenue,
        averageOrderValue,
        ordersByStatus,
        recentGrowth
      };

    } catch (error) {
      safeLogger.error('Error fetching admin metrics:', error);
      throw error;
    }
  }

  async getOrders(filters: AdminOrderFilters, page: number, limit: number): Promise<{ orders: Order[], total: number }> {
    try {
      const offset = (page - 1) * limit;
      const conditions: any[] = [];

      if (filters.status) {
        if (Array.isArray(filters.status)) {
          conditions.push(sql`${orders.status} IN ${filters.status}`);
        } else {
          conditions.push(eq(orders.status, filters.status));
        }
      }

      if (filters.startDate) {
        conditions.push(sql`${orders.createdAt} >= ${filters.startDate}`);
      }

      if (filters.endDate) {
        conditions.push(sql`${orders.createdAt} <= ${filters.endDate}`);
      }

      if (filters.sellerId) conditions.push(eq(orders.sellerId, filters.sellerId));
      if (filters.buyerId) conditions.push(eq(orders.buyerId, filters.buyerId));

      if (filters.minAmount) conditions.push(sql`${orders.totalAmount} >= ${filters.minAmount}`);
      if (filters.maxAmount) conditions.push(sql`${orders.totalAmount} <= ${filters.maxAmount}`);

      if (filters.paymentMethod) conditions.push(eq(orders.paymentMethod, filters.paymentMethod));

      const whereClause = conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined;

      // Get count
      const countRes = await db.select({ count: count() })
        .from(orders)
        .where(whereClause);

      const total = countRes[0]?.count || 0;

      // Get data
      const results = await db.select()
        .from(orders)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(orders.createdAt));

      return { orders: results as any[], total };

    } catch (error) {
      safeLogger.error('Error fetching admin orders:', error);
      throw error;
    }
  }

  async getOrderDetails(orderId: string): Promise<AdminOrderDetails | null> {
    try {
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
      if (!order) return null;

      // Fetch timeline (orderEvents)
      const timeline = await db.select().from(orderEvents)
        .where(eq(orderEvents.orderId, orderId))
        .orderBy(desc(orderEvents.timestamp));

      // Fetch Audit Log 
      const auditLog = timeline.filter(e => e.eventType.startsWith('ADMIN_'));

      // Determine available actions
      const availableActions: string[] = ['add_note'];

      if (['pending', 'paid', 'processing'].includes(order.status || '')) {
        availableActions.push('cancel');
      }
      if (order.status === 'disputed') {
        availableActions.push('resolve_dispute');
      }
      availableActions.push('override_status');

      return {
        ...order,
        timeline,
        auditLog,
        availableActions,
        riskScore: 0 // Placeholder
      } as any as AdminOrderDetails;
    } catch (error) {
      safeLogger.error(`Error getOrderDetails ${orderId}:`, error);
      return null;
    }
  }

  async getDelayedOrders(page: number, limit: number): Promise<{ orders: Order[], total: number }> {
    try {
      const offset = (page - 1) * limit;
      const now = new Date();

      // Logic: estimatedDeliveryMax < now AND status NOT IN ('DELIVERED', 'CANCELLED', 'RETURNED')
      const whereClause = sql`
                ${orders.estimatedDeliveryMax} < ${now} 
                AND ${orders.status} NOT IN ('DELIVERED', 'Delivered', 'CANCELLED', 'Cancelled', 'RETURNED', 'Returned')
            `;

      const countRes = await db.select({ count: count() }).from(orders).where(whereClause);
      const total = countRes[0]?.count || 0;

      const results = await db.select()
        .from(orders)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(orders.estimatedDeliveryMax));

      return { orders: results as any[], total };
    } catch (error) {
      safeLogger.error('Error fetching delayed orders:', error);
      return { orders: [], total: 0 };
    }
  }

  async performAdminAction(orderId: string, action: string, adminId: string, reason: string, metadata?: any): Promise<void> {
    try {
      safeLogger.info(`Admin ${adminId} performing ${action} on order ${orderId}. Reason: ${reason}`);

      // Log action to orderEvents
      await db.insert(orderEvents).values({
        orderId,
        eventType: `ADMIN_ACTION_${action.toUpperCase()}`,
        description: `Admin Action: ${action} - ${reason}`,
        metadata: JSON.stringify({ adminId, reason, ...metadata }),
        timestamp: new Date()
      } as any);

      switch (action) {
        case 'cancel':
          await db.update(orders)
            .set({ status: 'cancelled', cancellationReason: `Admin Cancelled: ${reason}` })
            .where(eq(orders.id, orderId));
          break;

        case 'override_status':
          if (metadata && metadata.newStatus) {
            await db.update(orders)
              .set({ status: metadata.newStatus })
              .where(eq(orders.id, orderId));
          }
          break;

        case 'refund':
          await db.update(orders)
            .set({ status: 'refunded' })
            .where(eq(orders.id, orderId));
          break;

        default:
          safeLogger.warn(`Unknown admin action: ${action}`);
      }
    } catch (error) {
      safeLogger.error('Error performing admin action:', error);
      throw error;
    }
  }

  // --- Existing Dashboard Methods ---

  async getDashboardConfig(adminId: string): Promise<DashboardConfig> {
    const config = this.dashboardConfigs.get(adminId);
    if (config) {
      return config;
    }

    const defaultConfig = this.getDefaultDashboardConfig();
    this.dashboardConfigs.set(adminId, defaultConfig);
    return defaultConfig;
  }

  async updateDashboardConfig(adminId: string, configUpdates: Partial<DashboardConfig>): Promise<DashboardConfig> {
    const currentConfig = await this.getDashboardConfig(adminId);
    const updatedConfig = { ...currentConfig, ...configUpdates };

    this.dashboardConfigs.set(adminId, updatedConfig);

    const cacheKeys = [
      `admin:dashboard:metrics:${adminId}:*`,
      `admin:dashboard:alerts:${adminId}:*`
    ];

    for (const key of cacheKeys) {
      await cacheService.invalidatePattern(key);
    }

    this.logConfigUpdate(adminId, 'dashboard_config', configUpdates);

    return updatedConfig;
  }

  async resetDashboardConfig(adminId: string): Promise<DashboardConfig> {
    const defaultConfig = this.getDefaultDashboardConfig();
    this.dashboardConfigs.set(adminId, defaultConfig);

    this.logConfigUpdate(adminId, 'dashboard_reset', {});

    return defaultConfig;
  }

  async exportDashboardConfig(adminId: string): Promise<any> {
    const config = await this.getDashboardConfig(adminId);
    const preferences = await this.getUserPreferences(adminId);

    return {
      dashboardConfig: config,
      userPreferences: preferences,
      exportedAt: new Date().toISOString(),
      exportedBy: adminId,
      version: '1.0'
    };
  }

  async importDashboardConfig(adminId: string, configData: any): Promise<DashboardConfig> {
    try {
      if (!configData.dashboardConfig) {
        throw new Error('Invalid configuration data: missing dashboardConfig');
      }

      const importedConfig = configData.dashboardConfig;
      this.validateDashboardConfig(importedConfig);

      this.dashboardConfigs.set(adminId, importedConfig);

      if (configData.userPreferences) {
        this.userPreferences.set(adminId, configData.userPreferences);
      }

      this.logConfigUpdate(adminId, 'dashboard_import', { version: configData.version });

      return importedConfig;
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUserPreferences(adminId: string): Promise<UserPreferences> {
    const preferences = this.userPreferences.get(adminId);
    if (preferences) {
      return preferences;
    }

    const defaultPreferences = this.getDefaultUserPreferences();
    this.userPreferences.set(adminId, defaultPreferences);
    return defaultPreferences;
  }

  async updateUserPreferences(adminId: string, preferencesUpdates: Partial<UserPreferences>): Promise<UserPreferences> {
    const currentPreferences = await this.getUserPreferences(adminId);
    const updatedPreferences = { ...currentPreferences, ...preferencesUpdates };

    this.userPreferences.set(adminId, updatedPreferences);

    this.logConfigUpdate(adminId, 'user_preferences', preferencesUpdates);

    return updatedPreferences;
  }

  async getLayoutConfig(adminId: string): Promise<LayoutConfig[]> {
    const config = await this.getDashboardConfig(adminId);
    return config.layout;
  }

  async updateLayoutConfig(adminId: string, layout: LayoutConfig[]): Promise<LayoutConfig[]> {
    const config = await this.getDashboardConfig(adminId);
    config.layout = layout;

    this.dashboardConfigs.set(adminId, config);

    this.logConfigUpdate(adminId, 'layout_update', { widgetCount: layout.length });

    return layout;
  }

  async addWidget(adminId: string, widget: LayoutConfig): Promise<LayoutConfig> {
    const config = await this.getDashboardConfig(adminId);

    const existingIds = config.layout.map(w => w.id);
    let newId = widget.id;
    let counter = 1;
    while (existingIds.includes(newId)) {
      newId = `${widget.id}-${counter}`;
      counter++;
    }

    const newWidget = { ...widget, id: newId };
    config.layout.push(newWidget);

    this.dashboardConfigs.set(adminId, config);

    this.logConfigUpdate(adminId, 'widget_add', { widgetType: widget.type, widgetId: newId });

    return newWidget;
  }

  async updateWidget(adminId: string, widgetId: string, updates: Partial<LayoutConfig>): Promise<LayoutConfig> {
    const config = await this.getDashboardConfig(adminId);
    const widget = config.layout.find(w => w.id === widgetId);

    if (!widget) {
      throw new Error(`Widget with ID ${widgetId} not found`);
    }

    Object.assign(widget, updates);
    this.dashboardConfigs.set(adminId, config);

    this.logConfigUpdate(adminId, 'widget_update', { widgetId, updates: Object.keys(updates) });

    return widget;
  }

  async removeWidget(adminId: string, widgetId: string): Promise<void> {
    const config = await this.getDashboardConfig(adminId);
    const initialLength = config.layout.length;

    config.layout = config.layout.filter(w => w.id !== widgetId);

    if (config.layout.length === initialLength) {
      throw new Error(`Widget with ID ${widgetId} not found`);
    }

    this.dashboardConfigs.set(adminId, config);

    this.logConfigUpdate(adminId, 'widget_remove', { widgetId });
  }

  async getDashboardMetrics(adminId: string, options: {
    timeRange?: string;
    categories?: string[];
  } = {}): Promise<DashboardMetrics> {
    const cacheKey = `admin:dashboard:metrics:${adminId}:${JSON.stringify(options)}`;
    const cachedMetrics = await cacheService.get<DashboardMetrics>(cacheKey);

    if (cachedMetrics) {
      return cachedMetrics;
    }

    // Fetch real financial metrics
    let businessMetrics;
    try {
      const financials = await this.financialService.getFinancialMetrics();
      const orderMetrics = await this.getOrderMetrics(); // Use existing order metrics for count

      businessMetrics = {
        revenue: parseFloat(financials.totalRevenue),
        transactions: orderMetrics.totalOrders,
        conversionRate: (Math.random() * 5).toFixed(2), // Still mocked for now (requires analytics service)
        averageOrderValue: orderMetrics.totalOrders > 0 ? (parseFloat(financials.totalRevenue) / orderMetrics.totalOrders) : 0
      };
    } catch (e) {
      console.error('Failed to fetch financial metrics, using fallback', e);
      businessMetrics = {
        revenue: 0,
        transactions: 0,
        conversionRate: '0.00',
        averageOrderValue: 0
      };
    }

    const metrics: DashboardMetrics = {
      systemMetrics: {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        disk: Math.random() * 100,
        network: Math.random() * 1000,
        activeConnections: Math.floor(Math.random() * 1000) + 100,
        uptime: process.uptime()
      },
      userMetrics: {
        totalUsers: 10000 + Math.floor(Math.random() * 1000), // Should ideally come from UserService
        activeUsers: 500 + Math.floor(Math.random() * 100),
        newRegistrations: Math.floor(Math.random() * 50),
        userGrowthRate: (Math.random() * 10).toFixed(2)
      },
      businessMetrics: businessMetrics,
      securityMetrics: {
        threatLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        blockedRequests: Math.floor(Math.random() * 100),
        suspiciousActivity: Math.floor(Math.random() * 10),
        securityScore: 85 + Math.random() * 15
      }
    };

    if (options.categories && options.categories.length > 0) {
      const filteredMetrics: any = {};
      options.categories.forEach(category => {
        if (metrics[category as keyof DashboardMetrics]) {
          filteredMetrics[category] = metrics[category as keyof DashboardMetrics];
        }
      });

      await cacheService.set(cacheKey, filteredMetrics, 30);
      return filteredMetrics;
    }

    await cacheService.set(cacheKey, metrics, 60);

    return metrics;
  }

  async getAlerts(adminId: string, options: {
    severity?: string;
    acknowledged?: boolean;
    limit?: number;
  } = {}): Promise<AdminAlert[]> {
    return this.getAlertsWithMemoryManagement(options);
  }

  async acknowledgeAlert(adminId: string, alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert with ID ${alertId} not found`);
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = adminId;
    alert.acknowledgedAt = new Date();

    this.alerts.set(alertId, alert);

    this.logConfigUpdate(adminId, 'alert_acknowledge', { alertId, alertType: alert.type });
  }

  async dismissAlert(adminId: string, alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert with ID ${alertId} not found`);
    }

    this.alerts.delete(alertId);

    this.logConfigUpdate(adminId, 'alert_dismiss', { alertId, alertType: alert.type });
  }

  async getDashboardUsageAnalytics(adminId: string, options: {
    timeRange?: string;
  } = {}): Promise<any> {
    const analytics = this.usageAnalytics.get(adminId) || {
      totalSessions: 0,
      averageSessionDuration: 0,
      mostUsedWidgets: [],
      configChanges: 0,
      lastActive: new Date()
    };

    return {
      ...analytics,
      timeRange: options.timeRange || '24h',
      generatedAt: new Date().toISOString()
    };
  }

  async getDashboardPerformanceMetrics(adminId: string, options: {
    timeRange?: string;
  } = {}): Promise<any> {
    return {
      loadTime: Math.random() * 2000 + 500, // 500-2500ms
      renderTime: Math.random() * 1000 + 200, // 200-1200ms
      memoryUsage: Math.random() * 100 + 50, // 50-150MB
      networkRequests: Math.floor(Math.random() * 50) + 10, // 10-60 requests
      errorRate: Math.random() * 5, // 0-5%
      timeRange: options.timeRange || '24h',
      generatedAt: new Date().toISOString()
    };
  }

  // --- Privates and Helpers ---

  private getDefaultDashboardConfig(): DashboardConfig {
    return {
      layout: [
        {
          id: 'system-overview',
          type: 'metric',
          position: { x: 0, y: 0, w: 6, h: 4 },
          config: {
            metric: 'system',
            title: 'System Overview',
            showTrend: true,
            refreshInterval: 5000
          },
          visible: true
        },
        {
          id: 'user-metrics',
          type: 'chart',
          position: { x: 6, y: 0, w: 6, h: 4 },
          config: {
            chartType: 'line',
            metric: 'users',
            title: 'User Metrics',
            timeRange: '24h'
          },
          visible: true
        },
        {
          id: 'business-metrics',
          type: 'chart',
          position: { x: 0, y: 4, w: 6, h: 4 },
          config: {
            chartType: 'bar',
            metric: 'business',
            title: 'Business Metrics',
            timeRange: '7d'
          },
          visible: true
        },
        {
          id: 'security-alerts',
          type: 'alert',
          position: { x: 6, y: 4, w: 6, h: 4 },
          config: {
            title: 'Security Alerts',
            maxItems: 10,
            autoRefresh: true
          },
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
        desktop: true,
        position: 'top-right'
      },
      gridSize: { cols: 12, rows: 12 },
      compactMode: false
    };
  }

  private getDefaultUserPreferences(): UserPreferences {
    return {
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD HH:mm:ss',
      notifications: {
        enabled: true,
        categories: ['system', 'security', 'business'],
        priority: ['medium', 'high', 'critical'],
        sound: true,
        desktop: true,
        position: 'top-right'
      },
      accessibility: {
        highContrast: false,
        reducedMotion: false,
        screenReader: false
      }
    };
  }

  private validateDashboardConfig(config: any): void {
    if (!config.layout || !Array.isArray(config.layout)) {
      throw new Error('Invalid configuration: layout must be an array');
    }

    config.layout.forEach((widget: any, index: number) => {
      if (!widget.id || !widget.type || !widget.position) {
        throw new Error(`Invalid widget at index ${index}: missing required fields`);
      }

      if (!widget.position.x !== undefined || widget.position.y === undefined ||
        widget.position.w === undefined || widget.position.h === undefined) {
        throw new Error(`Invalid widget at index ${index}: invalid position`);
      }
    });
  }

  private logConfigUpdate(adminId: string, action: string, data: any): void {
    const currentAnalytics = this.usageAnalytics.get(adminId) || {
      totalSessions: 0,
      averageSessionDuration: 0,
      mostUsedWidgets: [],
      configChanges: 0,
      lastActive: new Date(),
      actions: []
    };

    currentAnalytics.configChanges++;
    currentAnalytics.lastActive = new Date();
    currentAnalytics.actions = currentAnalytics.actions || [];
    currentAnalytics.actions.push({
      action,
      data,
      timestamp: new Date()
    });

    if (currentAnalytics.actions.length > this.actionHistoryLimit) {
      currentAnalytics.actions = currentAnalytics.actions.slice(-this.actionHistoryLimit);
    }

    this.usageAnalytics.set(adminId, currentAnalytics);
  }

  public performCleanup(): void {
    this.cleanupExpiredData();
  }

  public getMemoryUsage(): {
    dashboardConfigs: number;
    userPreferences: number;
    alerts: number;
    usageAnalytics: number;
    totalEntries: number;
  } {
    return {
      dashboardConfigs: this.dashboardConfigs.size,
      userPreferences: this.userPreferences.size,
      alerts: this.alerts.size,
      usageAnalytics: this.usageAnalytics.size,
      totalEntries: this.dashboardConfigs.size + this.userPreferences.size + this.alerts.size + this.usageAnalytics.size
    };
  }

  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cleanupExpiredData();
    console.log('AdminDashboardService shutdown completed');
  }

  public addAlert(alert: AdminAlert): void {
    if (this.alerts.size >= this.maxMapSize) {
      const oldestAlerts = Array.from(this.alerts.entries())
        .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime())
        .slice(0, 100);

      oldestAlerts.forEach(([id]) => this.alerts.delete(id));
      console.log(`Removed ${oldestAlerts.length} old alerts to make space for new alert`);
    }

    this.alerts.set(alert.id, alert);
  }

  public generateSampleAlert(): AdminAlert {
    if (this.alerts.size >= this.maxMapSize) {
      throw new Error('Alert limit reached. Please clean up expired alerts first.');
    }

    const alertTypes = ['anomaly', 'threshold', 'security', 'system', 'business'] as const;
    const severities = ['low', 'medium', 'high', 'critical'] as const;

    const type = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];

    const alertTemplates = {
      system: {
        title: 'System Performance Alert',
        message: 'System performance metrics have exceeded normal thresholds'
      },
      security: {
        title: 'Security Threat Detected',
        message: 'Potential security threat has been identified'
      },
      business: {
        title: 'Business Metric Alert',
        message: 'Business performance indicators require attention'
      },
      anomaly: {
        title: 'Anomaly Detected',
        message: 'Unusual pattern detected in system behavior'
      },
      threshold: {
        title: 'Threshold Exceeded',
        message: 'Configured threshold has been exceeded'
      }
    };

    const template = alertTemplates[type];

    return {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      title: template.title,
      message: template.message,
      data: {
        value: Math.random() * 100,
        threshold: 80,
        source: 'monitoring-system'
      },
      timestamp: new Date(),
      acknowledged: false
    };
  }

  public addAlerts(alerts: AdminAlert[]): void {
    alerts.forEach(alert => {
      try {
        this.addAlert(alert);
      } catch (error) {
        console.error('Failed to add alert:', error);
      }
    });
  }

  public getAlertsWithMemoryManagement(options: {
    severity?: string;
    acknowledged?: boolean;
    limit?: number;
  } = {}): Promise<AdminAlert[]> {
    const maxLimit = Math.min(options.limit || 50, 200);

    let alerts = Array.from(this.alerts.values());

    if (options.severity) {
      alerts = alerts.filter(alert => alert.severity === options.severity);
    }

    if (options.acknowledged !== undefined) {
      alerts = alerts.filter(alert => alert.acknowledged === options.acknowledged);
    }

    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    alerts = alerts.slice(0, maxLimit);

    return Promise.resolve(alerts);
  }
}

export const adminDashboardService = new AdminDashboardService();
