/**
 * LDAO Token Service - Interacts with the deployed LDAO token contract
 */

import { ethers } from 'ethers';
import { getSigner, getProvider } from '@/utils/web3';
import { LDAOToken, LDAOToken__factory } from '@/types/typechain';
import { web3ErrorHandler } from '@/utils/web3ErrorHandling';
import deployedAddresses from '@/config/deployedAddresses-sepolia.json';

// Get the LDAO token contract address from deployed addresses
const LDAO_TOKEN_ADDRESS = deployedAddresses.contracts.LDAOToken.address;

export class LDAOTokenService {
  private static instance: LDAOTokenService;
  private contract: LDAOToken | null = null;

  static getInstance(): LDAOTokenService {
    if (!LDAOTokenService.instance) {
      LDAOTokenService.instance = new LDAOTokenService();
    }
    return LDAOTokenService.instance;
  }

  /**
   * Get the LDAO token contract instance
   */
  private async getContract(requireSigner: boolean = false): Promise<LDAOToken | null> {
    try {
      // Return cached contract if available
      if (this.contract) {
        return this.contract;
      }

      // Get provider first (always needed)
      const provider = await getProvider();
      if (!provider) {
        throw new Error('No provider available');
      }

      // For read-only operations, provider is sufficient
      // For write operations, signer is required
      let signerOrProvider = provider;
      
      if (requireSigner) {
        const signer = await getSigner();
        if (!signer) {
          throw new Error('No wallet connected - signer required for this operation');
        }
        signerOrProvider = signer;
      }

      // Create contract instance
      this.contract = LDAOToken__factory.connect(
        LDAO_TOKEN_ADDRESS,
        signerOrProvider as any
      );

      return this.contract;
    } catch (error) {
      const errorResponse = web3ErrorHandler.handleError(error as Error, {
        action: 'getContract',
        component: 'LDAOTokenService'
      });
      console.error('Failed to get LDAO contract:', errorResponse.message);
      return null;
    }
  }

  /**
   * Get user's LDAO token balance
   */
  async getUserBalance(userAddress: string): Promise<string> {
    try {
      const contract = await this.getContract();
      if (!contract) {
        throw new Error('Unable to connect to LDAO contract');
      }

      const balance = await contract.balanceOf(userAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      const errorResponse = web3ErrorHandler.handleError(error as Error, {
        action: 'getUserBalance',
        component: 'LDAOTokenService'
      });
      console.error('Failed to get user balance:', errorResponse.message);
      return '0';
    }
  }

  /**
   * Get LDAO token information
   */
  async getTokenInfo(): Promise<{
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: string;
  } | null> {
    try {
      // Use provider-only for read-only operation
      const contract = await this.getContract(false);
      if (!contract) {
        throw new Error('Unable to connect to LDAO contract');
      }

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.totalSupply()
      ]);

      return {
        name,
        symbol,
        decimals,
        totalSupply: ethers.formatEther(totalSupply)
      };
    } catch (error) {
      const errorResponse = web3ErrorHandler.handleError(error as Error, {
        action: 'getTokenInfo',
        component: 'LDAOTokenService'
      });
      console.error('Failed to get token info:', errorResponse.message);
      return null;
    }
  }

  /**
   * Purchase LDAO tokens (this would typically interact with a payment contract)
   */
  async purchaseTokens(amount: string, userAddress: string): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      // In a real implementation, this would interact with a payment processor
      // or a DEX contract to swap ETH/ERC20 for LDAO tokens

      // For now, we'll simulate a successful purchase
      console.log(`Purchasing ${amount} LDAO tokens for user ${userAddress}`);

      // This is where we would actually execute the token purchase
      // For example, calling a payment contract or DEX router

      return {
        success: true,
        transactionHash: '0x' + Math.random().toString(16).substr(2, 64) // Mock transaction hash
      };
    } catch (error) {
      const errorResponse = web3ErrorHandler.handleError(error as Error, {
        action: 'purchaseTokens',
        component: 'LDAOTokenService'
      });

      return {
        success: false,
        error: errorResponse.message
      };
    }
  }

  /**
   * Stake LDAO tokens
   */
  async stakeTokens(amount: string, tierId: number): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      // Require signer for write operation
      const contract = await this.getContract(true);
      if (!contract) {
        throw new Error('Unable to connect to LDAO contract');
      }

      const signer = await getSigner();
      if (!signer) {
        throw new Error('No wallet connected');
      }

      // Convert amount to wei
      const amountWei = ethers.parseEther(amount);

      // Approve tokens for staking (if needed)
      // In a real implementation, you might need to approve a staking contract

      // Execute staking
      const tx = await contract.stake(amountWei, tierId) as any;
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error) {
      const errorResponse = web3ErrorHandler.handleError(error as Error, {
        action: 'stakeTokens',
        component: 'LDAOTokenService'
      });

      return {
        success: false,
        error: errorResponse.message
      };
    }
  }

  /**
   * Get staking tiers information
   */
  async getStakingTiers(): Promise<Array<{
    id: number;
    lockPeriod: number;
    rewardRate: number;
    minStakeAmount: string;
    isActive: boolean;
  }> | null> {
    try {
      // Use provider-only for read-only operation
      const contract = await this.getContract(false);
      if (!contract) {
        throw new Error('Unable to connect to LDAO contract');
      }

      const tiers = [];

      // Get the first 4 staking tiers (as per contract)
      for (let i = 1; i <= 4; i++) {
        try {
          const tier = await contract.stakingTiers(i);
          tiers.push({
            id: i,
            lockPeriod: Number(tier.lockPeriod),
            rewardRate: Number(tier.rewardRate),
            minStakeAmount: ethers.formatEther(tier.minStakeAmount),
            isActive: tier.isActive
          });
        } catch (error) {
          // Tier might not exist, skip it
          continue;
        }
      }

      return tiers;
    } catch (error) {
      const errorResponse = web3ErrorHandler.handleError(error as Error, {
        action: 'getStakingTiers',
        component: 'LDAOTokenService'
      });
      console.error('Failed to get staking tiers:', errorResponse.message);
      return null;
    }
  }

  /**
   * Get user's staked amount
   */
  async getUserStakedAmount(userAddress: string): Promise<string> {
    try {
      // Use provider-only for read-only operation
      const contract = await this.getContract(false);
      if (!contract) {
        throw new Error('Unable to connect to LDAO contract');
      }

      const stakedAmount = await contract.totalStaked(userAddress);
      return ethers.formatEther(stakedAmount);
    } catch (error) {
      const errorResponse = web3ErrorHandler.handleError(error as Error, {
        action: 'getUserStakedAmount',
        component: 'LDAOTokenService'
      });
      console.error('Failed to get user staked amount:', errorResponse.message);
      return '0';
    }
  }
}

export const ldaoTokenService = LDAOTokenService.getInstance();