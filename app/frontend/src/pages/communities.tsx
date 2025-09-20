import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
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
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top' | 'rising'>('hot');
  const [timeFilter, setTimeFilter] = useState<'hour' | 'day' | 'week' | 'month' | 'year' | 'all'>('day');
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>(['ethereum-builders', 'defi-traders']);

  useEffect(() => {
    // Set default community if none selected
    if (!selectedCommunity && communities.length > 0) {
      setSelectedCommunity(communities[0]);
    }
  }, [communities, selectedCommunity]);

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

  const filteredPosts = selectedCommunity
    ? posts.filter(post => post.communityId === selectedCommunity.id)
    : posts;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Head>
        <title>Communities - LinkDAO</title>
        <meta name="description" content="Discover and join decentralized communities" />
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Navigation */}
          <div className="col-span-12 lg:col-span-3">
            <div className="sticky top-6 space-y-4">
              {/* Community Navigation */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Communities</h3>
                  <button className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Joined Communities */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Joined</h4>
                  <div className="space-y-1">
                    {communities.filter(c => joinedCommunities.includes(c.id)).map(community => (
                      <button
                        key={community.id}
                        onClick={() => setSelectedCommunity(community)}
                        className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded text-sm transition-colors ${selectedCommunity?.id === community.id
                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                          }`}
                      >
                        <span className="text-lg">{community.avatar}</span>
                        <span className="truncate">{community.displayName}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Discover Communities */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Discover</h4>
                  <div className="space-y-1">
                    {communities.filter(c => !joinedCommunities.includes(c.id)).map(community => (
                      <button
                        key={community.id}
                        onClick={() => setSelectedCommunity(community)}
                        className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded text-sm transition-colors ${selectedCommunity?.id === community.id
                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                          }`}
                      >
                        <span className="text-lg">{community.avatar}</span>
                        <span className="truncate">{community.displayName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Filters</h3>
                <div className="space-y-2">
                  {(['hot', 'new', 'top', 'rising'] as const).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setSortBy(filter)}
                      className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded text-sm transition-colors ${sortBy === filter
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                        }`}
                    >
                      {filter === 'hot' && <Flame className="w-4 h-4" />}
                      {filter === 'new' && <Clock className="w-4 h-4" />}
                      {filter === 'top' && <TrendingUp className="w-4 h-4" />}
                      {filter === 'rising' && <Star className="w-4 h-4" />}
                      <span className="capitalize">{filter}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Center Column - Community Feed */}
          <div className="col-span-12 lg:col-span-6">
            {selectedCommunity && (
              <>
                {/* Community Header */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 overflow-hidden">
                  <div
                    className="h-32 bg-gradient-to-r from-primary-500 to-purple-600"
                    style={{
                      backgroundImage: selectedCommunity.banner ? `url(${selectedCommunity.banner})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  />
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-4xl">{selectedCommunity.avatar}</div>
                        <div>
                          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {selectedCommunity.displayName}
                          </h1>
                          <p className="text-gray-600 dark:text-gray-400 mt-1">
                            {selectedCommunity.description}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center space-x-1">
                              <Users className="w-4 h-4" />
                              <span>{selectedCommunity.memberCount.toLocaleString()} members</span>
                            </span>
                            <span>•</span>
                            <span>{selectedCommunity.category}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleJoinCommunity(selectedCommunity.id)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${joinedCommunities.includes(selectedCommunity.id)
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                            : 'bg-primary-600 text-white hover:bg-primary-700'
                          }`}
                      >
                        {joinedCommunities.includes(selectedCommunity.id) ? 'Joined' : 'Join'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sorting Tabs */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-1">
                      {(['hot', 'new', 'top', 'rising'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setSortBy(tab)}
                          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${sortBy === tab
                              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                        >
                          <span className="capitalize">{tab}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value as any)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="hour">Past Hour</option>
                        <option value="day">Past Day</option>
                        <option value="week">Past Week</option>
                        <option value="month">Past Month</option>
                        <option value="year">Past Year</option>
                        <option value="all">All Time</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Posts Feed */}
                <div className="space-y-4">
                  {filteredPosts.map(post => (
                    <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg shadow">
                      <div className="p-6">
                        {/* Post Header */}
                        <div className="flex items-start space-x-3 mb-4">
                          <div className="flex flex-col items-center space-y-1">
                            <button
                              onClick={() => handleVote(post.id, 'up', 1)}
                              className="p-1 text-gray-400 hover:text-orange-500 transition-colors"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {post.upvotes - post.downvotes}
                            </span>
                            <button
                              onClick={() => handleVote(post.id, 'down', 1)}
                              className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                              <span className="font-medium text-gray-900 dark:text-white">{post.authorName}</span>
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
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                              {post.title}
                            </h3>
                            <p className="text-gray-700 dark:text-gray-300 mb-3">
                              {post.content}
                            </p>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2 mb-4">
                              {post.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>

                            {/* Engagement Bar */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <button className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 transition-colors">
                                  <MessageCircle className="w-4 h-4" />
                                  <span className="text-sm">{post.commentCount}</span>
                                </button>
                                <button className="flex items-center space-x-1 text-gray-500 hover:text-green-600 transition-colors">
                                  <Share className="w-4 h-4" />
                                  <span className="text-sm">Share</span>
                                </button>
                                <button className="flex items-center space-x-1 text-gray-500 hover:text-yellow-600 transition-colors">
                                  <Bookmark className="w-4 h-4" />
                                  <span className="text-sm">Save</span>
                                </button>
                              </div>
                              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                                <span className="capitalize">{post.type}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right Sidebar - Community Info */}
          <div className="col-span-12 lg:col-span-3">
            {selectedCommunity && (
              <div className="sticky top-6 space-y-4">
                {/* Community Rules */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                    <Shield className="w-4 h-4" />
                    <span>Community Rules</span>
                  </h3>
                  <div className="space-y-2">
                    {selectedCommunity.rules.map((rule, index) => (
                      <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">{index + 1}.</span> {rule}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Governance */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
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
                    {selectedCommunity.governanceToken && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Token:</span> {selectedCommunity.governanceToken}
                      </div>
                    )}
                  </div>
                </div>

                {/* Trending Posts */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                    <Trophy className="w-4 h-4" />
                    <span>Trending</span>
                  </h3>
                  <div className="space-y-2">
                    {filteredPosts.slice(0, 3).map((post, index) => (
                      <div key={post.id} className="text-sm">
                        <div className="flex items-start space-x-2">
                          <span className="text-gray-400 font-medium">{index + 1}.</span>
                          <div>
                            <div className="text-gray-900 dark:text-white font-medium line-clamp-2">
                              {post.title}
                            </div>
                            <div className="text-gray-500 text-xs mt-1">
                              {post.upvotes - post.downvotes} points • {post.commentCount} comments
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Wallet Stats */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                    <Coins className="w-4 h-4" />
                    <span>Your Stats</span>
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Reputation</span>
                      <span className="font-medium text-gray-900 dark:text-white">1,247</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Tokens Staked</span>
                      <span className="font-medium text-gray-900 dark:text-white">450</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Posts Created</span>
                      <span className="font-medium text-gray-900 dark:text-white">23</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunitiesPage;