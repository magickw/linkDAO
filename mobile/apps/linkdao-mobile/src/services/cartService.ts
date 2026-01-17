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
            // We return false but don't throw, so UI can decide whether to block or try anyway
            // (though for checkout, sync is likely strict)
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
