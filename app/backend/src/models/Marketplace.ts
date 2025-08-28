// Marketplace models
export interface CreateListingInput {
  sellerAddress: string;
  tokenAddress: string;
  price: string; // Stored as string to handle big numbers
  quantity: number;
  itemType: 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE';
  listingType: 'FIXED_PRICE' | 'AUCTION';
  duration?: number; // For auctions
  metadataURI: string;
  // NFT specific fields
  nftStandard?: 'ERC721' | 'ERC1155'; // Only for NFT items
  tokenId?: string; // Only for NFT items
  // Auction specific fields
  reservePrice?: string; // For auctions
  minIncrement?: string; // For auctions
}

export interface UpdateListingInput {
  price?: string; // Stored as string to handle big numbers
  quantity?: number;
}

export interface PlaceBidInput {
  bidderAddress: string;
  amount: string; // Stored as string to handle big numbers
}

export interface MakeOfferInput {
  buyerAddress: string;
  amount: string; // Stored as string to handle big numbers
}

export interface MarketplaceListing {
  id: string;
  sellerAddress: string;
  tokenAddress: string;
  price: string;
  quantity: number;
  itemType: 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE';
  listingType: 'FIXED_PRICE' | 'AUCTION';
  status: 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED';
  startTime: string;
  endTime?: string;
  highestBid?: string;
  highestBidder?: string;
  metadataURI: string;
  isEscrowed: boolean;
  // NFT specific fields
  nftStandard?: 'ERC721' | 'ERC1155'; // Only for NFT items
  tokenId?: string; // Only for NFT items
  // Auction specific fields
  reservePrice?: string; // For auctions
  minIncrement?: string; // For auctions
  reserveMet?: boolean; // For auctions
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceBid {
  id: string;
  listingId: string;
  bidderAddress: string;
  amount: string;
  timestamp: string;
}

export interface MarketplaceOffer {
  id: string;
  listingId: string;
  buyerAddress: string;
  amount: string;
  createdAt: string;
  accepted: boolean;
}

export interface MarketplaceEscrow {
  id: string;
  listingId: string;
  buyerAddress: string;
  sellerAddress: string;
  amount: string;
  buyerApproved: boolean;
  sellerApproved: boolean;
  disputeOpened: boolean;
  resolverAddress?: string;
  createdAt: string;
  resolvedAt?: string;
  // Delivery tracking
  deliveryInfo?: string;
  deliveryConfirmed: boolean;
}

export interface MarketplaceOrder {
  id: string;
  listingId: string;
  buyerAddress: string;
  sellerAddress: string;
  escrowId?: string;
  amount: string;
  paymentToken: string;
  status: 'PENDING' | 'COMPLETED' | 'DISPUTED' | 'REFUNDED';
  createdAt: string;
}

export interface MarketplaceDispute {
  id: string;
  escrowId: string;
  reporterAddress: string;
  reason: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'ESCALATED';
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
  // Evidence tracking
  evidence?: string[]; // Array of evidence items (could be IPFS hashes)
}

export interface UserReputation {
  address: string;
  score: number;
  daoApproved: boolean;
}

export interface AIModeration {
  id: string;
  objectType: string; // "listing", "dispute"
  objectId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED';
  aiAnalysis?: string; // JSON of AI analysis results
  createdAt: string;
  updatedAt: string;
}