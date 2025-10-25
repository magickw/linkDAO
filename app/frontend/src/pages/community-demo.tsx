import React, { useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { CommunityCardEnhanced } from '@/components/Community/CommunityCardEnhanced';
import CommunityPostCardEnhanced from '@/components/Community/CommunityPostCardEnhanced';
import { CommunityCardSkeleton, CommunityFeedSkeleton } from '@/components/Community/CommunityLoadingSkeletons';

// Mock data
const mockCommunity = {
  id: 'ethereum-builders',
  name: 'ethereum-builders',
  displayName: 'Ethereum Builders',
  description: 'Building the future of Ethereum ecosystem with innovative smart contracts and decentralized applications',
  memberCount: 12400,
  avatar: '🔷',
  banner: 'https://placehold.co/800x200/667eea/ffffff?text=Ethereum+Builders',
  category: 'Development',
  tags: ['ethereum', 'development', 'smart-contracts', 'web3'],
  isPublic: true,
  rules: ['Be respectful', 'No spam', 'Share quality content'],
  moderators: ['0x1234...5678'],
  treasuryAddress: '0x1234567890123456789012345678901234567890',
  governanceToken: 'ETH-BUILD',
  createdAt: new Date('2023-01-15'),
  updatedAt: new Date(),
  settings: {
    allowedPostTypes: [],
    requireApproval: false,
    minimumReputation: 0,
    stakingRequirements: []
  },
  growthRate: 45,
  activityLevel: 'high' as const
};

const mockCommunity2 = {
  ...mockCommunity,
  id: 'defi-traders',
  name: 'defi-traders',
  displayName: 'DeFi Traders',
  description: 'Decentralized Finance trading strategies and insights for yield farming, liquidity provision, and risk management',
  memberCount: 8900,
  avatar: '💰',
  banner: 'https://placehold.co/800x200/10b981/ffffff?text=DeFi+Traders',
  category: 'Finance',
  tags: ['defi', 'trading', 'yield-farming', 'amm'],
  growthRate: 25,
  activityLevel: 'medium' as const
};

const mockPost = {
  id: 'post-1',
  title: 'New Solidity Features in 0.8.20',
  content: 'Just released: Solidity 0.8.20 brings exciting new features including improved error handling and enhanced security checks. Here\'s a breakdown of what\'s new and how it can benefit your smart contract development.',
  author: '0x1234567890123456789012345678901234567890',
  authorName: 'SolidityDev',
  communityId: 'ethereum-builders',
  upvotes: 124,
  downvotes: 3,
  commentCount: 28,
  shareCount: 15,
  tags: ['solidity', 'ethereum', 'development'],
  createdAt: new Date('2023-06-15T10:30:00Z'),
  updatedAt: new Date('2023-06-15T10:30:00Z'),
  isStaked: true,
  stakedTokens: 75,
  flair: 'Hot',
  isPinned: false,
  isLocked: false,
  contentCid: 'content-cid-1',
  mediaCids: [],
  onchainRef: '',
  comments: [],
  parentId: undefined,
  depth: 0,
  sortOrder: 0,
  views: 1000,
  shares: 15,
  engagementScore: 150,
  previews: [],
  socialProof: undefined,
  trendingStatus: undefined,
  isBookmarked: false,
  contentType: 'text' as const,
  reactions: [],
  tips: [],
  stakedValue: 0,
  reputationScore: 0,
  dao: 'ethereum-builders'
};

const mockPost2 = {
  ...mockPost,
  id: 'post-2',
  title: 'Best Yield Farming Opportunities This Week',
  content: 'Market analysis of the top yield farming opportunities across various DeFi protocols. Including risk assessment and expected returns for different strategies.',
  authorName: 'YieldFarmer',
  communityId: 'defi-traders',
  upvotes: 89,
  downvotes: 2,
  commentCount: 15,
  tags: ['yield-farming', 'defi', 'opportunities'],
  stakedTokens: 42,
  flair: 'Bullish',
  contentCid: 'content-cid-2',
  mediaCids: [],
  onchainRef: '',
  comments: [],
  parentId: undefined,
  depth: 0,
  sortOrder: 0,
  views: 800,
  shares: 10,
  engagementScore: 120,
  previews: [],
  socialProof: undefined,
  trendingStatus: undefined,
  isBookmarked: false,
  contentType: 'text' as const,
  reactions: [],
  tips: [],
  stakedValue: 0,
  reputationScore: 0,
  dao: 'defi-traders'
};

export default function CommunityDemoPage() {
  const [loading, setLoading] = useState(true);
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>(['ethereum-builders']);

  // Simulate loading state
  setTimeout(() => {
    setLoading(false);
  }, 2000);

  const handleJoinCommunity = (communityId: string) => {
    if (joinedCommunities.includes(communityId)) {
      setJoinedCommunities(prev => prev.filter(id => id !== communityId));
    } else {
      setJoinedCommunities(prev => [...prev, communityId]);
    }
  };

  const handleVote = (postId: string, voteType: 'upvote' | 'downvote', stakeAmount?: string) => {
    console.log(`Voted ${voteType} on post ${postId} with ${stakeAmount || 1} tokens`);
  };

  const handleTip = async (postId: string, amount: string, token: string) => {
    console.log(`Tipped ${amount} ${token} on post ${postId}`);
  };

  return (
    <Layout title="Community Components Demo - LinkDAO" fullWidth={true}>
      <Head>
        <meta name="description" content="Demo of enhanced community components with improved styling, accessibility, and performance" />
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Enhanced Community Components Demo
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Showcase of improved community components with enhanced styling, accessibility, and performance
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Community Cards</h2>
            
            {loading ? (
              <div className="space-y-6">
                <CommunityCardSkeleton />
                <CommunityCardSkeleton compact={true} />
              </div>
            ) : (
              <div className="space-y-6">
                <CommunityCardEnhanced
                  community={mockCommunity}
                  onJoin={handleJoinCommunity}
                  showTrendingInfo={true}
                />
                
                <CommunityCardEnhanced
                  community={mockCommunity2}
                  onJoin={handleJoinCommunity}
                  showTrendingInfo={true}
                  compact={true}
                />
              </div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Loading Skeletons</h2>
            
            <div className="space-y-6">
              <CommunityCardSkeleton />
              <CommunityCardSkeleton compact={true} />
            </div>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Community Feed</h2>
          
          {loading ? (
            <CommunityFeedSkeleton postCount={2} />
          ) : (
            <div className="space-y-6">
              <CommunityPostCardEnhanced
                post={mockPost}
                community={mockCommunity}
                userMembership={null}
                onVote={handleVote}
                onTip={handleTip}
              />
              
              <CommunityPostCardEnhanced
                post={mockPost2}
                community={mockCommunity2}
                userMembership={null}
                onVote={handleVote}
                onTip={handleTip}
              />
            </div>
          )}
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Enhancement Summary</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Styling Consistency</h4>
              <ul className="text-gray-700 dark:text-gray-300 space-y-1">
                <li>• Unified Tailwind CSS approach</li>
                <li>• Consistent color palette and typography</li>
                <li>• Responsive design patterns</li>
                <li>• Dark mode support</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Accessibility</h4>
              <ul className="text-gray-700 dark:text-gray-300 space-y-1">
                <li>• Proper ARIA labels and roles</li>
                <li>• Keyboard navigation support</li>
                <li>• Focus management</li>
                <li>• Screen reader compatibility</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Loading States</h4>
              <ul className="text-gray-700 dark:text-gray-300 space-y-1">
                <li>• Content-structured skeletons</li>
                <li>• Proper animation timing</li>
                <li>• Consistent styling</li>
                <li>• Responsive design support</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Performance</h4>
              <ul className="text-gray-700 dark:text-gray-300 space-y-1">
                <li>• Virtualization for large feeds</li>
                <li>• Memoization of calculations</li>
                <li>• Efficient re-rendering</li>
                <li>• Bundle size optimization</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}