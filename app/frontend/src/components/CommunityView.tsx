import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  ArrowUp,
  ArrowDown,
  MessageCircle,
  Share,
  Bookmark,
  Users,
  Calendar,
  Shield,
  Vote,
  Trophy,
  Coins,
  Plus,
  Flame,
  Clock,
  TrendingUp,
  Star
} from 'lucide-react';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';

interface CommunityViewProps {
  communityId: string;
  highlightedPostId?: string;
  className?: string;
}

// Mock data for the community
const mockCommunityData = {
  id: 'ethereum-builders',
  name: 'ethereum-builders',
  displayName: 'Ethereum Builders',
  description: 'Building the future of Ethereum ecosystem',
  memberCount: 12400,
  onlineCount: 234,
  avatar: '🔷',
  banner: 'https://placehold.co/800x200/667eea/ffffff?text=Ethereum+Builders',
  category: 'Development',
  createdAt: new Date('2023-01-15'),
  rules: [
    'Be respectful to all community members',
    'No spam or self-promotion without permission',
    'Share quality content and meaningful discussions',
    'Use appropriate flairs for your posts',
    'Follow Ethereum community guidelines'
  ],
  moderators: [
    { username: 'vitalik.eth', role: 'Founder' },
    { username: 'ethereum_dev', role: 'Moderator' },
    { username: 'community_lead', role: 'Moderator' }
  ]
};

const mockPosts = [
  {
    id: '1',
    title: 'New EIP-4844 Implementation Guide',
    author: 'vitalik.eth',
    content: 'Just published a comprehensive guide on implementing EIP-4844 proto-danksharding. This will significantly reduce transaction costs for L2 solutions...',
    upvotes: 245,
    downvotes: 12,
    commentCount: 67,
    createdAt: new Date(Date.now() - 3600000),
    flair: 'Technical',
    isStaked: true,
    stakedTokens: 150
  },
  {
    id: '2',
    title: 'Ethereum Merge Anniversary: What We\'ve Learned',
    author: 'ethereum_researcher',
    content: 'It\'s been over a year since the Ethereum Merge. Let\'s discuss the key improvements and lessons learned from this historic transition...',
    upvotes: 189,
    downvotes: 8,
    commentCount: 45,
    createdAt: new Date(Date.now() - 7200000),
    flair: 'Discussion',
    isStaked: false,
    stakedTokens: 0
  },
  {
    id: '3',
    title: 'Building a DeFi Protocol: Lessons from the Trenches',
    author: 'defi_builder',
    content: 'After 2 years of building our DeFi protocol, here are the key technical and business lessons we\'ve learned. AMA!',
    upvotes: 156,
    downvotes: 23,
    commentCount: 89,
    createdAt: new Date(Date.now() - 10800000),
    flair: 'AMA',
    isStaked: true,
    stakedTokens: 75
  }
];

export default function CommunityView({ communityId, highlightedPostId, className = '' }: CommunityViewProps) {
  const { isMobile } = useMobileOptimization();
  const router = useRouter();
  const [posts, setPosts] = useState(mockPosts);
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top' | 'rising'>('hot');
  const [timeFilter, setTimeFilter] = useState<'hour' | 'day' | 'week' | 'month' | 'year' | 'all'>('day');
  const [isJoined, setIsJoined] = useState(false);

  const handleVote = (postId: string, type: 'up' | 'down') => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          upvotes: type === 'up' ? post.upvotes + 1 : post.upvotes,
          downvotes: type === 'down' ? post.downvotes + 1 : post.downvotes
        };
      }
      return post;
    }));
  };

  return (
    <div className={`grid grid-cols-12 gap-6 max-w-7xl mx-auto ${className}`}>
      {/* Left Sidebar - Navigation */}
      <div className={`col-span-12 ${isMobile ? 'order-3' : 'lg:col-span-3'}`}>
        <div className="sticky top-6 space-y-4">
          {/* Community Navigation */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
              r/{mockCommunityData.name}
            </h3>
            <Link 
              href="/communities"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← Back to Communities
            </Link>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-xs uppercase tracking-wide">
              Filters
            </h3>
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

      {/* Center Column - Community Feed */}
      <div className={`col-span-12 ${isMobile ? '' : 'lg:col-span-6'}`}>
        {/* Community Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-4 overflow-hidden">
          <div
            className="h-32 bg-gradient-to-r from-blue-500 to-purple-600"
            style={{
              backgroundImage: mockCommunityData.banner ? `url(${mockCommunityData.banner})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-4xl">{mockCommunityData.avatar}</div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    r/{mockCommunityData.name}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {mockCommunityData.description}
                  </p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{mockCommunityData.memberCount.toLocaleString()} members</span>
                    </span>
                    <span>•</span>
                    <span>{mockCommunityData.onlineCount} online</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsJoined(!isJoined)}
                className={`px-6 py-2 rounded-full font-medium transition-colors ${isJoined
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
              >
                {isJoined ? 'Joined' : 'Join'}
              </button>
            </div>
          </div>
        </div>

        {/* Post Creation & Sorting */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-4">
          {/* Create Post Section */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
              <span className="text-gray-500 dark:text-gray-400">Create a post</span>
            </div>
          </div>
          
          {/* Sorting Tabs */}
          <div className="flex items-center justify-between p-4">
            <div className="flex space-x-1">
              {(['hot', 'new', 'top', 'rising'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSortBy(tab)}
                  className={`flex items-center space-x-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${sortBy === tab
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
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
            {sortBy === 'top' && (
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as any)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="hour">Past Hour</option>
                <option value="day">Past Day</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
                <option value="year">Past Year</option>
                <option value="all">All Time</option>
              </select>
            )}
          </div>
        </div>

        {/* Posts Feed */}
        <div className="space-y-2">
          {posts.map(post => (
            <div 
              key={post.id} 
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors ${
                highlightedPostId === post.id ? 'ring-2 ring-blue-500 border-blue-500' : ''
              }`}
            >
              <div className="flex">
                {/* Vote Column */}
                <div className="flex flex-col items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-l-lg">
                  <button
                    onClick={() => handleVote(post.id, 'up')}
                    className="p-1 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors"
                  >
                    <ArrowUp className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-bold text-gray-900 dark:text-white py-1">
                    {post.upvotes - post.downvotes}
                  </span>
                  <button
                    onClick={() => handleVote(post.id, 'down')}
                    className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                  >
                    <ArrowDown className="w-5 h-5" />
                  </button>
                </div>

                {/* Post Content */}
                <div className="flex-1 p-4">
                  {/* Post Metadata */}
                  <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <span className="text-gray-600 dark:text-gray-300">r/{mockCommunityData.name}</span>
                    <span>•</span>
                    <span>Posted by u/{post.author}</span>
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

                  {/* Post Title */}
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                    {post.title}
                  </h3>

                  {/* Post Content */}
                  <p className="text-gray-700 dark:text-gray-300 mb-3 text-sm">
                    {post.content}
                  </p>

                  {/* Flair */}
                  <div className="mb-3">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                      {post.flair}
                    </span>
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    <button className="flex items-center space-x-1 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors">
                      <MessageCircle className="w-4 h-4" />
                      <span>{post.commentCount} Comments</span>
                    </button>
                    <button className="flex items-center space-x-1 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors">
                      <Share className="w-4 h-4" />
                      <span>Share</span>
                    </button>
                    <button className="flex items-center space-x-1 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors">
                      <Bookmark className="w-4 h-4" />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Sidebar - Community Info */}
      <div className={`col-span-12 ${isMobile ? 'order-2 mb-6' : 'lg:col-span-3'}`}>
        <div className="sticky top-6 space-y-4">
          {/* About Community */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
              About Community
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {mockCommunityData.description}
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Members</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {mockCommunityData.memberCount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Online</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {mockCommunityData.onlineCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Created</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {mockCommunityData.createdAt.toLocaleDateString()}
                </span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2 text-sm">Community Rules</h4>
              <div className="space-y-2">
                {mockCommunityData.rules.map((rule, index) => (
                  <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">{index + 1}.</span> {rule}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Moderators */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Moderators</span>
            </h3>
            <div className="space-y-2">
              {mockCommunityData.moderators.map((mod, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-gray-900 dark:text-white">u/{mod.username}</span>
                  <span className="text-gray-500 dark:text-gray-400 text-xs">{mod.role}</span>
                </div>
              ))}
            </div>
          </div>

          {/* User Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm flex items-center space-x-2">
              <Trophy className="w-4 h-4" />
              <span>Your Stats</span>
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Reputation</span>
                <span className="font-medium text-gray-900 dark:text-white">1,247</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Posts Created</span>
                <span className="font-medium text-gray-900 dark:text-white">23</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Comments</span>
                <span className="font-medium text-gray-900 dark:text-white">156</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}