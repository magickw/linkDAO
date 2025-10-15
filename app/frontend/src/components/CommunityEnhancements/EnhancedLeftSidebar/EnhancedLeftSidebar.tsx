import React, { useState, useCallback } from 'react';
import { Plus, Bell, Search } from 'lucide-react';
import { EnhancedCommunityData, FilterOption } from '../../../types/communityEnhancements';
import { CommunityWithWeb3Data, UserRoleMap, TokenBalanceMap } from '../../../types/web3Post';
import { CommunityIconList } from './CommunityIconList';
import { MultiSelectFilters } from './MultiSelectFilters';
import { QuickNavigationPanel } from './QuickNavigationPanel';
import { CommunitySearchBar } from './CommunitySearchBar';
import CreateCommunityModal from '../Modals/CreateCommunityModal';
import GovernanceNotificationBadge from '../SharedComponents/GovernanceNotificationBadge';

interface CommunityCreationData {
  name: string;
  description: string;
  icon?: File;
  banner?: File;
  category: string;
  isPrivate: boolean;
  tokenRequirement?: {
    tokenAddress: string;
    minimumBalance: number;
    tokenSymbol: string;
  };
  governanceSettings?: {
    enableGovernance: boolean;
    votingThreshold: number;
    proposalDelay: number;
  };
}

interface EnhancedLeftSidebarProps {
  communities: CommunityWithWeb3Data[];
  selectedCommunity?: string;
  availableFilters: FilterOption[];
  selectedFilters: string[];
  userRoles: UserRoleMap;
  tokenBalances: TokenBalanceMap;
  onCommunitySelect: (communityId: string) => void;
  onFiltersChange: (filters: string[]) => void;
  onQuickAction: (action: string, communityId?: string) => void;
  onCreateCommunity: (communityData: CommunityCreationData) => Promise<void>;
}

/**
 * EnhancedLeftSidebar Component with Web3 Identity Features
 * 
 * Main container for all enhanced left sidebar components including
 * community list with Web3 data, role badges, token balances, and governance notifications.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */
export const EnhancedLeftSidebar: React.FC<EnhancedLeftSidebarProps> = ({
  communities,
  selectedCommunity,
  availableFilters,
  selectedFilters,
  userRoles,
  tokenBalances,
  onCommunitySelect,
  onFiltersChange,
  onQuickAction,
  onCreateCommunity
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreatingCommunity, setIsCreatingCommunity] = useState(false);
  
  // Calculate total governance notifications
  const totalNotifications = communities.reduce((total, community) => 
    total + (community.governanceNotifications || 0), 0
  );

  // Categorize notifications by urgency
  const urgentNotifications = communities.filter(c => 
    c.governanceNotifications && c.governanceNotifications > 0
  ).length;

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleCreateCommunityClick = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const handleCreateCommunitySubmit = useCallback(async (communityData: any) => {
    setIsCreatingCommunity(true);
    try {
      await onCreateCommunity(communityData);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create community:', error);
    } finally {
      setIsCreatingCommunity(false);
    }
  }, [onCreateCommunity]);

  const handleCloseCreateModal = useCallback(() => {
    setShowCreateModal(false);
  }, []);

  const handleGovernanceNotificationClick = useCallback(() => {
    // Navigate to governance dashboard or show notifications
    onQuickAction('view-governance-notifications');
  }, [onQuickAction]);

  return (
    <div className="enhanced-left-sidebar w-80 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header with Create Community Button */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Communities
          </h2>
          
          {/* Governance Notifications Bell */}
          {totalNotifications > 0 && (
            <div className="relative">
              <GovernanceNotificationBadge
                count={totalNotifications}
                type={urgentNotifications > 0 ? 'urgent' : 'pending'}
                size="md"
                onClick={handleGovernanceNotificationClick}
              />
            </div>
          )}
        </div>

        {/* Create Community Button */}
        <button
          onClick={handleCreateCommunityClick}
          className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 
                   text-white font-medium rounded-lg transition-colors duration-200 
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                   shadow-sm hover:shadow-md"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Community
        </button>
      </div>

      {/* Community Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <CommunitySearchBar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          placeholder="Search communities..."
        />
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 p-4">
          {/* Quick Navigation Panel */}
          <QuickNavigationPanel
            communities={communities as any}
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

          {/* Community Icon List with Web3 Features */}
          <CommunityIconList
            communities={communities}
            selectedCommunity={selectedCommunity}
            userRoles={userRoles}
            tokenBalances={tokenBalances}
            searchQuery={searchQuery}
            onCommunitySelect={onCommunitySelect}
            showBadges={true}
            showWeb3Features={true}
          />
        </div>
      </div>

      {/* Create Community Modal */}
      <CreateCommunityModal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        onSubmit={handleCreateCommunitySubmit}
        isLoading={isCreatingCommunity}
      />
    </div>
  );
};

export default EnhancedLeftSidebar;