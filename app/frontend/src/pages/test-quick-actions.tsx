import React, { useState } from 'react';
import RedditStylePostCard from '@/components/RedditStylePostCard/RedditStylePostCard';

// Mock data for testing
const mockPost = {
  id: 'test-post-1',
  contentCid: 'This is a test post to demonstrate quick action buttons. Hover over this post to see the quick actions appear on the right side!',
  author: '0x1234567890123456789012345678901234567890',
  createdAt: new Date('2024-01-01T12:00:00Z'),
  upvotes: 15,
  downvotes: 3,
  comments: [
    { id: '1', content: 'Great post!', author: '0xuser1' },
    { id: '2', content: 'Thanks for sharing', author: '0xuser2' }
  ],
  tags: ['demo', 'quick-actions'],
  flair: 'discussion',
  mediaCids: [],
  isPinned: false,
  isLocked: false,
  communityId: 'test-community',
  parentId: null,
  depth: 0,
  sortOrder: 0,
  onchainRef: '0x1234567890abcdef'
};

const mockCommunity = {
  id: 'test-community',
  name: 'testcommunity',
  displayName: 'Test Community',
  description: 'A test community for demonstrating quick actions',
  rules: ['Be respectful', 'No spam'],
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

export default function TestQuickActions() {
  const [notifications, setNotifications] = useState<string[]>([]);

  const addNotification = (message: string) => {
    setNotifications(prev => [...prev, message]);
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 3000);
  };

  const handleVote = async (postId: string, direction: 'up' | 'down') => {
    addNotification(`Voted ${direction} on post ${postId}`);
  };

  const handleSave = async (postId: string) => {
    addNotification(`Saved post ${postId}`);
  };

  const handleHide = async (postId: string) => {
    addNotification(`Hidden post ${postId}`);
  };

  const handleReport = async (postId: string, reason: string, details?: string) => {
    addNotification(`Reported post ${postId} for: ${reason}${details ? ` - ${details}` : ''}`);
  };

  const handleShare = async (postId: string) => {
    addNotification(`Shared post ${postId}`);
  };

  const handleComment = (postId: string) => {
    addNotification(`Opened comments for post ${postId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Quick Actions Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This page demonstrates the quick action buttons functionality for Reddit-style post cards.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              How to test:
            </h2>
            <ul className="text-blue-800 dark:text-blue-200 space-y-1">
              <li>• <strong>Hover</strong> over the post content to reveal quick action buttons</li>
              <li>• <strong>Save button</strong>: Click to save/unsave with visual confirmation</li>
              <li>• <strong>Share button</strong>: Click to share the post</li>
              <li>• <strong>Hide button</strong>: Click to hide with undo option</li>
              <li>• <strong>Report button</strong>: Click to open report modal with predefined categories</li>
              <li>• <strong>Menu button</strong>: Click the three dots for accessibility dropdown</li>
            </ul>
          </div>
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="fixed top-4 right-4 space-y-2 z-50">
            {notifications.map((notification, index) => (
              <div
                key={index}
                className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in"
              >
                {notification}
              </div>
            ))}
          </div>
        )}

        {/* Post Card */}
        <div className="space-y-6">
          <RedditStylePostCard
            post={mockPost as any}
            community={mockCommunity}
            viewMode="card"
            showThumbnail={true}
            onVote={handleVote}
            onSave={handleSave}
            onHide={handleHide}
            onReport={handleReport}
            onShare={handleShare}
            onComment={handleComment}
            isPinned={false}
          />

          {/* Additional test post */}
          <RedditStylePostCard
            post={{
              ...mockPost,
              id: 'test-post-2',
              contentCid: 'Another test post to demonstrate multiple posts with quick actions. This one has different content but the same functionality.',
              upvotes: 8,
              downvotes: 1,
              isPinned: true,
              onchainRef: '0xabcdef1234567890'
            } as any}
            community={mockCommunity}
            viewMode="card"
            showThumbnail={true}
            onVote={handleVote}
            onSave={handleSave}
            onHide={handleHide}
            onReport={handleReport}
            onShare={handleShare}
            onComment={handleComment}
            isPinned={true}
          />
        </div>

        {/* Feature Summary */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions Features Implemented
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">✅ Hover-revealed Actions</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Quick action buttons appear when hovering over post content
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">✅ Save with Confirmation</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Save functionality with visual confirmation message
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">✅ Hide with Undo</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Hide functionality with 5-second undo option
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">✅ Report Modal</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Comprehensive report modal with predefined categories
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">✅ Share Functionality</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Share with native API fallback to clipboard
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">✅ Accessibility Menu</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Dropdown menu for keyboard/screen reader users
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}