export interface TokenBalance {
  symbol: string;
  name: string;
  balance: number;
  valueUSD: number;
  change24h: number;
  contractAddress: string;
  // New: chains this token balance is present on (e.g., [1, 8453])
  chains?: number[];
  // New: per-chain breakdown for display
  chainBreakdown?: Array<{
    chainId: number;
    balance: number;
    valueUSD: number;
    contractAddress?: string;
  }>;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  token: string;
  toToken?: string;
  valueUSD?: number;
  timestamp: Date;
  from?: string;
  to?: string;
  gasUsed?: number;
  gasPrice?: number;
  hash: string;
  contractName?: string;
  nftAction?: 'mint' | 'transfer' | 'sale';
  nftName?: string;
}

export enum TransactionType {
  SEND = 'send',
  RECEIVE = 'receive',
  SWAP = 'swap',
  CONTRACT = 'contract',
  NFT = 'nft',
  STAKE = 'stake',
  UNSTAKE = 'unstake',
  CLAIM = 'claim'
}

export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed'
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: () => Promise<void>;
  disabled?: boolean;
  tooltip?: string;
}

export interface EnhancedWalletData {
  address: string;
  balances: TokenBalance[];
  recentTransactions: Transaction[];
  portfolioValue: number;
  portfolioChange: number;
  quickActions: QuickAction[];
}

export interface PortfolioAnalytics {
  totalReturn: number;
  bestPerformer: {
    symbol: string;
    return: number;
  };
  worstPerformer: {
    symbol: string;
    return: number;
  };
  diversificationScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  performanceHistory: {
    date: Date;
    value: number;
  }[];
  assetAllocation: {
    symbol: string;
    percentage: number;
    value: number;
  }[];
}

export interface NFTHolding {
  contractAddress: string;
  tokenId: string;
  name: string;
  description: string;
  image: string;
  collection: string;
  floorPrice?: number;
  lastSalePrice?: number;
  rarity?: number;
}

export interface DeFiPosition {
  protocol: string;
  type: 'lending' | 'borrowing' | 'liquidity' | 'staking' | 'farming';
  asset: string;
  amount: number;
  valueUSD: number;
  apy: number;
  rewards?: {
    token: string;
    amount: number;
    valueUSD: number;
  }[];
}

export interface WalletConnection {
  isConnected: boolean;
  address?: string;
  chainId?: number;
  balance?: number;
  provider?: any;
}

export interface NetworkInfo {
  chainId: number;
  name: string;
  symbol: string;
  rpcUrl: string;
  blockExplorer: string;
  gasPrice: number;
  isTestnet: boolean;
}

export interface WalletInfo {
  isBaseWallet: boolean;
  chainId?: number;
  connector?: string;
}