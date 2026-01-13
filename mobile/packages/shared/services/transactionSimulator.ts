/**
 * Transaction Simulator Service
 * Simulates transactions before execution to detect potential issues
 */

import { PublicClient } from 'viem';

export interface SimulationResult {
  success: boolean;
  gasUsed: bigint;
  gasEstimate: bigint;
  revertReason?: string;
  warnings: string[];
  estimatedCost: {
    wei: bigint;
    eth: string;
    usd: number;
  };
}

export interface SimulationOptions {
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
}

/**
 * Simulate a transaction
 */
export const simulateTransaction = async (
  publicClient: PublicClient,
  to: `0x${string}`,
  data: `0x${string}`,
  value: bigint = 0n,
  options: SimulationOptions = {},
  from?: `0x${string}`
): Promise<SimulationResult> => {
  const warnings: string[] = [];

  try {
    // Estimate gas
    const gasEstimate = await publicClient.estimateGas({
      to,
      data,
      value,
      account: from || to, // Use 'from' if provided, otherwise 'to'
    });

    // Simulate the call
    const result = await publicClient.call({
      to,
      data,
      value,
      account: from || to,
    });

    // Calculate estimated cost
    const gasPrice = options.gasPrice || options.maxFeePerGas || 0n;
    const costWei = gasEstimate * gasPrice;
    const costEth = (Number(costWei) / 1e18).toFixed(6);
    const costUsd = (Number(costEth) * 2000); // Approximate ETH price

    return {
      success: true,
      gasUsed: gasEstimate, // Use estimate as proxy for gas used
      gasEstimate,
      warnings,
      estimatedCost: {
        wei: costWei,
        eth: costEth,
        usd: costUsd,
      },
    };
  } catch (error: any) {
    // Parse revert reason
    const revertReason = parseRevertReason(error);

    return {
      success: false,
      gasUsed: 0n,
      gasEstimate: 0n,
      revertReason,
      warnings: [`Transaction simulation failed: ${revertReason}`],
      estimatedCost: {
        wei: 0n,
        eth: '0',
        usd: 0,
      },
    };
  }
};

/**
 * Parse revert reason from error
 */
export const parseRevertReason = (error: any): string => {
  if (!error) return 'Unknown error';

  // Check for common revert messages
  const errorMessage = error.message || error.toString();

  if (errorMessage.includes('revert')) {
    const match = errorMessage.match(/revert\s*(.*)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  if (errorMessage.includes('insufficient funds')) {
    return 'Insufficient funds for transaction';
  }

  if (errorMessage.includes('nonce')) {
    return 'Invalid transaction nonce';
  }

  if (errorMessage.includes('gas')) {
    return 'Insufficient gas for transaction';
  }

  if (errorMessage.includes('execution reverted')) {
    return 'Execution reverted';
  }

  return errorMessage || 'Transaction execution failed';
};

/**
 * Batch simulate multiple transactions
 */
export const batchSimulateTransactions = async (
  publicClient: PublicClient,
  transactions: Array<{
    to: `0x${string}`;
    data: `0x${string}`;
    value: bigint;
  }>,
  options: SimulationOptions = {}
): Promise<SimulationResult[]> => {
  const simulations = transactions.map((tx) =>
    simulateTransaction(publicClient, tx.to, tx.data, tx.value, options)
  );

  return Promise.all(simulations);
};

/**
 * Compare simulation results with actual transaction
 */
export const compareWithActual = (
  simulation: SimulationResult,
  actualGasUsed: bigint,
  actualGasPrice: bigint
): {
  gasDifference: bigint;
  gasDifferencePercentage: number;
  costDifference: bigint;
  costDifferencePercentage: number;
} => {
  const gasDifference = actualGasUsed - simulation.gasEstimate;
  const gasDifferencePercentage =
    Number((gasDifference * 100n) / simulation.gasEstimate);

  const actualCost = actualGasUsed * actualGasPrice;
  const costDifference = actualCost - simulation.estimatedCost.wei;
  const costDifferencePercentage =
    Number((costDifference * 100n) / simulation.estimatedCost.wei);

  return {
    gasDifference,
    gasDifferencePercentage,
    costDifference,
    costDifferencePercentage,
  };
};

/**
 * Get gas optimization suggestions
 */
export const getGasOptimizationSuggestions = (
  simulation: SimulationResult
): string[] => {
  const suggestions: string[] = [];

  // Check if gas estimate is high
  if (simulation.gasEstimate > 200000n) {
    suggestions.push('Consider breaking this into multiple transactions');
  }

  // Check if data is large
  // This is a simplified check - in production you'd analyze the actual data
  if (simulation.gasEstimate > 100000n) {
    suggestions.push('Transaction data is large, consider optimizing');
  }

  return suggestions;
};