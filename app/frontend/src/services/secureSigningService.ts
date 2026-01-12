/**
 * Secure Signing Service
 * Handles secure transaction signing with private keys
 */

import { Hash, TransactionRequest, WalletClient } from 'viem';
import { SecureKeyStorage } from '@/security/secureKeyStorage';
import { detectPhishing } from '@/security/phishingDetector';
import { validateTransaction, validateGasParameters } from '@/security/transactionValidator';
import { PublicClient } from 'viem';

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
   * Sign with private key (simplified - use ethers.js or viem in production)
   */
  private async signWithPrivateKey(
    privateKey: string,
    transaction: TransactionRequest,
    publicClient: PublicClient
  ): Promise<Hash> {
    // This is a placeholder - in production, use ethers.js or viem wallet client
    // const wallet = new ethers.Wallet(privateKey);
    // const signedTx = await wallet.signTransaction(transaction);
    // return signedTx as Hash;

    // For now, return a mock hash
    return '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('') as Hash;
  }

  /**
   * Sign message with private key (simplified)
   */
  private async signMessageWithPrivateKey(
    privateKey: string,
    message: string
  ): Promise<string> {
    // This is a placeholder - in production, use ethers.js or viem
    // const wallet = new ethers.Wallet(privateKey);
    // return await wallet.signMessage(message);

    // For now, return a mock signature
    return '0x' + Array.from({ length: 130 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  /**
   * Sign typed data with private key (simplified)
   */
  private async signTypedDataWithPrivateKey(
    privateKey: string,
    domain: any,
    types: any,
    value: any
  ): Promise<string> {
    // This is a placeholder - in production, use ethers.js or viem
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