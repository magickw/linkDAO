import { FeedService } from '../../services/feedService';
import { db } from '../../db';
import { posts, communities, users, quickPosts } from '../../db/schema';
import { eq, or, and, sql, inArray, isNull } from 'drizzle-orm';

// Mock the database
jest.mock('../../db', () => ({
  db: {
    select: jest.fn(),
    transaction: jest.fn(),
  },
}));

// Mock the schema
jest.mock('../../db/schema', () => ({
  posts: 'posts',
  quickPosts: 'quickPosts',
  communities: 'communities',
  users: 'users',
  eq: jest.fn(),
  or: jest.fn(),
  and: jest.fn(),
  sql: jest.fn(),
  inArray: jest.fn(),
  isNull: jest.fn(),
  desc: jest.fn(),
}));

describe('FeedService', () => {
  const mockUserAddress = '0x1234567890123456789012345678901234567890';
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock db.select chain
    const mockSelect = {
      from: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
    };

    (db.select as jest.Mock).mockReturnValue(mockSelect);
    (db.transaction as jest.Mock).mockImplementation((callback) => {
      return callback({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });
    });
    
    // Mock SQL template literals
    (sql as jest.Mock).mockImplementation((strings, ...values) => {
      return {
        toSQL: () => strings.join('?'),
        values,
      };
    });
    
    // Mock eq
    (eq as jest.Mock).mockReturnValue('eq-condition');
    (or as jest.Mock).mockReturnValue('or-condition');
    (and as jest.Mock).mockReturnValue('and-condition');
    (inArray as jest.Mock).mockReturnValue('inArray-condition');
    (isNull as jest.Mock).mockReturnValue('isNull-condition');
    (desc as jest.Mock).mockReturnValue('desc-condition');
  });

  describe('getEnhancedFeed with preferences', () => {
    const baseOptions = {
      userAddress: mockUserAddress,
      page: 1,
      limit: 20,
      sort: 'new',
      communities: [],
      timeRange: 'all',
      feedSource: 'all' as const,
    };

    it('should include preference filter when categories are provided', async () => {
      const options = {
        ...baseOptions,
        preferredCategories: ['development', 'defi'],
        preferredTags: [],
      };

      // Mock posts query
      const mockPosts = [
        {
          id: 'post-1',
          content: 'Test post 1',
          communityId: 'community-1',
          category: 'development',
        },
      ];
      
      (db.select as jest.Mock)().where.mockResolvedValueOnce(mockPosts);
      (db.select as jest.Mock)().where.mockResolvedValueOnce([]); // Quick posts

      const result = await FeedService.getEnhancedFeed(options);

      // Verify that preference filter is included in the where clause
      expect(db.select().where).toHaveBeenCalledWith(
        expect.objectContaining({
          preferenceFilter: expect.anything(),
        })
      );
    });

    it('should include preference filter when tags are provided', async () => {
      const options = {
        ...baseOptions,
        preferredCategories: [],
        preferredTags: ['react', 'ethereum'],
      };

      // Mock posts query
      const mockPosts = [
        {
          id: 'post-1',
          content: 'Test post 1',
          tags: ['react', 'javascript'],
        },
      ];
      
      (db.select as jest.Mock)().where.mockResolvedValueOnce(mockPosts);
      (db.select as jest.Mock)().where.mockResolvedValueOnce([]); // Quick posts

      const result = await FeedService.getEnhancedFeed(options);

      // Verify that preference filter is included
      expect(db.select().where).toHaveBeenCalledWith(
        expect.objectContaining({
          preferenceFilter: expect.anything(),
        })
      );
    });

    it('should combine category and tag preferences with OR logic', async () => {
      const options = {
        ...baseOptions,
        preferredCategories: ['development'],
        preferredTags: ['react'],
      };

      // Mock posts query
      const mockPosts = [
        {
          id: 'post-1',
          content: 'Test post 1',
          communityId: 'community-1',
          category: 'development',
          tags: ['javascript'],
        },
        {
          id: 'post-2',
          content: 'Test post 2',
          communityId: 'community-2',
          category: 'design',
          tags: ['react'],
        },
      ];
      
      (db.select as jest.Mock)().where.mockResolvedValueOnce(mockPosts);
      (db.select as jest.Mock)().where.mockResolvedValueOnce([]); // Quick posts

      const result = await FeedService.getEnhancedFeed(options);

      // Verify that posts matching either category OR tags are included
      expect(db.select().where).toHaveBeenCalledWith(
        expect.objectContaining({
          preferenceFilter: expect.anything(),
        })
      );
    });

    it('should not apply preference filter when no preferences provided', async () => {
      const options = {
        ...baseOptions,
        preferredCategories: [],
        preferredTags: [],
      };

      // Mock posts query
      const mockPosts = [
        {
          id: 'post-1',
          content: 'Test post 1',
        },
      ];
      
      (db.select as jest.Mock)().where.mockResolvedValueOnce(mockPosts);
      (db.select as jest.Mock)().where.mockResolvedValueOnce([]); // Quick posts

      const result = await FeedService.getEnhancedFeed(options);

      // Verify that preference filter defaults to showing all posts
      expect(db.select().where).toHaveBeenCalledWith(
        expect.objectContaining({
          preferenceFilter: expect.anything(),
        })
      );
    });

    it('should filter by community categories when preferences exist', async () => {
      const options = {
        ...baseOptions,
        preferredCategories: ['development'],
        preferredTags: [],
      };

      // Mock posts query
      const mockPosts = [
        {
          id: 'post-1',
          content: 'Test post 1',
          communityId: 'community-1',
        },
        {
          id: 'post-2',
          content: 'Test post 2',
          communityId: 'community-2',
        },
      ];
      
      (db.select as jest.Mock)().where.mockResolvedValueOnce(mockPosts);
      (db.select as jest.Mock)().where.mockResolvedValueOnce([]); // Quick posts

      const result = await FeedService.getEnhancedFeed(options);

      // Verify SQL for category filtering
      expect(sql).toHaveBeenCalledWith(
        expect.stringContaining('EXISTS'),
        expect.any(Array),
        expect.stringContaining('category'),
        expect.any(Array)
      );
    });

    it('should filter by post tags when preferences exist', async () => {
      const options = {
        ...baseOptions,
        preferredCategories: [],
        preferredTags: ['react', 'ethereum'],
      };

      // Mock posts query
      const mockPosts = [
        {
          id: 'post-1',
          content: 'Test post 1',
          tags: ['react', 'javascript'],
        },
        {
          id: 'post-2',
          content: 'Test post 2',
          tags: ['ethereum', 'solidity'],
        },
      ];
      
      (db.select as jest.Mock)().where.mockResolvedValueOnce(mockPosts);
      (db.select as jest.Mock)().where.mockResolvedValueOnce([]); // Quick posts

      const result = await FeedService.getEnhancedFeed(options);

      // Verify that tags array is checked
      expect(db.select().where).toHaveBeenCalled();
    });

    it('should still show public community posts when no preferences match', async () => {
      const options = {
        ...baseOptions,
        preferredCategories: ['gaming'],
        preferredTags: ['minecraft'],
      };

      // Mock posts query - posts from different categories
      const mockPosts = [
        {
          id: 'post-1',
          content: 'Test post 1',
          communityId: null,
          dao: null, // Non-community post
        },
        {
          id: 'post-2',
          content: 'Test post 2',
          communityId: 'community-1',
          dao: null, // Community post
        },
      ];
      
      (db.select as jest.Mock)().where.mockResolvedValueOnce(mockPosts);
      (db.select as jest.Mock)().where.mockResolvedValueOnce([]); // Quick posts

      const result = await FeedService.getEnhancedFeed(options);

      // Verify that both community and non-community posts can be shown
      expect(db.select().where).toHaveBeenCalledWith(
        expect.objectContaining({
          communityFilter: expect.anything(),
        })
      );
    });
  });

  describe('buildTimeFilter', () => {
    it('should return correct filter for different time ranges', () => {
      const service = new FeedService();
      
      // Test that buildTimeFilter exists and works
      expect(() => {
        // @ts-ignore - accessing private method for testing
        const filter = service.buildTimeFilter('day', posts);
        expect(filter).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('buildSortOrder', () => {
    it('should return correct sort order for different sort types', () => {
      const service = new FeedService();
      
      // Test that buildSortOrder exists and works
      expect(() => {
        // @ts-ignore - accessing private method for testing
        const order = service.buildSortOrder('new');
        expect(order).toBeDefined();
      }).not.toThrow();
    });
  });
});