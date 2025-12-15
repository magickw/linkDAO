import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import { useFollowCount } from '@/hooks/useFollow';
import { usePostsByAuthor } from '@/hooks/usePosts';
import { useFollow, useFollowStatus } from '@/hooks/useFollow';
import { useBlock, useBlockStatus } from '@/hooks/useBlock';
import { useAuth } from '@/hooks/useAuth';
import FollowerList from '@/components/FollowerList';
import FollowingList from '@/components/FollowingList';
import TipBar from '@/components/TipBar';
import Link from 'next/link';
import { PublicProfileService, PublicProfileData } from '@/services/publicProfileService';

// Helper function to validate IPFS CID and construct proper URL
function getAvatarUrl(profileCid: string | undefined): string | undefined {
  if (!profileCid) return undefined;

  // Check if it's a valid IPFS CID
  if (profileCid.startsWith('Qm') || profileCid.startsWith('bafy')) {
    return `https://ipfs.io/ipfs/${profileCid}`;
  }

  // Check if it's already a full URL
  try {
    new URL(profileCid);
    return profileCid;
  } catch {
    // Not a valid URL, return undefined
    return undefined;
  }
}

// Default avatar component
const DefaultAvatar = () => (
  <div className="h-full w-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
    <svg className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  </div>
);



export default function PublicProfile() {
  const router = useRouter();
  const { walletAddress } = router.query;
  const { address: currentUserAddress, isConnected } = useWeb3();
  const { addToast } = useToast();
  const { isAuthenticated } = useAuth();

  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'followers' | 'following' | 'social' | 'comments' | 'upvotes' | 'downvotes'>('posts');

  // Follow/unfollow functionality
  const { follow, unfollow, isLoading: isFollowLoading } = useFollow();
  const { data: isFollowing, isLoading: isFollowStatusLoading } = useFollowStatus(
    currentUserAddress || '',
    typeof walletAddress === 'string' ? walletAddress : ''
  );

  // Block/unblock functionality
  const { block, unblock, isLoading: isBlockLoading } = useBlock();
  const { data: isBlocked, isLoading: isBlockStatusLoading } = useBlockStatus(
    currentUserAddress || '',
    typeof walletAddress === 'string' ? walletAddress : ''
  );

  // Follow count data
  const { data: followCount, isLoading: isFollowCountLoading, refetch: refetchFollowCount } = useFollowCount(
    typeof walletAddress === 'string' ? walletAddress : ''
  );

  // Posts data
  const { posts: rawPosts, isLoading: isPostsLoading, error: postsError, refetch: refetchPosts } = usePostsByAuthor(
    typeof walletAddress === 'string' ? walletAddress : ''
  );
  const posts = Array.isArray(rawPosts) ? rawPosts : [];

  // Cache for post content to avoid repeated fetches
  const [postContentCache, setPostContentCache] = useState<Record<string, string>>({});

  // Fetch public profile data
  useEffect(() => {
    if (!walletAddress || typeof walletAddress !== 'string') return;

    const fetchPublicProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const profileData = await PublicProfileService.getPublicProfile(walletAddress);

        if (!profileData) {
          throw new Error('Profile not found');
        }

        setProfile(profileData);
        setAvatarError(false);
      } catch (err) {
        console.error('Error fetching public profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPublicProfile();
  }, [walletAddress]);

  // Handle follow/unfollow actions
  const handleFollow = async () => {
    if (!currentUserAddress || !walletAddress || typeof walletAddress !== 'string') {
      addToast('Please connect your wallet first', 'error');
      return;
    }

    if (!isAuthenticated) {
      addToast('Please authenticate with your wallet first', 'error');
      return;
    }

    if (currentUserAddress === walletAddress) {
      addToast('You cannot follow yourself', 'error');
      return;
    }

    try {
      await follow({ follower: currentUserAddress, following: walletAddress });
      addToast(`Successfully followed ${profile?.handle || walletAddress}`, 'success');
      // Manually refetch follow count to ensure header updates
      refetchFollowCount();
    } catch (error) {
      console.error('Error following user:', error);
      addToast(`Failed to follow user: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleUnfollow = async () => {
    if (!currentUserAddress || !walletAddress || typeof walletAddress !== 'string') {
      addToast('Please connect your wallet first', 'error');
      return;
    }

    if (!isAuthenticated) {
      addToast('Please authenticate with your wallet first', 'error');
      return;
    }

    if (currentUserAddress === walletAddress) {
      addToast('You cannot unfollow yourself', 'error');
      return;
    }

    try {
      await unfollow({ follower: currentUserAddress, following: walletAddress });
      addToast(`Successfully unfollowed ${profile?.handle || walletAddress}`, 'success');
      // Manually refetch follow count to ensure header updates
      refetchFollowCount();
    } catch (error) {
      console.error('Error unfollowing user:', error);
      addToast(`Failed to unfollow user: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  // Handle block/unblock actions
  const handleBlock = async () => {
    if (!currentUserAddress || !walletAddress || typeof walletAddress !== 'string') {
      addToast('Please connect your wallet first', 'error');
      return;
    }

    if (!isAuthenticated) {
      addToast('Please authenticate with your wallet first', 'error');
      return;
    }

    if (currentUserAddress === walletAddress) {
      addToast('You cannot block yourself', 'error');
      return;
    }

    try {
      await block({ blocker: currentUserAddress, blocked: walletAddress });
      addToast(`Successfully blocked ${profile?.handle || walletAddress}`, 'success');
    } catch (error) {
      console.error('Error blocking user:', error);
      addToast(`Failed to block user: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleUnblock = async () => {
    if (!currentUserAddress || !walletAddress || typeof walletAddress !== 'string') {
      addToast('Please connect your wallet first', 'error');
      return;
    }

    if (!isAuthenticated) {
      addToast('Please authenticate with your wallet first', 'error');
      return;
    }

    if (currentUserAddress === walletAddress) {
      addToast('You cannot unblock yourself', 'error');
      return;
    }

    try {
      await unblock({ blocker: currentUserAddress, blocked: walletAddress });
      addToast(`Successfully unblocked ${profile?.handle || walletAddress}`, 'success');
    } catch (error) {
      console.error('Error unblocking user:', error);
      addToast(`Failed to unblock user: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  // Get post content preview by fetching from IPFS
  const getPostContentPreview = (post: any) => {
    // If we already have the content in cache, return it
    if (postContentCache[post.id]) {
      return postContentCache[post.id];
    }

    // If the post has direct content (not a CID), return it
    if (post.content && typeof post.content === 'string' && !post.content.startsWith('Qm') && !post.content.startsWith('baf')) {
      return post.content;
    }

    // If no content CID or CID is not valid IPFS format, use direct content
    if (!post.contentCid || (!post.contentCid.startsWith('Qm') && !post.contentCid.startsWith('baf'))) {
      // Try to use post.content if available
      if (post.content) {
        return post.content;
      }
      return '';
    }

    // If it looks like a valid IPFS CID, fetch the content
    if (post.contentCid.startsWith('Qm') || post.contentCid.startsWith('baf')) {
      // Fetch content from backend API that proxies IPFS
      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000'}/api/feed/content/${post.contentCid}`)
        .then(async response => {
          if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              return response.json();
            } else {
              // Handle text response
              const text = await response.text();
              return { content: text };
            }
          }
          throw new Error('Failed to fetch content');
        })
        .then(data => {
          const content = data.data?.content || data.content || 'Content not available';
          // Cache the content
          setPostContentCache(prev => ({ ...prev, [post.id]: content }));
          // Force a re-render by updating state
          setPostContentCache(currentCache => ({ ...currentCache }));
          return content;
        })
        .catch(error => {
          console.error('Error fetching post content:', error);
          // Cache the error state to prevent repeated fetches
          setPostContentCache(prev => ({ ...prev, [post.id]: 'Content not available' }));
          return 'Content not available';
        });

      // Return loading state while fetching
      return 'Loading content...';
    }

    // If it's already content (not a CID), return as is
    return post.contentCid || post.content || '';
  };

  // Format wallet address for display
  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // Copy address to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Address copied to clipboard!', 'success');
  };

  if (isLoading) {
    return (
      <Layout title="Public Profile - LinkDAO" fullWidth={true}>
        <div className="px-4 py-6 sm:px-0">
          <div className="animate-pulse">
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-900/30 dark:to-purple-900/30 backdrop-blur-lg rounded-2xl shadow-xl border border-white/30 dark:border-gray-700/50 p-6 mb-6">
              <div className="flex flex-col lg:flex-row items-center lg:items-start">
                <div className="flex-shrink-0 mb-6 lg:mb-0 lg:mr-8">
                  <div className="h-32 w-32 md:h-40 md:w-40 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                </div>
                <div className="text-center lg:text-left flex-1 w-full">
                  <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                  <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Public Profile - LinkDAO" fullWidth={true}>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Profile Not Found</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout title="Public Profile - LinkDAO" fullWidth={true}>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Profile Not Found</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-4">This user has not set up their profile yet.</p>
            <button
              onClick={() => router.push('/')}
              className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`${profile.displayName || profile.handle || 'User'} - LinkDAO`} fullWidth={true}>
      <div className="px-4 py-6 sm:px-0">
        {/* Profile Header with Glassmorphism Effect */}
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-900/30 dark:to-purple-900/30 backdrop-blur-lg rounded-2xl shadow-xl border border-white/30 dark:border-gray-700/50 overflow-hidden mb-6">
          {/* Banner Image */}
          {profile.bannerCid && (
            <div className="w-full h-48 md:h-64 overflow-hidden relative">
              <img
                src={profile.bannerCid}
                alt="Profile Banner"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20"></div>
            </div>
          )}

          <div className={`flex flex-col lg:flex-row items-center lg:items-start p-6 ${profile.bannerCid ? '-mt-16' : ''}`}>
            <div className="flex-shrink-0 mb-6 lg:mb-0 lg:mr-8">
              <div className="relative">
                <div className={`h-32 w-32 md:h-40 md:w-40 rounded-full border-4 ${profile.bannerCid ? 'border-white dark:border-gray-800' : 'border-white dark:border-gray-700'} shadow-xl overflow-hidden ${profile.bannerCid ? 'ring-4 ring-white/20' : ''}`}>
                  {(profile.avatarCid && !avatarError && typeof profile.avatarCid === 'string' && profile.avatarCid.startsWith('http')) ? (
                    <img
                      className="h-full w-full object-cover"
                      src={profile.avatarCid}
                      alt={profile.handle}
                      onError={() => {
                        console.error('Avatar image failed to load:', profile.avatarCid);
                        setAvatarError(true);
                      }}
                      onLoad={() => {
                        // Reset avatar error when image loads successfully
                        if (avatarError) {
                          setAvatarError(false);
                        }
                      }}
                    />
                  ) : (
                    <DefaultAvatar />
                  )}
                </div>
                <div className="absolute bottom-2 right-2 bg-primary-500 rounded-full p-2 shadow-lg">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="text-center lg:text-left flex-1 w-full">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {profile.displayName || profile.handle || 'Anonymous User'}
                  </h2>
                  {profile.handle && profile.displayName && (
                    <p className="text-xl text-gray-600 dark:text-gray-300 mt-1">@{profile.handle}</p>
                  )}
                  {profile.ens && !profile.displayName && (
                    <p className="text-xl text-gray-600 dark:text-gray-300 mt-1">{profile.ens}</p>
                  )}

                  {/* Wallet Address */}
                  <div className="flex items-center justify-center lg:justify-start mt-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                      {formatAddress(profile.walletAddress)}
                    </span>
                    <button
                      onClick={() => copyToClipboard(profile.walletAddress)}
                      className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      title="Copy address"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 mt-4 lg:mt-0">
                  {/* Follow/Unfollow Button - Only show if not viewing own profile */}
                  {currentUserAddress && currentUserAddress !== profile.walletAddress && (
                    <>
                      <button
                        onClick={isFollowing ? handleUnfollow : handleFollow}
                        disabled={isFollowLoading || isFollowStatusLoading}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${isFollowing
                          ? 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                          : 'bg-primary-500 hover:bg-primary-600 text-white'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isFollowLoading || isFollowStatusLoading
                          ? 'Loading...'
                          : isFollowing
                            ? 'Following'
                            : 'Follow'
                        }
                      </button>

                      {/* Block/Unblock Button */}
                      <button
                        onClick={isBlocked ? handleUnblock : handleBlock}
                        disabled={isBlockLoading || isBlockStatusLoading}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${isBlocked
                          ? 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                          : 'bg-red-500 hover:bg-red-600 text-white'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isBlockLoading || isBlockStatusLoading
                          ? 'Loading...'
                          : isBlocked
                            ? 'Unblock'
                            : 'Block'
                        }
                      </button>

                      {/* Message Button */}
                      <button
                        onClick={() => router.push(`/messages?to=${encodeURIComponent(profile.walletAddress)}`)}
                        className="inline-flex items-center justify-center px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Message
                      </button>
                    </>
                  )}

                  {/* Share Profile Button */}
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: `${profile.displayName || profile.handle} on LinkDAO`,
                          text: `Check out ${profile.displayName || profile.handle}'s profile on LinkDAO`,
                          url: window.location.href,
                        });
                      } else {
                        copyToClipboard(window.location.href);
                        addToast('Profile link copied to clipboard!', 'success');
                      }
                    }}
                    className="px-6 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                  >
                    Share
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-6 mt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {isFollowCountLoading ? '...' : followCount?.followers || 0}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {isFollowCountLoading ? '...' : followCount?.following || 0}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Following</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {posts.length}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Posts</div>
                </div>
              </div>

              {/* Bio */}
              {profile.bioCid && (
                <p className="mt-6 text-lg text-gray-700 dark:text-gray-300 text-center lg:text-left">
                  {profile.bioCid}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tip Bar - Only show if viewing another user's profile */}
        {currentUserAddress && walletAddress && currentUserAddress !== (typeof walletAddress === 'string' ? walletAddress : '') && (
          <TipBar postId="user-profile" creatorAddress={profile.walletAddress} currency="LDAO" />
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('posts')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'posts'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
              >
                Posts
              </button>
              <button
                onClick={() => setActiveTab('followers')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'followers'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
              >
                Followers
              </button>
              <button
                onClick={() => setActiveTab('following')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'following'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
              >
                Following
              </button>
              <button
                onClick={() => setActiveTab('social')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'social'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
              >
                Social
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'comments'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
              >
                Comments
              </button>
              <button
                onClick={() => setActiveTab('upvotes')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'upvotes'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
              >
                Upvotes
              </button>
              <button
                onClick={() => setActiveTab('downvotes')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'downvotes'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
              >
                Downvotes
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Posts Tab */}
            {activeTab === 'posts' && (
              <div>
                {isPostsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
                    <p className="mt-4 text-gray-500 dark:text-gray-400">Loading posts...</p>
                  </div>
                ) : postsError ? (
                  <div className="text-center py-8">
                    <p className="text-red-500 dark:text-red-400">Error loading posts</p>
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No posts yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <div key={post.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">{post.title}</h3>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300">
                          {getPostContentPreview(post)}
                        </p>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                            <span>❤️ {post.reactionCount || post.reactions?.length || 0}</span>
                            <span>💬 {post.comments || 0}</span>
                            <span>🔄 {post.shares || 0}</span>
                          </div>
                          <Link
                            href={`/post/${post.id}`}
                            className="text-primary-500 hover:text-primary-600 text-sm font-medium"
                          >
                            View Post →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Followers Tab */}
            {activeTab === 'followers' && (
              <FollowerList
                userAddress={profile.walletAddress}
                isOwnProfile={false}
                isPublicProfile={true}
              />
            )}

            {/* Following Tab */}
            {activeTab === 'following' && (
              <FollowingList
                userAddress={profile.walletAddress}
                isOwnProfile={false}
                isPublicProfile={true}
              />
            )}

            {/* Social Tab */}
            {activeTab === 'social' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Social Links & Website</h3>

                {/* Website Section */}
                {profile.website && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Website</h4>
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg text-primary-700 dark:text-primary-300 hover:from-primary-100 hover:to-secondary-100 dark:hover:from-primary-900/30 dark:hover:to-secondary-900/30 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      {profile.website}
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}

                {/* Social Links Section */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Social Profiles</h4>
                  {!profile.socialLinks || profile.socialLinks.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No social links added yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {profile.socialLinks.map((link, index) => {
                        const getPlatformIcon = (platform: string) => {
                          const icons: Record<string, string> = {
                            twitter: 'M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z',
                            github: 'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22',
                            linkedin: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z',
                            instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
                          };
                          return icons[platform.toLowerCase()] || '';
                        };

                        const getPlatformColor = (platform: string) => {
                          const colors: Record<string, string> = {
                            twitter: 'from-blue-400 to-blue-600',
                            github: 'from-gray-700 to-gray-900',
                            linkedin: 'from-blue-600 to-blue-800',
                            instagram: 'from-pink-500 to-purple-600',
                            facebook: 'from-blue-600 to-blue-700',
                            youtube: 'from-red-600 to-red-700',
                            discord: 'from-indigo-500 to-indigo-700',
                            telegram: 'from-blue-400 to-blue-500',
                            tiktok: 'from-black to-gray-900',
                            medium: 'from-green-600 to-green-700',
                            reddit: 'from-orange-500 to-orange-600',
                          };
                          return colors[platform.toLowerCase()] || 'from-gray-500 to-gray-700';
                        };

                        return (
                          <a
                            key={index}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center justify-between p-4 bg-gradient-to-r ${getPlatformColor(link.platform)} text-white rounded-lg hover:shadow-lg transition-all transform hover:scale-105`}
                          >
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                  <path d={getPlatformIcon(link.platform)} />
                                </svg>
                              </div>
                              <div>
                                <p className="font-medium capitalize">{link.platform}</p>
                                {link.username && (
                                  <p className="text-xs text-white/80">@{link.username}</p>
                                )}
                              </div>
                            </div>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Comments</h3>
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Comments feature coming soon</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">User comments will be displayed here</p>
                </div>
              </div>
            )}

            {/* Upvotes Tab */}
            {activeTab === 'upvotes' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Upvoted Content</h3>
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Upvotes feature coming soon</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">Content upvoted by this user will be displayed here</p>
                </div>
              </div>
            )}

            {/* Downvotes Tab */}
            {activeTab === 'downvotes' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Downvoted Content</h3>
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Downvotes feature coming soon</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">Content downvoted by this user will be displayed here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}