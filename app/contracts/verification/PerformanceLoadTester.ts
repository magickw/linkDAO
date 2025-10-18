import { ethers } from 'ethers';
import { performance } from 'perf_hooks';

export interface LoadTestConfig {
  concurrentUsers: number;
  testDuration: number; // in seconds
  rampUpTime: number; // in seconds
  targetTPS: number; // transactions per second
  gasPrice: {
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  };
}

export interface PerformanceMetrics {
  testName: string;
  duration: number;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  throughput: number; // TPS
  gasUsage: {
    total: number;
    average: number;
    min: number;
    max: number;
  };
  errors: string[];
}

export interface TransactionResult {
  success: boolean;
  responseTime: number;
  gasUsed: number;
  error?: string;
  transactionHash?: string;
}

export class PerformanceLoadTester {
  private provider: ethers.Provider;
  private signers: ethers.Signer[] = [];
  private contracts: Map<string, ethers.Contract> = new Map();
  private testResults: PerformanceMetrics[] = [];

  constructor(provider: ethers.Provider, signers: ethers.Signer[]) {
    this.provider = provider;
    this.signers = signers;
  }

  addContract(name: string, address: string, abi: any[]) {
    // Create contract instances for each signer to enable concurrent testing
    for (let i = 0; i < this.signers.length; i++) {
      const contract = new ethers.Contract(address, abi, this.signers[i]);
      this.contracts.set(`${name}_${i}`, contract);
    }
  }

  async runPerformanceTests(): Promise<PerformanceMetrics[]> {
    console.log('🚀 Starting Performance and Load Testing...');
    this.testResults = [];

    // Test configurations for different scenarios
    const testConfigs = [
      {
        name: 'Light Load Test',
        config: {
          concurrentUsers: 5,
          testDuration: 60,
          rampUpTime: 10,
          targetTPS: 2,
          gasPrice: {
            maxFeePerGas: ethers.parseUnits('20', 'gwei').toString(),
            maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei').toString()
          }
        }
      },
      {
        name: 'Medium Load Test',
        config: {
          concurrentUsers: 10,
          testDuration: 120,
          rampUpTime: 20,
          targetTPS: 5,
          gasPrice: {
            maxFeePerGas: ethers.parseUnits('30', 'gwei').toString(),
            maxPriorityFeePerGas: ethers.parseUnits('3', 'gwei').toString()
          }
        }
      },
      {
        name: 'High Load Test',
        config: {
          concurrentUsers: 20,
          testDuration: 180,
          rampUpTime: 30,
          targetTPS: 10,
          gasPrice: {
            maxFeePerGas: ethers.parseUnits('50', 'gwei').toString(),
            maxPriorityFeePerGas: ethers.parseUnits('5', 'gwei').toString()
          }
        }
      }
    ];

    // Run each test configuration
    for (const testConfig of testConfigs) {
      console.log(`\n📊 Running ${testConfig.name}...`);
      const result = await this.runLoadTest(testConfig.name, testConfig.config);
      this.testResults.push(result);
    }

    // Run specific contract performance tests
    await this.runContractSpecificTests();

    return this.testResults;
  }

  private async runLoadTest(testName: string, config: LoadTestConfig): Promise<PerformanceMetrics> {
    const startTime = performance.now();
    const results: TransactionResult[] = [];
    const errors: string[] = [];

    try {
      // Create test scenarios
      const scenarios = this.createTestScenarios(config.concurrentUsers);
      
      // Execute load test with ramp-up
      const promises: Promise<TransactionResult[]>[] = [];
      
      for (let i = 0; i < config.concurrentUsers; i++) {
        // Stagger user start times for ramp-up
        const delay = (i * config.rampUpTime * 1000) / config.concurrentUsers;
        
        const userPromise = this.simulateUser(
          i,
          scenarios[i % scenarios.length],
          config,
          delay
        );
        
        promises.push(userPromise);
      }

      // Wait for all users to complete
      const allResults = await Promise.all(promises);
      
      // Flatten results
      for (const userResults of allResults) {
        results.push(...userResults);
      }

    } catch (error) {
      errors.push(`Load test error: ${error}`);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Calculate metrics
    const successfulTxs = results.filter(r => r.success);
    const failedTxs = results.filter(r => !r.success);
    
    const responseTimes = successfulTxs.map(r => r.responseTime);
    const gasUsages = successfulTxs.map(r => r.gasUsed);

    return {
      testName,
      duration,
      totalTransactions: results.length,
      successfulTransactions: successfulTxs.length,
      failedTransactions: failedTxs.length,
      averageResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      throughput: successfulTxs.length / (duration / 1000),
      gasUsage: {
        total: gasUsages.reduce((a, b) => a + b, 0),
        average: gasUsages.length > 0 ? gasUsages.reduce((a, b) => a + b, 0) / gasUsages.length : 0,
        min: gasUsages.length > 0 ? Math.min(...gasUsages) : 0,
        max: gasUsages.length > 0 ? Math.max(...gasUsages) : 0
      },
      errors: [...errors, ...failedTxs.map(r => r.error || 'Unknown error')]
    };
  }

  private createTestScenarios(userCount: number): string[] {
    const scenarios = [
      'token_operations',
      'marketplace_trading',
      'governance_voting',
      'social_interactions',
      'nft_trading',
      'reputation_updates'
    ];

    // Distribute scenarios evenly among users
    const result: string[] = [];
    for (let i = 0; i < userCount; i++) {
      result.push(scenarios[i % scenarios.length]);
    }

    return result;
  }

  private async simulateUser(
    userId: number,
    scenario: string,
    config: LoadTestConfig,
    delay: number
  ): Promise<TransactionResult[]> {
    // Wait for ramp-up delay
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const results: TransactionResult[] = [];
    const endTime = Date.now() + (config.testDuration * 1000);
    const intervalMs = 1000 / config.targetTPS;

    while (Date.now() < endTime) {
      try {
        const result = await this.executeScenario(userId, scenario, config);
        results.push(result);

        // Wait for next transaction based on target TPS
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      } catch (error) {
        results.push({
          success: false,
          responseTime: 0,
          gasUsed: 0,
          error: `User ${userId} scenario error: ${error}`
        });
      }
    }

    return results;
  }

  private async executeScenario(
    userId: number,
    scenario: string,
    config: LoadTestConfig
  ): Promise<TransactionResult> {
    const startTime = performance.now();

    try {
      switch (scenario) {
        case 'token_operations':
          return await this.executeTokenOperations(userId, config);
        case 'marketplace_trading':
          return await this.executeMarketplaceTrading(userId, config);
        case 'governance_voting':
          return await this.executeGovernanceVoting(userId, config);
        case 'social_interactions':
          return await this.executeSocialInteractions(userId, config);
        case 'nft_trading':
          return await this.executeNFTTrading(userId, config);
        case 'reputation_updates':
          return await this.executeReputationUpdates(userId, config);
        default:
          throw new Error(`Unknown scenario: ${scenario}`);
      }
    } catch (error) {
      const endTime = performance.now();
      return {
        success: false,
        responseTime: endTime - startTime,
        gasUsed: 0,
        error: `${error}`
      };
    }
  }

  private async executeTokenOperations(userId: number, config: LoadTestConfig): Promise<TransactionResult> {
    const startTime = performance.now();
    const contract = this.contracts.get(`LDAOToken_${userId % this.signers.length}`);
    
    if (!contract) {
      throw new Error('LDAOToken contract not found');
    }

    // Random token operation
    const operations = ['transfer', 'approve', 'stake'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let tx: ethers.ContractTransactionResponse;
    
    switch (operation) {
      case 'transfer':
        const recipient = this.signers[(userId + 1) % this.signers.length];
        tx = await contract.transfer(
          await recipient.getAddress(),
          ethers.parseEther('1'),
          {
            maxFeePerGas: config.gasPrice.maxFeePerGas,
            maxPriorityFeePerGas: config.gasPrice.maxPriorityFeePerGas
          }
        );
        break;
      case 'approve':
        tx = await contract.approve(
          await contract.getAddress(),
          ethers.parseEther('100'),
          {
            maxFeePerGas: config.gasPrice.maxFeePerGas,
            maxPriorityFeePerGas: config.gasPrice.maxPriorityFeePerGas
          }
        );
        break;
      case 'stake':
        tx = await contract.stake(
          ethers.parseEther('10'),
          0, // 30-day tier
          {
            maxFeePerGas: config.gasPrice.maxFeePerGas,
            maxPriorityFeePerGas: config.gasPrice.maxPriorityFeePerGas
          }
        );
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    const receipt = await tx.wait();
    const endTime = performance.now();

    return {
      success: receipt?.status === 1,
      responseTime: endTime - startTime,
      gasUsed: Number(receipt?.gasUsed || 0),
      transactionHash: tx.hash
    };
  }

  private async executeMarketplaceTrading(userId: number, config: LoadTestConfig): Promise<TransactionResult> {
    const startTime = performance.now();
    const contract = this.contracts.get(`Marketplace_${userId % this.signers.length}`);
    
    if (!contract) {
      throw new Error('Marketplace contract not found');
    }

    // Create a simple listing
    const tx = await contract.createListing(
      ethers.ZeroAddress, // ETH
      ethers.parseEther('0.01'),
      1,
      0, // ERC20 type
      0, // Fixed price
      `Test listing ${userId}-${Date.now()}`,
      {
        maxFeePerGas: config.gasPrice.maxFeePerGas,
        maxPriorityFeePerGas: config.gasPrice.maxPriorityFeePerGas
      }
    );

    const receipt = await tx.wait();
    const endTime = performance.now();

    return {
      success: receipt?.status === 1,
      responseTime: endTime - startTime,
      gasUsed: Number(receipt?.gasUsed || 0),
      transactionHash: tx.hash
    };
  }

  private async executeGovernanceVoting(userId: number, config: LoadTestConfig): Promise<TransactionResult> {
    const startTime = performance.now();
    const contract = this.contracts.get(`Governance_${userId % this.signers.length}`);
    
    if (!contract) {
      throw new Error('Governance contract not found');
    }

    // Create a proposal (simplified)
    const tx = await contract.propose(
      [await contract.getAddress()],
      [0],
      ['0x'],
      `Test proposal ${userId}-${Date.now()}`,
      0,
      {
        maxFeePerGas: config.gasPrice.maxFeePerGas,
        maxPriorityFeePerGas: config.gasPrice.maxPriorityFeePerGas
      }
    );

    const receipt = await tx.wait();
    const endTime = performance.now();

    return {
      success: receipt?.status === 1,
      responseTime: endTime - startTime,
      gasUsed: Number(receipt?.gasUsed || 0),
      transactionHash: tx.hash
    };
  }

  private async executeSocialInteractions(userId: number, config: LoadTestConfig): Promise<TransactionResult> {
    const startTime = performance.now();
    const contract = this.contracts.get(`TipRouter_${userId % this.signers.length}`);
    
    if (!contract) {
      throw new Error('TipRouter contract not found');
    }

    // Send a tip
    const recipient = this.signers[(userId + 1) % this.signers.length];
    const tx = await contract.tip(
      await recipient.getAddress(),
      ethers.parseEther('1'),
      Math.floor(Math.random() * 1000), // Random post ID
      {
        maxFeePerGas: config.gasPrice.maxFeePerGas,
        maxPriorityFeePerGas: config.gasPrice.maxPriorityFeePerGas
      }
    );

    const receipt = await tx.wait();
    const endTime = performance.now();

    return {
      success: receipt?.status === 1,
      responseTime: endTime - startTime,
      gasUsed: Number(receipt?.gasUsed || 0),
      transactionHash: tx.hash
    };
  }

  private async executeNFTTrading(userId: number, config: LoadTestConfig): Promise<TransactionResult> {
    const startTime = performance.now();
    const contract = this.contracts.get(`NFTMarketplace_${userId % this.signers.length}`);
    
    if (!contract) {
      throw new Error('NFTMarketplace contract not found');
    }

    // Mint an NFT
    const tx = await contract.mintNFT(
      await this.signers[userId % this.signers.length].getAddress(),
      `https://example.com/metadata/${userId}-${Date.now()}`,
      500, // 5% royalty
      {
        maxFeePerGas: config.gasPrice.maxFeePerGas,
        maxPriorityFeePerGas: config.gasPrice.maxPriorityFeePerGas
      }
    );

    const receipt = await tx.wait();
    const endTime = performance.now();

    return {
      success: receipt?.status === 1,
      responseTime: endTime - startTime,
      gasUsed: Number(receipt?.gasUsed || 0),
      transactionHash: tx.hash
    };
  }

  private async executeReputationUpdates(userId: number, config: LoadTestConfig): Promise<TransactionResult> {
    const startTime = performance.now();
    const contract = this.contracts.get(`ReputationSystem_${userId % this.signers.length}`);
    
    if (!contract) {
      throw new Error('ReputationSystem contract not found');
    }

    // Submit a review
    const reviewee = this.signers[(userId + 1) % this.signers.length];
    const tx = await contract.submitReview(
      await reviewee.getAddress(),
      Math.floor(Math.random() * 5) + 1, // 1-5 rating
      `Test review ${userId}-${Date.now()}`,
      Math.floor(Math.random() * 1000), // Random transaction ID
      {
        maxFeePerGas: config.gasPrice.maxFeePerGas,
        maxPriorityFeePerGas: config.gasPrice.maxPriorityFeePerGas
      }
    );

    const receipt = await tx.wait();
    const endTime = performance.now();

    return {
      success: receipt?.status === 1,
      responseTime: endTime - startTime,
      gasUsed: Number(receipt?.gasUsed || 0),
      transactionHash: tx.hash
    };
  }

  private async runContractSpecificTests(): Promise<void> {
    console.log('\n🔧 Running Contract-Specific Performance Tests...');

    // Test gas optimization for critical functions
    const gasTests = [
      { contract: 'LDAOToken', function: 'transfer', params: ['address', 'uint256'] },
      { contract: 'Marketplace', function: 'createListing', params: ['address', 'uint256', 'uint256', 'uint8', 'uint8', 'string'] },
      { contract: 'EnhancedEscrow', function: 'createEscrow', params: ['uint256', 'address', 'address'] },
      { contract: 'Governance', function: 'propose', params: ['address[]', 'uint256[]', 'bytes[]', 'string', 'uint8'] }
    ];

    for (const test of gasTests) {
      try {
        const result = await this.testFunctionGasUsage(test.contract, test.function, test.params);
        this.testResults.push(result);
      } catch (error) {
        console.error(`Gas test failed for ${test.contract}.${test.function}:`, error);
      }
    }
  }

  private async testFunctionGasUsage(
    contractName: string,
    functionName: string,
    paramTypes: string[]
  ): Promise<PerformanceMetrics> {
    const contract = this.contracts.get(`${contractName}_0`);
    if (!contract) {
      throw new Error(`Contract ${contractName} not found`);
    }

    const results: TransactionResult[] = [];
    const iterations = 10;

    for (let i = 0; i < iterations; i++) {
      try {
        const startTime = performance.now();
        
        // Generate dummy parameters
        const params = this.generateDummyParams(paramTypes, i);
        
        // Estimate gas
        const gasEstimate = await contract[functionName].estimateGas(...params);
        
        const endTime = performance.now();
        
        results.push({
          success: true,
          responseTime: endTime - startTime,
          gasUsed: Number(gasEstimate)
        });
      } catch (error) {
        results.push({
          success: false,
          responseTime: 0,
          gasUsed: 0,
          error: `${error}`
        });
      }
    }

    const successfulResults = results.filter(r => r.success);
    const gasUsages = successfulResults.map(r => r.gasUsed);
    const responseTimes = successfulResults.map(r => r.responseTime);

    return {
      testName: `Gas Test: ${contractName}.${functionName}`,
      duration: 0,
      totalTransactions: results.length,
      successfulTransactions: successfulResults.length,
      failedTransactions: results.length - successfulResults.length,
      averageResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      throughput: 0,
      gasUsage: {
        total: gasUsages.reduce((a, b) => a + b, 0),
        average: gasUsages.length > 0 ? gasUsages.reduce((a, b) => a + b, 0) / gasUsages.length : 0,
        min: gasUsages.length > 0 ? Math.min(...gasUsages) : 0,
        max: gasUsages.length > 0 ? Math.max(...gasUsages) : 0
      },
      errors: results.filter(r => !r.success).map(r => r.error || 'Unknown error')
    };
  }

  private generateDummyParams(paramTypes: string[], iteration: number): any[] {
    const params: any[] = [];
    
    for (const type of paramTypes) {
      switch (type) {
        case 'address':
          params.push(this.signers[iteration % this.signers.length].address);
          break;
        case 'uint256':
        case 'uint':
          params.push(ethers.parseEther('1'));
          break;
        case 'uint8':
          params.push(iteration % 256);
          break;
        case 'string':
          params.push(`test-${iteration}`);
          break;
        case 'bytes':
          params.push('0x');
          break;
        case 'address[]':
          params.push([this.signers[0].address]);
          break;
        case 'uint256[]':
          params.push([0]);
          break;
        case 'bytes[]':
          params.push(['0x']);
          break;
        default:
          params.push(0);
      }
    }
    
    return params;
  }

  generatePerformanceReport(): string {
    let report = '# Performance and Load Testing Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    // Executive Summary
    const totalTests = this.testResults.length;
    const loadTests = this.testResults.filter(r => r.testName.includes('Load Test'));
    const gasTests = this.testResults.filter(r => r.testName.includes('Gas Test'));

    report += '## Executive Summary\n\n';
    report += `- Total Performance Tests: ${totalTests}\n`;
    report += `- Load Tests: ${loadTests.length}\n`;
    report += `- Gas Optimization Tests: ${gasTests.length}\n\n`;

    // Load Test Results
    if (loadTests.length > 0) {
      report += '## Load Test Results\n\n';
      report += '| Test Name | Duration (s) | Total Txs | Success Rate | Avg Response (ms) | Throughput (TPS) | Avg Gas |\n';
      report += '|-----------|--------------|-----------|--------------|-------------------|------------------|----------|\n';
      
      for (const test of loadTests) {
        const successRate = ((test.successfulTransactions / test.totalTransactions) * 100).toFixed(1);
        report += `| ${test.testName} | ${(test.duration / 1000).toFixed(1)} | ${test.totalTransactions} | ${successRate}% | ${test.averageResponseTime.toFixed(1)} | ${test.throughput.toFixed(2)} | ${test.gasUsage.average.toFixed(0)} |\n`;
      }
      report += '\n';

      // Detailed Load Test Analysis
      for (const test of loadTests) {
        report += `### ${test.testName}\n\n`;
        report += `- **Duration**: ${(test.duration / 1000).toFixed(1)} seconds\n`;
        report += `- **Total Transactions**: ${test.totalTransactions}\n`;
        report += `- **Successful**: ${test.successfulTransactions}\n`;
        report += `- **Failed**: ${test.failedTransactions}\n`;
        report += `- **Success Rate**: ${((test.successfulTransactions / test.totalTransactions) * 100).toFixed(1)}%\n`;
        report += `- **Throughput**: ${test.throughput.toFixed(2)} TPS\n`;
        report += `- **Response Time**: ${test.averageResponseTime.toFixed(1)}ms (min: ${test.minResponseTime.toFixed(1)}ms, max: ${test.maxResponseTime.toFixed(1)}ms)\n`;
        report += `- **Gas Usage**: ${test.gasUsage.average.toFixed(0)} avg (min: ${test.gasUsage.min}, max: ${test.gasUsage.max})\n`;
        
        if (test.errors.length > 0) {
          report += `- **Errors**: ${test.errors.length} unique errors\n`;
        }
        report += '\n';
      }
    }

    // Gas Optimization Results
    if (gasTests.length > 0) {
      report += '## Gas Optimization Results\n\n';
      report += '| Function | Avg Gas | Min Gas | Max Gas | Success Rate |\n';
      report += '|----------|---------|---------|---------|-------------|\n';
      
      for (const test of gasTests) {
        const successRate = ((test.successfulTransactions / test.totalTransactions) * 100).toFixed(1);
        report += `| ${test.testName.replace('Gas Test: ', '')} | ${test.gasUsage.average.toFixed(0)} | ${test.gasUsage.min} | ${test.gasUsage.max} | ${successRate}% |\n`;
      }
      report += '\n';
    }

    // Performance Recommendations
    report += '## Performance Recommendations\n\n';
    
    // Analyze results for recommendations
    const highGasTests = gasTests.filter(t => t.gasUsage.average > 200000);
    const lowThroughputTests = loadTests.filter(t => t.throughput < 1);
    const highFailureTests = this.testResults.filter(t => (t.failedTransactions / t.totalTransactions) > 0.1);

    if (highGasTests.length > 0) {
      report += '### High Gas Usage Functions\n\n';
      report += 'The following functions have high gas usage and should be optimized:\n\n';
      for (const test of highGasTests) {
        report += `- ${test.testName.replace('Gas Test: ', '')}: ${test.gasUsage.average.toFixed(0)} gas\n`;
      }
      report += '\n';
    }

    if (lowThroughputTests.length > 0) {
      report += '### Low Throughput Tests\n\n';
      report += 'The following tests showed low throughput and may need optimization:\n\n';
      for (const test of lowThroughputTests) {
        report += `- ${test.testName}: ${test.throughput.toFixed(2)} TPS\n`;
      }
      report += '\n';
    }

    if (highFailureTests.length > 0) {
      report += '### High Failure Rate Tests\n\n';
      report += 'The following tests had high failure rates and need investigation:\n\n';
      for (const test of highFailureTests) {
        const failureRate = ((test.failedTransactions / test.totalTransactions) * 100).toFixed(1);
        report += `- ${test.testName}: ${failureRate}% failure rate\n`;
      }
      report += '\n';
    }

    // Network Recommendations
    report += '### Network Optimization\n\n';
    report += '- Monitor gas prices and adjust transaction fees dynamically\n';
    report += '- Implement transaction batching for high-frequency operations\n';
    report += '- Consider layer 2 solutions for high-volume activities\n';
    report += '- Implement circuit breakers for high failure rates\n\n';

    return report;
  }

  getResults(): PerformanceMetrics[] {
    return this.testResults;
  }
}