/**
 * RedesignedMarketplace - New marketplace page with enhanced UX
 * Features: improved hierarchy, powerful filters, density toggle, skeleton loaders
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '@/components/Layout';
import { useDebounce } from '@/hooks/useDebounce';
import { designTokens } from '@/design-system/tokens';
import { GlassPanel } from '@/design-system/components/GlassPanel';

// Import new components
import { EnhancedProductCard, DensityMode } from '@/components/Marketplace/ProductDisplay/EnhancedProductCard';
import { FilterBar, FilterOptions } from '@/components/Marketplace/ProductDisplay/FilterBar';
import { ViewDensityToggle, useDensityPreference } from '@/components/Marketplace/ProductDisplay/ViewDensityToggle';
import { SortingControls, SortField, SortDirection } from '@/components/Marketplace/ProductDisplay/SortingControls';
import { MarketplaceTopBar } from '@/components/Marketplace/ProductDisplay/MarketplaceTopBar';

// Mock product data - replace with actual API
const mockProducts = [
  {
    id: '1',
    title: 'Premium Wireless Headphones',
    description: 'High-quality noise-canceling headphones',
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'],
    price: { amount: '0.15', currency: 'ETH', usdEquivalent: '299.99' },
    seller: {
      id: 'seller1',
      name: 'TechGear Pro',
      verified: true,
      rating: 4.8,
      reviewCount: 234,
      daoApproved: true,
    },
    trust: { verified: true, escrowProtected: true, onChainCertified: true },
    category: 'electronics',
    stock: 15,
    shipping: { free: true, deliverySpeed: 'Ships in 24h' },
    condition: 'new' as const,
    discount: 15,
  },
  {
    id: '2',
    title: 'Smart Watch Pro Series 8',
    description: 'Advanced fitness tracking with heart rate monitor',
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400'],
    price: { amount: '0.08', currency: 'ETH', usdEquivalent: '159.99' },
    seller: {
      id: 'seller2',
      name: 'WearableTech',
      verified: true,
      rating: 4.6,
      reviewCount: 189,
      daoApproved: false,
    },
    trust: { verified: true, escrowProtected: true },
    category: 'electronics',
    stock: 8,
    shipping: { free: false, deliverySpeed: '2-3 days' },
    condition: 'new' as const,
  },
  {
    id: '3',
    title: 'Vintage Leather Backpack',
    description: 'Handcrafted genuine leather backpack',
    images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400'],
    price: { amount: '0.05', currency: 'ETH', usdEquivalent: '99.99' },
    seller: {
      id: 'seller3',
      name: 'Artisan Goods',
      verified: true,
      rating: 4.9,
      reviewCount: 456,
      daoApproved: true,
    },
    trust: { verified: true, escrowProtected: true, onChainCertified: true },
    category: 'fashion',
    stock: 3,
    shipping: { free: true, deliverySpeed: 'Ships in 48h' },
    condition: 'new' as const,
  },
  // Add more products...
];

const RedesignedMarketplace: React.FC = () => {
  const router = useRouter();
  const { density, setDensity } = useDensityPreference();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [sortField, setSortField] = useState<SortField>('relevance');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isLoading, setIsLoading] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...mockProducts];

    // Search filter
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (filters.category) {
      result = result.filter((p) => p.category === filters.category);
    }

    // Price range filter
    if (filters.priceRange) {
      const { min, max } = filters.priceRange;
      result = result.filter((p) => {
        const price = parseFloat(p.price.usdEquivalent || '0');
        if (min !== undefined && price < min) return false;
        if (max !== undefined && price > max) return false;
        return true;
      });
    }

    // Condition filter
    if (filters.condition) {
      result = result.filter((p) => p.condition === filters.condition);
    }

    // Trust filters
    if (filters.verified) {
      result = result.filter((p) => p.seller.verified);
    }
    if (filters.escrowProtected) {
      result = result.filter((p) => p.trust?.escrowProtected);
    }
    if (filters.daoApproved) {
      result = result.filter((p) => p.seller.daoApproved);
    }

    // Shipping filters
    if (filters.freeShipping) {
      result = result.filter((p) => p.shipping?.free);
    }

    // Stock filter
    if (filters.inStock) {
      result = result.filter((p) => (p.stock ?? 0) > 0);
    }

    // Rating filter
    if (filters.minRating) {
      result = result.filter((p) => (p.seller.rating ?? 0) >= filters.minRating!);
    }

    // Sort products
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'price':
          const priceA = parseFloat(a.price.usdEquivalent || '0');
          const priceB = parseFloat(b.price.usdEquivalent || '0');
          comparison = priceA - priceB;
          break;
        case 'rating':
          comparison = (b.seller.rating || 0) - (a.seller.rating || 0);
          break;
        case 'popularity':
          comparison = (b.seller.reviewCount || 0) - (a.seller.reviewCount || 0);
          break;
        case 'date':
          // Mock - in real app would use actual dates
          comparison = 0;
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [mockProducts, debouncedSearch, filters, sortField, sortDirection]);

  // Grid columns based on density
  const gridColumns =
    density === 'comfortable'
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6';

  return (
    <Layout title="Marketplace - LinkDAO">
      {/* Background */}
      <div
        className="fixed inset-0 z-0"
        style={{ background: designTokens.gradients.heroMain }}
      />

      {/* Top Bar */}
      <MarketplaceTopBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        cartItemCount={0}
        onCartClick={() => router.push('/cart')}
      />

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Bar with Chips */}
        <FilterBar filters={filters} onFiltersChange={setFilters} className="mb-6" />

        {/* Secondary Bar: Sort + Density + Result Count */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <SortingControls
              currentSort={{ field: sortField, direction: sortDirection }}
              onSortChange={(field, direction) => {
                setSortField(field);
                setSortDirection(direction);
              }}
            />
            <div className="text-sm text-white/70">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
            </div>
          </div>

          <ViewDensityToggle density={density} onDensityChange={setDensity} />
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className={`grid ${gridColumns} gap-4`}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-96 rounded-lg animate-pulse"
                style={{ background: designTokens.glassmorphism.secondary.background }}
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <GlassPanel variant="secondary" className="py-16 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-white mb-2">No products found</h3>
            <p className="text-white/70 mb-6">
              Try adjusting your filters or search terms
            </p>
            {Object.keys(filters).length > 0 && (
              <button
                onClick={() => setFilters({})}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Clear all filters
              </button>
            )}
          </GlassPanel>
        ) : (
          <motion.div
            className={`grid ${gridColumns} gap-4`}
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.05,
                },
              },
            }}
          >
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <EnhancedProductCard
                    product={product}
                    density={density}
                    onProductClick={(id) => router.push(`/marketplace/product/${id}`)}
                    onSellerClick={(id) => router.push(`/marketplace/seller/${id}`)}
                    onAddToCart={(id) => console.log('Add to cart:', id)}
                    onToggleFavorite={(id) => console.log('Toggle favorite:', id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Pagination would go here */}
      </div>
    </Layout>
  );
};

export default RedesignedMarketplace;
