import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import { bookmarkService, BookmarkedPost } from '@/services/bookmarkService';
import { getProxiedIPFSUrl } from '@/utils/ipfsProxy';
import { Bookmark, Clock, MessageCircle, Eye, ArrowUp, ArrowDown, Trash2, RefreshCw, Search, Filter, ChevronDown } from 'lucide-react';

// Loading skeleton for bookmarked posts
const BookmarkSkeleton = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/6" />
          </div>
        </div>
        <div className="space-y-2 mb-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </div>
      </div>
    ))}
  </div>
);

// Empty state component
const EmptyBookmarks = () => (
  <div className="text-center py-16">
    <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full mb-6">
      <Bookmark className="w-10 h-10 text-gray-400" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
      No bookmarks yet
    </h3>
    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
      Start saving posts you want to read later by clicking the bookmark icon on any post.
    </p>
    <Link
      href="/"
      className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
    >
      Browse Feed
    </Link>
  </div>
);

// Bookmarked post card component
interface BookmarkCardProps {
  bookmark: BookmarkedPost;
  onRemove: (postId: string) => void;
  isRemoving: boolean;
}

const BookmarkCard: React.FC<BookmarkCardProps> = ({ bookmark, onRemove, isRemoving }) => {
  const { post, bookmarkedAt } = bookmark;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const truncateAddress = (address: string) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5">
        {/* Header with author info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center text-white font-semibold">
              {post.authorAddress ? post.authorAddress.slice(2, 4).toUpperCase() : '??'}
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {truncateAddress(post.authorAddress)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {formatDate(post.createdAt)}
              </p>
            </div>
          </div>

          <button
            onClick={() => onRemove(post.id)}
            disabled={isRemoving}
            className={`p-2 rounded-lg transition-colors ${
              isRemoving
                ? 'opacity-50 cursor-not-allowed'
                : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
            }`}
            title="Remove bookmark"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Post content */}
        <Link href={`/post/${post.id}`} className="block group">
          {post.title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {post.title}
            </h3>
          )}

          {post.content && (
            <p className="text-gray-600 dark:text-gray-300 line-clamp-3 mb-3">
              {post.content}
            </p>
          )}

          {/* Media preview */}
          {post.media && post.media.length > 0 && (
            <div className="mb-3 rounded-lg overflow-hidden">
              <img
                src={getProxiedIPFSUrl(post.media[0])}
                alt="Post media"
                className="w-full h-48 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </Link>

        {/* Stats */}
        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-700">
          <span className="flex items-center space-x-1">
            <ArrowUp className="w-4 h-4" />
            <span>{post.upvotes || 0}</span>
          </span>
          <span className="flex items-center space-x-1">
            <ArrowDown className="w-4 h-4" />
            <span>{post.downvotes || 0}</span>
          </span>
          <span className="flex items-center space-x-1">
            <MessageCircle className="w-4 h-4" />
            <span>{post.commentsCount || 0}</span>
          </span>
          <span className="flex items-center space-x-1">
            <Eye className="w-4 h-4" />
            <span>{post.views || 0}</span>
          </span>
          <span className="ml-auto text-xs">
            Saved {formatDate(bookmarkedAt)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default function BookmarksPage() {
  const router = useRouter();
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();

  const [bookmarks, setBookmarks] = useState<BookmarkedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  
  // New state for filtering, sorting, and search
  const [contentType, setContentType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Ref for dropdown click outside handler
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
    };

    if (showFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterDropdown]);

  const fetchBookmarks = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (!isConnected || !address) {
      setLoading(false);
      return;
    }

    try {
      if (pageNum === 1 && !append) {
        setLoading(true);
      }

      const response = await bookmarkService.getUserBookmarks(
        pageNum, 
        10,
        contentType,
        sortBy,
        searchQuery
      );

      if (append) {
        setBookmarks(prev => [...prev, ...response.bookmarks]);
      } else {
        setBookmarks(response.bookmarks);
      }

      setTotalCount(response.pagination.total);
      setHasMore(pageNum < response.pagination.totalPages);
      setPage(pageNum);
    } catch (error: any) {
      console.error('Error fetching bookmarks:', error);
      addToast(error.message || 'Failed to load bookmarks', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isConnected, address, addToast, contentType, sortBy, searchQuery]);

  useEffect(() => {
    fetchBookmarks(1);
  }, [fetchBookmarks]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBookmarks(1);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      fetchBookmarks(page + 1, true);
    }
  };

  const handleRemoveBookmark = async (postId: string) => {
    setRemovingId(postId);
    try {
      await bookmarkService.toggleBookmark(postId);
      setBookmarks(prev => prev.filter(b => b.postId !== postId));
      setTotalCount(prev => prev - 1);
      addToast('Bookmark removed', 'info');
    } catch (error: any) {
      console.error('Error removing bookmark:', error);
      addToast(error.message || 'Failed to remove bookmark', 'error');
    } finally {
      setRemovingId(null);
    }
  };

  // Redirect if not connected
  if (!isConnected) {
    return (
      <Layout>
        <Head>
          <title>Bookmarks | LinkDAO</title>
        </Head>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full mb-6">
            <Bookmark className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Sign in to view your bookmarks
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Connect your wallet to access your saved posts.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Bookmarks | LinkDAO</title>
        <meta name="description" content="View your saved posts and content on LinkDAO" />
      </Head>

      <div className="w-full px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <Bookmark className="w-8 h-8 mr-3 text-primary-600" />
              Bookmarks
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {totalCount > 0 ? `${totalCount} saved post${totalCount !== 1 ? 's' : ''}` : 'Your saved posts will appear here'}
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className={`p-2 rounded-lg transition-colors ${
              refreshing || loading
                ? 'opacity-50 cursor-not-allowed'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Refresh bookmarks"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          {/* Filter bar */}
          <div className="flex items-center justify-between gap-3">
            {/* Content type filter */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setContentType('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  contentType === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setContentType('post')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  contentType === 'post'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Posts
              </button>
              <button
                onClick={() => setContentType('status')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  contentType === 'status'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Statuses
              </button>
            </div>

            {/* Sort dropdown */}
            <div className="relative" ref={filterDropdownRef}>
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                <Filter className="w-4 h-4" />
                <span>
                  {sortBy === 'newest' && 'Newest'}
                  {sortBy === 'oldest' && 'Oldest'}
                  {sortBy === 'title' && 'Title'}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showFilterDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                  <button
                    onClick={() => {
                      setSortBy('newest');
                      setShowFilterDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                  >
                    <span>Newest</span>
                    {sortBy === 'newest' && <span className="text-primary-600">✓</span>}
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('oldest');
                      setShowFilterDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                  >
                    <span>Oldest</span>
                    {sortBy === 'oldest' && <span className="text-primary-600">✓</span>}
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('title');
                      setShowFilterDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                  >
                    <span>Title</span>
                    {sortBy === 'title' && <span className="text-primary-600">✓</span>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <BookmarkSkeleton />
        ) : bookmarks.length === 0 ? (
          <EmptyBookmarks />
        ) : (
          <>
            <div className="space-y-4">
              {bookmarks.map((bookmark) => (
                <BookmarkCard
                  key={bookmark.postId}
                  bookmark={bookmark}
                  onRemove={handleRemoveBookmark}
                  isRemoving={removingId === bookmark.postId}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
