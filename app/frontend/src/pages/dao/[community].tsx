import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { 
  ArrowLeft,
  Users,
  Shield,
  Vote,
  Trophy,
  Coins,
  TrendingUp,
  Clock,
  Star,
  Flame,
  ArrowUp,
  ArrowDown,
  MessageCircle,
  Share,
  Bookmark,
  Plus,
  Settings,
  Bell,
  Search
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useWeb3 } from '@/context/Web3Context';
import { useCreatePost } from '@/hooks/usePosts';
import { CreatePostInput } from '@/models/Post';

// Mock data
const mockProfiles: Record<string, any> = {
  '0x1234567890123456789012345678901234567890': {
    handle: 'alexj',
    ens: 'alex.eth',
    avatarCid: 'https://placehold.co/40',
  },
  '0x2345678901234567890123456789012345678901': {
    handle: 'samc',
    ens: 'sam.eth',
    avatarCid: 'https://placehold.co/40',
  },
  '0x3456789012345678901234567890123456789012': {
    handle: 'taylorr',
    ens: 'taylor.eth',
    avatarCid: 'https://placehold.co/40',
  },
};

const mockPosts: Record<string, any[]> = {
  'ethereum-builders': [
    {
      id: '1',
      title: 'New EIP-4844 Implementation Guide',
      author: '0x1234567890123456789012345678901234567890',
      authorName: 'vitalik.eth',
      content: 'Just published a comprehensive guide on implementing EIP-4844 proto-danksharding. This will significantly reduce L2 costs and improve scalability...',
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
      title: 'Solidity Gas Optimization Techniques',
      author: '0x2345678901234567890123456789012345678901',
      authorName: 'austingriffith.eth',
      content: 'Sharing some advanced gas optimization techniques I discovered while building Scaffold-ETH...',
      type: 'analysis',
      upvotes: 189,
      downvotes: 8,
      commentCount: 45,
      createdAt: new Date(Date.now() - 7200000),
      tags: ['solidity', 'gas-optimization', 'development'],
      stakedTokens: 89,
      isStaked: false
    }
  ],
  'defi-traders': [
    {
      id: '3',
      title: 'Arbitrum Yield Farming Strategy - 15% APY',
      author: '0x3456789012345678901234567890123456789012',
      authorName: 'defi_alpha',
      content: 'Found a new yield farming opportunity on Arbitrum with sustainable 15% APY. Risk analysis included...',
      type: 'analysis',
      upvotes: 156,
      downvotes: 23,
      commentCount: 34,
      createdAt: new Date(Date.now() - 3600000),
      tags: ['arbitrum', 'yield-farming', 'strategy'],
      stakedTokens: 67,
      isStaked: true
    }
  ],
  'nft-collectors': [
    {
      id: '4',
      title: 'My Latest NFT Collection Drop',
      author: '0x4567890123456789012345678901234567890123',
      authorName: 'cryptoartist',
      content: 'Excited to share my latest NFT collection representing different DeFi protocols. Each piece tells a story...',
      type: 'showcase',
      upvotes: 134,
      downvotes: 5,
      commentCount: 28,
      createdAt: new Date(Date.now() - 5400000),
      tags: ['nft', 'art', 'defi'],
      stakedTokens: 45,
      isStaked: true
    }
  ]
};

// Mock community data
const mockCommunityData: Record<string, any> = {
  'ethereum-builders': {
    id: 'ethereum-builders',
    name: 'ethereum-builders',
    displayName: 'Ethereum Builders',
    description: 'A community for Ethereum developers, builders, and researchers. Share your projects, ask questions, and collaborate on the future of Ethereum.',
    memberCount: 12400,
    onlineCount: 1247,
    avatar: '🔷',
    banner: 'https://placehold.co/800x200/667eea/ffffff?text=Ethereum+Builders',
    category: 'Development',
    tags: ['ethereum', 'development', 'smart-contracts'],
    isPublic: true,
    rules: [
      'Be respectful and constructive in discussions',
      'No spam or self-promotion without context',
      'Share quality content and resources',
      'Help newcomers learn and grow',
      'Follow Ethereum community guidelines'
    ],
    moderators: ['vitalik.eth', 'danfinlay.eth', 'austingriffith.eth'],
    treasuryAddress: '0x1234567890123456789012345678901234567890',
    governanceToken: 'ETH-BUILD',
    treasury: {
      totalValue: '$294.7K',
      assets: [
        { token: 'WETH', amount: '89.2', value: '$245.3K' },
        { token: 'USDC', amount: '28.4K', value: '$28.4K' },
        { token: 'DAI', amount: '21.0K', value: '$21.0K' }
      ]
    },
    proposals: [
      {
        id: '1',
        title: 'Increase minimum reputation requirement',
        description: 'Proposal to increase minimum reputation from 50 to 100 for posting',
        status: 'active',
        votesFor: 1247,
        votesAgainst: 234,
        endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      }
    ]
  },
  'defi-traders': {
    id: 'defi-traders',
    name: 'defi-traders',
    displayName: 'DeFi Traders',
    description: 'Decentralized Finance trading strategies, insights, and alpha sharing',
    memberCount: 8900,
    onlineCount: 567,
    avatar: '💰',
    banner: 'https://placehold.co/800x200/10b981/ffffff?text=DeFi+Traders',
    category: 'Finance',
    tags: ['defi', 'trading', 'yield-farming'],
    isPublic: true,
    rules: [
      'No financial advice - share research only',
      'Always DYOR (Do Your Own Research)',
      'Verify claims with sources',
      'No pump and dump schemes',
      'Respect risk tolerance differences'
    ],
    moderators: ['hayden.eth', 'kain.eth', 'stani.eth'],
    treasuryAddress: '0x2345678901234567890123456789012345678901',
    governanceToken: 'DEFI-TRD',
    treasury: {
      totalValue: '$156.2K',
      assets: [
        { token: 'WETH', amount: '45.1', value: '$124.2K' },
        { token: 'USDC', amount: '18.0K', value: '$18.0K' },
        { token: 'AAVE', amount: '180', value: '$14.0K' }
      ]
    },
    proposals: []
  },
  'nft-collectors': {
    id: 'nft-collectors',
    name: 'nft-collectors',
    displayName: 'NFT Collectors',
    description: 'Discover, trade, and showcase NFT collections and digital art',
    memberCount: 21000,
    onlineCount: 1890,
    avatar: '🎨',
    banner: 'https://placehold.co/800x200/8b5cf6/ffffff?text=NFT+Collectors',
    category: 'Art',
    tags: ['nft', 'art', 'collectibles'],
    isPublic: true,
    rules: [
      'Original content and authentic collections only',
      'No price manipulation or fake sales',
      'Respect artists and creators',
      'Provide context for shared collections',
      'No copyright infringement'
    ],
    moderators: ['beeple.eth', 'pak.eth', 'xcopy.eth'],
    treasuryAddress: '0x3456789012345678901234567890123456789012',
    governanceToken: 'NFT-COL',
    treasury: {
      totalValue: '$89.5K',
      assets: [
        { token: 'WETH', amount: '28.7', value: '$79.0K' },
        { token: 'USDC', amount: '10.5K', value: '$10.5K' }
      ]
    },
    proposals: []
  }
};

export default function CommunityPage() {
  const router = useRouter();
  const { community } = router.query;
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  const { createPost, isLoading: isCreatingPost } = useCreatePost();
  
  const [userJoined, setUserJoined] = useState(false);
  const [activeTab, setActiveTab] = useState<'hot' | 'new' | 'top' | 'rising'>('hot');
  const [timeFilter, setTimeFilter] = useState<'hour' | 'day' | 'week' | 'month' | 'year' | 'all'>('day');
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  // Get community data
  const communityData = typeof community === 'string' ? mockCommunityData[community] : null;
  const communityPosts = typeof community === 'string' ? mockPosts[community] || [] : [];

  useEffect(() => {
    if (typeof community === 'string' && !communityData) {
      // Community not found, redirect to communities page
      router.push('/communities');
    }
  }, [community, communityData, router]);

  const handleJoinToggle = () => {
    setUserJoined(!userJoined);
    addToast(
      userJoined 
        ? 'Left the community' 
        : 'Joined the community successfully!', 
      'success'
    );
  };

  const handleVote = (postId: string, type: 'up' | 'down', amount: number) => {
    if (!isConnected) {
      addToast('Please connect your wallet to vote', 'error');
      return;
    }
    
    // Simulate voting with token staking
    addToast(`${type === 'up' ? 'Upvoted' : 'Downvoted'} with ${amount} tokens staked!`, 'success');
  };

  const handleTip = (postId: string, amount: string, token: string) => {
    if (!isConnected) {
      addToast('Please connect your wallet to tip', 'error');
      return;
    }
    
    addToast(`Successfully tipped ${amount} ${token}!`, 'success');
  };

  if (!communityData) {
    return (
      <Layout title="Community Not Found - LinkDAO">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Community Not Found</h1>
            <Link href="/communities" className="text-primary-600 hover:text-primary-700">
              ← Back to Communities
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`${communityData.displayName} - LinkDAO`}>
      <Head>
        <meta name="description" content={communityData.description} />
      </Head>
      {/* Back Navigation */}
      <div className="mb-4">
        <Link 
          href="/communities"
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Communities</span>
        </Link>
      </div>

      {/* Reddit-Style Three-Column Layout */}
      <div className="grid grid-cols-12 gap-6 max-w-7xl mx-auto">
          {/* Left Sidebar - Reddit-Style Navigation */}
          <div className="col-span-12 lg:col-span-3">
            <div className="sticky top-6 space-y-4">
              {/* Community Info Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="text-2xl">{communityData.avatar}</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{communityData.displayName}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">r/{communityData.name}</p>
                  </div>
                </div>
                <button
                  onClick={handleJoinToggle}
                  className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                    userJoined
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {userJoined ? 'Joined' : 'Join'}
                </button>
              </div>

              {/* Quick Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Quick Actions</h4>
                <div className="space-y-2">
                  <button 
                    onClick={() => setIsCreatePostOpen(true)}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Post</span>
                  </button>
                  <button className="w-full flex items-center space-x-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded">
                    <Search className="w-4 h-4" />
                    <span>Search Posts</span>
                  </button>
                  <button className="w-full flex items-center space-x-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded">
                    <Bell className="w-4 h-4" />
                    <span>Notifications</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Center Column - Reddit-Style Community Feed */}
          <div className="col-span-12 lg:col-span-6">
            {/* Reddit-Style Community Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-4 overflow-hidden">
              <div 
                className="h-32 bg-gradient-to-r from-primary-500 to-purple-600"
                style={{
                  backgroundImage: communityData.banner ? `url(${communityData.banner})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-4xl">{communityData.avatar}</div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {communityData.displayName}
                      </h1>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        r/{communityData.name}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>{communityData.memberCount.toLocaleString()} members</span>
                        </span>
                        <span>•</span>
                        <span>{communityData.onlineCount.toLocaleString()} online</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                      <Bell className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mt-4">
                  {communityData.description}
                </p>
              </div>
            </div>

            {/* Reddit-Style Sorting Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-4 p-4">
              <div className="flex items-center justify-between">
                <div className="flex space-x-1">
                  {(['hot', 'new', 'top', 'rising'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex items-center space-x-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                        activeTab === tab
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                          : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                    >
                      {tab === 'hot' && <Flame className="w-4 h-4" />}
                      {tab === 'new' && <Clock className="w-4 h-4" />}
                      {tab === 'top' && <TrendingUp className="w-4 h-4" />}
                      {tab === 'rising' && <Star className="w-4 h-4" />}
                      <span className="capitalize">{tab}</span>
                    </button>
                  ))}
                </div>
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

            {/* Reddit-Style Create Post Prompt */}
            {isConnected && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-4">
                <div 
                  onClick={() => setIsCreatePostOpen(true)}
                  className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <Plus className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                      Create a post in r/{communityData.name}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Posts Feed */}
            <div className="space-y-4">
              {communityPosts.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                  <MessageCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No posts yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Be the first to start a discussion in this community!
                  </p>
                  {isConnected && (
                    <button 
                      onClick={() => setIsCreatePostOpen(true)}
                      className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                    >
                      Create First Post
                    </button>
                  )}
                </div>
              ) : (
                communityPosts.map(post => (
                  <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
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
                            {post.tags.map((tag: string) => (
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
                              <button 
                                onClick={() => handleTip(post.id, '0.01', communityData.governanceToken)}
                                className="flex items-center space-x-1 text-gray-500 hover:text-purple-600 transition-colors"
                              >
                                <Coins className="w-4 h-4" />
                                <span className="text-sm">Tip</span>
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
                ))
              )}
            </div>
          </div>

          {/* Right Sidebar - Reddit-Style Community Info */}
          <div className="col-span-12 lg:col-span-3">
            <div className="sticky top-6 space-y-4">
              {/* Community Rules */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span>Community Rules</span>
                </h3>
                <div className="space-y-2">
                  {communityData.rules.map((rule: string, index: number) => (
                    <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">{index + 1}.</span> {rule}
                    </div>
                  ))}
                </div>
              </div>

              {/* Governance */}
              {communityData.proposals.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                    <Vote className="w-4 h-4" />
                    <span>Governance</span>
                  </h3>
                  <div className="space-y-3">
                    {communityData.proposals.map((proposal: any) => (
                      <div key={proposal.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{proposal.title}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {proposal.description}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {Math.ceil((proposal.endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left
                          </span>
                          <button className="text-xs text-primary-600 hover:text-primary-700">Vote</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Treasury */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                  <Coins className="w-4 h-4" />
                  <span>Treasury</span>
                </h3>
                <div className="space-y-3">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {communityData.treasury.totalValue}
                  </div>
                  {communityData.treasury.assets.map((asset: any, index: number) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">{asset.token}</span>
                        <div className="text-gray-500 dark:text-gray-400">{asset.amount}</div>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{asset.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Moderators */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Moderators</h3>
                <div className="space-y-2">
                  {communityData.moderators.map((mod: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
                        M
                      </div>
                      <span className="text-gray-900 dark:text-white">{mod}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Your Stats */}
              {isConnected && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                    <Trophy className="w-4 h-4" />
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
              )}
            </div>
          </div>
        </div>
    </Layout>
  );
}