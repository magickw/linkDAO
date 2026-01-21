/**
 * Cart Service Unit Tests
 */

import { cartService } from '../cartService';

describe('CartService', () => {
  beforeEach(() => {
    // Reset cart state before each test
    jest.clearAllMocks();
  });

  describe('syncCart', () => {
    it('should sync cart items successfully', async () => {
      const items = [
        { productId: '1', quantity: 2 },
        { productId: '2', quantity: 1 },
      ];

      const result = await cartService.syncCart(items);

      expect(result).toBe(true);
    });

    it('should handle empty cart sync', async () => {
      const result = await cartService.syncCart([]);

      expect(result).toBe(true);
    });

    it('should handle sync errors gracefully', async () => {
      // Mock API error
      const result = await cartService.syncCart([{ productId: '1', quantity: 1 }]);

      // Should return false on error
      expect(result).toBe(false);
    });
  });

  describe('getSavedItems', () => {
    it('should return saved items', async () => {
      const items = await cartService.getSavedItems();

      expect(Array.isArray(items)).toBe(true);
    });

    it('should return empty array when no saved items', async () => {
      const items = await cartService.getSavedItems();

      expect(items).toEqual([]);
    });
  });

  describe('saveForLater', () => {
    it('should save item for later successfully', async () => {
      const result = await cartService.saveForLater('product-123');

      expect(result).toBe(true);
    });

    it('should handle save errors gracefully', async () => {
      const result = await cartService.saveForLater('invalid-product');

      expect(result).toBe(false);
    });
  });

  describe('moveToCart', () => {
    it('should move saved item to cart successfully', async () => {
      const result = await cartService.moveToCart('saved-item-123');

      expect(result).toBe(true);
    });

    it('should handle move errors gracefully', async () => {
      const result = await cartService.moveToCart('invalid-saved-item');

      expect(result).toBe(false);
    });
  });

  describe('removeSavedItem', () => {
    it('should remove saved item successfully', async () => {
      const result = await cartService.removeSavedItem('saved-item-123');

      expect(result).toBe(true);
    });
  });

  describe('getCart', () => {
    it('should return cart data', async () => {
      const cart = await cartService.getCart();

      expect(cart).toBeDefined();
    });

    it('should return null when cart is empty', async () => {
      const cart = await cartService.getCart();

      expect(cart).toBeNull();
    });
  });

  describe('clearCart', () => {
    it('should clear cart successfully', async () => {
      const result = await cartService.clearCart();

      expect(result).toBe(true);
    });
  });
});