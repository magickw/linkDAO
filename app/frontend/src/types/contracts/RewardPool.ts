import { BigNumber, ContractTransaction } from 'ethers';

export interface RewardPool {
  rewardEngagement(
    recipient: string,
    amount: BigNumber,
    commentId: string,
    overrides?: { gasLimit: number }
  ): Promise<ContractTransaction>;
  
  commentRewarded(commentId: string): Promise<boolean>;
  
  userEngagementRewards(userAddress: string): Promise<BigNumber>;
  
  // Additional methods from the actual RewardPool contract
  fund(amount: BigNumber): Promise<ContractTransaction>;
  
  credit(user: string, amount: BigNumber): Promise<void>;
  
  claim(): Promise<ContractTransaction>;
  
  accounts(user: string): Promise<{
    earned: BigNumber;
    lastEpochCounted: BigNumber;
  }>;
}