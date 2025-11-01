import { ethers } from 'ethers';
import { safeLogger } from '../utils/safeLogger';
import { UserProfileService } from './userProfileService';
import { FollowService } from './followService';
import { PostService } from './postService';

// Contract ABIs (simplified for this example)
const PROFILE_REGISTRY_ABI = [
  "event ProfileCreated(address indexed owner, uint256 indexed tokenId, string handle, uint256 createdAt)",
  "event ProfileUpdated(uint256 indexed tokenId, string handle, string avatarCid, string bioCid)"
];

const FOLLOW_MODULE_ABI = [
  "event Followed(address indexed follower, address indexed following)",
  "event Unfollowed(address indexed follower, address indexed following)"
];

const PAYMENT_ROUTER_ABI = [
  "event PaymentSent(address indexed from, address indexed to, address token, uint256 amount, uint256 fee, string memo)"
];

const GOVERNANCE_ABI = [
  "event ProposalCreated(uint256 id, address proposer, string title, string description, uint256 startBlock, uint256 endBlock)",
  "event VoteCast(address voter, uint256 proposalId, bool support, uint256 votes, string reason)",
  "event ProposalExecuted(uint256 id)"
];

// Token contract ABI for transfer events (optional)
const TOKEN_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

export class IndexerService {
  private provider: ethers.JsonRpcProvider;
  private profileRegistry: ethers.Contract | null = null;
  private followModule: ethers.Contract | null = null;
  private paymentRouter: ethers.Contract | null = null;
  private governance: ethers.Contract | null = null;
  private profileService: UserProfileService;
  private followService: FollowService;
  private postService: PostService;
  private lastBlock: number;
  private useEventListeners: boolean = false; // Flag to control whether to use event listeners

  constructor(
    rpcUrl: string,
    profileRegistryAddress: string,
    followModuleAddress: string,
    paymentRouterAddress: string,
    governanceAddress: string
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.profileService = new UserProfileService();
    this.followService = new FollowService();
    this.postService = new PostService();
    this.lastBlock = 0;

    // Only initialize contracts if addresses are valid and not placeholder addresses
    if (this.isValidAddress(profileRegistryAddress) && !this.isPlaceholderAddress(profileRegistryAddress)) {
      this.profileRegistry = new ethers.Contract(profileRegistryAddress, PROFILE_REGISTRY_ABI, this.provider);
      this.useEventListeners = true;
    }
    
    if (this.isValidAddress(followModuleAddress) && !this.isPlaceholderAddress(followModuleAddress)) {
      this.followModule = new ethers.Contract(followModuleAddress, FOLLOW_MODULE_ABI, this.provider);
      this.useEventListeners = true;
    }
    
    if (this.isValidAddress(paymentRouterAddress) && !this.isPlaceholderAddress(paymentRouterAddress)) {
      this.paymentRouter = new ethers.Contract(paymentRouterAddress, PAYMENT_ROUTER_ABI, this.provider);
      this.useEventListeners = true;
    }
    
    if (this.isValidAddress(governanceAddress) && !this.isPlaceholderAddress(governanceAddress)) {
      this.governance = new ethers.Contract(governanceAddress, GOVERNANCE_ABI, this.provider);
      this.useEventListeners = true;
    }
    
    // If no valid contracts, disable event listeners
    if (!this.profileRegistry && !this.followModule && !this.paymentRouter && !this.governance) {
      this.useEventListeners = false;
    }
  }

  private isValidAddress(address: string): boolean {
    return !!address && address !== '0x0000000000000000000000000000000000000000' && ethers.isAddress(address);
  }
  
  private isPlaceholderAddress(address: string): boolean {
    // Check if the address is one of the placeholder addresses
    const placeholderAddresses = [
      '0x1234567890123456789012345678901234567890',
      '0x2345678901245678901234567890123456789012',
      '0x3456789012345678901234567890123456789012',
      '0x4567890123456789012345678901234567890123'
    ];
    return placeholderAddresses.includes(address.toLowerCase());
  }

  async start(): Promise<void> {
    safeLogger.info('Starting blockchain indexer...');
    
    // Get the current block number
    try {
      // Set a timeout for blockchain connection
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      );
      
      this.lastBlock = await Promise.race([
        this.provider.getBlockNumber(),
        timeoutPromise
      ]) as number;
      
      safeLogger.info(`Current block number: ${this.lastBlock}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      safeLogger.warn('Could not connect to blockchain node:', errorMessage);
      safeLogger.info('Running in offline mode - blockchain features will be disabled');
      this.useEventListeners = false;
      this.lastBlock = 0;
      return; // Continue without blockchain
    }
    
    // Set up event listeners only if we're configured to use them
    if (this.useEventListeners) {
      safeLogger.info('Setting up event listeners for contract events');
      this.setupEventListeners();
    } else {
      safeLogger.info('Skipping event listeners - either contracts not deployed or using placeholder addresses');
    }
    
    // Start polling for new blocks
    setInterval(() => this.pollNewBlocks(), 60000); // Poll every 1 minute
  }

  private setupEventListeners(): void {
    try {
      // Profile events
      if (this.profileRegistry) {
        this.profileRegistry.on('ProfileCreated', (owner, tokenId, handle, createdAt, event) => {
          safeLogger.info(`Profile created: ${owner} with handle ${handle}`);
          // In a real implementation, we would update our database
          // this.profileService.createProfile(owner, handle, tokenId.toString());
        });

        this.profileRegistry.on('ProfileUpdated', (tokenId, handle, avatarCid, bioCid, event) => {
          safeLogger.info(`Profile updated: ${tokenId}`);
          // In a real implementation, we would update our database
          // this.profileService.updateProfile(tokenId.toString(), avatarCid, bioCid);
        });
      }

      // Follow events
      if (this.followModule) {
        this.followModule.on('Followed', (follower, following, event) => {
          safeLogger.info(`${follower} followed ${following}`);
          // In a real implementation, we would update our database
          // this.followService.follow(follower, following);
        });

        this.followModule.on('Unfollowed', (follower, following, event) => {
          safeLogger.info(`${follower} unfollowed ${following}`);
          // In a real implementation, we would update our database
          // this.followService.unfollow(follower, following);
        });
      }

      // Payment events
      if (this.paymentRouter) {
        this.paymentRouter.on('PaymentSent', (from, to, token, amount, fee, memo, event) => {
          safeLogger.info(`Payment sent: ${from} -> ${to}, ${amount.toString()} tokens`);
          // In a real implementation, we would update our database
        });
      }

      // Governance events
      if (this.governance) {
        this.governance.on('ProposalCreated', (id, proposer, title, description, startBlock, endBlock, event) => {
          safeLogger.info(`Proposal created: ${id} by ${proposer}`);
          // In a real implementation, we would update our database
        });

        this.governance.on('VoteCast', (voter, proposalId, support, votes, reason, event) => {
          safeLogger.info(`Vote cast: ${voter} on proposal ${proposalId}`);
          // In a real implementation, we would update our database
        });

        this.governance.on('ProposalExecuted', (id, event) => {
          safeLogger.info(`Proposal executed: ${id}`);
          // In a real implementation, we would update our database
        });
      }
      
      safeLogger.info('Event listeners set up successfully');
    } catch (error) {
      safeLogger.error('Error setting up event listeners:', error);
      this.useEventListeners = false; // Disable event listeners if we get an error
    }
  }

  private async pollNewBlocks(): Promise<void> {
    // Skip polling if event listeners are disabled (offline mode)
    if (!this.useEventListeners) {
      return;
    }
    
    try {
      const currentBlock = await this.provider.getBlockNumber();
      
      if (currentBlock > this.lastBlock) {
        safeLogger.info(`Processing blocks ${this.lastBlock + 1} to ${currentBlock}`);
        this.lastBlock = currentBlock;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      safeLogger.warn('Error polling new blocks (blockchain offline):', errorMessage);
      // Disable further polling attempts if we consistently can't connect
      this.useEventListeners = false;
    }
  }

  async stop(): Promise<void> {
    safeLogger.info('Stopping blockchain indexer...');
    // Remove event listeners
    if (this.profileRegistry) {
      this.profileRegistry.removeAllListeners();
    }
    if (this.followModule) {
      this.followModule.removeAllListeners();
    }
    if (this.paymentRouter) {
      this.paymentRouter.removeAllListeners();
    }
    if (this.governance) {
      this.governance.removeAllListeners();
    }
  }
}
