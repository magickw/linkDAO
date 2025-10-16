import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { EnhancedPost } from '../../types/feed';
import { TrendingLevel } from '../TrendingBadge/TrendingBadge';

interface TrendingDetectorProps {
  posts: EnhancedPost[];
  onTrendingUpdate: (trendingPosts: EnhancedPost[]) => void;
  updateInterval?: number; // milliseconds
  enabled?: boolean;
}

interface TrendingMetrics {
  postId: string;
  velocityScore: number; // Rate of engagement increase
  momentumScore: number; // Sustained engagement over time
  viralityScore: number; // Exponential growth pattern
  qualityScore: number; // Engagement quality vs quantity
  recencyBoost: number; // Boost for newer content
  finalScore: number;
  trendingLevel: TrendingLevel | null;
  reasons: string[];
}

interface EngagementSnapshot {
  timestamp: number;
  reactions: number;
  tips: number;
  comments: number;
  shares: number;
  views: number;
  totalEngagement: number;
}

interface TrendingThresholds {
  rising: number;
  hot: number;
  viral: number;
}

const DEFAULT_THRESHOLDS: TrendingThresholds = {
  rising: 0.3,
  hot: 0.6,
  viral: 0.85
};

const TRENDING_WEIGHTS = {
  velocity: 0.3,
  momentum: 0.25,
  virality: 0.2,
  quality: 0.15,
  recency: 0.1
};

export default function TrendingDetector({
  posts,
  onTrendingUpdate,
  updateInterval = 120000, // 2 minutes
  enabled = true
}: TrendingDetectorProps) {
  // State
  const [engagementHistory, setEngagementHistory] = useState<Map<string, EngagementSnapshot[]>>(new Map());
  const [trendingMetrics, setTrendingMetrics] = useState<TrendingMetrics[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Update trending analysis periodically
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      analyzeTrendingContent();
    }, updateInterval);

    // Initial analysis
    analyzeTrendingContent();

    return () => clearInterval(interval);
  }, [posts, enabled, updateInterval]);

  // Analyze trending content
  const analyzeTrendingContent = useCallback(async () => {
    if (!enabled || posts.length === 0 || isProcessing) return;

    setIsProcessing(true);
    const now = Date.now();

    try {
      // Update engagement history
      const newHistory = new Map(engagementHistory);
      
      posts.forEach(post => {
        const snapshot: EngagementSnapshot = {
          timestamp: now,
          reactions: post.reactions.reduce((sum, r) => sum + r.totalAmount, 0),
          tips: post.tips.reduce((sum, t) => sum + t.amount, 0),
          comments: post.comments,
          shares: post.shares,
          views: post.views,
          totalEngagement: post.engagementScore
        };

        const postHistory = newHistory.get(post.id) || [];
        postHistory.push(snapshot);
        
        // Keep only last 24 hours of data
        const cutoffTime = now - (24 * 60 * 60 * 1000);
        const filteredHistory = postHistory.filter(s => s.timestamp > cutoffTime);
        
        newHistory.set(post.id, filteredHistory);
      });

      setEngagementHistory(newHistory);

      // Calculate trending metrics for each post
      const metrics = await Promise.all(
        posts.map(post => calculateTrendingMetrics(post, newHistory.get(post.id) || []))
      );

      setTrendingMetrics(metrics);

      // Filter and sort trending posts
      const trendingPosts = posts
        .map(post => {
          const metric = metrics.find(m => m.postId === post.id);
          return {
            ...post,
            trendingStatus: metric?.trendingLevel || undefined,
            trendingScore: metric?.finalScore || 0,
            trendingReasons: metric?.reasons || []
          };
        })
        .filter(post => post.trendingStatus !== undefined)
        .sort((a, b) => b.trendingScore - a.trendingScore);

      onTrendingUpdate(trendingPosts);
      setLastUpdateTime(now);

    } catch (error) {
      console.error('Trending analysis failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [posts, engagementHistory, enabled, isProcessing, onTrendingUpdate]);

  // Calculate trending metrics for a single post
  const calculateTrendingMetrics = useCallback(async (
    post: EnhancedPost,
    history: EngagementSnapshot[]
  ): Promise<TrendingMetrics> => {
    // Velocity Score - Rate of engagement increase
    const velocityScore = calculateVelocityScore(history);

    // Momentum Score - Sustained engagement over time
    const momentumScore = calculateMomentumScore(history);

    // Virality Score - Exponential growth pattern
    const viralityScore = calculateViralityScore(history);

    // Quality Score - Engagement quality vs quantity
    const qualityScore = calculateQualityScore(post, history);

    // Recency Boost - Boost for newer content
    const recencyBoost = calculateRecencyBoost(post.createdAt);

    // Calculate weighted final score
    const finalScore = (
      velocityScore * TRENDING_WEIGHTS.velocity +
      momentumScore * TRENDING_WEIGHTS.momentum +
      viralityScore * TRENDING_WEIGHTS.virality +
      qualityScore * TRENDING_WEIGHTS.quality +
      recencyBoost * TRENDING_WEIGHTS.recency
    );

    // Determine trending level
    const trendingLevel = determineTrendingLevel(finalScore);

    // Generate explanation reasons
    const reasons = generateTrendingReasons(post, {
      velocityScore,
      momentumScore,
      viralityScore,
      qualityScore,
      recencyBoost,
      finalScore
    });

    return {
      postId: post.id,
      velocityScore,
      momentumScore,
      viralityScore,
      qualityScore,
      recencyBoost,
      finalScore,
      trendingLevel,
      reasons
    };
  }, []);

  // Calculate velocity score (rate of change)
  const calculateVelocityScore = useCallback((history: EngagementSnapshot[]): number => {
    if (history.length < 2) return 0;

    const recent = history.slice(-3); // Last 3 snapshots
    if (recent.length < 2) return 0;

    let totalVelocity = 0;
    let validPairs = 0;

    for (let i = 1; i < recent.length; i++) {
      const current = recent[i];
      const previous = recent[i - 1];
      const timeDiff = (current.timestamp - previous.timestamp) / (1000 * 60); // minutes
      
      if (timeDiff > 0) {
        const engagementDiff = current.totalEngagement - previous.totalEngagement;
        const velocity = engagementDiff / timeDiff; // engagement per minute
        totalVelocity += Math.max(0, velocity);
        validPairs++;
      }
    }

    if (validPairs === 0) return 0;

    const avgVelocity = totalVelocity / validPairs;
    return Math.min(avgVelocity / 10, 1); // Normalize to 0-1
  }, []);

  // Calculate momentum score (sustained growth)
  const calculateMomentumScore = useCallback((history: EngagementSnapshot[]): number => {
    if (history.length < 3) return 0;

    const windows = [];
    const windowSize = Math.max(2, Math.floor(history.length / 3));

    // Create overlapping windows
    for (let i = 0; i <= history.length - windowSize; i++) {
      const window = history.slice(i, i + windowSize);
      const growth = window[window.length - 1].totalEngagement - window[0].totalEngagement;
      windows.push(growth);
    }

    // Check for consistent positive growth
    const positiveWindows = windows.filter(growth => growth > 0).length;
    const momentum = positiveWindows / windows.length;

    return momentum;
  }, []);

  // Calculate virality score (exponential growth pattern)
  const calculateViralityScore = useCallback((history: EngagementSnapshot[]): number => {
    if (history.length < 4) return 0;

    const growthRates = [];
    
    for (let i = 1; i < history.length; i++) {
      const current = history[i].totalEngagement;
      const previous = history[i - 1].totalEngagement;
      
      if (previous > 0) {
        const growthRate = (current - previous) / previous;
        growthRates.push(growthRate);
      }
    }

    if (growthRates.length < 2) return 0;

    // Check for accelerating growth (virality indicator)
    let acceleratingPeriods = 0;
    for (let i = 1; i < growthRates.length; i++) {
      if (growthRates[i] > growthRates[i - 1] && growthRates[i] > 0.1) {
        acceleratingPeriods++;
      }
    }

    const viralityRatio = acceleratingPeriods / (growthRates.length - 1);
    
    // Boost score if recent growth is exponential
    const recentGrowth = growthRates.slice(-2);
    const isExponential = recentGrowth.every(rate => rate > 0.2);
    
    return Math.min(viralityRatio + (isExponential ? 0.3 : 0), 1);
  }, []);

  // Calculate quality score (engagement quality)
  const calculateQualityScore = useCallback((post: EnhancedPost, history: EngagementSnapshot[]): number => {
    let score = 0;

    // Engagement diversity (different types of engagement)
    const hasReactions = post.reactions.length > 0;
    const hasTips = post.tips.length > 0;
    const hasComments = post.comments > 0;
    const hasShares = post.shares > 0;

    const diversityScore = [hasReactions, hasTips, hasComments, hasShares].filter(Boolean).length / 4;
    score += diversityScore * 0.4;

    // Engagement rate vs views
    if (post.views > 0) {
      const engagementRate = post.engagementScore / post.views;
      score += Math.min(engagementRate * 5, 0.3);
    }

    // High-value interactions (tips, quality comments)
    const tipValue = post.tips.reduce((sum, tip) => sum + tip.amount, 0);
    if (tipValue > 0) {
      score += Math.min(tipValue / 50, 0.3);
    }

    return Math.min(score, 1);
  }, []);

  // Calculate recency boost
  const calculateRecencyBoost = useCallback((createdAt: Date): number => {
    const ageInHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    
    // Strong boost for content under 6 hours old
    if (ageInHours < 6) return 1;
    
    // Gradual decay over 24 hours
    if (ageInHours < 24) return 1 - (ageInHours - 6) / 18;
    
    // Minimal boost for older content
    return 0.1;
  }, []);

  // Determine trending level based on final score
  const determineTrendingLevel = useCallback((score: number): TrendingLevel | null => {
    if (score >= DEFAULT_THRESHOLDS.viral) return 'viral';
    if (score >= DEFAULT_THRESHOLDS.hot) return 'hot';
    if (score >= DEFAULT_THRESHOLDS.rising) return 'rising';
    return null;
  }, []);

  // Generate human-readable reasons for trending status
  const generateTrendingReasons = useCallback((post: EnhancedPost, scores: {
    velocityScore: number;
    momentumScore: number;
    viralityScore: number;
    qualityScore: number;
    recencyBoost: number;
    finalScore: number;
  }): string[] => {
    const reasons: string[] = [];

    if (scores.velocityScore > 0.7) {
      reasons.push('Rapidly gaining engagement');
    }

    if (scores.momentumScore > 0.8) {
      reasons.push('Sustained growth over time');
    }

    if (scores.viralityScore > 0.6) {
      reasons.push('Exponential growth pattern detected');
    }

    if (scores.qualityScore > 0.7) {
      reasons.push('High-quality engagement');
    }

    if (scores.recencyBoost > 0.8) {
      reasons.push('Fresh content with immediate traction');
    }

    // Content-specific reasons
    if (post.tips.length > 0) {
      reasons.push('Receiving tips from community');
    }

    if (post.comments > 20) {
      reasons.push('Generating significant discussion');
    }

    if (post.shares > 10) {
      reasons.push('Being widely shared');
    }

    return reasons;
  }, []);

  // Get trending insights
  const getTrendingInsights = useMemo(() => {
    if (!trendingMetrics.length) return null;

    const trendingCount = trendingMetrics.filter(m => m.trendingLevel).length;
    const avgScore = trendingMetrics.reduce((sum, m) => sum + m.finalScore, 0) / trendingMetrics.length;
    
    const levelCounts = trendingMetrics.reduce((acc, m) => {
      if (m.trendingLevel) {
        acc[m.trendingLevel] = (acc[m.trendingLevel] || 0) + 1;
      }
      return acc;
    }, {} as Record<TrendingLevel, number>);

    return {
      totalPosts: trendingMetrics.length,
      trendingPosts: trendingCount,
      averageScore: avgScore,
      levelBreakdown: levelCounts,
      lastUpdate: lastUpdateTime,
      isProcessing
    };
  }, [trendingMetrics, lastUpdateTime, isProcessing]);

  // Expose insights for debugging/monitoring
  React.useEffect(() => {
    if (getTrendingInsights && process.env.NODE_ENV === 'development') {
      console.log('Trending Insights:', getTrendingInsights);
    }
  }, [getTrendingInsights]);

  // This component doesn't render anything - it's a processing component
  return null;
}

// Hook for using trending detector
export function useTrendingDetector(posts: EnhancedPost[], enabled: boolean = true) {
  const [trendingPosts, setTrendingPosts] = useState<EnhancedPost[]>([]);
  const [insights, setInsights] = useState<any>(null);

  const handleTrendingUpdate = useCallback((newTrendingPosts: EnhancedPost[]) => {
    setTrendingPosts(newTrendingPosts);
  }, []);

  return {
    trendingPosts,
    insights,
    TrendingDetector: (props: Omit<TrendingDetectorProps, 'posts' | 'onTrendingUpdate'>) => (
      <TrendingDetector
        {...props}
        posts={posts}
        onTrendingUpdate={handleTrendingUpdate}
        enabled={enabled}
      />
    )
  };
}

// Trending content display component
interface TrendingContentDisplayProps {
  trendingPosts: EnhancedPost[];
  maxDisplay?: number;
  className?: string;
}

export function TrendingContentDisplay({
  trendingPosts,
  maxDisplay = 5,
  className = ''
}: TrendingContentDisplayProps) {
  const displayPosts = trendingPosts.slice(0, maxDisplay);

  if (displayPosts.length === 0) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800 ${className}`}>
      <div className="flex items-center space-x-2 mb-3">
        <span className="text-2xl">🔥</span>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Trending Now
        </h3>
      </div>

      <div className="space-y-2">
        {displayPosts.map((post, index) => (
          <div
            key={post.id}
            className="flex items-center space-x-3 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg hover:bg-white/70 dark:hover:bg-gray-800/70 transition-colors duration-200 cursor-pointer"
          >
            <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {index + 1}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {post.contentCid.substring(0, 60) + '...'}
              </p>
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Score: {(post.trendingScore || 0).toFixed(2)}</span>
                <span>•</span>
                <span>{post.engagementScore} engagement</span>
                {post.trendingStatus && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{post.trendingStatus}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {trendingPosts.length > maxDisplay && (
        <div className="mt-3 text-center">
          <button className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium">
            View all {trendingPosts.length} trending posts
          </button>
        </div>
      )}
    </div>
  );
}