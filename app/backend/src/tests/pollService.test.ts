import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { pollService, CreatePollInput, PollVoteInput } from '../services/pollService';
import { db } from '../db/index';
import { polls, pollOptions, pollVotes, posts, users } from '../db/schema';
import { eq } from 'drizzle-orm';

describe('PollService', () => {
  let testUserId: string;
  let testPostId: number;
  let testPollId: string;

  beforeEach(async () => {
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

  describe('createPoll', () => {
    it('should create a basic poll successfully', async () => {
      const input: CreatePollInput = {
        postId: testPostId,
        question: 'What is your favorite color?',
        options: ['Red', 'Blue', 'Green'],
      };

      const pollId = await pollService.createPoll(input);
      expect(pollId).toBeDefined();
      expect(typeof pollId).toBe('string');

      // Verify poll was created
      const poll = await pollService.getPollById(pollId);
      expect(poll).toBeDefined();
      expect(poll!.question).toBe(input.question);
      expect(poll!.options).toHaveLength(3);
      expect(poll!.options[0].text).toBe('Red');
      expect(poll!.allowMultiple).toBe(false);
      expect(poll!.tokenWeighted).toBe(false);
    });

    it('should create a token-weighted poll with expiration', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      const input: CreatePollInput = {
        postId: testPostId,
        question: 'Should we implement feature X?',
        options: ['Yes', 'No', 'Maybe'],
        allowMultiple: false,
        tokenWeighted: true,
        minTokens: 10,
        expiresAt,
      };

      const pollId = await pollService.createPoll(input);
      const poll = await pollService.getPollById(pollId);

      expect(poll).toBeDefined();
      expect(poll!.tokenWeighted).toBe(true);
      expect(poll!.minTokens).toBe(10);
      expect(poll!.expiresAt).toEqual(expiresAt);
      expect(poll!.isExpired).toBe(false);
    });

    it('should update post with poll reference', async () => {
      const input: CreatePollInput = {
        postId: testPostId,
        question: 'Test question?',
        options: ['Option 1', 'Option 2'],
      };

      const pollId = await pollService.createPoll(input);

      // Check that post was updated
      const postData = await db.select().from(posts).where(eq(posts.id, testPostId));
      expect(postData[0].pollId).toBe(pollId);
    });
  });

  describe('getPollById', () => {
    beforeEach(async () => {
      const input: CreatePollInput = {
        postId: testPostId,
        question: 'Test poll?',
        options: ['A', 'B', 'C'],
        allowMultiple: true,
      };
      testPollId = await pollService.createPoll(input);
    });

    it('should return poll with correct data', async () => {
      const poll = await pollService.getPollById(testPollId);

      expect(poll).toBeDefined();
      expect(poll!.id).toBe(testPollId);
      expect(poll!.question).toBe('Test poll?');
      expect(poll!.options).toHaveLength(3);
      expect(poll!.allowMultiple).toBe(true);
      expect(poll!.totalVotes).toBe(0);
      expect(poll!.totalTokenVotes).toBe(0);
    });

    it('should return null for non-existent poll', async () => {
      const poll = await pollService.getPollById('non-existent-id');
      expect(poll).toBeNull();
    });

    it('should include user vote when userId provided', async () => {
      // First vote on the poll
      await pollService.voteOnPoll({
        pollId: testPollId,
        optionIds: [testPollId], // This will be replaced with actual option ID
        userId: testUserId,
      });

      // Get poll with user context
      const poll = await pollService.getPollById(testPollId, testUserId);
      expect(poll!.userVote).toBeDefined();
    });
  });

  describe('voteOnPoll', () => {
    let optionIds: string[];

    beforeEach(async () => {
      const input: CreatePollInput = {
        postId: testPostId,
        question: 'Test poll?',
        options: ['A', 'B', 'C'],
      };
      testPollId = await pollService.createPoll(input);

      // Get option IDs
      const poll = await pollService.getPollById(testPollId);
      optionIds = poll!.options.map(o => o.id);
    });

    it('should record a vote successfully', async () => {
      const voteInput: PollVoteInput = {
        pollId: testPollId,
        optionIds: [optionIds[0]],
        userId: testUserId,
      };

      await pollService.voteOnPoll(voteInput);

      // Verify vote was recorded
      const poll = await pollService.getPollById(testPollId, testUserId);
      expect(poll!.userVote).toBeDefined();
      expect(poll!.userVote!.optionIds).toContain(optionIds[0]);
      expect(poll!.totalVotes).toBe(1);
      expect(poll!.options[0].votes).toBe(1);
    });

    it('should prevent duplicate votes on single-choice polls', async () => {
      const voteInput: PollVoteInput = {
        pollId: testPollId,
        optionIds: [optionIds[0]],
        userId: testUserId,
      };

      // First vote
      await pollService.voteOnPoll(voteInput);

      // Second vote should fail
      await expect(pollService.voteOnPoll({
        ...voteInput,
        optionIds: [optionIds[1]],
      })).rejects.toThrow('already voted');
    });

    it('should handle token-weighted voting', async () => {
      // Create token-weighted poll
      const input: CreatePollInput = {
        postId: testPostId + 1,
        question: 'Token poll?',
        options: ['Yes', 'No'],
        tokenWeighted: true,
        minTokens: 5,
      };

      const tokenPollId = await pollService.createPoll(input);
      const tokenPoll = await pollService.getPollById(tokenPollId);
      const tokenOptionIds = tokenPoll!.options.map(o => o.id);

      const voteInput: PollVoteInput = {
        pollId: tokenPollId,
        optionIds: [tokenOptionIds[0]],
        userId: testUserId,
        tokenAmount: 10,
      };

      await pollService.voteOnPoll(voteInput);

      const updatedPoll = await pollService.getPollById(tokenPollId, testUserId);
      expect(updatedPoll!.userVote!.tokenAmount).toBe(10);
      expect(updatedPoll!.totalTokenVotes).toBe(10);
    });

    it('should reject votes with insufficient tokens', async () => {
      // Create token-weighted poll with minimum
      const input: CreatePollInput = {
        postId: testPostId + 1,
        question: 'Token poll?',
        options: ['Yes', 'No'],
        tokenWeighted: true,
        minTokens: 10,
      };

      const tokenPollId = await pollService.createPoll(input);
      const tokenPoll = await pollService.getPollById(tokenPollId);
      const tokenOptionIds = tokenPoll!.options.map(o => o.id);

      const voteInput: PollVoteInput = {
        pollId: tokenPollId,
        optionIds: [tokenOptionIds[0]],
        userId: testUserId,
        tokenAmount: 5, // Less than minimum
      };

      await expect(pollService.voteOnPoll(voteInput)).rejects.toThrow('Minimum 10 tokens required');
    });

    it('should reject votes on expired polls', async () => {
      // Create expired poll
      const expiredDate = new Date(Date.now() - 1000); // 1 second ago
      const input: CreatePollInput = {
        postId: testPostId + 1,
        question: 'Expired poll?',
        options: ['Yes', 'No'],
        expiresAt: expiredDate,
      };

      const expiredPollId = await pollService.createPoll(input);
      const expiredPoll = await pollService.getPollById(expiredPollId);
      const expiredOptionIds = expiredPoll!.options.map(o => o.id);

      const voteInput: PollVoteInput = {
        pollId: expiredPollId,
        optionIds: [expiredOptionIds[0]],
        userId: testUserId,
      };

      await expect(pollService.voteOnPoll(voteInput)).rejects.toThrow('expired');
    });
  });

  describe('getPollByPostId', () => {
    it('should return poll for given post ID', async () => {
      const input: CreatePollInput = {
        postId: testPostId,
        question: 'Post poll?',
        options: ['A', 'B'],
      };

      await pollService.createPoll(input);
      const poll = await pollService.getPollByPostId(testPostId);

      expect(poll).toBeDefined();
      expect(poll!.postId).toBe(testPostId);
      expect(poll!.question).toBe('Post poll?');
    });

    it('should return null for post without poll', async () => {
      const poll = await pollService.getPollByPostId(999);
      expect(poll).toBeNull();
    });
  });

  describe('getExpiringSoonPolls', () => {
    it('should return polls expiring within specified hours', async () => {
      const soonExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
      const laterExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

      // Create poll expiring soon
      await pollService.createPoll({
        postId: testPostId,
        question: 'Expiring soon?',
        options: ['Yes', 'No'],
        expiresAt: soonExpiry,
      });

      // Create poll expiring later
      await pollService.createPoll({
        postId: testPostId + 1,
        question: 'Expiring later?',
        options: ['Yes', 'No'],
        expiresAt: laterExpiry,
      });

      const expiringSoon = await pollService.getExpiringSoonPolls(24);
      expect(expiringSoon).toHaveLength(1);
      expect(expiringSoon[0].question).toBe('Expiring soon?');
    });
  });

  describe('getUserVotingHistory', () => {
    it('should return user voting history', async () => {
      // Create and vote on multiple polls
      const poll1Id = await pollService.createPoll({
        postId: testPostId,
        question: 'Poll 1?',
        options: ['A', 'B'],
      });

      const poll2Id = await pollService.createPoll({
        postId: testPostId + 1,
        question: 'Poll 2?',
        options: ['X', 'Y'],
      });

      const poll1 = await pollService.getPollById(poll1Id);
      const poll2 = await pollService.getPollById(poll2Id);

      await pollService.voteOnPoll({
        pollId: poll1Id,
        optionIds: [poll1!.options[0].id],
        userId: testUserId,
      });

      await pollService.voteOnPoll({
        pollId: poll2Id,
        optionIds: [poll2!.options[1].id],
        userId: testUserId,
      });

      const history = await pollService.getUserVotingHistory(testUserId);
      expect(history).toHaveLength(2);
      expect(history[0].question).toBe('Poll 2?'); // Most recent first
      expect(history[1].question).toBe('Poll 1?');
    });
  });

  describe('deletePoll', () => {
    it('should delete poll and all related data', async () => {
      const pollId = await pollService.createPoll({
        postId: testPostId,
        question: 'To be deleted?',
        options: ['Yes', 'No'],
      });

      // Vote on the poll
      const poll = await pollService.getPollById(pollId);
      await pollService.voteOnPoll({
        pollId,
        optionIds: [poll!.options[0].id],
        userId: testUserId,
      });

      // Delete the poll
      await pollService.deletePoll(pollId);

      // Verify poll is deleted
      const deletedPoll = await pollService.getPollById(pollId);
      expect(deletedPoll).toBeNull();

      // Verify post poll reference is cleared
      const postData = await db.select().from(posts).where(eq(posts.id, testPostId));
      expect(postData[0].pollId).toBeNull();
    });
  });

  describe('updatePollExpiration', () => {
    it('should update poll expiration date', async () => {
      const pollId = await pollService.createPoll({
        postId: testPostId,
        question: 'Update expiry?',
        options: ['Yes', 'No'],
      });

      const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week
      await pollService.updatePollExpiration(pollId, newExpiry);

      const updatedPoll = await pollService.getPollById(pollId);
      expect(updatedPoll!.expiresAt).toEqual(newExpiry);
    });

    it('should clear expiration when set to null', async () => {
      const pollId = await pollService.createPoll({
        postId: testPostId,
        question: 'Clear expiry?',
        options: ['Yes', 'No'],
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      await pollService.updatePollExpiration(pollId, null);

      const updatedPoll = await pollService.getPollById(pollId);
      expect(updatedPoll!.expiresAt).toBeNull();
    });
  });
});
