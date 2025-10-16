import React, { useMemo } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useEnhancedCart } from '@/hooks/useEnhancedCart';
import EnhancedCheckoutFlow from '@/components/Marketplace/Payment/EnhancedCheckoutFlow';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';

const RECENT_ORDERS_KEY = 'linkdao_recent_orders';

const CheckoutPage: React.FC = () => {
  const router = useRouter();
  const cart = useEnhancedCart();
  const { items } = cart.state;

  const checkoutItems = useMemo(() => {
    return items.map((item) => ({
      id: item.id,
      title: item.title,
      price: item.price,
      seller: item.seller,
      image: item.image,
      quantity: item.quantity,
      isDigital: item.isDigital,
      escrowProtected: item.trust.escrowProtected,
      shippingCost: item.shipping.cost,
      estimatedDelivery: item.shipping.estimatedDays,
    }));
  }, [items]);

  const handleComplete = (orderData: any) => {
    if (typeof window !== 'undefined') {
      const existing = sessionStorage.getItem(RECENT_ORDERS_KEY);
      const parsed = existing ? JSON.parse(existing) : [];
      const orderRecord = {
        ...orderData,
        status: 'PROCESSING',
        createdAt: new Date().toISOString(),
      };
      sessionStorage.setItem(
        RECENT_ORDERS_KEY,
        JSON.stringify([orderRecord, ...parsed].slice(0, 25))
      );
    }

    cart.clearCart();
    router.push(`/marketplace/orders/${orderData.id}?source=checkout`);
  };

  if (checkoutItems.length === 0) {
    return (
      <Layout title="Checkout - LinkDAO Marketplace" fullWidth={true}>
        <GlassPanel variant="primary" className="max-w-2xl mx-auto p-12 text-center space-y-6">
          <h1 className="text-3xl font-bold text-white">Your cart is empty</h1>
          <p className="text-white/70 text-lg">
            Add products to your cart before continuing to checkout.
          </p>
          <Button variant="primary" onClick={() => router.push('/marketplace')}>
            Back to Marketplace
          </Button>
        </GlassPanel>
      </Layout>
    );
  }

  return (
    <Layout title="Secure Checkout - LinkDAO Marketplace" fullWidth={true}>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-white">
        <div className="space-y-2">
          <span className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Checkout
          </span>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Complete your purchase
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl">
            Escrow-protected payments, DAO-backed dispute resolution, and NFT receipts ensure
            every order is trustworthy.
          </p>
        </div>

        <div className="bg-white/10 rounded-2xl p-6">
          <EnhancedCheckoutFlow
          cartItems={checkoutItems}
          onComplete={handleComplete}
          onCancel={() => router.push('/marketplace/cart')}
        />
        </div>

        <GlassPanel variant="secondary" className="p-6 space-y-3">
          <h2 className="text-xl font-semibold text-white">Need help?</h2>
          <p className="text-white/70">
            Questions about escrow, shipping, or disputes? Visit our support center for detailed
            guides and contact options.
          </p>
          <Button variant="outline" onClick={() => router.push('/support/disputes')}>
            Open Support Center
          </Button>
        </GlassPanel>
        </div>
      </div>
    </Layout>
  );
};

export default CheckoutPage;