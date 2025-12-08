import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { base, baseSepolia } from 'wagmi/chains';

// Contract addresses (these will be updated after deployment)
const CONTRACT_ADDRESSES = {
  LDAOToken: process.env.NEXT_PUBLIC_LDAO_TOKEN_ADDRESS || '',
  EnhancedLDAOStaking: process.env.NEXT_PUBLIC_STAKING_ADDRESS || '',
  MockUSDC: process.env.NEXT_PUBLIC_USDC_ADDRESS || '',
  MultiSigWallet: process.env.NEXT_PUBLIC_MULTISIG_ADDRESS || '',
  ReputationSystem: process.env.NEXT_PUBLIC_REPUTATION_ADDRESS || '',
  LDAOTreasury: process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '',
  Governance: process.env.NEXT_PUBLIC_GOVERNANCE_ADDRESS || '',
  Marketplace: process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || '',
} as const;

// Contract ABIs (simplified for demo - in production, import from generated files)
const LDAOTOKEN_ABI = [
  {
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const STAKING_ABI = [
  {
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'tierId', type: 'uint256' },
      { name: 'enableAutoCompound', type: 'bool' }
    ],
    name: 'stake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'positionIndex', type: 'uint256' }],
    name: 'unstake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getUserStakingInfo',
    outputs: [
      { name: 'totalStaked', type: 'uint256' },
      { name: 'totalRewards', type: 'uint256' },
      { name: 'activePositions', type: 'uint256' },
      { name: 'isPremiumMember', type: 'bool' },
      { name: 'totalClaimableRewards', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const MARKETPLACE_ABI = [
  {
    inputs: [{ name: 'price', type: 'uint256' }, { name: 'duration', type: 'uint256' }],
    name: 'createListing',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'listingId', type: 'uint256' }],
    name: 'buyListing',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

// Types
interface StakingInfo {
  totalStaked: string;
  totalRewards: string;
  activePositions: number;
  isPremiumMember: boolean;
  totalClaimableRewards: string;
}

interface Listing {
  id: string;
  seller: string;
  price: string;
  duration: number;
  active: boolean;
}

// Hook for LDAOToken interactions
export const useLDAOToken = () => {
  const { address } = useAccount();
  const { data: balance } = useReadContract({
    address: CONTRACT_ADDRESSES.LDAOToken as `0x${string}`,
    abi: LDAOTOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: totalSupply } = useReadContract({
    address: CONTRACT_ADDRESSES.LDAOToken as `0x${string}`,
    abi: LDAOTOKEN_ABI,
    functionName: 'totalSupply',
  });

  const { writeContract, isPending: isApproving } = useWriteContract();

  const approve = useCallback(async (spender: string, amount: string) => {
    if (!address) throw new Error('Wallet not connected');
    
    return writeContract({
      address: CONTRACT_ADDRESSES.LDAOToken as `0x${string}`,
      abi: LDAOTOKEN_ABI,
      functionName: 'approve',
      args: [spender as `0x${string}`, parseEther(amount)],
    });
  }, [address, writeContract]);

  return {
    balance: balance ? formatEther(balance) : '0',
    totalSupply: totalSupply ? formatEther(totalSupply) : '0',
    approve,
    isApproving,
  };
};

// Hook for Staking interactions
export const useStaking = () => {
  const { address } = useAccount();
  const { writeContract, isPending: isStakingPending } = useWriteContract();
  const { writeContract: writeUnstake, isPending: isUnstakingPending } = useWriteContract();

  const { data: stakingInfo } = useReadContract({
    address: CONTRACT_ADDRESSES.EnhancedLDAOStaking as `0x${string}`,
    abi: STAKING_ABI,
    functionName: 'getUserStakingInfo',
    args: address ? [address] : undefined,
  });

  const stake = useCallback(async (amount: string, tierId: number, autoCompound: boolean) => {
    if (!address) throw new Error('Wallet not connected');
    
    return writeContract({
      address: CONTRACT_ADDRESSES.EnhancedLDAOStaking as `0x${string}`,
      abi: STAKING_ABI,
      functionName: 'stake',
      args: [parseEther(amount), BigInt(tierId), autoCompound],
    });
  }, [address, writeContract]);

  const unstake = useCallback(async (positionIndex: number) => {
    if (!address) throw new Error('Wallet not connected');
    
    return writeUnstake({
      address: CONTRACT_ADDRESSES.EnhancedLDAOStaking as `0x${string}`,
      abi: STAKING_ABI,
      functionName: 'unstake',
      args: [BigInt(positionIndex)],
    });
  }, [address, writeUnstake]);

  return {
    stakingInfo: stakingInfo ? {
      totalStaked: formatEther(stakingInfo[0]),
      totalRewards: formatEther(stakingInfo[1]),
      activePositions: Number(stakingInfo[2]),
      isPremiumMember: stakingInfo[3],
      totalClaimableRewards: formatEther(stakingInfo[4]),
    } : null,
    stake,
    unstake,
    isStakingPending,
    isUnstakingPending,
  };
};

// Hook for Marketplace interactions
export const useMarketplace = () => {
  const { address } = useAccount();
  const { writeContract, isPending: isCreatingListing } = useWriteContract();
  const { writeContract: writeBuy, isPending: isBuying } = useWriteContract();

  const createListing = useCallback(async (price: string, duration: number) => {
    if (!address) throw new Error('Wallet not connected');
    
    return writeContract({
      address: CONTRACT_ADDRESSES.Marketplace as `0x${string}`,
      abi: MARKETPLACE_ABI,
      functionName: 'createListing',
      args: [parseEther(price), BigInt(duration)],
    });
  }, [address, writeContract]);

  const buyListing = useCallback(async (listingId: string, price: string) => {
    if (!address) throw new Error('Wallet not connected');
    
    return writeBuy({
      address: CONTRACT_ADDRESSES.Marketplace as `0x${string}`,
      abi: MARKETPLACE_ABI,
      functionName: 'buyListing',
      args: [BigInt(listingId)],
      value: parseEther(price),
    });
  }, [address, writeBuy]);

  return {
    createListing,
    buyListing,
    isCreatingListing,
    isBuying,
  };
};

// Hook for transaction status
export const useTransactionStatus = () => {
  const [transactions, setTransactions] = useState<Array<{
    hash: string;
    status: 'pending' | 'success' | 'error';
    description: string;
  }>>([]);

  const addTransaction = useCallback((hash: string, description: string) => {
    setTransactions(prev => [...prev, {
      hash,
      status: 'pending',
      description,
    }]);
  }, []);

  const updateTransactionStatus = useCallback((hash: string, status: 'success' | 'error') => {
    setTransactions(prev => 
      prev.map(tx => 
        tx.hash === hash ? { ...tx, status } : tx
      )
    );
  }, []);

  const clearTransactions = useCallback(() => {
    setTransactions([]);
  }, []);

  return {
    transactions,
    addTransaction,
    updateTransactionStatus,
    clearTransactions,
  };
};

// Hook for network detection
export const useNetworkDetection = () => {
  const { chainId } = useAccount();
  
  const isBase = chainId === base.id;
  const isBaseSepolia = chainId === baseSepolia.id;
  const isSupportedNetwork = isBase || isBaseSepolia;
  
  return {
    isBase,
    isBaseSepolia,
    isSupportedNetwork,
    networkName: isBase ? 'Base Mainnet' : isBaseSepolia ? 'Base Sepolia' : 'Unsupported',
  };
};

// Hook for contract deployment status
export const useDeploymentStatus = () => {
  const [deploymentInfo, setDeploymentInfo] = useState<{
    network: string;
    timestamp: string;
    contracts: Record<string, string>;
  } | null>(null);

  // In production, this would fetch from an API or local storage
  // For now, we'll use environment variables
  const checkDeployment = useCallback(() => {
    const hasAllContracts = Object.values(CONTRACT_ADDRESSES).every(addr => addr && addr !== '');
    
    if (hasAllContracts) {
      setDeploymentInfo({
        network: process.env.NEXT_PUBLIC_NETWORK || 'unknown',
        timestamp: new Date().toISOString(),
        contracts: CONTRACT_ADDRESSES,
      });
    }
  }, []);

  return {
    deploymentInfo,
    isDeployed: !!deploymentInfo,
    checkDeployment,
    contractAddresses: CONTRACT_ADDRESSES,
  };
};