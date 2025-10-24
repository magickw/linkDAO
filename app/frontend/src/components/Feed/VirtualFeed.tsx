import * as React from 'react';
import { EnhancedPost as FeedEnhancedPost } from '../../types/feed';

interface VirtualFeedProps {
  posts: FeedEnhancedPost[];
  height?: number;
  itemHeight?: number;
  onReaction?: (postId: string, reactionType: string, amount?: number) => Promise<void>;
  onTip?: (postId: string, amount: string, token: string) => Promise<void>;
  onExpand?: () => void;
  showPreviews?: boolean;
  showSocialProof?: boolean;
  showTrending?: boolean;
}

const VirtualFeed: React.FC<VirtualFeedProps> = ({
  posts,
  height = 600,
  itemHeight = 300,
  onReaction,
  onTip,
  onExpand,
  showPreviews = true,
  showSocialProof = true,
  showTrending = true
}) => {
  // Dynamically require the component to avoid JSX issues
  const EnhancedPostCard = React.useMemo(() => {
    return require('../EnhancedPostCard/EnhancedPostCard').default;
  }, []);

  // For now, just render the posts normally without virtualization
  // This avoids the react-window v2 API issues
  return React.createElement(
    'div',
    { style: { height: `${height}px`, overflow: 'auto' } },
    posts.map((post, index) => 
      React.createElement(
        'div',
        { 
          key: post.id, 
          style: { height: `${itemHeight}px`, marginBottom: '1rem' } 
        },
        React.createElement(EnhancedPostCard, {
          post: {
            id: post.id,
            title: post.title,
            content: `Content for post ${post.id}`,
            author: post.author,
            authorProfile: {
              handle: `user_${post.author}`,
              verified: false
            },
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            previews: post.previews || [],
            hashtags: [],
            mentions: [],
            reactions: post.reactions || [],
            tips: post.tips || [],
            comments: post.comments || 0,
            shares: post.shares || 0,
            views: post.views || 0,
            engagementScore: post.engagementScore || 0,
            socialProof: {},
            trendingStatus: post.trendingStatus,
            communityId: post.communityId,
            tags: post.tags
          },
          onReaction: onReaction,
          onTip: onTip,
          onExpand: onExpand,
          showPreviews: showPreviews,
          showSocialProof: showSocialProof,
          showTrending: showTrending,
          className: "mb-4"
        })
      )
    )
  );
};

export default VirtualFeed;