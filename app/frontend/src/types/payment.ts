export interface PaymentToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  logoURI?: string;
  isNative?: boolean;
}

export interface GasFeeEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  totalCost: bigint;
  totalCostUSD?: number;
}

export interface PaymentMethod {
  id: string;
  type: 'crypto' | 'fiat';
  token?: PaymentToken;
  chainId?: number;
  name: string;
  icon?: string;
  enabled: boolean;
}

export interface PaymentRequest {
  orderId: string;
  amount: bigint;
  token: PaymentToken;
  recipient: string;
  chainId: number;
  deadline?: number;
  metadata?: Record<string, any>;
  // Enhanced properties for escrow payments
  totalAmount?: string;
  listingId?: number;
  sellerId?: string;
  escrowEnabled?: boolean;
  // Escrow configuration
  deliveryDeadline?: number; // Unix timestamp
  resolutionMethod?: 0 | 1 | 2; // 0: Arbitrator, 1: Voting, 2: Timeout
  arbiter?: string; // Address of arbitrator
}

export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  escrowId?: string;
  gasUsed?: string;
}

export interface EscrowInfo {
  escrowContractAddress: string;
  arbiter: string;
  status: EscrowStatus;
  disputeResolver: string;
}

export enum EscrowStatus {
  CREATED = 'created',
  FUNDED = 'funded',
  RELEASED = 'released',
  REFUNDED = 'refunded',
  DISPUTE = 'dispute',
}

export interface PaymentTransaction {
  id: string;
  hash?: string;
  orderId: string;
  amount: bigint;
  token: PaymentToken;
  sender: string;
  recipient: string;
  chainId: number;
  status: PaymentStatus;
  gasUsed?: bigint;
  gasFee?: bigint;
  blockNumber?: number;
  confirmations: number;
  createdAt: Date;
  updatedAt: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  escrowInfo?: EscrowInfo;
}

export enum PaymentStatus {
  PENDING = 'pending',
  CONFIRMING = 'confirming',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export interface PaymentReceipt {
  transactionId: string;
  orderId: string;
  amount: string;
  token: PaymentToken;
  sender: string;
  recipient: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  gasFee: string;
  timestamp: Date;
  confirmations: number;
  status: PaymentStatus;
}

export interface PaymentError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
}

export interface ChainConfig {
  chainId: number;
  name: string;
  nativeCurrency: PaymentToken;
  rpcUrls: string[];
  blockExplorerUrls: string[];
  supportedTokens: PaymentToken[];
}