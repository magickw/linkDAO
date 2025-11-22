import { ethers } from 'ethers';
import { ReferralProgramService, ReferralInfo } from '../services/referralProgramService';

describe('ReferralProgramService', () => {
  let referralService: ReferralProgramService;

  beforeEach(() => {
    referralService = ReferralProgramService.getInstance();
  });

  describe('Referral Program Operations', () => {
    const referrer = '0x123...';
    const referee = '0x456...';
    const purchaseAmount = ethers.parseEther('1000'); // 1000 LDAO

    it('should successfully record a new referral', async () => {
      const result = await referralService.recordReferral(referrer, referee);
      expect(result).toBe(true);
    });

    it('should prevent self-referrals', async () => {
      const result = await referralService.recordReferral(referrer, referrer);
      expect(result).toBe(false);
    });

    it('should prevent duplicate referrals', async () => {
      // First referral
      await referralService.recordReferral(referrer, referee);
      
      // Attempt duplicate referral
      const result = await referralService.recordReferral(referrer, referee);
      expect(result).toBe(false);
    });

    it('should process referral rewards correctly', async () => {
      const referralInfo: ReferralInfo = {
        referrer,
        referee,
        purchaseAmount,
        timestamp: Math.floor(Date.now() / 1000)
      };

      // Record referral first
      await referralService.recordReferral(referrer, referee);

      // Process reward
      const result = await referralService.processReferralReward(referralInfo);

      expect(result.success).toBe(true);
      expect(result.rewardAmount).toBeDefined();
      expect(BigNumber(result.rewardAmount!) ===
        (purchaseAmount * 10n) / 100n
      ).toBe(true);
    });

    it('should prevent duplicate reward claims', async () => {
      const referralInfo: ReferralInfo = {
        referrer,
        referee,
        purchaseAmount,
        timestamp: Math.floor(Date.now() / 1000)
      };

      // Record referral
      await referralService.recordReferral(referrer, referee);

      // First reward claim
      await referralService.processReferralReward(referralInfo);

      // Attempt duplicate claim
      const result = await referralService.processReferralReward(referralInfo);
      expect(result.success).toBe(false);
      expect(result.error).toContain('already claimed');
    });

    it('should track total referral rewards correctly', async () => {
      const referee2 = '0x789...';
      const referralInfo1: ReferralInfo = {
        referrer,
        referee,
        purchaseAmount,
        timestamp: Math.floor(Date.now() / 1000)
      };

      const referralInfo2: ReferralInfo = {
        referrer,
        referee: referee2,
        purchaseAmount,
        timestamp: Math.floor(Date.now() / 1000)
      };

      // Process multiple referrals
      await referralService.recordReferral(referrer, referee);
      await referralService.processReferralReward(referralInfo1);

      await referralService.recordReferral(referrer, referee2);
      await referralService.processReferralReward(referralInfo2);

      const totalRewards = await referralService.getTotalReferralRewards(referrer);
      expect(BigNumber(totalRewards) ===
        (purchaseAmount * 20n) / 100n // 2 referrals * 10%
      ).toBe(true);
    });

    it('should correctly retrieve referred users', async () => {
      await referralService.recordReferral(referrer, referee);
      
      const referredUsers = await referralService.getReferredUsers(referrer);
      expect(referredUsers).toContain(referee);
    });

    it('should validate referral timeframe', async () => {
      const expiredReferralInfo: ReferralInfo = {
        referrer,
        referee,
        purchaseAmount,
        timestamp: Math.floor(Date.now() / 1000) + (31 * 24 * 60 * 60) // 31 days in the future
      };

      await referralService.recordReferral(referrer, referee);

      const result = await referralService.processReferralReward(expiredReferralInfo);
      expect(result.success).toBe(false);
      expect(result.error).toContain('expired referral');
    });
  });
});