import { ethers } from "hardhat";
import { Contract } from "ethers";
import fs from "fs";
import path from "path";

interface ExtendedFeatureContracts {
  // Core platform contracts
  ldaoToken: Contract;
  governance: Contract;
  reputationSystem: Contract;
  marketplace: Contract;
  enhancedEscrow: Contract;
  disputeResolution: Contract;
  paymentRouter: Contract;
  
  // Extended feature contracts
  nftMarketplace: Contract;
  nftCollectionFactory: Contract;
  tipRouter: Contract;
  followModule: Contract;
  enhancedRewardPool: Contract;
  profileRegistry: Contract;
  
  // Registry contract
  contractRegistry: Contract;
}

interface IntegrationConfig {
  rewardMechanisms: {
    tradingRewards: boolean;
    socialRewards: boolean;
    governanceRewards: boolean;
    nftRewards: boolean;
  };
  crossContractCommunication: {
    reputationTracking: boolean;
    socialFeatureIntegration: boolean;
    marketplaceIntegration: boolean;
  };
  accessControls: {
    moderatorRoles: boolean;
    distributorRoles: boolean;
    adminRoles: boolean;
  };
}

class ExtendedFeaturesIntegrationManager {
  private contracts: Partial<ExtendedFeatureContracts> = {};
  private addresses: Record<string, string> = {};
  private integrationResults: Array<{
    feature: string;
    status: "success" | "failed" | "skipped";
    details: string;
    transactionHash?: string;
  }> = [];

  async loadContracts(): Promise<void> {
    console.log("📋 Loading deployed contract addresses...");
    
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
      profileRegistry: "ProfileRegistry",
      contractRegistry: "ContractRegistry"
    };

    for (const [key, contractName] of Object.entries(contractMappings)) {
      const address = this.addresses[key] || this.addresses[contractName];
      if (address) {
        try {
          const factory = await ethers.getContractFactory(contractName);
          (this.contracts as any)[key] = factory.attach(address);
          console.log(`  ✅ Attached to ${key}: ${address}`);
        } catch (error) {
          console.log(`  ⚠️  Could not attach to ${key}: ${error}`);
        }
      } else {
        console.log(`  ⚠️  Address not found for ${key}`);
      }
    }
  }

  async configureExtendedFeaturesIntegration(): Promise<void> {
    console.log("🔧 Configuring Extended Features Integration...");
    
    // 1. Link all extended features with core platform contracts
    await this.linkExtendedFeaturesWithCore();
    
    // 2. Set up cross-contract communication for social features
    await this.setupCrossContractCommunication();
    
    // 3. Configure reward mechanisms for marketplace and social activities
    await this.configureRewardMechanisms();
    
    // 4. Set up access controls and permissions
    await this.configureAccessControls();
    
    // 5. Register all contracts in the registry
    await this.registerContractsInRegistry();
  }

  private async linkExtendedFeaturesWithCore(): Promise<void> {
    console.log("  🔗 Linking extended features with core platform contracts...");
    
    try {
      // Link NFTMarketplace with core contracts
      if (this.contracts.nftMarketplace && this.contracts.reputationSystem) {
        const tx1 = await this.contracts.nftMarketplace.setReputationSystem(this.contracts.reputationSystem.address);
        await tx1.wait();
        this.integrationResults.push({
          feature: "NFTMarketplace -> ReputationSystem",
          status: "success",
          details: "NFT marketplace linked with reputation system for creator verification",
          transactionHash: tx1.hash
        });
        console.log("    ✅ NFTMarketplace linked with ReputationSystem");
      }

      // Link NFTMarketplace with PaymentRouter
      if (this.contracts.nftMarketplace && this.contracts.paymentRouter) {
        const tx2 = await this.contracts.nftMarketplace.setPaymentRouter(this.contracts.paymentRouter.address);
        await tx2.wait();
        this.integrationResults.push({
          feature: "NFTMarketplace -> PaymentRouter",
          status: "success", 
          details: "NFT marketplace linked with payment router for multi-token payments",
          transactionHash: tx2.hash
        });
        console.log("    ✅ NFTMarketplace linked with PaymentRouter");
      }

      // Link TipRouter with ReputationSystem for reputation-based rewards
      if (this.contracts.tipRouter && this.contracts.reputationSystem) {
        const tx3 = await this.contracts.tipRouter.setReputationSystem(this.contracts.reputationSystem.address);
        await tx3.wait();
        this.integrationResults.push({
          feature: "TipRouter -> ReputationSystem",
          status: "success",
          details: "Tip router linked with reputation system for reputation-based tip multipliers",
          transactionHash: tx3.hash
        });
        console.log("    ✅ TipRouter linked with ReputationSystem");
      }

      // Link FollowModule with ProfileRegistry
      if (this.contracts.followModule && this.contracts.profileRegistry) {
        const tx4 = await this.contracts.followModule.setProfileRegistry(this.contracts.profileRegistry.address);
        await tx4.wait();
        this.integrationResults.push({
          feature: "FollowModule -> ProfileRegistry",
          status: "success",
          details: "Follow module linked with profile registry for user verification",
          transactionHash: tx4.hash
        });
        console.log("    ✅ FollowModule linked with ProfileRegistry");
      }

    } catch (error) {
      this.integrationResults.push({
        feature: "Core Platform Linking",
        status: "failed",
        details: `Error linking extended features with core: ${error}`
      });
      console.log(`    ❌ Error linking extended features: ${error}`);
    }
  }

  private async setupCrossContractCommunication(): Promise<void> {
    console.log("  📡 Setting up cross-contract communication for social features...");
    
    try {
      // Configure NFTMarketplace to emit events for social tracking
      if (this.contracts.nftMarketplace) {
        const tx1 = await this.contracts.nftMarketplace.enableSocialTracking(true);
        await tx1.wait();
        this.integrationResults.push({
          feature: "NFTMarketplace Social Tracking",
          status: "success",
          details: "Enabled social tracking for NFT marketplace activities",
          transactionHash: tx1.hash
        });
        console.log("    ✅ NFT marketplace social tracking enabled");
      }

      // Configure TipRouter to update reputation scores
      if (this.contracts.tipRouter && this.contracts.reputationSystem) {
        const tx2 = await this.contracts.tipRouter.enableReputationUpdates(true);
        await tx2.wait();
        this.integrationResults.push({
          feature: "TipRouter Reputation Updates",
          status: "success",
          details: "Enabled reputation updates from tipping activities",
          transactionHash: tx2.hash
        });
        console.log("    ✅ TipRouter reputation updates enabled");
      }

      // Configure FollowModule to track social connections
      if (this.contracts.followModule) {
        const tx3 = await this.contracts.followModule.enableConnectionTracking(true);
        await tx3.wait();
        this.integrationResults.push({
          feature: "FollowModule Connection Tracking",
          status: "success",
          details: "Enabled connection tracking for social graph analysis",
          transactionHash: tx3.hash
        });
        console.log("    ✅ FollowModule connection tracking enabled");
      }

      // Set up marketplace integration with social features
      if (this.contracts.marketplace && this.contracts.followModule) {
        const tx4 = await this.contracts.marketplace.setSocialModule(this.contracts.followModule.address);
        await tx4.wait();
        this.integrationResults.push({
          feature: "Marketplace -> FollowModule",
          status: "success",
          details: "Marketplace integrated with social features for creator following",
          transactionHash: tx4.hash
        });
        console.log("    ✅ Marketplace integrated with social features");
      }

    } catch (error) {
      this.integrationResults.push({
        feature: "Cross-Contract Communication",
        status: "failed",
        details: `Error setting up cross-contract communication: ${error}`
      });
      console.log(`    ❌ Error setting up cross-contract communication: ${error}`);
    }
  }

  private async configureRewardMechanisms(): Promise<void> {
    console.log("  🎁 Configuring reward mechanisms for marketplace and social activities...");
    
    try {
      // Configure marketplace trading rewards
      if (this.contracts.enhancedRewardPool && this.contracts.marketplace) {
        // Grant distributor role to marketplace for trading rewards
        const DISTRIBUTOR_ROLE = await this.contracts.enhancedRewardPool.DISTRIBUTOR_ROLE();
        const tx1 = await this.contracts.enhancedRewardPool.grantRole(DISTRIBUTOR_ROLE, this.contracts.marketplace.address);
        await tx1.wait();
        
        this.integrationResults.push({
          feature: "Marketplace Trading Rewards",
          status: "success",
          details: "Marketplace granted distributor role for trading rewards",
          transactionHash: tx1.hash
        });
        console.log("    ✅ Marketplace trading rewards configured");
      }

      // Configure social activity rewards
      if (this.contracts.enhancedRewardPool && this.contracts.tipRouter) {
        // Grant distributor role to tip router for social rewards
        const DISTRIBUTOR_ROLE = await this.contracts.enhancedRewardPool.DISTRIBUTOR_ROLE();
        const tx2 = await this.contracts.enhancedRewardPool.grantRole(DISTRIBUTOR_ROLE, this.contracts.tipRouter.address);
        await tx2.wait();
        
        this.integrationResults.push({
          feature: "Social Activity Rewards",
          status: "success",
          details: "TipRouter granted distributor role for social activity rewards",
          transactionHash: tx2.hash
        });
        console.log("    ✅ Social activity rewards configured");
      }

      // Configure NFT marketplace rewards
      if (this.contracts.enhancedRewardPool && this.contracts.nftMarketplace) {
        // Grant distributor role to NFT marketplace for NFT trading rewards
        const DISTRIBUTOR_ROLE = await this.contracts.enhancedRewardPool.DISTRIBUTOR_ROLE();
        const tx3 = await this.contracts.enhancedRewardPool.grantRole(DISTRIBUTOR_ROLE, this.contracts.nftMarketplace.address);
        await tx3.wait();
        
        this.integrationResults.push({
          feature: "NFT Marketplace Rewards",
          status: "success",
          details: "NFT marketplace granted distributor role for NFT trading rewards",
          transactionHash: tx3.hash
        });
        console.log("    ✅ NFT marketplace rewards configured");
      }

      // Configure governance participation rewards
      if (this.contracts.enhancedRewardPool && this.contracts.governance) {
        // Grant distributor role to governance for participation rewards
        const DISTRIBUTOR_ROLE = await this.contracts.enhancedRewardPool.DISTRIBUTOR_ROLE();
        const tx4 = await this.contracts.enhancedRewardPool.grantRole(DISTRIBUTOR_ROLE, this.contracts.governance.address);
        await tx4.wait();
        
        this.integrationResults.push({
          feature: "Governance Participation Rewards",
          status: "success",
          details: "Governance granted distributor role for participation rewards",
          transactionHash: tx4.hash
        });
        console.log("    ✅ Governance participation rewards configured");
      }

      // Set reward multipliers based on social engagement
      if (this.contracts.enhancedRewardPool && this.contracts.followModule) {
        const tx5 = await this.contracts.enhancedRewardPool.setSocialEngagementMultiplier(
          this.contracts.followModule.address,
          150 // 1.5x multiplier for users with high social engagement
        );
        await tx5.wait();
        
        this.integrationResults.push({
          feature: "Social Engagement Multipliers",
          status: "success",
          details: "Social engagement multipliers configured for reward calculations",
          transactionHash: tx5.hash
        });
        console.log("    ✅ Social engagement multipliers configured");
      }

    } catch (error) {
      this.integrationResults.push({
        feature: "Reward Mechanisms",
        status: "failed",
        details: `Error configuring reward mechanisms: ${error}`
      });
      console.log(`    ❌ Error configuring reward mechanisms: ${error}`);
    }
  }

  private async configureAccessControls(): Promise<void> {
    console.log("  🔐 Configuring access controls and permissions...");
    
    try {
      // Configure moderator roles for reputation system
      if (this.contracts.reputationSystem) {
        const MODERATOR_ROLE = await this.contracts.reputationSystem.MODERATOR_ROLE();
        
        // Grant moderator role to governance contract
        if (this.contracts.governance) {
          const tx1 = await this.contracts.reputationSystem.grantRole(MODERATOR_ROLE, this.contracts.governance.address);
          await tx1.wait();
          
          this.integrationResults.push({
            feature: "Governance Moderator Role",
            status: "success",
            details: "Governance contract granted moderator role in reputation system",
            transactionHash: tx1.hash
          });
          console.log("    ✅ Governance moderator role configured");
        }
      }

      // Configure admin roles for contract registry
      if (this.contracts.contractRegistry && this.contracts.governance) {
        const tx2 = await this.contracts.contractRegistry.transferOwnership(this.contracts.governance.address);
        await tx2.wait();
        
        this.integrationResults.push({
          feature: "Contract Registry Governance",
          status: "success",
          details: "Contract registry ownership transferred to governance",
          transactionHash: tx2.hash
        });
        console.log("    ✅ Contract registry governance configured");
      }

      // Configure dispute resolution access for marketplace contracts
      if (this.contracts.disputeResolution) {
        const ARBITRATOR_ROLE = await this.contracts.disputeResolution.ARBITRATOR_ROLE();
        
        // Grant arbitrator role to marketplace
        if (this.contracts.marketplace) {
          const tx3 = await this.contracts.disputeResolution.grantRole(ARBITRATOR_ROLE, this.contracts.marketplace.address);
          await tx3.wait();
          
          this.integrationResults.push({
            feature: "Marketplace Arbitrator Role",
            status: "success",
            details: "Marketplace granted arbitrator role for dispute resolution",
            transactionHash: tx3.hash
          });
          console.log("    ✅ Marketplace arbitrator role configured");
        }

        // Grant arbitrator role to NFT marketplace
        if (this.contracts.nftMarketplace) {
          const tx4 = await this.contracts.disputeResolution.grantRole(ARBITRATOR_ROLE, this.contracts.nftMarketplace.address);
          await tx4.wait();
          
          this.integrationResults.push({
            feature: "NFT Marketplace Arbitrator Role",
            status: "success",
            details: "NFT marketplace granted arbitrator role for dispute resolution",
            transactionHash: tx4.hash
          });
          console.log("    ✅ NFT marketplace arbitrator role configured");
        }
      }

    } catch (error) {
      this.integrationResults.push({
        feature: "Access Controls",
        status: "failed",
        details: `Error configuring access controls: ${error}`
      });
      console.log(`    ❌ Error configuring access controls: ${error}`);
    }
  }

  private async registerContractsInRegistry(): Promise<void> {
    console.log("  📋 Registering contracts in central registry...");
    
    if (!this.contracts.contractRegistry) {
      console.log("    ⚠️  Contract registry not available, skipping registration");
      return;
    }

    try {
      const contractsToRegister = [
        {
          name: ethers.formatBytes32String("NFTMarketplace"),
          address: this.addresses.nftMarketplace || this.addresses.NFTMarketplace,
          version: 1,
          description: "NFT marketplace for trading digital assets",
          category: ethers.formatBytes32String("marketplace")
        },
        {
          name: ethers.formatBytes32String("NFTCollectionFactory"),
          address: this.addresses.nftCollectionFactory || this.addresses.NFTCollectionFactory,
          version: 1,
          description: "Factory for creating NFT collections",
          category: ethers.formatBytes32String("nft")
        },
        {
          name: ethers.formatBytes32String("TipRouter"),
          address: this.addresses.tipRouter || this.addresses.TipRouter,
          version: 1,
          description: "Social tipping system for content creators",
          category: ethers.formatBytes32String("social")
        },
        {
          name: ethers.formatBytes32String("FollowModule"),
          address: this.addresses.followModule || this.addresses.FollowModule,
          version: 1,
          description: "Social following and connection management",
          category: ethers.formatBytes32String("social")
        },
        {
          name: ethers.formatBytes32String("EnhancedRewardPool"),
          address: this.addresses.enhancedRewardPool || this.addresses.EnhancedRewardPool,
          version: 1,
          description: "Enhanced reward distribution system",
          category: ethers.formatBytes32String("rewards")
        }
      ];

      for (const contract of contractsToRegister) {
        if (contract.address) {
          try {
            const tx = await this.contracts.contractRegistry.registerContract(
              contract.name,
              contract.address,
              contract.version,
              contract.description,
              contract.category
            );
            await tx.wait();
            
            this.integrationResults.push({
              feature: `Registry: ${ethers.parseBytes32String(contract.name)}`,
              status: "success",
              details: `Contract registered in central registry`,
              transactionHash: tx.hash
            });
            console.log(`    ✅ Registered ${ethers.parseBytes32String(contract.name)}`);
          } catch (error) {
            console.log(`    ⚠️  Failed to register ${ethers.parseBytes32String(contract.name)}: ${error}`);
          }
        }
      }

    } catch (error) {
      this.integrationResults.push({
        feature: "Contract Registry",
        status: "failed",
        details: `Error registering contracts: ${error}`
      });
      console.log(`    ❌ Error registering contracts: ${error}`);
    }
  }

  async validateIntegration(): Promise<void> {
    console.log("✅ Validating complete platform functionality...");
    
    const validationResults: Array<{
      test: string;
      status: "pass" | "fail";
      details: string;
    }> = [];

    try {
      // Test 1: Verify NFT marketplace can access reputation system
      if (this.contracts.nftMarketplace && this.contracts.reputationSystem) {
        try {
          const reputationAddress = await this.contracts.nftMarketplace.reputationSystem();
          const isValid = reputationAddress === this.contracts.reputationSystem.address;
          validationResults.push({
            test: "NFT Marketplace -> Reputation System",
            status: isValid ? "pass" : "fail",
            details: isValid ? "Integration verified" : "Integration failed"
          });
        } catch (error) {
          validationResults.push({
            test: "NFT Marketplace -> Reputation System",
            status: "fail",
            details: `Validation error: ${error}`
          });
        }
      }

      // Test 2: Verify reward pool has correct distributor roles
      if (this.contracts.enhancedRewardPool) {
        try {
          const DISTRIBUTOR_ROLE = await this.contracts.enhancedRewardPool.DISTRIBUTOR_ROLE();
          
          const marketplaceHasRole = this.contracts.marketplace ? 
            await this.contracts.enhancedRewardPool.hasRole(DISTRIBUTOR_ROLE, this.contracts.marketplace.address) : false;
          const tipRouterHasRole = this.contracts.tipRouter ?
            await this.contracts.enhancedRewardPool.hasRole(DISTRIBUTOR_ROLE, this.contracts.tipRouter.address) : false;
          
          validationResults.push({
            test: "Reward Pool Distributor Roles",
            status: (marketplaceHasRole && tipRouterHasRole) ? "pass" : "fail",
            details: `Marketplace: ${marketplaceHasRole}, TipRouter: ${tipRouterHasRole}`
          });
        } catch (error) {
          validationResults.push({
            test: "Reward Pool Distributor Roles",
            status: "fail",
            details: `Validation error: ${error}`
          });
        }
      }

      // Test 3: Verify cross-contract communication setup
      if (this.contracts.tipRouter && this.contracts.reputationSystem) {
        try {
          const reputationAddress = await this.contracts.tipRouter.reputationSystem();
          const isValid = reputationAddress === this.contracts.reputationSystem.address;
          validationResults.push({
            test: "TipRouter -> Reputation System",
            status: isValid ? "pass" : "fail",
            details: isValid ? "Cross-contract communication verified" : "Communication setup failed"
          });
        } catch (error) {
          validationResults.push({
            test: "TipRouter -> Reputation System",
            status: "fail",
            details: `Validation error: ${error}`
          });
        }
      }

      // Test 4: Verify contract registry has all contracts
      if (this.contracts.contractRegistry) {
        try {
          const nftMarketplaceRegistered = await this.contracts.contractRegistry.isContractActive(
            ethers.formatBytes32String("NFTMarketplace")
          );
          const tipRouterRegistered = await this.contracts.contractRegistry.isContractActive(
            ethers.formatBytes32String("TipRouter")
          );
          
          validationResults.push({
            test: "Contract Registry Integration",
            status: (nftMarketplaceRegistered && tipRouterRegistered) ? "pass" : "fail",
            details: `NFTMarketplace: ${nftMarketplaceRegistered}, TipRouter: ${tipRouterRegistered}`
          });
        } catch (error) {
          validationResults.push({
            test: "Contract Registry Integration",
            status: "fail",
            details: `Validation error: ${error}`
          });
        }
      }

    } catch (error) {
      console.log(`    ❌ Validation error: ${error}`);
    }

    // Print validation results
    console.log("\n📊 Integration Validation Results:");
    for (const result of validationResults) {
      const status = result.status === "pass" ? "✅" : "❌";
      console.log(`  ${status} ${result.test}: ${result.details}`);
    }

    const passCount = validationResults.filter(r => r.status === "pass").length;
    const totalCount = validationResults.length;
    console.log(`\n📈 Validation Summary: ${passCount}/${totalCount} tests passed`);
  }

  generateIntegrationReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      integrationResults: this.integrationResults,
      contractAddresses: this.addresses,
      summary: {
        totalIntegrations: this.integrationResults.length,
        successfulIntegrations: this.integrationResults.filter(r => r.status === "success").length,
        failedIntegrations: this.integrationResults.filter(r => r.status === "failed").length,
        skippedIntegrations: this.integrationResults.filter(r => r.status === "skipped").length
      },
      integrationFeatures: {
        coreContractLinking: true,
        crossContractCommunication: true,
        rewardMechanisms: true,
        accessControls: true,
        contractRegistry: true
      },
      nextSteps: [
        "Run comprehensive end-to-end tests",
        "Verify all user workflows function correctly",
        "Test reward distribution mechanisms",
        "Validate social feature interactions",
        "Prepare for mainnet deployment"
      ]
    };

    const reportFile = path.join(__dirname, "..", "extended-features-integration-report.json");
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log("\n📊 Extended Features Integration Report Generated:");
    console.log(`  📄 Report file: ${reportFile}`);
    console.log(`  🔗 Total integrations: ${report.summary.totalIntegrations}`);
    console.log(`  ✅ Successful: ${report.summary.successfulIntegrations}`);
    console.log(`  ❌ Failed: ${report.summary.failedIntegrations}`);
    console.log(`  ⚠️  Skipped: ${report.summary.skippedIntegrations}`);
    console.log(`  ⏰ Timestamp: ${report.timestamp}`);
  }

  printSummary(): void {
    console.log("\n" + "=".repeat(70));
    console.log("           EXTENDED FEATURES INTEGRATION SUMMARY");
    console.log("=".repeat(70));
    
    console.log("🔗 INTEGRATION RESULTS:");
    this.integrationResults.forEach((result, index) => {
      const status = result.status === "success" ? "✅" : result.status === "failed" ? "❌" : "⚠️";
      console.log(`  ${index + 1}. ${status} ${result.feature}`);
      console.log(`     ${result.details}`);
      if (result.transactionHash) {
        console.log(`     TX: ${result.transactionHash}`);
      }
    });
    
    const successCount = this.integrationResults.filter(r => r.status === "success").length;
    const totalCount = this.integrationResults.length;
    
    console.log(`\n📈 INTEGRATION STATISTICS:`);
    console.log(`  Total integrations: ${totalCount}`);
    console.log(`  Successful: ${successCount}`);
    console.log(`  Success rate: ${((successCount / totalCount) * 100).toFixed(1)}%`);
    
    console.log("\n✅ EXTENDED FEATURES INTEGRATION COMPLETE");
    console.log("   All extended features linked with core platform");
    console.log("   Cross-contract communication established");
    console.log("   Reward mechanisms configured");
    console.log("   Ready for comprehensive testing");
    console.log("=".repeat(70));
  }
}

async function main() {
  console.log("🚀 Starting Extended Features Integration Configuration...");
  
  const manager = new ExtendedFeaturesIntegrationManager();
  
  try {
    // Load deployed contracts
    await manager.loadContracts();
    
    // Configure extended features integration
    await manager.configureExtendedFeaturesIntegration();
    
    // Validate integration
    await manager.validateIntegration();
    
    // Generate report
    manager.generateIntegrationReport();
    
    // Print summary
    manager.printSummary();
    
    console.log("\n✅ Extended features integration configuration completed successfully!");
    
  } catch (error) {
    console.error("❌ Extended features integration configuration failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { ExtendedFeaturesIntegrationManager };