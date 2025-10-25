import * as React from 'react';
import { Community } from '../../models/Community';
import { CommunityMembership } from '../../models/CommunityMembership';

interface VirtualFeedEnhancedProps {
  posts: any[];
  community: Community;
  userMembership: CommunityMembership | null;
  height?: number;
  itemHeight?: number;
  onVote: (postId: string, voteType: 'upvote' | 'downvote', stakeAmount?: string) => void;
  onReaction?: (postId: string, reactionType: string, amount?: number) => Promise<void>;
  onTip?: (postId: string, amount: string, token: string) => Promise<void>;
  onExpand?: () => void;
  showPreviews?: boolean;
  showSocialProof?: boolean;
  showTrending?: boolean;
  isLoading?: boolean;
}

const VirtualFeedEnhanced: React.FC<VirtualFeedEnhancedProps> = ({
  posts,
  community,
  userMembership,
  height = 600,
  itemHeight = 300,
  onVote,
  onReaction,
  onTip,
  onExpand,
  showPreviews = true,
  showSocialProof = true,
  showTrending = true,
  isLoading = false
}) => {
  // Dynamically require the component to avoid JSX issues
  const EnhancedPostCard = React.useMemo(() => {
    return require('../Community/CommunityPostCardEnhanced').default;
  }, []);

  // Loading skeleton
  if (isLoading) {
    return React.createElement(
      'div',
      { className: 'space-y-4' },
      Array.from({ length: 5 }).map((_, index) => 
        React.createElement(EnhancedPostCard, {
          key: index,
          post: {},
          community: community,
          userMembership: userMembership,
          onVote: onVote,
          onReaction: onReaction,
          onTip: onTip,
          isLoading: true
        })
      )
    );
  }

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
          post: post,
          community: community,
          userMembership: userMembership,
          onVote: onVote,
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

export default VirtualFeedEnhanced;