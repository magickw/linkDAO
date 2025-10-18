import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronRight, Home, Store, Package, User, Search, Tag } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isActive?: boolean;
  icon?: React.ReactNode;
}

interface MarketplaceBreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
  preserveFilters?: boolean;
}

export const MarketplaceBreadcrumbs: React.FC<MarketplaceBreadcrumbsProps> = ({
  items,
  className = '',
  preserveFilters = true
}) => {
  const router = useRouter();
  
  // Generate breadcrumbs automatically if not provided
  const breadcrumbItems = items || generateMarketplaceBreadcrumbs(router, preserveFilters);

  if (breadcrumbItems.length === 0) return null;

  return (
    <nav 
      className={`flex items-center space-x-1 text-sm ${className}`} 
      aria-label="Marketplace breadcrumb navigation"
    >
      {breadcrumbItems.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && (
            <ChevronRight 
              className="w-4 h-4 text-gray-400 mx-2" 
              aria-hidden="true"
            />
          )}
          
          {item.href && !item.isActive ? (
            <Link
              href={item.href}
              className="flex items-center text-gray-600 hover:text-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-sm px-1 py-0.5"
              aria-current={item.isActive ? 'page' : undefined}
            >
              {item.icon && (
                <span className="mr-1.5 flex-shrink-0" aria-hidden="true">
                  {item.icon}
                </span>
              )}
              <span className="hover:underline truncate max-w-[200px]">
                {item.label}
              </span>
            </Link>
          ) : (
            <span 
              className={`flex items-center ${
                item.isActive 
                  ? 'text-gray-900 font-medium' 
                  : 'text-gray-500'
              }`}
              aria-current={item.isActive ? 'page' : undefined}
            >
              {item.icon && (
                <span className="mr-1.5 flex-shrink-0" aria-hidden="true">
                  {item.icon}
                </span>
              )}
              <span className="truncate max-w-[200px]">
                {item.label}
              </span>
            </span>
          )}
        </div>
      ))}
    </nav>
  );
};

// Helper function to generate breadcrumbs based on current marketplace route
export const generateMarketplaceBreadcrumbs = (
  router: any,
  preserveFilters: boolean = true
): BreadcrumbItem[] => {
  const { pathname, query, asPath } = router;
  const breadcrumbs: BreadcrumbItem[] = [];
  
  // Always start with Home
  breadcrumbs.push({
    label: 'Home',
    href: '/',
    icon: <Home className="w-4 h-4" />,
    isActive: false
  });

  // Add Marketplace root
  const marketplaceHref = preserveFilters && asPath.includes('?') 
    ? `/marketplace${getPreservedFilters(asPath)}`
    : '/marketplace';
    
  breadcrumbs.push({
    label: 'Marketplace',
    href: pathname === '/marketplace' ? undefined : marketplaceHref,
    icon: <Store className="w-4 h-4" />,
    isActive: pathname === '/marketplace'
  });

  // Handle specific marketplace routes
  if (pathname.startsWith('/marketplace/listing/')) {
    const productId = query.id as string;
    const category = query.category as string;
    
    // Add category if available
    if (category) {
      const categoryHref = preserveFilters 
        ? `/marketplace?category=${encodeURIComponent(category)}`
        : `/marketplace?category=${encodeURIComponent(category)}`;
        
      breadcrumbs.push({
        label: formatCategoryName(category),
        href: categoryHref,
        icon: <Package className="w-4 h-4" />,
        isActive: false
      });
    }
    
    // Add product (active item)
    const productTitle = getProductTitleFromQuery(query) || 'Product Details';
    breadcrumbs.push({
      label: productTitle,
      icon: <Package className="w-4 h-4" />,
      isActive: true
    });
    
  } else if (pathname.startsWith('/marketplace/seller/store/')) {
    const sellerId = query.sellerId as string;
    
    // Add Sellers section
    breadcrumbs.push({
      label: 'Sellers',
      href: '/marketplace?view=sellers',
      icon: <User className="w-4 h-4" />,
      isActive: false
    });
    
    // Add specific seller store (active item)
    const sellerName = getSellerNameFromQuery(query) || formatSellerAddress(sellerId);
    breadcrumbs.push({
      label: sellerName,
      icon: <User className="w-4 h-4" />,
      isActive: true
    });
    
  } else if (pathname.startsWith('/marketplace/category/')) {
    const category = query.category as string;
    
    if (category) {
      breadcrumbs.push({
        label: formatCategoryName(category),
        icon: <Package className="w-4 h-4" />,
        isActive: true
      });
    }
    
  } else if (pathname.startsWith('/marketplace/search')) {
    const searchQuery = query.q as string;
    
    breadcrumbs.push({
      label: searchQuery ? `Search: "${searchQuery}"` : 'Search Results',
      icon: <Search className="w-4 h-4" />,
      isActive: true
    });
  } else if (pathname.startsWith('/marketplace/tag/')) {
    const tag = query.tag as string;
    
    if (tag) {
      breadcrumbs.push({
        label: `#${tag}`,
        icon: <Tag className="w-4 h-4" />,
        isActive: true
      });
    }
  }

  return breadcrumbs;
};

// Helper functions
const getPreservedFilters = (asPath: string): string => {
  const urlParts = asPath.split('?');
  if (urlParts.length < 2) return '';
  
  const params = new URLSearchParams(urlParts[1]);
  const preservedParams = new URLSearchParams();
  
  // Preserve specific filter parameters
  const filtersToPreserve = ['category', 'sort', 'price_min', 'price_max', 'condition', 'verified', 'escrow'];
  
  filtersToPreserve.forEach(filter => {
    const value = params.get(filter);
    if (value) {
      preservedParams.set(filter, value);
    }
  });
  
  const queryString = preservedParams.toString();
  return queryString ? `?${queryString}` : '';
};

const formatCategoryName = (category: string): string => {
  return category
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatSellerAddress = (address: string): string => {
  if (!address) return 'Unknown Seller';
  if (address.length < 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

const getProductTitleFromQuery = (query: any): string | null => {
  // Try to get product title from query parameters or other sources
  return query.title || query.name || null;
};

const getSellerNameFromQuery = (query: any): string | null => {
  // Try to get seller name from query parameters or other sources
  return query.sellerName || query.name || null;
};

export default MarketplaceBreadcrumbs;