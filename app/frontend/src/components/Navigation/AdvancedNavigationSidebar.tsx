import React from 'react';
import { CommunityIconList } from './CommunityIconList';
import { EnhancedUserCard } from './EnhancedUserCard';
import NavigationBreadcrumbs from './NavigationBreadcrumbs';
import { ActivityIndicators } from './ActivityIndicators';
import { useEnhancedNavigation } from '@/hooks/useEnhancedNavigation';

const AdvancedNavigationSidebar: React.FC = () => {
  const {
    enhancedUser,
    communities,
    quickFilters,
    breadcrumbs,
    activityIndicators,
    handleFilterChange,
    handleCommunitySelect
  } = useEnhancedNavigation();

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Enhanced User Profile Card */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        {enhancedUser && <EnhancedUserCard user={enhancedUser} address={enhancedUser.walletAddress} profile={enhancedUser} />}
      </div>

      {/* Navigation Breadcrumbs */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <NavigationBreadcrumbs breadcrumbs={breadcrumbs} />
      </div>

      {/* Quick Filter Panel */}
      {/* Removed as per user request */}
      {/* 
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <QuickFilterPanel
          activeFilters={quickFilters.filter(f => f.active).map(f => f.id)}
          onFilterChange={(filters) => {
            quickFilters.forEach(filter => {
              if (filters.includes(filter.id) !== filter.active) {
                handleFilterChange(filter.id);
              }
            });
          }}
        />
      </div>
      */}

      {/* Community List with Icons */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Communities
          </h3>
          <CommunityIconList
            communities={communities}
            onCommunitySelect={handleCommunitySelect}
          />
        </div>
      </div>

      {/* Activity Indicators */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <ActivityIndicators />
      </div>
    </div>
  );
};

export default AdvancedNavigationSidebar;