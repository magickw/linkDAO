/**
 * NFT Escrow Types
 * Types for NFT atomic swap escrow functionality
 */

import { Address, Hash } from 'viem';

// NFT Standard enum matching the smart contract
export enum NFTStandard {
  NONE = 0,     // Not an NFT escrow
  ERC721 = 1,
  ERC1155 = 2
}

// Extended escrow status enum for NFT escrows
export enum NFTEscrowStatus {
  CREATED = 0,
  FUNDS_LOCKED = 1,
  NFT_DEPOSITED = 2,      // NFT deposited by seller
  READY_FOR_RELEASE = 3,  // Both funds and NFT are in escrow
  DELIVERY_CONFIRMED = 4,
  DISPUTE_OPENED = 5,
  RESOLVED_BUYER_WINS = 6,
  RESOLVED_SELLER_WINS = 7,
  CANCELLED = 8
}

// NFT Escrow details interface
export interface NFTEscrowDetails {
  id: bigint;
  listingId: bigint;
  buyer: Address;
  seller: Address;
  tokenAddress: Address;
  amount: bigint;
  feeAmount: bigint;
  deliveryInfo: string;
  deliveryDeadline: bigint;
  createdAt: bigint;
  resolvedAt: bigint;
  status: NFTEscrowStatus;
  // NFT specific fields
  nftStandard: NFTStandard;
  nftContractAddress: Address;
  nftTokenId: bigint;
  nftAmount: bigint;
  nftDeposited: boolean;
}

// Create NFT escrow parameters
export interface CreateNFTEscrowParams {
  listingId: bigint;
  seller: Address;
  tokenAddress: Address;
  amount: bigint;
  deliveryDeadline: number; // Unix timestamp in seconds
  resolutionMethod: number; // DisputeResolutionMethod enum
  nftStandard: NFTStandard;
  nftContractAddress: Address;
  nftTokenId: bigint;
  nftAmount: bigint;
}

// NFT Escrow creation result
export interface NFTEscrowCreationResult {
  escrowId: bigint;
  transactionHash: Hash;
  nftContractAddress: Address;
  nftTokenId: bigint;
  nftStandard: NFTStandard;
}

// NFT Deposit result
export interface NFTDepositResult {
  transactionHash: Hash;
  escrowId: bigint;
  depositor: Address;
  nftContractAddress: Address;
  nftTokenId: bigint;
}

// NFT Escrow completion result
export interface NFTEscrowCompletionResult {
  transactionHash: Hash;
  escrowId: bigint;
  nftRecipient: Address;
  fundsRecipient: Address;
  nftContractAddress: Address;
  nftTokenId: bigint;
  paymentAmount: bigint;
}

// UI State types for NFT Escrow flow
export interface NFTEscrowState {
  step: NFTEscrowStep;
  escrowId?: bigint;
  transactionHash?: Hash;
  error?: string;
  isLoading: boolean;
}

export enum NFTEscrowStep {
  IDLE = 'idle',
  CREATING_ESCROW = 'creating_escrow',
  ESCROW_CREATED = 'escrow_created',
  AWAITING_NFT_DEPOSIT = 'awaiting_nft_deposit',
  NFT_DEPOSITING = 'nft_depositing',
  NFT_DEPOSITED = 'nft_deposited',
  AWAITING_PAYMENT = 'awaiting_payment',
  PAYMENT_PENDING = 'payment_pending',
  PAYMENT_CONFIRMED = 'payment_confirmed',
  READY_FOR_RELEASE = 'ready_for_release',
  CONFIRMING_DELIVERY = 'confirming_delivery',
  COMPLETED = 'completed',
  DISPUTE_OPENED = 'dispute_opened',
  ERROR = 'error'
}

// NFT Escrow order details (for UI display)
export interface NFTEscrowOrderDetails {
  orderId: string;
  escrowId: string;
  listingId: string;
  // Participants
  buyer: {
    address: Address;
    displayName?: string;
  };
  seller: {
    address: Address;
    displayName?: string;
  };
  // Payment details
  payment: {
    tokenAddress: Address;
    tokenSymbol: string;
    amount: string;
    feeAmount: string;
    totalAmount: string;
  };
  // NFT details
  nft: {
    standard: NFTStandard;
    contractAddress: Address;
    tokenId: string;
    amount: number;
    name?: string;
    image?: string;
    collectionName?: string;
  };
  // Status and timing
  status: NFTEscrowStatus;
  nftDeposited: boolean;
  fundsLocked: boolean;
  createdAt: Date;
  deliveryDeadline: Date;
  resolvedAt?: Date;
}

// Seller's NFT deposit action
export interface NFTDepositAction {
  escrowId: string;
  nftContractAddress: Address;
  nftTokenId: string;
  nftStandard: NFTStandard;
  nftAmount: number;
  // Approval status
  isApproved: boolean;
  requiresApproval: boolean;
}

// NFT Approval status
export interface NFTApprovalStatus {
  isApproved: boolean;
  operator: Address;
  nftContractAddress: Address;
}

// NFT Escrow events for UI updates
export interface NFTEscrowEvent {
  type: 'created' | 'nft_deposited' | 'funds_locked' | 'ready' | 'completed' | 'disputed' | 'resolved';
  escrowId: bigint;
  transactionHash: Hash;
  timestamp: Date;
  data?: Record<string, any>;
}

// Constants
export const NFT_STANDARD_LABELS: Record<NFTStandard, string> = {
  [NFTStandard.NONE]: 'Not NFT',
  [NFTStandard.ERC721]: 'ERC-721',
  [NFTStandard.ERC1155]: 'ERC-1155'
};

export const NFT_ESCROW_STATUS_LABELS: Record<NFTEscrowStatus, string> = {
  [NFTEscrowStatus.CREATED]: 'Created',
  [NFTEscrowStatus.FUNDS_LOCKED]: 'Payment Received',
  [NFTEscrowStatus.NFT_DEPOSITED]: 'NFT Deposited',
  [NFTEscrowStatus.READY_FOR_RELEASE]: 'Ready for Release',
  [NFTEscrowStatus.DELIVERY_CONFIRMED]: 'Completed',
  [NFTEscrowStatus.DISPUTE_OPENED]: 'Dispute Opened',
  [NFTEscrowStatus.RESOLVED_BUYER_WINS]: 'Resolved - Buyer Wins',
  [NFTEscrowStatus.RESOLVED_SELLER_WINS]: 'Resolved - Seller Wins',
  [NFTEscrowStatus.CANCELLED]: 'Cancelled'
};

export const NFT_ESCROW_STEP_LABELS: Record<NFTEscrowStep, string> = {
  [NFTEscrowStep.IDLE]: 'Ready',
  [NFTEscrowStep.CREATING_ESCROW]: 'Creating Escrow...',
  [NFTEscrowStep.ESCROW_CREATED]: 'Escrow Created',
  [NFTEscrowStep.AWAITING_NFT_DEPOSIT]: 'Awaiting NFT Deposit',
  [NFTEscrowStep.NFT_DEPOSITING]: 'Depositing NFT...',
  [NFTEscrowStep.NFT_DEPOSITED]: 'NFT Deposited',
  [NFTEscrowStep.AWAITING_PAYMENT]: 'Awaiting Payment',
  [NFTEscrowStep.PAYMENT_PENDING]: 'Processing Payment...',
  [NFTEscrowStep.PAYMENT_CONFIRMED]: 'Payment Confirmed',
  [NFTEscrowStep.READY_FOR_RELEASE]: 'Ready for Release',
  [NFTEscrowStep.CONFIRMING_DELIVERY]: 'Confirming Delivery...',
  [NFTEscrowStep.COMPLETED]: 'Transaction Complete',
  [NFTEscrowStep.DISPUTE_OPENED]: 'Dispute Opened',
  [NFTEscrowStep.ERROR]: 'Error'
};

// Helper functions
export function isNFTEscrow(nftStandard: NFTStandard): boolean {
  return nftStandard !== NFTStandard.NONE;
}

export function isNFTEscrowReadyForRelease(status: NFTEscrowStatus): boolean {
  return status === NFTEscrowStatus.READY_FOR_RELEASE;
}

export function isNFTEscrowCompleted(status: NFTEscrowStatus): boolean {
  return [
    NFTEscrowStatus.DELIVERY_CONFIRMED,
    NFTEscrowStatus.RESOLVED_BUYER_WINS,
    NFTEscrowStatus.RESOLVED_SELLER_WINS,
    NFTEscrowStatus.CANCELLED
  ].includes(status);
}

export function canSellerDepositNFT(status: NFTEscrowStatus, nftDeposited: boolean): boolean {
  return !nftDeposited && (
    status === NFTEscrowStatus.CREATED ||
    status === NFTEscrowStatus.FUNDS_LOCKED
  );
}

export function canBuyerLockFunds(status: NFTEscrowStatus): boolean {
  return status === NFTEscrowStatus.CREATED ||
    status === NFTEscrowStatus.NFT_DEPOSITED;
}

export function canBuyerConfirmDelivery(status: NFTEscrowStatus): boolean {
  return status === NFTEscrowStatus.READY_FOR_RELEASE;
}

export function canOpenDispute(status: NFTEscrowStatus): boolean {
  return [
    NFTEscrowStatus.FUNDS_LOCKED,
    NFTEscrowStatus.NFT_DEPOSITED,
    NFTEscrowStatus.READY_FOR_RELEASE
  ].includes(status);
}
