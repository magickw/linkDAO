import React from 'react';
import { ContentCreationProvider } from './ContentCreationContext';
import { EngagementProvider } from './EngagementContext';
import { ReputationProvider } from './ReputationContext';
import { PerformanceProvider } from './PerformanceContext';
import { OfflineSyncProvider } from './OfflineSyncContext';
import { RealTimeUpdateProvider } from './RealTimeUpdateContext';

/**
 * Enhanced State Provider
 * 
 * This component combines all the enhanced state management contexts into a single provider
 * for easy integration into the application. It provides a centralized state management
 * system for all advanced social dashboard features.
 * 
 * Features provided:
 * - Content Creation: Draft management, media uploads, validation
 * - Engagement: Token reactions, tips, social proof tracking
 * - Reputation: Badge system, achievements, progress tracking
 * - Performance: Virtual scrolling, caching, optimization
 * - Offline Sync: Action queuing, conflict resolution, sync management
 * - Real-time Updates: WebSocket connections, live notifications, subscriptions
 */

interface EnhancedStateProviderProps {
  children: React.ReactNode;
}

export function EnhancedStateProvider({ children }: EnhancedStateProviderProps) {
  return (
    <PerformanceProvider>
      <OfflineSyncProvider>
        <RealTimeUpdateProvider>
          <ReputationProvider>
            <EngagementProvider>
              <ContentCreationProvider>
                {children}
              </ContentCreationProvider>
            </EngagementProvider>
          </ReputationProvider>
        </RealTimeUpdateProvider>
      </OfflineSyncProvider>
    </PerformanceProvider>
  );
}

/**
 * Hook for accessing all enhanced state contexts
 * 
 * This hook provides a convenient way to access all the enhanced state management
 * contexts from a single import. It returns an object with all the context hooks.
 */
export function useEnhancedState() {
  // Import hooks dynamically to avoid circular dependencies
  const { useContentCreation } = require('./ContentCreationContext');
  const { useEngagement } = require('./EngagementContext');
  const { useReputation } = require('./ReputationContext');
  const { usePerformance } = require('./PerformanceContext');
  const { useOfflineSync } = require('./OfflineSyncContext');
  const { useRealTimeUpdate } = require('./RealTimeUpdateContext');

  return {
    contentCreation: useContentCreation(),
    engagement: useEngagement(),
    reputation: useReputation(),
    performance: usePerformance(),
    offlineSync: useOfflineSync(),
    realTimeUpdate: useRealTimeUpdate(),
  };
}

/**
 * Higher-Order Component for enhanced state management
 * 
 * This HOC wraps a component with all the enhanced state providers,
 * making it easy to add enhanced state management to any part of the application.
 */
export function withEnhancedState<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <EnhancedStateProvider>
      <Component {...props} />
    </EnhancedStateProvider>
  );

  WrappedComponent.displayName = `withEnhancedState(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Context Integration Utilities
 * 
 * These utilities help integrate the enhanced state management with existing
 * application state and provide migration helpers.
 */

export interface StateIntegrationConfig {
  enableContentCreation?: boolean;
  enableEngagement?: boolean;
  enableReputation?: boolean;
  enablePerformance?: boolean;
  enableOfflineSync?: boolean;
  enableRealTimeUpdates?: boolean;
  performanceSettings?: {
    virtualScrollEnabled?: boolean;
    cacheEnabled?: boolean;
    preloadingEnabled?: boolean;
  };
  offlineSyncSettings?: {
    autoSyncEnabled?: boolean;
    syncInterval?: number;
    maxRetries?: number;
  };
  realTimeSettings?: {
    autoConnect?: boolean;
    reconnectAttempts?: number;
    heartbeatInterval?: number;
  };
}

/**
 * Configurable Enhanced State Provider
 * 
 * This provider allows selective enabling of different state management features
 * based on configuration. Useful for gradual rollout or feature flags.
 */
interface ConfigurableEnhancedStateProviderProps {
  children: React.ReactNode;
  config: StateIntegrationConfig;
}

export function ConfigurableEnhancedStateProvider({ 
  children, 
  config 
}: ConfigurableEnhancedStateProviderProps) {
  let wrappedChildren = children;

  // Wrap with providers based on configuration
  if (config.enablePerformance !== false) {
    wrappedChildren = (
      <PerformanceProvider>
        {wrappedChildren}
      </PerformanceProvider>
    );
  }

  if (config.enableOfflineSync !== false) {
    wrappedChildren = (
      <OfflineSyncProvider>
        {wrappedChildren}
      </OfflineSyncProvider>
    );
  }

  if (config.enableRealTimeUpdates !== false) {
    wrappedChildren = (
      <RealTimeUpdateProvider>
        {wrappedChildren}
      </RealTimeUpdateProvider>
    );
  }

  if (config.enableReputation !== false) {
    wrappedChildren = (
      <ReputationProvider>
        {wrappedChildren}
      </ReputationProvider>
    );
  }

  if (config.enableEngagement !== false) {
    wrappedChildren = (
      <EngagementProvider>
        {wrappedChildren}
      </EngagementProvider>
    );
  }

  if (config.enableContentCreation !== false) {
    wrappedChildren = (
      <ContentCreationProvider>
        {wrappedChildren}
      </ContentCreationProvider>
    );
  }

  return <>{wrappedChildren}</>;
}

/**
 * State Management Utilities
 * 
 * These utilities provide common operations across different state contexts
 * and help with state synchronization and debugging.
 */

export class StateManager {
  private static instance: StateManager;
  
  static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  /**
   * Debug helper to log current state across all contexts
   */
  logAllStates() {
    if (process.env.NODE_ENV === 'development') {
      console.group('Enhanced State Management - Current States');
      
      try {
        const state = useEnhancedState();
        console.log('Content Creation:', state.contentCreation.state);
        console.log('Engagement:', state.engagement.state);
        console.log('Reputation:', state.reputation.state);
        console.log('Performance:', state.performance.state);
        console.log('Offline Sync:', state.offlineSync.state);
        console.log('Real-time Updates:', state.realTimeUpdate.state);
      } catch (error) {
        console.warn('Could not access enhanced state (not within provider):', error);
      }
      
      console.groupEnd();
    }
  }

  /**
   * Performance monitoring helper
   */
  getPerformanceMetrics() {
    try {
      const { performance } = useEnhancedState();
      return {
        cacheStats: performance.getCacheStats(),
        metrics: performance.state.metrics,
        optimizations: performance.state.optimizations,
      };
    } catch (error) {
      console.warn('Could not access performance metrics:', error);
      return null;
    }
  }

  /**
   * Sync status helper
   */
  getSyncStatus() {
    try {
      const { offlineSync, realTimeUpdate } = useEnhancedState();
      return {
        offline: {
          isOnline: offlineSync.state.isOnline,
          queuedActions: offlineSync.getQueuedActionsCount(),
          failedActions: offlineSync.getFailedActionsCount(),
          lastSync: offlineSync.state.lastSyncTime,
        },
        realTime: {
          connected: realTimeUpdate.isConnected(),
          subscriptions: realTimeUpdate.state.subscriptions.size,
          unreadNotifications: realTimeUpdate.getUnreadNotifications().length,
        },
      };
    } catch (error) {
      console.warn('Could not access sync status:', error);
      return null;
    }
  }

  /**
   * Clear all caches and reset performance state
   */
  clearAllCaches() {
    try {
      const { performance } = useEnhancedState();
      performance.clearCache();
      performance.optimizeMemoryUsage();
    } catch (error) {
      console.warn('Could not clear caches:', error);
    }
  }

  /**
   * Force sync all queued actions
   */
  async forceSyncAll() {
    try {
      const { offlineSync } = useEnhancedState();
      await offlineSync.syncActions();
      await offlineSync.retryFailedActions();
    } catch (error) {
      console.warn('Could not force sync:', error);
    }
  }
}

// Export singleton instance
export const stateManager = StateManager.getInstance();