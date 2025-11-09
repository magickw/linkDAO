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
import { Community } from '@/models/Community';
import { CommunityPost } from '@/models/CommunityPost';
import { CommunityMembership } from '@/models/CommunityMembership';
import CommunityPostCardEnhanced from '@/components/Community/CommunityPostCardEnhanced';
import VirtualFeedEnhanced from '@/components/Feed/VirtualFeedEnhanced';

export default function EnhancedCommunityPage() {
  const router = useRouter();
  const { community: communityName } = router.query;
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  
  const [userJoined, setUserJoined] = useState(false);
  const [activeTab, setActiveTab] = useState<'hot' | 'new' | 'top' | 'rising'>('hot');
  const [timeFilter, setTimeFilter] = useState<'hour' | 'day' | 'week' | 'month' | 'year' | 'all'>('day');
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [communityData, setCommunityData] = useState<Community | null>(null);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userMembership, setUserMembership] = useState<CommunityMembership | null>(null);

  // Mock community data for demonstration
  useEffect(() => {
    if (!communityName || typeof communityName !== 'string') return;

    const fetchCommunityData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Mock community data
        const mockCommunity: Community = {
          id: communityName,
          name: communityName,
          displayName: `${communityName.replace(/-/g, ' ')}`,
          description: `Welcome to the ${communityName.replace(/-/g, ' ')} community! This is a place for enthusiasts to discuss and share knowledge.`,
          memberCount: Math.floor(Math.random() * 10000) + 1000,
          avatar: ['🏛️', '🔷', '💰', '🎨', '🚀', '⚡'][Math.floor(Math.random() * 6)],
          banner: `https://placehold.co/800x200/667eea/ffffff?text=${communityName.replace(/-/g, '+')}`,
          category: ['Development', 'Finance', 'Art', 'Governance', 'Social'][Math.floor(Math.random() * 5)],
          tags: ['ethereum', 'blockchain', 'web3'].slice(0, Math.floor(Math.random() * 4)),
          isPublic: true,
          rules: [
            'Be respectful to all members',
            'No spam or promotional content',
            'Stay on topic',
            'Share quality content'
          ],
          moderators: [`0x${Math.random().toString(16).substr(2, 40)}`],
          treasuryAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
          governanceToken: 'LDAO',
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 31536000000)), // Up to 1 year ago
          updatedAt: new Date(),
          settings: {
            allowedPostTypes: [],
            requireApproval: false,
            minimumReputation: 0,
            stakingRequirements: []
          }
        };

        setCommunityData(mockCommunity);

        // Mock user membership
        if (isConnected && address) {
          const mockMembership: CommunityMembership = {
            id: `membership-${communityName}-${address}`,
            userId: address,
            communityId: communityName,
            role: Math.random() > 0.9 ? 'admin' : Math.random() > 0.7 ? 'moderator' : 'member',
            joinedAt: new Date(Date.now() - Math.floor(Math.random() * 31536000000)),
            reputation: Math.floor(Math.random() * 5000),
            contributions: Math.floor(Math.random() * 100),
            isActive: true,
            lastActivityAt: new Date(Date.now() - Math.floor(Math.random() * 86400000)) // Within last 24 hours
          };
          setUserMembership(mockMembership);
          setUserJoined(true);
        }

        // Mock posts
        const mockPosts: CommunityPost[] = Array.from({ length: 15 }, (_, i) => ({
          id: `post-${communityName}-${i}`,
          author: `0x${Math.random().toString(16).substr(2, 40)}`,
          parentId: null,
          title: `Sample Post ${i + 1} in ${mockCommunity.displayName}`,
          contentCid: `This is a sample post content for post #${i + 1} in the ${communityName} community. It discusses interesting topics related to ${mockCommunity.category}.`,
          mediaCids: [],
          tags: mockCommunity.tags.slice(0, Math.floor(Math.random() * 3)),
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000)),
          updatedAt: new Date(),
          onchainRef: Math.random() > 0.7 ? `0x${Math.random().toString(16).substr(2, 40)}:1` : undefined,
          stakedValue: Math.floor(Math.random() * 100),
          reputationScore: Math.floor(Math.random() * 1000),
          dao: communityName,
          // Engagement data
          reactions: [],
          tips: [],
          shares: Math.floor(Math.random() * 50),
          views: Math.floor(Math.random() * 1000),
          engagementScore: Math.floor(Math.random() * 200),
          // Enhanced features
          previews: [],
          socialProof: undefined,
          trendingStatus: undefined,
          trendingScore: 0,
          isBookmarked: false,
          communityId: communityName,
          contentType: 'text',
          // CommunityPost specific properties
          flair: Math.random() > 0.8 ? 'Verified' : undefined,
          isPinned: Math.random() > 0.9,
          isLocked: Math.random() > 0.95,
          upvotes: Math.floor(Math.random() * 100),
          downvotes: Math.floor(Math.random() * 20),
          comments: [], // This is the CommunityPost version (Comment[] instead of number)
          depth: 0,
          sortOrder: 0
        }));

        setCommunityPosts(mockPosts);
      } catch (err) {
        console.error('Error fetching community data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load community');
      } finally {
        setLoading(false);
      }
    };

    fetchCommunityData();
  }, [communityName, isConnected, address]);

  const handleJoinToggle = async () => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to join', 'error');
      return;
    }

    try {
      // Toggle join status
      setUserJoined(!userJoined);
      
      // Update membership
      if (!userJoined) {
        const mockMembership: CommunityMembership = {
          id: `membership-${communityName}-${address}`,
          userId: address,
          communityId: communityName as string,
          role: 'member',
          joinedAt: new Date(),
          reputation: 0,
          contributions: 0,
          isActive: true,
          lastActivityAt: new Date()
        };
        setUserMembership(mockMembership);
        addToast('Joined the community successfully!', 'success');
      } else {
        setUserMembership(null);
        addToast('Left the community', 'success');
      }
    } catch (err) {
      console.error('Error updating membership:', err);
      addToast('Failed to update membership', 'error');
    }
  };

  const handleVote = (postId: string, type: 'upvote' | 'downvote', amount?: string) => {
    setCommunityPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          upvotes: type === 'upvote' ? post.upvotes + (amount ? parseInt(amount) : 1) : post.upvotes,
          downvotes: type === 'downvote' ? post.downvotes + (amount ? parseInt(amount) : 1) : post.downvotes
        };
      }
      return post;
    }));
  };

  if (loading) {
    return (
      <Layout title="Loading Community - LinkDAO" fullWidth={true}>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading community...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !communityData) {
    return (
      <Layout title="Community Not Found - LinkDAO" fullWidth={true}>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {error || 'Community Not Found'}
            </h1>
            <Link href="/communities" className="text-primary-600 hover:text-primary-700">
              ← Back to Communities
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`${communityData.displayName} - LinkDAO`} fullWidth={true}>
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

      {/* Community Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-4 overflow-hidden">
        <div 
          className="h-48 bg-gradient-to-r from-primary-500 to-purple-600 relative"
          style={{
            backgroundImage: communityData.banner ? `url(${communityData.banner})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-5xl -mt-16 bg-white dark:bg-gray-800 rounded-full p-2">
                {communityData.avatar}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {communityData.displayName}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {communityData.name}
                </p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{communityData.memberCount.toLocaleString()} members</span>
                  </span>
                  <span>•</span>
                  <span>{Math.floor(Math.random() * 1000) + 100} online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleJoinToggle}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  userJoined
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
                aria-label={userJoined ? "Leave community" : "Join community"}
              >
                {userJoined ? 'Joined' : 'Join'}
              </button>
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

      {/* Sorting Tabs */}
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
                aria-label={`Sort by ${tab}`}
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
            aria-label="Filter by time"
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

      {/* Create Post Prompt */}
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
                Create a post in {communityData.name}
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
          <VirtualFeedEnhanced
            posts={communityPosts}
            community={communityData}
            userMembership={userMembership}
            onVote={handleVote}
            height={800}
            itemHeight={400}
          />
        )}
      </div>

      {/* Community Sidebar */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Community Rules */}
        <div className="md:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Community Rules</span>
          </h3>
          <div className="space-y-2">
            {communityData.rules.map((rule, index) => (
              <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">{index + 1}.</span> {rule}
              </div>
            ))}
          </div>
        </div>

        {/* Community Stats */}
        <div className="md:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Community Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Members</span>
              <span className="font-medium text-gray-900 dark:text-white">{communityData.memberCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Online Now</span>
              <span className="font-medium text-gray-900 dark:text-white">{Math.floor(Math.random() * 1000) + 100}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Posts Today</span>
              <span className="font-medium text-gray-900 dark:text-white">{Math.floor(Math.random() * 50)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Category</span>
              <span className="font-medium text-gray-900 dark:text-white">{communityData.category}</span>
            </div>
          </div>
        </div>

        {/* Your Membership */}
        <div className="md:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
            <Trophy className="w-4 h-4" />
            <span>Your Membership</span>
          </h3>
          {userMembership ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Role</span>
                <span className="font-medium text-gray-900 dark:text-white capitalize">{userMembership.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Reputation</span>
                <span className="font-medium text-gray-900 dark:text-white">{userMembership.reputation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Joined</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {userMembership.joinedAt.toLocaleDateString()}
                </span>
              </div>
              <button 
                onClick={handleJoinToggle}
                className="w-full mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Leave Community
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You're not a member of this community yet.
              </p>
              <button 
                onClick={handleJoinToggle}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Join Community
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}