/**
 * Test Token Reactions Page
 * Demo page for testing the TokenReactionSystem component
 */

import React, { useState } from 'react';
import Head from 'next/head';
import { TokenReactionSystem } from '../components/TokenReactionSystem';
import { ReactionSummary, ReactionType } from '../types/tokenReaction';

const TestTokenReactionsPage: React.FC = () => {
  const [selectedPost, setSelectedPost] = useState<string>('post-1');

  // Mock data for testing
  const mockPosts = [
    {
      id: 'post-1',
      title: 'Amazing DeFi Protocol Launch 🚀',
      content: 'Just launched our new DeFi protocol with revolutionary yield farming mechanisms!',
      author: 'defi_builder.eth',
      timestamp: '2 hours ago',
    },
    {
      id: 'post-2',
      title: 'NFT Collection Drop Tomorrow 💎',
      content: 'Get ready for the most anticipated NFT drop of the year. Diamond hands only!',
      author: 'nft_creator.eth',
      timestamp: '4 hours ago',
    },
    {
      id: 'post-3',
      title: 'Market Analysis: Bull Run Incoming? 🔥',
      content: 'Technical analysis suggests we might be entering a new bull market phase...',
      author: 'crypto_analyst.eth',
      timestamp: '6 hours ago',
    },
  ];

  // Mock initial reactions for demonstration
  const mockReactions: Record<string, ReactionSummary[]> = {
    'post-1': [
      {
        type: '🚀' as ReactionType,
        totalAmount: 150,
        totalCount: 25,
        userAmount: 10,
        topContributors: [
          {
            userId: 'user-1',
            walletAddress: '0x1234...5678',
            handle: 'whale_investor',
            amount: 50,
          },
          {
            userId: 'user-2',
            walletAddress: '0x2345...6789',
            handle: 'defi_lover',
            amount: 25,
          },
        ],
        milestones: [
          {
            threshold: 100,
            reached: true,
            reachedAt: new Date(),
            reward: 10,
            description: 'First milestone reached!'
          },
          {
            threshold: 200,
            reached: false,
            reward: 25,
            description: 'Next milestone'
          }
        ]
      },
      {
        type: '🔥' as ReactionType,
        totalAmount: 75,
        totalCount: 45,
        userAmount: 5,
        topContributors: [
          {
            userId: 'user-3',
            walletAddress: '0x3456...7890',
            handle: 'early_adopter',
            amount: 20,
          },
        ],
        milestones: []
      },
    ],
    'post-2': [
      {
        type: '💎' as ReactionType,
        totalAmount: 200,
        totalCount: 15,
        userAmount: 0,
        topContributors: [
          {
            userId: 'user-4',
            walletAddress: '0x4567...8901',
            handle: 'diamond_hands',
            amount: 100,
          },
        ],
        milestones: []
      },
    ],
    'post-3': [
      {
        type: '🔥' as ReactionType,
        totalAmount: 300,
        totalCount: 60,
        userAmount: 15,
        topContributors: [
          {
            userId: 'user-5',
            walletAddress: '0x5678...9012',
            handle: 'bull_market_believer',
            amount: 75,
          },
        ],
        milestones: []
      },
      {
        type: '🚀' as ReactionType,
        totalAmount: 120,
        totalCount: 20,
        userAmount: 0,
        topContributors: [],
        milestones: []
      },
    ],
  };

  const handleReaction = async (postId: string, reactionType: ReactionType, amount: number) => {
    console.log('Reaction created:', { postId, reactionType, amount });
    // In a real app, this would make an API call
    return Promise.resolve();
  };

  const handleViewReactors = (postId: string, reactionType?: ReactionType) => {
    console.log('View reactors:', { postId, reactionType });
  };

  const selectedPostData = mockPosts.find(p => p.id === selectedPost);
  const selectedPostReactions = mockReactions[selectedPost] || [];

  return (
    <>
      <Head>
        <title>Test Token Reactions | Social Dashboard</title>
        <meta name="description" content="Test page for token-based reaction system" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Token Reaction System Test
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Test the token-based reaction system with 🔥🚀💎 reaction types
            </p>
          </div>

          {/* Post Selector */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select a post to test reactions:
            </label>
            <select
              value={selectedPost}
              onChange={(e) => setSelectedPost(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            >
              {mockPosts.map(post => (
                <option key={post.id} value={post.id}>
                  {post.title}
                </option>
              ))}
            </select>
          </div>

          {/* Mock Post Display */}
          {selectedPostData && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
              <div className="flex items-start space-x-4">
                {/* Author Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white font-semibold">
                  {selectedPostData.author[0].toUpperCase()}
                </div>

                {/* Post Content */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {selectedPostData.author}
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedPostData.timestamp}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    {selectedPostData.title}
                  </h2>

                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    {selectedPostData.content}
                  </p>

                  {/* Token Reaction System */}
                  <TokenReactionSystem
                    postId={selectedPost}
                    initialReactions={selectedPostReactions}
                    onReaction={handleReaction}
                    onViewReactors={handleViewReactors}
                    showAnalytics={true}
                    className="mt-4"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
              How to Test Token Reactions
            </h3>
            <div className="space-y-2 text-blue-800 dark:text-blue-200">
              <p>• Click on reaction buttons to open the staking modal</p>
              <p>• Try different reaction types: 🔥 (1 token min), 🚀 (2 tokens min), 💎 (5 tokens min)</p>
              <p>• Use preset amounts or enter custom amounts</p>
              <p>• Watch for celebration animations on milestones</p>
              <p>• Click "View all" to see the reactor modal</p>
              <p>• Switch between different posts to see various reaction states</p>
            </div>
          </div>

          {/* Feature Overview */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <div className="text-3xl mb-3">🔥</div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Fire Reactions</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Minimum 1 token • 1.5x multiplier • Shows content is hot and trending
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <div className="text-3xl mb-3">🚀</div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Rocket Reactions</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Minimum 2 tokens • 2.0x multiplier • Boost content to the moon
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <div className="text-3xl mb-3">💎</div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Diamond Reactions</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Minimum 5 tokens • 3.0x multiplier • Mark as diamond hands quality
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TestTokenReactionsPage;