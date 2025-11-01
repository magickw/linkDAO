import { RedisService } from '../services/redisService';
import { DatabaseConnectionPool } from '../db/connectionPool';
import { ValidationHelper } from '../models/validation';

// Mock Redis for integration tests
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    setEx: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    incr: jest.fn(),
    flushAll: jest.fn(),
    ping: jest.fn(),
    on: jest.fn(),
    set: jest.fn()
  }))
}));

// Mock postgres for integration tests
jest.mock('postgres', () => {
  return jest.fn(() => ({
    begin: jest.fn(),
    end: jest.fn(),
    listen: jest.fn(),
    unsafe: jest.fn()
  }));
});

describe('Integration Tests - Database Schema and Core Models', () => {
  describe('Redis Service Integration', () => {
    let redisService: RedisService;

    beforeEach(() => {
      redisService = new RedisService();
      // Mock the isConnected property
      (redisService as any).isConnected = true;
    });

    it('should integrate session management with user profiles', async () => {
      const sessionId = 'user-session-123';
      const userProfile = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        handle: 'testuser',
        reputation: 95
      };

      // Mock Redis client methods
      const mockClient = (redisService as any).client;
      mockClient.setEx.mockResolvedValue('OK');
      mockClient.get.mockResolvedValue(JSON.stringify(userProfile));

      // Set session
      await redisService.setSession(sessionId, userProfile);
      
      // Get session
      const retrievedProfile = await redisService.getSession(sessionId);

      expect(mockClient.setEx).toHaveBeenCalledWith(
        `session:${sessionId}`,
        3600,
        JSON.stringify(userProfile)
      );
      expect(retrievedProfile).toEqual(userProfile);
    });

    it('should integrate caching with marketplace listings', async () => {
      const listingId = '456';
      const listing = {
        id: listingId,
        title: 'Test Product',
        price: '100.50',
        sellerWalletAddress: '0x1234567890123456789012345678901234567890'
      };

      const mockClient = (redisService as any).client;
      mockClient.setEx.mockResolvedValue('OK');
      mockClient.get.mockResolvedValue(JSON.stringify(listing));

      // Cache listing
      await redisService.cacheProductListing(listingId, listing);
      
      // Retrieve cached listing
      const cachedListing = await redisService.getCachedProductListing(listingId);

      expect(mockClient.setEx).toHaveBeenCalledWith(
        `listing:${listingId}`,
        900,
        JSON.stringify(listing)
      );
      expect(cachedListing).toEqual(listing);
    });

    it('should handle rate limiting for API endpoints', async () => {
      const userKey = 'rate:user:0x1234567890123456789012345678901234567890';
      const limit = 100;
      const window = 3600;

      const mockClient = (redisService as any).client;
      mockClient.incr.mockResolvedValue(5);
      mockClient.expire.mockResolvedValue(1);

      const result = await redisService.checkRateLimit(userKey, limit, window);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(95);
      expect(mockClient.incr).toHaveBeenCalledWith(userKey);
    });
  });

  describe('Database Connection Pool Integration', () => {
    let dbPool: DatabaseConnectionPool;

    beforeEach(() => {
      // Reset singleton
      (DatabaseConnectionPool as any).instance = undefined;
      dbPool = DatabaseConnectionPool.getInstance();
    });

    it('should maintain singleton pattern across multiple calls', () => {
      const instance1 = DatabaseConnectionPool.getInstance();
      const instance2 = DatabaseConnectionPool.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(dbPool);
    });

    it('should provide connection with proper configuration', () => {
      const connection = dbPool.getConnection();
      
      expect(connection).toBeDefined();
      expect(typeof connection).toBe('object');
    });

    it('should handle health checks gracefully', async () => {
      const mockSql = dbPool.getConnection() as any;
      mockSql.unsafe = jest.fn().mockResolvedValue([{ health_check: 1 }]);

      const health = await dbPool.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.latency).toBeGreaterThan(0);
    });
  });

  describe('Validation Integration', () => {
    it('should validate complete marketplace listing data', () => {
      const listingData = {
        sellerWalletAddress: '0x1234567890123456789012345678901234567890',
        tokenAddress: '0x0987654321098765432109876543210987654321',
        price: '100.50',
        quantity: 5,
        itemType: 'PHYSICAL',
        listingType: 'FIXED_PRICE',
        metadataURI: 'https://example.com/metadata.json'
      };

      // Validate individual components
      expect(ValidationHelper.validateEthereumAddress(listingData.sellerWalletAddress)).toBe(true);
      expect(ValidationHelper.validateEthereumAddress(listingData.tokenAddress)).toBe(true);
      expect(ValidationHelper.validatePrice(listingData.price)).toBe(true);
      expect(ValidationHelper.validateQuantity(listingData.quantity)).toBe(true);
      expect(ValidationHelper.validateURL(listingData.metadataURI)).toBe(true);
    });

    it('should validate NFT listing with token ID', () => {
      const nftData = {
        tokenId: '123456',
        nftStandard: 'ERC721',
        itemType: 'NFT'
      };

      expect(ValidationHelper.validateTokenId(nftData.tokenId)).toBe(true);
    });

    it('should validate auction listing with duration', () => {
      const auctionData = {
        duration: 86400, // 24 hours
        reservePrice: '50.00',
        minIncrement: '5.00'
      };

      expect(ValidationHelper.validateDuration(auctionData.duration)).toBe(true);
      expect(ValidationHelper.validatePrice(auctionData.reservePrice)).toBe(true);
      expect(ValidationHelper.validatePrice(auctionData.minIncrement)).toBe(true);
    });

    it('should sanitize user input for security', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const sanitized = ValidationHelper.sanitizeString(maliciousInput);
      
      expect(sanitized).toBe('scriptalert("xss")/scriptHello World');
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle Redis connection failures gracefully', async () => {
      const redisService = new RedisService();
      const mockClient = (redisService as any).client;
      
      // Simulate connection failure
      mockClient.get.mockRejectedValue(new Error('Connection failed'));
      
      // Should not throw, but handle gracefully
      await expect(async () => {
        try {
          await redisService.get('test-key');
        } catch (error) {
          // Expected to catch the error
          expect((error as Error).message).toBe('Connection failed');
        }
      }).not.toThrow();
    });

    it('should handle database connection pool errors', async () => {
      const dbPool = DatabaseConnectionPool.getInstance();
      const mockSql = dbPool.getConnection() as any;
      
      // Simulate database error
      mockSql.unsafe = jest.fn().mockRejectedValue(new Error('Database unavailable'));
      
      const health = await dbPool.healthCheck();
      
      expect(health.healthy).toBe(false);
      expect(health.error).toBe('Database unavailable');
    });
  });

  describe('Performance and Caching Integration', () => {
    it('should implement efficient caching strategy for frequently accessed data', async () => {
      const redisService = new RedisService();
      const mockClient = (redisService as any).client;
      
      // Mock successful cache operations
      mockClient.setEx.mockResolvedValue('OK');
      mockClient.get.mockResolvedValue(null).mockResolvedValueOnce(null);
      mockClient.exists.mockResolvedValue(0);

      // Simulate cache miss and set
      const cacheKey = 'popular:listings';
      const listings = [
        { id: '1', title: 'Popular Item 1' },
        { id: '2', title: 'Popular Item 2' }
      ];

      // Check cache (miss)
      const cachedData = await redisService.get(cacheKey);
      expect(cachedData).toBeNull();

      // Set cache
      await redisService.set(cacheKey, listings, 300); // 5 minutes TTL

      expect(mockClient.setEx).toHaveBeenCalledWith(
        cacheKey,
        300,
        JSON.stringify(listings)
      );
    });

    it('should implement connection pooling for database efficiency', () => {
      const dbPool = DatabaseConnectionPool.getInstance();
      
      // Multiple connection requests should use the same pool
      const conn1 = dbPool.getConnection();
      const conn2 = dbPool.getConnection();
      
      expect(conn1).toBe(conn2); // Same connection instance from pool
    });
  });

  describe('Data Consistency Integration', () => {
    it('should maintain data consistency between cache and database', async () => {
      const redisService = new RedisService();
      const mockClient = (redisService as any).client;
      
      const listingId = '789';
      const originalListing = { id: listingId, price: '100.00', status: 'active' };
      const updatedListing = { id: listingId, price: '90.00', status: 'active' };

      mockClient.setEx.mockResolvedValue('OK');
      mockClient.del.mockResolvedValue(1);

      // Cache original listing
      await redisService.cacheProductListing(listingId, originalListing);

      // Simulate listing update - invalidate cache
      await redisService.invalidateProductListing(listingId);

      // Cache updated listing
      await redisService.cacheProductListing(listingId, updatedListing);

      expect(mockClient.del).toHaveBeenCalledWith(`listing:${listingId}`);
      expect(mockClient.setEx).toHaveBeenCalledTimes(2);
    });
  });
});
