/// <reference path="../types/express.d.ts" />
import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { cartService, AddToCartRequest, UpdateCartItemRequest } from '../services/cartService';
import { successResponse, errorResponse, validationErrorResponse } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class CartController {
  /**
   * Get user's cart
   * GET /api/cart
   */
  async getCart(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const cart = await cartService.getOrCreateCart(req.user);
      successResponse(res, cart);
    } catch (error) {
      safeLogger.error('Error getting cart:', error);
      errorResponse(res, 'CART_ERROR', 'Failed to get cart', 500);
    }
  }

  /**
   * Add item to cart
   * POST /api/cart/items
   */
  async addItem(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const { productId, quantity } = req.body;

      // Validate request
      if (!productId || !quantity) {
        validationErrorResponse(res, [
          { field: 'productId', message: 'Product ID is required' },
          { field: 'quantity', message: 'Quantity is required' }
        ]);
        return;
      }

      if (typeof quantity !== 'number' || quantity <= 0) {
        validationErrorResponse(res, [
          { field: 'quantity', message: 'Quantity must be a positive number' }
        ]);
        return;
      }

      const addToCartRequest: AddToCartRequest = {
        productId,
        quantity,
      };

      const cart = await cartService.addItem(req.user, addToCartRequest);
      successResponse(res, cart, 201);
    } catch (error) {
      safeLogger.error('Error adding item to cart:', error);

      if (error instanceof Error) {
        if (error.message === 'Product not found') {
          errorResponse(res, 'PRODUCT_NOT_FOUND', 'Product not found', 404);
          return;
        }
        if (error.message === 'Product is not available') {
          errorResponse(res, 'PRODUCT_UNAVAILABLE', 'Product is not available', 400);
          return;
        }
      }

      errorResponse(res, 'CART_ERROR', 'Failed to add item to cart', 500);
    }
  }

  /**
   * Update cart item quantity
   * PUT /api/cart/items/:id
   */
  async updateItem(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const { id } = req.params;
      const { quantity } = req.body;

      // Validate request
      if (!id) {
        validationErrorResponse(res, [
          { field: 'id', message: 'Item ID is required' }
        ]);
        return;
      }

      if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
        validationErrorResponse(res, [
          { field: 'quantity', message: 'Quantity must be a positive number' }
        ]);
        return;
      }

      const updateRequest: UpdateCartItemRequest = {
        quantity,
      };

      const cart = await cartService.updateItem(req.user, id, updateRequest);
      successResponse(res, cart);
    } catch (error) {
      safeLogger.error('Error updating cart item:', error);

      if (error instanceof Error) {
        if (error.message === 'Cart item not found') {
          errorResponse(res, 'ITEM_NOT_FOUND', 'Cart item not found', 404);
          return;
        }
        if (error.message === 'Quantity must be greater than 0') {
          validationErrorResponse(res, [
            { field: 'quantity', message: 'Quantity must be greater than 0' }
          ]);
          return;
        }
      }

      errorResponse(res, 'CART_ERROR', 'Failed to update cart item', 500);
    }
  }

  /**
   * Remove item from cart
   * DELETE /api/cart/items/:id
   */
  async removeItem(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const { id } = req.params;

      // Validate request
      if (!id) {
        validationErrorResponse(res, [
          { field: 'id', message: 'Item ID is required' }
        ]);
        return;
      }

      const cart = await cartService.removeItem(req.user, id);
      successResponse(res, cart);
    } catch (error) {
      safeLogger.error('Error removing cart item:', error);

      if (error instanceof Error) {
        if (error.message === 'Cart item not found') {
          errorResponse(res, 'ITEM_NOT_FOUND', 'Cart item not found', 404);
          return;
        }
      }

      errorResponse(res, 'CART_ERROR', 'Failed to remove cart item', 500);
    }
  }

  /**
   * Clear cart
   * DELETE /api/cart
   */
  async clearCart(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const cart = await cartService.clearCart(req.user);
      successResponse(res, cart);
    } catch (error) {
      safeLogger.error('Error clearing cart:', error);

      if (error instanceof Error) {
        if (error.message === 'Cart not found') {
          errorResponse(res, 'CART_NOT_FOUND', 'Cart not found', 404);
          return;
        }
      }

      errorResponse(res, 'CART_ERROR', 'Failed to clear cart', 500);
    }
  }

  /**
   * Sync cart with local storage data
   * POST /api/cart/sync
   */
  async syncCart(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const { items } = req.body;

      // Validate request
      if (!Array.isArray(items)) {
        validationErrorResponse(res, [
          { field: 'items', message: 'Items must be an array' }
        ]);
        return;
      }

      // Validate each item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.productId || !item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
          validationErrorResponse(res, [
            { field: `items[${i}]`, message: 'Each item must have a valid productId and positive quantity' }
          ]);
          return;
        }
      }

      const cart = await cartService.syncCart(req.user, items);
      successResponse(res, cart);
    } catch (error) {
      safeLogger.error('Error syncing cart:', error);
      errorResponse(res, 'CART_ERROR', 'Failed to sync cart', 500);
    }
  }

  /**
   * Apply promo code to cart item
   * POST /api/cart/items/:id/promo
   */
  async applyPromoCode(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const { id } = req.params;
      const { code } = req.body;

      if (!id || !code) {
        validationErrorResponse(res, [
          { field: 'id', message: 'Item ID is required' },
          { field: 'code', message: 'Promo code is required' }
        ]);
        return;
      }

      const cart = await cartService.applyPromoCode(req.user, id, code);
      successResponse(res, cart);
    } catch (error) {
      safeLogger.error('Error applying promo code:', error);

      if (error instanceof Error) {
        if (error.message === 'Cart item not found') {
          errorResponse(res, 'ITEM_NOT_FOUND', 'Cart item not found', 404);
          return;
        }
        if (error.message === 'Invalid promo code') {
          errorResponse(res, 'INVALID_PROMO', 'Invalid promo code', 400);
          return;
        }
        if (error.message.includes('Promo code not applicable') || error.message.includes('Minimum order amount')) {
          errorResponse(res, 'INVALID_PROMO', error.message, 400);
          return;
        }
      }

      errorResponse(res, 'CART_ERROR', 'Failed to apply promo code', 500);
    }
  }

  /**
   * Remove promo code from cart item
   * DELETE /api/cart/items/:id/promo
   */
  async removePromoCode(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const { id } = req.params;

      if (!id) {
        validationErrorResponse(res, [
          { field: 'id', message: 'Item ID is required' }
        ]);
        return;
      }

      const cart = await cartService.removePromoCode(req.user, id);
      successResponse(res, cart);
    } catch (error) {
      safeLogger.error('Error removing promo code:', error);

      if (error instanceof Error) {
        if (error.message === 'Cart item not found') {
          errorResponse(res, 'ITEM_NOT_FOUND', 'Cart item not found', 404);
          return;
        }
      }

      errorResponse(res, 'CART_ERROR', 'Failed to remove promo code', 500);
    }
  }

  /**
   * Bulk delete selected items
   * DELETE /api/cart/bulk-delete
   */
  async bulkDeleteSelected(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const result = await cartService.bulkDeleteSelected(req.user);
      successResponse(res, {
        deletedCount: result.deletedCount,
        cart: result.cart
      });
    } catch (error) {
      safeLogger.error('Error bulk deleting items:', error);
      errorResponse(res, 'CART_ERROR', 'Failed to bulk delete items', 500);
    }
  }

  /**
   * Bulk save selected items for later
   * POST /api/cart/bulk-save-later
   */
  async bulkSaveForLater(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const result = await cartService.bulkSaveForLater(req.user);
      successResponse(res, {
        savedCount: result.savedCount,
        cart: result.cart
      });
    } catch (error) {
      safeLogger.error('Error bulk saving items for later:', error);
      errorResponse(res, 'CART_ERROR', 'Failed to bulk save items for later', 500);
    }
  }

  /**
   * Select/deselect all items
   * PUT /api/cart/select-all
   */
  async selectAllItems(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const { selected } = req.body;

      if (typeof selected !== 'boolean') {
        validationErrorResponse(res, [
          { field: 'selected', message: 'Selected must be a boolean' }
        ]);
        return;
      }

      const cart = await cartService.setAllItemsSelection(req.user, selected);
      successResponse(res, cart);
    } catch (error) {
      safeLogger.error('Error selecting all items:', error);
      errorResponse(res, 'CART_ERROR', 'Failed to select all items', 500);
    }
  }
}

export const cartController = new CartController();
