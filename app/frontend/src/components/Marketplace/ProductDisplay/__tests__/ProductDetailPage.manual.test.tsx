/**
 * Manual Test Component for ProductDetailPage
 * This component can be used to manually test the ProductDetailPage component
 */

import React from 'react';
import ProductDetailPage from '@/components/Marketplace/ProductDisplay/ProductDetailPage';
import { mockProducts } from '@/data/mockProducts';

export const ProductDetailPageManualTest: React.FC = () => {
  const [selectedProductId, setSelectedProductId] = React.useState('1');
  
  const selectedProduct = mockProducts.find(p => p.id === selectedProductId) || mockProducts[0];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Product Detail Page Manual Test</h1>
      
      <div className="mb-4">
        <label className="mr-2">Select Product:</label>
        <select 
          value={selectedProductId} 
          onChange={(e) => setSelectedProductId(e.target.value)}
          className="border p-2 rounded"
        >
          {mockProducts.map(product => (
            <option key={product.id} value={product.id}>
              {product.title}
            </option>
          ))}
        </select>
      </div>
      
      <div className="border p-4 rounded">
        <ProductDetailPage
          product={selectedProduct}
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
    </div>
  );
};

export default ProductDetailPageManualTest;