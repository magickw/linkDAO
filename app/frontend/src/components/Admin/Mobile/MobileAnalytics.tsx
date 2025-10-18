import React, { useState } from 'react';
import { BarChart3, TrendingUp, Users, Activity, Calendar } from 'lucide-react';

export const MobileAnalytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7d');

  const timeRanges = [
    { id: '24h', label: '24h' },
    { id: '7d', label: '7d' },
    { id: '30d', label: '30d' },
    { id: '90d', label: '90d' }
  ];

  // Mock analytics data
  const analytics = {
    totalUsers: 12543,
    activeUsers: 8921,
    newUsers: 234,
    engagement: 78.5,
    growth: 12.3
  };

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex space-x-2">
        {timeRanges.map((range) => (
          <button
            key={range.id}
            onClick={() => setTimeRange(range.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              timeRange === range.id
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span className="text-white/70 text-sm">Total Users</span>
          </div>
          <p className="text-2xl font-bold text-white">{analytics.totalUsers.toLocaleString()}</p>
          <p className="text-green-400 text-sm">+{analytics.growth}% vs last period</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="w-5 h-5 text-green-400" />
            <span className="text-white/70 text-sm">Active Users</span>
          </div>
          <p className="text-2xl font-bold text-white">{analytics.activeUsers.toLocaleString()}</p>
          <p className="text-white/50 text-sm">{((analytics.activeUsers / analytics.totalUsers) * 100).toFixed(1)}% of total</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <span className="text-white/70 text-sm">New Users</span>
          </div>
          <p className="text-2xl font-bold text-white">{analytics.newUsers}</p>
          <p className="text-white/50 text-sm">Last {timeRange}</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <BarChart3 className="w-5 h-5 text-orange-400" />
            <span className="text-white/70 text-sm">Engagement</span>
          </div>
          <p className="text-2xl font-bold text-white">{analytics.engagement}%</p>
          <p className="text-white/50 text-sm">Average session</p>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
        <h3 className="text-white font-medium mb-4">User Activity Trend</h3>
        <div className="h-48 bg-white/5 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-white/30 mx-auto mb-2" />
            <p className="text-white/50 text-sm">Chart visualization coming soon</p>
          </div>
        </div>
      </div>

      {/* Top Content */}
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
        <h3 className="text-white font-medium mb-4">Top Performing Content</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <p className="text-white text-sm">Sample Post Title #{item}</p>
                <p className="text-white/50 text-xs">1.2k views • 89 interactions</p>
              </div>
              <div className="text-right">
                <p className="text-green-400 text-sm font-medium">+15%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};