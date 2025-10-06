// Mock Feed Sorting Header for testing
import React from 'react';
import { FeedSortType } from '../../types/feed';

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
      <div className="flex space-x-2">
        <button 
          onClick={() => onSortChange(FeedSortType.HOT)}
          className={activeSort === FeedSortType.HOT ? 'active' : ''}
        >
          Hot
        </button>
        <button 
          onClick={() => onSortChange(FeedSortType.NEW)}
          className={activeSort === FeedSortType.NEW ? 'active' : ''}
        >
          New
        </button>
        <button 
          onClick={() => onSortChange(FeedSortType.TOP)}
          className={activeSort === FeedSortType.TOP ? 'active' : ''}
        >
          Top
        </button>
      </div>
      {showTimeRange && (
        <div className="flex space-x-2 mt-2">
          <button 
            onClick={() => onTimeRangeChange('day')}
            className={activeTimeRange === 'day' ? 'active' : ''}
          >
            Day
          </button>
          <button 
            onClick={() => onTimeRangeChange('week')}
            className={activeTimeRange === 'week' ? 'active' : ''}
          >
            Week
          </button>
        </div>
      )}
    </div>
  );
};