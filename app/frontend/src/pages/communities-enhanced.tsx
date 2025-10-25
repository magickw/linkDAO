import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';

// Enhanced Components
import CommunityCardEnhanced from '@/components/Community/CommunityCardEnhanced';
import CommunityPostCardEnhanced from '@/components/Community/CommunityPostCardEnhanced';
import VirtualFeedEnhanced from '@/components/Feed/VirtualFeedEnhanced';
import { CommunityService } from '@/services/communityService';
import { Community } from '@/models/Community';
import { CommunityPost } from '@/models/CommunityPost';
import { CommunityMembership } from '@/models/CommunityMembership';

// Icons
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

// Types
import { FeedSortType } from '@/types/feed';

const CommunitiesEnhancedPage: React.FC = () => {
  const router = useRouter();
  const { isMobile, triggerHapticFeedback } = useMobileOptimization();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [sortBy, setSortBy] = useState<FeedSortType>(FeedSortType.HOT);
  const [timeFilter, setTimeFilter] = useState<'hour' | 'day' | 'week' | 'month' | 'year' | 'all'>('day');
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  
  // Web3 state
  const [walletConnected, setWalletConnected] = useState(false);
  const [userBalance, setUserBalance] = useState(1250);
  const [stakingRewards, setStakingRewards] = useState(45);
  const [governanceNotifications, setGovernanceNotifications] = useState(3);

  // Load communities on component mount
  useEffect(() => {
    const loadCommunities = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load communities with fallback for 503 errors
        let communitiesData = [];
        try {
          communitiesData = await CommunityService.getAllCommunities({
            isPublic: true,
            limit: 50
          });
        } catch (err) {
          console.error('Backend unavailable:', err);
          communitiesData = [];
        }
        setCommunities(communitiesData);
        
      } catch (err) {
        console.error('Error loading communities:', err);
        setError(err instanceof Error ? err.message : 'Failed to load communities');
        setCommunities([]);
      } finally {
        setLoading(false);
      }
    };

    loadCommunities();
  }, []);

  // Load posts from backend API with pagination
  const fetchPosts = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      
      // Mock posts for demonstration
      const mockPosts: CommunityPost[] = Array.from({ length: 20 }, (_, i) => ({
        id: `post-${pageNum}-${i}`,
        contentCid: `Content for post ${pageNum}-${i}`,
        author: `0x${Math.random().toString(16).substr(2, 40)}`,
        communityId: 'ethereum-builders',
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000)),
        updatedAt: new Date(),
        upvotes: Math.floor(Math.random() * 100),
        downvotes: Math.floor(Math.random() * 20),
        flair: Math.random() > 0.8 ? 'Verified' : undefined,
        isPinned: Math.random() > 0.9,
        isLocked: Math.random() > 0.95,
        tags: ['ethereum', 'development'].slice(0, Math.floor(Math.random() * 3)),
        mediaCids: [],
        onchainRef: Math.random() > 0.7 ? `0x${Math.random().toString(16).substr(2, 40)}:1` : undefined,
        comments: [],
        parentId: undefined,
        depth: 0,
        sortOrder: 0,
        title: `Post Title ${pageNum}-${i}`,
        views: Math.floor(Math.random() * 1000),
        shares: Math.floor(Math.random() * 50),
        engagementScore: Math.floor(Math.random() * 100),
        previews: [],
        socialProof: undefined,
        trendingStatus: undefined,
        isBookmarked: false,
        contentType: 'text',
        reactions: [],
        tips: [],
        stakedValue: 0,
        reputationScore: 0,
        dao: 'ethereum-builders'
      }));
      
      if (append) {
        setPosts(prev => [...prev, ...mockPosts]);
      } else {
        setPosts(mockPosts);
      }
      
      setHasMore(mockPosts.length === 20);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      if (!append) setPosts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPosts(1, false);
  }, [sortBy, timeFilter]);

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop !== document.documentElement.offsetHeight || loadingMore || !hasMore) {
        return;
      }
      fetchPosts(page + 1, true);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [page, loadingMore, hasMore]);

  const handleJoinCommunity = async (communityId: string) => {
    try {
      if (joinedCommunities.includes(communityId)) {
        // Leave community
        setJoinedCommunities(prev => prev.filter(id => id !== communityId));
      } else {
        // Join community
        setJoinedCommunities(prev => [...prev, communityId]);
      }
      if (isMobile) triggerHapticFeedback('success');
    } catch (err) {
      console.error('Error joining/leaving community:', err);
    }
  };

  const handleVote = (postId: string, type: 'upvote' | 'downvote', amount?: string) => {
    if (isMobile) {
      triggerHapticFeedback('medium');
    }
    setPosts(prev => prev.map(post => {
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

  const handleCommunitySelect = (community: Community) => {
    router.push(`/dao/${community.name || community.id}`);
  };

  const handleCreatePost = () => {
    router.push('/create-post');
  };

  // Defensive: normalize communities to array for rendering
  const communityList: Community[] = Array.isArray(communities) ? communities : [];

  return (
    <Layout title="Communities - LinkDAO Enhanced" fullWidth={true}>
      <Head>
        <meta name="description" content="Discover and join decentralized communities with enhanced Web3 features" />
      </Head>

      <div className="grid grid-cols-12 gap-6 w-full px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl pt-6">
        {/* Left Sidebar - Communities List */}
        <div className="col-span-12 lg:col-span-3">
          <div className="sticky top-24 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Communities</h2>
                <button 
                  onClick={handleCreatePost}
                  className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  aria-label="Create community"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <CommunityCardEnhanced
                      key={index}
                      community={{} as Community}
                      isLoading={true}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                  {communityList.map(community => (
                    <CommunityCardEnhanced
                      key={community.id}
                      community={community}
                      onSelect={handleCommunitySelect}
                      onJoin={handleJoinCommunity}
                      showTrendingInfo={true}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center Feed */}
        <div className="col-span-12 lg:col-span-6">
          {/* Sorting Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {(['hot', 'new', 'top'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setSortBy(tab as FeedSortType)}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      sortBy === tab
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                    aria-label={`Sort by ${tab}`}
                  >
                    {tab === 'hot' && <Flame className="w-4 h-4" />}
                    {tab === 'new' && <Clock className="w-4 h-4" />}
                    {tab === 'top' && <TrendingUp className="w-4 h-4" />}
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

          {/* Posts Feed */}
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <CommunityPostCardEnhanced
                    key={index}
                    post={{} as CommunityPost}
                    community={{} as Community}
                    userMembership={null}
                    onVote={handleVote}
                    isLoading={true}
                  />
                ))}
              </div>
            ) : error ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                <div className="mx-auto h-12 w-12 text-red-500 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Error Loading Posts</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {error}
                </p>
                <button 
                  onClick={() => { setError(null); fetchPosts(1, false); }}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                >
                  Try Again
                </button>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                <MessageCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No posts yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Be the first to start a discussion!
                </p>
                <button 
                  onClick={handleCreatePost}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                >
                  Create First Post
                </button>
              </div>
            ) : (
              <VirtualFeedEnhanced
                posts={posts}
                community={communityList[0] || ({} as Community)}
                userMembership={null}
                onVote={handleVote}
                height={600}
                itemHeight={300}
              />
            )}

            {/* Load More Indicator */}
            {loadingMore && (
              <div className="flex justify-center py-8">
                <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600" />
                  <span>Loading more posts...</span>
                </div>
              </div>
            )}

            {/* End of Feed Indicator */}
            {!loading && !loadingMore && !hasMore && posts.length > 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  You've reached the end! 🎉
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Community Info */}
        <div className="col-span-12 lg:col-span-3">
          <div className="sticky top-24 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Your Communities</h3>
              {joinedCommunities.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">You haven't joined any communities yet.</p>
              ) : (
                <div className="space-y-2">
                  {communityList
                    .filter(community => joinedCommunities.includes(community.id))
                    .map(community => (
                      <div 
                        key={community.id} 
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                        onClick={() => handleCommunitySelect(community)}
                      >
                        <div className="text-lg">{community.avatar || '🏛️'}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {community.displayName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {community.memberCount} members
                          </p>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Community Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Communities</span>
                  <span className="font-medium text-gray-900 dark:text-white">{communities.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Joined Communities</span>
                  <span className="font-medium text-gray-900 dark:text-white">{joinedCommunities.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Posts</span>
                  <span className="font-medium text-gray-900 dark:text-white">{posts.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CommunitiesEnhancedPage;