// API Response Cache Manager
export class ApiCacheManager {
  private static readonly CACHE_PREFIX = 'linkdao-api-';
  private static readonly DEFAULT_EXPIRY = 5 * 60 * 1000; // 5 minutes
  private static readonly STALE_WHILE_REVALIDATE = 30 * 60 * 1000; // 30 minutes

  static async get<T>(key: string): Promise<T | null> {
    try {
      const cache = await caches.open(`${this.CACHE_PREFIX}${key}`);
      const response = await cache.match('data');
      
      if (!response) return null;
      
      const data = await response.json();
      const now = Date.now();
      
      // If data is fresh, return it
      if (now < data.expiry) {
        return data.value;
      }
      
      // If data is stale but within SWR window, trigger background refresh and return stale
      if (now < data.expiry + this.STALE_WHILE_REVALIDATE) {
        this.triggerBackgroundRefresh(key);
        return data.value;
      }
      
      // Data is too old, remove it
      await cache.delete('data');
      return null;
    } catch (error) {
      console.warn('Cache read error:', error);
      return null;
    }
  }

  static async set<T>(key: string, value: T, expiry: number = this.DEFAULT_EXPIRY): Promise<void> {
    try {
      const cache = await caches.open(`${this.CACHE_PREFIX}${key}`);
      const data = {
        value,
        expiry: Date.now() + expiry
      };
      
      await cache.put('data', new Response(JSON.stringify(data)));
    } catch (error) {
      console.warn('Cache write error:', error);
    }
  }

  private static async triggerBackgroundRefresh(key: string): Promise<void> {
    // Notify service worker to refresh data
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'REFRESH_CACHE',
        key
      });
    }
  }
}