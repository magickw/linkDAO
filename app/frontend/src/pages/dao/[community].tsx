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
import { communityWebSocket } from '@/services/communityWebSocket';
import { governanceContract } from '@/services/governanceContract';
import { notificationService } from '@/services/notificationService';
import { ethers } from 'ethers';

// Enhanced Components
import { CommunityCardSkeleton } from '@/components/Community/CommunityLoadingSkeletons';
import CommunityPostCardEnhanced from '@/components/Community/CommunityPostCardEnhanced';

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
  const [communityData, setCommunityData] = useState<any>(null);
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [stakedBalance, setStakedBalance] = useState<string>('0');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Fetch community data from API
  useEffect(() => {
    if (!community || typeof community !== 'string') return;

    const fetchCommunityData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch community details
        const communityResponse = await fetch(`/api/communities/${community}`);
        if (!communityResponse.ok) {
          if (communityResponse.status === 404) {
            router.push('/communities');
            return;
          }
          throw new Error('Failed to fetch community data');
        }
        const communityResult = await communityResponse.json();
        setCommunityData(communityResult.data);

        // Fetch community posts
        const postsResponse = await fetch(`/api/communities/${community}/posts?sort=${activeTab}&time=${timeFilter}`);
        if (postsResponse.ok) {
          const postsResult = await postsResponse.json();
          setCommunityPosts(postsResult.data || []);
        }

        // Check if user is a member and initialize governance contract
        if (isConnected && address && communityResult.data?.governanceToken) {
          const memberResponse = await fetch(`/api/communities/${community}/members/${address}`);
          if (memberResponse.ok) {
            const memberResult = await memberResponse.json();
            setUserJoined(memberResult.data?.isActive || false);
          }

          // Initialize governance contract
          if (window.ethereum) {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            await governanceContract.initialize(communityResult.data.treasuryAddress, provider);
            
            // Get token balances
            try {
              const balance = await governanceContract.getTokenBalance(address);
              const staked = await governanceContract.getStakedBalance(address);
              setTokenBalance(balance);
              setStakedBalance(staked);
            } catch (err) {
              console.error('Error fetching token balances:', err);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching community data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load community');
      } finally {
        setLoading(false);
      }
    };

    fetchCommunityData();
  }, [community, activeTab, timeFilter, isConnected, address, router]);

  // WebSocket real-time updates
  useEffect(() => {
    if (!community || typeof community !== 'string') return;

    communityWebSocket.connect(community);

    const handleNewPost = (post: any) => {
      setCommunityPosts(prev => [post, ...prev]);
      addToast('New post in community!', 'info');
      
      // Show push notification if enabled
      if (notificationsEnabled) {
        notificationService.showMessageNotification({
          id: post.id,
          fromAddress: post.author?.address || 'Unknown',
          toAddress: 'community',
          content: `New post in ${communityData?.displayName}: ${post.title}`,
          timestamp: new Date(),
          conversationId: community as string
        });
      }
    };

    const handleVoteUpdate = (update: any) => {
      setCommunityPosts(prev => 
        prev.map(post => 
          post.id === update.postId 
            ? { ...post, upvotes: update.upvotes, downvotes: update.downvotes }
            : post
        )
      );
    };

    const handleMemberUpdate = (update: any) => {
      if (communityData) {
        setCommunityData((prev: any) => ({
          ...prev!,
          memberCount: update.memberCount
        }));
      }
    };

    communityWebSocket.subscribe('new_post', handleNewPost);
    communityWebSocket.subscribe('vote_update', handleVoteUpdate);
    communityWebSocket.subscribe('member_joined', handleMemberUpdate);
    communityWebSocket.subscribe('member_left', handleMemberUpdate);

    return () => {
      communityWebSocket.unsubscribe('new_post', handleNewPost);
      communityWebSocket.unsubscribe('vote_update', handleVoteUpdate);
      communityWebSocket.unsubscribe('member_joined', handleMemberUpdate);
      communityWebSocket.unsubscribe('member_left', handleMemberUpdate);
      communityWebSocket.disconnect();
    };
  }, [community, communityData, addToast, notificationsEnabled]);

  // Initialize notifications
  useEffect(() => {
    const initNotifications = async () => {
        if (isConnected && address) {
          const hasPermission = await notificationService.requestPermission();
          if (hasPermission === 'granted') {
                        // Fix the subscribeToPush call - it expects a PushSubscription object
                        // For now, we'll just set the state directly since we don't have a proper subscription
                        setNotificationsEnabled(true);
          }
        }
      };

      initNotifications();
  }, [isConnected, address]);

  const handleJoinToggle = async () => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to join', 'error');
      return;
    }

    try {
      const method = userJoined ? 'DELETE' : 'POST';
      const response = await fetch(`/api/communities/${community}/members`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userAddress: address })
      });

      if (!response.ok) {
        throw new Error('Failed to update membership');
      }

      setUserJoined(!userJoined);
      addToast(
        userJoined 
          ? 'Left the community' 
          : 'Joined the community successfully!', 
        'success'
      );
    } catch (err) {
      console.error('Error updating membership:', err);
      addToast('Failed to update membership', 'error');
    }
  };

  const handleVote = async (postId: string, voteType: 'upvote' | 'downvote', stakeAmount?: string) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to vote', 'error');
      return;
    }
    
    try {
      // Stake tokens for voting if governance contract is available
      if (communityData?.treasuryAddress && stakeAmount) {
        const txHash = await governanceContract.stakeTokens(stakeAmount);
        addToast(`Tokens staked! Transaction: ${txHash.slice(0, 10)}...`, 'success');
      }

      const response = await fetch(`/api/posts/${postId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: voteType === 'upvote' ? 'hot' : 'diamond',
          amount: stakeAmount || '1',
          userAddress: address
        })
      });

      if (!response.ok) {
        throw new Error('Failed to vote');
      }

      addToast(`${voteType === 'upvote' ? 'Upvoted' : 'Downvoted'} with ${stakeAmount || '1'} tokens staked!`, 'success');
      
      // Refresh token balances
      if (communityData?.treasuryAddress && address) {
        const balance = await governanceContract.getTokenBalance(address);
        const staked = await governanceContract.getStakedBalance(address);
        setTokenBalance(balance);
        setStakedBalance(staked);
      }
      
      // Refresh posts to show updated vote counts
      const postsResponse = await fetch(`/api/communities/${community}/posts?sort=${activeTab}&time=${timeFilter}`);
      if (postsResponse.ok) {
        const postsResult = await postsResponse.json();
        setCommunityPosts(postsResult.data || []);
      }
    } catch (err) {
      console.error('Error voting:', err);
      addToast('Failed to vote', 'error');
    }
  };

  const handleTip = async (postId: string, amount: string, token: string) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to tip', 'error');
      return;
    }
    
    try {
      const response = await fetch(`/api/posts/${postId}/tips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          token,
          fromAddress: address,
          message: 'Great post!'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send tip');
      }

      addToast(`Successfully tipped ${amount} ${token}!`, 'success');
    } catch (err) {
      console.error('Error sending tip:', err);
      addToast('Failed to send tip', 'error');
    }
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
      
      {/* Three-Column Responsive Grid Layout */}
      <div className="grid grid-cols-12 gap-6 max-w-7xl mx-auto">
        {/* Left Sidebar (Navigation) */}
        <div className="col-span-12 md:col-span-3">
          <div className="sticky top-6 space-y-4">
            {/* Global Navigation */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Navigation</h3>
              <nav className="space-y-1">
                <Link href="/communities" className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded">
                  <span>🏠</span>
                  <span>Home</span>
                </Link>
                <Link href="/communities?sort=popular" className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded">
                  <span>🔥</span>
                  <span>Popular</span>
                </Link>
                <Link href="/communities?sort=top" className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded">
                  <span>🏆</span>
                  <span>Top</span>
                </Link>
                <Link href="/communities" className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded">
                  <span>🌐</span>
                  <span>All</span>
                </Link>
              </nav>
            </div>

            {/* Custom Feeds */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">Custom Feeds</h3>
                <button className="text-primary-600 hover:text-primary-700">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <button className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded">
                Create Custom Feed
              </button>
            </div>

            {/* Recent Communities */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Recent Communities</h3>
              <div className="space-y-2">
                <Link href={`/dao/${community}`} className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded">
                  <span>🍎</span>
                  <span>{communityData.displayName}</span>
                </Link>
                {/* Add more recent communities here */}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Feed (Posts) */}
        <div className="col-span-12 md:col-span-6">
          {/* Community Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-4 overflow-hidden">
            {/* Banner */}
            <div 
              className="h-32 bg-gradient-to-r from-primary-500 to-purple-600"
              style={{
                backgroundImage: communityData.banner ? `url(${communityData.banner})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
            
            {/* Community Info */}
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  {/* Circular logo/avatar */}
                  <div className="w-16 h-16 rounded-full bg-white dark:bg-gray-900 p-1 -mt-8">
                    <div className="w-full h-full rounded-full bg-gradient-to-r from-primary-500 to-purple-600 flex items-center justify-center text-2xl">
                      {communityData.avatar}
                    </div>
                  </div>
                  
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                      {communityData.displayName}
                      <span className="ml-2">🍎</span> {/* Apple logo emoji */}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                      r/{communityData.name}
                    </p>
                  </div>
                </div>
                
                {/* Right-aligned buttons */}
                <div className="flex items-center space-x-2">
                  {isConnected && (
                    <button 
                      onClick={() => setIsCreatePostOpen(true)}
                      className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Post</span>
                    </button>
                  )}
                  <button
                    onClick={handleJoinToggle}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      userJoined
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                  >
                    {userJoined ? 'Joined' : 'Join'}
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Community Description */}
              <p className="text-gray-700 dark:text-gray-300 mt-4">
                {communityData.description}
              </p>
              
              {/* Community Stats */}
              <div className="flex items-center space-x-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{communityData.memberCount.toLocaleString()} members</span>
                </span>
                <span>•</span>
                <span>{communityData.onlineCount.toLocaleString()} online</span>
              </div>
            </div>
          </div>

          {/* Sorting Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-4 p-4">
            <div className="flex items-center justify-between">
              <div className="flex space-x-1">
                {(['trending', 'latest', 'popular', 'featured'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab === 'trending' ? 'hot' : tab === 'latest' ? 'new' : tab === 'popular' ? 'top' : 'rising')}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      (tab === 'trending' && activeTab === 'hot') || 
                      (tab === 'latest' && activeTab === 'new') || 
                      (tab === 'popular' && activeTab === 'top') || 
                      (tab === 'featured' && activeTab === 'rising')
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    {tab === 'trending' && <Flame className="w-4 h-4" />}
                    {tab === 'latest' && <Clock className="w-4 h-4" />}
                    {tab === 'popular' && <TrendingUp className="w-4 h-4" />}
                    {tab === 'featured' && <Star className="w-4 h-4" />}
                    <span className="capitalize">{tab}</span>
                  </button>
                ))}
              </div>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as any)}
                className="text-sm border border-gray-300 rounded px-2 py-1 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="day">Past Day</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
                <option value="year">Past Year</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>

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
                <CommunityPostCardEnhanced
                  key={post.id}
                  post={post}
                  community={communityData}
                  userMembership={null}
                  onVote={(postId, voteType, stakeAmount) => {
                    // Convert the voteType to match our handleVote function
                    handleVote(postId, voteType, stakeAmount);
                  }}
                  onTip={handleTip}
                  className="mb-4"
                />
              ))
            )}
          </div>
        </div>

        {/* Right Sidebar (Community Info) */}
        <div className="col-span-12 md:col-span-3">
          <div className="sticky top-6 space-y-4">
            {/* Community Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">About Community</h3>
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
                {communityData.description}
              </p>
              
              {/* Stats */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Members</span>
                  <span className="font-medium text-gray-900 dark:text-white">{communityData.memberCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Created</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date(communityData.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Radar Filed</span>
                  <span className="font-medium text-gray-900 dark:text-white">124</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Radar Closed</span>
                  <span className="font-medium text-gray-900 dark:text-white">89</span>
                </div>
              </div>
              
              {/* User Flair */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">User Flair</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs rounded-full">
                    Contributor
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs rounded-full">
                    Verified
                  </span>
                </div>
              </div>
            </div>

            {/* Community Bookmarks */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Quick Links</h3>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded text-sm">
                  ❓ Questions
                </button>
                <button className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded text-sm">
                  📝 Applications
                </button>
                <button className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded text-sm">
                  📚 Libraries
                </button>
              </div>
            </div>

            {/* Moderators */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Moderators</h3>
              <div className="space-y-2">
                {communityData.moderators.slice(0, 3).map((mod: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
                      M
                    </div>
                    <span className="text-gray-900 dark:text-white">{mod}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
