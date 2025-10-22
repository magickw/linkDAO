/**
 * EnhancedProductGrid Component - Amazon-style responsive product grid with Web3 features
 * Features: Lazy loading, skeleton loaders, smart filtering, dual pricing, trust indicators
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { 
  Grid, List, Filter, ChevronDown, Star, Shield, CheckCircle, Vote,
  Eye, Heart, ShoppingCart, Search, X
} from 'lucide-react';
import { ProductCard } from './ProductCard';
import { LoadingSkeleton } from '../../../design-system/components/LoadingSkeleton';
import { GlassPanel } from '../../../design-system/components/GlassPanel';
import { Button } from '../../../design-system/components/Button';
import { designTokens } from '../../../design-system/tokens';

// Enhanced Product interface with S3 optimized images
interface EnhancedProduct {
  id: string;
  title: string;
  description: string;
  images: {
    thumbnail: string;      // S3 optimized thumbnail (300x300)
    small: string;         // S3 optimized small (600x600)
    large: string;         // S3 optimized large (1200x1200)
  };
  price: {
    crypto: string;
    cryptoSymbol: string;
    fiat: string;
    fiatSymbol: string;
    isAuction?: boolean;
    currentBid?: string;
  };
  seller: {
    id: string;
    name: string;
    avatar: string;
    verified: boolean;
    reputation: number;
    daoApproved: boolean;
    badges: ('verified' | 'dao-approved' | 'top-seller')[];
  };
  trust: {
    verified: boolean;
    escrowProtected: boolean;
    onChainCertified: boolean;
    safetyScore: number; // 0-100
  };
  category: string;
  isNFT?: boolean;
  inventory?: number;
  shipping: {
    freeShipping: boolean;
    estimatedDays: string;
    cost?: string;
    digitalDelivery?: boolean;
  };
  reviews: {
    average: number;
    count: number;
  };
  createdAt: Date;
  featured?: boolean;
  stats: {
    views: number;
    likes: number;
  };
}

interface EnhancedFilterOptions {
  category?: string;
  priceRange?: [number, number];
  verified?: boolean;
  escrowProtected?: boolean;
  onChainCertified?: boolean;
  daoApproved?: boolean;
  inStock?: boolean;
  freeShipping?: boolean;
  digitalOnly?: boolean;
  auctionOnly?: boolean;
  nftOnly?: boolean;
  minReviews?: number;
  minRating?: number;
  searchQuery?: string;
}

interface SortOption {
  field: 'price' | 'title' | 'createdAt' | 'reputation' | 'reviews' | 'popularity';
  direction: 'asc' | 'desc';
  label: string;
}

interface EnhancedProductGridProps {
  products: EnhancedProduct[];
  loading?: boolean;
  error?: string;
  filters?: EnhancedFilterOptions;
  sortBy?: SortOption;
  layout?: 'grid' | 'list';
  gridCols?: '3' | '4' | '5';
  itemsPerPage?: number;
  showFilters?: boolean;
  showSorting?: boolean;
  showQuickView?: boolean;
  onProductClick?: (productId: string) => void;
  onAddToCart?: (productId: string) => void;
  onAddToWishlist?: (productId: string) => void;
  onQuickView?: (productId: string) => void;
  onFiltersChange?: (filters: EnhancedFilterOptions) => void;
  onSortChange?: (sort: SortOption) => void;
  className?: string;
}

// Sort options configuration
const sortOptions: SortOption[] = [
  { field: 'popularity', direction: 'desc', label: 'Most Popular' },
  { field: 'price', direction: 'asc', label: 'Price: Low to High' },
  { field: 'price', direction: 'desc', label: 'Price: High to Low' },
  { field: 'reviews', direction: 'desc', label: 'Customer Reviews' },
  { field: 'createdAt', direction: 'desc', label: 'Newest First' },
];

// Enhanced Product Card for grid display
const EnhancedProductCard: React.FC<{
  product: EnhancedProduct;
  onProductClick?: (productId: string) => void;
  onAddToCart?: (productId: string) => void;
  onAddToWishlist?: (productId: string) => void;
  onQuickView?: (productId: string) => void;
  showQuickView?: boolean;
}> = ({ product, onProductClick, onAddToCart, onAddToWishlist, onQuickView, showQuickView }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isAddedToCart, setIsAddedToCart] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart?.(product.id);
    setIsAddedToCart(true);
    // Reset the added state after 2 seconds
    setTimeout(() => setIsAddedToCart(false), 2000);
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
    onAddToWishlist?.(product.id);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickView?.(product.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      whileHover={{ y: -4 }}
      className="group cursor-pointer"
      onClick={() => onProductClick?.(product.id)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <GlassPanel 
        variant="primary" 
        className="h-full overflow-hidden transition-all duration-300 group-hover:shadow-2xl border border-gray-200 dark:border-white/20 bg-white/80 dark:bg-black/30"
      >
        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden">
          {!imageLoaded && (
            <div className="absolute inset-0">
              <LoadingSkeleton variant="image" height="100%" />
            </div>
          )}
          
          <img
            src={product.images.small}
            alt={product.title}
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
          />

          {/* Badges & Quick Actions */}
          <div className="absolute inset-0">
            {/* Top badges */}
            <div className="absolute top-2 left-2 flex flex-wrap gap-1">
              {product.featured && (
                <span className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold rounded shadow-lg">
                  FEATURED
                </span>
              )}
              {product.shipping.freeShipping && (
                <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded shadow">
                  FREE SHIPPING
                </span>
              )}
              {product.isNFT && (
                <span className="px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded shadow">
                  NFT
                </span>
              )}
              {product.price.isAuction && (
                <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded shadow">
                  AUCTION
                </span>
              )}
            </div>

            {/* Quick action buttons */}
            <AnimatePresence>
              {showActions && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute top-2 right-2 flex flex-col gap-2"
                >
                  <button
                    onClick={handleWishlistToggle}
                    className="w-8 h-8 rounded-full bg-white/95 dark:bg-white/95 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                  >
                    <Heart 
                      size={16} 
                      className={isWishlisted ? 'text-red-500 fill-current' : 'text-gray-700'} 
                    />
                  </button>
                  {showQuickView && (
                    <button
                      onClick={handleQuickView}
                      className="w-8 h-8 rounded-full bg-white/95 dark:bg-white/95 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                    >
                      <Eye size={16} className="text-gray-700" />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom action overlay */}
            <AnimatePresence>
              {showActions && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-2 left-2 right-2"
                >
                  <Button
                    variant="primary"
                    size="small"
                    onClick={handleAddToCart}
                    className={`w-full font-medium backdrop-blur-sm ${
                      isAddedToCart 
                        ? 'bg-green-500 text-white' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isAddedToCart ? (
                      <>
                        <CheckCircle size={16} className="mr-2" />
                        Added to Cart
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={16} className="mr-2" />
                        Add to Cart
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Product Info */}
        <div className="p-4 space-y-3">
          {/* Seller info */}
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onProductClick?.(`seller-${product.seller.id}`);
              }}
              className="flex items-center gap-2 hover:bg-white/10 dark:hover:bg-white/10 rounded px-2 py-1 -mx-2 -my-1 transition-colors group/seller"
              title="View seller profile"
            >
              <img 
                src={product.seller.avatar} 
                alt={product.seller.name}
                className="w-5 h-5 rounded-full"
              />
              <span className="text-gray-900 dark:text-white font-medium group-hover/seller:text-blue-600 dark:group-hover/seller:text-blue-400 transition-colors">
                {product.seller.name}
              </span>
              {product.seller.verified && <CheckCircle size={14} className="text-green-400" />}
              {product.seller.daoApproved && (
                <span className="px-1.5 py-0.5 bg-yellow-500/30 text-yellow-800 dark:text-yellow-300 text-xs rounded font-medium">
                  DAO
                </span>
              )}
              <span className="text-xs text-gray-400 opacity-0 group-hover/seller:opacity-100 transition-opacity">
                →
              </span>
            </button>
          </div>

          {/* Product title */}
          <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2 leading-tight">
            {product.title}
          </h3>

          {/* Reviews */}
          {product.reviews.count > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={i < Math.floor(product.reviews.average) ? 'text-yellow-400 fill-current' : 'text-gray-400'}
                  />
                ))}
              </div>
              <span className="text-gray-900 dark:text-white font-medium">
                {product.reviews.average.toFixed(1)}
              </span>
              <span className="text-gray-700 dark:text-white/70">
                ({product.reviews.count})
              </span>
            </div>
          )}

          {/* Price */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {product.price.crypto} {product.price.cryptoSymbol}
              </span>
              {product.price.isAuction && product.price.currentBid && (
                <span className="text-xs text-gray-700 dark:text-white/60">Current bid</span>
              )}
            </div>
            <div className="text-sm text-gray-800 dark:text-white/80 font-medium">
              ≈ {product.price.fiat} {product.price.fiatSymbol}
            </div>
          </div>

          {/* Trust indicators */}
          <div className="flex items-center gap-2 text-sm">
            {product.trust.escrowProtected && (
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-300 font-medium">
                <Shield size={14} />
                <span>Escrow</span>
              </span>
            )}
            {product.trust.onChainCertified && (
              <span className="flex items-center gap-1 text-purple-600 dark:text-purple-300 font-medium">
                <CheckCircle size={14} />
                <span>Verified</span>
              </span>
            )}
            {product.seller.daoApproved && (
              <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-300 font-medium">
                <Vote size={14} />
                <span>DAO</span>
              </span>
            )}
          </div>

          {/* Shipping info */}
          <div className="text-xs text-gray-700 dark:text-white/80">
            {product.shipping.digitalDelivery ? (
              'Instant digital delivery'
            ) : product.shipping.freeShipping ? (
              `Free shipping • ${product.shipping.estimatedDays} delivery`
            ) : (
              `${product.shipping.cost} shipping • ${product.shipping.estimatedDays} delivery`
            )}
          </div>
        </div>
        
        {/* Add to Cart Button - Always visible */}
        <div className="px-4 pb-4 space-y-2">
          <Button
            variant="primary"
            size="small"
            onClick={handleAddToCart}
            className={`w-full font-medium backdrop-blur-sm ${
              isAddedToCart 
                ? 'bg-green-500 text-white' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isAddedToCart ? (
              <>
                <CheckCircle size={16} className="mr-2" />
                Added to Cart
              </>
            ) : (
              <>
                <ShoppingCart size={16} className="mr-2" />
                Add to Cart
              </>
            )}
          </Button>
          
          {/* View Store Button */}
          <Button
            variant="outline"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onProductClick?.(`seller-${product.seller.id}`);
            }}
            className="w-full font-medium text-gray-700 dark:text-white/80 border-gray-300 dark:border-white/30 hover:bg-gray-100 dark:hover:bg-white/10"
          >
            View {product.seller.name}'s Store
          </Button>
        </div>
      </GlassPanel>
    </motion.div>
  );
};

export const EnhancedProductGrid: React.FC<EnhancedProductGridProps> = ({
  products,
  loading = false,
  error,
  filters = {},
  sortBy = sortOptions[0],
  layout = 'grid',
  gridCols = '4',
  itemsPerPage = 20,
  showFilters = true,
  showSorting = true,
  showQuickView = true,
  onProductClick,
  onAddToCart,
  onAddToWishlist,
  onQuickView,
  onFiltersChange,
  onSortChange,
  className = '',
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Apply filters and sorting
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter(product => {
      if (filters.category && product.category !== filters.category) return false;
      if (filters.verified && !product.trust.verified) return false;
      if (filters.escrowProtected && !product.trust.escrowProtected) return false;
      if (filters.onChainCertified && !product.trust.onChainCertified) return false;
      if (filters.daoApproved && !product.seller.daoApproved) return false;
      if (filters.inStock && product.inventory !== undefined && product.inventory <= 0) return false;
      if (filters.freeShipping && !product.shipping.freeShipping) return false;
      if (filters.digitalOnly && !product.shipping.digitalDelivery) return false;
      if (filters.nftOnly && !product.isNFT) return false;
      if (filters.auctionOnly && !product.price.isAuction) return false;
      
      if (filters.priceRange) {
        const price = parseFloat(product.price.crypto);
        if (price < filters.priceRange[0] || price > filters.priceRange[1]) return false;
      }
      
      if (filters.minRating && product.reviews.average < filters.minRating) return false;
      if (filters.minReviews && product.reviews.count < filters.minReviews) return false;
      
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const searchText = `${product.title} ${product.description} ${product.seller.name}`.toLowerCase();
        if (!searchText.includes(query)) return false;
      }
      
      return true;
    });

    // Sort products
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy.field) {
        case 'price':
          aValue = parseFloat(a.price.crypto);
          bValue = parseFloat(b.price.crypto);
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
        case 'reviews':
          aValue = a.reviews.average * a.reviews.count;
          bValue = b.reviews.average * b.reviews.count;
          break;
        case 'popularity':
          aValue = a.stats.views + a.stats.likes * 2;
          bValue = b.stats.views + b.stats.likes * 2;
          break;
        default:
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
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
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredAndSortedProducts.slice(startIndex, startIndex + itemsPerPage);

  // Animation variants
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
      <GlassPanel variant="primary" className="p-8 text-center">
        <div className="text-red-400 mb-4">Error loading products</div>
        <p className="text-white/70">{error}</p>
      </GlassPanel>
    );
  }

  const gridColsClass = {
    '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    '4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    '5': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with sorting */}
      {showSorting && (
        <div className="flex items-center justify-between">
          <p className="text-white/70">
            {filteredAndSortedProducts.length} product{filteredAndSortedProducts.length !== 1 ? 's' : ''}
          </p>
          
          <div className="flex items-center gap-4">
            <select
              value={`${sortBy.field}-${sortBy.direction}`}
              onChange={(e) => {
                const [field, direction] = e.target.value.split('-');
                onSortChange?.({ 
                  field: field as SortOption['field'], 
                  direction: direction as SortOption['direction'],
                  label: sortOptions.find(opt => opt.field === field && opt.direction === direction)?.label || ''
                });
              }}
              className="p-2 rounded text-white bg-white/10 border border-white/20 backdrop-blur-sm"
            >
              {sortOptions.map((option) => (
                <option 
                  key={`${option.field}-${option.direction}`} 
                  value={`${option.field}-${option.direction}`}
                  className="bg-gray-800"
                >
                  {option.label}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {/* setLayout('grid') */}}
                className={`p-2 rounded ${layout === 'grid' ? 'bg-white/20' : 'bg-white/10'} text-white hover:bg-white/20 transition-colors`}
              >
                <Grid size={20} />
              </button>
              <button
                onClick={() => {/* setLayout('list') */}}
                className={`p-2 rounded ${layout === 'list' ? 'bg-white/20' : 'bg-white/10'} text-white hover:bg-white/20 transition-colors`}
              >
                <List size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className={`grid gap-6 ${gridColsClass[gridCols]}`}>
          {[...Array(itemsPerPage)].map((_, index) => (
            <div key={index} className="space-y-4">
              <LoadingSkeleton variant="image" height="300px" />
              <LoadingSkeleton variant="text" />
              <LoadingSkeleton variant="text" width="60%" />
            </div>
          ))}
        </div>
      ) : filteredAndSortedProducts.length === 0 ? (
        <GlassPanel variant="primary" className="p-12 text-center">
          <div className="text-white/60 mb-4">🔍 No products found</div>
          <p className="text-white/70">Try adjusting your filters or search terms</p>
        </GlassPanel>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className={`grid gap-6 ${gridColsClass[gridCols]}`}
        >
          <AnimatePresence>
            {paginatedProducts.map((product) => (
              <EnhancedProductCard
                key={product.id}
                product={product}
                onProductClick={onProductClick}
                onAddToCart={onAddToCart}
                onAddToWishlist={onAddToWishlist}
                onQuickView={onQuickView}
                showQuickView={showQuickView}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="small"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "primary" : "outline"}
                  size="small"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              );
            })}
            
            <Button
              variant="outline"
              size="small"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedProductGrid;