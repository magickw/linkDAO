/**
 * Cart Integration Test - Verify cart system works correctly
 */

import { cartService, type CartItem } from '../services/cartService';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Cart Integration', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  const mockProduct: Omit<CartItem, 'quantity' | 'addedAt'> = {
    id: 'test-product-1',
    title: 'Test Product',
    description: 'A test product for cart functionality',
    image: 'https://example.com/image.jpg',
    price: {
      crypto: '0.1',
      cryptoSymbol: 'ETH',
      fiat: '240.00',
      fiatSymbol: 'USD'
    },
    seller: {
      id: 'seller-1',
      name: 'Test Seller',
      avatar: 'https://example.com/avatar.jpg',
      verified: true,
      daoApproved: true,
      escrowSupported: true
    },
    category: 'digital',
    isDigital: true,
    isNFT: false,
    inventory: 10,
    shipping: {
      cost: '0',
      freeShipping: true,
      estimatedDays: 'instant',
      regions: ['US', 'CA', 'EU']
    },
    trust: {
      escrowProtected: true,
      onChainCertified: true,
      safetyScore: 95
    }
  };

  test('should start with empty cart', () => {
    const state = cartService.getCartState();
    expect(state.items).toHaveLength(0);
    expect(state.totals.itemCount).toBe(0);
  });

  test('should add item to cart', () => {
    cartService.addItem(mockProduct, 2);
    
    const state = cartService.getCartState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe('test-product-1');
    expect(state.items[0].quantity).toBe(2);
    expect(state.totals.itemCount).toBe(2);
  });

  test('should update quantity when adding existing item', () => {
    cartService.addItem(mockProduct, 1);
    cartService.addItem(mockProduct, 2);
    
    const state = cartService.getCartState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(3);
    expect(state.totals.itemCount).toBe(3);
  });

  test('should remove item from cart', () => {
    cartService.addItem(mockProduct, 1);
    cartService.removeItem('test-product-1');
    
    const state = cartService.getCartState();
    expect(state.items).toHaveLength(0);
    expect(state.totals.itemCount).toBe(0);
  });

  test('should update item quantity', () => {
    cartService.addItem(mockProduct, 1);
    cartService.updateQuantity('test-product-1', 5);
    
    const state = cartService.getCartState();
    expect(state.items[0].quantity).toBe(5);
    expect(state.totals.itemCount).toBe(5);
  });

  test('should calculate totals correctly', () => {
    cartService.addItem(mockProduct, 2);
    
    const state = cartService.getCartState();
    expect(state.totals.subtotal.crypto).toBe('0.200000');
    expect(state.totals.subtotal.fiat).toBe('480.00');
    expect(state.totals.total.crypto).toBe('0.200000');
    expect(state.totals.total.fiat).toBe('480.00');
  });

  test('should persist cart state', () => {
    cartService.addItem(mockProduct, 1);
    
    // Create new service instance to simulate page reload
    const newCartService = cartService;
    const state = newCartService.getCartState();
    
    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe('test-product-1');
  });

  test('should clear cart', () => {
    cartService.addItem(mockProduct, 1);
    cartService.clearCart();
    
    const state = cartService.getCartState();
    expect(state.items).toHaveLength(0);
    expect(state.totals.itemCount).toBe(0);
  });

  test('should check if item is in cart', () => {
    expect(cartService.isInCart('test-product-1')).toBe(false);
    
    cartService.addItem(mockProduct, 1);
    expect(cartService.isInCart('test-product-1')).toBe(true);
  });

  test('should get specific item from cart', () => {
    cartService.addItem(mockProduct, 1);
    
    const item = cartService.getItem('test-product-1');
    expect(item).toBeDefined();
    expect(item?.id).toBe('test-product-1');
    expect(item?.quantity).toBe(1);
  });
});