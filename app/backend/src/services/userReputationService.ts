import { DatabaseService } from './databaseService';
import { users, follows, posts, reactions, tips } from '../db/schema';
import { eq, desc, sql, and, count, sum } from 'drizzle-orm';

export interface ReputationMetrics {
  userId: string;
  totalScore: number;
  followerScore: number;
  contentScore: number;
  engagementScore: number;
  contributionScore: number;
  trustScore: number;
  badges: ReputationBadge[];
  level: ReputationLevel;
  percentile: number;
}

export interface ReputationBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Date;
  category: 'social' | 'content' | 'engagement' | 'contribution' | 'trust';
}

export interface ReputationLevel {
  level: number;
  name: string;
  minScore: number;
  maxScore: number;
  benefits: string[];
}

export class UserReputationService {
  private databaseService: DatabaseService;
  private reputationLevels: ReputationLevel[];

  constructor() {
    this.databaseService = new DatabaseService();
    this.reputationLevels = this.initializeReputationLevels();
  }

  /**
   * Calculate comprehensive reputation metrics for a user
   */
  async calculateUserReputation(userId: string): Promise<ReputationMetrics> {
    try {
      const [
        followerScore,
        contentScore,
        engagementScore,
        contributionScore,
        trustScore
      ] = await Promise.all([
        this.calculateFollowerScore(userId),
        this.calculateContentScore(userId),
        this.calculateEngagementScore(userId),
        this.calculateContributionScore(userId),
        this.calculateTrustScore(userId)
      ]);

      const totalScore = followerScore + contentScore + engagementScore + contributionScore + trustScore;
      const level = this.getReputationLevel(totalScore);
      const badges = await this.calculateBadges(userId, {
        followerScore,
        contentScore,
        engagementScore,
        contributionScore,
        trustScore
      });
      const percentile = await this.calculatePercentile(totalScore);

      return {
        userId,
        totalScore,
        followerScore,
        contentScore,
        engagementScore,
        contributionScore,
        trustScore,
        badges,
        level,
        percentile
      };
    } catch (error) {
      console.error('Error calculating user reputation:', error);
      throw error;
    }
  }

  /**
   * Calculate follower-based reputation score
   */
  private async calculateFollowerScore(userId: string): Promise<number> {
    const db = this.databaseService.getDatabase();

    try {
      const [followerCount] = await db
        .select({ count: count() })
        .from(follows)
        .where(eq(follows.followingId, userId));

      // Logarithmic scaling to prevent follower count dominance
      const followers = followerCount.count || 0;
      return Math.floor(Math.log10(followers + 1) * 50);
    } catch (error) {
      console.error('Error calculating follower score:', error);
      return 0;
    }
  }

  private initializeReputationLevels(): ReputationLevel[] {
    return [
      {
        level: 1,
        name: 'Newcomer',
        minScore: 0,
        maxScore: 99,
        benefits: ['Basic posting privileges']
      },
      {
        level: 2,
        name: 'Community Member',
        minScore: 100,
        maxScore: 299,
        benefits: ['Can create polls', 'Enhanced profile features']
      },
      {
        level: 3,
        name: 'Active Contributor',
        minScore: 300,
        maxScore: 599,
        benefits: ['Can moderate discussions', 'Priority support']
      },
      {
        level: 4,
        name: 'Trusted Member',
        minScore: 600,
        maxScore: 999,
        benefits: ['Can create communities', 'Advanced analytics']
      },
      {
        level: 5,
        name: 'Community Leader',
        minScore: 1000,
        maxScore: Infinity,
        benefits: ['Governance privileges', 'Revenue sharing', 'Beta features']
      }
    ];
  }

  /**
   * Calculate content-based reputation score
   */
  private async calculateContentScore(userId: string): Promise<number> {
    const db = this.databaseService.getDatabase();

    try {
      const [postCount] = await db
        .select({ count: count() })
        .from(posts)
        .where(eq(posts.authorId, userId));

      // Score based on post count with diminishing returns
      const postTotal = postCount.count || 0;
      return Math.floor(Math.sqrt(postTotal) * 10);
    } catch (error) {
      console.error('Error calculating content score:', error);
      return 0;
    }
  }

  /**
   * Calculate engagement-based reputation score
   */
  private async calculateEngagementScore(userId: string): Promise<number> {
    const db = this.databaseService.getDatabase();

    try {
      // Get reactions received on user's posts
      const [reactionsReceived] = await db
        .select({ count: count() })
        .from(reactions)
        .innerJoin(posts, eq(posts.id, reactions.postId))
        .where(eq(posts.authorId, userId));

      // Get reactions given by user
      const [reactionsGiven] = await db
        .select({ count: count() })
        .from(reactions)
        .where(eq(reactions.userId, userId));

      const received = reactionsReceived.count || 0;
      const given = reactionsGiven.count || 0;

      // Balance between receiving and giving engagement
      return Math.floor((received * 2 + given) * 0.5);
    } catch (error) {
      console.error('Error calculating engagement score:', error);
      return 0;
    }
  }

  /**
   * Calculate contribution-based reputation score
   */
  private async calculateContributionScore(userId: string): Promise<number> {
    const db = this.databaseService.getDatabase();

    try {
      // Get tips received
      const [tipsReceived] = await db
        .select({ total: sum(tips.amount) })
        .from(tips)
        .where(eq(tips.toUserId, userId));

      // Get tips given
      const [tipsGiven] = await db
        .select({ total: sum(tips.amount) })
        .from(tips)
        .where(eq(tips.fromUserId, userId));

      const received = Number(tipsReceived.total || 0);
      const given = Number(tipsGiven.total || 0);

      // Score based on economic contribution
      return Math.floor((received * 0.1) + (given * 0.05));
    } catch (error) {
      console.error('Error calculating contribution score:', error);
      return 0;
    }
  }

  /**
   * Calculate trust-based reputation score
   */
  private async calculateTrustScore(userId: string): Promise<number> {
    // This would integrate with verification systems, dispute resolution, etc.
    // For now, return a base score
    return 50;
  }

  /**
   * Get reputation level based on total score
   */
  private getReputationLevel(totalScore: number): ReputationLevel {
    for (let i = this.reputationLevels.length - 1; i >= 0; i--) {
      const level = this.reputationLevels[i];
      if (totalScore >= level.minScore) {
        return level;
      }
    }
    return this.reputationLevels[0];
  }

  /**
   * Calculate badges earned by user
   */
  private async calculateBadges(
    userId: string,
    scores: {
      followerScore: number;
      contentScore: number;
      engagementScore: number;
      contributionScore: number;
      trustScore: number;
    }
  ): Promise<ReputationBadge[]> {
    const badges: ReputationBadge[] = [];
    const now = new Date();

    // Social badges
    if (scores.followerScore >= 100) {
      badges.push({
        id: 'influencer',
        name: 'Influencer',
        description: 'Has a significant following',
        icon: '👑',
        earnedAt: now,
        category: 'social'
      });
    }

    // Content badges
    if (scores.contentScore >= 50) {
      badges.push({
        id: 'prolific_writer',
        name: 'Prolific Writer',
        description: 'Creates lots of quality content',
        icon: '✍️',
        earnedAt: now,
        category: 'content'
      });
    }

    // Engagement badges
    if (scores.engagementScore >= 100) {
      badges.push({
        id: 'community_champion',
        name: 'Community Champion',
        description: 'Highly engaged with the community',
        icon: '🏆',
        earnedAt: now,
        category: 'engagement'
      });
    }

    return badges;
  }

  /**
   * Calculate user's reputation percentile
   */
  private async calculatePercentile(userScore: number): Promise<number> {
    // This would require calculating against all users
    // For now, return an estimated percentile
    if (userScore >= 1000) return 95;
    if (userScore >= 600) return 80;
    if (userScore >= 300) return 60;
    if (userScore >= 100) return 40;
    return 20;
  }
}