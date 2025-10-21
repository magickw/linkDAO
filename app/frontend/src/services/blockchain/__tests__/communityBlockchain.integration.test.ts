/**
 * Integration Tests for Community Blockchain Features
 * Tests token-gating and treasury management integration
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { ethers } from 'ethers';
import { communityTokenGatingService, TokenGatingRequirement } from '../communityTokenGating';
import { communityTreasuryService } from '../communityTreasury';

// Test configuration
const TEST_RPC_URL = 'http://127.0.0.1:8545';
const LDAO_TOKEN_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const GOVERNANCE_ADDRESS = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';

// Mock addresses
const TEST_USER_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // Hardhat default account
const TEST_TREASURY_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

describe('Community Token Gating Integration', () => {
  describe('Token Balance Gating', () => {
    it('should check token balance requirement', async () => {
      const requirement: TokenGatingRequirement = {
        type: 'token_balance',
        tokenAddress: LDAO_TOKEN_ADDRESS,
        minimumBalance: '100',
      };

      const result = await communityTokenGatingService.checkContentAccess(
        TEST_USER_ADDRESS,
        requirement
      );

      expect(result).toBeDefined();
      expect(result.requirement).toEqual(requirement);
      expect(result.hasAccess).toBeDefined();
      expect(result.userBalance).toBeDefined();
    });

    it('should get user token balance', async () => {
      const balance = await communityTokenGatingService.getUserTokenBalance(
        TEST_USER_ADDRESS,
        LDAO_TOKEN_ADDRESS
      );

      expect(balance).toBeDefined();
      expect(typeof balance).toBe('string');
      // Balance should be a valid number
      expect(parseFloat(balance)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Staking Gating', () => {
    it('should check staking amount requirement', async () => {
      const requirement: TokenGatingRequirement = {
        type: 'staking_amount',
        tokenAddress: LDAO_TOKEN_ADDRESS,
        minimumBalance: '500',
      };

      const result = await communityTokenGatingService.checkContentAccess(
        TEST_USER_ADDRESS,
        requirement
      );

      expect(result).toBeDefined();
      expect(result.requirement).toEqual(requirement);
      expect(result.hasAccess).toBeDefined();
      expect(result.reason).toBeDefined();
    });

    it('should get user staked amount', async () => {
      const staked = await communityTokenGatingService.getUserStakedAmount(
        TEST_USER_ADDRESS,
        LDAO_TOKEN_ADDRESS
      );

      expect(staked).toBeDefined();
      expect(typeof staked).toBe('string');
      expect(parseFloat(staked)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Voting Power Gating', () => {
    it('should check voting power requirement', async () => {
      const requirement: TokenGatingRequirement = {
        type: 'voting_power',
        tokenAddress: LDAO_TOKEN_ADDRESS,
        minimumBalance: '1000',
      };

      const result = await communityTokenGatingService.checkContentAccess(
        TEST_USER_ADDRESS,
        requirement
      );

      expect(result).toBeDefined();
      expect(result.requirement).toEqual(requirement);
      expect(result.hasAccess).toBeDefined();
    });

    it('should get user voting power', async () => {
      const votingPower = await communityTokenGatingService.getUserVotingPower(
        TEST_USER_ADDRESS,
        LDAO_TOKEN_ADDRESS
      );

      expect(votingPower).toBeDefined();
      expect(typeof votingPower).toBe('string');
      expect(parseFloat(votingPower)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Multiple Requirements', () => {
    it('should check multiple requirements with AND logic', async () => {
      const requirements: TokenGatingRequirement[] = [
        {
          type: 'token_balance',
          tokenAddress: LDAO_TOKEN_ADDRESS,
          minimumBalance: '100',
        },
        {
          type: 'staking_amount',
          tokenAddress: LDAO_TOKEN_ADDRESS,
          minimumBalance: '50',
        },
      ];

      const hasAccess = await communityTokenGatingService.checkAllRequirements(
        TEST_USER_ADDRESS,
        requirements
      );

      expect(typeof hasAccess).toBe('boolean');
    });

    it('should check multiple requirements with OR logic', async () => {
      const requirements: TokenGatingRequirement[] = [
        {
          type: 'token_balance',
          tokenAddress: LDAO_TOKEN_ADDRESS,
          minimumBalance: '100',
        },
        {
          type: 'staking_amount',
          tokenAddress: LDAO_TOKEN_ADDRESS,
          minimumBalance: '50',
        },
      ];

      const hasAccess = await communityTokenGatingService.checkAnyRequirement(
        TEST_USER_ADDRESS,
        requirements
      );

      expect(typeof hasAccess).toBe('boolean');
    });
  });
});

describe('Community Treasury Management Integration', () => {
  describe('Treasury Balance', () => {
    it('should get treasury balance', async () => {
      const balances = await communityTreasuryService.getTreasuryBalance(
        TEST_TREASURY_ADDRESS
      );

      expect(balances).toBeDefined();
      expect(Array.isArray(balances)).toBe(true);

      // Should have at least ETH and LDAO
      expect(balances.length).toBeGreaterThanOrEqual(2);

      // Check ETH balance
      const ethBalance = balances.find(b => b.tokenSymbol === 'ETH');
      expect(ethBalance).toBeDefined();
      expect(ethBalance?.balance).toBeDefined();

      // Check LDAO balance
      const ldaoBalance = balances.find(b => b.tokenSymbol === 'LDAO');
      expect(ldaoBalance).toBeDefined();
      expect(ldaoBalance?.tokenAddress).toBe(LDAO_TOKEN_ADDRESS);
    });

    it('should get treasury allocation', async () => {
      const allocation = await communityTreasuryService.getTreasuryAllocation(
        TEST_TREASURY_ADDRESS
      );

      expect(allocation).toBeDefined();
      expect(allocation.total).toBeDefined();
      expect(allocation.allocated).toBeDefined();
      expect(allocation.available).toBeDefined();
      expect(Array.isArray(allocation.allocations)).toBe(true);

      // Verify allocation percentages add up to 100
      const totalPercentage = allocation.allocations.reduce(
        (sum, a) => sum + a.percentage,
        0
      );
      expect(totalPercentage).toBe(100);
    });
  });

  describe('Treasury Transactions', () => {
    it('should get treasury transactions', async () => {
      const transactions = await communityTreasuryService.getTreasuryTransactions(
        TEST_TREASURY_ADDRESS,
        10
      );

      expect(transactions).toBeDefined();
      expect(Array.isArray(transactions)).toBe(true);

      // If there are transactions, check their structure
      if (transactions.length > 0) {
        const tx = transactions[0];
        expect(tx.hash).toBeDefined();
        expect(tx.from).toBeDefined();
        expect(tx.to).toBeDefined();
        expect(tx.amount).toBeDefined();
        expect(tx.tokenAddress).toBeDefined();
        expect(tx.timestamp).toBeInstanceOf(Date);
        expect(['deposit', 'withdrawal', 'allocation']).toContain(tx.type);
      }
    });
  });

  describe('Token Allowance', () => {
    it('should check token allowance', async () => {
      const allowance = await communityTreasuryService.checkTokenAllowance(
        LDAO_TOKEN_ADDRESS,
        TEST_USER_ADDRESS,
        GOVERNANCE_ADDRESS
      );

      expect(allowance).toBeDefined();
      expect(typeof allowance).toBe('string');
      expect(parseFloat(allowance)).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Error Handling', () => {
  it('should handle invalid addresses gracefully', async () => {
    const requirement: TokenGatingRequirement = {
      type: 'token_balance',
      tokenAddress: '0x0000000000000000000000000000000000000000',
      minimumBalance: '100',
    };

    const result = await communityTokenGatingService.checkContentAccess(
      TEST_USER_ADDRESS,
      requirement
    );

    expect(result).toBeDefined();
    expect(result.hasAccess).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('should handle missing token address', async () => {
    const balance = await communityTokenGatingService.getUserTokenBalance(
      '0x0000000000000000000000000000000000000000'
    );

    expect(balance).toBe('0');
  });

  it('should handle treasury balance fetch errors', async () => {
    const balances = await communityTreasuryService.getTreasuryBalance(
      '0x0000000000000000000000000000000000000000'
    );

    expect(Array.isArray(balances)).toBe(true);
  });
});
