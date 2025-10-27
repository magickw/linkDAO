import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import ProductDetailPage from '@/components/Marketplace/ProductDisplay/ProductDetailPage';
import { marketplaceService } from '@/services/marketplaceService';
import { Product } from '@/services/marketplaceService';
import Layout from '@/components/Layout';
import { mockProducts } from '@/data/mockProducts';

const ProductPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (id && typeof id === 'string') {
        try {
          setLoading(true);
          setError(null);
          
          // First try to fetch from marketplace service
          let productData = null;
          try {
            productData = await marketplaceService.getListingByIdWithRetry(id);
          } catch (serviceError) {
            console.warn('Marketplace service unavailable, trying mock API:', serviceError);
          }
          
          if (productData) {
            // Transform the product data to match the ProductDetailPage component interface
            const transformedProduct = {
              id: productData.id,
              title: productData.title,
              description: productData.description,
              longDescription: productData.description,
              price: {
                crypto: productData.priceAmount.toString(),
                cryptoSymbol: 'ETH',
                fiat: (productData.priceAmount * 2400).toFixed(2), // Rough conversion
                fiatSymbol: 'USD'
              },
              seller: {
                id: productData.seller?.id || productData.sellerId,
                name: productData.seller?.displayName || productData.seller?.storeName || 'Unknown Seller',
                avatar: productData.seller?.profileImageUrl || '/images/default-avatar.png',
                verified: productData.seller?.verified || false,
                reputation: productData.seller?.reputation || 0,
                daoApproved: productData.seller?.daoApproved || false,
                totalSales: 0, // Not available in current data structure
                memberSince: '2023-01-01', // Default value
                responseTime: '< 24 hours' // Default value
              },
              trust: {
                verified: productData.trust?.verified || false,
                escrowProtected: productData.trust?.escrowProtected || false,
                onChainCertified: productData.trust?.onChainCertified || false
              },
              specifications: productData.metadata?.specifications || {},
              category: productData.category?.name || 'General',
              tags: productData.tags || [],
              inventory: productData.inventory || 0,
              shipping: {
                freeShipping: productData.shipping?.free || false,
                estimatedDays: productData.shipping?.estimatedDays || '3-5 business days',
                cost: productData.shipping?.cost
              },
              reviews: {
                average: productData.seller?.rating || 0,
                count: 0 // Not available in current data structure
              },
              media: productData.images?.map((url: string) => ({
                type: 'image' as const,
                url,
                thumbnail: url,
                alt: productData.title
              })) || [
                {
                  type: 'image' as const,
                  url: 'https://placehold.co/600x400/667eea/ffffff?text=Product',
                  thumbnail: 'https://placehold.co/150x150/667eea/ffffff?text=Product',
                  alt: productData.title
                }
              ]
            };
            
            setProduct(transformedProduct);
          } else {
            // Try mock API endpoint as fallback
            try {
              const response = await fetch(`/api/products/${id}`);
              if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                  setProduct(result.data);
                  return;
                }
              }
            } catch (apiError) {
              console.warn('Mock API unavailable, using static mock data:', apiError);
            }
            
            // Use static mock data as final fallback
            const mockProduct = mockProducts.find(p => p.id === id);
            if (mockProduct) {
              setProduct(mockProduct);
            } else {
              setError('Product not found');
            }
          }
        } catch (err) {
          console.error('Error fetching product:', err);
          // Final fallback to mock data on error
          const mockProduct = mockProducts.find(p => p.id === id);
          if (mockProduct) {
            setProduct(mockProduct);
          } else {
            setError('Failed to load product details');
          }
        } finally {
          setLoading(false);
        }
      }
    };

    fetchProduct();
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Product</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => router.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
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
          <button 
            onClick={() => router.push('/marketplace')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Browse Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout title={`${product.title} | Marketplace`} fullWidth={true}>
      <Head>
        <title>{product.title} | Marketplace</title>
        <meta name="description" content={product.description} />
      </Head>
      
      <ProductDetailPage
        product={product}
        onAddToCart={(productId, quantity) => {
          console.log('Add to cart:', { productId, quantity });
          // TODO: Implement add to cart functionality
          alert('Added to cart!');
        }}
        onBuyNow={async (productId, quantity) => {
          console.log('Buy now:', { productId, quantity });
          // TODO: Implement buy now functionality
          alert('Redirecting to checkout...');
          // Redirect to checkout page
          router.push('/marketplace/checkout');
        }}
        onAddToWishlist={(productId) => {
          console.log('Add to wishlist:', productId);
          // TODO: Implement add to wishlist functionality
          alert('Added to wishlist!');
        }}
        onContactSeller={(sellerId) => {
          console.log('Contact seller:', sellerId);
          // TODO: Implement contact seller functionality
          alert('Opening seller contact...');
          // Redirect to messaging page
          router.push(`/messages?to=${sellerId}`);
        }}
        onViewSellerProfile={(sellerId) => {
          console.log('View seller profile:', sellerId);
          // TODO: Implement view seller profile functionality
          alert('Opening seller profile...');
          // Redirect to seller profile page
          router.push(`/seller/${sellerId}`);
        }}
      />
    </Layout>
  );
};

export default ProductPage;