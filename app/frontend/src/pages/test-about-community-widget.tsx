import React, { useState } from 'react';
import { AboutCommunityWidget } from '../components/Community/AboutCommunityWidget';
import { Community } from '../models/Community';
import { CommunityStats, CommunityRule } from '../types/community';

const TestAboutCommunityWidget: React.FC = () => {
  const [canEdit, setCanEdit] = useState(false);

  const mockCommunity: Community = {
    id: '1',
    name: 'web3-developers',
    displayName: 'Web3 Developers',
    description: 'A vibrant community for Web3 developers, blockchain enthusiasts, and DeFi builders. Share knowledge, collaborate on projects, and stay updated with the latest in decentralized technology.',
    rules: ['Be respectful', 'No spam'],
    memberCount: 12500,
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2023-03-20'),
    avatar: 'https://example.com/avatar.jpg',
    banner: 'https://example.com/banner.jpg',
    category: 'technology',
    tags: ['web3', 'blockchain', 'defi', 'smart-contracts', 'ethereum', 'solidity'],
    isPublic: true,
    moderators: ['mod1', 'mod2'],
    treasuryAddress: '0x123...',
    governanceToken: 'WEB3',
    settings: {
      allowedPostTypes: [],
      requireApproval: false,
      minimumReputation: 0,
      stakingRequirements: []
    }
  };

  const mockStats: CommunityStats = {
    memberCount: 12500,
    onlineCount: 234,
    postsThisWeek: 89,
    activeDiscussions: 23,
    growthRate: 8.5,
    createdAt: new Date('2023-01-15')
  };

  const mockRules: CommunityRule[] = [
    {
      id: '1',
      title: 'Be Respectful and Professional',
      description: 'Treat all community members with respect and maintain professional discourse. Personal attacks, harassment, or discriminatory language will not be tolerated.',
      order: 1
    },
    {
      id: '2',
      title: 'No Spam or Self-Promotion',
      description: 'Avoid posting repetitive content, excessive self-promotion, or unrelated promotional material. Share valuable content that benefits the community.',
      order: 2
    },
    {
      id: '3',
      title: 'Stay On Topic',
      description: 'Keep discussions relevant to Web3 development, blockchain technology, and related topics. Off-topic posts may be removed or moved to appropriate channels.',
      order: 3
    },
    {
      id: '4',
      title: 'Use Proper Formatting',
      description: 'When sharing code, use proper formatting and include relevant context. This helps others understand and provide better assistance.',
      order: 4
    },
    {
      id: '5',
      title: 'Search Before Posting',
      description: 'Before asking questions, search existing posts to avoid duplicates. This helps keep the community organized and efficient.',
      order: 5
    }
  ];

  const handleEdit = () => {
    alert('Edit functionality would open a modal or navigate to edit page');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            About Community Widget Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This page demonstrates the AboutCommunityWidget component with various features:
          </p>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1 mb-6">
            <li>Community description and metadata</li>
            <li>Member count formatting (12.5K display)</li>
            <li>Expandable/collapsible rules section</li>
            <li>Tag display with truncation</li>
            <li>Edit functionality for moderators</li>
            <li>Dark mode support</li>
            <li>Responsive design</li>
          </ul>
          
          <div className="flex items-center gap-4 mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={canEdit}
                onChange={(e) => setCanEdit(e.target.checked)}
                className="mr-2"
              />
              <span className="text-gray-700 dark:text-gray-300">
                Enable edit mode (shows edit button)
              </span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content area */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Main Content Area
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                This would typically contain the community posts, discussions, and other main content.
                The About Community widget is displayed in the sidebar to the right.
              </p>
            </div>
          </div>

          {/* Sidebar with About Community Widget */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              <AboutCommunityWidget
                community={mockCommunity}
                stats={mockStats}
                rules={mockRules}
                canEdit={canEdit}
                onEdit={handleEdit}
              />
              
              {/* Additional sidebar widgets would go here */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Other Widgets
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Additional sidebar widgets like trending posts, moderator list, 
                  or related communities would be placed here.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Test different scenarios */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Different Scenarios
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Small community */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Small Community (No Rules)
              </h3>
              <AboutCommunityWidget
                community={{
                  ...mockCommunity,
                  displayName: 'Small Community',
                  description: 'A small but growing community.',
                  tags: ['small', 'growing']
                }}
                stats={{
                  ...mockStats,
                  memberCount: 42,
                  onlineCount: 3,
                  postsThisWeek: 2,
                  activeDiscussions: 1
                }}
                rules={[]}
                canEdit={false}
              />
            </div>

            {/* Large community */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Large Community (1.5M members)
              </h3>
              <AboutCommunityWidget
                community={{
                  ...mockCommunity,
                  displayName: 'Massive Community',
                  description: 'One of the largest Web3 communities with millions of active members.',
                  tags: ['popular', 'active', 'large']
                }}
                stats={{
                  ...mockStats,
                  memberCount: 1500000,
                  onlineCount: 15000,
                  postsThisWeek: 2500,
                  activeDiscussions: 450
                }}
                rules={mockRules.slice(0, 2)}
                canEdit={true}
                onEdit={handleEdit}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestAboutCommunityWidget;