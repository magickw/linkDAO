/**
 * useNFTEscrow Hook
 * React hook for NFT atomic swap escrow operations
 */

import { useState, useCallback, useEffect } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';
import { Address, Hash } from 'viem';
import {
  EscrowContractService,
  CreateNFTEscrowParams,
  EscrowDetails,
  NFTStandard,
  EscrowStatus
} from '../services/escrowContractService';
import {
  NFTEscrowStep,
  NFTEscrowState,
  NFTDepositAction,
  canSellerDepositNFT,
  canBuyerLockFunds,
  canBuyerConfirmDelivery,
  canOpenDispute
} from '../types/nftEscrow';
import { useToast } from '../context/ToastContext';

interface UseNFTEscrowResult {
  // State
  state: NFTEscrowState;
  escrowDetails: EscrowDetails | null;
  isNFTApproved: boolean;

  // Buyer actions
  createNFTEscrow: (params: CreateNFTEscrowParams) => Promise<bigint | null>;
  lockFundsForNFT: (escrowId: bigint, amount: bigint, isNative: boolean) => Promise<Hash | null>;
  confirmNFTDelivery: (escrowId: bigint, deliveryInfo?: string) => Promise<Hash | null>;

  // Seller actions
  approveNFT: (nftContractAddress: Address, tokenId: bigint, nftStandard: NFTStandard) => Promise<Hash | null>;
  depositNFT: (escrowId: bigint) => Promise<Hash | null>;

  // Dispute actions
  openDispute: (escrowId: bigint) => Promise<Hash | null>;

  // Read actions
  loadEscrowDetails: (escrowId: bigint) => Promise<void>;
  checkNFTApproval: (
    nftContractAddress: Address,
    tokenId: bigint,
    nftStandard: NFTStandard,
    owner: Address
  ) => Promise<boolean>;

  // Status helpers
  canDeposit: boolean;
  canLockFunds: boolean;
  canConfirm: boolean;
  canDispute: boolean;
  isCompleted: boolean;
  isReadyForRelease: boolean;

  // Reset
  reset: () => void;
}

export function useNFTEscrow(): UseNFTEscrowResult {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { addToast } = useToast();

  const [state, setState] = useState<NFTEscrowState>({
    step: NFTEscrowStep.IDLE,
    isLoading: false
  });

  const [escrowDetails, setEscrowDetails] = useState<EscrowDetails | null>(null);
  const [isNFTApproved, setIsNFTApproved] = useState(false);

  // Create service instance
  const getService = useCallback(() => {
    if (!publicClient) {
      throw new Error('Public client not available');
    }
    return new EscrowContractService(publicClient, walletClient || undefined);
  }, [publicClient, walletClient]);

  // Load escrow details
  const loadEscrowDetails = useCallback(async (escrowId: bigint) => {
    try {
      const service = getService();
      const details = await service.getFullEscrowDetails(escrowId);
      setEscrowDetails(details);
    } catch (error) {
      console.error('Failed to load escrow details:', error);
      addToast('Failed to load escrow details', 'error');
    }
  }, [getService, addToast]);

  // Check NFT approval
  const checkNFTApproval = useCallback(async (
    nftContractAddress: Address,
    tokenId: bigint,
    nftStandard: NFTStandard,
    owner: Address
  ): Promise<boolean> => {
    try {
      const service = getService();
      const approved = await service.isNFTApproved(nftContractAddress, tokenId, nftStandard, owner);
      setIsNFTApproved(approved);
      return approved;
    } catch (error) {
      console.error('Failed to check NFT approval:', error);
      return false;
    }
  }, [getService]);

  // Create NFT escrow
  const createNFTEscrow = useCallback(async (params: CreateNFTEscrowParams): Promise<bigint | null> => {
    setState(prev => ({ ...prev, step: NFTEscrowStep.CREATING_ESCROW, isLoading: true, error: undefined }));

    try {
      const service = getService();
      const escrowId = await service.createNFTEscrow(params);

      setState(prev => ({
        ...prev,
        step: NFTEscrowStep.ESCROW_CREATED,
        escrowId,
        isLoading: false
      }));

      addToast('NFT escrow created successfully', 'success');
      return escrowId;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        step: NFTEscrowStep.ERROR,
        error: error.message || 'Failed to create escrow',
        isLoading: false
      }));
      addToast(error.userMessage || 'Failed to create NFT escrow', 'error');
      return null;
    }
  }, [getService, addToast]);

  // Approve NFT for escrow
  const approveNFT = useCallback(async (
    nftContractAddress: Address,
    tokenId: bigint,
    nftStandard: NFTStandard
  ): Promise<Hash | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const service = getService();
      let hash: Hash;

      if (nftStandard === NFTStandard.ERC721) {
        hash = await service.approveERC721(nftContractAddress, tokenId);
      } else {
        hash = await service.approveERC1155(nftContractAddress);
      }

      setIsNFTApproved(true);
      setState(prev => ({ ...prev, isLoading: false, transactionHash: hash }));
      addToast('NFT approved for escrow', 'success');
      return hash;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to approve NFT',
        isLoading: false
      }));
      addToast(error.userMessage || 'Failed to approve NFT', 'error');
      return null;
    }
  }, [getService, addToast]);

  // Deposit NFT into escrow
  const depositNFT = useCallback(async (escrowId: bigint): Promise<Hash | null> => {
    setState(prev => ({ ...prev, step: NFTEscrowStep.NFT_DEPOSITING, isLoading: true, error: undefined }));

    try {
      const service = getService();
      const hash = await service.depositNFT(escrowId);

      setState(prev => ({
        ...prev,
        step: NFTEscrowStep.NFT_DEPOSITED,
        transactionHash: hash,
        isLoading: false
      }));

      // Reload escrow details
      await loadEscrowDetails(escrowId);
      addToast('NFT deposited into escrow', 'success');
      return hash;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        step: NFTEscrowStep.ERROR,
        error: error.message || 'Failed to deposit NFT',
        isLoading: false
      }));
      addToast(error.userMessage || 'Failed to deposit NFT', 'error');
      return null;
    }
  }, [getService, loadEscrowDetails, addToast]);

  // Lock funds for NFT escrow
  const lockFundsForNFT = useCallback(async (
    escrowId: bigint,
    amount: bigint,
    isNative: boolean
  ): Promise<Hash | null> => {
    setState(prev => ({ ...prev, step: NFTEscrowStep.PAYMENT_PENDING, isLoading: true, error: undefined }));

    try {
      const service = getService();
      const hash = await service.lockFundsForNFT(escrowId, amount, isNative);

      setState(prev => ({
        ...prev,
        step: NFTEscrowStep.PAYMENT_CONFIRMED,
        transactionHash: hash,
        isLoading: false
      }));

      // Reload escrow details
      await loadEscrowDetails(escrowId);
      addToast('Payment locked in escrow', 'success');
      return hash;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        step: NFTEscrowStep.ERROR,
        error: error.message || 'Failed to lock funds',
        isLoading: false
      }));
      addToast(error.userMessage || 'Failed to lock funds', 'error');
      return null;
    }
  }, [getService, loadEscrowDetails, addToast]);

  // Confirm NFT delivery
  const confirmNFTDelivery = useCallback(async (
    escrowId: bigint,
    deliveryInfo: string = 'NFT received'
  ): Promise<Hash | null> => {
    setState(prev => ({ ...prev, step: NFTEscrowStep.CONFIRMING_DELIVERY, isLoading: true, error: undefined }));

    try {
      const service = getService();
      const hash = await service.confirmNFTDelivery(escrowId, deliveryInfo);

      setState(prev => ({
        ...prev,
        step: NFTEscrowStep.COMPLETED,
        transactionHash: hash,
        isLoading: false
      }));

      // Reload escrow details
      await loadEscrowDetails(escrowId);
      addToast('NFT delivery confirmed! Transaction complete.', 'success');
      return hash;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        step: NFTEscrowStep.ERROR,
        error: error.message || 'Failed to confirm delivery',
        isLoading: false
      }));
      addToast(error.userMessage || 'Failed to confirm delivery', 'error');
      return null;
    }
  }, [getService, loadEscrowDetails, addToast]);

  // Open dispute
  const openDispute = useCallback(async (escrowId: bigint): Promise<Hash | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const service = getService();
      const hash = await service.openNFTDispute(escrowId);

      setState(prev => ({
        ...prev,
        step: NFTEscrowStep.DISPUTE_OPENED,
        transactionHash: hash,
        isLoading: false
      }));

      // Reload escrow details
      await loadEscrowDetails(escrowId);
      addToast('Dispute opened', 'info');
      return hash;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        step: NFTEscrowStep.ERROR,
        error: error.message || 'Failed to open dispute',
        isLoading: false
      }));
      addToast(error.userMessage || 'Failed to open dispute', 'error');
      return null;
    }
  }, [getService, loadEscrowDetails, addToast]);

  // Reset state
  const reset = useCallback(() => {
    setState({
      step: NFTEscrowStep.IDLE,
      isLoading: false
    });
    setEscrowDetails(null);
    setIsNFTApproved(false);
  }, []);

  // Computed status helpers
  const canDeposit = escrowDetails
    ? canSellerDepositNFT(escrowDetails.status as any, escrowDetails.nftDeposited)
    : false;

  const canLockFundsStatus = escrowDetails
    ? canBuyerLockFunds(escrowDetails.status as any)
    : false;

  const canConfirm = escrowDetails
    ? canBuyerConfirmDelivery(escrowDetails.status as any)
    : false;

  const canDisputeStatus = escrowDetails
    ? canOpenDispute(escrowDetails.status as any)
    : false;

  const isCompleted = escrowDetails
    ? [
        EscrowStatus.DELIVERY_CONFIRMED,
        EscrowStatus.RESOLVED_BUYER_WINS,
        EscrowStatus.RESOLVED_SELLER_WINS,
        EscrowStatus.CANCELLED
      ].includes(escrowDetails.status)
    : false;

  const isReadyForRelease = escrowDetails
    ? escrowDetails.status === EscrowStatus.READY_FOR_RELEASE
    : false;

  return {
    state,
    escrowDetails,
    isNFTApproved,
    createNFTEscrow,
    lockFundsForNFT,
    confirmNFTDelivery,
    approveNFT,
    depositNFT,
    openDispute,
    loadEscrowDetails,
    checkNFTApproval,
    canDeposit,
    canLockFunds: canLockFundsStatus,
    canConfirm,
    canDispute: canDisputeStatus,
    isCompleted,
    isReadyForRelease,
    reset
  };
}

// Export types for external use
export type { NFTEscrowState, NFTDepositAction };
export { NFTEscrowStep, NFTStandard };
