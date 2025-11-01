import { ethers } from 'ethers';
import { safeLogger } from '../utils/safeLogger';
import { UserProfileService } from './userProfileService';
import { safeLogger } from '../utils/safeLogger';
import { FollowService } from './followService';
import { safeLogger } from '../utils/safeLogger';
import { PostService } from './postService';
import { safeLogger } from '../utils/safeLogger';

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

export class IndexingService {
  private provider: ethers.JsonRpcProvider;
  private profileRegistry: ethers.Contract;
  private followModule: ethers.Contract;
  private paymentRouter: ethers.Contract;
  private governance: ethers.Contract;
  private profileService: UserProfileService;
  private followService: FollowService;
  private postService: PostService;
  private lastBlock: number;

  constructor(
    rpcUrl: string,
    profileRegistryAddress: string,
    followModuleAddress: string,
    paymentRouterAddress: string,
    governanceAddress: string
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.profileRegistry = new ethers.Contract(profileRegistryAddress, PROFILE_REGISTRY_ABI, this.provider);
    this.followModule = new ethers.Contract(followModuleAddress, FOLLOW_MODULE_ABI, this.provider);
    this.paymentRouter = new ethers.Contract(paymentRouterAddress, PAYMENT_ROUTER_ABI, this.provider);
    this.governance = new ethers.Contract(governanceAddress, GOVERNANCE_ABI, this.provider);
    
    this.profileService = new UserProfileService();
    this.followService = new FollowService();
    this.postService = new PostService();
    
    this.lastBlock = 0;
  }

  async start(): Promise<void> {
    safeLogger.info('Starting blockchain indexer...');
    
    // Get the current block number
    this.lastBlock = await this.provider.getBlockNumber();
    safeLogger.info(`Current block number: ${this.lastBlock}`);
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Start polling for new blocks
    setInterval(() => this.pollNewBlocks(), 60000); // Poll every 1 minute
  }

  private setupEventListeners(): void {
    // Profile events
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

    // Follow events
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

    // Payment events
    this.paymentRouter.on('PaymentSent', (from, to, token, amount, fee, memo, event) => {
      safeLogger.info(`Payment sent: ${from} -> ${to}, ${amount.toString()} tokens`);
      // In a real implementation, we would update our database
    });

    // Governance events
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

  private async pollNewBlocks(): Promise<void> {
    try {
      const currentBlock = await this.provider.getBlockNumber();
      
      if (currentBlock > this.lastBlock) {
        safeLogger.info(`Processing blocks ${this.lastBlock + 1} to ${currentBlock}`);
        this.lastBlock = currentBlock;
      }
    } catch (error) {
      safeLogger.error('Error polling new blocks:', error);
    }
  }

  async stop(): Promise<void> {
    safeLogger.info('Stopping blockchain indexer...');
    // Remove event listeners
    this.profileRegistry.removeAllListeners();
    this.followModule.removeAllListeners();
    this.paymentRouter.removeAllListeners();
    this.governance.removeAllListeners();
  }
}