/**
 * Offline Support and Action Queuing System
 * Handles offline functionality with sync capabilities
 */

export interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'medium' | 'high';
}

export interface OfflineState {
  isOnline: boolean;
  queuedActions: QueuedAction[];
  syncInProgress: boolean;
  lastSyncTime?: Date;
}

export class OfflineManager {
  private static instance: OfflineManager;
  private state: OfflineState = {
    isOnline: navigator.onLine,
    queuedActions: [],
    syncInProgress: false
  };
  private listeners: ((state: OfflineState) => void)[] = [];
  private syncInterval?: NodeJS.Timeout;

  private constructor() {
    this.initializeEventListeners();
    this.loadQueueFromStorage();
    this.startPeriodicSync();
  }

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  /**
   * Initialize online/offline event listeners
   */
  private initializeEventListeners(): void {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    this.state.isOnline = true;
    this.notifyListeners();
    this.syncQueuedActions();
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    this.state.isOnline = false;
    this.notifyListeners();
  }

  /**
   * Queue action for later execution
   */
  queueAction(
    type: string,
    payload: any,
    options: {
      priority?: 'low' | 'medium' | 'high';
      maxRetries?: number;
    } = {}
  ): string {
    const action: QueuedAction = {
      id: this.generateActionId(),
      type,
      payload,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: options.maxRetries || 3,
      priority: options.priority || 'medium'
    };

    this.state.queuedActions.push(action);
    this.sortQueueByPriority();
    this.saveQueueToStorage();
    this.notifyListeners();

    return action.id;
  }

  /**
   * Execute action immediately or queue if offline
   */
  async executeOrQueue<T>(
    type: string,
    executor: () => Promise<T>,
    payload?: any,
    options?: {
      priority?: 'low' | 'medium' | 'high';
      maxRetries?: number;
    }
  ): Promise<T | null> {
    if (this.state.isOnline) {
      try {
        return await executor();
      } catch (error) {
        // If execution fails, queue for retry
        this.queueAction(type, payload, options);
        throw error;
      }
    } else {
      // Queue action for later execution
      this.queueAction(type, payload, options);
      return null;
    }
  }

  /**
   * Sync all queued actions
   */
  async syncQueuedActions(): Promise<void> {
    if (!this.state.isOnline || this.state.syncInProgress || this.state.queuedActions.length === 0) {
      return;
    }

    this.state.syncInProgress = true;
    this.notifyListeners();

    const actionsToSync = [...this.state.queuedActions];
    const successfulActions: string[] = [];

    for (const action of actionsToSync) {
      try {
        await this.executeQueuedAction(action);
        successfulActions.push(action.id);
      } catch (error) {
        action.retryCount++;
        if (action.retryCount >= action.maxRetries) {
          // Remove action if max retries exceeded
          successfulActions.push(action.id);
          console.error(`Action ${action.id} failed after ${action.maxRetries} retries:`, error);
        }
      }
    }

    // Remove successful or failed actions from queue
    this.state.queuedActions = this.state.queuedActions.filter(
      action => !successfulActions.includes(action.id)
    );

    this.state.syncInProgress = false;
    this.state.lastSyncTime = new Date();
    this.saveQueueToStorage();
    this.notifyListeners();
  }

  /**
   * Execute a specific queued action
   */
  private async executeQueuedAction(action: QueuedAction): Promise<void> {
    switch (action.type) {
      case 'CREATE_POST':
        await this.executeCreatePost(action.payload);
        break;
      case 'REACT_TO_POST':
        await this.executeReactToPost(action.payload);
        break;
      case 'TIP_USER':
        await this.executeTipUser(action.payload);
        break;
      case 'UPDATE_PROFILE':
        await this.executeUpdateProfile(action.payload);
        break;
      case 'JOIN_COMMUNITY':
        await this.executeJoinCommunity(action.payload);
        break;
      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Execute create post action
   */
  private async executeCreatePost(payload: any): Promise<void> {
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Failed to create post: ${response.statusText}`);
    }
  }

  /**
   * Execute react to post action
   */
  private async executeReactToPost(payload: any): Promise<void> {
    const response = await fetch(`/api/posts/${payload.postId}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: payload.reactionType,
        amount: payload.amount
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to react to post: ${response.statusText}`);
    }
  }

  /**
   * Execute tip user action
   */
  private async executeTipUser(payload: any): Promise<void> {
    const response = await fetch('/api/tips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Failed to tip user: ${response.statusText}`);
    }
  }

  /**
   * Execute update profile action
   */
  private async executeUpdateProfile(payload: any): Promise<void> {
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Failed to update profile: ${response.statusText}`);
    }
  }

  /**
   * Execute join community action
   */
  private async executeJoinCommunity(payload: any): Promise<void> {
    const response = await fetch(`/api/communities/${payload.communityId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to join community: ${response.statusText}`);
    }
  }

  /**
   * Sort queue by priority
   */
  private sortQueueByPriority(): void {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    this.state.queuedActions.sort((a, b) => {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Save queue to localStorage
   */
  private saveQueueToStorage(): void {
    try {
      localStorage.setItem('offlineQueue', JSON.stringify(this.state.queuedActions));
    } catch (error) {
      console.error('Failed to save queue to storage:', error);
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadQueueFromStorage(): void {
    try {
      const stored = localStorage.getItem('offlineQueue');
      if (stored) {
        const actions = JSON.parse(stored);
        this.state.queuedActions = actions.map((action: any) => ({
          ...action,
          timestamp: new Date(action.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load queue from storage:', error);
    }
  }

  /**
   * Start periodic sync
   */
  private startPeriodicSync(): void {
    this.syncInterval = setInterval(() => {
      if (this.state.isOnline && this.state.queuedActions.length > 0) {
        this.syncQueuedActions();
      }
    }, 30000); // Sync every 30 seconds
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }

  /**
   * Generate unique action ID
   */
  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: OfflineState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Get current state
   */
  getState(): OfflineState {
    return { ...this.state };
  }

  /**
   * Clear all queued actions
   */
  clearQueue(): void {
    this.state.queuedActions = [];
    this.saveQueueToStorage();
    this.notifyListeners();
  }

  /**
   * Remove specific action from queue
   */
  removeAction(actionId: string): void {
    this.state.queuedActions = this.state.queuedActions.filter(
      action => action.id !== actionId
    );
    this.saveQueueToStorage();
    this.notifyListeners();
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    total: number;
    byPriority: Record<string, number>;
    oldestAction?: Date;
  } {
    const stats = {
      total: this.state.queuedActions.length,
      byPriority: { high: 0, medium: 0, low: 0 },
      oldestAction: undefined as Date | undefined
    };

    this.state.queuedActions.forEach(action => {
      stats.byPriority[action.priority]++;
      if (!stats.oldestAction || action.timestamp < stats.oldestAction) {
        stats.oldestAction = action.timestamp;
      }
    });

    return stats;
  }
}

export const offlineManager = OfflineManager.getInstance();