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
import { eq } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

// Use the singleton instance instead of creating a new one
// const databaseService = new DatabaseService();
const userProfileService = new UserProfileService();

export class BlockchainMarketplaceService {
  // Listings
  async createListing(input: CreateListingInput): Promise<MarketplaceListing> {
    // Ensure seller exists
    let sellerUser = await userProfileService.getProfileByAddress(input.sellerWalletAddress);
    if (!sellerUser) {
      sellerUser = await userProfileService.createProfile({
        walletAddress: input.sellerWalletAddress,
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
      input.metadataURI,
      input.nftStandard,
      input.tokenId,
      input.reservePrice,
      input.minIncrement
    );
    
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
  }

  async getListingById(id: string): Promise<MarketplaceListing | null> {
    // Get product by ID from the products table
    let dbListing = await databaseService.getProductById(id);
    
    if (!dbListing) return null;
    
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
    const sellerUser = await userProfileService.getProfileByAddress(sellerAddress);
    if (!sellerUser) return [];
    
    // Use the correct database service method that queries the products table
    const dbListings = await databaseService.getProductsBySeller(sellerUser.id);
    
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
  }

  async getAllListings(): Promise<MarketplaceListing[]> {
    const dbListings = await databaseService.getAllProducts();
    
    const now = new Date().toISOString();
    const listings: MarketplaceListing[] = [];
    for (const dbListing of dbListings) {
      // Get seller address
      const seller = await userProfileService.getProfileById(dbListing.sellerId || '');
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
  }

  async getActiveListings(): Promise<MarketplaceListing[]> {
    const dbListings = await databaseService.getActiveProducts();
    
    const now = new Date().toISOString();
    const listings: MarketplaceListing[] = [];
    for (const dbListing of dbListings) {
      // Get seller address
      const seller = await userProfileService.getProfileById(dbListing.sellerId || '');
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
  }

  async updateListing(id: string, input: UpdateListingInput): Promise<MarketplaceListing | null> {
    const updates: any = {};
    if (input.price !== undefined) updates.price = input.price;
    if (input.quantity !== undefined) updates.quantity = input.quantity;
    
    const dbListing = await databaseService.updateListing(id, updates);
    if (!dbListing) return null;
    
    // Get seller address
    const seller = await userProfileService.getProfileById(dbListing.sellerId || '');
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
  }

  async cancelListing(id: string): Promise<boolean> {
    const dbListing = await databaseService.cancelListing(id);
    return dbListing !== null;
  }

  // Bids
  async placeBid(listingId: string, input: PlaceBidInput): Promise<MarketplaceBid | null> {
    // Ensure bidder exists
    let bidderUser = await userProfileService.getProfileByAddress(input.bidderWalletAddress);
    if (!bidderUser) {
      bidderUser = await userProfileService.createProfile({
        walletAddress: input.bidderWalletAddress,
        handle: '',
        ens: '',
        avatarCid: '',
        bioCid: ''
      });
    }
    
    const dbBid = await databaseService.placeBid(
      listingId,
      bidderUser.id,
      input.amount
    );
    
    if (!dbBid) return null;
    
    const bid: MarketplaceBid = {
      id: dbBid.id.toString(),
      listingId: listingId,
      bidderWalletAddress: input.bidderWalletAddress,
      amount: dbBid.amount,
      timestamp: dbBid.timestamp?.toISOString() || new Date().toISOString()
    };
    
    return bid;
  }

  async getBidsByListing(listingId: string): Promise<MarketplaceBid[]> {
    const dbBids = await databaseService.getBidsByListing(listingId);
    
    const bids: MarketplaceBid[] = [];
    for (const dbBid of dbBids) {
      // Get bidder address
      const bidder = await userProfileService.getProfileById(dbBid.bidderId || '');
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
        bidderWalletAddress: bidderAddress,
        amount: dbBid.amount,
        timestamp: dbBid.timestamp?.toISOString() || new Date().toISOString()
      };
      bids.push(bid);
    }
    
    return bids;
  }

  // Offers
  async makeOffer(listingId: string, input: MakeOfferInput): Promise<MarketplaceOffer | null> {
    // Ensure buyer exists
    let buyerUser = await userProfileService.getProfileByAddress(input.buyerWalletAddress);
    if (!buyerUser) {
      buyerUser = await userProfileService.createProfile({
        walletAddress: input.buyerWalletAddress,
        handle: '',
        ens: '',
        avatarCid: '',
        bioCid: ''
      });
    }
    
    const dbOffer = await databaseService.makeOffer(
      listingId,
      buyerUser.id,
      input.amount
    );
    
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
  }

  async getOffersByListing(listingId: string): Promise<MarketplaceOffer[]> {
    const dbOffers = await databaseService.getOffersByListing(listingId);
    
    const offers: MarketplaceOffer[] = [];
    for (const dbOffer of dbOffers) {
      // Get buyer address
      const buyer = await userProfileService.getProfileById(dbOffer.buyerId || '');
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
  }

  async getOffersByBuyer(buyerAddress: string): Promise<MarketplaceOffer[]> {
    const buyerUser = await userProfileService.getProfileByAddress(buyerAddress);
    if (!buyerUser) return [];
    
    const dbOffers = await databaseService.getOffersByBuyer(buyerUser.id);
    
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
  }

  async acceptOffer(offerId: string): Promise<boolean> {
    const dbOffer = await databaseService.acceptOffer(parseInt(offerId));
    return dbOffer !== null;
  }

  // Escrow
  async createEscrow(listingId: string, buyerAddress: string, deliveryInfo?: string): Promise<MarketplaceEscrow | null> {
    // Get listing
    const listing = await this.getListingById(listingId);
    if (!listing) return null;
    
    // Ensure buyer exists
    let buyerUser = await userProfileService.getProfileByAddress(buyerAddress);
    if (!buyerUser) {
      buyerUser = await userProfileService.createProfile({
        walletAddress: buyerAddress,
        handle: '',
        ens: '',
        avatarCid: '',
        bioCid: ''
      });
    }
    
    // Get seller user
    const sellerUser = await userProfileService.getProfileByAddress(listing.sellerWalletAddress);
    if (!sellerUser) return null;
    
    const dbEscrow = await databaseService.createEscrow(
      listingId,
      buyerUser.id,
      sellerUser.id,
      listing.price,
      deliveryInfo
    );
    
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

  async confirmDelivery(escrowId: string, deliveryInfo: string): Promise<boolean> {
    const updatedEscrow = await databaseService.confirmDelivery(parseInt(escrowId), deliveryInfo);
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
  }

  // Orders
  async createOrder(listingId: string, buyerAddress: string, sellerAddress: string, 
                    amount: string, paymentToken: string, escrowId?: string): Promise<MarketplaceOrder | null> {
    // Ensure buyer exists
    let buyerUser = await userProfileService.getProfileByAddress(buyerAddress);
    if (!buyerUser) {
      buyerUser = await userProfileService.createProfile({
        walletAddress: buyerAddress,
        handle: '',
        ens: '',
        avatarCid: '',
        bioCid: ''
      });
    }
    
    // Ensure seller exists
    let sellerUser = await userProfileService.getProfileByAddress(sellerAddress);
    if (!sellerUser) {
      sellerUser = await userProfileService.createProfile({
        walletAddress: sellerAddress,
        handle: '',
        ens: '',
        avatarCid: '',
        bioCid: ''
      });
    }
    
    const dbOrder = await databaseService.createOrder(
      listingId,
      buyerUser.id,
      sellerUser.id,
      amount,
      paymentToken,
      escrowId
    );
    
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
  }

  async getOrderById(id: string): Promise<MarketplaceOrder | null> {
    const dbOrder = await databaseService.getOrderById(parseInt(id));
    if (!dbOrder) return null;
    
    // Get buyer and seller addresses
    const buyer = await userProfileService.getProfileById(dbOrder.buyerId || '');
    const seller = await userProfileService.getProfileById(dbOrder.sellerId || '');
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
    const updatedOrder = await databaseService.updateOrder(parseInt(orderId), {
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
      parseInt(escrowId),
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
    const dbDispute = await databaseService.getDisputeById(parseInt(id));
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
      parseInt(objectId),
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
      parseInt(objectId)
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
    
    const updatedAIModeration = await databaseService.updateAIModeration(parseInt(id), updates);
    
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
