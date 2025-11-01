import { RedisService } from '../services/redisService';

// Mock Redis client
const mockRedisClient = {
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
};

// Mock Redis module
jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient)
}));

describe('RedisService', () => {
  let redisService: RedisService;

  beforeEach(() => {
    jest.clearAllMocks();
    redisService = new RedisService();
    // Mock the isConnected property
    (redisService as any).isConnected = true;
  });

  describe('Session Management', () => {
    it('should set session with TTL', async () => {
      const sessionId = 'test-session-123';
      const sessionData = { userId: '456', address: '0x123' };
      const ttl = 3600;

      mockRedisClient.setEx.mockResolvedValue('OK');

      await redisService.setSession(sessionId, sessionData, ttl);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        `session:${sessionId}`,
        ttl,
        JSON.stringify(sessionData)
      );
    });

    it('should get session data', async () => {
      const sessionId = 'test-session-123';
      const sessionData = { userId: '456', address: '0x123' };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(sessionData));

      const result = await redisService.getSession(sessionId);

      expect(mockRedisClient.get).toHaveBeenCalledWith(`session:${sessionId}`);
      expect(result).toEqual(sessionData);
    });

    it('should return null for non-existent session', async () => {
      const sessionId = 'non-existent-session';

      mockRedisClient.get.mockResolvedValue(null);

      const result = await redisService.getSession(sessionId);

      expect(result).toBeNull();
    });

    it('should delete session', async () => {
      const sessionId = 'test-session-123';

      mockRedisClient.del.mockResolvedValue(1);

      await redisService.deleteSession(sessionId);

      expect(mockRedisClient.del).toHaveBeenCalledWith(`session:${sessionId}`);
    });

    it('should extend session TTL', async () => {
      const sessionId = 'test-session-123';
      const ttl = 7200;

      mockRedisClient.expire.mockResolvedValue(1);

      await redisService.extendSession(sessionId, ttl);

      expect(mockRedisClient.expire).toHaveBeenCalledWith(`session:${sessionId}`, ttl);
    });
  });

  describe('General Caching', () => {
    it('should set value with TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test-data' };
      const ttl = 1800;

      mockRedisClient.setEx.mockResolvedValue('OK');

      await redisService.set(key, value, ttl);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        key,
        ttl,
        JSON.stringify(value)
      );
    });

    it('should set value without TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test-data' };

      mockRedisClient.set.mockResolvedValue('OK');

      await redisService.set(key, value);

      expect(mockRedisClient.set).toHaveBeenCalledWith(key, JSON.stringify(value));
    });

    it('should get cached value', async () => {
      const key = 'test-key';
      const value = { data: 'test-data' };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(value));

      const result = await redisService.get(key);

      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
      expect(result).toEqual(value);
    });

    it('should check if key exists', async () => {
      const key = 'test-key';

      mockRedisClient.exists.mockResolvedValue(1);

      const result = await redisService.exists(key);

      expect(mockRedisClient.exists).toHaveBeenCalledWith(key);
      expect(result).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const key = 'non-existent-key';

      mockRedisClient.exists.mockResolvedValue(0);

      const result = await redisService.exists(key);

      expect(result).toBe(false);
    });
  });

  describe('Marketplace-specific Caching', () => {
    it('should cache user profile', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const profile = { handle: 'testuser', bio: 'Test bio' };
      const ttl = 1800;

      mockRedisClient.setEx.mockResolvedValue('OK');

      await redisService.cacheUserProfile(address, profile, ttl);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        `user:profile:${address}`,
        ttl,
        JSON.stringify(profile)
      );
    });

    it('should get cached user profile', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const profile = { handle: 'testuser', bio: 'Test bio' };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(profile));

      const result = await redisService.getCachedUserProfile(address);

      expect(mockRedisClient.get).toHaveBeenCalledWith(`user:profile:${address}`);
      expect(result).toEqual(profile);
    });

    it('should cache product listing', async () => {
      const listingId = '123';
      const listing = { title: 'Test Product', price: '100' };
      const ttl = 900;

      mockRedisClient.setEx.mockResolvedValue('OK');

      await redisService.cacheProductListing(listingId, listing, ttl);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        `listing:${listingId}`,
        ttl,
        JSON.stringify(listing)
      );
    });

    it('should invalidate product listing', async () => {
      const listingId = '123';

      mockRedisClient.del.mockResolvedValue(1);

      await redisService.invalidateProductListing(listingId);

      expect(mockRedisClient.del).toHaveBeenCalledWith(`listing:${listingId}`);
    });

    it('should cache active listings', async () => {
      const listings = [
        { id: '1', title: 'Product 1' },
        { id: '2', title: 'Product 2' }
      ];
      const ttl = 300;

      mockRedisClient.setEx.mockResolvedValue('OK');

      await redisService.cacheActiveListings(listings, ttl);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'marketplace:active_listings',
        ttl,
        JSON.stringify(listings)
      );
    });

    it('should cache user reputation', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const reputation = { score: 95, reviewCount: 10 };
      const ttl = 1800;

      mockRedisClient.setEx.mockResolvedValue('OK');

      await redisService.cacheUserReputation(address, reputation, ttl);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        `reputation:${address}`,
        ttl,
        JSON.stringify(reputation)
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should allow request within rate limit', async () => {
      const key = 'rate:user:123';
      const limit = 10;
      const window = 60;
      const currentCount = 5;

      mockRedisClient.incr.mockResolvedValue(currentCount);
      mockRedisClient.expire.mockResolvedValue(1);

      const result = await redisService.checkRateLimit(key, limit, window);

      expect(mockRedisClient.incr).toHaveBeenCalledWith(key);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });

    it('should deny request exceeding rate limit', async () => {
      const key = 'rate:user:123';
      const limit = 10;
      const window = 60;
      const currentCount = 15;

      mockRedisClient.incr.mockResolvedValue(currentCount);

      const result = await redisService.checkRateLimit(key, limit, window);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should set expiry for first request', async () => {
      const key = 'rate:user:123';
      const limit = 10;
      const window = 60;
      const currentCount = 1;

      mockRedisClient.incr.mockResolvedValue(currentCount);
      mockRedisClient.expire.mockResolvedValue(1);

      await redisService.checkRateLimit(key, limit, window);

      expect(mockRedisClient.expire).toHaveBeenCalledWith(key, window);
    });
  });

  describe('Search Result Caching', () => {
    it('should cache search results', async () => {
      const query = 'test search query';
      const results = [{ id: '1', title: 'Result 1' }];
      const ttl = 600;
      const expectedKey = `search:${Buffer.from(query).toString('base64')}`;

      mockRedisClient.setEx.mockResolvedValue('OK');

      await redisService.cacheSearchResults(query, results, ttl);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        expectedKey,
        ttl,
        JSON.stringify(results)
      );
    });

    it('should get cached search results', async () => {
      const query = 'test search query';
      const results = [{ id: '1', title: 'Result 1' }];
      const expectedKey = `search:${Buffer.from(query).toString('base64')}`;

      mockRedisClient.get.mockResolvedValue(JSON.stringify(results));

      const result = await redisService.getCachedSearchResults(query);

      expect(mockRedisClient.get).toHaveBeenCalledWith(expectedKey);
      expect(result).toEqual(results);
    });
  });

  describe('Utility Methods', () => {
    it('should ping Redis server', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await redisService.ping();

      expect(mockRedisClient.ping).toHaveBeenCalled();
      expect(result).toBe('PONG');
    });

    it('should flush all data', async () => {
      mockRedisClient.flushAll.mockResolvedValue('OK');

      await redisService.flushAll();

      expect(mockRedisClient.flushAll).toHaveBeenCalled();
    });

    it('should return Redis client', () => {
      const client = redisService.getClient();

      expect(client).toBe(mockRedisClient);
    });
  });

  describe('Connection Management', () => {
    it('should handle connection errors', () => {
      const errorCallback = mockRedisClient.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];

      expect(errorCallback).toBeDefined();

      // Simulate error
      const testError = new Error('Connection failed');
      errorCallback(testError);

      // Should not throw, just log the error
    });

    it('should handle connection events', () => {
      const connectCallback = mockRedisClient.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];

      const readyCallback = mockRedisClient.on.mock.calls.find(
        call => call[0] === 'ready'
      )?.[1];

      const endCallback = mockRedisClient.on.mock.calls.find(
        call => call[0] === 'end'
      )?.[1];

      expect(connectCallback).toBeDefined();
      expect(readyCallback).toBeDefined();
      expect(endCallback).toBeDefined();

      // Simulate events
      connectCallback();
      readyCallback();
      endCallback();

      // Should not throw
    });
  });
});
