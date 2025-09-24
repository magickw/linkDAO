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

  // Mock data for demonstration
  // In a real implementation, this would come from API calls
  const mockProducts: Product[] = [
    {
      id: '1',
      title: 'Premium Wireless Headphones',
      description: 'High-quality wireless headphones with noise cancellation',
      images: ['https://placehold.co/300x300'],
      price: {
        amount: '0.5',
        currency: 'ETH',
        usdEquivalent: '1500.00',
        eurEquivalent: '1350.00',
        gbpEquivalent: '1170.00'
      },
      seller: {
        id: 'seller1',
        name: 'TechGadgets Store',
        avatar: 'https://placehold.co/50x50',
        verified: true,
        reputation: 4.8,
        daoApproved: true,
        tier: 'premium',
        onlineStatus: 'online'
      },
      trust: {
        verified: true,
        escrowProtected: true,
        onChainCertified: true
      },
      category: 'Electronics',
      isNFT: false,
      inventory: 25,
      views: 1250,
      favorites: 89,
      condition: 'new',
      brand: 'AudioTech',
      hasWarranty: true,
      shipping: {
        freeShipping: true,
        handlingTime: 1,
        shipsFrom: {
          country: 'USA'
        }
      },
      discount: {
        percentage: 15,
        active: true
      },
      isFeatured: true,
      isPublished: true,
      createdAt: new Date(),
      tags: ['wireless', 'headphones', 'audio', 'tech']
    },
    {
      id: '2',
      title: 'Vintage Leather Jacket',
      description: 'Authentic vintage leather jacket from the 80s',
      images: ['https://placehold.co/300x300'],
      price: {
        amount: '2.5',
        currency: 'ETH',
        usdEquivalent: '7500.00',
        eurEquivalent: '6750.00',
        gbpEquivalent: '5850.00'
      },
      seller: {
        id: 'seller2',
        name: 'Vintage Fashion',
        avatar: 'https://placehold.co/50x50',
        verified: true,
        reputation: 4.9,
        daoApproved: false,
        tier: 'premium',
        onlineStatus: 'away'
      },
      trust: {
        verified: true,
        escrowProtected: true,
        onChainCertified: false
      },
      category: 'Fashion',
      isNFT: false,
      inventory: 3,
      views: 890,
      favorites: 156,
      condition: 'used',
      brand: 'LeatherCraft',
      hasWarranty: false,
      shipping: {
        freeShipping: false,
        handlingTime: 3,
        shipsFrom: {
          country: 'Italy'
        }
      },
      isFeatured: false,
      isPublished: true,
      createdAt: new Date(),
      tags: ['vintage', 'leather', 'fashion', 'jacket']
    }
  ];

  const mockCategories = ['Electronics', 'Fashion', 'Home & Garden', 'Sports', 'Books', 'Toys'];
  const mockBrands = ['AudioTech', 'LeatherCraft', 'HomeStyle', 'SportMax', 'BookWorm', 'ToyJoy'];
  const mockCountries = ['USA', 'China', 'Germany', 'Italy', 'Japan', 'UK'];
  const mockTags = ['wireless', 'headphones', 'audio', 'tech', 'vintage', 'leather', 'fashion', 'jacket'];

  // Initialize mock data
  useEffect(() => {
    setProducts(mockProducts);
    setCategories(mockCategories);
    setBrands(mockBrands);
    setCountries(mockCountries);
    setTags(mockTags);
  }, []);

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // In a real implementation, this would call the search API
    console.log('Searching for:', query);
  };

  // Handle filter changes
  const handleFiltersChange = (newFilters: AdvancedSearchFilters) => {
    setFilters(newFilters);
    // In a real implementation, this would call the search API with filters
    console.log('Filters changed:', newFilters);
  };

  // Handle sort changes
  const handleSortChange = (newSort: SearchFiltersSortOption) => {
    setSortBy(newSort);
    // In a real implementation, this would call the search API with sort options
    console.log('Sort changed:', newSort);
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
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;