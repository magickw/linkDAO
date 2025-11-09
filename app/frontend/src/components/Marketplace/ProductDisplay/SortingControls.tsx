/**
 * SortingControls - Product sorting with preset options
 * Supports Best Match, Price, Date, Rating with ascending/descending
 */

import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { designTokens } from '@/design-system/tokens';

export type SortField = 'relevance' | 'price' | 'date' | 'rating' | 'popularity' | 'apy' | 'risk' | 'liquidity';
export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  field: SortField;
  direction: SortDirection;
  label: string;
}

interface SortingControlsProps {
  currentSort: { field: SortField; direction: SortDirection };
  onSortChange: (field: SortField, direction: SortDirection) => void;
  className?: string;
}

const sortOptions: SortOption[] = [
  { field: 'relevance', direction: 'desc', label: 'Best Match' },
  { field: 'price', direction: 'asc', label: 'Price: Low to High' },
  { field: 'price', direction: 'desc', label: 'Price: High to Low' },
  { field: 'date', direction: 'desc', label: 'Newest' },
  { field: 'date', direction: 'asc', label: 'Oldest' },
  { field: 'rating', direction: 'desc', label: 'Highest Rated' },
  { field: 'popularity', direction: 'desc', label: 'Most Popular' },
  { field: 'apy', direction: 'desc', label: 'Highest APY' },
  { field: 'apy', direction: 'asc', label: 'Lowest APY' },
  { field: 'risk', direction: 'asc', label: 'Lowest Risk' },
  { field: 'risk', direction: 'desc', label: 'Highest Risk' },
  { field: 'liquidity', direction: 'desc', label: 'Highest Liquidity' },
];

export const SortingControls: React.FC<SortingControlsProps> = ({
  currentSort,
  onSortChange,
  className = '',
}) => {
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [field, direction] = e.target.value.split('-');
    onSortChange(field as SortField, direction as SortDirection);
  };

  const currentValue = `${currentSort.field}-${currentSort.direction}`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm text-white/70 flex items-center gap-1">
        <ArrowUpDown size={14} />
        Sort by:
      </span>
      <select
        value={currentValue}
        onChange={handleSortChange}
        className="px-3 py-2 rounded-lg text-white text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
        style={{
          background: designTokens.glassmorphism.secondary.background,
          backdropFilter: designTokens.glassmorphism.secondary.backdropFilter,
          border: designTokens.glassmorphism.secondary.border,
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
  );
};
