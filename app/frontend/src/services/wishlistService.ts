/**
 * Wishlist Service - Manages user wishlist state with backend persistence
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
  wishlistItemId?: string; // For backend reference
}

export interface WishlistState {
  items: WishlistItem[];
  lastUpdated: Date;
}

class WishlistService {
  private static instance: WishlistService;
  private storageKey = 'linkdao_marketplace_wishlist';
  private listeners: Set<(state: WishlistState) => void> = new Set();
  private baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';
  private isAuthenticated = false;
  private authToken: string | null = null;
  private isSyncing = false;
  private lastSyncTime = 0;
  private syncCooldown = 5000; // 5 seconds cooldown between syncs

  private constructor() {
    // Check for authentication on initialization
    this.checkAuthStatus();

    // Subscribe to auth status changes
    this.setupAuthListener();
  }

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

  // Set authentication status
  setAuthStatus(isAuthenticated: boolean, token?: string): void {
    this.isAuthenticated = isAuthenticated;
    this.authToken = token || null;

    if (isAuthenticated && token) {
      // Sync local wishlist with backend when user authenticates
      this.syncWishlistWithBackend();
    }
  }

  // Check authentication status from localStorage or other sources
  private checkAuthStatus(): void {
    if (typeof window !== 'undefined') {
      let token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('auth_token') || localStorage.getItem('user_session') || sessionStorage.getItem('auth_token') || sessionStorage.getItem('token') || sessionStorage.getItem('authToken');

      // Also check for linkdao_session_data (wallet authentication)
      if (!token) {
        try {
          const sessionDataStr = localStorage.getItem('linkdao_session_data');
          if (sessionDataStr) {
            const sessionData = JSON.parse(sessionDataStr);
            token = sessionData.token || sessionData.accessToken || '';
          }
        } catch (error) {
          console.warn('Failed to parse linkdao_session_data');
        }
      }

      this.isAuthenticated = !!token;
      this.authToken = token;
    }
  }

  // Setup auth listener
  private setupAuthListener(): void {
    if (typeof window !== 'undefined') {
      const handleAuthChange = () => {
        this.checkAuthStatus();
      };

      window.addEventListener('storage', handleAuthChange);
      window.addEventListener('auth:login', handleAuthChange);
      window.addEventListener('auth:logout', handleAuthChange);
    }
  }

  // Get authentication headers
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  // Notify all listeners of state changes
  private notifyListeners(state: WishlistState): void {
    this.listeners.forEach(listener => listener(state));
  }

  // Get current wishlist state from localStorage or backend
  async getWishlistState(): Promise<WishlistState> {
    if (typeof window === 'undefined') {
      return this.getEmptyWishlistState();
    }

    // If authenticated, try to get wishlist from backend first
    if (this.isAuthenticated) {
      try {
        const backendWishlist = await this.getWishlistFromBackend();
        if (backendWishlist) {
          return backendWishlist;
        }
      } catch (error) {
        console.warn('Failed to fetch wishlist from backend, falling back to local storage:', error);
      }
    }

    // Fallback to localStorage
    return this.getWishlistStateSync();
  }

  // Synchronous version for backward compatibility
  getWishlistStateSync(): WishlistState {
    if (typeof window === 'undefined') {
      return this.getEmptyWishlistState();
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return this.getEmptyWishlistState();
      }

      const parsed = JSON.parse(stored);
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

  // Save wishlist state to localStorage and backend
  private async saveWishlistState(state: WishlistState): Promise<void> {
    if (typeof window === 'undefined') return;

    // Always save to localStorage first
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving wishlist state to localStorage:', error);
    }

    // If authenticated, also save to backend
    if (this.isAuthenticated) {
      try {
        await this.saveWishlistToBackend(state);
      } catch (error) {
        console.warn('Failed to save wishlist to backend:', error);
      }
    }
  }

  // Synchronous version for backward compatibility
  private saveWishlistStateSync(state: WishlistState): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving wishlist state:', error);
    }

    // Async save to backend without blocking
    if (this.isAuthenticated) {
      this.saveWishlistToBackend(state).catch(error => {
        console.warn('Failed to save wishlist to backend:', error);
      });
    }
  }

  // Get empty wishlist state
  private getEmptyWishlistState(): WishlistState {
    return {
      items: [],
      lastUpdated: new Date()
    };
  }

  // Sync local wishlist with backend
  private async syncWishlistWithBackend(): Promise<void> {
    if (this.isSyncing || !this.isAuthenticated) return;

    const now = Date.now();
    if (now - this.lastSyncTime < this.syncCooldown) {
      console.log('Sync cooldown active, skipping sync');
      return;
    }

    this.isSyncing = true;
    this.lastSyncTime = now;

    try {
      const localState = this.getWishlistStateSync();

      if (localState.items.length === 0) {
        // If local wishlist is empty, fetch from backend
        const backendState = await this.getWishlistFromBackend();
        if (backendState && backendState.items.length > 0) {
          this.notifyListeners(backendState);
        }
      } else {
        // Sync local items to backend
        await this.saveWishlistToBackend(localState);
      }
    } catch (error) {
      console.error('Error syncing wishlist with backend:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  // Get wishlist from backend
  private async getWishlistFromBackend(): Promise<WishlistState | null> {
    try {
      const headers = this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/api/user/wishlists`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch wishlist');
      }

      return this.transformBackendWishlistToState(result.data);
    } catch (error) {
      console.error('Error fetching wishlist from backend:', error);
      return null;
    }
  }

  // Save wishlist to backend
  private async saveWishlistToBackend(state: WishlistState): Promise<void> {
    try {
      // Get or create default wishlist
      const headers = this.getAuthHeaders();
      let wishlistId: string | null = null;

      // Try to get existing wishlists
      const wishlistsResponse = await fetch(`${this.baseURL}/api/user/wishlists`, {
        headers,
      });

      if (wishlistsResponse.ok) {
        const wishlistsResult = await wishlistsResponse.json();
        if (wishlistsResult.success && wishlistsResult.data.length > 0) {
          wishlistId = wishlistsResult.data[0].id;
        }
      }

      // Create default wishlist if none exists
      if (!wishlistId) {
        const createResponse = await fetch(`${this.baseURL}/api/user/wishlists`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: 'My Wishlist',
            description: 'My favorite items',
            isPublic: false
          }),
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create wishlist');
        }

        const createResult = await createResponse.json();
        if (createResult.success) {
          wishlistId = createResult.data.id;
        }
      }

      // Add items to wishlist
      if (wishlistId && state.items.length > 0) {
        for (const item of state.items) {
          await fetch(`${this.baseURL}/api/user/wishlists/${wishlistId}/items`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              productId: item.id,
              quantity: 1,
              priceAtAdd: parseFloat(item.price.fiat)
            }),
          });
        }
      }
    } catch (error) {
      console.error('Error saving wishlist to backend:', error);
      throw error;
    }
  }

  // Transform backend wishlist to state
  private transformBackendWishlistToState(data: any[]): WishlistState {
    if (!data || data.length === 0) {
      return this.getEmptyWishlistState();
    }

    // Get items from first wishlist (default wishlist)
    const wishlist = data[0];
    const items: WishlistItem[] = wishlist.items?.map((item: any) => ({
      id: item.productId,
      title: item.product?.name || 'Product',
      description: item.product?.description || '',
      image: item.product?.image || '',
      price: {
        crypto: item.product?.price?.crypto || '0',
        cryptoSymbol: 'ETH',
        fiat: item.product?.price?.fiat || '0.00',
        fiatSymbol: 'USD'
      },
      seller: {
        id: item.product?.sellerId || '',
        name: item.product?.sellerName || 'Seller',
        avatar: item.product?.sellerAvatar || ''
      },
      category: item.product?.category || '',
      isDigital: item.product?.isDigital || false,
      isNFT: item.product?.isNFT || false,
      inventory: item.product?.inventory || 0,
      addedAt: new Date(item.addedAt),
      wishlistItemId: item.id
    })) || [];

    return {
      items,
      lastUpdated: new Date(wishlist.updatedAt || Date.now())
    };
  }

  // Add item to wishlist
  async addItem(product: Omit<WishlistItem, 'addedAt'>): Promise<void> {
    const currentState = await this.getWishlistState();
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

    await this.saveWishlistState(newState);
    this.notifyListeners(newState);

    // If authenticated, also call backend API
    if (this.isAuthenticated) {
      try {
        await this.addItemToBackend(product.id);
      } catch (error) {
        console.warn('Failed to add item to backend wishlist:', error);
      }
    }
  }

  // Synchronous version for backward compatibility
  addItemSync(product: Omit<WishlistItem, 'addedAt'>): void {
    const currentState = this.getWishlistStateSync();
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

    this.saveWishlistStateSync(newState);
    this.notifyListeners(newState);
  }

  // Remove item from wishlist
  async removeItem(itemId: string): Promise<void> {
    const currentState = await this.getWishlistState();
    const itemIndex = currentState.items.findIndex(item => item.id === itemId);

    if (itemIndex < 0) {
      return;
    }

    const itemToRemove = currentState.items[itemIndex];
    const newItems = [...currentState.items];
    newItems.splice(itemIndex, 1);

    const newState: WishlistState = {
      items: newItems,
      lastUpdated: new Date()
    };

    await this.saveWishlistState(newState);
    this.notifyListeners(newState);

    // If authenticated, also call backend API
    if (this.isAuthenticated && itemToRemove.wishlistItemId) {
      try {
        await this.removeItemFromBackend(itemToRemove.wishlistItemId);
      } catch (error) {
        console.warn('Failed to remove item from backend wishlist:', error);
      }
    }
  }

  // Synchronous version for backward compatibility
  removeItemSync(itemId: string): void {
    const currentState = this.getWishlistStateSync();
    const itemIndex = currentState.items.findIndex(item => item.id === itemId);

    if (itemIndex < 0) {
      return;
    }

    const itemToRemove = currentState.items[itemIndex];
    const newItems = [...currentState.items];
    newItems.splice(itemIndex, 1);

    const newState: WishlistState = {
      items: newItems,
      lastUpdated: new Date()
    };

    this.saveWishlistStateSync(newState);
    this.notifyListeners(newState);
  }

  // Check if item is in wishlist
  isInWishlist(itemId: string): boolean {
    const currentState = this.getWishlistStateSync();
    return currentState.items.some(item => item.id === itemId);
  }

  // Clear wishlist
  async clearWishlist(): Promise<void> {
    const newState: WishlistState = {
      items: [],
      lastUpdated: new Date()
    };

    await this.saveWishlistState(newState);
    this.notifyListeners(newState);
  }

  // Synchronous version for backward compatibility
  clearWishlistSync(): void {
    const newState: WishlistState = {
      items: [],
      lastUpdated: new Date()
    };

    this.saveWishlistStateSync(newState);
    this.notifyListeners(newState);
  }

  // Add item to backend
  private async addItemToBackend(productId: string): Promise<void> {
    try {
      const headers = this.getAuthHeaders();

      // Get or create default wishlist
      let wishlistId: string | null = null;
      const wishlistsResponse = await fetch(`${this.baseURL}/api/user/wishlists`, {
        headers,
      });

      if (wishlistsResponse.ok) {
        const wishlistsResult = await wishlistsResponse.json();
        if (wishlistsResult.success && wishlistsResult.data.length > 0) {
          wishlistId = wishlistsResult.data[0].id;
        }
      }

      // Create default wishlist if none exists
      if (!wishlistId) {
        const createResponse = await fetch(`${this.baseURL}/api/user/wishlists`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: 'My Wishlist',
            description: 'My favorite items',
            isPublic: false
          }),
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create wishlist');
        }

        const createResult = await createResponse.json();
        if (createResult.success) {
          wishlistId = createResult.data.id;
        }
      }

      // Add item to wishlist
      if (wishlistId) {
        const response = await fetch(`${this.baseURL}/api/user/wishlists/${wishlistId}/items`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            productId,
            quantity: 1
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to add item to wishlist');
        }
      }
    } catch (error) {
      console.error('Error adding item to backend wishlist:', error);
      throw error;
    }
  }

  // Remove item from backend
  private async removeItemFromBackend(wishlistItemId: string): Promise<void> {
    try {
      const headers = this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/api/user/wishlist-items/${wishlistItemId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to remove item from wishlist');
      }
    } catch (error) {
      console.error('Error removing item from backend wishlist:', error);
      throw error;
    }
  }
}

export const wishlistService = WishlistService.getInstance();