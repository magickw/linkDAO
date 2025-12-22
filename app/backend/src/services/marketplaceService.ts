import {
  CreateListingInput,
  UpdateListingInput,
  PlaceBidInput,
  MakeOfferInput,
  MarketplaceListing,
  MarketplaceBid,
  MarketplaceOffer,
  MarketplaceEscrow,
  MarketplaceOrder,
  MarketplaceDispute,
  UserReputation,
  AIModeration
} from '../models/Marketplace';
import { databaseService } from './databaseService'; // Import the singleton instance
import { UserProfileService } from './userProfileService';
import { eq, sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db'; // Import database instance for health checks

// Use the singleton instance instead of creating a new one
// const databaseService = new DatabaseService();
const userProfileService = new UserProfileService();

export class BlockchainMarketplaceService {
  // Utility function to add timeout to promises
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number = 15000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Database operation timeout')), timeoutMs)
      )
    ]);
  }

  // Listings
  async createListing(input: CreateListingInput): Promise<MarketplaceListing> {
    try {
      // Ensure seller exists with timeout protection
      let sellerUser = await this.withTimeout(userProfileService.getProfileByAddress(input.sellerWalletAddress));
      if (!sellerUser) {
        sellerUser = await this.withTimeout(userProfileService.createProfile({
          walletAddress: input.sellerWalletAddress,
          handle: '',
          ens: '',
          avatarCid: '',
          bioCid: ''
        }));
      }

      // Create listing in database with timeout protection
      // Extract title and description from input or defaults
      const title = input.title || 'Untitled Listing';
      const description = input.description || '';
      const categoryId = input.categoryId || 'general';
      const images = input.images || [];
      const currency = input.priceCurrency || 'USDC';

      const dbListing = await this.withTimeout(databaseService.createListing(
        sellerUser.id,
        input.tokenAddress,
        input.price,
        input.quantity,
        input.itemType,
        input.listingType,
        input.metadataURI,
        input.nftStandard,
        input.tokenId,
        input.reservePrice,
        input.minIncrement,
        title,
        description,
        categoryId,
        images,
        currency
      ));

      const now = new Date().toISOString();
      const listing: MarketplaceListing = {
        id: dbListing.id,
        sellerWalletAddress: input.sellerWalletAddress,
        tokenAddress: dbListing.tokenAddress,
        price: dbListing.price,
        quantity: dbListing.quantity,
        itemType: dbListing.itemType as 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE',
        listingType: dbListing.listingType as 'FIXED_PRICE' | 'AUCTION',
        status: (dbListing.status?.toUpperCase() as 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED') || 'ACTIVE',
        startTime: dbListing.startTime?.toISOString() || now,
        endTime: dbListing.endTime ? dbListing.endTime.toISOString() : undefined,
        highestBid: dbListing.highestBid?.toString(),
        highestBidderWalletAddress: dbListing.highestBidder || undefined,
        metadataURI: dbListing.metadataURI,
        isEscrowed: dbListing.isEscrowed || false,
        nftStandard: dbListing.nftStandard as 'ERC721' | 'ERC1155' | undefined,
        tokenId: dbListing.tokenId || undefined,
        reservePrice: dbListing.reservePrice?.toString(),
        minIncrement: dbListing.minIncrement?.toString(),
        reserveMet: dbListing.reserveMet || false,
        createdAt: dbListing.createdAt?.toISOString() || now,
        updatedAt: dbListing.updatedAt?.toISOString() || now
      };

      return listing;
    } catch (error) {
      safeLogger.error('Error creating listing:', error);
      // Check if it's a database connection error
      if (this.isDatabaseConnectionError(error)) {
        throw new Error('Service temporarily unavailable');
      }
      throw new Error('Failed to create marketplace listing');
    }
  }

  async getListingById(id: string): Promise<MarketplaceListing | null> {
    let dbListing;
    try {
      // Add timeout protection
      dbListing = await this.withTimeout(databaseService.getProductById(id));

      if (!dbListing) return null;
    } catch (error) {
      safeLogger.error('Error getting listing by ID:', error);
      // Return null for database errors to enable graceful degradation
      return null;
    }

    // Get seller address
    const seller = await userProfileService.getProfileById(dbListing.sellerId || '');
    if (!seller) return null;

    // Parse metadata to extract enhanced information
    let parsedMetadata = {};
    try {
      if (dbListing.metadata) {
        parsedMetadata = JSON.parse(dbListing.metadata);
      }
    } catch (e) {
      // If parsing fails, use the raw metadata
      parsedMetadata = { title: dbListing.title || 'Untitled' };
    }

    const now = new Date().toISOString();
    const listing: MarketplaceListing = {
      id: dbListing.id,
      sellerWalletAddress: seller.walletAddress,
      tokenAddress: '', // Not applicable for product listings
      price: dbListing.priceAmount?.toString() || '0',
      quantity: dbListing.inventory || 0,
      itemType: 'PHYSICAL', // Default to physical for product listings
      listingType: 'FIXED_PRICE', // Default to fixed price for product listings
      status: (dbListing.status?.toUpperCase() as 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED') || 'ACTIVE',
      startTime: dbListing.publishedAt?.toISOString() || now,
      endTime: undefined, // Not applicable for product listings
      highestBid: undefined, // Not applicable for fixed price listings
      highestBidderWalletAddress: undefined, // Not applicable for fixed price listings
      metadataURI: dbListing.metadata || '{}',
      isEscrowed: false, // Default to false for product listings
      nftStandard: undefined, // Not applicable for regular product listings
      tokenId: undefined, // Not applicable for regular product listings
      reservePrice: undefined, // Not applicable for fixed price listings
      minIncrement: undefined, // Not applicable for fixed price listings
      reserveMet: false, // Not applicable for fixed price listings
      createdAt: dbListing.createdAt?.toISOString() || now,
      updatedAt: dbListing.updatedAt?.toISOString() || now
    };

    return listing;
  }

  async getListingsBySeller(sellerAddress: string): Promise<MarketplaceListing[]> {
    try {
      const sellerUser = await this.withTimeout(userProfileService.getProfileByAddress(sellerAddress));
      if (!sellerUser) return [];

      // Use the correct database service method that queries the products table
      const dbListings = await this.withTimeout(databaseService.getProductsBySeller(sellerUser.id));

      const now = new Date().toISOString();
      const listings: MarketplaceListing[] = [];
      for (const dbListing of dbListings) {
        // Parse metadata to extract enhanced information
        let parsedMetadata = {};
        try {
          if (dbListing.metadata) {
            parsedMetadata = JSON.parse(dbListing.metadata);
          }
        } catch (e) {
          // If parsing fails, use the raw metadata
          parsedMetadata = { title: dbListing.title || 'Untitled' };
        }

        const listing: MarketplaceListing = {
          id: dbListing.id,
          sellerWalletAddress: sellerAddress,
          tokenAddress: '', // Not applicable for product listings
          price: dbListing.priceAmount?.toString() || '0',
          quantity: dbListing.inventory || 0,
          itemType: 'PHYSICAL', // Default to physical for product listings
          listingType: 'FIXED_PRICE', // Default to fixed price for product listings
          status: (dbListing.status?.toUpperCase() as 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED') || 'ACTIVE',
          startTime: dbListing.publishedAt?.toISOString() || now,
          endTime: undefined, // Not applicable for product listings
          highestBid: undefined, // Not applicable for fixed price listings
          highestBidderWalletAddress: undefined, // Not applicable for fixed price listings
          metadataURI: dbListing.metadata || '{}',
          isEscrowed: false, // Default to false for product listings
          nftStandard: undefined, // Not applicable for regular product listings
          tokenId: undefined, // Not applicable for regular product listings
          reservePrice: undefined, // Not applicable for fixed price listings
          minIncrement: undefined, // Not applicable for fixed price listings
          reserveMet: false, // Not applicable for fixed price listings
          createdAt: dbListing.createdAt?.toISOString() || now,
          updatedAt: dbListing.updatedAt?.toISOString() || now
        };
        listings.push(listing);
      }

      return listings;
    } catch (error) {
      safeLogger.error('Error getting listings by seller:', error);
      // Return empty array for database errors to enable graceful degradation
      return [];
    }
  }

  async getAllListings(): Promise<MarketplaceListing[]> {
    try {
      const dbListings = await this.withTimeout(databaseService.getAllProducts());

      const now = new Date().toISOString();
      const listings: MarketplaceListing[] = [];
      for (const dbListing of dbListings) {
        // Get seller address
        const seller = await this.withTimeout(userProfileService.getProfileById(dbListing.sellerId || ''));
        if (!seller) continue;

        // Parse metadata to extract enhanced information
        let parsedMetadata = {};
        try {
          if (dbListing.metadata) {
            parsedMetadata = JSON.parse(dbListing.metadata);
          }
        } catch (e) {
          // If parsing fails, use the raw metadata
          parsedMetadata = { title: dbListing.title || 'Untitled' };
        }

        const listing: MarketplaceListing = {
          id: dbListing.id,
          sellerWalletAddress: seller.walletAddress,
          tokenAddress: '', // Not applicable for product listings
          price: dbListing.priceAmount?.toString() || '0',
          quantity: dbListing.inventory || 0,
          itemType: 'PHYSICAL', // Default to physical for product listings
          listingType: 'FIXED_PRICE', // Default to fixed price for product listings
          status: (dbListing.status?.toUpperCase() as 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED') || 'ACTIVE',
          startTime: dbListing.publishedAt?.toISOString() || now,
          endTime: undefined, // Not applicable for product listings
          highestBid: undefined, // Not applicable for fixed price listings
          highestBidderWalletAddress: undefined, // Not applicable for fixed price listings
          metadataURI: dbListing.metadata || '{}',
          isEscrowed: false, // Default to false for product listings
          nftStandard: undefined, // Not applicable for regular product listings
          tokenId: undefined, // Not applicable for regular product listings
          reservePrice: undefined, // Not applicable for fixed price listings
          minIncrement: undefined, // Not applicable for fixed price listings
          reserveMet: false, // Not applicable for fixed price listings
          createdAt: dbListing.createdAt?.toISOString() || now,
          updatedAt: dbListing.updatedAt?.toISOString() || now
        };
        listings.push(listing);
      }

      return listings;
    } catch (error) {
      safeLogger.error('Error getting all listings:', error);
      // Return empty array for database errors to enable graceful degradation
      return [];
    }
  }

  async getActiveListings(): Promise<MarketplaceListing[]> {
    try {
      const dbListings = await this.withTimeout(databaseService.getActiveProducts());

      const now = new Date().toISOString();
      const listings: MarketplaceListing[] = [];
      for (const dbListing of dbListings) {
        // Get seller address
        const seller = await this.withTimeout(userProfileService.getProfileById(dbListing.sellerId || ''));
        if (!seller) continue;

        // Parse metadata to extract enhanced information
        let parsedMetadata = {};
        try {
          if (dbListing.metadata) {
            parsedMetadata = JSON.parse(dbListing.metadata);
          }
        } catch (e) {
          // If parsing fails, use the raw metadata
          parsedMetadata = { title: dbListing.title || 'Untitled' };
        }

        const listing: MarketplaceListing = {
          id: dbListing.id,
          sellerWalletAddress: seller.walletAddress,
          tokenAddress: '', // Not applicable for product listings
          price: dbListing.priceAmount?.toString() || '0',
          quantity: dbListing.inventory || 0,
          itemType: 'PHYSICAL', // Default to physical for product listings
          listingType: 'FIXED_PRICE', // Default to fixed price for product listings
          status: (dbListing.status?.toUpperCase() as 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED') || 'ACTIVE',
          startTime: dbListing.publishedAt?.toISOString() || now,
          endTime: undefined, // Not applicable for product listings
          highestBid: undefined, // Not applicable for fixed price listings
          highestBidderWalletAddress: undefined, // Not applicable for fixed price listings
          metadataURI: dbListing.metadata || '{}',
          isEscrowed: false, // Default to false for product listings
          nftStandard: undefined, // Not applicable for regular product listings
          tokenId: undefined, // Not applicable for regular product listings
          reservePrice: undefined, // Not applicable for fixed price listings
          minIncrement: undefined, // Not applicable for fixed price listings
          reserveMet: false, // Not applicable for fixed price listings
          createdAt: dbListing.createdAt?.toISOString() || now,
          updatedAt: dbListing.updatedAt?.toISOString() || now
        };
        listings.push(listing);
      }

      return listings;
    } catch (error) {
      safeLogger.error('Error getting active listings:', error);
      // Return empty array for database errors to enable graceful degradation
      return [];
    }
  }

  async updateListing(id: string, input: UpdateListingInput): Promise<MarketplaceListing | null> {
    try {
      const updates: any = {};
      if (input.price !== undefined) updates.price = input.price;
      if (input.quantity !== undefined) updates.quantity = input.quantity;

      const dbListing = await this.withTimeout(databaseService.updateListing(id, updates));
      if (!dbListing) return null;

      // Get seller address
      const seller = await this.withTimeout(userProfileService.getProfileById(dbListing.sellerId || ''));
      if (!seller) return null;

      const now = new Date().toISOString();
      const listing: MarketplaceListing = {
        id: dbListing.id,
        sellerWalletAddress: seller.walletAddress,
        tokenAddress: dbListing.tokenAddress,
        price: dbListing.price,
        quantity: dbListing.quantity,
        itemType: dbListing.itemType as 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE',
        listingType: dbListing.listingType as 'FIXED_PRICE' | 'AUCTION',
        status: (dbListing.status?.toUpperCase() as 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED') || 'ACTIVE',
        startTime: dbListing.startTime?.toISOString() || now,
        endTime: dbListing.endTime ? dbListing.endTime.toISOString() : undefined,
        highestBid: dbListing.highestBid?.toString(),
        highestBidderWalletAddress: dbListing.highestBidder || undefined,
        metadataURI: dbListing.metadataURI,
        isEscrowed: dbListing.isEscrowed || false,
        nftStandard: dbListing.nftStandard as 'ERC721' | 'ERC1155' | undefined,
        tokenId: dbListing.tokenId || undefined,
        reservePrice: dbListing.reservePrice?.toString(),
        minIncrement: dbListing.minIncrement?.toString(),
        reserveMet: dbListing.reserveMet || false,
        createdAt: dbListing.createdAt?.toISOString() || now,
        updatedAt: dbListing.updatedAt?.toISOString() || now
      };

      return listing;
    } catch (error) {
      safeLogger.error('Error updating marketplace listing:', error);
      // Return null for database errors to enable graceful degradation
      return null;
    }
  }

  async cancelListing(id: string): Promise<boolean> {
    try {
      const dbListing = await this.withTimeout(databaseService.cancelListing(id));
      return dbListing !== null;
    } catch (error) {
      safeLogger.error('Error canceling marketplace listing:', error);
      // Return false for database errors to enable graceful degradation
      return false;
    }
  }

  // Bids
  async placeBid(listingId: string, input: PlaceBidInput): Promise<MarketplaceBid | null> {
    try {
      // Ensure bidder exists
      let bidderUser = await this.withTimeout(userProfileService.getProfileByAddress(input.bidderWalletAddress));
      if (!bidderUser) {
        bidderUser = await this.withTimeout(userProfileService.createProfile({
          walletAddress: input.bidderWalletAddress,
          handle: '',
          ens: '',
          avatarCid: '',
          bioCid: ''
        }));
      }

      const dbBid = await this.withTimeout(databaseService.placeBid(
        listingId,
        bidderUser.id,
        input.amount
      ));

      if (!dbBid) return null;

      const bid: MarketplaceBid = {
        id: dbBid.id.toString(),
        listingId: listingId,
        bidderWalletAddress: input.bidderWalletAddress,
        amount: dbBid.amount,
        timestamp: dbBid.timestamp?.toISOString() || new Date().toISOString()
      };

      return bid;
    } catch (error) {
      safeLogger.error('Error placing bid:', error);
      // Return null for database errors to enable graceful degradation
      return null;
    }
  }

  async getBidsByListing(listingId: string): Promise<MarketplaceBid[]> {
    try {
      const dbBids = await this.withTimeout(databaseService.getBidsByListing(listingId));

      const bids: MarketplaceBid[] = [];
      for (const dbBid of dbBids) {
        // Get bidder address
        const bidder = await this.withTimeout(userProfileService.getProfileById(dbBid.bidderId || ''));
        if (!bidder) continue;

        const bid: MarketplaceBid = {
          id: dbBid.id.toString(),
          listingId: listingId,
          bidderWalletAddress: bidder.walletAddress,
          amount: dbBid.amount,
          timestamp: dbBid.timestamp?.toISOString() || new Date().toISOString()
        };
        bids.push(bid);
      }

      return bids;
    } catch (error) {
      safeLogger.error('Error getting bids by listing:', error);
      // Return empty array for database errors to enable graceful degradation
      return [];
    }
  }

  async getBidsByBidder(bidderAddress: string): Promise<MarketplaceBid[]> {
    try {
      const bidderUser = await this.withTimeout(userProfileService.getProfileByAddress(bidderAddress));
      if (!bidderUser) return [];

      const dbBids = await this.withTimeout(databaseService.getBidsByBidder(bidderUser.id));

      const bids: MarketplaceBid[] = [];
      for (const dbBid of dbBids) {
        const bid: MarketplaceBid = {
          id: dbBid.id.toString(),
          listingId: dbBid.listingId?.toString() || '',
          bidderWalletAddress: bidderAddress,
          amount: dbBid.amount,
          timestamp: dbBid.timestamp?.toISOString() || new Date().toISOString()
        };
        bids.push(bid);
      }

      return bids;
    } catch (error) {
      safeLogger.error('Error getting bids by bidder:', error);
      // Return empty array for database errors to enable graceful degradation
      return [];
    }
  }

  // Offers
  async makeOffer(listingId: string, input: MakeOfferInput): Promise<MarketplaceOffer | null> {
    try {
      // Ensure buyer exists
      let buyerUser = await this.withTimeout(userProfileService.getProfileByAddress(input.buyerWalletAddress));
      if (!buyerUser) {
        buyerUser = await this.withTimeout(userProfileService.createProfile({
          walletAddress: input.buyerWalletAddress,
          handle: '',
          ens: '',
          avatarCid: '',
          bioCid: ''
        }));
      }

      const dbOffer = await this.withTimeout(databaseService.makeOffer(
        listingId,
        buyerUser.id,
        input.amount
      ));

      if (!dbOffer) return null;

      const offer: MarketplaceOffer = {
        id: dbOffer.id.toString(),
        listingId: listingId,
        buyerWalletAddress: input.buyerWalletAddress,
        amount: dbOffer.amount,
        createdAt: dbOffer.createdAt?.toISOString() || new Date().toISOString(),
        accepted: dbOffer.accepted || false
      };

      return offer;
    } catch (error) {
      safeLogger.error('Error making offer:', error);
      // Return null for database errors to enable graceful degradation
      return null;
    }
  }

  async getOffersByListing(listingId: string): Promise<MarketplaceOffer[]> {
    try {
      const dbOffers = await this.withTimeout(databaseService.getOffersByListing(listingId));

      const offers: MarketplaceOffer[] = [];
      for (const dbOffer of dbOffers) {
        // Get buyer address
        const buyer = await this.withTimeout(userProfileService.getProfileById(dbOffer.buyerId || ''));
        if (!buyer) continue;

        const offer: MarketplaceOffer = {
          id: dbOffer.id.toString(),
          listingId: listingId,
          buyerWalletAddress: buyer.walletAddress,
          amount: dbOffer.amount,
          createdAt: dbOffer.createdAt?.toISOString() || new Date().toISOString(),
          accepted: dbOffer.accepted || false
        };
        offers.push(offer);
      }

      return offers;
    } catch (error) {
      safeLogger.error('Error getting offers by listing:', error);
      // Return empty array for database errors to enable graceful degradation
      return [];
    }
  }

  async getOffersByBuyer(buyerAddress: string): Promise<MarketplaceOffer[]> {
    try {
      const buyerUser = await this.withTimeout(userProfileService.getProfileByAddress(buyerAddress));
      if (!buyerUser) return [];

      const dbOffers = await this.withTimeout(databaseService.getOffersByBuyer(buyerUser.id));

      const offers: MarketplaceOffer[] = [];
      for (const dbOffer of dbOffers) {
        const offer: MarketplaceOffer = {
          id: dbOffer.id.toString(),
          listingId: dbOffer.listingId?.toString() || '',
          buyerWalletAddress: buyerAddress,
          amount: dbOffer.amount,
          createdAt: dbOffer.createdAt?.toISOString() || new Date().toISOString(),
          accepted: dbOffer.accepted || false
        };
        offers.push(offer);
      }

      return offers;
    } catch (error) {
      safeLogger.error('Error getting offers by buyer:', error);
      // Return empty array for database errors to enable graceful degradation
      return [];
    }
  }

  async acceptOffer(offerId: string): Promise<boolean> {
    try {
      const dbOffer = await this.withTimeout(databaseService.acceptOffer(offerId));
      return dbOffer !== null;
    } catch (error) {
      safeLogger.error('Error accepting offer:', error);
      // Return false for database errors to enable graceful degradation
      return false;
    }
  }

  // Escrow
  async createEscrow(listingId: string, buyerAddress: string, deliveryInfo?: string): Promise<MarketplaceEscrow | null> {
    try {
      // Get listing
      const listing = await this.withTimeout(this.getListingById(listingId));
      if (!listing) return null;

      // Ensure buyer exists
      let buyerUser = await this.withTimeout(userProfileService.getProfileByAddress(buyerAddress));
      if (!buyerUser) {
        buyerUser = await this.withTimeout(userProfileService.createProfile({
          walletAddress: buyerAddress,
          handle: '',
          ens: '',
          avatarCid: '',
          bioCid: ''
        }));
      }

      // Get seller user
      const sellerUser = await this.withTimeout(userProfileService.getProfileByAddress(listing.sellerWalletAddress));
      if (!sellerUser) return null;

      const dbEscrow = await this.withTimeout(databaseService.createEscrow(
        listingId,
        buyerUser.id,
        sellerUser.id,
        listing.price,
        deliveryInfo
      ));

      if (!dbEscrow) return null;

      const escrow: MarketplaceEscrow = {
        id: dbEscrow.id.toString(),
        listingId: listingId,
        buyerWalletAddress: buyerAddress,
        sellerWalletAddress: listing.sellerWalletAddress,
        amount: dbEscrow.amount,
        buyerApproved: dbEscrow.buyerApproved || false,
        sellerApproved: dbEscrow.sellerApproved || false,
        disputeOpened: dbEscrow.disputeOpened || false,
        resolverWalletAddress: dbEscrow.resolverAddress || undefined,
        createdAt: dbEscrow.createdAt?.toISOString() || new Date().toISOString(),
        resolvedAt: dbEscrow.resolvedAt?.toISOString(),
        deliveryInfo: dbEscrow.deliveryInfo || undefined,
        deliveryConfirmed: dbEscrow.deliveryConfirmed || false
      };

      return escrow;
    } catch (error) {
      safeLogger.error('Error creating escrow:', error);
      // Return null for database errors to enable graceful degradation
      return null;
    }
  }

  async approveEscrow(escrowId: string, userAddress: string): Promise<boolean> {
    try {
      // Get user
      const user = await this.withTimeout(userProfileService.getProfileByAddress(userAddress));
      if (!user) return false;

      // Get escrow
      const dbEscrow = await this.withTimeout(databaseService.getEscrowById(escrowId));
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

      const updatedEscrow = await this.withTimeout(databaseService.updateEscrow(escrowId, updates));
      return updatedEscrow !== null;
    } catch (error) {
      safeLogger.error('Error approving escrow:', error);
      // Return false for database errors to enable graceful degradation
      return false;
    }
  }

  async openDispute(escrowId: string, userAddress: string): Promise<boolean> {
    try {
      // Get user
      const user = await this.withTimeout(userProfileService.getProfileByAddress(userAddress));
      if (!user) return false;

      // Get escrow
      const dbEscrow = await this.withTimeout(databaseService.getEscrowById(escrowId));
      if (!dbEscrow) return false;

      // Check if user is part of this escrow
      if (dbEscrow.buyerId !== user.id && dbEscrow.sellerId !== user.id) {
        return false;
      }

      const updatedEscrow = await this.withTimeout(databaseService.updateEscrow(escrowId, {
        disputeOpened: true
      }));

      return updatedEscrow !== null;
    } catch (error) {
      safeLogger.error('Error opening dispute:', error);
      // Return false for database errors to enable graceful degradation
      return false;
    }
  }

  async confirmDelivery(escrowId: string, deliveryInfo: string): Promise<boolean> {
    try {
      const updatedEscrow = await this.withTimeout(databaseService.confirmDelivery(escrowId, deliveryInfo));
      return updatedEscrow !== null;
    } catch (error) {
      safeLogger.error('Error confirming delivery:', error);
      // Return false for database errors to enable graceful degradation
      return false;
    }
  }

  async getEscrowById(id: string): Promise<MarketplaceEscrow | null> {
    try {
      const dbEscrow = await this.withTimeout(databaseService.getEscrowById(id));
      if (!dbEscrow) return null;

      // Get buyer and seller addresses
      const buyer = await this.withTimeout(userProfileService.getProfileById(dbEscrow.buyerId || ''));
      const seller = await this.withTimeout(userProfileService.getProfileById(dbEscrow.sellerId || ''));
      if (!buyer || !seller) return null;

      const escrow: MarketplaceEscrow = {
        id: dbEscrow.id.toString(),
        listingId: dbEscrow.listingId?.toString() || '',
        buyerWalletAddress: buyer.walletAddress,
        sellerWalletAddress: seller.walletAddress,
        amount: dbEscrow.amount,
        buyerApproved: dbEscrow.buyerApproved || false,
        sellerApproved: dbEscrow.sellerApproved || false,
        disputeOpened: dbEscrow.disputeOpened || false,
        resolverWalletAddress: dbEscrow.resolverAddress || undefined,
        createdAt: dbEscrow.createdAt?.toISOString() || new Date().toISOString(),
        resolvedAt: dbEscrow.resolvedAt?.toISOString(),
        deliveryInfo: dbEscrow.deliveryInfo || undefined,
        deliveryConfirmed: dbEscrow.deliveryConfirmed || false
      };

      return escrow;
    } catch (error) {
      safeLogger.error('Error getting escrow by ID:', error);
      // Return null for database errors to enable graceful degradation
      return null;
    }
  }

  async getEscrowsByUser(userAddress: string): Promise<MarketplaceEscrow[]> {
    try {
      const user = await this.withTimeout(userProfileService.getProfileByAddress(userAddress));
      if (!user) return [];

      const dbEscrows = await this.withTimeout(databaseService.getEscrowsByUser(user.id));

      const escrows: MarketplaceEscrow[] = [];
      for (const dbEscrow of dbEscrows) {
        // Get buyer and seller addresses
        const buyer = await this.withTimeout(userProfileService.getProfileById(dbEscrow.buyerId || ''));
        const seller = await this.withTimeout(userProfileService.getProfileById(dbEscrow.sellerId || ''));
        if (!buyer || !seller) continue;

        const escrow: MarketplaceEscrow = {
          id: dbEscrow.id.toString(),
          listingId: dbEscrow.listingId?.toString() || '',
          buyerWalletAddress: buyer.walletAddress,
          sellerWalletAddress: seller.walletAddress,
          amount: dbEscrow.amount,
          buyerApproved: dbEscrow.buyerApproved || false,
          sellerApproved: dbEscrow.sellerApproved || false,
          disputeOpened: dbEscrow.disputeOpened || false,
          resolverWalletAddress: dbEscrow.resolverAddress || undefined,
          createdAt: dbEscrow.createdAt?.toISOString() || new Date().toISOString(),
          resolvedAt: dbEscrow.resolvedAt?.toISOString(),
          deliveryInfo: dbEscrow.deliveryInfo || undefined,
          deliveryConfirmed: dbEscrow.deliveryConfirmed || false
        };
        escrows.push(escrow);
      }

      return escrows;
    } catch (error) {
      safeLogger.error('Error getting escrows by user:', error);
      // Return empty array for database errors to enable graceful degradation
      return [];
    }
  }

  // Orders
  async createOrder(listingId: string, buyerAddress: string, sellerAddress: string,
    amount: string, paymentToken: string, escrowId?: string): Promise<MarketplaceOrder | null> {
    try {
      // Ensure buyer exists
      let buyerUser = await this.withTimeout(userProfileService.getProfileByAddress(buyerAddress));
      if (!buyerUser) {
        buyerUser = await this.withTimeout(userProfileService.createProfile({
          walletAddress: buyerAddress,
          handle: '',
          ens: '',
          avatarCid: '',
          bioCid: ''
        }));
      }

      // Ensure seller exists
      let sellerUser = await this.withTimeout(userProfileService.getProfileByAddress(sellerAddress));
      if (!sellerUser) {
        sellerUser = await this.withTimeout(userProfileService.createProfile({
          walletAddress: sellerAddress,
          handle: '',
          ens: '',
          avatarCid: '',
          bioCid: ''
        }));
      }

      const dbOrder = await this.withTimeout(databaseService.createOrder(
        listingId,
        buyerUser.id,
        sellerUser.id,
        amount,
        paymentToken,
        escrowId
      ));

      if (!dbOrder) return null;

      const order: MarketplaceOrder = {
        id: dbOrder.id.toString(),
        listingId: listingId,
        buyerWalletAddress: buyerAddress,
        sellerWalletAddress: sellerAddress,
        escrowId: escrowId,
        amount: dbOrder.amount,
        paymentToken: dbOrder.paymentToken || '',
        status: (dbOrder.status?.toUpperCase() as 'PENDING' | 'COMPLETED' | 'DISPUTED' | 'REFUNDED') || 'PENDING',
        createdAt: dbOrder.createdAt?.toISOString() || new Date().toISOString()
      };

      return order;
    } catch (error) {
      safeLogger.error('Error creating order:', error);
      // Return null for database errors to enable graceful degradation
      return null;
    }
  }

  async getOrderById(id: string): Promise<MarketplaceOrder | null> {
    try {
      const dbOrder = await this.withTimeout(databaseService.getOrderById(id));
      if (!dbOrder) return null;

      // Get buyer and seller addresses
      const buyer = await this.withTimeout(userProfileService.getProfileById(dbOrder.buyerId || ''));
      const seller = await this.withTimeout(userProfileService.getProfileById(dbOrder.sellerId || ''));
      if (!buyer || !seller) return null;

      const order: MarketplaceOrder = {
        id: dbOrder.id.toString(),
        listingId: dbOrder.listingId?.toString() || '',
        buyerWalletAddress: buyer.walletAddress,
        sellerWalletAddress: seller.walletAddress,
        escrowId: dbOrder.escrowId?.toString(),
        amount: dbOrder.amount,
        paymentToken: dbOrder.paymentToken || '',
        status: (dbOrder.status?.toUpperCase() as 'PENDING' | 'COMPLETED' | 'DISPUTED' | 'REFUNDED') || 'PENDING',
        createdAt: dbOrder.createdAt?.toISOString() || new Date().toISOString()
      };

      return order;
    } catch (error) {
      safeLogger.error('Error getting order by ID:', error);
      // Return null for database errors to enable graceful degradation
      return null;
    }
  }

  async getOrdersByUser(userAddress: string): Promise<MarketplaceOrder[]> {
    const user = await userProfileService.getProfileByAddress(userAddress);
    if (!user) return [];

    const dbOrders = await databaseService.getOrdersByUser(user.id);

    const orders: MarketplaceOrder[] = [];
    for (const dbOrder of dbOrders) {
      // Get buyer and seller addresses
      const buyer = await userProfileService.getProfileById(dbOrder.buyerId || '');
      const seller = await userProfileService.getProfileById(dbOrder.sellerId || '');
      if (!buyer || !seller) continue;

      const order: MarketplaceOrder = {
        id: dbOrder.id.toString(),
        listingId: dbOrder.listingId?.toString() || '',
        buyerWalletAddress: buyer.walletAddress,
        sellerWalletAddress: seller.walletAddress,
        escrowId: dbOrder.escrowId?.toString(),
        amount: dbOrder.amount,
        paymentToken: dbOrder.paymentToken || '',
        status: (dbOrder.status?.toUpperCase() as 'PENDING' | 'COMPLETED' | 'DISPUTED' | 'REFUNDED') || 'PENDING',
        createdAt: dbOrder.createdAt?.toISOString() || new Date().toISOString()
      };
      orders.push(order);
    }

    return orders;
  }

  async updateOrderStatus(orderId: string, status: 'PENDING' | 'COMPLETED' | 'DISPUTED' | 'REFUNDED'): Promise<boolean> {
    const updatedOrder = await databaseService.updateOrder(orderId, {
      status: status.toLowerCase()
    });

    return updatedOrder !== null;
  }

  // Disputes
  async createDispute(escrowId: string, reporterAddress: string, reason: string, evidence?: string[]): Promise<MarketplaceDispute | null> {
    // Ensure reporter exists
    let reporterUser = await userProfileService.getProfileByAddress(reporterAddress);
    if (!reporterUser) {
      reporterUser = await userProfileService.createProfile({
        walletAddress: reporterAddress,
        handle: '',
        ens: '',
        avatarCid: '',
        bioCid: ''
      });
    }

    const evidenceString = evidence ? JSON.stringify(evidence) : undefined;

    const dbDispute = await databaseService.createDispute(
      String(escrowId),
      reporterUser.id,
      reason,
      evidenceString
    );

    if (!dbDispute) return null;

    const dispute: MarketplaceDispute = {
      id: dbDispute.id.toString(),
      escrowId: escrowId,
      reporterWalletAddress: reporterAddress,
      reason: dbDispute.reason || '',
      status: (dbDispute.status?.toUpperCase() as 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'ESCALATED') || 'OPEN',
      createdAt: dbDispute.createdAt?.toISOString() || new Date().toISOString(),
      resolvedAt: dbDispute.resolvedAt ? dbDispute.resolvedAt.toISOString() : undefined,
      resolution: dbDispute.resolution || undefined,
      evidence: evidence
    };

    return dispute;
  }

  async getDisputeById(id: string): Promise<MarketplaceDispute | null> {
    const dbDispute = await databaseService.getDisputeById(id);
    if (!dbDispute) return null;

    // Get reporter address
    const reporter = await userProfileService.getProfileById(dbDispute.reporterId || '');
    if (!reporter) return null;

    let evidence: string[] | undefined;
    if (dbDispute.evidence) {
      try {
        evidence = JSON.parse(dbDispute.evidence);
      } catch (e) {
        evidence = undefined;
      }
    }

    const dispute: MarketplaceDispute = {
      id: dbDispute.id.toString(),
      escrowId: dbDispute.escrowId?.toString() || '',
      reporterWalletAddress: reporter.walletAddress,
      reason: dbDispute.reason || '',
      status: (dbDispute.status?.toUpperCase() as 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'ESCALATED') || 'OPEN',
      createdAt: dbDispute.createdAt?.toISOString() || new Date().toISOString(),
      resolvedAt: dbDispute.resolvedAt ? dbDispute.resolvedAt.toISOString() : undefined,
      resolution: dbDispute.resolution || undefined,
      evidence: evidence
    };

    return dispute;
  }

  async getDisputesByUser(userAddress: string): Promise<MarketplaceDispute[]> {
    const user = await userProfileService.getProfileByAddress(userAddress);
    if (!user) return [];

    const dbDisputes = await databaseService.getDisputesByUser(user.id);

    const disputes: MarketplaceDispute[] = [];
    for (const dbDispute of dbDisputes) {
      // Get reporter address
      const reporter = await userProfileService.getProfileById(dbDispute.reporterId || '');
      if (!reporter) continue;

      let evidence: string[] | undefined;
      if (dbDispute.evidence) {
        try {
          evidence = JSON.parse(dbDispute.evidence);
        } catch (e) {
          evidence = undefined;
        }
      }

      const dispute: MarketplaceDispute = {
        id: dbDispute.id.toString(),
        escrowId: dbDispute.escrowId?.toString() || '',
        reporterWalletAddress: reporter.walletAddress,
        reason: dbDispute.reason || '',
        status: (dbDispute.status?.toUpperCase() as 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'ESCALATED') || 'OPEN',
        createdAt: dbDispute.createdAt?.toISOString() || new Date().toISOString(),
        resolvedAt: dbDispute.resolvedAt ? dbDispute.resolvedAt.toISOString() : undefined,
        resolution: dbDispute.resolution || undefined,
        evidence: evidence
      };
      disputes.push(dispute);
    }

    return disputes;
  }

  async updateDisputeStatus(disputeId: string, status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'ESCALATED',
    resolution?: string): Promise<boolean> {
    const updates: any = {
      status: status.toLowerCase()
    };

    if (resolution) {
      updates.resolution = resolution;
      updates.resolvedAt = new Date();
    }

    const updatedDispute = await databaseService.updateDispute(parseInt(disputeId), updates);

    return updatedDispute !== null;
  }

  // Reputation
  async getUserReputation(address: string): Promise<UserReputation | null> {
    const dbReputation = await databaseService.getUserReputation(address);
    if (!dbReputation) return null;

    const reputation: UserReputation = {
      walletAddress: dbReputation.walletAddress,
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
      walletAddress: dbReputation.walletAddress,
      score: dbReputation.score,
      daoApproved: dbReputation.daoApproved || false
    };

    return reputation;
  }

  async getDAOApprovedVendors(): Promise<UserReputation[]> {
    const dbReputations = await databaseService.getDAOApprovedVendors();

    const reputations: UserReputation[] = dbReputations.map((dbReputation: any) => ({
      walletAddress: dbReputation.walletAddress,
      score: dbReputation.score,
      daoApproved: dbReputation.daoApproved || false
    }));

    return reputations;
  }

  // AI Moderation
  async createAIModeration(objectType: string, objectId: string, aiAnalysis?: string): Promise<AIModeration | null> {
    const dbAIModeration = await databaseService.createAIModeration(
      objectType,
      objectId,
      aiAnalysis
    );

    if (!dbAIModeration) return null;

    const aiModeration: AIModeration = {
      id: dbAIModeration.id.toString(),
      objectType: dbAIModeration.objectType,
      objectId: dbAIModeration.objectId.toString(),
      status: (dbAIModeration.status?.toUpperCase() as 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED') || 'PENDING',
      aiAnalysis: dbAIModeration.aiAnalysis || undefined,
      createdAt: dbAIModeration.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: dbAIModeration.updatedAt?.toISOString() || new Date().toISOString()
    };

    return aiModeration;
  }

  async getAIModerationByObject(objectType: string, objectId: string): Promise<AIModeration | null> {
    const dbAIModeration = await databaseService.getAIModerationByObject(
      objectType,
      objectId
    );

    if (!dbAIModeration) return null;

    const aiModeration: AIModeration = {
      id: dbAIModeration.id.toString(),
      objectType: dbAIModeration.objectType,
      objectId: dbAIModeration.objectId.toString(),
      status: (dbAIModeration.status?.toUpperCase() as 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED') || 'PENDING',
      aiAnalysis: dbAIModeration.aiAnalysis || undefined,
      createdAt: dbAIModeration.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: dbAIModeration.updatedAt?.toISOString() || new Date().toISOString()
    };

    return aiModeration;
  }

  async updateAIModerationStatus(id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED',
    aiAnalysis?: string): Promise<boolean> {
    const updates: any = {
      status: status.toLowerCase()
    };

    if (aiAnalysis) {
      updates.aiAnalysis = aiAnalysis;
      updates.updatedAt = new Date();
    }

    const updatedAIModeration = await databaseService.updateAIModeration(id, updates);

    return updatedAIModeration !== null;
  }

  async getPendingAIModeration(): Promise<AIModeration[]> {
    const dbAIModerations = await databaseService.getPendingAIModeration();

    const aiModerations: AIModeration[] = dbAIModerations.map((dbAIModeration: any) => ({
      id: dbAIModeration.id.toString(),
      objectType: dbAIModeration.objectType,
      objectId: dbAIModeration.objectId.toString(),
      status: (dbAIModeration.status?.toUpperCase() as 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED') || 'PENDING',
      aiAnalysis: dbAIModeration.aiAnalysis || undefined,
      createdAt: dbAIModeration.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: dbAIModeration.updatedAt?.toISOString() || new Date().toISOString()
    }));

    return aiModerations;
  }

  // Utility method to check if an error is a database connection error
  private isDatabaseConnectionError(error: any): boolean {
    if (!error) return false;

    // Check for common database connection error patterns
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCodes = ['econnrefused', 'enotfound', 'etimedout', 'database'];

    return errorCodes.some(code => errorMessage.includes(code)) ||
      (error.code && errorCodes.includes(error.code.toLowerCase()));
  }

  // Utility methods
  async getListingCount(): Promise<number> {
    try {
      const listings = await this.withTimeout(databaseService.getAllListings());
      return listings.length;
    } catch (error) {
      safeLogger.error('Error getting listing count:', error);
      // Return 0 for database errors to enable graceful degradation
      return 0;
    }
  }

  async getActiveListingCount(): Promise<number> {
    try {
      const listings = await this.withTimeout(databaseService.getActiveListings());
      return listings.length;
    } catch (error) {
      safeLogger.error('Error getting active listing count:', error);
      // Return 0 for database errors to enable graceful degradation
      return 0;
    }
  }

  async getUserListingCount(userAddress: string): Promise<number> {
    try {
      const listings = await this.withTimeout(this.getListingsBySeller(userAddress));
      return listings.length;
    } catch (error) {
      safeLogger.error('Error getting user listing count:', error);
      // Return 0 for database errors to enable graceful degradation
      return 0;
    }
  }

  // Health check method to verify database connectivity
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      // Test database connection
      if (!db) {
        return { healthy: false, error: 'Database connection unavailable' };
      }

      // Test a simple query with timeout
      await this.withTimeout(db.execute('SELECT 1'), 5000);
      return { healthy: true };
    } catch (error) {
      safeLogger.error('Marketplace service health check failed:', error);
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
    }
  }
}

// Export singleton instance
export const marketplaceService = new BlockchainMarketplaceService();
