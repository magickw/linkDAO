/**
 * On-chain verification and proof data structures
 */

export type ProofType = 'governance_vote' | 'token_transfer' | 'nft_mint' | 'staking_action' | 'custom' | 'contract_interaction';
export type VerificationStatus = 'pending' | 'verified' | 'failed' | 'expired';

export interface OnChainProof {
  id: string;
  transactionHash: string;
  blockNumber: number;
  contractAddress: string;
  verified: boolean;
  proofType: ProofType;
  
  // Verification details
  status: VerificationStatus;
  verifiedAt?: Date;
  verificationSource: string;
  confirmations: number;
  requiredConfirmations: number;
  
  // Transaction details
  gasUsed?: number;
  gasFee?: number;
  timestamp: Date;
  fromAddress: string;
  toAddress?: string;
  value?: number;
  
  // Metadata
  description?: string;
  explorerUrl?: string;
  methodName?: string;
  inputData?: string;
  outputData?: string;
  
  // Related content
  relatedPostId?: string;
  relatedProposalId?: string;
  relatedCommunityId?: string;
}

export interface VerificationBadge {
  type: ProofType;
  label: string;
  color: string;
  icon: string;
  tooltip: string;
  clickable: boolean;
  explorerUrl?: string;
}

export interface BlockchainExplorerConfig {
  name: string;
  baseUrl: string;
  transactionPath: string;
  addressPath: string;
  blockPath: string;
  contractPath: string;
  supported: boolean;
}

export interface VerificationRequest {
  transactionHash: string;
  expectedProofType: ProofType;
  relatedContentId?: string;
  description?: string;
}

export interface VerificationResponse {
  success: boolean;
  proof?: OnChainProof;
  error?: string;
  retryAfter?: number;
}

export interface OnChainAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  
  // Verification
  proofRequired: ProofType[];
  verificationCriteria: VerificationCriteria;
  verified: boolean;
  verifiedAt?: Date;
  
  // Display
  displayOrder: number;
  showInProfile: boolean;
  nftContract?: string;
  nftTokenId?: string;
}

export interface VerificationCriteria {
  minimumTransactions?: number;
  minimumValue?: number;
  specificContracts?: string[];
  timeframe?: {
    start?: Date;
    end?: Date;
    duration?: number;
  };
  additionalRequirements?: string[];
}

export interface NFTCollection {
  contractAddress: string;
  name: string;
  symbol: string;
  description?: string;
  imageUrl?: string;
  externalUrl?: string;
  verified: boolean;
  floorPrice?: number;
  totalSupply?: number;
}

export interface UserNFT {
  contractAddress: string;
  tokenId: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  attributes?: NFTAttribute[];
  collection: NFTCollection;
  verified: boolean;
  lastVerified: Date;
}

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
  rarity?: number;
}

export interface OnChainProfile {
  address: string;
  ensName?: string;
  avatar?: string;
  
  // Achievements
  achievements: OnChainAchievement[];
  nftCollections: UserNFT[];
  
  // Activity summary
  totalTransactions: number;
  totalValue: number;
  firstTransaction: Date;
  lastTransaction: Date;
  
  // Reputation
  onChainReputation: number;
  verificationLevel: 'unverified' | 'basic' | 'advanced' | 'expert';
  trustScore: number;
}