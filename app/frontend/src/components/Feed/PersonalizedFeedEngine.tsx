import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { EnhancedPost, FeedFilter } from '../../types/feed';
import { serviceWorkerCacheService } from '../../services/serviceWorkerCacheService';

interface PersonalizedFeedEngineProps {
  posts: EnhancedPost[];
  userAddress?: string;
  onPersonalizedPosts: (posts: EnhancedPost[]) => void;
  enabled?: boolean;
}

interface UserEngagementData {
  address: string;
  interactions: {
    reactions: Record<string, number>; // postId -> count
    tips: Record<string, number>; // postId -> amount
    comments: Record<string, number>; // postId -> count
    reposts: Record<string, number>; // postId -> count
    views: Record<string, number>; // postId -> duration
  };
  preferences: {
    favoriteTopics: string[];
    followedUsers: string[];
    joinedCommunities: string[];
    preferredContentTypes: string[];
    engagementPatterns: {
      timeOfDay: number[]; // 24 hour array
      dayOfWeek: number[]; // 7 day array
      sessionDuration: number; // average minutes
    };
  };
  behaviorScore: {
    curiosity: number; // 0-1, how often they explore new content
    loyalty: number; // 0-1, how often they engage with same creators
    social: number; // 0-1, how much they interact vs consume
    quality: number; // 0-1, preference for high-quality content
  };
}

interface ContentSignals {
  postId: string;
  relevanceScore: number;
  qualityScore: number;
  freshnessScore: number;
  socialProofScore: number;
  personalScore: number;
  finalScore: number;
  reasons: string[];
}

interface PersonalizationWeights {
  relevance: number;
  quality: number;
  freshness: number;
  socialProof: number;
  personal: number;
}

const DEFAULT_WEIGHTS: PersonalizationWeights = {
  relevance: 0.3,
  quality: 0.25,
  freshness: 0.2,
  socialProof: 0.15,
  personal: 0.1
};

export default function PersonalizedFeedEngine({
  posts,
  userAddress,
  onPersonalizedPosts,
  enabled = true
}: PersonalizedFeedEngineProps) {
  // State
  const [userEngagement, setUserEngagement] = useState<UserEngagementData | null>(null);
  const [personalizationWeights, setPersonalizationWeights] = useState<PersonalizationWeights>(DEFAULT_WEIGHTS);
  const [contentSignals, setContentSignals] = useState<ContentSignals[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastProcessedTime, setLastProcessedTime] = useState<number>(0);

  // Load user engagement data
  useEffect(() => {
    if (enabled && userAddress) {
      loadUserEngagementData();
    }
  }, [enabled, userAddress]);

  // Process posts when they change
  useEffect(() => {
    if (enabled && posts.length > 0 && userEngagement) {
      // Debounce processing to avoid excessive computation
      const now = Date.now();
      if (now - lastProcessedTime > 1000) { // Process at most once per second
        processPersonalizedFeed();
        setLastProcessedTime(now);
      }
    }
  }, [posts, userEngagement, personalizationWeights, enabled]);

  // Load user engagement data
  const loadUserEngagementData = useCallback(async () => {
    if (!userAddress) return;

    try {
      // Try cache first
      const cachedResponse = await serviceWorkerCacheService.cacheWithStrategy(
        `/api/users/${userAddress}/engagement`,
        'profiles',
        ['user-data', 'engagement']
      );

      let engagementData;
      if (cachedResponse) {
        engagementData = await cachedResponse.json();
      } else {
        // Generate mock engagement data for development
        engagementData = generateMockEngagementData(userAddress);
      }

      setUserEngagement(engagementData);
    } catch (error) {
      console.error('Failed to load user engagement data:', error);
      // Use mock data as fallback
      setUserEngagement(generateMockEngagementData(userAddress));
    }
  }, [userAddress]);

  // Process personalized feed
  const processPersonalizedFeed = useCallback(async () => {
    if (!userEngagement || posts.length === 0) return;

    setIsProcessing(true);
    try {
      // Calculate content signals for each post
      const signals = await Promise.all(
        posts.map(post => calculateContentSignals(post, userEngagement, personalizationWeights))
      );

      setContentSignals(signals);

      // Sort posts by final score
      const personalizedPosts = [...posts].sort((a, b) => {
        const scoreA = signals.find(s => s.postId === a.id)?.finalScore || 0;
        const scoreB = signals.find(s => s.postId === b.id)?.finalScore || 0;
        return scoreB - scoreA;
      });

      onPersonalizedPosts(personalizedPosts);
    } catch (error) {
      console.error('Personalization processing failed:', error);
      // Fallback to original order
      onPersonalizedPosts(posts);
    } finally {
      setIsProcessing(false);
    }
  }, [posts, userEngagement, personalizationWeights, onPersonalizedPosts]);

  // Calculate content signals for a post
  const calculateContentSignals = useCallback(async (
    post: EnhancedPost,
    engagement: UserEngagementData,
    weights: PersonalizationWeights
  ): Promise<ContentSignals> => {
    // Relevance Score (0-1)
    const relevanceScore = calculateRelevanceScore(post, engagement);

    // Quality Score (0-1)
    const qualityScore = calculateQualityScore(post);

    // Freshness Score (0-1)
    const freshnessScore = calculateFreshnessScore(post);

    // Social Proof Score (0-1)
    const socialProofScore = calculateSocialProofScore(post, engagement);

    // Personal Score (0-1)
    const personalScore = calculatePersonalScore(post, engagement);

    // Calculate weighted final score
    const finalScore = (
      relevanceScore * weights.relevance +
      qualityScore * weights.quality +
      freshnessScore * weights.freshness +
      socialProofScore * weights.socialProof +
      personalScore * weights.personal
    );

    // Generate explanation reasons
    const reasons = generateScoreReasons(post, {
      relevanceScore,
      qualityScore,
      freshnessScore,
      socialProofScore,
      personalScore
    });

    return {
      postId: post.id,
      relevanceScore,
      qualityScore,
      freshnessScore,
      socialProofScore,
      personalScore,
      finalScore,
      reasons
    };
  }, []);

  // Calculate relevance score based on user interests
  const calculateRelevanceScore = useCallback((post: EnhancedPost, engagement: UserEngagementData): number => {
    let score = 0;
    let factors = 0;

    // Topic relevance
    if (post.tags && post.tags.length > 0) {
      const topicMatch = post.tags.filter(tag => 
        engagement.preferences.favoriteTopics.includes(tag.toLowerCase())
      ).length;
      score += (topicMatch / post.tags.length) * 0.4;
      factors += 0.4;
    }

    // Community relevance
    if (post.communityId && engagement.preferences.joinedCommunities.includes(post.communityId)) {
      score += 0.3;
      factors += 0.3;
    }

    // Author relevance
    if (engagement.preferences.followedUsers.includes(post.author)) {
      score += 0.3;
      factors += 0.3;
    }

    return factors > 0 ? Math.min(score / factors, 1) : 0.1; // Minimum baseline score
  }, []);

  // Calculate quality score based on engagement metrics
  const calculateQualityScore = useCallback((post: EnhancedPost): number => {
    const engagementRate = post.views > 0 ? 
      (post.reactions.reduce((sum, r) => sum + r.totalAmount, 0) + post.comments + post.reposts) / post.views : 0;
    
    const tipValue = post.tips.reduce((sum, tip) => sum + tip.amount, 0);
    const hasMedia = post.mediaCids && post.mediaCids.length > 0;
    const hasPreview = post.previews.length > 0;
    const contentLength = post.contentCid ? post.contentCid.length : 0;

    let score = 0;
    
    // Engagement rate (0-0.4)
    score += Math.min(engagementRate * 10, 0.4);
    
    // Tip value indicates quality (0-0.3)
    score += Math.min(tipValue / 100, 0.3);
    
    // Rich content bonus (0-0.2)
    if (hasMedia || hasPreview) score += 0.1;
    if (hasMedia && hasPreview) score += 0.1;
    
    // Content length sweet spot (0-0.1)
    if (contentLength >= 100 && contentLength <= 500) score += 0.1;

    return Math.min(score, 1);
  }, []);

  // Calculate freshness score based on post age
  const calculateFreshnessScore = useCallback((post: EnhancedPost): number => {
    const ageInHours = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
    
    // Exponential decay with half-life of 24 hours
    return Math.exp(-ageInHours / 24);
  }, []);

  // Calculate social proof score
  const calculateSocialProofScore = useCallback((post: EnhancedPost, engagement: UserEngagementData): number => {
    let score = 0;

    // Followed users engagement
    const followedEngagement = post.socialProof?.followedUsersWhoEngaged?.length || 0;
    if (followedEngagement > 0) {
      score += Math.min(followedEngagement / 5, 0.5); // Max 0.5 for followed users
    }

    // Community leaders engagement
    const leaderEngagement = post.socialProof?.communityLeadersWhoEngaged?.length || 0;
    if (leaderEngagement > 0) {
      score += Math.min(leaderEngagement / 3, 0.3); // Max 0.3 for leaders
    }

    // Verified users engagement
    const verifiedEngagement = post.socialProof?.verifiedUsersWhoEngaged?.length || 0;
    if (verifiedEngagement > 0) {
      score += Math.min(verifiedEngagement / 2, 0.2); // Max 0.2 for verified
    }

    return Math.min(score, 1);
  }, []);

  // Calculate personal score based on user behavior patterns
  const calculatePersonalScore = useCallback((post: EnhancedPost, engagement: UserEngagementData): number => {
    let score = 0;

    // Content type preference
    if (engagement.preferences.preferredContentTypes.includes(post.contentType || 'text')) {
      score += 0.3;
    }

    // Previous interaction with author
    const authorInteractions = Object.values(engagement.interactions.reactions).reduce((sum, count) => sum + count, 0);
    if (authorInteractions > 0) {
      score += Math.min(authorInteractions / 10, 0.3);
    }

    // Behavior score alignment
    const behaviorAlignment = calculateBehaviorAlignment(post, engagement.behaviorScore);
    score += behaviorAlignment * 0.4;

    return Math.min(score, 1);
  }, []);

  // Calculate how well post aligns with user behavior patterns
  const calculateBehaviorAlignment = useCallback((post: EnhancedPost, behaviorScore: UserEngagementData['behaviorScore']): number => {
    let alignment = 0;

    // Curiosity alignment - new authors/communities for curious users
    const isNewContent = !(post.socialProof?.followedUsersWhoEngaged?.length || 0);
    if (behaviorScore.curiosity > 0.7 && isNewContent) alignment += 0.25;
    if (behaviorScore.curiosity < 0.3 && !isNewContent) alignment += 0.25;

    // Quality alignment - high engagement posts for quality-focused users
    const isHighQuality = post.engagementScore > 500;
    if (behaviorScore.quality > 0.7 && isHighQuality) alignment += 0.25;

    // Social alignment - posts with high interaction for social users
    const hasHighInteraction = post.comments > 10 || post.reposts > 5;
    if (behaviorScore.social > 0.7 && hasHighInteraction) alignment += 0.25;

    // Loyalty alignment - posts from followed creators for loyal users
    const isFromFollowed = (post.socialProof?.followedUsersWhoEngaged?.length || 0) > 0;
    if (behaviorScore.loyalty > 0.7 && isFromFollowed) alignment += 0.25;

    return alignment;
  }, []);

  // Generate human-readable reasons for the score
  const generateScoreReasons = useCallback((post: EnhancedPost, scores: {
    relevanceScore: number;
    qualityScore: number;
    freshnessScore: number;
    socialProofScore: number;
    personalScore: number;
  }): string[] => {
    const reasons: string[] = [];

    if (scores.relevanceScore > 0.7) {
      reasons.push('Highly relevant to your interests');
    } else if (scores.relevanceScore > 0.4) {
      reasons.push('Somewhat relevant to your interests');
    }

    if (scores.qualityScore > 0.7) {
      reasons.push('High-quality content with good engagement');
    }

    if (scores.freshnessScore > 0.8) {
      reasons.push('Fresh content posted recently');
    }

    if (scores.socialProofScore > 0.5) {
      reasons.push('People you follow have engaged with this');
    }

    if (scores.personalScore > 0.6) {
      reasons.push('Matches your content preferences');
    }

    if (post.trendingStatus) {
      reasons.push(`Trending ${post.trendingStatus} content`);
    }

    return reasons;
  }, []);

  // Adjust personalization weights
  const adjustWeights = useCallback((newWeights: Partial<PersonalizationWeights>) => {
    setPersonalizationWeights(prev => ({ ...prev, ...newWeights }));
  }, []);

  // Get personalization insights
  const getPersonalizationInsights = useMemo(() => {
    if (!contentSignals.length) return null;

    const avgScores = contentSignals.reduce((acc, signal) => ({
      relevance: acc.relevance + signal.relevanceScore,
      quality: acc.quality + signal.qualityScore,
      freshness: acc.freshness + signal.freshnessScore,
      socialProof: acc.socialProof + signal.socialProofScore,
      personal: acc.personal + signal.personalScore
    }), { relevance: 0, quality: 0, freshness: 0, socialProof: 0, personal: 0 });

    const count = contentSignals.length;
    return {
      averageRelevance: avgScores.relevance / count,
      averageQuality: avgScores.quality / count,
      averageFreshness: avgScores.freshness / count,
      averageSocialProof: avgScores.socialProof / count,
      averagePersonal: avgScores.personal / count,
      totalProcessed: count,
      isProcessing
    };
  }, [contentSignals, isProcessing]);

  // Don't render anything - this is a processing component
  return null;
}

// Generate mock engagement data for development
function generateMockEngagementData(userAddress: string): UserEngagementData {
  return {
    address: userAddress,
    interactions: {
      reactions: {},
      tips: {},
      comments: {},
      reposts: {},
      views: {}
    },
    preferences: {
      favoriteTopics: ['defi', 'nft', 'web3', 'crypto'],
      followedUsers: [],
      joinedCommunities: ['general', 'defi'],
      preferredContentTypes: ['text', 'media'],
      engagementPatterns: {
        timeOfDay: Array(24).fill(0).map((_, i) => i >= 9 && i <= 17 ? 0.8 : 0.3),
        dayOfWeek: Array(7).fill(0.6),
        sessionDuration: 25
      }
    },
    behaviorScore: {
      curiosity: 0.7,
      loyalty: 0.6,
      social: 0.8,
      quality: 0.75
    }
  };
}

// Hook for using personalized feed engine
export function usePersonalizedFeed(posts: EnhancedPost[], userAddress?: string, enabled: boolean = true) {
  const [personalizedPosts, setPersonalizedPosts] = useState<EnhancedPost[]>(posts);
  const [insights, setInsights] = useState<any>(null);

  const handlePersonalizedPosts = useCallback((newPosts: EnhancedPost[]) => {
    setPersonalizedPosts(newPosts);
  }, []);

  return {
    personalizedPosts,
    insights,
    PersonalizedFeedEngine: (props: Omit<PersonalizedFeedEngineProps, 'posts' | 'userAddress' | 'onPersonalizedPosts' | 'enabled'>) => (
      <PersonalizedFeedEngine
        {...props}
        posts={posts}
        userAddress={userAddress}
        onPersonalizedPosts={handlePersonalizedPosts}
        enabled={enabled}
      />
    )
  };
}