export interface PurchaseTransaction {
  id: string;
  userId: string;
  amount: number;
  paymentMethod: 'fiat' | 'crypto';
  paymentToken: string;
  pricePerToken: number;
  discountApplied: number;
  status: 'pending' | 'completed' | 'failed';
  txHash?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface EarningActivity {
  id: string;
  userId: string;
  activityType: 'post' | 'comment' | 'referral' | 'marketplace';
  tokensEarned: number;
  multiplier: number;
  isPremiumBonus: boolean;
  createdAt: Date;
}

export interface StakingPosition {
  id: string;
  userId: string;
  amount: number;
  lockPeriod: number; // in days
  aprRate: number;
  startDate: Date;
  endDate: Date;
  isAutoCompound: boolean;
  status: 'active' | 'completed' | 'withdrawn';
}

export interface PurchaseRequest {
  amount: number;
  paymentMethod: 'fiat' | 'crypto';
  paymentToken?: string;
  userAddress: string;
}

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  txHash?: string;
  error?: string;
  estimatedTokens?: number;
  finalPrice?: number;
}

export interface EarnRequest {
  userId: string;
  activityType: 'post' | 'comment' | 'referral' | 'marketplace';
  activityId: string;
  metadata?: Record<string, any>;
}

export interface EarnResult {
  success: boolean;
  tokensEarned: number;
  multiplier: number;
  error?: string;
}

export interface PriceQuote {
  pricePerToken: number;
  totalPrice: number;
  discount: number;
  discountPercentage: number;
  estimatedGas?: number;
  validUntil: Date;
}

export interface PaymentMethod {
  type: 'fiat' | 'crypto';
  token?: string;
  network?: string;
  available: boolean;
  fees?: number;
}

export interface SwapResult {
  success: boolean;
  txHash?: string;
  amountOut?: number;
  error?: string;
}

export interface BridgeResult {
  success: boolean;
  txHash?: string;
  bridgeId?: string;
  error?: string;
}

export interface LDAOAcquisitionConfig {
  treasuryContract: string;
  supportedTokens: string[];
  supportedNetworks: string[];
  fiatPaymentEnabled: boolean;
  dexIntegrationEnabled: boolean;
  earnToOwnEnabled: boolean;
  stakingEnabled: boolean;
  bridgeEnabled: boolean;
}

export interface ExternalIntegration {
  name: string;
  type: 'payment' | 'dex' | 'bridge';
  enabled: boolean;
  config: Record<string, any>;
}