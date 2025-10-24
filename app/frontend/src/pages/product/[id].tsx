import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import ProductDetailPage from '@/components/Marketplace/ProductDisplay/ProductDetailPage';

const ProductPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      // Mock product data for immediate functionality
      const mockProduct = {
        id: id as string,
        title: 'Premium Wireless Headphones',
        description: 'High-quality wireless headphones with noise cancellation',
        longDescription: 'Experience premium sound quality with these wireless headphones featuring active noise cancellation, 30-hour battery life, and premium comfort design.',
        price: {
          crypto: '0.1245',
          cryptoSymbol: 'ETH',
          fiat: '298.80',
          fiatSymbol: 'USD'
        },
        seller: {
          id: '0x1234567890123456789012345678901234567890',
          name: 'TechStore Pro',
          avatar: '/images/default-avatar.png',
          verified: true,
          reputation: 4.8,
          daoApproved: true,
          totalSales: 1247,
          memberSince: '2023-01-15',
          responseTime: '< 2 hours'
        },
        trust: {
          verified: true,
          escrowProtected: true,
          onChainCertified: true
        },
        specifications: {
          'Brand': 'AudioTech',
          'Model': 'AT-WH1000',
          'Battery Life': '30 hours',
          'Connectivity': 'Bluetooth 5.0',
          'Weight': '250g'
        },
        category: 'Electronics',
        tags: ['audio', 'wireless', 'premium'],
        inventory: 15,
        shipping: {
          freeShipping: true,
          estimatedDays: '3-5 business days'
        },
        reviews: {
          average: 4.8,
          count: 124
        },
        media: [
          {
            type: 'image' as const,
            url: 'https://placehold.co/600x400/667eea/ffffff?text=Headphones',
            thumbnail: 'https://placehold.co/150x150/667eea/ffffff?text=Headphones',
            alt: 'Premium Wireless Headphones'
          }
        ]
      };
      
      setProduct(mockProduct);
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Product</h2>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Product Not Found</h2>
          <p className="text-gray-600">The requested product could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{product.title} | Marketplace</title>
        <meta name="description" content={product.description} />
      </Head>
      
      <ProductDetailPage
        product={product}
        onAddToCart={(productId, quantity) => {
          console.log('Add to cart:', { productId, quantity });
          alert('Added to cart!');
        }}
        onBuyNow={(productId, quantity) => {
          console.log('Buy now:', { productId, quantity });
          alert('Redirecting to checkout...');
        }}
        onAddToWishlist={(productId) => {
          console.log('Add to wishlist:', productId);
          alert('Added to wishlist!');
        }}
        onContactSeller={(sellerId) => {
          console.log('Contact seller:', sellerId);
          alert('Opening seller contact...');
        }}
        onViewSellerProfile={(sellerId) => {
          console.log('View seller profile:', sellerId);
          alert('Opening seller profile...');
        }}
      />
    </>
  );
};

export default ProductPage;