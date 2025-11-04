import { useEffect } from 'react';
import { useWalletClient } from 'wagmi';
import { CommunityEngagementService } from '@/services/communityEngagementService';
import { getSigner } from '@/utils/web3';

export function RewardPoolExample() {
  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    if (walletClient) {
      initializeRewardPool();
    }
  }, [walletClient]);

  const initializeRewardPool = async () => {
    const service = CommunityEngagementService.getInstance();
    const REWARD_POOL_ADDRESS = process.env.NEXT_PUBLIC_REWARD_POOL_ADDRESS!;
    
    // Get signer from our utility function
    const signer = await getSigner();
    if (!signer) {
      console.error('Failed to get signer');
      return;
    }
    
    await service.initializeRewardPool(REWARD_POOL_ADDRESS, signer);
    console.log('RewardPool initialized at:', REWARD_POOL_ADDRESS);
  };

  const awardReward = async (commentId: string, userAddress: string) => {
    const service = CommunityEngagementService.getInstance();
    
    const result = await service.awardEngagementReward(
      commentId,
      userAddress,
      {
        likes: 10,
        replies: 5,
        helpfulnessScore: 85,
        reportCount: 0,
        markedAsAnswer: true
      }
    );

    if (result.success) {
      console.log('Reward awarded!', {
        tx: result.transactionHash,
        amount: result.rewardAmount,
        explorer: `https://sepolia.etherscan.io/tx/${result.transactionHash}`
      });
    } else {
      console.error('Reward failed:', result.error);
    }
  };

  const checkRewards = async (userAddress: string) => {
    const service = CommunityEngagementService.getInstance();
    const total = await service.getTotalEngagementRewards(userAddress);
    console.log('Total rewards:', total);
  };

  return null;
}