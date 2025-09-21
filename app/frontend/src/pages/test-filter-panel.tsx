import React from 'react';
import { FilterPanel } from '../components/Community';
import { useFilterState, useFilterPanelState } from '../hooks/useFilterState';
import { Flair, ContentType } from '../types/communityFilter';

// Mock data for testing
const mockFlairs: Flair[] = [
  {
    id: '1',
    name: 'Discussion',
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
    textColor: '#1E40AF',
    moderatorOnly: false,
    description: 'General discussions and conversations'
  },
  {
    id: '2',
    name: 'Question',
    color: '#10B981',
    backgroundColor: '#ECFDF5',
    textColor: '#047857',
    moderatorOnly: false,
    description: 'Questions seeking answers from the community'
  },
  {
    id: '3',
    name: 'Announcement',
    color: '#F59E0B',
    backgroundColor: '#FFFBEB',
    textColor: '#92400E',
    moderatorOnly: true,
    description: 'Official announcements from moderators'
  },
  {
    id: '4',
    name: 'Guide',
    color: '#8B5CF6',
    backgroundColor: '#F3E8FF',
    textColor: '#6B21A8',
    moderatorOnly: false,
    description: 'Helpful guides and tutorials'
  },
  {
    id: '5',
    name: 'Bug Report',
    color: '#EF4444',
    backgroundColor: '#FEF2F2',
    textColor: '#B91C1C',
    moderatorOnly: false,
    description: 'Bug reports and technical issues'
  },
  {
    id: '6',
    name: 'Feature Request',
    color: '#06B6D4',
    backgroundColor: '#ECFEFF',
    textColor: '#0E7490',
    moderatorOnly: false,
    description: 'Requests for new features'
  }
];

// Mock posts for filter testing
const mockPosts = [
  {
    id: '1',
    title: 'Welcome to the community!',
    author: 'moderator1',
    flair: '3',
    createdAt: new Date('2024-01-15'),
    contentType: ContentType.TEXT
  },
  {
    id: '2',
    title: 'How do I get started?',
    author: 'newuser123',
    flair: '2',
    createdAt: new Date('2024-01-16'),
    contentType: ContentType.TEXT
  },
  {
    id: '3',
    title: 'Check out this amazing feature!',
    author: 'developer1',
    flair: '1',
    createdAt: new Date('2024-01-17'),
    contentType: ContentType.IMAGE,
    mediaCids: ['image1.jpg']
  },
  {
    id: '4',
    title: 'Complete beginner guide',
    author: 'expert_user',
    flair: '4',
    createdAt: new Date('2024-01-18'),
    contentType: ContentType.TEXT
  },
  {
    id: '5',
    title: 'Found a bug in the interface',
    author: 'tester99',
    flair: '5',
    createdAt: new Date('2024-01-19'),
    contentType: ContentType.TEXT
  },
  {
    id: '6',
    title: 'Video tutorial: Getting started',
    author: 'content_creator',
    flair: '4',
    createdAt: new Date('2024-01-20'),
    contentType: ContentType.VIDEO,
    mediaCids: ['video1.mp4']
  }
];

export default function TestFilterPanel() {
  const {
    filterState,
    handleFilterChange,
    clearFilters,
    hasActiveFilters,
    getActiveFilterCount,
    applyFilters
  } = useFilterState({
    communityId: 'test-community',
    onFilterChange: (filters) => {
      console.log('Filters changed:', filters);
    }
  });

  const {
    isCollapsed,
    toggleCollapse
  } = useFilterPanelState(false);

  // Apply filters to mock posts
  const filteredPosts = applyFilters(mockPosts);

  // Get flair name by ID
  const getFlairName = (flairId: string) => {
    const flair = mockFlairs.find(f => f.id === flairId);
    return flair ? flair.name : 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Filter Panel Test Page
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test the advanced filtering functionality for community posts.
          </p>
        </div>

        {/* Filter Panel */}
        <div className="mb-8">
          <FilterPanel
            availableFlairs={mockFlairs}
            activeFilters={filterState}
            onFilterChange={handleFilterChange}
            onClearFilters={clearFilters}
            isCollapsed={isCollapsed}
            onToggleCollapse={toggleCollapse}
            className="rounded-lg shadow-sm"
          />
        </div>

        {/* Filter Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Filter Summary
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {getActiveFilterCount()}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                Active Filters
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {filteredPosts.length}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">
                Filtered Posts
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {mockPosts.length}
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-400">
                Total Posts
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {mockFlairs.length}
              </div>
              <div className="text-sm text-orange-600 dark:text-orange-400">
                Available Flairs
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters() && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                Active Filters:
              </h3>
              
              <div className="space-y-2">
                {filterState.flair.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Flairs:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {filterState.flair.map(flairId => (
                        <span
                          key={flairId}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                        >
                          {getFlairName(flairId)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {filterState.author.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Authors:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {filterState.author.map(author => (
                        <span
                          key={author}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                        >
                          @{author}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {filterState.contentType.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Content Types:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {filterState.contentType.map(type => (
                        <span
                          key={type}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(filterState.timeRange.startDate || filterState.timeRange.endDate) && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Time Range:
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200">
                      {filterState.timeRange.startDate?.toLocaleDateString()} - {filterState.timeRange.endDate?.toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Filtered Posts */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Filtered Posts ({filteredPosts.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredPosts.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 dark:text-gray-500 text-lg mb-2">
                  📭
                </div>
                <p className="text-gray-500 dark:text-gray-400">
                  No posts match the current filters.
                </p>
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              filteredPosts.map(post => (
                <div key={post.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                          {post.title}
                        </h3>
                        {post.flair && (
                          <span
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: mockFlairs.find(f => f.id === post.flair)?.backgroundColor,
                              color: mockFlairs.find(f => f.id === post.flair)?.textColor
                            }}
                          >
                            {getFlairName(post.flair)}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>by @{post.author}</span>
                        <span>{post.createdAt.toLocaleDateString()}</span>
                        <span className="capitalize">{post.contentType}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Debug Information */}
        <div className="mt-8 bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Debug Information
          </h3>
          <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto">
            {JSON.stringify(filterState, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}