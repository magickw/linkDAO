/**
 * ActiveFilterChips - Display active filters as removable chips
 */

import React from 'react';
import { X } from 'lucide-react';
import type { FilterOptions } from './FilterBar';

interface ActiveFilterChipsProps {
  filters: FilterOptions;
  onRemoveFilter: (filterKey: keyof FilterOptions, value?: any) => void;
  onClearAll: () => void;
}

export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({
  filters,
  onRemoveFilter,
  onClearAll,
}) => {
  const activeFilters: Array<{ key: keyof FilterOptions; label: string; value?: any }> = [];

  // Category
  if (filters.category) {
    activeFilters.push({ key: 'category', label: `Category: ${filters.category}` });
  }

  // Price range
  if (filters.priceRange) {
    const { min, max } = filters.priceRange;
    if (min !== undefined || max !== undefined) {
      const label = min !== undefined && max !== undefined
        ? `Price: ${min} - ${max} ETH`
        : min !== undefined
        ? `Price: ${min}+ ETH`
        : `Price: up to ${max} ETH`;
      activeFilters.push({ key: 'priceRange', label });
    }
  }

  // Condition
  if (filters.condition) {
    activeFilters.push({ key: 'condition', label: `Condition: ${filters.condition}` });
  }

  // Trust filters
  if (filters.verified) {
    activeFilters.push({ key: 'verified', label: 'Verified sellers' });
  }
  if (filters.escrowProtected) {
    activeFilters.push({ key: 'escrowProtected', label: 'Escrow protected' });
  }
  if (filters.daoApproved) {
    activeFilters.push({ key: 'daoApproved', label: 'DAO approved' });
  }

  // In stock
  if (filters.inStock) {
    activeFilters.push({ key: 'inStock', label: 'In stock only' });
  }

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
        Active filters:
      </span>
      {activeFilters.map((filter, index) => (
        <button
          key={`${filter.key}-${index}`}
          onClick={() => onRemoveFilter(filter.key, filter.value)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
        >
          <span>{filter.label}</span>
          <X size={14} />
        </button>
      ))}
      <button
        onClick={onClearAll}
        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-medium underline"
      >
        Clear all
      </button>
    </div>
  );
};
