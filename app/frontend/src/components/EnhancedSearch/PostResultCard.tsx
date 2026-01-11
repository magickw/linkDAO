import React, { useState } from 'react';
import { EnhancedPost } from '../../types/enhancedSearch';

interface PostResultCardProps {
  post: EnhancedPost;
  position: number;
  onClick: (id: string) => void;
  onBookmark: (id: string, title: string, description?: string) => Promise<void>;
}

export function PostResultCard({ post, position, onClick, onBookmark }: PostResultCardProps) {
  const [bookmarking, setBookmarking] = useState(false);

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarking(true);
    try {
      await onBookmark(post.id, post.contentCid, post.contentCid);
    } finally {
      setBookmarking(false);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getEngagementColor = (rate: number) => {
    if (rate >= 0.1) return 'text-green-600 dark:text-green-400';
    if (rate >= 0.05) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div
      onClick={() => onClick(post.id)}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 cursor-pointer hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-200 group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {/* Author Avatar */}
          <img
            src={post.authorInfo?.avatar || 'https://placehold.co/40'}
            alt={post.authorInfo?.handle || 'User'}
            className="w-10 h-10 rounded-full"
          />
          
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900 dark:text-white">
                {post.authorInfo?.handle || 'Anonymous'}
              </span>
              
              {/* Badges */}
              {post.authorInfo?.verified && (
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              
              {post.authorInfo?.badges?.map((badge) => (
                <span
                  key={badge}
                  className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 text-xs rounded-full font-medium"
                >
                  {badge}
                </span>
              ))}
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{formatTimeAgo(post.createdAt)}</span>
              
              {/* Community Info */}
              {post.communityInfo && (
                <>
                  <span>•</span>
                  <div className="flex items-center space-x-1">
                    {post.communityInfo.avatar && (
                      <img
                        src={post.communityInfo.avatar}
                        alt={post.communityInfo.displayName}
                        className="w-4 h-4 rounded-full"
                      />
                    )}
                    <span>r/{post.communityInfo.name}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleBookmark}
            disabled={bookmarking}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Bookmark"
          >
            {bookmarking ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        <div className="text-gray-900 dark:text-white line-clamp-3 mb-2">
          {post.contentCid}
        </div>
        
        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {post.tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full hover:bg-primary-100 dark:hover:bg-primary-900 hover:text-primary-600 dark:hover:text-primary-300 transition-colors cursor-pointer"
              >
                #{tag}
              </span>
            ))}
            {post.tags.length > 5 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{post.tags.length - 5} more
              </span>
            )}
          </div>
        )}

        {/* Content Preview */}
        {post.preview && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {post.preview.type === 'image' && '🖼️ Image'}
                {post.preview.type === 'video' && '🎥 Video'}
                {post.preview.type === 'link' && '🔗 Link'}
                {post.preview.type === 'nft' && '🎨 NFT'}
                {post.preview.type === 'poll' && '📊 Poll'}
                {post.preview.type === 'proposal' && '🗳️ Proposal'}
              </span>
            </div>
            {post.preview.title && (
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {post.preview.title}
              </div>
            )}
            {post.preview.description && (
              <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {post.preview.description}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Engagement Metrics */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span>{post.engagementMetrics.likes.toLocaleString()}</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>{post.engagementMetrics.comments.toLocaleString()}</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            <span>{post.engagementMetrics.reposts.toLocaleString()}</span>
          </div>
          
          {post.engagementMetrics.tips > 0 && (
            <div className="flex items-center space-x-1 text-yellow-600 dark:text-yellow-400">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
              </svg>
              <span>{post.engagementMetrics.tips.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Engagement Rate */}
        <div className={`text-sm font-medium ${getEngagementColor(post.engagementMetrics.engagementRate)}`}>
          {(post.engagementMetrics.engagementRate * 100).toFixed(1)}% engagement
        </div>
      </div>

      {/* Social Proof */}
      {post.socialProof.followedUsersWhoEngaged.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex -space-x-1">
              {post.socialProof.followedUsersWhoEngaged.slice(0, 3).map((user, index) => {
                const keyId = (user as any).address || (user as any).walletAddress || (user as any).id || index;
                const avatarSrc = (user as any).avatar || (user as any).avatarCid || 'https://placehold.co/20';
                const displayHandle = (user as any).handle || (user as any).username || (user as any).displayName || 'User';

                return (
                  <img
                    key={keyId}
                    src={avatarSrc}
                    alt={displayHandle}
                    className="w-5 h-5 rounded-full border-2 border-white dark:border-gray-800"
                    style={{ zIndex: 10 - index }}
                  />
                );
              })}
            </div>
            <span>
              Liked by {(post.socialProof.followedUsersWhoEngaged[0] as any)?.handle || (post.socialProof.followedUsersWhoEngaged[0] as any)?.username || (post.socialProof.followedUsersWhoEngaged[0] as any)?.displayName || 'Someone'}
              {post.socialProof.followedUsersWhoEngaged.length > 1 && (
                <> and {post.socialProof.followedUsersWhoEngaged.length - 1} others you follow</>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Trending Badge */}
      {post.trendingScore && post.trendingScore > 0.8 && (
        <div className="absolute top-4 right-4 px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 text-xs rounded-full font-medium flex items-center space-x-1">
          <span>🔥</span>
          <span>Trending</span>
        </div>
      )}
    </div>
  );
}