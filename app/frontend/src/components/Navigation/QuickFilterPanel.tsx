import React from 'react';
import { QuickFilter } from '@/types/navigation';

interface QuickFilterPanelProps {
  filters: QuickFilter[];
  onFilterChange: (filterId: string) => void;
  className?: string;
}

export default function QuickFilterPanel({ 
  filters, 
  onFilterChange, 
  className = '' 
}: QuickFilterPanelProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        Quick Filters
      </div>
      
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onFilterChange(filter.id)}
          className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            filter.active
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200 shadow-sm'
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
          }`}
        >
          <div className="flex items-center">
            <span className="text-lg mr-3" role="img" aria-label={filter.label}>
              {filter.icon}
            </span>
            <span>{filter.label}</span>
          </div>
          
          {filter.count !== undefined && filter.count > 0 && (
            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
              filter.active
                ? 'bg-primary-200 text-primary-800 dark:bg-primary-800 dark:text-primary-200'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {filter.count > 99 ? '99+' : filter.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// Default filters configuration
export const defaultQuickFilters: QuickFilter[] = [
  {
    id: 'my-posts',
    label: 'My Posts',
    icon: '📝',
    count: 0,
    active: false,
    query: {
      type: 'my-posts',
      hasReactions: false,
      hasTips: false,
      isGovernance: false
    }
  },
  {
    id: 'tipped-posts',
    label: 'Tipped Posts',
    icon: '💰',
    count: 0,
    active: false,
    query: {
      type: 'tipped-posts',
      hasTips: true,
      hasReactions: false,
      isGovernance: false
    }
  },
  {
    id: 'governance-posts',
    label: 'Governance Posts',
    icon: '🏛️',
    count: 0,
    active: false,
    query: {
      type: 'governance-posts',
      isGovernance: true,
      hasReactions: false,
      hasTips: false
    }
  }
];