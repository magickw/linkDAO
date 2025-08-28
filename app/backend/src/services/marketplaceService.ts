import { 
  CreateListingInput, 
  UpdateListingInput, 
  PlaceBidInput, 
  MarketplaceListing, 
  MarketplaceBid, 
  MarketplaceEscrow,
  UserReputation
} from '../models/Marketplace';
import { DatabaseService } from './databaseService';
import { UserProfileService } from './userProfileService';

const databaseService = new DatabaseService();
const userProfileService = new UserProfileService();

export class MarketplaceService {
  // Listings
  async createListing(input: CreateListingInput): Promise<MarketplaceListing> {
    // Ensure seller exists
    let sellerUser = await userProfileService.getProfileByAddress(input.sellerAddress);
    if (!sellerUser) {
      sellerUser = await userProfileService.createProfile({
        address: input.sellerAddress,
        handle: '',
        ens: '',
        avatarCid: '',
        bioCid: ''
      });
    }
    
    // Create listing in database
    const dbListing = await databaseService.createListing(
      sellerUser.id,
      input.tokenAddress,
      input.price,
      input.quantity,
      input.itemType,
      input.listingType,
      input.metadataURI
    );
    
    const now = new Date().toISOString();
    const listing: MarketplaceListing = {
      id: dbListing.id.toString(),
      sellerAddress: input.sellerAddress,
      tokenAddress: dbListing.tokenAddress,
      price: dbListing.price,
      quantity: dbListing.quantity,
      itemType: dbListing.itemType as 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE',
      listingType: dbListing.listingType as 'FIXED_PRICE' | 'AUCTION',
      status: (dbListing.status?.toUpperCase() as 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED') || 'ACTIVE',
      startTime: dbListing.startTime?.toISOString() || now,
      endTime: dbListing.endTime?.toISOString(),
      metadataURI: dbListing.metadataURI,
      isEscrowed: dbListing.isEscrowed || false,
      createdAt: dbListing.createdAt?.toISOString() || now,
      updatedAt: dbListing.updatedAt?.toISOString() || now
    };

    return listing;
  }

  async getListingById(id: string): Promise<MarketplaceListing | null> {
    const dbListing = await databaseService.getListingById(parseInt(id));
    if (!dbListing) return null;
    
    // Get seller address
    const seller = await userProfileService.getProfileById(dbListing.sellerId || '');
    if (!seller) return null;
    
    const now = new Date().toISOString();
    const listing: MarketplaceListing = {
      id: dbListing.id.toString(),
      sellerAddress: seller.address,
      tokenAddress: dbListing.tokenAddress,
      price: dbListing.price,
      quantity: dbListing.quantity,
      itemType: dbListing.itemType as 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE',
      listingType: dbListing.listingType as 'FIXED_PRICE' | 'AUCTION',
      status: (dbListing.status?.toUpperCase() as 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED') || 'ACTIVE',
      startTime: dbListing.startTime?.toISOString() || now,
      endTime: dbListing.endTime?.toISOString(),
      metadataURI: dbListing.metadataURI,
      isEscrowed: dbListing.isEscrowed || false,
      createdAt: dbListing.createdAt?.toISOString() || now,
      updatedAt: dbListing.updatedAt?.toISOString() || now
    };
    
    return listing;
  }

  async getListingsBySeller(sellerAddress: string): Promise<MarketplaceListing[]> {
    const sellerUser = await userProfileService.getProfileByAddress(sellerAddress);
    if (!sellerUser) return [];
    
    const dbListings = await databaseService.getListingsBySeller(sellerUser.id);
    
    const now = new Date().toISOString();
    const listings: MarketplaceListing[] = [];
    for (const dbListing of dbListings) {
      const listing: MarketplaceListing = {
        id: dbListing.id.toString(),
        sellerAddress: sellerAddress,
        tokenAddress: dbListing.tokenAddress,
        price: dbListing.price,
        quantity: dbListing.quantity,
        itemType: dbListing.itemType as 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE',
        listingType: dbListing.listingType as 'FIXED_PRICE' | 'AUCTION',
        status: (dbListing.status?.toUpperCase() as 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED') || 'ACTIVE',
        startTime: dbListing.startTime?.toISOString() || now,
        endTime: dbListing.endTime?.toISOString(),
        metadataURI: dbListing.metadataURI,
        isEscrowed: dbListing.isEscrowed || false,
        createdAt: dbListing.createdAt?.toISOString() || now,
        updatedAt: dbListing.updatedAt?.toISOString() || now
      };
      listings.push(listing);
    }
    
    return listings;
  }

  async getAllListings(): Promise<MarketplaceListing[]> {
    const dbListings = await databaseService.getAllListings();
    
    const now = new Date().toISOString();
    const listings: MarketplaceListing[] = [];
    for (const dbListing of dbListings) {
      // Get seller address
      const seller = await userProfileService.getProfileById(dbListing.sellerId || '');
      if (!seller) continue;
      
      const listing: MarketplaceListing = {
        id: dbListing.id.toString(),
        sellerAddress: seller.address,
        tokenAddress: dbListing.tokenAddress,
        price: dbListing.price,
        quantity: dbListing.quantity,
        itemType: dbListing.itemType as 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE',
        listingType: dbListing.listingType as 'FIXED_PRICE' | 'AUCTION',
        status: (dbListing.status?.toUpperCase() as 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED') || 'ACTIVE',
        startTime: dbListing.startTime?.toISOString() || now,
        endTime: dbListing.endTime?.toISOString(),
        metadataURI: dbListing.metadataURI,
        isEscrowed: dbListing.isEscrowed || false,
        createdAt: dbListing.createdAt?.toISOString() || now,
        updatedAt: dbListing.updatedAt?.toISOString() || now
      };
      listings.push(listing);
    }
    
    return listings;
  }

  async getActiveListings(): Promise<MarketplaceListing[]> {
    const dbListings = await databaseService.getActiveListings();
    
    const now = new Date().toISOString();
    const listings: MarketplaceListing[] = [];
    for (const dbListing of dbListings) {
      // Get seller address
      const seller = await userProfileService.getProfileById(dbListing.sellerId || '');
      if (!seller) continue;
      
      const listing: MarketplaceListing = {
        id: dbListing.id.toString(),
        sellerAddress: seller.address,
        tokenAddress: dbListing.tokenAddress,
        price: dbListing.price,
        quantity: dbListing.quantity,
        itemType: dbListing.itemType as 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE',
        listingType: dbListing.listingType as 'FIXED_PRICE' | 'AUCTION',
        status: (dbListing.status?.toUpperCase() as 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED') || 'ACTIVE',
        startTime: dbListing.startTime?.toISOString() || now,
        endTime: dbListing.endTime?.toISOString(),
        metadataURI: dbListing.metadataURI,
        isEscrowed: dbListing.isEscrowed || false,
        createdAt: dbListing.createdAt?.toISOString() || now,
        updatedAt: dbListing.updatedAt?.toISOString() || now
      };
      listings.push(listing);
    }
    
    return listings;
  }

  async updateListing(id: string, input: UpdateListingInput): Promise<MarketplaceListing | null> {
    const updates: any = {};
    if (input.price !== undefined) updates.price = input.price;
    if (input.quantity !== undefined) updates.quantity = input.quantity;
    
    const dbListing = await databaseService.updateListing(parseInt(id), updates);
    if (!dbListing) return null;
    
    // Get seller address
    const seller = await userProfileService.getProfileById(dbListing.sellerId || '');
    if (!seller) return null;
    
    const now = new Date().toISOString();
    const listing: MarketplaceListing = {
      id: dbListing.id.toString(),
      sellerAddress: seller.address,
      tokenAddress: dbListing.tokenAddress,
      price: dbListing.price,
      quantity: dbListing.quantity,
      itemType: dbListing.itemType as 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE',
      listingType: dbListing.listingType as 'FIXED_PRICE' | 'AUCTION',
      status: (dbListing.status?.toUpperCase() as 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED') || 'ACTIVE',
      startTime: dbListing.startTime?.toISOString() || now,
      endTime: dbListing.endTime?.toISOString(),
      metadataURI: dbListing.metadataURI,
      isEscrowed: dbListing.isEscrowed || false,
      createdAt: dbListing.createdAt?.toISOString() || now,
      updatedAt: dbListing.updatedAt?.toISOString() || now
    };
    
    return listing;
  }

  async cancelListing(id: string): Promise<boolean> {
    const dbListing = await databaseService.cancelListing(parseInt(id));
    return dbListing !== null;
  }

  // Bids
  async placeBid(listingId: string, input: PlaceBidInput): Promise<MarketplaceBid | null> {
    // Ensure bidder exists
    let bidderUser = await userProfileService.getProfileByAddress(input.bidderAddress);
    if (!bidderUser) {
      bidderUser = await userProfileService.createProfile({
        address: input.bidderAddress,
        handle: '',
        ens: '',
        avatarCid: '',
        bioCid: ''
      });
    }
    
    const dbBid = await databaseService.placeBid(
      parseInt(listingId),
      bidderUser.id,
      input.amount
    );
    
    if (!dbBid) return null;
    
    const bid: MarketplaceBid = {
      id: dbBid.id.toString(),
      listingId: listingId,
      bidderAddress: input.bidderAddress,
      amount: dbBid.amount,
      timestamp: dbBid.timestamp?.toISOString() || new Date().toISOString()
    };
    
    return bid;
  }

  async getBidsByListing(listingId: string): Promise<MarketplaceBid[]> {
    const dbBids = await databaseService.getBidsByListing(parseInt(listingId));
    
    const bids: MarketplaceBid[] = [];
    for (const dbBid of dbBids) {
      // Get bidder address
      const bidder = await userProfileService.getProfileById(dbBid.bidderId || '');
      if (!bidder) continue;
      
      const bid: MarketplaceBid = {
        id: dbBid.id.toString(),
        listingId: listingId,
        bidderAddress: bidder.address,
        amount: dbBid.amount,
        timestamp: dbBid.timestamp?.toISOString() || new Date().toISOString()
      };
      bids.push(bid);
    }
    
    return bids;
  }

  async getBidsByBidder(bidderAddress: string): Promise<MarketplaceBid[]> {
    const bidderUser = await userProfileService.getProfileByAddress(bidderAddress);
    if (!bidderUser) return [];
    
    const dbBids = await databaseService.getBidsByBidder(bidderUser.id);
    
    const bids: MarketplaceBid[] = [];
    for (const dbBid of dbBids) {
      const bid: MarketplaceBid = {
        id: dbBid.id.toString(),
        listingId: dbBid.listingId?.toString() || '',
        bidderAddress: bidderAddress,
        amount: dbBid.amount,
        timestamp: dbBid.timestamp?.toISOString() || new Date().toISOString()
      };
      bids.push(bid);
    }
    
    return bids;
  }

  // Escrow
  async createEscrow(listingId: string, buyerAddress: string): Promise<MarketplaceEscrow | null> {
    // Get listing
    const listing = await this.getListingById(listingId);
    if (!listing) return null;
    
    // Ensure buyer exists
    let buyerUser = await userProfileService.getProfileByAddress(buyerAddress);
    if (!buyerUser) {
      buyerUser = await userProfileService.createProfile({
        address: buyerAddress,
        handle: '',
        ens: '',
        avatarCid: '',
        bioCid: ''
      });
    }
    
    // Get seller user
    const sellerUser = await userProfileService.getProfileByAddress(listing.sellerAddress);
    if (!sellerUser) return null;
    
    const dbEscrow = await databaseService.createEscrow(
      parseInt(listingId),
      buyerUser.id,
      sellerUser.id,
      listing.price
    );
    
    if (!dbEscrow) return null;
    
    const escrow: MarketplaceEscrow = {
      id: dbEscrow.id.toString(),
      listingId: listingId,
      buyerAddress: buyerAddress,
      sellerAddress: listing.sellerAddress,
      amount: dbEscrow.amount,
      buyerApproved: dbEscrow.buyerApproved || false,
      sellerApproved: dbEscrow.sellerApproved || false,
      disputeOpened: dbEscrow.disputeOpened || false,
      resolverAddress: dbEscrow.resolverAddress || undefined,
      createdAt: dbEscrow.createdAt?.toISOString() || new Date().toISOString(),
      resolvedAt: dbEscrow.resolvedAt?.toISOString()
    };
    
    return escrow;
  }

  async approveEscrow(escrowId: string, userAddress: string): Promise<boolean> {
    // Get user
    const user = await userProfileService.getProfileByAddress(userAddress);
    if (!user) return false;
    
    // Get escrow
    const dbEscrow = await databaseService.getEscrowById(parseInt(escrowId));
    if (!dbEscrow) return false;
    
    // Determine which approval to update
    const updates: any = {};
    if (dbEscrow.buyerId === user.id) {
      updates.buyerApproved = true;
    } else if (dbEscrow.sellerId === user.id) {
      updates.sellerApproved = true;
    } else {
      return false; // User is not part of this escrow
    }
    
    const updatedEscrow = await databaseService.updateEscrow(parseInt(escrowId), updates);
    return updatedEscrow !== null;
  }

  async openDispute(escrowId: string, userAddress: string): Promise<boolean> {
    // Get user
    const user = await userProfileService.getProfileByAddress(userAddress);
    if (!user) return false;
    
    // Get escrow
    const dbEscrow = await databaseService.getEscrowById(parseInt(escrowId));
    if (!dbEscrow) return false;
    
    // Check if user is part of this escrow
    if (dbEscrow.buyerId !== user.id && dbEscrow.sellerId !== user.id) {
      return false;
    }
    
    const updatedEscrow = await databaseService.updateEscrow(parseInt(escrowId), {
      disputeOpened: true
    });
    
    return updatedEscrow !== null;
  }

  async getEscrowById(id: string): Promise<MarketplaceEscrow | null> {
    const dbEscrow = await databaseService.getEscrowById(parseInt(id));
    if (!dbEscrow) return null;
    
    // Get buyer and seller addresses
    const buyer = await userProfileService.getProfileById(dbEscrow.buyerId || '');
    const seller = await userProfileService.getProfileById(dbEscrow.sellerId || '');
    if (!buyer || !seller) return null;
    
    const escrow: MarketplaceEscrow = {
      id: dbEscrow.id.toString(),
      listingId: dbEscrow.listingId?.toString() || '',
      buyerAddress: buyer.address,
      sellerAddress: seller.address,
      amount: dbEscrow.amount,
      buyerApproved: dbEscrow.buyerApproved || false,
      sellerApproved: dbEscrow.sellerApproved || false,
      disputeOpened: dbEscrow.disputeOpened || false,
      resolverAddress: dbEscrow.resolverAddress || undefined,
      createdAt: dbEscrow.createdAt?.toISOString() || new Date().toISOString(),
      resolvedAt: dbEscrow.resolvedAt?.toISOString()
    };
    
    return escrow;
  }

  async getEscrowsByUser(userAddress: string): Promise<MarketplaceEscrow[]> {
    const user = await userProfileService.getProfileByAddress(userAddress);
    if (!user) return [];
    
    const dbEscrows = await databaseService.getEscrowsByUser(user.id);
    
    const escrows: MarketplaceEscrow[] = [];
    for (const dbEscrow of dbEscrows) {
      // Get buyer and seller addresses
      const buyer = await userProfileService.getProfileById(dbEscrow.buyerId || '');
      const seller = await userProfileService.getProfileById(dbEscrow.sellerId || '');
      if (!buyer || !seller) continue;
      
      const escrow: MarketplaceEscrow = {
        id: dbEscrow.id.toString(),
        listingId: dbEscrow.listingId?.toString() || '',
        buyerAddress: buyer.address,
        sellerAddress: seller.address,
        amount: dbEscrow.amount,
        buyerApproved: dbEscrow.buyerApproved || false,
        sellerApproved: dbEscrow.sellerApproved || false,
        disputeOpened: dbEscrow.disputeOpened || false,
        resolverAddress: dbEscrow.resolverAddress || undefined,
        createdAt: dbEscrow.createdAt?.toISOString() || new Date().toISOString(),
        resolvedAt: dbEscrow.resolvedAt?.toISOString()
      };
      escrows.push(escrow);
    }
    
    return escrows;
  }

  // Reputation
  async getUserReputation(address: string): Promise<UserReputation | null> {
    const dbReputation = await databaseService.getUserReputation(address);
    if (!dbReputation) return null;
    
    const reputation: UserReputation = {
      address: dbReputation.address,
      score: dbReputation.score,
      daoApproved: dbReputation.daoApproved || false
    };
    
    return reputation;
  }

  async updateUserReputation(address: string, score: number, daoApproved: boolean): Promise<UserReputation> {
    // Check if reputation exists
    let dbReputation = await databaseService.getUserReputation(address);
    
    if (!dbReputation) {
      // Create new reputation
      dbReputation = await databaseService.createUserReputation(address, score, daoApproved);
    } else {
      // Update existing reputation
      dbReputation = await databaseService.updateUserReputation(address, {
        score,
        daoApproved
      });
    }
    
    const reputation: UserReputation = {
      address: dbReputation.address,
      score: dbReputation.score,
      daoApproved: dbReputation.daoApproved || false
    };
    
    return reputation;
  }

  async getDAOApprovedVendors(): Promise<UserReputation[]> {
    const dbReputations = await databaseService.getDAOApprovedVendors();
    
    const reputations: UserReputation[] = dbReputations.map(dbReputation => ({
      address: dbReputation.address,
      score: dbReputation.score,
      daoApproved: dbReputation.daoApproved || false
    }));
    
    return reputations;
  }

  // Utility methods
  async getListingCount(): Promise<number> {
    const listings = await databaseService.getAllListings();
    return listings.length;
  }

  async getActiveListingCount(): Promise<number> {
    const listings = await databaseService.getActiveListings();
    return listings.length;
  }

  async getUserListingCount(userAddress: string): Promise<number> {
    const listings = await this.getListingsBySeller(userAddress);
    return listings.length;
  }
}