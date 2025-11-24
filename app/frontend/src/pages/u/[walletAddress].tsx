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
  const [activeTab, setActiveTab] = useState<'posts' | 'followers' | 'following'>('posts');

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
  const { data: followCount, isLoading: isFollowCountLoading } = useFollowCount(
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
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-900/30 dark:to-purple-900/30 backdrop-blur-lg rounded-2xl shadow-xl border border-white/30 dark:border-gray-700/50 p-6 mb-6">
          <div className="flex flex-col lg:flex-row items-center lg:items-start">
            <div className="flex-shrink-0 mb-6 lg:mb-0 lg:mr-8">
              <div className="relative">
                <div className="h-32 w-32 md:h-40 md:w-40 rounded-full border-4 border-white dark:border-gray-700 shadow-xl overflow-hidden">
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
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                          isFollowing
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
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                          isBlocked
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

        {/* Tip Bar */}
        <TipBar postId="user-profile" creatorAddress={profile.walletAddress} />

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('posts')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'posts'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Posts
              </button>
              <button
                onClick={() => setActiveTab('followers')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'followers'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Followers
              </button>
              <button
                onClick={() => setActiveTab('following')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'following'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Following
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
          </div>
        </div>
      </div>
    </Layout>
  );
}