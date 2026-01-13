/**
 * Contract Verification Service
 * Verifies smart contracts using Etherscan API
 */

export interface ContractVerificationStatus {
  isContract: boolean;
  isVerified: boolean;
  contractName?: string;
  compilerVersion?: string;
  optimizationUsed?: boolean;
  runs?: number;
  constructorArguments?: string;
  sourceCode?: string;
  abi?: any[];
  auditReport?: string;
  securityScore?: number;
}

export interface ContractRiskAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  issues: string[];
  warnings: string[];
  recommendations: string[];
}

export class ContractVerificationService {
  private static instance: ContractVerificationService;
  private cache: Map<string, { data: ContractVerificationStatus; timestamp: number }> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): ContractVerificationService {
    if (!ContractVerificationService.instance) {
      ContractVerificationService.instance = new ContractVerificationService();
    }
    return ContractVerificationService.instance;
  }

  /**
   * Get Etherscan API URL for a chain
   */
  private getEtherscanUrl(chainId: number): string {
    const urls: Record<number, string> = {
      1: 'https://api.etherscan.io/api',
      5: 'https://api-goerli.etherscan.io/api',
      11155111: 'https://api-sepolia.etherscan.io/api',
      137: 'https://api.polygonscan.com/api',
      42161: 'https://api.arbiscan.io/api',
      8453: 'https://api.basescan.org/api',
      56: 'https://api.bscscan.com/api',
      43114: 'https://api.snowtrace.io/api',
      250: 'https://api.ftmscan.com/api',
    };

    return urls[chainId] || urls[1];
  }

  /**
   * Get Etherscan API key from environment
   */
  private getApiKey(): string {
    // In production, this should come from environment variables
    if (typeof process !== 'undefined' && process.env.ETHERSCAN_API_KEY) {
      return process.env.ETHERSCAN_API_KEY;
    }
    return ''; // Empty key for demo purposes
  }

  /**
   * Check if an address is a contract
   */
  async isContract(address: string, chainId: number = 1): Promise<boolean> {
    try {
      const url = this.getEtherscanUrl(chainId);
      const apiKey = this.getApiKey();
      
      const response = await fetch(
        `${url}?module=proxy&action=eth_getCode&address=${address}&tag=latest&apikey=${apiKey}`
      );
      
      const data = await response.json();
      
      if (data.status === '1' && data.result) {
        // If code is not '0x', it's a contract
        return data.result !== '0x' && data.result !== '0x0';
      }
      
      return false;
    } catch (error) {
      console.error('Failed to check if address is a contract:', error);
      return false;
    }
  }

  /**
   * Get contract source code from Etherscan
   */
  async getContractSourceCode(
    address: string,
    chainId: number = 1
  ): Promise<ContractVerificationStatus> {
    // Check cache first
    const cacheKey = `${chainId}:${address}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const url = this.getEtherscanUrl(chainId);
      const apiKey = this.getApiKey();
      
      const response = await fetch(
        `${url}?module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`
      );
      
      const data = await response.json();
      
      if (data.status === '0') {
        // Not verified or not a contract
        const isContract = await this.isContract(address, chainId);
        const result: ContractVerificationStatus = {
          isContract,
          isVerified: false,
          securityScore: isContract ? 30 : 100 // Low score for unverified contracts
        };
        
        // Cache the result
        this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
        
        return result;
      }
      
      if (data.result && data.result[0]) {
        const contractData = data.result[0];
        const isVerified = contractData.SourceCode && contractData.SourceCode !== '';
        
        const result: ContractVerificationStatus = {
          isContract: true,
          isVerified,
          contractName: contractData.ContractName,
          compilerVersion: contractData.CompilerVersion,
          optimizationUsed: contractData.OptimizationUsed === '1',
          runs: contractData.Runs ? parseInt(contractData.Runs) : undefined,
          constructorArguments: contractData.ConstructorArguments,
          sourceCode: contractData.SourceCode,
          abi: contractData.ABI ? JSON.parse(contractData.ABI) : undefined,
          securityScore: isVerified ? 85 : 30
        };
        
        // Cache the result
        this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
        
        return result;
      }
      
      return {
        isContract: false,
        isVerified: false,
        securityScore: 100
      };
    } catch (error) {
      console.error('Failed to get contract source code:', error);
      return {
        isContract: false,
        isVerified: false,
        securityScore: 50 // Medium score on error
      };
    }
  }

  /**
   * Assess contract security risks
   */
  async assessContractRisk(
    address: string,
    chainId: number = 1
  ): Promise<ContractRiskAssessment> {
    const verification = await this.getContractSourceCode(address, chainId);
    const issues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    if (!verification.isContract) {
      return {
        riskLevel: 'low',
        score: 100,
        issues: [],
        warnings: [],
        recommendations: []
      };
    }

    // Check if contract is verified
    if (!verification.isVerified) {
      issues.push('Contract source code is not verified on Etherscan');
      score -= 40;
      recommendations.push('Verify contract source code on Etherscan');
    }

    // Check compiler version
    if (verification.compilerVersion) {
      const versionMatch = verification.compilerVersion.match(/(\d+)\.(\d+)\.(\d+)/);
      if (versionMatch) {
        const major = parseInt(versionMatch[1]);
        const minor = parseInt(versionMatch[2]);
        
        // Check for old compiler versions
        if (major < 0 || (major === 0 && minor < 8)) {
          warnings.push('Contract uses old compiler version which may have known vulnerabilities');
          score -= 10;
          recommendations.push('Consider upgrading to Solidity 0.8.0 or higher');
        }
      }
    }

    // Check optimization
    if (!verification.optimizationUsed) {
      warnings.push('Contract is not optimized. This may lead to higher gas costs');
      recommendations.push('Consider enabling optimization to reduce gas costs');
    }

    // Analyze source code for common security issues
    if (verification.sourceCode) {
      const sourceCode = verification.sourceCode.toLowerCase();
      
      // Check for common vulnerabilities
      if (sourceCode.includes('.call.value(')) {
        issues.push('Contract uses low-level call with value transfer');
        score -= 15;
        recommendations.push('Consider using safer transfer methods');
      }
      
      if (sourceCode.includes('tx.origin')) {
        issues.push('Contract uses tx.origin which is vulnerable to phishing attacks');
        score -= 20;
        recommendations.push('Replace tx.origin with msg.sender');
      }
      
      if (sourceCode.includes('delegatecall(')) {
        warnings.push('Contract uses delegatecall which can be dangerous if not properly secured');
        score -= 10;
        recommendations.push('Ensure delegatecall targets are properly validated');
      }
      
      if (sourceCode.includes('selfdestruct(')) {
        warnings.push('Contract contains selfdestruct function');
        score -= 10;
        recommendations.push('Ensure selfdestruct is properly protected');
      }
      
      if (sourceCode.includes('suicide(')) {
        issues.push('Contract uses deprecated suicide function');
        score -= 15;
        recommendations.push('Replace suicide with selfdestruct');
      }
      
      // Check for ReentrancyGuard
      if (!sourceCode.includes('nonreentrant') && !sourceCode.includes('reentrancyguard')) {
        warnings.push('Contract may not have reentrancy protection');
        score -= 10;
        recommendations.push('Consider adding ReentrancyGuard');
      }
      
      // Check for Ownable
      if (!sourceCode.includes('ownable') && !sourceCode.includes('accesscontrol')) {
        warnings.push('Contract may not have proper access control');
        score -= 10;
        recommendations.push('Consider adding Ownable or AccessControl');
      }
      
      // Check for SafeMath (only needed for Solidity < 0.8)
      if (verification.compilerVersion) {
        const versionMatch = verification.compilerVersion.match(/(\d+)\.(\d+)\.(\d+)/);
        if (versionMatch) {
          const major = parseInt(versionMatch[1]);
          if (major < 8 && !sourceCode.includes('safemath')) {
            issues.push('Contract uses Solidity < 0.8 without SafeMath');
            score -= 15;
            recommendations.push('Add SafeMath or upgrade to Solidity 0.8+');
          }
        }
      }
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (score >= 80) {
      riskLevel = 'low';
    } else if (score >= 60) {
      riskLevel = 'medium';
    } else if (score >= 40) {
      riskLevel = 'high';
    } else {
      riskLevel = 'critical';
    }

    return {
      riskLevel,
      score: Math.max(0, score),
      issues,
      warnings,
      recommendations
    };
  }

  /**
   * Get contract ABI
   */
  async getContractABI(address: string, chainId: number = 1): Promise<any[] | null> {
    try {
      const verification = await this.getContractSourceCode(address, chainId);
      return verification.abi || null;
    } catch (error) {
      console.error('Failed to get contract ABI:', error);
      return null;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const contractVerificationService = ContractVerificationService.getInstance();