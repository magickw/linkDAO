/**
 * Smart Contract Interaction Service
 * Centralized service for all contract interactions
 * Handles transactions, events, and real-time data fetching
 */

import { ethers } from 'ethers';
import { contractRegistryService } from './contractRegistryService';
import { reputationService } from './contracts/reputationService';
import { nftMarketplaceService } from './contracts/nftMarketplaceService';
import { stakingService } from './contracts/stakingService';

export interface ContractInteraction {
  contractName: string;
  functionName: string;
  params: any[];
  description: string;
  value?: string;
}

export interface TransactionResult {
  success: boolean;
  hash?: string;
  error?: string;
  receipt?: any;
}

export interface ContractData {
  [key: string]: any;
}

export class SmartContractInteractionService {
  private static instance: SmartContractInteractionService;
  private eventListeners: Map<string, any> = new Map();
  private callbacks: Map<string, Function[]> = new Map();

  static getInstance(): SmartContractInteractionService {
    if (!SmartContractInteractionService.instance) {
      SmartContractInteractionService.instance = new SmartContractInteractionService();
    }
    return SmartContractInteractionService.instance;
  }

  /**
   * Execute a transaction on any contract
   */
  async executeTransaction(
    contractName: string,
    functionName: string,
    params: any[] = [],
    signer: any,
    value?: string
  ): Promise<TransactionResult> {
    try {
      const contract = await this.getContractInstance(contractName, signer);
      const txOptions = value ? { value: ethers.parseEther(value) } : {};
      
      const tx = await contract[functionName](...params, txOptions);
      const receipt = await tx.wait();

      return {
        success: true,
        hash: tx.hash,
        receipt
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed'
      };
    }
  }

  /**
   * Call a view function on any contract
   */
  async callViewFunction(
    contractName: string,
    functionName: string,
    params: any[] = [],
    provider?: any
  ): Promise<any> {
    try {
      const contract = await this.getContractInstance(contractName, provider);
      const result = await contract[functionName](...params);
      return result;
    } catch (error) {
      console.error(`Failed to call ${functionName} on ${contractName}:`, error);
      throw error;
    }
  }

  /**
   * Get contract instance with ABI
   */
  private async getContractInstance(
    contractName: string,
    signerOrProvider?: any
  ): Promise<any> {
    const address = await contractRegistryService.getContractAddress(contractName);
    const abi = await this.getContractABI(contractName);
    
    if (signerOrProvider) {
      return new ethers.Contract(address, abi, signerOrProvider);
    }
    
    // For view functions, we might not have a provider
    throw new Error('Provider or signer required for contract interaction');
  }

  /**
   * Get ABI for a contract
   */
  private async getContractABI(contractName: string): Promise<any[]> {
    const abis: Record<string, any[]> = {
      'LDAOToken': [
        'function balanceOf(address) view returns (uint256)',
        'function totalSupply() view returns (uint256)',
        'function transfer(address, uint256) returns (bool)',
        'function approve(address, uint256) returns (bool)',
        'function allowance(address, address) view returns (uint256)',
        'function transferFrom(address, address, uint256) returns (bool)',
        'event Transfer(address indexed from, address indexed to, uint256 value)',
        'event Approval(address indexed owner, address indexed spender, uint256 value)'
      ],
      'Governance': [
        'function createProposal(string, uint256) returns (uint256)',
        'function vote(uint256, bool)',
        'function executeProposal(uint256)',
        'function getProposal(uint256) view returns (tuple(string description, uint256 forVotes, uint256 againstVotes, uint256 deadline, bool executed))',
        'event ProposalCreated(uint256 indexed proposalId, string description)',
        'event VoteCast(address indexed voter, uint256 indexed proposalId, bool support)',
        'event ProposalExecuted(uint256 indexed proposalId)'
      ],
      'ReputationSystem': [
        'function reputationScores(address) view returns (uint256)',
        'function getReputationLevel(uint256) view returns (uint256)',
        'function updateReputation(address, string, uint256)',
        'event ReputationUpdated(address indexed user, string action, uint256 amount, uint256 newScore)'
      ],
      'NFTMarketplace': [
        'function createListing(tuple(address, uint256, uint256, uint256, string)) returns (uint256)',
        'function placeBid(uint256, uint256)',
        'function executeSale(uint256)',
        'function cancelListing(uint256)',
        'function getListing(uint256) view returns (tuple(uint256, address, address, uint256, uint256, uint256, uint256, bool, address, uint256, string))',
        'event ListingCreated(uint256 indexed listingId, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 price)',
        'event BidPlaced(uint256 indexed listingId, address indexed bidder, uint256 amount)',
        'event SaleExecuted(uint256 indexed listingId, address indexed buyer, uint256 price)'
      ],
      'EnhancedEscrow': [
        'function createEscrow(address, address, uint256, string) returns (uint256)',
        'function deposit(uint256)',
        'function release(uint256)',
        'function refund(uint256)',
        'function getEscrow(uint256) view returns (tuple(uint256 id, address buyer, address seller, uint256 amount, string status))',
        'event EscrowCreated(uint256 indexed escrowId, address indexed buyer, address indexed seller)',
        'event EscrowReleased(uint256 indexed escrowId)',
        'event EscrowRefunded(uint256 indexed escrowId)'
      ],
      'RewardPool': [
        'function depositRewards(uint256)',
        'function claimRewards(address) returns (uint256)',
        'function getBalance() view returns (uint256)',
        'event RewardsDeposited(address indexed depositor, uint256 amount)',
        'event RewardsClaimed(address indexed user, uint256 amount)'
      ],
      'LDAOTreasury': [
        'function withdraw(uint256, address)',
        'function getBalance() view returns (uint256)',
        'event Withdrawal(address indexed to, uint256 amount)'
      ],
      'ProfileRegistry': [
        'function createProfile(string, string)',
        'function updateProfile(string, string)',
        'function getProfile(address) view returns (tuple(string handle, string metadata, uint256 createdAt))',
        'event ProfileCreated(address indexed user, string handle)',
        'event ProfileUpdated(address indexed user, string handle)'
      ],
      'TipRouter': [
        'function sendTip(address, uint256, string)',
        'function claimTips()',
        'function getTips(address) view returns (tuple(uint256 amount, string message, uint256 timestamp)[])',
        'event TipSent(address indexed from, address indexed to, uint256 amount, string message)'
      ],
      'FollowModule': [
        'function follow(address)',
        'function unfollow(address)',
        'function getFollowing(address) view returns (address[])',
        'function getFollowers(address) view returns (address[])',
        'event Followed(address indexed follower, address indexed following)',
        'event Unfollowed(address indexed follower, address indexed following)'
      ],
      'DisputeResolution': [
        'function createDispute(uint256, string)',
        'function resolveDispute(uint256, bool)',
        'function getDispute(uint256) view returns (tuple(uint256 id, address plaintiff, address defendant, string reason, bool resolved, bool ruling))',
        'event DisputeCreated(uint256 indexed disputeId, address indexed plaintiff)',
        'event DisputeResolved(uint256 indexed disputeId, bool ruling)'
      ],
      'MultiSigWallet': [
        'function submitTransaction(address, uint256, bytes)',
        'function confirmTransaction(uint256)',
        'function executeTransaction(uint256)',
        'event Submission(uint256 indexed transactionId)',
        'event Confirmation(address indexed owner, uint256 indexed transactionId)',
        'event Execution(uint256 indexed transactionId)'
      ],
      'NFTCollectionFactory': [
        'function createCollection(string, string) returns (address)',
        'function getCollection(address) view returns (tuple(string name, string symbol, address owner))',
        'event CollectionCreated(address indexed collection, string name, string symbol)'
      ]
    };

    return abis[contractName] || [];
  }

  /**
   * Get real-time data from multiple contracts
   */
  async getRealTimeData(userAddress: string, provider?: any): Promise<ContractData> {
    const data: ContractData = {};

    try {
      // LDAO Token data
      const tokenBalance = await this.callViewFunction(
        'LDAOToken',
        'balanceOf',
        [userAddress],
        provider
      );
      const tokenSupply = await this.callViewFunction(
        'LDAOToken',
        'totalSupply',
        [],
        provider
      );
      data.LDAOToken = {
        balance: ethers.formatEther(tokenBalance),
        totalSupply: ethers.formatEther(tokenSupply)
      };

      // Reputation data
      const reputation = await reputationService.getUserReputation(userAddress);
      data.ReputationSystem = reputation;

      // Staking data
      const stakingStats = await stakingService.getStakingStats(userAddress);
      data.EnhancedStaking = stakingStats;

      // NFT Marketplace data
      const listings = await nftMarketplaceService.getListingsBySeller(userAddress);
      data.NFTMarketplace = {
        listingsCount: listings.length,
        activeListings: listings.filter(l => l.isActive).length,
        totalValue: listings.reduce((sum, l) => sum + parseFloat(l.price), 0)
      };

      // Follow data
      try {
        const following = await this.callViewFunction(
          'FollowModule',
          'getFollowing',
          [userAddress],
          provider
        );
        const followers = await this.callViewFunction(
          'FollowModule',
          'getFollowers',
          [userAddress],
          provider
        );
        data.FollowModule = {
          followingCount: following.length,
          followersCount: followers.length
        };
      } catch {
        data.FollowModule = { followingCount: 0, followersCount: 0 };
      }

    } catch (error) {
      console.error('Failed to fetch real-time data:', error);
    }

    return data;
  }

  /**
   * Setup event listeners for a contract
   */
  setupEventListener(contractName: string, eventName: string, callback: Function): void {
    const key = `${contractName}_${eventName}`;
    
    if (!this.callbacks.has(key)) {
      this.callbacks.set(key, []);
    }
    
    this.callbacks.get(key)?.push(callback);

    // Setup actual contract event listeners
    switch (contractName) {
      case 'ReputationSystem':
        reputationService.listenToReputationUpdates((user, action, amount, newScore) => {
          this.emit(key, { user, action, amount, newScore });
        });
        break;
        
      case 'NFTMarketplace':
        nftMarketplaceService.listenToEvents({
          onListingCreated: (listingId, seller, nftContract, tokenId, price) => {
            this.emit(key, { listingId, seller, nftContract, tokenId, price });
          },
          onBidPlaced: (listingId, bidder, amount) => {
            this.emit(`${contractName}_BidPlaced`, { listingId, bidder, amount });
          },
          onSaleExecuted: (listingId, buyer, price) => {
            this.emit(`${contractName}_SaleExecuted`, { listingId, buyer, price });
          }
        });
        break;
        
      case 'EnhancedStaking':
        stakingService.listenToStakingEvents({
          onStaked: (user, amount, tierId, stakeIndex) => {
            this.emit(key, { user, amount, tierId, stakeIndex });
          },
          onUnstaked: (user, amount, stakeIndex) => {
            this.emit(`${contractName}_Unstaked`, { user, amount, stakeIndex });
          },
          onRewardsClaimed: (user, amount) => {
            this.emit(`${contractName}_RewardsClaimed`, { user, amount });
          }
        });
        break;
    }
  }

  /**
   * Emit event to all callbacks
   */
  private emit(key: string, data: any): void {
    const callbacks = this.callbacks.get(key);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event callback:', error);
        }
      });
    }
  }

  /**
   * Remove event listeners
   */
  removeEventListener(contractName: string, eventName: string, callback?: Function): void {
    const key = `${contractName}_${eventName}`;
    
    if (callback) {
      const callbacks = this.callbacks.get(key);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    } else {
      this.callbacks.delete(key);
    }
  }

  /**
   * Get available functions for a contract
   */
  getAvailableFunctions(contractName: string): ContractInteraction[] {
    const functions: Record<string, ContractInteraction[]> = {
      'LDAOToken': [
        { contractName: 'LDAOToken', functionName: 'balanceOf', params: ['address'], description: 'Get token balance' },
        { contractName: 'LDAOToken', functionName: 'transfer', params: ['address', 'uint256'], description: 'Transfer tokens' },
        { contractName: 'LDAOToken', functionName: 'approve', params: ['address', 'uint256'], description: 'Approve spending' }
      ],
      'Governance': [
        { contractName: 'Governance', functionName: 'createProposal', params: ['string', 'uint256'], description: 'Create proposal' },
        { contractName: 'Governance', functionName: 'vote', params: ['uint256', 'bool'], description: 'Vote on proposal' }
      ],
      'ReputationSystem': [
        { contractName: 'ReputationSystem', functionName: 'updateReputation', params: ['address', 'string', 'uint256'], description: 'Update reputation' }
      ],
      'NFTMarketplace': [
        { contractName: 'NFTMarketplace', functionName: 'createListing', params: ['tuple'], description: 'Create NFT listing' },
        { contractName: 'NFTMarketplace', functionName: 'placeBid', params: ['uint256', 'uint256'], description: 'Place bid' }
      ],
      'EnhancedStaking': [
        { contractName: 'EnhancedStaking', functionName: 'stake', params: ['uint256', 'uint256'], description: 'Stake tokens' },
        { contractName: 'EnhancedStaking', functionName: 'unstake', params: ['uint256', 'uint256'], description: 'Unstake tokens' }
      ]
    };

    return functions[contractName] || [];
  }

  /**
   * Cleanup all listeners
   */
  cleanup(): void {
    this.callbacks.clear();
    reputationService.cleanup();
    nftMarketplaceService.cleanup();
    stakingService.cleanup();
  }
}

// Export singleton instance
export const smartContractInteractionService = SmartContractInteractionService.getInstance();