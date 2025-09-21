import React from 'react';
import { EnhancedSearchResults } from '../../types/enhancedSearch';
import { PostResultCard } from './PostResultCard';
import { CommunityResultCard } from './CommunityResultCard';
import { UserResultCard } from './UserResultCard';
import { HashtagResultCard } from './HashtagResultCard';
import { TopicResultCard } from './TopicResultCard';

interface SearchResultsViewProps {
  results: EnhancedSearchResults;
  activeTab: 'all' | 'posts' | 'communities' | 'users';
  onResultClick: (type: 'post' | 'community' | 'user', id: string, position: number) => void;
  onBookmark: (type: string, itemId: string, title: string, description?: string) => Promise<void>;
  onFollow: (type: string, targetId: string) => Promise<void>;
  onJoin: (communityId: string) => Promise<void>;
  onLoadMore: () => Promise<void>;
  hasMore: boolean;
  loading: boolean;
}

export function SearchResultsView({
  results,
  activeTab,
  onResultClick,
  onBookmark,
  onFollow,
  onJoin,
  onLoadMore,
  hasMore,
  loading
}: SearchResultsViewProps) {
  const shouldShowSection = (sectionType: string) => {
    return activeTab === 'all' || activeTab === sectionType;
  };

  const getSectionTitle = (type: string, count: number) => {
    const titles = {
      posts: 'Posts',
      communities: 'Communities',
      users: 'Users',
      hashtags: 'Hashtags',
      topics: 'Topics'
    };
    return `${titles[type as keyof typeof titles]} (${count.toLocaleString()})`;
  };

  return (
    <div className="space-y-8">
      {/* Posts Section */}
      {shouldShowSection('posts') && results.posts.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <span>📝</span>
            <span>{getSectionTitle('posts', results.posts.length)}</span>
          </h2>
          <div className="space-y-4">
            {results.posts.map((post, index) => (
              <PostResultCard
                key={post.id}
                post={post}
                position={index}
                onClick={(id) => onResultClick('post', id, index)}
                onBookmark={(id, title, description) => onBookmark('post', id, title, description)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Communities Section */}
      {shouldShowSection('communities') && results.communities.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <span>👥</span>
            <span>{getSectionTitle('communities', results.communities.length)}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.communities.map((community, index) => (
              <CommunityResultCard
                key={community.id}
                community={community}
                position={index}
                onClick={(id) => onResultClick('community', id, index)}
                onFollow={(id) => onFollow('community', id)}
                onJoin={onJoin}
                onBookmark={(id, title, description) => onBookmark('community', id, title, description)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Users Section */}
      {shouldShowSection('users') && results.users.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <span>👤</span>
            <span>{getSectionTitle('users', results.users.length)}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.users.map((user, index) => (
              <UserResultCard
                key={user.walletAddress}
                user={user}
                position={index}
                onClick={(id) => onResultClick('user', id, index)}
                onFollow={(id) => onFollow('user', id)}
                onBookmark={(id, title, description) => onBookmark('user', id, title, description)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Hashtags Section */}
      {activeTab === 'all' && results.hashtags.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <span>#</span>
            <span>{getSectionTitle('hashtags', results.hashtags.length)}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.hashtags.map((hashtag, index) => (
              <HashtagResultCard
                key={hashtag.tag}
                hashtag={hashtag}
                position={index}
                onFollow={(tag) => onFollow('hashtag', tag)}
                onBookmark={(tag, title) => onBookmark('hashtag', tag, title)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Topics Section */}
      {activeTab === 'all' && results.topics.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <span>🏷️</span>
            <span>{getSectionTitle('topics', results.topics.length)}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.topics.map((topic, index) => (
              <TopicResultCard
                key={topic.name}
                topic={topic}
                position={index}
                onFollow={(name) => onFollow('topic', name)}
                onBookmark={(name, title, description) => onBookmark('topic', name, title, description)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center py-8">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Loading...</span>
              </div>
            ) : (
              'Load More Results'
            )}
          </button>
        </div>
      )}

      {/* Empty State for Individual Tabs */}
      {((activeTab === 'posts' && results.posts.length === 0) ||
        (activeTab === 'communities' && results.communities.length === 0) ||
        (activeTab === 'users' && results.users.length === 0)) && (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            {activeTab === 'posts' && <span className="text-4xl">📝</span>}
            {activeTab === 'communities' && <span className="text-4xl">👥</span>}
            {activeTab === 'users' && <span className="text-4xl">👤</span>}
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No {activeTab} found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your search terms or filters to find {activeTab}.
          </p>
        </div>
      )}
    </div>
  );
}