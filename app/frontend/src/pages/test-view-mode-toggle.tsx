import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ViewModeToggle, ViewModeToggleIcon, ViewModeDropdown } from '@/components/Community';
import { RedditStylePostCard } from '@/components/RedditStylePostCard';
import { useViewMode, ViewMode } from '@/hooks/useViewMode';

// Mock data for testing
const mockCommunity = {
  id: 'test-community',
  name: 'testcommunity',
  displayName: 'Test Community',
  description: 'A community for testing view modes',
  rules: ['Be respectful', 'Stay on topic'],
  memberCount: 1234,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  category: 'General',
  tags: ['test', 'demo'],
  isPublic: true,
  moderators: ['0x1234567890123456789012345678901234567890'],
  settings: {
    allowedPostTypes: [],
    requireApproval: false,
    minimumReputation: 0,
    stakingRequirements: []
  }
};

const mockPosts = [
  {
    id: '1',
    contentCid: 'This is a test post with some content to demonstrate the card view mode. It has enough text to show how the layout works.',
    author: '0x1234...5678',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    upvotes: 42,
    downvotes: 3,
    comments: [
      { id: 'c1', content: 'Great post!', author: '0xabcd...efgh' },
      { id: 'c2', content: 'Thanks for sharing', author: '0x9876...5432' }
    ],
    mediaCids: ['https://picsum.photos/400/300?random=1'],
    tags: ['test', 'demo'],
    flair: 'discussion',
    isPinned: false,
    isLocked: false,
    communityId: 'test-community',
    parentId: null,
    depth: 0,
    sortOrder: 0,
    onchainRef: '0x1111111111111111'
  },
  {
    id: '2',
    contentCid: 'Another test post to show how multiple posts look in different view modes.',
    author: '0xabcd...efgh',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    upvotes: 18,
    downvotes: 1,
    comments: [
      { id: 'c3', content: 'Interesting perspective', author: '0x1234...5678' }
    ],
    mediaCids: ['https://picsum.photos/400/300?random=2'],
    tags: ['example'],
    flair: 'guide',
    isPinned: true,
    isLocked: false,
    communityId: 'test-community',
    parentId: null,
    depth: 0,
    sortOrder: 1,
    onchainRef: '0x2222222222222222'
  },
  {
    id: '3',
    contentCid: 'A shorter post without media to test different content types.',
    author: '0x9876...5432',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    upvotes: 7,
    downvotes: 0,
    comments: [],
    mediaCids: [],
    tags: ['short'],
    flair: 'question',
    isPinned: false,
    isLocked: true,
    communityId: 'test-community',
    parentId: null,
    depth: 0,
    sortOrder: 2,
    onchainRef: '0x3333333333333333'
  }
];

export default function TestViewModeToggle() {
  const { viewMode } = useViewMode();
  const [selectedToggleType, setSelectedToggleType] = useState<'default' | 'icon' | 'dropdown'>('default');

  const handleVote = async (postId: string, direction: 'up' | 'down') => {
    console.log(`Voting ${direction} on post ${postId}`);
    // Mock vote implementation
  };

  const handleSave = async (postId: string) => {
    console.log(`Saving post ${postId}`);
  };

  const handleHide = async (postId: string) => {
    console.log(`Hiding post ${postId}`);
  };

  const handleReport = async (postId: string, reason: string, details?: string) => {
    console.log(`Reporting post ${postId} for ${reason}:`, details);
  };

  const handleShare = async (postId: string) => {
    console.log(`Sharing post ${postId}`);
  };

  const handleComment = (postId: string) => {
    console.log(`Opening comments for post ${postId}`);
  };

  const handleViewModeChange = (newViewMode: ViewMode) => {
    console.log(`View mode changed to: ${newViewMode}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                View Mode Toggle Test
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Test the Reddit-style view mode toggle functionality
              </p>
            </div>

            {/* Toggle Type Selector */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Toggle Type:
                </label>
                <select
                  value={selectedToggleType}
                  onChange={(e) => setSelectedToggleType(e.target.value as any)}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm"
                >
                  <option value="default">Default</option>
                  <option value="icon">Icon Only</option>
                  <option value="dropdown">Dropdown</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2">
                {selectedToggleType === 'default' && (
                  <ViewModeToggle 
                    onViewModeChange={handleViewModeChange}
                    showLabels={false}
                  />
                )}
                {selectedToggleType === 'icon' && (
                  <ViewModeToggleIcon onViewModeChange={handleViewModeChange} />
                )}
                {selectedToggleType === 'dropdown' && (
                  <ViewModeDropdown onViewModeChange={handleViewModeChange} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                View Mode Info
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Current Mode:</span>
                  <span className="font-medium text-gray-900 dark:text-white capitalize">
                    {viewMode}
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                  <p className="mb-2">
                    <strong>Card View:</strong> Full post cards with thumbnails and expanded content
                  </p>
                  <p>
                    <strong>Compact View:</strong> Condensed list view with minimal spacing
                  </p>
                </div>
              </div>
            </div>

            {/* Toggle Variants */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mt-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Toggle Variants
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                    Default (Small)
                  </label>
                  <ViewModeToggle size="sm" onViewModeChange={handleViewModeChange} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                    Default (Medium)
                  </label>
                  <ViewModeToggle size="md" onViewModeChange={handleViewModeChange} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                    With Labels
                  </label>
                  <ViewModeToggle 
                    size="md" 
                    showLabels={true} 
                    onViewModeChange={handleViewModeChange} 
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                    Icon Only
                  </label>
                  <ViewModeToggleIcon onViewModeChange={handleViewModeChange} />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                r/{mockCommunity.displayName}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {mockCommunity.memberCount.toLocaleString()} members • Currently viewing in{' '}
                <span className="font-medium capitalize">{viewMode}</span> mode
              </p>
            </div>

            {/* Posts */}
            <div className={viewMode === 'compact' ? 'space-y-0' : 'space-y-4'}>
              {mockPosts.map((post) => (
                <motion.div
                  key={post.id}
                  layout
                  transition={{ duration: 0.2 }}
                >
                  <RedditStylePostCard
                    post={post as any}
                    community={mockCommunity}
                    viewMode={viewMode}
                    showThumbnail={true}
                    onVote={handleVote}
                    onSave={handleSave}
                    onHide={handleHide}
                    onReport={handleReport}
                    onShare={handleShare}
                    onComment={handleComment}
                    isPinned={post.isPinned}
                  />
                </motion.div>
              ))}
            </div>

            {/* Load More Button */}
            <div className="mt-6 text-center">
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Load More Posts
              </button>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                About Community
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {mockCommunity.description}
              </p>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Members:</span>
                  <span className="font-medium">{mockCommunity.memberCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Online:</span>
                  <span className="font-medium text-green-600">42</span>
                </div>
              </div>
            </div>

            {/* View Mode Controls */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mt-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                View Controls
              </h3>
              <div className="space-y-3">
                <ViewModeDropdown onViewModeChange={handleViewModeChange} />
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Preference is automatically saved to localStorage
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}