import React from 'react';
import EnhancedFeedView from './Feed/EnhancedFeedView';

interface FeedViewProps {
  highlightedPostId?: string;
  className?: string;
  communityId?: string;
  showCommunityMetrics?: boolean;
}

export default function FeedView({ 
  highlightedPostId, 
  className = '',
  communityId,
  showCommunityMetrics = false
}: FeedViewProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      <EnhancedFeedView
        communityId={communityId}
        showCommunityMetrics={showCommunityMetrics}
        initialFilter={highlightedPostId ? { author: highlightedPostId } : undefined}
      />
    </div>
  );
}