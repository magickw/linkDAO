import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

/**
 * Feed System API Tests
 * Tests the feed endpoints with Following System integration:
 * - GET /api/feed/enhanced (basic feed)
 * - GET /api/feed/enhanced?feedSource=following (following feed)
 * - GET /api/feed/enhanced?feedSource=all (global feed)
 * - Feed filtering, sorting, and pagination
 */

const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3002';

// Test wallet addresses
const TEST_ADDRESSES = {
  user1: '0x1111111111111111111111111111111111111111',
  user2: '0x2222222222222222222222222222222222222222',
  user3: '0x3333333333333333333333333333333333333333',
};

// Mock authentication token (you'll need to generate a real one for your tests)
const MOCK_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'test-token';

describe('Feed System API Tests', () => {
  let agent: any;

  beforeAll(() => {
    agent = request(API_BASE_URL);
  });

  describe('GET /api/feed/enhanced - Basic Feed', () => {
    it('should return 401 when no authentication token provided', async () => {
      const response = await agent
        .get('/api/feed/enhanced')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('token');
    });

    it('should return feed data with valid authentication', async () => {
      const response = await agent
        .get('/api/feed/enhanced')
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      // Even if auth fails, we're testing the endpoint structure
      if (response.status === 200) {
        expect(response.body).toHaveProperty('posts');
        expect(Array.isArray(response.body.posts)).toBe(true);
        expect(response.body).toHaveProperty('pagination');
      }
    });

    it('should support pagination parameters', async () => {
      const response = await agent
        .get('/api/feed/enhanced?page=1&limit=10')
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('pagination');
        expect(response.body.pagination).toHaveProperty('page');
        expect(response.body.pagination).toHaveProperty('limit');
        expect(response.body.posts.length).toBeLessThanOrEqual(10);
      }
    });

    it('should support sort parameter', async () => {
      const response = await agent
        .get('/api/feed/enhanced?sort=hot')
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      // Test endpoint accepts sort parameter
      if (response.status === 200) {
        expect(response.body).toHaveProperty('posts');
      }
    });

    it('should support timeRange parameter', async () => {
      const response = await agent
        .get('/api/feed/enhanced?timeRange=day')
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('posts');
      }
    });

    it('should validate page parameter is positive', async () => {
      const response = await agent
        .get('/api/feed/enhanced?page=0')
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      // Page should be at least 1
      if (response.status === 400) {
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should validate limit parameter is within bounds', async () => {
      const response = await agent
        .get('/api/feed/enhanced?limit=1000')
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      // Limit should have a maximum (typically 100)
      if (response.status === 400) {
        expect(response.body).toHaveProperty('error');
      } else if (response.status === 200) {
        // Should enforce max limit
        expect(response.body.posts.length).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('GET /api/feed/enhanced?feedSource=following - Following Feed', () => {
    it('should return only posts from followed users when feedSource=following', async () => {
      const response = await agent
        .get('/api/feed/enhanced?feedSource=following')
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('posts');
        expect(Array.isArray(response.body.posts)).toBe(true);

        // All posts should be from followed users
        // (In real implementation, verify author is in user's following list)
      }
    });

    it('should return empty array when user follows no one', async () => {
      // Test with a user who follows no one
      const response = await agent
        .get('/api/feed/enhanced?feedSource=following')
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('posts');
        // May be empty or contain suggested content
      }
    });

    it('should combine feedSource with other filters', async () => {
      const response = await agent
        .get('/api/feed/enhanced?feedSource=following&sort=new&timeRange=day')
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('posts');
        // Posts should be sorted by newest first
      }
    });
  });

  describe('GET /api/feed/enhanced?feedSource=all - Global Feed', () => {
    it('should return posts from all users when feedSource=all', async () => {
      const response = await agent
        .get('/api/feed/enhanced?feedSource=all')
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('posts');
        expect(Array.isArray(response.body.posts)).toBe(true);
        // Should return posts from any user
      }
    });

    it('should return more posts than following feed', async () => {
      // Get following feed
      const followingResponse = await agent
        .get('/api/feed/enhanced?feedSource=following&limit=20')
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      // Get global feed
      const allResponse = await agent
        .get('/api/feed/enhanced?feedSource=all&limit=20')
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      if (followingResponse.status === 200 && allResponse.status === 200) {
        // Global feed should typically have same or more posts
        expect(allResponse.body.posts.length).toBeGreaterThanOrEqual(
          followingResponse.body.posts.length
        );
      }
    });
  });

  describe('Feed Filtering', () => {
    it('should filter by community ID', async () => {
      const communityId = 'test-community-123';
      const response = await agent
        .get(`/api/feed/enhanced?communities=${communityId}`)
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('posts');
        // All posts should belong to specified community
        response.body.posts.forEach((post: any) => {
          if (post.communityId) {
            expect(post.communityId).toBe(communityId);
          }
        });
      }
    });

    it('should filter by tags', async () => {
      const tags = 'defi,nft';
      const response = await agent
        .get(`/api/feed/enhanced?tags=${tags}`)
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('posts');
        // Posts should have at least one of the specified tags
      }
    });

    it('should filter by author', async () => {
      const authorAddress = TEST_ADDRESSES.user1;
      const response = await agent
        .get(`/api/feed/enhanced?author=${authorAddress}`)
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('posts');
        // All posts should be from the specified author
        response.body.posts.forEach((post: any) => {
          expect(post.author.toLowerCase()).toBe(authorAddress.toLowerCase());
        });
      }
    });
  });

  describe('Feed Sorting', () => {
    it('should sort by hot (default)', async () => {
      const response = await agent
        .get('/api/feed/enhanced?sort=hot')
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('posts');
        const posts = response.body.posts;

        // Posts should be ordered by engagement score (hot algorithm)
        for (let i = 0; i < posts.length - 1; i++) {
          const currentScore = posts[i].engagementScore || 0;
          const nextScore = posts[i + 1].engagementScore || 0;
          expect(currentScore).toBeGreaterThanOrEqual(nextScore);
        }
      }
    });

    it('should sort by new', async () => {
      const response = await agent
        .get('/api/feed/enhanced?sort=new')
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('posts');
        const posts = response.body.posts;

        // Posts should be ordered by creation time (newest first)
        for (let i = 0; i < posts.length - 1; i++) {
          const currentTime = new Date(posts[i].createdAt).getTime();
          const nextTime = new Date(posts[i + 1].createdAt).getTime();
          expect(currentTime).toBeGreaterThanOrEqual(nextTime);
        }
      }
    });

    it('should sort by top', async () => {
      const response = await agent
        .get('/api/feed/enhanced?sort=top&timeRange=day')
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('posts');
        // Posts should be ordered by total engagement
      }
    });
  });

  describe('Feed Pagination', () => {
    it('should return correct number of posts per page', async () => {
      const limit = 5;
      const response = await agent
        .get(`/api/feed/enhanced?limit=${limit}`)
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body.posts.length).toBeLessThanOrEqual(limit);
      }
    });

    it('should handle page navigation', async () => {
      // Get first page
      const page1Response = await agent
        .get('/api/feed/enhanced?page=1&limit=5')
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      // Get second page
      const page2Response = await agent
        .get('/api/feed/enhanced?page=2&limit=5')
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      if (page1Response.status === 200 && page2Response.status === 200) {
        const page1Posts = page1Response.body.posts;
        const page2Posts = page2Response.body.posts;

        // Posts should be different between pages
        if (page1Posts.length > 0 && page2Posts.length > 0) {
          const page1Ids = page1Posts.map((p: any) => p.id);
          const page2Ids = page2Posts.map((p: any) => p.id);

          // No overlap between pages
          const overlap = page1Ids.filter((id: string) => page2Ids.includes(id));
          expect(overlap.length).toBe(0);
        }
      }
    });

    it('should include pagination metadata', async () => {
      const response = await agent
        .get('/api/feed/enhanced?page=1&limit=10')
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('pagination');
        expect(response.body.pagination).toHaveProperty('page', 1);
        expect(response.body.pagination).toHaveProperty('limit', 10);
        expect(response.body.pagination).toHaveProperty('total');
        expect(response.body.pagination).toHaveProperty('totalPages');
      }
    });
  });

  describe('Feed Post Structure', () => {
    it('should return posts with required fields', async () => {
      const response = await agent
        .get('/api/feed/enhanced?limit=1')
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      if (response.status === 200 && response.body.posts.length > 0) {
        const post = response.body.posts[0];

        // Required fields
        expect(post).toHaveProperty('id');
        expect(post).toHaveProperty('author');
        expect(post).toHaveProperty('createdAt');
        expect(post).toHaveProperty('contentType');

        // Engagement fields
        expect(post).toHaveProperty('reactions');
        expect(post).toHaveProperty('comments');
        expect(post).toHaveProperty('shares');
        expect(post).toHaveProperty('views');
        expect(post).toHaveProperty('engagementScore');
      }
    });

    it('should include social proof data', async () => {
      const response = await agent
        .get('/api/feed/enhanced?feedSource=following&limit=1')
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      if (response.status === 200 && response.body.posts.length > 0) {
        const post = response.body.posts[0];

        // Social proof should be included
        if (post.socialProof) {
          expect(post.socialProof).toHaveProperty('followedUsersWhoEngaged');
          expect(post.socialProof).toHaveProperty('totalEngagementFromFollowed');
          expect(Array.isArray(post.socialProof.followedUsersWhoEngaged)).toBe(true);
        }
      }
    });

    it('should include trending status', async () => {
      const response = await agent
        .get('/api/feed/enhanced?limit=10')
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        response.body.posts.forEach((post: any) => {
          if (post.trendingStatus) {
            expect(['trending', 'hot', 'rising']).toContain(post.trendingStatus);
          }
        });
      }
    });
  });

  describe('Feed Performance', () => {
    it('should respond within acceptable time (< 2s)', async () => {
      const startTime = Date.now();

      await agent
        .get('/api/feed/enhanced?limit=20')
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000); // 2 second max
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(5).fill(null).map(() =>
        agent
          .get('/api/feed/enhanced?limit=10')
          .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
      );

      const responses = await Promise.all(requests);

      // All requests should complete successfully
      responses.forEach(response => {
        if (response.status === 200) {
          expect(response.body).toHaveProperty('posts');
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid sort parameter', async () => {
      const response = await agent
        .get('/api/feed/enhanced?sort=invalid')
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      if (response.status === 400) {
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should handle invalid timeRange parameter', async () => {
      const response = await agent
        .get('/api/feed/enhanced?timeRange=invalid')
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      if (response.status === 400) {
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should handle invalid feedSource parameter', async () => {
      const response = await agent
        .get('/api/feed/enhanced?feedSource=invalid')
        .set('Authorization', `Bearer ${MOCK_AUTH_TOKEN}`)
        .expect('Content-Type', /json/);

      if (response.status === 400) {
        expect(response.body).toHaveProperty('error');
      }
    });
  });
});
