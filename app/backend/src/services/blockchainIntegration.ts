/**
 * Backend Blockchain Integration Service
 * Connects backend to deployed smart contracts for token-gating and treasury
 */

import { ethers } from 'ethers';
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
  private provider: ethers.providers.JsonRpcProvider;
  private ldaoToken: ethers.Contract;
  private governance: ethers.Contract;
  private reputation: ethers.Contract;

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    this.ldaoToken = new ethers.Contract(LDAO_TOKEN_ADDRESS, ERC20_ABI, this.provider);
    this.governance = new ethers.Contract(GOVERNANCE_ADDRESS, GOVERNANCE_ABI, this.provider);
    this.reputation = new ethers.Contract(REPUTATION_ADDRESS, REPUTATION_ABI, this.provider);
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
      const token = tokenAddress
        ? new ethers.Contract(tokenAddress, ERC20_ABI, this.provider)
        : this.ldaoToken;

      const balance = await token.balanceOf(userAddress);
      const balanceFormatted = ethers.utils.formatEther(balance);
      const minimumBN = ethers.utils.parseEther(minimumBalance);

      return {
        hasBalance: balance.gte(minimumBN),
        balance: balanceFormatted,
        minimumRequired: minimumBalance,
      };
    } catch (error) {
      console.error('Error checking token balance:', error);
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
          console.warn('Could not fetch token IDs:', error);
        }
      }

      return {
        ownsNFT,
        tokenIds,
        balance: balance.toNumber(),
      };
    } catch (error) {
      console.error('Error checking NFT ownership:', error);
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
      const token = tokenAddress
        ? new ethers.Contract(tokenAddress, ERC20_ABI, this.provider)
        : this.ldaoToken;

      const staked = await token.totalStaked(userAddress);
      const stakedFormatted = ethers.utils.formatEther(staked);
      const minimumBN = ethers.utils.parseEther(minimumStaked);

      return {
        hasStaked: staked.gte(minimumBN),
        stakedAmount: stakedFormatted,
        minimumRequired: minimumStaked,
      };
    } catch (error) {
      console.error('Error checking staking requirement:', error);
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
      const token = tokenAddress
        ? new ethers.Contract(tokenAddress, ERC20_ABI, this.provider)
        : this.ldaoToken;

      const power = await token.votingPower(userAddress);
      const powerFormatted = ethers.utils.formatEther(power);
      const minimumBN = ethers.utils.parseEther(minimumPower);

      return {
        hasVotingPower: power.gte(minimumBN),
        votingPower: powerFormatted,
        minimumRequired: minimumPower,
      };
    } catch (error) {
      console.error('Error checking voting power:', error);
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
      const reputation = await this.reputation.getUserReputation(userAddress);
      return reputation.toNumber();
    } catch (error) {
      console.error('Error getting user reputation:', error);
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
      console.error('Error getting proposal state:', error);
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
      const info = await this.governance.getProposalInfo(proposalId);

      return {
        id: info.id.toString(),
        proposer: info.proposer,
        title: info.title,
        description: info.description,
        startBlock: info.startBlock.toNumber(),
        endBlock: info.endBlock.toNumber(),
        forVotes: ethers.utils.formatEther(info.forVotes),
        againstVotes: ethers.utils.formatEther(info.againstVotes),
        abstainVotes: ethers.utils.formatEther(info.abstainVotes),
        executed: info.executed,
        canceled: info.canceled,
      };
    } catch (error) {
      console.error('Error getting proposal info:', error);
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
      // Get ETH balance
      const ethBalance = await this.provider.getBalance(treasuryAddress);
      const ethFormatted = ethers.utils.formatEther(ethBalance);

      // Get LDAO balance
      const ldaoBalance = await this.ldaoToken.balanceOf(treasuryAddress);
      const ldaoFormatted = ethers.utils.formatEther(ldaoBalance);

      return {
        eth: ethFormatted,
        ldao: ldaoFormatted,
        tokens: [
          { address: LDAO_TOKEN_ADDRESS, balance: ldaoFormatted }
        ],
      };
    } catch (error) {
      console.error('Error getting treasury balance:', error);
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
      const minimumBN = ethers.utils.parseEther(minimumBalance);

      // Check balances in parallel
      const checks = await Promise.all(
        userAddresses.map(async (address) => {
          try {
            const balance = await this.ldaoToken.balanceOf(address);
            return { address, hasBalance: balance.gte(minimumBN) };
          } catch (error) {
            return { address, hasBalance: false };
          }
        })
      );

      checks.forEach(({ address, hasBalance }) => {
        results.set(address, hasBalance);
      });
    } catch (error) {
      console.error('Error batch checking balances:', error);
    }

    return results;
  }

  /**
   * Get current block number
   */
  async getCurrentBlock(): Promise<number> {
    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      console.error('Error getting current block:', error);
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
      const receipt = await this.provider.getTransactionReceipt(txHash);

      if (!receipt) {
        return { confirmed: false };
      }

      return {
        confirmed: receipt.status === 1,
        blockNumber: receipt.blockNumber,
        from: receipt.from,
        to: receipt.to,
      };
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return { confirmed: false };
    }
  }
}

// Singleton instance
export const blockchainService = new BlockchainIntegrationService();
