/**
 * Public Seller Store Page Route
 * Displays seller information, listings, and purchase functionality for buyers
 */

import React from 'react';
import { useRouter } from 'next/router';
import { SellerStorePage } from '@/components/Marketplace/Seller/SellerStorePage';
import { EnhancedCartProvider } from '@/hooks/useEnhancedCart';
import Layout from '@/components/Layout';
import { designTokens } from '@/design-system/tokens';

export default function SellerStoreRoute() {
  const router = useRouter();
  const { sellerId } = router.query;

  const handleContactSeller = (sellerWalletAddress: string) => {
    // In a real implementation, this would open a messaging interface
    // For now, we'll redirect to a contact form or show a message
    console.log('Contact seller:', sellerWalletAddress);
    // Could redirect to: router.push(`/messages/new?recipient=${sellerWalletAddress}`);
  };

  if (!sellerId || typeof sellerId !== 'string') {
    return (
      <Layout title="Store - LinkDAO Marketplace">
        <div className="min-h-screen flex items-center justify-center">
          <div
            className="fixed inset-0 z-0"
            style={{ background: designTokens.gradients.heroMain }}
          />
          <div className="relative z-10 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Invalid Store ID</h1>
            <button
              onClick={() => router.push('/marketplace')}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Back to Marketplace
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`Store - LinkDAO Marketplace`}>
      <div
        className="min-h-screen"
        style={{ background: designTokens.gradients.heroMain }}
      >
        <EnhancedCartProvider>
          <SellerStorePage
            sellerId={sellerId}
            onContactSeller={handleContactSeller}
          />
        </EnhancedCartProvider>
      </div>
    </Layout>
  );
}