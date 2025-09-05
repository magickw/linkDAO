import React from 'react';
import { SellerDashboard } from '@/components/Marketplace/Dashboard/SellerDashboard';
import Layout from '@/components/Layout';

export default function SellerDashboardPage() {
  return (
    <Layout title="Seller Dashboard - LinkDAO Marketplace">
      <SellerDashboard />
    </Layout>
  );
}