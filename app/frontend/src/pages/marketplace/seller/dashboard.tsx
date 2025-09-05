import React from 'react';
import { SellerDashboard } from '@/components/Marketplace/Dashboard/SellerDashboard';
import Layout from '@/components/Layout';
import { useRouter } from 'next/router';

export default function SellerDashboardPage() {
  const router = useRouter();
  const { mockWallet } = router.query;
  
  return (
    <Layout title="Seller Dashboard - LinkDAO Marketplace">
      <SellerDashboard mockWalletAddress={mockWallet as string} />
    </Layout>
  );
}