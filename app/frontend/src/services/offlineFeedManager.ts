// offlineFeedManager.ts
export class OfflineFeedManager {
  private db: IDBDatabase | null = null;
  private dbName = 'LinkDAOFeed';
  private version = 1;

  async init() {
    if (!('indexedDB' in window)) {
      console.warn('IndexedDB not supported');
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('posts')) {
          const postsStore = db.createObjectStore('posts', { keyPath: 'id' });
          postsStore.createIndex('filterKey', 'filterKey', { unique: false });
          postsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('feedState')) {
          const stateStore = db.createObjectStore('feedState', { keyPath: 'filterKey' });
          stateStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('pendingActions')) {
          const actionsStore = db.createObjectStore('pendingActions', { keyPath: 'id', autoIncrement: true });
          actionsStore.createIndex('type', 'type', { unique: false });
          actionsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async savePosts(posts: any[], filter: any, filterKey: string) {
    if (!this.db) {
      await this.init();
      if (!this.db) return;
    }

    const transaction = this.db.transaction(['posts', 'feedState'], 'readwrite');
    const postsStore = transaction.objectStore('posts');
    const stateStore = transaction.objectStore('feedState');

    try {
      // Save posts
      for (const post of posts) {
        await new Promise<void>((resolve, reject) => {
          const request = postsStore.put({
            ...post,
            filterKey,
            timestamp: Date.now()
          });
          
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      // Save feed state
      await new Promise<void>((resolve, reject) => {
        const request = stateStore.put({
          filterKey,
          filter,
          postIds: posts.map(p => p.id),
          timestamp: Date.now()
        });
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Failed to save posts to IndexedDB:', error);
    }
  }

  async getCachedPosts(filterKey: string): Promise<any[]> {
    if (!this.db) {
      await this.init();
      if (!this.db) return [];
    }

    const transaction = this.db.transaction(['feedState', 'posts'], 'readonly');
    const stateStore = transaction.objectStore('feedState');
    const postsStore = transaction.objectStore('posts');

    try {
      // Get feed state
      const stateRequest = stateStore.get(filterKey);
      const state = await new Promise<any>((resolve, reject) => {
        stateRequest.onsuccess = () => resolve(stateRequest.result);
        stateRequest.onerror = () => reject(stateRequest.error);
      });

      if (!state || !state.postIds) return [];

      // Get posts
      const posts = [];
      for (const postId of state.postIds) {
        const postRequest = postsStore.get(postId);
        const post = await new Promise<any>((resolve, reject) => {
          postRequest.onsuccess = () => resolve(postRequest.result);
          postRequest.onerror = () => reject(postRequest.error);
        });
        
        if (post) {
          posts.push(post);
        }
      }

      return posts;
    } catch (error) {
      console.error('Failed to get cached posts from IndexedDB:', error);
      return [];
    }
  }

  async savePendingAction(action: any) {
    if (!this.db) {
      await this.init();
      if (!this.db) return;
    }

    const transaction = this.db.transaction(['pendingActions'], 'readwrite');
    const actionsStore = transaction.objectStore('pendingActions');

    try {
      await new Promise<void>((resolve, reject) => {
        const request = actionsStore.add({
          ...action,
          timestamp: Date.now()
        });
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to save pending action to IndexedDB:', error);
    }
  }

  async getPendingActions(): Promise<any[]> {
    if (!this.db) {
      await this.init();
      if (!this.db) return [];
    }

    const transaction = this.db.transaction(['pendingActions'], 'readonly');
    const actionsStore = transaction.objectStore('pendingActions');

    try {
      const request = actionsStore.getAll();
      const actions = await new Promise<any[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return actions || [];
    } catch (error) {
      console.error('Failed to get pending actions from IndexedDB:', error);
      return [];
    }
  }

  async clearPendingActions() {
    if (!this.db) {
      await this.init();
      if (!this.db) return;
    }

    const transaction = this.db.transaction(['pendingActions'], 'readwrite');
    const actionsStore = transaction.objectStore('pendingActions');

    try {
      await new Promise<void>((resolve, reject) => {
        const request = actionsStore.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to clear pending actions from IndexedDB:', error);
    }
  }

  async clearOldCache(maxAge: number = 24 * 60 * 60 * 1000) { // 24 hours default
    if (!this.db) {
      await this.init();
      if (!this.db) return;
    }

    const cutoffTime = Date.now() - maxAge;
    
    const transaction = this.db.transaction(['posts', 'feedState'], 'readwrite');
    const postsStore = transaction.objectStore('posts');
    const stateStore = transaction.objectStore('feedState');

    try {
      // Clear old posts
      const postsIndex = postsStore.index('timestamp');
      const oldPostsRequest = postsIndex.getAllKeys(IDBKeyRange.upperBound(cutoffTime));
      
      const oldPostKeys = await new Promise<IDBValidKey[]>((resolve, reject) => {
        oldPostsRequest.onsuccess = () => resolve(oldPostsRequest.result);
        oldPostsRequest.onerror = () => reject(oldPostsRequest.error);
      });

      for (const key of oldPostKeys) {
        await new Promise<void>((resolve, reject) => {
          const request = postsStore.delete(key);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      // Clear old feed states
      const stateIndex = stateStore.index('timestamp');
      const oldStatesRequest = stateIndex.getAllKeys(IDBKeyRange.upperBound(cutoffTime));
      
      const oldStateKeys = await new Promise<IDBValidKey[]>((resolve, reject) => {
        oldStatesRequest.onsuccess = () => resolve(oldStatesRequest.result);
        oldStatesRequest.onerror = () => reject(oldStatesRequest.error);
      });

      for (const key of oldStateKeys) {
        await new Promise<void>((resolve, reject) => {
          const request = stateStore.delete(key);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    } catch (error) {
      console.error('Failed to clear old cache from IndexedDB:', error);
    }
  }

  async getCacheSize(): Promise<{ posts: number; states: number; actions: number }> {
    if (!this.db) {
      await this.init();
      if (!this.db) return { posts: 0, states: 0, actions: 0 };
    }

    try {
      const postsCount = await new Promise<number>((resolve, reject) => {
        const request = this.db!.transaction(['posts'], 'readonly')
          .objectStore('posts')
          .count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const statesCount = await new Promise<number>((resolve, reject) => {
        const request = this.db!.transaction(['feedState'], 'readonly')
          .objectStore('feedState')
          .count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const actionsCount = await new Promise<number>((resolve, reject) => {
        const request = this.db!.transaction(['pendingActions'], 'readonly')
          .objectStore('pendingActions')
          .count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return {
        posts: postsCount,
        states: statesCount,
        actions: actionsCount
      };
    } catch (error) {
      console.error('Failed to get cache size:', error);
      return { posts: 0, states: 0, actions: 0 };
    }
  }

  async clearAllCache() {
    if (!this.db) {
      await this.init();
      if (!this.db) return;
    }

    try {
      const transaction = this.db.transaction(['posts', 'feedState', 'pendingActions'], 'readwrite');
      const postsStore = transaction.objectStore('posts');
      const stateStore = transaction.objectStore('feedState');
      const actionsStore = transaction.objectStore('pendingActions');

      await new Promise<void>((resolve, reject) => {
        const postsRequest = postsStore.clear();
        postsRequest.onerror = () => reject(postsRequest.error);
        
        const stateRequest = stateStore.clear();
        stateRequest.onerror = () => reject(stateRequest.error);
        
        const actionsRequest = actionsStore.clear();
        actionsRequest.onerror = () => reject(actionsRequest.error);
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Failed to clear all cache:', error);
    }
  }
}

// Singleton instance
export const offlineFeedManager = new OfflineFeedManager();