import React, { useState, useEffect } from 'react';
import { Search, X, Users, TrendingUp, Clock, Filter } from 'lucide-react';
import { CommunityService } from '@/services/communityService';
import type { Community } from '@/models/Community';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';

interface CommunityDiscoveryProps {
  onCommunitySelect: (community: Community) => void;
  onClose?: () => void;
}

const CommunityDiscovery: React.FC<CommunityDiscoveryProps> = ({ onCommunitySelect, onClose }) => {
  const { isMobile } = useMobileOptimization();
  const [searchTerm, setSearchTerm] = useState('');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [filteredCommunities, setFilteredCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'members' | 'engagement' | 'trending'>('members');

  useEffect(() => {
    fetchCommunities();
  }, []);

  useEffect(() => {
    filterAndSortCommunities();
  }, [communities, searchTerm, selectedCategory, sortBy]);

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would fetch from your API
      // For now, we'll use mock data
      const mockCommunities: Community[] = [
        {
          id: '1',
          name: 'ethereum-builders',
          displayName: 'Ethereum Builders',
          description: 'A community for Ethereum developers and builders',
          rules: [],
          memberCount: 12500,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: 'technology',
          tags: ['ethereum', 'solidity', 'web3'],
          isPublic: true,
          moderators: [],
          settings: {
            allowedPostTypes: [],
            requireApproval: false,
            minimumReputation: 0,
            stakingRequirements: []
          },
          avatar: '',
          banner: '',
          trendingScore: 85,
          slug: 'ethereum-builders'
        },
        {
          id: '2',
          name: 'defi-innovators',
          displayName: 'DeFi Innovators',
          description: 'Exploring the latest in decentralized finance',
          rules: [],
          memberCount: 8900,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: 'finance',
          tags: ['defi', 'yield-farming', 'amm'],
          isPublic: true,
          moderators: [],
          settings: {
            allowedPostTypes: [],
            requireApproval: false,
            minimumReputation: 0,
            stakingRequirements: [],
          },
          viewCount: 12000,
          engagementScore: 92,
          trendingScore: 92,
          slug: 'defi-innovators',
        },
        {
          id: '3',
          name: 'nft-artists',
          displayName: 'NFT Artists Collective',
          description: 'Digital artists creating NFT masterpieces',
          rules: [],
          memberCount: 15600,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: 'art',
          tags: ['nft', 'digital-art', 'creators'],
          isPublic: true,
          moderators: [],
          settings: {
            allowedPostTypes: [],
            requireApproval: false,
            minimumReputation: 0,
            stakingRequirements: [],
          },
          viewCount: 22000,
          engagementScore: 78,
          trendingScore: 78,
          slug: 'nft-artists',
        },
        {
          id: '4',
          name: 'dao-governance',
          displayName: 'DAO Governance Forum',
          description: 'Discussing decentralized autonomous organization governance',
          rules: [],
          memberCount: 5400,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: 'governance',
          tags: ['dao', 'governance', 'voting'],
          isPublic: true,
          moderators: [],
          settings: {
            allowedPostTypes: [],
            requireApproval: false,
            minimumReputation: 0,
            stakingRequirements: [],
          },
          viewCount: 8000,
          engagementScore: 65,
          trendingScore: 65,
          slug: 'dao-governance',
        },
      ];
      
      setCommunities(mockCommunities);
    } catch (error) {
      console.error('Error fetching communities:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortCommunities = () => {
    let result = [...communities];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(community => 
        community.displayName.toLowerCase().includes(term) ||
        community.description.toLowerCase().includes(term) ||
        community.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      result = result.filter(community => community.category === selectedCategory);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'members':
          return b.memberCount - a.memberCount;
        case 'engagement':
          return (b.engagementScore || 0) - (a.engagementScore || 0);
        case 'trending':
          return (b.trendingScore || 0) - (a.trendingScore || 0);
        default:
          return 0;
      }
    });
    
    setFilteredCommunities(result);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      technology: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      finance: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      art: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      governance: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      development: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      gaming: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    };
    return colors[category] || colors.technology;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isMobile ? 'h-[calc(100vh-200px)]' : 'h-full'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Discover Communities</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search communities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Categories</option>
              <option value="technology">Technology</option>
              <option value="finance">Finance</option>
              <option value="art">Art</option>
              <option value="governance">Governance</option>
              <option value="development">Development</option>
              <option value="gaming">Gaming</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white"
            >
              <option value="members">Sort by Members</option>
              <option value="engagement">Sort by Engagement</option>
              <option value="trending">Sort by Trending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Communities List */}
      <div className={`overflow-y-auto ${isMobile ? '-mx-6 px-6' : ''}`}>
        {filteredCommunities.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No communities found</h3>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {filteredCommunities.map((community) => (
              <div
                key={community.id}
                onClick={() => onCommunitySelect(community)}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center text-white font-bold">
                      {community.displayName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{community.displayName}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {community.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(community.category)}`}>
                          {community.category}
                        </span>
                        {community.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {formatNumber(community.memberCount)}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      {formatNumber(community.viewCount || 0)}
                    </span>
                  </div>
                  
                  {community.trendingScore && (
                    <div className="flex items-center gap-1 text-sm text-orange-600 dark:text-orange-400">
                      <TrendingUp className="w-4 h-4" />
                      <span>{community.trendingScore}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityDiscovery;