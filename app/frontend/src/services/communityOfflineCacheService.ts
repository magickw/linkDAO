/**
 * Community Offline Cache Service
 * Implements IndexedDB-based caching for community data with offline support
 */

import { Community } from '../models/Community';
import { EnhancedPost } from '../types/feed';

// Define types for cached data
export interface CachedCommunity extends Community {
  cachedAt: Date;
  lastAccessed: Date;
  accessCount: number;
}

export interface CachedCommunityPost extends EnhancedPost {
  cachedAt: Date;
  lastAccessed: Date;
  accessCount: number;
}

export interface CachedCommunityMember {
  id: string;
  address: string;
  ensName?: string;
  avatar?: string;
  role: 'member' | 'moderator' | 'admin';
  joinedAt: Date;
  reputation: number;
  postCount: number;
  lastActive: Date;
  isOnline: boolean;
  badges: any[];
  cachedAt: Date;
}

export interface OfflineCommunityAction {
  id: string;
  type: 'join_community' | 'leave_community' | 'create_community' | 'update_community' | 'delete_community' | 'create_post' | 'update_post' | 'delete_post' | 'react_to_post';
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export class CommunityOfflineCacheService {
  private static instance: CommunityOfflineCacheService;
  private db: IDBDatabase | null = null;
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private syncInProgress: boolean = false;
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    // Check if we're in a browser environment
    const isBrowser = typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
    
    if (isBrowser) {
      this.initializeDatabase();
      this.setupNetworkListeners();
    }
    
    // Initialize online status based on environment
    this.isOnline = isBrowser ? navigator.onLine : true;
  }

  public static getInstance(): CommunityOfflineCacheService {
    if (!CommunityOfflineCacheService.instance) {
      CommunityOfflineCacheService.instance = new CommunityOfflineCacheService();
    }
    return CommunityOfflineCacheService.instance;
  }

  /**
   * Initialize IndexedDB database for community offline storage
   */
  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('CommunityOfflineCache', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Communities Store
        if (!db.objectStoreNames.contains('communities')) {
          const communitiesStore = db.createObjectStore('communities', { keyPath: 'id' });
          communitiesStore.createIndex('name', 'name');
          communitiesStore.createIndex('category', 'category');
          communitiesStore.createIndex('cachedAt', 'cachedAt');
          communitiesStore.createIndex('lastAccessed', 'lastAccessed');
        }

        // Community Posts Store
        if (!db.objectStoreNames.contains('communityPosts')) {
          const postsStore = db.createObjectStore('communityPosts', { keyPath: 'id' });
          postsStore.createIndex('communityId', 'communityId');
          postsStore.createIndex('author', 'author.address');
          postsStore.createIndex('cachedAt', 'cachedAt');
          postsStore.createIndex('lastAccessed', 'lastAccessed');
        }

        // Community Members Store
        if (!db.objectStoreNames.contains('communityMembers')) {
          const membersStore = db.createObjectStore('communityMembers', { keyPath: 'id' });
          membersStore.createIndex('communityId', 'communityId');
          membersStore.createIndex('address', 'address');
          membersStore.createIndex('role', 'role');
          membersStore.createIndex('cachedAt', 'cachedAt');
        }

        // Offline Actions Store
        if (!db.objectStoreNames.contains('offlineActions')) {
          const actionsStore = db.createObjectStore('offlineActions', { keyPath: 'id' });
          actionsStore.createIndex('type', 'type');
          actionsStore.createIndex('timestamp', 'timestamp');
          actionsStore.createIndex('status', 'status');
          actionsStore.createIndex('retryCount', 'retryCount');
        }

        // Sync Status Store
        if (!db.objectStoreNames.contains('syncStatus')) {
          const syncStatusStore = db.createObjectStore('syncStatus', { keyPath: 'communityId' });
          syncStatusStore.createIndex('lastSyncTimestamp', 'lastSyncTimestamp');
          syncStatusStore.createIndex('pendingActions', 'pendingActions');
        }
      };
    });
  }

  /**
   * Setup network status listeners
   */
  private setupNetworkListeners(): void {
    // Check if we're in a browser environment
    const isBrowser = typeof window !== 'undefined';
    
    if (!isBrowser) return;
    
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingActions();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Periodic sync attempt (every 30 seconds when online)
    setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncPendingActions();
      }
    }, 30000);
  }

  /**
   * Cache a community in IndexedDB
   */
  async cacheCommunity(community: Community): Promise<void> {
    if (!this.db) return;

    const cachedCommunity: CachedCommunity = {
      ...community,
      cachedAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 1
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['communities'], 'readwrite');
      const store = transaction.objectStore('communities');
      const request = store.put(cachedCommunity);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a community from cache
   */
  async getCachedCommunity(communityId: string): Promise<CachedCommunity | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['communities'], 'readonly');
      const store = transaction.objectStore('communities');
      const request = store.get(communityId);

      request.onsuccess = () => {
        const community = request.result;
        if (community) {
          // Update last accessed time
          community.lastAccessed = new Date();
          community.accessCount = (community.accessCount || 0) + 1;
          
          // Update in database
          const updateTransaction = this.db!.transaction(['communities'], 'readwrite');
          const updateStore = updateTransaction.objectStore('communities');
          updateStore.put(community);
          
          resolve(community);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cache community posts
   */
  async cacheCommunityPosts(communityId: string, posts: EnhancedPost[]): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['communityPosts'], 'readwrite');
      const store = transaction.objectStore('communityPosts');
      
      // Clear existing posts for this community
      const clearRequest = store.index('communityId').openKeyCursor(IDBKeyRange.only(communityId));
      
      clearRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        } else {
          // Add new posts
          const addPromises: Promise<void>[] = [];
          
          posts.forEach(post => {
            const cachedPost: CachedCommunityPost = {
              ...post,
              cachedAt: new Date(),
              lastAccessed: new Date(),
              accessCount: 1
            };
            
            addPromises.push(new Promise((addResolve, addReject) => {
              const addRequest = store.put(cachedPost);
              addRequest.onsuccess = () => addResolve();
              addRequest.onerror = () => addReject(addRequest.error);
            }));
          });
          
          Promise.all(addPromises).then(() => resolve()).catch(reject);
        }
      };
      
      clearRequest.onerror = () => reject(clearRequest.error);
    });
  }

  /**
   * Get cached community posts
   */
  async getCachedCommunityPosts(communityId: string): Promise<CachedCommunityPost[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['communityPosts'], 'readonly');
      const store = transaction.objectStore('communityPosts');
      const index = store.index('communityId');
      const request = index.getAll(IDBKeyRange.only(communityId));

      request.onsuccess = () => {
        const posts = request.result.map(post => {
          // Update last accessed time
          post.lastAccessed = new Date();
          post.accessCount = (post.accessCount || 0) + 1;
          return post;
        });
        
        // Update access counts in database
        if (posts.length > 0) {
          const updateTransaction = this.db!.transaction(['communityPosts'], 'readwrite');
          const updateStore = updateTransaction.objectStore('communityPosts');
          
          posts.forEach(post => {
            updateStore.put(post);
          });
        }
        
        resolve(posts);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cache community members
   */
  async cacheCommunityMembers(communityId: string, members: CachedCommunityMember[]): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['communityMembers'], 'readwrite');
      const store = transaction.objectStore('communityMembers');
      
      // Clear existing members for this community
      const clearRequest = store.index('communityId').openKeyCursor(IDBKeyRange.only(communityId));
      
      clearRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        } else {
          // Add new members
          const addPromises: Promise<void>[] = [];
          
          members.forEach(member => {
            const cachedMember: CachedCommunityMember = {
              ...member,
              cachedAt: new Date()
            };
            
            addPromises.push(new Promise((addResolve, addReject) => {
              const addRequest = store.put(cachedMember);
              addRequest.onsuccess = () => addResolve();
              addRequest.onerror = () => addReject(addRequest.error);
            }));
          });
          
          Promise.all(addPromises).then(() => resolve()).catch(reject);
        }
      };
      
      clearRequest.onerror = () => reject(clearRequest.error);
    });
  }

  /**
   * Get cached community members
   */
  async getCachedCommunityMembers(communityId: string): Promise<CachedCommunityMember[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['communityMembers'], 'readonly');
      const store = transaction.objectStore('communityMembers');
      const index = store.index('communityId');
      const request = index.getAll(IDBKeyRange.only(communityId));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Queue an offline action
   */
  async queueOfflineAction(action: Omit<OfflineCommunityAction, 'id' | 'status'>): Promise<string> {
    if (!this.db) return '';

    const actionId = this.generateId();
    const offlineAction: OfflineCommunityAction = {
      id: actionId,
      ...action,
      status: 'pending'
    };

    await new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineActions'], 'readwrite');
      const store = transaction.objectStore('offlineActions');
      const request = store.put(offlineAction);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Try to execute immediately if online
    if (this.isOnline) {
      this.executeOfflineAction(offlineAction);
    }

    return actionId;
  }

  /**
   * Get all pending actions
   */
  private async getAllPendingActions(): Promise<OfflineCommunityAction[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineActions'], 'readonly');
      const store = transaction.objectStore('offlineActions');
      const index = store.index('status');
      const request = index.getAll(IDBKeyRange.only('pending'));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Execute an offline action
   */
  private async executeOfflineAction(action: OfflineCommunityAction): Promise<void> {
    try {
      // Update status to processing
      await this.updateActionStatus(action.id, 'processing');

      let success = false;

      switch (action.type) {
        case 'join_community':
          success = await this.executeJoinCommunityAction(action);
          break;
        case 'leave_community':
          success = await this.executeLeaveCommunityAction(action);
          break;
        case 'create_post':
          success = await this.executeCreatePostAction(action);
          break;
        case 'update_post':
          success = await this.executeUpdatePostAction(action);
          break;
        case 'delete_post':
          success = await this.executeDeletePostAction(action);
          break;
        case 'react_to_post':
          success = await this.executeReactToPostAction(action);
          break;
        default:
          console.warn('Unknown offline action type:', action.type);
          success = false;
      }

      if (success) {
        await this.updateActionStatus(action.id, 'completed');
      } else {
        await this.handleActionFailure(action, 'Execution failed');
      }
    } catch (error) {
      await this.handleActionFailure(action, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Execute join community action
   */
  private async executeJoinCommunityAction(action: OfflineCommunityAction): Promise<boolean> {
    try {
      const response = await fetch(`/api/communities/${action.data.communityId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        }
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Execute leave community action
   */
  private async executeLeaveCommunityAction(action: OfflineCommunityAction): Promise<boolean> {
    try {
      const response = await fetch(`/api/communities/${action.data.communityId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        }
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Execute create post action
   */
  private async executeCreatePostAction(action: OfflineCommunityAction): Promise<boolean> {
    try {
      const response = await fetch(`/api/communities/${action.data.communityId}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify(action.data.postData)
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Execute update post action
   */
  private async executeUpdatePostAction(action: OfflineCommunityAction): Promise<boolean> {
    try {
      const response = await fetch(`/api/community-posts/${action.data.postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify(action.data.updateData)
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Execute delete post action
   */
  private async executeDeletePostAction(action: OfflineCommunityAction): Promise<boolean> {
    try {
      const response = await fetch(`/api/community-posts/${action.data.postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        }
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Execute react to post action
   */
  private async executeReactToPostAction(action: OfflineCommunityAction): Promise<boolean> {
    try {
      const response = await fetch(`/api/community-posts/${action.data.postId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify(action.data.voteData)
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Handle action failure
   */
  private async handleActionFailure(action: OfflineCommunityAction, error: string): Promise<void> {
    const newRetryCount = action.retryCount + 1;

    if (newRetryCount >= action.maxRetries) {
      await this.updateActionStatus(action.id, 'failed');
      console.error('Offline action failed permanently:', action, error);
    } else {
      // Update retry count
      await this.updateActionRetryCount(action.id, newRetryCount);

      // Schedule retry with exponential backoff
      const retryDelay = Math.min(1000 * Math.pow(2, newRetryCount), 60000); // Max 1 minute
      setTimeout(() => {
        this.executeOfflineAction({ ...action, retryCount: newRetryCount });
      }, retryDelay);
    }
  }

  /**
   * Update action status
   */
  private async updateActionStatus(id: string, status: OfflineCommunityAction['status']): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineActions'], 'readwrite');
      const store = transaction.objectStore('offlineActions');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (action) {
          const updatedAction = { ...action, status };
          const putRequest = store.put(updatedAction);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Offline action not found'));
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Update action retry count
   */
  private async updateActionRetryCount(id: string, retryCount: number): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineActions'], 'readwrite');
      const store = transaction.objectStore('offlineActions');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (action) {
          const updatedAction = { ...action, retryCount };
          const putRequest = store.put(updatedAction);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Offline action not found'));
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Sync all pending actions
   */
  async syncPendingActions(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) return;

    this.syncInProgress = true;
    
    try {
      const pendingActions = await this.getAllPendingActions();
      for (const action of pendingActions) {
        await this.executeOfflineAction(action);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Get sync status for a community
   */
  async getSyncStatus(communityId: string): Promise<any> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncStatus'], 'readonly');
      const store = transaction.objectStore('syncStatus');
      const request = store.get(communityId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update sync status for a community
   */
  async updateSyncStatus(communityId: string, status: any): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncStatus'], 'readwrite');
      const store = transaction.objectStore('syncStatus');
      const request = store.put({
        communityId,
        ...status,
        lastSyncTimestamp: new Date(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if online
   */
  isOnlineStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Get network status
   */
  getNetworkStatus(): {
    isOnline: boolean;
    syncInProgress: boolean;
  } {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
    };
  }

  /**
   * Clear all cached data for a community
   */
  async clearCommunityCache(communityId: string): Promise<void> {
    if (!this.db) return;

    const stores = ['communities', 'communityPosts', 'communityMembers'];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(stores, 'readwrite');
      let completed = 0;

      stores.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        let request;
        
        if (storeName === 'communities') {
          request = store.delete(communityId);
        } else {
          // For posts and members, delete by communityId index
          const index = store.index('communityId');
          request = index.openKeyCursor(IDBKeyRange.only(communityId));
          
          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              store.delete(cursor.primaryKey);
              cursor.continue();
            } else {
              completed++;
              if (completed === stores.length) {
                resolve();
              }
            }
          };
          
          request.onerror = () => reject(request.error);
          return;
        }

        request.onsuccess = () => {
          completed++;
          if (completed === stores.length) {
            resolve();
          }
        };

        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    communities: number;
    posts: number;
    members: number;
    pendingActions: number;
  }> {
    if (!this.db) {
      return {
        communities: 0,
        posts: 0,
        members: 0,
        pendingActions: 0,
      };
    }

    const [communities, posts, members, actions] = await Promise.all([
      this.getCount('communities'),
      this.getCount('communityPosts'),
      this.getCount('communityMembers'),
      this.getPendingActionsCount(),
    ]);

    return {
      communities,
      posts,
      members,
      pendingActions: actions,
    };
  }

  /**
   * Get count for a store
   */
  private async getCount(storeName: string): Promise<number> {
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get pending actions count
   */
  private async getPendingActionsCount(): Promise<number> {
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineActions'], 'readonly');
      const store = transaction.objectStore('offlineActions');
      const index = store.index('status');
      const request = index.count(IDBKeyRange.only('pending'));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}