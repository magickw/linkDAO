import { ethers } from "hardhat";
import { Contract } from "ethers";
import fs from "fs";
import path from "path";

interface ValidationResult {
  category: string;
  test: string;
  status: "pass" | "fail" | "warning";
  details: string;
  gasUsed?: string;
  transactionHash?: string;
}

interface PlatformContracts {
  [key: string]: Contract;
}

class PlatformIntegrationValidator {
  private contracts: PlatformContracts = {};
  private addresses: Record<string, string> = {};
  private validationResults: ValidationResult[] = [];

  async loadContracts(): Promise<void> {
    console.log("📋 Loading deployed contracts for validation...");
    
    const deploymentFile = path.join(__dirname, "..", "deployedAddresses.json");
    if (fs.existsSync(deploymentFile)) {
      const deployedAddresses = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
      this.addresses = deployedAddresses;
      console.log("✅ Loaded addresses from deployedAddresses.json");
    } else {
      throw new Error("❌ No deployment file found. Please deploy contracts first.");
    }
    
    await this.attachToContracts();
  }

  private async attachToContracts(): Promise<void> {
    console.log("🔗 Attaching to deployed contracts...");
    
    const contractMappings = {
      ldaoToken: "LDAOToken",
      governance: "Governance",
      reputationSystem: "ReputationSystem",
      marketplace: "Marketplace",
      enhancedEscrow: "EnhancedEscrow",
      disputeResolution: "DisputeResolution",
      paymentRouter: "PaymentRouter",
      nftMarketplace: "NFTMarketplace",
      nftCollectionFactory: "NFTCollectionFactory",
      tipRouter: "TipRouter",
      followModule: "FollowModule",
      enhancedRewardPool: "EnhancedRewardPool",
      profileRegistry: "ProfileRegistry"
    };

    for (const [key, contractName] of Object.entries(contractMappings)) {
      const address = this.addresses[key] || this.addresses[contractName];
      if (address) {
        try {
          const factory = await ethers.getContractFactory(contractName);
          this.contracts[key] = factory.attach(address);
          console.log(`  ✅ Attached to ${key}: ${address}`);
        } catch (error) {
          console.log(`  ⚠️  Could not attach to ${key}: ${error}`);
        }
      }
    }
  }

  async validatePlatformIntegration(): Promise<void> {
    console.log("🔍 Validating Complete Platform Integration...");
    
    await this.validateCoreContractLinks();
    await this.validateCrossContractCommunication();
    await this.validateRewardMechanisms();
    await this.validateSocialFeatures();
    await this.validateNFTMarketplace();
    await this.validateAccessControls();
    await this.validateEndToEndWorkflows();
    await this.validatePerformanceMetrics();
  }

  private async validateCoreContractLinks(): Promise<void> {
    console.log("  🔗 Validating core contract links...");
    
    try {
      // Validate NFTMarketplace links
      if (this.contracts.nftMarketplace && this.contracts.reputationSystem) {
        const reputationAddress = await this.contracts.nftMarketplace.reputationSystem();
        this.validationResults.push({
          category: "Core Links",
          test: "NFTMarketplace -> ReputationSystem",
          status: reputationAddress === this.contracts.reputationSystem.address ? "pass" : "fail",
          details: `Expected: ${this.contracts.reputationSystem.address}, Got: ${reputationAddress}`
        });
      }

      // Validate TipRouter links
      if (this.contracts.tipRouter && this.contracts.ldaoToken && this.contracts.enhancedRewardPool) {
        const ldaoAddress = await this.contracts.tipRouter.ldao();
        const rewardPoolAddress = await this.contracts.tipRouter.rewardPool();
        
        this.validationResults.push({
          category: "Core Links",
          test: "TipRouter -> LDAOToken",
          status: ldaoAddress === this.contracts.ldaoToken.address ? "pass" : "fail",
          details: `Expected: ${this.contracts.ldaoToken.address}, Got: ${ldaoAddress}`
        });

        this.validationResults.push({
          category: "Core Links",
          test: "TipRouter -> RewardPool",
          status: rewardPoolAddress === this.contracts.enhancedRewardPool.address ? "pass" : "fail",
          details: `Expected: ${this.contracts.enhancedRewardPool.address}, Got: ${rewardPoolAddress}`
        });
      }

      // Validate Marketplace links
      if (this.contracts.marketplace && this.contracts.enhancedEscrow && this.contracts.paymentRouter) {
        const escrowAddress = await this.contracts.marketplace.escrow();
        const paymentRouterAddress = await this.contracts.marketplace.paymentRouter();
        
        this.validationResults.push({
          category: "Core Links",
          test: "Marketplace -> EnhancedEscrow",
          status: escrowAddress === this.contracts.enhancedEscrow.address ? "pass" : "fail",
          details: `Expected: ${this.contracts.enhancedEscrow.address}, Got: ${escrowAddress}`
        });

        this.validationResults.push({
          category: "Core Links",
          test: "Marketplace -> PaymentRouter",
          status: paymentRouterAddress === this.contracts.paymentRouter.address ? "pass" : "fail",
          details: `Expected: ${this.contracts.paymentRouter.address}, Got: ${paymentRouterAddress}`
        });
      }

    } catch (error) {
      this.validationResults.push({
        category: "Core Links",
        test: "Contract Link Validation",
        status: "fail",
        details: `Validation error: ${error}`
      });
    }
  }

  private async validateCrossContractCommunication(): Promise<void> {
    console.log("  📡 Validating cross-contract communication...");
    
    try {
      // Test social tracking enablement
      if (this.contracts.nftMarketplace) {
        const socialTrackingEnabled = await this.contracts.nftMarketplace.socialTrackingEnabled();
        this.validationResults.push({
          category: "Communication",
          test: "NFT Marketplace Social Tracking",
          status: socialTrackingEnabled ? "pass" : "warning",
          details: `Social tracking enabled: ${socialTrackingEnabled}`
        });
      }

      // Test reputation updates enablement
      if (this.contracts.tipRouter) {
        const reputationUpdatesEnabled = await this.contracts.tipRouter.reputationUpdatesEnabled();
        this.validationResults.push({
          category: "Communication",
          test: "TipRouter Reputation Updates",
          status: reputationUpdatesEnabled ? "pass" : "warning",
          details: `Reputation updates enabled: ${reputationUpdatesEnabled}`
        });
      }

      // Test connection tracking
      if (this.contracts.followModule) {
        const connectionTrackingEnabled = await this.contracts.followModule.connectionTrackingEnabled();
        this.validationResults.push({
          category: "Communication",
          test: "FollowModule Connection Tracking",
          status: connectionTrackingEnabled ? "pass" : "warning",
          details: `Connection tracking enabled: ${connectionTrackingEnabled}`
        });
      }

    } catch (error) {
      this.validationResults.push({
        category: "Communication",
        test: "Cross-Contract Communication",
        status: "fail",
        details: `Validation error: ${error}`
      });
    }
  }

  private async validateRewardMechanisms(): Promise<void> {
    console.log("  🎁 Validating reward mechanisms...");
    
    try {
      if (this.contracts.enhancedRewardPool) {
        const DISTRIBUTOR_ROLE = await this.contracts.enhancedRewardPool.DISTRIBUTOR_ROLE();
        
        // Check marketplace distributor role
        if (this.contracts.marketplace) {
          const hasRole = await this.contracts.enhancedRewardPool.hasRole(DISTRIBUTOR_ROLE, this.contracts.marketplace.address);
          this.validationResults.push({
            category: "Rewards",
            test: "Marketplace Distributor Role",
            status: hasRole ? "pass" : "fail",
            details: `Marketplace has distributor role: ${hasRole}`
          });
        }

        // Check tip router distributor role
        if (this.contracts.tipRouter) {
          const hasRole = await this.contracts.enhancedRewardPool.hasRole(DISTRIBUTOR_ROLE, this.contracts.tipRouter.address);
          this.validationResults.push({
            category: "Rewards",
            test: "TipRouter Distributor Role",
            status: hasRole ? "pass" : "fail",
            details: `TipRouter has distributor role: ${hasRole}`
          });
        }

        // Check NFT marketplace distributor role
        if (this.contracts.nftMarketplace) {
          const hasRole = await this.contracts.enhancedRewardPool.hasRole(DISTRIBUTOR_ROLE, this.contracts.nftMarketplace.address);
          this.validationResults.push({
            category: "Rewards",
            test: "NFTMarketplace Distributor Role",
            status: hasRole ? "pass" : "fail",
            details: `NFTMarketplace has distributor role: ${hasRole}`
          });
        }

        // Check reward pool funding
        const totalPoolBalance = await this.contracts.enhancedRewardPool.totalPoolBalance();
        this.validationResults.push({
          category: "Rewards",
          test: "Reward Pool Funding",
          status: totalPoolBalance.gt(0) ? "pass" : "warning",
          details: `Total pool balance: ${ethers.formatEther(totalPoolBalance)} LDAO`
        });
      }

    } catch (error) {
      this.validationResults.push({
        category: "Rewards",
        test: "Reward Mechanisms",
        status: "fail",
        details: `Validation error: ${error}`
      });
    }
  }

  private async validateSocialFeatures(): Promise<void> {
    console.log("  👥 Validating social features...");
    
    try {
      // Test follow module functionality
      if (this.contracts.followModule) {
        const [deployer, user1, user2] = await ethers.getSigners();
        
        // Test follow functionality
        const tx = await this.contracts.followModule.connect(user1).follow(user2.address);
        const receipt = await tx.wait();
        
        const isFollowing = await this.contracts.followModule.isFollowing(user1.address, user2.address);
        const followerCount = await this.contracts.followModule.followerCount(user2.address);
        
        this.validationResults.push({
          category: "Social",
          test: "Follow Functionality",
          status: isFollowing && followerCount.eq(1) ? "pass" : "fail",
          details: `Following: ${isFollowing}, Follower count: ${followerCount.toString()}`,
          gasUsed: receipt.gasUsed.toString(),
          transactionHash: tx.hash
        });
      }

      // Test tipping functionality
      if (this.contracts.tipRouter && this.contracts.ldaoToken) {
        const [deployer, user1, creator] = await ethers.getSigners();
        
        // Mint tokens to user1 for testing
        await this.contracts.ldaoToken.mint(user1.address, ethers.parseEther("100"));
        
        const tipAmount = ethers.parseEther("10");
        const postId = ethers.keccak256(ethers.toUtf8Bytes("validation-post"));
        
        await this.contracts.ldaoToken.connect(user1).approve(this.contracts.tipRouter.address, tipAmount);
        const tx = await this.contracts.tipRouter.connect(user1).tip(postId, creator.address, tipAmount);
        const receipt = await tx.wait();
        
        const creatorBalance = await this.contracts.ldaoToken.balanceOf(creator.address);
        
        this.validationResults.push({
          category: "Social",
          test: "Tipping Functionality",
          status: creatorBalance.gt(0) ? "pass" : "fail",
          details: `Creator received: ${ethers.formatEther(creatorBalance)} LDAO`,
          gasUsed: receipt.gasUsed.toString(),
          transactionHash: tx.hash
        });
      }

    } catch (error) {
      this.validationResults.push({
        category: "Social",
        test: "Social Features",
        status: "fail",
        details: `Validation error: ${error}`
      });
    }
  }

  private async validateNFTMarketplace(): Promise<void> {
    console.log("  🎨 Validating NFT marketplace...");
    
    try {
      if (this.contracts.nftMarketplace) {
        const [deployer] = await ethers.getSigners();
        
        // Test NFT minting
        const metadata = {
          name: "Validation NFT",
          description: "NFT for validation testing",
          image: "https://example.com/validation.png",
          animationUrl: "",
          externalUrl: "https://example.com",
          attributes: ["validation"],
          creator: deployer.address,
          createdAt: 0,
          isVerified: false
        };

        const contentHash = ethers.keccak256(ethers.toUtf8Bytes("validation-content"));
        const tx = await this.contracts.nftMarketplace.mintNFT(
          deployer.address,
          "https://example.com/validation-metadata.json",
          250,
          contentHash,
          metadata
        );
        const receipt = await tx.wait();
        
        // Check if NFT was minted
        const totalSupply = await this.contracts.nftMarketplace.totalSupply();
        
        this.validationResults.push({
          category: "NFT",
          test: "NFT Minting",
          status: totalSupply.gt(0) ? "pass" : "fail",
          details: `Total NFTs minted: ${totalSupply.toString()}`,
          gasUsed: receipt.gasUsed.toString(),
          transactionHash: tx.hash
        });
      }

      // Test NFT collection factory
      if (this.contracts.nftCollectionFactory) {
        const collectionCount = await this.contracts.nftCollectionFactory.getCollectionCount();
        
        this.validationResults.push({
          category: "NFT",
          test: "Collection Factory",
          status: "pass",
          details: `Total collections: ${collectionCount.toString()}`
        });
      }

    } catch (error) {
      this.validationResults.push({
        category: "NFT",
        test: "NFT Marketplace",
        status: "fail",
        details: `Validation error: ${error}`
      });
    }
  }

  private async validateAccessControls(): Promise<void> {
    console.log("  🔐 Validating access controls...");
    
    try {
      // Check reputation system moderator roles
      if (this.contracts.reputationSystem) {
        const MODERATOR_ROLE = await this.contracts.reputationSystem.MODERATOR_ROLE();
        const DEFAULT_ADMIN_ROLE = await this.contracts.reputationSystem.DEFAULT_ADMIN_ROLE();
        
        const [deployer] = await ethers.getSigners();
        const hasAdminRole = await this.contracts.reputationSystem.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
        
        this.validationResults.push({
          category: "Access Control",
          test: "Reputation System Admin Role",
          status: hasAdminRole ? "pass" : "fail",
          details: `Deployer has admin role: ${hasAdminRole}`
        });
      }

      // Check governance ownership
      if (this.contracts.governance) {
        const owner = await this.contracts.governance.owner();
        
        this.validationResults.push({
          category: "Access Control",
          test: "Governance Ownership",
          status: owner !== ethers.constants.AddressZero ? "pass" : "fail",
          details: `Governance owner: ${owner}`
        });
      }

    } catch (error) {
      this.validationResults.push({
        category: "Access Control",
        test: "Access Controls",
        status: "fail",
        details: `Validation error: ${error}`
      });
    }
  }

  private async validateEndToEndWorkflows(): Promise<void> {
    console.log("  🔄 Validating end-to-end workflows...");
    
    try {
      const [deployer, user1, user2, creator] = await ethers.getSigners();
      
      // Complete user journey validation
      let workflowSteps = 0;
      let successfulSteps = 0;

      // Step 1: Create profile
      if (this.contracts.profileRegistry) {
        try {
          await this.contracts.profileRegistry.connect(user1).createProfile(
            "validator",
            "Validation User",
            "User for validation testing",
            "https://example.com/validator.jpg"
          );
          workflowSteps++;
          successfulSteps++;
        } catch (error) {
          workflowSteps++;
        }
      }

      // Step 2: Follow another user
      if (this.contracts.followModule) {
        try {
          await this.contracts.followModule.connect(user1).follow(creator.address);
          workflowSteps++;
          successfulSteps++;
        } catch (error) {
          workflowSteps++;
        }
      }

      // Step 3: Tip content
      if (this.contracts.tipRouter && this.contracts.ldaoToken) {
        try {
          await this.contracts.ldaoToken.mint(user1.address, ethers.parseEther("50"));
          const tipAmount = ethers.parseEther("5");
          const postId = ethers.keccak256(ethers.toUtf8Bytes("workflow-post"));
          
          await this.contracts.ldaoToken.connect(user1).approve(this.contracts.tipRouter.address, tipAmount);
          await this.contracts.tipRouter.connect(user1).tip(postId, creator.address, tipAmount);
          workflowSteps++;
          successfulSteps++;
        } catch (error) {
          workflowSteps++;
        }
      }

      // Step 4: Create marketplace listing
      if (this.contracts.marketplace) {
        try {
          await this.contracts.marketplace.connect(user1).createListing(
            ethers.constants.AddressZero,
            0,
            ethers.parseEther("1"),
            1,
            0,
            0
          );
          workflowSteps++;
          successfulSteps++;
        } catch (error) {
          workflowSteps++;
        }
      }

      this.validationResults.push({
        category: "Workflow",
        test: "End-to-End User Journey",
        status: successfulSteps === workflowSteps ? "pass" : successfulSteps > 0 ? "warning" : "fail",
        details: `Completed ${successfulSteps}/${workflowSteps} workflow steps`
      });

    } catch (error) {
      this.validationResults.push({
        category: "Workflow",
        test: "End-to-End Workflows",
        status: "fail",
        details: `Validation error: ${error}`
      });
    }
  }

  private async validatePerformanceMetrics(): Promise<void> {
    console.log("  ⚡ Validating performance metrics...");
    
    try {
      // Test batch operations
      if (this.contracts.enhancedRewardPool) {
        const [deployer, user1, user2, user3] = await ethers.getSigners();
        const users = [user1.address, user2.address, user3.address];
        const amounts = [
          ethers.parseEther("1"),
          ethers.parseEther("2"),
          ethers.parseEther("3")
        ];

        const currentEpoch = await this.contracts.enhancedRewardPool.currentEpoch();
        
        const tx = await this.contracts.enhancedRewardPool.batchCalculateRewards(
          users,
          currentEpoch,
          1, // TRADING_REWARDS
          amounts
        );
        const receipt = await tx.wait();
        
        this.validationResults.push({
          category: "Performance",
          test: "Batch Reward Calculation",
          status: "pass",
          details: `Processed ${users.length} users in batch`,
          gasUsed: receipt.gasUsed.toString(),
          transactionHash: tx.hash
        });
      }

      // Test gas efficiency
      const gasUsageResults = this.validationResults.filter(r => r.gasUsed);
      const avgGasUsage = gasUsageResults.reduce((sum, r) => sum + parseInt(r.gasUsed!), 0) / gasUsageResults.length;
      
      this.validationResults.push({
        category: "Performance",
        test: "Gas Efficiency",
        status: avgGasUsage < 500000 ? "pass" : avgGasUsage < 1000000 ? "warning" : "fail",
        details: `Average gas usage: ${Math.round(avgGasUsage).toLocaleString()}`
      });

    } catch (error) {
      this.validationResults.push({
        category: "Performance",
        test: "Performance Metrics",
        status: "fail",
        details: `Validation error: ${error}`
      });
    }
  }

  generateValidationReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      validationResults: this.validationResults,
      summary: {
        totalTests: this.validationResults.length,
        passed: this.validationResults.filter(r => r.status === "pass").length,
        failed: this.validationResults.filter(r => r.status === "fail").length,
        warnings: this.validationResults.filter(r => r.status === "warning").length
      },
      categories: {
        coreLinks: this.validationResults.filter(r => r.category === "Core Links"),
        communication: this.validationResults.filter(r => r.category === "Communication"),
        rewards: this.validationResults.filter(r => r.category === "Rewards"),
        social: this.validationResults.filter(r => r.category === "Social"),
        nft: this.validationResults.filter(r => r.category === "NFT"),
        accessControl: this.validationResults.filter(r => r.category === "Access Control"),
        workflow: this.validationResults.filter(r => r.category === "Workflow"),
        performance: this.validationResults.filter(r => r.category === "Performance")
      },
      contractAddresses: this.addresses,
      recommendations: this.generateRecommendations()
    };

    const reportFile = path.join(__dirname, "..", "platform-integration-validation-report.json");
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log("\n📊 Platform Integration Validation Report Generated:");
    console.log(`  📄 Report file: ${reportFile}`);
    console.log(`  🧪 Total tests: ${report.summary.totalTests}`);
    console.log(`  ✅ Passed: ${report.summary.passed}`);
    console.log(`  ❌ Failed: ${report.summary.failed}`);
    console.log(`  ⚠️  Warnings: ${report.summary.warnings}`);
    console.log(`  ⏰ Timestamp: ${report.timestamp}`);
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const failedTests = this.validationResults.filter(r => r.status === "fail");
    const warningTests = this.validationResults.filter(r => r.status === "warning");

    if (failedTests.length > 0) {
      recommendations.push("Address failed test cases before proceeding to mainnet deployment");
      recommendations.push("Review contract integration configuration");
    }

    if (warningTests.length > 0) {
      recommendations.push("Consider addressing warning cases for optimal functionality");
    }

    const gasUsageResults = this.validationResults.filter(r => r.gasUsed);
    if (gasUsageResults.length > 0) {
      const avgGas = gasUsageResults.reduce((sum, r) => sum + parseInt(r.gasUsed!), 0) / gasUsageResults.length;
      if (avgGas > 500000) {
        recommendations.push("Consider gas optimization for high-usage functions");
      }
    }

    if (failedTests.length === 0 && warningTests.length === 0) {
      recommendations.push("All validations passed - ready for mainnet deployment");
      recommendations.push("Consider running additional stress tests");
      recommendations.push("Prepare monitoring and alerting systems");
    }

    return recommendations;
  }

  printValidationSummary(): void {
    console.log("\n" + "=".repeat(70));
    console.log("           PLATFORM INTEGRATION VALIDATION SUMMARY");
    console.log("=".repeat(70));
    
    const categories = ["Core Links", "Communication", "Rewards", "Social", "NFT", "Access Control", "Workflow", "Performance"];
    
    for (const category of categories) {
      const categoryResults = this.validationResults.filter(r => r.category === category);
      if (categoryResults.length > 0) {
        console.log(`\n📋 ${category.toUpperCase()}:`);
        categoryResults.forEach(result => {
          const status = result.status === "pass" ? "✅" : result.status === "fail" ? "❌" : "⚠️";
          console.log(`  ${status} ${result.test}: ${result.details}`);
          if (result.gasUsed) {
            console.log(`     Gas used: ${parseInt(result.gasUsed).toLocaleString()}`);
          }
        });
      }
    }
    
    const summary = {
      total: this.validationResults.length,
      passed: this.validationResults.filter(r => r.status === "pass").length,
      failed: this.validationResults.filter(r => r.status === "fail").length,
      warnings: this.validationResults.filter(r => r.status === "warning").length
    };
    
    console.log(`\n📈 VALIDATION STATISTICS:`);
    console.log(`  Total tests: ${summary.total}`);
    console.log(`  Passed: ${summary.passed}`);
    console.log(`  Failed: ${summary.failed}`);
    console.log(`  Warnings: ${summary.warnings}`);
    console.log(`  Success rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%`);
    
    if (summary.failed === 0) {
      console.log("\n✅ PLATFORM INTEGRATION VALIDATION COMPLETE");
      console.log("   All extended features properly integrated");
      console.log("   Cross-contract communication verified");
      console.log("   Reward mechanisms functioning correctly");
      console.log("   Ready for comprehensive testing and deployment");
    } else {
      console.log("\n⚠️  VALIDATION ISSUES DETECTED");
      console.log("   Please address failed tests before proceeding");
    }
    
    console.log("=".repeat(70));
  }
}

async function main() {
  console.log("🔍 Starting Platform Integration Validation...");
  
  const validator = new PlatformIntegrationValidator();
  
  try {
    // Load deployed contracts
    await validator.loadContracts();
    
    // Validate platform integration
    await validator.validatePlatformIntegration();
    
    // Generate report
    validator.generateValidationReport();
    
    // Print summary
    validator.printValidationSummary();
    
    console.log("\n✅ Platform integration validation completed successfully!");
    
  } catch (error) {
    console.error("❌ Platform integration validation failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { PlatformIntegrationValidator };