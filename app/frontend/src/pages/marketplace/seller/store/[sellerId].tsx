import React from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import SellerStorePage from '@/components/Marketplace/Seller/SellerStorePage';

export default function SellerStorePageRoute() {
  const router = useRouter();
  const { sellerId } = router.query;

  if (!sellerId || typeof sellerId !== 'string') {
    return (
      <Layout title="Seller Store - LinkDAO Marketplace" fullWidth={true}>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="text-white text-xl">Loading seller store...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Seller Store - LinkDAO Marketplace" fullWidth={true}>
      <SellerStorePage sellerId={sellerId} />
    </Layout>
  );
}