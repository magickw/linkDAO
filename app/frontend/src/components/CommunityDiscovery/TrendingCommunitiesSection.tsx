import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Activity, Star, ArrowRight, Zap, Trophy } from 'lucide-react';
import { EnhancedCommunityData } from '../../types/communityEnhancements';

interface TrendingCommunity extends EnhancedCommunityData {
  growthMetrics: {
    memberGrowth24h: number;
    memberGrowthPercentage: number;
    activityGrowth24h: number;
    trendingScore: number;
    rank: number;
    rankChange: number;
  };
  tokenMetrics?: {
    marketCap?: number;
    volume24h?: number;
    priceChange24h?: number;
    stakingApr?: number;
  };
}

interface TrendingCommunitiesSectionProps {
  onCommunitySelect?: (community: EnhancedCommunityData) => void;
  onViewAll?: () => void;
  maxItems?: number;
  showComparison?: boolean;
}

export const TrendingCommunitiesSection: React.FC<TrendingCommunitiesSectionProps> = ({
  onCommunitySelect,
  onViewAll,
  maxItems = 5,
  showComparison = true
}) => {
  const [trendingCommunities, setTrendingCommunities] = useState<TrendingCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    fetchTrendingCommunities();
  }, [selectedTimeframe]);

  const fetchTrendingCommunities = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock data for now - replace with actual API call
      const mockTrendingCommunities: TrendingCommunity[] = [
        {
          id: '1',
          name: 'DeFi Innovators',
          description: 'Building the future of decentralized finance',
          memberCount: 15420,
          icon: '🚀',
          bannerImage: '/api/placeholder/400/200',
          brandColors: {
            primary: '#6366f1',
            secondary: '#8b5cf6',
            accent: '#06b6d4'
          },
          userMembership: {
            isJoined: false,
            joinDate: new Date(),
            reputation: 0,
            tokenBalance: 0
          },
          activityMetrics: {
            postsToday: 45,
            activeMembers: 892,
            trendingScore: 95,
            engagementRate: 0.78,
            activityLevel: 'very-high'
          },
          governance: {
            activeProposals: 3,
            userVotingPower: 0,
            participationRate: 0.65
          },
          growthMetrics: {
            memberGrowth24h: 234,
            memberGrowthPercentage: 1.54,
            activityGrowth24h: 67,
            trendingScore: 95,
            rank: 1,
            rankChange: 2
          },
          tokenMetrics: {
            marketCap: 45600000,
            volume24h: 2340000,
            priceChange24h: 12.4,
            stakingApr: 18.5
          }
        },
        {
          id: '2',
          name: 'NFT Creators Hub',
          description: 'Where digital artists and collectors meet',
          memberCount: 12890,
          icon: '🎨',
          bannerImage: '/api/placeholder/400/200',
          brandColors: {
            primary: '#f59e0b',
            secondary: '#ef4444',
            accent: '#10b981'
          },
          userMembership: {
            isJoined: true,
            joinDate: new Date('2024-01-15'),
            reputation: 150,
            tokenBalance: 250
          },
          activityMetrics: {
            postsToday: 38,
            activeMembers: 743,
            trendingScore: 87,
            engagementRate: 0.72,
            activityLevel: 'high'
          },
          governance: {
            activeProposals: 2,
            userVotingPower: 250,
            participationRate: 0.58
          },
          growthMetrics: {
            memberGrowth24h: 189,
            memberGrowthPercentage: 1.49,
            activityGrowth24h: 52,
            trendingScore: 87,
            rank: 2,
            rankChange: -1
          },
          tokenMetrics: {
            marketCap: 23400000,
            volume24h: 1890000,
            priceChange24h: -3.2,
            stakingApr: 22.1
          }
        },
        {
          id: '3',
          name: 'Web3 Gaming Alliance',
          description: 'The future of gaming is decentralized',
          memberCount: 9876,
          icon: '🎮',
          bannerImage: '/api/placeholder/400/200',
          brandColors: {
            primary: '#8b5cf6',
            secondary: '#06b6d4',
            accent: '#f59e0b'
          },
          userMembership: {
            isJoined: false,
            joinDate: new Date(),
            reputation: 0,
            tokenBalance: 0
          },
          activityMetrics: {
            postsToday: 29,
            activeMembers: 567,
            trendingScore: 82,
            engagementRate: 0.69,
            activityLevel: 'high'
          },
          governance: {
            activeProposals: 1,
            userVotingPower: 0,
            participationRate: 0.71
          },
          growthMetrics: {
            memberGrowth24h: 156,
            memberGrowthPercentage: 1.60,
            activityGrowth24h: 48,
            trendingScore: 82,
            rank: 3,
            rankChange: 1
          },
          tokenMetrics: {
            marketCap: 18900000,
            volume24h: 1230000,
            priceChange24h: 8.7,
            stakingApr: 15.3
          }
        }
      ];

      setTrendingCommunities(mockTrendingCommunities.slice(0, maxItems));
    } catch (err) {
      setError('Failed to load trending communities');
      console.error('Error fetching trending communities:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (num: number): string => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
    return `$${num}`;
  };

  const getRankChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-3 h-3 text-green-500" />;
    if (change < 0) return <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />;
    return <div className="w-3 h-3" />;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button 
            onClick={fetchTrendingCommunities}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-gray-900">Trending Communities</h2>
          </div>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Timeframe Selector */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {(['24h', '7d', '30d'] as const).map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => setSelectedTimeframe(timeframe)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedTimeframe === timeframe
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {timeframe}
            </button>
          ))}
        </div>
      </div>

      {/* Communities List */}
      <div className="divide-y divide-gray-100">
        {trendingCommunities.map((community, index) => (
          <div
            key={community.id}
            className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => onCommunitySelect?.(community)}
          >
            <div className="flex items-center space-x-4">
              {/* Rank */}
              <div className="flex items-center space-x-2 w-12">
                <span className="text-lg font-bold text-gray-400">#{community.growthMetrics.rank}</span>
                {getRankChangeIcon(community.growthMetrics.rankChange)}
              </div>

              {/* Community Icon */}
              <div className="relative">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-xl"
                  style={{ backgroundColor: community.brandColors.primary + '20' }}
                >
                  {community.icon}
                </div>
                {community.userMembership.isJoined && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </div>

              {/* Community Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-medium text-gray-900 truncate">{community.name}</h3>
                  <div className="flex items-center space-x-1">
                    <Zap className="w-3 h-3 text-yellow-500" />
                    <span className="text-xs font-medium text-yellow-600">
                      {community.growthMetrics.trendingScore}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Users className="w-3 h-3" />
                    <span>{formatNumber(community.memberCount)}</span>
                    <span className="text-green-600">
                      (+{community.growthMetrics.memberGrowthPercentage.toFixed(1)}%)
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Activity className="w-3 h-3" />
                    <span>{community.activityMetrics.postsToday} posts</span>
                  </div>
                </div>

                {/* Token Metrics */}
                {community.tokenMetrics && (
                  <div className="flex items-center space-x-4 mt-1 text-xs text-gray-400">
                    <span>MCap: {formatCurrency(community.tokenMetrics.marketCap || 0)}</span>
                    <span className={(community.tokenMetrics.priceChange24h ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {(community.tokenMetrics.priceChange24h ?? 0) >= 0 ? '+' : ''}
                      {(community.tokenMetrics.priceChange24h ?? 0).toFixed(1)}%
                    </span>
                    {community.tokenMetrics.stakingApr && (
                      <span>APR: {community.tokenMetrics.stakingApr}%</span>
                    )}
                  </div>
                )}
              </div>

              {/* Growth Indicator */}
              <div className="text-right">
                <div className="text-sm font-medium text-green-600">
                  +{community.growthMetrics.memberGrowth24h}
                </div>
                <div className="text-xs text-gray-500">new members</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Tool Footer */}
      {showComparison && trendingCommunities.length > 1 && (
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <button className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">
            Compare Selected Communities
          </button>
        </div>
      )}
    </div>
  );
};

export default TrendingCommunitiesSection;