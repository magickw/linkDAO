/**
 * Wishlist Service - Manages user wishlist state and persistence
 */

export interface WishlistItem {
  id: string;
  title: string;
  description: string;
  image: string;
  price: {
    crypto: string;
    cryptoSymbol: string;
    fiat: string;
    fiatSymbol: string;
  };
  seller: {
    id: string;
    name: string;
    avatar: string;
  };
  category: string;
  isDigital: boolean;
  isNFT: boolean;
  inventory: number;
  addedAt: Date;
}

export interface WishlistState {
  items: WishlistItem[];
  lastUpdated: Date;
}

class WishlistService {
  private static instance: WishlistService;
  private storageKey = 'linkdao_marketplace_wishlist';
  private listeners: Set<(state: WishlistState) => void> = new Set();

  private constructor() {}

  static getInstance(): WishlistService {
    if (!WishlistService.instance) {
      WishlistService.instance = new WishlistService();
    }
    return WishlistService.instance;
  }

  // Subscribe to wishlist state changes
  subscribe(listener: (state: WishlistState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Notify all listeners of state changes
  private notifyListeners(state: WishlistState): void {
    this.listeners.forEach(listener => listener(state));
  }

  // Get current wishlist state from localStorage
  getWishlistState(): WishlistState {
    if (typeof window === 'undefined') {
      return this.getEmptyWishlistState();
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return this.getEmptyWishlistState();
      }

      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      const state: WishlistState = {
        ...parsed,
        items: parsed.items.map((item: any) => ({
          ...item,
          addedAt: new Date(item.addedAt)
        })),
        lastUpdated: new Date(parsed.lastUpdated)
      };

      return state;
    } catch (error) {
      console.error('Error loading wishlist state:', error);
      return this.getEmptyWishlistState();
    }
  }

  // Save wishlist state to localStorage
  private saveWishlistState(state: WishlistState): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving wishlist state:', error);
    }
  }

  // Get empty wishlist state
  private getEmptyWishlistState(): WishlistState {
    return {
      items: [],
      lastUpdated: new Date()
    };
  }

  // Add item to wishlist
  addItem(product: Omit<WishlistItem, 'addedAt'>): void {
    const currentState = this.getWishlistState();
    const existingItemIndex = currentState.items.findIndex(item => item.id === product.id);

    // Don't add if already in wishlist
    if (existingItemIndex >= 0) {
      return;
    }

    // Add new item
    const newItem: WishlistItem = {
      ...product,
      addedAt: new Date()
    };
    
    const newItems = [...currentState.items, newItem];
    const newState: WishlistState = {
      items: newItems,
      lastUpdated: new Date()
    };

    this.saveWishlistState(newState);
    this.notifyListeners(newState);
  }

  // Remove item from wishlist
  removeItem(itemId: string): void {
    const currentState = this.getWishlistState();
    const itemIndex = currentState.items.findIndex(item => item.id === itemId);

    if (itemIndex < 0) {
      return;
    }

    const newItems = [...currentState.items];
    newItems.splice(itemIndex, 1);
    
    const newState: WishlistState = {
      items: newItems,
      lastUpdated: new Date()
    };

    this.saveWishlistState(newState);
    this.notifyListeners(newState);
  }

  // Check if item is in wishlist
  isInWishlist(itemId: string): boolean {
    const currentState = this.getWishlistState();
    return currentState.items.some(item => item.id === itemId);
  }

  // Clear wishlist
  clearWishlist(): void {
    const newState: WishlistState = {
      items: [],
      lastUpdated: new Date()
    };

    this.saveWishlistState(newState);
    this.notifyListeners(newState);
  }
}

export const wishlistService = WishlistService.getInstance();