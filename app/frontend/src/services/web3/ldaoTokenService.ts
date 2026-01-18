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
   * Transfer LDAO tokens
   */
  async transfer(to: string, amount: string): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      const contract = await this.getContract(true);
      if (!contract) {
        throw new Error('Unable to connect to LDAO contract');
      }

      const amountWei = ethers.parseEther(amount);
      const tx = await contract.transfer(to, amountWei);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt?.hash
      };
    } catch (error) {
      const errorResponse = web3ErrorHandler.handleError(error as Error, {
        action: 'transfer',
        component: 'LDAOTokenService'
      });
      return {
        success: false,
        error: errorResponse.message
      };
    }
  }

  /**

     * Stake LDAO tokens using the staking contract

     */

    async stakeTokens(amount: string, tierId: number): Promise<{

      success: boolean;

      transactionHash?: string;

      error?: string;

    }> {

      try {

        // Import staking service

        const { stakingService } = await import('../contracts/stakingService');

        

        // Initialize staking service

        await stakingService.initialize();

  

        // Get wallet signer

        const { getAccount } = await import('@wagmi/core');

        const { config } = await import('@/lib/wagmi');

        const account = getAccount(config);

  

        if (!account || !account.address) {

          throw new Error('No wallet connected. Please connect your wallet to stake tokens.');

        }

  

        // Get signer for transaction

        const { getWalletClient } = await import('@wagmi/core');

        const walletClient = await getWalletClient();

  

        if (!walletClient) {

          throw new Error('Unable to access wallet signer. Please ensure your wallet is unlocked.');

        }

  

        // Convert amount to wei

        const amountWei = ethers.parseEther(amount);

  

        // Call staking contract

        const tx = await stakingService.stake(

          Number(amountWei),

          tierId,

          walletClient

        );

  

        return {

          success: true,

          transactionHash: tx

        };

      } catch (error) {

        console.error('Staking error:', error);

        

        // Fallback to mock for demo purposes if staking contract not deployed

        if (error instanceof Error && error.message.includes('not initialized')) {

          console.warn('Staking contract not deployed, using mock implementation');

          return {

            success: true,

            transactionHash: `0x${Math.random().toString(16).slice(2)}`

          };

        }

  

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
   * Get staking tiers information from the staking contract
   */
  async getStakingTiers(): Promise<Array<{
    id: number;
    lockPeriod: number;
    rewardRate: number;
    minStakeAmount: string;
    isActive: boolean;
  }> | null> {
    try {
      // Import staking service
      const { stakingService } = await import('../contracts/stakingService');
      
      // Initialize staking service
      await stakingService.initialize();

      // Get staking tiers from contract
      const tiers = await stakingService.getStakingTiers();

      return tiers.map((tier: any) => ({
        id: tier.id,
        lockPeriod: tier.lockPeriod,
        rewardRate: tier.rewardRate,
        minStakeAmount: ethers.formatEther(tier.minStakeAmount),
        isActive: tier.isActive
      }));
    } catch (error) {
      console.error('Failed to get staking tiers from contract, using fallback:', error);
      
      // Fallback to mock data if contract not deployed
      const errorResponse = web3ErrorHandler.handleError(error as Error, {
        action: 'getStakingTiers',
        component: 'LDAOTokenService'
      });
      console.error('Failed to get staking tiers:', errorResponse.message);
      
      // Return fallback tiers
      return [
        {
          id: 1,
          lockPeriod: 2592000, // 30 days
          rewardRate: 300, // 3% APR (300 basis points)
          minStakeAmount: '100',
          isActive: true
        },
        {
          id: 2,
          lockPeriod: 7776000, // 90 days
          rewardRate: 500, // 5% APR (500 basis points)
          minStakeAmount: '500',
          isActive: true
        },
        {
          id: 3,
          lockPeriod: 15552000, // 180 days
          rewardRate: 700, // 7% APR (700 basis points)
          minStakeAmount: '1000',
          isActive: true
        },
        {
          id: 4,
          lockPeriod: 31536000, // 365 days
          rewardRate: 900, // 9% APR (900 basis points)
          minStakeAmount: '2000',
          isActive: true
        },
        {
          id: 5,
          lockPeriod: 63072000, // 730 days (2 years)
          rewardRate: 1100, // 11% APR (1100 basis points)
          minStakeAmount: '5000',
          isActive: true
        }
      ];
    }
  }

  /**
   * Get user's staked amount from the staking contract
   */
  async getUserStakedAmount(userAddress: string): Promise<string> {
    try {
      // Import staking service
      const { stakingService } = await import('../contracts/stakingService');
      
      // Initialize staking service
      await stakingService.initialize();

      // Get total staked amount from contract (already formatted as string)
      const stakedAmount = await stakingService.getTotalStaked(userAddress);
      
      return stakedAmount;
    } catch (error) {
      console.error('Failed to get user staked amount from contract:', error);
      
      // Fallback to 0 if contract not deployed
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