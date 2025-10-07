/**
 * API Endpoints Integration Tests
 * Tests for feed, community, and messaging API endpoints
 */

import request from 'supertest';
import { app } from '../../index';
import { db } from '../../db/connection';

describe('API Endpoints Integration Tests', () => {
  let authToken: string;
  let testUserId: string;
  let testCommunityId: string;
  let testConversationId: string;

  beforeAll(async () => {
    // Setup test database and auth
    testUserId = 'test-user-address';
    authToken = 'mock-jwt-token';
  });

  afterAll(async () => {
    // Cleanup test data
    await db.cleanup();
  });

  describe('Feed API Endpoints', () => {
    describe('GET /api/feed/enhanced', () => {
      it('should get personalized feed with default parameters', async () => {
        const response = await request(app)
          .get('/api/feed/enhanced')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('posts');
        expect(response.body).toHaveProperty('pagination');
        expect(Array.isArray(response.body.posts)).toBe(true);
      });

      it('should filter feed by communities', async () => {
        const response = await request(app)
          .get('/api/feed/enhanced')
          .query({ communities: ['community1', 'community2'] })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.posts).toBeDefined();
      });

      it('should sort feed by different criteria', async () => {
        const sorts = ['hot', 'new', 'top', 'following'];
        
        for (const sort of sorts) {
          const response = await request(app)
            .get('/api/feed/enhanced')
            .query({ sort })
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

          expect(response.body.posts).toBeDefined();
        }
      });

      it('should validate pagination parameters', async () => {
        await request(app)
          .get('/api/feed/enhanced')
          .query({ page: 0 }) // Invalid page
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        await request(app)
          .get('/api/feed/enhanced')
          .query({ limit: 100 }) // Exceeds max limit
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });
    });

    describe('POST /api/feed', () => {
      it('should create a new post', async () => {
        const postData = {
          content: 'This is a test post',
          tags: ['test', 'integration']
        };

        const response = await request(app)
          .post('/api/feed')
          .send(postData)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.content).toBe(postData.content);
        expect(response.body.tags).toEqual(postData.tags);
      });

      it('should validate post content', async () => {
        await request(app)
          .post('/api/feed')
          .send({ content: '' }) // Empty content
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        await request(app)
          .post('/api/feed')
          .send({ content: 'a'.repeat(5001) }) // Too long
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });
    });
  });
});  descri
be('Community API Endpoints', () => {
    describe('GET /api/communities', () => {
      it('should list communities with default parameters', async () => {
        const response = await request(app)
          .get('/api/communities')
          .expect(200);

        expect(response.body).toHaveProperty('communities');
        expect(response.body).toHaveProperty('pagination');
        expect(Array.isArray(response.body.communities)).toBe(true);
      });

      it('should filter communities by category', async () => {
        const response = await request(app)
          .get('/api/communities')
          .query({ category: 'technology' })
          .expect(200);

        expect(response.body.communities).toBeDefined();
      });

      it('should search communities', async () => {
        const response = await request(app)
          .get('/api/communities')
          .query({ search: 'test' })
          .expect(200);

        expect(response.body.communities).toBeDefined();
      });
    });

    describe('POST /api/communities', () => {
      it('should create a new community', async () => {
        const communityData = {
          name: 'test-community',
          displayName: 'Test Community',
          description: 'A test community for integration testing',
          category: 'technology',
          isPublic: true
        };

        const response = await request(app)
          .post('/api/communities')
          .send(communityData)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe(communityData.name);
        expect(response.body.displayName).toBe(communityData.displayName);
        
        testCommunityId = response.body.id;
      });

      it('should validate community data', async () => {
        await request(app)
          .post('/api/communities')
          .send({ name: 'ab' }) // Too short
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        await request(app)
          .post('/api/communities')
          .send({
            name: 'valid-name',
            displayName: 'Valid Name',
            description: 'short' // Too short
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });
    });

    describe('POST /api/communities/:id/join', () => {
      it('should join a community', async () => {
        const response = await request(app)
          .post(`/api/communities/${testCommunityId}/join`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
      });

      it('should handle joining non-existent community', async () => {
        await request(app)
          .post('/api/communities/non-existent/join')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });
    });

    describe('GET /api/communities/:id/posts', () => {
      it('should get community posts', async () => {
        const response = await request(app)
          .get(`/api/communities/${testCommunityId}/posts`)
          .expect(200);

        expect(response.body).toHaveProperty('posts');
        expect(Array.isArray(response.body.posts)).toBe(true);
      });

      it('should sort community posts', async () => {
        const sorts = ['newest', 'oldest', 'hot', 'top'];
        
        for (const sort of sorts) {
          const response = await request(app)
            .get(`/api/communities/${testCommunityId}/posts`)
            .query({ sort })
            .expect(200);

          expect(response.body.posts).toBeDefined();
        }
      });
    });
  });

  describe('Messaging API Endpoints', () => {
    describe('GET /api/messaging/conversations', () => {
      it('should get user conversations', async () => {
        const response = await request(app)
          .get('/api/messaging/conversations')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('conversations');
        expect(Array.isArray(response.body.conversations)).toBe(true);
      });

      it('should search conversations', async () => {
        const response = await request(app)
          .get('/api/messaging/conversations')
          .query({ search: 'test' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.conversations).toBeDefined();
      });
    });

    describe('POST /api/messaging/conversations', () => {
      it('should start a new conversation', async () => {
        const conversationData = {
          participantAddress: 'other-user-address',
          initialMessage: 'Hello, this is a test message'
        };

        const response = await request(app)
          .post('/api/messaging/conversations')
          .send(conversationData)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.participants).toContain(testUserId);
        expect(response.body.participants).toContain(conversationData.participantAddress);
        
        testConversationId = response.body.id;
      });

      it('should validate conversation data', async () => {
        await request(app)
          .post('/api/messaging/conversations')
          .send({}) // Missing participant
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        await request(app)
          .post('/api/messaging/conversations')
          .send({
            participantAddress: 'valid-address',
            initialMessage: 'a'.repeat(2001) // Too long
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });
    });

    describe('POST /api/messaging/conversations/:id/messages', () => {
      it('should send a message', async () => {
        const messageData = {
          content: 'This is a test message',
          contentType: 'text'
        };

        const response = await request(app)
          .post(`/api/messaging/conversations/${testConversationId}/messages`)
          .send(messageData)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.content).toBe(messageData.content);
        expect(response.body.fromAddress).toBe(testUserId);
      });

      it('should validate message content', async () => {
        await request(app)
          .post(`/api/messaging/conversations/${testConversationId}/messages`)
          .send({ content: '' }) // Empty content
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        await request(app)
          .post(`/api/messaging/conversations/${testConversationId}/messages`)
          .send({ content: 'a'.repeat(2001) }) // Too long
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });
    });

    describe('GET /api/messaging/conversations/:id/messages', () => {
      it('should get conversation messages', async () => {
        const response = await request(app)
          .get(`/api/messaging/conversations/${testConversationId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('messages');
        expect(Array.isArray(response.body.messages)).toBe(true);
      });

      it('should paginate messages', async () => {
        const response = await request(app)
          .get(`/api/messaging/conversations/${testConversationId}/messages`)
          .query({ page: 1, limit: 10 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.messages).toBeDefined();
        expect(response.body).toHaveProperty('pagination');
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on feed endpoints', async () => {
      // Make multiple requests quickly to trigger rate limit
      const requests = Array(101).fill(null).map(() =>
        request(app)
          .get('/api/feed/enhanced')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.allSettled(requests);
      
      // Some requests should be rate limited
      const rateLimited = responses.some(result => 
        result.status === 'fulfilled' && result.value.status === 429
      );
      
      expect(rateLimited).toBe(true);
    });

    it('should enforce rate limits on messaging endpoints', async () => {
      // Make multiple requests quickly to trigger rate limit
      const requests = Array(301).fill(null).map(() =>
        request(app)
          .get('/api/messaging/conversations')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.allSettled(requests);
      
      // Some requests should be rate limited
      const rateLimited = responses.some(result => 
        result.status === 'fulfilled' && result.value.status === 429
      );
      
      expect(rateLimited).toBe(true);
    });
  });

  describe('Authentication', () => {
    it('should require authentication for protected endpoints', async () => {
      await request(app)
        .post('/api/feed')
        .send({ content: 'test' })
        .expect(401);

      await request(app)
        .post('/api/communities')
        .send({ name: 'test' })
        .expect(401);

      await request(app)
        .get('/api/messaging/conversations')
        .expect(401);
    });

    it('should allow public access to public endpoints', async () => {
      await request(app)
        .get('/api/communities')
        .expect(200);

      await request(app)
        .get(`/api/communities/${testCommunityId}`)
        .expect(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      await request(app)
        .post('/api/feed')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${authToken}`)
        .send('invalid json')
        .expect(400);
    });

    it('should handle missing required fields', async () => {
      await request(app)
        .post('/api/feed')
        .send({}) // Missing content
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should handle invalid field types', async () => {
      await request(app)
        .post('/api/feed')
        .send({ content: 123 }) // Should be string
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });
});