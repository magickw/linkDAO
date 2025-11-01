import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ethers } from 'ethers';
import { EnhancedStakingService } from '../services/enhancedStakingService';
import PremiumMemberBenefitsService from '../services/premiumMemberBenefitsService';

// Mock database
const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
};

// Mock ethers provider and contract
const mockProvider = {
  getBalance: jest.fn(),
  getBlockNumber: jest.fn()
} as any;

const mockContract = {
  target: '0x1234567890123456789012345678901234567890',
  stake: jest.fn(),
  unstake: jest.fn(),
  claimRewards: jest.fn(),
  getUserStakes: jest.fn()
} as any;

describe('EnhancedStakingService', () => {
  let stakingService: EnhancedStakingService;
  let premiumBenefitsService: PremiumMemberBenefitsService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    stakingService = new EnhancedStakingService(
      mockProvider,
      '0x1234567890123456789012345678901234567890',
      []
    );
    
    premiumBenefitsService = new PremiumMemberBenefitsService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getStakingTiers', () => {
    it('should return all active staking tiers', async () => {
      const mockTiers = [
        {
          id: 1,
          name: 'Flexible Staking',
          lockPeriod: 0,
          baseAprRate: 500,
          premiumBonusRate: 200,
          minStakeAmount: '100000000000000000000',
          maxStakeAmount: null,
          isActive: true,
          allowsAutoCompound: true,
          earlyWithdrawalPenalty: 0
        },
        {
          id: 2,
          name: 'Short Term Fixed',
          lockPeriod: 2592000,
          baseAprRate: 800,
          premiumBonusRate: 300,
          minStakeAmount: '500000000000000000000',
          maxStakeAmount: null,
          isActive: true,
          allowsAutoCompound: true,
          earlyWithdrawalPenalty: 1000
        }
      ];

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockTiers)
        })
      });

      const tiers = await stakingService.getStakingTiers();

      expect(tiers).toHaveLength(2);
      expect(tiers[0].name).toBe('Flexible Staking');
      expect(tiers[1].name).toBe('Short Term Fixed');
    });

    it('should handle database errors gracefully', async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(stakingService.getStakingTiers()).rejects.toThrow('Failed to fetch staking tiers');
    });
  });

  describe('calculateStakingRewards', () => {
    beforeEach(() => {
      const mockTier = {
        id: 1,
        lockPeriod: 2592000, // 30 days
        baseAprRate: 1000, // 10%
        premiumBonusRate: 200, // 2%
        earlyWithdrawalPenalty: 500, // 5%
        allowsAutoCompound: true
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockTier])
          })
        })
      });
    });

    it('should calculate rewards correctly for regular members', async () => {
      const calculation = await stakingService.calculateStakingRewards(
        '1000', // 1000 LDAO
        1, // tier ID
        undefined, // use tier default duration
        false // not premium member
      );

      expect(calculation.effectiveApr).toBe(10); // 10% APR
      expect(parseFloat(calculation.estimatedRewards)).toBeGreaterThan(0);
      expect(calculation.earlyWithdrawalPenalty).toBeDefined();
    });

    it('should calculate higher rewards for premium members', async () => {
      const regularCalculation = await stakingService.calculateStakingRewards(
        '1000',
        1,
        undefined,
        false
      );

      const premiumCalculation = await stakingService.calculateStakingRewards(
        '1000',
        1,
        undefined,
        true // premium member
      );

      expect(premiumCalculation.effectiveApr).toBeGreaterThan(regularCalculation.effectiveApr);
    });

    it('should calculate compounding effect when auto-compound is available', async () => {
      const calculation = await stakingService.calculateStakingRewards(
        '1000',
        1,
        365 * 24 * 3600, // 1 year
        false
      );

      expect(calculation.compoundingEffect).toBeDefined();
      expect(parseFloat(calculation.compoundingEffect!)).toBeGreaterThan(0);
    });

    it('should handle invalid tier ID', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      await expect(stakingService.calculateStakingRewards('1000', 999, undefined, false))
        .rejects.toThrow('Invalid staking tier');
    });
  });

  describe('createStakePosition', () => {
    beforeEach(() => {
      const mockTier = {
        id: 1,
        lockPeriod: 0,
        baseAprRate: 500,
        premiumBonusRate: 200,
        minStakeAmount: '100000000000000000000'
      };

      const mockUserInfo = {
        userId: 'user123',
        isPremiumMember: false
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockTier])
          })
        })
      });

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined)
      });
    });

    it('should create a stake position successfully', async () => {
      const options = {
        tierId: 1,
        amount: '1000',
        autoCompound: true
      };

      const positionId = await stakingService.createStakePosition(
        'user123',
        '0x1234567890123456789012345678901234567890',
        options,
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      );

      expect(positionId).toMatch(/^stake_user123_\d+$/);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should validate minimum stake amount', async () => {
      const options = {
        tierId: 1,
        amount: '50', // Below minimum
        autoCompound: false
      };

      // Mock tier with higher minimum
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              id: 1,
              minStakeAmount: '100000000000000000000', // 100 LDAO minimum
              baseAprRate: 500,
              premiumBonusRate: 200,
              lockPeriod: 0
            }])
          })
        })
      });

      await expect(stakingService.createStakePosition(
        'user123',
        '0x1234567890123456789012345678901234567890',
        options,
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      )).rejects.toThrow();
    });
  });

  describe('calculateEarlyWithdrawalPenalty', () => {
    beforeEach(() => {
      const mockPosition = {
        id: 'position123',
        amount: '1000000000000000000000', // 1000 LDAO
        startTime: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        lockPeriod: 30 * 24 * 60 * 60, // 30 days
        isFixedTerm: true,
        tierId: 1
      };

      const mockTier = {
        id: 1,
        earlyWithdrawalPenalty: 1000 // 10%
      };

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockPosition])
          })
        })
      }).mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockTier])
          })
        })
      });
    });

    it('should calculate penalty for early withdrawal from fixed-term position', async () => {
      const penalty = await stakingService.calculateEarlyWithdrawalPenalty('position123');

      expect(penalty.canWithdraw).toBe(false);
      expect(penalty.penaltyPercentage).toBe(10);
      expect(parseFloat(penalty.penalty)).toBeGreaterThan(0);
      expect(penalty.remainingLockTime).toBeGreaterThan(0);
    });

    it('should return no penalty for flexible staking', async () => {
      // Mock flexible position
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              id: 'position123',
              amount: '1000000000000000000000',
              startTime: new Date(),
              lockPeriod: 0,
              isFixedTerm: false,
              tierId: 1
            }])
          })
        })
      });

      const penalty = await stakingService.calculateEarlyWithdrawalPenalty('position123');

      expect(penalty.canWithdraw).toBe(true);
      expect(penalty.penaltyPercentage).toBe(0);
      expect(penalty.penalty).toBe('0');
    });
  });

  describe('getUserStakingAnalytics', () => {
    beforeEach(() => {
      const mockPositions = [
        {
          id: 'pos1',
          userId: 'user123',
          amount: '1000000000000000000000', // 1000 LDAO
          aprRate: 1000, // 10%
          accumulatedRewards: '50000000000000000000', // 50 LDAO
          isActive: true,
          lastRewardClaim: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
        },
        {
          id: 'pos2',
          userId: 'user123',
          amount: '2000000000000000000000', // 2000 LDAO
          aprRate: 1200, // 12%
          accumulatedRewards: '100000000000000000000', // 100 LDAO
          isActive: true,
          lastRewardClaim: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
        }
      ];

      // Mock getUserStakePositions
      jest.spyOn(stakingService, 'getUserStakePositions').mockResolvedValue(mockPositions as any);
    });

    it('should calculate analytics correctly', async () => {
      const analytics = await stakingService.getUserStakingAnalytics('user123');

      expect(analytics.totalStaked).toBe('3000.0'); // 3000 LDAO
      expect(analytics.totalRewards).toBe('150.0'); // 150 LDAO
      expect(analytics.activePositions).toBe(2);
      expect(analytics.averageApr).toBeCloseTo(11.33, 1); // Weighted average
      expect(analytics.nextRewardClaim).toBeInstanceOf(Date);
      expect(parseFloat(analytics.projectedMonthlyRewards)).toBeGreaterThan(0);
    });

    it('should handle users with no positions', async () => {
      jest.spyOn(stakingService, 'getUserStakePositions').mockResolvedValue([]);

      const analytics = await stakingService.getUserStakingAnalytics('user123');

      expect(analytics.totalStaked).toBe('0.0');
      expect(analytics.totalRewards).toBe('0.0');
      expect(analytics.activePositions).toBe(0);
      expect(analytics.averageApr).toBe(0);
    });
  });

  describe('processAutoCompounding', () => {
    beforeEach(() => {
      const mockPosition = {
        id: 'position123',
        userId: 'user123',
        amount: '1000000000000000000000', // 1000 LDAO
        accumulatedRewards: '50000000000000000000' // 50 LDAO
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockPosition])
          })
        })
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      });
    });

    it('should process auto-compounding correctly', async () => {
      await stakingService.processAutoCompounding(
        'position123',
        '25', // 25 LDAO reward
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      );

      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should handle invalid position ID', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      await expect(stakingService.processAutoCompounding(
        'invalid_position',
        '25',
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      )).rejects.toThrow('Stake position not found');
    });
  });

  describe('processPartialUnstaking', () => {
    beforeEach(() => {
      const mockPosition = {
        id: 'position123',
        userId: 'user123',
        amount: '2000000000000000000000' // 2000 LDAO
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockPosition])
          })
        })
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      });
    });

    it('should process partial unstaking correctly', async () => {
      await stakingService.processPartialUnstaking(
        'position123',
        '500', // Withdraw 500 LDAO
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      );

      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should prevent full withdrawal through partial unstaking', async () => {
      await expect(stakingService.processPartialUnstaking(
        'position123',
        '2000', // Try to withdraw full amount
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      )).rejects.toThrow('Use full unstaking for complete withdrawal');
    });
  });
});

describe('PremiumMemberBenefitsService', () => {
  let premiumBenefitsService: PremiumMemberBenefitsService;

  beforeEach(() => {
    premiumBenefitsService = new PremiumMemberBenefitsService();
  });

  describe('checkPremiumMembershipStatus', () => {
    it('should identify premium members correctly', async () => {
      const mockUserInfo = {
        userId: 'user123',
        totalStaked: '2000000000000000000000', // 2000 LDAO
        isPremiumMember: true
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockUserInfo])
          })
        })
      });

      const status = await premiumBenefitsService.checkPremiumMembershipStatus('user123');

      expect(status.isPremium).toBe(true);
      expect(status.isVip).toBe(false);
      expect(status.membershipTier).toBe('premium');
      expect(status.benefits.bonusAprRate).toBe(2);
    });

    it('should identify VIP members correctly', async () => {
      const mockUserInfo = {
        userId: 'user123',
        totalStaked: '15000000000000000000000', // 15000 LDAO
        isPremiumMember: true
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockUserInfo])
          })
        })
      });

      const status = await premiumBenefitsService.checkPremiumMembershipStatus('user123');

      expect(status.isPremium).toBe(true);
      expect(status.isVip).toBe(true);
      expect(status.membershipTier).toBe('vip');
      expect(status.benefits.bonusAprRate).toBe(5);
    });

    it('should handle basic members correctly', async () => {
      const mockUserInfo = {
        userId: 'user123',
        totalStaked: '500000000000000000000', // 500 LDAO
        isPremiumMember: false
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockUserInfo])
          })
        })
      });

      const status = await premiumBenefitsService.checkPremiumMembershipStatus('user123');

      expect(status.isPremium).toBe(false);
      expect(status.isVip).toBe(false);
      expect(status.membershipTier).toBe('basic');
      expect(status.benefits.bonusAprRate).toBe(0);
    });
  });

  describe('calculatePremiumPenaltyDiscount', () => {
    it('should apply premium member discount', async () => {
      // Mock premium member
      jest.spyOn(premiumBenefitsService, 'checkPremiumMembershipStatus').mockResolvedValue({
        isPremium: true,
        isVip: false,
        totalStaked: '2000',
        membershipTier: 'premium',
        benefits: {} as any
      });

      const discount = await premiumBenefitsService.calculatePremiumPenaltyDiscount(
        'user123',
        '100' // 100 LDAO penalty
      );

      expect(discount.discountPercentage).toBe(25);
      expect(discount.discountAmount).toBe('25.0');
      expect(discount.finalPenalty).toBe('75.0');
    });

    it('should apply VIP member discount', async () => {
      // Mock VIP member
      jest.spyOn(premiumBenefitsService, 'checkPremiumMembershipStatus').mockResolvedValue({
        isPremium: true,
        isVip: true,
        totalStaked: '15000',
        membershipTier: 'vip',
        benefits: {} as any
      });

      const discount = await premiumBenefitsService.calculatePremiumPenaltyDiscount(
        'user123',
        '100' // 100 LDAO penalty
      );

      expect(discount.discountPercentage).toBe(50);
      expect(discount.discountAmount).toBe('50.0');
      expect(discount.finalPenalty).toBe('50.0');
    });

    it('should not apply discount for basic members', async () => {
      // Mock basic member
      jest.spyOn(premiumBenefitsService, 'checkPremiumMembershipStatus').mockResolvedValue({
        isPremium: false,
        isVip: false,
        totalStaked: '500',
        membershipTier: 'basic',
        benefits: {} as any
      });

      const discount = await premiumBenefitsService.calculatePremiumPenaltyDiscount(
        'user123',
        '100' // 100 LDAO penalty
      );

      expect(discount.discountPercentage).toBe(0);
      expect(discount.discountAmount).toBe('0.0');
      expect(discount.finalPenalty).toBe('100.0');
    });
  });

  describe('createCustomStakingOption', () => {
    it('should approve custom staking for premium members', async () => {
      // Mock premium member
      jest.spyOn(premiumBenefitsService, 'checkPremiumMembershipStatus').mockResolvedValue({
        isPremium: true,
        isVip: false,
        totalStaked: '2000',
        membershipTier: 'premium',
        benefits: { customStakingOptions: true } as any
      });

      const result = await premiumBenefitsService.createCustomStakingOption('user123', {
        amount: '15000',
        customDuration: 120, // 120 days
        requestedApr: 1500 // 15%
      });

      expect(result.approved).toBe(true);
      expect(result.customTierId).toBeDefined();
      expect(result.approvedApr).toBeGreaterThan(0);
    });

    it('should reject custom staking for basic members', async () => {
      // Mock basic member
      jest.spyOn(premiumBenefitsService, 'checkPremiumMembershipStatus').mockResolvedValue({
        isPremium: false,
        isVip: false,
        totalStaked: '500',
        membershipTier: 'basic',
        benefits: { customStakingOptions: false } as any
      });

      const result = await premiumBenefitsService.createCustomStakingOption('user123', {
        amount: '15000',
        customDuration: 120,
        requestedApr: 1500
      });

      expect(result.approved).toBe(false);
      expect(result.reason).toContain('not available for your membership tier');
    });

    it('should reject insufficient stake amounts', async () => {
      // Mock premium member
      jest.spyOn(premiumBenefitsService, 'checkPremiumMembershipStatus').mockResolvedValue({
        isPremium: true,
        isVip: false,
        totalStaked: '2000',
        membershipTier: 'premium',
        benefits: { customStakingOptions: true } as any
      });

      const result = await premiumBenefitsService.createCustomStakingOption('user123', {
        amount: '5000', // Below minimum for custom staking
        customDuration: 120,
        requestedApr: 1500
      });

      expect(result.approved).toBe(false);
      expect(result.reason).toContain('Minimum stake amount');
    });
  });
});
