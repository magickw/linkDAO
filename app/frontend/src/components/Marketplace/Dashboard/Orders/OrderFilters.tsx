import React from 'react';
import { OrderStatus } from './OrderStatusBadge';

interface FilterTab {
  id: string;
  label: string;
  status?: OrderStatus | 'all' | 'issues';
  count?: number;
}

interface OrderFiltersProps {
  activeFilter: string;
  onFilterChange: (filterId: string) => void;
  counts?: {
    all?: number;
    pending?: number;
    processing?: number;
    ready_to_ship?: number;
    shipped?: number;
    delivered?: number;
    issues?: number;
  };
  showSearch?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onDateRangeChange?: (range: { start: string; end: string }) => void;
  className?: string;
}

const defaultTabs: FilterTab[] = [
  { id: 'all', label: 'All Orders', status: 'all' },
  { id: 'pending', label: 'Pending', status: 'pending' },
  { id: 'processing', label: 'Processing', status: 'processing' },
  { id: 'shipped', label: 'Shipped', status: 'shipped' },
  { id: 'issues', label: 'Issues', status: 'issues' },
];

export function OrderFilters({
  activeFilter,
  onFilterChange,
  counts = {},
  showSearch = true,
  searchQuery = '',
  onSearchChange,
  onDateRangeChange,
  className = '',
}: OrderFiltersProps) {
  const tabs = defaultTabs.map(tab => ({
    ...tab,
    count: counts[tab.id as keyof typeof counts] ?? 0,
  }));

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Date Range */}
      {(showSearch || onDateRangeChange) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {showSearch && onSearchChange && (
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search orders by ID, product, or customer..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          )}

          {onDateRangeChange && (
            <div className="flex items-center gap-2">
              <select
                onChange={(e) => {
                  const value = e.target.value;
                  const today = new Date();
                  let start = new Date();

                  switch (value) {
                    case '7d':
                      start.setDate(today.getDate() - 7);
                      break;
                    case '30d':
                      start.setDate(today.getDate() - 30);
                      break;
                    case '90d':
                      start.setDate(today.getDate() - 90);
                      break;
                    case 'year':
                      start.setFullYear(today.getFullYear() - 1);
                      break;
                    default:
                      start = new Date(0);
                  }

                  onDateRangeChange({
                    start: start.toISOString(),
                    end: today.toISOString(),
                  });
                }}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Time</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="year">Last Year</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = activeFilter === tab.id;
          const hasIssues = tab.id === 'issues' && (tab.count || 0) > 0;

          return (
            <button
              key={tab.id}
              onClick={() => onFilterChange(tab.id)}
              className={`
                relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                  : hasIssues
                    ? 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                }
              `}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`
                      px-1.5 py-0.5 rounded-full text-xs font-bold
                      ${isActive
                        ? 'bg-white/20 text-white'
                        : hasIssues
                          ? 'bg-orange-500/30 text-orange-200'
                          : 'bg-gray-700 text-gray-300'
                      }
                    `}
                  >
                    {tab.count > 99 ? '99+' : tab.count}
                  </span>
                )}
              </span>

              {/* Notification dot for issues */}
              {hasIssues && !isActive && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default OrderFilters;
