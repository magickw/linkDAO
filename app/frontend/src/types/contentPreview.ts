// Content Preview System Types
export interface ContentPreview {
  id: string;
  type: 'nft' | 'link' | 'proposal' | 'token';
  url: string;
  data: NFTPreview | LinkPreview | ProposalPreview | TokenPreview;
  thumbnail?: string;
  metadata: Record<string, any>;
  cached: boolean;
  cacheExpiry?: Date;
  securityStatus: 'safe' | 'warning' | 'blocked';
}

export interface NFTPreview {
  contractAddress: string;
  tokenId: string;
  name: string;
  description: string;
  image: string;
  collection: string;
  owner: string;
  price?: TokenAmount;
  rarity?: number;
  traits?: NFTTrait[];
  floorPrice?: TokenAmount;
  lastSale?: TokenAmount;
  network: string;
}

export interface NFTTrait {
  trait_type: string;
  value: string | number;
  rarity?: number;
}

export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image: string;
  siteName: string;
  type: 'article' | 'video' | 'product' | 'website';
  favicon?: string;
  publishedTime?: string;
  author?: string;
  metadata: Record<string, any>;
  securityScore: number;
}

export interface ProposalPreview {
  id: string;
  title: string;
  description: string;
  status: ProposalStatus;
  votingEnds: Date;
  votingStarts: Date;
  yesVotes: number;
  noVotes: number;
  abstainVotes: number;
  quorum: number;
  proposer: string;
  proposerReputation?: number;
  category: string;
  executionDelay?: number;
  requiredMajority: number;
}

export interface TokenPreview {
  symbol: string;
  name: string;
  amount: number;
  usdValue: number;
  change24h: number;
  change7d?: number;
  logo: string;
  contractAddress: string;
  network: string;
  decimals: number;
  marketCap?: number;
  volume24h?: number;
  holders?: number;
  verified: boolean;
}

export interface TokenAmount {
  amount: string;
  symbol: string;
  usdValue?: number;
  network: string;
}

export enum ProposalStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  SUCCEEDED = 'succeeded',
  DEFEATED = 'defeated',
  QUEUED = 'queued',
  EXECUTED = 'executed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export interface PreviewCache {
  url: string;
  preview: ContentPreview;
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessed: Date;
}

export interface PreviewGenerationOptions {
  enableSandbox: boolean;
  timeout: number;
  maxFileSize: number;
  allowedDomains?: string[];
  blockedDomains?: string[];
  cacheEnabled: boolean;
  cacheTTL: number;
}

export interface SecurityScanResult {
  status: 'safe' | 'warning' | 'blocked';
  score: number;
  threats: string[];
  recommendations: string[];
  scannedAt: Date;
}