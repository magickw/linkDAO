/**
 * Saved For Later Service - Frontend service for managing saved items
 */

import { csrfService } from './csrfService';
import { enhancedAuthService } from './enhancedAuthService';

export interface SavedForLaterItem {
    id: string;
    productId: string;
    title: string;
    image: string;
    price: number;
    priceAtSave?: number;
    quantity: number;
    notes?: string;
    savedAt: Date;
}

class SavedForLaterService {
    private static instance: SavedForLaterService;
    private baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';
    private listeners: Set<(items: SavedForLaterItem[]) => void> = new Set();

    private constructor() { }

    static getInstance(): SavedForLaterService {
        if (!SavedForLaterService.instance) {
            SavedForLaterService.instance = new SavedForLaterService();
        }
        return SavedForLaterService.instance;
    }

    /**
     * Subscribe to saved items changes
     */
    subscribe(listener: (items: SavedForLaterItem[]) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Notify all listeners of changes
     */
    private notifyListeners(items: SavedForLaterItem[]): void {
        this.listeners.forEach(listener => listener(items));
    }

    /**
     * Get authentication headers
     */
    private async getAuthHeaders(): Promise<HeadersInit> {
        const token = await enhancedAuthService.getAuthToken();
        const csrfToken = await csrfService.getToken();

        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...(csrfToken && { 'X-CSRF-Token': csrfToken })
        };
    }

    /**
     * Get all saved items
     */
    async getSavedItems(): Promise<SavedForLaterItem[]> {
        try {
            const headers = await this.getAuthHeaders();
            const response = await fetch(`${this.baseURL}/api/saved-for-later`, {
                method: 'GET',
                headers,
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch saved items');
            }

            const data = await response.json();
            const items = data.data.map((item: any) => ({
                id: item.id,
                productId: item.productId,
                title: item.product?.title || 'Unknown Product',
                image: item.product?.images?.[0] || '/placeholder.png',
                price: parseFloat(item.product?.price || '0'),
                priceAtSave: item.priceAtSave ? parseFloat(item.priceAtSave) : undefined,
                quantity: item.quantity,
                notes: item.notes,
                savedAt: new Date(item.savedAt)
            }));

            this.notifyListeners(items);
            return items;
        } catch (error) {
            console.error('Error fetching saved items:', error);
            return [];
        }
    }

    /**
     * Save a cart item for later
     */
    async saveCartItemForLater(cartItemId: string, notes?: string): Promise<void> {
        try {
            const headers = await this.getAuthHeaders();
            const response = await fetch(`${this.baseURL}/api/cart/save-for-later/${cartItemId}`, {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({ notes })
            });

            if (!response.ok) {
                throw new Error('Failed to save item for later');
            }

            // Refresh saved items
            await this.getSavedItems();
        } catch (error) {
            console.error('Error saving item for later:', error);
            throw error;
        }
    }

    /**
     * Move saved item back to cart
     */
    async moveToCart(savedItemId: string): Promise<void> {
        try {
            const headers = await this.getAuthHeaders();
            const response = await fetch(`${this.baseURL}/api/saved-for-later/${savedItemId}/move-to-cart`, {
                method: 'POST',
                headers,
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to move item to cart');
            }

            // Refresh saved items
            await this.getSavedItems();
        } catch (error) {
            console.error('Error moving item to cart:', error);
            throw error;
        }
    }

    /**
     * Remove saved item
     */
    async removeSavedItem(savedItemId: string): Promise<void> {
        try {
            const headers = await this.getAuthHeaders();
            const response = await fetch(`${this.baseURL}/api/saved-for-later/${savedItemId}`, {
                method: 'DELETE',
                headers,
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to remove saved item');
            }

            // Refresh saved items
            await this.getSavedItems();
        } catch (error) {
            console.error('Error removing saved item:', error);
            throw error;
        }
    }
}

export const savedForLaterService = SavedForLaterService.getInstance();
