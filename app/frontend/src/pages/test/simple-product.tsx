/**
 * Simple Product Test Page - Test the ProductDetailPage component directly
 */

import React from 'react';
import ProductDetailPage from '@/components/Marketplace/ProductDisplay/ProductDetailPage';
import Layout from '@/components/Layout';
import { mockProducts } from '@/data/mockProducts';

const SimpleProductTest: React.FC = () => {
  const product = mockProducts[0]; // Use the first mock product

  return (
    <Layout title="Simple Product Test" fullWidth={true}>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Simple Product Test</h1>
        <ProductDetailPage
          product={product}
          onAddToCart={(productId, quantity) => {
            console.log('Add to cart:', { productId, quantity });
            alert(`Added ${quantity} of product ${productId} to cart!`);
          }}
          onBuyNow={async (productId, quantity) => {
            console.log('Buy now:', { productId, quantity });
            alert(`Buying ${quantity} of product ${productId} now!`);
          }}
          onAddToWishlist={(productId) => {
            console.log('Add to wishlist:', productId);
            alert(`Added product ${productId} to wishlist!`);
          }}
          onContactSeller={(sellerId) => {
            console.log('Contact seller:', sellerId);
            alert(`Contacting seller ${sellerId}...`);
          }}
          onViewSellerProfile={(sellerId) => {
            console.log('View seller profile:', sellerId);
            alert(`Viewing profile for seller ${sellerId}...`);
          }}
        />
      </div>
    </Layout>
  );
};

export default SimpleProductTest;