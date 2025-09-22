import React from 'react';
import { EnhancedCommunityData, FilterOption } from '../../../types/communityEnhancements';
import { CommunityIconList } from './CommunityIconList';
import { MultiSelectFilters } from './MultiSelectFilters';
import { QuickNavigationPanel } from './QuickNavigationPanel';

interface EnhancedLeftSidebarProps {
  communities: EnhancedCommunityData[];
  selectedCommunity?: string;
  availableFilters: FilterOption[];
  selectedFilters: string[];
  onCommunitySelect: (communityId: string) => void;
  onFiltersChange: (filters: string[]) => void;
  onQuickAction: (action: string, communityId?: string) => void;
}

/**
 * EnhancedLeftSidebar Component
 * 
 * Main container for all enhanced left sidebar components including
 * community list, filters, and quick navigation.
 */
export const EnhancedLeftSidebar: React.FC<EnhancedLeftSidebarProps> = ({
  communities,
  selectedCommunity,
  availableFilters,
  selectedFilters,
  onCommunitySelect,
  onFiltersChange,
  onQuickAction
}) => {
  return (
    <div className="enhanced-left-sidebar space-y-4">
      {/* Quick Navigation Panel */}
      <QuickNavigationPanel
        communities={communities}
        onCommunitySelect={onCommunitySelect}
        onQuickAction={onQuickAction}
      />

      {/* Multi-Select Filters */}
      <MultiSelectFilters
        availableFilters={availableFilters}
        selectedFilters={selectedFilters}
        onFiltersChange={onFiltersChange}
        allowCombinations={true}
      />

      {/* Community Icon List */}
      <CommunityIconList
        communities={communities}
        selectedCommunity={selectedCommunity}
        onCommunitySelect={onCommunitySelect}
        showBadges={true}
      />
    </div>
  );
};

export default EnhancedLeftSidebar;