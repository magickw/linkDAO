import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useEnhancedCart } from '@/hooks/useEnhancedCart';
import { Button } from '@/design-system/components/Button';
import { ShoppingCart, Trash2, Heart, Bookmark, Check, X, Tag, ChevronDown, ChevronUp } from 'lucide-react';

type TabType = 'cart' | 'saved' | 'wishlist';

const CartPage: React.FC = () => {
  const router = useRouter();
  const cart = useEnhancedCart();
  const { items, totals, savedForLater, wishlist } = cart.state;
  
  const [activeTab, setActiveTab] = useState<TabType>('cart');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [promoCode, setPromoCode] = useState('');
  const [promoExpanded, setPromoExpanded] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');

  const currentItems = useMemo(() => {
    switch (activeTab) {
      case 'saved':
        return savedForLater;
      case 'wishlist':
        // Wishlist contains only IDs, so return empty array for now
        // In a real app, you'd fetch the full product details from these IDs
        return [];
      default:
        return items;
    }
  }, [activeTab, items, savedForLater, wishlist]);

  const allSelected = currentItems.length > 0 && selectedItems.size === currentItems.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(currentItems.map(item => item.id)));
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkRemove = () => {
    selectedItems.forEach(id => cart.removeItem(id));
    setSelectedItems(new Set());
  };

  const handleBulkSave = () => {
    selectedItems.forEach(id => cart.moveToSaved(id));
    setSelectedItems(new Set());
  };

  const handleBulkWishlist = () => {
    selectedItems.forEach(id => cart.addToWishlist(id));
    setSelectedItems(new Set());
  };

  const handleApplyPromo = () => {
    setPromoError('');
    setPromoSuccess('');
    
    if (!promoCode.trim()) {
      setPromoError('Please enter a promo code');
      return;
    }

    // Mock validation
    if (promoCode.toUpperCase() === 'SAVE10') {
      setPromoSuccess('10% discount applied!');
      setPromoCode('');
    } else {
      setPromoError('Invalid promo code');
    }
  };

  const handleCheckout = () => {
    router.push('/checkout');
  };

  return (
    <Layout title="Your Cart - LinkDAO Marketplace">
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">Marketplace</span>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Shopping Cart</h1>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('cart')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'cart'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Cart ({items.length})
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'saved'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Saved ({savedForLater.length})
            </button>
            <button
              onClick={() => setActiveTab('wishlist')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'wishlist'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Wishlist ({Array.isArray(wishlist) ? wishlist.length : 0})
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
            {/* Items List */}
            <div className="space-y-4">
              {/* Bulk Actions */}
              {currentItems.length > 0 && activeTab === 'cart' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Select all ({currentItems.length})
                    </span>
                  </label>
                  
                  {selectedItems.size > 0 && (
                    <>
                      <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedItems.size} selected
                      </span>
                      <button
                        onClick={handleBulkRemove}
                        className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium flex items-center gap-1"
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                      <button
                        onClick={handleBulkSave}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-medium flex items-center gap-1"
                      >
                        <Bookmark size={14} />
                        Save
                      </button>
                      <button
                        onClick={handleBulkWishlist}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-medium flex items-center gap-1"
                      >
                        <Heart size={14} />
                        Wishlist
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Items */}
              {currentItems.length > 0 ? (
                currentItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm flex gap-4"
                  >
                    {/* Checkbox */}
                    {activeTab === 'cart' && (
                      <div className="flex items-start pt-1">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => handleSelectItem(item.id)}
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {/* Thumbnail - 80px */}
                    <div className="w-20 h-20 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingCart className="text-gray-400 dark:text-gray-500" size={32} />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate mb-1">
                        {item.title}
                      </h3>

                      {/* Seller & Badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          by {item.seller.name}
                        </span>
                        {item.trust.escrowProtected && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                            Escrow
                          </span>
                        )}
                        {item.isDigital && (
                          <span className="px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 text-xs font-medium">
                            Digital
                          </span>
                        )}
                      </div>

                      {/* Price & Quantity */}
                      <div className="flex flex-wrap items-center gap-4 mb-2">
                        <div>
                          <span className="text-base font-bold text-gray-900 dark:text-white">
                            {parseFloat(item.price.crypto).toFixed(4)} {item.price.cryptoSymbol}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                            ≈ ${parseFloat(item.price.fiat).toFixed(2)}
                          </span>
                        </div>

                        {activeTab === 'cart' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              -
                            </button>
                            <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                              disabled={item.inventory !== undefined && item.quantity >= item.inventory}
                              className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-3">
                        {activeTab === 'cart' && (
                          <>
                            <button
                              onClick={() => cart.moveToSaved(item.id)}
                              className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 flex items-center gap-1"
                            >
                              <Bookmark size={12} />
                              Save
                            </button>
                            <button
                              onClick={() => cart.addToWishlist(item.id)}
                              disabled={cart.isInWishlist(item.id)}
                              className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 flex items-center gap-1 disabled:opacity-50"
                            >
                              <Heart size={12} />
                              {cart.isInWishlist(item.id) ? 'In wishlist' : 'Wishlist'}
                            </button>
                          </>
                        )}
                        {activeTab === 'saved' && (
                          <button
                            onClick={() => cart.restoreFromSaved(item.id)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                          >
                            Move to cart
                          </button>
                        )}
                        <button
                          onClick={() => cart.removeItem(item.id)}
                          className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1"
                        >
                          <Trash2 size={12} />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-12 shadow-sm text-center">
                  <ShoppingCart size={64} className="mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {activeTab === 'cart' && 'Your cart is empty'}
                    {activeTab === 'saved' && 'No saved items'}
                    {activeTab === 'wishlist' && 'Your wishlist is empty'}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Browse the marketplace to find products you love.
                  </p>
                  <Button variant="primary" onClick={() => router.push('/marketplace')}>
                    Browse Marketplace
                  </Button>
                </div>
              )}
            </div>

            {/* Order Summary */}
            {activeTab === 'cart' && items.length > 0 && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm sticky top-4 space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Order summary</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Taxes and fees calculated at checkout</p>
                  </div>

                  {/* Promo Code */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <button
                      onClick={() => setPromoExpanded(!promoExpanded)}
                      className="flex items-center justify-between w-full text-sm font-medium text-gray-900 dark:text-white"
                    >
                      <span className="flex items-center gap-2">
                        <Tag size={16} />
                        Have a promo code?
                      </span>
                      {promoExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    
                    {promoExpanded && (
                      <div className="mt-3 space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value)}
                            placeholder="Enter code"
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={handleApplyPromo}
                            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                          >
                            Apply
                          </button>
                        </div>
                        {promoError && (
                          <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                            <X size={12} />
                            {promoError}
                          </p>
                        )}
                        {promoSuccess && (
                          <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <Check size={12} />
                            {promoSuccess}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Totals */}
                  <div className="space-y-3 text-sm border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Subtotal</span>
                      <span>{totals.subtotal.toFixed(4)} ETH</span>
                    </div>
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Shipping</span>
                      <span>{totals.shipping.toFixed(4)} ETH</span>
                    </div>
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Escrow fee</span>
                      <span>{totals.escrowFees.toFixed(4)} ETH</span>
                    </div>
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Taxes</span>
                      <span>{totals.taxes.toFixed(4)} ETH</span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between text-gray-900 dark:text-white font-semibold text-base">
                      <span>Total</span>
                      <span>{totals.total.toFixed(4)} ETH</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleCheckout}
                  >
                    Proceed to checkout
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/marketplace')}
                  >
                    Continue shopping
                  </Button>
                </div>

                {/* Trust Info */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Why LinkDAO checkout?</h3>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-start gap-2">
                      <Check size={16} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <span>On-chain escrow for safe settlement</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={16} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <span>NFT purchase receipts unlock governance perks</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={16} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <span>DAO arbitration within 72 hours</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CartPage;
