import { Product } from './marketplaceService';

export interface ComparisonState {
  items: Product[];
}

class ComparisonService {
  private static instance: ComparisonService;
  private storageKey = 'linkdao_marketplace_comparison';
  private listeners: Set<(state: ComparisonState) => void> = new Set();
  private maxItems = 5;

  private constructor() {}

  static getInstance(): ComparisonService {
    if (!ComparisonService.instance) {
      ComparisonService.instance = new ComparisonService();
    }
    return ComparisonService.instance;
  }

  subscribe(listener: (state: ComparisonState) => void): () => void {
    this.listeners.add(listener);
    // Initial notification
    listener(this.getComparisonStateSync());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(state: ComparisonState): void {
    this.listeners.forEach(listener => listener(state));
  }

  getComparisonStateSync(): ComparisonState {
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
      console.error('Error loading comparison state:', error);
      return { items: [] };
    }
  }

  private saveComparisonStateSync(state: ComparisonState): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving comparison state:', error);
    }
  }

  addItem(product: Product): boolean {
    const currentState = this.getComparisonStateSync();
    const existingItemIndex = currentState.items.findIndex(item => item.id === product.id);

    if (existingItemIndex >= 0) {
      return false; // Already in list
    }

    if (currentState.items.length >= this.maxItems) {
      return false; // Limit reached
    }

    const newItems = [...currentState.items, product];
    const newState: ComparisonState = { items: newItems };

    this.saveComparisonStateSync(newState);
    this.notifyListeners(newState);
    return true;
  }

  removeItem(productId: string): boolean {
    const currentState = this.getComparisonStateSync();
    const itemIndex = currentState.items.findIndex(item => item.id === productId);

    if (itemIndex < 0) {
      return false;
    }

    const newItems = [...currentState.items];
    newItems.splice(itemIndex, 1);

    const newState: ComparisonState = { items: newItems };

    this.saveComparisonStateSync(newState);
    this.notifyListeners(newState);
    return true;
  }

  isInComparison(productId: string): boolean {
    const currentState = this.getComparisonStateSync();
    return currentState.items.some(item => item.id === productId);
  }

  clearComparison(): void {
    const newState: ComparisonState = { items: [] };
    this.saveComparisonStateSync(newState);
    this.notifyListeners(newState);
  }
}

export const comparisonService = ComparisonService.getInstance();
