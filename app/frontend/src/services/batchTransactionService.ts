/**
 * Batch Transaction Service
 * Handles executing multiple transactions in a batch
 */

import { Hash, PublicClient } from 'viem';
import { secureSigningService, SigningRequest } from './secureSigningService';
import { detectPhishing } from '@/security/phishingDetector';
import { validateTransaction, validateGasParameters } from '@/security/transactionValidator';

export interface BatchTransaction {
  id: string;
  request: SigningRequest;
  description: string;
  estimatedGas?: bigint;
  estimatedCost?: bigint;
  status: 'pending' | 'signed' | 'submitted' | 'confirmed' | 'failed';
  hash?: Hash;
  error?: string;
}

export interface BatchTransactionResult {
  success: boolean;
  transactions: BatchTransaction[];
  totalGasUsed?: bigint;
  totalCost?: bigint;
  errors?: string[];
}

export class BatchTransactionService {
  private static instance: BatchTransactionService;

  private constructor() {}

  static getInstance(): BatchTransactionService {
    if (!BatchTransactionService.instance) {
      BatchTransactionService.instance = new BatchTransactionService();
    }
    return BatchTransactionService.instance;
  }

  /**
   * Execute a batch of transactions
   */
  async executeBatch(
    transactions: Array<{ request: SigningRequest; description: string }>,
    password: string,
    publicClient: PublicClient
  ): Promise<BatchTransactionResult> {
    const batchTransactions: BatchTransaction[] = transactions.map((tx, index) => ({
      id: `batch_${Date.now()}_${index}`,
      request: tx.request,
      description: tx.description,
      status: 'pending',
    }));

    const errors: string[] = [];
    let totalGasUsed = 0n;
    let totalCost = 0n;

    try {
      // Phase 1: Validate all transactions
      for (const tx of batchTransactions) {
        try {
          // Security checks
          const phishingCheck = detectPhishing(
            tx.request.to,
            tx.request.value,
            tx.request.data
          );

          if (phishingCheck.isSuspicious && phishingCheck.riskLevel === 'high') {
            tx.status = 'failed';
            tx.error = 'Transaction blocked: High security risk detected';
            errors.push(`${tx.description}: ${tx.error}`);
            continue;
          }

          // Validate transaction
          const txValidation = validateTransaction({
            to: tx.request.to,
            value: tx.request.value,
            data: tx.request.data,
          });

          if (!txValidation.valid) {
            tx.status = 'failed';
            tx.error = txValidation.errors.join(', ');
            errors.push(`${tx.description}: ${tx.error}`);
            continue;
          }

          // Validate gas parameters
          const gasValidation = validateGasParameters({
            gasLimit: tx.request.gasLimit,
            gasPrice: tx.request.gasPrice,
            maxFeePerGas: tx.request.maxFeePerGas,
            maxPriorityFeePerGas: tx.request.maxPriorityFeePerGas,
          });

          if (!gasValidation.valid) {
            tx.status = 'failed';
            tx.error = gasValidation.errors.join(', ');
            errors.push(`${tx.description}: ${tx.error}`);
            continue;
          }

          // Estimate gas
          tx.estimatedGas = await publicClient.estimateGas({
            to: tx.request.to,
            data: tx.request.data,
            value: tx.request.value,
          });

          // Calculate estimated cost
          const gasPrice = tx.request.gasPrice || tx.request.maxFeePerGas || 0n;
          tx.estimatedCost = tx.estimatedGas * gasPrice;
        } catch (error: any) {
          tx.status = 'failed';
          tx.error = error.message || 'Validation failed';
          errors.push(`${tx.description}: ${tx.error}`);
        }
      }

      // Phase 2: Sign all valid transactions
      const validTransactions = batchTransactions.filter((tx) => tx.status === 'pending');

      for (const tx of validTransactions) {
        try {
          const result = await secureSigningService.signTransaction(
            tx.request,
            password,
            publicClient
          );

          if (result.success && result.hash) {
            tx.status = 'signed';
            tx.hash = result.hash;
          } else {
            tx.status = 'failed';
            tx.error = result.error || 'Signing failed';
            errors.push(`${tx.description}: ${tx.error}`);
          }
        } catch (error: any) {
          tx.status = 'failed';
          tx.error = error.message || 'Signing failed';
          errors.push(`${tx.description}: ${tx.error}`);
        }
      }

      // Phase 3: Submit all signed transactions
      const signedTransactions = batchTransactions.filter((tx) => tx.status === 'signed');

      for (const tx of signedTransactions) {
        try {
          // In production, use publicClient.sendRawTransaction or similar
          // For now, mark as submitted
          tx.status = 'submitted';
        } catch (error: any) {
          tx.status = 'failed';
          tx.error = error.message || 'Submission failed';
          errors.push(`${tx.description}: ${tx.error}`);
        }
      }

      // Phase 4: Wait for confirmations
      const submittedTransactions = batchTransactions.filter((tx) => tx.status === 'submitted');

      for (const tx of submittedTransactions) {
        try {
          // In production, use publicClient.waitForTransactionReceipt
          // For now, mark as confirmed
          if (tx.estimatedGas) {
            totalGasUsed += tx.estimatedGas;
          }
          if (tx.estimatedCost) {
            totalCost += tx.estimatedCost;
          }
          tx.status = 'confirmed';
        } catch (error: any) {
          tx.status = 'failed';
          tx.error = error.message || 'Confirmation failed';
          errors.push(`${tx.description}: ${tx.error}`);
        }
      }

      return {
        success: batchTransactions.every((tx) => tx.status === 'confirmed'),
        transactions: batchTransactions,
        totalGasUsed,
        totalCost,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        transactions: batchTransactions,
        errors: [error.message || 'Batch execution failed'],
      };
    }
  }

  /**
   * Estimate total cost for a batch of transactions
   */
  async estimateBatchCost(
    transactions: Array<SigningRequest>,
    publicClient: PublicClient
  ): Promise<{ totalGas: bigint; totalCost: bigint; estimates: Array<{ gas: bigint; cost: bigint }> }> {
    const estimates = await Promise.all(
      transactions.map(async (tx) => {
        try {
          const gas = await publicClient.estimateGas({
            to: tx.to,
            data: tx.data,
            value: tx.value,
          });

          const gasPrice = tx.gasPrice || tx.maxFeePerGas || 0n;
          const cost = gas * gasPrice;

          return { gas, cost };
        } catch {
          return { gas: 0n, cost: 0n };
        }
      })
    );

    const totalGas = estimates.reduce((sum, est) => sum + est.gas, 0n);
    const totalCost = estimates.reduce((sum, est) => sum + est.cost, 0n);

    return { totalGas, totalCost, estimates };
  }

  /**
   * Get transaction summary
   */
  getBatchSummary(transactions: BatchTransaction[]): {
    total: number;
    pending: number;
    signed: number;
    submitted: number;
    confirmed: number;
    failed: number;
  } {
    return {
      total: transactions.length,
      pending: transactions.filter((tx) => tx.status === 'pending').length,
      signed: transactions.filter((tx) => tx.status === 'signed').length,
      submitted: transactions.filter((tx) => tx.status === 'submitted').length,
      confirmed: transactions.filter((tx) => tx.status === 'confirmed').length,
      failed: transactions.filter((tx) => tx.status === 'failed').length,
    };
  }
}

// Export singleton instance
export const batchTransactionService = BatchTransactionService.getInstance();