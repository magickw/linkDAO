import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Types
interface LayoutConfig {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert' | 'custom';
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, any>;
  visible: boolean;
  minimized?: boolean;
}

interface DashboardConfig {
  layout: LayoutConfig[];
  refreshInterval: number;
  autoRefresh: boolean;
  theme: 'light' | 'dark' | 'auto';
  notifications: NotificationPreferences;
  gridSize: { cols: number; rows: number };
  compactMode: boolean;
}

interface NotificationPreferences {
  enabled: boolean;
  categories: string[];
  priority: ('low' | 'medium' | 'high' | 'critical')[];
  sound: boolean;
  desktop: boolean;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

interface AdminUser {
  adminId: string;
  email: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'analyst';
  permissions: string[];
}

interface ConnectionHealth {
  status: 'healthy' | 'degraded' | 'unstable' | 'disconnected';
  latency: number;
  lastHeartbeat: Date;
  reconnectCount: number;
  dataQuality: 'high' | 'medium' | 'low';
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
  resolvedAt?: Date;
}

interface DashboardState {
  // User and authentication
  adminUser: AdminUser | null;
  isAuthenticated: boolean;
  
  // Dashboard configuration
  dashboardConfig: DashboardConfig;
  
  // Connection state
  connectionHealth: ConnectionHealth;
  isConnected: boolean;
  
  // Dashboard data
  metrics: DashboardMetrics | null;
  alerts: AdminAlert[];
  lastUpdate: Date | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  selectedWidget: string | null;
  draggedWidget: string | null;
  
  // Layout state
  isEditMode: boolean;
  showGrid: boolean;
  
  // Filters and preferences
  activeFilters: Record<string, any>;
  timeRange: { start: Date; end: Date } | null;
  
  // Actions
  setAdminUser: (user: AdminUser | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  
  // Dashboard configuration actions
  updateDashboardConfig: (config: Partial<DashboardConfig>) => void;
  addWidget: (widget: LayoutConfig) => void;
  removeWidget: (widgetId: string) => void;
  updateWidget: (widgetId: string, updates: Partial<LayoutConfig>) => void;
  moveWidget: (widgetId: string, position: { x: number; y: number }) => void;
  resizeWidget: (widgetId: string, size: { w: number; h: number }) => void;
  toggleWidgetVisibility: (widgetId: string) => void;
  minimizeWidget: (widgetId: string) => void;
  maximizeWidget: (widgetId: string) => void;
  
  // Connection actions
  setConnectionHealth: (health: ConnectionHealth) => void;
  setConnected: (connected: boolean) => void;
  
  // Data actions
  setMetrics: (metrics: DashboardMetrics) => void;
  updateMetrics: (updates: Partial<DashboardMetrics>) => void;
  addAlert: (alert: AdminAlert) => void;
  acknowledgeAlert: (alertId: string) => void;
  removeAlert: (alertId: string) => void;
  clearAlerts: () => void;
  
  // UI actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  selectWidget: (widgetId: string | null) => void;
  setDraggedWidget: (widgetId: string | null) => void;
  
  // Layout actions
  setEditMode: (editMode: boolean) => void;
  toggleEditMode: () => void;
  setShowGrid: (showGrid: boolean) => void;
  resetLayout: () => void;
  
  // Filter actions
  setActiveFilters: (filters: Record<string, any>) => void;
  updateFilter: (key: string, value: any) => void;
  clearFilters: () => void;
  setTimeRange: (range: { start: Date; end: Date } | null) => void;
  
  // Utility actions
  refreshData: () => void;
  exportConfig: () => string;
  importConfig: (config: string) => void;
  resetToDefaults: () => void;
}

// Default configurations
const getDefaultDashboardConfig = (): DashboardConfig => ({
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
});

const getDefaultConnectionHealth = (): ConnectionHealth => ({
  status: 'disconnected',
  latency: 0,
  lastHeartbeat: new Date(),
  reconnectCount: 0,
  dataQuality: 'high'
});

// Create the store
export const useAdminDashboardStore = create<DashboardState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      adminUser: null,
      isAuthenticated: false,
      dashboardConfig: getDefaultDashboardConfig(),
      connectionHealth: getDefaultConnectionHealth(),
      isConnected: false,
      metrics: null,
      alerts: [],
      lastUpdate: null,
      isLoading: false,
      error: null,
      selectedWidget: null,
      draggedWidget: null,
      isEditMode: false,
      showGrid: false,
      activeFilters: {},
      timeRange: null,

      // User and authentication actions
      setAdminUser: (user) => set((state) => {
        state.adminUser = user;
      }),

      setAuthenticated: (authenticated) => set((state) => {
        state.isAuthenticated = authenticated;
        if (!authenticated) {
          state.adminUser = null;
          state.isConnected = false;
          state.connectionHealth = getDefaultConnectionHealth();
        }
      }),

      // Dashboard configuration actions
      updateDashboardConfig: (config) => set((state) => {
        state.dashboardConfig = { ...state.dashboardConfig, ...config };
      }),

      addWidget: (widget) => set((state) => {
        // Ensure unique ID
        const existingIds = state.dashboardConfig.layout.map(w => w.id);
        let newId = widget.id;
        let counter = 1;
        while (existingIds.includes(newId)) {
          newId = `${widget.id}-${counter}`;
          counter++;
        }
        
        const newWidget = { ...widget, id: newId };
        state.dashboardConfig.layout.push(newWidget);
      }),

      removeWidget: (widgetId) => set((state) => {
        state.dashboardConfig.layout = state.dashboardConfig.layout.filter(
          widget => widget.id !== widgetId
        );
        if (state.selectedWidget === widgetId) {
          state.selectedWidget = null;
        }
      }),

      updateWidget: (widgetId, updates) => set((state) => {
        const widget = state.dashboardConfig.layout.find(w => w.id === widgetId);
        if (widget) {
          Object.assign(widget, updates);
        }
      }),

      moveWidget: (widgetId, position) => set((state) => {
        const widget = state.dashboardConfig.layout.find(w => w.id === widgetId);
        if (widget) {
          widget.position = { ...widget.position, ...position };
        }
      }),

      resizeWidget: (widgetId, size) => set((state) => {
        const widget = state.dashboardConfig.layout.find(w => w.id === widgetId);
        if (widget) {
          widget.position = { ...widget.position, ...size };
        }
      }),

      toggleWidgetVisibility: (widgetId) => set((state) => {
        const widget = state.dashboardConfig.layout.find(w => w.id === widgetId);
        if (widget) {
          widget.visible = !widget.visible;
        }
      }),

      minimizeWidget: (widgetId) => set((state) => {
        const widget = state.dashboardConfig.layout.find(w => w.id === widgetId);
        if (widget) {
          widget.minimized = true;
        }
      }),

      maximizeWidget: (widgetId) => set((state) => {
        const widget = state.dashboardConfig.layout.find(w => w.id === widgetId);
        if (widget) {
          widget.minimized = false;
        }
      }),

      // Connection actions
      setConnectionHealth: (health) => set((state) => {
        state.connectionHealth = health;
      }),

      setConnected: (connected) => set((state) => {
        state.isConnected = connected;
        if (!connected) {
          state.connectionHealth.status = 'disconnected';
        }
      }),

      // Data actions
      setMetrics: (metrics) => set((state) => {
        state.metrics = metrics;
        state.lastUpdate = new Date();
      }),

      updateMetrics: (updates) => set((state) => {
        if (state.metrics) {
          state.metrics = { ...state.metrics, ...updates };
          state.lastUpdate = new Date();
        }
      }),

      addAlert: (alert) => set((state) => {
        // Avoid duplicates
        const exists = state.alerts.some(a => a.id === alert.id);
        if (!exists) {
          state.alerts.unshift(alert); // Add to beginning
          
          // Limit alerts to prevent memory issues
          if (state.alerts.length > 100) {
            state.alerts = state.alerts.slice(0, 100);
          }
        }
      }),

      acknowledgeAlert: (alertId) => set((state) => {
        const alert = state.alerts.find(a => a.id === alertId);
        if (alert) {
          alert.acknowledged = true;
        }
      }),

      removeAlert: (alertId) => set((state) => {
        state.alerts = state.alerts.filter(a => a.id !== alertId);
      }),

      clearAlerts: () => set((state) => {
        state.alerts = [];
      }),

      // UI actions
      setLoading: (loading) => set((state) => {
        state.isLoading = loading;
      }),

      setError: (error) => set((state) => {
        state.error = error;
      }),

      selectWidget: (widgetId) => set((state) => {
        state.selectedWidget = widgetId;
      }),

      setDraggedWidget: (widgetId) => set((state) => {
        state.draggedWidget = widgetId;
      }),

      // Layout actions
      setEditMode: (editMode) => set((state) => {
        state.isEditMode = editMode;
        if (!editMode) {
          state.selectedWidget = null;
          state.draggedWidget = null;
        }
      }),

      toggleEditMode: () => set((state) => {
        state.isEditMode = !state.isEditMode;
        if (!state.isEditMode) {
          state.selectedWidget = null;
          state.draggedWidget = null;
        }
      }),

      setShowGrid: (showGrid) => set((state) => {
        state.showGrid = showGrid;
      }),

      resetLayout: () => set((state) => {
        state.dashboardConfig.layout = getDefaultDashboardConfig().layout;
        state.selectedWidget = null;
        state.draggedWidget = null;
      }),

      // Filter actions
      setActiveFilters: (filters) => set((state) => {
        state.activeFilters = filters;
      }),

      updateFilter: (key, value) => set((state) => {
        if (value === null || value === undefined || value === '') {
          delete state.activeFilters[key];
        } else {
          state.activeFilters[key] = value;
        }
      }),

      clearFilters: () => set((state) => {
        state.activeFilters = {};
      }),

      setTimeRange: (range) => set((state) => {
        state.timeRange = range;
      }),

      // Utility actions
      refreshData: () => {
        // This would trigger a data refresh
        // Implementation would depend on the WebSocket service
        console.log('Refreshing dashboard data...');
      },

      exportConfig: () => {
        const state = get();
        const exportData = {
          dashboardConfig: state.dashboardConfig,
          activeFilters: state.activeFilters,
          timeRange: state.timeRange,
          exportedAt: new Date().toISOString()
        };
        return JSON.stringify(exportData, null, 2);
      },

      importConfig: (configString) => {
        try {
          const importData = JSON.parse(configString);
          set((state) => {
            if (importData.dashboardConfig) {
              state.dashboardConfig = importData.dashboardConfig;
            }
            if (importData.activeFilters) {
              state.activeFilters = importData.activeFilters;
            }
            if (importData.timeRange) {
              state.timeRange = importData.timeRange;
            }
          });
        } catch (error) {
          console.error('Failed to import configuration:', error);
          set((state) => {
            state.error = 'Failed to import configuration: Invalid format';
          });
        }
      },

      resetToDefaults: () => set((state) => {
        state.dashboardConfig = getDefaultDashboardConfig();
        state.activeFilters = {};
        state.timeRange = null;
        state.selectedWidget = null;
        state.draggedWidget = null;
        state.isEditMode = false;
        state.showGrid = false;
      })
    })),
    {
      name: 'admin-dashboard-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist configuration and preferences, not runtime data
        dashboardConfig: state.dashboardConfig,
        activeFilters: state.activeFilters,
        timeRange: state.timeRange,
        isEditMode: state.isEditMode,
        showGrid: state.showGrid
      }),
      version: 1,
      migrate: (persistedState: any, version: number) => {
        // Handle migrations between versions
        if (version === 0) {
          // Migration from version 0 to 1
          return {
            ...persistedState,
            dashboardConfig: {
              ...getDefaultDashboardConfig(),
              ...persistedState.dashboardConfig
            }
          };
        }
        return persistedState;
      }
    }
  )
);

// Selectors for optimized re-renders
export const selectDashboardConfig = (state: DashboardState) => state.dashboardConfig;
export const selectVisibleWidgets = (state: DashboardState) => 
  state.dashboardConfig.layout.filter(widget => widget.visible);
export const selectConnectionStatus = (state: DashboardState) => ({
  isConnected: state.isConnected,
  health: state.connectionHealth
});
export const selectMetrics = (state: DashboardState) => state.metrics;
export const selectAlerts = (state: DashboardState) => state.alerts;
export const selectUnacknowledgedAlerts = (state: DashboardState) => 
  state.alerts.filter(alert => !alert.acknowledged);
export const selectCriticalAlerts = (state: DashboardState) => 
  state.alerts.filter(alert => alert.severity === 'critical');
export const selectIsEditMode = (state: DashboardState) => state.isEditMode;
export const selectSelectedWidget = (state: DashboardState) => state.selectedWidget;
export const selectActiveFilters = (state: DashboardState) => state.activeFilters;

// Hook for dashboard configuration persistence
export const useDashboardPersistence = () => {
  const store = useAdminDashboardStore();
  
  const saveToServer = async (config: DashboardConfig) => {
    // This would integrate with the WebSocket service to persist to server
    try {
      // Implementation would call the admin WebSocket service
      console.log('Saving dashboard config to server:', config);
    } catch (error) {
      console.error('Failed to save dashboard config to server:', error);
    }
  };

  const loadFromServer = async (): Promise<DashboardConfig | null> => {
    // This would load configuration from server
    try {
      // Implementation would call the admin WebSocket service
      console.log('Loading dashboard config from server');
      return null;
    } catch (error) {
      console.error('Failed to load dashboard config from server:', error);
      return null;
    }
  };

  return {
    saveToServer,
    loadFromServer,
    exportConfig: store.exportConfig,
    importConfig: store.importConfig,
    resetToDefaults: store.resetToDefaults
  };
};