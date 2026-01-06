/**
 * Cart Page - Displays user's shopping cart
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { cartService, CartState } from '@/services/cartService';
import { savedForLaterService, SavedForLaterItem } from '@/services/savedForLaterService';
import ProductThumbnail from '@/components/Checkout/ProductThumbnail';
import { CartItemCard } from '@/components/Cart/CartItemCard';
import { SavedForLaterSection } from '@/components/Cart/SavedForLaterSection';
import { X, Plus, Minus, ShoppingCart, Info, Tag, Percent, CheckCircle } from 'lucide-react';

import { useAccount } from 'wagmi';
import { useProfile } from '@/hooks/useProfile';
import { taxService } from '@/services/taxService';

const CartPage: React.FC = () => {
  const { address } = useAccount();
  const { profile } = useProfile(address);

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

  // Track promo code input state per item
  const [promoCodeInputs, setPromoCodeInputs] = useState<Record<string, {
    code: string;
    loading: boolean;
    error: string;
  }>>({});

  const [savedItems, setSavedItems] = useState<SavedForLaterItem[]>([]);
  const [gasFee, setGasFee] = useState(0);
  const [estimatedTax, setEstimatedTax] = useState(0);
  const [showFeeBreakdown, setShowFeeBreakdown] = useState(false);

  const router = useRouter();

  // Initialize promo inputs from cart state
  useEffect(() => {
    if (cartState.items.length > 0) {
      setPromoCodeInputs(prev => {
        const next = { ...prev };
        cartState.items.forEach(item => {
          // If item has a promo code applied but no input state, set it
          // We don't have the code string itself, so we can't pre-fill it for display easily
          // unless we store it. For now, we just rely on the 'applied' state in UI.
          if (!next[item.id]) {
            next[item.id] = { code: '', loading: false, error: '' };
          }
        });
        return next;
      });
    }
  }, [cartState.items]);

  // Derived totals from cartState
  // cartService now handles discount calculations in totals
  const { subtotal, totalDiscount, grandTotal } = useMemo(() => {
    // Parse subtotal from string to float
    const subtotalVal = parseFloat(cartState.totals.subtotal.fiat);

    // Calculate total discount by summing up item discounts
    const totalDiscountVal = cartState.items.reduce((sum, item) => {
      return sum + (parseFloat(item.appliedDiscount || '0'));
    }, 0);

    // Ensure discount doesn't exceed subtotal
    const cappedDiscount = Math.min(totalDiscountVal, subtotalVal);

    const subtotalAfterDiscount = Math.max(0, subtotalVal - cappedDiscount);
    const totalWithGas = subtotalAfterDiscount + gasFee;
    const grandTotalVal = Math.max(0, totalWithGas + (typeof estimatedTax === 'number' ? estimatedTax : 0));

    return {
      subtotal: subtotalVal, // Pre-discount subtotal
      totalDiscount: cappedDiscount,
      grandTotal: grandTotalVal
    };
  }, [cartState, gasFee, estimatedTax]);

  // Calculate tax when profile or cart items change
  useEffect(() => {
    const calculateCartTax = async () => {
      if (!profile || (!profile.shippingCountry && !profile.billingCountry) || cartState.items.length === 0) {
        setEstimatedTax(0);
        return;
      }

      try {
        const taxableItems = cartState.items.map(item => ({
          id: item.id,
          name: item.title || 'Product',
          price: parseFloat(item.price.fiat),
          quantity: item.quantity,
          isDigital: item.isDigital,
          isTaxExempt: false,
          discount: parseFloat(item.appliedDiscount || '0')
        }));

        const address = {
          country: profile.shippingCountry || profile.billingCountry || 'US',
          state: profile.shippingState || profile.billingState,
          city: profile.shippingCity || profile.billingCity,
          postalCode: profile.shippingZipCode || profile.billingZipCode,
          line1: profile.shippingAddress1 || profile.billingAddress1
        };

        const result = await taxService.calculateTax(
          taxableItems,
          address,
          10 // Default shipping cost estimate
        );

        setEstimatedTax(result.taxAmount || 0);
      } catch (error) {
        console.error("Failed to estimate tax:", error);
      }
    };

    calculateCartTax();
  }, [profile, cartState.items]);

  // Load cart logic remains the same...
  useEffect(() => {
    const loadCart = async () => {
      const state = await cartService.getCartState();
      setCartState(state);
    };

    loadCart();

    const unsubscribe = cartService.subscribe((state) => {
      setCartState(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Load saved items
  useEffect(() => {
    const loadSavedItems = async () => {
      const items = await savedForLaterService.getSavedItems();
      setSavedItems(items);
    };

    loadSavedItems();

    const unsubscribe = savedForLaterService.subscribe((items) => {
      setSavedItems(items);
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

  const handleQuantityInputChange = (itemId: string, value: string) => {
    const quantity = parseInt(value);
    if (!isNaN(quantity) && quantity > 0) {
      handleUpdateQuantity(itemId, quantity);
    }
  };

  const handleApplyPromoCode = async (itemId: string) => {
    const inputState = promoCodeInputs[itemId];

    if (!inputState?.code?.trim()) {
      setPromoCodeInputs(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], error: 'Please enter a promo code' }
      }));
      return;
    }

    setPromoCodeInputs(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], loading: true, error: '' }
    }));

    try {
      await cartService.applyPromoCode(itemId, inputState.code);

      setPromoCodeInputs(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], loading: false, error: '' }
      }));
    } catch (error: any) {
      setPromoCodeInputs(prev => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          loading: false,
          error: error.message || 'Failed to apply promo code'
        }
      }));
    }
  };

  const handleRemovePromoCode = async (itemId: string) => {
    try {
      await cartService.removePromoCode(itemId);
      // Clear input on remove
      setPromoCodeInputs(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], code: '', error: '' }
      }));
    } catch (error) {
      console.error('Failed to remove promo code:', error);
    }
  };

  const handlePromoCodeChange = (itemId: string, value: string) => {
    setPromoCodeInputs(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId] || { loading: false, error: '' }, code: value, error: '' }
    }));
  };

  const handleCheckout = () => {
    router.push('/marketplace/checkout');
  };

  const handleContinueShopping = () => {
    router.push('/marketplace');
  };

  const handleSaveForLater = async (itemId: string) => {
    try {
      await savedForLaterService.saveCartItemForLater(itemId);
      // Cart will auto-refresh via subscription
    } catch (error) {
      console.error('Failed to save item for later:', error);
    }
  };

  const handleMoveToCart = async (savedItemId: string) => {
    try {
      await savedForLaterService.moveToCart(savedItemId);
      // Both cart and saved items will auto-refresh via subscriptions
    } catch (error) {
      console.error('Failed to move item to cart:', error);
    }
  };

  const handleRemoveSaved = async (savedItemId: string) => {
    try {
      await savedForLaterService.removeSavedItem(savedItemId);
    } catch (error) {
      console.error('Failed to remove saved item:', error);
    }
  };

  return (
    <Layout title="Shopping Cart | Marketplace" fullWidth={true}>
      <Head>
        <title>Shopping Cart | Marketplace</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4 text-sm">
              <div className="flex items-center text-blue-400 font-medium">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white mr-2">1</div>
                Cart
              </div>
              <div className="w-16 h-0.5 bg-white/20"></div>
              <div className="flex items-center text-white/50">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white mr-2">2</div>
                Address
              </div>
              <div className="w-16 h-0.5 bg-white/20"></div>
              <div className="flex items-center text-white/50">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white mr-2">3</div>
                Payment
              </div>
              <div className="w-16 h-0.5 bg-white/20"></div>
              <div className="flex items-center text-white/50">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white mr-2">4</div>
                Confirmation
              </div>
            </div>
          </div>

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
                    {cartState.items.map((item) => {
                      const inputState = promoCodeInputs[item.id] || { code: '', loading: false, error: '' };
                      const isPromoApplied = !!item.appliedPromoCodeId;

                      return (
                        <div key={item.id} className="p-6">
                          <CartItemCard
                            item={{
                              id: item.id,
                              productId: item.id,
                              title: item.title,
                              description: item.description,
                              image: item.image,
                              currentPrice: parseFloat(item.price.fiat),
                              listPrice: undefined, // Add if available from backend
                              currency: item.price.fiatSymbol,
                              quantity: item.quantity,
                              inventory: item.inventory,
                              seller: item.seller.name,
                              appliedDiscount: item.appliedDiscount,
                              selected: true
                            }}
                            onQuantityChange={(qty) => handleUpdateQuantity(item.id, qty)}
                            onRemove={() => handleRemoveItem(item.id)}
                            onSaveForLater={() => handleSaveForLater(item.cartItemId || item.id)}
                            showSelection={false}
                            isPrime={false}
                            estimatedDeliveryDays={typeof item.shipping.estimatedDays === 'number'
                              ? item.shipping.estimatedDays
                              : parseInt(item.shipping.estimatedDays) || 3}
                          />

                          {/* Promo Code Field for This Item */}
                          <div className="bg-white/5 rounded-lg p-4 border border-white/10 mt-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Tag size={16} className="text-blue-400" />
                              <span className="text-sm font-medium text-white">Promo Code</span>
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={inputState.code}
                                onChange={(e) => handlePromoCodeChange(item.id, e.target.value)}
                                placeholder={isPromoApplied ? "Promo code applied" : "Enter promo code"}
                                disabled={isPromoApplied || inputState.loading}
                                className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                              />
                              {!isPromoApplied ? (
                                <button
                                  onClick={() => handleApplyPromoCode(item.id)}
                                  disabled={inputState.loading || !inputState.code}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
                                >
                                  {inputState.loading ? 'Applying...' : 'Apply'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRemovePromoCode(item.id)}
                                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                            {inputState.error && (
                              <p className="text-red-400 text-xs mt-2">{inputState.error}</p>
                            )}
                            {isPromoApplied && (
                              <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
                                <CheckCircle size={12} />
                                Promo code applied! You save {item.price.fiatSymbol}{parseFloat(item.appliedDiscount || '0').toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Saved For Later Section */}
                {savedItems.length > 0 && (
                  <div className="mt-8">
                    <SavedForLaterSection
                      items={savedItems}
                      onMoveToCart={handleMoveToCart}
                      onRemove={handleRemoveSaved}
                    />
                  </div>
                )}
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 sticky top-8 border border-white/20">
                  <h2 className="text-xl font-semibold text-white mb-4">Order Summary</h2>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between">
                      <span className="text-white/70">Subtotal</span>
                      <span className="font-medium text-white">
                        ${subtotal.toFixed(2)}
                      </span>
                    </div>

                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-green-400">
                        <span className="flex items-center gap-1">
                          <Percent size={14} />
                          Total Discount
                        </span>
                        <span className="font-medium">
                          -${totalDiscount.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-white/70">Shipping</span>
                      <span className="font-medium text-white">
                        {cartState.totals.shipping.fiatSymbol}{cartState.totals.shipping.fiat}
                      </span>
                    </div>

                    {/* Tax Estimate */}
                    <div className="flex justify-between">
                      <span className="text-white/70">Estimated Tax</span>
                      <span className="font-medium text-white">
                        {estimatedTax > 0 ? `$${estimatedTax.toFixed(2)}` : 'Calculated at checkout'}
                      </span>
                    </div>
                    {estimatedTax === 0 && (
                      <div className="text-xs text-white/40 text-right mt-[-8px] mb-2">
                        Log in or fill address to see tax
                      </div>
                    )}

                    {/* Gas Fee Preview */}
                    <div className="flex justify-between items-center group">
                      <span className="text-white/70 flex items-center gap-2">
                        Estimated Gas Fee
                        <button
                          onClick={() => setShowFeeBreakdown(!showFeeBreakdown)}
                          className="text-white/50 hover:text-white transition-colors"
                          aria-label="Show fee breakdown"
                        >
                          <Info size={16} />
                        </button>
                      </span>
                      <span className="font-medium text-white">
                        ${gasFee.toFixed(2)}
                      </span>
                    </div>

                    {showFeeBreakdown && (
                      <div className="bg-white/5 rounded-lg p-3 text-sm space-y-2">
                        <div className="flex justify-between text-white/70">
                          <span>Network Fee</span>
                          <span>${(gasFee * 0.6).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-white/70">
                          <span>Protocol Fee</span>
                          <span>${(gasFee * 0.3).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-white/70">
                          <span>Service Fee</span>
                          <span>${(gasFee * 0.1).toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between pt-3 border-t border-white/20">
                      <span className="text-lg font-semibold text-white">Total</span>
                      <div className="text-right">
                        <span className="text-lg font-semibold text-white">
                          ${grandTotal.toFixed(2)}
                        </span>
                        <div className="text-xs text-white/50">incl. all fees</div>
                      </div>
                    </div>

                    {totalDiscount > 0 && (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm">
                        <div className="flex items-center gap-2 text-green-400">
                          <Tag size={16} />
                          <span className="font-medium">You saved ${totalDiscount.toFixed(2)}!</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleCheckout}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors font-medium mb-3 flex items-center justify-center gap-2"
                  >
                    Proceed to Checkout
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <button
                    onClick={handleContinueShopping}
                    className="w-full bg-white/20 hover:bg-white/30 text-white py-3 rounded-lg transition-colors font-medium border border-white/30"
                  >
                    Continue Shopping
                  </button>

                  {/* Security Badges */}
                  <div className="mt-6 pt-6 border-t border-white/20">
                    <div className="flex items-center justify-center gap-4 text-white/50 text-sm">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Secure Payment</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>Buyer Protection</span>
                      </div>
                    </div>
                  </div>
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