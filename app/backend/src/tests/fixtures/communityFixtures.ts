/**
 * Community Test Fixtures
 * Provides realistic test data for community-related functionality
 * 
 * WARNING: This file contains mock data for testing purposes only.
 * Do not use this data in production environments.
 */

import { TestDataFactory, TestDataOptions } from './testDataFactory';
import { faker } from '@faker-js/faker';

export interface CommunityFixture {
  id: string;
  name: string;
  displayName: string;
  description: string;
  rules: string[];
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
  avatar?: string;
  banner?: string;
  category: string;
  tags: string[];
  isPublic: boolean;
  moderators: string[];
  treasuryAddress?: string;
  governanceToken?: string;
  settings: {
    allowedPostTypes: Array<{
      id: string;
      name: string;
      description: string;
      enabled: boolean;
    }>;
    requireApproval: boolean;
    minimumReputation: number;
    stakingRequirements: Array<{
      action: string;
      tokenAddress: string;
      minimumAmount: string;
      lockDuration: number;
    }>;
  };
}

export interface CommunityMembershipFixture {
  id: string;
  userId: string;
  communityId: string;
  role: 'member' | 'moderator' | 'admin';
  joinedAt: Date;
  reputation: number;
  contributions: number;
  isActive: boolean;
  lastActivityAt: Date;
}

export interface CommunityPostFixture {
  id: string;
  author: string;
  parentId?: string;
  contentCid: string;
  mediaCids: string[];
  tags: string[];
  createdAt: Date;
  onchainRef: string;
  communityId: string;
  flair?: string;
  isPinned: boolean;
  isLocked: boolean;
  upvotes: number;
  downvotes: number;
  comments: any[];
  depth: number;
  sortOrder: number;
}

export class CommunityFixtures {
  /**
   * Create a single community fixture
   */
  static createCommunity(overrides: Partial<CommunityFixture> = {}): CommunityFixture {
    const name = TestDataFactory.generateCommunityName();
    const displayName = faker.lorem.words(2);
    
    return {
      id: faker.string.uuid(),
      name,
      displayName,
      description: faker.lorem.paragraph(),
      rules: [
        'Be respectful to all members',
        'No spam or promotional content',
        'Use appropriate flair for posts',
        'Follow community guidelines'
      ],
      memberCount: faker.number.int({ min: 10, max: 50000 }),
      createdAt: TestDataFactory.generateTimestamp(365),
      updatedAt: TestDataFactory.generateTimestamp(7),
      avatar: faker.image.avatar(),
      banner: faker.image.url({ width: 800, height: 200 }),
      category: faker.helpers.arrayElement(['Finance', 'Art', 'Gaming', 'Technology', 'Governance']),
      tags: TestDataFactory.generateTags(4),
      isPublic: faker.datatype.boolean({ probability: 0.8 }),
      moderators: TestDataFactory.generateTestData(
        () => TestDataFactory.generateWalletAddress(),
        { count: faker.number.int({ min: 1, max: 5 }) }
      ),
      treasuryAddress: faker.datatype.boolean({ probability: 0.6 }) 
        ? TestDataFactory.generateWalletAddress() 
        : undefined,
      governanceToken: faker.datatype.boolean({ probability: 0.4 })
        ? TestDataFactory.generateWalletAddress()
        : undefined,
      settings: {
        allowedPostTypes: [
          {
            id: 'discussion',
            name: 'Discussion',
            description: 'General discussion posts',
            enabled: true
          },
          {
            id: 'news',
            name: 'News',
            description: 'News and updates',
            enabled: true
          },
          {
            id: 'tutorial',
            name: 'Tutorial',
            description: 'Educational content',
            enabled: faker.datatype.boolean({ probability: 0.7 })
          }
        ],
        requireApproval: faker.datatype.boolean({ probability: 0.3 }),
        minimumReputation: faker.number.int({ min: 0, max: 100 }),
        stakingRequirements: faker.datatype.boolean({ probability: 0.3 }) ? [
          {
            action: 'post',
            tokenAddress: TestDataFactory.generateWalletAddress(),
            minimumAmount: TestDataFactory.generateTokenAmount(10, 1000),
            lockDuration: faker.number.int({ min: 3600, max: 172800 }) // 1 hour to 48 hours
          }
        ] : []
      },
      ...overrides
    };
  }

  /**
   * Create multiple community fixtures
   */
  static createCommunities(options: TestDataOptions = {}): CommunityFixture[] {
    return TestDataFactory.generateTestData(
      () => this.createCommunity(options.overrides),
      options
    );
  }

  /**
   * Create a community membership fixture
   */
  static createMembership(overrides: Partial<CommunityMembershipFixture> = {}): CommunityMembershipFixture {
    return {
      id: faker.string.uuid(),
      userId: TestDataFactory.generateWalletAddress(),
      communityId: faker.string.uuid(),
      role: faker.helpers.arrayElement(['member', 'moderator', 'admin']),
      joinedAt: TestDataFactory.generateTimestamp(180),
      reputation: TestDataFactory.generateReputationScore(),
      contributions: faker.number.int({ min: 0, max: 200 }),
      isActive: faker.datatype.boolean({ probability: 0.8 }),
      lastActivityAt: TestDataFactory.generateTimestamp(7),
      ...overrides
    };
  }

  /**
   * Create multiple membership fixtures
   */
  static createMemberships(options: TestDataOptions = {}): CommunityMembershipFixture[] {
    return TestDataFactory.generateTestData(
      () => this.createMembership(options.overrides),
      options
    );
  }

  /**
   * Create a community post fixture
   */
  static createPost(overrides: Partial<CommunityPostFixture> = {}): CommunityPostFixture {
    const engagement = TestDataFactory.generateEngagementMetrics();
    
    return {
      id: faker.string.uuid(),
      author: TestDataFactory.generateWalletAddress(),
      parentId: faker.datatype.boolean({ probability: 0.2 }) ? faker.string.uuid() : undefined,
      contentCid: TestDataFactory.generateIPFSCid(),
      mediaCids: faker.datatype.boolean({ probability: 0.3 }) 
        ? [TestDataFactory.generateIPFSCid()]
        : [],
      tags: TestDataFactory.generateTags(3),
      createdAt: TestDataFactory.generateTimestamp(30),
      onchainRef: TestDataFactory.generateTxHash(),
      communityId: faker.string.uuid(),
      flair: faker.helpers.arrayElement(['Discussion', 'News', 'Tutorial', 'Question']),
      isPinned: faker.datatype.boolean({ probability: 0.05 }),
      isLocked: faker.datatype.boolean({ probability: 0.02 }),
      upvotes: engagement.likes,
      downvotes: faker.number.int({ min: 0, max: Math.floor(engagement.likes * 0.2) }),
      comments: [],
      depth: 0,
      sortOrder: 1,
      ...overrides
    };
  }

  /**
   * Create multiple post fixtures
   */
  static createPosts(options: TestDataOptions = {}): CommunityPostFixture[] {
    return TestDataFactory.generateTestData(
      () => this.createPost(options.overrides),
      options
    );
  }

  /**
   * Create a complete community with members and posts
   */
  static createCommunityWithData(memberCount = 10, postCount = 20): {
    community: CommunityFixture;
    memberships: CommunityMembershipFixture[];
    posts: CommunityPostFixture[];
  } {
    const community = this.createCommunity();
    
    const memberships = this.createMemberships({
      count: memberCount,
      overrides: { communityId: community.id }
    });

    const posts = this.createPosts({
      count: postCount,
      overrides: { communityId: community.id }
    });

    return { community, memberships, posts };
  }

  /**
   * Create trending communities
   */
  static createTrendingCommunities(count = 5): CommunityFixture[] {
    return this.createCommunities({
      count,
      overrides: {
        memberCount: faker.number.int({ min: 1000, max: 100000 }),
        isPublic: true,
        updatedAt: TestDataFactory.generateTimestamp(1) // Recent activity
      }
    });
  }

  /**
   * Create communities by category
   */
  static createCommunitiesByCategory(category: string, count = 3): CommunityFixture[] {
    return this.createCommunities({
      count,
      overrides: { category }
    });
  }
}
