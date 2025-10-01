/**
 * FilterBar - Advanced filtering with chips UI and slide-out drawer
 * Displays active filters as removable chips with a clear-all action
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, SlidersHorizontal } from 'lucide-react';
import { designTokens } from '@/design-system/tokens';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';

export interface FilterOptions {
  category?: string;
  priceRange?: { min?: number; max?: number };
  condition?: 'new' | 'used' | 'refurbished';
  verified?: boolean;
  escrowProtected?: boolean;
  daoApproved?: boolean;
  freeShipping?: boolean;
  inStock?: boolean;
  minRating?: number;
}

interface FilterBarProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFiltersChange,
  className = '',
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Get active filter chips
  const getActiveFilters = () => {
    const active: Array<{ key: string; label: string; value: any }> = [];

    if (filters.category) {
      active.push({
        key: 'category',
        label: `Category: ${filters.category}`,
        value: filters.category,
      });
    }

    if (filters.priceRange?.min || filters.priceRange?.max) {
      const min = filters.priceRange.min || 0;
      const max = filters.priceRange.max || '∞';
      active.push({
        key: 'priceRange',
        label: `$${min} - $${max}`,
        value: filters.priceRange,
      });
    }

    if (filters.condition) {
      active.push({
        key: 'condition',
        label: `Condition: ${filters.condition}`,
        value: filters.condition,
      });
    }

    if (filters.verified) {
      active.push({ key: 'verified', label: 'Verified Only', value: true });
    }

    if (filters.escrowProtected) {
      active.push({ key: 'escrowProtected', label: 'Escrow Protected', value: true });
    }

    if (filters.daoApproved) {
      active.push({ key: 'daoApproved', label: 'DAO Approved', value: true });
    }

    if (filters.freeShipping) {
      active.push({ key: 'freeShipping', label: 'Free Shipping', value: true });
    }

    if (filters.inStock) {
      active.push({ key: 'inStock', label: 'In Stock', value: true });
    }

    if (filters.minRating) {
      active.push({
        key: 'minRating',
        label: `Rating: ${filters.minRating}+ ⭐`,
        value: filters.minRating,
      });
    }

    return active;
  };

  const activeFilters = getActiveFilters();

  const removeFilter = (key: string) => {
    const newFilters = { ...filters };
    delete newFilters[key as keyof FilterOptions];
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className={className}>
      {/* Filter Chips Bar */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <Button
          variant="outline"
          size="small"
          onClick={() => setIsDrawerOpen(true)}
          className="border-white/30 text-white/80 hover:bg-white/10"
        >
          <SlidersHorizontal size={16} className="mr-1" />
          Filters
          {activeFilters.length > 0 && (
            <span className="ml-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {activeFilters.length}
            </span>
          )}
        </Button>

        {/* Active Filter Chips */}
        <AnimatePresence>
          {activeFilters.map((filter) => (
            <motion.div
              key={filter.key}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <button
                onClick={() => removeFilter(filter.key)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-white transition-all hover:bg-white/20"
                style={{
                  background: designTokens.glassmorphism.secondary.background,
                  backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
                  border: designTokens.glassmorphism.secondary.border,
                }}
              >
                {filter.label}
                <X size={12} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {activeFilters.length > 0 && (
          <Button
            variant="ghost"
            size="small"
            onClick={clearAllFilters}
            className="text-white/60 hover:text-white"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Filter Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-80 z-50 overflow-y-auto"
            >
              <GlassPanel variant="primary" className="h-full p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Filters</h2>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="text-white/60 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Filter Options */}
                <div className="space-y-6">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Category
                    </label>
                    <select
                      value={filters.category || ''}
                      onChange={(e) =>
                        onFiltersChange({
                          ...filters,
                          category: e.target.value || undefined,
                        })
                      }
                      className="w-full p-2 rounded text-white bg-white/10 border border-white/20"
                    >
                      <option value="">All Categories</option>
                      <option value="electronics">Electronics</option>
                      <option value="fashion">Fashion</option>
                      <option value="home">Home & Garden</option>
                      <option value="books">Books</option>
                      <option value="toys">Toys & Games</option>
                      <option value="sports">Sports</option>
                    </select>
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Price Range
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.priceRange?.min || ''}
                        onChange={(e) =>
                          onFiltersChange({
                            ...filters,
                            priceRange: {
                              ...filters.priceRange,
                              min: e.target.value ? parseFloat(e.target.value) : undefined,
                            },
                          })
                        }
                        className="w-full p-2 rounded text-white bg-white/10 border border-white/20"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.priceRange?.max || ''}
                        onChange={(e) =>
                          onFiltersChange({
                            ...filters,
                            priceRange: {
                              ...filters.priceRange,
                              max: e.target.value ? parseFloat(e.target.value) : undefined,
                            },
                          })
                        }
                        className="w-full p-2 rounded text-white bg-white/10 border border-white/20"
                      />
                    </div>
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Condition
                    </label>
                    <div className="space-y-2">
                      {['new', 'used', 'refurbished'].map((cond) => (
                        <label key={cond} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="condition"
                            checked={filters.condition === cond}
                            onChange={() =>
                              onFiltersChange({
                                ...filters,
                                condition: cond as any,
                              })
                            }
                            className="rounded"
                          />
                          <span className="text-sm text-white capitalize">{cond}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Trust & Verification */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Trust & Safety
                    </label>
                    <div className="space-y-2">
                      {[
                        { key: 'verified', label: 'Verified Sellers', icon: '✅' },
                        { key: 'escrowProtected', label: 'Escrow Protected', icon: '🔒' },
                        { key: 'daoApproved', label: 'DAO Approved', icon: '🏛️' },
                      ].map(({ key, label, icon }) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters[key as keyof FilterOptions] as boolean}
                            onChange={(e) =>
                              onFiltersChange({
                                ...filters,
                                [key]: e.target.checked || undefined,
                              })
                            }
                            className="rounded"
                          />
                          <span className="text-sm text-white">
                            {icon} {label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Shipping & Availability */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Shipping & Stock
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.freeShipping}
                          onChange={(e) =>
                            onFiltersChange({
                              ...filters,
                              freeShipping: e.target.checked || undefined,
                            })
                          }
                          className="rounded"
                        />
                        <span className="text-sm text-white">Free Shipping</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.inStock}
                          onChange={(e) =>
                            onFiltersChange({
                              ...filters,
                              inStock: e.target.checked || undefined,
                            })
                          }
                          className="rounded"
                        />
                        <span className="text-sm text-white">In Stock Only</span>
                      </label>
                    </div>
                  </div>

                  {/* Rating */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Minimum Rating
                    </label>
                    <div className="space-y-2">
                      {[4.5, 4.0, 3.5, 3.0].map((rating) => (
                        <label key={rating} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="rating"
                            checked={filters.minRating === rating}
                            onChange={() =>
                              onFiltersChange({
                                ...filters,
                                minRating: rating,
                              })
                            }
                            className="rounded"
                          />
                          <span className="text-sm text-white">{rating}+ ⭐</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-8 space-y-2">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => setIsDrawerOpen(false)}
                  >
                    Apply Filters
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-white/30 text-white/80"
                    onClick={clearAllFilters}
                  >
                    Clear All
                  </Button>
                </div>
              </GlassPanel>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
