import { ContractTransaction, ContractTransactionResponse } from 'ethers';

export interface RewardPool {
  rewardEngagement(
    recipient: string,
    amount: bigint,
    commentId: string,
    overrides?: { gasLimit: number }
  ): Promise<ContractTransactionResponse>;
  
  commentRewarded(commentId: string): Promise<boolean>;
  
  userEngagementRewards(userAddress: string): Promise<bigint>;
  
  // Additional methods from the actual RewardPool contract
  fund(amount: bigint): Promise<ContractTransactionResponse>;
  
  credit(user: string, amount: bigint): Promise<void>;
  
  claim(): Promise<ContractTransactionResponse>;
  
  accounts(user: string): Promise<{
    earned: bigint;
    lastEpochCounted: bigint;
  }>;
}