/**
 * Backend Blockchain Integration Service
 * Connects backend to deployed smart contracts for token-gating and treasury
 */

import { ethers } from 'ethers';
import { safeLogger } from '../utils/safeLogger';
import dotenv from 'dotenv';

dotenv.config();

// Contract addresses from environment or deployed-addresses
const LDAO_TOKEN_ADDRESS = process.env.LDAO_TOKEN_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const GOVERNANCE_ADDRESS = process.env.GOVERNANCE_ADDRESS || '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';
const REPUTATION_ADDRESS = process.env.REPUTATION_ADDRESS || '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';

// RPC URL
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';

// Contract ABIs - minimal interface
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function totalStaked(address user) view returns (uint256)',
  'function votingPower(address user) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

const ERC721_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
];

const GOVERNANCE_ABI = [
  'function propose(string calldata title, string calldata description, uint8 category, address[] calldata targets, uint256[] calldata values, string[] calldata signatures, bytes[] calldata calldatas) returns (uint256)',
  'function execute(uint256 proposalId) returns (bool)',
  'function state(uint256 proposalId) view returns (uint8)',
  'function getProposalInfo(uint256 proposalId) view returns (tuple(uint256 id, address proposer, string title, string description, uint256 startBlock, uint256 endBlock, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, bool executed, bool canceled))',
];

const REPUTATION_ABI = [
  'function getUserReputation(address user) view returns (uint256)',
  'function addReputation(address user, uint256 amount, string calldata reason) returns (bool)',
  'function removeReputation(address user, uint256 amount, string calldata reason) returns (bool)',
];

export interface TokenBalanceCheck {
  hasBalance: boolean;
  balance: string;
  minimumRequired: string;
}

export interface NFTOwnershipCheck {
  ownsNFT: boolean;
  tokenIds: string[];
  balance: number;
}

export interface StakingCheck {
  hasStaked: boolean;
  stakedAmount: string;
  minimumRequired: string;
}

export interface VotingPowerCheck {
  hasVotingPower: boolean;
  votingPower: string;
  minimumRequired: string;
}

export class BlockchainIntegrationService {
  private provider: ethers.JsonRpcProvider | null = null;
  private ldaoToken: ethers.Contract | null = null;
  private governance: ethers.Contract | null = null;
  private reputation: ethers.Contract | null = null;
  private initialized: boolean = false;
  private initializationAttempted: boolean = false;

  constructor() {
    // Lazy initialization - don't connect immediately
    // Provider will be initialized on first use
  }

  /**
   * Initialize the provider and contracts lazily
   * Returns true if initialization succeeded, false otherwise
   */
  private async ensureInitialized(): Promise<boolean> {
    if (this.initialized) return true;
    if (this.initializationAttempted) return false;

    this.initializationAttempted = true;

    try {
      // Check if RPC_URL is localhost or invalid
      if (!RPC_URL || RPC_URL.includes('127.0.0.1') || RPC_URL.includes('localhost')) {
        safeLogger.warn('BlockchainIntegrationService: localhost RPC detected, disabling blockchain features');
        return false;
      }

      // Create provider with timeout and circuit breaker to prevent infinite retries
      this.provider = new ethers.JsonRpcProvider(RPC_URL, undefined, {
        staticNetwork: true,
        batchMaxCount: 1, // Reduce batch size
        batchMaxSize: 10240, // Reduce batch size
        polling: false, // Disable polling to reduce connections
      });

      // Set up circuit breaker - fail fast on connection issues
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('RPC connection timeout after 3 seconds')), 3000);
      });

      const networkPromise = this.provider.getNetwork();

      await Promise.race([networkPromise, timeoutPromise]);

      // Initialize contracts only if provider is working
      this.ldaoToken = new ethers.Contract(LDAO_TOKEN_ADDRESS, ERC20_ABI, this.provider);
      this.governance = new ethers.Contract(GOVERNANCE_ADDRESS, GOVERNANCE_ABI, this.provider);
      this.reputation = new ethers.Contract(REPUTATION_ADDRESS, REPUTATION_ABI, this.provider);

      this.initialized = true;
      safeLogger.info('BlockchainIntegrationService initialized successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      safeLogger.warn('BlockchainIntegrationService initialization failed - blockchain features will be disabled:', errorMessage);
      
      // Clean up to prevent memory leaks
      if (this.provider) {
        try {
          (this.provider as any).destroy?.();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      
      this.provider = null;
      this.ldaoToken = null;
      this.governance = null;
      this.reputation = null;
      return false;
    }
  }

  /**
   * Check if the service is available
   */
  async isAvailable(): Promise<boolean> {
    return await this.ensureInitialized();
  }

  /**
   * Check token balance requirement
   */
  async checkTokenBalance(
    userAddress: string,
    minimumBalance: string,
    tokenAddress?: string
  ): Promise<TokenBalanceCheck> {
    try {
      // Check if blockchain service is available
      if (!await this.ensureInitialized() || !this.provider) {
        return {
          hasBalance: false,
          balance: '0',
          minimumRequired: minimumBalance,
        };
      }

      const token = tokenAddress
        ? new ethers.Contract(tokenAddress, ERC20_ABI, this.provider)
        : this.ldaoToken;

      if (!token) {
        return {
          hasBalance: false,
          balance: '0',
          minimumRequired: minimumBalance,
        };
      }

      const balance = await token.balanceOf(userAddress);
      const balanceFormatted = ethers.formatEther(balance);
      const minimumBN = ethers.parseEther(minimumBalance);

      return {
        hasBalance: balance >= minimumBN,
        balance: balanceFormatted,
        minimumRequired: minimumBalance,
      };
    } catch (error) {
      safeLogger.error('Error checking token balance:', error);
      return {
        hasBalance: false,
        balance: '0',
        minimumRequired: minimumBalance,
      };
    }
  }

  /**
   * Check NFT ownership
   */
  async checkNFTOwnership(
    userAddress: string,
    nftAddress: string,
    tokenId?: string
  ): Promise<NFTOwnershipCheck> {
    try {
      // Check if blockchain service is available
      if (!await this.ensureInitialized() || !this.provider) {
        return {
          ownsNFT: false,
          tokenIds: [],
          balance: 0,
        };
      }

      const nftContract = new ethers.Contract(nftAddress, ERC721_ABI, this.provider);

      // Check specific token ID
      if (tokenId) {
        try {
          const owner = await nftContract.ownerOf(tokenId);
          const ownsNFT = owner.toLowerCase() === userAddress.toLowerCase();

          return {
            ownsNFT,
            tokenIds: ownsNFT ? [tokenId] : [],
            balance: ownsNFT ? 1 : 0,
          };
        } catch (error) {
          return {
            ownsNFT: false,
            tokenIds: [],
            balance: 0,
          };
        }
      }

      // Check any NFT from collection
      const balance = await nftContract.balanceOf(userAddress);
      const ownsNFT = balance.gt(0);

      // Get user's token IDs (limit to 10 for performance)
      const tokenIds: string[] = [];
      if (ownsNFT) {
        try {
          const tokenCount = Math.min(balance.toNumber(), 10);
          for (let i = 0; i < tokenCount; i++) {
            const tokenId = await nftContract.tokenOfOwnerByIndex(userAddress, i);
            tokenIds.push(tokenId.toString());
          }
        } catch (error) {
          // tokenOfOwnerByIndex might not be implemented
          safeLogger.warn('Could not fetch token IDs:', error);
        }
      }

      return {
        ownsNFT,
        tokenIds,
        balance: balance.toNumber(),
      };
    } catch (error) {
      safeLogger.error('Error checking NFT ownership:', error);
      return {
        ownsNFT: false,
        tokenIds: [],
        balance: 0,
      };
    }
  }

  /**
   * Check staking requirement
   */
  async checkStakingRequirement(
    userAddress: string,
    minimumStaked: string,
    tokenAddress?: string
  ): Promise<StakingCheck> {
    try {
      // Check if blockchain service is available
      if (!await this.ensureInitialized() || !this.provider) {
        return {
          hasStaked: false,
          stakedAmount: '0',
          minimumRequired: minimumStaked,
        };
      }

      const token = tokenAddress
        ? new ethers.Contract(tokenAddress, ERC20_ABI, this.provider)
        : this.ldaoToken;

      if (!token) {
        return {
          hasStaked: false,
          stakedAmount: '0',
          minimumRequired: minimumStaked,
        };
      }

      const staked = await token.totalStaked(userAddress);
      const stakedFormatted = ethers.formatEther(staked);
      const minimumBN = ethers.parseEther(minimumStaked);

      return {
        hasStaked: staked >= minimumBN,
        stakedAmount: stakedFormatted,
        minimumRequired: minimumStaked,
      };
    } catch (error) {
      safeLogger.error('Error checking staking requirement:', error);
      return {
        hasStaked: false,
        stakedAmount: '0',
        minimumRequired: minimumStaked,
      };
    }
  }

  /**
   * Check voting power requirement
   */
  async checkVotingPower(
    userAddress: string,
    minimumPower: string,
    tokenAddress?: string
  ): Promise<VotingPowerCheck> {
    try {
      // Check if blockchain service is available
      if (!await this.ensureInitialized() || !this.provider) {
        return {
          hasVotingPower: false,
          votingPower: '0',
          minimumRequired: minimumPower,
        };
      }

      const token = tokenAddress
        ? new ethers.Contract(tokenAddress, ERC20_ABI, this.provider)
        : this.ldaoToken;

      if (!token) {
        return {
          hasVotingPower: false,
          votingPower: '0',
          minimumRequired: minimumPower,
        };
      }

      const power = await token.votingPower(userAddress);
      const powerFormatted = ethers.formatEther(power);
      const minimumBN = ethers.parseEther(minimumPower);

      return {
        hasVotingPower: power >= minimumBN,
        votingPower: powerFormatted,
        minimumRequired: minimumPower,
      };
    } catch (error) {
      safeLogger.error('Error checking voting power:', error);
      return {
        hasVotingPower: false,
        votingPower: '0',
        minimumRequired: minimumPower,
      };
    }
  }

  /**
   * Get user's reputation from blockchain
   */
  async getUserReputation(userAddress: string): Promise<number> {
    try {
      // Check if blockchain service is available
      if (!await this.ensureInitialized() || !this.reputation) {
        return 0;
      }

      const reputation = await this.reputation.getUserReputation(userAddress);
      return Number(reputation);
    } catch (error) {
      safeLogger.error('Error getting user reputation:', error);
      return 0;
    }
  }

  /**
   * Get proposal state from blockchain
   */
  async getProposalState(proposalId: string): Promise<{
    state: number;
    stateName: string;
  }> {
    try {
      // Check if blockchain service is available
      if (!await this.ensureInitialized() || !this.governance) {
        return {
          state: -1,
          stateName: 'Unavailable',
        };
      }

      const state = await this.governance.state(proposalId);

      const stateNames = [
        'Pending',
        'Active',
        'Canceled',
        'Defeated',
        'Succeeded',
        'Queued',
        'Expired',
        'Executed'
      ];

      return {
        state: state,
        stateName: stateNames[state] || 'Unknown',
      };
    } catch (error) {
      safeLogger.error('Error getting proposal state:', error);
      return {
        state: -1,
        stateName: 'Error',
      };
    }
  }

  /**
   * Get proposal info from blockchain
   */
  async getProposalInfo(proposalId: string): Promise<any> {
    try {
      // Check if blockchain service is available
      if (!await this.ensureInitialized() || !this.governance) {
        return null;
      }

      const info = await this.governance.getProposalInfo(proposalId);

      return {
        id: info.id.toString(),
        proposer: info.proposer,
        title: info.title,
        description: info.description,
        startBlock: Number(info.startBlock),
        endBlock: Number(info.endBlock),
        forVotes: ethers.formatEther(info.forVotes),
        againstVotes: ethers.formatEther(info.againstVotes),
        abstainVotes: ethers.formatEther(info.abstainVotes),
        executed: info.executed,
        canceled: info.canceled,
      };
    } catch (error) {
      safeLogger.error('Error getting proposal info:', error);
      return null;
    }
  }

  /**
   * Verify treasury balance
   */
  async getTreasuryBalance(treasuryAddress: string): Promise<{
    eth: string;
    ldao: string;
    tokens: Array<{ address: string; balance: string }>;
  }> {
    try {
      // Check if blockchain service is available
      if (!await this.ensureInitialized() || !this.provider || !this.ldaoToken) {
        return {
          eth: '0',
          ldao: '0',
          tokens: [],
        };
      }

      // Get ETH balance
      const ethBalance = await this.provider.getBalance(treasuryAddress);
      const ethFormatted = ethers.formatEther(ethBalance);

      // Get LDAO balance
      const ldaoBalance = await this.ldaoToken.balanceOf(treasuryAddress);
      const ldaoFormatted = ethers.formatEther(ldaoBalance);

      return {
        eth: ethFormatted,
        ldao: ldaoFormatted,
        tokens: [
          { address: LDAO_TOKEN_ADDRESS, balance: ldaoFormatted }
        ],
      };
    } catch (error) {
      safeLogger.error('Error getting treasury balance:', error);
      return {
        eth: '0',
        ldao: '0',
        tokens: [],
      };
    }
  }

  /**
   * Batch check multiple users' token balances (for analytics)
   */
  async batchCheckTokenBalances(
    userAddresses: string[],
    minimumBalance: string
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    try {
      // Check if blockchain service is available
      if (!await this.ensureInitialized() || !this.ldaoToken) {
        userAddresses.forEach(addr => results.set(addr, false));
        return results;
      }

      const minimumBN = ethers.parseEther(minimumBalance);

      // Check balances in parallel
      const checks = await Promise.all(
        userAddresses.map(async (address) => {
          try {
            const balance = await this.ldaoToken!.balanceOf(address);
            return { address, hasBalance: balance >= minimumBN };
          } catch (error) {
            return { address, hasBalance: false };
          }
        })
      );

      checks.forEach(({ address, hasBalance }) => {
        results.set(address, hasBalance);
      });
    } catch (error) {
      safeLogger.error('Error batch checking balances:', error);
    }

    return results;
  }

  /**
   * Get current block number
   */
  async getCurrentBlock(): Promise<number> {
    try {
      // Check if blockchain service is available
      if (!await this.ensureInitialized() || !this.provider) {
        return 0;
      }
      return await this.provider.getBlockNumber();
    } catch (error) {
      safeLogger.error('Error getting current block:', error);
      return 0;
    }
  }

  /**
   * Verify transaction
   */
  async verifyTransaction(txHash: string): Promise<{
    confirmed: boolean;
    blockNumber?: number;
    from?: string;
    to?: string;
  }> {
    try {
      // Check if blockchain service is available
      if (!await this.ensureInitialized() || !this.provider) {
        return { confirmed: false };
      }

      const receipt = await this.provider.getTransactionReceipt(txHash);

      if (!receipt) {
        return { confirmed: false };
      }

      return {
        confirmed: receipt.status === 1,
        blockNumber: receipt.blockNumber,
        from: receipt.from,
        to: receipt.to ?? undefined,
      };
    } catch (error) {
      safeLogger.error('Error verifying transaction:', error);
      return { confirmed: false };
    }
  }
}

// Singleton instance
// Singleton pattern with lazy initialization
let blockchainServiceInstance: BlockchainIntegrationService | null = null;

export const getBlockchainService = (): BlockchainIntegrationService => {
  if (!blockchainServiceInstance) {
    blockchainServiceInstance = new BlockchainIntegrationService();
  }
  return blockchainServiceInstance;
};

// For backward compatibility
export const blockchainService = getBlockchainService();
