export interface PollResult {
  id: string;
  postId: number;
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

export interface CreatePollInput {
  postId: number;
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
  tokenAmount?: number;
}

export interface PollApiResponse {
  success: boolean;
  poll?: PollResult;
  message?: string;
  error?: string;
}

export interface VotingHistoryItem {
  pollId: string;
  optionId: string;
  tokenAmount: number;
  votedAt: Date;
  question: string;
  postId: number;
  optionText: string;
}