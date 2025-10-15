import React from 'react';
import { FeedSortType } from '../../types/feed';
import { EnhancedFeedSortingTabs } from './EnhancedFeedSortingTabs';

interface FeedSortingHeaderProps {
  activeSort: FeedSortType;
  activeTimeRange: string;
  onSortChange: (sort: FeedSortType) => void;
  onTimeRangeChange: (timeRange: string) => void;
  showTimeRange?: boolean;
  showCounts?: boolean;
}

export const FeedSortingHeader: React.FC<FeedSortingHeaderProps> = ({
  activeSort,
  activeTimeRange,
  onSortChange,
  onTimeRangeChange,
  showTimeRange = true,
  showCounts = true
}) => {
  return (
    <div data-testid="feed-sorting-header">
      <EnhancedFeedSortingTabs
        activeSort={activeSort}
        activeTimeRange={activeTimeRange}
        onSortChange={onSortChange}
        onTimeRangeChange={onTimeRangeChange}
        showTimeRange={showTimeRange}
      />
    </div>
  );
};