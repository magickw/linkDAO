import React from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import SellerStorePage from '@/components/Marketplace/Seller/SellerStorePage';

export default function SellerStorePageRoute() {
  const router = useRouter();
  const { sellerId } = router.query;

  // Handle product navigation from store page
  const handleProductClick = (productId: string) => {
    router.push(`/marketplace/listing/${productId}`);
  };

  if (!sellerId || typeof sellerId !== 'string') {
    return (
      <Layout title="Seller Store - LinkDAO Marketplace" fullWidth={true}>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4"></div>
            <div className="text-white text-xl mb-2">Loading seller store...</div>
            <div className="text-white/70 text-sm">Please wait while we prepare the store</div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`Seller Store - LinkDAO Marketplace`} fullWidth={true}>
      <SellerStorePage 
        sellerId={sellerId} 
        onProductClick={handleProductClick}
      />
    </Layout>
  );
}