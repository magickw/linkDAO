import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Vote, Zap, Gift, ExternalLink, Bell } from 'lucide-react';

interface CommunityEvent {
  id: string;
  communityId: string;
  communityName: string;
  communityIcon: string;
  type: 'governance_vote' | 'token_launch' | 'community_event' | 'airdrop' | 'ama' | 'hackathon';
  title: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  isUpcoming: boolean;
  importance: 'low' | 'medium' | 'high' | 'critical';
  participants?: number;
  maxParticipants?: number;
  rewards?: {
    type: 'token' | 'nft' | 'badge';
    amount?: number;
    symbol?: string;
  };
  requirements?: {
    minTokens?: number;
    membershipRequired?: boolean;
    stakingRequired?: boolean;
  };
}

interface CommunityEventHighlightsProps {
  userWalletAddress?: string;
  onEventClick?: (event: CommunityEvent) => void;
  onCommunityClick?: (communityId: string) => void;
  onNotifyMe?: (eventId: string) => void;
  maxEvents?: number;
  filterByUserInterests?: boolean;
}

export const CommunityEventHighlights: React.FC<CommunityEventHighlightsProps> = ({
  userWalletAddress,
  onEventClick,
  onCommunityClick,
  onNotifyMe,
  maxEvents = 6,
  filterByUserInterests = true
}) => {
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'upcoming' | 'today' | 'this-week'>('upcoming');

  useEffect(() => {
    fetchCommunityEvents();
  }, [selectedFilter, userWalletAddress]);

  const fetchCommunityEvents = async () => {
    try {
      setLoading(true);
      
      // Mock events data - replace with actual API call
      const mockEvents: CommunityEvent[] = [
        {
          id: '1',
          communityId: 'defi-innovators',
          communityName: 'DeFi Innovators',
          communityIcon: '🚀',
          type: 'governance_vote',
          title: 'Protocol Fee Reduction Proposal',
          description: 'Vote on reducing protocol fees from 0.3% to 0.25% to increase competitiveness',
          startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isUpcoming: true,
          importance: 'high',
          participants: 1250,
          requirements: {
            minTokens: 100,
            membershipRequired: true
          }
        },
        {
          id: '2',
          communityId: 'nft-creators',
          communityName: 'NFT Creators Hub',
          communityIcon: '🎨',
          type: 'token_launch',
          title: 'Creator Token Launch',
          description: 'Launch of the new CREATOR token with exclusive benefits for artists',
          startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          isUpcoming: true,
          importance: 'critical',
          rewards: {
            type: 'token',
            amount: 1000,
            symbol: 'CREATOR'
          }
        },
        {
          id: '3',
          communityId: 'web3-gaming',
          communityName: 'Web3 Gaming Alliance',
          communityIcon: '🎮',
          type: 'airdrop',
          title: 'Gaming NFT Airdrop',
          description: 'Exclusive gaming NFTs for active community members',
          startDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          isUpcoming: true,
          importance: 'medium',
          participants: 450,
          maxParticipants: 1000,
          rewards: {
            type: 'nft',
            amount: 1
          },
          requirements: {
            membershipRequired: true,
            stakingRequired: false
          }
        },
        {
          id: '4',
          communityId: 'dao-builders',
          communityName: 'DAO Builders',
          communityIcon: '🏗️',
          type: 'hackathon',
          title: 'DAO Tooling Hackathon',
          description: '48-hour hackathon to build the next generation of DAO tools',
          startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
          isUpcoming: true,
          importance: 'high',
          participants: 89,
          maxParticipants: 200,
          rewards: {
            type: 'token',
            amount: 50000,
            symbol: 'BUILD'
          }
        },
        {
          id: '5',
          communityId: 'layer2-builders',
          communityName: 'Layer 2 Builders',
          communityIcon: '⚡',
          type: 'ama',
          title: 'AMA with Vitalik Buterin',
          description: 'Ask Vitalik anything about Ethereum scaling and Layer 2 solutions',
          startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          isUpcoming: true,
          importance: 'critical',
          participants: 2340,
          maxParticipants: 5000
        }
      ];

      // Filter events based on selected filter
      let filteredEvents = mockEvents;
      const now = new Date();
      
      switch (selectedFilter) {
        case 'today':
          filteredEvents = mockEvents.filter(event => 
            event.startDate.toDateString() === now.toDateString()
          );
          break;
        case 'this-week':
          const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          filteredEvents = mockEvents.filter(event => 
            event.startDate >= now && event.startDate <= weekFromNow
          );
          break;
        case 'upcoming':
          filteredEvents = mockEvents.filter(event => event.isUpcoming);
          break;
        default:
          filteredEvents = mockEvents;
      }

      setEvents(filteredEvents.slice(0, maxEvents));
    } catch (error) {
      console.error('Error fetching community events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'governance_vote': return <Vote className="w-5 h-5" />;
      case 'token_launch': return <Zap className="w-5 h-5" />;
      case 'airdrop': return <Gift className="w-5 h-5" />;
      case 'hackathon': return <Users className="w-5 h-5" />;
      case 'ama': return <Users className="w-5 h-5" />;
      default: return <Calendar className="w-5 h-5" />;
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'governance_vote': return 'bg-purple-100 text-purple-800';
      case 'token_launch': return 'bg-green-100 text-green-800';
      case 'airdrop': return 'bg-yellow-100 text-yellow-800';
      case 'hackathon': return 'bg-blue-100 text-blue-800';
      case 'ama': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'critical': return 'border-l-red-500';
      case 'high': return 'border-l-orange-500';
      case 'medium': return 'border-l-yellow-500';
      default: return 'border-l-blue-500';
    }
  };

  const formatTimeUntil = (date: Date): string => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return 'Soon';
  };

  const formatParticipants = (count: number): string => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
          <Calendar className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Community Events
          </h2>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'today', label: 'Today' },
            { id: 'this-week', label: 'This Week' },
            { id: 'all', label: 'All' }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setSelectedFilter(filter.id as any)}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                selectedFilter === filter.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>   
   {/* Events List */}
      <div className="divide-y divide-gray-100">
        {events.map(event => (
          <div
            key={event.id}
            className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 ${getImportanceColor(event.importance)}`}
            onClick={() => onEventClick?.(event)}
          >
            <div className="flex items-start space-x-4">
              {/* Event Icon & Community */}
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl">
                    {event.communityIcon}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full border-2 border-white flex items-center justify-center">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${getEventTypeColor(event.type)}`}>
                      {getEventIcon(event.type)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">
                      {event.title}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCommunityClick?.(event.communityId);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {event.communityName}
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEventTypeColor(event.type)}`}>
                      {event.type.replace('_', ' ')}
                    </span>
                    {event.importance === 'critical' && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        Critical
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {event.description}
                </p>

                {/* Event Metadata */}
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{formatTimeUntil(event.startDate)}</span>
                  </div>
                  
                  {event.participants && (
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>
                        {formatParticipants(event.participants)}
                        {event.maxParticipants && ` / ${formatParticipants(event.maxParticipants)}`}
                      </span>
                    </div>
                  )}

                  {event.rewards && (
                    <div className="flex items-center space-x-1">
                      <Gift className="w-4 h-4" />
                      <span>
                        {event.rewards.amount} {event.rewards.symbol || event.rewards.type}
                      </span>
                    </div>
                  )}
                </div>

                {/* Requirements */}
                {event.requirements && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {event.requirements.membershipRequired && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        Membership Required
                      </span>
                    )}
                    {event.requirements.minTokens && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        Min {event.requirements.minTokens} tokens
                      </span>
                    )}
                    {event.requirements.stakingRequired && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                        Staking Required
                      </span>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(event);
                    }}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <span>Join Event</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNotifyMe?.(event.id);
                    }}
                    className="flex items-center space-x-1 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Bell className="w-3 h-3" />
                    <span>Notify Me</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {events.length === 0 && (
        <div className="p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Events Found
          </h3>
          <p className="text-gray-600 mb-4">
            {selectedFilter === 'today' && "No events scheduled for today."}
            {selectedFilter === 'this-week' && "No events scheduled for this week."}
            {selectedFilter === 'upcoming' && "No upcoming events found."}
            {selectedFilter === 'all' && "No events available at the moment."}
          </p>
          <button
            onClick={() => setSelectedFilter('all')}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View All Events
          </button>
        </div>
      )}

      {/* Footer */}
      {events.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Showing {events.length} event{events.length !== 1 ? 's' : ''}
            </span>
            <button className="text-blue-600 hover:text-blue-800 font-medium">
              View Calendar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityEventHighlights;