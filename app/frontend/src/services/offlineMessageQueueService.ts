import { MessageQueue, OfflineAction, Message } from '../types/messaging';

export class OfflineMessageQueueService {
  private static instance: OfflineMessageQueueService;
  private db: IDBDatabase | null = null;
  private isOnline: boolean = navigator.onLine;
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

  public static getInstance(): OfflineMessageQueueService {
    if (!OfflineMessageQueueService.instance) {
      OfflineMessageQueueService.instance = new OfflineMessageQueueService();
    }
    return OfflineMessageQueueService.instance;
  }

  /**
   * Initialize IndexedDB database for offline storage
   */
  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('OfflineMessageQueue', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Message Queue Store
        if (!db.objectStoreNames.contains('messageQueue')) {
          const messageQueueStore = db.createObjectStore('messageQueue', { keyPath: 'id' });
          messageQueueStore.createIndex('conversationId', 'conversationId');
          messageQueueStore.createIndex('status', 'status');
          messageQueueStore.createIndex('timestamp', 'timestamp');
          messageQueueStore.createIndex('retryCount', 'retryCount');
        }

        // Offline Actions Store
        if (!db.objectStoreNames.contains('offlineActions')) {
          const offlineActionsStore = db.createObjectStore('offlineActions', { keyPath: 'id' });
          offlineActionsStore.createIndex('type', 'type');
          offlineActionsStore.createIndex('timestamp', 'timestamp');
          offlineActionsStore.createIndex('retryCount', 'retryCount');
        }

        // Sync Status Store
        if (!db.objectStoreNames.contains('syncStatus')) {
          const syncStatusStore = db.createObjectStore('syncStatus', { keyPath: 'conversationId' });
          syncStatusStore.createIndex('lastSyncTimestamp', 'lastSyncTimestamp');
          syncStatusStore.createIndex('pendingMessages', 'pendingMessages');
        }

        // Failed Messages Store (for debugging)
        if (!db.objectStoreNames.contains('failedMessages')) {
          const failedMessagesStore = db.createObjectStore('failedMessages', { keyPath: 'id' });
          failedMessagesStore.createIndex('originalMessageId', 'originalMessageId');
          failedMessagesStore.createIndex('failureReason', 'failureReason');
          failedMessagesStore.createIndex('timestamp', 'timestamp');
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
      this.syncPendingMessages();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Periodic sync attempt (every 30 seconds when online)
    setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncPendingMessages();
      }
    }, 30000);
  }

  /**
   * Queue a message for sending when online
   */
  async queueMessage(
    conversationId: string,
    content: string,
    contentType: 'text' | 'image' | 'file' | 'post_share' = 'text',
    attachments?: any[]
  ): Promise<string> {
    const messageId = this.generateId();
    const queueItem: MessageQueue = {
      id: messageId,
      conversationId,
      content,
      contentType,
      timestamp: new Date(),
      retryCount: 0,
      status: this.isOnline ? 'sending' : 'pending',
    };

    await this.storeQueueItem(queueItem);

    // Try to send immediately if online
    if (this.isOnline) {
      this.sendQueuedMessage(queueItem);
    }

    return messageId;
  }

  /**
   * Queue an offline action
   */
  async queueOfflineAction(action: Omit<OfflineAction, 'id'>): Promise<string> {
    const actionId = this.generateId();
    const offlineAction: OfflineAction = {
      id: actionId,
      ...action,
    };

    await this.storeOfflineAction(offlineAction);

    // Try to execute immediately if online
    if (this.isOnline) {
      this.executeOfflineAction(offlineAction);
    }

    return actionId;
  }

  /**
   * Get all pending messages for a conversation
   */
  async getPendingMessages(conversationId: string): Promise<MessageQueue[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messageQueue'], 'readonly');
      const store = transaction.objectStore('messageQueue');
      const index = store.index('conversationId');
      const request = index.getAll(conversationId);

      request.onsuccess = () => {
        const messages = request.result.filter(msg => 
          msg.status === 'pending' || msg.status === 'sending'
        );
        resolve(messages);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get sync status for a conversation
   */
  async getSyncStatus(conversationId: string): Promise<any> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncStatus'], 'readonly');
      const store = transaction.objectStore('syncStatus');
      const request = store.get(conversationId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update sync status for a conversation
   */
  async updateSyncStatus(conversationId: string, status: any): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncStatus'], 'readwrite');
      const store = transaction.objectStore('syncStatus');
      const request = store.put({
        conversationId,
        ...status,
        lastSyncTimestamp: new Date(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Sync all pending messages and actions
   */
  async syncPendingMessages(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) return;

    this.syncInProgress = true;
    
    try {
      // Sync pending messages
      const pendingMessages = await this.getAllPendingMessages();
      for (const message of pendingMessages) {
        await this.sendQueuedMessage(message);
      }

      // Sync offline actions
      const offlineActions = await this.getAllOfflineActions();
      for (const action of offlineActions) {
        await this.executeOfflineAction(action);
      }

      // Clean up completed items
      await this.cleanupCompletedItems();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Send a queued message
   */
  private async sendQueuedMessage(queueItem: MessageQueue): Promise<void> {
    try {
      // Update status to sending
      await this.updateQueueItemStatus(queueItem.id, 'sending');

      // Attempt to send the message
      const response = await fetch(`/api/conversations/${queueItem.conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('userAddress')}`,
        },
        body: JSON.stringify({
          content: queueItem.content,
          contentType: queueItem.contentType,
          queueId: queueItem.id, // Include queue ID for deduplication
        }),
      });

      if (response.ok) {
        // Message sent successfully
        await this.removeQueueItem(queueItem.id);
        
        // Update sync status
        await this.updateSyncStatus(queueItem.conversationId, {
          pendingMessages: (await this.getPendingMessages(queueItem.conversationId)).length - 1,
          syncInProgress: false,
          lastError: null,
        });
      } else {
        // Handle send failure
        await this.handleSendFailure(queueItem, `HTTP ${response.status}`);
      }
    } catch (error) {
      await this.handleSendFailure(queueItem, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Execute an offline action
   */
  private async executeOfflineAction(action: OfflineAction): Promise<void> {
    try {
      let success = false;

      switch (action.type) {
        case 'mark_read':
          success = await this.executeMarkReadAction(action);
          break;
        case 'delete_message':
          success = await this.executeDeleteMessageAction(action);
          break;
        case 'leave_conversation':
          success = await this.executeLeaveConversationAction(action);
          break;
        default:
          console.warn('Unknown offline action type:', action.type);
          success = false;
      }

      if (success) {
        await this.removeOfflineAction(action.id);
      } else {
        await this.handleActionFailure(action, 'Execution failed');
      }
    } catch (error) {
      await this.handleActionFailure(action, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Execute mark read action
   */
  private async executeMarkReadAction(action: OfflineAction): Promise<boolean> {
    try {
      const response = await fetch(`/api/conversations/${action.data.conversationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('userAddress')}`,
        },
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Execute delete message action
   */
  private async executeDeleteMessageAction(action: OfflineAction): Promise<boolean> {
    try {
      const response = await fetch(`/api/messages/${action.data.messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('userAddress')}`,
        },
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Execute leave conversation action
   */
  private async executeLeaveConversationAction(action: OfflineAction): Promise<boolean> {
    try {
      const response = await fetch(`/api/conversations/${action.data.conversationId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('userAddress')}`,
        },
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Handle message send failure
   */
  private async handleSendFailure(queueItem: MessageQueue, error: string): Promise<void> {
    const newRetryCount = queueItem.retryCount + 1;
    const maxRetries = 5;

    if (newRetryCount >= maxRetries) {
      // Move to failed messages
      await this.moveToFailedMessages(queueItem, error);
      await this.removeQueueItem(queueItem.id);
    } else {
      // Update retry count and schedule retry
      await this.updateQueueItem(queueItem.id, {
        retryCount: newRetryCount,
        status: 'pending' as const,
      });

      // Schedule retry with exponential backoff
      const retryDelay = Math.min(1000 * Math.pow(2, newRetryCount), 60000); // Max 1 minute
      const timeoutId = setTimeout(() => {
        this.sendQueuedMessage({ ...queueItem, retryCount: newRetryCount });
        this.retryTimeouts.delete(queueItem.id);
      }, retryDelay);

      this.retryTimeouts.set(queueItem.id, timeoutId);
    }
  }

  /**
   * Handle offline action failure
   */
  private async handleActionFailure(action: OfflineAction, error: string): Promise<void> {
    const newRetryCount = action.retryCount + 1;

    if (newRetryCount >= action.maxRetries) {
      // Remove failed action
      await this.removeOfflineAction(action.id);
      console.error('Offline action failed permanently:', action, error);
    } else {
      // Update retry count
      await this.updateOfflineAction(action.id, {
        retryCount: newRetryCount,
      });

      // Schedule retry
      const retryDelay = Math.min(1000 * Math.pow(2, newRetryCount), 60000);
      setTimeout(() => {
        this.executeOfflineAction({ ...action, retryCount: newRetryCount });
      }, retryDelay);
    }
  }

  /**
   * Store queue item in IndexedDB
   */
  private async storeQueueItem(queueItem: MessageQueue): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messageQueue'], 'readwrite');
      const store = transaction.objectStore('messageQueue');
      const request = store.put(queueItem);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Store offline action in IndexedDB
   */
  private async storeOfflineAction(action: OfflineAction): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineActions'], 'readwrite');
      const store = transaction.objectStore('offlineActions');
      const request = store.put(action);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update queue item status
   */
  private async updateQueueItemStatus(id: string, status: MessageQueue['status']): Promise<void> {
    await this.updateQueueItem(id, { status });
  }

  /**
   * Update queue item
   */
  private async updateQueueItem(id: string, updates: Partial<MessageQueue>): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messageQueue'], 'readwrite');
      const store = transaction.objectStore('messageQueue');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          const updatedItem = { ...item, ...updates };
          const putRequest = store.put(updatedItem);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Queue item not found'));
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Update offline action
   */
  private async updateOfflineAction(id: string, updates: Partial<OfflineAction>): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineActions'], 'readwrite');
      const store = transaction.objectStore('offlineActions');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (action) {
          const updatedAction = { ...action, ...updates };
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
   * Remove queue item
   */
  private async removeQueueItem(id: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messageQueue'], 'readwrite');
      const store = transaction.objectStore('messageQueue');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove offline action
   */
  private async removeOfflineAction(id: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineActions'], 'readwrite');
      const store = transaction.objectStore('offlineActions');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Move message to failed messages store
   */
  private async moveToFailedMessages(queueItem: MessageQueue, error: string): Promise<void> {
    if (!this.db) return;

    const failedMessage = {
      id: this.generateId(),
      originalMessageId: queueItem.id,
      conversationId: queueItem.conversationId,
      content: queueItem.content,
      contentType: queueItem.contentType,
      originalTimestamp: queueItem.timestamp,
      failureReason: error,
      timestamp: new Date(),
      retryCount: queueItem.retryCount,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['failedMessages'], 'readwrite');
      const store = transaction.objectStore('failedMessages');
      const request = store.put(failedMessage);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all pending messages
   */
  private async getAllPendingMessages(): Promise<MessageQueue[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messageQueue'], 'readonly');
      const store = transaction.objectStore('messageQueue');
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all offline actions
   */
  private async getAllOfflineActions(): Promise<OfflineAction[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineActions'], 'readonly');
      const store = transaction.objectStore('offlineActions');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clean up completed items
   */
  private async cleanupCompletedItems(): Promise<void> {
    // Clean up old failed messages (older than 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['failedMessages'], 'readwrite');
      const store = transaction.objectStore('failedMessages');
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(sevenDaysAgo);
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get failed messages for debugging
   */
  async getFailedMessages(): Promise<any[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['failedMessages'], 'readonly');
      const store = transaction.objectStore('failedMessages');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retry failed message
   */
  async retryFailedMessage(failedMessageId: string): Promise<boolean> {
    if (!this.db) return false;

    try {
      // Get failed message
      const failedMessage = await new Promise<any>((resolve, reject) => {
        const transaction = this.db!.transaction(['failedMessages'], 'readonly');
        const store = transaction.objectStore('failedMessages');
        const request = store.get(failedMessageId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (!failedMessage) return false;

      // Create new queue item
      const queueItem: MessageQueue = {
        id: this.generateId(),
        conversationId: failedMessage.conversationId,
        content: failedMessage.content,
        contentType: failedMessage.contentType,
        timestamp: new Date(),
        retryCount: 0,
        status: 'pending',
      };

      await this.storeQueueItem(queueItem);

      // Remove from failed messages
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction(['failedMessages'], 'readwrite');
        const store = transaction.objectStore('failedMessages');
        const request = store.delete(failedMessageId);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Try to send if online
      if (this.isOnline) {
        this.sendQueuedMessage(queueItem);
      }

      return true;
    } catch (error) {
      console.error('Failed to retry message:', error);
      return false;
    }
  }

  /**
   * Clear all queued items
   */
  async clearAllQueues(): Promise<void> {
    if (!this.db) return;

    const stores = ['messageQueue', 'offlineActions', 'failedMessages'];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(stores, 'readwrite');
      let completed = 0;

      stores.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();

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
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pendingMessages: number;
    sendingMessages: number;
    failedMessages: number;
    offlineActions: number;
  }> {
    if (!this.db) {
      return {
        pendingMessages: 0,
        sendingMessages: 0,
        failedMessages: 0,
        offlineActions: 0,
      };
    }

    const [pending, sending, failed, actions] = await Promise.all([
      this.getCountByStatus('pending'),
      this.getCountByStatus('sending'),
      this.getFailedMessagesCount(),
      this.getOfflineActionsCount(),
    ]);

    return {
      pendingMessages: pending,
      sendingMessages: sending,
      failedMessages: failed,
      offlineActions: actions,
    };
  }

  /**
   * Get count by status
   */
  private async getCountByStatus(status: string): Promise<number> {
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messageQueue'], 'readonly');
      const store = transaction.objectStore('messageQueue');
      const index = store.index('status');
      const request = index.count(status);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get failed messages count
   */
  private async getFailedMessagesCount(): Promise<number> {
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['failedMessages'], 'readonly');
      const store = transaction.objectStore('failedMessages');
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get offline actions count
   */
  private async getOfflineActionsCount(): Promise<number> {
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineActions'], 'readonly');
      const store = transaction.objectStore('offlineActions');
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if online
   */
  isOnlineStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Force sync (for manual retry)
   */
  async forcSync(): Promise<void> {
    if (this.isOnline) {
      await this.syncPendingMessages();
    }
  }

  /**
   * Get network status
   */
  getNetworkStatus(): {
    isOnline: boolean;
    syncInProgress: boolean;
    lastSyncAttempt?: Date;
  } {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
    };
  }
}