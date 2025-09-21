import React, { useState, useCallback } from 'react';
import { CommunityStatsWidget } from '../components/Community/CommunityStatsWidget';
import { Community, CommunityStats } from '../types/community';

const TestCommunityStatsWidget: React.FC = () => {
  const [stats, setStats] = useState<CommunityStats | undefined>({
    memberCount: 15420,
    onlineCount: 1234,
    postsThisWeek: 89,
    activeDiscussions: 23,
    growthRate: 8.5,
    createdAt: new Date('2023-01-01')
  });

  const [refreshCount, setRefreshCount] = useState(0);

  const mockCommunity: Community = {
    id: 'test-community',
    name: 'test-community',
    displayName: 'Test Community',
    description: 'A vibrant community for testing and development',
    rules: [],
    memberCount: 15420,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2024-01-01'),
    category: 'technology',
    tags: ['test', 'development', 'community'],
    isPublic: true,
    moderators: [],
    settings: {
      allowedPostTypes: [],
      requireApproval: false,
      minimumReputation: 0,
      stakingRequirements: []
    }
  };

  const handleRefresh = useCallback(async () => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate random data updates
    const newStats: CommunityStats = {
      memberCount: stats?.memberCount ? stats.memberCount + Math.floor(Math.random() * 10) : 15420,
      onlineCount: Math.floor(Math.random() * 2000) + 500,
      postsThisWeek: Math.floor(Math.random() * 100) + 50,
      activeDiscussions: Math.floor(Math.random() * 30) + 10,
      growthRate: (Math.random() - 0.5) * 20, // -10% to +10%
      createdAt: new Date('2023-01-01')
    };
    
    setStats(newStats);
    setRefreshCount(prev => prev + 1);
  }, [stats]);

  const simulateError = useCallback(async () => {
    throw new Error('Simulated network error');
  }, []);

  const clearStats = useCallback(() => {
    setStats(undefined);
  }, []);

  const setLowActivityStats = useCallback(() => {
    setStats({
      memberCount: 500,
      onlineCount: 5,
      postsThisWeek: 2,
      activeDiscussions: 1,
      growthRate: -3.2,
      createdAt: new Date('2023-01-01')
    });
  }, []);

  const setHighActivityStats = useCallback(() => {
    setStats({
      memberCount: 10000,
      onlineCount: 1500,
      postsThisWeek: 250,
      activeDiscussions: 45,
      growthRate: 15.8,
      createdAt: new Date('2023-01-01')
    });
  }, []);

  const setLargeNumberStats = useCallback(() => {
    setStats({
      memberCount: 2500000,
      onlineCount: 125000,
      postsThisWeek: 5500,
      activeDiscussions: 890,
      growthRate: 2.3,
      createdAt: new Date('2023-01-01')
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Community Stats Widget Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test the CommunityStatsWidget component with various scenarios including real-time updates,
            error handling, and fallback states.
          </p>
        </div>

        {/* Control Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Test Controls
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={setHighActivityStats}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              High Activity
            </button>
            <button
              onClick={setLowActivityStats}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
            >
              Low Activity
            </button>
            <button
              onClick={setLargeNumberStats}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Large Numbers
            </button>
            <button
              onClick={clearStats}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              Clear Stats
            </button>
          </div>
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Refresh count: {refreshCount}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Normal Widget with Auto-refresh */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              With Auto-refresh (30s)
            </h2>
            <CommunityStatsWidget
              community={mockCommunity}
              stats={stats}
              onRefresh={handleRefresh}
              refreshInterval={30000}
            />
          </div>

          {/* Widget with Error Simulation */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              With Error Simulation
            </h2>
            <CommunityStatsWidget
              community={mockCommunity}
              stats={stats}
              onRefresh={simulateError}
            />
          </div>

          {/* Widget without Refresh */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Read-only (No Refresh)
            </h2>
            <CommunityStatsWidget
              community={mockCommunity}
              stats={stats}
            />
          </div>

          {/* Widget with Fast Refresh for Testing */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Fast Refresh (5s)
            </h2>
            <CommunityStatsWidget
              community={mockCommunity}
              stats={stats}
              onRefresh={handleRefresh}
              refreshInterval={5000}
            />
          </div>
        </div>

        {/* Current Stats Display */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Current Stats Data
          </h2>
          <pre className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto">
            {JSON.stringify(stats, null, 2)}
          </pre>
        </div>

        {/* Feature Checklist */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Feature Checklist
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Real-time member count and online status display</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Weekly post count and activity metrics</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Fallback display for unavailable statistics</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Auto-refresh functionality with configurable intervals</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Error handling with retry functionality</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Activity level indicators based on online percentage</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Number formatting for large values</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✓</span>
              <span className="text-gray-700 dark:text-gray-300">Growth rate display with positive/negative indicators</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestCommunityStatsWidget;