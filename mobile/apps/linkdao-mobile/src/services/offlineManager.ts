/**
 * Offline Manager
 * Handles offline caching, sync, and offline actions
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface OfflineAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retryCount: number;
}

const CACHE_PREFIX = 'cache_';
const OFFLINE_ACTIONS_KEY = 'offline_actions';
const SYNC_QUEUE_KEY = 'sync_queue';

class OfflineManager {
  private isOnline: boolean = true;
  private offlineActions: OfflineAction[] = [];
  private syncInProgress: boolean = false;

  /**
   * Initialize offline manager
   */
  async initialize() {
    // Check network status
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? true;

    // Listen for network changes
    NetInfo.addEventListener((state) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? true;

      // If we just came back online, sync offline actions
      if (!wasOnline && this.isOnline) {
        console.log('🌐 Back online, syncing...');
        this.syncOfflineActions();
      }
    });

    // Load offline actions from storage
    await this.loadOfflineActions();

    console.log('✅ Offline manager initialized');
  }

  /**
   * Check if device is online
   */
  isDeviceOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Cache data with expiration
   */
  async cacheData<T>(key: string, data: T, ttl: number = 300000): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
      };

      await AsyncStorage.setItem(
        `${CACHE_PREFIX}${key}`,
        JSON.stringify(entry)
      );
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  /**
   * Get cached data
   */
  async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);

      if (!value) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(value);

      // Check if cache is expired
      if (Date.now() > entry.expiresAt) {
        await this.clearCache(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }

  /**
   * Clear cache entry
   */
  async clearCache(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clearAllCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));

      await AsyncStorage.multiRemove(cacheKeys);
      console.log('✅ All cache cleared');
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }

  /**
   * Add offline action
   */
  async addOfflineAction(type: string, payload: any): Promise<void> {
    const action: OfflineAction = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.offlineActions.push(action);
    await this.saveOfflineActions();
    console.log('📝 Offline action added:', type);
  }

  /**
   * Load offline actions from storage
   */
  private async loadOfflineActions(): Promise<void> {
    try {
      const value = await AsyncStorage.getItem(OFFLINE_ACTIONS_KEY);
      if (value) {
        this.offlineActions = JSON.parse(value);
      }
    } catch (error) {
      console.error('Error loading offline actions:', error);
    }
  }

  /**
   * Save offline actions to storage
   */
  private async saveOfflineActions(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        OFFLINE_ACTIONS_KEY,
        JSON.stringify(this.offlineActions)
      );
    } catch (error) {
      console.error('Error saving offline actions:', error);
    }
  }

  /**
   * Sync offline actions when back online
   */
  private async syncOfflineActions(): Promise<void> {
    if (this.syncInProgress || this.offlineActions.length === 0) {
      return;
    }

    this.syncInProgress = true;

    try {
      // Process actions in order
      for (let i = 0; i < this.offlineActions.length; i++) {
        const action = this.offlineActions[i];

        try {
          await this.executeOfflineAction(action);
          // Remove successfully synced action
          this.offlineActions.splice(i, 1);
          i--; // Adjust index after removal
        } catch (error) {
          console.error('Failed to sync action:', action.type, error);
          action.retryCount++;

          // Remove action if it has failed too many times
          if (action.retryCount >= 3) {
            this.offlineActions.splice(i, 1);
            i--;
          }
        }
      }

      await this.saveOfflineActions();
      console.log('✅ Offline actions synced');
    } catch (error) {
      console.error('Error syncing offline actions:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Execute offline action
   */
  private async executeOfflineAction(action: OfflineAction): Promise<void> {
    // This would integrate with your API client
    // For now, it's a placeholder
    console.log('Executing offline action:', action.type, action.payload);

    switch (action.type) {
      case 'POST':
        // Handle POST request
        break;
      case 'PUT':
        // Handle PUT request
        break;
      case 'DELETE':
        // Handle DELETE request
        break;
      default:
        console.warn('Unknown action type:', action.type);
    }
  }

  /**
   * Get pending offline actions count
   */
  getPendingActionsCount(): number {
    return this.offlineActions.length;
  }

  /**
   * Clear offline actions
   */
  async clearOfflineActions(): Promise<void> {
    this.offlineActions = [];
    await this.saveOfflineActions();
  }

  /**
   * Get cache size (in bytes)
   */
  async getCacheSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));

      let totalSize = 0;

      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length * 2; // UTF-16 encoding
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Error getting cache size:', error);
      return 0;
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));

      let clearedCount = 0;

      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          const entry: CacheEntry<any> = JSON.parse(value);

          if (Date.now() > entry.expiresAt) {
            await AsyncStorage.removeItem(key);
            clearedCount++;
          }
        }
      }

      console.log(`✅ Cleared ${clearedCount} expired cache entries`);
      return clearedCount;
    } catch (error) {
      console.error('Error clearing expired cache:', error);
      return 0;
    }
  }
}

export const offlineManager = new OfflineManager();