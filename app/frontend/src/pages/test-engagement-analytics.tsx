import React, { useState } from 'react';
import Head from 'next/head';
import { EngagementAnalyticsDashboard } from '../components/EngagementAnalytics';
import EnhancedSocialProofIndicator from '../components/SocialProof/EnhancedSocialProofIndicator';
import { useEngagementTracking, usePostEngagementTracking } from '../hooks/useEngagementTracking';

export default function TestEngagementAnalytics() {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('week');
  const [testPostId] = useState<string>('test-post-123');
  
  const { trackInteraction, getQueueSize, flushQueue } = useEngagementTracking();
  const { handleReaction, handleComment, handleShare, handleTip } = usePostEngagementTracking(testPostId);

  const handleTestInteraction = (type: string) => {
    switch (type) {
      case 'reaction':
        handleReaction('🔥', 5);
        break;
      case 'comment':
        handleComment('test-comment-123');
        break;
      case 'share':
        handleShare('twitter');
        break;
      case 'tip':
        handleTip(10, 'USDC', 'Great content!');
        break;
    }
  };

  return (
    <>
      <Head>
        <title>Engagement Analytics Test - LinkDAO</title>
        <meta name="description" content="Test page for engagement analytics and social proof features" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Engagement Analytics Test
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Test and demonstrate social proof and engagement analytics features
            </p>
          </div>

          {/* Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Test Controls
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* User ID Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  User ID (optional)
                </label>
                <input
                  type="text"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  placeholder="Enter user ID for specific analytics"
                  className="
                    w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                    focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                  "
                />
              </div>

              {/* Time Range Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Time Range
                </label>
                <select
                  value={selectedTimeRange}
                  onChange={(e) => setSelectedTimeRange(e.target.value)}
                  className="
                    w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                    focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                  "
                >
                  <option value="day">Last 24 Hours</option>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="quarter">Last Quarter</option>
                </select>
              </div>

              {/* Queue Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tracking Queue
                </label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {getQueueSize()} interactions queued
                  </span>
                  <button
                    onClick={flushQueue}
                    className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors duration-200"
                  >
                    Flush
                  </button>
                </div>
              </div>
            </div>

            {/* Test Interaction Buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Test Interactions
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleTestInteraction('reaction')}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors duration-200"
                >
                  🔥 Test Reaction
                </button>
                <button
                  onClick={() => handleTestInteraction('comment')}
                  className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors duration-200"
                >
                  💬 Test Comment
                </button>
                <button
                  onClick={() => handleTestInteraction('share')}
                  className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors duration-200"
                >
                  🔄 Test Share
                </button>
                <button
                  onClick={() => handleTestInteraction('tip')}
                  className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-lg transition-colors duration-200"
                >
                  💰 Test Tip
                </button>
              </div>
            </div>
          </div>

          {/* Social Proof Indicator Demo */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Enhanced Social Proof Indicator
            </h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="mb-3">
                  <h3 className="font-medium text-gray-900 dark:text-white">Sample Post</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    This is a sample post to demonstrate social proof indicators with different user types engaging.
                  </p>
                </div>
                
                <EnhancedSocialProofIndicator
                  postId={testPostId}
                  maxAvatars={5}
                  showModal={true}
                  showEngagementTypes={true}
                  prioritizeInfluencers={true}
                />
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="mb-3">
                  <h3 className="font-medium text-gray-900 dark:text-white">Compact Version</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Compact social proof indicator with fewer avatars and no engagement types.
                  </p>
                </div>
                
                <EnhancedSocialProofIndicator
                  postId={testPostId}
                  maxAvatars={3}
                  showModal={true}
                  showEngagementTypes={false}
                  prioritizeInfluencers={false}
                />
              </div>
            </div>
          </div>

          {/* Analytics Dashboard */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Engagement Analytics Dashboard
            </h2>
            
            <EngagementAnalyticsDashboard
              userId={selectedUserId || undefined}
              timeRange={selectedTimeRange}
            />
          </div>

          {/* Feature Documentation */}
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
              📋 Features Implemented
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                  ✅ Social Proof Indicators
                </h3>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• "Liked by" style indicators showing follower engagement</li>
                  <li>• Verified user engagement highlighting</li>
                  <li>• Community leader engagement indicators</li>
                  <li>• Prioritized display of influential users</li>
                  <li>• Interactive modal with detailed engagement breakdown</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                  ✅ Engagement Analytics
                </h3>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Comprehensive engagement tracking system</li>
                  <li>• Real-time interaction monitoring</li>
                  <li>• Social proof impact metrics</li>
                  <li>• Content creator analytics dashboard</li>
                  <li>• Audience insights and breakdown</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-100 dark:bg-blue-800/30 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                🔧 Technical Implementation
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Automatic engagement tracking with offline queue support</li>
                <li>• Batched API requests for performance optimization</li>
                <li>• Real-time social proof score calculation</li>
                <li>• User type detection (verified, community leader, follower)</li>
                <li>• Responsive design with dark mode support</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}