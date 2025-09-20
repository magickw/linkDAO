import React, { useState, useEffect } from 'react';
import { EnhancedPost as FeedEnhancedPost } from '../../types/feed';
import { EnhancedPost } from '../EnhancedPostCard/EnhancedPostCard';
import type { TrendingLevel } from '../TrendingBadge/TrendingBadge';
import { FeedService } from '../../services/feedService';

interface TrendingContentDetectorProps {
  posts: EnhancedPost[];
  onTrendingUpdate: (trendingPosts: EnhancedPost[]) => void;
  className?: string;
}

interface TrendingAlgorithmConfig {
  engagementWeight: number;
  recencyWeight: number;
  velocityWeight: number;
  socialProofWeight: number;
  minEngagementThreshold: number;
  trendingDecayHours: number;
}

const DEFAULT_CONFIG: TrendingAlgorithmConfig = {
  engagementWeight: 0.4,
  recencyWeight: 0.3,
  velocityWeight: 0.2,
  socialProofWeight: 0.1,
  minEngagementThreshold: 10,
  trendingDecayHours: 24
};

export default function TrendingContentDetector({
  posts,
  onTrendingUpdate,
  className = ''
}: TrendingContentDetectorProps) {
  const [trendingPosts, setTrendingPosts] = useState<EnhancedPost[]>([]);
  const [config, setConfig] = useState<TrendingAlgorithmConfig>(DEFAULT_CONFIG);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Analyze trending content when posts change
  useEffect(() => {
    if (posts.length > 0) {
      analyzeTrendingContent(posts);
    }
  }, [posts, config]);

  const analyzeTrendingContent = async (postsToAnalyze: EnhancedPost[]) => {
    setIsAnalyzing(true);

    try {
      // Calculate trending scores for all posts
      const postsWithScores = postsToAnalyze.map(post => ({
        ...post,
        trendingScore: calculateTrendingScore(post, config),
        trendingStatus: determineTrendingLevel(post, config) || undefined
      }));

      // Sort by trending score and filter trending posts
      const trending = postsWithScores
        .filter(post => post.trendingStatus !== undefined)
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, 10); // Top 10 trending posts

      setTrendingPosts(trending);
      onTrendingUpdate(trending);

      // Fetch additional trending data from backend
      try {
        // Backend trending would return FeedEnhancedPost[], need to convert
        const backendTrending = await FeedService.getTrendingPosts('day', 5);
        // For now, just use local trending since we'd need conversion
        setTrendingPosts(trending);
        onTrendingUpdate(trending);
      } catch (error) {
        console.warn('Failed to fetch backend trending data:', error);
        setTrendingPosts(trending);
        onTrendingUpdate(trending);
      }
    } catch (error) {
      console.error('Error analyzing trending content:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className={`trending-content-detector ${className}`}>
      {/* Trending indicator */}
      {isAnalyzing && (
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
          <div className="animate-pulse w-2 h-2 bg-orange-500 rounded-full" />
          <span>Analyzing trending content...</span>
        </div>
      )}

      {/* Trending summary */}
      {trendingPosts.length > 0 && (
        <TrendingSummary posts={trendingPosts} />
      )}
    </div>
  );
}

// Calculate trending score for a post
function calculateTrendingScore(post: EnhancedPost, config: TrendingAlgorithmConfig): number {
  const now = Date.now();
  const postTime = new Date(post.createdAt).getTime();
  const hoursOld = (now - postTime) / (1000 * 60 * 60);

  // Engagement score (reactions, tips, comments, shares)
  const engagementScore = (
    post.reactions.reduce((sum, r) => sum + r.totalStaked, 0) * 2 +
    post.tips.reduce((sum, t) => sum + t.amount, 0) * 3 +
    post.comments * 1.5 +
    post.shares * 2
  );

  // Recency score (newer posts get higher scores)
  const recencyScore = Math.max(0, 100 - (hoursOld * 2));

  // Velocity score (engagement rate over time)
  const velocityScore = hoursOld > 0 ? engagementScore / hoursOld : engagementScore;

  // Social proof score (engagement from followed users)
  const socialProofScore = post.socialProof.totalEngagementFromFollowed * 5;

  // Combine scores with weights
  const totalScore = (
    engagementScore * config.engagementWeight +
    recencyScore * config.recencyWeight +
    velocityScore * config.velocityWeight +
    socialProofScore * config.socialProofWeight
  );

  return Math.max(0, totalScore);
}

// Determine trending level based on score and other factors
function determineTrendingLevel(post: EnhancedPost, config: TrendingAlgorithmConfig): TrendingLevel | null {
  const score = calculateTrendingScore(post, config);
  const hoursOld = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);

  // Don't consider posts older than decay threshold
  if (hoursOld > config.trendingDecayHours) {
    return null;
  }

  // Must meet minimum engagement threshold
  if (post.engagementScore < config.minEngagementThreshold) {
    return null;
  }

  // Determine level based on score thresholds
  if (score > 1000) return 'viral';
  if (score > 500) return 'hot';
  if (score > 100) return 'rising';
  
  return null;
}

// Merge trending posts from different sources
function mergeTrendingPosts(local: EnhancedPost[], backend: EnhancedPost[]): EnhancedPost[] {
  const merged = new Map<string, EnhancedPost>();

  // Add local trending posts
  local.forEach(post => merged.set(post.id, post));

  // Add backend trending posts (don't override local)
  backend.forEach(post => {
    if (!merged.has(post.id)) {
      merged.set(post.id, post);
    }
  });

  // Sort by trending score and return top 10
  return Array.from(merged.values())
    .sort((a, b) => (b as any).trendingScore - (a as any).trendingScore)
    .slice(0, 10);
}

// Trending summary component
interface TrendingSummaryProps {
  posts: EnhancedPost[];
}

function TrendingSummary({ posts }: TrendingSummaryProps) {
  const viralCount = posts.filter(p => p.trendingStatus === 'viral').length;
  const hotCount = posts.filter(p => p.trendingStatus === 'hot').length;
  const risingCount = posts.filter(p => p.trendingStatus === 'rising').length;

  return (
    <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg p-3 mb-4">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <span className="text-lg">🔥</span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Trending Now
          </span>
        </div>

        <div className="flex items-center space-x-4 text-sm">
          {viralCount > 0 && (
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-gray-600 dark:text-gray-400">
                {viralCount} Viral
              </span>
            </div>
          )}
          
          {hotCount > 0 && (
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-orange-500 rounded-full" />
              <span className="text-gray-600 dark:text-gray-400">
                {hotCount} Hot
              </span>
            </div>
          )}
          
          {risingCount > 0 && (
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-gray-600 dark:text-gray-400">
                {risingCount} Rising
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Trending badge component for individual posts
interface TrendingBadgeProps {
  level: TrendingLevel | null;
  score?: number;
  className?: string;
}

export function TrendingBadge({ level, score, className = '' }: TrendingBadgeProps) {
  if (!level) return null;
  
  const configs: Record<TrendingLevel, any> = {
    'viral': {
      icon: '🚀',
      label: 'Viral',
      color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      animation: 'animate-pulse'
    },
    'hot': {
      icon: '🔥',
      label: 'Hot',
      color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
      animation: 'animate-bounce'
    },
    'rising': {
      icon: '📈',
      label: 'Rising',
      color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      animation: ''
    },
    'breaking': {
      icon: '⚡',
      label: 'Breaking',
      color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      animation: 'animate-bounce'
    }
  };

  const config = configs[level];

  return (
    <div className={`
      inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium
      ${config.color} ${config.animation} ${className}
    `}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
      {score && (
        <span className="opacity-75">
          {Math.round(score)}
        </span>
      )}
    </div>
  );
}

// Hook for using trending detection
export function useTrendingDetection(posts: EnhancedPost[]) {
  const [trendingPosts, setTrendingPosts] = useState<EnhancedPost[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (posts.length === 0) return;

    setIsAnalyzing(true);

    const analyzeTrending = async () => {
      try {
        // For now, just use local analysis since we'd need conversion
        const localTrending = posts
          .filter(post => post.engagementScore > 50)
          .sort((a, b) => b.engagementScore - a.engagementScore)
          .slice(0, 5);
        setTrendingPosts(localTrending);
      } catch (error) {
        console.error('Error analyzing trending posts:', error);
        setTrendingPosts([]);
      } finally {
        setIsAnalyzing(false);
      }
    };

    analyzeTrending();
  }, [posts]);

  return {
    trendingPosts,
    isAnalyzing
  };
}