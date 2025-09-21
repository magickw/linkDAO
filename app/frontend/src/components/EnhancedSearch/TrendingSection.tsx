import React from 'react';
import { DiscoveryContent } from '../../types/enhancedSearch';
import { PostResultCard } from './PostResultCard';
import { CommunityResultCard } from './CommunityResultCard';
import { HashtagResultCard } from './HashtagResultCard';
import { TopicResultCard } from './TopicResultCard';

interface TrendingSectionProps {
  trending: DiscoveryContent['trending'];
  onFollow: (type: string, targetId: string) => Promise<void>;
  onJoin: (communityId: string) => Promise<void>;
  onBookmark: (type: string, itemId: string, title: string, description?: string) => Promise<void>;
}

export function TrendingSection({
  trending,
  onFollow,
  onJoin,
  onBookmark
}: TrendingSectionProps) {
  return (
    <div className="space-y-8">
      {/* Trending Posts */}
      {trending.posts.length > 0 && (
        <section>
          <div className="flex items-center space-x-2 mb-6">
            <span className="text-2xl">🔥</span>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Trending Posts
            </h2>
          </div>
          <div className="space-y-4">
            {trending.posts.slice(0, 5).map((post, index) => (
              <PostResultCard
                key={post.id}
                post={post}
                position={index}
                onClick={() => {}}
                onBookmark={(id, title, description) => onBookmark('post', id, title, description)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Trending Communities */}
      {trending.communities.length > 0 && (
        <section>
          <div className="flex items-center space-x-2 mb-6">
            <span className="text-2xl">📈</span>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Trending Communities
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trending.communities.slice(0, 6).map((community, index) => (
              <CommunityResultCard
                key={community.id}
                community={community}
                position={index}
                onClick={() => {}}
                onFollow={(id) => onFollow('community', id)}
                onJoin={onJoin}
                onBookmark={(id, title, description) => onBookmark('community', id, title, description)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Trending Hashtags */}
      {trending.hashtags.length > 0 && (
        <section>
          <div className="flex items-center space-x-2 mb-6">
            <span className="text-2xl">#️⃣</span>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Trending Hashtags
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trending.hashtags.slice(0, 6).map((hashtag, index) => (
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

      {/* Trending Topics */}
      {trending.topics.length > 0 && (
        <section>
          <div className="flex items-center space-x-2 mb-6">
            <span className="text-2xl">🏷️</span>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Trending Topics
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trending.topics.slice(0, 4).map((topic, index) => (
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

      {/* Empty State */}
      {trending.posts.length === 0 && 
       trending.communities.length === 0 && 
       trending.hashtags.length === 0 && 
       trending.topics.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            <span className="text-4xl">📊</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No trending content available
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Check back later for trending posts, communities, and topics.
          </p>
        </div>
      )}
    </div>
  );
}