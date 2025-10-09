import React from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useEnhancedCart } from '@/hooks/useEnhancedCart';
import { Button, GlassPanel } from '@/design-system';
import { ShoppingCart, ArrowRight, ArrowLeft, Trash2 } from 'lucide-react';

const CartPage: React.FC = () => {
  const router = useRouter();
  const cart = useEnhancedCart();
  const { items, totals, savedForLater, wishlist } = cart.state;
  const hasItems = items.length > 0;

  const handleCheckout = () => {
    router.push('/checkout');
  };

  return (
    <Layout title="Your Cart - LinkDAO Marketplace">
      <div className="space-y-12">
        <div className="flex flex-col gap-4">
          <span className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">Marketplace</span>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Shopping Cart</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl">
            Review your selections, adjust quantities, and move items between your cart, wishlist, and saved list before checkout.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-10">
          <div className="space-y-6">
            {hasItems ? (
              items.map((item) => (
                <GlassPanel key={item.id} variant="secondary" className="p-6">
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="w-full sm:w-40 h-40 bg-white/5 rounded-lg overflow-hidden flex items-center justify-center">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingCart className="text-white/60" size={36} />
                      )}
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="flex flex-col gap-2">
                        <h2 className="text-xl font-semibold text-white">{item.title}</h2>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
                          <span>Seller: {item.seller.name}</span>
                          {item.trust.escrowProtected && <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-200">Escrow Protected</span>}
                          {item.isDigital && <span className="px-2 py-1 rounded-full bg-sky-500/20 text-sky-200">Digital Delivery</span>}
                        </div>
                      </div>

                      <p className="text-white/80 text-sm line-clamp-3 max-w-3xl">
                        {item.description || 'This seller has not provided a detailed description yet.'}
                      </p>

                      <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-semibold text-white">
                            {parseFloat(item.price.crypto).toFixed(4)} {item.price.cryptoSymbol}
                          </span>
                          <span className="text-sm text-white/60">
                            ≈ {item.price.fiatSymbol}
                            {parseFloat(item.price.fiat).toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            className="w-9 h-9 flex items-center justify-center"
                            onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            -
                          </Button>
                          <span className="text-white text-lg font-medium w-10 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            className="w-9 h-9 flex items-center justify-center"
                            onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.inventory !== undefined && item.quantity >= item.inventory}
                          >
                            +
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                        <button
                          className="flex items-center gap-2 hover:text-white transition"
                          onClick={() => cart.moveToSaved(item.id)}
                        >
                          <ArrowLeft size={16} />
                          Save for later
                        </button>
                        <button
                          className="flex items-center gap-2 hover:text-white transition"
                          onClick={() => cart.addToWishlist(item.id)}
                          disabled={cart.isInWishlist(item.id)}
                        >
                          <ArrowRight size={16} />
                          {cart.isInWishlist(item.id) ? 'In wishlist' : 'Move to wishlist'}
                        </button>
                        <button
                          className="flex items-center gap-2 text-red-300 hover:text-red-200 transition"
                          onClick={() => cart.removeItem(item.id)}
                        >
                          <Trash2 size={16} />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </GlassPanel>
              ))
            ) : (
              <GlassPanel variant="primary" className="p-12 text-center">
                <ShoppingCart size={64} className="mx-auto text-white/60 mb-6" />
                <h2 className="text-2xl font-semibold text-white mb-2">Your cart is empty</h2>
                <p className="text-white/70 mb-6 max-w-xl mx-auto">
                  Discover curated products and DAO-backed sellers in the marketplace. Add items to your cart to see them here.
                </p>
                <Button variant="primary" onClick={() => router.push('/marketplace')}>
                  Browse Marketplace
                </Button>
              </GlassPanel>
            )}

            {savedForLater.length > 0 && (
              <GlassPanel variant="secondary" className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Saved for later</h3>
                  <span className="text-sm text-white/60">{savedForLater.length} item(s)</span>
                </div>
                <div className="grid gap-4">
                  {savedForLater.map((item) => (
                    <div key={item.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <p className="text-white font-medium">{item.title}</p>
                        <p className="text-white/60 text-sm">{parseFloat(item.price.crypto).toFixed(4)} {item.price.cryptoSymbol}</p>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="primary"
                          onClick={() => cart.restoreFromSaved(item.id)}
                        >
                          Move to cart
                        </Button>
                        <Button variant="outline" onClick={() => cart.addToWishlist(item.id)}>
                          Move to wishlist
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassPanel>
            )}

            {wishlist.length > 0 && (
              <GlassPanel variant="secondary" className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Wishlist</h3>
                  <span className="text-sm text-white/60">{wishlist.length} item(s)</span>
                </div>
                <p className="text-white/70 text-sm">
                  Items in your wishlist stay synced to your wallet identity. Move them to cart any time.
                </p>
              </GlassPanel>
            )}
          </div>

          <div className="space-y-6">
            <GlassPanel variant="primary" className="p-6 space-y-6 sticky top-28">
              <div>
                <h2 className="text-xl font-semibold text-white">Order summary</h2>
                <p className="text-white/60 text-sm">See taxes and gas fees at checkout.</p>
              </div>

              <div className="space-y-3 text-sm text-white/70">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{totals.subtotal.toFixed(4)} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{totals.shipping.toFixed(4)} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span>Escrow fee</span>
                  <span>{totals.escrowFees.toFixed(4)} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes</span>
                  <span>{totals.taxes.toFixed(4)} ETH</span>
                </div>
                <div className="border-t border-white/20 pt-3 flex justify-between text-white font-semibold text-base">
                  <span>Total due</span>
                  <span>{totals.total.toFixed(4)} ETH</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleCheckout}
                  disabled={!hasItems}
                >
                  Proceed to checkout
                </Button>
                <Button variant="outline" className="w-full" onClick={() => router.push('/marketplace')}>
                  Continue shopping
                </Button>
              </div>
            </GlassPanel>

            <GlassPanel variant="secondary" className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white">Why LinkDAO checkout?</h3>
              <ul className="space-y-2 text-sm text-white/70">
                <li>• On-chain escrow for safe settlement between buyers and sellers.</li>
                <li>• NFT purchase receipts unlock governance perks.</li>
                <li>• Dispute resolution by DAO arbitrators within 72 hours.</li>
              </ul>
            </GlassPanel>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CartPage;
