// Offline Action Queue Service
// Manages queuing of user actions when backend is unavailable

export interface OfflineAction {
  id?: string;
  type: string;
  data: any;
  auth?: string;
  timestamp?: number;
  postId?: string;
  communityId?: string;
  userId?: string;
}

interface QueueStatus {
  isOnline: boolean;
  queueSize: number;
}

class OfflineActionQueueService {
  private serviceWorker: ServiceWorker | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      this.initializeServiceWorker();
      this.setupMessageListener();
    }
  }

  private async initializeServiceWorker() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        this.serviceWorker = registration.active;
        this.isInitialized = true;
        console.log('Offline action queue service initialized');
      } catch (error) {
        console.error('Failed to initialize service worker:', error);
      }
    }
  }

  private setupMessageListener() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, ...data } = event.data;
        this.notifyListeners(type, data);
      });
    }
  }

  // Queue an action for offline execution
  async queueAction(action: OfflineAction): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false;
    }

    await this.ensureInitialized();

    if (!this.serviceWorker) {
      console.warn('Service worker not available, cannot queue action');
      return false;
    }

    try {
      const response = await this.sendMessage('QUEUE_OFFLINE_ACTION', action);
      return response.success;
    } catch (error) {
      console.error('Failed to queue offline action:', error);
      return false;
    }
  }

  // Queue post creation
  async queueCreatePost(postData: any, auth?: string): Promise<boolean> {
    return this.queueAction({
      type: 'CREATE_POST',
      data: postData,
      auth
    });
  }

  // Queue comment creation
  async queueCreateComment(postId: string, commentData: any, auth?: string): Promise<boolean> {
    return this.queueAction({
      type: 'CREATE_COMMENT',
      postId,
      data: commentData,
      auth
    });
  }

  // Queue reaction
  async queueReaction(postId: string, reactionData: any, auth?: string): Promise<boolean> {
    return this.queueAction({
      type: 'REACT_TO_POST',
      postId,
      data: reactionData,
      auth
    });
  }

  // Queue community join
  async queueJoinCommunity(communityId: string, joinData: any, auth?: string): Promise<boolean> {
    return this.queueAction({
      type: 'JOIN_COMMUNITY',
      communityId,
      data: joinData,
      auth
    });
  }

  // Queue follow user
  async queueFollowUser(userId: string, followData: any, auth?: string): Promise<boolean> {
    return this.queueAction({
      type: 'FOLLOW_USER',
      userId,
      data: followData,
      auth
    });
  }

  // Get current offline status
  async getOfflineStatus(): Promise<QueueStatus> {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return { isOnline: false, queueSize: 0 };
    }

    if (!this.serviceWorker) {
      return { isOnline: navigator.onLine, queueSize: 0 };
    }

    try {
      const response = await this.sendMessage('GET_OFFLINE_STATUS', {});
      return response;
    } catch (error) {
      console.error('Failed to get offline status:', error);
      return { isOnline: navigator.onLine, queueSize: 0 };
    }
  }

  // Manually trigger sync of offline actions
  async syncOfflineActions(): Promise<boolean> {
    if (!this.serviceWorker) {
      console.warn('Service worker not available, cannot sync actions');
      return false;
    }

    try {
      const response = await this.sendMessage('SYNC_OFFLINE_ACTIONS', {});
      return response.success;
    } catch (error) {
      console.error('Failed to sync offline actions:', error);
      return false;
    }
  }

  // Send message to service worker
  private async sendMessage(type: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Not in browser environment'));
        return;
      }

      if (!this.serviceWorker) {
        reject(new Error('Service worker not available'));
        return;
      }

      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      this.serviceWorker.postMessage(
        { type, data },
        [messageChannel.port2]
      );

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Service worker message timeout'));
      }, 5000);
    });
  }

  // Add event listener
  addEventListener(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  // Remove event listener
  removeEventListener(event: string, callback: Function) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Notify listeners
  private notifyListeners(event: string, data: any) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  // Clear all queued actions
  async clearQueue(): Promise<void> {
    try {
      await this.sendMessage('CLEAR_QUEUE', {});
    } catch (error) {
      console.error('Failed to clear queue:', error);
    }
  }

  // Get actions by type
  async getActionsByType(actionType: string): Promise<any[]> {
    try {
      const response = await this.sendMessage('GET_ACTIONS_BY_TYPE', { actionType });
      return response.actions || [];
    } catch (error) {
      console.error('Failed to get actions by type:', error);
      return [];
    }
  }

  // Mark action as completed
  async markActionCompleted(actionId: string): Promise<void> {
    try {
      await this.sendMessage('MARK_ACTION_COMPLETED', { actionId });
    } catch (error) {
      console.error('Failed to mark action completed:', error);
    }
  }

  // Retry action with backoff
  async retryWithBackoff(action: any): Promise<void> {
    try {
      await this.sendMessage('RETRY_ACTION', { action });
    } catch (error) {
      console.error('Failed to retry action:', error);
    }
  }

  // Get ready actions for sync
  async getReadyActions(): Promise<any[]> {
    try {
      const response = await this.sendMessage('GET_READY_ACTIONS', {});
      return response.actions || [];
    } catch (error) {
      console.error('Failed to get ready actions:', error);
      return [];
    }
  }

  // Check if currently online
  isOnline(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return false;
    }
    return navigator.onLine;
  }

  // Check if action should be queued (when offline or backend unavailable)
  shouldQueueAction(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return false;
    }
    return !navigator.onLine;
  }

  // Lazy initialization for browser environment
  private async ensureInitialized(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    if (!this.isInitialized) {
      await this.initializeServiceWorker();
      this.setupMessageListener();
    }
  }
}

// Lazy singleton instance
let _offlineActionQueue: OfflineActionQueueService | null = null;

export const getOfflineActionQueue = (): OfflineActionQueueService => {
  if (!_offlineActionQueue) {
    _offlineActionQueue = new OfflineActionQueueService();
  }
  return _offlineActionQueue;
};

// Export singleton instance (lazy-loaded)
export const offlineActionQueue = typeof window !== 'undefined' ? getOfflineActionQueue() : null;
export default offlineActionQueue;