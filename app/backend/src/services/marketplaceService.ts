import { 
  CreateListingInput, 
  UpdateListingInput, 
  PlaceBidInput, 
  MarketplaceListing, 
  MarketplaceBid, 
  MarketplaceEscrow,
  UserReputation
} from '../models/Marketplace';

// In a real implementation, this would interact with the blockchain
// For now, we'll use an in-memory store to simulate the functionality

// Simulated in-memory storage
let listings: MarketplaceListing[] = [];
let bids: MarketplaceBid[] = [];
let escrows: MarketplaceEscrow[] = [];
let reputations: UserReputation[] = [];
let nextListingId = 1;
let nextBidId = 1;
let nextEscrowId = 1;

export class MarketplaceService {
  // Listings
  async createListing(input: CreateListingInput): Promise<MarketplaceListing> {
    const now = new Date().toISOString();
    const listing: MarketplaceListing = {
      id: nextListingId.toString(),
      sellerAddress: input.sellerAddress,
      tokenAddress: input.tokenAddress,
      price: input.price,
      quantity: input.quantity,
      itemType: input.itemType,
      listingType: input.listingType,
      status: 'ACTIVE',
      startTime: now,
      endTime: input.listingType === 'AUCTION' && input.duration 
        ? new Date(Date.now() + input.duration * 1000).toISOString() 
        : undefined,
      metadataURI: input.metadataURI,
      isEscrowed: false,
      createdAt: now,
      updatedAt: now
    };

    listings.push(listing);
    nextListingId++;

    return listing;
  }

  async getListingById(id: string): Promise<MarketplaceListing | null> {
    const listing = listings.find(l => l.id === id);
    return listing || null;
  }

  async getListingsBySeller(sellerAddress: string): Promise<MarketplaceListing[]> {
    return listings.filter(l => l.sellerAddress === sellerAddress);
  }

  async getAllListings(): Promise<MarketplaceListing[]> {
    return [...listings];
  }

  async getActiveListings(): Promise<MarketplaceListing[]> {
    return listings.filter(l => l.status === 'ACTIVE');
  }

  async updateListing(id: string, input: UpdateListingInput): Promise<MarketplaceListing | null> {
    const listingIndex = listings.findIndex(l => l.id === id);
    if (listingIndex === -1) return null;

    const listing = listings[listingIndex];
    if (input.price !== undefined) listing.price = input.price;
    if (input.quantity !== undefined) listing.quantity = input.quantity;
    listing.updatedAt = new Date().toISOString();

    listings[listingIndex] = listing;
    return listing;
  }

  async cancelListing(id: string): Promise<boolean> {
    const listingIndex = listings.findIndex(l => l.id === id);
    if (listingIndex === -1) return false;

    listings[listingIndex].status = 'CANCELLED';
    listings[listingIndex].updatedAt = new Date().toISOString();
    return true;
  }

  // Bids
  async placeBid(listingId: string, input: PlaceBidInput): Promise<MarketplaceBid | null> {
    const listing = await this.getListingById(listingId);
    if (!listing || listing.status !== 'ACTIVE') return null;

    const now = new Date().toISOString();
    const bid: MarketplaceBid = {
      id: nextBidId.toString(),
      listingId,
      bidderAddress: input.bidderAddress,
      amount: input.amount,
      timestamp: now
    };

    bids.push(bid);
    nextBidId++;

    // Update listing with highest bid
    if (listing.listingType === 'AUCTION') {
      if (!listing.highestBid || BigInt(input.amount) > BigInt(listing.highestBid)) {
        listing.highestBid = input.amount;
        listing.highestBidder = input.bidderAddress;
        listing.updatedAt = now;
      }
    }

    return bid;
  }

  async getBidsByListing(listingId: string): Promise<MarketplaceBid[]> {
    return bids.filter(b => b.listingId === listingId);
  }

  async getBidsByBidder(bidderAddress: string): Promise<MarketplaceBid[]> {
    return bids.filter(b => b.bidderAddress === bidderAddress);
  }

  // Escrow
  async createEscrow(listingId: string, buyerAddress: string): Promise<MarketplaceEscrow | null> {
    const listing = await this.getListingById(listingId);
    if (!listing || listing.status !== 'ACTIVE') return null;

    const now = new Date().toISOString();
    const amount = listing.listingType === 'AUCTION' 
      ? listing.highestBid || listing.price 
      : listing.price;

    const escrow: MarketplaceEscrow = {
      id: nextEscrowId.toString(),
      listingId,
      buyerAddress,
      sellerAddress: listing.sellerAddress,
      amount: amount || '0',
      buyerApproved: false,
      sellerApproved: false,
      disputeOpened: false,
      createdAt: now
    };

    escrows.push(escrow);
    nextEscrowId++;

    // Mark listing as escrowed
    listing.isEscrowed = true;
    listing.updatedAt = now;

    return escrow;
  }

  async approveEscrow(escrowId: string, userAddress: string): Promise<boolean> {
    const escrowIndex = escrows.findIndex(e => e.id === escrowId);
    if (escrowIndex === -1) return false;

    const escrow = escrows[escrowIndex];
    if (escrow.buyerAddress === userAddress) {
      escrow.buyerApproved = true;
    } else if (escrow.sellerAddress === userAddress) {
      escrow.sellerApproved = true;
    } else {
      return false;
    }

    escrow.resolvedAt = new Date().toISOString();
    return true;
  }

  async openDispute(escrowId: string, userAddress: string): Promise<boolean> {
    const escrowIndex = escrows.findIndex(e => e.id === escrowId);
    if (escrowIndex === -1) return false;

    const escrow = escrows[escrowIndex];
    if (escrow.buyerAddress !== userAddress && escrow.sellerAddress !== userAddress) {
      return false;
    }

    escrow.disputeOpened = true;
    escrow.resolverAddress = '0xDAO'; // Simulated DAO address
    return true;
  }

  async getEscrowById(id: string): Promise<MarketplaceEscrow | null> {
    const escrow = escrows.find(e => e.id === id);
    return escrow || null;
  }

  async getEscrowsByUser(userAddress: string): Promise<MarketplaceEscrow[]> {
    return escrows.filter(e => e.buyerAddress === userAddress || e.sellerAddress === userAddress);
  }

  // Reputation
  async getUserReputation(address: string): Promise<UserReputation | null> {
    const reputation = reputations.find(r => r.address === address);
    return reputation || null;
  }

  async updateUserReputation(address: string, score: number, daoApproved: boolean): Promise<UserReputation> {
    const existingIndex = reputations.findIndex(r => r.address === address);
    
    if (existingIndex !== -1) {
      reputations[existingIndex].score = score;
      reputations[existingIndex].daoApproved = daoApproved;
      return reputations[existingIndex];
    } else {
      const reputation: UserReputation = {
        address,
        score,
        daoApproved
      };
      reputations.push(reputation);
      return reputation;
    }
  }

  async getDAOApprovedVendors(): Promise<UserReputation[]> {
    return reputations.filter(r => r.daoApproved);
  }

  // Utility methods
  async getListingCount(): Promise<number> {
    return listings.length;
  }

  async getActiveListingCount(): Promise<number> {
    return listings.filter(l => l.status === 'ACTIVE').length;
  }

  async getUserListingCount(userAddress: string): Promise<number> {
    return listings.filter(l => l.sellerAddress === userAddress).length;
  }
}