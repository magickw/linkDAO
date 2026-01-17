/**
 * Cart Service
 * Handles shopping cart synchronization with backend
 */

import { apiClient } from './apiClient';

export interface CartItemSync {
    productId: string;
    quantity: number;
}

class CartService {
    /**
     * Sync local cart items with backend
     */
    async syncCart(items: CartItemSync[]): Promise<boolean> {
        try {
            await apiClient.post('/api/cart/sync', { items });
            return true;
        } catch (error) {
            console.error('[Cart] Error syncing cart:', error);
            return false;
        }
    }

    /**
     * Get saved for later items
     */
    async getSavedItems() {
        try {
            const response = await apiClient.get('/api/saved-for-later');
            if (response.data && response.data.success) {
                return response.data.data;
            }
            return [];
        } catch (error) {
            console.error('[Cart] Error fetching saved items:', error);
            return [];
        }
    }

    /**
     * Save item for later
     */
    async saveForLater(productId: string) {
        try {
            const response = await apiClient.post(`/api/saved-for-later/${productId}`);
            return response.data && response.data.success;
        } catch (error) {
            console.error('[Cart] Error saving for later:', error);
            return false;
        }
    }

    /**
     * Move saved item back to cart
     */
    async moveToCart(savedItemId: string) {
        try {
            const response = await apiClient.post(`/api/saved-for-later/${savedItemId}/move-to-cart`);
            return response.data && response.data.success;
        } catch (error) {
            console.error('[Cart] Error moving to cart:', error);
            return false;
        }
    }

    /**
     * Remove saved item
     */
    async removeSavedItem(savedItemId: string) {
        try {
            await apiClient.delete(`/api/saved-for-later/${savedItemId}`);
            return true;
        } catch (error) {
            console.error('[Cart] Error removing saved item:', error);
            return false;
        }
    }

    /**
     * Get backend cart (optional, for future use)
     */
    async getCart() {
        try {
            const response = await apiClient.get('/api/cart');
            return response.data;
        } catch (error) {
            console.error('[Cart] Error fetching cart:', error);
            return null;
        }
    }

    /**
     * Clear backend cart
     */
    async clearCart() {
        try {
            await apiClient.delete('/api/cart');
            return true;
        } catch (error) {
            console.error('[Cart] Error clearing cart:', error);
            return false;
        }
    }
}

export const cartService = new CartService();
export default cartService;
