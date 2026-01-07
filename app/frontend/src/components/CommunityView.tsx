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
  Star,
  Settings
} from 'lucide-react';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { CommunityService } from '@/services/communityService';
import { PostService } from '@/services/postService';
import enhancedUserService from '@/services/enhancedUserService';
import { useWeb3 } from '@/context/Web3Context';
import { Community } from '@/models/Community';
import CommunitySettingsModal from './CommunityManagement/CommunitySettingsModal';
import CommunityPostCreator from './Community/CommunityPostCreator';
import CommunityPostCardEnhanced from './Community/CommunityPostCardEnhanced';
import CommunityAvatar from './Community/CommunityAvatar';
import { EnhancedProposalCard } from './Governance/EnhancedProposalCard';
import { useVotingPower } from '@/hooks/useGovernanceContract';
import { Proposal } from '@/types/governance';
import PinnedPostsSection from './Community/PinnedPostsSection';

interface CommunityViewProps {
  communitySlug: string;
  highlightedPostId?: string;
  className?: string;
}

export default function CommunityView({ communitySlug, highlightedPostId, className = '' }: CommunityViewProps) {
  const { isMobile } = useMobileOptimization();
  const router = useRouter();
  const { address, isConnected } = useWeb3();
  const [communityData, setCommunityData] = useState<Community | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top' | 'rising'>('hot');
  const [timeFilter, setTimeFilter] = useState<'hour' | 'day' | 'week' | 'month' | 'year' | 'all'>('day');
  const [isJoined, setIsJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPostCreator, setShowPostCreator] = useState(false);
  const [moderatorProfiles, setModeratorProfiles] = useState<Record<string, { handle?: string }>>({});

  // Determine member role - creators are always admins
  const isCreatorCheck = isConnected && address && communityData?.creatorAddress?.toLowerCase() === address.toLowerCase();
  const isModeratorCheck = isConnected && address && (communityData?.moderators || []).some(
    mod => mod.toLowerCase() === address.toLowerCase()
  );

  // Priority: creator > backend memberRole > moderator check > default member
  const memberRole = isCreatorCheck
    ? 'admin'
    : communityData?.memberRole || (isModeratorCheck ? 'admin' : 'member');

  const canEditCommunity = isConnected && address && (isCreatorCheck || memberRole === 'admin');
  const isCommunityCreator = isCreatorCheck;

  useEffect(() => {
    const fetchCommunityData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Better approach: Try to fetch by slug first, and only try by ID if slug returns null
        let data = null;

        // Try fetching by slug first (most common case for user navigation)
        data = await CommunityService.getCommunityBySlug(communitySlug);

        // If slug fetch didn't work (returned null), try by ID if it looks like a UUID
        if (!data) {
          // Check if it looks like a UUID before trying
          const isUuidFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(communitySlug);
          if (isUuidFormat) {
            data = await CommunityService.getCommunityById(communitySlug);
          }
        }

        if (!data) {
          setError('Community not found');
          setCommunityData(null);
          setPosts([]);
          return;
        }

        // Ensure community data has all required properties with defaults
        const processedCommunityData = {
          ...data,
          displayName: data.displayName || data.name || 'Unnamed Community',
          description: data.description || 'No description available',
          memberCount: typeof data.memberCount === 'number' ? data.memberCount : 0,
          avatar: data.avatar || '🏛️',
          rules: Array.isArray(data.rules) ? data.rules : [],
          moderators: Array.isArray(data.moderators) ? data.moderators : [],
          createdAt: data.createdAt || new Date(),
          onlineMemberCount: typeof data.onlineMemberCount === 'number' ? data.onlineMemberCount : 0
        };

        setCommunityData(processedCommunityData);

        // Set joined status - creators are always members
        const isCreator = processedCommunityData.creatorAddress?.toLowerCase() === address?.toLowerCase();
        const isMod = (processedCommunityData.moderators || []).some(
          mod => mod.toLowerCase() === address?.toLowerCase()
        );

        // If user is creator or moderator, they are automatically joined
        if (isCreator || isMod) {
          setIsJoined(true);
        } else if (processedCommunityData.isMember !== undefined) {
          // Otherwise use backend data if available
          setIsJoined(processedCommunityData.isMember);
        } else {
          // Default to not joined
          setIsJoined(false);
        }

        // Fetch real posts for the community
        const communityPosts = await PostService.getPostsByCommunity(data.id);
        setPosts(communityPosts || []); // Ensure posts is always an array
      } catch (err) {
        console.error('Error fetching community data:', err);
        // Provide a more user-friendly error message that accounts for network issues
        const errorMessage = err instanceof Error
          ? err.message
          : 'Failed to load community. Please check your connection and try again.';
        setError(errorMessage);
        setCommunityData(null);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    if (communitySlug) {
      fetchCommunityData();
    }
  }, [communitySlug, address, isConnected]);

  // Fetch moderator profiles when community data changes
  useEffect(() => {
    const fetchModeratorProfiles = async () => {
      if (!communityData?.moderators || communityData.moderators.length === 0) {
        setModeratorProfiles({});
        return;
      }

      const profiles: Record<string, { handle?: string }> = {};

      for (const modAddress of communityData.moderators) {
        try {
          const profile = await enhancedUserService.getUserProfileByAddress(modAddress);
          if (profile) {
            profiles[modAddress] = {
              handle: profile.handle
            };
          }
        } catch (error) {
          console.error(`Error fetching profile for ${modAddress}:`, error);
        }
      }

      setModeratorProfiles(profiles);
    };

    fetchModeratorProfiles();
  }, [communityData?.moderators]);

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

  const handleCreatePost = () => {
    // Show the inline post creator modal instead of redirecting
    setShowPostCreator(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading community...</p>
        </div>
      </div>
    );
  }

  if (error || !communityData) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {error || 'Community Not Found'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error
              ? 'There was an issue loading this community. The community may not exist or there might be a temporary server issue.'
              : 'The community you are looking for could not be found.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push('/communities')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
            >
              ← Back to Communities
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-center dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-6 w-full px-0 sm:px-2 lg:px-4 mx-auto max-w-screen-2xl pt-0 lg:pt-6 ${className}`}>
      {/* Left Sidebar - Navigation - Hidden on mobile */}
      <div className="hidden lg:block lg:col-span-3">
        <div className="sticky top-24 space-y-4">
          {/* Community Navigation */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
              {communityData.displayName || communityData.name}
            </h3>
            <button
              onClick={() => router.push('/communities')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← Back to Communities
            </button>
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
      <div className="col-span-1 lg:col-span-6">
        {/* Reddit-style Community Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-4 overflow-hidden">
          <div
            className="h-32 bg-gradient-to-r from-blue-500 to-purple-600"
            style={{
              backgroundImage: communityData.banner ? `url(${communityData.banner})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4 -mt-12">
                <div className="bg-white dark:bg-gray-800 rounded-full p-1 border-4 border-white dark:border-gray-800">
                  <CommunityAvatar
                    avatar={communityData?.avatar}
                    name={communityData?.displayName || communityData?.name || 'Community'}
                    size="xl"
                  />
                </div>
                <div className="mt-8">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {communityData?.displayName || communityData?.name || 'Unnamed Community'}
                  </h1>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>
                        {(typeof communityData?.memberCount === 'number' ? communityData.memberCount : 0).toLocaleString()} members
                      </span>
                    </span>
                    <span>•</span>
                    <span>{typeof communityData?.onlineMemberCount === 'number' ? communityData.onlineMemberCount : 0} online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 mt-8">
                {/* Only show join button if user is not the creator */}
                {!isCommunityCreator && (
                  <button
                    onClick={async () => {
                      if (!isConnected || !address) {
                        alert('Please connect your wallet to join this community');
                        return;
                      }

                      if (!communityData?.id) {
                        alert('Community data not loaded');
                        return;
                      }

                      try {
                        if (isJoined) {
                          const success = await CommunityService.leaveCommunity(communityData.id);
                          if (success) {
                            setIsJoined(false);
                            console.log('✅ Successfully left community');
                          } else {
                            alert('Failed to leave community. Please try again.');
                          }
                        } else {
                          const success = await CommunityService.joinCommunity(communityData.id);
                          if (success) {
                            setIsJoined(true);
                            console.log('✅ Successfully joined community');
                          } else {
                            alert('Failed to join community. Please try again.');
                          }
                        }
                      } catch (error) {
                        console.error('Error toggling membership:', error);
                        alert('An error occurred. Please try again.');
                      }
                    }}
                    className={`px-4 py-1.5 rounded-full font-medium text-sm transition-colors ${isJoined
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                  >
                    {isJoined ? 'Joined' : 'Join'}
                  </button>
                )}
                {/* Show edit button if user is admin */}
                {canEditCommunity && (
                  <button
                    onClick={() => setShowSettingsModal(true)}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    title="Edit Community Settings"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="p-4">
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              {communityData?.description || 'No description available'}
            </p>
          </div>
        </div>

        {/* Reddit-style Post Creation & Sorting */}
        <div className="bg-white dark:bg-gray-800 rounded-t-lg shadow-sm border border-gray-200 dark:border-gray-700 border-b-0">
          {/* Sorting Tabs */}
          <div className="flex items-center justify-between p-3">
            <div className="flex space-x-1">
              {(['hot', 'new', 'top', 'rising'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSortBy(tab)}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${sortBy === tab
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                    }`}
                >
                  {tab === 'hot' && <Flame className="w-3.5 h-3.5" />}
                  {tab === 'new' && <Clock className="w-3.5 h-3.5" />}
                  {tab === 'top' && <TrendingUp className="w-3.5 h-3.5" />}
                  {tab === 'rising' && <Star className="w-3.5 h-3.5" />}
                  <span className="capitalize">{tab}</span>
                </button>
              ))}
            </div>
            {sortBy === 'top' && (
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as any)}
                className={`text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 dark:text-white ${sortBy !== 'top' ? 'hidden' : ''
                  }`}
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

        {/* Create Post Card - Reddit Style */}
        <div className="bg-white dark:bg-gray-800 rounded-b-lg shadow-sm border border-t-0 border-gray-200 dark:border-gray-700 mb-4">
          <div className="p-3">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {isConnected ? 'U' : '+'}
              </div>
              <div className="flex-1">
                <button
                  onClick={handleCreatePost}
                  className="w-full text-left text-gray-500 dark:text-gray-400 text-sm placeholder-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Create a post in {communityData.displayName || communityData.name}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Post Creator Modal */}
        {showPostCreator && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CommunityPostCreator
                communityId={communityData.id}
                communityName={communityData.displayName || communityData.name}
                onPostCreated={() => {
                  setShowPostCreator(false);
                  // Refresh posts by fetching them again
                  if (communityData?.id) {
                    PostService.getPostsByCommunity(communityData.id).then(newPosts => {
                      setPosts(newPosts || []);
                    });
                  }
                }}
                onCancel={() => setShowPostCreator(false)}
              />
            </div>
          </div>
        )}

        {/* Pinned Posts Section */}
        <PinnedPostsSection
          communityId={communityData.id}
          community={communityData}
          userMembership={isJoined ? {
            id: 'temp-membership-id',
            userId: address || '',
            communityId: communityData.id,
            role: memberRole as any,
            joinedAt: new Date(),
            reputation: 0,
            contributions: 0,
            isActive: true,
            lastActivityAt: new Date()
          } : null}
          onVote={(postId, voteType, stakeAmount) => handleVote(postId, voteType === 'upvote' ? 'up' : 'down')}
          onReaction={async (postId, type, amount) => {
            console.log('Reaction:', postId, type, amount);
          }}
          onTip={async (postId, amount, token) => {
            console.log('Tip:', postId, amount, token);
          }}
        />

        {/* Reddit-style Posts Feed */}
        <div className="space-y-0">
          {Array.isArray(posts) && posts.length > 0 ? (
            posts.map(post => (
              <CommunityPostCardEnhanced
                key={post.id}
                post={{
                  ...post,
                  // Ensure compatibility with EnhancedPost interface
                  author: post.author || post.authorAddress || '',
                  contentCid: post.contentCid || post.content || '',
                  mediaCids: post.mediaCids || [],
                  tags: post.tags || [],
                  reactions: post.reactions || [],
                  tips: post.tips || [],
                  comments: typeof post.commentCount === 'number' ? post.commentCount : (post.comments?.length || 0),
                  shares: post.shares || 0,
                  views: post.views || 0,
                  engagementScore: post.engagementScore || 0,
                  createdAt: new Date(post.createdAt),
                  updatedAt: new Date(post.updatedAt || post.createdAt),
                  onchainRef: post.onchainRef || '',
                  stakedValue: parseFloat(post.stakedValue || '0'),
                  reputationScore: post.reputationScore || 0,
                  // Community specific fields
                  flair: post.flair,
                  isPinned: post.isPinned,
                  isLocked: post.isLocked,
                  upvotes: post.upvotes || 0,
                  downvotes: post.downvotes || 0,
                  isStatus: false
                }}
                community={communityData}
                userMembership={isJoined ? {
                  id: 'temp-membership-id',
                  userId: address || '',
                  communityId: communityData.id,
                  role: memberRole as any,
                  joinedAt: new Date(),
                  reputation: 0,
                  contributions: 0,
                  isActive: true,
                  lastActivityAt: new Date()
                } : null}
                onVote={(postId, voteType, stakeAmount) => handleVote(postId, voteType === 'upvote' ? 'up' : 'down')}
                onReaction={async (postId, type, amount) => {
                  console.log('Reaction:', postId, type, amount);
                }}
                onTip={async (postId, amount, token) => {
                  console.log('Tip:', postId, amount, token);
                }}
                className={`mb-4 ${highlightedPostId === post.id ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
              />
            ))
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
              <MessageCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No posts yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Be the first to start a discussion in this community!
              </p>
              <button
                onClick={handleCreatePost}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Create First Post
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Community Info */}
      <div className="hidden lg:block lg:col-span-3">
        <div className="sticky top-6 space-y-4">
          {/* Reddit-style About Community */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm uppercase tracking-wide">
              About Community
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              {communityData?.description || 'No description available'}
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Members</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {(typeof communityData?.memberCount === 'number' ? communityData.memberCount : 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Online</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {typeof communityData?.onlineMemberCount === 'number' ? communityData.onlineMemberCount : 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Created</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {communityData?.createdAt ? new Date(communityData.createdAt).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2 text-xs uppercase tracking-wide">Community Rules</h4>
              <div className="space-y-1">
                {Array.isArray(communityData?.rules) ? communityData.rules.map((rule, index) => (
                  <div key={index} className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-medium">{index + 1}.</span> {rule}
                  </div>
                )) : (
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    No rules defined
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Live Governance Proposals */}
          {/* Live Governance Proposals */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center space-x-1 uppercase tracking-wide">
                <Vote className="w-3 h-3" />
                <span>Live Governance</span>
              </h3>
              {isConnected && (
                <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                  Power: {1250}
                </span>
              )}
            </div>
            <div className="space-y-3">
              {/* Mock Proposal 1 */}
              <EnhancedProposalCard
                proposal={{
                  id: '42',
                  title: 'Treasury Allocation',
                  description: 'Allocate 50k LDAO for community grants',
                  type: 'treasury',
                  proposer: '0x123...',
                  status: 'active',
                  forVotes: '78000',
                  againstVotes: '22000',
                  abstainVotes: '0',
                  quorum: '100000',
                  participationRate: 15,
                  startTime: new Date(),
                  endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days left
                }}
                userVote="For"
                onClick={() => console.log('Clicked proposal 42')}
              />

              {/* Mock Proposal 2 */}
              <EnhancedProposalCard
                proposal={{
                  id: '43',
                  title: 'Protocol Upgrade v2.1',
                  description: 'Implement new staking mechanics',
                  type: 'upgrade',
                  proposer: '0x456...',
                  status: 'active',
                  forVotes: '65000',
                  againstVotes: '35000',
                  abstainVotes: '5000',
                  quorum: '100000',
                  participationRate: 12,
                  startTime: new Date(),
                  endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days left
                }}
                onClick={() => console.log('Clicked proposal 43')}
              />
            </div>
            <div className="mt-3 text-center">
              <button
                onClick={() => router.push('/governance')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                View all proposals
              </button>
            </div>
          </div>

          {/* Live Token Price */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm flex items-center space-x-1 uppercase tracking-wide">
              <Coins className="w-3 h-3" />
              <span>Token Price</span>
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400 text-xs">LDAO</span>
                <span className="font-medium text-green-600 dark:text-green-400 text-xs">+2.4%</span>
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">$12.45</div>
              <div className="h-12 flex items-end">
                <div className="flex items-end space-x-0.5 w-full">
                  {[65, 70, 68, 75, 72, 80, 78, 82, 85, 83, 88, 90].map((value, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-t from-blue-500 to-purple-500 rounded-t flex-1"
                      style={{ height: `${value}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex text-xs text-gray-500 dark:text-gray-400 justify-between">
                <span>$10.2</span>
                <span>$15.6</span>
              </div>
            </div>
          </div>

          {/* Moderators */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm flex items-center space-x-1 uppercase tracking-wide">
              <Shield className="w-3 h-3" />
              <span>Moderators</span>
            </h3>
            <div className="space-y-1">
              {Array.isArray(communityData?.moderators) && communityData.moderators.length > 0 ? (
                communityData.moderators.map((modAddress, index) => {
                  const profile = moderatorProfiles[modAddress];
                  const displayName = profile?.handle
                    ? `u/${profile.handle}`
                    : `${modAddress.slice(0, 6)}...${modAddress.slice(-4)}`;

                  return (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-gray-900 dark:text-white truncate" title={modAddress}>
                        {displayName}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">Moderator</span>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  No moderators assigned
                </div>
              )}
            </div>
          </div>

          {/* User Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm flex items-center space-x-1 uppercase tracking-wide">
              <Trophy className="w-3 h-3" />
              <span>Your Stats</span>
            </h3>
            <div className="space-y-2 text-xs">
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

      {/* Community Settings Modal */}
      {showSettingsModal && communityData && (
        <CommunitySettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          community={communityData}
          onUpdate={(updatedCommunity) => {
            setCommunityData(updatedCommunity);
            setShowSettingsModal(false);
          }}
        />
      )}
    </div>
  );
}
