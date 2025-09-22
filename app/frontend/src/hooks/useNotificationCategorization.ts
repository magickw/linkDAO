/**
 * React Hook for Notification Categorization
 * Provides interface for managing notification categories, filters, and preferences
 * Requirements: 8.1, 8.3, 8.4
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  notificationCategorizationService,
  NotificationFilter,
  NotificationGroup,
  CategoryConfig,
  NotificationHistoryEntry,
  EnhancedNotificationCategory
} from '../services/notificationCategorizationService';
import { RealTimeNotification } from '../types/realTimeNotifications';

// Hook options
interface UseNotificationCategorizationOptions {
  autoLoadHistory?: boolean;
  historyLimit?: number;
  enableGrouping?: boolean;
  enableFiltering?: boolean;
}

// Hook return interface
interface UseNotificationCategorizationReturn {
  // Filters
  filters: NotificationFilter[];
  activeFilters: NotificationFilter[];
  setFilter: (filter: NotificationFilter) => void;
  removeFilter: (filterId: string) => void;
  activateFilter: (filterId: string) => void;
  deactivateFilter: (filterId: string) => void;
  
  // Categories
  categoryConfigs: CategoryConfig[];
  updateCategoryConfig: (category: EnhancedNotificationCategory, updates: Partial<CategoryConfig>) => void;
  
  // Processing
  categorizeNotification: (notification: RealTimeNotification) => any;
  filterNotifications: (notifications: RealTimeNotification[]) => RealTimeNotification[];
  groupNotifications: (notifications: RealTimeNotification[]) => NotificationGroup[];
  
  // History
  history: NotificationHistoryEntry[];
  addToHistory: (notification: RealTimeNotification, action?: string) => void;
  markAsReadInHistory: (notificationId: string) => void;
  markAsDismissedInHistory: (notificationId: string) => void;
  clearHistory: () => void;
  
  // Statistics
  statistics: {
    totalNotifications: number;
    unreadCount: number;
    categoryBreakdown: Record<string, number>;
    priorityBreakdown: Record<string, number>;
  };
  
  // Utilities
  createCustomFilter: (name: string, config: Partial<NotificationFilter>) => NotificationFilter;
  duplicateFilter: (filterId: string, newName: string) => NotificationFilter | null;
  resetToDefaults: () => void;
}

/**
 * Main notification categorization hook
 */
export function useNotificationCategorization(
  options: UseNotificationCategorizationOptions = {}
): UseNotificationCategorizationReturn {
  const {
    autoLoadHistory = true,
    historyLimit = 100,
    enableGrouping = true,
    enableFiltering = true
  } = options;

  // State
  const [filters, setFilters] = useState<NotificationFilter[]>([]);
  const [activeFilters, setActiveFilters] = useState<NotificationFilter[]>([]);
  const [categoryConfigs, setCategoryConfigs] = useState<CategoryConfig[]>([]);
  const [history, setHistory] = useState<NotificationHistoryEntry[]>([]);
  const [statistics, setStatistics] = useState({
    totalNotifications: 0,
    unreadCount: 0,
    categoryBreakdown: {},
    priorityBreakdown: {}
  });

  // Refs
  const mountedRef = useRef(true);
  const listenersRef = useRef<Map<string, Function>>(new Map());

  // Load initial data
  const loadData = useCallback(() => {
    if (!mountedRef.current) return;
    
    setFilters(notificationCategorizationService.getFilters());
    setActiveFilters(notificationCategorizationService.getActiveFilters());
    setCategoryConfigs(notificationCategorizationService.getCategoryConfigs());
    
    if (autoLoadHistory) {
      setHistory(notificationCategorizationService.getHistory(historyLimit));
    }
    
    setStatistics(notificationCategorizationService.getStatistics());
  }, [autoLoadHistory, historyLimit]);

  // Filter management
  const setFilter = useCallback((filter: NotificationFilter) => {
    notificationCategorizationService.setFilter(filter);
  }, []);

  const removeFilter = useCallback((filterId: string) => {
    notificationCategorizationService.removeFilter(filterId);
  }, []);

  const activateFilter = useCallback((filterId: string) => {
    notificationCategorizationService.activateFilter(filterId);
  }, []);

  const deactivateFilter = useCallback((filterId: string) => {
    notificationCategorizationService.deactivateFilter(filterId);
  }, []);

  // Category management
  const updateCategoryConfig = useCallback((
    category: EnhancedNotificationCategory, 
    updates: Partial<CategoryConfig>
  ) => {
    notificationCategorizationService.updateCategoryConfig(category, updates);
  }, []);

  // Processing functions
  const categorizeNotification = useCallback((notification: RealTimeNotification) => {
    return notificationCategorizationService.categorizeNotification(notification);
  }, []);

  const filterNotifications = useCallback((notifications: RealTimeNotification[]) => {
    if (!enableFiltering) return notifications;
    return notificationCategorizationService.filterNotifications(notifications);
  }, [enableFiltering]);

  const groupNotifications = useCallback((notifications: RealTimeNotification[]) => {
    if (!enableGrouping) {
      // Return individual groups for each notification
      return notifications.map(notification => {
        const { category } = notificationCategorizationService.categorizeNotification(notification);
        return {
          id: notification.id,
          category,
          title: notification.title,
          notifications: [notification],
          count: 1,
          latestTimestamp: notification.timestamp,
          priority: notification.priority,
          isCollapsed: false
        };
      });
    }
    return notificationCategorizationService.groupNotifications(notifications);
  }, [enableGrouping]);

  // History management
  const addToHistory = useCallback((notification: RealTimeNotification, action?: string) => {
    notificationCategorizationService.addToHistory(notification, action);
  }, []);

  const markAsReadInHistory = useCallback((notificationId: string) => {
    notificationCategorizationService.markAsReadInHistory(notificationId);
  }, []);

  const markAsDismissedInHistory = useCallback((notificationId: string) => {
    notificationCategorizationService.markAsDismissedInHistory(notificationId);
  }, []);

  const clearHistory = useCallback(() => {
    notificationCategorizationService.clearHistory();
  }, []);

  // Utility functions
  const createCustomFilter = useCallback((name: string, config: Partial<NotificationFilter>): NotificationFilter => {
    const filter: NotificationFilter = {
      id: `custom_${Date.now()}`,
      name,
      description: config.description || `Custom filter: ${name}`,
      categories: config.categories || Object.values(EnhancedNotificationCategory),
      priorities: config.priorities || [],
      keywords: config.keywords || [],
      excludeKeywords: config.excludeKeywords || [],
      timeRange: config.timeRange,
      userFilters: config.userFilters,
      isActive: config.isActive ?? false,
      isDefault: false
    };
    
    setFilter(filter);
    return filter;
  }, [setFilter]);

  const duplicateFilter = useCallback((filterId: string, newName: string): NotificationFilter | null => {
    const existingFilter = filters.find(f => f.id === filterId);
    if (!existingFilter) return null;
    
    const duplicatedFilter: NotificationFilter = {
      ...existingFilter,
      id: `duplicate_${Date.now()}`,
      name: newName,
      isActive: false,
      isDefault: false
    };
    
    setFilter(duplicatedFilter);
    return duplicatedFilter;
  }, [filters, setFilter]);

  const resetToDefaults = useCallback(() => {
    // Remove all custom filters
    filters.forEach(filter => {
      if (!filter.isDefault) {
        removeFilter(filter.id);
      }
    });
    
    // Reset category configs to defaults
    categoryConfigs.forEach(config => {
      // This would reset to default values - implementation depends on how defaults are stored
      updateCategoryConfig(config.category, {
        soundEnabled: true,
        desktopEnabled: true,
        emailEnabled: false,
        pushEnabled: true
      });
    });
  }, [filters, categoryConfigs, removeFilter, updateCategoryConfig]);

  // Setup event listeners
  useEffect(() => {
    const handleFilterUpdated = (filter: NotificationFilter) => {
      if (!mountedRef.current) return;
      loadData();
    };

    const handleFilterRemoved = (filterId: string) => {
      if (!mountedRef.current) return;
      loadData();
    };

    const handleFilterActivated = (filter: NotificationFilter) => {
      if (!mountedRef.current) return;
      setActiveFilters(notificationCategorizationService.getActiveFilters());
    };

    const handleFilterDeactivated = (filter: NotificationFilter) => {
      if (!mountedRef.current) return;
      setActiveFilters(notificationCategorizationService.getActiveFilters());
    };

    const handleCategoryUpdated = (data: { category: EnhancedNotificationCategory; config: CategoryConfig }) => {
      if (!mountedRef.current) return;
      setCategoryConfigs(notificationCategorizationService.getCategoryConfigs());
    };

    const handleHistoryUpdated = (entry: NotificationHistoryEntry) => {
      if (!mountedRef.current || !autoLoadHistory) return;
      setHistory(notificationCategorizationService.getHistory(historyLimit));
      setStatistics(notificationCategorizationService.getStatistics());
    };

    const handleHistoryRead = (entry: NotificationHistoryEntry) => {
      if (!mountedRef.current) return;
      setStatistics(notificationCategorizationService.getStatistics());
    };

    const handleHistoryDismissed = (entry: NotificationHistoryEntry) => {
      if (!mountedRef.current) return;
      setStatistics(notificationCategorizationService.getStatistics());
    };

    const handleHistoryCleared = () => {
      if (!mountedRef.current) return;
      setHistory([]);
      setStatistics(notificationCategorizationService.getStatistics());
    };

    // Register listeners
    notificationCategorizationService.on('filter:updated', handleFilterUpdated);
    notificationCategorizationService.on('filter:removed', handleFilterRemoved);
    notificationCategorizationService.on('filter:activated', handleFilterActivated);
    notificationCategorizationService.on('filter:deactivated', handleFilterDeactivated);
    notificationCategorizationService.on('category:updated', handleCategoryUpdated);
    notificationCategorizationService.on('history:updated', handleHistoryUpdated);
    notificationCategorizationService.on('history:read', handleHistoryRead);
    notificationCategorizationService.on('history:dismissed', handleHistoryDismissed);
    notificationCategorizationService.on('history:cleared', handleHistoryCleared);

    // Store listeners for cleanup
    listenersRef.current.set('filter:updated', handleFilterUpdated);
    listenersRef.current.set('filter:removed', handleFilterRemoved);
    listenersRef.current.set('filter:activated', handleFilterActivated);
    listenersRef.current.set('filter:deactivated', handleFilterDeactivated);
    listenersRef.current.set('category:updated', handleCategoryUpdated);
    listenersRef.current.set('history:updated', handleHistoryUpdated);
    listenersRef.current.set('history:read', handleHistoryRead);
    listenersRef.current.set('history:dismissed', handleHistoryDismissed);
    listenersRef.current.set('history:cleared', handleHistoryCleared);

    // Initial data load
    loadData();

    return () => {
      // Cleanup listeners
      listenersRef.current.forEach((callback, event) => {
        notificationCategorizationService.off(event, callback);
      });
      listenersRef.current.clear();
    };
  }, [loadData, autoLoadHistory, historyLimit]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    // Filters
    filters,
    activeFilters,
    setFilter,
    removeFilter,
    activateFilter,
    deactivateFilter,
    
    // Categories
    categoryConfigs,
    updateCategoryConfig,
    
    // Processing
    categorizeNotification,
    filterNotifications,
    groupNotifications,
    
    // History
    history,
    addToHistory,
    markAsReadInHistory,
    markAsDismissedInHistory,
    clearHistory,
    
    // Statistics
    statistics,
    
    // Utilities
    createCustomFilter,
    duplicateFilter,
    resetToDefaults
  };
}

/**
 * Hook for notification filtering only
 */
export function useNotificationFiltering() {
  const {
    filters,
    activeFilters,
    setFilter,
    removeFilter,
    activateFilter,
    deactivateFilter,
    filterNotifications,
    createCustomFilter,
    duplicateFilter
  } = useNotificationCategorization({
    autoLoadHistory: false,
    enableGrouping: false,
    enableFiltering: true
  });

  return {
    filters,
    activeFilters,
    setFilter,
    removeFilter,
    activateFilter,
    deactivateFilter,
    filterNotifications,
    createCustomFilter,
    duplicateFilter
  };
}

/**
 * Hook for notification grouping only
 */
export function useNotificationGrouping() {
  const {
    categoryConfigs,
    updateCategoryConfig,
    categorizeNotification,
    groupNotifications
  } = useNotificationCategorization({
    autoLoadHistory: false,
    enableGrouping: true,
    enableFiltering: false
  });

  return {
    categoryConfigs,
    updateCategoryConfig,
    categorizeNotification,
    groupNotifications
  };
}

/**
 * Hook for notification history management
 */
export function useNotificationHistory(limit: number = 100) {
  const {
    history,
    addToHistory,
    markAsReadInHistory,
    markAsDismissedInHistory,
    clearHistory,
    statistics
  } = useNotificationCategorization({
    autoLoadHistory: true,
    historyLimit: limit,
    enableGrouping: false,
    enableFiltering: false
  });

  return {
    history,
    addToHistory,
    markAsReadInHistory,
    markAsDismissedInHistory,
    clearHistory,
    statistics
  };
}

export default useNotificationCategorization;