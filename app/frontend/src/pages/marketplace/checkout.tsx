/**
 * Checkout Page - Placeholder for checkout process
 */

import React from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, CreditCard, Wallet } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import Layout from '@/components/Layout';

const CheckoutPage: React.FC = () => {
  const router = useRouter();
  const { state } = useCart();

  const handleBackToCart = () => {
    router.push('/marketplace/cart');
  };

  const handleBackToMarketplace = () => {
    router.push('/marketplace');
  };

  if (state.items.length === 0) {
    return (
      <Layout title="Checkout - LinkDAO Marketplace">
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <GlassPanel variant="secondary" className="text-center py-16">
              <CreditCard className="mx-auto h-16 w-16 text-white/60 mb-6" />
              <h1 className="text-3xl font-bold text-white mb-4">No items to checkout</h1>
              <p className="text-white/70 mb-8 max-w-md mx-auto">
                Your cart is empty. Add some items to your cart before proceeding to checkout.
              </p>
              <Button variant="primary" onClick={handleBackToMarketplace}>
                Continue Shopping
              </Button>
            </GlassPanel>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Checkout - LinkDAO Marketplace">
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              onClick={handleBackToCart}
              className="flex items-center gap-2 text-white/70 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Cart
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white">Checkout</h1>
              <p className="text-white/70">
                Complete your purchase securely with escrow protection
              </p>
            </div>
          </div>

          <GlassPanel variant="secondary" className="p-8 text-center">
            <Wallet className="mx-auto h-16 w-16 text-white/60 mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">Checkout Coming Soon</h2>
            <p className="text-white/70 mb-8 max-w-2xl mx-auto">
              The checkout process is currently under development. This will include:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left">
              <div className="space-y-3">
                <h3 className="font-semibold text-white">Payment Options</h3>
                <ul className="space-y-2 text-white/70 text-sm">
                  <li>• Cryptocurrency payments (ETH, USDC)</li>
                  <li>• Credit card integration</li>
                  <li>• Wallet-to-wallet transfers</li>
                  <li>• Multi-signature escrow</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-white">Security Features</h3>
                <ul className="space-y-2 text-white/70 text-sm">
                  <li>• Smart contract escrow</li>
                  <li>• DAO dispute resolution</li>
                  <li>• On-chain transaction verification</li>
                  <li>• Automated refund protection</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={handleBackToCart}>
                Back to Cart
              </Button>
              <Button variant="primary" onClick={handleBackToMarketplace}>
                Continue Shopping
              </Button>
            </div>
          </GlassPanel>

          {/* Order Summary */}
          <GlassPanel variant="secondary" className="p-6 mt-8">
            <h3 className="text-lg font-semibold text-white mb-4">Order Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-white/70">
                <span>Items ({state.totals.itemCount})</span>
                <span>{state.totals.subtotal.crypto} {state.totals.subtotal.cryptoSymbol}</span>
              </div>
              {parseFloat(state.totals.shipping.crypto) > 0 && (
                <div className="flex justify-between text-white/70">
                  <span>Shipping</span>
                  <span>{state.totals.shipping.crypto} {state.totals.shipping.cryptoSymbol}</span>
                </div>
              )}
              <hr className="border-white/20" />
              <div className="flex justify-between text-white font-semibold">
                <span>Total</span>
                <span>{state.totals.total.crypto} {state.totals.total.cryptoSymbol}</span>
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>
    </Layout>
  );
};

export default CheckoutPage;