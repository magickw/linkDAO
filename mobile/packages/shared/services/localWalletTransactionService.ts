import { createWalletClient, http, Hex, Hash, TransactionRequest, Address, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet, sepolia, base, baseSepolia, polygon, arbitrum } from 'viem/chains';
import { SecureKeyStorage } from '../utils/secureKeyStorage';
import { validateTransaction, validateGasParameters } from '../utils/enhancedTransactionValidator';
import { detectPhishing } from '../utils/phishingDetector';
import { simulateTransaction } from './transactionSimulator';
import { walletService } from './walletService';

export interface SendTransactionParams {
  to: string;
  value: bigint;
  data?: string;
  chainId: number;
  gasLimit?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  walletAddress: string;
  password: string;
}

export interface TransactionResult {
  success: boolean;
  hash?: Hash;
  error?: string;
  warnings?: string[];
}

export class LocalWalletTransactionService {
  
  /**
   * Send a secure transaction using the local wallet
   */
  async sendTransaction(params: SendTransactionParams): Promise<TransactionResult> {
    const { 
      to, 
      value, 
      data = '0x', 
      chainId, 
      gasLimit, 
      maxFeePerGas, 
      maxPriorityFeePerGas,
      walletAddress,
      password 
    } = params;

    const warnings: string[] = [];

    try {
      // 1. Resolve ENS if needed
      let finalTo = to;
      if (to.endsWith('.eth')) {
        const resolved = await walletService.resolveEnsName(to);
        if (!resolved) {
          return { success: false, error: `Could not resolve ENS name: ${to}` };
        }
        finalTo = resolved;
      }

      // 2. Validate transaction parameters (Static Analysis)
      const txValidation = await validateTransaction({
        to: finalTo,
        value,
        data,
        chainId
      });

      if (!txValidation.valid) {
        return { success: false, error: txValidation.errors.join(', '), warnings: txValidation.warnings };
      }
      if (txValidation.warnings.length > 0) warnings.push(...txValidation.warnings);

      // 3. Phishing Detection
      const phishingCheck = detectPhishing(finalTo, value, data);
      if (phishingCheck.isSuspicious) {
        if (phishingCheck.riskLevel === 'high' || phishingCheck.riskLevel === 'critical') {
          return { 
            success: false, 
            error: `Security Risk Detected: ${phishingCheck.warnings.join('. ')}`, 
            warnings: phishingCheck.warnings 
          };
        }
        warnings.push(...phishingCheck.warnings);
      }

      // 4. Gas Parameter Validation
      const gasValidation = validateGasParameters({
        gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas
      });

      if (!gasValidation.valid) {
        return { success: false, error: gasValidation.errors.join(', '), warnings: gasValidation.warnings };
      }
      if (gasValidation.warnings.length > 0) warnings.push(...gasValidation.warnings);

      // 5. Get Public Client for Chain
      const chain = this.getChain(chainId);
      const transport = http(this.getRpcUrl(chainId));
      const publicClient = createPublicClient({ chain, transport });

      // 6. Transaction Simulation
      const simulation = await simulateTransaction(
        publicClient as any,
        finalTo as `0x${string}`,
        data as `0x${string}`,
        value,
        { maxFeePerGas, maxPriorityFeePerGas },
        walletAddress as `0x${string}`
      );

      if (!simulation.success) {
        return { 
          success: false, 
          error: `Transaction Simulation Failed: ${simulation.revertReason || 'Unknown error'}`, 
          warnings: [...warnings, ...simulation.warnings] 
        };
      }
      if (simulation.warnings.length > 0) warnings.push(...simulation.warnings);

      // 7. Secure Signing and Sending
      // Access private key ONLY within this callback
      return await SecureKeyStorage.withDecryptedWallet(
        walletAddress,
        password,
        async (wallet) => {
          if (!wallet.privateKey) {
            throw new Error('Private key not found');
          }

          const account = privateKeyToAccount(wallet.privateKey as Hex);
          
          const walletClient = createWalletClient({
            account,
            chain,
            transport
          });

          // Explicitly use EIP-1559 type to avoid KZG requirement
          const hash = await walletClient.sendTransaction({
            account,
            to: finalTo as Address,
            value,
            data: data as Hex,
            gas: gasLimit,
            maxFeePerGas,
            maxPriorityFeePerGas,
            chain,
            type: 'eip1559',
            kzg: undefined // Explicitly undefined to satisfy strict types if needed, though type='eip1559' usually suffices
          } as any);

          return { success: true, hash, warnings };
        }
      );

    } catch (error: any) {
      console.error('Transaction failed:', error);
      return { success: false, error: error.message || 'Transaction failed', warnings };
    }
  }

  private getChain(chainId: number) {
    switch (chainId) {
      case 1: return mainnet;
      case 11155111: return sepolia;
      case 8453: return base;
      case 84532: return baseSepolia;
      case 137: return polygon;
      case 42161: return arbitrum;
      default: return mainnet;
    }
  }

  private getRpcUrl(chainId: number): string | undefined {
    const getEnv = (key: string, fallback: string): string => {
      if (typeof process !== 'undefined' && process.env) {
        return process.env[key] || process.env['NEXT_PUBLIC_' + key] || process.env['EXPO_PUBLIC_' + key] || fallback;
      }
      return fallback;
    };

    switch (chainId) {
      case 8453: return getEnv('BASE_RPC_URL', 'https://mainnet.base.org');
      case 84532: return getEnv('BASE_SEPOLIA_RPC_URL', 'https://sepolia.base.org');
      case 11155111: return getEnv('SEPOLIA_RPC_URL', 'https://ethereum-sepolia-rpc.publicnode.com');
      case 137: return getEnv('POLYGON_RPC_URL', 'https://polygon-rpc.com');
      case 42161: return getEnv('ARBITRUM_RPC_URL', 'https://arb1.arbitrum.io/rpc');
      case 1: 
      default: return getEnv('MAINNET_RPC_URL', 'https://eth.llamarpc.com');
    }
  }
}

export const localWalletTransactionService = new LocalWalletTransactionService();
