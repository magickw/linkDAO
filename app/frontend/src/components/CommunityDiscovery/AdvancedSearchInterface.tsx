import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Tag, Users, Activity, Zap, X, ChevronDown } from 'lucide-react';
import { EnhancedCommunityData } from '../../types/communityEnhancements';

interface SearchFilters {
  tags: string[];
  memberCountRange: [number, number];
  activityLevel: string[];
  tokenRequirements: boolean | null;
  governanceActive: boolean | null;
}

interface AdvancedSearchInterfaceProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  onCommunitySelect: (community: EnhancedCommunityData) => void;
  placeholder?: string;
  showFilters?: boolean;
}

const POPULAR_TAGS = [
  { id: 'defi', label: '#defi', color: 'bg-blue-100 text-blue-800' },
  { id: 'nft', label: '#nft', color: 'bg-purple-100 text-purple-800' },
  { id: 'governance', label: '#governance', color: 'bg-green-100 text-green-800' },
  { id: 'gaming', label: '#gaming', color: 'bg-red-100 text-red-800' },
  { id: 'dao', label: '#dao', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'web3', label: '#web3', color: 'bg-indigo-100 text-indigo-800' },
  { id: 'metaverse', label: '#metaverse', color: 'bg-pink-100 text-pink-800' },
  { id: 'trading', label: '#trading', color: 'bg-orange-100 text-orange-800' }
];

const ACTIVITY_LEVELS = [
  { id: 'very-high', label: 'Very High', icon: '🔥' },
  { id: 'high', label: 'High', icon: '⚡' },
  { id: 'medium', label: 'Medium', icon: '📈' },
  { id: 'low', label: 'Low', icon: '📊' }
];

export const AdvancedSearchInterface: React.FC<AdvancedSearchInterfaceProps> = ({
  onSearch,
  onCommunitySelect,
  placeholder = "Search communities...",
  showFilters = true
}) => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    tags: [],
    memberCountRange: [0, 1000000],
    activityLevel: [],
    tokenRequirements: null,
    governanceActive: null
  });
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState<EnhancedCommunityData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Auto-complete suggestions
  useEffect(() => {
    if (query.length > 1) {
      const mockSuggestions = [
        'DeFi Innovators',
        'NFT Creators Hub',
        'Web3 Gaming Alliance',
        'DAO Governance',
        'Metaverse Builders'
      ].filter(suggestion => 
        suggestion.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(mockSuggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [query]);

  // Handle search
  const handleSearch = async () => {
    if (query.trim() || filters.tags.length > 0) {
      setIsSearching(true);
      try {
        // Mock search results - replace with actual API call
        const mockResults: EnhancedCommunityData[] = [
          {
            id: '1',
            name: 'DeFi Innovators',
            description: 'Building the future of decentralized finance',
            memberCount: 15420,
            icon: '🚀',
            brandColors: { primary: '#6366f1', secondary: '#8b5cf6', accent: '#06b6d4' },
            userMembership: { isJoined: false, joinDate: new Date(), reputation: 0, tokenBalance: 0 },
            activityMetrics: {
              postsToday: 45,
              activeMembers: 892,
              trendingScore: 95,
              engagementRate: 0.78,
              activityLevel: 'very-high'
            },
            governance: { activeProposals: 3, userVotingPower: 0, participationRate: 0.65 }
          }
        ];
        
        setSearchResults(mockResults);
        onSearch(query, filters);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }
  };

  // Handle tag selection
  const toggleTag = (tagId: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter(t => t !== tagId)
        : [...prev.tags, tagId]
    }));
  };

  // Handle activity level selection
  const toggleActivityLevel = (level: string) => {
    setFilters(prev => ({
      ...prev,
      activityLevel: prev.activityLevel.includes(level)
        ? prev.activityLevel.filter(l => l !== level)
        : [...prev.activityLevel, level]
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      tags: [],
      memberCountRange: [0, 1000000],
      activityLevel: [],
      tokenRequirements: null,
      governanceActive: null
    });
  };

  const formatMemberCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-5 h-5 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={placeholder}
            className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          {showFilters && (
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`absolute right-12 p-1 rounded-md transition-colors ${
                showFilterPanel ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Filter className="w-5 h-5" />
            </button>
          )}
          
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="absolute right-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSearching ? '...' : 'Search'}
          </button>
        </div>

        {/* Auto-complete Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => {
                  setQuery(suggestion);
                  setShowSuggestions(false);
                  handleSearch();
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>  
    {/* Filter Panel */}
      {showFilterPanel && (
        <div className="mt-4 p-6 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Advanced Filters</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-6">
            {/* Tags Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {POPULAR_TAGS.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      filters.tags.includes(tag.id)
                        ? tag.color
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Member Count Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Member Count Range
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="0"
                  max="1000000"
                  step="1000"
                  value={filters.memberCountRange[1]}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    memberCountRange: [prev.memberCountRange[0], parseInt(e.target.value)]
                  }))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-600 min-w-0">
                  Up to {formatMemberCount(filters.memberCountRange[1])}
                </span>
              </div>
            </div>

            {/* Activity Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Activity Level
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ACTIVITY_LEVELS.map(level => (
                  <button
                    key={level.id}
                    onClick={() => toggleActivityLevel(level.id)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      filters.activityLevel.includes(level.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span>{level.icon}</span>
                      <span className="text-sm font-medium">{level.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Token Requirements */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token Requirements
              </label>
              <div className="flex space-x-4">
                <button
                  onClick={() => setFilters(prev => ({ 
                    ...prev, 
                    tokenRequirements: prev.tokenRequirements === true ? null : true 
                  }))}
                  className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                    filters.tokenRequirements === true
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  Has Token Requirements
                </button>
                <button
                  onClick={() => setFilters(prev => ({ 
                    ...prev, 
                    tokenRequirements: prev.tokenRequirements === false ? null : false 
                  }))}
                  className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                    filters.tokenRequirements === false
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  No Token Requirements
                </button>
              </div>
            </div>

            {/* Governance Active */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Governance Status
              </label>
              <div className="flex space-x-4">
                <button
                  onClick={() => setFilters(prev => ({ 
                    ...prev, 
                    governanceActive: prev.governanceActive === true ? null : true 
                  }))}
                  className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                    filters.governanceActive === true
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  Active Governance
                </button>
                <button
                  onClick={() => setFilters(prev => ({ 
                    ...prev, 
                    governanceActive: prev.governanceActive === false ? null : false 
                  }))}
                  className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                    filters.governanceActive === false
                      ? 'border-gray-500 bg-gray-50 text-gray-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  No Active Governance
                </button>
              </div>
            </div>
          </div>

          {/* Apply Filters Button */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={handleSearch}
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {(filters.tags.length > 0 || filters.activityLevel.length > 0 || 
        filters.tokenRequirements !== null || filters.governanceActive !== null) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.tags.map(tagId => {
            const tag = POPULAR_TAGS.find(t => t.id === tagId);
            return tag ? (
              <span
                key={tagId}
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${tag.color}`}
              >
                {tag.label}
                <button
                  onClick={() => toggleTag(tagId)}
                  className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ) : null;
          })}
          
          {filters.activityLevel.map(level => {
            const levelData = ACTIVITY_LEVELS.find(l => l.id === level);
            return levelData ? (
              <span
                key={level}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
              >
                {levelData.icon} {levelData.label}
                <button
                  onClick={() => toggleActivityLevel(level)}
                  className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
};

export default AdvancedSearchInterface;