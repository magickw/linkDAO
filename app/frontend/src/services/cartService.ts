/**
 * Cart Service - Manages shopping cart state and persistence
 */

import { csrfService } from './csrfService';
import { enhancedAuthService } from './enhancedAuthService';

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
  cartItemId?: string; // For backend reference
  appliedPromoCodeId?: string;
  appliedDiscount?: string;
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
  applyPromoCode: (itemId: string, code: string) => Promise<void>;
  removePromoCode: (itemId: string) => Promise<void>;
}

class CartService {
  private static instance: CartService;
  private storageKey = 'linkdao_marketplace_cart';
  private listeners: Set<(state: CartState) => void> = new Set();
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
      // Defensive parsing - handle cases where price might be malformed
      const cryptoPrice = item.price?.crypto;
      const fiatPrice = item.price?.fiat;

      // Parse crypto price
      let itemCrypto = 0;
      if (typeof cryptoPrice === 'number') {
        itemCrypto = cryptoPrice;
      } else if (typeof cryptoPrice === 'string') {
        itemCrypto = parseFloat(cryptoPrice) || 0;
      }

      // Parse fiat price
      let itemFiat = 0;
      if (typeof fiatPrice === 'number') {
        itemFiat = fiatPrice;
      } else if (typeof fiatPrice === 'string') {
        itemFiat = parseFloat(fiatPrice) || 0;
      }

      // Parse quantity (could be string from localStorage)
      const qty = typeof item.quantity === 'string' ? parseInt(item.quantity, 10) : (item.quantity || 1);

      subtotalCrypto += itemCrypto * qty;
      subtotalFiat += itemFiat * qty;
      itemCount += qty;

      // Add shipping costs for physical items
      if (!item.isDigital && item.shipping && !item.shipping.freeShipping) {
        const shippingCost = parseFloat(String(item.shipping.cost)) || 0;
        shippingCrypto += shippingCost;
        shippingFiat += shippingCost * 2400; // Rough ETH to USD conversion
      }
    });

    // Apply item-level discounts
    items.forEach(item => {
      if (item.appliedDiscount) {
        const discount = parseFloat(item.appliedDiscount);
        subtotalFiat = Math.max(0, subtotalFiat - discount);
        // Approx conversion for crypto discount (using fixed rate for now)
        subtotalCrypto = Math.max(0, subtotalCrypto - (discount / 2400));
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
      // Update quantity of existing item and refresh product details
      newItems = [...currentState.items];
      const existingItem = newItems[existingItemIndex];
      const existingQty = typeof existingItem.quantity === 'string' ? parseInt(existingItem.quantity, 10) : existingItem.quantity;
      const addQty = typeof quantity === 'string' ? parseInt(quantity as any, 10) : quantity;

      const newQuantity = Math.min(existingQty + addQty, product.inventory);
      newItems[existingItemIndex] = {
        ...existingItem,
        ...product, // Refresh product details (price, etc.)
        quantity: newQuantity
      };
    } else {
      // Add new item
      const newItem: CartItem = {
        ...product,
        quantity: Math.min(typeof quantity === 'string' ? parseInt(quantity as any, 10) : quantity, product.inventory),
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
      const existingQty = typeof existingItem.quantity === 'string' ? parseInt(existingItem.quantity, 10) : existingItem.quantity;
      const addQty = typeof quantity === 'string' ? parseInt(quantity as any, 10) : quantity;

      const newQuantity = Math.min(existingQty + addQty, product.inventory);
      newItems[existingItemIndex] = {
        ...existingItem,
        ...product, // Refresh product details
        quantity: newQuantity
      };
    } else {
      const newItem: CartItem = {
        ...product,
        quantity: Math.min(typeof quantity === 'string' ? parseInt(quantity as any, 10) : quantity, product.inventory),
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
        // Find the item to get its cartItemId for backend operations
        const item = currentState.items.find(item => item.id === itemId);
        if (item?.cartItemId) {
          await this.removeItemFromBackend(item.cartItemId);
        } else {
          // If no cartItemId, this might be a local-only item, skip backend update
          console.warn('No cartItemId found for item, skipping backend removal');
        }
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
      // Allow user to adjust quantity even if inventory is lower than current quantity (e.g. if inventory changed externally)
      // But don't allow increasing beyond inventory unless current quantity is already higher (legacy data)
      const maxAllowed = Math.max(item.inventory, item.quantity);
      newItems[itemIndex] = {
        ...item,
        quantity: Math.min(quantity, maxAllowed)
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
        // Find the item to get its cartItemId for backend operations
        const item = currentState.items.find(item => item.id === itemId);
        if (quantity <= 0) {
          await this.removeItemFromBackend(itemId);
        } else if (item?.cartItemId) {
          await this.updateItemQuantityInBackend(item.cartItemId, quantity);
        } else {
          // If no cartItemId, this might be a local-only item, skip backend update
          console.warn('No cartItemId found for item, skipping backend update');
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
      const maxAllowed = Math.max(item.inventory, item.quantity);
      newItems[itemIndex] = {
        ...item,
        quantity: Math.min(quantity, maxAllowed)
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
      const response = await fetch(`${this.baseURL}/api/cart`, {
        headers,
      });

      // Gracefully handle 404 (cart doesn't exist yet for this user)
      if (response.status === 404) {
        console.log('Cart not found on backend (expected for new users), using local cart');
        return null;
      }

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
      const response = await fetch(`${this.baseURL}/api/cart/sync`, {
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
      const response = await fetch(`${this.baseURL}/api/cart/items`, {
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
      const response = await fetch(`${this.baseURL}/api/cart/items/${itemId}`, {
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
      const response = await fetch(`${this.baseURL}/api/cart/items/${itemId}`, {
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

  // Apply promo code to item
  async applyPromoCode(itemId: string, code: string): Promise<void> {
    const currentState = await this.getCartState();
    const item = currentState.items.find(i => i.id === itemId);

    if (!item) {
      throw new Error('Item not found in cart');
    }

    // Check if user is authenticated
    if (!this.isAuthenticated) {
      throw new Error('Please log in to apply promo codes');
    }

    // Check if item has cartItemId (backend sync required)
    if (!item.cartItemId) {
      // Try to sync the cart with the backend first
      console.log('Cart item not synced, syncing with backend...');
      await this.syncCartWithBackend();

      // Get the updated cart state after sync
      const syncedState = await this.getCartState();
      const syncedItem = syncedState.items.find(i => i.id === itemId);

      if (!syncedItem || !syncedItem.cartItemId) {
        throw new Error('Failed to sync cart item. Please refresh the page and try again.');
      }

      // Use the synced item
      item.cartItemId = syncedItem.cartItemId;
    }

    // Optimistic update
    // Note: We can't calculate the exact discount locally easily without duplicating logic
    // So we'll rely on the backend response to update the state correctly via getCartFromBackend

    try {
      await this.applyPromoCodeToBackend(item.cartItemId, code);
      // Refresh cart from backend to get the applied discount
      const updatedCart = await this.getCartFromBackend();
      if (updatedCart) {
        await this.saveCartState(updatedCart);
        this.notifyListeners(updatedCart);
      }
    } catch (error) {
      console.error('Failed to apply promo code:', error);
      throw error;
    }
  }

  // Remove promo code from item
  async removePromoCode(itemId: string): Promise<void> {
    const currentState = await this.getCartState();
    const item = currentState.items.find(i => i.id === itemId);

    if (!item) {
      throw new Error('Item not found in cart');
    }

    // Check if user is authenticated
    if (!this.isAuthenticated) {
      throw new Error('Please log in to remove promo codes');
    }

    // Check if item has cartItemId (backend sync required)
    if (!item.cartItemId) {
      // Try to sync the cart with the backend first
      console.log('Cart item not synced, syncing with backend...');
      await this.syncCartWithBackend();

      // Get the updated cart state after sync
      const syncedState = await this.getCartState();
      const syncedItem = syncedState.items.find(i => i.id === itemId);

      if (!syncedItem || !syncedItem.cartItemId) {
        throw new Error('Failed to sync cart item. Please refresh the page and try again.');
      }

      // Use the synced item
      item.cartItemId = syncedItem.cartItemId;
    }

    try {
      await this.removePromoCodeFromBackend(item.cartItemId);
      // Refresh cart
      const updatedCart = await this.getCartFromBackend();
      if (updatedCart) {
        await this.saveCartState(updatedCart);
        this.notifyListeners(updatedCart);
      }
    } catch (error) {
      console.error('Failed to remove promo code:', error);
      throw error;
    }
  }

  private async applyPromoCodeToBackend(cartItemId: string, code: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/api/cart/items/${cartItemId}/promo`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error applying promo code to backend:', error);
      throw error;
    }
  }

  private async removePromoCodeFromBackend(cartItemId: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/api/cart/items/${cartItemId}/promo`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error removing promo code from backend:', error);
      throw error;
    }
  }

  private async clearBackendCart(): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/api/cart`, {
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
    // Prevent duplicate syncs with cooldown
    const now = Date.now();
    if (this.isSyncing || (now - this.lastSyncTime) < this.syncCooldown) {
      return;
    }

    this.isSyncing = true;
    this.lastSyncTime = now;

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
    } finally {
      this.isSyncing = false;
    }
  }

  private mergeCartItems(localItems: CartItem[], backendItems: CartItem[]): CartItem[] {
    const merged = [...localItems];
    const processedIds = new Set<string>();

    // First, add all local items and mark their IDs
    merged.forEach(item => processedIds.add(item.id));

    // Then add backend items that don't exist locally
    backendItems.forEach(backendItem => {
      const existingIndex = merged.findIndex(item => item.id === backendItem.id);
      if (existingIndex >= 0) {
        // Item exists in both - use the most recent one based on addedAt timestamp
        const localItem = merged[existingIndex];
        const localTime = new Date(localItem.addedAt).getTime();
        const backendTime = new Date(backendItem.addedAt).getTime();

        if (backendTime > localTime) {
          // Backend item is more recent, use its data but keep local quantity if higher
          merged[existingIndex] = {
            ...backendItem,
            quantity: Math.max(localItem.quantity, backendItem.quantity)
          };
        } else {
          // Local item is more recent, keep it but update with backend price if different
          merged[existingIndex] = {
            ...localItem,
            price: backendItem.price // Always use latest price from backend
          };
        }
        processedIds.add(backendItem.id);
      } else {
        // Item only exists in backend, add it
        merged.push(backendItem);
        processedIds.add(backendItem.id);
      }
    });

    return merged;
  }

  private transformBackendCartToState(backendCart: any): CartState {
    const ethPrice = 2400; // Rough ETH price for conversion

    const items: CartItem[] = backendCart.items?.map((item: any) => {
      // Get the product data - could be nested under 'product' or at item level
      const product = item.product || item;

      // Parse price - handle multiple possible formats
      // Backend might send: priceAmount, price (as number/string/object), fiatPrice, etc.
      let priceAmount = 0;
      let currency = 'USD';

      // Try different price field names
      if (product.priceAmount !== undefined) {
        priceAmount = parseFloat(String(product.priceAmount)) || 0;
        currency = product.priceCurrency || 'USD';
      } else if (product.price !== undefined) {
        if (typeof product.price === 'object' && product.price.amount !== undefined) {
          priceAmount = parseFloat(String(product.price.amount)) || 0;
          currency = product.price.currency || 'USD';
        } else {
          priceAmount = parseFloat(String(product.price)) || 0;
          currency = product.currency || product.priceCurrency || 'USD';
        }
      } else if (product.fiatPrice !== undefined) {
        priceAmount = parseFloat(String(product.fiatPrice)) || 0;
        currency = product.fiatCurrency || 'USD';
      } else if (item.priceAmount !== undefined) {
        priceAmount = parseFloat(String(item.priceAmount)) || 0;
        currency = item.priceCurrency || 'USD';
      }

      // Calculate crypto/fiat values based on currency
      let cryptoValue: string;
      let fiatValue: string;

      if (currency === 'ETH') {
        cryptoValue = priceAmount.toString();
        fiatValue = (priceAmount * ethPrice).toFixed(2);
      } else {
        // USD or other fiat currency
        cryptoValue = (priceAmount / ethPrice).toFixed(6);
        fiatValue = priceAmount.toFixed(2);
      }

      return {
        id: item.productId || product.id || item.id,
        cartItemId: item.id, // Store the actual cart item ID for backend operations
        title: product.title || item.title || 'Unknown Product',
        description: product.description || item.description || '',
        image: (Array.isArray(product.images) ? product.images[0] : product.image) || item.image || '',
        price: {
          crypto: cryptoValue,
          cryptoSymbol: 'ETH',
          fiat: fiatValue,
          fiatSymbol: currency === 'ETH' ? 'USD' : currency,
        },
        seller: {
          id: product.seller?.id || product.sellerId || item.sellerId || '',
          name: product.seller?.displayName || product.seller?.storeName || item.sellerName || 'Unknown Seller',
          avatar: product.seller?.profileImageUrl || product.seller?.avatar || item.sellerAvatar || '',
          verified: product.seller?.verified || false,
          daoApproved: product.seller?.daoApproved || false,
          escrowSupported: true,
        },
        category: product.category?.name || product.category || item.category || 'general',
        isDigital: product.isDigital || item.isDigital || false,
        isNFT: product.isNFT || item.isNFT || false,
        inventory: parseInt(String(product.inventory || product.quantity || item.inventory || 0), 10),
        quantity: parseInt(String(item.quantity || 1), 10),
        shipping: {
          cost: product.shipping?.cost || '0',
          freeShipping: product.shipping?.free || product.shipping?.freeShipping || false,
          estimatedDays: product.shipping?.estimatedDays || '3-5',
          regions: product.shipping?.regions || [],
        },
        trust: {
          escrowProtected: product.trust?.escrowProtected || product.metadata?.escrowEnabled || false,
          onChainCertified: product.trust?.onChainCertified || false,
          safetyScore: product.trust?.safetyScore || 0,
        },
        addedAt: new Date(item.addedAt || item.createdAt || Date.now()),
      };
    }) || [];

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

      // Check less frequently and only if auth status might have changed
      let lastKnownToken = this.authToken;
      setInterval(() => {
        const currentToken = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || sessionStorage.getItem('token') || sessionStorage.getItem('authToken');

        // Only check auth status if token actually changed
        if (currentToken !== lastKnownToken) {
          lastKnownToken = currentToken;
          this.checkAuthStatus();
        }
      }, 10000); // Increased to 10 seconds and only check if token changed
    }
  }
}

export const cartService = CartService.getInstance();