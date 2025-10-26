/**
 * Product Detail Page Route - Marketplace product detail view
 * Correctly routed under /marketplace/listing/[productId]
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import ProductDetailPage from '@/components/Marketplace/ProductDisplay/ProductDetailPage';
import { marketplaceService } from '@/services/marketplaceService';
import { mockProducts } from '@/data/mockProducts';
import { cartService } from '@/services/cartService';
import { wishlistService } from '@/services/wishlistService';
import Layout from '@/components/Layout';

const ProductDetailPageRoute: React.FC = () => {
  const router = useRouter();
  const { productId } = router.query;
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (productId && typeof productId === 'string') {
        try {
          setLoading(true);
          setError(null);
          
          // First try to fetch from marketplace service
          let productData = null;
          try {
            productData = await marketplaceService.getListingByIdWithRetry(productId);
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
              const response = await fetch(`/api/products/${productId}`);
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
            const mockProduct = mockProducts.find(p => p.id === productId);
            if (mockProduct) {
              setProduct(mockProduct);
            } else {
              setError('Product not found');
            }
          }
        } catch (err) {
          console.error('Error fetching product:', err);
          // Final fallback to mock data on error
          const mockProduct = mockProducts.find(p => p.id === productId);
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
  }, [productId]);

  if (loading) {
    return (
      <Layout title="Loading Product | Marketplace" fullWidth={true}>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 max-w-md w-full mx-4">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/30 border-t-white mx-auto mb-4"></div>
            <h2 className="text-2xl font-semibold text-white mb-2">Loading Product</h2>
            <p className="text-white/70">Please wait while we fetch the product details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Error Loading Product | Marketplace" fullWidth={true}>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 max-w-md w-full mx-4">
            <h2 className="text-2xl font-semibold text-white mb-2">Error Loading Product</h2>
            <p className="text-white/70 mb-6">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={() => router.reload()}
                className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors border border-white/30"
              >
                Try Again
              </button>
              <button 
                onClick={() => router.push('/marketplace')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Back to Marketplace
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout title="Product Not Found | Marketplace" fullWidth={true}>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 max-w-md w-full mx-4">
            <h2 className="text-2xl font-semibold text-white mb-2">Product Not Found</h2>
            <p className="text-white/70 mb-6">The requested product could not be found.</p>
            <button 
              onClick={() => router.push('/marketplace')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Browse Marketplace
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`${product.title} | Marketplace`} fullWidth={true}>
      <Head>
        <title>{product.title} | Marketplace</title>
        <meta name="description" content={product.description} />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back button */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/marketplace')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20"
            >
              ← Back to Marketplace
            </button>
          </div>
          
          <ProductDetailPage
            product={product}
            onAddToCart={(productId, quantity) => {
              console.log('Add to cart:', { productId, quantity });
              
              // Transform product data for cart service
              const cartItem = {
                id: product.id,
                title: product.title,
                description: product.description,
                image: product.media[0]?.url || '',
                price: product.price,
                seller: {
                  id: product.seller.id,
                  name: product.seller.name,
                  avatar: product.seller.avatar,
                  verified: product.seller.verified,
                  daoApproved: product.seller.daoApproved,
                  escrowSupported: product.trust.escrowProtected
                },
                category: product.category,
                isDigital: product.isNFT || false,
                isNFT: product.isNFT || false,
                inventory: product.inventory || 0,
                shipping: product.shipping,
                trust: product.trust
              };
              
              // Add to cart
              cartService.addItemSync(cartItem, quantity);
              
              // Show confirmation
              if (typeof window !== 'undefined') {
                alert(`Added ${quantity} ${product.title} to your cart!`);
              }
            }}
            onBuyNow={async (productId, quantity) => {
              console.log('Buy now:', { productId, quantity });
              
              // Transform product data for cart service
              const cartItem = {
                id: product.id,
                title: product.title,
                description: product.description,
                image: product.media[0]?.url || '',
                price: product.price,
                seller: {
                  id: product.seller.id,
                  name: product.seller.name,
                  avatar: product.seller.avatar,
                  verified: product.seller.verified,
                  daoApproved: product.seller.daoApproved,
                  escrowSupported: product.trust.escrowProtected
                },
                category: product.category,
                isDigital: product.isNFT || false,
                isNFT: product.isNFT || false,
                inventory: product.inventory || 0,
                shipping: product.shipping,
                trust: product.trust
              };
              
              // Add to cart first
              cartService.addItemSync(cartItem, quantity);
              
              // Redirect to checkout page
              router.push(`/marketplace/checkout?product=${productId}&quantity=${quantity}`);
            }}
            onAddToWishlist={(productId) => {
              console.log('Add to wishlist:', productId);
              
              // Check if already in wishlist
              if (wishlistService.isInWishlist(productId)) {
                if (typeof window !== 'undefined') {
                  alert(`${product.title} is already in your wishlist!`);
                }
                return;
              }
              
              // Transform product data for wishlist service
              const wishlistItem = {
                id: product.id,
                title: product.title,
                description: product.description,
                image: product.media[0]?.url || '',
                price: product.price,
                seller: {
                  id: product.seller.id,
                  name: product.seller.name,
                  avatar: product.seller.avatar
                },
                category: product.category,
                isDigital: product.isNFT || false,
                isNFT: product.isNFT || false,
                inventory: product.inventory || 0
              };
              
              // Add to wishlist
              wishlistService.addItem(wishlistItem);
              
              // Show confirmation
              if (typeof window !== 'undefined') {
                alert(`Added ${product.title} to your wishlist!`);
              }
            }}
            onContactSeller={(sellerId) => {
              console.log('Contact seller:', sellerId);
              
              // Redirect to messaging page with seller pre-selected
              router.push(`/messages?to=${encodeURIComponent(sellerId)}`);
            }}
            onViewSellerProfile={(sellerId) => {
              console.log('View seller profile:', sellerId);
              
              // Redirect to seller profile page
              router.push(`/marketplace/seller/store/${encodeURIComponent(sellerId)}`);
            }}
          />
        </div>
      </div>
    </Layout>
  );
};

export default ProductDetailPageRoute;