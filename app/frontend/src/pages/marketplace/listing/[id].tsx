import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { NextPage } from 'next';
import Head from 'next/head';
import ProductDetailPage from '@/components/Marketplace/ProductDisplay/ProductDetailPage';
import { marketplaceService } from '@/services/marketplaceService';
import { enhancedMarketplaceService } from '@/services/enhancedMarketplaceService';
import { MarketplaceBreadcrumbs } from '@/components/Marketplace/Navigation/MarketplaceBreadcrumbs';
import { useMarketplaceBreadcrumbs } from '@/hooks/useMarketplaceBreadcrumbs';
import { MarketplaceErrorBoundary } from '@/components/ErrorHandling/MarketplaceErrorBoundary';
import { 
  ProductNotFoundFallback, 
  NetworkErrorFallback, 
  ServerErrorFallback,
  GenericMarketplaceErrorFallback 
} from '@/components/ErrorHandling/MarketplaceErrorFallback';

interface ProductDetailPageData {
  id: string;
  title: string;
  description: string;
  longDescription?: string;
  price: {
    crypto: string;
    cryptoSymbol: string;
    fiat: string;
    fiatSymbol: string;
  };
  seller: {
    id: string;
    name: string;
    avatar: string;
    verified: boolean;
    reputation: number;
    daoApproved: boolean;
    totalSales: number;
    memberSince: string;
    responseTime: string;
  };
  trust: {
    verified: boolean;
    escrowProtected: boolean;
    onChainCertified: boolean;
    authenticityNFT?: string;
  };
  specifications: Record<string, string>;
  category: string;
  tags: string[];
  isNFT?: boolean;
  inventory?: number;
  shipping: {
    freeShipping: boolean;
    estimatedDays: string;
    cost?: string;
  };
  reviews: {
    average: number;
    count: number;
  };
  media: Array<{
    type: 'image' | 'video' | '3d' | 'ar';
    url: string;
    thumbnail?: string;
    alt?: string;
  }>;
}

const ProductDetailPageRoute: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  
  const [product, setProduct] = useState<ProductDetailPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{
    type: 'not_found' | 'network' | 'server' | 'generic';
    message: string;
    retryable: boolean;
    suggestedActions?: string[];
    originalError?: Error;
  } | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { breadcrumbItems } = useMarketplaceBreadcrumbs();

  const fetchProductDetails = async (productId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Use enhanced marketplace service with built-in retry logic
      const response = await enhancedMarketplaceService.getListingById(productId);
      
      if (response.success && response.data) {
        const productData = response.data;

      // Transform the API data to match the component interface
      const transformedProduct: ProductDetailPageData = {
        id: productData.id,
        title: productData.title,
        description: productData.description,
        longDescription: productData.description, // Use description as long description if not available
        price: {
          crypto: convertToCrypto(productData.priceAmount, productData.priceCurrency),
          cryptoSymbol: 'ETH',
          fiat: productData.priceAmount.toString(),
          fiatSymbol: productData.priceCurrency,
        },
        seller: {
          id: productData.seller?.id || productData.sellerId,
          name: productData.seller?.displayName || productData.seller?.storeName || 'Unknown Seller',
          avatar: productData.seller?.profileImageUrl || '/images/default-avatar.png',
          verified: productData.seller?.verified || false,
          reputation: productData.seller?.reputation || 4.5,
          daoApproved: productData.seller?.daoApproved || false,
          totalSales: 0, // This would need to be fetched separately or included in the API
          memberSince: new Date().toISOString(), // This would need to be included in the API
          responseTime: '< 1 hour', // This would need to be calculated from actual data
        },
        trust: {
          verified: productData.trust?.verified || false,
          escrowProtected: productData.trust?.escrowProtected || false,
          onChainCertified: productData.trust?.onChainCertified || false,
          authenticityNFT: productData.nft?.contractAddress,
        },
        specifications: productData.metadata?.specifications || {},
        category: productData.category?.name || 'General',
        tags: productData.tags || [],
        isNFT: !!productData.nft,
        inventory: productData.inventory,
        shipping: {
          freeShipping: productData.shipping?.free || false,
          estimatedDays: productData.shipping?.estimatedDays || '3-5 business days',
          cost: productData.shipping?.cost,
        },
        reviews: {
          average: 4.5, // This would need to be fetched from a reviews API
          count: 0, // This would need to be fetched from a reviews API
        },
        media: productData.images.map((url, index) => ({
          type: 'image' as const,
          url,
          thumbnail: url,
          alt: `${productData.title} - Image ${index + 1}`,
        })),
      };

        setProduct(transformedProduct);
        setRetryCount(0);
      } else if (response.error) {
        const errorType = response.error.code === 'NOT_FOUND' ? 'not_found' :
                         response.error.message.includes('network') || response.error.message.includes('fetch') ? 'network' :
                         response.error.message.includes('500') || response.error.message.includes('503') ? 'server' :
                         'generic';
        
        setError({
          type: errorType,
          message: response.error.message,
          retryable: response.error.retryable,
          suggestedActions: response.error.suggestedActions
        });
      }
    } catch (err) {
      console.error('Error fetching product details:', err);
      setError({
        type: 'generic',
        message: 'An unexpected error occurred while loading the product',
        retryable: true,
        originalError: err instanceof Error ? err : new Error(String(err))
      });
    } finally {
      setLoading(false);
    }
  };

  const convertToCrypto = (amount: number, currency: string): string => {
    // Simple conversion logic - in a real app, this would use live exchange rates
    const ethPrice = 2400; // Placeholder ETH price in USD
    if (currency === 'USD') {
      return (amount / ethPrice).toFixed(4);
    }
    return amount.toString();
  };

  const handleRetry = () => {
    if (id && typeof id === 'string') {
      setRetryCount(prev => prev + 1);
      fetchProductDetails(id);
    }
  };

  const handleAddToCart = (productId: string, quantity: number) => {
    // TODO: Implement cart functionality
    console.log('Adding to cart:', { productId, quantity });
    // This would integrate with a cart service
  };

  const handleBuyNow = async (productId: string, quantity: number) => {
    // TODO: Implement buy now functionality
    console.log('Buy now:', { productId, quantity });
    // This would redirect to checkout
    router.push(`/marketplace/checkout?product=${productId}&quantity=${quantity}`);
  };

  const handleAddToWishlist = (productId: string) => {
    // TODO: Implement wishlist functionality
    console.log('Adding to wishlist:', productId);
  };

  const handleContactSeller = (sellerId: string) => {
    try {
      // Navigate to seller contact or messaging
      router.push(`/messages/new?seller=${sellerId}`);
    } catch (error) {
      console.error('Error navigating to seller contact:', error);
      // Fallback: could show a modal or toast notification
    }
  };

  const handleViewSellerProfile = (sellerId: string) => {
    try {
      // Navigate to seller store page using standardized URL
      router.push(`/marketplace/seller/store/${sellerId}`);
    } catch (error) {
      console.error('Error navigating to seller profile:', error);
      // Fallback: could show a modal or toast notification
    }
  };

  useEffect(() => {
    if (id && typeof id === 'string') {
      fetchProductDetails(id);
    }
  }, [id]);

  if (loading) {
    return (
      <>
        <Head>
          <title>Loading Product... | Marketplace</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Product Details</h2>
            <p className="text-gray-600">Please wait while we fetch the product information...</p>
            {retryCount > 0 && (
              <p className="text-sm text-gray-500 mt-2">Retry attempt {retryCount}</p>
            )}
          </div>
        </div>
      </>
    );
  }

  if (error) {
    const ErrorComponent = error.type === 'not_found' ? ProductNotFoundFallback :
                          error.type === 'network' ? NetworkErrorFallback :
                          error.type === 'server' ? ServerErrorFallback :
                          GenericMarketplaceErrorFallback;

    return (
      <>
        <Head>
          <title>Error Loading Product | Marketplace</title>
        </Head>
        <ErrorComponent
          productId={typeof id === 'string' ? id : undefined}
          onRetry={error.retryable ? handleRetry : undefined}
          error={error.originalError}
        />
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Head>
          <title>Product Not Found | Marketplace</title>
        </Head>
        <ProductNotFoundFallback
          productId={typeof id === 'string' ? id : undefined}
        />
      </>
    );
  }

  return (
    <MarketplaceErrorBoundary>
      <Head>
        <title>{product.title} | Marketplace</title>
        <meta name="description" content={product.description} />
        <meta property="og:title" content={product.title} />
        <meta property="og:description" content={product.description} />
        <meta property="og:image" content={product.media[0]?.url} />
        <meta property="og:type" content="product" />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        {/* Breadcrumb Navigation */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-3">
            <MarketplaceBreadcrumbs 
              items={breadcrumbItems}
              className="text-gray-600"
              preserveFilters={true}
            />
          </div>
        </div>

        <ProductDetailPage
          product={product}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          onAddToWishlist={handleAddToWishlist}
          onContactSeller={handleContactSeller}
          onViewSellerProfile={handleViewSellerProfile}
        />
      </div>
    </MarketplaceErrorBoundary>
  );
};

export default ProductDetailPageRoute;