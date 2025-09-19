import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  LDAOToken,
  Governance,
  ReputationSystem,
  ProfileRegistry,
  SimpleProfileRegistry,
  PaymentRouter,
  EnhancedEscrow,
  DisputeResolution,
  Marketplace,
  RewardPool,
  NFTMarketplace,
  NFTCollectionFactory,
  TipRouter,
  FollowModule,
  MockERC20,
  Counter
} from "../../typechain-types";

export interface ContractInstances {
  // Core contracts
  ldaoToken: LDAOToken;
  governance: Governance;
  reputationSystem: ReputationSystem;
  profileRegistry: ProfileRegistry;
  simpleProfileRegistry: SimpleProfileRegistry;
  paymentRouter: PaymentRouter;
  
  // Marketplace contracts
  enhancedEscrow: EnhancedEscrow;
  disputeResolution: DisputeResolution;
  marketplace: Marketplace;
  rewardPool: RewardPool;
  
  // NFT contracts
  nftMarketplace: NFTMarketplace;
  nftCollectionFactory: NFTCollectionFactory;
  
  // Social contracts
  tipRouter: TipRouter;
  followModule: FollowModule;
  
  // Testing contracts
  mockUSDC: MockERC20;
  mockUSDT: MockERC20;
  mockDAI: MockERC20;
  counter: Counter;
}

export interface TestAccounts {
  owner: SignerWithAddress;
  treasury: SignerWithAddress;
  feeCollector: SignerWithAddress;
  user1: SignerWithAddress;
  user2: SignerWithAddress;
  user3: SignerWithAddress;
  seller: SignerWithAddress;
  buyer: SignerWithAddress;
  moderator: SignerWithAddress;
  arbitrator: SignerWithAddress;
}

export class TestSuite {
  public contracts: Partial<ContractInstances> = {};
  public accounts!: TestAccounts;
  
  async deployAll(): Promise<void> {
    // Get signers
    const signers = await ethers.getSigners();
    this.accounts = {
      owner: signers[0],
      treasury: signers[1],
      feeCollector: signers[2],
      user1: signers[3],
      user2: signers[4],
      user3: signers[5],
      seller: signers[6],
      buyer: signers[7],
      moderator: signers[8],
      arbitrator: signers[9]
    };

    // Deploy contracts in dependency order
    await this.deployFoundationContracts();
    await this.deployCoreServices();
    await this.deployMarketplaceLayer();
    await this.deployExtendedFeatures();
    await this.configureInterconnections();
  }

  private async deployFoundationContracts(): Promise<void> {
    // Deploy LDAOToken
    const LDAOTokenFactory = await ethers.getContractFactory("LDAOToken");
    this.contracts.ldaoToken = await LDAOTokenFactory.deploy(this.accounts.treasury.address) as LDAOToken;
    await this.contracts.ldaoToken.deployed();

    // Deploy MockERC20 tokens
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    this.contracts.mockUSDC = await MockERC20Factory.deploy("Mock USDC", "USDC", 6) as MockERC20;
    this.contracts.mockUSDT = await MockERC20Factory.deploy("Mock USDT", "USDT", 6) as MockERC20;
    this.contracts.mockDAI = await MockERC20Factory.deploy("Mock DAI", "DAI", 18) as MockERC20;
    
    await this.contracts.mockUSDC.deployed();
    await this.contracts.mockUSDT.deployed();
    await this.contracts.mockDAI.deployed();

    // Deploy Counter
    const CounterFactory = await ethers.getContractFactory("Counter");
    this.contracts.counter = await CounterFactory.deploy() as Counter;
    await this.contracts.counter.deployed();
  }

  private async deployCoreServices(): Promise<void> {
    // Deploy Governance
    const GovernanceFactory = await ethers.getContractFactory("Governance");
    this.contracts.governance = await GovernanceFactory.deploy(this.contracts.ldaoToken!.address) as Governance;
    await this.contracts.governance.deployed();

    // Deploy ReputationSystem
    const ReputationSystemFactory = await ethers.getContractFactory("ReputationSystem");
    this.contracts.reputationSystem = await ReputationSystemFactory.deploy() as ReputationSystem;
    await this.contracts.reputationSystem.deployed();

    // Deploy ProfileRegistry
    const ProfileRegistryFactory = await ethers.getContractFactory("ProfileRegistry");
    this.contracts.profileRegistry = await ProfileRegistryFactory.deploy() as ProfileRegistry;
    await this.contracts.profileRegistry.deployed();

    // Deploy SimpleProfileRegistry
    const SimpleProfileRegistryFactory = await ethers.getContractFactory("SimpleProfileRegistry");
    this.contracts.simpleProfileRegistry = await SimpleProfileRegistryFactory.deploy() as SimpleProfileRegistry;
    await this.contracts.simpleProfileRegistry.deployed();

    // Deploy PaymentRouter
    const PaymentRouterFactory = await ethers.getContractFactory("PaymentRouter");
    this.contracts.paymentRouter = await PaymentRouterFactory.deploy(250, this.accounts.feeCollector.address) as PaymentRouter;
    await this.contracts.paymentRouter.deployed();
  }

  private async deployMarketplaceLayer(): Promise<void> {
    // Deploy EnhancedEscrow
    const EnhancedEscrowFactory = await ethers.getContractFactory("EnhancedEscrow");
    this.contracts.enhancedEscrow = await EnhancedEscrowFactory.deploy(
      this.contracts.governance!.address
    ) as EnhancedEscrow;
    await this.contracts.enhancedEscrow.deployed();

    // Deploy DisputeResolution
    const DisputeResolutionFactory = await ethers.getContractFactory("DisputeResolution");
    this.contracts.disputeResolution = await DisputeResolutionFactory.deploy(
      this.contracts.reputationSystem!.address,
      this.contracts.governance!.address
    ) as DisputeResolution;
    await this.contracts.disputeResolution.deployed();

    // Deploy Marketplace
    const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
    this.contracts.marketplace = await MarketplaceFactory.deploy(
      this.contracts.enhancedEscrow.address,
      this.contracts.paymentRouter!.address
    ) as Marketplace;
    await this.contracts.marketplace.deployed();

    // Deploy RewardPool
    const RewardPoolFactory = await ethers.getContractFactory("RewardPool");
    this.contracts.rewardPool = await RewardPoolFactory.deploy(
      this.contracts.ldaoToken!.address,
      this.accounts.treasury.address
    ) as RewardPool;
    await this.contracts.rewardPool.deployed();
  }

  private async deployExtendedFeatures(): Promise<void> {
    // Deploy NFTMarketplace
    const NFTMarketplaceFactory = await ethers.getContractFactory("NFTMarketplace");
    this.contracts.nftMarketplace = await NFTMarketplaceFactory.deploy() as NFTMarketplace;
    await this.contracts.nftMarketplace.deployed();

    // Deploy NFTCollectionFactory
    const NFTCollectionFactoryFactory = await ethers.getContractFactory("NFTCollectionFactory");
    this.contracts.nftCollectionFactory = await NFTCollectionFactoryFactory.deploy() as NFTCollectionFactory;
    await this.contracts.nftCollectionFactory.deployed();

    // Deploy TipRouter
    const TipRouterFactory = await ethers.getContractFactory("TipRouter");
    this.contracts.tipRouter = await TipRouterFactory.deploy(
      this.contracts.ldaoToken!.address,
      this.contracts.rewardPool!.address
    ) as TipRouter;
    await this.contracts.tipRouter.deployed();

    // Deploy FollowModule
    const FollowModuleFactory = await ethers.getContractFactory("FollowModule");
    this.contracts.followModule = await FollowModuleFactory.deploy(
      this.contracts.profileRegistry!.address
    ) as FollowModule;
    await this.contracts.followModule.deployed();
  }

  private async configureInterconnections(): Promise<void> {
    // Set contract addresses in dependent contracts
    await this.contracts.enhancedEscrow!.setDisputeResolution(this.contracts.disputeResolution!.address);
    await this.contracts.enhancedEscrow!.setReputationSystem(this.contracts.reputationSystem!.address);
    
    await this.contracts.marketplace!.setReputationSystem(this.contracts.reputationSystem!.address);
    await this.contracts.marketplace!.setDisputeResolution(this.contracts.disputeResolution!.address);
    
    // Configure supported tokens in PaymentRouter
    await this.contracts.paymentRouter!.setTokenSupported(this.contracts.mockUSDC!.address, true);
    await this.contracts.paymentRouter!.setTokenSupported(this.contracts.mockUSDT!.address, true);
    await this.contracts.paymentRouter!.setTokenSupported(this.contracts.mockDAI!.address, true);
    
    // Set up initial token distributions for testing
    await this.setupTestTokenDistribution();
  }

  private async setupTestTokenDistribution(): Promise<void> {
    const testAmount = ethers.utils.parseEther("10000");
    const usdcAmount = ethers.utils.parseUnits("10000", 6);
    
    // Distribute LDAO tokens
    await this.contracts.ldaoToken!.connect(this.accounts.treasury).transfer(this.accounts.user1.address, testAmount);
    await this.contracts.ldaoToken!.connect(this.accounts.treasury).transfer(this.accounts.user2.address, testAmount);
    await this.contracts.ldaoToken!.connect(this.accounts.treasury).transfer(this.accounts.seller.address, testAmount);
    await this.contracts.ldaoToken!.connect(this.accounts.treasury).transfer(this.accounts.buyer.address, testAmount);
    
    // Distribute mock tokens
    await this.contracts.mockUSDC!.mint(this.accounts.user1.address, usdcAmount);
    await this.contracts.mockUSDC!.mint(this.accounts.buyer.address, usdcAmount);
    await this.contracts.mockUSDT!.mint(this.accounts.user2.address, usdcAmount);
    await this.contracts.mockDAI!.mint(this.accounts.seller.address, testAmount);
  }

  async getGasReport(): Promise<Record<string, number>> {
    const gasReport: Record<string, number> = {};
    
    // Test common operations and record gas usage
    const tx1 = await this.contracts.ldaoToken!.connect(this.accounts.user1).transfer(
      this.accounts.user2.address, 
      ethers.utils.parseEther("100")
    );
    const receipt1 = await tx1.wait();
    gasReport['LDAO Token Transfer'] = receipt1.gasUsed.toNumber();
    
    // Add more gas measurements for key operations
    return gasReport;
  }
}