/**
 * Checkout Page - Complete checkout process with Web3 and traditional payment integration
 */

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { CreditCard } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import Layout from '@/components/Layout';
import CheckoutFlow from '@/components/Checkout/CheckoutFlow';
import OrderTracking from '@/components/Checkout/OrderTracking';

type CheckoutView = 'checkout' | 'tracking';

const CheckoutPage: React.FC = () => {
  const router = useRouter();
  const { state } = useCart();
  const [currentView, setCurrentView] = useState<CheckoutView>('checkout');
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);

  const handleBackToCart = () => {
    router.push('/marketplace/cart');
  };

  const handleBackToMarketplace = () => {
    router.push('/marketplace');
  };

  const handleCheckoutComplete = (orderId: string) => {
    setCompletedOrderId(orderId);
    setCurrentView('tracking');
  };

  const handleBackToCheckout = () => {
    setCurrentView('checkout');
    setCompletedOrderId(null);
  };

  // Handle direct buy loading state
  const isDirectBuy = router.query.product && state.items.length === 0;

  if (isDirectBuy) {
    return (
      <Layout title="Checkout - LinkDAO Marketplace">
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-white">Preparing your checkout...</h2>
          </div>
        </div>
      </Layout>
    );
  }

  // Empty cart state
  if (state.items.length === 0 && currentView === 'checkout') {
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {currentView === 'checkout' ? (
            <CheckoutFlow
              onBack={handleBackToCart}
              onComplete={handleCheckoutComplete}
            />
          ) : (
            completedOrderId && (
              <OrderTracking orderId={completedOrderId} />
            )
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CheckoutPage;