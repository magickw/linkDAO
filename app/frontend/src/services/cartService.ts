/**
 * Cart Service - Manages shopping cart state and persistence
 */

import { csrfService } from './csrfService';
import { authService } from './authService';

export interface CartItem {
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
    verified: boolean;
    daoApproved: boolean;
    escrowSupported: boolean;
  };
  category: string;
  isDigital: boolean;
  isNFT: boolean;
  inventory: number;
  quantity: number;
  shipping: {
    cost: string;
    freeShipping: boolean;
    estimatedDays: string | number;
    regions: string[];
  };
  trust: {
    escrowProtected: boolean;
    onChainCertified: boolean;
    safetyScore: number;
  };
  addedAt: Date;
}

export interface CartState {
  items: CartItem[];
  totals: {
    itemCount: number;
    subtotal: {
      crypto: string;
      cryptoSymbol: string;
      fiat: string;
      fiatSymbol: string;
    };
    shipping: {
      crypto: string;
      cryptoSymbol: string;
      fiat: string;
      fiatSymbol: string;
    };
    total: {
      crypto: string;
      cryptoSymbol: string;
      fiat: string;
      fiatSymbol: string;
    };
  };
  lastUpdated: Date;
}

export interface CartActions {
  addItem: (product: Omit<CartItem, 'quantity' | 'addedAt'>, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getItem: (itemId: string) => CartItem | undefined;
  isInCart: (itemId: string) => boolean;
}

class CartService {
  private static instance: CartService;
  private storageKey = 'linkdao_marketplace_cart';
  private listeners: Set<(state: CartState) => void> = new Set();
  private baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  private isAuthenticated = false;
  private authToken: string | null = null;

  private constructor() {
    // Check for authentication on initialization
    this.checkAuthStatus();
    
    // Subscribe to auth status changes
    this.setupAuthListener();
  }

  static getInstance(): CartService {
    if (!CartService.instance) {
      CartService.instance = new CartService();
    }
    return CartService.instance;
  }

  // Subscribe to cart state changes
  subscribe(listener: (state: CartState) => void): () => void {
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
      // Sync local cart with backend when user authenticates
      this.syncCartWithBackend();
    }
  }

  // Check authentication status from localStorage or other sources
  private checkAuthStatus(): void {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || sessionStorage.getItem('token') || sessionStorage.getItem('authToken');
      this.isAuthenticated = !!token;
      this.authToken = token;
    }
  }

  // Get authentication headers
  private async getAuthHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    // Add CSRF headers for authenticated requests
    if (this.isAuthenticated) {
      const csrfHeaders = await csrfService.getCSRFHeaders();
      Object.assign(headers, csrfHeaders);
    }
    
    return headers;
  }

  // Notify all listeners of state changes
  private notifyListeners(state: CartState): void {
    this.listeners.forEach(listener => listener(state));
  }

  // Get current cart state from localStorage or backend
  async getCartState(): Promise<CartState> {
    if (typeof window === 'undefined') {
      return this.getEmptyCartState();
    }

    // If authenticated, try to get cart from backend first
    if (this.isAuthenticated) {
      try {
        const backendCart = await this.getCartFromBackend();
        if (backendCart) {
          return backendCart;
        }
      } catch (error) {
        console.warn('Failed to fetch cart from backend, falling back to local storage:', error);
      }
    }

    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return this.getEmptyCartState();
      }

      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      const state: CartState = {
        ...parsed,
        items: parsed.items.map((item: any) => ({
          ...item,
          addedAt: new Date(item.addedAt)
        })),
        lastUpdated: new Date(parsed.lastUpdated)
      };

      return state;
    } catch (error) {
      console.error('Error loading cart state:', error);
      return this.getEmptyCartState();
    }
  }

  // Synchronous version for backward compatibility
  getCartStateSync(): CartState {
    if (typeof window === 'undefined') {
      return this.getEmptyCartState();
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return this.getEmptyCartState();
      }

      const parsed = JSON.parse(stored);
      const state: CartState = {
        ...parsed,
        items: parsed.items.map((item: any) => ({
          ...item,
          addedAt: new Date(item.addedAt)
        })),
        lastUpdated: new Date(parsed.lastUpdated)
      };

      return state;
    } catch (error) {
      console.error('Error loading cart state:', error);
      return this.getEmptyCartState();
    }
  }

  // Save cart state to localStorage and backend
  private async saveCartState(state: CartState): Promise<void> {
    if (typeof window === 'undefined') return;

    // Always save to localStorage first
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving cart state to localStorage:', error);
    }

    // If authenticated, also save to backend
    if (this.isAuthenticated) {
      try {
        await this.saveCartToBackend(state);
      } catch (error) {
        console.warn('Failed to save cart to backend:', error);
      }
    }
  }

  // Synchronous version for backward compatibility
  private saveCartStateSync(state: CartState): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving cart state:', error);
    }

    // Async save to backend without blocking
    if (this.isAuthenticated) {
      this.saveCartToBackend(state).catch(error => {
        console.warn('Failed to save cart to backend:', error);
      });
    }
  }

  // Get empty cart state
  private getEmptyCartState(): CartState {
    return {
      items: [],
      totals: {
        itemCount: 0,
        subtotal: {
          crypto: '0',
          cryptoSymbol: 'ETH',
          fiat: '0.00',
          fiatSymbol: 'USD'
        },
        shipping: {
          crypto: '0',
          cryptoSymbol: 'ETH',
          fiat: '0.00',
          fiatSymbol: 'USD'
        },
        total: {
          crypto: '0',
          cryptoSymbol: 'ETH',
          fiat: '0.00',
          fiatSymbol: 'USD'
        }
      },
      lastUpdated: new Date()
    };
  }

  // Calculate cart totals
  private calculateTotals(items: CartItem[]): CartState['totals'] {
    let subtotalCrypto = 0;
    let subtotalFiat = 0;
    let shippingCrypto = 0;
    let shippingFiat = 0;
    let platformFeeCrypto = 0;
    let platformFeeFiat = 0;
    let itemCount = 0;

    items.forEach(item => {
      const itemCrypto = parseFloat(item.price.crypto) * item.quantity;
      const itemFiat = parseFloat(item.price.fiat) * item.quantity;
      
      subtotalCrypto += itemCrypto;
      subtotalFiat += itemFiat;
      itemCount += item.quantity;

      // Add shipping costs for physical items
      if (!item.isDigital && !item.shipping.freeShipping) {
        shippingCrypto += parseFloat(item.shipping.cost);
        shippingFiat += parseFloat(item.shipping.cost) * 2400; // Rough ETH to USD conversion
      }
    });

    // Calculate platform fee (12.5% of subtotal)
    platformFeeCrypto = subtotalCrypto * 0.125;
    platformFeeFiat = subtotalFiat * 0.125;

    const totalCrypto = subtotalCrypto + shippingCrypto + platformFeeCrypto;
    const totalFiat = subtotalFiat + shippingFiat + platformFeeFiat;

    return {
      itemCount,
      subtotal: {
        crypto: subtotalCrypto.toFixed(6),
        cryptoSymbol: 'ETH',
        fiat: subtotalFiat.toFixed(2),
        fiatSymbol: 'USD'
      },
      shipping: {
        crypto: shippingCrypto.toFixed(6),
        cryptoSymbol: 'ETH',
        fiat: shippingFiat.toFixed(2),
        fiatSymbol: 'USD'
      },
      total: {
        crypto: totalCrypto.toFixed(6),
        cryptoSymbol: 'ETH',
        fiat: totalFiat.toFixed(2),
        fiatSymbol: 'USD'
      }
    };
  }

  // Add item to cart
  async addItem(product: Omit<CartItem, 'quantity' | 'addedAt'>, quantity: number = 1): Promise<void> {
    const currentState = await this.getCartState();
    const existingItemIndex = currentState.items.findIndex(item => item.id === product.id);

    let newItems: CartItem[];

    if (existingItemIndex >= 0) {
      // Update quantity of existing item
      newItems = [...currentState.items];
      const existingItem = newItems[existingItemIndex];
      const newQuantity = Math.min(existingItem.quantity + quantity, product.inventory);
      newItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity
      };
    } else {
      // Add new item
      const newItem: CartItem = {
        ...product,
        quantity: Math.min(quantity, product.inventory),
        addedAt: new Date()
      };
      newItems = [...currentState.items, newItem];
    }

    const newState: CartState = {
      items: newItems,
      totals: this.calculateTotals(newItems),
      lastUpdated: new Date()
    };

    await this.saveCartState(newState);
    this.notifyListeners(newState);

    // If authenticated, also call backend API
    if (this.isAuthenticated) {
      try {
        await this.addItemToBackend(product.id, quantity);
      } catch (error) {
        console.warn('Failed to add item to backend cart:', error);
      }
    }
  }

  // Synchronous version for backward compatibility
  addItemSync(product: Omit<CartItem, 'quantity' | 'addedAt'>, quantity: number = 1): void {
    const currentState = this.getCartStateSync();
    const existingItemIndex = currentState.items.findIndex(item => item.id === product.id);

    let newItems: CartItem[];

    if (existingItemIndex >= 0) {
      newItems = [...currentState.items];
      const existingItem = newItems[existingItemIndex];
      const newQuantity = Math.min(existingItem.quantity + quantity, product.inventory);
      newItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity
      };
    } else {
      const newItem: CartItem = {
        ...product,
        quantity: Math.min(quantity, product.inventory),
        addedAt: new Date()
      };
      newItems = [...currentState.items, newItem];
    }

    const newState: CartState = {
      items: newItems,
      totals: this.calculateTotals(newItems),
      lastUpdated: new Date()
    };

    this.saveCartStateSync(newState);
    this.notifyListeners(newState);
  }

  // Remove item from cart
  async removeItem(itemId: string): Promise<void> {
    const currentState = await this.getCartState();
    const newItems = currentState.items.filter(item => item.id !== itemId);

    const newState: CartState = {
      items: newItems,
      totals: this.calculateTotals(newItems),
      lastUpdated: new Date()
    };

    await this.saveCartState(newState);
    this.notifyListeners(newState);

    // If authenticated, also call backend API
    if (this.isAuthenticated) {
      try {
        await this.removeItemFromBackend(itemId);
      } catch (error) {
        console.warn('Failed to remove item from backend cart:', error);
      }
    }
  }

  // Synchronous version for backward compatibility
  removeItemSync(itemId: string): void {
    const currentState = this.getCartStateSync();
    const newItems = currentState.items.filter(item => item.id !== itemId);

    const newState: CartState = {
      items: newItems,
      totals: this.calculateTotals(newItems),
      lastUpdated: new Date()
    };

    this.saveCartStateSync(newState);
    this.notifyListeners(newState);
  }

  // Update item quantity
  async updateQuantity(itemId: string, quantity: number): Promise<void> {
    const currentState = await this.getCartState();
    const itemIndex = currentState.items.findIndex(item => item.id === itemId);

    if (itemIndex === -1) return;

    let newItems: CartItem[];

    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      newItems = currentState.items.filter(item => item.id !== itemId);
    } else {
      // Update quantity
      newItems = [...currentState.items];
      const item = newItems[itemIndex];
      newItems[itemIndex] = {
        ...item,
        quantity: Math.min(quantity, item.inventory)
      };
    }

    const newState: CartState = {
      items: newItems,
      totals: this.calculateTotals(newItems),
      lastUpdated: new Date()
    };

    await this.saveCartState(newState);
    this.notifyListeners(newState);

    // If authenticated, also call backend API
    if (this.isAuthenticated) {
      try {
        if (quantity <= 0) {
          await this.removeItemFromBackend(itemId);
        } else {
          await this.updateItemQuantityInBackend(itemId, quantity);
        }
      } catch (error) {
        console.warn('Failed to update item quantity in backend cart:', error);
      }
    }
  }

  // Synchronous version for backward compatibility
  updateQuantitySync(itemId: string, quantity: number): void {
    const currentState = this.getCartStateSync();
    const itemIndex = currentState.items.findIndex(item => item.id === itemId);

    if (itemIndex === -1) return;

    let newItems: CartItem[];

    if (quantity <= 0) {
      newItems = currentState.items.filter(item => item.id !== itemId);
    } else {
      newItems = [...currentState.items];
      const item = newItems[itemIndex];
      newItems[itemIndex] = {
        ...item,
        quantity: Math.min(quantity, item.inventory)
      };
    }

    const newState: CartState = {
      items: newItems,
      totals: this.calculateTotals(newItems),
      lastUpdated: new Date()
    };

    this.saveCartStateSync(newState);
    this.notifyListeners(newState);
  }

  // Clear entire cart
  async clearCart(): Promise<void> {
    const newState = this.getEmptyCartState();
    await this.saveCartState(newState);
    this.notifyListeners(newState);

    // If authenticated, also clear backend cart
    if (this.isAuthenticated) {
      try {
        await this.clearBackendCart();
      } catch (error) {
        console.warn('Failed to clear backend cart:', error);
      }
    }
  }

  // Synchronous version for backward compatibility
  clearCartSync(): void {
    const newState = this.getEmptyCartState();
    this.saveCartStateSync(newState);
    this.notifyListeners(newState);
  }

  // Get specific item from cart
  getItem(itemId: string): CartItem | undefined {
    const currentState = this.getCartStateSync();
    return currentState.items.find(item => item.id === itemId);
  }

  // Check if item is in cart
  isInCart(itemId: string): boolean {
    const currentState = this.getCartStateSync();
    return currentState.items.some(item => item.id === itemId);
  }

  // Get cart item count
  getItemCount(): number {
    const currentState = this.getCartStateSync();
    return currentState.totals.itemCount;
  }

  // Backend API methods
  private async getCartFromBackend(): Promise<CartState | null> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/cart`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch cart');
      }

      return this.transformBackendCartToState(result.data);
    } catch (error) {
      console.error('Error fetching cart from backend:', error);
      return null;
    }
  }

  private async saveCartToBackend(state: CartState): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/cart/sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          items: state.items.map(item => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to sync cart');
      }
    } catch (error) {
      console.error('Error saving cart to backend:', error);
      throw error;
    }
  }

  private async addItemToBackend(productId: string, quantity: number): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/cart/items`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          productId,
          quantity,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to add item to cart');
      }
    } catch (error) {
      console.error('Error adding item to backend cart:', error);
      throw error;
    }
  }

  private async removeItemFromBackend(itemId: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/cart/items/${itemId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to remove item from cart');
      }
    } catch (error) {
      console.error('Error removing item from backend cart:', error);
      throw error;
    }
  }

  private async updateItemQuantityInBackend(itemId: string, quantity: number): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/cart/items/${itemId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          quantity,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to update item quantity');
      }
    } catch (error) {
      console.error('Error updating item quantity in backend cart:', error);
      throw error;
    }
  }

  private async clearBackendCart(): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/cart`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to clear cart');
      }
    } catch (error) {
      console.error('Error clearing backend cart:', error);
      throw error;
    }
  }

  private async syncCartWithBackend(): Promise<void> {
    try {
      const localState = this.getCartStateSync();
      const backendState = await this.getCartFromBackend();

      if (backendState && backendState.items.length > 0) {
        // Backend has items, merge with local cart
        const mergedItems = this.mergeCartItems(localState.items, backendState.items);
        const newState: CartState = {
          items: mergedItems,
          totals: this.calculateTotals(mergedItems),
          lastUpdated: new Date()
        };

        this.saveCartStateSync(newState);
        this.notifyListeners(newState);
      } else if (localState.items.length > 0) {
        // Local cart has items, sync to backend
        await this.saveCartToBackend(localState);
      }
    } catch (error) {
      console.warn('Failed to sync cart with backend:', error);
    }
  }

  private mergeCartItems(localItems: CartItem[], backendItems: CartItem[]): CartItem[] {
    const merged = [...localItems];
    
    backendItems.forEach(backendItem => {
      const existingIndex = merged.findIndex(item => item.id === backendItem.id);
      if (existingIndex >= 0) {
        // Use the higher quantity
        merged[existingIndex].quantity = Math.max(merged[existingIndex].quantity, backendItem.quantity);
      } else {
        merged.push(backendItem);
      }
    });

    return merged;
  }

  private transformBackendCartToState(backendCart: any): CartState {
    const items: CartItem[] = backendCart.items?.map((item: any) => ({
      id: item.productId || item.id,
      title: item.product?.title || item.title || 'Unknown Product',
      description: item.product?.description || item.description || '',
      image: item.product?.images?.[0] || item.image || '',
      price: {
        crypto: item.product?.cryptoPrice || item.cryptoPrice || '0',
        cryptoSymbol: item.product?.cryptoCurrency || item.cryptoCurrency || 'ETH',
        fiat: item.product?.fiatPrice || item.fiatPrice || '0',
        fiatSymbol: item.product?.fiatCurrency || item.fiatCurrency || 'USD',
      },
      seller: {
        id: item.product?.seller?.id || item.sellerId || '',
        name: item.product?.seller?.displayName || item.sellerName || 'Unknown Seller',
        avatar: item.product?.seller?.profileImageUrl || item.sellerAvatar || '',
        verified: item.product?.seller?.verified || false,
        daoApproved: item.product?.seller?.daoApproved || false,
        escrowSupported: true,
      },
      category: item.product?.category || item.category || 'general',
      isDigital: item.product?.isDigital || item.isDigital || false,
      isNFT: item.product?.isNFT || item.isNFT || false,
      inventory: item.product?.inventory || item.inventory || 0,
      quantity: item.quantity || 1,
      shipping: {
        cost: item.product?.shipping?.cost || '0',
        freeShipping: item.product?.shipping?.free || false,
        estimatedDays: item.product?.shipping?.estimatedDays || '3-5',
        regions: item.product?.shipping?.regions || [],
      },
      trust: {
        escrowProtected: item.product?.trust?.escrowProtected || false,
        onChainCertified: item.product?.trust?.onChainCertified || false,
        safetyScore: item.product?.trust?.safetyScore || 0,
      },
      addedAt: new Date(item.addedAt || Date.now()),
    })) || [];

    return {
      items,
      totals: this.calculateTotals(items),
      lastUpdated: new Date(),
    };
  }

  // Subscribe to authentication status changes
  private setupAuthListener(): void {
    // If we're in a browser environment, set up a storage listener
    if (typeof window !== 'undefined') {
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'auth_token') {
          this.checkAuthStatus();
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      // Also check periodically in case of same-tab changes
      setInterval(() => {
        this.checkAuthStatus();
      }, 5000);
    }
  }
}

export const cartService = CartService.getInstance();