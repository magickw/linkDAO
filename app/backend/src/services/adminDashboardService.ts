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

class AdminDashboardService {
  // In-memory storage for demo purposes
  // In production, this would use a database
  private dashboardConfigs: Map<string, DashboardConfig> = new Map();
  private userPreferences: Map<string, UserPreferences> = new Map();
  private alerts: Map<string, AdminAlert> = new Map();
  private usageAnalytics: Map<string, any> = new Map();

  constructor() {
    this.initializeDefaultData();
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

  // Dashboard configuration methods
  async getDashboardConfig(adminId: string): Promise<DashboardConfig> {
    const config = this.dashboardConfigs.get(adminId);
    if (config) {
      return config;
    }

    // Return default configuration
    const defaultConfig = this.getDefaultDashboardConfig();
    this.dashboardConfigs.set(adminId, defaultConfig);
    return defaultConfig;
  }

  async updateDashboardConfig(adminId: string, configUpdates: Partial<DashboardConfig>): Promise<DashboardConfig> {
    const currentConfig = await this.getDashboardConfig(adminId);
    const updatedConfig = { ...currentConfig, ...configUpdates };
    
    this.dashboardConfigs.set(adminId, updatedConfig);
    
    // Log the update for analytics
    this.logConfigUpdate(adminId, 'dashboard_config', configUpdates);
    
    return updatedConfig;
  }

  async resetDashboardConfig(adminId: string): Promise<DashboardConfig> {
    const defaultConfig = this.getDefaultDashboardConfig();
    this.dashboardConfigs.set(adminId, defaultConfig);
    
    // Log the reset for analytics
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
      // Validate the imported data
      if (!configData.dashboardConfig) {
        throw new Error('Invalid configuration data: missing dashboardConfig');
      }

      const importedConfig = configData.dashboardConfig;
      
      // Validate the structure
      this.validateDashboardConfig(importedConfig);
      
      // Store the imported configuration
      this.dashboardConfigs.set(adminId, importedConfig);
      
      // Import user preferences if available
      if (configData.userPreferences) {
        this.userPreferences.set(adminId, configData.userPreferences);
      }
      
      // Log the import for analytics
      this.logConfigUpdate(adminId, 'dashboard_import', { version: configData.version });
      
      return importedConfig;
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // User preferences methods
  async getUserPreferences(adminId: string): Promise<UserPreferences> {
    const preferences = this.userPreferences.get(adminId);
    if (preferences) {
      return preferences;
    }

    // Return default preferences
    const defaultPreferences = this.getDefaultUserPreferences();
    this.userPreferences.set(adminId, defaultPreferences);
    return defaultPreferences;
  }

  async updateUserPreferences(adminId: string, preferencesUpdates: Partial<UserPreferences>): Promise<UserPreferences> {
    const currentPreferences = await this.getUserPreferences(adminId);
    const updatedPreferences = { ...currentPreferences, ...preferencesUpdates };
    
    this.userPreferences.set(adminId, updatedPreferences);
    
    // Log the update for analytics
    this.logConfigUpdate(adminId, 'user_preferences', preferencesUpdates);
    
    return updatedPreferences;
  }

  // Layout configuration methods
  async getLayoutConfig(adminId: string): Promise<LayoutConfig[]> {
    const config = await this.getDashboardConfig(adminId);
    return config.layout;
  }

  async updateLayoutConfig(adminId: string, layout: LayoutConfig[]): Promise<LayoutConfig[]> {
    const config = await this.getDashboardConfig(adminId);
    config.layout = layout;
    
    this.dashboardConfigs.set(adminId, config);
    
    // Log the update for analytics
    this.logConfigUpdate(adminId, 'layout_update', { widgetCount: layout.length });
    
    return layout;
  }

  async addWidget(adminId: string, widget: LayoutConfig): Promise<LayoutConfig> {
    const config = await this.getDashboardConfig(adminId);
    
    // Ensure unique ID
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
    
    // Log the addition for analytics
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
    
    // Log the update for analytics
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
    
    // Log the removal for analytics
    this.logConfigUpdate(adminId, 'widget_remove', { widgetId });
  }

  // Dashboard data methods
  async getDashboardMetrics(adminId: string, options: {
    timeRange?: string;
    categories?: string[];
  } = {}): Promise<DashboardMetrics> {
    // Simulate real-time metrics
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
        totalUsers: 10000 + Math.floor(Math.random() * 1000),
        activeUsers: 500 + Math.floor(Math.random() * 100),
        newRegistrations: Math.floor(Math.random() * 50),
        userGrowthRate: (Math.random() * 10).toFixed(2)
      },
      businessMetrics: {
        revenue: 50000 + Math.random() * 10000,
        transactions: 1000 + Math.floor(Math.random() * 200),
        conversionRate: (Math.random() * 5).toFixed(2),
        averageOrderValue: 100 + Math.random() * 50
      },
      securityMetrics: {
        threatLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        blockedRequests: Math.floor(Math.random() * 100),
        suspiciousActivity: Math.floor(Math.random() * 10),
        securityScore: 85 + Math.random() * 15
      }
    };

    // Filter by categories if specified
    if (options.categories && options.categories.length > 0) {
      const filteredMetrics: any = {};
      options.categories.forEach(category => {
        if (metrics[category as keyof DashboardMetrics]) {
          filteredMetrics[category] = metrics[category as keyof DashboardMetrics];
        }
      });
      return filteredMetrics;
    }

    return metrics;
  }

  async getAlerts(adminId: string, options: {
    severity?: string;
    acknowledged?: boolean;
    limit?: number;
  } = {}): Promise<AdminAlert[]> {
    let alerts = Array.from(this.alerts.values());

    // Filter by severity
    if (options.severity) {
      alerts = alerts.filter(alert => alert.severity === options.severity);
    }

    // Filter by acknowledged status
    if (options.acknowledged !== undefined) {
      alerts = alerts.filter(alert => alert.acknowledged === options.acknowledged);
    }

    // Sort by timestamp (newest first)
    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (options.limit) {
      alerts = alerts.slice(0, options.limit);
    }

    return alerts;
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

    // Log the acknowledgment for analytics
    this.logConfigUpdate(adminId, 'alert_acknowledge', { alertId, alertType: alert.type });
  }

  async dismissAlert(adminId: string, alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert with ID ${alertId} not found`);
    }

    this.alerts.delete(alertId);

    // Log the dismissal for analytics
    this.logConfigUpdate(adminId, 'alert_dismiss', { alertId, alertType: alert.type });
  }

  // Analytics methods
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

  // Utility methods
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

    // Keep only last 100 actions
    if (currentAnalytics.actions.length > 100) {
      currentAnalytics.actions = currentAnalytics.actions.slice(-100);
    }

    this.usageAnalytics.set(adminId, currentAnalytics);
  }

  // Public method to add alerts (for testing/demo purposes)
  public addAlert(alert: AdminAlert): void {
    this.alerts.set(alert.id, alert);
  }

  // Public method to generate sample data
  public generateSampleAlert(): AdminAlert {
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
}

export const adminDashboardService = new AdminDashboardService();
