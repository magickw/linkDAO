/**
 * Secure Signing Service
 * Handles secure transaction signing with private keys
 */

import { Hash, TransactionRequest, WalletClient } from 'viem';
import { ethers } from 'ethers';
import { SecureKeyStorage } from '@/security/secureKeyStorage';
import { detectPhishing } from '@/security/phishingDetector';
import { validateTransaction, validateGasParameters } from '@/security/transactionValidator';
import { PublicClient } from 'viem';
import { secureClear, wipeString, stringToSecureBuffer, secureBufferToString } from '@/utils/secureMemory';
import { simulateTransaction, SimulationResult } from '@/services/transactionSimulator';

export interface SigningRequest {
  to: `0x${string}`;
  value: bigint;
  data: `0x${string}`;
  gasLimit?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce?: bigint;
  chainId: number;
}

export interface SigningResult {
  success: boolean;
  hash?: Hash;
  error?: string;
  warnings?: string[];
}

export class SecureSigningService {
  private static instance: SecureSigningService;

  private constructor() { }

  static getInstance(): SecureSigningService {
    if (!SecureSigningService.instance) {
      SecureSigningService.instance = new SecureSigningService();
    }
    return SecureSigningService.instance;
  }

  /**
   * Sign a transaction with security checks
   */
  async signTransaction(
    request: SigningRequest,
    password: string,
    publicClient: PublicClient
  ): Promise<SigningResult> {
    const warnings: string[] = [];

    try {
      // Get active wallet
      const activeWallet = SecureKeyStorage.getActiveWallet();
      if (!activeWallet) {
        return {
          success: false,
          error: 'No active wallet found',
        };
      }

      // Get private key
      const { privateKey } = await SecureKeyStorage.getWallet(activeWallet, password);
      if (!privateKey) {
        return {
          success: false,
          error: 'Invalid password',
        };
      }

      // Use secureClear to wipe private key after use
      const result = await secureClear(async () => {
        // Security checks - phishing detection
        const phishingCheck = detectPhishing(request.to, request.value, request.data);
        if (phishingCheck.isSuspicious) {
          warnings.push(...phishingCheck.warnings);
          
          // Block high-risk transactions
          if (phishingCheck.riskLevel === 'high') {
            return {
              success: false,
              error: `Transaction blocked: High security risk detected. ${phishingCheck.warnings.join('. ')}`,
              warnings: phishingCheck.warnings,
            };
          }
          
          // Block medium-risk transactions by default (require explicit user acknowledgment)
          if (phishingCheck.riskLevel === 'medium') {
            return {
              success: false,
              error: `Transaction blocked: Medium security risk detected. ${phishingCheck.warnings.join('. ')} Please review and confirm if you wish to proceed.`,
              warnings: phishingCheck.warnings,
            };
          }
        }

        // Validate transaction
        const txValidation = validateTransaction({
          to: request.to,
          value: request.value,
          data: request.data,
        });

        if (!txValidation.valid) {
          return {
            success: false,
            error: txValidation.errors.join(', '),
            warnings: txValidation.warnings,
          };
        }

        warnings.push(...txValidation.warnings);

        // Validate gas parameters
        const gasValidation = validateGasParameters({
          gasLimit: request.gasLimit,
          gasPrice: request.gasPrice,
          maxFeePerGas: request.maxFeePerGas,
          maxPriorityFeePerGas: request.maxPriorityFeePerGas,
        });

        if (!gasValidation.valid) {
          return {
            success: false,
            error: gasValidation.errors.join(', '),
            warnings: gasValidation.warnings,
          };
        }

        warnings.push(...gasValidation.warnings);

        // Mandatory transaction simulation
        const simulationResult: SimulationResult = await simulateTransaction(
          publicClient,
          request.to,
          request.data,
          request.value,
          {
            gasPrice: request.gasPrice,
            maxFeePerGas: request.maxFeePerGas,
            maxPriorityFeePerGas: request.maxPriorityFeePerGas,
          }
        );

        if (!simulationResult.success) {
          return {
            success: false,
            error: `Transaction simulation failed: ${simulationResult.revertReason || 'Unknown error'}`,
            warnings: [
              ...warnings,
              `Simulation failed: ${simulationResult.revertReason || 'Unknown error'}`
            ],
          };
        }

        // Add simulation warnings
        warnings.push(...simulationResult.warnings);

        // Warn about high gas costs
        if (simulationResult.estimatedCost.wei > 1000000000000000000n) { // > 1 ETH
          warnings.push(`High gas cost estimated: ${simulationResult.estimatedCost.eth} ETH (~$${simulationResult.estimatedCost.usd.toFixed(2)})`);
        }

        // Warn about very high gas usage
        if (simulationResult.gasEstimate > 200000n) {
          warnings.push(`High gas usage estimated: ${simulationResult.gasEstimate.toString()} units`);
        }

        // Sign transaction
        const hash = await this.signWithPrivateKey(privateKey, request, publicClient);

        return {
          success: true,
          hash,
          warnings,
        };
      }, [privateKey]);

      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Signing failed',
        warnings,
      };
    }
  }

  /**
   * Sign a message
   */
  async signMessage(
    message: string,
    password: string
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      // Get active wallet
      const activeWallet = SecureKeyStorage.getActiveWallet();
      if (!activeWallet) {
        return {
          success: false,
          error: 'No active wallet found',
        };
      }

      // Get private key
      const { privateKey } = await SecureKeyStorage.getWallet(activeWallet, password);
      if (!privateKey) {
        return {
          success: false,
          error: 'Invalid password',
        };
      }

      // Use secureClear to wipe private key after use
      const result = await secureClear(async () => {
        // Sign message using ethers.js
        const signature = await this.signMessageWithPrivateKey(privateKey, message);

        return {
          success: true,
          signature,
        };
      }, [privateKey]);

      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Message signing failed',
      };
    }
  }

  /**
   * Sign typed data (EIP-712)
   */
  async signTypedData(
    domain: any,
    types: any,
    value: any,
    password: string
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      // Get active wallet
      const activeWallet = SecureKeyStorage.getActiveWallet();
      if (!activeWallet) {
        return {
          success: false,
          error: 'No active wallet found',
        };
      }

      // Get private key
      const { privateKey } = await SecureKeyStorage.getWallet(activeWallet, password);
      if (!privateKey) {
        return {
          success: false,
          error: 'Invalid password',
        };
      }

      // Use secureClear to wipe private key after use
      const result = await secureClear(async () => {
        // Sign typed data using ethers.js
        const signature = await this.signTypedDataWithPrivateKey(
          privateKey,
          domain,
          types,
          value
        );

        return {
          success: true,
          signature,
        };
      }, [privateKey]);

      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Typed data signing failed',
      };
    }
  }

  /**
   * Sign with private key using ethers.js
   */
  private async signWithPrivateKey(
    privateKey: string,
    transaction: TransactionRequest,
    publicClient: PublicClient
  ): Promise<Hash> {
    try {
      // Create wallet from private key
      const wallet = new ethers.Wallet(privateKey);

      // Sign the transaction
      const signedTx = await wallet.signTransaction(transaction);
      return signedTx as Hash;
    } catch (error: any) {
      throw new Error(`Transaction signing failed: ${error.message}`);
    }
  }

  /**
   * Sign message with private key using ethers.js
   */
  private async signMessageWithPrivateKey(
    privateKey: string,
    message: string
  ): Promise<string> {
    try {
      // Create wallet from private key
      const wallet = new ethers.Wallet(privateKey);

      // Sign the message
      const signature = await wallet.signMessage(message);
      return signature;
    } catch (error: any) {
      throw new Error(`Message signing failed: ${error.message}`);
    }
  }

  /**
   * Sign typed data with private key using ethers.js (EIP-712)
   */
  private async signTypedDataWithPrivateKey(
    privateKey: string,
    domain: any,
    types: any,
    value: any
  ): Promise<string> {
    try {
      // Create wallet from private key
      const wallet = new ethers.Wallet(privateKey);

      // Sign the typed data
      const signature = await wallet.signTypedData(domain, types, value);
      return signature;
    } catch (error: any) {
      throw new Error(`Typed data signing failed: ${error.message}`);
    }
  }

  /**
   * Get signing address
   */
  async getSigningAddress(): Promise<string | null> {
    const activeWallet = SecureKeyStorage.getActiveWallet();
    return activeWallet || null;
  }
}

// Export singleton instance
export const secureSigningService = SecureSigningService.getInstance();
