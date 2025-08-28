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
}

export interface UpdateListingInput {
  price?: string; // Stored as string to handle big numbers
  quantity?: number;
}

export interface PlaceBidInput {
  bidderAddress: string;
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
}

export interface UserReputation {
  address: string;
  score: number;
  daoApproved: boolean;
}