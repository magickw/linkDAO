import * as React from 'react';
import { FixedSizeList as List } from 'react-window';
import { EnhancedPost as FeedEnhancedPost, ContentPreview as FeedContentPreview, Reaction as FeedReaction, Tip as FeedTip } from '../../types/feed';
import { ContentPreview } from '../../types/contentPreview';
import EnhancedPostCard from '../EnhancedPostCard/EnhancedPostCard';

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

// Item renderer for react-window
const PostItem: React.FC<{
  data: FeedEnhancedPost[];
  index: number;
  style: React.CSSProperties;
  onReaction?: (postId: string, reactionType: string, amount?: number) => Promise<void>;
  onTip?: (postId: string, amount: string, token: string) => Promise<void>;
  onExpand?: () => void;
  showPreviews?: boolean;
  showSocialProof?: boolean;
  showTrending?: boolean;
}> = ({ 
  data, 
  index, 
  style, 
  onReaction, 
  onTip, 
  onExpand,
  showPreviews,
  showSocialProof,
  showTrending
}) => {
  const post = data[index];
  
  if (!post) return null;
  
  // Map feed content previews to the correct type
  const mappedPreviews: ContentPreview[] = (post.previews || []).map((preview: FeedContentPreview) => ({
    id: preview.id || `${post.id}-${preview.url}`,
    type: preview.type as 'nft' | 'link' | 'proposal' | 'token',
    url: preview.url,
    data: preview.data || {} as any,
    metadata: preview.metadata || {},
    cached: preview.cached || false,
    securityStatus: (preview.securityStatus as 'safe' | 'warning' | 'blocked') || 'safe'
  }));

  // Use reactions directly from post (already in correct format)
  const mappedReactions = post.reactions || [];

  // Use tips directly from post (already in correct format)
  const mappedTips = post.tips || [];

  // Map trending status to correct type
  let trendingStatus: 'hot' | 'rising' | 'viral' | 'breaking' | undefined = undefined;
  if (post.trendingStatus) {
    // Map string values to enum values
    switch (post.trendingStatus.toLowerCase()) {
      case 'hot':
        trendingStatus = 'hot';
        break;
      case 'rising':
        trendingStatus = 'rising';
        break;
      case 'viral':
        trendingStatus = 'viral';
        break;
      case 'breaking':
        trendingStatus = 'breaking';
        break;
      default:
        trendingStatus = undefined;
    }
  }
  
  return (
    <div style={style} className="mb-4">
      <EnhancedPostCard
        post={{
          id: post.id,
          title: post.title,
          content: `Content for post ${post.id}`, // Using a placeholder since contentCid is just a reference
          contentCid: post.contentCid || '', // Add contentCid property
          author: post.author,
          authorProfile: {
            handle: post.author?.slice(0, 8) || `user_${post.id?.slice(0, 8)}`,
            verified: false,
            reputationTier: undefined,
            avatar: undefined
          },
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          contentType: post.contentType,
          media: post.mediaCids,
          previews: mappedPreviews,
          hashtags: post.tags || [],
          mentions: [],
          reactions: mappedReactions,
          tips: mappedTips,
          comments: post.comments || 0,
          shares: post.shares || 0,
          views: post.views || 0,
          engagementScore: post.engagementScore || 0,
          // Required fields from SharedEnhancedPost
          reputationScore: post.reputationScore || 0,
          parentId: post.parentId || null,
          mediaCids: post.mediaCids || [],
          onchainRef: post.onchainRef || '',
          stakedValue: post.stakedValue || 0,
          socialProof: post.socialProof || {
            followedUsersWhoEngaged: [],
            totalEngagementFromFollowed: 0,
            communityLeadersWhoEngaged: [],
            verifiedUsersWhoEngaged: []
          },
          trendingStatus: trendingStatus,
          pinnedUntil: undefined,
          communityId: post.communityId,
          communityName: undefined,
          tags: post.tags
        }}
        onReaction={onReaction}
        onTip={onTip}
        onExpand={onExpand}
        showPreviews={showPreviews}
        showSocialProof={showSocialProof}
        showTrending={showTrending}
        className="h-full"
      />
    </div>
  );
};

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
  // Handle empty posts case
  if (!posts || posts.length === 0) {
    return (
      <div style={{ height: `${height}px` }} className="flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">
          No posts to display
        </div>
      </div>
    );
  }

  return (
    <List
      height={height}
      itemCount={posts.length}
      itemSize={itemHeight}
      itemData={posts}
      overscanCount={5} // Render 5 items ahead and behind for smoother scrolling
      width="100%" // Add width property
    >
      {({ index, style }) => (
        <PostItem
          data={posts}
          index={index}
          style={style}
          onReaction={onReaction}
          onTip={onTip}
          onExpand={onExpand}
          showPreviews={showPreviews}
          showSocialProof={showSocialProof}
          showTrending={showTrending}
        />
      )}
    </List>
  );
};

export default VirtualFeed;