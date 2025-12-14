/**
 * Feed Blockchain Integration Service
 * Handles blockchain operations specific to feed/home page
 */

import { ethers } from 'ethers';
import { getProvider, getSigner } from '@/utils/web3';

// Use environment configuration for contract addresses
import { ENV_CONFIG } from '@/config/environment';
const LDAO_TOKEN_ADDRESS = ENV_CONFIG.LDAO_TOKEN_ADDRESS;
const REPUTATION_ADDRESS = ENV_CONFIG.REPUTATION_SYSTEM_ADDRESS;
const GOVERNANCE_ADDRESS = ENV_CONFIG.GOVERNANCE_ADDRESS;

// Contract ABIs
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function totalStaked(address user) view returns (uint256)',
  'function votingPower(address user) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

const REPUTATION_ABI = [
  'function getUserReputation(address user) view returns (uint256)',
  'function getReputationTier(address user) view returns (uint8)',
  'function getUserStats(address user) view returns (tuple(uint256 totalReputation, uint256 positiveReviews, uint256 negativeReviews, uint256 averageRating))',
];

const ERC721_ABI = [
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
];

export interface UserBlockchainProfile {
  address: string;
  tokenBalance: string;
  stakedAmount: string;
  votingPower: string;
  reputation: number;
  reputationTier: string;
  tokenTier: string;
  nftAvatar?: {
    contractAddress: string;
    tokenId: string;
    imageUrl: string;
  };
}

export interface PostTokenGating {
  isGated: boolean;
  requirement: {
    type: 'token_balance' | 'nft_ownership' | 'staking' | 'reputation';
    minimumAmount?: string;
    nftContract?: string;
    tokenId?: string;
  };
  userHasAccess: boolean;
  reason?: string;
}

export interface TipTransaction {
  from: string;
  to: string;
  amount: string;
  token: string;
  message?: string;
  txHash?: string;
  timestamp: Date;
}

export class FeedBlockchainService {
  private ldaoToken: ethers.Contract | null = null;
  private reputation: ethers.Contract | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeContracts();
    }
  }

  private async initializeContracts() {
    try {
      const provider = await getProvider();
      if (!provider) return;

      this.ldaoToken = new ethers.Contract(LDAO_TOKEN_ADDRESS, ERC20_ABI, provider);
      this.reputation = new ethers.Contract(REPUTATION_ADDRESS, REPUTATION_ABI, provider);
    } catch (error) {
      console.error('Error initializing contracts:', error);
    }
  }

  /**
   * Get comprehensive blockchain profile for user
   */
  async getUserBlockchainProfile(userAddress: string): Promise<UserBlockchainProfile> {
    try {
      const provider = await getProvider();
      if (!provider || !this.ldaoToken || !this.reputation) {
        throw new Error('Contracts not initialized');
      }

      // Fetch all data in parallel
      const [balance, staked, votingPower, reputation] = await Promise.all([
        this.ldaoToken.balanceOf(userAddress),
        this.ldaoToken.totalStaked(userAddress),
        this.ldaoToken.votingPower(userAddress),
        this.reputation.getUserReputation(userAddress),
      ]);

      const balanceFormatted = ethers.formatEther(balance);
      const stakedFormatted = ethers.formatEther(staked);
      const votingPowerFormatted = ethers.formatEther(votingPower);
      const reputationValue = reputation.toNumber();

      // Calculate tiers
      const reputationTier = this.calculateReputationTier(reputationValue);
      const tokenTier = this.calculateTokenTier(parseFloat(balanceFormatted), parseFloat(stakedFormatted));

      return {
        address: userAddress,
        tokenBalance: balanceFormatted,
        stakedAmount: stakedFormatted,
        votingPower: votingPowerFormatted,
        reputation: reputationValue,
        reputationTier,
        tokenTier,
      };
    } catch (error) {
      console.error('Error fetching user blockchain profile:', error);
      return {
        address: userAddress,
        tokenBalance: '0',
        stakedAmount: '0',
        votingPower: '0',
        reputation: 0,
        reputationTier: 'new',
        tokenTier: 'member',
      };
    }
  }

  /**
   * Check if user has access to token-gated post
   */
  async checkPostAccess(
    userAddress: string,
    gatingRequirement: PostTokenGating['requirement']
  ): Promise<{ hasAccess: boolean; reason?: string }> {
    try {
      const provider = await getProvider();
      if (!provider) {
        return { hasAccess: false, reason: 'Wallet not connected' };
      }

      switch (gatingRequirement.type) {
        case 'token_balance': {
          if (!gatingRequirement.minimumAmount) {
            return { hasAccess: false, reason: 'Invalid requirement' };
          }

          const balance = await this.ldaoToken!.balanceOf(userAddress);
          const required = ethers.parseEther(gatingRequirement.minimumAmount);
          const hasAccess = balance.gte(required);

          return {
            hasAccess,
            reason: hasAccess
              ? 'Has sufficient token balance'
              : `Need ${gatingRequirement.minimumAmount} LDAO tokens`,
          };
        }

        case 'staking': {
          if (!gatingRequirement.minimumAmount) {
            return { hasAccess: false, reason: 'Invalid requirement' };
          }

          const staked = await this.ldaoToken!.totalStaked(userAddress);
          const required = ethers.parseEther(gatingRequirement.minimumAmount);
          const hasAccess = staked.gte(required);

          return {
            hasAccess,
            reason: hasAccess
              ? 'Has sufficient staked amount'
              : `Need to stake ${gatingRequirement.minimumAmount} LDAO tokens`,
          };
        }

        case 'nft_ownership': {
          if (!gatingRequirement.nftContract) {
            return { hasAccess: false, reason: 'Invalid NFT requirement' };
          }

          const nftContract = new ethers.Contract(
            gatingRequirement.nftContract,
            ERC721_ABI,
            provider
          );

          if (gatingRequirement.tokenId) {
            // Check specific NFT ownership
            try {
              const owner = await nftContract.ownerOf(gatingRequirement.tokenId);
              const hasAccess = owner.toLowerCase() === userAddress.toLowerCase();

              return {
                hasAccess,
                reason: hasAccess
                  ? 'Owns required NFT'
                  : `Must own NFT #${gatingRequirement.tokenId}`,
              };
            } catch {
              return { hasAccess: false, reason: 'NFT does not exist' };
            }
          }

          // Check any NFT from collection
          const balance = await nftContract.balanceOf(userAddress);
          const hasAccess = balance.gt(0);

          return {
            hasAccess,
            reason: hasAccess
              ? 'Owns NFT from collection'
              : 'Must own NFT from this collection',
          };
        }

        case 'reputation': {
          if (!gatingRequirement.minimumAmount) {
            return { hasAccess: false, reason: 'Invalid requirement' };
          }

          const reputation = await this.reputation!.getUserReputation(userAddress);
          const required = parseInt(gatingRequirement.minimumAmount);
          const hasAccess = reputation.toNumber() >= required;

          return {
            hasAccess,
            reason: hasAccess
              ? 'Has sufficient reputation'
              : `Need ${required} reputation points`,
          };
        }

        default:
          return { hasAccess: false, reason: 'Unknown requirement type' };
      }
    } catch (error) {
      console.error('Error checking post access:', error);
      return { hasAccess: false, reason: 'Error checking access' };
    }
  }

  /**
   * Send tip to post author
   */
  async sendTip(
    recipientAddress: string,
    amount: string,
    message?: string
  ): Promise<TipTransaction> {
    try {
      const signer = await getSigner();
      if (!signer) {
        throw new Error('No signer available');
      }

      const tokenWithSigner = new ethers.Contract(LDAO_TOKEN_ADDRESS, ERC20_ABI, signer) as ethers.Contract & {
        transfer: (to: string, amount: bigint) => Promise<ethers.ContractTransactionResponse>;
      };
      const amountWei = ethers.parseEther(amount);

      // Execute transfer
      const tx = await tokenWithSigner.transfer(recipientAddress, amountWei);
      const receipt = await tx.wait();

      const fromAddress = await signer.getAddress();

      return {
        from: fromAddress,
        to: recipientAddress,
        amount,
        token: 'LDAO',
        message,
        txHash: receipt.hash,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error sending tip:', error);
      throw error;
    }
  }

  /**
   * Batch fetch blockchain profiles for multiple users (for feed optimization)
   */
  async batchGetUserProfiles(
    userAddresses: string[]
  ): Promise<Map<string, UserBlockchainProfile>> {
    const profiles = new Map<string, UserBlockchainProfile>();

    try {
      // Fetch in parallel with rate limiting
      const batchSize = 10;
      for (let i = 0; i < userAddresses.length; i += batchSize) {
        const batch = userAddresses.slice(i, i + batchSize);
        const batchProfiles = await Promise.all(
          batch.map(address => this.getUserBlockchainProfile(address))
        );

        batch.forEach((address, index) => {
          profiles.set(address, batchProfiles[index]);
        });
      }
    } catch (error) {
      console.error('Error batch fetching profiles:', error);
    }

    return profiles;
  }

  /**
   * Get NFT avatar for user
   */
  async getUserNFTAvatar(userAddress: string, nftContract: string, tokenId: string): Promise<{
    imageUrl: string;
    name: string;
  } | null> {
    try {
      const provider = await getProvider();
      if (!provider) return null;

      const nft = new ethers.Contract(nftContract, ERC721_ABI, provider);

      // Verify ownership
      const owner = await nft.ownerOf(tokenId);
      if (owner.toLowerCase() !== userAddress.toLowerCase()) {
        return null;
      }

      // Get token URI
      const tokenURI = await nft.tokenURI(tokenId);

      // Fetch metadata
      const response = await fetch(tokenURI);
      const metadata = await response.json();

      return {
        imageUrl: metadata.image,
        name: metadata.name,
      };
    } catch (error) {
      console.error('Error fetching NFT avatar:', error);
      return null;
    }
  }

  /**
   * Calculate weighted engagement score based on blockchain metrics
   */
  calculateWeightedEngagementScore(
    baseScore: number,
    authorProfile: UserBlockchainProfile
  ): number {
    // Base multipliers
    let multiplier = 1;

    // Reputation multiplier (up to 2x)
    const reputationMultiplier = Math.min(1 + authorProfile.reputation / 1000, 2);
    multiplier *= reputationMultiplier;

    // Staking multiplier (up to 1.5x)
    const stakedAmount = parseFloat(authorProfile.stakedAmount);
    if (stakedAmount > 10000) multiplier *= 1.5;
    else if (stakedAmount > 5000) multiplier *= 1.3;
    else if (stakedAmount > 1000) multiplier *= 1.1;

    // Token tier multiplier
    switch (authorProfile.tokenTier) {
      case 'whale':
        multiplier *= 1.3;
        break;
      case 'dolphin':
        multiplier *= 1.2;
        break;
      case 'fish':
        multiplier *= 1.1;
        break;
    }

    return Math.floor(baseScore * multiplier);
  }

  /**
   * Helper: Calculate reputation tier
   */
  private calculateReputationTier(reputation: number): string {
    if (reputation >= 10000) return 'legendary';
    if (reputation >= 5000) return 'expert';
    if (reputation >= 1000) return 'trusted';
    if (reputation >= 100) return 'contributor';
    if (reputation >= 10) return 'active';
    return 'new';
  }

  /**
   * Helper: Calculate token tier
   */
  private calculateTokenTier(balance: number, staked: number): string {
    const total = balance + staked;

    if (total >= 100000) return 'whale';
    if (total >= 50000) return 'dolphin';
    if (total >= 10000) return 'fish';
    if (total >= 1000) return 'shrimp';
    return 'member';
  }
}

export const feedBlockchainService = new FeedBlockchainService();
