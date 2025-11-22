import { ethers } from "hardhat";
import { Contract } from "ethers";
import fs from "fs";
import path from "path";

interface GasReport {
  contractName: string;
  functionName: string;
  gasUsed: number;
  optimizedGas?: number;
  savings?: number;
  savingsPercent?: number;
}

interface OptimizationResult {
  totalSavings: number;
  averageSavings: number;
  reports: GasReport[];
  recommendations: string[];
}

class GasOptimizer {
  private gasReports: GasReport[] = [];
  private recommendations: string[] = [];

  async analyzeContract(contractName: string, contractAddress?: string): Promise<GasReport[]> {
    console.log(`\n🔍 Analyzing gas usage for ${contractName}...`);
    
    try {
      const contractFactory = await ethers.getContractFactory(contractName);
      let contract: Contract;
      
      if (contractAddress) {
        contract = contractFactory.attach(contractAddress);
      } else {
        // Deploy for testing
        const [deployer] = await ethers.getSigners();
        
        // Handle different constructor parameters
        switch (contractName) {
          case "LDAOToken":
            contract = await contractFactory.deploy(deployer.address);
            break;
          case "PaymentRouter":
            contract = await contractFactory.deploy(250, deployer.address);
            break;
          case "Governance":
            // Need LDAO token first
            const ldaoFactory = await ethers.getContractFactory("LDAOToken");
            const ldaoToken = await ldaoFactory.deploy(deployer.address);
            await ldaoToken.deployed();
            contract = await contractFactory.deploy(ldaoToken.address);
            break;
          default:
            contract = await contractFactory.deploy();
        }
        
        await contract.deployed();
      }
      
      const reports = await this.measureGasUsage(contract, contractName);
      this.gasReports.push(...reports);
      
      return reports;
    } catch (error) {
      console.error(`❌ Error analyzing ${contractName}:`, error);
      return [];
    }
  }

  private async measureGasUsage(contract: Contract, contractName: string): Promise<GasReport[]> {
    const reports: GasReport[] = [];
    const [deployer, user1, user2] = await ethers.getSigners();
    
    try {
      switch (contractName) {
        case "LDAOToken":
          reports.push(...await this.measureLDAOTokenGas(contract, deployer, user1, user2));
          break;
        case "PaymentRouter":
          reports.push(...await this.measurePaymentRouterGas(contract, deployer, user1, user2));
          break;
        case "Marketplace":
          reports.push(...await this.measureMarketplaceGas(contract, deployer, user1, user2));
          break;
        case "EnhancedEscrow":
          reports.push(...await this.measureEscrowGas(contract, deployer, user1, user2));
          break;
        default:
          console.log(`⚠️  No specific gas measurements for ${contractName}`);
      }
    } catch (error) {
      console.error(`Error measuring gas for ${contractName}:`, error);
    }
    
    return reports;
  }

  private async measureLDAOTokenGas(
    contract: Contract, 
    deployer: any, 
    user1: any, 
    user2: any
  ): Promise<GasReport[]> {
    const reports: GasReport[] = [];
    const amount = ethers.parseEther("1000");
    
    try {
      // Transfer
      await contract.transfer(user1.address, amount);
      const transferTx = await contract.connect(user1).transfer(user2.address, ethers.parseEther("100"));
      const transferReceipt = await transferTx.wait();
      
      reports.push({
        contractName: "LDAOToken",
        functionName: "transfer",
        gasUsed: transferReceipt.gasUsed.toNumber()
      });
      
      // Staking
      const stakeTx = await contract.connect(user1).stake(ethers.parseEther("500"), 1);
      const stakeReceipt = await stakeTx.wait();
      
      reports.push({
        contractName: "LDAOToken",
        functionName: "stake",
        gasUsed: stakeReceipt.gasUsed.toNumber()
      });
      
      // Reward claiming
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
      await ethers.provider.send("evm_mine", []);
      
      const claimTx = await contract.connect(user1).claimRewards();
      const claimReceipt = await claimTx.wait();
      
      reports.push({
        contractName: "LDAOToken",
        functionName: "claimRewards",
        gasUsed: claimReceipt.gasUsed.toNumber()
      });
      
    } catch (error) {
      console.error("Error measuring LDAO token gas:", error);
    }
    
    return reports;
  }

  private async measurePaymentRouterGas(
    contract: Contract,
    deployer: any,
    user1: any,
    user2: any
  ): Promise<GasReport[]> {
    const reports: GasReport[] = [];
    const amount = ethers.parseEther("1");
    
    try {
      // ETH payment
      const ethPaymentTx = await contract.connect(user1).processPayment(
        ethers.constants.AddressZero,
        amount,
        user2.address,
        { value: amount }
      );
      const ethPaymentReceipt = await ethPaymentTx.wait();
      
      reports.push({
        contractName: "PaymentRouter",
        functionName: "processPayment (ETH)",
        gasUsed: ethPaymentReceipt.gasUsed.toNumber()
      });
      
    } catch (error) {
      console.error("Error measuring PaymentRouter gas:", error);
    }
    
    return reports;
  }

  private async measureMarketplaceGas(
    contract: Contract,
    deployer: any,
    user1: any,
    user2: any
  ): Promise<GasReport[]> {
    const reports: GasReport[] = [];
    const price = ethers.parseEther("1");
    
    try {
      // Create listing
      const listingTx = await contract.connect(user1).createListing(
        ethers.constants.AddressZero,
        0,
        price,
        1,
        0,
        0
      );
      const listingReceipt = await listingTx.wait();
      
      reports.push({
        contractName: "Marketplace",
        functionName: "createListing",
        gasUsed: listingReceipt.gasUsed.toNumber()
      });
      
      // Purchase item
      const listingId = listingReceipt.events?.[0]?.args?.listingId || 1;
      const purchaseTx = await contract.connect(user2).purchaseItem(
        listingId,
        1,
        { value: price }
      );
      const purchaseReceipt = await purchaseTx.wait();
      
      reports.push({
        contractName: "Marketplace",
        functionName: "purchaseItem",
        gasUsed: purchaseReceipt.gasUsed.toNumber()
      });
      
    } catch (error) {
      console.error("Error measuring Marketplace gas:", error);
    }
    
    return reports;
  }

  private async measureEscrowGas(
    contract: Contract,
    deployer: any,
    user1: any,
    user2: any
  ): Promise<GasReport[]> {
    const reports: GasReport[] = [];
    const amount = ethers.parseEther("1");
    
    try {
      // Create escrow
      const escrowTx = await contract.connect(user1).createEscrow(
        user2.address,
        ethers.constants.AddressZero,
        amount,
        86400,
        { value: amount }
      );
      const escrowReceipt = await escrowTx.wait();
      
      reports.push({
        contractName: "EnhancedEscrow",
        functionName: "createEscrow",
        gasUsed: escrowReceipt.gasUsed.toNumber()
      });
      
    } catch (error) {
      console.error("Error measuring Escrow gas:", error);
    }
    
    return reports;
  }

  async compareOptimizedVersions(): Promise<void> {
    console.log("\n🔄 Comparing optimized versions...");
    
    try {
      // Compare LDAOToken vs OptimizedLDAOToken
      await this.compareContracts("LDAOToken", "OptimizedLDAOToken");
      
      // Compare Marketplace vs OptimizedMarketplace
      await this.compareContracts("Marketplace", "OptimizedMarketplace");
      
    } catch (error) {
      console.error("Error comparing optimized versions:", error);
    }
  }

  private async compareContracts(originalName: string, optimizedName: string): Promise<void> {
    try {
      console.log(`\n📊 Comparing ${originalName} vs ${optimizedName}...`);
      
      const originalReports = await this.analyzeContract(originalName);
      const optimizedReports = await this.analyzeContract(optimizedName);
      
      // Match functions and calculate savings
      for (const originalReport of originalReports) {
        const optimizedReport = optimizedReports.find(
          r => r.functionName === originalReport.functionName
        );
        
        if (optimizedReport) {
          const savings = originalReport.gasUsed - optimizedReport.gasUsed;
          const savingsPercent = (savings / originalReport.gasUsed) * 100;
          
          originalReport.optimizedGas = optimizedReport.gasUsed;
          originalReport.savings = savings;
          originalReport.savingsPercent = savingsPercent;
          
          console.log(`  ${originalReport.functionName}:`);
          console.log(`    Original: ${originalReport.gasUsed.toLocaleString()} gas`);
          console.log(`    Optimized: ${optimizedReport.gasUsed.toLocaleString()} gas`);
          console.log(`    Savings: ${savings.toLocaleString()} gas (${savingsPercent.toFixed(1)}%)`);
        }
      }
      
    } catch (error) {
      console.error(`Error comparing ${originalName} vs ${optimizedName}:`, error);
    }
  }

  generateRecommendations(): void {
    console.log("\n💡 Generating optimization recommendations...");
    
    // Analyze gas usage patterns
    const highGasOperations = this.gasReports.filter(r => r.gasUsed > 200000);
    const inefficientOperations = this.gasReports.filter(r => r.savingsPercent && r.savingsPercent < 10);
    
    if (highGasOperations.length > 0) {
      this.recommendations.push(
        `High gas operations detected (>200k gas): ${highGasOperations.map(r => r.functionName).join(', ')}`
      );
      this.recommendations.push("Consider implementing batch operations for these functions");
    }
    
    if (inefficientOperations.length > 0) {
      this.recommendations.push(
        `Low optimization impact detected: ${inefficientOperations.map(r => r.functionName).join(', ')}`
      );
      this.recommendations.push("Focus on storage optimization and struct packing for these functions");
    }
    
    // General recommendations
    this.recommendations.push("Implement batch operations for frequently used functions");
    this.recommendations.push("Use packed structs to minimize storage slots");
    this.recommendations.push("Cache storage variables in memory for loops");
    this.recommendations.push("Use custom errors instead of require strings");
    this.recommendations.push("Consider using assembly for simple operations");
    this.recommendations.push("Implement gas estimation functions for user guidance");
  }

  generateReport(): OptimizationResult {
    const totalSavings = this.gasReports.reduce((sum, r) => sum + (r.savings || 0), 0);
    const reportsWithSavings = this.gasReports.filter(r => r.savings !== undefined);
    const averageSavings = reportsWithSavings.length > 0 
      ? totalSavings / reportsWithSavings.length 
      : 0;
    
    return {
      totalSavings,
      averageSavings,
      reports: this.gasReports,
      recommendations: this.recommendations
    };
  }

  async saveReport(result: OptimizationResult): Promise<void> {
    const reportPath = path.join(__dirname, "..", "gas-optimization-report.json");
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalSavings: result.totalSavings,
        averageSavings: result.averageSavings,
        totalOperations: result.reports.length,
        optimizedOperations: result.reports.filter(r => r.savings !== undefined).length
      },
      gasReports: result.reports,
      recommendations: result.recommendations,
      nextSteps: [
        "Deploy optimized contracts to testnet",
        "Conduct thorough testing of optimized versions",
        "Measure real-world gas savings",
        "Update deployment scripts with optimized contracts",
        "Monitor gas usage in production"
      ]
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Gas optimization report saved to: ${reportPath}`);
  }

  printSummary(result: OptimizationResult): void {
    console.log("\n" + "=".repeat(60));
    console.log("                GAS OPTIMIZATION SUMMARY");
    console.log("=".repeat(60));
    
    console.log(`Total Operations Analyzed: ${result.reports.length}`);
    console.log(`Operations with Optimizations: ${result.reports.filter(r => r.savings !== undefined).length}`);
    console.log(`Total Gas Savings: ${result.totalSavings.toLocaleString()} gas`);
    console.log(`Average Savings per Operation: ${result.averageSavings.toFixed(0)} gas`);
    
    console.log("\n📊 TOP GAS CONSUMERS:");
    const topConsumers = result.reports
      .sort((a, b) => b.gasUsed - a.gasUsed)
      .slice(0, 5);
    
    topConsumers.forEach((report, index) => {
      console.log(`${index + 1}. ${report.contractName}.${report.functionName}: ${report.gasUsed.toLocaleString()} gas`);
    });
    
    console.log("\n💰 BIGGEST SAVINGS:");
    const biggestSavings = result.reports
      .filter(r => r.savings !== undefined)
      .sort((a, b) => (b.savings || 0) - (a.savings || 0))
      .slice(0, 5);
    
    biggestSavings.forEach((report, index) => {
      console.log(`${index + 1}. ${report.contractName}.${report.functionName}: ${report.savings?.toLocaleString()} gas (${report.savingsPercent?.toFixed(1)}%)`);
    });
    
    console.log("\n💡 RECOMMENDATIONS:");
    result.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
    
    console.log("=".repeat(60));
  }
}

async function main() {
  console.log("🚀 Starting Gas Optimization Analysis...");
  
  const optimizer = new GasOptimizer();
  
  // Analyze core contracts
  const contractsToAnalyze = [
    "LDAOToken",
    "PaymentRouter",
    "Marketplace",
    "EnhancedEscrow"
  ];
  
  for (const contractName of contractsToAnalyze) {
    try {
      await optimizer.analyzeContract(contractName);
    } catch (error) {
      console.error(`Failed to analyze ${contractName}:`, error);
    }
  }
  
  // Compare with optimized versions
  await optimizer.compareOptimizedVersions();
  
  // Generate recommendations
  optimizer.generateRecommendations();
  
  // Generate and save report
  const result = optimizer.generateReport();
  await optimizer.saveReport(result);
  
  // Print summary
  optimizer.printSummary(result);
  
  console.log("\n✅ Gas optimization analysis completed!");
}

if (require.main === module) {
  main().catch(console.error);
}

export { GasOptimizer };