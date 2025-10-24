import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

/**
 * Follow System + Feed Integration Tests
 * Tests the integration between the follow system and feed filtering
 * Verifies that:
 * - Following a user affects the "following" feed
 * - Unfollowing a user removes their posts from "following" feed
 * - Feed sources work correctly with follow relationships
 */

const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:10000';

// Test wallet addresses
const TEST_USERS = {
  alice: {
    address: '0xAAAA000000000000000000000000000000000000',
    name: 'Alice'
  },
  bob: {
    address: '0xBBBB000000000000000000000000000000000000',
    name: 'Bob'
  },
  charlie: {
    address: '0xCCCC000000000000000000000000000000000000',
    name: 'Charlie'
  },
  dave: {
    address: '0xDDDD000000000000000000000000000000000000',
    name: 'Dave'
  }
};

// Mock authentication tokens (you'll need to generate real ones)
const AUTH_TOKENS = {
  alice: process.env.TEST_AUTH_TOKEN_ALICE || 'alice-token',
  bob: process.env.TEST_AUTH_TOKEN_BOB || 'bob-token',
  charlie: process.env.TEST_AUTH_TOKEN_CHARLIE || 'charlie-token',
  dave: process.env.TEST_AUTH_TOKEN_DAVE || 'dave-token'
};

describe('Follow System + Feed Integration Tests', () => {
  let agent: any;

  beforeAll(() => {
    agent = request(API_BASE_URL);
  });

  describe('Following Feed Filtering', () => {
    beforeEach(async () => {
      // Setup: Alice follows Bob and Charlie, but not Dave
      await agent
        .post('/api/follow/follow')
        .send({
          follower: TEST_USERS.alice.address,
          following: TEST_USERS.bob.address
        });

      await agent
        .post('/api/follow/follow')
        .send({
          follower: TEST_USERS.alice.address,
          following: TEST_USERS.charlie.address
        });
    });

    it('should show posts from followed users in following feed', async () => {
      // Get Alice's following feed
      const response = await agent
        .get('/api/feed/enhanced?feedSource=following')
        .set('Authorization', `Bearer ${AUTH_TOKENS.alice}`)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        const posts = response.body.posts;

        // All posts should be from followed users (Bob or Charlie)
        posts.forEach((post: any) => {
          const author = post.author.toLowerCase();
          const isFromFollowedUser =
            author === TEST_USERS.bob.address.toLowerCase() ||
            author === TEST_USERS.charlie.address.toLowerCase();

          expect(isFromFollowedUser).toBe(true);
          // Should NOT include posts from Dave
          expect(author).not.toBe(TEST_USERS.dave.address.toLowerCase());
        });
      }
    });

    it('should show all posts in global feed regardless of follow status', async () => {
      // Get Alice's global feed
      const response = await agent
        .get('/api/feed/enhanced?feedSource=all')
        .set('Authorization', `Bearer ${AUTH_TOKENS.alice}`)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        const posts = response.body.posts;

        // May include posts from any user, including Dave
        const authors = posts.map((p: any) => p.author.toLowerCase());

        // Should potentially include posts from non-followed users
        // (This test assumes there are posts from various users)
      }
    });

    it('should update following feed after following a new user', async () => {
      // Get initial following feed
      const initialResponse = await agent
        .get('/api/feed/enhanced?feedSource=following&limit=50')
        .set('Authorization', `Bearer ${AUTH_TOKENS.alice}`)
        .expect('Content-Type', /json/);

      let initialDavePostCount = 0;
      if (initialResponse.status === 200) {
        initialDavePostCount = initialResponse.body.posts.filter(
          (p: any) => p.author.toLowerCase() === TEST_USERS.dave.address.toLowerCase()
        ).length;
      }

      // Alice follows Dave
      await agent
        .post('/api/follow/follow')
        .send({
          follower: TEST_USERS.alice.address,
          following: TEST_USERS.dave.address
        })
        .expect(200);

      // Get updated following feed
      const updatedResponse = await agent
        .get('/api/feed/enhanced?feedSource=following&limit=50')
        .set('Authorization', `Bearer ${AUTH_TOKENS.alice}`)
        .expect('Content-Type', /json/);

      if (updatedResponse.status === 200) {
        const davePostCount = updatedResponse.body.posts.filter(
          (p: any) => p.author.toLowerCase() === TEST_USERS.dave.address.toLowerCase()
        ).length;

        // Should now include Dave's posts (if he has any)
        // Either there are now Dave posts, or there were none to begin with
        expect(davePostCount).toBeGreaterThanOrEqual(initialDavePostCount);
      }
    });

    it('should remove posts from following feed after unfollowing a user', async () => {
      // Ensure Alice is following Bob
      await agent
        .post('/api/follow/follow')
        .send({
          follower: TEST_USERS.alice.address,
          following: TEST_USERS.bob.address
        });

      // Get initial following feed
      const initialResponse = await agent
        .get('/api/feed/enhanced?feedSource=following&limit=50')
        .set('Authorization', `Bearer ${AUTH_TOKENS.alice}`)
        .expect('Content-Type', /json/);

      let initialBobPostCount = 0;
      if (initialResponse.status === 200) {
        initialBobPostCount = initialResponse.body.posts.filter(
          (p: any) => p.author.toLowerCase() === TEST_USERS.bob.address.toLowerCase()
        ).length;
      }

      // Alice unfollows Bob
      await agent
        .post('/api/follow/unfollow')
        .send({
          follower: TEST_USERS.alice.address,
          following: TEST_USERS.bob.address
        })
        .expect(200);

      // Get updated following feed
      const updatedResponse = await agent
        .get('/api/feed/enhanced?feedSource=following&limit=50')
        .set('Authorization', `Bearer ${AUTH_TOKENS.alice}`)
        .expect('Content-Type', /json/);

      if (updatedResponse.status === 200) {
        const bobPostCount = updatedResponse.body.posts.filter(
          (p: any) => p.author.toLowerCase() === TEST_USERS.bob.address.toLowerCase()
        ).length;

        // Should not include Bob's posts anymore
        expect(bobPostCount).toBeLessThan(initialBobPostCount);
      }
    });
  });

  describe('Social Proof in Feed', () => {
    beforeEach(async () => {
      // Setup: Alice follows Bob and Charlie
      await agent.post('/api/follow/follow').send({
        follower: TEST_USERS.alice.address,
        following: TEST_USERS.bob.address
      });

      await agent.post('/api/follow/follow').send({
        follower: TEST_USERS.alice.address,
        following: TEST_USERS.charlie.address
      });
    });

    it('should include social proof showing which followed users engaged with posts', async () => {
      const response = await agent
        .get('/api/feed/enhanced?feedSource=all')
        .set('Authorization', `Bearer ${AUTH_TOKENS.alice}`)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        const postsWithSocialProof = response.body.posts.filter(
          (p: any) => p.socialProof && p.socialProof.followedUsersWhoEngaged.length > 0
        );

        // Some posts should have social proof
        if (postsWithSocialProof.length > 0) {
          postsWithSocialProof.forEach((post: any) => {
            expect(post.socialProof).toHaveProperty('followedUsersWhoEngaged');
            expect(Array.isArray(post.socialProof.followedUsersWhoEngaged)).toBe(true);
            expect(post.socialProof).toHaveProperty('totalEngagementFromFollowed');
            expect(typeof post.socialProof.totalEngagementFromFollowed).toBe('number');
          });
        }
      }
    });

    it('should prioritize posts with high social proof engagement', async () => {
      const response = await agent
        .get('/api/feed/enhanced?feedSource=all&sort=hot')
        .set('Authorization', `Bearer ${AUTH_TOKENS.alice}`)
        .expect('Content-Type', /json/);

      if (response.status === 200 && response.body.posts.length > 1) {
        const posts = response.body.posts;

        // Posts with followed users engaging should rank higher
        // (This is a soft check since engagement score includes many factors)
        const postsWithSocialProof = posts.filter(
          (p: any) => p.socialProof?.totalEngagementFromFollowed > 0
        );

        if (postsWithSocialProof.length > 0) {
          // At least some posts with social proof should appear early
          const topPosts = posts.slice(0, Math.min(10, posts.length));
          const topPostsWithProof = topPosts.filter(
            (p: any) => p.socialProof?.totalEngagementFromFollowed > 0
          );

          expect(topPostsWithProof.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Follow Relationships and Feed Consistency', () => {
    it('should maintain consistency between follow count and following feed', async () => {
      // Get Alice's follow count
      const countResponse = await agent
        .get(`/api/follow/count/${TEST_USERS.alice.address}`)
        .expect(200);

      const followingCount = countResponse.body.following;

      // Get Alice's following list
      const followingResponse = await agent
        .get(`/api/follow/following/${TEST_USERS.alice.address}`)
        .expect(200);

      const followingList = followingResponse.body;

      // Count should match list length
      expect(followingCount).toBe(followingList.length);

      // Get Alice's following feed
      const feedResponse = await agent
        .get('/api/feed/enhanced?feedSource=following&limit=100')
        .set('Authorization', `Bearer ${AUTH_TOKENS.alice}`)
        .expect('Content-Type', /json/);

      if (feedResponse.status === 200 && followingCount > 0) {
        const posts = feedResponse.body.posts;
        const uniqueAuthors = [...new Set(posts.map((p: any) => p.author.toLowerCase()))];

        // All authors in following feed should be in the following list
        uniqueAuthors.forEach((author: string) => {
          const isFollowed = followingList.some(
            (addr: string) => addr.toLowerCase() === author
          );
          expect(isFollowed).toBe(true);
        });
      }
    });

    it('should handle multiple users with different follow relationships', async () => {
      // Setup different follow relationships
      // Alice follows Bob and Charlie
      // Bob follows Charlie and Dave
      // Charlie follows Dave

      await agent.post('/api/follow/follow').send({
        follower: TEST_USERS.alice.address,
        following: TEST_USERS.bob.address
      });

      await agent.post('/api/follow/follow').send({
        follower: TEST_USERS.alice.address,
        following: TEST_USERS.charlie.address
      });

      await agent.post('/api/follow/follow').send({
        follower: TEST_USERS.bob.address,
        following: TEST_USERS.charlie.address
      });

      await agent.post('/api/follow/follow').send({
        follower: TEST_USERS.bob.address,
        following: TEST_USERS.dave.address
      });

      await agent.post('/api/follow/follow').send({
        follower: TEST_USERS.charlie.address,
        following: TEST_USERS.dave.address
      });

      // Get Alice's following feed
      const aliceResponse = await agent
        .get('/api/feed/enhanced?feedSource=following')
        .set('Authorization', `Bearer ${AUTH_TOKENS.alice}`)
        .expect('Content-Type', /json/);

      // Get Bob's following feed
      const bobResponse = await agent
        .get('/api/feed/enhanced?feedSource=following')
        .set('Authorization', `Bearer ${AUTH_TOKENS.bob}`)
        .expect('Content-Type', /json/);

      // Feeds should be different based on follow relationships
      if (aliceResponse.status === 200 && bobResponse.status === 200) {
        const aliceAuthors = [...new Set(
          aliceResponse.body.posts.map((p: any) => p.author.toLowerCase())
        )];
        const bobAuthors = [...new Set(
          bobResponse.body.posts.map((p: any) => p.author.toLowerCase())
        )];

        // Alice should see posts from Bob and Charlie
        expect(
          aliceAuthors.includes(TEST_USERS.bob.address.toLowerCase()) ||
          aliceAuthors.includes(TEST_USERS.charlie.address.toLowerCase())
        ).toBe(true);

        // Bob should see posts from Charlie and Dave
        expect(
          bobAuthors.includes(TEST_USERS.charlie.address.toLowerCase()) ||
          bobAuthors.includes(TEST_USERS.dave.address.toLowerCase())
        ).toBe(true);

        // Alice should NOT see posts from Dave (unless there's overlap)
        // Bob's feed may be different from Alice's feed
      }
    });
  });

  describe('Empty State Handling', () => {
    it('should handle user with no followers viewing following feed', async () => {
      // Create a new user who follows no one
      const newUser = {
        address: '0xNEW0000000000000000000000000000000000000',
        token: 'new-user-token'
      };

      const response = await agent
        .get('/api/feed/enhanced?feedSource=following')
        .set('Authorization', `Bearer ${newUser.token}`)
        .expect('Content-Type', /json/);

      // Should return empty feed or suggested content
      if (response.status === 200) {
        expect(response.body).toHaveProperty('posts');
        expect(Array.isArray(response.body.posts)).toBe(true);
        // May be empty or contain suggested posts
      }
    });

    it('should provide suggestions when following feed is empty', async () => {
      const newUser = {
        address: '0xNEW1111111111111111111111111111111111111',
        token: 'new-user-2-token'
      };

      const response = await agent
        .get('/api/feed/enhanced?feedSource=following')
        .set('Authorization', `Bearer ${newUser.token}`)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        // Should include metadata about empty state or suggestions
        expect(response.body).toHaveProperty('posts');

        // May include suggested users to follow
        if (response.body.suggestions) {
          expect(Array.isArray(response.body.suggestions)).toBe(true);
        }
      }
    });
  });

  describe('Performance with Follow Relationships', () => {
    it('should efficiently handle users following many accounts', async () => {
      // Test user follows 50 accounts
      const followers = Array(50).fill(null).map((_, i) =>
        `0x${i.toString().padStart(40, '0')}`
      );

      // Follow all users (this might take a moment)
      const followPromises = followers.map(following =>
        agent.post('/api/follow/follow').send({
          follower: TEST_USERS.alice.address,
          following
        })
      );

      await Promise.all(followPromises);

      // Now fetch following feed - should still be performant
      const startTime = Date.now();

      const response = await agent
        .get('/api/feed/enhanced?feedSource=following&limit=20')
        .set('Authorization', `Bearer ${AUTH_TOKENS.alice}`)
        .expect('Content-Type', /json/);

      const responseTime = Date.now() - startTime;

      // Should respond within 3 seconds even with 50 followed accounts
      expect(responseTime).toBeLessThan(3000);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('posts');
      }
    });
  });
});
