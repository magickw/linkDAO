/**
 * ProductGrid Component - Responsive grid layout for product cards
 * Supports filtering, sorting, and pagination with glassmorphic styling
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProductCard } from './ProductCard';
import { LoadingSkeleton, ProductCardSkeleton } from '../../../design-system/components/LoadingSkeleton';
import { GlassPanel } from '../../../design-system/components/GlassPanel';
import { Button } from '../../../design-system/components/Button';
import { designTokens } from '../../../design-system/tokens';

interface Product {
  id: string;
  title: string;
  description: string;
  images: string[];
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
}

interface FilterOptions {
  category?: string;
  priceRange?: [number, number];
  verified?: boolean;
  escrowProtected?: boolean;
  onChainCertified?: boolean;
  daoApproved?: boolean;
  inStock?: boolean;
}

interface SortOption {
  field: 'price' | 'title' | 'createdAt' | 'reputation';
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

      {/* Trust Filters */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Trust & Verification</label>
        <div className="space-y-2">
          {[
            { key: 'verified', label: 'Verified Only', icon: '✅' },
            { key: 'escrowProtected', label: 'Escrow Protected', icon: '🔒' },
            { key: 'onChainCertified', label: 'On-Chain Certified', icon: '⛓️' },
            { key: 'daoApproved', label: 'DAO Approved', icon: '🏛️' },
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
        size="small"
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
        <option value="createdAt-desc" className="bg-gray-800">Newest First</option>
        <option value="createdAt-asc" className="bg-gray-800">Oldest First</option>
        <option value="price-asc" className="bg-gray-800">Price: Low to High</option>
        <option value="price-desc" className="bg-gray-800">Price: High to Low</option>
        <option value="title-asc" className="bg-gray-800">Name: A to Z</option>
        <option value="title-desc" className="bg-gray-800">Name: Z to A</option>
        <option value="reputation-desc" className="bg-gray-800">Best Rated</option>
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
        size="small"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
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
            >
              {page}
            </button>
          )}
        </React.Fragment>
      ))}

      <Button
        variant="outline"
        size="small"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
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
  filters = {},
  sortBy = { field: 'createdAt', direction: 'desc' },
  layout: initialLayout = 'grid',
  itemsPerPage = 12,
  showFilters = true,
  showSorting = true,
  showPagination = true,
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

  // Get unique categories for filter
  const categories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category))).sort();
  }, [products]);

  // Apply filters and sorting
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter(product => {
      if (filters.category && product.category !== filters.category) return false;
      if (filters.verified && !product.trust.verified) return false;
      if (filters.escrowProtected && !product.trust.escrowProtected) return false;
      if (filters.onChainCertified && !product.trust.onChainCertified) return false;
      if (filters.daoApproved && !product.seller.daoApproved) return false;
      if (filters.inStock && product.inventory !== undefined && product.inventory <= 0) return false;
      
      return true;
    });

    // Sort products
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy.field) {
        case 'price':
          aValue = parseFloat(a.price.fiat);
          bValue = parseFloat(b.price.fiat);
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'createdAt':
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
          break;
        case 'reputation':
          aValue = a.seller.reputation;
          bValue = b.seller.reputation;
          break;
        default:
          return 0;
      }

      if (sortBy.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

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

  const handleFiltersChange = (newFilters: FilterOptions) => {
    onFiltersChange?.(newFilters);
  };

  const handleSortChange = (newSort: SortOption) => {
    onSortChange?.(newSort);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
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
              sortBy={sortBy}
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
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
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
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
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
        </div>
      </div>
    </div>
  );
};

export default ProductGrid;