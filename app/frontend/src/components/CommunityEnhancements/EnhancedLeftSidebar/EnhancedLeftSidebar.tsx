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
    <>
      {/* All cards at the same level with consistent spacing - matching right sidebar pattern */}
      <div className="space-y-4">
        {/* Header Card with Create Community Button */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
          <div className="p-4">
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
              className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600
                       text-white font-medium rounded-lg transition-colors duration-200
                       focus:outline-none focus:ring-2 focus:ring-primary-400/50
                       shadow-sm hover:shadow-md"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Community
            </button>
          </div>
        </div>

        {/* Community Search Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
          <div className="p-4">
            <CommunitySearchBar
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              placeholder="Search communities..."
            />
          </div>
        </div>

        {/* Quick Navigation Panel Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
          <div className="p-4">
            <QuickNavigationPanel
              communities={communities as any}
              onCommunitySelect={onCommunitySelect}
              onQuickAction={onQuickAction}
            />
          </div>
        </div>

        {/* Multi-Select Filters Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
          <div className="p-4">
            <MultiSelectFilters
              availableFilters={availableFilters}
              selectedFilters={selectedFilters}
              onFiltersChange={onFiltersChange}
              allowCombinations={true}
            />
          </div>
        </div>

        {/* Community Icon List Card with Web3 Features */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
          <div className="p-4">
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
      </div>

      {/* Create Community Modal */}
      <CreateCommunityModal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        onSubmit={handleCreateCommunitySubmit}
        isLoading={isCreatingCommunity}
      />
    </>
  );
};

export default EnhancedLeftSidebar;