import { BigNumber } from 'ethers';
import { MarketplaceRewardService, MarketplaceTransaction } from '../services/marketplaceRewardService';

describe('MarketplaceRewardService', () => {
  let marketplaceService: MarketplaceRewardService;

  beforeEach(() => {
    marketplaceService = MarketplaceRewardService.getInstance();
  });

  describe('Marketplace Reward Operations', () => {
    const seller = '0x123...';
    const buyer = '0x456...';
    const validTransaction: MarketplaceTransaction = {
      transactionId: '1',
      seller,
      buyer,
      transactionValue: BigNumber.from('1000000000000000000000'), // 1000 LDAO
      tokenAddress: '0x789...', // LDAO token address
      timestamp: Math.floor(Date.now() / 1000)
    };

    it('should process transaction rewards correctly', async () => {
      const result = await marketplaceService.processTransactionReward(validTransaction);

      expect(result.success).toBe(true);
      expect(result.rewardAmount).toBeDefined();
      expect(BigNumber.from(result.rewardAmount!).eq(
        BigNumber.from('1000000000000000000') // 1 LDAO (0.1% of 1000)
      )).toBe(true);
    });

    it('should prevent duplicate reward processing', async () => {
      // First reward processing
      await marketplaceService.processTransactionReward(validTransaction);

      // Attempt duplicate processing
      const result = await marketplaceService.processTransactionReward(validTransaction);
      expect(result.success).toBe(false);
      expect(result.error).toContain('already processed');
    });

    it('should reject invalid transactions', async () => {
      const invalidTransaction: MarketplaceTransaction = {
        ...validTransaction,
        transactionValue: BigNumber.from(0)
      };

      const result = await marketplaceService.processTransactionReward(invalidTransaction);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transaction');
    });

    it('should reject self-dealing transactions', async () => {
      const selfDealingTransaction: MarketplaceTransaction = {
        ...validTransaction,
        buyer: seller
      };

      const result = await marketplaceService.processTransactionReward(selfDealingTransaction);
      expect(result.success).toBe(false);
    });

    it('should track total rewards correctly', async () => {
      const transaction2: MarketplaceTransaction = {
        ...validTransaction,
        transactionId: '2'
      };

      // Process multiple transactions
      await marketplaceService.processTransactionReward(validTransaction);
      await marketplaceService.processTransactionReward(transaction2);

      const totalRewards = await marketplaceService.getTotalMarketplaceRewards(seller);
      expect(BigNumber.from(totalRewards).eq(
        BigNumber.from('2000000000000000000') // 2 LDAO (0.1% of 2000)
      )).toBe(true);
    });

    it('should retrieve user transactions correctly', async () => {
      await marketplaceService.processTransactionReward(validTransaction);

      const transactions = await marketplaceService.getUserTransactions(seller, 'seller');
      expect(transactions).toContain(validTransaction.transactionId);
    });

    it('should calculate rewards statistics correctly', async () => {
      // Process a transaction
      await marketplaceService.processTransactionReward(validTransaction);

      const stats = await marketplaceService.getRewardsStatistics(seller);
      
      expect(stats.transactionCount).toBe(1);
      expect(BigNumber.from(stats.totalRewards).gt(0)).toBe(true);
      expect(BigNumber.from(stats.averageReward).gt(0)).toBe(true);
    });

    it('should handle pagination in transaction history', async () => {
      // Process multiple transactions
      const transactions = Array.from({ length: 15 }, (_, i) => ({
        ...validTransaction,
        transactionId: (i + 1).toString()
      }));

      for (const tx of transactions) {
        await marketplaceService.processTransactionReward(tx);
      }

      // Get first page
      const firstPage = await marketplaceService.getUserTransactions(seller, 'seller', 10, 0);
      expect(firstPage.length).toBe(10);

      // Get second page
      const secondPage = await marketplaceService.getUserTransactions(seller, 'seller', 10, 10);
      expect(secondPage.length).toBe(5);
    });
  });
});