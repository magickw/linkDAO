import AsyncStorage from '@react-native-async-storage/async-storage';
import { Post } from '../types';

export interface OfflinePost {
  id: string;
  content: string;
  author: string;
  timestamp: number;
  communityId: string;
  images?: string[]; // CID references
  isSynced: boolean;
  syncAttempts: number;
}

export interface OfflineAction {
  id: string;
  type: 'post' | 'comment' | 'vote' | 'like';
  data: any;
  timestamp: number;
  isSynced: boolean;
  syncAttempts: number;
}

export class OfflineService {
  private static instance: OfflineService;
  private syncInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  /**
   * Initialize offline service
   */
  async initialize(): Promise<void> {
    // Start sync interval
    this.startSyncInterval();
    
    // Check for any pending sync actions
    await this.syncPendingActions();
  }

  /**
   * Cache post for offline reading
   */
  async cachePost(post: Post): Promise<boolean> {
    try {
      const key = `post_${post.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(post));
      console.log('Post cached for offline reading:', post.id);
      return true;
    } catch (error) {
      console.error('Error caching post:', error);
      return false;
    }
  }

  /**
   * Get cached post
   */
  async getCachedPost(postId: string): Promise<Post | null> {
    try {
      const key = `post_${postId}`;
      const cachedPost = await AsyncStorage.getItem(key);
      
      if (cachedPost) {
        return JSON.parse(cachedPost);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting cached post:', error);
      return null;
    }
  }

  /**
   * Cache multiple posts
   */
  async cachePosts(posts: Post[]): Promise<boolean> {
    try {
      const batch: [string, string][] = posts.map(post => [
        `post_${post.id}`,
        JSON.stringify(post)
      ]);
      
      await AsyncStorage.multiSet(batch);
      console.log('Posts cached for offline reading:', posts.length);
      return true;
    } catch (error) {
      console.error('Error caching posts:', error);
      return false;
    }
  }

  /**
   * Get all cached posts
   */
  async getAllCachedPosts(): Promise<Post[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const postKeys = keys.filter(key => key.startsWith('post_'));
      
      if (postKeys.length === 0) {
        return [];
      }
      
      const posts = await AsyncStorage.multiGet(postKeys);
      return posts.map(([key, value]) => JSON.parse(value!));
    } catch (error) {
      console.error('Error getting cached posts:', error);
      return [];
    }
  }

  /**
   * Queue action for offline sync
   */
  async queueOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'isSynced' | 'syncAttempts'>): Promise<boolean> {
    try {
      const offlineAction: OfflineAction = {
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...action,
        timestamp: Date.now(),
        isSynced: false,
        syncAttempts: 0,
      };

      const key = `offline_action_${offlineAction.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(offlineAction));
      
      console.log('Offline action queued:', offlineAction.type);
      return true;
    } catch (error) {
      console.error('Error queuing offline action:', error);
      return false;
    }
  }

  /**
   * Sync pending actions
   */
  async syncPendingActions(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const actionKeys = keys.filter(key => key.startsWith('offline_action_'));
      
      if (actionKeys.length === 0) {
        return;
      }
      
      const actions = await AsyncStorage.multiGet(actionKeys);
      const unsyncedActions = actions
        .map(([key, value]) => JSON.parse(value!))
        .filter(action => !action.isSynced)
        .sort((a, b) => a.timestamp - b.timestamp); // Process in order
      
      for (const action of unsyncedActions) {
        await this.syncAction(action);
      }
    } catch (error) {
      console.error('Error syncing pending actions:', error);
    }
  }

  /**
   * Sync individual action
   */
  private async syncAction(action: OfflineAction): Promise<boolean> {
    try {
      // Increment sync attempts
      action.syncAttempts += 1;
      
      // If too many failed attempts, mark as failed permanently
      if (action.syncAttempts > 3) {
        console.log('Action failed too many times, marking as failed:', action.id);
        await this.markActionAsFailed(action.id);
        return false;
      }
      
      // Update the action with new attempt count
      const key = `offline_action_${action.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(action));
      
      // Try to sync based on action type
      let success = false;
      
      switch (action.type) {
        case 'post':
          success = await this.syncPostAction(action.data);
          break;
        case 'comment':
          success = await this.syncCommentAction(action.data);
          break;
        case 'vote':
          success = await this.syncVoteAction(action.data);
          break;
        case 'like':
          success = await this.syncLikeAction(action.data);
          break;
        default:
          console.log('Unknown action type:', action.type);
          return false;
      }
      
      if (success) {
        await this.markActionAsSynced(action.id);
        console.log('Action synced successfully:', action.id);
        return true;
      } else {
        console.log('Action sync failed, will retry:', action.id);
        return false;
      }
    } catch (error) {
      console.error('Error syncing action:', error);
      return false;
    }
  }

  /**
   * Sync post action
   */
  private async syncPostAction(data: any): Promise<boolean> {
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error syncing post action:', error);
      return false;
    }
  }

  /**
   * Sync comment action
   */
  private async syncCommentAction(data: any): Promise<boolean> {
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error syncing comment action:', error);
      return false;
    }
  }

  /**
   * Sync vote action
   */
  private async syncVoteAction(data: any): Promise<boolean> {
    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
      },
        body: JSON.stringify(data),
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error syncing vote action:', error);
      return false;
    }
  }

  /**
   * Sync like action
   */
  private async syncLikeAction(data: any): Promise<boolean> {
    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error syncing like action:', error);
      return false;
    }
  }

  /**
   * Mark action as synced
   */
  private async markActionAsSynced(actionId: string): Promise<void> {
    try {
      const key = `offline_action_${actionId}`;
      const actionJson = await AsyncStorage.getItem(key);
      
      if (actionJson) {
        const action: OfflineAction = JSON.parse(actionJson);
        action.isSynced = true;
        await AsyncStorage.setItem(key, JSON.stringify(action));
      }
    } catch (error) {
      console.error('Error marking action as synced:', error);
    }
  }

  /**
   * Mark action as failed
   */
  private async markActionAsFailed(actionId: string): Promise<void> {
    try {
      const key = `offline_action_${actionId}`;
      await AsyncStorage.setItem(key, JSON.stringify({ failed: true, id: actionId }));
    } catch (error) {
      console.error('Error marking action as failed:', error);
    }
  }

  /**
   * Clear synced actions
   */
  async clearSyncedActions(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const actionKeys = keys.filter(key => key.startsWith('offline_action_'));
      
      if (actionKeys.length === 0) {
        return;
      }
      
      const actions = await AsyncStorage.multiGet(actionKeys);
      const syncedActionKeys = actions
        .filter(([key, value]) => {
          try {
            const action = JSON.parse(value!);
            return action.isSynced === true;
          } catch {
            return false;
          }
        })
        .map(([key]) => key);
      
      if (syncedActionKeys.length > 0) {
        await AsyncStorage.multiRemove(syncedActionKeys);
        console.log('Cleared synced actions:', syncedActionKeys.length);
      }
    } catch (error) {
      console.error('Error clearing synced actions:', error);
    }
  }

  /**
   * Start sync interval
   */
  private startSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      this.syncPendingActions();
    }, 30000); // Sync every 30 seconds
  }

  /**
   * Stop sync interval
   */
  stopSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Check if offline
   */
  async isOffline(): Promise<boolean> {
    try {
      const response = await fetch('/api/ping', { method: 'HEAD', timeout: 5000 });
      return !response.ok;
    } catch (error) {
      return true;
    }
  }

  /**
   * Get offline storage usage
   */
  async getStorageUsage(): Promise<{ 
    totalActions: number; 
    syncedActions: number; 
    pendingActions: number;
    cachedPosts: number;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const actionKeys = keys.filter(key => key.startsWith('offline_action_'));
      const postKeys = keys.filter(key => key.startsWith('post_'));
      
      const actions = await AsyncStorage.multiGet(actionKeys);
      let synced = 0;
      let pending = 0;
      
      actions.forEach(([key, value]) => {
        try {
          const action = JSON.parse(value!);
          if (action.isSynced) {
            synced++;
          } else {
            pending++;
          }
        } catch {
          // Invalid action, count as pending
          pending++;
        }
      });
      
      return {
        totalActions: actionKeys.length,
        syncedActions: synced,
        pendingActions: pending,
        cachedPosts: postKeys.length,
      };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return {
        totalActions: 0,
        syncedActions: 0,
        pendingActions: 0,
        cachedPosts: 0,
      };
    }
  }
}

export default OfflineService.getInstance();