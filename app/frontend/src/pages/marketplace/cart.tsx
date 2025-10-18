/**
 * Cart Page - Shopping cart with checkout integration
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { DualPricing } from '@/design-system/components/DualPricing';
import Layout from '@/components/Layout';

const CartPage: React.FC = () => {
  const router = useRouter();
  const { state, actions } = useCart();
  const { addToast } = useToast();

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    try {
      await actions.updateQuantity(itemId, newQuantity);
    } catch (error) {
      addToast('Failed to update quantity', 'error');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await actions.removeItem(itemId);
      addToast('Item removed from cart', 'success');
    } catch (error) {
      addToast('Failed to remove item', 'error');
    }
  };

  const handleClearCart = async () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      try {
        await actions.clearCart();
        addToast('Cart cleared', 'success');
      } catch (error) {
        addToast('Failed to clear cart', 'error');
      }
    }
  };

  const handleCheckout = () => {
    if (state.items.length === 0) {
      addToast('Your cart is empty', 'warning');
      return;
    }
    router.push('/marketplace/checkout');
  };

  const handleContinueShopping = () => {
    router.push('/marketplace');
  };

  if (state.items.length === 0) {
    return (
      <Layout title="Shopping Cart - LinkDAO Marketplace">
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <GlassPanel variant="secondary" className="text-center py-16">
              <ShoppingBag className="mx-auto h-16 w-16 text-white/60 mb-6" />
              <h1 className="text-3xl font-bold text-white mb-4">Your cart is empty</h1>
              <p className="text-white/70 mb-8 max-w-md mx-auto">
                Looks like you haven't added any items to your cart yet. 
                Start exploring our marketplace to find amazing products!
              </p>
              <Button variant="primary" onClick={handleContinueShopping}>
                Continue Shopping
              </Button>
            </GlassPanel>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Shopping Cart - LinkDAO Marketplace">
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              onClick={handleContinueShopping}
              className="flex items-center gap-2 text-white/70 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Continue Shopping
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white">Shopping Cart</h1>
              <p className="text-white/70">
                {state.totals.itemCount} item{state.totals.itemCount !== 1 ? 's' : ''} in your cart
              </p>
            </div>
            {state.items.length > 0 && (
              <Button
                variant="outline"
                onClick={handleClearCart}
                className="text-red-300 border-red-400/30 hover:bg-red-500/20"
              >
                Clear Cart
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <AnimatePresence>
                {state.items.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <GlassPanel variant="secondary" className="p-6">
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={item.image || '/placeholder-product.jpg'}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-lg text-white truncate">
                                {item.title}
                              </h3>
                              <p className="text-white/70 text-sm">
                                by {item.seller.name}
                                {item.seller.verified && <span className="ml-1">✅</span>}
                                {item.seller.daoApproved && (
                                  <span className="ml-1 text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                                    DAO
                                  </span>
                                )}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="small"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-300 hover:text-red-200 hover:bg-red-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Price and Quantity */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <DualPricing
                                cryptoPrice={item.price.crypto}
                                cryptoSymbol={item.price.cryptoSymbol}
                                fiatPrice={item.price.fiat}
                                fiatSymbol={item.price.fiatSymbol}
                                size="small"
                                layout="horizontal"
                              />

                              {/* Quantity Controls */}
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="small"
                                  onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                  className="w-8 h-8 p-0"
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="text-white font-medium min-w-[2rem] text-center">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="small"
                                  onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                  disabled={item.quantity >= item.inventory}
                                  className="w-8 h-8 p-0"
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>

                            {/* Item Total */}
                            <div className="text-right">
                              <div className="text-lg font-semibold text-white">
                                {(parseFloat(item.price.crypto) * item.quantity).toFixed(6)} {item.price.cryptoSymbol}
                              </div>
                              <div className="text-sm text-white/70">
                                ${(parseFloat(item.price.fiat) * item.quantity).toFixed(2)}
                              </div>
                            </div>
                          </div>

                          {/* Shipping Info */}
                          {!item.isDigital && (
                            <div className="mt-2 text-xs text-white/60">
                              {item.shipping.freeShipping ? (
                                <span className="text-green-300">Free shipping</span>
                              ) : (
                                <span>Shipping: {item.shipping.cost} ETH</span>
                              )}
                              {' • '}
                              <span>Delivery: {item.shipping.estimatedDays} days</span>
                            </div>
                          )}

                          {/* Trust Indicators */}
                          <div className="mt-2 flex gap-2">
                            {item.trust.escrowProtected && (
                              <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded">
                                Escrow Protected
                              </span>
                            )}
                            {item.trust.onChainCertified && (
                              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                                On-Chain Certified
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </GlassPanel>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <GlassPanel variant="secondary" className="p-6 sticky top-8">
                <h2 className="text-xl font-semibold text-white mb-6">Order Summary</h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-white/70">
                    <span>Subtotal ({state.totals.itemCount} items)</span>
                    <div className="text-right">
                      <div>{state.totals.subtotal.crypto} {state.totals.subtotal.cryptoSymbol}</div>
                      <div className="text-sm">${state.totals.subtotal.fiat}</div>
                    </div>
                  </div>

                  {parseFloat(state.totals.shipping.crypto) > 0 && (
                    <div className="flex justify-between text-white/70">
                      <span>Shipping</span>
                      <div className="text-right">
                        <div>{state.totals.shipping.crypto} {state.totals.shipping.cryptoSymbol}</div>
                        <div className="text-sm">${state.totals.shipping.fiat}</div>
                      </div>
                    </div>
                  )}

                  <hr className="border-white/20" />

                  <div className="flex justify-between text-white font-semibold text-lg">
                    <span>Total</span>
                    <div className="text-right">
                      <div>{state.totals.total.crypto} {state.totals.total.cryptoSymbol}</div>
                      <div className="text-sm font-normal">${state.totals.total.fiat}</div>
                    </div>
                  </div>
                </div>

                <Button
                  variant="primary"
                  onClick={handleCheckout}
                  className="w-full mb-4"
                  disabled={state.items.length === 0}
                >
                  Proceed to Checkout
                </Button>

                <Button
                  variant="outline"
                  onClick={handleContinueShopping}
                  className="w-full"
                >
                  Continue Shopping
                </Button>

                {/* Trust Features */}
                <div className="mt-6 pt-6 border-t border-white/20">
                  <h3 className="text-sm font-medium text-white mb-3">Protected Purchase</h3>
                  <div className="space-y-2 text-xs text-white/70">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                      Escrow protection
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                      On-chain verification
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                      DAO dispute resolution
                    </div>
                  </div>
                </div>
              </GlassPanel>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CartPage;