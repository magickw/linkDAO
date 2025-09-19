import { ethers } from 'ethers';
import { PostDeploymentVerifier } from './PostDeploymentVerifier';
import { UserWorkflowTester } from './UserWorkflowTester';
import { GasOptimizationAnalyzer } from './GasOptimizationAnalyzer';
import fs from 'fs';
import path from 'path';

export interface VerificationSuite {
  contractVerification: any[];
  workflowTesting: any[];
  gasOptimization: any[];
  overallStatus: 'passed' | 'failed' | 'warning';
  summary: VerificationSummary;
}

export interface VerificationSummary {
  totalContracts: number;
  contractsPassed: number;
  totalWorkflows: number;
  workflowsPassed: number;
  totalGasUsed: number;
  estimatedSavings: number;
  criticalIssues: number;
  recommendations: number;
}

export class MainnetVerificationRunner {
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private verifier: PostDeploymentVerifier;
  private workflowTester: UserWorkflowTester;
  private gasAnalyzer: GasOptimizationAnalyzer;
  private contractAddresses: { [key: string]: string } = {};

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
    
    this.verifier = new PostDeploymentVerifier(this.provider, this.signer);
    this.workflowTester = new UserWorkflowTester(this.provider, this.signer);
    this.gasAnalyzer = new GasOptimizationAnalyzer(this.provider);
  }

  async loadContractAddresses(addressesPath: string) {
    try {
      const addressesData = fs.readFileSync(addressesPath, 'utf8');
      this.contractAddresses = JSON.parse(addressesData);
      console.log('Loaded contract addresses:', Object.keys(this.contractAddresses));
    } catch (error) {
      console.error('Error loading contract addresses:', error);
      throw error;
    }
  }

  async loadContractABIs(artifactsPath: string) {
    try {
      for (const [contractName, address] of Object.entries(this.contractAddresses)) {
        if (!address) continue;

        const artifactPath = path.join(artifactsPath, `${contractName}.sol`, `${contractName}.json`);
        
        if (fs.existsSync(artifactPath)) {
          const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
          
          // Add to all verification tools
          this.verifier.addContract(contractName, address, artifact.abi);
          this.workflowTester.addContract(contractName, address, artifact.abi);
          this.gasAnalyzer.addContract(contractName, address, artifact.abi);
          
          console.log(`Loaded ${contractName} at ${address}`);
        } else {
          console.warn(`Artifact not found for ${contractName} at ${artifactPath}`);
        }
      }
    } catch (error) {
      console.error('Error loading contract ABIs:', error);
      throw error;
    }
  }

  async runFullVerificationSuite(): Promise<VerificationSuite> {
    console.log('🚀 Starting comprehensive mainnet verification suite...\n');

    const startTime = Date.now();

    try {
      // Phase 1: Contract Verification
      console.log('📋 Phase 1: Contract Verification');
      console.log('================================');
      const contractResults = await this.verifier.verifyAllContracts();
      console.log(`✅ Contract verification completed: ${contractResults.filter(r => r.passed).length}/${contractResults.length} passed\n`);

      // Phase 2: User Workflow Testing
      console.log('👤 Phase 2: User Workflow Testing');
      console.log('=================================');
      const workflowResults = await this.workflowTester.runAllWorkflows();
      console.log(`✅ Workflow testing completed: ${workflowResults.filter(r => r.passed).length}/${workflowResults.length} passed\n`);

      // Phase 3: Gas Optimization Analysis
      console.log('⛽ Phase 3: Gas Optimization Analysis');
      console.log('====================================');
      
      // Collect gas data from workflow testing
      this.collectGasDataFromWorkflows(workflowResults);
      
      const gasResults = await this.gasAnalyzer.analyzeAllContracts();
      console.log(`✅ Gas analysis completed: ${gasResults.length} contracts analyzed\n`);

      // Generate comprehensive results
      const suite = this.compileSuiteResults(contractResults, workflowResults, gasResults);
      
      const duration = Date.now() - startTime;
      console.log(`🎉 Verification suite completed in ${duration}ms`);
      console.log(`📊 Overall Status: ${suite.overallStatus.toUpperCase()}`);

      return suite;

    } catch (error) {
      console.error('❌ Verification suite failed:', error);
      throw error;
    }
  }

  private collectGasDataFromWorkflows(workflowResults: any[]) {
    for (const workflow of workflowResults) {
      for (const step of workflow.steps) {
        if (step.gasUsed && step.transactionHash) {
          // Extract contract name and function from step name
          const contractName = this.extractContractFromStep(step.stepName);
          const functionName = this.extractFunctionFromStep(step.stepName);
          
          if (contractName && functionName) {
            this.gasAnalyzer.recordGasUsage(contractName, functionName, step.gasUsed);
          }
        }
      }
    }
  }

  private extractContractFromStep(stepName: string): string | null {
    // Map step names to contract names
    const stepToContract: { [key: string]: string } = {
      'stake': 'LDAOToken',
      'approve': 'LDAOToken',
      'mint': 'MockERC20',
      'create proposal': 'Governance',
      'create listing': 'Marketplace',
      'create escrow': 'EnhancedEscrow',
      'submit review': 'ReputationSystem',
      'mint nft': 'NFTMarketplace',
      'list nft': 'NFTMarketplace',
      'follow': 'FollowModule',
      'tip': 'TipRouter'
    };

    const lowerStepName = stepName.toLowerCase();
    for (const [key, contract] of Object.entries(stepToContract)) {
      if (lowerStepName.includes(key)) {
        return contract;
      }
    }

    return null;
  }

  private extractFunctionFromStep(stepName: string): string | null {
    // Extract function name from step name
    const lowerStepName = stepName.toLowerCase();
    
    if (lowerStepName.includes('stake')) return 'stake';
    if (lowerStepName.includes('approve')) return 'approve';
    if (lowerStepName.includes('mint')) return 'mint';
    if (lowerStepName.includes('create proposal')) return 'propose';
    if (lowerStepName.includes('create listing')) return 'createListing';
    if (lowerStepName.includes('create escrow')) return 'createEscrow';
    if (lowerStepName.includes('submit review')) return 'submitReview';
    if (lowerStepName.includes('list nft')) return 'listNFT';
    if (lowerStepName.includes('follow')) return 'follow';
    if (lowerStepName.includes('tip')) return 'tip';

    return null;
  }

  private compileSuiteResults(
    contractResults: any[],
    workflowResults: any[],
    gasResults: any[]
  ): VerificationSuite {
    const contractsPassed = contractResults.filter(r => r.passed).length;
    const workflowsPassed = workflowResults.filter(r => r.passed).length;
    const totalGasUsed = workflowResults.reduce((sum, w) => sum + w.totalGasUsed, 0);
    const estimatedSavings = gasResults.reduce((sum, g) => sum + g.totalEstimatedSavings, 0);
    
    // Count critical issues
    const criticalContractIssues = contractResults.filter(r => !r.passed).length;
    const criticalWorkflowIssues = workflowResults.filter(r => !r.passed).length;
    const criticalGasIssues = gasResults.filter(r => r.riskAssessment === 'critical').length;
    const criticalIssues = criticalContractIssues + criticalWorkflowIssues + criticalGasIssues;

    // Count recommendations
    const recommendations = gasResults.reduce(
      (sum, g) => sum + g.optimizationRecommendations.length,
      0
    );

    // Determine overall status
    let overallStatus: 'passed' | 'failed' | 'warning' = 'passed';
    
    if (criticalIssues > 0 || contractsPassed < contractResults.length || workflowsPassed < workflowResults.length) {
      overallStatus = 'failed';
    } else if (recommendations > 5 || estimatedSavings > 100000) {
      overallStatus = 'warning';
    }

    return {
      contractVerification: contractResults,
      workflowTesting: workflowResults,
      gasOptimization: gasResults,
      overallStatus,
      summary: {
        totalContracts: contractResults.length,
        contractsPassed,
        totalWorkflows: workflowResults.length,
        workflowsPassed,
        totalGasUsed,
        estimatedSavings,
        criticalIssues,
        recommendations
      }
    };
  }

  async generateComprehensiveReport(suite: VerificationSuite): Promise<string> {
    let report = '# Mainnet Deployment Verification Report\n\n';
    report += `**Generated**: ${new Date().toISOString()}\n`;
    report += `**Network**: ${await this.provider.getNetwork().then(n => n.name)}\n`;
    report += `**Verifier Address**: ${await this.signer.getAddress()}\n\n`;

    // Executive Summary
    report += '## Executive Summary\n\n';
    report += `**Overall Status**: ${this.getStatusEmoji(suite.overallStatus)} ${suite.overallStatus.toUpperCase()}\n\n`;
    
    report += '### Key Metrics\n\n';
    report += `- **Contracts Verified**: ${suite.summary.contractsPassed}/${suite.summary.totalContracts}\n`;
    report += `- **Workflows Tested**: ${suite.summary.workflowsPassed}/${suite.summary.totalWorkflows}\n`;
    report += `- **Total Gas Used**: ${suite.summary.totalGasUsed.toLocaleString()}\n`;
    report += `- **Potential Gas Savings**: ${suite.summary.estimatedSavings.toLocaleString()}\n`;
    report += `- **Critical Issues**: ${suite.summary.criticalIssues}\n`;
    report += `- **Optimization Recommendations**: ${suite.summary.recommendations}\n\n`;

    // Contract Verification Results
    report += '## Contract Verification Results\n\n';
    report += this.verifier.generateReport();
    report += '\n';

    // Workflow Testing Results
    report += '## User Workflow Testing Results\n\n';
    report += this.workflowTester.generateWorkflowReport();
    report += '\n';

    // Gas Optimization Analysis
    report += '## Gas Optimization Analysis\n\n';
    report += this.gasAnalyzer.generateOptimizationReport();
    report += '\n';

    // Action Items
    report += '## Action Items\n\n';
    
    const failedContracts = suite.contractVerification.filter(r => !r.passed);
    const failedWorkflows = suite.workflowTesting.filter(r => !r.passed);
    const highPriorityOptimizations = suite.gasOptimization.flatMap(g => 
      g.optimizationRecommendations.filter(r => r.priority === 'high')
    );

    if (failedContracts.length > 0) {
      report += '### 🚨 Critical: Failed Contract Verifications\n\n';
      for (const contract of failedContracts) {
        report += `- **${contract.contractName}**: ${contract.errors.join(', ')}\n`;
      }
      report += '\n';
    }

    if (failedWorkflows.length > 0) {
      report += '### 🚨 Critical: Failed User Workflows\n\n';
      for (const workflow of failedWorkflows) {
        report += `- **${workflow.workflowName}**: ${workflow.errors.join(', ')}\n`;
      }
      report += '\n';
    }

    if (highPriorityOptimizations.length > 0) {
      report += '### ⚠️ High Priority: Gas Optimizations\n\n';
      for (const opt of highPriorityOptimizations) {
        report += `- ${opt.description} (${opt.estimatedSavings.toLocaleString()} gas savings)\n`;
      }
      report += '\n';
    }

    // Deployment Readiness Assessment
    report += '## Deployment Readiness Assessment\n\n';
    
    if (suite.overallStatus === 'passed') {
      report += '✅ **READY FOR PRODUCTION**\n\n';
      report += 'All critical tests passed. The contracts are ready for mainnet deployment.\n\n';
    } else if (suite.overallStatus === 'warning') {
      report += '⚠️ **READY WITH CAUTION**\n\n';
      report += 'Core functionality works but there are optimization opportunities. Consider implementing high-priority recommendations.\n\n';
    } else {
      report += '❌ **NOT READY FOR PRODUCTION**\n\n';
      report += 'Critical issues found that must be resolved before mainnet deployment.\n\n';
    }

    // Next Steps
    report += '## Next Steps\n\n';
    
    if (suite.overallStatus === 'failed') {
      report += '1. **Fix Critical Issues**: Address all failed contract verifications and workflows\n';
      report += '2. **Re-run Verification**: Execute full verification suite again\n';
      report += '3. **Security Review**: Conduct additional security audit if needed\n';
    } else {
      report += '1. **Monitor Deployment**: Use monitoring dashboard to track contract health\n';
      report += '2. **Implement Optimizations**: Consider high-priority gas optimizations\n';
      report += '3. **User Communication**: Prepare user documentation and announcements\n';
    }

    return report;
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'passed': return '✅';
      case 'warning': return '⚠️';
      case 'failed': return '❌';
      default: return '❓';
    }
  }

  async saveReports(suite: VerificationSuite, outputDir: string) {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Save comprehensive report
    const comprehensiveReport = await this.generateComprehensiveReport(suite);
    fs.writeFileSync(
      path.join(outputDir, `mainnet-verification-${timestamp}.md`),
      comprehensiveReport
    );

    // Save individual reports
    fs.writeFileSync(
      path.join(outputDir, `contract-verification-${timestamp}.md`),
      this.verifier.generateReport()
    );

    fs.writeFileSync(
      path.join(outputDir, `workflow-testing-${timestamp}.md`),
      this.workflowTester.generateWorkflowReport()
    );

    fs.writeFileSync(
      path.join(outputDir, `gas-optimization-${timestamp}.md`),
      this.gasAnalyzer.generateOptimizationReport()
    );

    // Save raw data as JSON
    fs.writeFileSync(
      path.join(outputDir, `verification-data-${timestamp}.json`),
      JSON.stringify(suite, null, 2)
    );

    console.log(`📄 Reports saved to ${outputDir}`);
  }

  async getNetworkInfo() {
    const network = await this.provider.getNetwork();
    const blockNumber = await this.provider.getBlockNumber();
    const gasPrice = await this.provider.getFeeData();
    
    return {
      chainId: network.chainId,
      name: network.name,
      blockNumber,
      gasPrice: gasPrice.gasPrice?.toString(),
      maxFeePerGas: gasPrice.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas?.toString()
    };
  }
}

// CLI runner function
export async function runMainnetVerification() {
  const rpcUrl = process.env.MAINNET_RPC_URL || 'https://eth-mainnet.alchemyapi.io/v2/your-api-key';
  const privateKey = process.env.VERIFICATION_PRIVATE_KEY || '';
  const addressesPath = process.env.CONTRACT_ADDRESSES_PATH || './deployedAddresses.json';
  const artifactsPath = process.env.ARTIFACTS_PATH || './artifacts/contracts';
  const outputDir = process.env.VERIFICATION_OUTPUT_DIR || './verification-reports';

  if (!privateKey) {
    throw new Error('VERIFICATION_PRIVATE_KEY environment variable is required');
  }

  const runner = new MainnetVerificationRunner(rpcUrl, privateKey);

  try {
    console.log('🔧 Loading contract addresses and ABIs...');
    await runner.loadContractAddresses(addressesPath);
    await runner.loadContractABIs(artifactsPath);

    console.log('🌐 Network Info:');
    const networkInfo = await runner.getNetworkInfo();
    console.log(JSON.stringify(networkInfo, null, 2));

    console.log('\n🚀 Starting verification suite...');
    const suite = await runner.runFullVerificationSuite();

    console.log('\n📄 Generating reports...');
    await runner.saveReports(suite, outputDir);

    console.log('\n✅ Mainnet verification completed successfully!');
    process.exit(suite.overallStatus === 'failed' ? 1 : 0);

  } catch (error) {
    console.error('❌ Mainnet verification failed:', error);
    process.exit(1);
  }
}