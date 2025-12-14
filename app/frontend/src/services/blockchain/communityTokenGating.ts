/**
 * Community Token Gating Service
 * Handles blockchain verification for token-gated content access
 */

import { ethers } from 'ethers';
import { getProvider, getSigner } from '@/utils/web3';

// Use environment configuration for contract addresses
import { ENV_CONFIG } from '@/config/environment';
const LDAO_TOKEN_ADDRESS = ENV_CONFIG.LDAO_TOKEN_ADDRESS;

// ERC20 ABI - minimal interface for balance checking
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function totalStaked(address user) view returns (uint256)',
  'function votingPower(address user) view returns (uint256)',
];

// ERC721 ABI - minimal interface for NFT ownership
const ERC721_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
];

export interface TokenGatingRequirement {
  type: 'token_balance' | 'nft_ownership' | 'staking_amount' | 'voting_power';
  tokenAddress?: string;
  tokenId?: string;
  minimumBalance?: string;
  nftCollection?: string;
}

export interface AccessCheckResult {
  hasAccess: boolean;
  requirement: TokenGatingRequirement;
  userBalance?: string;
  userTokenIds?: string[];
  reason?: string;
}

export class CommunityTokenGatingService {
  /**
   * Check if a user has access to token-gated content
   */
  async checkContentAccess(
    userAddress: string,
    requirement: TokenGatingRequirement
  ): Promise<AccessCheckResult> {
    try {
      const provider = await getProvider();
      if (!provider) {
        return {
          hasAccess: false,
          requirement,
          reason: 'Web3 provider not available'
        };
      }

      switch (requirement.type) {
        case 'token_balance':
          return await this.checkTokenBalance(userAddress, requirement, provider);

        case 'nft_ownership':
          return await this.checkNFTOwnership(userAddress, requirement, provider);

        case 'staking_amount':
          return await this.checkStakingAmount(userAddress, requirement, provider);

        case 'voting_power':
          return await this.checkVotingPower(userAddress, requirement, provider);

        default:
          return {
            hasAccess: false,
            requirement,
            reason: 'Unknown requirement type'
          };
      }
    } catch (error) {
      console.error('Error checking content access:', error);
      return {
        hasAccess: false,
        requirement,
        reason: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check token balance requirement
   */
  private async checkTokenBalance(
    userAddress: string,
    requirement: TokenGatingRequirement,
    provider: ethers.Provider
  ): Promise<AccessCheckResult> {
    try {
      const tokenAddress = requirement.tokenAddress || LDAO_TOKEN_ADDRESS;
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

      const balance = await tokenContract.balanceOf(userAddress);
      const balanceFormatted = ethers.formatEther(balance);

      const minimumBalance = requirement.minimumBalance || '0';
      const minimumBalanceBN = ethers.parseEther(minimumBalance);

      const hasAccess = balance.gte(minimumBalanceBN);

      return {
        hasAccess,
        requirement,
        userBalance: balanceFormatted,
        reason: hasAccess
          ? 'User meets token balance requirement'
          : `User has ${balanceFormatted} tokens but needs ${minimumBalance}`
      };
    } catch (error) {
      console.error('Error checking token balance:', error);
      return {
        hasAccess: false,
        requirement,
        reason: 'Failed to check token balance'
      };
    }
  }

  /**
   * Check NFT ownership requirement
   */
  private async checkNFTOwnership(
    userAddress: string,
    requirement: TokenGatingRequirement,
    provider: ethers.Provider
  ): Promise<AccessCheckResult> {
    try {
      const nftAddress = requirement.nftCollection || requirement.tokenAddress;
      if (!nftAddress) {
        return {
          hasAccess: false,
          requirement,
          reason: 'NFT collection address not provided'
        };
      }

      const nftContract = new ethers.Contract(nftAddress, ERC721_ABI, provider);

      // If specific tokenId is required
      if (requirement.tokenId) {
        try {
          const owner = await nftContract.ownerOf(requirement.tokenId);
          const hasAccess = owner.toLowerCase() === userAddress.toLowerCase();

          return {
            hasAccess,
            requirement,
            userTokenIds: hasAccess ? [requirement.tokenId] : [],
            reason: hasAccess
              ? `User owns NFT #${requirement.tokenId}`
              : `User does not own NFT #${requirement.tokenId}`
          };
        } catch (error) {
          return {
            hasAccess: false,
            requirement,
            reason: `NFT #${requirement.tokenId} does not exist or error checking ownership`
          };
        }
      }

      // Check if user owns any NFT from the collection
      const balance = await nftContract.balanceOf(userAddress);
      const hasAccess = balance.gt(0);

      // Get user's token IDs if they own any
      let userTokenIds: string[] = [];
      if (hasAccess) {
        try {
          const tokenCount = Math.min(balance.toNumber(), 10); // Limit to 10 for performance
          for (let i = 0; i < tokenCount; i++) {
            const tokenId = await nftContract.tokenOfOwnerByIndex(userAddress, i);
            userTokenIds.push(tokenId.toString());
          }
        } catch (error) {
          // tokenOfOwnerByIndex might not be implemented
          console.warn('Could not fetch user token IDs:', error);
        }
      }

      return {
        hasAccess,
        requirement,
        userTokenIds,
        userBalance: balance.toString(),
        reason: hasAccess
          ? `User owns ${balance.toString()} NFTs from this collection`
          : 'User does not own any NFTs from this collection'
      };
    } catch (error) {
      console.error('Error checking NFT ownership:', error);
      return {
        hasAccess: false,
        requirement,
        reason: 'Failed to check NFT ownership'
      };
    }
  }

  /**
   * Check staking amount requirement
   */
  private async checkStakingAmount(
    userAddress: string,
    requirement: TokenGatingRequirement,
    provider: ethers.Provider
  ): Promise<AccessCheckResult> {
    try {
      const tokenAddress = requirement.tokenAddress || LDAO_TOKEN_ADDRESS;
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

      const stakedAmount = await tokenContract.totalStaked(userAddress);
      const stakedFormatted = ethers.formatEther(stakedAmount);

      const minimumBalance = requirement.minimumBalance || '0';
      const minimumBalanceBN = ethers.parseEther(minimumBalance);

      const hasAccess = stakedAmount.gte(minimumBalanceBN);

      return {
        hasAccess,
        requirement,
        userBalance: stakedFormatted,
        reason: hasAccess
          ? 'User meets staking requirement'
          : `User has ${stakedFormatted} staked but needs ${minimumBalance}`
      };
    } catch (error) {
      console.error('Error checking staking amount:', error);
      return {
        hasAccess: false,
        requirement,
        reason: 'Failed to check staking amount'
      };
    }
  }

  /**
   * Check voting power requirement
   */
  private async checkVotingPower(
    userAddress: string,
    requirement: TokenGatingRequirement,
    provider: ethers.Provider
  ): Promise<AccessCheckResult> {
    try {
      const tokenAddress = requirement.tokenAddress || LDAO_TOKEN_ADDRESS;
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

      const votingPower = await tokenContract.votingPower(userAddress);
      const votingPowerFormatted = ethers.formatEther(votingPower);

      const minimumPower = requirement.minimumBalance || '0';
      const minimumPowerBN = ethers.parseEther(minimumPower);

      const hasAccess = votingPower.gte(minimumPowerBN);

      return {
        hasAccess,
        requirement,
        userBalance: votingPowerFormatted,
        reason: hasAccess
          ? 'User meets voting power requirement'
          : `User has ${votingPowerFormatted} voting power but needs ${minimumPower}`
      };
    } catch (error) {
      console.error('Error checking voting power:', error);
      return {
        hasAccess: false,
        requirement,
        reason: 'Failed to check voting power'
      };
    }
  }

  /**
   * Batch check multiple requirements
   */
  async checkMultipleRequirements(
    userAddress: string,
    requirements: TokenGatingRequirement[]
  ): Promise<AccessCheckResult[]> {
    const results = await Promise.all(
      requirements.map(req => this.checkContentAccess(userAddress, req))
    );
    return results;
  }

  /**
   * Check if user meets ANY of the requirements (OR logic)
   */
  async checkAnyRequirement(
    userAddress: string,
    requirements: TokenGatingRequirement[]
  ): Promise<boolean> {
    const results = await this.checkMultipleRequirements(userAddress, requirements);
    return results.some(result => result.hasAccess);
  }

  /**
   * Check if user meets ALL requirements (AND logic)
   */
  async checkAllRequirements(
    userAddress: string,
    requirements: TokenGatingRequirement[]
  ): Promise<boolean> {
    const results = await this.checkMultipleRequirements(userAddress, requirements);
    return results.every(result => result.hasAccess);
  }

  /**
   * Get user's token balance for a specific token
   */
  async getUserTokenBalance(
    userAddress: string,
    tokenAddress?: string
  ): Promise<string> {
    try {
      const provider = await getProvider();
      if (!provider) {
        throw new Error('Web3 provider not available');
      }

      const token = tokenAddress || LDAO_TOKEN_ADDRESS;
      const tokenContract = new ethers.Contract(token, ERC20_ABI, provider);

      const balance = await tokenContract.balanceOf(userAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting user token balance:', error);
      return '0';
    }
  }

  /**
   * Get user's staked amount
   */
  async getUserStakedAmount(
    userAddress: string,
    tokenAddress?: string
  ): Promise<string> {
    try {
      const provider = await getProvider();
      if (!provider) {
        throw new Error('Web3 provider not available');
      }

      const token = tokenAddress || LDAO_TOKEN_ADDRESS;
      const tokenContract = new ethers.Contract(token, ERC20_ABI, provider);

      const staked = await tokenContract.totalStaked(userAddress);
      return ethers.formatEther(staked);
    } catch (error) {
      console.error('Error getting user staked amount:', error);
      return '0';
    }
  }

  /**
   * Get user's voting power
   */
  async getUserVotingPower(
    userAddress: string,
    tokenAddress?: string
  ): Promise<string> {
    try {
      const provider = await getProvider();
      if (!provider) {
        throw new Error('Web3 provider not available');
      }

      const token = tokenAddress || LDAO_TOKEN_ADDRESS;
      const tokenContract = new ethers.Contract(token, ERC20_ABI, provider);

      const votingPower = await tokenContract.votingPower(userAddress);
      return ethers.formatEther(votingPower);
    } catch (error) {
      console.error('Error getting user voting power:', error);
      return '0';
    }
  }
}

export const communityTokenGatingService = new CommunityTokenGatingService();
