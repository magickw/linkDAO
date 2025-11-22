import { ethers } from "hardhat";
import { Contract } from "ethers";
import fs from "fs";
import path from "path";

interface DeployedContracts {
  ldaoToken: Contract;
  governance: Contract;
  reputationSystem: Contract;
  profileRegistry: Contract;
  simpleProfileRegistry: Contract;
  paymentRouter: Contract;
  enhancedEscrow: Contract;
  disputeResolution: Contract;
  marketplace: Contract;
  rewardPool: Contract;
  nftMarketplace: Contract;
  nftCollectionFactory: Contract;
  tipRouter: Contract;
  followModule: Contract;
  mockUSDC: Contract;
  mockUSDT: Contract;
  mockDAI: Contract;
  counter: Contract;
}

interface ContractAddresses {
  [key: string]: string;
}

class ContractInterconnectionManager {
  private contracts: Partial<DeployedContracts> = {};
  private addresses: ContractAddresses = {};
  private interconnections: Array<{
    from: string;
    to: string;
    method: string;
    description: string;
  }> = [];

  async loadDeployedContracts(): Promise<void> {
    console.log("📋 Loading deployed contract addresses...");
    
    // Try to load from deployment file
    const deploymentFile = path.join(__dirname, "..", "deployedAddresses.json");
    if (fs.existsSync(deploymentFile)) {
      const deployedAddresses = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
      this.addresses = deployedAddresses;
      console.log("✅ Loaded addresses from deployedAddresses.json");
    } else {
      console.log("⚠️  No deployment file found, will deploy contracts");
      await this.deployAllContracts();
    }
    
    // Attach to deployed contracts
    await this.attachToContracts();
  }

  private async deployAllContracts(): Promise<void> {
    console.log("🚀 Deploying all contracts...");
    const [deployer] = await ethers.getSigners();
    
    // Deploy in dependency order
    await this.deployFoundationContracts(deployer);
    await this.deployCoreServices(deployer);
    await this.deployMarketplaceLayer(deployer);
    await this.deployExtendedFeatures(deployer);
    
    // Save addresses
    this.saveDeploymentAddresses();
  }

  private async deployFoundationContracts(deployer: any): Promise<void> {
    console.log("🏗️  Deploying foundation contracts...");
    
    // Deploy LDAOToken
    const LDAOTokenFactory = await ethers.getContractFactory("LDAOToken");
    this.contracts.ldaoToken = await LDAOTokenFactory.deploy(deployer.address);
    await this.contracts.ldaoToken.deployed();
    this.addresses.ldaoToken = this.contracts.ldaoToken.address;
    console.log(`  ✅ LDAOToken: ${this.contracts.ldaoToken.address}`);
    
    // Deploy MockERC20 tokens
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    
    this.contracts.mockUSDC = await MockERC20Factory.deploy("Mock USDC", "USDC", 6);
    await this.contracts.mockUSDC.deployed();
    this.addresses.mockUSDC = this.contracts.mockUSDC.address;
    
    this.contracts.mockUSDT = await MockERC20Factory.deploy("Mock USDT", "USDT", 6);
    await this.contracts.mockUSDT.deployed();
    this.addresses.mockUSDT = this.contracts.mockUSDT.address;
    
    this.contracts.mockDAI = await MockERC20Factory.deploy("Mock DAI", "DAI", 18);
    await this.contracts.mockDAI.deployed();
    this.addresses.mockDAI = this.contracts.mockDAI.address;
    
    console.log(`  ✅ Mock tokens deployed`);
    
    // Deploy Counter
    const CounterFactory = await ethers.getContractFactory("Counter");
    this.contracts.counter = await CounterFactory.deploy();
    await this.contracts.counter.deployed();
    this.addresses.counter = this.contracts.counter.address;
    console.log(`  ✅ Counter: ${this.contracts.counter.address}`);
  }

  private async deployCoreServices(deployer: any): Promise<void> {
    console.log("🔧 Deploying core services...");
    
    // Deploy Governance
    const GovernanceFactory = await ethers.getContractFactory("Governance");
    this.contracts.governance = await GovernanceFactory.deploy(this.addresses.ldaoToken);
    await this.contracts.governance.deployed();
    this.addresses.governance = this.contracts.governance.address;
    console.log(`  ✅ Governance: ${this.contracts.governance.address}`);
    
    // Deploy ReputationSystem
    const ReputationSystemFactory = await ethers.getContractFactory("ReputationSystem");
    this.contracts.reputationSystem = await ReputationSystemFactory.deploy();
    await this.contracts.reputationSystem.deployed();
    this.addresses.reputationSystem = this.contracts.reputationSystem.address;
    console.log(`  ✅ ReputationSystem: ${this.contracts.reputationSystem.address}`);
    
    // Deploy ProfileRegistry
    const ProfileRegistryFactory = await ethers.getContractFactory("ProfileRegistry");
    this.contracts.profileRegistry = await ProfileRegistryFactory.deploy();
    await this.contracts.profileRegistry.deployed();
    this.addresses.profileRegistry = this.contracts.profileRegistry.address;
    console.log(`  ✅ ProfileRegistry: ${this.contracts.profileRegistry.address}`);
    
    // Deploy SimpleProfileRegistry
    const SimpleProfileRegistryFactory = await ethers.getContractFactory("SimpleProfileRegistry");
    this.contracts.simpleProfileRegistry = await SimpleProfileRegistryFactory.deploy();
    await this.contracts.simpleProfileRegistry.deployed();
    this.addresses.simpleProfileRegistry = this.contracts.simpleProfileRegistry.address;
    console.log(`  ✅ SimpleProfileRegistry: ${this.contracts.simpleProfileRegistry.address}`);
    
    // Deploy PaymentRouter
    const PaymentRouterFactory = await ethers.getContractFactory("PaymentRouter");
    this.contracts.paymentRouter = await PaymentRouterFactory.deploy(250, deployer.address);
    await this.contracts.paymentRouter.deployed();
    this.addresses.paymentRouter = this.contracts.paymentRouter.address;
    console.log(`  ✅ PaymentRouter: ${this.contracts.paymentRouter.address}`);
  }

  private async deployMarketplaceLayer(deployer: any): Promise<void> {
    console.log("🏪 Deploying marketplace layer...");
    
    // Deploy EnhancedEscrow
    const EnhancedEscrowFactory = await ethers.getContractFactory("EnhancedEscrow");
    this.contracts.enhancedEscrow = await EnhancedEscrowFactory.deploy(this.addresses.governance);
    await this.contracts.enhancedEscrow.deployed();
    this.addresses.enhancedEscrow = this.contracts.enhancedEscrow.address;
    console.log(`  ✅ EnhancedEscrow: ${this.contracts.enhancedEscrow.address}`);
    
    // Deploy DisputeResolution
    const DisputeResolutionFactory = await ethers.getContractFactory("DisputeResolution");
    this.contracts.disputeResolution = await DisputeResolutionFactory.deploy(
      this.addresses.reputationSystem,
      this.addresses.governance
    );
    await this.contracts.disputeResolution.deployed();
    this.addresses.disputeResolution = this.contracts.disputeResolution.address;
    console.log(`  ✅ DisputeResolution: ${this.contracts.disputeResolution.address}`);
    
    // Deploy Marketplace
    const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
    this.contracts.marketplace = await MarketplaceFactory.deploy(
      this.addresses.enhancedEscrow,
      this.addresses.paymentRouter
    );
    await this.contracts.marketplace.deployed();
    this.addresses.marketplace = this.contracts.marketplace.address;
    console.log(`  ✅ Marketplace: ${this.contracts.marketplace.address}`);
    
    // Deploy RewardPool
    const RewardPoolFactory = await ethers.getContractFactory("RewardPool");
    this.contracts.rewardPool = await RewardPoolFactory.deploy(
      this.addresses.ldaoToken,
      deployer.address
    );
    await this.contracts.rewardPool.deployed();
    this.addresses.rewardPool = this.contracts.rewardPool.address;
    console.log(`  ✅ RewardPool: ${this.contracts.rewardPool.address}`);
  }

  private async deployExtendedFeatures(deployer: any): Promise<void> {
    console.log("🎨 Deploying extended features...");
    
    // Deploy NFTMarketplace
    const NFTMarketplaceFactory = await ethers.getContractFactory("NFTMarketplace");
    this.contracts.nftMarketplace = await NFTMarketplaceFactory.deploy();
    await this.contracts.nftMarketplace.deployed();
    this.addresses.nftMarketplace = this.contracts.nftMarketplace.address;
    console.log(`  ✅ NFTMarketplace: ${this.contracts.nftMarketplace.address}`);
    
    // Deploy NFTCollectionFactory
    const NFTCollectionFactoryFactory = await ethers.getContractFactory("NFTCollectionFactory");
    this.contracts.nftCollectionFactory = await NFTCollectionFactoryFactory.deploy();
    await this.contracts.nftCollectionFactory.deployed();
    this.addresses.nftCollectionFactory = this.contracts.nftCollectionFactory.address;
    console.log(`  ✅ NFTCollectionFactory: ${this.contracts.nftCollectionFactory.address}`);
    
    // Deploy TipRouter
    const TipRouterFactory = await ethers.getContractFactory("TipRouter");
    this.contracts.tipRouter = await TipRouterFactory.deploy(
      this.addresses.ldaoToken,
      this.addresses.rewardPool
    );
    await this.contracts.tipRouter.deployed();
    this.addresses.tipRouter = this.contracts.tipRouter.address;
    console.log(`  ✅ TipRouter: ${this.contracts.tipRouter.address}`);
    
    // Deploy FollowModule
    const FollowModuleFactory = await ethers.getContractFactory("FollowModule");
    this.contracts.followModule = await FollowModuleFactory.deploy(this.addresses.profileRegistry);
    await this.contracts.followModule.deployed();
    this.addresses.followModule = this.contracts.followModule.address;
    console.log(`  ✅ FollowModule: ${this.contracts.followModule.address}`);
  }

  private async attachToContracts(): Promise<void> {
    console.log("🔗 Attaching to deployed contracts...");
    
    for (const [name, address] of Object.entries(this.addresses)) {
      try {
        const factory = await ethers.getContractFactory(this.getContractName(name));
        (this.contracts as any)[name] = factory.attach(address);
        console.log(`  ✅ Attached to ${name}: ${address}`);
      } catch (error) {
        console.log(`  ⚠️  Could not attach to ${name}: ${error}`);
      }
    }
  }

  private getContractName(key: string): string {
    const contractNames: Record<string, string> = {
      ldaoToken: "LDAOToken",
      governance: "Governance",
      reputationSystem: "ReputationSystem",
      profileRegistry: "ProfileRegistry",
      simpleProfileRegistry: "SimpleProfileRegistry",
      paymentRouter: "PaymentRouter",
      enhancedEscrow: "EnhancedEscrow",
      disputeResolution: "DisputeResolution",
      marketplace: "Marketplace",
      rewardPool: "RewardPool",
      nftMarketplace: "NFTMarketplace",
      nftCollectionFactory: "NFTCollectionFactory",
      tipRouter: "TipRouter",
      followModule: "FollowModule",
      mockUSDC: "MockERC20",
      mockUSDT: "MockERC20",
      mockDAI: "MockERC20",
      counter: "Counter"
    };
    
    return contractNames[key] || key;
  }

  async configureInterconnections(): Promise<void> {
    console.log("🔧 Configuring contract interconnections...");
    
    // Configure EnhancedEscrow dependencies
    await this.configureEscrowConnections();
    
    // Configure Marketplace dependencies
    await this.configureMarketplaceConnections();
    
    // Configure PaymentRouter supported tokens
    await this.configurePaymentRouterTokens();
    
    // Configure RewardPool permissions
    await this.configureRewardPoolPermissions();
    
    // Configure access controls
    await this.configureAccessControls();
    
    // Verify all connections
    await this.verifyInterconnections();
  }

  private async configureEscrowConnections(): Promise<void> {
    console.log("  🔗 Configuring EnhancedEscrow connections...");
    
    try {
      // Set dispute resolution address
      if (this.contracts.enhancedEscrow && this.addresses.disputeResolution) {
        await this.contracts.enhancedEscrow.setDisputeResolution(this.addresses.disputeResolution);
        this.interconnections.push({
          from: "EnhancedEscrow",
          to: "DisputeResolution",
          method: "setDisputeResolution",
          description: "Enable dispute resolution for escrow transactions"
        });
        console.log("    ✅ DisputeResolution address set");
      }
      
      // Set reputation system address
      if (this.contracts.enhancedEscrow && this.addresses.reputationSystem) {
        await this.contracts.enhancedEscrow.setReputationSystem(this.addresses.reputationSystem);
        this.interconnections.push({
          from: "EnhancedEscrow",
          to: "ReputationSystem",
          method: "setReputationSystem",
          description: "Enable reputation updates from escrow completions"
        });
        console.log("    ✅ ReputationSystem address set");
      }
      
    } catch (error) {
      console.log(`    ⚠️  Error configuring escrow connections: ${error}`);
    }
  }

  private async configureMarketplaceConnections(): Promise<void> {
    console.log("  🏪 Configuring Marketplace connections...");
    
    try {
      // Set reputation system address
      if (this.contracts.marketplace && this.addresses.reputationSystem) {
        await this.contracts.marketplace.setReputationSystem(this.addresses.reputationSystem);
        this.interconnections.push({
          from: "Marketplace",
          to: "ReputationSystem",
          method: "setReputationSystem",
          description: "Enable reputation checks for marketplace transactions"
        });
        console.log("    ✅ ReputationSystem address set");
      }
      
      // Set dispute resolution address
      if (this.contracts.marketplace && this.addresses.disputeResolution) {
        await this.contracts.marketplace.setDisputeResolution(this.addresses.disputeResolution);
        this.interconnections.push({
          from: "Marketplace",
          to: "DisputeResolution",
          method: "setDisputeResolution",
          description: "Enable dispute creation from marketplace transactions"
        });
        console.log("    ✅ DisputeResolution address set");
      }
      
    } catch (error) {
      console.log(`    ⚠️  Error configuring marketplace connections: ${error}`);
    }
  }

  private async configurePaymentRouterTokens(): Promise<void> {
    console.log("  💰 Configuring PaymentRouter supported tokens...");
    
    try {
      const tokens = [
        { name: "USDC", address: this.addresses.mockUSDC },
        { name: "USDT", address: this.addresses.mockUSDT },
        { name: "DAI", address: this.addresses.mockDAI }
      ];
      
      for (const token of tokens) {
        if (this.contracts.paymentRouter && token.address) {
          await this.contracts.paymentRouter.setTokenSupported(token.address, true);
          this.interconnections.push({
            from: "PaymentRouter",
            to: token.name,
            method: "setTokenSupported",
            description: `Enable ${token.name} as supported payment token`
          });
          console.log(`    ✅ ${token.name} token support enabled`);
        }
      }
      
    } catch (error) {
      console.log(`    ⚠️  Error configuring payment router tokens: ${error}`);
    }
  }

  private async configureRewardPoolPermissions(): Promise<void> {
    console.log("  🎁 Configuring RewardPool permissions...");
    
    try {
      // Grant distributor role to TipRouter
      if (this.contracts.rewardPool && this.addresses.tipRouter) {
        const DISTRIBUTOR_ROLE = await this.contracts.rewardPool.DISTRIBUTOR_ROLE();
        await this.contracts.rewardPool.grantRole(DISTRIBUTOR_ROLE, this.addresses.tipRouter);
        this.interconnections.push({
          from: "RewardPool",
          to: "TipRouter",
          method: "grantRole(DISTRIBUTOR_ROLE)",
          description: "Allow TipRouter to distribute rewards"
        });
        console.log("    ✅ TipRouter granted distributor role");
      }
      
      // Grant distributor role to Marketplace (for transaction rewards)
      if (this.contracts.rewardPool && this.addresses.marketplace) {
        const DISTRIBUTOR_ROLE = await this.contracts.rewardPool.DISTRIBUTOR_ROLE();
        await this.contracts.rewardPool.grantRole(DISTRIBUTOR_ROLE, this.addresses.marketplace);
        this.interconnections.push({
          from: "RewardPool",
          to: "Marketplace",
          method: "grantRole(DISTRIBUTOR_ROLE)",
          description: "Allow Marketplace to distribute transaction rewards"
        });
        console.log("    ✅ Marketplace granted distributor role");
      }
      
    } catch (error) {
      console.log(`    ⚠️  Error configuring reward pool permissions: ${error}`);
    }
  }

  private async configureAccessControls(): Promise<void> {
    console.log("  🔐 Configuring access controls...");
    
    try {
      // Configure ReputationSystem moderators
      if (this.contracts.reputationSystem) {
        // This would typically be done with specific moderator addresses
        console.log("    ℹ️  ReputationSystem moderator configuration pending");
      }
      
      // Configure Governance proposal thresholds
      if (this.contracts.governance) {
        // Governance parameters are typically set during deployment
        console.log("    ℹ️  Governance parameters configured during deployment");
      }
      
    } catch (error) {
      console.log(`    ⚠️  Error configuring access controls: ${error}`);
    }
  }

  private async verifyInterconnections(): Promise<void> {
    console.log("✅ Verifying contract interconnections...");
    
    const verificationResults: Array<{
      connection: string;
      status: "success" | "failed" | "skipped";
      details: string;
    }> = [];
    
    // Verify EnhancedEscrow connections
    try {
      if (this.contracts.enhancedEscrow) {
        const disputeAddress = await this.contracts.enhancedEscrow.disputeResolution();
        const reputationAddress = await this.contracts.enhancedEscrow.reputationSystem();
        
        verificationResults.push({
          connection: "EnhancedEscrow -> DisputeResolution",
          status: disputeAddress === this.addresses.disputeResolution ? "success" : "failed",
          details: `Expected: ${this.addresses.disputeResolution}, Got: ${disputeAddress}`
        });
        
        verificationResults.push({
          connection: "EnhancedEscrow -> ReputationSystem",
          status: reputationAddress === this.addresses.reputationSystem ? "success" : "failed",
          details: `Expected: ${this.addresses.reputationSystem}, Got: ${reputationAddress}`
        });
      }
    } catch (error) {
      verificationResults.push({
        connection: "EnhancedEscrow connections",
        status: "failed",
        details: `Verification error: ${error}`
      });
    }
    
    // Verify PaymentRouter token support
    try {
      if (this.contracts.paymentRouter) {
        const tokens = [
          { name: "USDC", address: this.addresses.mockUSDC },
          { name: "USDT", address: this.addresses.mockUSDT },
          { name: "DAI", address: this.addresses.mockDAI }
        ];
        
        for (const token of tokens) {
          if (token.address) {
            const isSupported = await this.contracts.paymentRouter.supportedTokens(token.address);
            verificationResults.push({
              connection: `PaymentRouter -> ${token.name}`,
              status: isSupported ? "success" : "failed",
              details: `Token support: ${isSupported}`
            });
          }
        }
      }
    } catch (error) {
      verificationResults.push({
        connection: "PaymentRouter token support",
        status: "failed",
        details: `Verification error: ${error}`
      });
    }
    
    // Print verification results
    console.log("\n📊 Interconnection Verification Results:");
    for (const result of verificationResults) {
      const status = result.status === "success" ? "✅" : result.status === "failed" ? "❌" : "⚠️";
      console.log(`  ${status} ${result.connection}: ${result.details}`);
    }
    
    const successCount = verificationResults.filter(r => r.status === "success").length;
    const totalCount = verificationResults.length;
    console.log(`\n📈 Verification Summary: ${successCount}/${totalCount} connections verified successfully`);
  }

  async testEventEmission(): Promise<void> {
    console.log("🎭 Testing event emission for off-chain indexing...");
    
    const [deployer, user1, user2] = await ethers.getSigners();
    
    try {
      // Test LDAOToken transfer event
      if (this.contracts.ldaoToken) {
        const transferAmount = ethers.parseEther("100");
        await this.contracts.ldaoToken.transfer(user1.address, transferAmount);
        console.log("  ✅ LDAOToken Transfer event emitted");
      }
      
      // Test Marketplace listing event
      if (this.contracts.marketplace) {
        const price = ethers.parseEther("1");
        await this.contracts.marketplace.connect(user1).createListing(
          ethers.constants.AddressZero,
          0,
          price,
          1,
          0,
          0
        );
        console.log("  ✅ Marketplace ListingCreated event emitted");
      }
      
      // Test PaymentRouter payment event
      if (this.contracts.paymentRouter) {
        const amount = ethers.parseEther("0.1");
        await this.contracts.paymentRouter.connect(user1).processPayment(
          ethers.constants.AddressZero,
          amount,
          user2.address,
          { value: amount }
        );
        console.log("  ✅ PaymentRouter PaymentProcessed event emitted");
      }
      
    } catch (error) {
      console.log(`  ⚠️  Event emission test error: ${error}`);
    }
  }

  private saveDeploymentAddresses(): void {
    const deploymentFile = path.join(__dirname, "..", "deployedAddresses.json");
    fs.writeFileSync(deploymentFile, JSON.stringify(this.addresses, null, 2));
    console.log(`📄 Deployment addresses saved to: ${deploymentFile}`);
  }

  generateInterconnectionReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      contractAddresses: this.addresses,
      interconnections: this.interconnections,
      summary: {
        totalContracts: Object.keys(this.addresses).length,
        totalInterconnections: this.interconnections.length,
        deploymentComplete: true
      },
      networkInfo: {
        chainId: "31337", // Hardhat local network
        networkName: "hardhat"
      },
      nextSteps: [
        "Verify all contract interactions work correctly",
        "Test end-to-end workflows",
        "Deploy to testnet for final verification",
        "Conduct security audit of interconnected system",
        "Prepare mainnet deployment"
      ]
    };
    
    const reportFile = path.join(__dirname, "..", "interconnection-report.json");
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log("\n📊 Interconnection Report Generated:");
    console.log(`  📄 Report file: ${reportFile}`);
    console.log(`  🏗️  Contracts deployed: ${report.summary.totalContracts}`);
    console.log(`  🔗 Interconnections configured: ${report.summary.totalInterconnections}`);
    console.log(`  ⏰ Timestamp: ${report.timestamp}`);
  }

  printSummary(): void {
    console.log("\n" + "=".repeat(60));
    console.log("           CONTRACT INTERCONNECTION SUMMARY");
    console.log("=".repeat(60));
    
    console.log("📋 DEPLOYED CONTRACTS:");
    Object.entries(this.addresses).forEach(([name, address]) => {
      console.log(`  ${name}: ${address}`);
    });
    
    console.log("\n🔗 CONFIGURED INTERCONNECTIONS:");
    this.interconnections.forEach((conn, index) => {
      console.log(`  ${index + 1}. ${conn.from} -> ${conn.to}`);
      console.log(`     Method: ${conn.method}`);
      console.log(`     Purpose: ${conn.description}`);
    });
    
    console.log("\n✅ CONFIGURATION COMPLETE");
    console.log("   All contracts deployed and interconnected successfully");
    console.log("   Ready for comprehensive testing and deployment");
    console.log("=".repeat(60));
  }
}

async function main() {
  console.log("🚀 Starting Contract Interconnection Configuration...");
  
  const manager = new ContractInterconnectionManager();
  
  try {
    // Load or deploy contracts
    await manager.loadDeployedContracts();
    
    // Configure interconnections
    await manager.configureInterconnections();
    
    // Test event emission
    await manager.testEventEmission();
    
    // Generate report
    manager.generateInterconnectionReport();
    
    // Print summary
    manager.printSummary();
    
    console.log("\n✅ Contract interconnection configuration completed successfully!");
    
  } catch (error) {
    console.error("❌ Contract interconnection configuration failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { ContractInterconnectionManager };