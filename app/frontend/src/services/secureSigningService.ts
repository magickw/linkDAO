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
import { secureClear, wipeString } from '@/utils/secureMemory';

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

  private constructor() {}

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
        // Security checks
        const phishingCheck = detectPhishing(request.to, request.value, request.data);
        if (phishingCheck.isSuspicious) {
          warnings.push(...phishingCheck.warnings);
          if (phishingCheck.riskLevel === 'high') {
            return {
              success: false,
              error: 'Transaction blocked: High security risk detected',
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

        // Sign transaction
        const signature = await this.signWithPrivateKey(privateKey, request, publicClient);

        return {
          success: true,
          signature,
          warnings,
        };
      }, [privateKey]);

      return result;
      if (phishingCheck.isSuspicious) {
        warnings.push(...phishingCheck.warnings);
        if (phishingCheck.riskLevel === 'high') {
          return {
            success: false,
            error: 'Transaction blocked: High security risk detected',
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

      // Estimate gas if not provided
      let gasLimit = request.gasLimit;
      if (!gasLimit) {
        try {
          gasLimit = await publicClient.estimateGas({
            to: request.to,
            data: request.data,
            value: request.value,
            account: activeWallet as `0x${string}`,
          });
        } catch (error: any) {
          return {
            success: false,
            error: `Gas estimation failed: ${error.message}`,
          };
        }
      }

      // Create wallet client (in production, use ethers.js or viem wallet client)
      // This is a simplified version
      const hash = await this.signWithPrivateKey(
        privateKey,
        {
          to: request.to,
          value: request.value,
          data: request.data,
          gas: gasLimit,
          gasPrice: request.gasPrice,
          maxFeePerGas: request.maxFeePerGas,
          maxPriorityFeePerGas: request.maxPriorityFeePerGas,
          nonce: request.nonce,
          chainId: request.chainId,
        },
        publicClient
      );

      return {
        success: true,
        hash,
        warnings,
      };
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

      // Sign message (in production, use ethers.js or viem)
      const signature = await this.signMessageWithPrivateKey(privateKey, message);

      return {
        success: true,
        signature,
      };
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

      // Sign typed data (in production, use ethers.js or viem)
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
   * Sign typed data with private key using ethers.js
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
    // const wallet = new ethers.Wallet(privateKey);
    // return await wallet._signTypedData(domain, types, value);

    // For now, return a mock signature
    return '0x' + Array.from({ length: 130 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
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