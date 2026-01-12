/**
 * Hardware Wallet Signing Service
 * Integrates hardware wallet signing with the secure signing service
 */

import { Hash, TransactionRequest, PublicClient } from 'viem';
import { realHardwareWalletService, HardwareWalletInfo } from '@/services/hardwareWalletService.real';
import { SecureSigningService, SigningResult } from './secureSigningService';
import { detectPhishing } from '@/security/phishingDetector';
import { validateTransaction, validateGasParameters } from '@/security/transactionValidator';
import { simulateTransaction } from './transactionSimulator';
import { validateChainIdMatch } from '@/utils/chainValidation';
import { nonceManager } from './nonceManager';

export interface HardwareSigningRequest extends TransactionRequest {
  walletInfo: HardwareWalletInfo;
  chainId: number;
  publicClient: PublicClient;
}

export interface HardwareSigningOptions {
  skipPhishingCheck?: boolean;
  skipSimulation?: boolean;
  skipGasValidation?: boolean;
  skipChainValidation?: boolean;
}

export class HardwareWalletSigningService {
  private static instance: HardwareWalletSigningService;

  private constructor() {}

  static getInstance(): HardwareWalletSigningService {
    if (!HardwareWalletSigningService.instance) {
      HardwareWalletSigningService.instance = new HardwareWalletSigningService();
    }
    return HardwareWalletSigningService.instance;
  }

  /**
   * Sign transaction with hardware wallet with full security checks
   */
  async signTransaction(
    request: HardwareSigningRequest,
    options: HardwareSigningOptions = {}
  ): Promise<SigningResult> {
    const {
      walletInfo,
      chainId,
      publicClient,
      ...txRequest
    } = request;

    const warnings: string[] = [];

    try {
      // 1. Chain ID validation
      if (!options.skipChainValidation) {
        const chainValidation = validateChainIdMatch(chainId, publicClient.chain.id);
        if (!chainValidation.valid) {
          return {
            success: false,
            error: chainValidation.error || 'Chain ID validation failed',
            warnings
          };
        }
      }

      // 2. Phishing detection
      if (!options.skipPhishingCheck) {
        const phishingCheck = detectPhishing(txRequest.to || '0x0', txRequest.value, txRequest.data);
        if (phishingCheck.isSuspicious) {
          warnings.push(...phishingCheck.warnings);
          
          if (phishingCheck.riskLevel === 'high') {
            return {
              success: false,
              error: `Transaction blocked: High security risk detected. ${phishingCheck.warnings.join('. ')}`,
              warnings: phishingCheck.warnings,
            };
          }
          
          if (phishingCheck.riskLevel === 'medium') {
            return {
              success: false,
              error: `Transaction blocked: Medium security risk detected. ${phishingCheck.warnings.join('. ')}`,
              warnings: phishingCheck.warnings,
            };
          }
        }
      }

      // 3. Transaction validation
      const txValidation = validateTransaction({
        to: txRequest.to || '0x0',
        value: txRequest.value || 0n,
        data: txRequest.data || '0x',
      });

      if (!txValidation.valid) {
        return {
          success: false,
          error: txValidation.errors.join(', '),
          warnings: txValidation.warnings,
        };
      }

      warnings.push(...txValidation.warnings);

      // 4. Gas parameter validation
      if (!options.skipGasValidation) {
        const gasValidation = validateGasParameters({
          gasLimit: txRequest.gasLimit,
          gasPrice: txRequest.gasPrice,
          maxFeePerGas: txRequest.maxFeePerGas,
          maxPriorityFeePerGas: txRequest.maxPriorityFeePerGas,
        });

        if (!gasValidation.valid) {
          return {
            success: false,
            error: gasValidation.errors.join(', '),
            warnings: gasValidation.warnings,
          };
        }

        warnings.push(...gasValidation.warnings);
      }

      // 5. Nonce management
      const nonce = await nonceManager.getNonce(walletInfo.address, chainId);
      const nonceValidation = await nonceManager.validateAndConsumeNonce(walletInfo.address, chainId, nonce);
      if (!nonceValidation.valid) {
        return {
          success: false,
          error: nonceValidation.error || 'Nonce validation failed',
          warnings
        };
      }

      // 6. Transaction simulation
      if (!options.skipSimulation) {
        const simulationResult = await simulateTransaction(
          publicClient,
          txRequest.to || '0x0',
          txRequest.data || '0x',
          txRequest.value || 0n,
          {
            gasPrice: txRequest.gasPrice,
            maxFeePerGas: txRequest.maxFeePerGas,
            maxPriorityFeePerGas: txRequest.maxPriorityFeePerGas,
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
        if (simulationResult.warnings.length > 0) {
          warnings.push(...simulationResult.warnings);
        }

        // Check for high gas costs
        if (simulationResult.estimatedCost.wei > 1000000000000000000n) {
          warnings.push(`High gas cost: ${simulationResult.estimatedCost.eth} ETH`);
        }
      }

      // 7. Sign with hardware wallet
      let signResult;
      if (walletInfo.type === 'ledger') {
        signResult = await realHardwareWalletService.signTransactionWithLedger(
          walletInfo.path,
          {
            ...txRequest,
            nonce: nonce,
          },
          chainId
        );
      } else if (walletInfo.type === 'trezor') {
        signResult = await realHardwareWalletService.signTransactionWithTrezor(
          walletInfo.path,
          {
            ...txRequest,
            nonce: nonce,
          },
          chainId
        );
      } else {
        return {
          success: false,
          error: 'Unsupported hardware wallet type',
          warnings
        };
      }

      if (!signResult.success) {
        // Release nonce if signing failed
        await nonceManager.releaseNonce(walletInfo.address, chainId, nonce);
        
        return {
          success: false,
          error: signResult.error || 'Hardware wallet signing failed',
          warnings
        };
      }

      return {
        success: true,
        hash: signResult.transactionHash,
        warnings
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Hardware wallet signing failed',
        warnings
      };
    }
  }

  /**
   * Sign message with hardware wallet
   */
  async signMessage(
    walletInfo: HardwareWalletInfo,
    message: string
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      let signResult;
      if (walletInfo.type === 'ledger') {
        signResult = await realHardwareWalletService.signMessageWithLedger(walletInfo.path, message);
      } else if (walletInfo.type === 'trezor') {
        signResult = await realHardwareWalletService.signMessageWithTrezor(walletInfo.path, message);
      } else {
        return {
          success: false,
          error: 'Unsupported hardware wallet type'
        };
      }

      if (!signResult.success) {
        return {
          success: false,
          error: signResult.error || 'Hardware wallet message signing failed'
        };
      }

      return {
        success: true,
        signature: signResult.signature
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Hardware wallet message signing failed'
      };
    }
  }

  /**
   * Get device info
   */
  async getDeviceInfo(walletInfo: HardwareWalletInfo): Promise<{ version: string; model: string } | null> {
    try {
      if (walletInfo.type === 'ledger') {
        return await realHardwareWalletService.getLedgerDeviceInfo();
      }
      // Trezor device info not yet implemented
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if device is connected
   */
  async isConnected(walletInfo: HardwareWalletInfo): Promise<boolean> {
    try {
      if (walletInfo.type === 'ledger') {
        return await realHardwareWalletService.isLedgerConnected();
      } else if (walletInfo.type === 'trezor') {
        return await realHardwareWalletService.isTrezorConnected();
      }
      return false;
    } catch (error) {
      return false;
    }
  }
}

export const hardwareWalletSigningService = HardwareWalletSigningService.getInstance();