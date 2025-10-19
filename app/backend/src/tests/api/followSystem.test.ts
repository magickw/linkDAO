import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

/**
 * Follow System API Tests
 * Tests the following endpoints:
 * - POST /api/follow/follow
 * - POST /api/follow/unfollow
 * - GET /api/follow/followers/:address
 * - GET /api/follow/following/:address
 * - GET /api/follow/is-following/:follower/:following
 * - GET /api/follow/count/:address
 */

const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3002';

// Test wallet addresses
const TEST_ADDRESSES = {
  user1: '0x1234567890123456789012345678901234567890',
  user2: '0x2345678901234567890123456789012345678901',
  user3: '0x3456789012345678901234567890123456789012',
};

describe('Follow System API Tests', () => {
  let agent: any;

  beforeAll(() => {
    // Create supertest agent
    agent = request(API_BASE_URL);
  });

  describe('POST /api/follow/follow', () => {
    it('should successfully follow a user', async () => {
      const response = await agent
        .post('/api/follow/follow')
        .send({
          follower: TEST_ADDRESSES.user1,
          following: TEST_ADDRESSES.user2
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should return error when follower address is missing', async () => {
      const response = await agent
        .post('/api/follow/follow')
        .send({
          following: TEST_ADDRESSES.user2
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return error when following address is missing', async () => {
      const response = await agent
        .post('/api/follow/follow')
        .send({
          follower: TEST_ADDRESSES.user1
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return error when trying to follow yourself', async () => {
      const response = await agent
        .post('/api/follow/follow')
        .send({
          follower: TEST_ADDRESSES.user1,
          following: TEST_ADDRESSES.user1
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('yourself');
    });

    it('should handle invalid ethereum address format', async () => {
      const response = await agent
        .post('/api/follow/follow')
        .send({
          follower: 'invalid-address',
          following: TEST_ADDRESSES.user2
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should be idempotent - following twice should not error', async () => {
      // First follow
      await agent
        .post('/api/follow/follow')
        .send({
          follower: TEST_ADDRESSES.user1,
          following: TEST_ADDRESSES.user3
        })
        .expect(200);

      // Second follow (should not error)
      const response = await agent
        .post('/api/follow/follow')
        .send({
          follower: TEST_ADDRESSES.user1,
          following: TEST_ADDRESSES.user3
        })
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });
  });

  describe('POST /api/follow/unfollow', () => {
    beforeEach(async () => {
      // Ensure user1 follows user2 before each test
      await agent
        .post('/api/follow/follow')
        .send({
          follower: TEST_ADDRESSES.user1,
          following: TEST_ADDRESSES.user2
        });
    });

    it('should successfully unfollow a user', async () => {
      const response = await agent
        .post('/api/follow/unfollow')
        .send({
          follower: TEST_ADDRESSES.user1,
          following: TEST_ADDRESSES.user2
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should return error when follower address is missing', async () => {
      const response = await agent
        .post('/api/follow/unfollow')
        .send({
          following: TEST_ADDRESSES.user2
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should be idempotent - unfollowing twice should not error', async () => {
      // First unfollow
      await agent
        .post('/api/follow/unfollow')
        .send({
          follower: TEST_ADDRESSES.user1,
          following: TEST_ADDRESSES.user2
        })
        .expect(200);

      // Second unfollow (should not error)
      const response = await agent
        .post('/api/follow/unfollow')
        .send({
          follower: TEST_ADDRESSES.user1,
          following: TEST_ADDRESSES.user2
        })
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });
  });

  describe('GET /api/follow/followers/:address', () => {
    beforeEach(async () => {
      // Setup: user1 and user2 follow user3
      await agent
        .post('/api/follow/follow')
        .send({
          follower: TEST_ADDRESSES.user1,
          following: TEST_ADDRESSES.user3
        });

      await agent
        .post('/api/follow/follow')
        .send({
          follower: TEST_ADDRESSES.user2,
          following: TEST_ADDRESSES.user3
        });
    });

    it('should return list of followers for a user', async () => {
      const response = await agent
        .get(`/api/follow/followers/${TEST_ADDRESSES.user3}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      expect(response.body).toContain(TEST_ADDRESSES.user1);
      expect(response.body).toContain(TEST_ADDRESSES.user2);
    });

    it('should return empty array for user with no followers', async () => {
      const newUser = '0x9999999999999999999999999999999999999999';
      const response = await agent
        .get(`/api/follow/followers/${newUser}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return error for invalid address', async () => {
      const response = await agent
        .get('/api/follow/followers/invalid-address')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/follow/following/:address', () => {
    beforeEach(async () => {
      // Setup: user1 follows user2 and user3
      await agent
        .post('/api/follow/follow')
        .send({
          follower: TEST_ADDRESSES.user1,
          following: TEST_ADDRESSES.user2
        });

      await agent
        .post('/api/follow/follow')
        .send({
          follower: TEST_ADDRESSES.user1,
          following: TEST_ADDRESSES.user3
        });
    });

    it('should return list of users that a user is following', async () => {
      const response = await agent
        .get(`/api/follow/following/${TEST_ADDRESSES.user1}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      expect(response.body).toContain(TEST_ADDRESSES.user2);
      expect(response.body).toContain(TEST_ADDRESSES.user3);
    });

    it('should return empty array for user not following anyone', async () => {
      const newUser = '0x8888888888888888888888888888888888888888';
      const response = await agent
        .get(`/api/follow/following/${newUser}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/follow/is-following/:follower/:following', () => {
    beforeEach(async () => {
      // Setup: user1 follows user2
      await agent
        .post('/api/follow/follow')
        .send({
          follower: TEST_ADDRESSES.user1,
          following: TEST_ADDRESSES.user2
        });
    });

    it('should return true when user is following another user', async () => {
      const response = await agent
        .get(`/api/follow/is-following/${TEST_ADDRESSES.user1}/${TEST_ADDRESSES.user2}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toBe(true);
    });

    it('should return false when user is not following another user', async () => {
      const response = await agent
        .get(`/api/follow/is-following/${TEST_ADDRESSES.user1}/${TEST_ADDRESSES.user3}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toBe(false);
    });

    it('should return false when checking if user follows themselves', async () => {
      const response = await agent
        .get(`/api/follow/is-following/${TEST_ADDRESSES.user1}/${TEST_ADDRESSES.user1}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toBe(false);
    });
  });

  describe('GET /api/follow/count/:address', () => {
    beforeEach(async () => {
      // Setup relationships:
      // user1 follows user2
      // user2 follows user1
      // user3 follows user1
      await agent.post('/api/follow/follow').send({
        follower: TEST_ADDRESSES.user1,
        following: TEST_ADDRESSES.user2
      });

      await agent.post('/api/follow/follow').send({
        follower: TEST_ADDRESSES.user2,
        following: TEST_ADDRESSES.user1
      });

      await agent.post('/api/follow/follow').send({
        follower: TEST_ADDRESSES.user3,
        following: TEST_ADDRESSES.user1
      });
    });

    it('should return correct follower and following counts', async () => {
      const response = await agent
        .get(`/api/follow/count/${TEST_ADDRESSES.user1}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('followers');
      expect(response.body).toHaveProperty('following');
      expect(typeof response.body.followers).toBe('number');
      expect(typeof response.body.following).toBe('number');

      // user1 has 2 followers (user2 and user3)
      expect(response.body.followers).toBeGreaterThanOrEqual(2);
      // user1 follows 1 user (user2)
      expect(response.body.following).toBeGreaterThanOrEqual(1);
    });

    it('should return zero counts for new user', async () => {
      const newUser = '0x7777777777777777777777777777777777777777';
      const response = await agent
        .get(`/api/follow/count/${newUser}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('followers', 0);
      expect(response.body).toHaveProperty('following', 0);
    });
  });

  describe('Follow System Integration Tests', () => {
    it('should maintain consistency across follow/unfollow operations', async () => {
      const follower = TEST_ADDRESSES.user1;
      const following = TEST_ADDRESSES.user2;

      // Initial counts
      const initialCounts = await agent
        .get(`/api/follow/count/${follower}`)
        .expect(200);

      const initialFollowingCount = initialCounts.body.following;

      // Follow
      await agent
        .post('/api/follow/follow')
        .send({ follower, following })
        .expect(200);

      // Verify is-following
      const isFollowingAfter = await agent
        .get(`/api/follow/is-following/${follower}/${following}`)
        .expect(200);
      expect(isFollowingAfter.body).toBe(true);

      // Verify counts increased
      const countsAfterFollow = await agent
        .get(`/api/follow/count/${follower}`)
        .expect(200);
      expect(countsAfterFollow.body.following).toBeGreaterThanOrEqual(initialFollowingCount);

      // Unfollow
      await agent
        .post('/api/follow/unfollow')
        .send({ follower, following })
        .expect(200);

      // Verify is-following
      const isFollowingAfterUnfollow = await agent
        .get(`/api/follow/is-following/${follower}/${following}`)
        .expect(200);
      expect(isFollowingAfterUnfollow.body).toBe(false);

      // Verify counts returned to original or decreased
      const finalCounts = await agent
        .get(`/api/follow/count/${follower}`)
        .expect(200);
      expect(finalCounts.body.following).toBeLessThanOrEqual(countsAfterFollow.body.following);
    });

    it('should handle multiple followers correctly', async () => {
      const target = TEST_ADDRESSES.user3;

      // Get initial follower count
      const initialCounts = await agent
        .get(`/api/follow/count/${target}`)
        .expect(200);
      const initialFollowers = initialCounts.body.followers;

      // Have user1 follow target
      await agent
        .post('/api/follow/follow')
        .send({
          follower: TEST_ADDRESSES.user1,
          following: target
        })
        .expect(200);

      // Have user2 follow target
      await agent
        .post('/api/follow/follow')
        .send({
          follower: TEST_ADDRESSES.user2,
          following: target
        })
        .expect(200);

      // Check followers list
      const followers = await agent
        .get(`/api/follow/followers/${target}`)
        .expect(200);

      expect(followers.body).toContain(TEST_ADDRESSES.user1);
      expect(followers.body).toContain(TEST_ADDRESSES.user2);

      // Check count increased by 2
      const finalCounts = await agent
        .get(`/api/follow/count/${target}`)
        .expect(200);

      expect(finalCounts.body.followers).toBeGreaterThanOrEqual(initialFollowers + 2);
    });
  });
});
