/**
 * Feed Test Fixtures
 * Provides realistic test data for social feed functionality
 */

import { TestDataFactory, TestDataOptions } from './testDataFactory';
import { faker } from '@faker-js/faker';

export interface PostFixture {
  id: string;
  author: string;
  content: string;
  contentCid: string;
  mediaCids: string[];
  type: 'text' | 'image' | 'video' | 'poll' | 'proposal' | 'nft_showcase';
  communityId?: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
  onchainRef: string;
  engagement: {
    likes: number;
    dislikes: number;
    comments: number;
    shares: number;
    views: number;
  };
  metadata: {
    hashtags: string[];
    mentions: string[];
    links: string[];
    isEdited: boolean;
    isPinned: boolean;
    isLocked: boolean;
    visibility: 'public' | 'community' | 'followers';
  };
  reactions: ReactionFixture[];
}

export interface ReactionFixture {
  id: string;
  postId: string;
  userId: string;
  type: 'like' | 'dislike' | 'love' | 'laugh' | 'angry' | 'sad';
  createdAt: Date;
  txHash?: string;
}

export interface CommentFixture {
  id: string;
  postId: string;
  author: string;
  content: string;
  contentCid: string;
  parentCommentId?: string;
  createdAt: Date;
  updatedAt: Date;
  depth: number;
  engagement: {
    likes: number;
    dislikes: number;
    replies: number;
  };
  metadata: {
    isEdited: boolean;
    mentions: string[];
    hashtags: string[];
  };
}

export interface HashtagFixture {
  id: string;
  tag: string;
  usageCount: number;
  trendingScore: number;
  createdAt: Date;
  lastUsedAt: Date;
  relatedTags: string[];
  category?: string;
}

export interface TrendingContentFixture {
  id: string;
  contentId: string;
  contentType: 'post' | 'hashtag' | 'user' | 'community';
  trendingScore: number;
  engagementRate: number;
  timeframe: '1h' | '24h' | '7d' | '30d';
  category: string;
  metadata: {
    title?: string;
    description?: string;
    thumbnail?: string;
    author?: string;
  };
}

export interface FeedAlgorithmDataFixture {
  userId: string;
  preferences: {
    categories: string[];
    followedUsers: string[];
    joinedCommunities: string[];
    interactionHistory: InteractionFixture[];
  };
  personalizedScore: number;
  lastUpdated: Date;
}

export interface InteractionFixture {
  id: string;
  userId: string;
  targetId: string;
  targetType: 'post' | 'comment' | 'user' | 'community';
  interactionType: 'view' | 'like' | 'comment' | 'share' | 'follow' | 'join';
  timestamp: Date;
  duration?: number; // for view interactions
  weight: number; // algorithm weight
}

export class FeedFixtures {
  /**
   * Create a single post fixture
   */
  static createPost(overrides: Partial<PostFixture> = {}): PostFixture {
    const type = faker.helpers.arrayElement(['text', 'image', 'video', 'poll', 'proposal', 'nft_showcase']);
    const engagement = TestDataFactory.generateEngagementMetrics();
    const hashtags = TestDataFactory.generateTags(faker.number.int({ min: 0, max: 5 }));
    
    return {
      id: faker.string.uuid(),
      author: TestDataFactory.generateWalletAddress(),
      content: this.generatePostContent(type),
      contentCid: TestDataFactory.generateIPFSCid(),
      mediaCids: type === 'image' || type === 'video' || type === 'nft_showcase' 
        ? [TestDataFactory.generateIPFSCid()]
        : [],
      type,
      communityId: faker.datatype.boolean({ probability: 0.6 }) ? faker.string.uuid() : undefined,
      parentId: faker.datatype.boolean({ probability: 0.1 }) ? faker.string.uuid() : undefined,
      createdAt: TestDataFactory.generateTimestamp(30),
      updatedAt: TestDataFactory.generateTimestamp(30),
      onchainRef: TestDataFactory.generateTxHash(),
      engagement: {
        likes: engagement.likes,
        dislikes: faker.number.int({ min: 0, max: Math.floor(engagement.likes * 0.1) }),
        comments: engagement.comments,
        shares: engagement.shares,
        views: engagement.views,
      },
      metadata: {
        hashtags,
        mentions: TestDataFactory.generateTestData(
          () => TestDataFactory.generateWalletAddress(),
          { count: faker.number.int({ min: 0, max: 3 }) }
        ),
        links: faker.datatype.boolean({ probability: 0.3 }) 
          ? [faker.internet.url()]
          : [],
        isEdited: faker.datatype.boolean({ probability: 0.15 }),
        isPinned: faker.datatype.boolean({ probability: 0.02 }),
        isLocked: faker.datatype.boolean({ probability: 0.01 }),
        visibility: faker.helpers.arrayElement(['public', 'community', 'followers']),
      },
      reactions: this.createReactions({ 
        count: faker.number.int({ min: 0, max: 20 }),
        overrides: { postId: faker.string.uuid() }
      }),
      ...overrides
    };
  }

  /**
   * Create multiple post fixtures
   */
  static createPosts(options: TestDataOptions = {}): PostFixture[] {
    return TestDataFactory.generateTestData(
      () => this.createPost(options.overrides),
      options
    );
  }

  /**
   * Create a reaction fixture
   */
  static createReaction(overrides: Partial<ReactionFixture> = {}): ReactionFixture {
    return {
      id: faker.string.uuid(),
      postId: faker.string.uuid(),
      userId: TestDataFactory.generateWalletAddress(),
      type: faker.helpers.arrayElement(['like', 'dislike', 'love', 'laugh', 'angry', 'sad']),
      createdAt: TestDataFactory.generateTimestamp(7),
      txHash: faker.datatype.boolean({ probability: 0.8 }) ? TestDataFactory.generateTxHash() : undefined,
      ...overrides
    };
  }

  /**
   * Create multiple reaction fixtures
   */
  static createReactions(options: TestDataOptions = {}): ReactionFixture[] {
    return TestDataFactory.generateTestData(
      () => this.createReaction(options.overrides),
      options
    );
  }

  /**
   * Create a comment fixture
   */
  static createComment(overrides: Partial<CommentFixture> = {}): CommentFixture {
    const engagement = {
      likes: faker.number.int({ min: 0, max: 100 }),
      dislikes: faker.number.int({ min: 0, max: 20 }),
      replies: faker.number.int({ min: 0, max: 10 }),
    };

    return {
      id: faker.string.uuid(),
      postId: faker.string.uuid(),
      author: TestDataFactory.generateWalletAddress(),
      content: faker.lorem.sentences(faker.number.int({ min: 1, max: 3 })),
      contentCid: TestDataFactory.generateIPFSCid(),
      parentCommentId: faker.datatype.boolean({ probability: 0.3 }) ? faker.string.uuid() : undefined,
      createdAt: TestDataFactory.generateTimestamp(7),
      updatedAt: TestDataFactory.generateTimestamp(7),
      depth: faker.number.int({ min: 0, max: 3 }),
      engagement,
      metadata: {
        isEdited: faker.datatype.boolean({ probability: 0.1 }),
        mentions: TestDataFactory.generateTestData(
          () => TestDataFactory.generateWalletAddress(),
          { count: faker.number.int({ min: 0, max: 2 }) }
        ),
        hashtags: TestDataFactory.generateTags(faker.number.int({ min: 0, max: 2 })),
      },
      ...overrides
    };
  }

  /**
   * Create multiple comment fixtures
   */
  static createComments(options: TestDataOptions = {}): CommentFixture[] {
    return TestDataFactory.generateTestData(
      () => this.createComment(options.overrides),
      options
    );
  }

  /**
   * Create a hashtag fixture
   */
  static createHashtag(overrides: Partial<HashtagFixture> = {}): HashtagFixture {
    const tag = faker.helpers.arrayElement([
      'defi', 'nft', 'dao', 'web3', 'crypto', 'blockchain', 'ethereum',
      'bitcoin', 'metaverse', 'gaming', 'art', 'music', 'trading',
      'yield', 'staking', 'governance', 'community', 'social'
    ]);

    const usageCount = faker.number.int({ min: 1, max: 10000 });
    const trendingScore = this.calculateTrendingScore(usageCount);

    return {
      id: faker.string.uuid(),
      tag,
      usageCount,
      trendingScore,
      createdAt: TestDataFactory.generateTimestamp(365),
      lastUsedAt: TestDataFactory.generateTimestamp(1),
      relatedTags: TestDataFactory.generateTags(faker.number.int({ min: 2, max: 5 })),
      category: faker.helpers.arrayElement(['finance', 'technology', 'art', 'gaming', 'social']),
      ...overrides
    };
  }

  /**
   * Create multiple hashtag fixtures
   */
  static createHashtags(options: TestDataOptions = {}): HashtagFixture[] {
    return TestDataFactory.generateTestData(
      () => this.createHashtag(options.overrides),
      options
    );
  }

  /**
   * Create a trending content fixture
   */
  static createTrendingContent(overrides: Partial<TrendingContentFixture> = {}): TrendingContentFixture {
    const contentType = faker.helpers.arrayElement(['post', 'hashtag', 'user', 'community']);
    const engagementRate = faker.number.float({ min: 0.01, max: 0.5, fractionDigits: 3 });
    const trendingScore = this.calculateTrendingScore(engagementRate * 1000);

    return {
      id: faker.string.uuid(),
      contentId: faker.string.uuid(),
      contentType,
      trendingScore,
      engagementRate,
      timeframe: faker.helpers.arrayElement(['1h', '24h', '7d', '30d']),
      category: faker.helpers.arrayElement(['finance', 'technology', 'art', 'gaming', 'social', 'governance']),
      metadata: {
        title: contentType === 'post' ? faker.lorem.sentence() : undefined,
        description: faker.lorem.sentence(),
        thumbnail: faker.datatype.boolean({ probability: 0.6 }) ? faker.image.url() : undefined,
        author: contentType === 'post' ? TestDataFactory.generateWalletAddress() : undefined,
      },
      ...overrides
    };
  }

  /**
   * Create multiple trending content fixtures
   */
  static createTrendingContent(options: TestDataOptions = {}): TrendingContentFixture[] {
    return TestDataFactory.generateTestData(
      () => this.createTrendingContent(options.overrides),
      options
    );
  }

  /**
   * Create feed algorithm data fixture
   */
  static createFeedAlgorithmData(overrides: Partial<FeedAlgorithmDataFixture> = {}): FeedAlgorithmDataFixture {
    return {
      userId: TestDataFactory.generateWalletAddress(),
      preferences: {
        categories: TestDataFactory.generateTags(faker.number.int({ min: 3, max: 8 })),
        followedUsers: TestDataFactory.generateTestData(
          () => TestDataFactory.generateWalletAddress(),
          { count: faker.number.int({ min: 5, max: 100 }) }
        ),
        joinedCommunities: TestDataFactory.generateTestData(
          () => faker.string.uuid(),
          { count: faker.number.int({ min: 2, max: 20 }) }
        ),
        interactionHistory: this.createInteractions({ 
          count: faker.number.int({ min: 50, max: 500 })
        }),
      },
      personalizedScore: faker.number.float({ min: 0.1, max: 1.0, fractionDigits: 3 }),
      lastUpdated: TestDataFactory.generateTimestamp(1),
      ...overrides
    };
  }

  /**
   * Create an interaction fixture
   */
  static createInteraction(overrides: Partial<InteractionFixture> = {}): InteractionFixture {
    const interactionType = faker.helpers.arrayElement(['view', 'like', 'comment', 'share', 'follow', 'join']);
    const targetType = faker.helpers.arrayElement(['post', 'comment', 'user', 'community']);
    
    // Calculate weight based on interaction type
    const weights = {
      view: 0.1,
      like: 0.3,
      comment: 0.5,
      share: 0.7,
      follow: 0.8,
      join: 0.9
    };

    return {
      id: faker.string.uuid(),
      userId: TestDataFactory.generateWalletAddress(),
      targetId: faker.string.uuid(),
      targetType,
      interactionType,
      timestamp: TestDataFactory.generateTimestamp(30),
      duration: interactionType === 'view' ? faker.number.int({ min: 1, max: 300 }) : undefined,
      weight: weights[interactionType],
      ...overrides
    };
  }

  /**
   * Create multiple interaction fixtures
   */
  static createInteractions(options: TestDataOptions = {}): InteractionFixture[] {
    return TestDataFactory.generateTestData(
      () => this.createInteraction(options.overrides),
      options
    );
  }

  /**
   * Generate realistic post content based on type
   */
  private static generatePostContent(type: string): string {
    switch (type) {
      case 'text':
        return faker.lorem.paragraphs(faker.number.int({ min: 1, max: 3 }));
      case 'image':
        return `Check out this amazing ${faker.lorem.word()}! ${faker.lorem.sentence()}`;
      case 'video':
        return `New video: ${faker.lorem.sentence()} What do you think?`;
      case 'poll':
        return `Quick poll: ${faker.lorem.sentence()}`;
      case 'proposal':
        return `Governance proposal: ${faker.lorem.sentence()} Please review and vote.`;
      case 'nft_showcase':
        return `Just minted this NFT! ${faker.lorem.sentence()}`;
      default:
        return faker.lorem.paragraph();
    }
  }

  /**
   * Calculate trending score based on engagement
   */
  private static calculateTrendingScore(baseScore: number): number {
    const timeDecay = faker.number.float({ min: 0.5, max: 1.0, fractionDigits: 2 });
    const viralityBoost = faker.number.float({ min: 1.0, max: 2.0, fractionDigits: 2 });
    
    return Math.floor(baseScore * timeDecay * viralityBoost);
  }

  /**
   * Create trending posts
   */
  static createTrendingPosts(count = 10): PostFixture[] {
    return this.createPosts({
      count,
      overrides: {
        engagement: {
          likes: faker.number.int({ min: 100, max: 5000 }),
          dislikes: faker.number.int({ min: 0, max: 50 }),
          comments: faker.number.int({ min: 20, max: 500 }),
          shares: faker.number.int({ min: 10, max: 200 }),
          views: faker.number.int({ min: 1000, max: 50000 }),
        },
        createdAt: TestDataFactory.generateTimestamp(3), // Recent posts
      }
    });
  }

  /**
   * Create posts with comments
   */
  static createPostsWithComments(postCount = 5, commentsPerPost = 10): {
    posts: PostFixture[];
    comments: CommentFixture[];
  } {
    const posts = this.createPosts({ count: postCount });
    const comments: CommentFixture[] = [];

    posts.forEach(post => {
      const postComments = this.createComments({
        count: commentsPerPost,
        overrides: { postId: post.id }
      });
      comments.push(...postComments);
    });

    return { posts, comments };
  }

  /**
   * Create a complete feed dataset
   */
  static createFeedData(): {
    posts: PostFixture[];
    comments: CommentFixture[];
    reactions: ReactionFixture[];
    hashtags: HashtagFixture[];
    trendingContent: TrendingContentFixture[];
    algorithmData: FeedAlgorithmDataFixture[];
  } {
    const posts = this.createPosts({ count: 100 });
    const comments = this.createComments({ count: 300 });
    const reactions = this.createReactions({ count: 500 });
    const hashtags = this.createHashtags({ count: 50 });
    const trendingContent = this.createTrendingContent({ count: 20 });
    const algorithmData = TestDataFactory.generateTestData(
      () => this.createFeedAlgorithmData(),
      { count: 25 }
    );

    return {
      posts,
      comments,
      reactions,
      hashtags,
      trendingContent,
      algorithmData,
    };
  }

  /**
   * Create personalized feed data for a user
   */
  static createPersonalizedFeed(userId: string, count = 20): {
    posts: PostFixture[];
    algorithmData: FeedAlgorithmDataFixture;
  } {
    const algorithmData = this.createFeedAlgorithmData({ userId });
    
    // Create posts that match user preferences
    const posts = this.createPosts({
      count,
      overrides: {
        metadata: {
          hashtags: faker.helpers.arrayElements(algorithmData.preferences.categories, { min: 1, max: 3 }),
          mentions: [],
          links: [],
          isEdited: false,
          isPinned: false,
          isLocked: false,
          visibility: 'public',
        }
      }
    });

    return { posts, algorithmData };
  }
}
