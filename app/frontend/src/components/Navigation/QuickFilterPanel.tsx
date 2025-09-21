import React from 'react';

interface Filter {
  id: string;
  label: string;
  active: boolean;
}

interface QuickFilterPanelProps {
  activeFilters: any[];
  onFilterChange: (filters: any[]) => void;
  className?: string;
}

export const defaultQuickFilters = [
  { id: 'trending', label: 'Trending', active: false },
  { id: 'following', label: 'Following', active: false },
  { id: 'recent', label: 'Recent', active: false },
  { id: 'popular', label: 'Popular', active: false },
];

export const QuickFilterPanel: React.FC<QuickFilterPanelProps> = ({
  activeFilters = [],
  onFilterChange,
  className = ''
}) => {
  const filters: Filter[] = defaultQuickFilters;

  const toggleFilter = (filterId: string) => {
    const currentFilters = activeFilters || [];
    const newFilters = currentFilters.includes(filterId)
      ? currentFilters.filter(id => id !== filterId)
      : [...currentFilters, filterId];
    onFilterChange(newFilters);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => toggleFilter(filter.id)}
          className={`
            w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors
            ${(activeFilters || []).includes(filter.id)
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }
          `}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};