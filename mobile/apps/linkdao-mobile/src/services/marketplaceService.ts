/**
 * Marketplace Service
 * API service for marketplace and e-commerce operations
 */

import { apiClient } from '@linkdao/shared';
import { offlineManager } from './offlineManager';

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
        const cacheKey = `products_p${page}_l${limit}_c${category || 'all'}`;

        if (page === 1) {
            const cached = await offlineManager.getCachedData<Product[]>(cacheKey);
            if (cached) {
                console.log('[MarketplaceService] Returning cached products');
                this.getProductsFromApi(page, limit, category, cacheKey).catch(console.error);
                return cached;
            }
        }

        return this.getProductsFromApi(page, limit, category, cacheKey);
    }

    private async getProductsFromApi(page: number, limit: number, category: string | undefined, cacheKey: string): Promise<Product[]> {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            ...(category && { category }),
        });

        const response = await apiClient.get<any>(
            `/api/marketplace/products?${params}`
        );

        if (response.success && response.data) {
            const products = response.data.products || response.data;
            if (page === 1) {
                await offlineManager.cacheData(cacheKey, products, 300000); // 5 minutes
            }
            return products;
        }

        return [];
    }

    /**
     * Get product by ID
     */
    async getProduct(id: string): Promise<Product | null> {
        const cacheKey = `product_${id}`;
        const cached = await offlineManager.getCachedData<Product>(cacheKey);
        
        if (cached) {
            this.getProductFromApi(id, cacheKey).catch(console.error);
            return cached;
        }

        return this.getProductFromApi(id, cacheKey);
    }

    private async getProductFromApi(id: string, cacheKey: string): Promise<Product | null> {
        const response = await apiClient.get<Product>(`/api/marketplace/products/${id}`);

        if (response.success && response.data) {
            await offlineManager.cacheData(cacheKey, response.data, 600000); // 10 minutes
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
        const cacheKey = `orders_p${page}_l${limit}`;

        if (page === 1) {
            const cached = await offlineManager.getCachedData<Order[]>(cacheKey);
            if (cached) {
                this.getOrdersFromApi(page, limit, cacheKey).catch(console.error);
                return cached;
            }
        }

        return this.getOrdersFromApi(page, limit, cacheKey);
    }

    private async getOrdersFromApi(page: number, limit: number, cacheKey: string): Promise<Order[]> {
        const response = await apiClient.get<any>(
            `/api/marketplace/orders?page=${page}&limit=${limit}`
        );

        if (response.success && response.data) {
            const orders = response.data.orders || response.data;
            if (page === 1) {
                await offlineManager.cacheData(cacheKey, orders, 300000); // 5 minutes
            }
            return orders;
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
