/**
 * Advanced Analytics Dashboard
 * Comprehensive analytics for channel engagement, member activity, and token flow
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Users, MessageCircle, 
  DollarSign, Activity, Eye, Heart, Share2,
  Clock, Target, Zap, Globe, ArrowUp, ArrowDown,
  Calendar, Filter, Download, RefreshCw
} from 'lucide-react';

interface ChannelMetrics {
  id: string;
  name: string;
  memberCount: number;
  messageCount: number;
  engagementRate: number;
  growthRate: number;
  avgResponseTime: number; // minutes
  topContributors: Contributor[];
  activityTrend: ActivityData[];
  tokenFlow: TokenFlowData[];
}

interface Contributor {
  address: string;
  name: string;
  messageCount: number;
  reactionCount: number;
  shareCount: number;
  tokenEarned: number;
  rank: number;
}

interface ActivityData {
  date: string;
  messages: number;
  reactions: number;
  shares: number;
  newMembers: number;
  activeMembers: number;
}

interface TokenFlowData {
  date: string;
  inflow: number;
  outflow: number;
  netFlow: number;
  transactions: number;
}

interface MemberInsight {
  address: string;
  name: string;
  activityLevel: 'high' | 'medium' | 'low';
  joinDate: Date;
  totalMessages: number;
  totalReactions: number;
  tokenBalance: number;
  engagementScore: number;
  lastActive: Date;
  interests: string[];
}

interface EngagementMetrics {
  totalMessages: number;
  totalReactions: number;
  totalShares: number;
  activeMembers: number;
  engagementRate: number;
  avgSessionDuration: number;
  peakHours: number[];
  topContent: ContentMetric[];
}

interface ContentMetric {
  id: string;
  content: string;
  type: 'message' | 'nft' | 'transaction' | 'proposal';
  engagement: number;
  reach: number;
  reactions: number;
  shares: number;
  timestamp: Date;
}

const AdvancedAnalyticsDashboard: React.FC<{
  className?: string;
  channelId?: string;
  timeRange?: '24h' | '7d' | '30d' | '90d';
  onExportData?: (data: any) => void;
}> = ({ className = '', channelId, timeRange = '7d', onExportData }) => {
  const [selectedChannel, setSelectedChannel] = useState<string>('general');
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'engagement' | 'members' | 'tokens'>('overview');

  const [channelMetrics, setChannelMetrics] = useState<ChannelMetrics[]>([
    {
      id: 'general',
      name: 'general',
      memberCount: 1242,
      messageCount: 15420,
      engagementRate: 78.5,
      growthRate: 12.3,
      avgResponseTime: 4.2,
      topContributors: [
        {
          address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1',
          name: 'vitalik.eth',
          messageCount: 245,
          reactionCount: 1890,
          shareCount: 156,
          tokenEarned: 1250,
          rank: 1
        },
        {
          address: '0x8ba1f109551bD432803012645Hac136c30C6d8b1',
          name: 'alice.eth',
          messageCount: 189,
          reactionCount: 1245,
          shareCount: 98,
          tokenEarned: 890,
          rank: 2
        }
      ],
      activityTrend: generateActivityTrend(),
      tokenFlow: generateTokenFlow()
    },
    {
      id: 'trading',
      name: 'trading',
      memberCount: 856,
      messageCount: 8920,
      engagementRate: 65.2,
      growthRate: 8.7,
      avgResponseTime: 2.8,
      topContributors: [],
      activityTrend: generateActivityTrend(),
      tokenFlow: generateTokenFlow()
    }
  ]);

  const [memberInsights, setMemberInsights] = useState<MemberInsight[]>([
    {
      address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1',
      name: 'vitalik.eth',
      activityLevel: 'high',
      joinDate: new Date('2023-01-15'),
      totalMessages: 245,
      totalReactions: 1890,
      tokenBalance: 12500,
      engagementScore: 95,
      lastActive: new Date(Date.now() - 300000),
      interests: ['DeFi', 'Governance', 'Ethereum']
    },
    {
      address: '0x8ba1f109551bD432803012645Hac136c30C6d8b1',
      name: 'alice.eth',
      activityLevel: 'high',
      joinDate: new Date('2023-02-20'),
      totalMessages: 189,
      totalReactions: 1245,
      tokenBalance: 8900,
      engagementScore: 87,
      lastActive: new Date(Date.now() - 600000),
      interests: ['NFTs', 'Trading', 'Art']
    }
  ]);

  const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetrics>({
    totalMessages: 15420,
    totalReactions: 45680,
    totalShares: 2340,
    activeMembers: 892,
    engagementRate: 78.5,
    avgSessionDuration: 24.5,
    peakHours: [14, 15, 16, 20, 21],
    topContent: [
      {
        id: '1',
        content: 'New DeFi protocol launched with 10x potential',
        type: 'message',
        engagement: 245,
        reach: 1200,
        reactions: 89,
        shares: 23,
        timestamp: new Date(Date.now() - 3600000)
      }
    ]
  });

  function generateActivityTrend(): ActivityData[] {
    const data: ActivityData[] = [];
    const days = selectedTimeRange === '24h' ? 1 : selectedTimeRange === '7d' ? 7 : selectedTimeRange === '30d' ? 30 : 90;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        messages: Math.floor(Math.random() * 200) + 50,
        reactions: Math.floor(Math.random() * 500) + 100,
        shares: Math.floor(Math.random() * 50) + 10,
        newMembers: Math.floor(Math.random() * 20) + 5,
        activeMembers: Math.floor(Math.random() * 100) + 200
      });
    }
    
    return data;
  }

  function generateTokenFlow(): TokenFlowData[] {
    const data: TokenFlowData[] = [];
    const days = selectedTimeRange === '24h' ? 1 : selectedTimeRange === '7d' ? 7 : selectedTimeRange === '30d' ? 30 : 90;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const inflow = Math.floor(Math.random() * 10000) + 5000;
      const outflow = Math.floor(Math.random() * 8000) + 3000;
      
      data.push({
        date: date.toISOString().split('T')[0],
        inflow,
        outflow,
        netFlow: inflow - outflow,
        transactions: Math.floor(Math.random() * 50) + 20
      });
    }
    
    return data;
  }

  const getActivityLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getActivityLevelBg = (level: string) => {
    switch (level) {
      case 'high': return 'bg-green-900';
      case 'medium': return 'bg-yellow-900';
      case 'low': return 'bg-red-900';
      default: return 'bg-gray-900';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  const exportData = () => {
    const data = {
      channelMetrics,
      memberInsights,
      engagementMetrics,
      timeRange: selectedTimeRange,
      exportDate: new Date()
    };
    onExportData?.(data);
  };

  const refreshData = async () => {
    setIsLoading(true);
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <BarChart3 size={24} className="text-blue-500 mr-3" />
          <div>
            <h2 className="text-xl font-bold text-white">Advanced Analytics</h2>
            <p className="text-sm text-gray-400">Channel engagement and member insights</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="bg-gray-700 text-white rounded px-3 py-1 text-sm"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          
          <button
            onClick={refreshData}
            disabled={isLoading}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          
          <button
            onClick={exportData}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-800 rounded-lg p-1">
        {[
          { id: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
          { id: 'engagement', label: 'Engagement', icon: <Activity size={16} /> },
          { id: 'members', label: 'Members', icon: <Users size={16} /> },
          { id: 'tokens', label: 'Token Flow', icon: <DollarSign size={16} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id as any)}
            className={`flex items-center px-4 py-2 rounded text-sm transition-colors ${
              viewMode === tab.id 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.icon}
            <span className="ml-2">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-400">Total Messages</div>
                <MessageCircle size={16} className="text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-white">{formatNumber(engagementMetrics.totalMessages)}</div>
              <div className="text-sm text-green-400 flex items-center">
                <ArrowUp size={12} className="mr-1" />
                +12.5%
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-400">Engagement Rate</div>
                <Heart size={16} className="text-red-500" />
              </div>
              <div className="text-2xl font-bold text-white">{formatPercentage(engagementMetrics.engagementRate)}</div>
              <div className="text-sm text-green-400 flex items-center">
                <ArrowUp size={12} className="mr-1" />
                +5.2%
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-400">Active Members</div>
                <Users size={16} className="text-green-500" />
              </div>
              <div className="text-2xl font-bold text-white">{formatNumber(engagementMetrics.activeMembers)}</div>
              <div className="text-sm text-green-400 flex items-center">
                <ArrowUp size={12} className="mr-1" />
                +8.3%
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-400">Avg Session</div>
                <Clock size={16} className="text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-white">{engagementMetrics.avgSessionDuration}m</div>
              <div className="text-sm text-red-400 flex items-center">
                <ArrowDown size={12} className="mr-1" />
                -2.1%
              </div>
            </div>
          </div>

          {/* Channel Comparison */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Channel Performance</h3>
            
            <div className="space-y-3">
              {channelMetrics.map(channel => (
                <div key={channel.id} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mr-3">
                      <span className="text-white font-bold text-sm">#</span>
                    </div>
                    <div>
                      <div className="font-medium text-white">{channel.name}</div>
                      <div className="text-sm text-gray-400">{channel.memberCount} members</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <div className="text-sm font-semibold text-white">{formatNumber(channel.messageCount)}</div>
                      <div className="text-xs text-gray-400">Messages</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-white">{formatPercentage(channel.engagementRate)}</div>
                      <div className="text-xs text-gray-400">Engagement</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-white">{formatPercentage(channel.growthRate)}</div>
                      <div className="text-xs text-gray-400">Growth</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Engagement Tab */}
      {viewMode === 'engagement' && (
        <div className="space-y-6">
          {/* Engagement Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Total Reactions</div>
              <div className="text-2xl font-bold text-white">{formatNumber(engagementMetrics.totalReactions)}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Total Shares</div>
              <div className="text-2xl font-bold text-white">{formatNumber(engagementMetrics.totalShares)}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Peak Hours</div>
              <div className="text-2xl font-bold text-white">{engagementMetrics.peakHours.join(', ')}</div>
            </div>
          </div>

          {/* Top Content */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Top Performing Content</h3>
            
            <div className="space-y-3">
              {engagementMetrics.topContent.map(content => (
                <div key={content.id} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                  <div className="flex-1">
                    <div className="text-white font-medium mb-1">{content.content}</div>
                    <div className="text-sm text-gray-400">
                      {content.timestamp.toLocaleDateString()} • {content.type}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-white">{content.reactions}</div>
                      <div className="text-xs text-gray-400">Reactions</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-white">{content.shares}</div>
                      <div className="text-xs text-gray-400">Shares</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-white">{content.reach}</div>
                      <div className="text-xs text-gray-400">Reach</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Members Tab */}
      {viewMode === 'members' && (
        <div className="space-y-6">
          {/* Member Insights */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Top Contributors</h3>
            
            <div className="space-y-3">
              {memberInsights.map(member => (
                <div key={member.address} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mr-3">
                      <Users size={20} className="text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-white">{member.name}</div>
                      <div className="text-sm text-gray-400">
                        Joined {member.joinDate.toLocaleDateString()} • 
                        Last active {member.lastActive.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-sm font-semibold text-white">{member.totalMessages}</div>
                      <div className="text-xs text-gray-400">Messages</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-white">{member.engagementScore}</div>
                      <div className="text-xs text-gray-400">Score</div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${getActivityLevelBg(member.activityLevel)} ${getActivityLevelColor(member.activityLevel)}`}>
                      {member.activityLevel.toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Token Flow Tab */}
      {viewMode === 'tokens' && (
        <div className="space-y-6">
          {/* Token Flow Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Total Inflow</div>
              <div className="text-2xl font-bold text-green-400">$45.2K</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Total Outflow</div>
              <div className="text-2xl font-bold text-red-400">$32.8K</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Net Flow</div>
              <div className="text-2xl font-bold text-white">$12.4K</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Transactions</div>
              <div className="text-2xl font-bold text-white">1,247</div>
            </div>
          </div>

          {/* Token Flow Chart Placeholder */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Token Flow Trend</h3>
            <div className="h-64 bg-gray-700 rounded flex items-center justify-center">
              <div className="text-gray-400">Token flow chart visualization would go here</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedAnalyticsDashboard;