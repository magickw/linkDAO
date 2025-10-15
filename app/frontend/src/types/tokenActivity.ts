/**
 * Token activity tracking models for tips, stakes, and rewards
 */

import { TokenInfo } from './web3Community';

export type TokenActivityType = 'tip' | 'stake' | 'reward' | 'governance' | 'unstake' | 'claim';

export interface TokenActivity {
  id: string;
  type: TokenActivityType;
  amount: number;
  token: TokenInfo;
  fromAddress: string;
  toAddress: string;
  timestamp: Date;
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: number;
  gasFee?: number;
  
  // Related content
  relatedPostId?: string;
  relatedCommentId?: string;
  relatedProposalId?: string;
  relatedCommunityId?: string;
  
  // Status and metadata
  status: 'pending' | 'confirmed' | 'failed';
  confirmations?: number;
  metadata?: TokenActivityMetadata;
}

export interface TokenActivityMetadata {
  description?: string;
  tags?: string[];
  userNote?: string;
  automaticAction?: boolean;
  batchId?: string;
}

export interface StakingInfo {
  totalStaked: number;
  stakerCount: number;
  userStake?: number;
  stakingTier: 'gold' | 'silver' | 'bronze' | 'none';
  stakingHistory?: StakingEvent[];
  potentialRewards?: number;
  nextRewardDate?: Date;
}

export interface StakingEvent {
  id: string;
  type: 'stake' | 'unstake' | 'reward' | 'slash';
  amount: number;
  timestamp: Date;
  transactionHash?: string;
  relatedPostId?: string;
  userAddress: string;
}

export interface TipActivity {
  id: string;
  amount: number;
  token: TokenInfo;
  fromUser: string;
  toUser: string;
  postId?: string;
  commentId?: string;
  message?: string;
  timestamp: Date;
  transactionHash?: string;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface RewardActivity {
  id: string;
  type: 'staking' | 'governance' | 'content' | 'referral';
  amount: number;
  token: TokenInfo;
  recipientAddress: string;
  sourceActivity?: string;
  timestamp: Date;
  transactionHash?: string;
  claimed: boolean;
  claimDeadline?: Date;
}

export interface TokenActivitySummary {
  totalTipped: number;
  totalStaked: number;
  totalRewards: number;
  totalGovernanceActivity: number;
  last24hActivity: TokenActivity[];
  topTokens: TokenInfo[];
  activityTrends: ActivityTrend[];
}

export interface ActivityTrend {
  period: '1h' | '24h' | '7d' | '30d';
  totalVolume: number;
  transactionCount: number;
  uniqueUsers: number;
  averageAmount: number;
}

export interface TokenTransactionRequest {
  type: TokenActivityType;
  amount: number;
  tokenAddress: string;
  recipientAddress?: string;
  relatedContentId?: string;
  message?: string;
  gasLimit?: number;
  gasPrice?: number;
}

export interface TokenTransactionResponse {
  transactionHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  gasUsed?: number;
  gasFee?: number;
  blockNumber?: number;
  confirmations?: number;
  error?: string;
}