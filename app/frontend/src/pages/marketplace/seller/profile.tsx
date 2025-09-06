import React from 'react';
import { SellerProfilePage } from '@/components/Marketplace/Seller/SellerProfilePage';
import Layout from '@/components/Layout';

export default function SellerProfilePageRoute() {
  return (
    <Layout title="Seller Profile - LinkDAO Marketplace">
      <SellerProfilePage />
    </Layout>
  );
}