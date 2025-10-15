import React, { useState, useEffect, useCallback } from 'react';
import { EnhancedPost } from '../../types/feed';

interface TrendingIndicatorsProps {
  post: EnhancedPost;
  communityName?: string;
  showAlgorithmInfo?: boolean;
  className?: string;
}

interface TrendingData {
  score: number;
  rank: number;
  category: TrendingCategory;
  timeframe: TrendingTimeframe;
  momentum: 'rising' | 'falling' | 'stable';
  percentile: number;
  communityRank?: number;
  globalRank?: number;
}

enum TrendingCategory {
  VIRAL = 'viral',
  HOT = 'hot',
  RISING = 'rising',
  POPULAR = 'popular',
  EMERGING = 'emerging'
}

enum TrendingTimeframe {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week'
}

interface TrendingAlgorithm {
  engagementVelocity: number;
  tokenActivity: number;
  socialProof: number;
  recencyBoost: number;
  communityFactor: number;
  globalFactor: number;
}

export const TrendingIndicators: React.FC<TrendingIndicatorsProps> = ({
  post,
  communityName,
  showAlgorithmInfo = false,
  className = ''
}) => {
  const [trendingData, setTrendingData] = useState<TrendingData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Calculate trending score and data
  const calculateTrendingData = useCallback((): TrendingData => {
    const now = Date.now();
    const postAge = now - new Date(post.createdAt).getTime();
    const hoursSincePost = postAge / (1000 * 60 * 60);

    // Engagement velocity (engagement per hour)
    const totalEngagement = post.reactions.reduce((sum, r) => sum + r.users.length, 0) + 
                           post.comments + post.shares;
    const engagementVelocity = hoursSincePost > 0 ? totalEngagement / hoursSincePost : totalEngagement;

    // Token activity score
    const tokenActivity = post.reactions.reduce((sum, r) => sum + r.totalAmount, 0) +
                         post.tips.reduce((sum, t) => sum + t.amount, 0);

    // Social proof score
    const socialProof = post.socialProof ? (
      post.socialProof.followedUsersWhoEngaged.length * 10 +
      post.socialProof.communityLeadersWhoEngaged.length * 25 +
      post.socialProof.verifiedUsersWhoEngaged.length * 15
    ) : 0;

    // Recency boost (higher for newer posts)
    const recencyBoost = Math.max(0, 24 - hoursSincePost) / 24;

    // Community factor (how it performs relative to community average)
    const communityFactor = 1.2; // Mock value, would be calculated from community stats

    // Global factor (how it performs relative to platform average)
    const globalFactor = 1.0; // Mock value, would be calculated from global stats

    // Calculate final trending score
    const algorithm: TrendingAlgorithm = {
      engagementVelocity: engagementVelocity * 10,
      tokenActivity: tokenActivity * 0.1,
      socialProof: socialProof,
      recencyBoost: recencyBoost * 50,
      communityFactor: communityFactor * 20,
      globalFactor: globalFactor * 10
    };

    const rawScore = Object.values(algorithm).reduce((sum, value) => sum + value, 0);
    const score = Math.round(rawScore);

    // Determine category based on score
    let category: TrendingCategory;
    if (score >= 500) category = TrendingCategory.VIRAL;
    else if (score >= 200) category = TrendingCategory.HOT;
    else if (score >= 100) category = TrendingCategory.RISING;
    else if (score >= 50) category = TrendingCategory.POPULAR;
    else category = TrendingCategory.EMERGING;

    // Determine timeframe based on post age
    let timeframe: TrendingTimeframe;
    if (hoursSincePost <= 1) timeframe = TrendingTimeframe.HOUR;
    else if (hoursSincePost <= 24) timeframe = TrendingTimeframe.DAY;
    else timeframe = TrendingTimeframe.WEEK;

    // Calculate momentum (simplified)
    const momentum: 'rising' | 'falling' | 'stable' = 
      post.trendingScore && score > post.trendingScore ? 'rising' :
      post.trendingScore && score < post.trendingScore ? 'falling' : 'stable';

    // Calculate percentile (mock calculation)
    const percentile = Math.min(99, Math.max(1, Math.round((score / 1000) * 100)));

    return {
      score,
      rank: Math.floor(Math.random() * 100) + 1, // Mock rank
      category,
      timeframe,
      momentum,
      percentile,
      communityRank: Math.floor(Math.random() * 50) + 1, // Mock community rank
      globalRank: Math.floor(Math.random() * 1000) + 1 // Mock global rank
    };
  }, [post]);

  // Update trending data
  useEffect(() => {
    setIsCalculating(true);
    const data = calculateTrendingData();
    setTrendingData(data);
    setLastUpdate(new Date());
    setIsCalculating(false);
  }, [calculateTrendingData]);

  // Real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setIsCalculating(true);
      setTimeout(() => {
        const data = calculateTrendingData();
        setTrendingData(data);
        setLastUpdate(new Date());
        setIsCalculating(false);
      }, 500);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [calculateTrendingData]);

  if (!trendingData) return null;

  // Get category styling
  const getCategoryStyle = (category: TrendingCategory) => {
    switch (category) {
      case TrendingCategory.VIRAL:
        return {
          bg: 'bg-red-100 dark:bg-red-900/20',
          text: 'text-red-700 dark:text-red-300',
          icon: '🔥',
          label: 'VIRAL'
        };
      case TrendingCategory.HOT:
        return {
          bg: 'bg-orange-100 dark:bg-orange-900/20',
          text: 'text-orange-700 dark:text-orange-300',
          icon: '🌶️',
          label: 'HOT'
        };
      case TrendingCategory.RISING:
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900/20',
          text: 'text-yellow-700 dark:text-yellow-300',
          icon: '📈',
          label: 'RISING'
        };
      case TrendingCategory.POPULAR:
        return {
          bg: 'bg-green-100 dark:bg-green-900/20',
          text: 'text-green-700 dark:text-green-300',
          icon: '⭐',
          label: 'POPULAR'
        };
      case TrendingCategory.EMERGING:
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/20',
          text: 'text-blue-700 dark:text-blue-300',
          icon: '🌱',
          label: 'EMERGING'
        };
    }
  };

  // Get momentum styling
  const getMomentumStyle = (momentum: 'rising' | 'falling' | 'stable') => {
    switch (momentum) {
      case 'rising':
        return { icon: '↗️', color: 'text-green-600 dark:text-green-400' };
      case 'falling':
        return { icon: '↘️', color: 'text-red-600 dark:text-red-400' };
      case 'stable':
        return { icon: '➡️', color: 'text-gray-600 dark:text-gray-400' };
    }
  };

  const categoryStyle = getCategoryStyle(trendingData.category);
  const momentumStyle = getMomentumStyle(trendingData.momentum);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Trending Badge */}
      <div className="flex items-center space-x-3">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${categoryStyle.bg} ${categoryStyle.text} ${isCalculating ? 'animate-pulse' : ''}`}>
          <span className="mr-1">{categoryStyle.icon}</span>
          <span>{categoryStyle.label}</span>
          {communityName && (
            <span className="ml-1 text-xs opacity-75">
              in {communityName}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <span className={momentumStyle.color}>
            {momentumStyle.icon}
          </span>
          <span>Score: {trendingData.score.toLocaleString()}</span>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
          <div className="text-xs text-gray-500 dark:text-gray-400">Percentile</div>
          <div className="font-medium text-gray-900 dark:text-white">
            Top {100 - trendingData.percentile}%
          </div>
        </div>

        {trendingData.communityRank && (
          <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
            <div className="text-xs text-gray-500 dark:text-gray-400">Community Rank</div>
            <div className="font-medium text-gray-900 dark:text-white">
              #{trendingData.communityRank}
            </div>
          </div>
        )}

        <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
          <div className="text-xs text-gray-500 dark:text-gray-400">Timeframe</div>
          <div className="font-medium text-gray-900 dark:text-white capitalize">
            {trendingData.timeframe}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
          <div className="text-xs text-gray-500 dark:text-gray-400">Updated</div>
          <div className="font-medium text-gray-900 dark:text-white">
            {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Algorithm Breakdown */}
      {showAlgorithmInfo && (
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Trending Algorithm Breakdown
          </h5>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span>Engagement Velocity:</span>
              <span className="font-mono">+{Math.round(trendingData.score * 0.4)}</span>
            </div>
            <div className="flex justify-between">
              <span>Token Activity:</span>
              <span className="font-mono">+{Math.round(trendingData.score * 0.2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Social Proof:</span>
              <span className="font-mono">+{Math.round(trendingData.score * 0.15)}</span>
            </div>
            <div className="flex justify-between">
              <span>Recency Boost:</span>
              <span className="font-mono">+{Math.round(trendingData.score * 0.1)}</span>
            </div>
            <div className="flex justify-between">
              <span>Community Factor:</span>
              <span className="font-mono">+{Math.round(trendingData.score * 0.1)}</span>
            </div>
            <div className="flex justify-between">
              <span>Global Factor:</span>
              <span className="font-mono">+{Math.round(trendingData.score * 0.05)}</span>
            </div>
            <div className="border-t border-gray-300 dark:border-gray-600 pt-2 flex justify-between font-medium">
              <span>Total Score:</span>
              <span className="font-mono">{trendingData.score}</span>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Update Indicator */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>
          Trending in {communityName || 'Global Feed'}
        </span>
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${isCalculating ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
          <span>
            {isCalculating ? 'Updating...' : 'Live'}
          </span>
        </div>
      </div>
    </div>
  );
};

// Hook for content recommendation based on user behavior
export const useContentRecommendation = (userId: string) => {
  const [recommendations, setRecommendations] = useState<EnhancedPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const generateRecommendations = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Get user's view history
      const viewHistory = Object.keys(localStorage)
        .filter(key => key.startsWith('view-'))
        .map(key => {
          try {
            return JSON.parse(localStorage.getItem(key) || '{}');
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      // Get user's bookmark history
      const bookmarkHistory = Object.keys(localStorage)
        .filter(key => key.startsWith('bookmark-'))
        .map(key => {
          try {
            return JSON.parse(localStorage.getItem(key) || '{}');
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      // Analyze patterns (simplified)
      const viewedTags = viewHistory.flatMap((view: any) => view.tags || []);
      const bookmarkedTags = bookmarkHistory.flatMap((bookmark: any) => bookmark.tags || []);
      const preferredTags = [...new Set([...viewedTags, ...bookmarkedTags])];

      // Mock recommendation generation
      // In a real implementation, this would call an API
      const mockRecommendations: EnhancedPost[] = [];
      
      setRecommendations(mockRecommendations);
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    generateRecommendations();
  }, [generateRecommendations]);

  return { recommendations, isLoading, refreshRecommendations: generateRecommendations };
};

export default TrendingIndicators;