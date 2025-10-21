/**
 * React Hook for Community Treasury Management
 * Provides easy access to treasury functionality in React components
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import {
  communityTreasuryService,
  TreasuryBalance,
  TreasuryTransaction,
  TreasuryProposal,
} from '@/services/blockchain/communityTreasury';

/**
 * Hook to get treasury balance
 */
export function useTreasuryBalance(treasuryAddress: string | undefined) {
  const [balances, setBalances] = useState<TreasuryBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!treasuryAddress) {
      setBalances([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await communityTreasuryService.getTreasuryBalance(treasuryAddress);
      setBalances(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch treasury balance';
      setError(errorMessage);
      setBalances([]);
    } finally {
      setLoading(false);
    }
  }, [treasuryAddress]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balances, loading, error, refetch: fetchBalance };
}

/**
 * Hook to get treasury transactions
 */
export function useTreasuryTransactions(
  treasuryAddress: string | undefined,
  limit: number = 50
) {
  const [transactions, setTransactions] = useState<TreasuryTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!treasuryAddress) {
      setTransactions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await communityTreasuryService.getTreasuryTransactions(
        treasuryAddress,
        limit
      );
      setTransactions(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch treasury transactions';
      setError(errorMessage);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [treasuryAddress, limit]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return { transactions, loading, error, refetch: fetchTransactions };
}

/**
 * Hook to create treasury proposal
 */
export function useCreateTreasuryProposal() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposalId, setProposalId] = useState<string | null>(null);

  const createProposal = useCallback(
    async (
      communityId: string,
      treasuryAddress: string,
      title: string,
      description: string,
      recipientAddress: string,
      amount: string,
      tokenAddress?: string
    ) => {
      setLoading(true);
      setError(null);
      setProposalId(null);

      try {
        const id = await communityTreasuryService.createTreasuryProposal(
          communityId,
          treasuryAddress,
          title,
          description,
          recipientAddress,
          amount,
          tokenAddress
        );
        setProposalId(id);
        return id;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create treasury proposal';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { createProposal, loading, error, proposalId };
}

/**
 * Hook to execute treasury proposal
 */
export function useExecuteTreasuryProposal() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const executeProposal = useCallback(async (proposalId: string) => {
    setLoading(true);
    setError(null);
    setTransactionHash(null);

    try {
      const txHash = await communityTreasuryService.executeTreasuryProposal(proposalId);
      setTransactionHash(txHash);
      return txHash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute treasury proposal';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { executeProposal, loading, error, transactionHash };
}

/**
 * Hook to deposit to treasury
 */
export function useDepositToTreasury() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const deposit = useCallback(
    async (treasuryAddress: string, amount: string, tokenAddress?: string) => {
      setLoading(true);
      setError(null);
      setTransactionHash(null);

      try {
        const txHash = await communityTreasuryService.depositToTreasury(
          treasuryAddress,
          amount,
          tokenAddress
        );
        setTransactionHash(txHash);
        return txHash;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to deposit to treasury';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { deposit, loading, error, transactionHash };
}

/**
 * Hook to get treasury allocation
 */
export function useTreasuryAllocation(treasuryAddress: string | undefined) {
  const [allocation, setAllocation] = useState<{
    total: string;
    allocated: string;
    available: string;
    allocations: Array<{
      category: string;
      amount: string;
      percentage: number;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllocation = useCallback(async () => {
    if (!treasuryAddress) {
      setAllocation(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await communityTreasuryService.getTreasuryAllocation(treasuryAddress);
      setAllocation(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch treasury allocation';
      setError(errorMessage);
      setAllocation(null);
    } finally {
      setLoading(false);
    }
  }, [treasuryAddress]);

  useEffect(() => {
    fetchAllocation();
  }, [fetchAllocation]);

  return { allocation, loading, error, refetch: fetchAllocation };
}

/**
 * Hook to approve token spending
 */
export function useApproveTokenSpending() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const approve = useCallback(
    async (tokenAddress: string, spenderAddress: string, amount: string) => {
      setLoading(true);
      setError(null);
      setTransactionHash(null);

      try {
        const txHash = await communityTreasuryService.approveTokenSpending(
          tokenAddress,
          spenderAddress,
          amount
        );
        setTransactionHash(txHash);
        return txHash;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to approve token spending';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { approve, loading, error, transactionHash };
}

/**
 * Hook to check token allowance
 */
export function useTokenAllowance(
  tokenAddress: string | undefined,
  ownerAddress: string | undefined,
  spenderAddress: string | undefined
) {
  const [allowance, setAllowance] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllowance = useCallback(async () => {
    if (!tokenAddress || !ownerAddress || !spenderAddress) {
      setAllowance('0');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await communityTreasuryService.checkTokenAllowance(
        tokenAddress,
        ownerAddress,
        spenderAddress
      );
      setAllowance(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch allowance';
      setError(errorMessage);
      setAllowance('0');
    } finally {
      setLoading(false);
    }
  }, [tokenAddress, ownerAddress, spenderAddress]);

  useEffect(() => {
    fetchAllowance();
  }, [fetchAllowance]);

  return { allowance, loading, error, refetch: fetchAllowance };
}
