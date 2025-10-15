import React, { useState, useEffect } from 'react';
import { Users, UserCheck, TrendingUp, Calendar, Zap, ExternalLink } from 'lucide-react';
import { EnhancedCommunityData } from '../../types/communityEnhancements';

interface Connection {
  id: string;
  username: string;
  avatar: string;
  ensName?: string;
  mutualConnections: number;
  isFollowing: boolean;
}

interface RecommendedCommunity extends EnhancedCommunityData {
  recommendationReason: {
    type: 'mutual_connections' | 'token_holdings' | 'transaction_history' | 'similar_interests';
    score: number;
    details: string;
    connections?: Connection[];
    tokenOverlap?: string[];
    eventHighlight?: CommunityEvent;
  };
}

interface CommunityEvent {
  id: string;
  type: 'governance_vote' | 'token_launch' | 'community_event' | 'airdrop';
  title: string;
  description: string;
  date: Date;
  isUpcoming: boolean;
  importance: 'low' | 'medium' | 'high' | 'critical';
}

interface ConnectionBasedRecommendationsProps {
  userWalletAddress?: string;
  userConnections?: Connection[];
  onCommunitySelect: (community: RecommendedCommunity) => void;
  onConnectionClick?: (connection: Connection) => void;
  maxRecommendations?: number;
}

export const ConnectionBasedRecommendations: React.FC<ConnectionBasedRecommendationsProps> = ({
  userWalletAddress,
  userConnections = [],
  onCommunitySelect,
  onConnectionClick,
  maxRecommendations = 6
}) => {
  const [recommendations, setRecommendations] = useState<RecommendedCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'connections' | 'tokens' | 'events'>('connections');

  useEffect(() => {
    fetchRecommendations();
  }, [userWalletAddress, selectedTab]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      
      // Mock recommendations based on different criteria
      const mockRecommendations: RecommendedCommunity[] = [
        {
          id: '1',
          name: 'DeFi Yield Farmers',
          description: 'Maximizing yields across DeFi protocols',
          memberCount: 8420,
          icon: '🌾',
          brandColors: { primary: '#10b981', secondary: '#059669', accent: '#34d399' },
          userMembership: { isJoined: false, joinDate: new Date(), reputation: 0, tokenBalance: 0 },
          activityMetrics: {
            postsToday: 32,
            activeMembers: 456,
            trendingScore: 88,
            engagementRate: 0.74,
            activityLevel: 'high'
          },
          governance: { activeProposals: 2, userVotingPower: 0, participationRate: 0.68 },
          recommendationReason: {
            type: 'mutual_connections',
            score: 92,
            details: '5 of your connections are members',
            connections: [
              { id: '1', username: 'alice.eth', avatar: '/api/placeholder/32/32', ensName: 'alice.eth', mutualConnections: 12, isFollowing: true },
              { id: '2', username: 'bob_defi', avatar: '/api/placeholder/32/32', mutualConnections: 8, isFollowing: false },
              { id: '3', username: 'carol.crypto', avatar: '/api/placeholder/32/32', mutualConnections: 15, isFollowing: true }
            ]
          }
        },
        {
          id: '2',
          name: 'NFT Alpha Hunters',
          description: 'Finding the next blue-chip NFT collections',
          memberCount: 12340,
          icon: '🎯',
          brandColors: { primary: '#8b5cf6', secondary: '#7c3aed', accent: '#a78bfa' },
          userMembership: { isJoined: false, joinDate: new Date(), reputation: 0, tokenBalance: 0 },
          activityMetrics: {
            postsToday: 45,
            activeMembers: 678,
            trendingScore: 91,
            engagementRate: 0.82,
            activityLevel: 'very-high'
          },
          governance: { activeProposals: 1, userVotingPower: 0, participationRate: 0.45 },
          recommendationReason: {
            type: 'token_holdings',
            score: 87,
            details: 'Based on your NFT portfolio',
            tokenOverlap: ['BAYC', 'CryptoPunks', 'Azuki']
          }
        },
        {
          id: '3',
          name: 'Layer 2 Builders',
          description: 'Building the future of Ethereum scaling',
          memberCount: 6780,
          icon: '⚡',
          brandColors: { primary: '#3b82f6', secondary: '#2563eb', accent: '#60a5fa' },
          userMembership: { isJoined: false, joinDate: new Date(), reputation: 0, tokenBalance: 0 },
          activityMetrics: {
            postsToday: 28,
            activeMembers: 234,
            trendingScore: 85,
            engagementRate: 0.69,
            activityLevel: 'high'
          },
          governance: { activeProposals: 3, userVotingPower: 0, participationRate: 0.72 },
          recommendationReason: {
            type: 'transaction_history',
            score: 84,
            details: 'Active on Arbitrum and Optimism',
            eventHighlight: {
              id: '1',
              type: 'governance_vote',
              title: 'L2 Fee Optimization Proposal',
              description: 'Vote on reducing transaction fees across Layer 2 networks',
              date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
              isUpcoming: true,
              importance: 'high'
            }
          }
        }
      ];

      // Filter based on selected tab
      let filteredRecommendations = mockRecommendations;
      if (selectedTab === 'connections') {
        filteredRecommendations = mockRecommendations.filter(r => 
          r.recommendationReason.type === 'mutual_connections'
        );
      } else if (selectedTab === 'tokens') {
        filteredRecommendations = mockRecommendations.filter(r => 
          r.recommendationReason.type === 'token_holdings'
        );
      } else if (selectedTab === 'events') {
        filteredRecommendations = mockRecommendations.filter(r => 
          r.recommendationReason.eventHighlight
        );
      }

      setRecommendations(filteredRecommendations.slice(0, maxRecommendations));
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'mutual_connections': return <Users className="w-4 h-4" />;
      case 'token_holdings': return <Zap className="w-4 h-4" />;
      case 'transaction_history': return <TrendingUp className="w-4 h-4" />;
      default: return <UserCheck className="w-4 h-4" />;
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'governance_vote': return '🗳️';
      case 'token_launch': return '🚀';
      case 'community_event': return '🎉';
      case 'airdrop': return '💰';
      default: return '📅';
    }
  };

  const getEventImportanceColor = (importance: string) => {
    switch (importance) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
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

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center space-x-2 mb-4">
          <UserCheck className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Recommended for You
          </h2>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { id: 'connections', label: 'Connections', icon: Users },
            { id: 'tokens', label: 'Tokens', icon: Zap },
            { id: 'events', label: 'Events', icon: Calendar }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors ${
                  selectedTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>      {/* 
Recommendations List */}
      <div className="divide-y divide-gray-100">
        {recommendations.map(community => (
          <div
            key={community.id}
            className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => onCommunitySelect(community)}
          >
            <div className="flex items-start space-x-4">
              {/* Community Icon */}
              <div className="relative flex-shrink-0">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-xl"
                  style={{ backgroundColor: community.brandColors.primary + '20' }}
                >
                  {community.icon}
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">
                    {community.recommendationReason.score}
                  </span>
                </div>
              </div>

              {/* Community Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-medium text-gray-900 truncate">
                    {community.name}
                  </h3>
                  <div className="flex items-center space-x-1 text-blue-600">
                    {getRecommendationIcon(community.recommendationReason.type)}
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {community.description}
                </p>

                {/* Recommendation Reason */}
                <div className="mb-3">
                  <div className="flex items-center space-x-2 text-sm text-blue-600 mb-1">
                    {getRecommendationIcon(community.recommendationReason.type)}
                    <span className="font-medium">
                      {community.recommendationReason.details}
                    </span>
                  </div>

                  {/* Connection Avatars */}
                  {community.recommendationReason.connections && (
                    <div className="flex items-center space-x-2">
                      <div className="flex -space-x-2">
                        {community.recommendationReason.connections.slice(0, 3).map(connection => (
                          <button
                            key={connection.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onConnectionClick?.(connection);
                            }}
                            className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 hover:scale-110 transition-transform"
                            title={connection.ensName || connection.username}
                          >
                            <img 
                              src={connection.avatar} 
                              alt={connection.username}
                              className="w-full h-full rounded-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                      {community.recommendationReason.connections.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{community.recommendationReason.connections.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Token Overlap */}
                  {community.recommendationReason.tokenOverlap && (
                    <div className="flex flex-wrap gap-1">
                      {community.recommendationReason.tokenOverlap.slice(0, 3).map(token => (
                        <span
                          key={token}
                          className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                        >
                          {token}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Event Highlight */}
                  {community.recommendationReason.eventHighlight && (
                    <div className={`p-2 rounded-lg border ${getEventImportanceColor(community.recommendationReason.eventHighlight.importance)}`}>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm">
                          {getEventIcon(community.recommendationReason.eventHighlight.type)}
                        </span>
                        <span className="text-sm font-medium">
                          {community.recommendationReason.eventHighlight.title}
                        </span>
                        {community.recommendationReason.eventHighlight.isUpcoming && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                            Upcoming
                          </span>
                        )}
                      </div>
                      <p className="text-xs opacity-75">
                        {community.recommendationReason.eventHighlight.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* Community Stats */}
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Users className="w-3 h-3" />
                    <span>{formatNumber(community.memberCount)}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>{community.activityMetrics.postsToday} posts today</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <Zap className="w-3 h-3" />
                    <span>{(community.activityMetrics.engagementRate * 100).toFixed(0)}% engagement</span>
                  </div>
                </div>
              </div>

              {/* Join Button */}
              <div className="flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle join action
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {recommendations.length === 0 && (
        <div className="p-12 text-center">
          <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Recommendations Found
          </h3>
          <p className="text-gray-600 mb-4">
            {selectedTab === 'connections' && "Connect with more people to get personalized community recommendations."}
            {selectedTab === 'tokens' && "Your token portfolio will help us recommend relevant communities."}
            {selectedTab === 'events' && "No upcoming events in communities that match your interests."}
          </p>
          <button
            onClick={() => setSelectedTab('connections')}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Explore All Communities
          </button>
        </div>
      )}

      {/* Footer */}
      {recommendations.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Showing {recommendations.length} recommendations
            </span>
            <button className="text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1">
              <span>View All</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionBasedRecommendations;