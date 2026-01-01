/**
 * Cart Page - Displays user's shopping cart
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { cartService, CartState } from '@/services/cartService';
import ProductThumbnail from '@/components/Checkout/ProductThumbnail';
import { X, Plus, Minus, ShoppingCart } from 'lucide-react';

const CartPage: React.FC = () => {
  const [cartState, setCartState] = useState<CartState>({
    items: [],
    totals: {
      itemCount: 0,
      subtotal: {
        crypto: '0',
        cryptoSymbol: 'ETH',
        fiat: '0.00',
        fiatSymbol: 'USD'
      },
      shipping: {
        crypto: '0',
        cryptoSymbol: 'ETH',
        fiat: '0.00',
        fiatSymbol: 'USD'
      },
      total: {
        crypto: '0',
        cryptoSymbol: 'ETH',
        fiat: '0.00',
        fiatSymbol: 'USD'
      }
    },
    lastUpdated: new Date()
  });
  
  const router = useRouter();

  useEffect(() => {
    // Load cart items
    const loadCart = async () => {
      const state = await cartService.getCartState();
      setCartState(state);
    };

    loadCart();

    // Subscribe to cart changes
    const unsubscribe = cartService.subscribe((state) => {
      setCartState(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleRemoveItem = (itemId: string) => {
    cartService.removeItem(itemId);
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    
    cartService.updateQuantity(itemId, quantity);
  };

  const handleCheckout = () => {
    router.push('/marketplace/checkout');
  };

  const handleContinueShopping = () => {
    router.push('/marketplace');
  };

  return (
    <Layout title="Shopping Cart | Marketplace" fullWidth={true}>
      <Head>
        <title>Shopping Cart | Marketplace</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-white mb-8">Shopping Cart</h1>

          {cartState.items.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/20">
              <ShoppingCart size={48} className="text-white/30 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-white mb-2">Your cart is empty</h2>
              <p className="text-white/70 mb-6">Add some products to your cart</p>
              <button
                onClick={handleContinueShopping}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Browse Marketplace
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/20">
                  <div className="divide-y divide-white/10">
                    {cartState.items.map((item) => (
                      <div key={item.id} className="p-6 flex flex-col sm:flex-row gap-4">
                        <div className="flex-shrink-0">
                          <ProductThumbnail
                            item={{
                              id: item.id,
                              title: item.title,
                              image: item.image,
                              category: item.category
                            }}
                            size="large"
                            fallbackType="letter"
                          />
                        </div>
                        
                        <div className="flex-grow">
                          <div className="flex justify-between">
                            <h3 className="font-semibold text-white">{item.title}</h3>
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-white/50 hover:text-white"
                            >
                              <X size={20} />
                            </button>
                          </div>
                          
                          <p className="text-white/70 text-sm mb-2">{item.seller.name}</p>
                          
                          <div className="flex flex-wrap items-center gap-4 mt-4">
                            <div className="flex items-center border border-white/20 rounded-lg bg-white/10">
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                className="p-2 hover:bg-white/20"
                              >
                                <Minus size={16} />
                              </button>
                              <span className="px-4 py-2 text-white">{item.quantity}</span>
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                className="p-2 hover:bg-white/20"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                            
                            <div className="text-lg font-semibold text-white">
                              {item.price.fiatSymbol}{(parseFloat(item.price.fiat) * item.quantity).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="lg:col-span-1">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 sticky top-8 border border-white/20">
                  <h2 className="text-xl font-semibold text-white mb-4">Order Summary</h2>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between">
                      <span className="text-white/70">Subtotal</span>
                      <span className="font-medium text-white">
                        {cartState.totals.subtotal.fiatSymbol}{cartState.totals.subtotal.fiat}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Shipping</span>
                      <span className="font-medium text-white">
                        {cartState.totals.shipping.fiatSymbol}{cartState.totals.shipping.fiat}
                      </span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-white/20">
                      <span className="text-lg font-semibold text-white">Total</span>
                      <span className="text-lg font-semibold text-white">
                        {cartState.totals.total.fiatSymbol}{cartState.totals.total.fiat}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleCheckout}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors font-medium mb-3"
                  >
                    Proceed to Checkout
                  </button>
                  
                  <button
                    onClick={handleContinueShopping}
                    className="w-full bg-white/20 hover:bg-white/30 text-white py-3 rounded-lg transition-colors font-medium border border-white/30"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CartPage;