/**
 * Custom hooks for Governance contract interactions using wagmi
 */

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useCallback, useMemo } from 'react';
import { parseEther } from 'ethers/lib/utils';

const GOVERNANCE_ADDRESS = (process.env.NEXT_PUBLIC_GOVERNANCE_ADDRESS || 
  '0x27a78A860445DFFD9073aFd7065dd421487c0F8A') as `0x${string}`;

const GOVERNANCE_ABI = [
  {
    type: 'function',
    name: 'proposalCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getProposal',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [
      { name: 'proposer', type: 'address' },
      { name: 'description', type: 'string' },
      { name: 'forVotes', type: 'uint256' },
      { name: 'againstVotes', type: 'uint256' },
      { name: 'executed', type: 'bool' },
      { name: 'category', type: 'uint256' }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'vote',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'support', type: 'bool' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'createProposal',
    inputs: [
      { name: 'description', type: 'string' },
      { name: 'category', type: 'uint256' },
      { name: 'data', type: 'bytes' }
    ],
    outputs: [{ name: 'proposalId', type: 'uint256' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'hasVoted',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'voter', type: 'address' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getVotingPower',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  }
] as const;

/**
 * Hook to read the total number of proposals
 */
export function useProposalCount() {
  const { data, isError, isLoading, refetch } = useReadContract({
    address: GOVERNANCE_ADDRESS,
    abi: GOVERNANCE_ABI,
    functionName: 'proposalCount'
  });

  return {
    proposalCount: data ? Number(data) : 0,
    isLoading,
    isError,
    refetch
  };
}

/**
 * Hook to read a specific proposal by ID
 */
export function useProposal(proposalId: number | undefined) {
  const { data, isError, isLoading, refetch } = useReadContract({
    address: GOVERNANCE_ADDRESS,
    abi: GOVERNANCE_ABI,
    functionName: 'getProposal',
    args: proposalId !== undefined ? [BigInt(proposalId)] : undefined,
    query: {
      enabled: proposalId !== undefined
    }
  });

  const proposal = useMemo(() => {
    if (!data) return null;
    
    const [proposer, description, forVotes, againstVotes, executed, category] = data;
    
    return {
      proposer: proposer as string,
      description: description as string,
      forVotes: forVotes.toString(),
      againstVotes: againstVotes.toString(),
      executed: executed as boolean,
      category: Number(category)
    };
  }, [data]);

  return {
    proposal,
    isLoading,
    isError,
    refetch
  };
}

/**
 * Hook to check if an address has voted on a proposal
 */
export function useHasVoted(proposalId: number | undefined, voterAddress: string | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    address: GOVERNANCE_ADDRESS,
    abi: GOVERNANCE_ABI,
    functionName: 'hasVoted',
    args: proposalId !== undefined && voterAddress ?
      [BigInt(proposalId), voterAddress as `0x${string}`] : undefined,
    query: {
      enabled: proposalId !== undefined && !!voterAddress
    }
  });

  return {
    hasVoted: data ?? false,
    isLoading,
    refetch
  };
}

/**
 * Hook to get voting power for an address
 */
export function useVotingPower(address: string | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    address: GOVERNANCE_ADDRESS,
    abi: GOVERNANCE_ABI,
    functionName: 'getVotingPower',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address
    }
  });

  return {
    votingPower: data ? data.toString() : '0',
    isLoading,
    refetch
  };
}

/**
 * Hook to vote on a proposal
 */
export function useVoteOnProposal() {
  const { data: hash, writeContract, isPending: isWriting, isError, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash
  });

  const vote = useCallback((proposalId: number, support: boolean) => {
    writeContract({
      address: GOVERNANCE_ADDRESS,
      abi: GOVERNANCE_ABI,
      functionName: 'vote',
      args: [BigInt(proposalId), support]
    });
  }, [writeContract]);

  return {
    vote,
    isLoading: isWriting || isConfirming,
    isSuccess,
    isError,
    error,
    txHash: hash
  };
}

/**
 * Hook to create a new proposal
 */
export function useCreateProposal() {
  const { data: hash, writeContract, isPending: isWriting, isError, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash
  });

  const createProposal = useCallback((
    description: string,
    category: number,
    executionData: string = '0x'
  ) => {
    writeContract({
      address: GOVERNANCE_ADDRESS,
      abi: GOVERNANCE_ABI,
      functionName: 'createProposal',
      args: [description, BigInt(category), executionData as `0x${string}`]
    });
  }, [writeContract]);

  return {
    createProposal,
    isLoading: isWriting || isConfirming,
    isSuccess,
    isError,
    error,
    txHash: hash
  };
}

/**
 * Hook to fetch all proposals with their details
 */
export function useAllProposals() {
  const { proposalCount, isLoading: isCountLoading } = useProposalCount();
  
  // Create array of proposal IDs to fetch
  const proposalIds = useMemo(() => {
    return Array.from({ length: proposalCount }, (_, i) => i);
  }, [proposalCount]);

  return {
    proposalIds,
    proposalCount,
    isLoading: isCountLoading
  };
}
