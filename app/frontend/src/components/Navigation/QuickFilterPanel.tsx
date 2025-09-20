import React from 'react';
import { QuickFilter } from '@/types/navigation';
import { GlassSidebarLink } from '@/components/VisualPolish';

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
        <GlassSidebarLink
          key={filter.id}
          onClick={() => onFilterChange(filter.id)}
          active={filter.active}
          icon={<span className="text-lg">{filter.icon}</span>}
          badge={filter.count}
        >
          {filter.label}
        </GlassSidebarLink>
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