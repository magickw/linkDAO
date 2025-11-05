
/**
 * Network Error Handler
 * Provides graceful handling of network failures and service unavailability
 */

export interface NetworkErrorOptions {
  retryAttempts?: number;
  retryDelay?: number;
  fallbackData?: any;
  showUserMessage?: boolean;
}

export class NetworkErrorHandler {
  private static instance: NetworkErrorHandler;
  private retryQueue: Map<string, number> = new Map();
  
  static getInstance(): NetworkErrorHandler {
    if (!NetworkErrorHandler.instance) {
      NetworkErrorHandler.instance = new NetworkErrorHandler();
    }
    return NetworkErrorHandler.instance;
  }

  async handleRequest<T>(
    requestFn: () => Promise<T>,
    options: NetworkErrorOptions = {}
  ): Promise<T> {
    const {
      retryAttempts = 3,
      retryDelay = 1000,
      fallbackData = null,
      showUserMessage = true
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const result = await requestFn();
        
        // Clear retry count on success
        this.retryQueue.clear();
        
        return result;
      } catch (error: any) {
        lastError = error;
        
        console.warn(`Request attempt ${attempt} failed:`, error.message);
        
        // If this is the last attempt, don't wait
        if (attempt === retryAttempts) {
          break;
        }
        
        // Wait before retrying
        await this.delay(retryDelay * attempt);
      }
    }

    // All attempts failed, handle the error
    return this.handleFailure(lastError, fallbackData, showUserMessage);
  }

  private async handleFailure<T>(
    error: Error | null,
    fallbackData: T,
    showUserMessage: boolean
  ): Promise<T> {
    const errorMessage = error?.message || 'Unknown network error';
    
    console.error('❌ All retry attempts failed:', errorMessage);
    
    if (showUserMessage) {
      this.showUserNotification(errorMessage);
    }
    
    // Return fallback data if available
    if (fallbackData !== null) {
      console.log('📦 Using fallback data');
      return fallbackData;
    }
    
    // Throw a user-friendly error
    throw new Error('Service temporarily unavailable. Please try again later.');
  }

  private showUserNotification(message: string) {
    // Try to show a user-friendly notification
    if (typeof window !== 'undefined') {
      // You can integrate with your notification system here
      console.log('🔔 User notification:', message);
      
      // Simple browser notification as fallback
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Connection Issue', {
          body: 'Having trouble connecting. Retrying...',
          icon: '/favicon.ico'
        });
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Specific handlers for common scenarios
  async handleApiRequest<T>(
    url: string,
    options: RequestInit = {},
    fallbackData?: T
  ): Promise<T> {
    return this.handleRequest(
      () => fetch(url, options).then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      }),
      { fallbackData, retryAttempts: 3, retryDelay: 1000 }
    );
  }

  async handleWebSocketConnection(
    url: string,
    options: any = {}
  ): Promise<WebSocket> {
    return this.handleRequest(
      () => new Promise<WebSocket>((resolve, reject) => {
        const ws = new WebSocket(url);
        
        ws.onopen = () => resolve(ws);
        ws.onerror = (error) => reject(new Error('WebSocket connection failed'));
        
        // Timeout after 10 seconds
        setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            ws.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);
      }),
      { retryAttempts: 5, retryDelay: 2000 }
    );
  }
}

// Export singleton instance
export const networkErrorHandler = NetworkErrorHandler.getInstance();

// Export utility functions
export const withNetworkErrorHandling = <T>(
  requestFn: () => Promise<T>,
  options?: NetworkErrorOptions
): Promise<T> => {
  return networkErrorHandler.handleRequest(requestFn, options);
};

export const apiRequest = <T>(
  url: string,
  options?: RequestInit,
  fallbackData?: T
): Promise<T> => {
  return networkErrorHandler.handleApiRequest(url, options, fallbackData);
};
