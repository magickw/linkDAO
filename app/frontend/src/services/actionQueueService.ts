interface QueuedAction {
  id: string;
  type: 'post' | 'comment' | 'community_join' | 'community_create' | 'product_create' | 'like' | 'follow';
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'medium' | 'low';
  userId?: string;
}

interface ActionQueueOptions {
  maxQueueSize?: number;
  persistToStorage?: boolean;
  autoSync?: boolean;
  syncInterval?: number;
}

export class ActionQueueService {
  private queue: QueuedAction[] = [];
  private isProcessing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private options: Required<ActionQueueOptions>;
  private listeners: Set<(queue: QueuedAction[]) => void> = new Set();

  constructor(options: ActionQueueOptions = {}) {
    this.options = {
      maxQueueSize: options.maxQueueSize ?? 100,
      persistToStorage: options.persistToStorage ?? true,
      autoSync: options.autoSync ?? true,
      syncInterval: options.syncInterval ?? 30000 // 30 seconds
    };

    this.loadFromStorage();
    
    if (this.options.autoSync) {
      this.startAutoSync();
    }

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadFromStorage(): void {
    if (!this.options.persistToStorage) return;

    try {
      const stored = localStorage.getItem('actionQueue');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.queue = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Failed to load action queue from storage:', error);
    }
  }

  private saveToStorage(): void {
    if (!this.options.persistToStorage) return;

    try {
      localStorage.setItem('actionQueue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save action queue to storage:', error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.queue]));
  }

  private startAutoSync(): void {
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.isProcessing) {
        this.processQueue();
      }
    }, this.options.syncInterval);
  }

  private stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private handleOnline = (): void => {
    console.log('Connection restored, processing queued actions...');
    this.processQueue();
  };

  private handleOffline = (): void => {
    console.log('Connection lost, actions will be queued...');
  };

  public addAction(
    type: QueuedAction['type'],
    data: any,
    options: {
      priority?: QueuedAction['priority'];
      maxRetries?: number;
      userId?: string;
    } = {}
  ): string {
    // Check queue size limit
    if (this.queue.length >= this.options.maxQueueSize) {
      // Remove oldest low-priority items
      const lowPriorityIndex = this.queue.findIndex(item => item.priority === 'low');
      if (lowPriorityIndex !== -1) {
        this.queue.splice(lowPriorityIndex, 1);
      } else {
        throw new Error('Action queue is full');
      }
    }

    const action: QueuedAction = {
      id: this.generateId(),
      type,
      data,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: options.maxRetries ?? 3,
      priority: options.priority ?? 'medium',
      userId: options.userId
    };

    // Insert based on priority
    const insertIndex = this.queue.findIndex(item => 
      this.getPriorityValue(item.priority) < this.getPriorityValue(action.priority)
    );

    if (insertIndex === -1) {
      this.queue.push(action);
    } else {
      this.queue.splice(insertIndex, 0, action);
    }

    this.saveToStorage();
    this.notifyListeners();

    // Try to process immediately if online
    if (navigator.onLine && !this.isProcessing) {
      setTimeout(() => this.processQueue(), 100);
    }

    return action.id;
  }

  private getPriorityValue(priority: QueuedAction['priority']): number {
    switch (priority) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 1;
    }
  }

  public removeAction(id: string): boolean {
    const index = this.queue.findIndex(action => action.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.saveToStorage();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  public getQueue(): QueuedAction[] {
    return [...this.queue];
  }

  public getQueueSize(): number {
    return this.queue.length;
  }

  public clearQueue(): void {
    this.queue = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  public async processQueue(): Promise<void> {
    if (this.isProcessing || !navigator.onLine || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`Processing ${this.queue.length} queued actions...`);

    const processedIds: string[] = [];
    const failedActions: QueuedAction[] = [];

    for (const action of [...this.queue]) {
      try {
        const success = await this.executeAction(action);
        
        if (success) {
          processedIds.push(action.id);
          console.log(`Successfully processed action: ${action.type} (${action.id})`);
        } else {
          action.retryCount++;
          if (action.retryCount >= action.maxRetries) {
            processedIds.push(action.id); // Remove from queue
            console.error(`Action failed after ${action.maxRetries} retries: ${action.type} (${action.id})`);
          } else {
            failedActions.push(action);
            console.warn(`Action failed, will retry: ${action.type} (${action.id}), attempt ${action.retryCount}/${action.maxRetries}`);
          }
        }
      } catch (error) {
        console.error(`Error processing action ${action.id}:`, error);
        action.retryCount++;
        if (action.retryCount >= action.maxRetries) {
          processedIds.push(action.id);
        } else {
          failedActions.push(action);
        }
      }

      // Add small delay between actions to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Remove processed actions from queue
    this.queue = this.queue.filter(action => !processedIds.includes(action.id));
    
    this.saveToStorage();
    this.notifyListeners();
    this.isProcessing = false;

    if (processedIds.length > 0) {
      console.log(`Processed ${processedIds.length} actions successfully`);
    }
  }

  private async executeAction(action: QueuedAction): Promise<boolean> {
    try {
      switch (action.type) {
        case 'post':
          return await this.executePostAction(action.data);
        case 'comment':
          return await this.executeCommentAction(action.data);
        case 'community_join':
          return await this.executeCommunityJoinAction(action.data);
        case 'community_create':
          return await this.executeCommunityCreateAction(action.data);
        case 'product_create':
          return await this.executeProductCreateAction(action.data);
        case 'like':
          return await this.executeLikeAction(action.data);
        case 'follow':
          return await this.executeFollowAction(action.data);
        default:
          console.error(`Unknown action type: ${action.type}`);
          return false;
      }
    } catch (error) {
      console.error(`Failed to execute action ${action.type}:`, error);
      return false;
    }
  }

  private async executePostAction(data: any): Promise<boolean> {
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    return response.ok;
  }

  private async executeCommentAction(data: any): Promise<boolean> {
    const response = await fetch('/api/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    return response.ok;
  }

  private async executeCommunityJoinAction(data: any): Promise<boolean> {
    const response = await fetch(`/api/communities/${data.communityId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    return response.ok;
  }

  private async executeCommunityCreateAction(data: any): Promise<boolean> {
    const response = await fetch('/api/communities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    return response.ok;
  }

  private async executeProductCreateAction(data: any): Promise<boolean> {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    return response.ok;
  }

  private async executeLikeAction(data: any): Promise<boolean> {
    const response = await fetch(`/api/posts/${data.postId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    return response.ok;
  }

  private async executeFollowAction(data: any): Promise<boolean> {
    const response = await fetch(`/api/users/${data.userId}/follow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    return response.ok;
  }

  public subscribe(listener: (queue: QueuedAction[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public destroy(): void {
    this.stopAutoSync();
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.listeners.clear();
  }
}

// Export singleton instance
export const actionQueue = new ActionQueueService();
export default actionQueue;