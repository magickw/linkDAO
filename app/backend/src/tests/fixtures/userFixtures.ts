/**
 * User Test Fixtures
 * Provides realistic test data for user-related functionality
 */

import { TestDataFactory, TestDataOptions } from './testDataFactory';
import { faker } from '@faker-js/faker';

export interface UserFixture {
  id: string;
  walletAddress: string;
  username?: string;
  displayName?: string;
  bio?: string;
  avatar?: string;
  banner?: string;
  email?: string;
  isVerified: boolean;
  reputation: number;
  joinedAt: Date;
  lastActiveAt: Date;
  socialLinks: {
    twitter?: string;
    discord?: string;
    website?: string;
    github?: string;
  };
  preferences: {
    notifications: boolean;
    publicProfile: boolean;
    showEmail: boolean;
    theme: 'light' | 'dark' | 'auto';
  };
  stats: {
    postsCount: number;
    commentsCount: number;
    likesReceived: number;
    followersCount: number;
    followingCount: number;
  };
}

export interface UserProfileFixture extends UserFixture {
  badges: BadgeFixture[];
  achievements: AchievementFixture[];
  reputationHistory: ReputationChangeFixture[];
}

export interface BadgeFixture {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt: Date;
  criteria: string;
}

export interface AchievementFixture {
  id: string;
  title: string;
  description: string;
  progress: number;
  maxProgress: number;
  completed: boolean;
  completedAt?: Date;
  reward?: {
    type: 'reputation' | 'badge' | 'token';
    amount: number;
    description: string;
  };
}

export interface ReputationChangeFixture {
  id: string;
  userId: string;
  change: number;
  reason: string;
  source: 'post' | 'comment' | 'vote' | 'badge' | 'manual';
  timestamp: Date;
  relatedId?: string;
}

export interface FollowRelationshipFixture {
  id: string;
  followerId: string;
  followeeId: string;
  createdAt: Date;
  isActive: boolean;
}

export class UserFixtures {
  /**
   * Create a single user fixture
   */
  static createUser(overrides: Partial<UserFixture> = {}): UserFixture {
    const username = faker.internet.userName().toLowerCase();
    const stats = this.generateUserStats();
    
    return {
      id: faker.string.uuid(),
      walletAddress: TestDataFactory.generateWalletAddress(),
      username,
      displayName: faker.person.fullName(),
      bio: faker.datatype.boolean({ probability: 0.7 }) ? faker.lorem.sentence() : undefined,
      avatar: faker.image.avatar(),
      banner: faker.datatype.boolean({ probability: 0.4 }) 
        ? faker.image.url({ width: 800, height: 200 })
        : undefined,
      email: faker.datatype.boolean({ probability: 0.6 }) ? faker.internet.email() : undefined,
      isVerified: faker.datatype.boolean({ probability: 0.3 }),
      reputation: TestDataFactory.generateReputationScore(),
      joinedAt: TestDataFactory.generateTimestamp(365),
      lastActiveAt: TestDataFactory.generateTimestamp(7),
      socialLinks: {
        twitter: faker.datatype.boolean({ probability: 0.4 }) ? faker.internet.userName() : undefined,
        discord: faker.datatype.boolean({ probability: 0.3 }) ? faker.internet.userName() : undefined,
        website: faker.datatype.boolean({ probability: 0.2 }) ? faker.internet.url() : undefined,
        github: faker.datatype.boolean({ probability: 0.25 }) ? faker.internet.userName() : undefined,
      },
      preferences: {
        notifications: faker.datatype.boolean({ probability: 0.8 }),
        publicProfile: faker.datatype.boolean({ probability: 0.9 }),
        showEmail: faker.datatype.boolean({ probability: 0.2 }),
        theme: faker.helpers.arrayElement(['light', 'dark', 'auto']),
      },
      stats,
      ...overrides
    };
  }

  /**
   * Create multiple user fixtures
   */
  static createUsers(options: TestDataOptions = {}): UserFixture[] {
    return TestDataFactory.generateTestData(
      () => this.createUser(options.overrides),
      options
    );
  }

  /**
   * Create a user profile with extended data
   */
  static createUserProfile(overrides: Partial<UserProfileFixture> = {}): UserProfileFixture {
    const user = this.createUser(overrides);
    
    return {
      ...user,
      badges: this.createBadges({ count: faker.number.int({ min: 0, max: 8 }) }),
      achievements: this.createAchievements({ count: faker.number.int({ min: 2, max: 12 }) }),
      reputationHistory: this.createReputationHistory({ 
        count: faker.number.int({ min: 5, max: 50 }),
        overrides: { userId: user.id }
      }),
      ...overrides
    };
  }

  /**
   * Create a badge fixture
   */
  static createBadge(overrides: Partial<BadgeFixture> = {}): BadgeFixture {
    const badges = [
      { name: 'Early Adopter', description: 'Joined in the first month', criteria: 'Join before launch+30 days' },
      { name: 'Community Builder', description: 'Created a popular community', criteria: 'Create community with 100+ members' },
      { name: 'Helpful Member', description: 'Received many helpful votes', criteria: 'Get 50+ helpful votes' },
      { name: 'Governance Participant', description: 'Active in DAO governance', criteria: 'Vote on 10+ proposals' },
      { name: 'Content Creator', description: 'Posted quality content', criteria: 'Create 25+ posts with high engagement' },
      { name: 'Trusted Trader', description: 'Completed many successful trades', criteria: 'Complete 50+ trades with 4.8+ rating' }
    ];

    const badge = faker.helpers.arrayElement(badges);
    
    return {
      id: faker.string.uuid(),
      name: badge.name,
      description: badge.description,
      icon: faker.image.url({ width: 64, height: 64 }),
      rarity: faker.helpers.arrayElement(['common', 'rare', 'epic', 'legendary']),
      earnedAt: TestDataFactory.generateTimestamp(180),
      criteria: badge.criteria,
      ...overrides
    };
  }

  /**
   * Create multiple badge fixtures
   */
  static createBadges(options: TestDataOptions = {}): BadgeFixture[] {
    return TestDataFactory.generateTestData(
      () => this.createBadge(options.overrides),
      options
    );
  }

  /**
   * Create an achievement fixture
   */
  static createAchievement(overrides: Partial<AchievementFixture> = {}): AchievementFixture {
    const achievements = [
      { title: 'Social Butterfly', description: 'Follow 100 users', maxProgress: 100 },
      { title: 'Conversation Starter', description: 'Create 50 posts', maxProgress: 50 },
      { title: 'Community Supporter', description: 'Join 10 communities', maxProgress: 10 },
      { title: 'Reputation Builder', description: 'Reach 1000 reputation', maxProgress: 1000 },
      { title: 'Marketplace Explorer', description: 'Browse 500 products', maxProgress: 500 }
    ];

    const achievement = faker.helpers.arrayElement(achievements);
    const progress = faker.number.int({ min: 0, max: achievement.maxProgress });
    const completed = progress >= achievement.maxProgress;
    
    return {
      id: faker.string.uuid(),
      title: achievement.title,
      description: achievement.description,
      progress,
      maxProgress: achievement.maxProgress,
      completed,
      completedAt: completed ? TestDataFactory.generateTimestamp(30) : undefined,
      reward: completed ? {
        type: faker.helpers.arrayElement(['reputation', 'badge', 'token']),
        amount: faker.number.int({ min: 10, max: 100 }),
        description: 'Achievement completion reward'
      } : undefined,
      ...overrides
    };
  }

  /**
   * Create multiple achievement fixtures
   */
  static createAchievements(options: TestDataOptions = {}): AchievementFixture[] {
    return TestDataFactory.generateTestData(
      () => this.createAchievement(options.overrides),
      options
    );
  }

  /**
   * Create a reputation change fixture
   */
  static createReputationChange(overrides: Partial<ReputationChangeFixture> = {}): ReputationChangeFixture {
    const sources = [
      { source: 'post', reason: 'Post received upvotes', change: faker.number.int({ min: 1, max: 10 }) },
      { source: 'comment', reason: 'Comment was helpful', change: faker.number.int({ min: 1, max: 5 }) },
      { source: 'vote', reason: 'Participated in governance', change: faker.number.int({ min: 2, max: 8 }) },
      { source: 'badge', reason: 'Earned achievement badge', change: faker.number.int({ min: 10, max: 50 }) },
      { source: 'manual', reason: 'Moderator adjustment', change: faker.number.int({ min: -20, max: 20 }) }
    ];

    const sourceData = faker.helpers.arrayElement(sources);
    
    return {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      change: sourceData.change,
      reason: sourceData.reason,
      source: sourceData.source as any,
      timestamp: TestDataFactory.generateTimestamp(90),
      relatedId: faker.datatype.boolean({ probability: 0.7 }) ? faker.string.uuid() : undefined,
      ...overrides
    };
  }

  /**
   * Create multiple reputation change fixtures
   */
  static createReputationHistory(options: TestDataOptions = {}): ReputationChangeFixture[] {
    return TestDataFactory.generateTestData(
      () => this.createReputationChange(options.overrides),
      options
    );
  }

  /**
   * Create a follow relationship fixture
   */
  static createFollowRelationship(overrides: Partial<FollowRelationshipFixture> = {}): FollowRelationshipFixture {
    return {
      id: faker.string.uuid(),
      followerId: TestDataFactory.generateWalletAddress(),
      followeeId: TestDataFactory.generateWalletAddress(),
      createdAt: TestDataFactory.generateTimestamp(180),
      isActive: faker.datatype.boolean({ probability: 0.9 }),
      ...overrides
    };
  }

  /**
   * Create multiple follow relationship fixtures
   */
  static createFollowRelationships(options: TestDataOptions = {}): FollowRelationshipFixture[] {
    return TestDataFactory.generateTestData(
      () => this.createFollowRelationship(options.overrides),
      options
    );
  }

  /**
   * Generate realistic user stats
   */
  private static generateUserStats() {
    const postsCount = faker.number.int({ min: 0, max: 500 });
    const commentsCount = faker.number.int({ min: 0, max: 1000 });
    const followersCount = faker.number.int({ min: 0, max: 10000 });
    const followingCount = faker.number.int({ min: 0, max: 1000 });
    
    // Likes received should correlate with posts and comments
    const likesReceived = faker.number.int({ 
      min: 0, 
      max: Math.floor((postsCount + commentsCount) * 2.5) 
    });

    return {
      postsCount,
      commentsCount,
      likesReceived,
      followersCount,
      followingCount,
    };
  }

  /**
   * Create suggested users (high reputation, active)
   */
  static createSuggestedUsers(count = 10): UserFixture[] {
    return this.createUsers({
      count,
      overrides: {
        isVerified: faker.datatype.boolean({ probability: 0.7 }),
        reputation: faker.number.int({ min: 500, max: 1000 }),
        lastActiveAt: TestDataFactory.generateTimestamp(3), // Active within 3 days
        stats: {
          ...this.generateUserStats(),
          followersCount: faker.number.int({ min: 100, max: 5000 })
        }
      }
    });
  }

  /**
   * Create verified users
   */
  static createVerifiedUsers(count = 5): UserFixture[] {
    return this.createUsers({
      count,
      overrides: {
        isVerified: true,
        reputation: faker.number.int({ min: 750, max: 1000 })
      }
    });
  }

  /**
   * Create a complete user dataset with relationships
   */
  static createUserDataset(userCount = 50): {
    users: UserFixture[];
    profiles: UserProfileFixture[];
    relationships: FollowRelationshipFixture[];
    suggestedUsers: UserFixture[];
  } {
    const users = this.createUsers({ count: userCount });
    const profiles = users.slice(0, 10).map(user => 
      this.createUserProfile({ id: user.id, walletAddress: user.walletAddress })
    );
    
    // Create some follow relationships
    const relationships = this.createFollowRelationships({ count: userCount * 3 });
    const suggestedUsers = this.createSuggestedUsers(15);

    return { users, profiles, relationships, suggestedUsers };
  }
}