import React from 'react';
import EnhancedPostCard, { EnhancedPost } from '@/components/EnhancedPostCard/EnhancedPostCard';
import { ContentPreview } from '@/components/InlinePreviews';
import { ProposalStatus } from '@/types/contentPreview';
import { SocialProofData } from '@/components/SocialProof';
import { TrendingLevel } from '@/components/TrendingBadge';

export default function TestEnhancedPostCards() {
  // Mock data for testing
  const mockSocialProof: SocialProofData = {
    followedUsersWhoEngaged: [
      {
        id: '1',
        address: '0x1234567890123456789012345678901234567890',
        username: 'alice_crypto',
        displayName: 'Alice',
        verified: false,
        avatar: 'https://placehold.co/40x40/6366f1/white?text=A'
      },
      {
        id: '2',
        address: '0x2345678901234567890123456789012345678901',
        username: 'bob_defi',
        displayName: 'Bob',
        verified: false,
        avatar: 'https://placehold.co/40x40/8b5cf6/white?text=B'
      }
    ],
    totalEngagementFromFollowed: 25,
    communityLeadersWhoEngaged: [
      {
        id: '3',
        address: '0x3456789012345678901234567890123456789012',
        username: 'community_lead',
        displayName: 'Community Leader',
        verified: false,
        avatar: 'https://placehold.co/40x40/f59e0b/white?text=CL'
      }
    ],
    verifiedUsersWhoEngaged: [
      {
        id: '4',
        address: '0x4567890123456789012345678901234567890123',
        username: 'verified_user',
        displayName: 'Verified User',
        verified: true,
        avatar: 'https://placehold.co/40x40/10b981/white?text=V'
      }
    ]
  };

  const mockPreviews: ContentPreview[] = [
    {
      id: 'nft-1',
      type: 'nft',
      url: 'https://example.com/nft/1',
      cached: false,
      securityStatus: 'safe',
      metadata: {},
      data: {
        network: 'mainnet',
        contractAddress: '0x1234567890123456789012345678901234567890',
        tokenId: '1234',
        name: 'Cool NFT #1234',
        description: 'A really cool NFT from an amazing collection',
        image: 'https://placehold.co/300x300/6366f1/white?text=NFT',
        collection: 'Cool Collection',
        owner: '0x1234567890123456789012345678901234567890',
        price: { amount: '2.5', symbol: 'ETH', network: 'mainnet' },
        rarity: 85
      }
    },
    {
      id: 'link-1',
      type: 'link',
      url: 'https://example.com/article',
      cached: false,
      securityStatus: 'safe',
      metadata: {},
      data: {
        securityScore: 100,
        url: 'https://example.com/article',
        title: 'The Future of Web3 Social Networks',
        description: 'An in-depth look at how blockchain technology is revolutionizing social media platforms and user interactions.',
        image: 'https://placehold.co/300x200/8b5cf6/white?text=Article',
        siteName: 'Web3 News',
        type: 'article',
        metadata: {}
      }
    },
    {
      id: 'proposal-1',
      type: 'proposal',
      url: 'https://example.com/proposal/1',
      cached: false,
      securityStatus: 'safe',
      metadata: {},
      data: {
        id: 'prop-123',
        title: 'Increase Community Rewards Pool',
        description: 'Proposal to increase the community rewards pool by 25% to incentivize more participation.',
        status: ProposalStatus.ACTIVE,
        votingEnds: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        votingStarts: new Date(),
        yesVotes: 1250,
        noVotes: 350,
        abstainVotes: 100,
        quorum: 1000,
        proposer: '0x1234567890123456789012345678901234567890',
        category: 'rewards',
        requiredMajority: 66,
      }
    }
  ];

  const mockPosts: EnhancedPost[] = [
    {
      id: '1',
      title: 'The Future of DeFi is Here! 🚀',
      content: 'Just discovered this amazing new protocol that\'s revolutionizing yield farming. The APY is incredible and the tokenomics are solid. This could be the next big thing in DeFi! What do you all think?',
      author: '0x1234567890123456789012345678901234567890',
      authorProfile: {
        handle: 'defi_explorer',
        verified: true,
        reputationTier: 'expert',
        avatar: 'https://placehold.co/48x48/6366f1/white?text=DE'
      },
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      contentType: 'text',
      previews: [mockPreviews[1]], // Link preview
      hashtags: ['defi', 'yield', 'protocol'],
      mentions: [],
      reactions: [
        {
          type: 'hot',
          emoji: '🔥',
          label: 'Hot Take',
          totalStaked: 150,
          userStaked: 5,
          contributors: ['0x123...890', '0x234...901'],
          rewardsEarned: 30
        },
        {
          type: 'bullish',
          emoji: '🚀',
          label: 'Bullish',
          totalStaked: 200,
          userStaked: 0,
          contributors: ['0x345...012'],
          rewardsEarned: 40
        }
      ],
      tips: [],
      comments: 24,
      shares: 8,
      views: 1250,
      engagementScore: 1500,
      socialProof: mockSocialProof,
      trendingStatus: 'hot' as TrendingLevel,
      communityId: 'defi-community',
      communityName: 'DeFi Community',
      tags: ['defi', 'yield', 'protocol']
    },
    {
      id: '2',
      title: 'Check out this amazing NFT collection!',
      content: 'Found this incredible NFT collection that combines art with utility. The artwork is stunning and holders get access to exclusive events. Floor price is still reasonable too!',
      author: '0x2345678901234567890123456789012345678901',
      authorProfile: {
        handle: 'nft_collector',
        verified: false,
        avatar: 'https://placehold.co/48x48/8b5cf6/white?text=NC'
      },
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      contentType: 'media',
      media: ['https://placehold.co/600x400/8b5cf6/white?text=NFT+Art'],
      previews: [mockPreviews[0]], // NFT preview
      hashtags: ['nft', 'art', 'collection'],
      mentions: [],
      reactions: [
        {
          type: 'art',
          emoji: '🎨',
          label: 'Art Appreciation',
          totalStaked: 75,
          userStaked: 0,
          contributors: [],
          rewardsEarned: 15
        }
      ],
      tips: [],
      comments: 12,
      shares: 5,
      views: 850,
      engagementScore: 500,
      socialProof: {
        ...mockSocialProof,
        followedUsersWhoEngaged: mockSocialProof.followedUsersWhoEngaged.slice(0, 1)
      },
      trendingStatus: 'rising' as TrendingLevel,
      communityId: 'nft-community',
      communityName: 'NFT Collectors',
      tags: ['nft', 'art', 'collection']
    },
    {
      id: '3',
      title: 'Important Governance Proposal - Please Vote!',
      content: 'Community members, we have an important proposal that needs your attention. This will significantly impact our tokenomics and reward distribution. Please review the details and cast your vote.',
      author: '0x3456789012345678901234567890123456789012',
      authorProfile: {
        handle: 'dao_coordinator',
        verified: true,
        reputationTier: 'leader',
        avatar: 'https://placehold.co/48x48/10b981/white?text=DC'
      },
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      contentType: 'proposal',
      previews: [mockPreviews[2]], // Proposal preview
      hashtags: ['governance', 'dao', 'voting'],
      mentions: [],
      reactions: [
        {
          type: 'governance',
          emoji: '⚖️',
          label: 'Governance',
          totalStaked: 300,
          userStaked: 10,
          contributors: ['0x123...890', '0x234...901', '0x345...012'],
          rewardsEarned: 60
        }
      ],
      tips: [],
      comments: 45,
      shares: 15,
      views: 2100,
      engagementScore: 2500,
      socialProof: mockSocialProof,
      trendingStatus: 'viral' as TrendingLevel,
      pinnedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // Pinned for 24 hours
      communityId: 'governance',
      communityName: 'DAO Governance',
      tags: ['governance', 'dao', 'voting']
    }
  ];

  const handleReaction = async (postId: string, reactionType: string, amount?: number) => {
    console.log('Reaction:', postId, reactionType, amount);
  };

  const handleTip = async (postId: string, amount: string, token: string) => {
    console.log('Tip:', postId, amount, token);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Enhanced Post Cards Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Testing the new enhanced post cards with inline previews, social proof, and trending indicators
          </p>
        </div>

        <div className="space-y-6">
          {mockPosts.map((post) => (
            <EnhancedPostCard
              key={post.id}
              post={post}
              onReaction={handleReaction}
              onTip={handleTip}
              onExpand={() => console.log('Expand post:', post.id)}
            />
          ))}
        </div>

        {/* Feature Showcase */}
        <div className="mt-12 p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl border border-white/30 dark:border-gray-700/50">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Enhanced Features Demonstrated
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Visual Hierarchy</h3>
              <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Emphasized titles and content</li>
                <li>• De-emphasized metadata</li>
                <li>• Category-based styling</li>
                <li>• Trending indicators</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Inline Previews</h3>
              <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                <li>• NFT previews with rarity</li>
                <li>• Link previews with metadata</li>
                <li>• Proposal previews with voting</li>
                <li>• Token transaction previews</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Social Proof</h3>
              <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Followed users engagement</li>
                <li>• Verified user indicators</li>
                <li>• Community leader highlights</li>
                <li>• Engagement metrics</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Trending System</h3>
              <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Hot, Rising, Viral, Breaking</li>
                <li>• Animated badges</li>
                <li>• Engagement-based calculation</li>
                <li>• Time-sensitive indicators</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}