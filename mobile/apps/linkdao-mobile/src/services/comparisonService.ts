/**
 * Comparison Service
 * Manages product comparison state for mobile app
 * Uses AsyncStorage for persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Product {
  id: string;
  title: string;
  description: string;
  priceAmount: number;
  priceCurrency: string;
  images: string[];
  seller?: {
    id: string;
    displayName?: string;
    storeName?: string;
    rating: number;
    verified: boolean;
    walletAddress: string;
  };
  category?: {
    name: string;
  };
  metadata?: {
    condition?: string;
    brand?: string;
  };
  views: number;
  favorites: number;
  status: string;
  inventory: number;
}

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
    this.getComparisonState().then(state => listener(state));
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notifyListeners(state: ComparisonState): Promise<void> {
    this.listeners.forEach(listener => listener(state));
  }

  async getComparisonState(): Promise<ComparisonState> {
    try {
      const stored = await AsyncStorage.getItem(this.storageKey);
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

  private async saveComparisonState(state: ComparisonState): Promise<void> {
    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving comparison state:', error);
    }
  }

  async addItem(product: Product): Promise<boolean> {
    const currentState = await this.getComparisonState();
    const existingItemIndex = currentState.items.findIndex(item => item.id === product.id);

    if (existingItemIndex >= 0) {
      return false; // Already in list
    }

    if (currentState.items.length >= this.maxItems) {
      return false; // Limit reached
    }

    const newItems = [...currentState.items, product];
    const newState: ComparisonState = { items: newItems };

    await this.saveComparisonState(newState);
    await this.notifyListeners(newState);
    return true;
  }

  async removeItem(productId: string): Promise<boolean> {
    const currentState = await this.getComparisonState();
    const itemIndex = currentState.items.findIndex(item => item.id === productId);

    if (itemIndex < 0) {
      return false;
    }

    const newItems = [...currentState.items];
    newItems.splice(itemIndex, 1);

    const newState: ComparisonState = { items: newItems };

    await this.saveComparisonState(newState);
    await this.notifyListeners(newState);
    return true;
  }

  async isInComparison(productId: string): Promise<boolean> {
    const currentState = await this.getComparisonState();
    return currentState.items.some(item => item.id === productId);
  }

  async clearComparison(): Promise<void> {
    const newState: ComparisonState = { items: [] };
    await this.saveComparisonState(newState);
    await this.notifyListeners(newState);
  }

  async getCount(): Promise<number> {
    const state = await this.getComparisonState();
    return state.items.length;
  }
}

export const comparisonService = ComparisonService.getInstance();
export default comparisonService;