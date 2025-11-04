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
}
