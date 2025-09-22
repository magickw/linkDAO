import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';

import {
  TrendingUp,
  Clock,
  Star,
  Flame,
  Users,
  Plus,
  Search,
  Filter,
  ChevronDown,
  MessageCircle,
  ArrowUp,
  ArrowDown,
  Share,
  Bookmark,
  Coins,
  Shield,
  Vote,
  Trophy
} from 'lucide-react';
import { CommunityService } from '@/services/communityService';
import { Community } from '@/models/Community';

// Mock data for demonstration
const mockCommunities = [
  {
    id: 'ethereum-builders',
    name: 'ethereum-builders',
    displayName: 'Ethereum Builders',
    description: 'Building the future of Ethereum ecosystem',
    memberCount: 12400,
    avatar: '🔷',
    banner: 'https://placehold.co/800x200/667eea/ffffff?text=Ethereum+Builders',
    category: 'Development',
    tags: ['ethereum', 'development', 'smart-contracts'],
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
    }
  },
  {
    id: 'defi-traders',
    name: 'defi-traders',
    displayName: 'DeFi Traders',
    description: 'Decentralized Finance trading strategies and insights',
    memberCount: 8900,
    avatar: '💰',
    banner: 'https://placehold.co/800x200/10b981/ffffff?text=DeFi+Traders',
    category: 'Finance',
    tags: ['defi', 'trading', 'yield-farming'],
    isPublic: true,
    rules: ['No financial advice', 'Share research', 'Verify claims'],
    moderators: ['0x2345...6789'],
    treasuryAddress: '0x2345678901234567890123456789012345678901',
    governanceToken: 'DEFI-TRD',
    createdAt: new Date('2023-02-20'),
    updatedAt: new Date(),
    settings: {
      allowedPostTypes: [],
      requireApproval: false,
      minimumReputation: 100,
      stakingRequirements: []
    }
  },
  {
    id: 'nft-collectors',
    name: 'nft-collectors',
    displayName: 'NFT Collectors',
    description: 'Discover, trade, and showcase NFT collections',
    memberCount: 21000,
    avatar: '🎨',
    banner: 'https://placehold.co/800x200/8b5cf6/ffffff?text=NFT+Collectors',
    category: 'Art',
    tags: ['nft', 'art', 'collectibles'],
    isPublic: true,
    rules: ['Original content only', 'No price manipulation', 'Respect artists'],
    moderators: ['0x3456...7890'],
    treasuryAddress: '0x3456789012345678901234567890123456789012',
    governanceToken: 'NFT-COL',
    createdAt: new Date('2023-03-10'),
    updatedAt: new Date(),
    settings: {
      allowedPostTypes: [],
      requireApproval: false,
      minimumReputation: 50,
      stakingRequirements: []
    }
  }
];

const mockPosts = [
  {
    id: '1',
    communityId: 'ethereum-builders',
    title: 'New EIP-4844 Implementation Guide',
    author: '0x1234567890123456789012345678901234567890',
    authorName: 'vitalik.eth',
    content: 'Just published a comprehensive guide on implementing EIP-4844 proto-danksharding...',
    type: 'discussion',
    upvotes: 245,
    downvotes: 12,
    commentCount: 67,
    createdAt: new Date(Date.now() - 3600000),
    tags: ['eip-4844', 'scaling', 'ethereum'],
    stakedTokens: 150,
    isStaked: true
  },
  {
    id: '2',
    communityId: 'defi-traders',
    title: 'Arbitrum Yield Farming Strategy - 15% APY',
    author: '0x2345678901234567890123456789012345678901',
    authorName: 'defi_alpha',
    content: 'Found a new yield farming opportunity on Arbitrum with sustainable 15% APY...',
    type: 'analysis',
    upvotes: 189,
    downvotes: 23,
    commentCount: 45,
    createdAt: new Date(Date.now() - 7200000),
    tags: ['arbitrum', 'yield-farming', 'strategy'],
    stakedTokens: 89,
    isStaked: false
  },
  {
    id: '3',
    communityId: 'nft-collectors',
    title: 'My Latest NFT Collection Drop',
    author: '0x3456789012345678901234567890123456789012',
    authorName: 'cryptoartist',
    content: 'Excited to share my latest NFT collection representing different DeFi protocols...',
    type: 'showcase',
    upvotes: 156,
    downvotes: 8,
    commentCount: 34,
    createdAt: new Date(Date.now() - 10800000),
    tags: ['nft', 'art', 'defi'],
    stakedTokens: 67,
    isStaked: true
  }
];

const CommunitiesPage: React.FC = () => {
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>(mockCommunities);
  const [posts, setPosts] = useState(mockPosts);
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top' | 'rising'>('hot');
  const [timeFilter, setTimeFilter] = useState<'hour' | 'day' | 'week' | 'month' | 'year' | 'all'>('day');
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>(['ethereum-builders', 'defi-traders']);


  const handleJoinCommunity = (communityId: string) => {
    if (joinedCommunities.includes(communityId)) {
      setJoinedCommunities(prev => prev.filter(id => id !== communityId));
    } else {
      setJoinedCommunities(prev => [...prev, communityId]);
    }
  };

  const handleVote = (postId: string, type: 'up' | 'down', amount: number) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          upvotes: type === 'up' ? post.upvotes + amount : post.upvotes,
          downvotes: type === 'down' ? post.downvotes + amount : post.downvotes,
          stakedTokens: post.stakedTokens + amount
        };
      }
      return post;
    }));
  };



  // Show posts from followed communities and suggested posts for home feed
  const filteredPosts = posts.filter(post => 
    joinedCommunities.includes(post.communityId) || // Posts from joined communities
    post.upvotes > 100 || // Popular posts (suggested)
    post.tags.some(tag => ['ethereum', 'defi', 'nft'].includes(tag)) // Interest-based suggestions
  );

  return (
    <Layout title="Communities - LinkDAO">
      <Head>
        <meta name="description" content="Discover and join decentralized communities" />
      </Head>

      <div className="grid grid-cols-12 gap-6 max-w-7xl mx-auto">
        <div className="col-span-12 lg:col-span-3">
          <div className="sticky top-6 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Communities</h3>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Joined</h4>
                <div className="space-y-1">
                  <button className="w-full flex items-center space-x-2 px-2 py-1.5 rounded text-sm transition-colors bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                    <span className="text-lg">🏠</span>
                    <span className="truncate">Home</span>
                  </button>
                  {communities.filter(c => joinedCommunities.includes(c.id)).map(community => (
                    <button
                      key={community.id}
                      onClick={() => router.push(`/dao/${community.name}`)}
                      className="w-full flex items-center space-x-2 px-2 py-1.5 rounded text-sm transition-colors text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                    >
                      <span className="text-lg">{community.avatar}</span>
                      <span className="truncate">{community.displayName}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Discover</h4>
                <div className="space-y-1">
                  {communities.filter(c => !joinedCommunities.includes(c.id)).map(community => (
                    <button
                      key={community.id}
                      onClick={() => router.push(`/dao/${community.name}`)}
                      className="w-full flex items-center space-x-2 px-2 py-1.5 rounded text-sm transition-colors text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                    >
                      <span className="text-lg">{community.avatar}</span>
                      <span className="truncate">{community.displayName}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-xs uppercase tracking-wide">Filters</h3>
              <div className="space-y-1">
                {(['hot', 'new', 'top', 'rising'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setSortBy(filter)}
                    className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${sortBy === filter
                      ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-500 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-400'
                      : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700/50'
                      }`}
                  >
                    {filter === 'hot' && <Flame className="w-4 h-4 text-orange-500" />}
                    {filter === 'new' && <Clock className="w-4 h-4 text-green-500" />}
                    {filter === 'top' && <TrendingUp className="w-4 h-4 text-red-500" />}
                    {filter === 'rising' && <Star className="w-4 h-4 text-yellow-500" />}
                    <span className="capitalize">{filter}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-6">

          <div className="space-y-2">
            {filteredPosts.map(post => (
              <div 
                key={post.id} 
                onClick={() => router.push(`/dao/${communities.find(c => c.id === post.communityId)?.name || post.communityId}/posts/${post.id}`)}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer"
              >
                <div className="flex">
                  <div className="flex flex-col items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-l-lg">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(post.id, 'up', 1);
                      }}
                      className="p-1 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors"
                    >
                      <ArrowUp className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-bold text-gray-900 dark:text-white py-1">
                      {post.upvotes - post.downvotes}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(post.id, 'down', 1);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    >
                      <ArrowDown className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 p-4">
                    <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                      <span className="text-gray-600 dark:text-gray-300">
                        r/{communities.find(c => c.id === post.communityId)?.name || post.communityId}
                      </span>
                      <span>•</span>
                      <span>Posted by u/{post.authorName}</span>
                      <span>•</span>
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      {post.isStaked && (
                        <>
                          <span>•</span>
                          <span className="flex items-center space-x-1 text-yellow-600">
                            <Coins className="w-3 h-3" />
                            <span>{post.stakedTokens} staked</span>
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 hover:text-blue-600 dark:hover:text-blue-400">
                      {post.title}
                    </h3>

                    <p className="text-gray-700 dark:text-gray-300 mb-3 text-sm line-clamp-3">
                      {post.content}
                    </p>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {post.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 cursor-pointer"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center space-x-1 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>{post.commentCount} Comments</span>
                      </button>
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center space-x-1 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                      >
                        <Share className="w-4 h-4" />
                        <span>Share</span>
                      </button>
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center space-x-1 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                      >
                        <Bookmark className="w-4 h-4" />
                        <span>Save</span>
                      </button>
                      <div className="flex items-center space-x-1 px-2 py-1">
                        <span className="capitalize text-gray-400">{post.type}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-3">
          <div className="sticky top-6 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
                Suggested Communities
              </h3>
              <div className="space-y-2">
                {communities.filter(c => !joinedCommunities.includes(c.id)).slice(0, 3).map(community => (
                  <div key={community.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{community.avatar}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {community.displayName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {community.memberCount.toLocaleString()} members
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinCommunity(community.id)}
                      className="text-xs px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-700"
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
                About Community
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Discover and join decentralized communities on LinkDAO
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Total Communities</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {communities.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Joined</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {joinedCommunities.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                <Vote className="w-4 h-4" />
                <span>Governance</span>
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Active Proposal</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Increase minimum reputation requirement
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">Ends in 2 days</span>
                    <button className="text-xs text-primary-600 hover:text-primary-700">Vote</button>
                  </div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Active Proposals:</span> 3
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


    </Layout>
  );
};

export default CommunitiesPage;