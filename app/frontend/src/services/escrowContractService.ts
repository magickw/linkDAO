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
  DELIVERY_CONFIRMED = 2,
  DISPUTE_OPENED = 3,
  RESOLVED_BUYER_WINS = 4,
  RESOLVED_SELLER_WINS = 5,
  CANCELLED = 6
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
        totalVotingPower: escrowData[15]
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
}
