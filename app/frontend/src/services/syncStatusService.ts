/**
 * Sync Status Service
 * Manages synchronization status for offline-first messaging
 * Provides sync progress indicators and recovery mechanisms
 */

export interface SyncStatus {
  conversationId: string;
  status: 'syncing' | 'synced' | 'error' | 'offline';
  progress: number; // 0-100
  pendingMessages: number;
  lastSyncTime: Date | null;
  errorMessage?: string;
  retryCount: number;
}

export interface QueueHealth {
  totalPending: number;
  failedMessages: number;
  inProgress: number;
  oldestPending: Date | null;
  estimatedTimeToSync: number; // seconds
}

class SyncStatusService {
  private static instance: SyncStatusService;
  private syncStatuses: Map<string, SyncStatus> = new Map();
  private listeners: Set<(statuses: Map<string, SyncStatus>) => void> = new Set();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 5000; // 5 seconds

  private constructor() {
    // Load persisted sync statuses
    this.loadPersistedStatuses();
    
    // Start periodic health checks
    this.startHealthChecks();
  }

  static getInstance(): SyncStatusService {
    if (!SyncStatusService.instance) {
      SyncStatusService.instance = new SyncStatusService();
    }
    return SyncStatusService.instance;
  }

  /**
   * Get sync status for a conversation
   */
  getSyncStatus(conversationId: string): SyncStatus | undefined {
    return this.syncStatuses.get(conversationId);
  }

  /**
   * Get all sync statuses
   */
  getAllSyncStatuses(): Map<string, SyncStatus> {
    return new Map(this.syncStatuses);
  }

  /**
   * Update sync status
   */
  updateSyncStatus(conversationId: string, updates: Partial<SyncStatus>): void {
    const current = this.syncStatuses.get(conversationId) || {
      conversationId,
      status: 'synced',
      progress: 100,
      pendingMessages: 0,
      lastSyncTime: null,
      retryCount: 0
    };

    const updated: SyncStatus = {
      ...current,
      ...updates,
      conversationId
    };

    this.syncStatuses.set(conversationId, updated);
    this.persistStatuses();
    this.notifyListeners();
  }

  /**
   * Set sync in progress
   */
  setSyncing(conversationId: string, pendingCount: number): void {
    this.updateSyncStatus(conversationId, {
      status: 'syncing',
      progress: 0,
      pendingMessages: pendingCount,
      lastSyncTime: new Date()
    });
  }

  /**
   * Update sync progress
   */
  updateProgress(conversationId: string, progress: number): void {
    this.updateSyncStatus(conversationId, { progress });
  }

  /**
   * Mark as synced
   */
  markSynced(conversationId: string): void {
    this.updateSyncStatus(conversationId, {
      status: 'synced',
      progress: 100,
      pendingMessages: 0,
      lastSyncTime: new Date(),
      retryCount: 0,
      errorMessage: undefined
    });
  }

  /**
   * Mark as error
   */
  markError(conversationId: string, errorMessage: string): void {
    const current = this.syncStatuses.get(conversationId);
    this.updateSyncStatus(conversationId, {
      status: 'error',
      errorMessage,
      retryCount: (current?.retryCount || 0) + 1
    });
  }

  /**
   * Mark as offline
   */
  markOffline(conversationId: string): void {
    this.updateSyncStatus(conversationId, {
      status: 'offline',
      progress: 0
    });
  }

  /**
   * Get queue health
   */
  async getQueueHealth(): Promise<QueueHealth> {
    // This would integrate with offlineMessageQueueService
    // For now, return calculated health from sync statuses
    let totalPending = 0;
    let failedCount = 0;
    let oldestPending: Date | null = null;

    this.syncStatuses.forEach(status => {
      if (status.status === 'syncing') {
        totalPending += status.pendingMessages;
        if (!oldestPending || (status.lastSyncTime && status.lastSyncTime < oldestPending)) {
          oldestPending = status.lastSyncTime;
        }
      } else if (status.status === 'error') {
        failedCount++;
        totalPending += status.pendingMessages;
      }
    });

    // Estimate time to sync (rough calculation: 1 second per message)
    const estimatedTime = totalPending * 1;

    return {
      totalPending,
      failedMessages: failedCount,
      inProgress: Array.from(this.syncStatuses.values()).filter(s => s.status === 'syncing').length,
      oldestPending,
      estimatedTimeToSync: estimatedTime
    };
  }

  /**
   * Retry failed syncs
   */
  async retryFailedSyncs(): Promise<void> {
    const failedStatuses = Array.from(this.syncStatuses.entries())
      .filter(([_, status]) => status.status === 'error');

    for (const [conversationId, status] of failedStatuses) {
      // Don't retry if too many attempts
      if (status.retryCount >= 3) {
        console.warn(`Skipping retry for ${conversationId} (too many attempts)`);
        continue;
      }

      console.log(`Retrying sync for ${conversationId}`);
      this.updateSyncStatus(conversationId, { status: 'syncing', progress: 0 });
      
      // Trigger retry logic
      // This would need to be integrated with offlineMessageQueueService
      // For now, just mark as syncing
    }
  }

  /**
   * Clear sync status for a conversation
   */
  clearSyncStatus(conversationId: string): void {
    this.syncStatuses.delete(conversationId);
    this.persistStatuses();
    this.notifyListeners();
  }

  /**
   * Subscribe to sync status updates
   */
  subscribe(listener: (statuses: Map<string, SyncStatus>) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(new Map(this.syncStatuses));
      } catch (error) {
        console.error('Error notifying sync status listener:', error);
      }
    });
  }

  /**
   * Persist sync statuses to localStorage
   */
  private persistStatuses(): void {
    try {
      const statuses = Array.from(this.syncStatuses.values());
      localStorage.setItem('sync_statuses', JSON.stringify(statuses));
    } catch (error) {
      console.error('Error persisting sync statuses:', error);
    }
  }

  /**
   * Load persisted sync statuses
   */
  private loadPersistedStatuses(): void {
    try {
      const stored = localStorage.getItem('sync_statuses');
      if (stored) {
        const statuses = JSON.parse(stored);
        statuses.forEach((status: SyncStatus) => {
          this.syncStatuses.set(status.conversationId, {
            ...status,
            lastSyncTime: status.lastSyncTime ? new Date(status.lastSyncTime) : null
          });
        });
      }
    } catch (error) {
      console.error('Error loading persisted sync statuses:', error);
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      const health = await this.getQueueHealth();
      
      // Check for stale sync statuses (syncing for too long)
      const STALE_SYNC_THRESHOLD = 300000; // 5 minutes
      const now = Date.now();
      
      this.syncStatuses.forEach((status, conversationId) => {
        if (status.status === 'syncing' && status.lastSyncTime) {
          const timeSinceStart = now - status.lastSyncTime.getTime();
          if (timeSinceStart > STALE_SYNC_THRESHOLD) {
            console.warn(`Sync stalled for ${conversationId}, marking as error`);
            this.markError(conversationId, 'Sync stalled (timeout)');
          }
        }
      });
      
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.listeners.clear();
    this.syncStatuses.clear();
    localStorage.removeItem('sync_statuses');
  }
}

export const syncStatusService = SyncStatusService.getInstance();
export default SyncStatusService;