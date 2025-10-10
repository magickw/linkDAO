/**
 * Public Seller Store Page Route
 * Displays enhanced seller information, listings, and purchase functionality for buyers
 */

import React from 'react';
import { useRouter } from 'next/router';
import { EnhancedCartProvider } from '@/hooks/useEnhancedCart';
import Layout from '@/components/Layout';
import SellerStorePage from '@/components/Marketplace/Seller/SellerStorePage';

export default function SellerStoreRoute() {
  const router = useRouter();
  const { sellerId } = router.query;

  if (!sellerId || typeof sellerId !== 'string') {
    return (
      <Layout title="Store - LinkDAO Marketplace" fullWidth={true}>
        <div className="min-h-screen flex items-center justify-center">
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
    <Layout title={`Store - LinkDAO Marketplace`} fullWidth={true}>
      <EnhancedCartProvider>
        <SellerStorePage sellerId={sellerId} />
      </EnhancedCartProvider>
    </Layout>
  );
}