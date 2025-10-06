// Mock Trending Badge for testing
import React from 'react';

interface TrendingBadgeProps {
  level: string;
  score?: number;
  showScore?: boolean;
}

const TrendingBadge: React.FC<TrendingBadgeProps> = ({
  level,
  score,
  showScore
}) => {
  return (
    <div data-testid="trending-badge" className="trending-badge">
      🔥 {level}
      {showScore && score && <span> ({score})</span>}
    </div>
  );
};

export const calculateTrendingLevel = (
  engagementScore: number,
  createdAt: Date,
  reactions: number,
  comments: number,
  shares: number
): string | null => {
  if (engagementScore > 1000) return 'viral';
  if (engagementScore > 500) return 'hot';
  if (engagementScore > 100) return 'rising';
  return null;
};

export default TrendingBadge;