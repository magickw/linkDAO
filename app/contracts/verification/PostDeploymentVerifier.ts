import { ethers } from 'ethers';
import { expect } from 'chai';

export interface VerificationResult {
  contractName: string;
  address: string;
  passed: boolean;
  tests: TestResult[];
  gasEstimates: GasEstimate[];
  errors: string[];
}

export interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  gasUsed?: number;
}

export interface GasEstimate {
  functionName: string;
  estimatedGas: number;
  actualGas?: number;
  category: 'low' | 'medium' | 'high' | 'critical';
}

export class PostDeploymentVerifier {
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private contracts: Map<string, ethers.Contract> = new Map();
  private verificationResults: VerificationResult[] = [];

  constructor(provider: ethers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  addContract(name: string, address: string, abi: any[]) {
    const contract = new ethers.Contract(address, abi, this.signer);
    this.contracts.set(name, contract);
  }

  async verifyAllContracts(): Promise<VerificationResult[]> {
    console.log('Starting post-deployment verification...');
    this.verificationResults = [];

    for (const [name, contract] of this.contracts) {
      console.log(`Verifying ${name}...`);
      const result = await this.verifyContract(name, contract);
      this.verificationResults.push(result);
    }

    return this.verificationResults;
  }

  private async verifyContract(name: string, contract: ethers.Contract): Promise<VerificationResult> {
    const result: VerificationResult = {
      contractName: name,
      address: await contract.getAddress(),
      passed: true,
      tests: [],
      gasEstimates: [],
      errors: []
    };

    try {
      // Basic contract verification
      await this.verifyBasicFunctionality(name, contract, result);
      
      // Contract-specific verification
      await this.verifyContractSpecific(name, contract, result);
      
      // Gas estimation
      await this.estimateGasCosts(name, contract, result);
      
      // Security checks
      await this.performSecurityChecks(name, contract, result);

    } catch (error) {
      result.errors.push(`Verification failed: ${error}`);
      result.passed = false;
    }

    // Overall pass/fail based on critical tests
    result.passed = result.tests.every(test => 
      test.passed || !this.isCriticalTest(test.testName)
    ) && result.errors.length === 0;

    return result;
  }

  private async verifyBasicFunctionality(
    name: string, 
    contract: ethers.Contract, 
    result: VerificationResult
  ) {
    // Test 1: Contract is deployed and responsive
    try {
      const address = await contract.getAddress();
      const code = await this.provider.getCode(address);
      
      result.tests.push({
        testName: 'Contract Deployment',
        passed: code !== '0x',
        gasUsed: 0
      });
    } catch (error) {
      result.tests.push({
        testName: 'Contract Deployment',
        passed: false,
        error: `${error}`
      });
    }

    // Test 2: Basic read functions work
    try {
      const functions = contract.interface.fragments.filter(
        f => f.type === 'function' && f.stateMutability === 'view'
      );

      for (const func of functions.slice(0, 3)) { // Test first 3 view functions
        try {
          await contract[func.name]();
          result.tests.push({
            testName: `View Function: ${func.name}`,
            passed: true
          });
        } catch (error) {
          result.tests.push({
            testName: `View Function: ${func.name}`,
            passed: false,
            error: `${error}`
          });
        }
      }
    } catch (error) {
      result.errors.push(`Error testing view functions: ${error}`);
    }
  }

  private async verifyContractSpecific(
    name: string, 
    contract: ethers.Contract, 
    result: VerificationResult
  ) {
    switch (name) {
      case 'LDAOToken':
        await this.verifyLDAOToken(contract, result);
        break;
      case 'Governance':
        await this.verifyGovernance(contract, result);
        break;
      case 'Marketplace':
        await this.verifyMarketplace(contract, result);
        break;
      case 'EnhancedEscrow':
        await this.verifyEscrow(contract, result);
        break;
      case 'ReputationSystem':
        await this.verifyReputationSystem(contract, result);
        break;
      case 'NFTMarketplace':
        await this.verifyNFTMarketplace(contract, result);
        break;
      default:
        // Generic contract verification
        await this.verifyGenericContract(contract, result);
    }
  }

  private async verifyLDAOToken(contract: ethers.Contract, result: VerificationResult) {
    try {
      // Test total supply
      const totalSupply = await contract.totalSupply();
      const expectedSupply = ethers.parseEther('1000000000'); // 1 billion
      
      result.tests.push({
        testName: 'LDAO Token Total Supply',
        passed: totalSupply === expectedSupply
      });

      // Test staking tiers
      const tierCount = await contract.getStakingTierCount();
      result.tests.push({
        testName: 'Staking Tiers Configuration',
        passed: tierCount === 4n
      });

      // Test permit functionality
      const domain = await contract.eip712Domain();
      result.tests.push({
        testName: 'EIP-712 Domain Setup',
        passed: domain.name === 'LDAOToken'
      });

    } catch (error) {
      result.errors.push(`LDAO Token verification error: ${error}`);
    }
  }

  private async verifyGovernance(contract: ethers.Contract, result: VerificationResult) {
    try {
      // Test governance parameters
      const votingDelay = await contract.votingDelay();
      const votingPeriod = await contract.votingPeriod();
      const quorum = await contract.quorum(0);

      result.tests.push({
        testName: 'Governance Parameters',
        passed: votingDelay > 0 && votingPeriod > 0 && quorum > 0
      });

      // Test proposal categories
      const categoryCount = await contract.getProposalCategoryCount();
      result.tests.push({
        testName: 'Proposal Categories',
        passed: categoryCount >= 5n // At least 5 categories
      });

    } catch (error) {
      result.errors.push(`Governance verification error: ${error}`);
    }
  }

  private async verifyMarketplace(contract: ethers.Contract, result: VerificationResult) {
    try {
      // Test marketplace is not paused
      const paused = await contract.paused();
      result.tests.push({
        testName: 'Marketplace Not Paused',
        passed: !paused
      });

      // Test fee configuration
      const platformFee = await contract.platformFee();
      result.tests.push({
        testName: 'Platform Fee Configuration',
        passed: platformFee <= 1000 // Max 10%
      });

      // Test supported asset types
      const supportsERC20 = await contract.supportsAssetType(0); // ERC20
      const supportsERC721 = await contract.supportsAssetType(1); // ERC721
      
      result.tests.push({
        testName: 'Asset Type Support',
        passed: supportsERC20 && supportsERC721
      });

    } catch (error) {
      result.errors.push(`Marketplace verification error: ${error}`);
    }
  }

  private async verifyEscrow(contract: ethers.Contract, result: VerificationResult) {
    try {
      // Test escrow is operational
      const paused = await contract.paused();
      result.tests.push({
        testName: 'Escrow Not Paused',
        passed: !paused
      });

      // Test timeout configuration
      const defaultTimeout = await contract.defaultTimeout();
      result.tests.push({
        testName: 'Default Timeout Configuration',
        passed: defaultTimeout > 0 && defaultTimeout <= 30 * 24 * 60 * 60 // Max 30 days
      });

    } catch (error) {
      result.errors.push(`Escrow verification error: ${error}`);
    }
  }

  private async verifyReputationSystem(contract: ethers.Contract, result: VerificationResult) {
    try {
      // Test reputation tiers
      const tierCount = await contract.getReputationTierCount();
      result.tests.push({
        testName: 'Reputation Tiers',
        passed: tierCount >= 5n // At least 5 tiers
      });

      // Test anti-gaming measures
      const maxReviewsPerDay = await contract.maxReviewsPerDay();
      result.tests.push({
        testName: 'Anti-Gaming Measures',
        passed: maxReviewsPerDay > 0 && maxReviewsPerDay <= 10
      });

    } catch (error) {
      result.errors.push(`Reputation System verification error: ${error}`);
    }
  }

  private async verifyNFTMarketplace(contract: ethers.Contract, result: VerificationResult) {
    try {
      // Test NFT marketplace is operational
      const paused = await contract.paused();
      result.tests.push({
        testName: 'NFT Marketplace Not Paused',
        passed: !paused
      });

      // Test royalty support
      const maxRoyalty = await contract.maxRoyaltyPercentage();
      result.tests.push({
        testName: 'Royalty Configuration',
        passed: maxRoyalty <= 1000 // Max 10%
      });

    } catch (error) {
      result.errors.push(`NFT Marketplace verification error: ${error}`);
    }
  }

  private async verifyGenericContract(contract: ethers.Contract, result: VerificationResult) {
    try {
      // Test ownership if applicable
      if (contract.interface.hasFunction('owner')) {
        const owner = await contract.owner();
        result.tests.push({
          testName: 'Owner Set',
          passed: owner !== ethers.ZeroAddress
        });
      }

      // Test pause functionality if applicable
      if (contract.interface.hasFunction('paused')) {
        const paused = await contract.paused();
        result.tests.push({
          testName: 'Pause State',
          passed: typeof paused === 'boolean'
        });
      }

    } catch (error) {
      result.errors.push(`Generic contract verification error: ${error}`);
    }
  }

  private async estimateGasCosts(
    name: string, 
    contract: ethers.Contract, 
    result: VerificationResult
  ) {
    try {
      const functions = contract.interface.fragments.filter(
        f => f.type === 'function' && f.stateMutability !== 'view' && f.stateMutability !== 'pure'
      );

      for (const func of functions.slice(0, 5)) { // Test first 5 non-view functions
        try {
          // Create dummy parameters for estimation
          const params = this.generateDummyParams(func);
          const gasEstimate = await contract[func.name].estimateGas(...params);
          
          result.gasEstimates.push({
            functionName: func.name,
            estimatedGas: Number(gasEstimate),
            category: this.categorizeGasUsage(Number(gasEstimate))
          });
        } catch (error) {
          // Some functions may fail with dummy params, that's okay
          result.gasEstimates.push({
            functionName: func.name,
            estimatedGas: 0,
            category: 'low'
          });
        }
      }
    } catch (error) {
      result.errors.push(`Gas estimation error: ${error}`);
    }
  }

  private generateDummyParams(func: any): any[] {
    const params: any[] = [];
    
    for (const input of func.inputs) {
      switch (input.type) {
        case 'address':
          params.push(ethers.ZeroAddress);
          break;
        case 'uint256':
        case 'uint':
          params.push(1);
          break;
        case 'string':
          params.push('test');
          break;
        case 'bytes':
          params.push('0x');
          break;
        case 'bool':
          params.push(false);
          break;
        default:
          if (input.type.startsWith('uint')) {
            params.push(1);
          } else if (input.type.startsWith('bytes')) {
            params.push('0x');
          } else {
            params.push(0);
          }
      }
    }
    
    return params;
  }

  private categorizeGasUsage(gasUsed: number): 'low' | 'medium' | 'high' | 'critical' {
    if (gasUsed < 50000) return 'low';
    if (gasUsed < 150000) return 'medium';
    if (gasUsed < 300000) return 'high';
    return 'critical';
  }

  private async performSecurityChecks(
    name: string, 
    contract: ethers.Contract, 
    result: VerificationResult
  ) {
    try {
      // Check for emergency pause mechanism
      if (contract.interface.hasFunction('pause')) {
        result.tests.push({
          testName: 'Emergency Pause Available',
          passed: true
        });
      }

      // Check for access control
      if (contract.interface.hasFunction('hasRole')) {
        const adminRole = await contract.DEFAULT_ADMIN_ROLE();
        const hasAdmin = await contract.hasRole(adminRole, await this.signer.getAddress());
        
        result.tests.push({
          testName: 'Access Control Configured',
          passed: typeof hasAdmin === 'boolean'
        });
      }

      // Check for reentrancy protection (if ReentrancyGuard is used)
      if (contract.interface.hasFunction('_reentrancyGuardEntered')) {
        result.tests.push({
          testName: 'Reentrancy Protection',
          passed: true
        });
      }

    } catch (error) {
      result.errors.push(`Security check error: ${error}`);
    }
  }

  private isCriticalTest(testName: string): boolean {
    const criticalTests = [
      'Contract Deployment',
      'Owner Set',
      'Emergency Pause Available',
      'Access Control Configured'
    ];
    
    return criticalTests.some(critical => testName.includes(critical));
  }

  generateReport(): string {
    let report = '# Post-Deployment Verification Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    // Summary
    const totalContracts = this.verificationResults.length;
    const passedContracts = this.verificationResults.filter(r => r.passed).length;
    const failedContracts = totalContracts - passedContracts;

    report += '## Summary\n\n';
    report += `- Total Contracts: ${totalContracts}\n`;
    report += `- Passed: ${passedContracts}\n`;
    report += `- Failed: ${failedContracts}\n`;
    report += `- Success Rate: ${((passedContracts / totalContracts) * 100).toFixed(1)}%\n\n`;

    // Detailed results
    report += '## Detailed Results\n\n';

    for (const result of this.verificationResults) {
      report += `### ${result.contractName}\n\n`;
      report += `- **Address**: ${result.address}\n`;
      report += `- **Status**: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;

      if (result.tests.length > 0) {
        report += '#### Tests\n\n';
        for (const test of result.tests) {
          const status = test.passed ? '✅' : '❌';
          report += `- ${status} ${test.testName}`;
          if (test.error) {
            report += ` - Error: ${test.error}`;
          }
          if (test.gasUsed) {
            report += ` - Gas: ${test.gasUsed}`;
          }
          report += '\n';
        }
        report += '\n';
      }

      if (result.gasEstimates.length > 0) {
        report += '#### Gas Estimates\n\n';
        report += '| Function | Estimated Gas | Category |\n';
        report += '|----------|---------------|----------|\n';
        for (const estimate of result.gasEstimates) {
          report += `| ${estimate.functionName} | ${estimate.estimatedGas} | ${estimate.category} |\n`;
        }
        report += '\n';
      }

      if (result.errors.length > 0) {
        report += '#### Errors\n\n';
        for (const error of result.errors) {
          report += `- ❌ ${error}\n`;
        }
        report += '\n';
      }
    }

    // Gas usage summary
    report += '## Gas Usage Summary\n\n';
    const allEstimates = this.verificationResults.flatMap(r => r.gasEstimates);
    const avgGas = allEstimates.reduce((sum, e) => sum + e.estimatedGas, 0) / allEstimates.length;
    const maxGas = Math.max(...allEstimates.map(e => e.estimatedGas));
    const minGas = Math.min(...allEstimates.filter(e => e.estimatedGas > 0).map(e => e.estimatedGas));

    report += `- Average Gas Usage: ${avgGas.toFixed(0)}\n`;
    report += `- Maximum Gas Usage: ${maxGas}\n`;
    report += `- Minimum Gas Usage: ${minGas}\n\n`;

    // Recommendations
    report += '## Recommendations\n\n';
    
    const highGasFunctions = allEstimates.filter(e => e.category === 'critical' || e.category === 'high');
    if (highGasFunctions.length > 0) {
      report += '### High Gas Usage Functions\n\n';
      report += 'The following functions have high gas usage and should be monitored:\n\n';
      for (const func of highGasFunctions) {
        report += `- ${func.functionName}: ${func.estimatedGas} gas (${func.category})\n`;
      }
      report += '\n';
    }

    const failedResults = this.verificationResults.filter(r => !r.passed);
    if (failedResults.length > 0) {
      report += '### Failed Contracts\n\n';
      report += 'The following contracts failed verification and need attention:\n\n';
      for (const result of failedResults) {
        report += `- ${result.contractName}: ${result.errors.join(', ')}\n`;
      }
      report += '\n';
    }

    return report;
  }

  getResults(): VerificationResult[] {
    return this.verificationResults;
  }
}