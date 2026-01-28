import { Product } from './marketplaceService';

export interface RecentlyViewedState {
  items: Product[];
}

class RecentlyViewedService {
  private static instance: RecentlyViewedService;
  private storageKey = 'linkdao_marketplace_recently_viewed';
  private listeners: Set<(state: RecentlyViewedState) => void> = new Set();
  private maxItems = 12;

  private constructor() {}

  static getInstance(): RecentlyViewedService {
    if (!RecentlyViewedService.instance) {
      RecentlyViewedService.instance = new RecentlyViewedService();
    }
    return RecentlyViewedService.instance;
  }

  subscribe(listener: (state: RecentlyViewedState) => void): () => void {
    this.listeners.add(listener);
    // Initial notification
    listener(this.getRecentlyViewedStateSync());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(state: RecentlyViewedState): void {
    this.listeners.forEach(listener => listener(state));
  }

  getRecentlyViewedStateSync(): RecentlyViewedState {
    if (typeof window === 'undefined') {
      return { items: [] };
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return { items: [] };
      }

      const parsed = JSON.parse(stored);
      return {
        items: parsed.items || []
      };
    } catch (error) {
      console.error('Error loading recently viewed state:', error);
      return { items: [] };
    }
  }

  private saveRecentlyViewedStateSync(state: RecentlyViewedState): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving recently viewed state:', error);
    }
  }

  addProduct(product: Product): void {
    if (!product || !product.id) return;

    const currentState = this.getRecentlyViewedStateSync();
    
    // Remove if already exists to move it to the front
    const filteredItems = currentState.items.filter(item => item.id !== product.id);
    
    // Add to front and limit
    const newItems = [product, ...filteredItems].slice(0, this.maxItems);
    
    const newState: RecentlyViewedState = { items: newItems };

    this.saveRecentlyViewedStateSync(newState);
    this.notifyListeners(newState);
  }

  clearHistory(): void {
    const newState: RecentlyViewedState = { items: [] };
    this.saveRecentlyViewedStateSync(newState);
    this.notifyListeners(newState);
  }
}

export const recentlyViewedService = RecentlyViewedService.getInstance();
