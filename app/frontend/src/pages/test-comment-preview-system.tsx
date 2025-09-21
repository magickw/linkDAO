import React, { useState } from 'react';
import { NextPage } from 'next';
import CommentPreviewSystem from '@/components/Community/CommentPreviewSystem';

const TestCommentPreviewSystemPage: NextPage = () => {
  const [commentCount, setCommentCount] = useState(0);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);

  // Mock post data for testing
  const mockPosts = [
    {
      id: 'post-1',
      title: 'Understanding Web3 Social Networks',
      content: 'This is a comprehensive guide to understanding how Web3 social networks work and their benefits over traditional platforms.',
      author: '0x1234567890123456789012345678901234567890',
      createdAt: new Date('2024-01-15T10:00:00Z'),
      upvotes: 45,
      downvotes: 3
    },
    {
      id: 'post-2',
      title: 'DeFi Yield Farming Strategies',
      content: 'Exploring different yield farming strategies and their risk-reward profiles in the current DeFi landscape.',
      author: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      createdAt: new Date('2024-01-15T11:30:00Z'),
      upvotes: 32,
      downvotes: 1
    },
    {
      id: 'post-3',
      title: 'NFT Market Analysis',
      content: 'A deep dive into current NFT market trends and what to expect in the coming months.',
      author: '0x9876543210987654321098765432109876543210',
      createdAt: new Date('2024-01-15T12:15:00Z'),
      upvotes: 28,
      downvotes: 5
    }
  ];

  const handleCommentCountChange = (postId: string, count: number) => {
    console.log(`Post ${postId} now has ${count} comments`);
    setCommentCount(count);
  };

  const handlePostExpand = (postId: string) => {
    setExpandedPost(expandedPost === postId ? null : postId);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Comment Preview System Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This page demonstrates the CommentPreviewSystem component with various configurations and states.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Features Demonstrated:</h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Comment preview with 100-character truncation</li>
              <li>• Top comment highlighting</li>
              <li>• Expand/collapse functionality</li>
              <li>• Real-time comment count updates</li>
              <li>• Loading and error states</li>
              <li>• Responsive design</li>
            </ul>
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Comment Count
              </label>
              <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-900 dark:text-white">
                {commentCount} comments
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expanded Post
              </label>
              <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-900 dark:text-white">
                {expandedPost || 'None'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Actions
              </label>
              <button
                onClick={() => {
                  setExpandedPost(null);
                  setCommentCount(0);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors duration-200"
              >
                Reset State
              </button>
            </div>
          </div>
        </div>

        {/* Test Cases */}
        <div className="space-y-8">
          {/* Standard Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Standard Configuration
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Default settings with 100-character limit and 3 preview comments
              </p>
            </div>
            <div className="p-6">
              {/* Mock Post */}
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">U</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {mockPosts[0].title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      by {mockPosts[0].author.slice(0, 6)}...{mockPosts[0].author.slice(-4)} • 3h ago
                    </p>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {mockPosts[0].content}
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>↑ {mockPosts[0].upvotes}</span>
                  <span>↓ {mockPosts[0].downvotes}</span>
                </div>
              </div>

              <CommentPreviewSystem
                postId={mockPosts[0].id}
                postType="community"
                onCommentCountChange={(count) => handleCommentCountChange(mockPosts[0].id, count)}
                onExpand={() => handlePostExpand(mockPosts[0].id)}
              />
            </div>
          </div>

          {/* Custom Length Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Short Preview Length
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                50-character limit to demonstrate truncation
              </p>
            </div>
            <div className="p-6">
              {/* Mock Post */}
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">D</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {mockPosts[1].title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      by {mockPosts[1].author.slice(0, 6)}...{mockPosts[1].author.slice(-4)} • 2h ago
                    </p>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {mockPosts[1].content}
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>↑ {mockPosts[1].upvotes}</span>
                  <span>↓ {mockPosts[1].downvotes}</span>
                </div>
              </div>

              <CommentPreviewSystem
                postId={mockPosts[1].id}
                postType="community"
                maxPreviewLength={50}
                maxPreviewComments={2}
                onCommentCountChange={(count) => handleCommentCountChange(mockPosts[1].id, count)}
                onExpand={() => handlePostExpand(mockPosts[1].id)}
              />
            </div>
          </div>

          {/* No Expand Button Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Preview Only Mode
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                No expand button - preview only
              </p>
            </div>
            <div className="p-6">
              {/* Mock Post */}
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">N</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {mockPosts[2].title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      by {mockPosts[2].author.slice(0, 6)}...{mockPosts[2].author.slice(-4)} • 1h ago
                    </p>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {mockPosts[2].content}
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>↑ {mockPosts[2].upvotes}</span>
                  <span>↓ {mockPosts[2].downvotes}</span>
                </div>
              </div>

              <CommentPreviewSystem
                postId={mockPosts[2].id}
                postType="feed"
                showExpandButton={false}
                onCommentCountChange={(count) => handleCommentCountChange(mockPosts[2].id, count)}
              />
            </div>
          </div>

          {/* Error State Simulation */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Error State Simulation
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Simulates API error to test error handling
              </p>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">E</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Error Test Post
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      by 0xerror...test • 30m ago
                    </p>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  This post will trigger an error when trying to load comments to test error handling.
                </p>
              </div>

              <CommentPreviewSystem
                postId="error-post"
                postType="community"
                onCommentCountChange={(count) => handleCommentCountChange('error-post', count)}
              />
            </div>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-12 bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Usage Instructions
          </h2>
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              The CommentPreviewSystem component provides a Reddit-style comment preview with the following features:
            </p>
            <ul className="text-gray-700 dark:text-gray-300 space-y-2">
              <li><strong>Comment Truncation:</strong> Long comments are truncated at the specified character limit (default 100) with ellipsis</li>
              <li><strong>Top Comment Highlighting:</strong> The highest-voted comment is marked as "Top comment"</li>
              <li><strong>Expand/Collapse:</strong> Users can expand to see the full comment system or collapse back to preview</li>
              <li><strong>Real-time Updates:</strong> Comment counts update when new comments are added</li>
              <li><strong>Error Handling:</strong> Graceful error states with retry functionality</li>
              <li><strong>Responsive Design:</strong> Works on all screen sizes</li>
            </ul>
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Requirements Fulfilled:</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>✅ 13.1: Comment preview display with top comment snippets</li>
                <li>✅ 13.2: 100-character limit with ellipsis for previews</li>
                <li>✅ 13.3: Expand/collapse functionality for full comment threads</li>
                <li>✅ 13.4: Comprehensive test suite with error handling</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestCommentPreviewSystemPage;