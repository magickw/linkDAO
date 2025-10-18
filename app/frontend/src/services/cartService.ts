/**
 * Cart Service - Manages shopping cart state and persistence
 */

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

  private constructor() {}

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

  // Notify all listeners of state changes
  private notifyListeners(state: CartState): void {
    this.listeners.forEach(listener => listener(state));
  }

  // Get current cart state from localStorage
  getCartState(): CartState {
    if (typeof window === 'undefined') {
      return this.getEmptyCartState();
    }

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

  // Save cart state to localStorage
  private saveCartState(state: CartState): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving cart state:', error);
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

    const totalCrypto = subtotalCrypto + shippingCrypto;
    const totalFiat = subtotalFiat + shippingFiat;

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
  addItem(product: Omit<CartItem, 'quantity' | 'addedAt'>, quantity: number = 1): void {
    const currentState = this.getCartState();
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

    this.saveCartState(newState);
    this.notifyListeners(newState);
  }

  // Remove item from cart
  removeItem(itemId: string): void {
    const currentState = this.getCartState();
    const newItems = currentState.items.filter(item => item.id !== itemId);

    const newState: CartState = {
      items: newItems,
      totals: this.calculateTotals(newItems),
      lastUpdated: new Date()
    };

    this.saveCartState(newState);
    this.notifyListeners(newState);
  }

  // Update item quantity
  updateQuantity(itemId: string, quantity: number): void {
    const currentState = this.getCartState();
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

    this.saveCartState(newState);
    this.notifyListeners(newState);
  }

  // Clear entire cart
  clearCart(): void {
    const newState = this.getEmptyCartState();
    this.saveCartState(newState);
    this.notifyListeners(newState);
  }

  // Get specific item from cart
  getItem(itemId: string): CartItem | undefined {
    const currentState = this.getCartState();
    return currentState.items.find(item => item.id === itemId);
  }

  // Check if item is in cart
  isInCart(itemId: string): boolean {
    const currentState = this.getCartState();
    return currentState.items.some(item => item.id === itemId);
  }

  // Get cart item count
  getItemCount(): number {
    const currentState = this.getCartState();
    return currentState.totals.itemCount;
  }
}

export const cartService = CartService.getInstance();