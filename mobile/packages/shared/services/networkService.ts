class NetworkService {
  private isOnline = true;
  private listeners = new Set<(online: boolean) => void>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notifyListeners();
      });
      
      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notifyListeners();
      });
    }
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  onStatusChange(callback: (online: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.isOnline);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
  }

  // Test network connectivity with a lightweight request
  async testConnectivity(): Promise<boolean> {
    if (!this.isOnline) {
      return false;
    }

    try {
      // Use a lightweight request to test connectivity
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const networkService = new NetworkService();
export default networkService;