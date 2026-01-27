/**
 * CommunityPostList Component
 * Displays community posts with filtering, sorting, and post creation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { EnhancedPost } from '../../types/feed';
import CommunityPostCardEnhanced from './CommunityPostCardEnhanced';
import { PostComposer } from '../Feed/PostComposer';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { InfiniteScroll } from '../ui/InfiniteScroll';
import { useWebSocket } from '../../hooks/useWebSocket';
import { CommunityPostService } from '../../services/communityPostService';
import { CommunityOfflineCacheService } from '../../services/communityOfflineCacheService';
import { Community } from '../../models/Community';
import { NoPostsEmptyState } from './EmptyState';

interface CommunityPostListProps {
  communityId: string;
  communitySlug: string;
  community?: Community;
  canPost: boolean;
  canModerate: boolean;
  sort: 'hot' | 'new' | 'top';
  filter: string;
  onSortChange: (sort: 'hot' | 'new' | 'top') => void;
  onFilterChange: (filter: string) => void;
  userMembership?: any;
}

interface PostFilters {
  timeRange: 'day' | 'week' | 'month' | 'all';
  postType: 'all' | 'text' | 'image' | 'video' | 'link' | 'poll';
  flair: string | null;
}

export const CommunityPostList: React.FC<CommunityPostListProps> = ({
  communityId,
  communitySlug,
  community,
  canPost,
  canModerate,
  sort,
  filter,
  onSortChange,
  onFilterChange,
  userMembership
}) => {
  const [posts, setPosts] = useState<EnhancedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<PostFilters>({
    timeRange: 'all',
    postType: 'all',
    flair: null
  });
  const [isOnline, setIsOnline] = useState(true);

  // Initialize offline cache service
  const offlineCacheService = CommunityOfflineCacheService.getInstance();

  const { isConnected, on, off } = useWebSocket({
    walletAddress: '',
    autoConnect: true
  });

  // Check network status
  useEffect(() => {
    const updateNetworkStatus = () => {
      const onlineStatus = typeof navigator !== 'undefined' ? navigator.onLine : true;
      setIsOnline(onlineStatus);
    };

    // Check if we're in a browser environment
    const isBrowser = typeof window !== 'undefined';

    if (isBrowser) {
      window.addEventListener('online', updateNetworkStatus);
      window.addEventListener('offline', updateNetworkStatus);
    }

    updateNetworkStatus();

    return () => {
      if (isBrowser) {
        window.removeEventListener('online', updateNetworkStatus);
        window.removeEventListener('offline', updateNetworkStatus);
      }
    };
  }, []);

  // Load posts
  const loadPosts = useCallback(async (pageNum: number = 1, reset: boolean = true) => {
    if (pageNum === 1) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20',
        sort,
        timeRange: filters.timeRange,
        ...(filters.postType !== 'all' && { type: filters.postType }),
        ...(filters.flair && { flair: filters.flair })
      });

      const response = await fetch(`/api/communities/${communityId}/posts?${params}`);

      if (!response.ok) {
        throw new Error('Failed to load posts');
      }

      const data = await response.json();

      if (reset || pageNum === 1) {
        setPosts(data.posts);
      } else {
        setPosts(prev => [...prev, ...data.posts]);
      }

      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch (err) {
      console.error('Error loading posts:', err);

      // If offline, try to get from cache
      if (!isOnline) {
        try {
          const cachedPosts = await offlineCacheService.getCachedCommunityPosts(communityId);
          if (cachedPosts.length > 0) {
            if (reset || pageNum === 1) {
              setPosts(cachedPosts);
            } else {
              setPosts(prev => [...prev, ...cachedPosts]);
            }
            setHasMore(false); // No more pages when using cached data
            setPage(pageNum);
            setError(null); // Clear error when using cached data
            return;
          }
        } catch (cacheError) {
          console.error('Error loading cached posts:', cacheError);
        }
      }

      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      if (pageNum === 1) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [communityId, sort, filters, isOnline, offlineCacheService]);

  // Load more posts
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadPosts(page + 1, false);
    }
  }, [loadPosts, page, loadingMore, hasMore]);

  // Handle post creation
  const handlePostCreated = (newPost: EnhancedPost) => {
    setPosts(prev => [newPost, ...prev]);
    setShowComposer(false);
  };

  // Handle post updates (reactions, comments, etc.)
  const handlePostUpdate = (postId: string, updates: Partial<EnhancedPost>) => {
    setPosts(prev => prev.map(post =>
      post.id === postId ? { ...post, ...updates } : post
    ));
  };

  // Handle post deletion
  const handlePostDelete = (postId: string) => {
    setPosts(prev => prev.filter(post => post.id !== postId));
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<PostFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Real-time updates via WebSocket
  useEffect(() => {
    if (!isConnected) return;

    const handleNewPost = (post: EnhancedPost) => {
      if ((post as any).communityId === communityId) {
        setPosts(prev => [post, ...prev]);
      }
    };

    const handlePostUpdateEvent = (data: { postId: string; updates: Partial<EnhancedPost> }) => {
      handlePostUpdate(data.postId, data.updates);
    };

    const handlePostDeleteEvent = (data: { postId: string }) => {
      handlePostDelete(data.postId);
    };

    on('post:created', handleNewPost);
    on('post:updated', handlePostUpdateEvent);
    on('post:deleted', handlePostDeleteEvent);

    return () => {
      off('post:created', handleNewPost);
      off('post:updated', handlePostUpdateEvent);
      off('post:deleted', handlePostDeleteEvent);
    };
  }, [isConnected, communityId, on, off]);

  // Load posts when dependencies change
  useEffect(() => {
    loadPosts(1, true);
  }, [loadPosts]);

  const getSortOptions = () => [
    { value: 'hot', label: 'Hot', icon: '🔥' },
    { value: 'new', label: 'New', icon: '🆕' },
    { value: 'top', label: 'Top', icon: '⭐' }
  ];

  const getFilterOptions = () => [
    { value: 'all', label: 'All Posts' },
    { value: 'text', label: 'Text Posts' },
    { value: 'image', label: 'Images' },
    { value: 'video', label: 'Videos' },
    { value: 'link', label: 'Links' },
    { value: 'poll', label: 'Polls' }
  ];

  const getTimeRangeOptions = () => [
    { value: 'day', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'all', label: 'All Time' }
  ];

  if (loading && posts.length === 0) {
    return (
      <div className="posts-loading">
        <LoadingSpinner size="lg" />
        <p>Loading posts...</p>
      </div>
    );
  }

  return (
    <div className="community-posts">
      {/* Post Creation */}
      {canPost && (
        <div className="post-creation">
          {!showComposer ? (
            <button
              onClick={() => setShowComposer(true)}
              className="create-post-button"
              disabled={!isOnline}
            >
              <div className="create-post-avatar">
                <div className="avatar-placeholder">+</div>
              </div>
              <span>
                {isOnline ? 'Create a post in this community...' : 'Offline - Post creation unavailable'}
              </span>
            </button>
          ) : (
            <PostComposer
              onPost={async (postData) => {
                // Create post via API
                try {
                  const response = await fetch(`/api/communities/${communityId}/posts`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('authToken')}` // Adjust based on your auth implementation
                    },
                    body: JSON.stringify({
                      content: postData.content,
                      title: postData.title,
                      mediaUrls: postData.media || [],
                      tags: postData.tags || []
                    })
                  });

                  if (response.ok) {
                    const newPost = await response.json();
                    // Add the new post to the list
                    setPosts(prevPosts => [newPost.data, ...prevPosts]);
                    setShowComposer(false);
                  } else {
                    console.error('Failed to create post:', response.statusText);
                  }
                } catch (error) {
                  console.error('Error creating post:', error);
                }
                return; // Exit early since we're handling the API call
              }}
              onCancel={() => setShowComposer(false)}
            />
          )}
        </div>
      )}

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="offline-indicator">
          <span>⚠️ You are currently offline. Displaying cached content.</span>
        </div>
      )}

      {/* Filters and Sorting */}
      <div className="posts-controls">
        {/* Sort Options */}
        <div className="sort-controls">
          {getSortOptions().map(option => (
            <button
              key={option.value}
              onClick={() => onSortChange(option.value as 'hot' | 'new' | 'top')}
              className={`sort-button ${sort === option.value ? 'active' : ''}`}
            >
              <span className="sort-icon">{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>

        {/* Filter Controls */}
        <div className="filter-controls">
          <select
            value={filters.postType}
            onChange={(e) => handleFilterChange({ postType: e.target.value as any })}
            className="filter-select"
          >
            {getFilterOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={filters.timeRange}
            onChange={(e) => handleFilterChange({ timeRange: e.target.value as any })}
            className="filter-select"
          >
            {getTimeRangeOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Posts List */}
      {error ? (
        <div className="posts-error">
          <h3>Failed to load posts</h3>
          <p>{error}</p>
          <button onClick={() => loadPosts(1, true)} className="retry-button">
            Try Again
          </button>
        </div>
      ) : posts.length === 0 ? (
        <NoPostsEmptyState
          onCreatePost={canPost && isOnline ? () => setShowComposer(true) : undefined}
        />
      ) : (
        <InfiniteScroll
          hasMore={hasMore}
          loadMore={loadMore}
          loading={loadingMore}
        >
          <div className="posts-list">
            {posts.map(post => {
              // Create a fallback community object if not provided
              const postCommunity: Community = community || {
                id: communityId,
                name: communitySlug,
                displayName: communitySlug,
                slug: communitySlug,
                description: '',
                rules: [],
                memberCount: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
                isPublic: true,
                moderators: [],
                tags: [],
                category: 'General',
                settings: {
                  allowedPostTypes: [],
                  requireApproval: false,
                  minimumReputation: 0,
                  stakingRequirements: []
                }
              };

              return (
                <CommunityPostCardEnhanced
                  key={post.id}
                  post={post}
                  community={postCommunity}
                  userMembership={userMembership}
                  onVote={(postId, voteType, stakeAmount) => {
                    console.log('Vote:', postId, voteType, stakeAmount);
                  }}
                  onReaction={async (postId, reactionType, amount) => {
                    console.log('Reaction:', postId, reactionType, amount);
                  }}
                  onTip={async (postId, amount, token) => {
                    console.log('Tip:', postId, amount, token);
                  }}
                />
              );
            })}
          </div>
        </InfiniteScroll>
      )}

      <style jsx>{`
        .community-posts {
          max-width: 800px;
        }

        .posts-loading,
        .posts-error,
        .no-posts {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          text-align: center;
        }

        .posts-loading p,
        .posts-error p,
        .no-posts p {
          color: var(--text-secondary);
          margin: 1rem 0;
        }

        .posts-error h3,
        .no-posts h3 {
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .offline-indicator {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          color: #856404;
          padding: 0.75rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          text-align: center;
          font-size: 0.9rem;
        }

        .post-creation {
          margin-bottom: 2rem;
        }

        .create-post-button {
          display: flex;
          align-items: center;
          gap: 1rem;
          width: 100%;
          padding: 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 0.5rem;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .create-post-button:hover:not(:disabled) {
          background: var(--bg-tertiary);
          border-color: var(--border-medium);
        }

        .create-post-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .create-post-avatar {
          flex-shrink: 0;
        }

        .avatar-placeholder {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--primary-color);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 1.25rem;
        }

        .posts-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding: 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 0.5rem;
        }

        .sort-controls {
          display: flex;
          gap: 0.5rem;
        }

        .sort-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: transparent;
          border: 1px solid var(--border-light);
          border-radius: 0.25rem;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .sort-button:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .sort-button.active {
          background: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
        }

        .sort-icon {
          font-size: 1rem;
        }

        .filter-controls {
          display: flex;
          gap: 1rem;
        }

        .filter-select {
          padding: 0.5rem;
          background: var(--bg-primary);
          border: 1px solid var(--border-light);
          border-radius: 0.25rem;
          color: var(--text-primary);
          cursor: pointer;
        }

        .filter-select:focus {
          outline: none;
          border-color: var(--primary-color);
        }

        .posts-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .retry-button,
        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .retry-button {
          background: var(--primary-color);
          color: white;
        }

        .retry-button:hover {
          background: var(--primary-color-dark);
        }

        .btn-primary {
          background: var(--primary-color);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--primary-color-dark);
          transform: translateY(-1px);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .posts-controls {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .sort-controls {
            justify-content: center;
          }

          .filter-controls {
            justify-content: center;
          }

          .sort-button {
            flex: 1;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .create-post-button {
            padding: 0.75rem;
          }

          .posts-controls {
            padding: 0.75rem;
          }

          .sort-controls {
            flex-wrap: wrap;
          }

          .filter-controls {
            flex-direction: column;
          }

          .filter-select {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default CommunityPostList;