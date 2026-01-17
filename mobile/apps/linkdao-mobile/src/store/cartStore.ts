/**
 * Cart Store
 * Zustand store for managing shopping cart state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cartService } from '../services/cartService';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  seller: string;
}

export interface SavedItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  seller: string;
}

export interface GiftOptions {
  isGift: boolean;
  giftMessage?: string;
  giftWrapOption?: 'standard' | 'premium' | 'none';
}

interface CartState {
  items: CartItem[];
  savedItems: SavedItem[];
  giftOptions: GiftOptions;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
  syncWithBackend: () => Promise<boolean>;
  updateGiftOptions: (options: GiftOptions) => void;
  
  // Saved for later methods
  fetchSavedItems: () => Promise<void>;
  moveToSaved: (id: string) => Promise<void>;
  restoreFromSaved: (savedItemId: string) => Promise<void>;
  removeSavedItem: (savedItemId: string) => Promise<void>;
}

export const cartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      savedItems: [],
      giftOptions: {
        isGift: false,
        giftWrapOption: 'none',
      },

      addItem: (item) => {
        set((state) => {
          const existingItem = state.items.find(i => i.id === item.id);
          if (existingItem) {
            return {
              items: state.items.map(i =>
                i.id === item.id
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, item] };
        });
      },
      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      updateQuantity: (id, quantity) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      syncWithBackend: async () => {
        try {
          // Sync local cart with backend
          // This is a placeholder - actual implementation would call the backend
          return true;
        } catch (error) {
          console.error('Failed to sync cart with backend:', error);
          return false;
        }
      },

      updateGiftOptions: (options) => {
        set({ giftOptions: options });
      },

      fetchSavedItems: async () => {
        const savedItems = await cartService.getSavedItems();
        set({ savedItems });
      },

      moveToSaved: async (productId) => {
        const success = await cartService.saveForLater(productId);
        if (success) {
          get().removeItem(productId);
          await get().fetchSavedItems();
        }
      },

      restoreFromSaved: async (savedItemId) => {
        const success = await cartService.moveToCart(savedItemId);
        if (success) {
          // In a real app, moveToCart would update the backend cart, 
          // then we might need to re-fetch the local items.
          // For now, let's assume we need to refresh both.
          await get().fetchSavedItems();
          // We don't have a fetchCartItems yet, but removeItem/addItem are local.
          // The backend sync handles persistence.
        }
      },

      removeSavedItem: async (savedItemId) => {
        const success = await cartService.removeSavedItem(savedItemId);
        if (success) {
          set((state) => ({
            savedItems: state.savedItems.filter(item => item.id !== savedItemId)
          }));
        }
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);