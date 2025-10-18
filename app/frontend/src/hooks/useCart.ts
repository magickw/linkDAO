/**
 * useCart Hook - React hook for cart state management
 */

import { useState, useEffect, useCallback } from 'react';
import { cartService, type CartState, type CartItem } from '@/services/cartService';

export interface UseCartReturn {
  state: CartState;
  actions: {
    addItem: (product: Omit<CartItem, 'quantity' | 'addedAt'>, quantity?: number) => void;
    removeItem: (itemId: string) => void;
    updateQuantity: (itemId: string, quantity: number) => void;
    clearCart: () => void;
    getItem: (itemId: string) => CartItem | undefined;
    isInCart: (itemId: string) => boolean;
  };
  loading: boolean;
}

export const useCart = (): UseCartReturn => {
  const [state, setState] = useState<CartState>(() => cartService.getCartState());
  const [loading, setLoading] = useState(false);

  // Subscribe to cart changes
  useEffect(() => {
    const unsubscribe = cartService.subscribe((newState) => {
      setState(newState);
    });

    // Initial load
    setState(cartService.getCartState());

    return unsubscribe;
  }, []);

  // Cart actions with loading states
  const addItem = useCallback(async (product: Omit<CartItem, 'quantity' | 'addedAt'>, quantity: number = 1) => {
    setLoading(true);
    try {
      cartService.addItem(product, quantity);
    } finally {
      setLoading(false);
    }
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    setLoading(true);
    try {
      cartService.removeItem(itemId);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    setLoading(true);
    try {
      cartService.updateQuantity(itemId, quantity);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCart = useCallback(async () => {
    setLoading(true);
    try {
      cartService.clearCart();
    } finally {
      setLoading(false);
    }
  }, []);

  const getItem = useCallback((itemId: string) => {
    return cartService.getItem(itemId);
  }, []);

  const isInCart = useCallback((itemId: string) => {
    return cartService.isInCart(itemId);
  }, []);

  return {
    state,
    actions: {
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      getItem,
      isInCart
    },
    loading
  };
};

// Alias for backward compatibility
export const useEnhancedCart = useCart;