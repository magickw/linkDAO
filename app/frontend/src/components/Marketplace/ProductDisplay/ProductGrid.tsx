/**
 * ProductGrid Component - Responsive grid layout for product cards
 * Supports filtering, sorting, and pagination with glassmorphic styling
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ProductCard } from './ProductCard';
import { LoadingSkeleton, ProductCardSkeleton } from '@/design-system/components/LoadingSkeleton';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import { designTokens } from '@/design-system/tokens';

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
  createdAt: Date;
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
}

interface FilterOptions {
  category?: string;
  priceRange?: [number, number];
  verified?: boolean;
  escrowProtected?: boolean;
  onChainCertified?: boolean;
  daoApproved?: boolean;
  inStock?: boolean;
  freeShipping?: boolean;
  // New filters
  minRating?: number;
  maxRating?: number;
  sellerReputation?: 'low' | 'medium' | 'high' | 'verified';
  hasReviews?: boolean;
  recentlyAdded?: boolean;
  trending?: boolean;
  onSale?: boolean;
  fastShipping?: boolean;
  minReputationScore?: number;
  maxReputationScore?: number;
  minSalesCount?: number;
  maxSalesCount?: number;
  minViews?: number;
  maxViews?: number;
  minFavorites?: number;
  maxFavorites?: number;
  productCondition?: 'new' | 'used' | 'refurbished';
  brand?: string;
  hasWarranty?: boolean;
  isNFT?: boolean;
  isEscrowProtected?: boolean;
  shippingMethods?: string[];
  minHandlingTime?: number;
  maxHandlingTime?: number;
  shipsToCountry?: string;
  shipsToState?: string;
  shipsToCity?: string;
  sellerVerification?: 'unverified' | 'basic' | 'verified' | 'dao_approved';
  sellerTier?: 'basic' | 'premium' | 'enterprise';
  sellerOnlineStatus?: 'online' | 'offline' | 'away';
  priceCurrency?: string;
  hasDiscount?: boolean;
  discountPercentage?: number;
  isFeatured?: boolean;
  isPublished?: boolean;
  hasStock?: boolean;
  stockRange?: [number, number];
  tagsInclude?: string[];
  tagsExclude?: string[];
  categoryPath?: string[];
}

interface SortOption {
  field: 'price' | 'title' | 'createdAt' | 'reputation' | 'sales' | 'rating' | 'inventory' | 'discount' | 'handlingTime';
  direction: 'asc' | 'desc';
}

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  error?: string;
  filters?: FilterOptions;
  sortBy?: SortOption;
  layout?: 'grid' | 'list';
  itemsPerPage?: number;
  showFilters?: boolean;
  showSorting?: boolean;
  showPagination?: boolean;
  // New optional infinite scroll support
  infiniteScroll?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onProductClick?: (productId: string) => void;
  onSellerClick?: (sellerId: string) => void;
  onAddToCart?: (productId: string) => void;
  onAddToWishlist?: (productId: string) => void;
  onFiltersChange?: (filters: FilterOptions) => void;
  onSortChange?: (sort: SortOption) => void;
  className?: string;
}

interface FilterPanelProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  categories: string[];
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  categories,
}) => {
  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <GlassPanel variant="secondary" className="p-4 space-y-4">
      <h3 className="font-semibold text-white mb-4">Filters</h3>

      {/* Category Filter */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Category</label>
        <select
          value={filters.category || ''}
          onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
          className="w-full p-2 rounded text-white"
          style={{
            background: designTokens.glassmorphism.secondary.background,
            border: designTokens.glassmorphism.secondary.border,
            backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
          }}
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category} value={category} className="bg-gray-800">
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Price Range Filter */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Price Range</label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.priceRange?.[0] || ''}
            onChange={(e) => handleFilterChange('priceRange', [e.target.value ? parseFloat(e.target.value) : undefined, filters.priceRange?.[1]])}
            className="w-full p-2 rounded text-white"
            style={{
              background: designTokens.glassmorphism.secondary.background,
              border: designTokens.glassmorphism.secondary.border,
              backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
            }}
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.priceRange?.[1] || ''}
            onChange={(e) => handleFilterChange('priceRange', [filters.priceRange?.[0], e.target.value ? parseFloat(e.target.value) : undefined])}
            className="w-full p-2 rounded text-white"
            style={{
              background: designTokens.glassmorphism.secondary.background,
              border: designTokens.glassmorphism.secondary.border,
              backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
            }}
          />
        </div>
      </div>

      {/* Product Condition Filter */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Condition</label>
        <select
          value={filters.productCondition || ''}
          onChange={(e) => handleFilterChange('productCondition', e.target.value || undefined)}
          className="w-full p-2 rounded text-white"
          style={{
            background: designTokens.glassmorphism.secondary.background,
            border: designTokens.glassmorphism.secondary.border,
            backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
          }}
        >
          <option value="" className="bg-gray-800">Any Condition</option>
          <option value="new" className="bg-gray-800">New</option>
          <option value="used" className="bg-gray-800">Used</option>
          <option value="refurbished" className="bg-gray-800">Refurbished</option>
        </select>
      </div>

      {/* Brand Filter */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Brand</label>
        <input
          type="text"
          placeholder="Brand"
          value={filters.brand || ''}
          onChange={(e) => handleFilterChange('brand', e.target.value || undefined)}
          className="w-full p-2 rounded text-white"
          style={{
            background: designTokens.glassmorphism.secondary.background,
            border: designTokens.glassmorphism.secondary.border,
            backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
          }}
        />
      </div>

      {/* Trust Filters */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Trust & Verification</label>
        <div className="space-y-2">
          {[
            { key: 'verified', label: 'Verified Only', icon: '✅' },
            { key: 'escrowProtected', label: 'Escrow Protected', icon: '🔒' },
            { key: 'onChainCertified', label: 'On-Chain Certified', icon: '⛓️' },
            { key: 'daoApproved', label: 'DAO Approved', icon: '🏛️' },
            { key: 'hasWarranty', label: 'Has Warranty', icon: '🔧' },
          ].map(({ key, label, icon }) => (
            <label key={key} className="flex items-center gap-2 text-sm text-white cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(filters[key as keyof FilterOptions])}
                onChange={(e) => handleFilterChange(key as keyof FilterOptions, e.target.checked)}
                className="rounded"
              />
              <span>{icon}</span>
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Seller Verification Filter */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Seller Verification</label>
        <select
          value={filters.sellerVerification || ''}
          onChange={(e) => handleFilterChange('sellerVerification', e.target.value || undefined)}
          className="w-full p-2 rounded text-white"
          style={{
            background: designTokens.glassmorphism.secondary.background,
            border: designTokens.glassmorphism.secondary.border,
            backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
          }}
        >
          <option value="" className="bg-gray-800">Any Verification</option>
          <option value="unverified" className="bg-gray-800">Unverified</option>
          <option value="basic" className="bg-gray-800">Basic</option>
          <option value="verified" className="bg-gray-800">Verified</option>
          <option value="dao_approved" className="bg-gray-800">DAO Approved</option>
        </select>
      </div>

      {/* Seller Tier Filter */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Seller Tier</label>
        <select
          value={filters.sellerTier || ''}
          onChange={(e) => handleFilterChange('sellerTier', e.target.value || undefined)}
          className="w-full p-2 rounded text-white"
          style={{
            background: designTokens.glassmorphism.secondary.background,
            border: designTokens.glassmorphism.secondary.border,
            backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
          }}
        >
          <option value="" className="bg-gray-800">Any Tier</option>
          <option value="basic" className="bg-gray-800">Basic</option>
          <option value="premium" className="bg-gray-800">Premium</option>
          <option value="enterprise" className="bg-gray-800">Enterprise</option>
        </select>
      </div>

      {/* Seller Online Status Filter */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Seller Status</label>
        <select
          value={filters.sellerOnlineStatus || ''}
          onChange={(e) => handleFilterChange('sellerOnlineStatus', e.target.value || undefined)}
          className="w-full p-2 rounded text-white"
          style={{
            background: designTokens.glassmorphism.secondary.background,
            border: designTokens.glassmorphism.secondary.border,
            backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
          }}
        >
          <option value="" className="bg-gray-800">Any Status</option>
          <option value="online" className="bg-gray-800">Online</option>
          <option value="offline" className="bg-gray-800">Offline</option>
          <option value="away" className="bg-gray-800">Away</option>
        </select>
      </div>

      {/* Shipping Filters */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Shipping</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
            <input
              type="checkbox"
              checked={filters.fastShipping || false}
              onChange={(e) => handleFilterChange('fastShipping', e.target.checked)}
              className="rounded"
            />
            <span>Fast Shipping (1-2 days)</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
            <input
              type="checkbox"
              checked={filters.freeShipping || false}
              onChange={(e) => handleFilterChange('freeShipping', e.target.checked)}
              className="rounded"
            />
            <span>Free Shipping</span>
          </label>
        </div>
      </div>

      {/* Discount Filter */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Discount</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
            <input
              type="checkbox"
              checked={filters.hasDiscount || false}
              onChange={(e) => handleFilterChange('hasDiscount', e.target.checked)}
              className="rounded"
            />
            <span>On Sale</span>
          </label>
          {filters.hasDiscount && (
            <input
              type="number"
              placeholder="Min Discount %"
              value={filters.discountPercentage || ''}
              onChange={(e) => handleFilterChange('discountPercentage', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="w-full p-2 rounded text-white"
              style={{
                background: designTokens.glassmorphism.secondary.background,
                border: designTokens.glassmorphism.secondary.border,
                backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
              }}
            />
          )}
        </div>
      </div>

      {/* Stock Filter */}
      <div>
        <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
          <input
            type="checkbox"
            checked={filters.inStock || false}
            onChange={(e) => handleFilterChange('inStock', e.target.checked || undefined)}
            className="rounded"
          />
          <span>In Stock Only</span>
        </label>
      </div>

      {/* Clear Filters */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onFiltersChange({})}
        className="w-full"
      >
        Clear All Filters
      </Button>
    </GlassPanel>
  );
};

interface SortControlsProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  layout: 'grid' | 'list';
  onLayoutChange: (layout: 'grid' | 'list') => void;
}

const SortControls: React.FC<SortControlsProps> = ({
  sortBy,
  onSortChange,
  layout,
  onLayoutChange,
}) => (
  <div className="flex items-center justify-between gap-4 mb-6">
    <div className="flex items-center gap-4">
      <select
        value={`${sortBy.field}-${sortBy.direction}`}
        onChange={(e) => {
          const [field, direction] = e.target.value.split('-');
          onSortChange({ field: field as SortOption['field'], direction: direction as SortOption['direction'] });
        }}
        className="p-2 rounded text-white"
        style={{
          background: designTokens.glassmorphism.secondary.background,
          border: designTokens.glassmorphism.secondary.border,
          backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
        }}
      >
        <option value="relevance-desc" className="bg-gray-800">Best Match</option>
        <option value="createdAt-desc" className="bg-gray-800">Newest First</option>
        <option value="createdAt-asc" className="bg-gray-800">Oldest First</option>
        <option value="price-asc" className="bg-gray-800">Price: Low to High</option>
        <option value="price-desc" className="bg-gray-800">Price: High to Low</option>
        <option value="title-asc" className="bg-gray-800">Name: A to Z</option>
        <option value="title-desc" className="bg-gray-800">Name: Z to A</option>
        <option value="reputation-desc" className="bg-gray-800">Best Rated</option>
        <option value="sales-desc" className="bg-gray-800">Most Popular</option>
        <option value="rating-desc" className="bg-gray-800">Highest Rating</option>
        <option value="inventory-desc" className="bg-gray-800">Most Available</option>
        <option value="discount-desc" className="bg-gray-800">Highest Discount</option>
        <option value="handlingTime-asc" className="bg-gray-800">Fastest Shipping</option>
      </select>
    </div>

    <div className="flex items-center gap-2">
      <button
        onClick={() => onLayoutChange('grid')}
        className={`p-2 rounded transition-colors ${
          layout === 'grid' ? 'text-white bg-white/20' : 'text-white/60 hover:text-white'
        }`}
      >
        ⊞
      </button>
      <button
        onClick={() => onLayoutChange('list')}
        className={`p-2 rounded transition-colors ${
          layout === 'list' ? 'text-white bg-white/20' : 'text-white/60 hover:text-white'
        }`}
      >
        ☰
      </button>
    </div>
  </div>
);

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        data-testid="pagination-previous"
      >
        Previous
      </Button>

      {getVisiblePages().map((page, index) => (
        <React.Fragment key={index}>
          {page === '...' ? (
            <span className="px-3 py-2 text-white/60">...</span>
          ) : (
            <button
              onClick={() => onPageChange(page as number)}
              className={`px-3 py-2 rounded transition-colors ${
                currentPage === page
                  ? 'text-white bg-white/20'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              data-testid={`pagination-page-${page}`}
            >
              {page}
            </button>
          )}
        </React.Fragment>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        data-testid="pagination-next"
      >
        Next
      </Button>
    </div>
  );
};

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  loading = false,
  error,
  filters: filtersProp,
  sortBy,
  layout: initialLayout = 'grid',
  itemsPerPage = 12,
  showFilters = true,
  showSorting = true,
  showPagination = true,
  infiniteScroll = false,
  hasMore = false,
  onLoadMore,
  onProductClick,
  onSellerClick,
  onAddToCart,
  onAddToWishlist,
  onFiltersChange,
  onSortChange,
  className = '',
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [layout, setLayout] = useState(initialLayout);
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null);

  // Stabilize default empty filters object across renders to avoid unintended resets
  const defaultFiltersRef = React.useRef<FilterOptions>({});
  const filters = filtersProp ?? defaultFiltersRef.current;

  // Get unique categories for filter
  const categories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category))).sort();
  }, [products]);

  // Apply filters and sorting
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter(product => {
      // Category filter
      if (filters.category && product.category !== filters.category) return false;
      
      // Price range filter
      if (filters.priceRange) {
        const [minPrice, maxPrice] = filters.priceRange;
        const price = parseFloat(product.price.usdEquivalent || product.price.amount);
        if (minPrice !== undefined && price < minPrice) return false;
        if (maxPrice !== undefined && price > maxPrice) return false;
      }
      
      // Trust filters
      if (filters.verified && !product.trust.verified) return false;
      if (filters.escrowProtected && !product.trust.escrowProtected) return false;
      if (filters.onChainCertified && !product.trust.onChainCertified) return false;
      if (filters.daoApproved && !product.seller.daoApproved) return false;
      
      // Product condition filter
      if (filters.productCondition && product.condition !== filters.productCondition) return false;
      
      // Brand filter
      if (filters.brand && product.brand !== filters.brand) return false;
      
      // Warranty filter
      if (filters.hasWarranty !== undefined && product.hasWarranty !== filters.hasWarranty) return false;
      
      // NFT filter
      if (filters.isNFT !== undefined && product.isNFT !== filters.isNFT) return false;
      
      // Escrow protection filter
      if (filters.isEscrowProtected !== undefined && product.trust.escrowProtected !== filters.isEscrowProtected) return false;
      
      // Shipping filters
      if (filters.fastShipping !== undefined && product.shipping?.handlingTime !== undefined) {
        if (filters.fastShipping && product.shipping.handlingTime > 2) return false;
        if (!filters.fastShipping && product.shipping.handlingTime <= 2) return false;
      }
      
      if (filters.freeShipping !== undefined && product.shipping?.freeShipping !== filters.freeShipping) return false;
      
      // Seller verification filter
      if (filters.sellerVerification) {
        // This would require mapping seller verification to the filter value
        // For now, we'll skip this filter in the frontend
      }
      
      // Seller tier filter
      if (filters.sellerTier && product.seller.tier !== filters.sellerTier) return false;
      
      // Seller online status filter
      if (filters.sellerOnlineStatus && product.seller.onlineStatus !== filters.sellerOnlineStatus) return false;
      
      // Discount filter
      if (filters.hasDiscount !== undefined) {
        if (filters.hasDiscount && (!product.discount?.active)) return false;
        if (!filters.hasDiscount && product.discount?.active) return false;
      }
      
      if (filters.discountPercentage !== undefined && product.discount?.percentage !== undefined) {
        if (product.discount.percentage < filters.discountPercentage) return false;
      }
      
      // Stock filter
      if (filters.inStock !== undefined) {
        if (filters.inStock && (product.inventory === undefined || product.inventory <= 0)) return false;
        if (!filters.inStock && product.inventory !== undefined && product.inventory > 0) return false;
      }
      
      if (filters.stockRange) {
        const [minStock, maxStock] = filters.stockRange;
        if (minStock !== undefined && (product.inventory === undefined || product.inventory < minStock)) return false;
        if (maxStock !== undefined && product.inventory !== undefined && product.inventory > maxStock) return false;
      }
      
      // Additional filters would go here
      
      return true;
    });

    // Helper to normalize price across shapes used in tests and app
    const parsePriceNumber = (p: Product) => {
      // Support multiple shapes:
      // - p.price.usdEquivalent (string)
      // - p.price.amount (string)
      // - p as any).price.fiat (string from older tests)
      const anyPrice: any = p.price as any;
      const raw = (p.price as any)?.usdEquivalent
        ?? (p.price as any)?.amount
        ?? anyPrice?.fiat;
      const n = parseFloat(raw ?? 'NaN');
      return Number.isFinite(n) ? n : 0;
    };

    // Sort products only when a sortBy is provided; otherwise preserve input order
    if (sortBy) {
      filtered.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortBy.field) {
        case 'price':
          aValue = parsePriceNumber(a);
          bValue = parsePriceNumber(b);
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'createdAt':
          aValue = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt as any).getTime();
          bValue = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt as any).getTime();
          break;
        case 'reputation':
          aValue = a.seller.reputation;
          bValue = b.seller.reputation;
          break;
        case 'sales':
          aValue = a.favorites || 0;
          bValue = b.favorites || 0;
          break;
        case 'rating':
          aValue = a.views || 0;
          bValue = b.views || 0;
          break;
        case 'inventory':
          aValue = a.inventory || 0;
          bValue = b.inventory || 0;
          break;
        case 'discount':
          aValue = a.discount?.percentage || 0;
          bValue = b.discount?.percentage || 0;
          break;
        case 'handlingTime':
          aValue = a.shipping?.handlingTime || Number.MAX_VALUE;
          bValue = b.shipping?.handlingTime || Number.MAX_VALUE;
          break;
        default:
          // Relevance sorting would be handled on the backend; default to createdAt desc when requested
          aValue = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt as any).getTime();
          bValue = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt as any).getTime();
          break;
      }

      if (sortBy.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    }

    return filtered;
  }, [products, filters, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage);
  const paginatedProducts = filteredAndSortedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortBy]);

  // Optional infinite scroll using IntersectionObserver
  React.useEffect(() => {
    if (!infiniteScroll || !hasMore || loading) return;
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting) {
        onLoadMore?.();
      }
    }, { rootMargin: '200px' });

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [infiniteScroll, hasMore, onLoadMore, loading]);

  const handleFiltersChange = (newFilters: FilterOptions) => {
    onFiltersChange?.(newFilters);
  };

  // Ensure a non-undefined sort option for dependent components
  const effectiveSort: SortOption = sortBy ?? { field: 'createdAt', direction: 'desc' };

  const handleSortChange = (newSort: SortOption) => {
    onSortChange?.(newSort);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  if (error) {
    return (
      <GlassPanel variant="secondary" className="p-8 text-center">
        <div className="text-red-400 mb-4">⚠️ Error loading products</div>
        <p className="text-white/70">{error}</p>
      </GlassPanel>
    );
  }

  return (
    <div className={`product-grid ${className}`}>
      <div className="flex gap-6">
        {/* Filters Sidebar */}
        {showFilters && (
          <div className="w-64 flex-shrink-0 hidden lg:block">
            <FilterPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
              categories={categories}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1">
          {/* Sort Controls */}
          {showSorting && (
            <SortControls
              sortBy={effectiveSort}
              onSortChange={handleSortChange}
              layout={layout}
              onLayoutChange={setLayout}
            />
          )}

          {/* Results Count */}
          <div className="text-white/70 text-sm mb-4">
            {loading ? (
              <LoadingSkeleton variant="text" width="200px" height="1rem" />
            ) : (
              `Showing ${paginatedProducts.length} of ${filteredAndSortedProducts.length} products`
            )}
          </div>

          {/* Products Grid/List */}
          {loading ? (
            <div className={`grid gap-6 ${
              layout === 'grid' 
                ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5' 
                : 'grid-cols-1'
            }`}>
              {Array.from({ length: itemsPerPage }, (_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredAndSortedProducts.length === 0 ? (
            <GlassPanel variant="secondary" className="p-8 text-center">
              <div className="text-white/60 mb-4">🔍 No products found</div>
              <p className="text-white/70">Try adjusting your filters or search terms</p>
            </GlassPanel>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className={`grid gap-6 ${
                layout === 'grid' 
                  ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5' 
                  : 'grid-cols-1'
              }`}
            >
              <AnimatePresence>
                {paginatedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    variant={layout}
                    onProductClick={onProductClick}
                    onSellerClick={onSellerClick}
                    onAddToCart={onAddToCart}
                    onAddToWishlist={onAddToWishlist}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Pagination */}
          {showPagination && !loading && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}

          {/* Infinite Scroll Sentinel / Load More */}
          {!showPagination && !loading && hasMore && (
            <div className="flex justify-center mt-6">
              {infiniteScroll ? (
                <div ref={loadMoreRef} className="h-1 w-full" aria-hidden />
              ) : (
                <Button variant="outline" onClick={() => onLoadMore?.()}>
                  Load more
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductGrid;