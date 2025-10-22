/**
 * React Hook for Offline Support
 * Provides easy access to offline functionality and sync status
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  offlineSupportService, 
  SyncStatus, 
  OfflineCapabilities, 
  OfflineDocument 
} from '../services/offlineSupportService';
import { 
  performanceMonitoringService,
  PerformanceMetrics,
  PerformanceAlert
} from '../services/performanceMonitoringService';
import { 
  intelligentPreloadingService,
  PreloadingStrategy
} from '../services/intelligentPreloadingService';

interface UseOfflineSupportReturn {
  // Connection status
  isOnline: boolean;
  syncStatus: SyncStatus | null;
  capabilities: OfflineCapabilities | null;

  // Offline documents
  offlineDocuments: OfflineDocument[];

  // Performance monitoring
  performanceMetrics: PerformanceMetrics | null;
  performanceAlerts: PerformanceAlert[];

  // Preloading
  preloadingStrategy: PreloadingStrategy | null;
  preloadingStats: any;

  // Queue management
  queuedActions: any[];
  syncInProgress: boolean;
  lastSyncTime: Date | null;

  // Actions
  syncDocuments: () => Promise<void>;
  cacheDocument: (url: string) => Promise<void>;
  clearOfflineCache: () => Promise<void>;
  isDocumentAvailableOffline: (url: string) => Promise<boolean>;
  syncNow: () => Promise<void>;
  clearQueue: () => void;
  removeAction: (actionId: string) => void;
  getQueueStats: () => any;

  // Performance actions
  getAdaptiveLoadingStrategy: () => any;
  trackDocumentView: (documentId: string, timeSpent: number) => void;
  trackSearchQuery: (query: string) => void;

  // Loading states
  loading: boolean;
  syncing: boolean;
  error: string | null;
}

export const useOfflineSupport = (): UseOfflineSupportReturn => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [capabilities, setCapabilities] = useState<OfflineCapabilities | null>(null);
  const [offlineDocuments, setOfflineDocuments] = useState<OfflineDocument[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [performanceAlerts, setPerformanceAlerts] = useState<PerformanceAlert[]>([]);
  const [preloadingStrategy, setPreloadingStrategy] = useState<PreloadingStrategy | null>(null);
  const [preloadingStats, setPreloadingStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Queue management state
  const [queuedActions, setQueuedActions] = useState<any[]>([]);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Initialize services
  useEffect(() => {
    const initializeServices = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Initialize offline support
        await offlineSupportService.initialize();
        
        // Initialize performance monitoring
        await performanceMonitoringService.initialize();
        
        // Initialize intelligent preloading
        await intelligentPreloadingService.initialize();
        
        // Get initial data
        const [status, caps, docs, metrics, alerts, strategy, stats] = await Promise.all([
          offlineSupportService.getSyncStatus(),
          offlineSupportService.getCapabilities(),
          offlineSupportService.getOfflineDocuments(),
          Promise.resolve(performanceMonitoringService.getCurrentMetrics()),
          Promise.resolve(performanceMonitoringService.getActiveAlerts()),
          Promise.resolve(intelligentPreloadingService.getPreloadingStrategy()),
          Promise.resolve(intelligentPreloadingService.getPreloadingStats())
        ]);
        
        setSyncStatus(status);
        setCapabilities(caps);
        setOfflineDocuments(docs);
        setPerformanceMetrics(metrics);
        setPerformanceAlerts(alerts);
        setPreloadingStrategy(strategy);
        setPreloadingStats(stats);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize offline support');
        console.error('Offline support initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeServices();
  }, []);

  // Set up event listeners
  useEffect(() => {
    // Online/offline status
    const handleOnlineStatus = (online: boolean) => {
      setIsOnline(online);
    };

    // Sync status updates
    const handleSyncStatus = (status: SyncStatus) => {
      setSyncStatus(status);
      setSyncing(status.syncInProgress);
    };

    // Performance metrics updates
    const handleMetricsUpdate = (metrics: PerformanceMetrics) => {
      setPerformanceMetrics(metrics);
    };

    // Performance alerts
    const handleAlert = (alert: PerformanceAlert) => {
      setPerformanceAlerts(prev => [...prev, alert]);
    };

    // Preloading status
    const handlePreloadingStatus = (status: { active: boolean; queueSize: number }) => {
      setPreloadingStats(prev => ({ ...prev, ...status }));
    };

    // Add listeners
    offlineSupportService.addOnlineStatusListener(handleOnlineStatus);
    offlineSupportService.addSyncStatusListener(handleSyncStatus);
    performanceMonitoringService.addMetricsListener(handleMetricsUpdate);
    performanceMonitoringService.addAlertListener(handleAlert);
    intelligentPreloadingService.addPreloadingListener(handlePreloadingStatus);

    return () => {
      // Remove listeners
      offlineSupportService.removeOnlineStatusListener(handleOnlineStatus);
      offlineSupportService.removeSyncStatusListener(handleSyncStatus);
      performanceMonitoringService.removeMetricsListener(handleMetricsUpdate);
      performanceMonitoringService.removeAlertListener(handleAlert);
      intelligentPreloadingService.removePreloadingListener(handlePreloadingStatus);
    };
  }, []);

  // Sync documents
  const syncDocuments = useCallback(async () => {
    try {
      setSyncing(true);
      setError(null);
      
      await offlineSupportService.syncDocuments();
      
      // Refresh offline documents
      const docs = await offlineSupportService.getOfflineDocuments();
      setOfflineDocuments(docs);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync documents');
    } finally {
      setSyncing(false);
    }
  }, []);

  // Cache document
  const cacheDocument = useCallback(async (url: string) => {
    try {
      setError(null);
      await offlineSupportService.cacheDocument(url);
      
      // Refresh offline documents
      const docs = await offlineSupportService.getOfflineDocuments();
      setOfflineDocuments(docs);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cache document');
    }
  }, []);

  // Clear offline cache
  const clearOfflineCache = useCallback(async () => {
    try {
      setError(null);
      await offlineSupportService.clearOfflineCache();
      
      // Refresh data
      const [status, docs] = await Promise.all([
        offlineSupportService.getSyncStatus(),
        offlineSupportService.getOfflineDocuments()
      ]);
      
      setSyncStatus(status);
      setOfflineDocuments(docs);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cache');
    }
  }, []);

  // Check if document is available offline
  const isDocumentAvailableOffline = useCallback(async (url: string) => {
    try {
      return await offlineSupportService.isDocumentAvailableOffline(url);
    } catch (err) {
      console.error('Failed to check document availability:', err);
      return false;
    }
  }, []);

  // Get adaptive loading strategy
  const getAdaptiveLoadingStrategy = useCallback(() => {
    return performanceMonitoringService.getAdaptiveLoadingStrategy();
  }, []);

  // Track document view
  const trackDocumentView = useCallback((documentId: string, timeSpent: number) => {
    intelligentPreloadingService.trackDocumentView(documentId, timeSpent);
  }, []);

  // Track search query
  const trackSearchQuery = useCallback((query: string) => {
    intelligentPreloadingService.trackSearchQuery(query);
  }, []);

  // Sync now
  const syncNow = useCallback(async () => {
    setSyncInProgress(true);
    try {
      await syncDocuments();
      setLastSyncTime(new Date());
    } finally {
      setSyncInProgress(false);
    }
  }, [syncDocuments]);

  // Clear queue
  const clearQueue = useCallback(() => {
    setQueuedActions([]);
  }, []);

  // Remove single action from queue
  const removeAction = useCallback((actionId: string) => {
    setQueuedActions(prev => prev.filter((a: any) => a.id !== actionId));
  }, []);

  // Get queue stats
  const getQueueStats = useCallback(() => {
    return {
      total: queuedActions.length,
      pending: queuedActions.filter((a: any) => a.status === 'pending').length,
      failed: queuedActions.filter((a: any) => a.status === 'failed').length
    };
  }, [queuedActions]);

  return {
    isOnline,
    syncStatus,
    capabilities,
    offlineDocuments,
    performanceMetrics,
    performanceAlerts,
    preloadingStrategy,
    preloadingStats,
    queuedActions,
    syncInProgress,
    lastSyncTime,
    syncDocuments,
    cacheDocument,
    clearOfflineCache,
    isDocumentAvailableOffline,
    syncNow,
    clearQueue,
    removeAction,
    getQueueStats,
    getAdaptiveLoadingStrategy,
    trackDocumentView,
    trackSearchQuery,
    loading,
    syncing,
    error
  };
};

/**
 * Hook for performance monitoring
 */
export const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [history, setHistory] = useState<PerformanceMetrics[]>([]);

  useEffect(() => {
    // Initialize performance monitoring
    const initializeMonitoring = async () => {
      try {
        await performanceMonitoringService.initialize();
        
        const currentMetrics = performanceMonitoringService.getCurrentMetrics();
        setMetrics(currentMetrics);
        
        const activeAlerts = performanceMonitoringService.getActiveAlerts();
        setAlerts(activeAlerts);
        
        const performanceHistory = performanceMonitoringService.getPerformanceHistory(1);
        setHistory(performanceHistory);
      } catch (error) {
        console.error('Failed to initialize performance monitoring:', error);
      }
    };

    initializeMonitoring();

    // Set up listeners
    const handleMetricsUpdate = (newMetrics: PerformanceMetrics) => {
      setMetrics(newMetrics);
      setHistory(prev => [...prev.slice(-99), newMetrics]);
    };

    const handleAlert = (alert: PerformanceAlert) => {
      setAlerts(prev => [...prev, alert]);
    };

    performanceMonitoringService.addMetricsListener(handleMetricsUpdate);
    performanceMonitoringService.addAlertListener(handleAlert);

    return () => {
      performanceMonitoringService.removeMetricsListener(handleMetricsUpdate);
      performanceMonitoringService.removeAlertListener(handleAlert);
    };
  }, []);

  const resolveAlert = useCallback((alertId: string) => {
    performanceMonitoringService.resolveAlert(alertId);
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  const getNetworkCondition = useCallback(() => {
    return performanceMonitoringService.getNetworkCondition();
  }, []);

  return {
    metrics,
    alerts,
    history,
    resolveAlert,
    getNetworkCondition
  };
};