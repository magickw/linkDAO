/**
 * Escrow Contract Service
 * Frontend integration with EnhancedEscrow smart contract
 */

import {
  PublicClient,
  WalletClient,
  parseUnits,
  formatUnits,
  Address,
  Hash,
  encodeFunctionData,
  decodeFunctionResult
} from 'viem';
import { PaymentError, PaymentErrorCode } from './paymentErrorHandler';
import { getEscrowAddress, getNetworkName } from '@/config/escrowConfig';

// Escrow status enum matching the smart contract
export enum EscrowStatus {
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

// NFT Standard enum matching the smart contract
export enum NFTStandard {
  NONE = 0,     // Not an NFT escrow
  ERC721 = 1,
  ERC1155 = 2
}

// Dispute resolution method enum
export enum DisputeResolutionMethod {
  AUTOMATIC = 0,
  COMMUNITY_VOTING = 1,
  ARBITRATOR = 2
}

// Escrow details interface
export interface EscrowDetails {
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
  status: EscrowStatus;
  resolutionMethod: DisputeResolutionMethod;
  votesForBuyer: bigint;
  votesForSeller: bigint;
  totalVotingPower: bigint;
  // NFT fields
  nftStandard: NFTStandard;
  nftContractAddress: Address;
  nftTokenId: bigint;
  nftAmount: bigint;
  nftDeposited: boolean;
}

// Create escrow parameters
export interface CreateEscrowParams {
  listingId: bigint;
  seller: Address;
  tokenAddress: Address;
  amount: bigint;
  deliveryDeadline: number; // Unix timestamp in seconds
  resolutionMethod: DisputeResolutionMethod;
}

// Create NFT escrow parameters
export interface CreateNFTEscrowParams extends CreateEscrowParams {
  nftStandard: NFTStandard;
  nftContractAddress: Address;
  nftTokenId: bigint;
  nftAmount: bigint;
}

// Enhanced Escrow Contract ABI (minimal, focused on payment flow)
export const ENHANCED_ESCROW_ABI = [
  // Read functions
  {
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    name: 'escrows',
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'listingId', type: 'uint256' },
      { name: 'buyer', type: 'address' },
      { name: 'seller', type: 'address' },
      { name: 'tokenAddress', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'feeAmount', type: 'uint256' },
      { name: 'deliveryInfo', type: 'string' },
      { name: 'deliveryDeadline', type: 'uint256' },
      { name: 'createdAt', type: 'uint256' },
      { name: 'resolvedAt', type: 'uint256' },
      { name: 'status', type: 'uint8' },
      { name: 'resolutionMethod', type: 'uint8' },
      { name: 'votesForBuyer', type: 'uint256' },
      { name: 'votesForSeller', type: 'uint256' },
      { name: 'totalVotingPower', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'platformFeePercentage',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  // Write functions
  {
    inputs: [
      { name: 'listingId', type: 'uint256' },
      { name: 'seller', type: 'address' },
      { name: 'tokenAddress', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'deliveryDeadline', type: 'uint256' },
      { name: 'resolutionMethod', type: 'uint8' }
    ],
    name: 'createEscrow',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    name: 'lockFunds',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'escrowId', type: 'uint256' },
      { name: 'deliveryInfo', type: 'string' }
    ],
    name: 'confirmDelivery',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    name: 'openDispute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'escrowId', type: 'uint256' },
      { indexed: true, name: 'buyer', type: 'address' },
      { indexed: true, name: 'seller', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' }
    ],
    name: 'EscrowCreated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'escrowId', type: 'uint256' },
      { indexed: false, name: 'amount', type: 'uint256' }
    ],
    name: 'FundsLocked',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'escrowId', type: 'uint256' },
      { indexed: false, name: 'deliveryInfo', type: 'string' }
    ],
    name: 'DeliveryConfirmed',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'escrowId', type: 'uint256' },
      { indexed: false, name: 'method', type: 'uint8' }
    ],
    name: 'DisputeOpened',
    type: 'event'
  }
] as const;

// NFT Escrow ABI extensions
export const NFT_ESCROW_ABI = [
  // Create NFT Escrow
  {
    inputs: [
      { name: 'listingId', type: 'uint256' },
      { name: 'seller', type: 'address' },
      { name: 'tokenAddress', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'deliveryDeadline', type: 'uint256' },
      { name: 'resolutionMethod', type: 'uint8' },
      { name: 'nftStandard', type: 'uint8' },
      { name: 'nftContractAddress', type: 'address' },
      { name: 'nftTokenId', type: 'uint256' },
      { name: 'nftAmount', type: 'uint256' }
    ],
    name: 'createNFTEscrow',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function'
  },
  // Deposit NFT
  {
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    name: 'depositNFT',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // Lock funds for NFT escrow
  {
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    name: 'lockFundsForNFT',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  // Confirm NFT delivery
  {
    inputs: [
      { name: 'escrowId', type: 'uint256' },
      { name: 'deliveryInfo', type: 'string' }
    ],
    name: 'confirmNFTDelivery',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // Open NFT dispute
  {
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    name: 'openNFTDispute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // Get NFT escrow details
  {
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    name: 'getNFTEscrowDetails',
    outputs: [
      { name: 'nftStandard', type: 'uint8' },
      { name: 'nftContractAddress', type: 'address' },
      { name: 'nftTokenId', type: 'uint256' },
      { name: 'nftAmount', type: 'uint256' },
      { name: 'nftDeposited', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  // NFT Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'escrowId', type: 'uint256' },
      { indexed: true, name: 'nftContract', type: 'address' },
      { indexed: false, name: 'tokenId', type: 'uint256' },
      { indexed: false, name: 'standard', type: 'uint8' }
    ],
    name: 'NFTDeposited',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'escrowId', type: 'uint256' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'nftContract', type: 'address' },
      { indexed: false, name: 'tokenId', type: 'uint256' }
    ],
    name: 'NFTTransferred',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'escrowId', type: 'uint256' }
    ],
    name: 'EscrowReadyForRelease',
    type: 'event'
  }
] as const;

// ERC721 ABI for approval
export const ERC721_ABI = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' }
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getApproved',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'operator', type: 'address' }
    ],
    name: 'isApprovedForAll',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// ERC1155 ABI for approval
export const ERC1155_ABI = [
  {
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' }
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'operator', type: 'address' }
    ],
    name: 'isApprovedForAll',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' }
    ],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// Deadline Refund ABI
export const DEADLINE_REFUND_ABI = [
  {
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    name: 'isEligibleForDeadlineRefund',
    outputs: [
      { name: 'eligible', type: 'bool' },
      { name: 'reason', type: 'string' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    name: 'getTimeUntilDeadlineRefund',
    outputs: [{ name: 'timeRemaining', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    name: 'claimDeadlineRefund',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    name: 'claimNFTDeadlineRefund',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'escrowId', type: 'uint256' },
      { indexed: true, name: 'buyer', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'reason', type: 'string' }
    ],
    name: 'DeadlineRefund',
    type: 'event'
  }
] as const;

// Dispute Bond ABI
export const DISPUTE_BOND_ABI = [
  {
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    name: 'calculateDisputeBond',
    outputs: [{ name: 'bondAmount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getDisputeBondConfig',
    outputs: [
      { name: 'percentage', type: 'uint256' },
      { name: 'minBond', type: 'uint256' },
      { name: 'required', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    name: 'disputeBonds',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    name: 'disputeInitiator',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'escrowId', type: 'uint256' },
      { indexed: true, name: 'depositor', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' }
    ],
    name: 'DisputeBondDeposited',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'escrowId', type: 'uint256' },
      { indexed: true, name: 'recipient', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' }
    ],
    name: 'DisputeBondRefunded',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'escrowId', type: 'uint256' },
      { indexed: true, name: 'loser', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: true, name: 'winner', type: 'address' }
    ],
    name: 'DisputeBondForfeited',
    type: 'event'
  }
] as const;

export class EscrowContractService {
  private publicClient: PublicClient;
  private walletClient?: WalletClient;

  constructor(publicClient: PublicClient, walletClient?: WalletClient) {
    this.publicClient = publicClient;
    this.walletClient = walletClient;
  }

  /**
   * Get escrow contract address for current network
   */
  async getEscrowContractAddress(): Promise<Address> {
    const chainId = await this.publicClient.getChainId();
    const address = getEscrowAddress(chainId);

    if (!address) {
      const networkName = getNetworkName(chainId);
      throw new PaymentError({
        code: PaymentErrorCode.CONTRACT_NOT_FOUND,
        message: `Escrow contract not deployed on chain ${chainId}`,
        userMessage: `Escrow service is not available on ${networkName}`,
        recoveryOptions: [
          {
            action: 'switch_network',
            label: 'Switch Network',
            description: 'Switch to a supported network (Sepolia Testnet)',
            priority: 'primary'
          }
        ],
        retryable: false
      });
    }

    return address;
  }

  /**
   * Get platform fee percentage
   */
  async getPlatformFeePercentage(): Promise<number> {
    try {
      const escrowAddress = await this.getEscrowContractAddress();

      const feePercentage = await this.publicClient.readContract({
        address: escrowAddress,
        abi: ENHANCED_ESCROW_ABI,
        functionName: 'platformFeePercentage',
        authorizationList: [],
      });

      return Number(feePercentage);
    } catch (error) {
      console.error('Failed to get platform fee percentage:', error);
      // Default to 2.5% (250 basis points)
      return 250;
    }
  }

  /**
   * Calculate total amount with platform fee
   */
  async calculateTotalWithFee(amount: bigint): Promise<{ amount: bigint; fee: bigint; total: bigint }> {
    const feePercentage = await this.getPlatformFeePercentage();
    const fee = (amount * BigInt(feePercentage)) / BigInt(10000);
    const total = amount + fee;

    return { amount, fee, total };
  }

  /**
   * Create a new escrow
   */
  async createEscrow(params: CreateEscrowParams): Promise<bigint> {
    if (!this.walletClient) {
      throw new PaymentError({
        code: PaymentErrorCode.WALLET_NOT_CONNECTED,
        message: 'Wallet not connected',
        userMessage: 'Please connect your wallet to create an escrow',
        recoveryOptions: [
          {
            action: 'connect_wallet',
            label: 'Connect Wallet',
            description: 'Connect your Web3 wallet',
            priority: 'primary'
          }
        ],
        retryable: true
      });
    }

    try {
      const escrowAddress = await this.getEscrowContractAddress();

      // Simulate the transaction first
      const { request } = await this.publicClient.simulateContract({
        address: escrowAddress,
        abi: ENHANCED_ESCROW_ABI,
        functionName: 'createEscrow',
        args: [
          params.listingId,
          params.seller,
          params.tokenAddress,
          params.amount,
          BigInt(params.deliveryDeadline),
          params.resolutionMethod
        ],
        account: (await this.walletClient.getAddresses())[0]
      });

      // Execute the transaction
      const hash = await this.walletClient.writeContract(request);

      // Wait for transaction receipt
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      // Parse escrow ID from logs
      const escrowId = this.parseEscrowIdFromReceipt(receipt);

      return escrowId;
    } catch (error) {
      console.error('Failed to create escrow:', error);
      throw PaymentError.fromError(error);
    }
  }

  /**
   * Lock funds in escrow
   */
  async lockFunds(escrowId: bigint, amount: bigint, isNative: boolean): Promise<Hash> {
    if (!this.walletClient) {
      throw new PaymentError({
        code: PaymentErrorCode.WALLET_NOT_CONNECTED,
        message: 'Wallet not connected',
        userMessage: 'Please connect your wallet to lock funds',
        recoveryOptions: [
          {
            action: 'connect_wallet',
            label: 'Connect Wallet',
            description: 'Connect your Web3 wallet',
            priority: 'primary'
          }
        ],
        retryable: true
      });
    }

    try {
      const escrowAddress = await this.getEscrowContractAddress();
      const { total } = await this.calculateTotalWithFee(amount);

      // Simulate the transaction
      const { request } = await this.publicClient.simulateContract({
        address: escrowAddress,
        abi: ENHANCED_ESCROW_ABI,
        functionName: 'lockFunds',
        args: [escrowId],
        value: isNative ? total : 0n,
        account: (await this.walletClient.getAddresses())[0]
      });

      // Execute the transaction
      const hash = await this.walletClient.writeContract(request);

      // Wait for confirmation
      await this.publicClient.waitForTransactionReceipt({ hash });

      return hash;
    } catch (error) {
      console.error('Failed to lock funds:', error);
      throw PaymentError.fromError(error);
    }
  }

  /**
   * Confirm delivery and release funds
   */
  async confirmDelivery(escrowId: bigint, deliveryInfo: string): Promise<Hash> {
    if (!this.walletClient) {
      throw new PaymentError({
        code: PaymentErrorCode.WALLET_NOT_CONNECTED,
        message: 'Wallet not connected',
        userMessage: 'Please connect your wallet to confirm delivery',
        recoveryOptions: [
          {
            action: 'connect_wallet',
            label: 'Connect Wallet',
            description: 'Connect your Web3 wallet',
            priority: 'primary'
          }
        ],
        retryable: true
      });
    }

    try {
      const escrowAddress = await this.getEscrowContractAddress();

      const { request } = await this.publicClient.simulateContract({
        address: escrowAddress,
        abi: ENHANCED_ESCROW_ABI,
        functionName: 'confirmDelivery',
        args: [escrowId, deliveryInfo],
        account: (await this.walletClient.getAddresses())[0]
      });

      const hash = await this.walletClient.writeContract(request);
      await this.publicClient.waitForTransactionReceipt({ hash });

      return hash;
    } catch (error) {
      console.error('Failed to confirm delivery:', error);
      throw PaymentError.fromError(error);
    }
  }

  /**
   * Open a dispute
   */
  async openDispute(escrowId: bigint): Promise<Hash> {
    if (!this.walletClient) {
      throw new PaymentError({
        code: PaymentErrorCode.WALLET_NOT_CONNECTED,
        message: 'Wallet not connected',
        userMessage: 'Please connect your wallet to open a dispute',
        recoveryOptions: [
          {
            action: 'connect_wallet',
            label: 'Connect Wallet',
            description: 'Connect your Web3 wallet',
            priority: 'primary'
          }
        ],
        retryable: true
      });
    }

    try {
      const escrowAddress = await this.getEscrowContractAddress();

      const { request } = await this.publicClient.simulateContract({
        address: escrowAddress,
        abi: ENHANCED_ESCROW_ABI,
        functionName: 'openDispute',
        args: [escrowId],
        account: (await this.walletClient.getAddresses())[0]
      });

      const hash = await this.walletClient.writeContract(request);
      await this.publicClient.waitForTransactionReceipt({ hash });

      return hash;
    } catch (error) {
      console.error('Failed to open dispute:', error);
      throw PaymentError.fromError(error);
    }
  }

  /**
   * Get escrow details
   */
  async getEscrowDetails(escrowId: bigint): Promise<EscrowDetails> {
    try {
      const escrowAddress = await this.getEscrowContractAddress();

      const escrowData = await this.publicClient.readContract({
        address: escrowAddress,
        abi: ENHANCED_ESCROW_ABI,
        functionName: 'escrows',
        args: [escrowId],
        authorizationList: [],
      }) as any;

      return {
        id: escrowData[0],
        listingId: escrowData[1],
        buyer: escrowData[2],
        seller: escrowData[3],
        tokenAddress: escrowData[4],
        amount: escrowData[5],
        feeAmount: escrowData[6],
        deliveryInfo: escrowData[7],
        deliveryDeadline: escrowData[8],
        createdAt: escrowData[9],
        resolvedAt: escrowData[10],
        status: escrowData[11],
        resolutionMethod: escrowData[12],
        votesForBuyer: escrowData[13],
        votesForSeller: escrowData[14],
        totalVotingPower: escrowData[15],
        // NFT fields - will be populated by getNFTEscrowDetails if this is an NFT escrow
        nftStandard: NFTStandard.NONE,
        nftContractAddress: '0x0000000000000000000000000000000000000000' as Address,
        nftTokenId: 0n,
        nftAmount: 0n,
        nftDeposited: false
      };
    } catch (error) {
      console.error('Failed to get escrow details:', error);
      throw PaymentError.fromError(error);
    }
  }

  /**
   * Get escrow status
   */
  async getEscrowStatus(escrowId: bigint): Promise<EscrowStatus> {
    const details = await this.getEscrowDetails(escrowId);
    return details.status;
  }

  /**
   * Check if escrow is in a terminal state
   */
  isEscrowCompleted(status: EscrowStatus): boolean {
    return [
      EscrowStatus.DELIVERY_CONFIRMED,
      EscrowStatus.RESOLVED_BUYER_WINS,
      EscrowStatus.RESOLVED_SELLER_WINS,
      EscrowStatus.CANCELLED
    ].includes(status);
  }

  /**
   * Parse escrow ID from transaction receipt
   */
  private parseEscrowIdFromReceipt(receipt: any): bigint {
    // Find EscrowCreated event in logs
    for (const log of receipt.logs) {
      try {
        // The escrowId is the first indexed parameter in the EscrowCreated event
        if (log.topics.length >= 2) {
          const escrowId = BigInt(log.topics[1]);
          if (escrowId > 0n) {
            return escrowId;
          }
        }
      } catch (err) {
        // Continue checking other logs
        continue;
      }
    }

    throw new Error('Could not parse escrow ID from transaction receipt');
  }

  /**
   * Approve ERC20 token spending for escrow contract
   */
  async approveTokenSpending(tokenAddress: Address, amount: bigint): Promise<Hash> {
    if (!this.walletClient) {
      throw new PaymentError({
        code: PaymentErrorCode.WALLET_NOT_CONNECTED,
        message: 'Wallet not connected',
        userMessage: 'Please connect your wallet to approve token spending',
        recoveryOptions: [
          {
            action: 'connect_wallet',
            label: 'Connect Wallet',
            description: 'Connect your Web3 wallet',
            priority: 'primary'
          }
        ],
        retryable: true
      });
    }

    try {
      const escrowAddress = await this.getEscrowContractAddress();
      const { total } = await this.calculateTotalWithFee(amount);

      // ERC20 approve ABI
      const erc20ApproveAbi = [
        {
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          name: 'approve',
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'nonpayable',
          type: 'function'
        }
      ] as const;

      const { request } = await this.publicClient.simulateContract({
        address: tokenAddress,
        abi: erc20ApproveAbi,
        functionName: 'approve',
        args: [escrowAddress, total],
        account: (await this.walletClient.getAddresses())[0]
      });

      const hash = await this.walletClient.writeContract(request);
      await this.publicClient.waitForTransactionReceipt({ hash });

      return hash;
    } catch (error) {
      console.error('Failed to approve token spending:', error);
      throw PaymentError.fromError(error);
    }
  }

  // ==================== NFT ESCROW METHODS ====================

  /**
   * Create a new NFT escrow for atomic swap
   */
  async createNFTEscrow(params: CreateNFTEscrowParams): Promise<bigint> {
    if (!this.walletClient) {
      throw new PaymentError({
        code: PaymentErrorCode.WALLET_NOT_CONNECTED,
        message: 'Wallet not connected',
        userMessage: 'Please connect your wallet to create an NFT escrow',
        recoveryOptions: [
          {
            action: 'connect_wallet',
            label: 'Connect Wallet',
            description: 'Connect your Web3 wallet',
            priority: 'primary'
          }
        ],
        retryable: true
      });
    }

    try {
      const escrowAddress = await this.getEscrowContractAddress();

      const { request } = await this.publicClient.simulateContract({
        address: escrowAddress,
        abi: NFT_ESCROW_ABI,
        functionName: 'createNFTEscrow',
        args: [
          params.listingId,
          params.seller,
          params.tokenAddress,
          params.amount,
          BigInt(params.deliveryDeadline),
          params.resolutionMethod,
          params.nftStandard,
          params.nftContractAddress,
          params.nftTokenId,
          params.nftAmount
        ],
        account: (await this.walletClient.getAddresses())[0]
      });

      const hash = await this.walletClient.writeContract(request);
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      return this.parseEscrowIdFromReceipt(receipt);
    } catch (error) {
      console.error('Failed to create NFT escrow:', error);
      throw PaymentError.fromError(error);
    }
  }

  /**
   * Deposit NFT into escrow (called by seller)
   */
  async depositNFT(escrowId: bigint): Promise<Hash> {
    if (!this.walletClient) {
      throw new PaymentError({
        code: PaymentErrorCode.WALLET_NOT_CONNECTED,
        message: 'Wallet not connected',
        userMessage: 'Please connect your wallet to deposit NFT',
        recoveryOptions: [
          {
            action: 'connect_wallet',
            label: 'Connect Wallet',
            description: 'Connect your Web3 wallet',
            priority: 'primary'
          }
        ],
        retryable: true
      });
    }

    try {
      const escrowAddress = await this.getEscrowContractAddress();

      const { request } = await this.publicClient.simulateContract({
        address: escrowAddress,
        abi: NFT_ESCROW_ABI,
        functionName: 'depositNFT',
        args: [escrowId],
        account: (await this.walletClient.getAddresses())[0]
      });

      const hash = await this.walletClient.writeContract(request);
      await this.publicClient.waitForTransactionReceipt({ hash });

      return hash;
    } catch (error) {
      console.error('Failed to deposit NFT:', error);
      throw PaymentError.fromError(error);
    }
  }

  /**
   * Lock funds for NFT escrow
   */
  async lockFundsForNFT(escrowId: bigint, amount: bigint, isNative: boolean): Promise<Hash> {
    if (!this.walletClient) {
      throw new PaymentError({
        code: PaymentErrorCode.WALLET_NOT_CONNECTED,
        message: 'Wallet not connected',
        userMessage: 'Please connect your wallet to lock funds',
        recoveryOptions: [
          {
            action: 'connect_wallet',
            label: 'Connect Wallet',
            description: 'Connect your Web3 wallet',
            priority: 'primary'
          }
        ],
        retryable: true
      });
    }

    try {
      const escrowAddress = await this.getEscrowContractAddress();
      const { total } = await this.calculateTotalWithFee(amount);

      const { request } = await this.publicClient.simulateContract({
        address: escrowAddress,
        abi: NFT_ESCROW_ABI,
        functionName: 'lockFundsForNFT',
        args: [escrowId],
        value: isNative ? total : 0n,
        account: (await this.walletClient.getAddresses())[0]
      });

      const hash = await this.walletClient.writeContract(request);
      await this.publicClient.waitForTransactionReceipt({ hash });

      return hash;
    } catch (error) {
      console.error('Failed to lock funds for NFT escrow:', error);
      throw PaymentError.fromError(error);
    }
  }

  /**
   * Confirm NFT delivery and execute atomic swap
   */
  async confirmNFTDelivery(escrowId: bigint, deliveryInfo: string): Promise<Hash> {
    if (!this.walletClient) {
      throw new PaymentError({
        code: PaymentErrorCode.WALLET_NOT_CONNECTED,
        message: 'Wallet not connected',
        userMessage: 'Please connect your wallet to confirm NFT delivery',
        recoveryOptions: [
          {
            action: 'connect_wallet',
            label: 'Connect Wallet',
            description: 'Connect your Web3 wallet',
            priority: 'primary'
          }
        ],
        retryable: true
      });
    }

    try {
      const escrowAddress = await this.getEscrowContractAddress();

      const { request } = await this.publicClient.simulateContract({
        address: escrowAddress,
        abi: NFT_ESCROW_ABI,
        functionName: 'confirmNFTDelivery',
        args: [escrowId, deliveryInfo],
        account: (await this.walletClient.getAddresses())[0]
      });

      const hash = await this.walletClient.writeContract(request);
      await this.publicClient.waitForTransactionReceipt({ hash });

      return hash;
    } catch (error) {
      console.error('Failed to confirm NFT delivery:', error);
      throw PaymentError.fromError(error);
    }
  }

  /**
   * Open dispute for NFT escrow
   */
  async openNFTDispute(escrowId: bigint): Promise<Hash> {
    if (!this.walletClient) {
      throw new PaymentError({
        code: PaymentErrorCode.WALLET_NOT_CONNECTED,
        message: 'Wallet not connected',
        userMessage: 'Please connect your wallet to open a dispute',
        recoveryOptions: [
          {
            action: 'connect_wallet',
            label: 'Connect Wallet',
            description: 'Connect your Web3 wallet',
            priority: 'primary'
          }
        ],
        retryable: true
      });
    }

    try {
      const escrowAddress = await this.getEscrowContractAddress();

      const { request } = await this.publicClient.simulateContract({
        address: escrowAddress,
        abi: NFT_ESCROW_ABI,
        functionName: 'openNFTDispute',
        args: [escrowId],
        account: (await this.walletClient.getAddresses())[0]
      });

      const hash = await this.walletClient.writeContract(request);
      await this.publicClient.waitForTransactionReceipt({ hash });

      return hash;
    } catch (error) {
      console.error('Failed to open NFT dispute:', error);
      throw PaymentError.fromError(error);
    }
  }

  /**
   * Get NFT escrow details
   */
  async getNFTEscrowDetails(escrowId: bigint): Promise<{
    nftStandard: NFTStandard;
    nftContractAddress: Address;
    nftTokenId: bigint;
    nftAmount: bigint;
    nftDeposited: boolean;
  }> {
    try {
      const escrowAddress = await this.getEscrowContractAddress();

      const nftData = await this.publicClient.readContract({
        address: escrowAddress,
        abi: NFT_ESCROW_ABI,
        functionName: 'getNFTEscrowDetails',
        args: [escrowId],
        authorizationList: [],
      }) as any;

      return {
        nftStandard: nftData[0],
        nftContractAddress: nftData[1],
        nftTokenId: nftData[2],
        nftAmount: nftData[3],
        nftDeposited: nftData[4]
      };
    } catch (error) {
      console.error('Failed to get NFT escrow details:', error);
      throw PaymentError.fromError(error);
    }
  }

  /**
   * Get full escrow details with NFT info
   */
  async getFullEscrowDetails(escrowId: bigint): Promise<EscrowDetails> {
    const baseDetails = await this.getEscrowDetails(escrowId);

    try {
      const nftDetails = await this.getNFTEscrowDetails(escrowId);
      return {
        ...baseDetails,
        ...nftDetails
      };
    } catch {
      // Not an NFT escrow, return base details
      return baseDetails;
    }
  }

  /**
   * Check if NFT is approved for escrow contract
   */
  async isNFTApproved(
    nftContractAddress: Address,
    tokenId: bigint,
    nftStandard: NFTStandard,
    owner: Address
  ): Promise<boolean> {
    try {
      const escrowAddress = await this.getEscrowContractAddress();

      if (nftStandard === NFTStandard.ERC721) {
        // Check specific approval
        const approved = await this.publicClient.readContract({
          address: nftContractAddress,
          abi: ERC721_ABI,
          functionName: 'getApproved',
          args: [tokenId],
          authorizationList: [],
        });

        if (approved === escrowAddress) {
          return true;
        }

        // Check approval for all
        const isApprovedForAll = await this.publicClient.readContract({
          address: nftContractAddress,
          abi: ERC721_ABI,
          functionName: 'isApprovedForAll',
          args: [owner, escrowAddress],
          authorizationList: [],
        });

        return isApprovedForAll as boolean;
      } else if (nftStandard === NFTStandard.ERC1155) {
        // ERC1155 only has setApprovalForAll
        const isApprovedForAll = await this.publicClient.readContract({
          address: nftContractAddress,
          abi: ERC1155_ABI,
          functionName: 'isApprovedForAll',
          args: [owner, escrowAddress],
          authorizationList: [],
        });

        return isApprovedForAll as boolean;
      }

      return false;
    } catch (error) {
      console.error('Failed to check NFT approval:', error);
      return false;
    }
  }

  /**
   * Approve ERC721 for escrow contract
   */
  async approveERC721(nftContractAddress: Address, tokenId: bigint): Promise<Hash> {
    if (!this.walletClient) {
      throw new PaymentError({
        code: PaymentErrorCode.WALLET_NOT_CONNECTED,
        message: 'Wallet not connected',
        userMessage: 'Please connect your wallet to approve NFT transfer',
        recoveryOptions: [
          {
            action: 'connect_wallet',
            label: 'Connect Wallet',
            description: 'Connect your Web3 wallet',
            priority: 'primary'
          }
        ],
        retryable: true
      });
    }

    try {
      const escrowAddress = await this.getEscrowContractAddress();

      const { request } = await this.publicClient.simulateContract({
        address: nftContractAddress,
        abi: ERC721_ABI,
        functionName: 'approve',
        args: [escrowAddress, tokenId],
        account: (await this.walletClient.getAddresses())[0]
      });

      const hash = await this.walletClient.writeContract(request);
      await this.publicClient.waitForTransactionReceipt({ hash });

      return hash;
    } catch (error) {
      console.error('Failed to approve ERC721:', error);
      throw PaymentError.fromError(error);
    }
  }

  /**
   * Approve ERC1155 for escrow contract (set approval for all)
   */
  async approveERC1155(nftContractAddress: Address): Promise<Hash> {
    if (!this.walletClient) {
      throw new PaymentError({
        code: PaymentErrorCode.WALLET_NOT_CONNECTED,
        message: 'Wallet not connected',
        userMessage: 'Please connect your wallet to approve NFT transfer',
        recoveryOptions: [
          {
            action: 'connect_wallet',
            label: 'Connect Wallet',
            description: 'Connect your Web3 wallet',
            priority: 'primary'
          }
        ],
        retryable: true
      });
    }

    try {
      const escrowAddress = await this.getEscrowContractAddress();

      const { request } = await this.publicClient.simulateContract({
        address: nftContractAddress,
        abi: ERC1155_ABI,
        functionName: 'setApprovalForAll',
        args: [escrowAddress, true],
        account: (await this.walletClient.getAddresses())[0]
      });

      const hash = await this.walletClient.writeContract(request);
      await this.publicClient.waitForTransactionReceipt({ hash });

      return hash;
    } catch (error) {
      console.error('Failed to approve ERC1155:', error);
      throw PaymentError.fromError(error);
    }
  }

  /**
   * Get ERC721 owner
   */
  async getERC721Owner(nftContractAddress: Address, tokenId: bigint): Promise<Address> {
    try {
      const owner = await this.publicClient.readContract({
        address: nftContractAddress,
        abi: ERC721_ABI,
        functionName: 'ownerOf',
        args: [tokenId],
        authorizationList: [],
      });

      return owner as Address;
    } catch (error) {
      console.error('Failed to get ERC721 owner:', error);
      throw PaymentError.fromError(error);
    }
  }

  /**
   * Get ERC1155 balance
   */
  async getERC1155Balance(nftContractAddress: Address, owner: Address, tokenId: bigint): Promise<bigint> {
    try {
      const balance = await this.publicClient.readContract({
        address: nftContractAddress,
        abi: ERC1155_ABI,
        functionName: 'balanceOf',
        args: [owner, tokenId],
        authorizationList: [],
      });

      return balance as bigint;
    } catch (error) {
      console.error('Failed to get ERC1155 balance:', error);
      throw PaymentError.fromError(error);
    }
  }

  /**
   * Check if this is an NFT escrow
   */
  async isNFTEscrow(escrowId: bigint): Promise<boolean> {
    try {
      const nftDetails = await this.getNFTEscrowDetails(escrowId);
      return nftDetails.nftStandard !== NFTStandard.NONE;
    } catch {
      return false;
    }
  }

  /**
   * Check if NFT escrow is ready for release (both funds and NFT deposited)
   */
  async isReadyForRelease(escrowId: bigint): Promise<boolean> {
    const details = await this.getEscrowDetails(escrowId);
    return details.status === EscrowStatus.READY_FOR_RELEASE;
  }

  // ==================== DEADLINE REFUND METHODS ====================

  /**
   * Check if escrow is eligible for deadline refund
   */
  async isEligibleForDeadlineRefund(escrowId: bigint): Promise<{ eligible: boolean; reason: string }> {
    try {
      const escrowAddress = await this.getEscrowContractAddress();

      const result = await this.publicClient.readContract({
        address: escrowAddress,
        abi: DEADLINE_REFUND_ABI,
        functionName: 'isEligibleForDeadlineRefund',
        args: [escrowId],
        authorizationList: [],
      }) as [boolean, string];

      return {
        eligible: result[0],
        reason: result[1]
      };
    } catch (error) {
      console.error('Failed to check deadline refund eligibility:', error);
      return { eligible: false, reason: 'Failed to check eligibility' };
    }
  }

  /**
   * Get remaining time until deadline refund is available
   */
  async getTimeUntilDeadlineRefund(escrowId: bigint): Promise<bigint> {
    try {
      const escrowAddress = await this.getEscrowContractAddress();

      const timeRemaining = await this.publicClient.readContract({
        address: escrowAddress,
        abi: DEADLINE_REFUND_ABI,
        functionName: 'getTimeUntilDeadlineRefund',
        args: [escrowId],
        authorizationList: [],
      });

      return timeRemaining as bigint;
    } catch (error) {
      console.error('Failed to get time until deadline refund:', error);
      return 0n;
    }
  }

  /**
   * Claim refund after delivery deadline has passed
   */
  async claimDeadlineRefund(escrowId: bigint): Promise<Hash> {
    if (!this.walletClient) {
      throw new PaymentError({
        code: PaymentErrorCode.WALLET_NOT_CONNECTED,
        message: 'Wallet not connected',
        userMessage: 'Please connect your wallet to claim refund',
        recoveryOptions: [
          {
            action: 'connect_wallet',
            label: 'Connect Wallet',
            description: 'Connect your Web3 wallet',
            priority: 'primary'
          }
        ],
        retryable: true
      });
    }

    try {
      const escrowAddress = await this.getEscrowContractAddress();

      const { request } = await this.publicClient.simulateContract({
        address: escrowAddress,
        abi: DEADLINE_REFUND_ABI,
        functionName: 'claimDeadlineRefund',
        args: [escrowId],
        account: (await this.walletClient.getAddresses())[0]
      });

      const hash = await this.walletClient.writeContract(request);
      await this.publicClient.waitForTransactionReceipt({ hash });

      return hash;
    } catch (error) {
      console.error('Failed to claim deadline refund:', error);
      throw PaymentError.fromError(error);
    }
  }

  /**
   * Claim deadline refund for NFT escrow
   */
  async claimNFTDeadlineRefund(escrowId: bigint): Promise<Hash> {
    if (!this.walletClient) {
      throw new PaymentError({
        code: PaymentErrorCode.WALLET_NOT_CONNECTED,
        message: 'Wallet not connected',
        userMessage: 'Please connect your wallet to claim NFT refund',
        recoveryOptions: [
          {
            action: 'connect_wallet',
            label: 'Connect Wallet',
            description: 'Connect your Web3 wallet',
            priority: 'primary'
          }
        ],
        retryable: true
      });
    }

    try {
      const escrowAddress = await this.getEscrowContractAddress();

      const { request } = await this.publicClient.simulateContract({
        address: escrowAddress,
        abi: DEADLINE_REFUND_ABI,
        functionName: 'claimNFTDeadlineRefund',
        args: [escrowId],
        account: (await this.walletClient.getAddresses())[0]
      });

      const hash = await this.walletClient.writeContract(request);
      await this.publicClient.waitForTransactionReceipt({ hash });

      return hash;
    } catch (error) {
      console.error('Failed to claim NFT deadline refund:', error);
      throw PaymentError.fromError(error);
    }
  }

  // ==================== DISPUTE BOND METHODS ====================

  /**
   * Get dispute bond configuration
   */
  async getDisputeBondConfig(): Promise<{ percentage: bigint; minBond: bigint; required: boolean }> {
    try {
      const escrowAddress = await this.getEscrowContractAddress();

      const result = await this.publicClient.readContract({
        address: escrowAddress,
        abi: DISPUTE_BOND_ABI,
        functionName: 'getDisputeBondConfig',
        authorizationList: [],
      }) as [bigint, bigint, boolean];

      return {
        percentage: result[0],
        minBond: result[1],
        required: result[2]
      };
    } catch (error) {
      console.error('Failed to get dispute bond config:', error);
      // Return defaults
      return {
        percentage: 500n, // 5%
        minBond: 10000000000000000n, // 0.01 ETH
        required: true
      };
    }
  }

  /**
   * Calculate required dispute bond for an escrow
   */
  async calculateDisputeBond(escrowId: bigint): Promise<bigint> {
    try {
      const escrowAddress = await this.getEscrowContractAddress();

      const bondAmount = await this.publicClient.readContract({
        address: escrowAddress,
        abi: DISPUTE_BOND_ABI,
        functionName: 'calculateDisputeBond',
        args: [escrowId],
        authorizationList: [],
      });

      return bondAmount as bigint;
    } catch (error) {
      console.error('Failed to calculate dispute bond:', error);
      throw PaymentError.fromError(error);
    }
  }

  /**
   * Get deposited bond amount for an escrow
   */
  async getDisputeBond(escrowId: bigint): Promise<bigint> {
    try {
      const escrowAddress = await this.getEscrowContractAddress();

      const bondAmount = await this.publicClient.readContract({
        address: escrowAddress,
        abi: DISPUTE_BOND_ABI,
        functionName: 'disputeBonds',
        args: [escrowId],
        authorizationList: [],
      });

      return bondAmount as bigint;
    } catch (error) {
      console.error('Failed to get dispute bond:', error);
      return 0n;
    }
  }

  /**
   * Get dispute initiator address
   */
  async getDisputeInitiator(escrowId: bigint): Promise<Address | null> {
    try {
      const escrowAddress = await this.getEscrowContractAddress();

      const initiator = await this.publicClient.readContract({
        address: escrowAddress,
        abi: DISPUTE_BOND_ABI,
        functionName: 'disputeInitiator',
        args: [escrowId],
        authorizationList: [],
      });

      return initiator as Address;
    } catch (error) {
      console.error('Failed to get dispute initiator:', error);
      return null;
    }
  }

  /**
   * Open a dispute with bond payment
   */
  async openDisputeWithBond(escrowId: bigint): Promise<Hash> {
    if (!this.walletClient) {
      throw new PaymentError({
        code: PaymentErrorCode.WALLET_NOT_CONNECTED,
        message: 'Wallet not connected',
        userMessage: 'Please connect your wallet to open a dispute',
        recoveryOptions: [
          {
            action: 'connect_wallet',
            label: 'Connect Wallet',
            description: 'Connect your Web3 wallet',
            priority: 'primary'
          }
        ],
        retryable: true
      });
    }

    try {
      const escrowAddress = await this.getEscrowContractAddress();

      // Get required bond amount
      const bondAmount = await this.calculateDisputeBond(escrowId);

      // Open dispute with bond payment
      const { request } = await this.publicClient.simulateContract({
        address: escrowAddress,
        abi: ENHANCED_ESCROW_ABI,
        functionName: 'openDispute',
        args: [escrowId],
        value: bondAmount,
        account: (await this.walletClient.getAddresses())[0]
      });

      const hash = await this.walletClient.writeContract(request);
      await this.publicClient.waitForTransactionReceipt({ hash });

      return hash;
    } catch (error) {
      console.error('Failed to open dispute with bond:', error);
      throw PaymentError.fromError(error);
    }
  }
}
