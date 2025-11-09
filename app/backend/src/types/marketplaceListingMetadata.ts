// Specialized metadata interfaces for different marketplace listing types

export interface BaseListingMetadata {
  title: string;
  description: string;
  images: string[];
  tags: string[];
}

export interface PhysicalGoodsMetadata extends BaseListingMetadata {
  weight?: number; // Weight in kg
  dimensions?: {
    length: number; // in cm
    width: number; // in cm
    height: number; // in cm
  };
  shippingRequirements: string[];
  condition: 'new' | 'used' | 'refurbished';
  brand?: string;
  model?: string;
  serialNumber?: string;
  warranty?: {
    period: number; // in months
    provider: string;
  };
}

export interface DigitalGoodsMetadata extends BaseListingMetadata {
  fileType: string;
  fileSize?: number; // in bytes
  downloadLimit?: number;
  licenseType: 'perpetual' | 'subscription' | 'rental';
  accessMethod: 'direct_download' | 'ipfs' | 'streaming';
  drmProtected: boolean;
}

export interface NFTMetadata extends BaseListingMetadata {
  nftStandard: 'ERC721' | 'ERC1155';
  tokenId: string;
  contractAddress: string;
  blockchain: 'ethereum' | 'polygon' | 'arbitrum' | 'optimism';
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
  rarity?: {
    rank: number;
    total: number;
    score: number;
  };
}

export interface ServiceMetadata extends BaseListingMetadata {
  duration: number; // in hours
  deliveryMethod: 'online' | 'in-person' | 'hybrid';
  requirements?: string[];
  deliverables: string[];
  availability: {
    timezone: string;
    slots: Array<{
      start: string;
      end: string;
    }>;
  };
  expertiseLevel: 'beginner' | 'intermediate' | 'expert' | 'master';
  languages: string[];
  certifications?: Array<{
    name: string;
    issuer: string;
    date: string;
  }>;
}

export interface DeFiCollectibleMetadata extends BaseListingMetadata {
  protocol: string; // 'uniswap', 'compound', 'aave', 'curve', etc.
  assetType: 'LP_POSITION' | 'YIELD_TOKEN' | 'VAULT_SHARE' | 'GOVERNANCE_POSITION';
  poolAddress: string;
  underlyingTokens: Array<{
    address: string;
    symbol: string;
    weight: number;
    decimals: number;
  }>;
  currentApy: number; // Current annual percentage yield
  apyHistory?: Array<{
    date: string;
    apy: number;
  }>;
  lockPeriod?: number; // Lock period in days, if applicable
  maturityDate?: string; // For time-locked positions
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  impermanentLossRisk?: number; // Percentage risk for LP positions
  liquidityDepth?: {
    totalValue: string; // in USD
    tokenBreakdown: Array<{
      symbol: string;
      value: string;
    }>;
  };
  performanceMetrics?: {
  totalValueLocked: string; // in USD
  volume24h: string; // in USD
  fees24h?: string; // in USD
  };
  governanceRights?: {
    votingPower: number;
    proposalsParticipated: number;
  };
  insurance?: {
    provider: string;
    coverageAmount: string;
    terms: string;
  };
}

export interface MarketplaceListingWithMetadata {
  id: string;
  sellerWalletAddress: string;
  tokenAddress: string;
  price: string;
  quantity: number;
  itemType: 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE' | 'DEFI_COLLECTIBLE';
  listingType: 'FIXED_PRICE' | 'AUCTION';
  status: 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED';
  startTime: string;
  endTime?: string;
  highestBid?: string;
  highestBidderWalletAddress?: string;
  metadataURI: string;
  isEscrowed: boolean;
  metadata: PhysicalGoodsMetadata | DigitalGoodsMetadata | NFTMetadata | ServiceMetadata | DeFiCollectibleMetadata;
  createdAt: string;
  updatedAt: string;
}

// Type guards for metadata
export function isPhysicalGoodsMetadata(metadata: any): metadata is PhysicalGoodsMetadata {
  return metadata && typeof metadata.condition === 'string' && 
    ['new', 'used', 'refurbished'].includes(metadata.condition);
}

export function isDigitalGoodsMetadata(metadata: any): metadata is DigitalGoodsMetadata {
  return metadata && typeof metadata.fileType === 'string' && 
    typeof metadata.accessMethod === 'string';
}

export function isNFTMetadata(metadata: any): metadata is NFTMetadata {
  return metadata && typeof metadata.nftStandard === 'string' && 
    typeof metadata.tokenId === 'string' &&
    ['ERC721', 'ERC1155'].includes(metadata.nftStandard);
}

export function isServiceMetadata(metadata: any): metadata is ServiceMetadata {
  return metadata && typeof metadata.duration === 'number' && 
    typeof metadata.deliveryMethod === 'string';
}

export function isDeFiCollectibleMetadata(metadata: any): metadata is DeFiCollectibleMetadata {
  return metadata && typeof metadata.protocol === 'string' && 
    typeof metadata.assetType === 'string' &&
    ['LP_POSITION', 'YIELD_TOKEN', 'VAULT_SHARE', 'GOVERNANCE_POSITION'].includes(metadata.assetType);
}