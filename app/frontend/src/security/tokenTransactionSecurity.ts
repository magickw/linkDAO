/**
 * Token Transaction Validation and Smart Contract Interaction Security
 * Comprehensive security for Web3 transactions in the enhanced social dashboard
 */

import { ethers } from 'ethers';

export interface TransactionValidationConfig {
  maxGasPrice: bigint;
  maxGasLimit: bigint;
  maxTokenAmount: bigint;
  allowedTokens: string[];
  allowedContracts: string[];
  requireConfirmations: number;
  enableSlippageProtection: boolean;
  maxSlippage: number; // percentage
}

export interface TransactionValidationResult {
  valid: boolean;
  transaction?: ethers.TransactionRequest;
  errors: string[];
  warnings: string[];
  estimatedGas?: bigint;
  estimatedCost?: bigint;
  security: {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    checks: SecurityCheck[];
    recommendations: string[];
  };
}

export interface SecurityCheck {
  name: string;
  passed: boolean;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface SmartContractValidation {
  address: string;
  verified: boolean;
  source?: string;
  abi?: any[];
  functions: ContractFunction[];
  security: {
    safe: boolean;
    issues: string[];
    warnings: string[];
  };
}

export interface ContractFunction {
  name: string;
  type: 'view' | 'pure' | 'nonpayable' | 'payable';
  inputs: any[];
  outputs: any[];
  dangerous: boolean;
  reason?: string;
}

export class TokenTransactionSecurity {
  private static readonly DEFAULT_CONFIG: TransactionValidationConfig = {
    maxGasPrice: BigInt(ethers.parseUnits('100', 'gwei').toString()),
    maxGasLimit: BigInt(500000),
    maxTokenAmount: BigInt(ethers.parseEther('1000').toString()),
    allowedTokens: [
      '0xA0b86a33E6441b8C4505E2c52C6b6046d4c7F4e0', // USDC
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      '0x6B175474E89094C44Da98b954EedeAC495271d0F'  // DAI
    ],
    allowedContracts: [],
    requireConfirmations: 1,
    enableSlippageProtection: true,
    maxSlippage: 5
  };

  private static readonly DANGEROUS_FUNCTIONS = [
    'selfdestruct',
    'delegatecall',
    'callcode',
    'suicide',
    'kill',
    'destroy',
    'transferOwnership',
    'renounceOwnership',
    'pause',
    'unpause',
    'mint',
    'burn'
  ];

  private static readonly HIGH_RISK_PATTERNS = [
    /proxy/i,
    /upgrade/i,
    /admin/i,
    /owner/i,
    /governance/i,
    /emergency/i
  ];

  /**
   * Validate token transaction before execution
   */
  static async validateTransaction(
    transaction: ethers.TransactionRequest,
    provider: ethers.Provider,
    config: Partial<TransactionValidationConfig> = {}
  ): Promise<TransactionValidationResult> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const errors: string[] = [];
    const warnings: string[] = [];
    const checks: SecurityCheck[] = [];

    try {
      // Basic transaction validation
      const basicValidation = await this.validateBasicTransaction(transaction, finalConfig);
      errors.push(...basicValidation.errors);
      warnings.push(...basicValidation.warnings);
      checks.push(...basicValidation.checks);

      // Gas validation
      const gasValidation = await this.validateGas(transaction, provider, finalConfig);
      errors.push(...gasValidation.errors);
      warnings.push(...gasValidation.warnings);
      checks.push(...gasValidation.checks);

      // Contract validation if interacting with contract
      if (transaction.to && transaction.data && transaction.data !== '0x') {
        // Resolve the AddressLike to a string
        const toAddress = await ethers.resolveAddress(transaction.to);
        const contractValidation = await this.validateContractInteraction(
          toAddress,
          transaction.data?.toString() || '',
          provider,
          finalConfig
        );
        errors.push(...contractValidation.errors);
        warnings.push(...contractValidation.warnings);
        checks.push(...contractValidation.checks);
      }

      // Token validation if ERC20 transfer
      if (transaction.to && transaction.data) {
        // Resolve the AddressLike to a string
        const toAddress = await ethers.resolveAddress(transaction.to);
        const tokenValidation = await this.validateTokenTransfer(
          toAddress,
          transaction.data?.toString() || '',
          provider,
          finalConfig
        );
        errors.push(...tokenValidation.errors);
        warnings.push(...tokenValidation.warnings);
        checks.push(...tokenValidation.checks);
      }

      // Calculate risk level
      const riskLevel = this.calculateRiskLevel(checks, errors, warnings);

      // Generate recommendations
      const recommendations = this.generateRecommendations(checks, errors, warnings);

      // Estimate gas and cost
      let estimatedGas: bigint | undefined;
      let estimatedCost: bigint | undefined;

      try {
        const gasEstimate = await provider.estimateGas(transaction);
        estimatedGas = BigInt(gasEstimate.toString());
        const gasPriceValue = transaction.gasPrice || (await provider.getFeeData()).gasPrice;
        const gasPrice = gasPriceValue ? BigInt(gasPriceValue.toString()) : BigInt(0);
        estimatedCost = estimatedGas * gasPrice;
      } catch (error) {
        warnings.push('Could not estimate gas cost');
      }

      return {
        valid: errors.length === 0,
        transaction: errors.length === 0 ? transaction : undefined,
        errors,
        warnings,
        estimatedGas,
        estimatedCost,
        security: {
          riskLevel,
          checks,
          recommendations
        }
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Transaction validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
        security: {
          riskLevel: 'critical',
          checks,
          recommendations: ['Do not proceed with this transaction']
        }
      };
    }
  }

  /**
   * Validate smart contract before interaction
   */
  static async validateSmartContract(
    address: string,
    provider: ethers.Provider
  ): Promise<SmartContractValidation> {
    const issues: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if address is a contract
      const code = await provider.getCode(address);
      if (code === '0x') {
        issues.push('Address is not a contract');
        return {
          address,
          verified: false,
          functions: [],
          security: { safe: false, issues, warnings }
        };
      }

      // Try to get contract ABI (this would typically come from a verification service)
      const contractValidation = await this.analyzeContractCode(address, code);
      
      return {
        address,
        verified: contractValidation.verified,
        source: contractValidation.source,
        abi: contractValidation.abi,
        functions: contractValidation.functions,
        security: {
          safe: contractValidation.safe,
          issues: contractValidation.issues,
          warnings: contractValidation.warnings
        }
      };

    } catch (error) {
      issues.push(`Contract validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        address,
        verified: false,
        functions: [],
        security: { safe: false, issues, warnings }
      };
    }
  }

  /**
   * Validate basic transaction properties
   */
  private static async validateBasicTransaction(
    transaction: ethers.TransactionRequest,
    config: TransactionValidationConfig
  ): Promise<{ errors: string[]; warnings: string[]; checks: SecurityCheck[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const checks: SecurityCheck[] = [];

    // Validate recipient address
    if (!transaction.to) {
      errors.push('Transaction recipient is required');
      checks.push({
        name: 'Recipient Address',
        passed: false,
        message: 'No recipient address provided',
        severity: 'error'
      });
    } else {
      try {
        const toAddress = await ethers.resolveAddress(transaction.to);
        ethers.getAddress(toAddress);
        checks.push({
          name: 'Recipient Address',
          passed: true,
          message: 'Valid recipient address',
          severity: 'info'
        });
      } catch {
        errors.push('Invalid recipient address format');
        checks.push({
          name: 'Recipient Address',
          passed: false,
          message: 'Invalid address format',
          severity: 'error'
        });
      }
    }

    // Validate value
    if (transaction.value && BigInt(transaction.value.toString()) > BigInt(ethers.parseEther('10').toString())) {
      warnings.push('Large ETH transfer detected');
      checks.push({
        name: 'Transaction Value',
        passed: true,
        message: 'Large ETH transfer - please verify',
        severity: 'warning'
      });
    }

    // Validate nonce
    if (transaction.nonce !== undefined && Number(transaction.nonce) < 0) {
      errors.push('Invalid transaction nonce');
      checks.push({
        name: 'Transaction Nonce',
        passed: false,
        message: 'Negative nonce not allowed',
        severity: 'error'
      });
    }

    return { errors, warnings, checks };
  }

  /**
   * Validate gas parameters
   */
  private static async validateGas(
    transaction: ethers.TransactionRequest,
    provider: ethers.Provider,
    config: TransactionValidationConfig
  ): Promise<{ errors: string[]; warnings: string[]; checks: SecurityCheck[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const checks: SecurityCheck[] = [];

    try {
      // Get current gas price
      const feeData = await provider.getFeeData();
      const currentGasPrice = feeData.gasPrice || BigInt(0);

      // Validate gas price
      if (transaction.gasPrice) {
        if (BigInt(transaction.gasPrice.toString()) > config.maxGasPrice) {
          errors.push(`Gas price ${ethers.formatUnits(transaction.gasPrice, 'gwei')} gwei exceeds maximum ${ethers.formatUnits(config.maxGasPrice.toString(), 'gwei')} gwei`);
          checks.push({
            name: 'Gas Price',
            passed: false,
            message: 'Gas price too high',
            severity: 'error'
          });
        } else if (BigInt(transaction.gasPrice.toString()) > BigInt(currentGasPrice.toString()) * BigInt(2)) {
          warnings.push('Gas price is significantly higher than current network rate');
          checks.push({
            name: 'Gas Price',
            passed: true,
            message: 'High gas price detected',
            severity: 'warning'
          });
        } else {
          checks.push({
            name: 'Gas Price',
            passed: true,
            message: 'Gas price within acceptable range',
            severity: 'info'
          });
        }
      }

      // Validate gas limit
      if (transaction.gasLimit) {
        if (BigInt(transaction.gasLimit.toString()) > config.maxGasLimit) {
          errors.push(`Gas limit ${transaction.gasLimit} exceeds maximum ${config.maxGasLimit}`);
          checks.push({
            name: 'Gas Limit',
            passed: false,
            message: 'Gas limit too high',
            severity: 'error'
          });
        } else {
          checks.push({
            name: 'Gas Limit',
            passed: true,
            message: 'Gas limit within acceptable range',
            severity: 'info'
          });
        }
      }

    } catch (error) {
      warnings.push('Could not validate gas parameters');
      checks.push({
        name: 'Gas Validation',
        passed: false,
        message: 'Gas validation failed',
        severity: 'warning'
      });
    }

    return { errors, warnings, checks };
  }

  /**
   * Validate contract interaction
   */
  private static async validateContractInteraction(
    contractAddress: string,
    data: string,
    provider: ethers.Provider,
    config: TransactionValidationConfig
  ): Promise<{ errors: string[]; warnings: string[]; checks: SecurityCheck[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const checks: SecurityCheck[] = [];

    try {
      // Check if contract is in allowed list
      if (config.allowedContracts.length > 0) {
        const isAllowed = config.allowedContracts.some(allowed => 
          allowed.toLowerCase() === contractAddress.toLowerCase()
        );
        
        if (!isAllowed) {
          errors.push('Contract not in allowed list');
          checks.push({
            name: 'Contract Allowlist',
            passed: false,
            message: 'Contract not pre-approved',
            severity: 'error'
          });
        } else {
          checks.push({
            name: 'Contract Allowlist',
            passed: true,
            message: 'Contract is pre-approved',
            severity: 'info'
          });
        }
      }

      // Analyze function call
      const functionAnalysis = this.analyzeFunctionCall(data);
      if (functionAnalysis.dangerous) {
        warnings.push(`Calling potentially dangerous function: ${functionAnalysis.functionName}`);
        checks.push({
          name: 'Function Safety',
          passed: false,
          message: `Dangerous function: ${functionAnalysis.functionName}`,
          severity: 'warning'
        });
      }

      // Check contract code
      const contractValidation = await this.validateSmartContract(contractAddress, provider);
      if (!contractValidation.security.safe) {
        errors.push('Contract failed security validation');
        checks.push({
          name: 'Contract Security',
          passed: false,
          message: 'Contract has security issues',
          severity: 'error'
        });
      }

    } catch (error) {
      warnings.push('Could not validate contract interaction');
      checks.push({
        name: 'Contract Validation',
        passed: false,
        message: 'Contract validation failed',
        severity: 'warning'
      });
    }

    return { errors, warnings, checks };
  }

  /**
   * Validate token transfer
   */
  private static async validateTokenTransfer(
    tokenAddress: string,
    data: string,
    provider: ethers.Provider,
    config: TransactionValidationConfig
  ): Promise<{ errors: string[]; warnings: string[]; checks: SecurityCheck[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const checks: SecurityCheck[] = [];

    try {
      // Check if it's an ERC20 transfer
      if (data.startsWith('0xa9059cbb')) { // transfer(address,uint256)
        // Decode transfer parameters
        const decoded = this.decodeTransferData(data);
        
        if (decoded) {
          // Validate token amount
          if (decoded.amount > config.maxTokenAmount) {
            errors.push(`Token amount ${ethers.formatEther(decoded.amount.toString())} exceeds maximum ${ethers.formatEther(config.maxTokenAmount.toString())}`);
            checks.push({
              name: 'Token Amount',
              passed: false,
              message: 'Transfer amount too large',
              severity: 'error'
            });
          }

          // Check if token is allowed
          if (config.allowedTokens.length > 0) {
            const isAllowed = config.allowedTokens.some(allowed => 
              allowed.toLowerCase() === tokenAddress.toLowerCase()
            );
            
            if (!isAllowed) {
              warnings.push('Token not in allowed list');
              checks.push({
                name: 'Token Allowlist',
                passed: false,
                message: 'Token not pre-approved',
                severity: 'warning'
              });
            }
          }

          // Validate recipient
          try {
            ethers.getAddress(decoded.recipient);
            checks.push({
              name: 'Token Recipient',
              passed: true,
              message: 'Valid recipient address',
              severity: 'info'
            });
          } catch {
            errors.push('Invalid token recipient address');
            checks.push({
              name: 'Token Recipient',
              passed: false,
              message: 'Invalid recipient address',
              severity: 'error'
            });
          }
        }
      }

    } catch (error) {
      warnings.push('Could not validate token transfer');
      checks.push({
        name: 'Token Validation',
        passed: false,
        message: 'Token validation failed',
        severity: 'warning'
      });
    }

    return { errors, warnings, checks };
  }

  /**
   * Analyze contract code for security issues
   */
  private static async analyzeContractCode(
    address: string,
    code: string
  ): Promise<{
    verified: boolean;
    source?: string;
    abi?: any[];
    functions: ContractFunction[];
    safe: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];
    const functions: ContractFunction[] = [];

    // Basic bytecode analysis
    if (code.length < 100) {
      issues.push('Contract code is suspiciously small');
    }

    // Check for proxy patterns
    if (this.HIGH_RISK_PATTERNS.some(pattern => pattern.test(code))) {
      warnings.push('Contract may be upgradeable or have admin functions');
    }

    // This would typically integrate with a contract verification service
    // For now, we'll do basic analysis
    const verified = false; // Would check against Etherscan or similar
    const safe = issues.length === 0;

    return {
      verified,
      functions,
      safe,
      issues,
      warnings
    };
  }

  /**
   * Analyze function call for dangerous patterns
   */
  private static analyzeFunctionCall(data: string): {
    functionName?: string;
    dangerous: boolean;
    reason?: string;
  } {
    if (data.length < 10) {
      return { dangerous: false };
    }

    const functionSelector = data.substring(0, 10);
    
    // Common dangerous function selectors
    const dangerousSelectors: Record<string, string> = {
      '0x8da5cb5b': 'owner()',
      '0xf2fde38b': 'transferOwnership(address)',
      '0x715018a6': 'renounceOwnership()',
      '0x8456cb59': 'pause()',
      '0x3f4ba83a': 'unpause()',
      '0x40c10f19': 'mint(address,uint256)',
      '0x42966c68': 'burn(uint256)'
    };

    const functionName = dangerousSelectors[functionSelector];
    const dangerous = !!functionName;

    return {
      functionName,
      dangerous,
      reason: dangerous ? 'Function can modify contract state or ownership' : undefined
    };
  }

  /**
   * Decode ERC20 transfer data
   */
  private static decodeTransferData(data: string): {
    recipient: string;
    amount: bigint;
  } | null {
    try {
      if (data.length !== 138) return null; // 4 bytes selector + 32 bytes address + 32 bytes amount

      const recipient = '0x' + data.substring(34, 74);
      const amount = BigInt('0x' + data.substring(74, 138));

      return { recipient, amount };
    } catch {
      return null;
    }
  }

  /**
   * Calculate overall risk level
   */
  private static calculateRiskLevel(
    checks: SecurityCheck[],
    errors: string[],
    warnings: string[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (errors.length > 0) return 'critical';
    
    const criticalChecks = checks.filter(c => c.severity === 'critical' && !c.passed);
    if (criticalChecks.length > 0) return 'critical';

    const errorChecks = checks.filter(c => c.severity === 'error' && !c.passed);
    if (errorChecks.length > 0) return 'high';

    const warningChecks = checks.filter(c => c.severity === 'warning' && !c.passed);
    if (warningChecks.length > 2) return 'high';
    if (warningChecks.length > 0) return 'medium';

    return 'low';
  }

  /**
   * Generate security recommendations
   */
  private static generateRecommendations(
    checks: SecurityCheck[],
    errors: string[],
    warnings: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (errors.length > 0) {
      recommendations.push('Do not proceed with this transaction due to critical errors');
    }

    const failedChecks = checks.filter(c => !c.passed);
    if (failedChecks.length > 0) {
      recommendations.push('Review failed security checks before proceeding');
    }

    if (warnings.length > 0) {
      recommendations.push('Consider the warnings and verify transaction details');
    }

    const gasChecks = checks.filter(c => c.name.includes('Gas') && !c.passed);
    if (gasChecks.length > 0) {
      recommendations.push('Consider adjusting gas parameters to reduce costs');
    }

    if (recommendations.length === 0) {
      recommendations.push('Transaction appears safe to proceed');
    }

    return recommendations;
  }
}

export default TokenTransactionSecurity;