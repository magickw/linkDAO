import React, { useState } from 'react';
import { Search, TrendingUp, Users, Calendar } from 'lucide-react';
import {
  TrendingCommunitiesSection,
  CommunityComparisonTool,
  AdvancedSearchInterface,
  ConnectionBasedRecommendations,
  CommunityEventHighlights
} from './index';
import { EnhancedCommunityData } from '../../types/communityEnhancements';

interface CommunityDiscoveryPageProps {
  userWalletAddress?: string;
  onCommunitySelect: (community: EnhancedCommunityData) => void;
}

export const CommunityDiscoveryPage: React.FC<CommunityDiscoveryPageProps> = ({
  userWalletAddress,
  onCommunitySelect
}) => {
  const [activeTab, setActiveTab] = useState<'trending' | 'search' | 'recommendations' | 'events'>('trending');
  const [showComparison, setShowComparison] = useState(false);

  const tabs = [
    { id: 'trending', label: 'Trending', icon: TrendingUp },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'recommendations', label: 'For You', icon: Users },
    { id: 'events', label: 'Events', icon: Calendar }
  ];

  const handleSearch = (query: string, filters: any) => {
    console.log('Search:', query, filters);
    // Implement search logic
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Discover Communities
        </h1>
        <p className="text-lg text-gray-600">
          Find Web3 communities that match your interests and connect with like-minded people
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-8">
        {activeTab === 'trending' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <TrendingCommunitiesSection
                onCommunitySelect={onCommunitySelect}
                onViewAll={() => setShowComparison(true)}
                showComparison={true}
              />
            </div>
            <div>
              <ConnectionBasedRecommendations
                userWalletAddress={userWalletAddress}
                onCommunitySelect={onCommunitySelect}
                maxRecommendations={3}
              />
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="space-y-6">
            <AdvancedSearchInterface
              onSearch={handleSearch}
              onCommunitySelect={onCommunitySelect}
              showFilters={true}
            />
          </div>
        )}

        {activeTab === 'recommendations' && (
          <ConnectionBasedRecommendations
            userWalletAddress={userWalletAddress}
            onCommunitySelect={onCommunitySelect}
            maxRecommendations={6}
          />
        )}

        {activeTab === 'events' && (
          <CommunityEventHighlights
            userWalletAddress={userWalletAddress}
            onCommunityClick={(id) => console.log('Community clicked:', id)}
            maxEvents={8}
          />
        )}
      </div>

      {/* Comparison Modal */}
      {showComparison && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CommunityComparisonTool
              communities={[]} // Pass actual communities data
              onClose={() => setShowComparison(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityDiscoveryPage;