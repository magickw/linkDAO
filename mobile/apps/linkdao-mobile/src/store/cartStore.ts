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

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
  syncWithBackend: () => Promise<boolean>;
}

export const cartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        set((state) => {
          const existingItem = state.items.find((i) => i.id === item.id);

          if (existingItem) {
            // Update quantity if item already exists
            return {
              items: state.items.map((i) =>
                i.id === item.id
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            };
          } else {
            // Add new item
            return {
              items: [...state.items, item],
            };
          }
        });
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }

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
        const items = get().items;
        if (items.length === 0) return true;

        const syncItems = items.map(item => ({
          productId: item.id,
          quantity: item.quantity
        }));

        return await cartService.syncCart(syncItems);
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);