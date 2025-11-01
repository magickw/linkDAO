// Marketplace models
export interface CreateListingInput {
  sellerWalletAddress: string;
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
  bidderWalletAddress: string;
  amount: string; // Stored as string to handle big numbers
}

export interface MakeOfferInput {
  buyerWalletAddress: string;
  amount: string; // Stored as string to handle big numbers
}

export interface MarketplaceListing {
  id: string;
  sellerWalletAddress: string;
  tokenAddress: string;
  price: string;
  quantity: number;
  itemType: 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE';
  listingType: 'FIXED_PRICE' | 'AUCTION';
  status: 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED';
  startTime: string;
  endTime?: string;
  highestBid?: string;
  highestBidderWalletAddress?: string;
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
  bidderWalletAddress: string;
  amount: string;
  timestamp: string;
}

export interface MarketplaceOffer {
  id: string;
  listingId: string;
  buyerWalletAddress: string;
  amount: string;
  createdAt: string;
  accepted: boolean;
}

export interface MarketplaceEscrow {
  id: string;
  listingId: string;
  buyerWalletAddress: string;
  sellerWalletAddress: string;
  amount: string;
  buyerApproved: boolean;
  sellerApproved: boolean;
  disputeOpened: boolean;
  resolverWalletAddress?: string;
  createdAt: string;
  resolvedAt?: string;
  // Delivery tracking
  deliveryInfo?: string;
  deliveryConfirmed: boolean;
}

export interface MarketplaceOrder {
  id: string;
  listingId: string;
  buyerWalletAddress: string;
  sellerWalletAddress: string;
  escrowId?: string;
  amount: string;
  paymentToken: string;
  status: 'PENDING' | 'COMPLETED' | 'DISPUTED' | 'REFUNDED';
  createdAt: string;
  // Shipping information for physical items
  shippingAddress?: {
    name: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
}

export interface MarketplaceDispute {
  id: string;
  escrowId: string;
  reporterWalletAddress: string;
  reason: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'ESCALATED';
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
  // Evidence tracking
  evidence?: string[]; // Array of evidence items (could be IPFS hashes)
}

export interface UserReputation {
  walletAddress: string;
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
