#!/usr/bin/env ts-node

import { ethers } from 'hardhat';
import { PostDeploymentVerifier } from '../verification/PostDeploymentVerifier';
import { UserWorkflowTester } from '../verification/UserWorkflowTester';
import fs from 'fs';
import path from 'path';

// Contract ABIs - Import from artifacts
import LDAOTokenABI from '../artifacts/contracts/LDAOToken.sol/LDAOToken.json';
import GovernanceABI from '../artifacts/contracts/Governance.sol/Governance.json';
import MarketplaceABI from '../artifacts/contracts/Marketplace.sol/Marketplace.json';
import EnhancedEscrowABI from '../artifacts/contracts/EnhancedEscrow.sol/EnhancedEscrow.json';
import ReputationSystemABI from '../artifacts/contracts/ReputationSystem.sol/ReputationSystem.json';
import NFTMarketplaceABI from '../artifacts/contracts/NFTMarketplace.sol/NFTMarketplace.json';
import TipRouterABI from '../artifacts/contracts/TipRouter.sol/TipRouter.json';
import FollowModuleABI from '../artifacts/contracts/FollowModule.sol/FollowModule.json';
import MockERC20ABI from '../artifacts/contracts/test/MockERC20.sol/MockERC20.json';

interface DeployedAddresses {
  [contractName: string]: string;
}

interface VerificationConfig {
  network: string;
  rpcUrl?: string;
  deployedAddressesFile: string;
  outputDir: string;
  performanceThresholds: {
    maxGasPerFunction: number;
    maxWorkflowDuration: number;
    minSuccessRate: number;
  };
}

class PostDeploymentVerificationRunner {
  private config: VerificationConfig;
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private deployedAddresses: DeployedAddresses = {};

  constructor(config: VerificationConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Post-Deployment Verification...');
    
    // Setup provider and signer
    if (this.config.rpcUrl) {
      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    } else {
      this.provider = ethers.provider;
    }
    
    const accounts = await ethers.getSigners();
    this.signer = accounts[0];
    
    console.log(`📡 Connected to network: ${this.config.network}`);
    console.log(`👤 Using account: ${await this.signer.getAddress()}`);
    
    // Load deployed addresses
    await this.loadDeployedAddresses();
    
    // Ensure output directory exists
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
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

  async runContractVerification(): Promise<void> {
    console.log('\n🔍 Running Contract Verification...');
    
    const verifier = new PostDeploymentVerifier(this.provider, this.signer);
    
    // Add all deployed contracts
    const contractConfigs = [
      { name: 'LDAOToken', abi: LDAOTokenABI.abi },
      { name: 'Governance', abi: GovernanceABI.abi },
      { name: 'Marketplace', abi: MarketplaceABI.abi },
      { name: 'EnhancedEscrow', abi: EnhancedEscrowABI.abi },
      { name: 'ReputationSystem', abi: ReputationSystemABI.abi },
      { name: 'NFTMarketplace', abi: NFTMarketplaceABI.abi },
      { name: 'TipRouter', abi: TipRouterABI.abi },
      { name: 'FollowModule', abi: FollowModuleABI.abi },
      { name: 'MockERC20', abi: MockERC20ABI.abi }
    ];

    for (const config of contractConfigs) {
      const address = this.deployedAddresses[config.name];
      if (address) {
        verifier.addContract(config.name, address, config.abi);
        console.log(`✅ Added ${config.name} at ${address}`);
      } else {
        console.log(`⚠️  ${config.name} not found in deployed addresses`);
      }
    }

    // Run verification
    const results = await verifier.verifyAllContracts();
    
    // Generate and save report
    const report = verifier.generateReport();
    const reportPath = path.join(this.config.outputDir, 'contract-verification-report.md');
    fs.writeFileSync(reportPath, report);
    
    // Save JSON results
    const jsonPath = path.join(this.config.outputDir, 'contract-verification-results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
    
    console.log(`📄 Contract verification report saved to: ${reportPath}`);
    
    // Check performance thresholds
    this.checkContractPerformance(results);
  }

  async runWorkflowTesting(): Promise<void> {
    console.log('\n🔄 Running User Workflow Testing...');
    
    const tester = new UserWorkflowTester(this.provider, this.signer);
    
    // Add contracts for workflow testing
    const contractConfigs = [
      { name: 'LDAOToken', abi: LDAOTokenABI.abi },
      { name: 'Governance', abi: GovernanceABI.abi },
      { name: 'Marketplace', abi: MarketplaceABI.abi },
      { name: 'EnhancedEscrow', abi: EnhancedEscrowABI.abi },
      { name: 'ReputationSystem', abi: ReputationSystemABI.abi },
      { name: 'NFTMarketplace', abi: NFTMarketplaceABI.abi },
      { name: 'TipRouter', abi: TipRouterABI.abi },
      { name: 'FollowModule', abi: FollowModuleABI.abi },
      { name: 'MockERC20', abi: MockERC20ABI.abi }
    ];

    for (const config of contractConfigs) {
      const address = this.deployedAddresses[config.name];
      if (address) {
        tester.addContract(config.name, address, config.abi);
      }
    }

    // Run workflow tests
    const results = await tester.runAllWorkflows();
    
    // Generate and save report
    const report = tester.generateWorkflowReport();
    const reportPath = path.join(this.config.outputDir, 'workflow-testing-report.md');
    fs.writeFileSync(reportPath, report);
    
    // Save JSON results
    const jsonPath = path.join(this.config.outputDir, 'workflow-testing-results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
    
    console.log(`📄 Workflow testing report saved to: ${reportPath}`);
    
    // Check performance thresholds
    this.checkWorkflowPerformance(results);
  }

  async runCrossContractIntegrationTests(): Promise<void> {
    console.log('\n🔗 Running Cross-Contract Integration Tests...');
    
    const integrationResults = [];
    
    try {
      // Test 1: Token-Governance Integration
      const tokenGovernanceResult = await this.testTokenGovernanceIntegration();
      integrationResults.push(tokenGovernanceResult);
      
      // Test 2: Marketplace-Escrow Integration
      const marketplaceEscrowResult = await this.testMarketplaceEscrowIntegration();
      integrationResults.push(marketplaceEscrowResult);
      
      // Test 3: Reputation-Marketplace Integration
      const reputationMarketplaceResult = await this.testReputationMarketplaceIntegration();
      integrationResults.push(reputationMarketplaceResult);
      
      // Test 4: Social-Token Integration
      const socialTokenResult = await this.testSocialTokenIntegration();
      integrationResults.push(socialTokenResult);
      
    } catch (error) {
      console.error('❌ Integration testing error:', error);
      integrationResults.push({
        testName: 'Integration Tests',
        passed: false,
        error: error.toString()
      });
    }
    
    // Generate integration report
    const report = this.generateIntegrationReport(integrationResults);
    const reportPath = path.join(this.config.outputDir, 'integration-testing-report.md');
    fs.writeFileSync(reportPath, report);
    
    console.log(`📄 Integration testing report saved to: ${reportPath}`);
  }

  private async testTokenGovernanceIntegration(): Promise<any> {
    console.log('  🔍 Testing Token-Governance Integration...');
    
    try {
      const ldaoToken = new ethers.Contract(
        this.deployedAddresses.LDAOToken,
        LDAOTokenABI.abi,
        this.signer
      );
      
      const governance = new ethers.Contract(
        this.deployedAddresses.Governance,
        GovernanceABI.abi,
        this.signer
      );
      
      // Check if governance can read token voting power
      const userAddress = await this.signer.getAddress();
      const votingPower = await governance.getVotes(userAddress);
      const tokenBalance = await ldaoToken.balanceOf(userAddress);
      
      return {
        testName: 'Token-Governance Integration',
        passed: true,
        details: {
          votingPower: votingPower.toString(),
          tokenBalance: tokenBalance.toString(),
          integration: 'Governance can read token voting power'
        }
      };
    } catch (error) {
      return {
        testName: 'Token-Governance Integration',
        passed: false,
        error: error.toString()
      };
    }
  }

  private async testMarketplaceEscrowIntegration(): Promise<any> {
    console.log('  🔍 Testing Marketplace-Escrow Integration...');
    
    try {
      const marketplace = new ethers.Contract(
        this.deployedAddresses.Marketplace,
        MarketplaceABI.abi,
        this.signer
      );
      
      const escrow = new ethers.Contract(
        this.deployedAddresses.EnhancedEscrow,
        EnhancedEscrowABI.abi,
        this.signer
      );
      
      // Check if marketplace can create escrows
      const escrowAddress = await marketplace.escrowContract();
      const expectedAddress = await escrow.getAddress();
      
      return {
        testName: 'Marketplace-Escrow Integration',
        passed: escrowAddress.toLowerCase() === expectedAddress.toLowerCase(),
        details: {
          marketplaceEscrowAddress: escrowAddress,
          actualEscrowAddress: expectedAddress,
          integration: 'Marketplace references correct escrow contract'
        }
      };
    } catch (error) {
      return {
        testName: 'Marketplace-Escrow Integration',
        passed: false,
        error: error.toString()
      };
    }
  }

  private async testReputationMarketplaceIntegration(): Promise<any> {
    console.log('  🔍 Testing Reputation-Marketplace Integration...');
    
    try {
      const marketplace = new ethers.Contract(
        this.deployedAddresses.Marketplace,
        MarketplaceABI.abi,
        this.signer
      );
      
      const reputation = new ethers.Contract(
        this.deployedAddresses.ReputationSystem,
        ReputationSystemABI.abi,
        this.signer
      );
      
      // Check if marketplace can read reputation scores
      const userAddress = await this.signer.getAddress();
      const reputationScore = await reputation.getReputationScore(userAddress);
      
      return {
        testName: 'Reputation-Marketplace Integration',
        passed: true,
        details: {
          userAddress,
          reputationScore: reputationScore.toString(),
          integration: 'Reputation system accessible from marketplace context'
        }
      };
    } catch (error) {
      return {
        testName: 'Reputation-Marketplace Integration',
        passed: false,
        error: error.toString()
      };
    }
  }

  private async testSocialTokenIntegration(): Promise<any> {
    console.log('  🔍 Testing Social-Token Integration...');
    
    try {
      const tipRouter = new ethers.Contract(
        this.deployedAddresses.TipRouter,
        TipRouterABI.abi,
        this.signer
      );
      
      const ldaoToken = new ethers.Contract(
        this.deployedAddresses.LDAOToken,
        LDAOTokenABI.abi,
        this.signer
      );
      
      // Check if tip router uses correct token
      const tokenAddress = await tipRouter.ldaoToken();
      const expectedAddress = await ldaoToken.getAddress();
      
      return {
        testName: 'Social-Token Integration',
        passed: tokenAddress.toLowerCase() === expectedAddress.toLowerCase(),
        details: {
          tipRouterTokenAddress: tokenAddress,
          actualTokenAddress: expectedAddress,
          integration: 'Tip router references correct LDAO token'
        }
      };
    } catch (error) {
      return {
        testName: 'Social-Token Integration',
        passed: false,
        error: error.toString()
      };
    }
  }

  private generateIntegrationReport(results: any[]): string {
    let report = '# Cross-Contract Integration Testing Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    const passedTests = results.filter(r => r.passed).length;
    const totalTests = results.length;
    
    report += '## Summary\n\n';
    report += `- Total Integration Tests: ${totalTests}\n`;
    report += `- Passed: ${passedTests}\n`;
    report += `- Failed: ${totalTests - passedTests}\n`;
    report += `- Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n\n`;
    
    report += '## Test Results\n\n';
    
    for (const result of results) {
      const status = result.passed ? '✅' : '❌';
      report += `### ${status} ${result.testName}\n\n`;
      
      if (result.details) {
        report += '**Details:**\n';
        for (const [key, value] of Object.entries(result.details)) {
          report += `- ${key}: ${value}\n`;
        }
        report += '\n';
      }
      
      if (result.error) {
        report += `**Error:** ${result.error}\n\n`;
      }
    }
    
    return report;
  }

  private checkContractPerformance(results: any[]): void {
    console.log('\n📊 Checking Contract Performance...');
    
    const failedContracts = results.filter(r => !r.passed);
    if (failedContracts.length > 0) {
      console.log(`❌ ${failedContracts.length} contracts failed verification`);
      for (const contract of failedContracts) {
        console.log(`  - ${contract.contractName}: ${contract.errors.join(', ')}`);
      }
    }
    
    // Check gas usage
    const highGasFunctions = results
      .flatMap(r => r.gasEstimates)
      .filter(e => e.estimatedGas > this.config.performanceThresholds.maxGasPerFunction);
    
    if (highGasFunctions.length > 0) {
      console.log(`⚠️  ${highGasFunctions.length} functions exceed gas threshold`);
      for (const func of highGasFunctions) {
        console.log(`  - ${func.functionName}: ${func.estimatedGas} gas`);
      }
    }
    
    const successRate = (results.filter(r => r.passed).length / results.length) * 100;
    if (successRate < this.config.performanceThresholds.minSuccessRate) {
      console.log(`❌ Contract verification success rate (${successRate.toFixed(1)}%) below threshold (${this.config.performanceThresholds.minSuccessRate}%)`);
    } else {
      console.log(`✅ Contract verification success rate: ${successRate.toFixed(1)}%`);
    }
  }

  private checkWorkflowPerformance(results: any[]): void {
    console.log('\n📊 Checking Workflow Performance...');
    
    const failedWorkflows = results.filter(r => !r.passed);
    if (failedWorkflows.length > 0) {
      console.log(`❌ ${failedWorkflows.length} workflows failed`);
      for (const workflow of failedWorkflows) {
        console.log(`  - ${workflow.workflowName}: ${workflow.errors.join(', ')}`);
      }
    }
    
    // Check duration
    const slowWorkflows = results.filter(r => r.duration > this.config.performanceThresholds.maxWorkflowDuration);
    if (slowWorkflows.length > 0) {
      console.log(`⚠️  ${slowWorkflows.length} workflows exceed duration threshold`);
      for (const workflow of slowWorkflows) {
        console.log(`  - ${workflow.workflowName}: ${workflow.duration}ms`);
      }
    }
    
    const successRate = (results.filter(r => r.passed).length / results.length) * 100;
    if (successRate < this.config.performanceThresholds.minSuccessRate) {
      console.log(`❌ Workflow success rate (${successRate.toFixed(1)}%) below threshold (${this.config.performanceThresholds.minSuccessRate}%)`);
    } else {
      console.log(`✅ Workflow success rate: ${successRate.toFixed(1)}%`);
    }
  }

  async generateFinalReport(): Promise<void> {
    console.log('\n📋 Generating Final Verification Report...');
    
    const finalReport = `# LinkDAO Mainnet Post-Deployment Verification Report

## Executive Summary

This report contains the results of comprehensive post-deployment verification for the LinkDAO platform on Ethereum mainnet.

**Generated:** ${new Date().toISOString()}
**Network:** ${this.config.network}
**Verification Account:** ${await this.signer.getAddress()}

## Verification Components

1. **Contract Verification** - Individual contract functionality and security checks
2. **User Workflow Testing** - End-to-end user journey validation
3. **Cross-Contract Integration** - Inter-contract communication verification
4. **Performance Analysis** - Gas usage and execution time analysis

## Report Files

- \`contract-verification-report.md\` - Detailed contract verification results
- \`workflow-testing-report.md\` - User workflow testing results
- \`integration-testing-report.md\` - Cross-contract integration results
- \`contract-verification-results.json\` - Raw contract verification data
- \`workflow-testing-results.json\` - Raw workflow testing data

## Performance Thresholds

- Maximum Gas per Function: ${this.config.performanceThresholds.maxGasPerFunction.toLocaleString()}
- Maximum Workflow Duration: ${this.config.performanceThresholds.maxWorkflowDuration}ms
- Minimum Success Rate: ${this.config.performanceThresholds.minSuccessRate}%

## Next Steps

1. Review all generated reports for any failures or performance issues
2. Address any identified problems before community launch
3. Monitor ongoing platform performance using established metrics
4. Schedule regular verification runs to ensure continued platform health

---

*This verification was performed as part of the LinkDAO mainnet deployment plan (Task 6.1).*
`;

    const finalReportPath = path.join(this.config.outputDir, 'post-deployment-verification-summary.md');
    fs.writeFileSync(finalReportPath, finalReport);
    
    console.log(`📄 Final verification report saved to: ${finalReportPath}`);
  }

  async run(): Promise<void> {
    try {
      await this.initialize();
      
      // Run all verification components
      await this.runContractVerification();
      await this.runWorkflowTesting();
      await this.runCrossContractIntegrationTests();
      
      // Generate final summary
      await this.generateFinalReport();
      
      console.log('\n🎉 Post-Deployment Verification Complete!');
      console.log(`📁 All reports saved to: ${this.config.outputDir}`);
      
    } catch (error) {
      console.error('❌ Verification failed:', error);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const network = process.env.HARDHAT_NETWORK || 'localhost';
  
  const config: VerificationConfig = {
    network,
    deployedAddressesFile: `deployed-addresses-${network}.json`,
    outputDir: './verification-reports',
    performanceThresholds: {
      maxGasPerFunction: 500000, // 500k gas
      maxWorkflowDuration: 30000, // 30 seconds
      minSuccessRate: 95 // 95%
    }
  };
  
  // Override for mainnet
  if (network === 'mainnet') {
    config.rpcUrl = process.env.MAINNET_RPC_URL;
    config.deployedAddressesFile = 'deployedAddresses.json';
    config.performanceThresholds.minSuccessRate = 100; // 100% for mainnet
  }
  
  const runner = new PostDeploymentVerificationRunner(config);
  await runner.run();
}

// Execute if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { PostDeploymentVerificationRunner, VerificationConfig };