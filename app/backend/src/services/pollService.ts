import { db } from '../db/index';
import { polls, pollOptions, pollVotes, posts, users } from '../db/schema';
import { eq, and, desc, sql, count, sum } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface CreatePollInput {
  postId: string;
  question: string;
  options: string[];
  allowMultiple?: boolean;
  tokenWeighted?: boolean;
  minTokens?: number;
  expiresAt?: Date;
}

export interface PollVoteInput {
  pollId: string;
  optionIds: string[];
  userId: string;
  tokenAmount?: number;
}

export interface PollResult {
  id: string;
  postId: string;
  question: string;
  allowMultiple: boolean;
  tokenWeighted: boolean;
  minTokens: number;
  expiresAt: Date | null;
  isExpired: boolean;
  createdAt: Date;
  options: PollOptionResult[];
  totalVotes: number;
  totalTokenVotes: number;
  userVote?: UserVoteResult;
}

export interface PollOptionResult {
  id: string;
  text: string;
  orderIndex: number;
  votes: number;
  tokenVotes: number;
  percentage: number;
  tokenPercentage: number;
}

export interface UserVoteResult {
  optionIds: string[];
  tokenAmount: number;
  votedAt: Date;
}

export class PollService {
  /**
   * Create a new poll
   */
  async createPoll(input: CreatePollInput): Promise<string> {
    const pollId = uuidv4();
    
    // Create the poll
    await db.insert(polls).values({
      id: pollId,
      postId: input.postId,
      question: input.question,
      allowMultiple: input.allowMultiple || false,
      tokenWeighted: input.tokenWeighted || false,
      minTokens: input.minTokens?.toString() || '0',
      expiresAt: input.expiresAt,
    });

    // Create poll options
    const optionValues = input.options.map((text, index) => ({
      id: uuidv4(),
      pollId,
      text,
      orderIndex: index,
    }));

    await db.insert(pollOptions).values(optionValues);

    // Update the post to reference this poll
    await db.update(posts)
      .set({ pollId })
      .where(eq(posts.id, input.postId));

    return pollId;
  }

  /**
   * Get poll by ID with results
   */
  async getPollById(pollId: string, userId?: string): Promise<PollResult | null> {
    // Get poll data
    const pollData = await db
      .select()
      .from(polls)
      .where(eq(polls.id, pollId))
      .limit(1);

    if (pollData.length === 0) {
      return null;
    }

    const poll = pollData[0];

    // Get poll options with vote counts
    const optionsData = await db
      .select({
        id: pollOptions.id,
        text: pollOptions.text,
        orderIndex: pollOptions.orderIndex,
        votes: sql<number>`COALESCE(COUNT(${pollVotes.id}), 0)`,
        tokenVotes: sql<number>`COALESCE(SUM(${pollVotes.tokenAmount}), 0)`,
      })
      .from(pollOptions)
      .leftJoin(pollVotes, eq(pollOptions.id, pollVotes.optionId))
      .where(eq(pollOptions.pollId, pollId))
      .groupBy(pollOptions.id, pollOptions.text, pollOptions.orderIndex)
      .orderBy(pollOptions.orderIndex);

    // Calculate totals
    const totalVotes = optionsData.reduce((sum, option) => sum + option.votes, 0);
    const totalTokenVotes = optionsData.reduce((sum, option) => sum + option.tokenVotes, 0);

    // Calculate percentages
    const options: PollOptionResult[] = optionsData.map(option => ({
      id: option.id,
      text: option.text,
      orderIndex: option.orderIndex,
      votes: option.votes,
      tokenVotes: option.tokenVotes,
      percentage: totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0,
      tokenPercentage: totalTokenVotes > 0 ? (option.tokenVotes / totalTokenVotes) * 100 : 0,
    }));

    // Get user's vote if userId provided
    let userVote: UserVoteResult | undefined;
    if (userId) {
      const userVoteData = await db
        .select({
          optionId: pollVotes.optionId,
          tokenAmount: pollVotes.tokenAmount,
          createdAt: pollVotes.createdAt,
        })
        .from(pollVotes)
        .where(and(
          eq(pollVotes.pollId, pollId),
          eq(pollVotes.userId, userId)
        ));

      if (userVoteData.length > 0) {
        userVote = {
          optionIds: userVoteData.map(v => v.optionId),
          tokenAmount: userVoteData.reduce((sum, v) => sum + parseFloat(v.tokenAmount), 0),
          votedAt: userVoteData[0].createdAt,
        };
      }
    }

    const isExpired = poll.expiresAt ? new Date() > poll.expiresAt : false;

    return {
      id: poll.id,
      postId: String(poll.postId),
      question: poll.question,
      allowMultiple: poll.allowMultiple,
      tokenWeighted: poll.tokenWeighted,
      minTokens: parseFloat(poll.minTokens),
      expiresAt: poll.expiresAt,
      isExpired,
      createdAt: poll.createdAt,
      options,
      totalVotes,
      totalTokenVotes,
      userVote,
    };
  }

  /**
   * Get poll by post ID
   */
  async getPollByPostId(postId: string, userId?: string): Promise<PollResult | null> {
    const pollData = await db
      .select()
      .from(polls)
      .where(eq(polls.postId, postId))
      .limit(1);

    if (pollData.length === 0) {
      return null;
    }

    return this.getPollById(pollData[0].id, userId);
  }

  /**
   * Vote on a poll
   */
  async voteOnPoll(input: PollVoteInput): Promise<void> {
    const poll = await this.getPollById(input.pollId, input.userId);
    
    if (!poll) {
      throw new Error('Poll not found');
    }

    if (poll.isExpired) {
      throw new Error('Poll has expired');
    }

    // Check if user already voted
    if (poll.userVote && !poll.allowMultiple) {
      throw new Error('User has already voted on this poll');
    }

    // Validate option IDs
    const validOptionIds = poll.options.map(o => o.id);
    const invalidOptions = input.optionIds.filter(id => !validOptionIds.includes(id));
    if (invalidOptions.length > 0) {
      throw new Error('Invalid poll option IDs');
    }

    // Check multiple selection rules
    if (!poll.allowMultiple && input.optionIds.length > 1) {
      throw new Error('Multiple selections not allowed for this poll');
    }

    // Check token requirements
    const tokenAmount = input.tokenAmount || 1;
    if (poll.tokenWeighted && tokenAmount < poll.minTokens) {
      throw new Error(`Minimum ${poll.minTokens} tokens required to vote`);
    }

    // Remove existing votes if this is a re-vote on a multiple choice poll
    if (poll.userVote && poll.allowMultiple) {
      await db.delete(pollVotes)
        .where(and(
          eq(pollVotes.pollId, input.pollId),
          eq(pollVotes.userId, input.userId)
        ));
    }

    // Insert new votes
    const voteValues = input.optionIds.map(optionId => ({
      id: uuidv4(),
      pollId: input.pollId,
      optionId,
      userId: input.userId,
      tokenAmount: tokenAmount.toString(),
    }));

    await db.insert(pollVotes).values(voteValues);
  }

  /**
   * Get polls that are expiring soon (for cleanup/notification)
   */
  async getExpiringSoonPolls(hoursFromNow: number = 24): Promise<PollResult[]> {
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + hoursFromNow);

    const expiringSoonPolls = await db
      .select()
      .from(polls)
      .where(and(
        sql`${polls.expiresAt} IS NOT NULL`,
        sql`${polls.expiresAt} <= ${expirationTime}`,
        sql`${polls.expiresAt} > NOW()`
      ))
      .orderBy(polls.expiresAt);

    const results: PollResult[] = [];
    for (const poll of expiringSoonPolls) {
      const pollResult = await this.getPollById(poll.id);
      if (pollResult) {
        results.push(pollResult);
      }
    }

    return results;
  }

  /**
   * Get user's voting history
   */
  async getUserVotingHistory(userId: string, limit: number = 50): Promise<any[]> {
    const votingHistory = await db
      .select({
        pollId: pollVotes.pollId,
        optionId: pollVotes.optionId,
        tokenAmount: pollVotes.tokenAmount,
        votedAt: pollVotes.createdAt,
        question: polls.question,
        postId: polls.postId,
        optionText: pollOptions.text,
      })
      .from(pollVotes)
      .innerJoin(polls, eq(pollVotes.pollId, polls.id))
      .innerJoin(pollOptions, eq(pollVotes.optionId, pollOptions.id))
      .where(eq(pollVotes.userId, userId))
      .orderBy(desc(pollVotes.createdAt))
      .limit(limit);

    return votingHistory;
  }

  /**
   * Delete a poll (admin/moderator function)
   */
  async deletePoll(pollId: string): Promise<void> {
    // Delete votes first (cascade should handle this, but being explicit)
    await db.delete(pollVotes).where(eq(pollVotes.pollId, pollId));
    
    // Delete options
    await db.delete(pollOptions).where(eq(pollOptions.pollId, pollId));
    
    // Update post to remove poll reference
    await db.update(posts)
      .set({ pollId: null })
      .where(eq(posts.pollId, pollId));
    
    // Delete poll
    await db.delete(polls).where(eq(polls.id, pollId));
  }

  /**
   * Update poll expiration (admin/moderator function)
   */
  async updatePollExpiration(pollId: string, expiresAt: Date | null): Promise<void> {
    await db.update(polls)
      .set({ 
        expiresAt,
        updatedAt: new Date()
      })
      .where(eq(polls.id, pollId));
  }
}

export const pollService = new PollService();
