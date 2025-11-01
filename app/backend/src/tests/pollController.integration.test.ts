import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { pollController } from '../controllers/pollController';
import { db } from '../db/index';
import { polls, pollOptions, pollVotes, posts, users } from '../db/schema';
import { authenticateToken } from '../middleware/auth';

// Mock authentication middleware
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id' };
    next();
  },
}));

describe('PollController Integration Tests', () => {
  let app: express.Application;
  let testUserId: string;
  let testPostId: number;

  beforeEach(async () => {
    // Set up Express app
    app = express();
    app.use(express.json());

    // Set up routes
    app.post('/polls/create', authenticateToken, pollController.createPoll.bind(pollController));
    app.get('/polls/poll/:pollId', pollController.getPoll.bind(pollController));
    app.get('/polls/post/:postId/poll', pollController.getPollByPost.bind(pollController));
    app.post('/polls/poll/:pollId/vote', authenticateToken, pollController.voteOnPoll.bind(pollController));
    app.get('/polls/user/voting-history', authenticateToken, pollController.getUserVotingHistory.bind(pollController));
    app.get('/polls/expiring-soon', pollController.getExpiringSoonPolls.bind(pollController));
    app.delete('/polls/poll/:pollId', authenticateToken, pollController.deletePoll.bind(pollController));
    app.patch('/polls/poll/:pollId/expiration', authenticateToken, pollController.updatePollExpiration.bind(pollController));

    // Clean up test data
    await db.delete(pollVotes);
    await db.delete(pollOptions);
    await db.delete(polls);
    await db.delete(posts);
    await db.delete(users);

    // Create test user
    const userResult = await db.insert(users).values({
      walletAddress: '0x1234567890123456789012345678901234567890',
      handle: 'testuser',
    }).returning();
    testUserId = userResult[0].id;

    // Create test post
    const postResult = await db.insert(posts).values({
      authorId: testUserId,
      contentCid: 'test-content-cid',
      title: 'Test Post',
    }).returning();
    testPostId = postResult[0].id;
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(pollVotes);
    await db.delete(pollOptions);
    await db.delete(polls);
    await db.delete(posts);
    await db.delete(users);
  });

  describe('POST /polls/create', () => {
    it('should create a basic poll successfully', async () => {
      const pollData = {
        postId: testPostId,
        question: 'What is your favorite color?',
        options: ['Red', 'Blue', 'Green'],
      };

      const response = await request(app)
        .post('/polls/create')
        .send(pollData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.pollId).toBeDefined();
      expect(response.body.message).toBe('Poll created successfully');
    });

    it('should create a token-weighted poll with expiration', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const pollData = {
        postId: testPostId,
        question: 'Should we implement feature X?',
        options: ['Yes', 'No'],
        allowMultiple: false,
        tokenWeighted: true,
        minTokens: 10,
        expiresAt,
      };

      const response = await request(app)
        .post('/polls/create')
        .send(pollData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.pollId).toBeDefined();
    });

    it('should validate required fields', async () => {
      const pollData = {
        postId: testPostId,
        // Missing question
        options: ['Yes', 'No'],
      };

      const response = await request(app)
        .post('/polls/create')
        .send(pollData)
        .expect(400);

      expect(response.body.error).toBe('Invalid input');
      expect(response.body.details).toBeDefined();
    });

    it('should require at least 2 options', async () => {
      const pollData = {
        postId: testPostId,
        question: 'Test question?',
        options: ['Only one option'],
      };

      const response = await request(app)
        .post('/polls/create')
        .send(pollData)
        .expect(400);

      expect(response.body.error).toBe('Invalid input');
    });

    it('should limit maximum options to 10', async () => {
      const pollData = {
        postId: testPostId,
        question: 'Test question?',
        options: Array.from({ length: 11 }, (_, i) => `Option ${i + 1}`),
      };

      const response = await request(app)
        .post('/polls/create')
        .send(pollData)
        .expect(400);

      expect(response.body.error).toBe('Invalid input');
    });

    it('should require authentication', async () => {
      // Override the mock to simulate no authentication
      const originalAuth = authenticateToken;
      (authenticateToken as jest.Mock).mockImplementationOnce((req: any, res: any, next: any) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      const pollData = {
        postId: testPostId,
        question: 'Test question?',
        options: ['Yes', 'No'],
      };

      await request(app)
        .post('/polls/create')
        .send(pollData)
        .expect(401);
    });
  });

  describe('GET /polls/poll/:pollId', () => {
    let pollId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/polls/create')
        .send({
          postId: testPostId,
          question: 'Test poll?',
          options: ['A', 'B', 'C'],
        });
      pollId = response.body.pollId;
    });

    it('should return poll data', async () => {
      const response = await request(app)
        .get(`/polls/poll/${pollId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.poll).toBeDefined();
      expect(response.body.poll.question).toBe('Test poll?');
      expect(response.body.poll.options).toHaveLength(3);
    });

    it('should return 404 for non-existent poll', async () => {
      const response = await request(app)
        .get('/polls/poll/non-existent-id')
        .expect(404);

      expect(response.body.error).toBe('Poll not found');
    });
  });

  describe('GET /polls/post/:postId/poll', () => {
    it('should return poll for given post', async () => {
      // Create poll
      await request(app)
        .post('/polls/create')
        .send({
          postId: testPostId,
          question: 'Post poll?',
          options: ['Yes', 'No'],
        });

      const response = await request(app)
        .get(`/polls/post/${testPostId}/poll`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.poll.postId).toBe(testPostId);
    });

    it('should return 404 for post without poll', async () => {
      const response = await request(app)
        .get('/polls/post/999/poll')
        .expect(404);

      expect(response.body.error).toBe('Poll not found for this post');
    });
  });

  describe('POST /polls/poll/:pollId/vote', () => {
    let pollId: string;
    let optionIds: string[];

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/polls/create')
        .send({
          postId: testPostId,
          question: 'Vote test?',
          options: ['Option A', 'Option B'],
        });
      pollId = createResponse.body.pollId;

      // Get option IDs
      const pollResponse = await request(app).get(`/polls/poll/${pollId}`);
      optionIds = pollResponse.body.poll.options.map((opt: any) => opt.id);
    });

    it('should record a vote successfully', async () => {
      const response = await request(app)
        .post(`/polls/poll/${pollId}/vote`)
        .send({
          optionIds: [optionIds[0]],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Vote recorded successfully');
      expect(response.body.poll.userVote).toBeDefined();
      expect(response.body.poll.totalVotes).toBe(1);
    });

    it('should prevent duplicate votes', async () => {
      // First vote
      await request(app)
        .post(`/polls/poll/${pollId}/vote`)
        .send({
          optionIds: [optionIds[0]],
        })
        .expect(200);

      // Second vote should fail
      const response = await request(app)
        .post(`/polls/poll/${pollId}/vote`)
        .send({
          optionIds: [optionIds[1]],
        })
        .expect(409);

      expect(response.body.error).toContain('already voted');
    });

    it('should validate option IDs', async () => {
      const response = await request(app)
        .post(`/polls/poll/${pollId}/vote`)
        .send({
          optionIds: ['invalid-option-id'],
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid');
    });

    it('should require authentication', async () => {
      // Override the mock to simulate no authentication
      (authenticateToken as jest.Mock).mockImplementationOnce((req: any, res: any, next: any) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      await request(app)
        .post(`/polls/poll/${pollId}/vote`)
        .send({
          optionIds: [optionIds[0]],
        })
        .expect(401);
    });
  });

  describe('GET /polls/user/voting-history', () => {
    it('should return user voting history', async () => {
      // Create and vote on a poll
      const createResponse = await request(app)
        .post('/polls/create')
        .send({
          postId: testPostId,
          question: 'History test?',
          options: ['Yes', 'No'],
        });

      const pollResponse = await request(app).get(`/polls/poll/${createResponse.body.pollId}`);
      const optionId = pollResponse.body.poll.options[0].id;

      await request(app)
        .post(`/polls/poll/${createResponse.body.pollId}/vote`)
        .send({
          optionIds: [optionId],
        });

      const response = await request(app)
        .get('/polls/user/voting-history')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.history).toHaveLength(1);
      expect(response.body.history[0].question).toBe('History test?');
    });

    it('should require authentication', async () => {
      (authenticateToken as jest.Mock).mockImplementationOnce((req: any, res: any, next: any) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      await request(app)
        .get('/polls/user/voting-history')
        .expect(401);
    });
  });

  describe('GET /polls/expiring-soon', () => {
    it('should return polls expiring within specified hours', async () => {
      const soonExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours

      await request(app)
        .post('/polls/create')
        .send({
          postId: testPostId,
          question: 'Expiring soon?',
          options: ['Yes', 'No'],
          expiresAt: soonExpiry,
        });

      const response = await request(app)
        .get('/polls/expiring-soon?hours=24')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.polls).toHaveLength(1);
      expect(response.body.polls[0].question).toBe('Expiring soon?');
    });
  });

  describe('DELETE /polls/poll/:pollId', () => {
    let pollId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/polls/create')
        .send({
          postId: testPostId,
          question: 'To be deleted?',
          options: ['Yes', 'No'],
        });
      pollId = response.body.pollId;
    });

    it('should delete poll successfully', async () => {
      const response = await request(app)
        .delete(`/polls/poll/${pollId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Poll deleted successfully');

      // Verify poll is deleted
      await request(app)
        .get(`/polls/poll/${pollId}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      (authenticateToken as jest.Mock).mockImplementationOnce((req: any, res: any, next: any) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      await request(app)
        .delete(`/polls/poll/${pollId}`)
        .expect(401);
    });
  });

  describe('PATCH /polls/poll/:pollId/expiration', () => {
    let pollId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/polls/create')
        .send({
          postId: testPostId,
          question: 'Update expiry?',
          options: ['Yes', 'No'],
        });
      pollId = response.body.pollId;
    });

    it('should update poll expiration', async () => {
      const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const response = await request(app)
        .patch(`/polls/poll/${pollId}/expiration`)
        .send({ expiresAt: newExpiry })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Poll expiration updated successfully');

      // Verify expiration was updated
      const pollResponse = await request(app).get(`/polls/poll/${pollId}`);
      expect(new Date(pollResponse.body.poll.expiresAt)).toEqual(new Date(newExpiry));
    });

    it('should clear expiration when set to null', async () => {
      const response = await request(app)
        .patch(`/polls/poll/${pollId}/expiration`)
        .send({ expiresAt: null })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify expiration was cleared
      const pollResponse = await request(app).get(`/polls/poll/${pollId}`);
      expect(pollResponse.body.poll.expiresAt).toBeNull();
    });
  });
});
