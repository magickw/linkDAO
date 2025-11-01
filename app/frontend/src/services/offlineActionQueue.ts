/**
 * Offline Action Queue Implementation
 * Manages queued actions for background sync with retry logic and ordering preservation
 */

export interface OfflineAction {
  id: string;
  type: 'post' | 'comment' | 'reaction' | 'message' | 'community_join' | 'community_post';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  tags: string[];
  priority: 'high' | 'medium' | 'low';
  orderGroup?: string; // For preserving order within groups (e.g., message threads)
  dependencies?: string[]; // IDs of actions that must complete first
  expiresAt?: number; // Optional expiration timestamp
}

export interface QueueStatus {
  totalActions: number;
  pendingActions: number;
  failedActions: number;
  completedActions: number;
  averageRetryCount: number;
  oldestActionAge: number;
  queueSizeByType: Record<string, number>;
}

export interface RetryConfig {
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number;
}

export class OfflineActionQueue {
  private readonly DB_NAME = 'OfflineActionQueue';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'actions';
  private readonly STATUS_STORE_NAME = 'status';
  
  private db: IDBDatabase | null = null;
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();
  
  private readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    baseDelayMs: 1000, // 1 second
    maxDelayMs: 300000, // 5 minutes
    backoffMultiplier: 2,
    jitterFactor: 0.1
  };

  private readonly MAX_RETRIES_BY_TYPE: Record<string, number> = {
    post: 5,
    comment: 5,
    reaction: 3,
    message: 7, // Higher for messages to preserve conversations
    community_join: 3,
    community_post: 5
  };

  /**
   * Initialize the offline action queue with IndexedDB storage
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.setupErrorHandling();
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create actions store
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const actionsStore = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          actionsStore.createIndex('type', 'type');
          actionsStore.createIndex('timestamp', 'timestamp');
          actionsStore.createIndex('priority', 'priority');
          actionsStore.createIndex('orderGroup', 'orderGroup');
          actionsStore.createIndex('retryCount', 'retryCount');
          actionsStore.createIndex('expiresAt', 'expiresAt');
        }
        
        // Create status tracking store
        if (!db.objectStoreNames.contains(this.STATUS_STORE_NAME)) {
          db.createObjectStore(this.STATUS_STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Enqueue an action for offline processing
   */
  async enqueue(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    if (!this.db) {
      throw new Error('Queue not initialized');
    }

    const actionId = this.generateActionId();
    const fullAction: OfflineAction = {
      id: actionId,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.MAX_RETRIES_BY_TYPE[action.type] || 3,
      priority: action.priority || 'medium',
      ...action
    };

    // Validate action
    this.validateAction(fullAction);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.add(fullAction);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`Action enqueued: ${actionId} (${action.type})`);
        this.updateQueueStatus();
        resolve(actionId);
      };
    });
  }

  /**
   * Dequeue the next action for processing (respects priority and order)
   */
  async dequeue(): Promise<OfflineAction | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      // Get all actions and sort by priority and timestamp
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const actions = request.result as OfflineAction[];
        
        // Filter out expired actions
        const validActions = actions.filter(action => 
          !action.expiresAt || action.expiresAt > Date.now()
        );
        
        // Remove expired actions
        const expiredActions = actions.filter(action => 
          action.expiresAt && action.expiresAt <= Date.now()
        );
        
        for (const expired of expiredActions) {
          store.delete(expired.id);
        }
        
        if (validActions.length === 0) {
          resolve(null);
          return;
        }
        
        // Sort by priority and preserve order within groups
        const sortedActions = this.sortActionsByPriorityAndOrder(validActions);
        
        // Find the next processable action (no unmet dependencies)
        const nextAction = sortedActions.find(action => 
          this.canProcessAction(action, validActions)
        );
        
        if (nextAction) {
          // Remove from queue
          const deleteRequest = store.delete(nextAction.id);
          deleteRequest.onsuccess = () => {
            this.updateQueueStatus();
            resolve(nextAction);
          };
          deleteRequest.onerror = () => reject(deleteRequest.error);
        } else {
          resolve(null);
        }
      };
    });
  }

  /**
   * Get current queue status
   */
  async getStatus(): Promise<QueueStatus> {
    if (!this.db) {
      return this.getEmptyStatus();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const actions = request.result as OfflineAction[];
        const status = this.calculateQueueStatus(actions);
        resolve(status);
      };
    });
  }

  /**
   * Retry an action with exponential backoff
   */
  async retryWithBackoff(action: OfflineAction, config?: Partial<RetryConfig>): Promise<void> {
    const retryConfig = { ...this.DEFAULT_RETRY_CONFIG, ...config };
    
    if (action.retryCount >= action.maxRetries) {
      console.warn(`Action ${action.id} exceeded max retries (${action.maxRetries})`);
      await this.markActionAsFailed(action);
      return;
    }

    // Calculate delay with exponential backoff and jitter
    const baseDelay = Math.min(
      retryConfig.baseDelayMs * Math.pow(retryConfig.backoffMultiplier, action.retryCount),
      retryConfig.maxDelayMs
    );
    
    const jitter = baseDelay * retryConfig.jitterFactor * (Math.random() - 0.5);
    const delay = Math.max(0, baseDelay + jitter);

    console.log(`Scheduling retry for action ${action.id} in ${delay}ms (attempt ${action.retryCount + 1})`);

    // Clear any existing timeout
    const existingTimeout = this.retryTimeouts.get(action.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule retry
    const timeout = setTimeout(async () => {
      this.retryTimeouts.delete(action.id);
      
      // Increment retry count and re-enqueue
      const retryAction: OfflineAction = {
        ...action,
        retryCount: action.retryCount + 1,
        timestamp: Date.now() // Update timestamp for retry
      };
      
      try {
        await this.enqueueExisting(retryAction);
      } catch (error) {
        console.error(`Failed to re-enqueue action ${action.id}:`, error);
        await this.markActionAsFailed(action);
      }
    }, delay);

    this.retryTimeouts.set(action.id, timeout);
  }

  /**
   * Get actions by type
   */
  async getActionsByType(type: string): Promise<OfflineAction[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('type');
      const request = index.getAll(type);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Get actions by order group (for preserving message/comment order)
   */
  async getActionsByOrderGroup(orderGroup: string): Promise<OfflineAction[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('orderGroup');
      const request = index.getAll(orderGroup);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        // Sort by timestamp to preserve order
        const actions = request.result.sort((a, b) => a.timestamp - b.timestamp);
        resolve(actions);
      };
    });
  }

  /**
   * Remove action from queue
   */
  async removeAction(actionId: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(actionId);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        // Clear any pending retry timeout
        const timeout = this.retryTimeouts.get(actionId);
        if (timeout) {
          clearTimeout(timeout);
          this.retryTimeouts.delete(actionId);
        }
        
        this.updateQueueStatus();
        resolve();
      };
    });
  }

  /**
   * Clear all actions from queue
   */
  async clearQueue(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        // Clear all retry timeouts
        for (const timeout of this.retryTimeouts.values()) {
          clearTimeout(timeout);
        }
        this.retryTimeouts.clear();
        
        this.updateQueueStatus();
        resolve();
      };
    });
  }

  /**
   * Get actions that are ready for processing (no dependencies)
   */
  async getReadyActions(): Promise<OfflineAction[]> {
    if (!this.db) return [];

    const allActions = await this.getAllActions();
    return allActions.filter(action => this.canProcessAction(action, allActions));
  }

  /**
   * Mark action as completed and remove dependencies
   */
  async markActionCompleted(actionId: string): Promise<void> {
    await this.removeAction(actionId);
    
    // Update any actions that were waiting for this one
    const allActions = await this.getAllActions();
    const dependentActions = allActions.filter(action => 
      action.dependencies?.includes(actionId)
    );
    
    for (const dependent of dependentActions) {
      const updatedDependencies = dependent.dependencies?.filter(id => id !== actionId) || [];
      const updatedAction: OfflineAction = {
        ...dependent,
        dependencies: updatedDependencies.length > 0 ? updatedDependencies : undefined
      };
      
      await this.updateAction(updatedAction);
    }
  }

  // Private helper methods

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateAction(action: OfflineAction): void {
    if (!action.type || !action.data) {
      throw new Error('Action must have type and data');
    }
    
    if (action.maxRetries < 0) {
      throw new Error('maxRetries must be non-negative');
    }
    
    if (action.expiresAt && action.expiresAt <= Date.now()) {
      throw new Error('Action cannot be expired when enqueued');
    }
  }

  private sortActionsByPriorityAndOrder(actions: OfflineAction[]): OfflineAction[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    
    return actions.sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by order group (if same group, preserve timestamp order)
      if (a.orderGroup && b.orderGroup) {
        if (a.orderGroup === b.orderGroup) {
          return a.timestamp - b.timestamp;
        }
        return a.orderGroup.localeCompare(b.orderGroup);
      }
      
      // Finally by timestamp
      return a.timestamp - b.timestamp;
    });
  }

  private canProcessAction(action: OfflineAction, allActions: OfflineAction[]): boolean {
    if (!action.dependencies || action.dependencies.length === 0) {
      return true;
    }
    
    // Check if all dependencies are completed (not in queue)
    const pendingActionIds = new Set(allActions.map(a => a.id));
    return action.dependencies.every(depId => !pendingActionIds.has(depId));
  }

  private calculateQueueStatus(actions: OfflineAction[]): QueueStatus {
    const now = Date.now();
    const queueSizeByType: Record<string, number> = {};
    let totalRetries = 0;
    let oldestTimestamp = now;
    
    for (const action of actions) {
      queueSizeByType[action.type] = (queueSizeByType[action.type] || 0) + 1;
      totalRetries += action.retryCount;
      oldestTimestamp = Math.min(oldestTimestamp, action.timestamp);
    }
    
    return {
      totalActions: actions.length,
      pendingActions: actions.length,
      failedActions: 0, // Failed actions are removed from queue
      completedActions: 0, // Completed actions are removed from queue
      averageRetryCount: actions.length > 0 ? totalRetries / actions.length : 0,
      oldestActionAge: now - oldestTimestamp,
      queueSizeByType
    };
  }

  private getEmptyStatus(): QueueStatus {
    return {
      totalActions: 0,
      pendingActions: 0,
      failedActions: 0,
      completedActions: 0,
      averageRetryCount: 0,
      oldestActionAge: 0,
      queueSizeByType: {}
    };
  }

  private async getAllActions(): Promise<OfflineAction[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  private async enqueueExisting(action: OfflineAction): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(action);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.updateQueueStatus();
        resolve();
      };
    });
  }

  private async updateAction(action: OfflineAction): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(action);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async markActionAsFailed(action: OfflineAction): Promise<void> {
    console.error(`Action ${action.id} (${action.type}) failed after ${action.retryCount} retries`);
    
    // Store failed action for debugging/analytics
    await this.storeFailedAction(action);
    
    // Remove from queue
    await this.removeAction(action.id);
  }

  private async storeFailedAction(action: OfflineAction): Promise<void> {
    if (!this.db) return;

    const failedAction = {
      ...action,
      failedAt: Date.now(),
      id: `failed_${action.id}`
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STATUS_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STATUS_STORE_NAME);
      const request = store.put(failedAction);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private updateQueueStatus(): void {
    // Emit queue status update event for monitoring
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offlineQueueStatusUpdate', {
        detail: { timestamp: Date.now() }
      }));
    }
  }

  private setupErrorHandling(): void {
    if (this.db) {
      this.db.onerror = (event) => {
        console.error('IndexedDB error:', event);
      };
      
      this.db.onversionchange = () => {
        console.warn('Database version changed, closing connection');
        this.db?.close();
        this.db = null;
      };
    }
  }
}

// Export singleton instance
export const offlineActionQueue = new OfflineActionQueue();