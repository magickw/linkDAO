import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import EnhancedPostCard from '../EnhancedPostCard/EnhancedPostCard';
import { EnhancedPost } from '../../types/feed';

interface VirtualFeedProps {
  posts: EnhancedPost[];
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
  // Create a memoized item renderer
  const ItemRenderer = useMemo(() => {
    return ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const post = posts[index];
      
      return (
        <div style={style}>
          <EnhancedPostCard
            post={post}
            onReaction={onReaction}
            onTip={onTip}
            onExpand={onExpand}
            showPreviews={showPreviews}
            showSocialProof={showSocialProof}
            showTrending={showTrending}
            className="mb-4"
          />
        </div>
      );
    };
  }, [posts, onReaction, onTip, onExpand, showPreviews, showSocialProof, showTrending]);

  return (
    <List
      height={height}
      itemCount={posts.length}
      itemSize={itemHeight}
      itemData={posts}
      overscanCount={5} // Render 5 extra items for smoother scrolling
    >
      {ItemRenderer}
    </List>
  );
};

export default VirtualFeed;