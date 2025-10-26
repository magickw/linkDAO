/**
 * Test page for Product Detail Page component
 */

import React from 'react';
import { ProductDetailPageManualTest } from '@/components/Marketplace/ProductDisplay/__tests__/ProductDetailPage.manual.test';
import Layout from '@/components/Layout';

const ProductDetailTestPage: React.FC = () => {
  return (
    <Layout title="Product Detail Test" fullWidth={true}>
      <ProductDetailPageManualTest />
    </Layout>
  );
};

export default ProductDetailTestPage;