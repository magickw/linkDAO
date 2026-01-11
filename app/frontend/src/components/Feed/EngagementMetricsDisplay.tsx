import React, { useState, useEffect, useCallback } from 'react';
import { EnhancedPost } from '../../types/feed';

interface EngagementMetricsDisplayProps {
  post: EnhancedPost;
  showDetailed?: boolean;
  showRealTimeUpdates?: boolean;
  className?: string;
}

interface EngagementMetrics {
  score: number;
  breakdown: {
    votes: number;
    comments: number;
    stakes: number;
    tips: number;
    views: number;
    reposts: number;
  };
  tokenActivity: {
    totalStaked: number;
    totalTipped: number;
    uniqueStakers: number;
    uniqueTippers: number;
  };
  governanceRelevance: number;
  trendingScore: number;
  socialProofScore: number;
}

interface MetricItem {
  label: string;
  value: number;
  icon: string;
  color: string;
  weight: number;
  description: string;
}

export const EngagementMetricsDisplay: React.FC<EngagementMetricsDisplayProps> = ({
  post,
  showDetailed = false,
  showRealTimeUpdates = true,
  className = ''
}) => {
  const [metrics, setMetrics] = useState<EngagementMetrics | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Calculate engagement metrics
  const calculateMetrics = useCallback((): EngagementMetrics => {
    const votes = post.reactions.reduce((sum, reaction) => sum + reaction.users.length, 0);
    const stakes = post.reactions.reduce((sum, reaction) => sum + reaction.totalAmount, 0);
    const tips = post.tips.reduce((sum, tip) => sum + tip.amount, 0);
    const uniqueStakers = new Set(post.reactions.flatMap(r => r.users.map(u => u.address))).size;
    const uniqueTippers = new Set(post.tips.map(t => t.from)).size;

    // Engagement score calculation with Web3 weighting
    const baseScore = (
      votes * 1 +
      post.comments * 2 +
      post.reposts * 3 +
      post.views * 0.1
    );

    const tokenScore = (
      stakes * 10 +
      tips * 5 +
      uniqueStakers * 20 +
      uniqueTippers * 15
    );

    const governanceRelevance = post.tags.some(tag => 
      ['governance', 'proposal', 'vote', 'dao'].includes(tag.toLowerCase())
    ) ? 50 : 0;

    const socialProofScore = post.socialProof ? (
      post.socialProof.followedUsersWhoEngaged.length * 25 +
      post.socialProof.communityLeadersWhoEngaged.length * 50 +
      post.socialProof.verifiedUsersWhoEngaged.length * 30
    ) : 0;

    const totalScore = baseScore + tokenScore + governanceRelevance + socialProofScore;

    return {
      score: Math.round(totalScore),
      breakdown: {
        votes,
        comments: post.comments,
        stakes: Math.round(stakes),
        tips: Math.round(tips),
        views: post.views,
        reposts: post.reposts
      },
      tokenActivity: {
        totalStaked: stakes,
        totalTipped: tips,
        uniqueStakers,
        uniqueTippers
      },
      governanceRelevance,
      trendingScore: post.trendingScore || 0,
      socialProofScore
    };
  }, [post]);

  // Update metrics
  useEffect(() => {
    const newMetrics = calculateMetrics();
    setMetrics(newMetrics);
    setLastUpdate(new Date());
  }, [calculateMetrics]);

  // Real-time updates simulation
  useEffect(() => {
    if (!showRealTimeUpdates) return;

    const interval = setInterval(() => {
      setIsUpdating(true);
      setTimeout(() => {
        const newMetrics = calculateMetrics();
        setMetrics(newMetrics);
        setLastUpdate(new Date());
        setIsUpdating(false);
      }, 500);
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [calculateMetrics, showRealTimeUpdates]);

  if (!metrics) return null;

  // Get score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 1000) return 'text-red-600 dark:text-red-400';
    if (score >= 500) return 'text-orange-600 dark:text-orange-400';
    if (score >= 100) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 50) return 'text-green-600 dark:text-green-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  // Get score badge
  const getScoreBadge = (score: number) => {
    if (score >= 1000) return { label: 'Viral', color: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300' };
    if (score >= 500) return { label: 'Hot', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300' };
    if (score >= 100) return { label: 'Rising', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300' };
    if (score >= 50) return { label: 'Active', color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' };
    return { label: 'New', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' };
  };

  const scoreBadge = getScoreBadge(metrics.score);

  // Metric items for detailed view
  const metricItems: MetricItem[] = [
    {
      label: 'Votes',
      value: metrics.breakdown.votes,
      icon: '👍',
      color: 'blue',
      weight: 1,
      description: 'Total upvotes and reactions'
    },
    {
      label: 'Comments',
      value: metrics.breakdown.comments,
      icon: '💬',
      color: 'green',
      weight: 2,
      description: 'Number of comments and replies'
    },
    {
      label: 'Stakes',
      value: metrics.breakdown.stakes,
      icon: '💎',
      color: 'purple',
      weight: 10,
      description: 'Total tokens staked on this post'
    },
    {
      label: 'Tips',
      value: metrics.breakdown.tips,
      icon: '💰',
      color: 'yellow',
      weight: 5,
      description: 'Total tokens tipped to author'
    },
    {
      label: 'Views',
      value: metrics.breakdown.views,
      icon: '👁️',
      color: 'gray',
      weight: 0.1,
      description: 'Number of times viewed'
    },
    {
      label: 'Reposts',
      value: metrics.breakdown.reposts,
      icon: '🔄',
      color: 'indigo',
      weight: 3,
      description: 'Times reposted'
    }
  ];

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Engagement Score
            </h4>
            <div className={`text-2xl font-bold ${getScoreColor(metrics.score)} ${isUpdating ? 'animate-pulse' : ''}`}>
              {metrics.score.toLocaleString()}
            </div>
            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${scoreBadge.color}`}>
              {scoreBadge.label}
            </span>
          </div>
          
          {showRealTimeUpdates && (
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <div className={`w-2 h-2 rounded-full ${isUpdating ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
              <span>
                {isUpdating ? 'Updating...' : `Updated ${lastUpdate.toLocaleTimeString()}`}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Compact View */}
        {!showDetailed && (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {metrics.breakdown.votes}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Votes</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                {metrics.breakdown.comments}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Comments</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                {metrics.breakdown.stakes}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Stakes</div>
            </div>
          </div>
        )}

        {/* Detailed View */}
        {showDetailed && (
          <div className="space-y-4">
            {/* Metric Breakdown */}
            <div>
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Engagement Breakdown
              </h5>
              <div className="grid grid-cols-2 gap-3">
                {metricItems.map(item => (
                  <div
                    key={item.label}
                    className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.label}
                        </span>
                        <span className={`text-sm font-semibold ${
                          item.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                          item.color === 'green' ? 'text-green-600 dark:text-green-400' :
                          item.color === 'purple' ? 'text-purple-600 dark:text-purple-400' :
                          item.color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
                          item.color === 'gray' ? 'text-gray-600 dark:text-gray-400' :
                          item.color === 'indigo' ? 'text-indigo-600 dark:text-indigo-400' :
                          'text-gray-600 dark:text-gray-400'
                        }`}>
                          {item.value.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Weight: {item.weight}x • {item.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Token Activity */}
            <div>
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Token Activity
              </h5>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span>💎</span>
                    <div>
                      <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
                        {metrics.tokenActivity.totalStaked.toLocaleString()} Staked
                      </div>
                      <div className="text-xs text-purple-600 dark:text-purple-400">
                        by {metrics.tokenActivity.uniqueStakers} users
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span>💰</span>
                    <div>
                      <div className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                        {metrics.tokenActivity.totalTipped.toLocaleString()} Tipped
                      </div>
                      <div className="text-xs text-yellow-600 dark:text-yellow-400">
                        by {metrics.tokenActivity.uniqueTippers} users
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Special Scores */}
            {(metrics.governanceRelevance > 0 || metrics.socialProofScore > 0) && (
              <div>
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Special Metrics
                </h5>
                <div className="space-y-2">
                  {metrics.governanceRelevance > 0 && (
                    <div className="flex items-center justify-between p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded">
                      <span className="text-sm text-indigo-700 dark:text-indigo-300">
                        🏛️ Governance Relevance
                      </span>
                      <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                        +{metrics.governanceRelevance}
                      </span>
                    </div>
                  )}
                  {metrics.socialProofScore > 0 && (
                    <div className="flex items-center justify-between p-2 bg-pink-50 dark:bg-pink-900/20 rounded">
                      <span className="text-sm text-pink-700 dark:text-pink-300">
                        👥 Social Proof
                      </span>
                      <span className="text-sm font-medium text-pink-600 dark:text-pink-400">
                        +{metrics.socialProofScore}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EngagementMetricsDisplay;