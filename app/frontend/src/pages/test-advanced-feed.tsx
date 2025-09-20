import React, { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { EnhancedFeedView } from '../components/Feed';
import { FeedSortType } from '../types/feed';

const TestAdvancedFeedPage: NextPage = () => {
  const [selectedCommunity, setSelectedCommunity] = useState<string>('');
  const [showMetrics, setShowMetrics] = useState(false);

  const mockCommunities = [
    { id: 'defi-community', name: 'DeFi Community' },
    { id: 'nft-collectors', name: 'NFT Collectors' },
    { id: 'dao-governance', name: 'DAO Governance' },
    { id: 'web3-builders', name: 'Web3 Builders' }
  ];

  return (
    <>
      <Head>
        <title>Advanced Feed Features Test - Web3 Social Platform</title>
        <meta name="description" content="Test page for advanced feed features including sorting, infinite scroll, and engagement metrics" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Advanced Feed Features Test
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This page demonstrates the advanced feed features including dynamic sorting, 
              infinite scroll, trending content detection, and community engagement metrics.
            </p>

            {/* Controls */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Feed Controls
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Community Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Community Filter
                  </label>
                  <select
                    value={selectedCommunity}
                    onChange={(e) => setSelectedCommunity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">All Communities</option>
                    {mockCommunities.map((community) => (
                      <option key={community.id} value={community.id}>
                        {community.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Show Metrics Toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Community Metrics
                  </label>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="showMetrics"
                      checked={showMetrics}
                      onChange={(e) => setShowMetrics(e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="showMetrics" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Show engagement metrics
                    </label>
                  </div>
                </div>

                {/* Info */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Features Included
                  </label>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <div>✅ Dynamic sorting (Hot, New, Top, Rising)</div>
                    <div>✅ Infinite scroll with smooth loading</div>
                    <div>✅ "Liked by" modal system</div>
                    <div>✅ Trending content detection</div>
                    <div>✅ User preference persistence</div>
                    <div>✅ Community engagement metrics</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Feed */}
          <EnhancedFeedView
            communityId={selectedCommunity || undefined}
            showCommunityMetrics={showMetrics && !!selectedCommunity}
            className="max-w-4xl mx-auto"
          />

          {/* Feature Explanations */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            <FeatureCard
              title="Dynamic Sorting"
              description="Switch between Hot, New, Top, and Rising without page reloads. Your preferences are automatically saved."
              icon="🔥"
              features={[
                'Real-time sorting updates',
                'Persistent user preferences',
                'Time range filtering',
                'Smooth transitions'
              ]}
            />

            <FeatureCard
              title="Infinite Scroll"
              description="Smooth infinite scrolling replaces pagination for better UX. Includes loading states and error handling."
              icon="📜"
              features={[
                'Smooth infinite loading',
                'Configurable load threshold',
                'Error recovery',
                'Performance optimized'
              ]}
            />

            <FeatureCard
              title="Engagement Features"
              description="Rich engagement features including 'liked by' modals and social proof indicators."
              icon="❤️"
              features={[
                '"Liked by" modal system',
                'Token reaction tracking',
                'Tip activity display',
                'Social proof indicators'
              ]}
            />

            <FeatureCard
              title="Trending Detection"
              description="Advanced algorithms detect trending content and highlight it with visual indicators."
              icon="📈"
              features={[
                'Real-time trend analysis',
                'Viral content detection',
                'Rising post identification',
                'Engagement-based scoring'
              ]}
            />

            <FeatureCard
              title="Community Metrics"
              description="Comprehensive community engagement metrics and leaderboards for active communities."
              icon="📊"
              features={[
                'Engagement analytics',
                'Community leaderboards',
                'Trending topics',
                'Growth metrics'
              ]}
            />

            <FeatureCard
              title="User Preferences"
              description="All user preferences are automatically saved and synced across sessions."
              icon="⚙️"
              features={[
                'Persistent sorting preferences',
                'Display customization',
                'Auto-refresh settings',
                'Cross-device sync'
              ]}
            />
          </div>
        </div>
      </div>
    </>
  );
};

// Feature card component
interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
  features: string[];
}

function FeatureCard({ title, description, icon, features }: FeatureCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-3 mb-4">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
      </div>
      
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        {description}
      </p>
      
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
            <span className="text-green-500">✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TestAdvancedFeedPage;