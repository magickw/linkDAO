/**
 * Enhanced Shopping Cart System with Web3 Integration
 * Features: Persistent storage, multi-seller support, escrow grouping, wallet integration
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';

interface CartProduct {
  id: string;
  title: string;
  description: string;
  image: string;
  price: {
    crypto: string;
    cryptoSymbol: string;
    fiat: string;
    fiatSymbol: string;
  };
  seller: {
    id: string;
    name: string;
    avatar: string;
    verified: boolean;
    daoApproved: boolean;
    escrowSupported: boolean;
  };
  category: string;
  isDigital: boolean;
  isNFT: boolean;
  inventory?: number;
  shipping: {
    cost: string;
    freeShipping: boolean;
    estimatedDays: string;
    regions: string[];
  };
  trust: {
    escrowProtected: boolean;
    onChainCertified: boolean;
    safetyScore: number;
  };
}

interface CartItem extends CartProduct {
  quantity: number;
  addedAt: Date;
  selectedOptions?: Record<string, string>;
}

interface CartGroup {
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
  items: CartItem[];
  subtotal: number;
  shippingCost: number;
  escrowRequired: boolean;
  estimatedDelivery: string;
}

interface CartState {
  items: CartItem[];
  groups: CartGroup[];
  totals: {
    subtotal: number;
    shipping: number;
    escrowFees: number;
    taxes: number;
    total: number;
    itemCount: number;
  };
  metadata: {
    lastUpdated: Date;
    currency: 'crypto' | 'fiat';
    walletAddress?: string;
    guestSession?: string;
  };
  wishlist: string[];
  recentlyViewed: string[];
  savedForLater: CartItem[];
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: { product: CartProduct; quantity?: number; options?: Record<string, string> } }
  | { type: 'REMOVE_ITEM'; payload: { productId: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { productId: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'MOVE_TO_SAVED'; payload: { productId: string } }
  | { type: 'RESTORE_FROM_SAVED'; payload: { productId: string } }
  | { type: 'ADD_TO_WISHLIST'; payload: { productId: string } }
  | { type: 'REMOVE_FROM_WISHLIST'; payload: { productId: string } }
  | { type: 'ADD_TO_RECENTLY_VIEWED'; payload: { productId: string } }
  | { type: 'SET_CURRENCY'; payload: { currency: 'crypto' | 'fiat' } }
  | { type: 'SYNC_WITH_WALLET'; payload: { walletAddress: string } }
  | { type: 'LOAD_PERSISTED_STATE'; payload: { state: Partial<CartState> } };

const initialState: CartState = {
  items: [],
  groups: [],
  totals: {
    subtotal: 0,
    shipping: 0,
    escrowFees: 0,
    taxes: 0,
    total: 0,
    itemCount: 0,
  },
  metadata: {
    lastUpdated: new Date(),
    currency: 'crypto',
  },
  wishlist: [],
  recentlyViewed: [],
  savedForLater: [],
};

// Enhanced cart reducer with complex business logic
const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { product, quantity = 1, options = {} } = action.payload;
      
      // Check if item already exists
      const existingItemIndex = state.items.findIndex(
        item => item.id === product.id && 
        JSON.stringify(item.selectedOptions) === JSON.stringify(options)
      );

      let newItems: CartItem[];
      
      if (existingItemIndex >= 0) {
        // Update existing item quantity
        newItems = state.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Add new item
        const newItem: CartItem = {
          ...product,
          quantity,
          addedAt: new Date(),
          selectedOptions: options,
        };
        newItems = [...state.items, newItem];
      }

      return {
        ...state,
        items: newItems,
        groups: groupItemsBySeller(newItems),
        totals: calculateTotals(newItems, state.metadata.currency),
        metadata: {
          ...state.metadata,
          lastUpdated: new Date(),
        },
      };
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.id !== action.payload.productId);
      
      return {
        ...state,
        items: newItems,
        groups: groupItemsBySeller(newItems),
        totals: calculateTotals(newItems, state.metadata.currency),
        metadata: {
          ...state.metadata,
          lastUpdated: new Date(),
        },
      };
    }

    case 'UPDATE_QUANTITY': {
      const { productId, quantity } = action.payload;
      
      if (quantity <= 0) {
        return cartReducer(state, { type: 'REMOVE_ITEM', payload: { productId } });
      }

      const newItems = state.items.map(item =>
        item.id === productId ? { ...item, quantity } : item
      );

      return {
        ...state,
        items: newItems,
        groups: groupItemsBySeller(newItems),
        totals: calculateTotals(newItems, state.metadata.currency),
        metadata: {
          ...state.metadata,
          lastUpdated: new Date(),
        },
      };
    }

    case 'CLEAR_CART': {
      return {
        ...state,
        items: [],
        groups: [],
        totals: {
          subtotal: 0,
          shipping: 0,
          escrowFees: 0,
          taxes: 0,
          total: 0,
          itemCount: 0,
        },
        metadata: {
          ...state.metadata,
          lastUpdated: new Date(),
        },
      };
    }

    case 'MOVE_TO_SAVED': {
      const itemToSave = state.items.find(item => item.id === action.payload.productId);
      if (!itemToSave) return state;

      const newItems = state.items.filter(item => item.id !== action.payload.productId);
      const newSavedItems = [...state.savedForLater, itemToSave];

      return {
        ...state,
        items: newItems,
        groups: groupItemsBySeller(newItems),
        totals: calculateTotals(newItems, state.metadata.currency),
        savedForLater: newSavedItems,
        metadata: {
          ...state.metadata,
          lastUpdated: new Date(),
        },
      };
    }

    case 'RESTORE_FROM_SAVED': {
      const itemToRestore = state.savedForLater.find(item => item.id === action.payload.productId);
      if (!itemToRestore) return state;

      const newSavedItems = state.savedForLater.filter(item => item.id !== action.payload.productId);
      const newItems = [...state.items, { ...itemToRestore, addedAt: new Date() }];

      return {
        ...state,
        items: newItems,
        groups: groupItemsBySeller(newItems),
        totals: calculateTotals(newItems, state.metadata.currency),
        savedForLater: newSavedItems,
        metadata: {
          ...state.metadata,
          lastUpdated: new Date(),
        },
      };
    }

    case 'ADD_TO_WISHLIST': {
      const { productId } = action.payload;
      if (state.wishlist.includes(productId)) return state;

      return {
        ...state,
        wishlist: [...state.wishlist, productId],
        metadata: {
          ...state.metadata,
          lastUpdated: new Date(),
        },
      };
    }

    case 'REMOVE_FROM_WISHLIST': {
      return {
        ...state,
        wishlist: state.wishlist.filter(id => id !== action.payload.productId),
        metadata: {
          ...state.metadata,
          lastUpdated: new Date(),
        },
      };
    }

    case 'ADD_TO_RECENTLY_VIEWED': {
      const { productId } = action.payload;
      const newRecentlyViewed = [
        productId,
        ...state.recentlyViewed.filter(id => id !== productId)
      ].slice(0, 10); // Keep only last 10 items

      return {
        ...state,
        recentlyViewed: newRecentlyViewed,
        metadata: {
          ...state.metadata,
          lastUpdated: new Date(),
        },
      };
    }

    case 'SET_CURRENCY': {
      const { currency } = action.payload;
      
      return {
        ...state,
        totals: calculateTotals(state.items, currency),
        metadata: {
          ...state.metadata,
          currency,
          lastUpdated: new Date(),
        },
      };
    }

    case 'SYNC_WITH_WALLET': {
      const { walletAddress } = action.payload;
      
      return {
        ...state,
        metadata: {
          ...state.metadata,
          walletAddress,
          guestSession: undefined,
          lastUpdated: new Date(),
        },
      };
    }

    case 'LOAD_PERSISTED_STATE': {
      return {
        ...state,
        ...action.payload.state,
        metadata: {
          ...state.metadata,
          ...action.payload.state?.metadata,
          lastUpdated: new Date(),
        },
      };
    }

    default:
      return state;
  }
};

// Helper function to group items by seller
const groupItemsBySeller = (items: CartItem[]): CartGroup[] => {
  const sellerGroups = items.reduce((acc, item) => {
    const sellerId = item.seller.id;
    
    if (!acc[sellerId]) {
      acc[sellerId] = {
        sellerId,
        sellerName: item.seller.name,
        sellerAvatar: item.seller.avatar,
        items: [],
        subtotal: 0,
        shippingCost: 0,
        escrowRequired: false,
        estimatedDelivery: '',
      };
    }
    
    acc[sellerId].items.push(item);
    acc[sellerId].subtotal += parseFloat(item.price.crypto) * item.quantity;
    
    // Check if any item requires escrow
    if (item.trust.escrowProtected) {
      acc[sellerId].escrowRequired = true;
    }
    
    // Calculate shipping for physical items
    if (!item.isDigital && !item.shipping.freeShipping) {
      acc[sellerId].shippingCost += parseFloat(item.shipping.cost);
    }
    
    // Get longest delivery estimate
    const deliveryDays = parseInt(item.shipping.estimatedDays.split('-')[1] || item.shipping.estimatedDays);
    const currentDeliveryDays = parseInt(acc[sellerId].estimatedDelivery.split('-')[1] || acc[sellerId].estimatedDelivery || '0');
    
    if (deliveryDays > currentDeliveryDays) {
      acc[sellerId].estimatedDelivery = item.shipping.estimatedDays;
    }
    
    return acc;
  }, {} as Record<string, CartGroup>);
  
  return Object.values(sellerGroups);
};

// Helper function to calculate totals
const calculateTotals = (items: CartItem[], currency: 'crypto' | 'fiat') => {
  const subtotal = items.reduce((sum, item) => {
    const price = currency === 'crypto' ? parseFloat(item.price.crypto) : parseFloat(item.price.fiat);
    return sum + (price * item.quantity);
  }, 0);

  const shipping = items.reduce((sum, item) => {
    if (item.isDigital || item.shipping.freeShipping) return sum;
    const cost = currency === 'crypto' ? parseFloat(item.shipping.cost) : parseFloat(item.shipping.cost) * 1.5; // Approximate fiat conversion
    return sum + cost;
  }, 0);

  const escrowFees = subtotal * 0.01; // 1% escrow fee
  const taxes = currency === 'fiat' ? subtotal * 0.08 : 0; // 8% tax for fiat only
  const total = subtotal + shipping + escrowFees + taxes;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    subtotal,
    shipping,
    escrowFees,
    taxes,
    total,
    itemCount,
  };
};

// Cart Context
interface CartContextType {
  state: CartState;
  addItem: (product: CartProduct, quantity?: number, options?: Record<string, string>) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  moveToSaved: (productId: string) => void;
  restoreFromSaved: (productId: string) => void;
  addToWishlist: (productId: string) => void;
  removeFromWishlist: (productId: string) => void;
  addToRecentlyViewed: (productId: string) => void;
  setCurrency: (currency: 'crypto' | 'fiat') => void;
  isInCart: (productId: string) => boolean;
  isInWishlist: (productId: string) => boolean;
  getItemQuantity: (productId: string) => number;
  getSellerGroups: () => CartGroup[];
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Cart Provider Component
export const EnhancedCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { address, isConnected } = useAccount();

  // Load persisted state on mount
  useEffect(() => {
    const loadPersistedState = () => {
      try {
        const storageKey = isConnected && address 
          ? `cart_${address.toLowerCase()}` 
          : 'cart_guest';
        
        const persistedState = localStorage.getItem(storageKey);
        
        if (persistedState) {
          const parsed = JSON.parse(persistedState);
          // Restore dates from strings
          parsed.items = parsed.items?.map((item: any) => ({
            ...item,
            addedAt: new Date(item.addedAt),
          })) || [];
          parsed.savedForLater = parsed.savedForLater?.map((item: any) => ({
            ...item,
            addedAt: new Date(item.addedAt),
          })) || [];
          parsed.metadata = {
            ...parsed.metadata,
            lastUpdated: new Date(parsed.metadata?.lastUpdated || Date.now()),
          };
          
          dispatch({ type: 'LOAD_PERSISTED_STATE', payload: { state: parsed } });
        }
      } catch (error) {
        console.error('Error loading persisted cart state:', error);
      }
    };

    loadPersistedState();
  }, [address, isConnected]);

  // Sync with wallet when connected
  useEffect(() => {
    if (isConnected && address) {
      dispatch({ type: 'SYNC_WITH_WALLET', payload: { walletAddress: address } });
    }
  }, [address, isConnected]);

  // Persist state changes with debounce
  useEffect(() => {
    const persistState = () => {
      try {
        const storageKey = state.metadata.walletAddress 
          ? `cart_${state.metadata.walletAddress.toLowerCase()}` 
          : 'cart_guest';
        
        localStorage.setItem(storageKey, JSON.stringify(state));
      } catch (error) {
        console.error('Error persisting cart state:', error);
      }
    };

    // Debounce persistence to avoid excessive localStorage writes
    const timeoutId = setTimeout(persistState, 100);
    return () => clearTimeout(timeoutId);
  }, [state]);

  // Cart actions
  const addItem = useCallback((product: CartProduct, quantity = 1, options = {}) => {
    dispatch({ type: 'ADD_ITEM', payload: { product, quantity, options } });
  }, []);

  const removeItem = useCallback((productId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { productId } });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { productId, quantity } });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  const moveToSaved = useCallback((productId: string) => {
    dispatch({ type: 'MOVE_TO_SAVED', payload: { productId } });
  }, []);

  const restoreFromSaved = useCallback((productId: string) => {
    dispatch({ type: 'RESTORE_FROM_SAVED', payload: { productId } });
  }, []);

  const addToWishlist = useCallback((productId: string) => {
    dispatch({ type: 'ADD_TO_WISHLIST', payload: { productId } });
  }, []);

  const removeFromWishlist = useCallback((productId: string) => {
    dispatch({ type: 'REMOVE_FROM_WISHLIST', payload: { productId } });
  }, []);

  const addToRecentlyViewed = useCallback((productId: string) => {
    dispatch({ type: 'ADD_TO_RECENTLY_VIEWED', payload: { productId } });
  }, []);

  const setCurrency = useCallback((currency: 'crypto' | 'fiat') => {
    dispatch({ type: 'SET_CURRENCY', payload: { currency } });
  }, []);

  // Helper functions
  const isInCart = useCallback((productId: string): boolean => {
    return state.items.some(item => item.id === productId);
  }, [state.items]);

  const isInWishlist = useCallback((productId: string): boolean => {
    return state.wishlist.includes(productId);
  }, [state.wishlist]);

  const getItemQuantity = useCallback((productId: string): number => {
    const item = state.items.find(item => item.id === productId);
    return item?.quantity || 0;
  }, [state.items]);

  const getSellerGroups = useCallback((): CartGroup[] => {
    return state.groups;
  }, [state.groups]);

  const contextValue: CartContextType = useMemo(() => ({
    state,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    moveToSaved,
    restoreFromSaved,
    addToWishlist,
    removeFromWishlist,
    addToRecentlyViewed,
    setCurrency,
    isInCart,
    isInWishlist,
    getItemQuantity,
    getSellerGroups,
  }), [
    state,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    moveToSaved,
    restoreFromSaved,
    addToWishlist,
    removeFromWishlist,
    addToRecentlyViewed,
    setCurrency,
    isInCart,
    isInWishlist,
    getItemQuantity,
    getSellerGroups,
  ]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hook to use cart context
export const useEnhancedCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useEnhancedCart must be used within an EnhancedCartProvider');
  }
  return context;
};

// Export types for use in other components
export type { CartProduct, CartItem, CartGroup, CartState };