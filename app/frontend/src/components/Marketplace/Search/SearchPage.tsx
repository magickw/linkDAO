/**
 * SearchPage Component - Main search page with advanced filtering and sorting
 * Integrates all search functionality into a cohesive user experience
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchFilters } from './SearchFilters';
import { AutoSuggestSearch } from './AutoSuggestSearch';
import { ProductGrid } from '../ProductDisplay/ProductGrid';
import { LoadingSkeleton } from '../../../design-system/components/LoadingSkeleton';
import { GlassPanel } from '../../../design-system/components/GlassPanel';
import { designTokens } from '../../../design-system/tokens';
import { marketplaceService, type Product as ServiceProduct, type ProductFilters as ServiceFilters } from '@/services/marketplaceService';

// Define types based on backend models
interface Product {
  id: string;
  title: string;
  description: string;
  images: string[];
  price: {
    amount: string;
    currency: string;
    usdEquivalent?: string;
    eurEquivalent?: string;
    gbpEquivalent?: string;
    lastUpdated?: Date;
  };
  seller: {
    id: string;
    name: string;
    avatar: string;
    verified: boolean;
    reputation: number;
    daoApproved: boolean;
    tier?: 'basic' | 'premium' | 'enterprise';
    onlineStatus?: 'online' | 'offline' | 'away';
    // Enhanced reputation metrics
    reputationMetrics?: {
      overallScore: number;
      moderationScore: number;
      reportingScore: number;
      juryScore: number;
      violationCount: number;
      helpfulReportsCount: number;
      falseReportsCount: number;
      successfulAppealsCount: number;
      juryDecisionsCount: number;
      juryAccuracyRate: number;
      reputationTier: string;
      lastViolationAt?: Date;
    };
  };
  trust: {
    verified: boolean;
    escrowProtected: boolean;
    onChainCertified: boolean;
  };
  category: string;
  isNFT?: boolean;
  inventory?: number;
  views?: number;
  favorites?: number;
  condition?: 'new' | 'used' | 'refurbished';
  brand?: string;
  hasWarranty?: boolean;
  shipping?: {
    freeShipping?: boolean;
    handlingTime?: number;
    shipsFrom?: {
      country?: string;
      state?: string;
      city?: string;
    };
  };
  discount?: {
    percentage?: number;
    active?: boolean;
  };
  isFeatured?: boolean;
  isPublished?: boolean;
  createdAt: Date;
  // Enhanced metadata
  metadata?: {
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    materials?: string[];
    certifications?: string[];
    qualityScore?: number;
    publishedAt?: Date;
    lastIndexed?: Date;
    // Price conversion data
    fiatEquivalents?: Record<string, string>;
    priceLastUpdated?: Date;
  };
  tags: string[];
}

interface AdvancedSearchFilters {
  // Basic filters
  query?: string;
  category?: string;
  priceRange?: [number, number];
  
  // Trust & Verification filters
  verified?: boolean;
  escrowProtected?: boolean;
  onChainCertified?: boolean;
  daoApproved?: boolean;
  
  // Product condition & metadata
  productCondition?: 'new' | 'used' | 'refurbished';
  brand?: string;
  hasWarranty?: boolean;
  isNFT?: boolean;
  
  // Seller filters
  sellerVerification?: 'unverified' | 'basic' | 'verified' | 'dao_approved';
  sellerTier?: 'basic' | 'premium' | 'enterprise';
  sellerOnlineStatus?: 'online' | 'offline' | 'away';
  minReputationScore?: number;
  
  // Shipping filters
  freeShipping?: boolean;
  fastShipping?: boolean;
  minHandlingTime?: number;
  maxHandlingTime?: number;
  shipsToCountry?: string;
  
  // Discount & pricing filters
  hasDiscount?: boolean;
  discountPercentage?: number;
  
  // Inventory filters
  inStock?: boolean;
  stockRange?: [number, number];
  
  // Engagement filters
  minViews?: number;
  minFavorites?: number;
  
  // Tags & attributes
  tagsInclude?: string[];
  tagsExclude?: string[];
  
  // Date filters
  recentlyAdded?: boolean;
  trending?: boolean;
  
  // Custom attributes
  customAttributes?: Record<string, any>;
}

// SortOption interface without label for ProductGrid compatibility
interface ProductGridSortOption {
  field: 'price' | 'title' | 'createdAt' | 'reputation' | 'sales' | 'rating' | 'inventory' | 'discount' | 'handlingTime';
  direction: 'asc' | 'desc';
}

// SortOption interface with label for SearchFilters compatibility
interface SearchFiltersSortOption {
  field: 'price' | 'createdAt' | 'updatedAt' | 'title' | 'views' | 'favorites' | 'relevance' | 'reputation' | 'sales' | 'rating' | 'inventory' | 'discount' | 'handlingTime';
  direction: 'asc' | 'desc';
  label: string;
}

interface SearchPageProps {
  className?: string;
}

const SearchPage: React.FC<SearchPageProps> = ({ className = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<AdvancedSearchFilters>({});
  const [sortBy, setSortBy] = useState<SearchFiltersSortOption>({ field: 'relevance', direction: 'desc', label: 'Best Match' });
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [customAttributes, setCustomAttributes] = useState<Record<string, any[]>>({});

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(24);
  const [hasMore, setHasMore] = useState(false);

  // Map backend product to UI product shape expected by ProductGrid
  const mapServiceProduct = (p: ServiceProduct): Product => ({
    id: p.id,
    title: p.title,
    description: p.description,
    images: p.images || [],
    price: {
      amount: String(p.priceAmount ?? 0),
      currency: p.priceCurrency || 'USD',
      usdEquivalent: undefined,
      lastUpdated: p.updatedAt ? new Date(p.updatedAt) : undefined,
    },
    seller: {
      id: p.seller?.id || p.sellerId,
      name: p.seller?.displayName || p.seller?.storeName || (p.seller?.walletAddress ? `${p.seller.walletAddress.slice(0,6)}...${p.seller.walletAddress.slice(-4)}` : 'Seller'),
      avatar: p.seller?.profileImageUrl || '/placeholder-product.jpg',
      verified: Boolean(p.seller?.verified),
      reputation: p.seller?.reputation || 0,
      daoApproved: Boolean(p.seller?.daoApproved),
      tier: undefined,
      onlineStatus: p.seller?.isOnline ? 'online' : 'offline',
    },
    trust: {
      verified: Boolean(p.trust?.verified),
      escrowProtected: Boolean(p.trust?.escrowProtected),
      onChainCertified: Boolean(p.trust?.onChainCertified),
    },
    category: p.category?.name || p.category?.slug || 'General',
    isNFT: Boolean(p.nft),
    inventory: p.inventory,
    views: p.views,
    favorites: p.favorites,
    condition: p.metadata?.condition as any,
    brand: p.metadata?.brand,
    hasWarranty: undefined,
    shipping: p.shipping ? { freeShipping: p.shipping.free, handlingTime: parseInt(p.shipping.estimatedDays || '0') } : undefined,
    discount: undefined,
    isFeatured: undefined,
    isPublished: p.status === 'active',
    createdAt: new Date(p.createdAt),
    metadata: undefined,
    tags: p.tags || [],
  });

  // Map UI filters to service filters
  const buildServiceFilters = (f: AdvancedSearchFilters, s: SearchFiltersSortOption, pageNum: number): ServiceFilters => {
    const sf: ServiceFilters = {};
    if (f.category) sf.category = f.category;
    if (f.priceRange) {
      const [min, max] = f.priceRange;
      if (min !== undefined) sf.minPrice = min;
      if (max !== undefined) sf.maxPrice = max;
    }
    if (f.productCondition) sf.condition = f.productCondition;
    if (f.isNFT !== undefined) sf.tags = [...(sf.tags || []), 'nft'];
    // Sorting mapping
    let sortBy: ServiceFilters['sortBy'] | undefined;
    if (s.field === 'price') sortBy = s.direction === 'asc' ? 'price_asc' : 'price_desc';
    else if (s.field === 'createdAt') sortBy = s.direction === 'asc' ? 'oldest' : 'newest';
    else if (s.field === 'title') sortBy = 'popular';
    else sortBy = 'popular';
    sf.sortBy = sortBy;
    // Pagination
    sf.limit = limit;
    sf.offset = (pageNum - 1) * limit;
    // Only include active
    sf.status = 'active';
    return sf;
  };

  // Fetch a page of products
  const fetchPage = async (pageNum: number, reset = false) => {
    setLoading(true);
    setError(null);
    try {
      const serviceFilters = buildServiceFilters(filters, sortBy, pageNum);
      const pageData = await marketplaceService.getProducts(serviceFilters);
      const mapped = pageData.products.map(mapServiceProduct);
      setProducts(prev => reset ? mapped : [...prev, ...mapped]);
      setHasMore(pageData.hasMore);
      setPage(pageNum);
    } catch (e) {
      console.error('Error fetching products:', e);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

// Initialize categories/brands/etc. from mocks for now (can be fetched from API later)
useEffect(() => {
  // Keep existing mock metadata lists for filters until backend endpoints are used
  const mockCategories = ['Electronics', 'Fashion', 'Home & Garden', 'Sports', 'Books', 'Toys'];
  const mockBrands = ['AudioTech', 'LeatherCraft', 'HomeStyle', 'SportMax', 'BookWorm', 'ToyJoy'];
  const mockCountries = ['USA', 'China', 'Germany', 'Italy', 'Japan', 'UK'];
  const mockTags = ['wireless', 'headphones', 'audio', 'tech', 'vintage', 'leather', 'fashion', 'jacket'];
  setCategories(mockCategories);
  setBrands(mockBrands);
  setCountries(mockCountries);
  setTags(mockTags);
  // Initial load
  fetchPage(1, true);
}, []);

// Handle search
const handleSearch = (query: string) => {
  setSearchQuery(query);
  // Reset and fetch with current filters/sort
  fetchPage(1, true);
};

// Handle filter changes
const handleFiltersChange = (newFilters: AdvancedSearchFilters) => {
  setFilters(newFilters);
  // Reset pagination when filters change
  fetchPage(1, true);
};

// Handle sort changes
const handleSortChange = (newSort: SearchFiltersSortOption) => {
  setSortBy(newSort);
  // Reset pagination when sorting changes
  fetchPage(1, true);
};

  // Convert SearchFiltersSortOption to ProductGridSortOption
  const convertSortOption = (option: SearchFiltersSortOption): ProductGridSortOption => {
    // Map compatible fields, default to 'createdAt' if not compatible
    const compatibleFields: Record<string, ProductGridSortOption['field']> = {
      'price': 'price',
      'title': 'title',
      'createdAt': 'createdAt',
      'reputation': 'reputation',
      'sales': 'sales',
      'rating': 'rating',
      'inventory': 'inventory',
      'discount': 'discount',
      'handlingTime': 'handlingTime',
      'relevance': 'createdAt', // Map relevance to createdAt as default
      'updatedAt': 'createdAt', // Map updatedAt to createdAt
      'views': 'rating', // Map views to rating
      'favorites': 'sales', // Map favorites to sales
    };
    
    return {
      field: compatibleFields[option.field] || 'createdAt',
      direction: option.direction
    };
  };

  // Handle product actions
  const handleProductClick = (productId: string) => {
    console.log('Product clicked:', productId);
    // Navigate to product detail page
  };

  const handleAddToCart = (productId: string) => {
    console.log('Add to cart:', productId);
    // Add product to cart
  };

  const handleAddToWishlist = (productId: string) => {
    console.log('Add to wishlist:', productId);
    // Add product to wishlist
  };

  const handleSellerClick = (sellerId: string) => {
    console.log('Seller clicked:', sellerId);
    // Navigate to seller profile
  };

  return (
    <div className={`search-page ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">Search Marketplace</h1>
          
          {/* Search Bar */}
          <div className="mb-6">
            <AutoSuggestSearch
              onSearch={handleSearch}
              placeholder="Search products, categories, brands..."
              className="max-w-2xl"
            />
          </div>
        </div>

        {/* Filters and Results */}
        <div className="space-y-6">
          {/* Search Filters */}
          <SearchFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            sortBy={sortBy}
            onSortChange={handleSortChange}
            categories={categories}
            brands={brands}
            countries={countries}
            tags={tags}
            customAttributes={customAttributes}
          />

          {/* Results Info */}
          <div className="flex items-center justify-between">
            <p className="text-white/70">
              {loading ? (
                <LoadingSkeleton variant="text" width="200px" height="1rem" />
              ) : (
                `Found ${products.length} product${products.length !== 1 ? 's' : ''}`
              )}
            </p>
          </div>

          {/* Product Grid */}
          {error ? (
            <GlassPanel variant="secondary" className="p-8 text-center">
              <div className="text-red-400 mb-4">⚠️ Error loading products</div>
              <p className="text-white/70">{error}</p>
            </GlassPanel>
          ) : (
            <ProductGrid
              products={products}
              loading={loading}
              error={error || undefined}
              filters={filters}
              sortBy={convertSortOption(sortBy)}
              onProductClick={handleProductClick}
              onSellerClick={handleSellerClick}
              onAddToCart={handleAddToCart}
              onAddToWishlist={handleAddToWishlist}
              onFiltersChange={handleFiltersChange}
              onSortChange={(sort) => handleSortChange({...sort, label: sortBy.label})}
              showFilters={false} // We're using our custom filters
              showSorting={false} // We're using our custom sorting
              showPagination={false}
              infiniteScroll
              hasMore={hasMore}
              onLoadMore={() => fetchPage(page + 1)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;