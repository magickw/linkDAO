/**
 * Product Detail Page Route - Marketplace product detail view
 * Correctly routed under /marketplace/listing/[productId]
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ProductDetailPage from '@/components/Marketplace/ProductDisplay/ProductDetailPage';
import { marketplaceService } from '@/services/marketplaceService';
import { mockProducts } from '@/data/mockProducts';
import { cartService } from '@/services/cartService';
import { wishlistService } from '@/services/wishlistService';
import Layout from '@/components/Layout';
import SEOHead from '@/components/SEO/SEOHead';

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
            // Get the price - handle both `price` and `priceAmount` fields
            const priceValue = productData.price ?? productData.priceAmount ?? 0;
            const priceNum = typeof priceValue === 'string' ? parseFloat(priceValue) : priceValue;

            // Get currency - default to USD if not specified
            const currency = productData.currency || productData.priceCurrency || 'USD';

            // Calculate crypto/fiat values based on currency
            // If price is in USD, show USD as fiat and calculate ETH equivalent
            // If price is in ETH, show ETH as crypto and calculate USD equivalent
            const ethPrice = 2400; // Rough ETH price for conversion
            let cryptoValue: string;
            let cryptoSymbol: string;
            let fiatValue: string;
            let fiatSymbol: string;
            let primaryCurrency: 'crypto' | 'fiat' = 'crypto';

            if (currency === 'USD' || currency === 'USDC' || currency === 'USDT') {
              // Price is in USD-based currency
              cryptoValue = (priceNum / ethPrice).toFixed(6);
              cryptoSymbol = 'ETH';
              fiatValue = priceNum.toFixed(2);
              fiatSymbol = 'USD';
              primaryCurrency = 'fiat';
            } else if (currency === 'ETH') {
              // Price is in ETH
              cryptoValue = priceNum.toString();
              cryptoSymbol = 'ETH';
              fiatValue = (priceNum * ethPrice).toFixed(2);
              fiatSymbol = 'USD';
              primaryCurrency = 'crypto';
            } else {
              // Other currencies - treat as fiat
              cryptoValue = (priceNum / ethPrice).toFixed(6);
              cryptoSymbol = 'ETH';
              fiatValue = priceNum.toFixed(2);
              fiatSymbol = currency;
              primaryCurrency = 'fiat';
            }

            // Parse images - handle both array and JSON string formats
            let imageUrls: string[] = [];
            if (productData.images) {
              if (Array.isArray(productData.images)) {
                imageUrls = productData.images;
              } else if (typeof productData.images === 'string') {
                try {
                  imageUrls = JSON.parse(productData.images);
                } catch {
                  imageUrls = [];
                }
              }
            }

            // Get inventory - handle both `inventory` and `quantity` fields
            const inventory = productData.inventory ?? productData.quantity ?? 0;

            // Transform the product data to match the ProductDetailPage component interface
            const transformedProduct = {
              id: productData.id,
              title: productData.title || 'Untitled Product',
              description: productData.description || '',
              longDescription: productData.description || '',
              price: {
                crypto: cryptoValue,
                cryptoSymbol: cryptoSymbol,
                fiat: fiatValue,
                fiatSymbol: fiatSymbol,
                primary: primaryCurrency
              },
              seller: {
                id: productData.seller?.id || productData.sellerId || '',
                name: productData.seller?.displayName || productData.seller?.storeName ||
                  (productData.sellerId ? `Seller ${productData.sellerId.substring(0, 8)}...` : 'Unknown Seller'),
                avatar: productData.seller?.avatar || productData.seller?.profileImageUrl || '/images/default-avatar.png',
                verified: productData.seller?.verified || false,
                reputation: productData.seller?.reputation || 0,
                daoApproved: productData.seller?.daoApproved || false,
                totalSales: productData.seller?.totalSales || 0,
                memberSince: productData.seller?.memberSince || productData.seller?.createdAt || '2023-01-01',
                responseTime: '< 24 hours' // Default value
              },
              trust: {
                verified: productData.trust?.verified || false,
                escrowProtected: productData.trust?.escrowProtected || productData.metadata?.escrowEnabled || false,
                onChainCertified: productData.trust?.onChainCertified || false
              },
              specifications: productData.metadata?.specifications || productData.specifications || {},
              category: productData.category?.name || productData.categoryId || 'General',
              tags: Array.isArray(productData.tags) ? productData.tags :
                (typeof productData.tags === 'string' ? JSON.parse(productData.tags || '[]') : []),
              inventory: inventory,
              shipping: {
                freeShipping: productData.shipping?.free || false,
                estimatedDays: productData.shipping?.estimatedDays || '3-5 business days',
                cost: productData.shipping?.cost
              },
              reviews: {
                average: productData.seller?.rating || 0,
                count: productData.seller?.totalReviews || 0
              },
              media: imageUrls.length > 0 ? imageUrls.map((url: string) => ({
                type: 'image' as const,
                url,
                thumbnail: url,
                alt: productData.title || 'Product image'
              })) : [
                {
                  type: 'image' as const,
                  url: 'https://placehold.co/600x400/667eea/ffffff?text=Product',
                  thumbnail: 'https://placehold.co/150x150/667eea/ffffff?text=Product',
                  alt: productData.title || 'Product'
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
      <SEOHead
        title={`${product.title} | Marketplace`}
        description={product.description}
        type="product"
        image={product.media[0]?.url}
        url={`https://linkdao.io/marketplace/listing/${productId}`}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          'name': product.title,
          'description': product.description,
          'image': product.media[0]?.url,
          'offers': {
            '@type': 'Offer',
            'priceCurrency': product.price.cryptoSymbol,
            'price': product.price.crypto,
            'availability': product.inventory > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
          },
          'seller': {
            '@type': 'Organization',
            'name': product.seller.name
          }
        }}
      />

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
            onAddToCart={async (productId, quantity) => {
              try {
                console.log('Add to cart:', { productId, quantity });
                setLoading(true);

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
                await cartService.addItem(cartItem, quantity);

                // Show confirmation
                if (typeof window !== 'undefined') {
                  alert(`Added ${quantity} ${product.title} to your cart!`);
                }
              } catch (err) {
                console.error('Failed to add to cart:', err);
                if (typeof window !== 'undefined') {
                  alert('Failed to add item to cart. Please try again.');
                }
              } finally {
                setLoading(false);
              }
            }}
            onBuyNow={async (productId, quantity) => {
              try {
                console.log('Buy now:', { productId, quantity });
                setLoading(true);

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
                await cartService.addItem(cartItem, quantity);

                // Redirect to checkout page
                router.push(`/marketplace/checkout?product=${productId}&quantity=${quantity}`);
              } catch (err) {
                console.error('Failed to buy now:', err);
                if (typeof window !== 'undefined') {
                  alert('Failed to process buy now request. Please try again.');
                }
                setLoading(false);
              }
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