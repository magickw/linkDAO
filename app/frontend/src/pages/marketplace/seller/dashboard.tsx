import React from 'react';
import { SellerDashboard } from '@/components/Marketplace/Dashboard/SellerDashboard';
import Layout from '@/components/Layout';
import { useRouter } from 'next/router';

export default function SellerDashboardPage() {
  const router = useRouter();
  
  return (
    <Layout title="Seller Dashboard - LinkDAO Marketplace" fullWidth={true}>
      <SellerDashboard />
    </Layout>
  );
}