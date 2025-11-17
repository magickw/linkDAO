import React from 'react';
import { QuickFilter } from '@/types/navigation';

export const defaultQuickFilters: QuickFilter[] = [
  { 
    id: 'trending', 
    label: 'Trending', 
    icon: '🔥',
    active: false,
    query: { type: 'all' }
  },
  { 
    id: 'following', 
    label: 'Following', 
    icon: '👥',
    active: false,
    query: { type: 'all' }
  },
  { 
    id: 'recent', 
    label: 'Recent', 
    icon: '🕒',
    active: false,
    query: { type: 'all' }
  },
  { 
    id: 'popular', 
    label: 'Popular', 
    icon: '⭐',
    active: false,
    query: { type: 'all' }
  },
];

interface QuickFilterPanelProps {
  activeFilters: string[];
  onFilterChange: (filters: string[]) => void;
  className?: string;
}

export const QuickFilterPanel: React.FC<QuickFilterPanelProps> = ({
  activeFilters = [],
  onFilterChange,
  className = ''
}) => {
  const toggleFilter = (filterId: string) => {
    const newFilters = activeFilters.includes(filterId)
      ? activeFilters.filter(id => id !== filterId)
      : [...activeFilters, filterId];
    onFilterChange(newFilters);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {defaultQuickFilters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => toggleFilter(filter.id)}
          className={`
            w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors
            ${activeFilters.includes(filter.id)
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }
          `}
          role="switch"
          aria-checked={activeFilters.includes(filter.id)}
          aria-label={`Toggle ${filter.label} filter`}
        >
          <span className="mr-2">{filter.icon}</span>
          {filter.label}
        </button>
      ))}
    </div>
  );
};