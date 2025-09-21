import React, { useState } from 'react';
import { RelatedCommunitiesWidget } from '../components/Community/RelatedCommunitiesWidget';
import { Community } from '../models/Community';

/**
 * Test page for RelatedCommunitiesWidget component
 * Demonstrates the widget functionality with mock data
 */
const TestRelatedCommunitiesWidget: React.FC = () => {
  const [joinedCommunities, setJoinedCommunities] = useState<Set<string>>(new Set());

  // Mock current community data
  const mockCurrentCommunity: Community = {
    id: 'current-community',
    name: 'tech-innovators',
    displayName: 'Tech Innovators',
    description: 'A community focused on technology innovation, programming, and emerging tech trends. We discuss everything from AI and blockchain to web development and mobile apps.',
    rules: [
      'Be respectful and constructive',
      'Stay on topic - tech and innovation only',
      'No spam or self-promotion without permission',
      'Use proper formatting for code snippets'
    ],
    memberCount: 15420,
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2024-01-15'),
    avatar: undefined,
    banner: undefined,
    category: 'technology',
    tags: ['tech', 'innovation', 'programming', 'ai', 'blockchain'],
    isPublic: true,
    moderators: ['mod1', 'mod2'],
    treasuryAddress: '0x1234567890123456789012345678901234567890',
    governanceToken: 'TECH',
    settings: {
      allowedPostTypes: [
        { id: '1', name: 'Discussion', description: 'General discussions', enabled: true },
        { id: '2', name: 'Question', description: 'Ask questions', enabled: true },
        { id: '3', name: 'Tutorial', description: 'Share tutorials', enabled: true }
      ],
      requireApproval: false,
      minimumReputation: 0,
      stakingRequirements: []
    }
  };

  // Mock join community function
  const handleJoinCommunity = async (communityId: string): Promise<void> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate random success/failure for testing
    if (Math.random() > 0.1) { // 90% success rate
      setJoinedCommunities(prev => new Set(prev).add(communityId));
      console.log(`Successfully joined community: ${communityId}`);
    } else {
      throw new Error('Failed to join community - please try again');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Related Communities Widget Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Testing the RelatedCommunitiesWidget component with recommendation algorithm,
            join functionality, and fallback to popular communities.
          </p>
        </div>

        {/* Current Community Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Current Community Context
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                {mockCurrentCommunity.displayName}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {mockCurrentCommunity.description}
              </p>
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <span>{mockCurrentCommunity.memberCount.toLocaleString()} members</span>
                <span className="capitalize">{mockCurrentCommunity.category}</span>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {mockCurrentCommunity.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Widget Demo */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Main Content Area
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                This represents the main content area of a community page. The RelatedCommunitiesWidget
                would typically appear in the right sidebar.
              </p>
              <div className="space-y-4">
                <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500 dark:text-gray-400">Post Content</span>
                </div>
                <div className="h-24 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500 dark:text-gray-400">Post Content</span>
                </div>
                <div className="h-40 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500 dark:text-gray-400">Post Content</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar with RelatedCommunitiesWidget */}
          <div className="space-y-6">
            <RelatedCommunitiesWidget
              currentCommunity={mockCurrentCommunity}
              onJoinCommunity={handleJoinCommunity}
            />

            {/* Additional sidebar widgets for context */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Other Sidebar Widgets
              </h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div>• About Community</div>
                <div>• Community Stats</div>
                <div>• Moderator List</div>
                <div>• Governance Widget</div>
              </div>
            </div>
          </div>
        </div>

        {/* Testing Information */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
            Testing Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Recommendation Algorithm
              </h3>
              <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                <li>• Shared tags (40% weight)</li>
                <li>• Same category (30% weight)</li>
                <li>• Member count similarity (20% weight)</li>
                <li>• Description similarity (10% weight)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Fallback Behavior
              </h3>
              <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                <li>• Shows popular communities when no matches</li>
                <li>• Handles API errors gracefully</li>
                <li>• Provides retry functionality</li>
                <li>• Loading states and skeletons</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Join Status */}
        {joinedCommunities.size > 0 && (
          <div className="mt-6 bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">
              Joined Communities
            </h3>
            <div className="text-sm text-green-800 dark:text-green-200">
              {Array.from(joinedCommunities).join(', ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestRelatedCommunitiesWidget;