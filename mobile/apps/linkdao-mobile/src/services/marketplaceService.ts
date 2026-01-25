/**
 * Marketplace Service
 * API service for marketplace and e-commerce operations
 */

import { apiClient } from '@linkdao/shared';

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    images: string[];
    seller: {
        id: string;
        name: string;
        avatar?: string;
        verified: boolean;
    };
    category: string;
    stock: number;
    rating: number;
    reviews: number;
}

export interface CartItem {
    id: string;
    productId: string;
    product: Product;
    quantity: number;
    price: number;
}

export interface Cart {
    items: CartItem[];
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
}

export interface ShippingAddress {
    name: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
}

export interface Order {
    id: string;
    items: CartItem[];
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    paymentMethod: 'crypto' | 'stripe';
    shippingAddress: ShippingAddress;
    trackingNumber?: string;
    trackingCarrier?: string;
    trackingUrl?: string;
    createdAt: string;
    updatedAt: string;
}

class MarketplaceService {
    /**
     * Get all products
     */
    async getProducts(page: number = 1, limit: number = 20, category?: string): Promise<Product[]> {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            ...(category && { category }),
        });

        const response = await apiClient.get<any>(
            `/api/marketplace/products?${params}`
        );

        if (response.success && response.data) {
            return response.data.products || response.data;
        }

        return [];
    }

    /**
     * Get product by ID
     */
    async getProduct(id: string): Promise<Product | null> {
        const response = await apiClient.get<Product>(`/api/marketplace/products/${id}`);

        if (response.success && response.data) {
            return response.data;
        }

        return null;
    }

    /**
     * Add item to cart
     */
    async addToCart(productId: string, quantity: number = 1): Promise<boolean> {
        const response = await apiClient.post('/api/marketplace/cart/add', {
            productId,
            quantity,
        });

        return response.success;
    }

    /**
     * Get current cart
     */
    async getCart(): Promise<Cart | null> {
        const response = await apiClient.get<Cart>('/api/marketplace/cart');

        if (response.success && response.data) {
            return response.data;
        }

        return null;
    }

    /**
     * Update cart item quantity
     */
    async updateCartItem(itemId: string, quantity: number): Promise<boolean> {
        const response = await apiClient.put(`/api/marketplace/cart/items/${itemId}`, {
            quantity,
        });

        return response.success;
    }

    /**
     * Remove item from cart
     */
    async removeFromCart(itemId: string): Promise<boolean> {
        const response = await apiClient.delete(`/api/marketplace/cart/items/${itemId}`);
        return response.success;
    }

    /**
     * Clear cart
     */
    async clearCart(): Promise<boolean> {
        const response = await apiClient.delete('/api/marketplace/cart');
        return response.success;
    }

    /**
     * Checkout
     */
    async checkout(data: {
        paymentMethod: 'crypto' | 'stripe';
        shippingAddress: ShippingAddress;
        billingAddress?: ShippingAddress;
    }): Promise<Order | null> {
        const response = await apiClient.post<Order>('/api/marketplace/checkout', data);

        if (response.success && response.data) {
            return response.data;
        }

        return null;
    }

    /**
     * Get user orders
     */
    async getOrders(page: number = 1, limit: number = 20): Promise<Order[]> {
        const response = await apiClient.get<any>(
            `/api/marketplace/orders?page=${page}&limit=${limit}`
        );

        if (response.success && response.data) {
            return response.data.orders || response.data;
        }

        return [];
    }

    /**
     * Get order by ID
     */
    async getOrder(id: string): Promise<Order | null> {
        const response = await apiClient.get<Order>(`/api/marketplace/orders/${id}`);

        if (response.success && response.data) {
            return response.data;
        }

        return null;
    }

    /**
     * Search products
     */
    async searchProducts(query: string): Promise<Product[]> {
        const response = await apiClient.get<any>(
            `/api/marketplace/search?q=${encodeURIComponent(query)}`
        );

        if (response.success && response.data) {
            return response.data.products || response.data;
        }

        return [];
    }
}

export const marketplaceService = new MarketplaceService();
