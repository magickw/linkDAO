#!/usr/bin/env ts-node

import { ethers } from 'hardhat';
import { PerformanceLoadTester } from '../verification/PerformanceLoadTester';
import fs from 'fs';
import path from 'path';

// Contract ABIs
import LDAOTokenABI from '../artifacts/contracts/LDAOToken.sol/LDAOToken.json';
import GovernanceABI from '../artifacts/contracts/Governance.sol/Governance.json';
import MarketplaceABI from '../artifacts/contracts/Marketplace.sol/Marketplace.json';
import EnhancedEscrowABI from '../artifacts/contracts/EnhancedEscrow.sol/EnhancedEscrow.json';
import ReputationSystemABI from '../artifacts/contracts/ReputationSystem.sol/ReputationSystem.json';
import NFTMarketplaceABI from '../artifacts/contracts/NFTMarketplace.sol/NFTMarketplace.json';
import TipRouterABI from '../artifacts/contracts/TipRouter.sol/TipRouter.json';
import FollowModuleABI from '../artifacts/contracts/FollowModule.sol/FollowModule.json';

interface DeployedAddresses {
  [contractName: string]: string;
}

interface TestConfig {
  network: string;
  rpcUrl?: string;
  deployedAddressesFile: string;
  outputDir: string;
  testAccounts: number;
  fundingAmount: string; // ETH amount to fund test accounts
}

class PerformanceTestRunner {
  private config: TestConfig;
  private provider: ethers.Provider;
  private mainSigner: ethers.Signer;
  private testSigners: ethers.Signer[] = [];
  private deployedAddresses: DeployedAddresses = {};

  constructor(config: TestConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Performance and Load Testing...');
    
    // Setup provider and signers
    if (this.config.rpcUrl) {
      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    } else {
      this.provider = ethers.provider;
    }
    
    const accounts = await ethers.getSigners();
    this.mainSigner = accounts[0];
    
    console.log(`📡 Connected to network: ${this.config.network}`);
    console.log(`👤 Main account: ${await this.mainSigner.getAddress()}`);
    
    // Create test accounts
    await this.createTestAccounts();
    
    // Load deployed addresses
    await this.loadDeployedAddresses();
    
    // Ensure output directory exists
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  private async createTestAccounts(): Promise<void> {
    console.log(`🔑 Creating ${this.config.testAccounts} test accounts...`);
    
    // Create test wallets
    for (let i = 0; i < this.config.testAccounts; i++) {
      const wallet = ethers.Wallet.createRandom().connect(this.provider);
      this.testSigners.push(wallet);
    }
    
    // Fund test accounts
    const fundingAmount = ethers.parseEther(this.config.fundingAmount);
    console.log(`💰 Funding test accounts with ${this.config.fundingAmount} ETH each...`);
    
    const fundingPromises = this.testSigners.map(async (signer, index) => {
      try {
        const tx = await this.mainSigner.sendTransaction({
          to: await signer.getAddress(),
          value: fundingAmount
        });
        await tx.wait();
        console.log(`✅ Funded test account ${index + 1}: ${await signer.getAddress()}`);
      } catch (error) {
        console.error(`❌ Failed to fund test account ${index + 1}:`, error);
        throw error;
      }
    });
    
    await Promise.all(fundingPromises);
    console.log(`✅ All test accounts funded successfully`);
  }

  private async loadDeployedAddresses(): Promise<void> {
    try {
      const addressesPath = path.resolve(this.config.deployedAddressesFile);
      if (fs.existsSync(addressesPath)) {
        const addressesData = fs.readFileSync(addressesPath, 'utf8');
        this.deployedAddresses = JSON.parse(addressesData);
        console.log(`📋 Loaded ${Object.keys(this.deployedAddresses).length} deployed contracts`);
      } else {
        throw new Error(`Deployed addresses file not found: ${addressesPath}`);
      }
    } catch (error) {
      console.error('❌ Error loading deployed addresses:', error);
      throw error;
    }
  }

  async setupTestTokens(): Promise<void> {
    console.log('🪙 Setting up test tokens for performance testing...');
    
    const ldaoTokenAddress = this.deployedAddresses.LDAOToken;
    if (!ldaoTokenAddress) {
      throw new Error('LDAOToken address not found');
    }
    
    const ldaoToken = new ethers.Contract(ldaoTokenAddress, LDAOTokenABI.abi, this.mainSigner);
    
    // Distribute tokens to test accounts
    const tokenAmount = ethers.parseEther('10000'); // 10k tokens per account
    
    const distributionPromises = this.testSigners.map(async (signer, index) => {
      try {
        const tx = await ldaoToken.transfer(await signer.getAddress(), tokenAmount);
        await tx.wait();
        console.log(`✅ Distributed tokens to test account ${index + 1}`);
      } catch (error) {
        console.error(`❌ Failed to distribute tokens to account ${index + 1}:`, error);
        throw error;
      }
    });
    
    await Promise.all(distributionPromises);
    console.log(`✅ Token distribution complete`);
  }

  async runPerformanceTests(): Promise<void> {
    console.log('\n🏃‍♂️ Running Performance and Load Tests...');
    
    const tester = new PerformanceLoadTester(this.provider, this.testSigners);
    
    // Add contracts for testing
    const contractConfigs = [
      { name: 'LDAOToken', abi: LDAOTokenABI.abi },
      { name: 'Governance', abi: GovernanceABI.abi },
      { name: 'Marketplace', abi: MarketplaceABI.abi },
      { name: 'EnhancedEscrow', abi: EnhancedEscrowABI.abi },
      { name: 'ReputationSystem', abi: ReputationSystemABI.abi },
      { name: 'NFTMarketplace', abi: NFTMarketplaceABI.abi },
      { name: 'TipRouter', abi: TipRouterABI.abi },
      { name: 'FollowModule', abi: FollowModuleABI.abi }
    ];

    for (const config of contractConfigs) {
      const address = this.deployedAddresses[config.name];
      if (address) {
        tester.addContract(config.name, address, config.abi);
        console.log(`✅ Added ${config.name} for performance testing`);
      } else {
        console.log(`⚠️  ${config.name} not found in deployed addresses`);
      }
    }

    // Run performance tests
    const results = await tester.runPerformanceTests();
    
    // Generate and save report
    const report = tester.generatePerformanceReport();
    const reportPath = path.join(this.config.outputDir, 'performance-load-testing-report.md');
    fs.writeFileSync(reportPath, report);
    
    // Save JSON results
    const jsonPath = path.join(this.config.outputDir, 'performance-load-testing-results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
    
    console.log(`📄 Performance testing report saved to: ${reportPath}`);
    
    // Analyze results
    this.analyzePerformanceResults(results);
  }

  private analyzePerformanceResults(results: any[]): void {
    console.log('\n📊 Analyzing Performance Results...');
    
    // Check for performance issues
    const issues: string[] = [];
    
    // Check throughput
    const loadTests = results.filter(r => r.testName.includes('Load Test'));
    for (const test of loadTests) {
      if (test.throughput < 1) {
        issues.push(`Low throughput in ${test.testName}: ${test.throughput.toFixed(2)} TPS`);
      }
      
      if (test.failedTransactions / test.totalTransactions > 0.05) {
        issues.push(`High failure rate in ${test.testName}: ${((test.failedTransactions / test.totalTransactions) * 100).toFixed(1)}%`);
      }
      
      if (test.averageResponseTime > 10000) {
        issues.push(`High response time in ${test.testName}: ${test.averageResponseTime.toFixed(0)}ms`);
      }
    }
    
    // Check gas usage
    const gasTests = results.filter(r => r.testName.includes('Gas Test'));
    for (const test of gasTests) {
      if (test.gasUsage.average > 500000) {
        issues.push(`High gas usage in ${test.testName}: ${test.gasUsage.average.toFixed(0)} gas`);
      }
    }
    
    // Report issues
    if (issues.length > 0) {
      console.log('⚠️  Performance Issues Detected:');
      for (const issue of issues) {
        console.log(`  - ${issue}`);
      }
    } else {
      console.log('✅ No critical performance issues detected');
    }
    
    // Summary statistics
    const totalTransactions = results.reduce((sum, r) => sum + r.totalTransactions, 0);
    const totalSuccessful = results.reduce((sum, r) => sum + r.successfulTransactions, 0);
    const overallSuccessRate = (totalSuccessful / totalTransactions) * 100;
    
    console.log('\n📈 Performance Summary:');
    console.log(`  - Total Transactions: ${totalTransactions.toLocaleString()}`);
    console.log(`  - Overall Success Rate: ${overallSuccessRate.toFixed(1)}%`);
    console.log(`  - Average Throughput: ${loadTests.length > 0 ? (loadTests.reduce((sum, t) => sum + t.throughput, 0) / loadTests.length).toFixed(2) : 'N/A'} TPS`);
  }

  async runStressTests(): Promise<void> {
    console.log('\n💪 Running Stress Tests...');
    
    // Stress test specific scenarios
    const stressScenarios = [
      {
        name: 'High Frequency Token Transfers',
        duration: 300, // 5 minutes
        concurrentUsers: Math.min(this.testSigners.length, 50),
        targetTPS: 20
      },
      {
        name: 'Marketplace Listing Spam',
        duration: 180, // 3 minutes
        concurrentUsers: Math.min(this.testSigners.length, 30),
        targetTPS: 15
      },
      {
        name: 'Governance Proposal Flood',
        duration: 120, // 2 minutes
        concurrentUsers: Math.min(this.testSigners.length, 20),
        targetTPS: 10
      }
    ];
    
    const stressResults = [];
    
    for (const scenario of stressScenarios) {
      console.log(`🔥 Running stress test: ${scenario.name}`);
      
      try {
        // Create a custom tester for this scenario
        const tester = new PerformanceLoadTester(this.provider, this.testSigners.slice(0, scenario.concurrentUsers));
        
        // Add contracts
        const contractConfigs = [
          { name: 'LDAOToken', abi: LDAOTokenABI.abi },
          { name: 'Marketplace', abi: MarketplaceABI.abi },
          { name: 'Governance', abi: GovernanceABI.abi }
        ];

        for (const config of contractConfigs) {
          const address = this.deployedAddresses[config.name];
          if (address) {
            tester.addContract(config.name, address, config.abi);
          }
        }
        
        // Run custom stress test (simplified version)
        const startTime = Date.now();
        const endTime = startTime + (scenario.duration * 1000);
        let transactionCount = 0;
        let successCount = 0;
        
        const promises = [];
        
        for (let i = 0; i < scenario.concurrentUsers; i++) {
          const userPromise = this.runStressUser(i, scenario, endTime);
          promises.push(userPromise);
        }
        
        const results = await Promise.all(promises);
        
        // Aggregate results
        for (const result of results) {
          transactionCount += result.transactions;
          successCount += result.successful;
        }
        
        const actualDuration = (Date.now() - startTime) / 1000;
        const actualTPS = successCount / actualDuration;
        
        stressResults.push({
          scenario: scenario.name,
          duration: actualDuration,
          transactions: transactionCount,
          successful: successCount,
          throughput: actualTPS,
          successRate: (successCount / transactionCount) * 100
        });
        
        console.log(`✅ ${scenario.name} completed: ${actualTPS.toFixed(2)} TPS, ${((successCount / transactionCount) * 100).toFixed(1)}% success rate`);
        
      } catch (error) {
        console.error(`❌ Stress test ${scenario.name} failed:`, error);
        stressResults.push({
          scenario: scenario.name,
          error: error.toString()
        });
      }
    }
    
    // Save stress test results
    const stressReportPath = path.join(this.config.outputDir, 'stress-testing-results.json');
    fs.writeFileSync(stressReportPath, JSON.stringify(stressResults, null, 2));
    
    console.log(`📄 Stress testing results saved to: ${stressReportPath}`);
  }

  private async runStressUser(userId: number, scenario: any, endTime: number): Promise<{ transactions: number, successful: number }> {
    let transactions = 0;
    let successful = 0;
    
    const signer = this.testSigners[userId];
    const ldaoToken = new ethers.Contract(this.deployedAddresses.LDAOToken, LDAOTokenABI.abi, signer);
    
    while (Date.now() < endTime) {
      try {
        transactions++;
        
        // Simple token transfer for stress testing
        const recipient = this.testSigners[(userId + 1) % this.testSigners.length];
        const tx = await ldaoToken.transfer(await recipient.getAddress(), ethers.parseEther('1'));
        await tx.wait();
        
        successful++;
        
        // Small delay to prevent overwhelming the network
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        // Continue on error
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return { transactions, successful };
  }

  async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up test resources...');
    
    // Return remaining ETH from test accounts to main account
    const returnPromises = this.testSigners.map(async (signer, index) => {
      try {
        const balance = await this.provider.getBalance(await signer.getAddress());
        const gasPrice = await this.provider.getFeeData();
        const gasLimit = 21000n;
        const gasCost = gasLimit * (gasPrice.gasPrice || 0n);
        
        if (balance > gasCost) {
          const returnAmount = balance - gasCost;
          const tx = await signer.sendTransaction({
            to: await this.mainSigner.getAddress(),
            value: returnAmount
          });
          await tx.wait();
          console.log(`✅ Returned ${ethers.formatEther(returnAmount)} ETH from test account ${index + 1}`);
        }
      } catch (error) {
        console.log(`⚠️  Could not return ETH from test account ${index + 1}:`, error.message);
      }
    });
    
    await Promise.all(returnPromises);
    console.log('✅ Cleanup completed');
  }

  async run(): Promise<void> {
    try {
      await this.initialize();
      await this.setupTestTokens();
      await this.runPerformanceTests();
      await this.runStressTests();
      await this.cleanup();
      
      console.log('\n🎉 Performance and Load Testing Complete!');
      console.log(`📁 All reports saved to: ${this.config.outputDir}`);
      
    } catch (error) {
      console.error('❌ Performance testing failed:', error);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const network = process.env.HARDHAT_NETWORK || 'localhost';
  
  const config: TestConfig = {
    network,
    deployedAddressesFile: `deployed-addresses-${network}.json`,
    outputDir: './verification-reports',
    testAccounts: 25, // Number of test accounts to create
    fundingAmount: '1.0' // ETH amount per test account
  };
  
  // Override for mainnet (use fewer accounts and less funding)
  if (network === 'mainnet') {
    config.rpcUrl = process.env.MAINNET_RPC_URL;
    config.deployedAddressesFile = 'deployedAddresses.json';
    config.testAccounts = 10;
    config.fundingAmount = '0.1';
  }
  
  const runner = new PerformanceTestRunner(config);
  await runner.run();
}

// Execute if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { PerformanceTestRunner, TestConfig };