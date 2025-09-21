import React from 'react';
import { EnhancedSearchFilters } from '../../types/enhancedSearch';

interface SearchFiltersProps {
  filters: EnhancedSearchFilters;
  onChange: (filters: Partial<EnhancedSearchFilters>) => void;
  activeTab: 'all' | 'posts' | 'communities' | 'users';
  communityId?: string;
}

export function SearchFilters({ filters, onChange, activeTab, communityId }: SearchFiltersProps) {
  const categories = [
    'Technology', 'Gaming', 'Art', 'Music', 'Sports', 'Education', 
    'Business', 'Science', 'Politics', 'Entertainment', 'Health', 'Travel'
  ];

  const locations = [
    'Global', 'North America', 'Europe', 'Asia', 'South America', 
    'Africa', 'Oceania', 'United States', 'Canada', 'United Kingdom'
  ];

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Time Range Filter */}
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Time:
        </label>
        <select
          value={filters.timeRange || 'all'}
          onChange={(e) => onChange({ timeRange: e.target.value as any })}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="all">All Time</option>
          <option value="hour">Past Hour</option>
          <option value="day">Past Day</option>
          <option value="week">Past Week</option>
          <option value="month">Past Month</option>
          <option value="year">Past Year</option>
        </select>
      </div>

      {/* Sort By Filter */}
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Sort:
        </label>
        <select
          value={filters.sortBy || 'relevance'}
          onChange={(e) => onChange({ sortBy: e.target.value as any })}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="relevance">Most Relevant</option>
          <option value="recent">Most Recent</option>
          <option value="popular">Most Popular</option>
          <option value="trending">Trending</option>
        </select>
      </div>

      {/* Category Filter (for communities/posts) */}
      {(activeTab === 'all' || activeTab === 'communities' || activeTab === 'posts') && (
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Category:
          </label>
          <select
            value={filters.category || 'all'}
            onChange={(e) => onChange({ category: e.target.value === 'all' ? undefined : e.target.value })}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Location Filter */}
      {(activeTab === 'all' || activeTab === 'communities' || activeTab === 'users') && (
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Location:
          </label>
          <select
            value={filters.location || 'all'}
            onChange={(e) => onChange({ location: e.target.value === 'all' ? undefined : e.target.value })}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Locations</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Content Type Filters (for posts) */}
      {(activeTab === 'all' || activeTab === 'posts') && (
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="hasMedia"
              checked={filters.hasMedia || false}
              onChange={(e) => onChange({ hasMedia: e.target.checked || undefined })}
              className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="hasMedia" className="text-sm text-gray-700 dark:text-gray-300">
              Has Media
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="hasPolls"
              checked={filters.hasPolls || false}
              onChange={(e) => onChange({ hasPolls: e.target.checked || undefined })}
              className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="hasPolls" className="text-sm text-gray-700 dark:text-gray-300">
              Has Polls
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="hasProposals"
              checked={filters.hasProposals || false}
              onChange={(e) => onChange({ hasProposals: e.target.checked || undefined })}
              className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="hasProposals" className="text-sm text-gray-700 dark:text-gray-300">
              Has Proposals
            </label>
          </div>
        </div>
      )}

      {/* Verification Filter (for users/communities) */}
      {(activeTab === 'all' || activeTab === 'users' || activeTab === 'communities') && (
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="verified"
            checked={filters.verified || false}
            onChange={(e) => onChange({ verified: e.target.checked || undefined })}
            className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
          <label htmlFor="verified" className="text-sm text-gray-700 dark:text-gray-300">
            Verified Only
          </label>
        </div>
      )}

      {/* Engagement Filter */}
      {(activeTab === 'all' || activeTab === 'posts') && (
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Min Engagement:
          </label>
          <select
            value={filters.minEngagement?.toString() || '0'}
            onChange={(e) => onChange({ minEngagement: e.target.value === '0' ? undefined : parseInt(e.target.value) })}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="0">Any</option>
            <option value="10">10+ interactions</option>
            <option value="50">50+ interactions</option>
            <option value="100">100+ interactions</option>
            <option value="500">500+ interactions</option>
          </select>
        </div>
      )}

      {/* Clear Filters */}
      {Object.keys(filters).some(key => filters[key as keyof EnhancedSearchFilters] !== undefined) && (
        <button
          onClick={() => onChange({})}
          className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}