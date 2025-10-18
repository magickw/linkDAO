import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { BreadcrumbItem } from '@/components/Marketplace/Navigation/MarketplaceBreadcrumbs';
import { marketplaceService } from '@/services/marketplaceService';

interface BreadcrumbData {
  productTitle?: string;
  sellerName?: string;
  categoryName?: string;
}

export const useMarketplaceBreadcrumbs = () => {
  const router = useRouter();
  const [breadcrumbData, setBreadcrumbData] = useState<BreadcrumbData>({});
  const [loading, setLoading] = useState(false);

  // Fetch additional data needed for breadcrumbs
  useEffect(() => {
    const fetchBreadcrumbData = async () => {
      const { pathname, query } = router;
      
      if (pathname.startsWith('/marketplace/listing/')) {
        const productId = query.id as string;
        if (productId && !breadcrumbData.productTitle) {
          setLoading(true);
          try {
            const product = await marketplaceService.getListingById(productId);
            if (product) {
              setBreadcrumbData(prev => ({
                ...prev,
                productTitle: product.title || 'Product Details',
                categoryName: product.category?.name || undefined
              }));
            }
          } catch (error) {
            console.error('Error fetching product for breadcrumbs:', error);
          } finally {
            setLoading(false);
          }
        }
      } else if (pathname.startsWith('/marketplace/seller/store/')) {
        const sellerId = query.sellerId as string;
        if (sellerId && !breadcrumbData.sellerName) {
          setLoading(true);
          try {
            // Try to fetch seller information
            const seller = await marketplaceService.getSellerById(sellerId);
            if (seller) {
              setBreadcrumbData(prev => ({
                ...prev,
                sellerName: seller.displayName || seller.storeName || formatAddress(sellerId)
              }));
            }
          } catch (error) {
            console.error('Error fetching seller for breadcrumbs:', error);
            // Fallback to formatted address
            setBreadcrumbData(prev => ({
              ...prev,
              sellerName: formatAddress(sellerId)
            }));
          } finally {
            setLoading(false);
          }
        }
      }
    };

    fetchBreadcrumbData();
  }, [router.pathname, router.query, breadcrumbData.productTitle, breadcrumbData.sellerName]);

  // Generate breadcrumb items with fetched data
  const breadcrumbItems = useMemo((): BreadcrumbItem[] => {
    const { pathname, query, asPath } = router;
    const breadcrumbs: BreadcrumbItem[] = [];
    
    // Always start with Home
    breadcrumbs.push({
      label: 'Home',
      href: '/',
      isActive: false
    });

    // Add Marketplace root
    const marketplaceHref = getMarketplaceHref(pathname, asPath);
    breadcrumbs.push({
      label: 'Marketplace',
      href: pathname === '/marketplace' ? undefined : marketplaceHref,
      isActive: pathname === '/marketplace'
    });

    // Handle specific routes
    if (pathname.startsWith('/marketplace/listing/')) {
      // Add category if available
      const category = breadcrumbData.categoryName || query.category as string;
      if (category) {
        breadcrumbs.push({
          label: formatCategoryName(category),
          href: `/marketplace?category=${encodeURIComponent(category)}`,
          isActive: false
        });
      }
      
      // Add product
      const productTitle = breadcrumbData.productTitle || 'Product Details';
      breadcrumbs.push({
        label: truncateText(productTitle, 40),
        isActive: true
      });
      
    } else if (pathname.startsWith('/marketplace/seller/store/')) {
      // Add Sellers section
      breadcrumbs.push({
        label: 'Sellers',
        href: '/marketplace?view=sellers',
        isActive: false
      });
      
      // Add seller store
      const sellerName = breadcrumbData.sellerName || 'Seller Store';
      breadcrumbs.push({
        label: truncateText(sellerName, 30),
        isActive: true
      });
      
    } else if (pathname.startsWith('/marketplace/category/')) {
      const category = query.category as string;
      if (category) {
        breadcrumbs.push({
          label: formatCategoryName(category),
          isActive: true
        });
      }
      
    } else if (pathname.startsWith('/marketplace/search')) {
      const searchQuery = query.q as string;
      breadcrumbs.push({
        label: searchQuery ? `Search: "${truncateText(searchQuery, 30)}"` : 'Search Results',
        isActive: true
      });
    }

    return breadcrumbs;
  }, [router.pathname, router.query, router.asPath, breadcrumbData]);

  return {
    breadcrumbItems,
    loading,
    refresh: () => setBreadcrumbData({})
  };
};

// Helper functions
const getMarketplaceHref = (pathname: string, asPath: string): string => {
  if (pathname === '/marketplace') return '/marketplace';
  
  // Preserve certain filters when navigating back to marketplace
  const urlParts = asPath.split('?');
  if (urlParts.length < 2) return '/marketplace';
  
  const params = new URLSearchParams(urlParts[1]);
  const preservedParams = new URLSearchParams();
  
  // Preserve filter parameters
  const filtersToPreserve = ['category', 'sort', 'price_min', 'price_max', 'condition'];
  filtersToPreserve.forEach(filter => {
    const value = params.get(filter);
    if (value) {
      preservedParams.set(filter, value);
    }
  });
  
  const queryString = preservedParams.toString();
  return queryString ? `/marketplace?${queryString}` : '/marketplace';
};

const formatCategoryName = (category: string): string => {
  return category
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatAddress = (address: string): string => {
  if (!address || address.length < 10) return address || 'Unknown';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength - 3)}...`;
};

export default useMarketplaceBreadcrumbs;