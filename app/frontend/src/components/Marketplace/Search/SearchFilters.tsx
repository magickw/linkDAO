/**
 * SearchFilters Component - Advanced filtering and sorting controls for product search
 * Provides UI for all available filtering and sorting options from the backend
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Filter, X, ChevronDown, Star, Shield, CheckCircle, Vote,
  Truck, Tag, Heart, Eye, Calendar, TrendingUp, Percent,
  MapPin, Clock, Award, Wrench, Zap, Globe, User, Layers
} from 'lucide-react';
import { GlassPanel } from '../../../design-system/components/GlassPanel';
import { Button } from '../../../design-system/components/Button';
import { designTokens } from '../../../design-system/tokens';
import { 
  AnimatedFilterToggle, 
  filterPanelAnimations 
} from '../../../components/VisualPolish/MarketplaceAnimations';

// Define filter types based on backend capabilities
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

interface SortOption {
  field: 'price' | 'createdAt' | 'updatedAt' | 'title' | 'views' | 'favorites' | 'relevance' | 'reputation' | 'sales' | 'rating' | 'inventory' | 'discount' | 'handlingTime';
  direction: 'asc' | 'desc';
  label: string;
}

interface FilterCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  filters: string[];
}

interface SearchFiltersProps {
  filters: AdvancedSearchFilters;
  onFiltersChange: (filters: AdvancedSearchFilters) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  categories: string[];
  brands: string[];
  countries: string[];
  tags: string[];
  customAttributes: Record<string, any[]>;
  className?: string;
}

// Sort options configuration
const sortOptions: SortOption[] = [
  { field: 'relevance', direction: 'desc', label: 'Best Match' },
  { field: 'createdAt', direction: 'desc', label: 'Newest First' },
  { field: 'createdAt', direction: 'asc', label: 'Oldest First' },
  { field: 'price', direction: 'asc', label: 'Price: Low to High' },
  { field: 'price', direction: 'desc', label: 'Price: High to Low' },
  { field: 'title', direction: 'asc', label: 'Name: A to Z' },
  { field: 'title', direction: 'desc', label: 'Name: Z to A' },
  { field: 'reputation', direction: 'desc', label: 'Best Rated' },
  { field: 'sales', direction: 'desc', label: 'Most Popular' },
  { field: 'rating', direction: 'desc', label: 'Highest Rating' },
  { field: 'inventory', direction: 'desc', label: 'Most Available' },
  { field: 'discount', direction: 'desc', label: 'Highest Discount' },
  { field: 'handlingTime', direction: 'asc', label: 'Fastest Shipping' },
];

// Filter categories for organized UI
const filterCategories: FilterCategory[] = [
  {
    id: 'basic',
    name: 'Basic Filters',
    icon: <Filter size={16} />,
    filters: ['category', 'priceRange', 'brand', 'productCondition']
  },
  {
    id: 'trust',
    name: 'Trust & Verification',
    icon: <Shield size={16} />,
    filters: ['verified', 'escrowProtected', 'onChainCertified', 'daoApproved']
  },
  {
    id: 'seller',
    name: 'Seller',
    icon: <User size={16} />,
    filters: ['sellerVerification', 'sellerTier', 'sellerOnlineStatus', 'minReputationScore']
  },
  {
    id: 'shipping',
    name: 'Shipping',
    icon: <Truck size={16} />,
    filters: ['freeShipping', 'fastShipping', 'minHandlingTime', 'maxHandlingTime', 'shipsToCountry']
  },
  {
    id: 'pricing',
    name: 'Pricing',
    icon: <Percent size={16} />,
    filters: ['hasDiscount', 'discountPercentage']
  },
  {
    id: 'inventory',
    name: 'Inventory',
    icon: <Layers size={16} />,
    filters: ['inStock', 'stockRange']
  },
  {
    id: 'engagement',
    name: 'Popularity',
    icon: <TrendingUp size={16} />,
    filters: ['minViews', 'minFavorites', 'recentlyAdded', 'trending']
  },
  {
    id: 'tags',
    name: 'Tags',
    icon: <Tag size={16} />,
    filters: ['tagsInclude', 'tagsExclude']
  }
];

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
  categories,
  brands,
  countries,
  tags,
  customAttributes,
  className = ''
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('basic');
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState<AdvancedSearchFilters>(filters);

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: keyof AdvancedSearchFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    setLocalFilters({});
    onFiltersChange({});
  };

  const renderFilterControl = (filterKey: string) => {
    switch (filterKey) {
      case 'category':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">Category</label>
            <select
              value={localFilters.category || ''}
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
        );

      case 'priceRange':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">Price Range</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={localFilters.priceRange?.[0] || ''}
                onChange={(e) => handleFilterChange('priceRange', [
                  e.target.value ? parseFloat(e.target.value) : undefined, 
                  localFilters.priceRange?.[1]
                ])}
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
                value={localFilters.priceRange?.[1] || ''}
                onChange={(e) => handleFilterChange('priceRange', [
                  localFilters.priceRange?.[0], 
                  e.target.value ? parseFloat(e.target.value) : undefined
                ])}
                className="w-full p-2 rounded text-white"
                style={{
                  background: designTokens.glassmorphism.secondary.background,
                  border: designTokens.glassmorphism.secondary.border,
                  backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
                }}
              />
            </div>
          </div>
        );

      case 'brand':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">Brand</label>
            <select
              value={localFilters.brand || ''}
              onChange={(e) => handleFilterChange('brand', e.target.value || undefined)}
              className="w-full p-2 rounded text-white"
              style={{
                background: designTokens.glassmorphism.secondary.background,
                border: designTokens.glassmorphism.secondary.border,
                backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
              }}
            >
              <option value="">All Brands</option>
              {brands.map((brand) => (
                <option key={brand} value={brand} className="bg-gray-800">
                  {brand}
                </option>
              ))}
            </select>
          </div>
        );

      case 'productCondition':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">Condition</label>
            <select
              value={localFilters.productCondition || ''}
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
        );

      case 'verified':
      case 'escrowProtected':
      case 'onChainCertified':
      case 'daoApproved':
      case 'hasWarranty':
      case 'isNFT':
      case 'freeShipping':
      case 'fastShipping':
      case 'inStock':
      case 'hasDiscount':
      case 'recentlyAdded':
      case 'trending':
        return (
          <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(localFilters[filterKey as keyof AdvancedSearchFilters])}
              onChange={(e) => handleFilterChange(filterKey as keyof AdvancedSearchFilters, e.target.checked)}
              className="rounded"
            />
            <span className="capitalize">
              {filterKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </span>
          </label>
        );

      case 'sellerVerification':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">Seller Verification</label>
            <select
              value={localFilters.sellerVerification || ''}
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
        );

      case 'sellerTier':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">Seller Tier</label>
            <select
              value={localFilters.sellerTier || ''}
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
        );

      case 'sellerOnlineStatus':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">Seller Status</label>
            <select
              value={localFilters.sellerOnlineStatus || ''}
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
        );

      case 'minReputationScore':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">Min Reputation Score</label>
            <input
              type="number"
              placeholder="Minimum score"
              value={localFilters.minReputationScore || ''}
              onChange={(e) => handleFilterChange('minReputationScore', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full p-2 rounded text-white"
              style={{
                background: designTokens.glassmorphism.secondary.background,
                border: designTokens.glassmorphism.secondary.border,
                backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
              }}
            />
          </div>
        );

      case 'minHandlingTime':
      case 'maxHandlingTime':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">
              {filterKey === 'minHandlingTime' ? 'Min Handling Time (days)' : 'Max Handling Time (days)'}
            </label>
            <input
              type="number"
              placeholder={filterKey === 'minHandlingTime' ? 'Min days' : 'Max days'}
              value={localFilters[filterKey as keyof AdvancedSearchFilters] as number || ''}
              onChange={(e) => handleFilterChange(filterKey as keyof AdvancedSearchFilters, e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full p-2 rounded text-white"
              style={{
                background: designTokens.glassmorphism.secondary.background,
                border: designTokens.glassmorphism.secondary.border,
                backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
              }}
            />
          </div>
        );

      case 'shipsToCountry':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">Ships To Country</label>
            <select
              value={localFilters.shipsToCountry || ''}
              onChange={(e) => handleFilterChange('shipsToCountry', e.target.value || undefined)}
              className="w-full p-2 rounded text-white"
              style={{
                background: designTokens.glassmorphism.secondary.background,
                border: designTokens.glassmorphism.secondary.border,
                backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
              }}
            >
              <option value="">Any Country</option>
              {countries.map((country) => (
                <option key={country} value={country} className="bg-gray-800">
                  {country}
                </option>
              ))}
            </select>
          </div>
        );

      case 'discountPercentage':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">Min Discount %</label>
            <input
              type="number"
              placeholder="Minimum discount %"
              value={localFilters.discountPercentage || ''}
              onChange={(e) => handleFilterChange('discountPercentage', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full p-2 rounded text-white"
              style={{
                background: designTokens.glassmorphism.secondary.background,
                border: designTokens.glassmorphism.secondary.border,
                backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
              }}
            />
          </div>
        );

      case 'stockRange':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">Stock Range</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={localFilters.stockRange?.[0] || ''}
                onChange={(e) => handleFilterChange('stockRange', [
                  e.target.value ? parseInt(e.target.value) : undefined, 
                  localFilters.stockRange?.[1]
                ])}
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
                value={localFilters.stockRange?.[1] || ''}
                onChange={(e) => handleFilterChange('stockRange', [
                  localFilters.stockRange?.[0], 
                  e.target.value ? parseInt(e.target.value) : undefined
                ])}
                className="w-full p-2 rounded text-white"
                style={{
                  background: designTokens.glassmorphism.secondary.background,
                  border: designTokens.glassmorphism.secondary.border,
                  backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
                }}
              />
            </div>
          </div>
        );

      case 'minViews':
      case 'minFavorites':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">
              {filterKey === 'minViews' ? 'Min Views' : 'Min Favorites'}
            </label>
            <input
              type="number"
              placeholder={filterKey === 'minViews' ? 'Minimum views' : 'Minimum favorites'}
              value={localFilters[filterKey as keyof AdvancedSearchFilters] as number || ''}
              onChange={(e) => handleFilterChange(filterKey as keyof AdvancedSearchFilters, e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full p-2 rounded text-white"
              style={{
                background: designTokens.glassmorphism.secondary.background,
                border: designTokens.glassmorphism.secondary.border,
                backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
              }}
            />
          </div>
        );

      case 'tagsInclude':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">Include Tags</label>
            <select
              multiple
              value={localFilters.tagsInclude || []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                handleFilterChange('tagsInclude', selected.length > 0 ? selected : undefined);
              }}
              className="w-full p-2 rounded text-white h-32"
              style={{
                background: designTokens.glassmorphism.secondary.background,
                border: designTokens.glassmorphism.secondary.border,
                backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
              }}
            >
              {tags.map((tag) => (
                <option key={tag} value={tag} className="bg-gray-800">
                  {tag}
                </option>
              ))}
            </select>
          </div>
        );

      case 'tagsExclude':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">Exclude Tags</label>
            <select
              multiple
              value={localFilters.tagsExclude || []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                handleFilterChange('tagsExclude', selected.length > 0 ? selected : undefined);
              }}
              className="w-full p-2 rounded text-white h-32"
              style={{
                background: designTokens.glassmorphism.secondary.background,
                border: designTokens.glassmorphism.secondary.border,
                backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
              }}
            >
              {tags.map((tag) => (
                <option key={tag} value={tag} className="bg-gray-800">
                  {tag}
                </option>
              ))}
            </select>
          </div>
        );

      default:
        // Handle custom attributes
        if (customAttributes[filterKey]) {
          return (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white capitalize">{filterKey}</label>
              <select
                value={localFilters.customAttributes?.[filterKey] || ''}
                onChange={(e) => {
                  const newCustomAttributes = {
                    ...localFilters.customAttributes,
                    [filterKey]: e.target.value || undefined
                  };
                  handleFilterChange('customAttributes', newCustomAttributes);
                }}
                className="w-full p-2 rounded text-white"
                style={{
                  background: designTokens.glassmorphism.secondary.background,
                  border: designTokens.glassmorphism.secondary.border,
                  backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
                }}
              >
                <option value="" className="bg-gray-800">Any</option>
                {customAttributes[filterKey].map((value: any) => (
                  <option key={value} value={value} className="bg-gray-800">
                    {value}
                  </option>
                ))}
              </select>
            </div>
          );
        }
        return null;
    }
  };

  const activeCategoryData = filterCategories.find(cat => cat.id === activeCategory);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Sort Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <select
            value={`${sortBy.field}-${sortBy.direction}`}
            onChange={(e) => {
              const [field, direction] = e.target.value.split('-');
              onSortChange({ 
                field: field as SortOption['field'], 
                direction: direction as SortOption['direction'],
                label: sortOptions.find(opt => opt.field === field && opt.direction === direction)?.label || ''
              });
            }}
            className="p-2 rounded text-white"
            style={{
              background: designTokens.glassmorphism.secondary.background,
              border: designTokens.glassmorphism.secondary.border,
              backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
            }}
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
        </div>

        <Button
          variant="outline"
          size="small"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2"
        >
          <Filter size={16} />
          {isExpanded ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </div>

      {/* Filter Controls */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            {...filterPanelAnimations.expand}
            className="overflow-hidden"
          >
            <GlassPanel variant="secondary" className="p-4">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Filter Categories */}
                <div className="lg:w-1/4">
                  <div className="space-y-1">
                    {filterCategories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setActiveCategory(category.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                          activeCategory === category.id
                            ? 'bg-white/20 text-white'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {category.icon}
                        <span className="font-medium">{category.name}</span>
                      </button>
                    ))}
                  </div>
                  
                  {/* Clear Filters Button */}
                  <Button
                    variant="outline"
                    size="small"
                    onClick={clearAllFilters}
                    className="w-full mt-4 flex items-center gap-2"
                  >
                    <X size={16} />
                    Clear All Filters
                  </Button>
                </div>

                {/* Filter Controls */}
                <div className="lg:w-3/4">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    {activeCategoryData?.icon}
                    {activeCategoryData?.name}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeCategoryData?.filters.map((filterKey) => (
                      <div key={filterKey}>
                        {renderFilterControl(filterKey)}
                      </div>
                    ))}
                    
                    {/* Render custom attributes if in the 'tags' category */}
                    {activeCategory === 'tags' && Object.keys(customAttributes).map((attrKey) => (
                      <div key={attrKey}>
                        {renderFilterControl(attrKey)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchFilters;