import { eq, desc, and, or, sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import { nfts, nftCollections, nftListings, nftOffers, nftAuctions, users } from '../db/schema';
import ipfsService from './ipfsService';
import { ethers } from 'ethers';

export interface CreateNFTParams {
  creatorId: string;
  collectionId?: string;
  name: string;
  description: string;
  image: Buffer;
  animationFile?: Buffer;
  externalUrl?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
  royalty: number; // in basis points (e.g., 250 = 2.5%)
}

export interface CreateCollectionParams {
  creatorId: string;
  name: string;
  symbol: string;
  description: string;
  image: Buffer;
  externalUrl?: string;
  maxSupply?: number;
  mintPrice: string; // in wei
  isPublicMint: boolean;
  royalty: number;
}

export interface ListNFTParams {
  nftId: string;
  sellerId: string;
  price: string; // in wei
  duration: number; // in seconds
  currency: string; // 'ETH' or token address
}

export interface CreateAuctionParams {
  nftId: string;
  sellerId: string;
  startingPrice: string;
  reservePrice?: string;
  duration: number;
  currency: string;
}

export interface MakeOfferParams {
  nftId: string;
  buyerId: string;
  amount: string;
  duration: number;
  currency: string;
}

class NFTService {
  /**
   * Create a new NFT with metadata upload to IPFS
   */
  async createNFT(params: CreateNFTParams): Promise<any> {
    try {
      // Upload image to IPFS
      const imageResult = await ipfsService.uploadFile(params.image, { metadata: { name: 'nft-image' } });
      
      // Upload animation file if provided
      let animationHash: string | undefined;
      if (params.animationFile) {
        const animationResult = await ipfsService.uploadFile(params.animationFile, { metadata: { name: 'nft-animation' } });
        animationHash = animationResult.ipfsHash;
      }

      // Create metadata object
      const metadata = {
        name: params.name,
        description: params.description,
        image: `ipfs://${imageResult.ipfsHash}`,
        animation_url: animationHash ? `ipfs://${animationHash}` : undefined,
        external_url: params.externalUrl,
        attributes: params.attributes,
        creator: params.creatorId,
      };

      // Upload metadata to IPFS
      const metadataResult = await ipfsService.uploadFile(Buffer.from(JSON.stringify(metadata)), { metadata: { name: 'nft-metadata', mimeType: 'application/json' } });

      // Generate content hash for duplicate detection
      const contentHash = require('crypto').createHash('sha256').update(params.image).digest('hex');

      // Store NFT in database
      const [nft] = await db.insert(nfts).values({
        tokenId: `${Date.now()}`, // Generate a temporary token ID
        contractAddress: params.contractAddress || '0x0000000000000000000000000000000000000000',
        ownerId: params.creatorId,
        creatorId: params.creatorId,
        collectionId: params.collectionId,
        name: params.name,
        description: params.description,
        imageUrl: imageResult.gatewayUrl,
        imageHash: imageResult.ipfsHash,
        animationHash,
        metadataHash: metadataResult.ipfsHash,
        metadataUri: metadataResult.gatewayUrl,
        attributes: JSON.stringify(params.attributes),
      }).returning();

      return {
        ...nft,
        imageUrl: imageResult.gatewayUrl,
        metadataUrl: metadataResult.gatewayUrl,
        animationUrl: animationHash ? `${ipfsService.getGatewayUrl()}${animationHash}` : null,
      };
    } catch (error) {
      safeLogger.error('Error creating NFT:', error);
      throw new Error('Failed to create NFT');
    }
  }

  /**
   * Create a new NFT collection
   */
  async createCollection(params: CreateCollectionParams): Promise<any> {
    try {
      // Upload collection image to IPFS
      const imageResult = await ipfsService.uploadFile(params.image, { metadata: { name: 'collection-image' } });

      // Store collection in database
      const [collection] = await db.insert(nftCollections).values({
        contractAddress: params.contractAddress || '0x0000000000000000000000000000000000000000',
        creatorId: params.creatorId,
        name: params.name,
        symbol: params.symbol,
        description: params.description,
        imageUrl: imageResult.gatewayUrl,
        imageHash: imageResult.ipfsHash,
        maxSupply: params.maxSupply,
        royaltyPercentage: params.royalty?.toString() || '0',
      }).returning();

      return {
        ...collection,
        imageUrl: imageResult.gatewayUrl,
      };
    } catch (error) {
      safeLogger.error('Error creating collection:', error);
      throw new Error('Failed to create collection');
    }
  }

  /**
   * List an NFT for sale
   */
  async listNFT(params: ListNFTParams): Promise<any> {
    try {
      // Verify NFT ownership
      const nft = await this.getNFTById(params.nftId);
      if (!nft) {
        throw new Error('NFT not found');
      }

      // Check if NFT is already listed
      const existingListing = await db.select()
        .from(nftListings)
        .where(and(
          eq(nftListings.nftId, params.nftId),
          eq(nftListings.status, 'active')
        ))
        .limit(1);

      if (existingListing.length > 0) {
        throw new Error('NFT is already listed');
      }

      const expiresAt = new Date(Date.now() + params.duration * 1000);

      const [listing] = await db.insert(nftListings).values({
        nftId: params.nftId,
        sellerId: params.sellerId,
        price: params.price,
        currency: params.currency,
        listingType: 'fixed',
        expiresAt: expiresAt,
        status: 'active',
      }).returning();

      return listing;
    } catch (error) {
      safeLogger.error('Error listing NFT:', error);
      throw new Error('Failed to list NFT');
    }
  }

  /**
   * Create an auction for an NFT
   */
  async createAuction(params: CreateAuctionParams): Promise<any> {
    try {
      const endTime = new Date(Date.now() + params.duration * 1000);

      const [auction] = await db.insert(nftAuctions).values({
        nftId: params.nftId,
        sellerId: params.sellerId,
        startingPrice: params.startingPrice,
        reservePrice: params.reservePrice,
        currentBid: '0',
        currency: params.currency,
        startTime: new Date(),
        endTime: endTime,
        status: 'active',
      }).returning();

      return auction;
    } catch (error) {
      safeLogger.error('Error creating auction:', error);
      throw new Error('Failed to create auction');
    }
  }

  /**
   * Make an offer on an NFT
   */
  async makeOffer(params: MakeOfferParams): Promise<any> {
    try {
      const expiresAt = new Date(Date.now() + params.duration * 1000);

      const [offer] = await db.insert(nftOffers).values({
        nftId: params.nftId,
        buyerId: params.buyerId,
        price: params.amount,
        currency: params.currency,
        expiresAt: expiresAt,
        status: 'pending',
      }).returning();

      return offer;
    } catch (error) {
      safeLogger.error('Error making offer:', error);
      throw new Error('Failed to make offer');
    }
  }

  /**
   * Get NFT by ID with full details
   */
  async getNFTById(nftId: string): Promise<any> {
    try {
      const result = await db.select({
        nft: nfts,
        creator: {
          id: users.id,
          walletAddress: users.walletAddress,
          handle: users.handle,
        },
        collection: nftCollections,
      })
      .from(nfts)
      .leftJoin(users, eq(nfts.creatorId, users.id))
      .leftJoin(nftCollections, eq(nfts.collectionId, nftCollections.id))
      .where(eq(nfts.id, nftId))
      .limit(1);

      if (result.length === 0) {
        return null;
      }

      const { nft, creator, collection } = result[0];

      return {
        ...nft,
        imageUrl: `${ipfsService.getGatewayUrl()}${nft.imageHash}`,
        metadataUrl: nft.metadataUri,
        animationUrl: nft.animationHash ? `${ipfsService.getGatewayUrl()}${nft.animationHash}` : null,
        attributes: nft.attributes ? JSON.parse(nft.attributes) : [],
        creator,
        collection,
      };
    } catch (error) {
      safeLogger.error('Error getting NFT by ID:', error);
      throw new Error('Failed to get NFT');
    }
  }

  /**
   * Get NFTs by creator
   */
  async getNFTsByCreator(creatorId: string, limit = 20, offset = 0): Promise<any[]> {
    try {
      const result = await db.select({
        nft: nfts,
        collection: nftCollections,
      })
      .from(nfts)
      .leftJoin(nftCollections, eq(nfts.collectionId, nftCollections.id))
      .where(eq(nfts.creatorId, creatorId))
      .orderBy(desc(nfts.createdAt))
      .limit(limit)
      .offset(offset);

      return result.map(({ nft, collection }) => ({
        ...nft,
        imageUrl: `${ipfsService.getGatewayUrl()}${nft.imageHash}`,
        metadataUrl: nft.metadataUri,
        animationUrl: nft.animationHash ? `${ipfsService.getGatewayUrl()}${nft.animationHash}` : null,
        attributes: nft.attributes ? JSON.parse(nft.attributes) : [],
        collection,
      }));
    } catch (error) {
      safeLogger.error('Error getting NFTs by creator:', error);
      throw new Error('Failed to get creator NFTs');
    }
  }

  /**
   * Get NFTs in a collection
   */
  async getNFTsByCollection(collectionId: string, limit = 20, offset = 0): Promise<any[]> {
    try {
      const result = await db.select({
        nft: nfts,
        creator: {
          id: users.id,
          walletAddress: users.walletAddress,
          handle: users.handle,
        },
      })
      .from(nfts)
      .leftJoin(users, eq(nfts.creatorId, users.id))
      .where(eq(nfts.collectionId, collectionId))
      .orderBy(desc(nfts.createdAt))
      .limit(limit)
      .offset(offset);

      return result.map(({ nft, creator }) => ({
        ...nft,
        imageUrl: `${ipfsService.getGatewayUrl()}${nft.imageHash}`,
        metadataUrl: nft.metadataUri,
        animationUrl: nft.animationHash ? `${ipfsService.getGatewayUrl()}${nft.animationHash}` : null,
        attributes: nft.attributes ? JSON.parse(nft.attributes) : [],
        creator,
      }));
    } catch (error) {
      safeLogger.error('Error getting NFTs by collection:', error);
      throw new Error('Failed to get collection NFTs');
    }
  }

  /**
   * Get active listings
   */
  async getActiveListings(limit = 20, offset = 0): Promise<any[]> {
    try {
      const result = await db.select({
        listing: nftListings,
        nft: nfts,
        seller: {
          id: users.id,
          walletAddress: users.walletAddress,
          handle: users.handle,
        },
        collection: nftCollections,
      })
      .from(nftListings)
      .innerJoin(nfts, eq(nftListings.nftId, nfts.id))
      .leftJoin(users, eq(nftListings.sellerId, users.id))
      .leftJoin(nftCollections, eq(nfts.collectionId, nftCollections.id))
      .where(and(
        eq(nftListings.status, 'active'),
        sql`${nftListings.endTime} > NOW()`
      ))
      .orderBy(desc(nftListings.createdAt))
      .limit(limit)
      .offset(offset);

      return result.map(({ listing, nft, seller, collection }) => ({
        ...listing,
        nft: {
          ...nft,
          imageUrl: `${ipfsService.getGatewayUrl()}${nft.imageHash}`,
          metadataUrl: nft.metadataUri,
          animationUrl: nft.animationHash ? `${ipfsService.getGatewayUrl()}${nft.animationHash}` : null,
          attributes: nft.attributes ? JSON.parse(nft.attributes) : [],
        },
        seller,
        collection,
      }));
    } catch (error) {
      safeLogger.error('Error getting active listings:', error);
      throw new Error('Failed to get active listings');
    }
  }

  /**
   * Get active auctions
   */
  async getActiveAuctions(limit = 20, offset = 0): Promise<any[]> {
    try {
      const result = await db.select({
        auction: nftAuctions,
        nft: nfts,
        seller: {
          id: users.id,
          walletAddress: users.walletAddress,
          handle: users.handle,
        },
        collection: nftCollections,
      })
      .from(nftAuctions)
      .innerJoin(nfts, eq(nftAuctions.nftId, nfts.id))
      .leftJoin(users, eq(nftAuctions.sellerId, users.id))
      .leftJoin(nftCollections, eq(nfts.collectionId, nftCollections.id))
      .where(and(
        eq(nftAuctions.status, 'active'),
        sql`${nftAuctions.endTime} > NOW()`
      ))
      .orderBy(desc(nftAuctions.createdAt))
      .limit(limit)
      .offset(offset);

      return result.map(({ auction, nft, seller, collection }) => ({
        ...auction,
        nft: {
          ...nft,
          imageUrl: `${ipfsService.getGatewayUrl()}${nft.imageHash}`,
          metadataUrl: nft.metadataUri,
          animationUrl: nft.animationHash ? `${ipfsService.getGatewayUrl()}${nft.animationHash}` : null,
          attributes: nft.attributes ? JSON.parse(nft.attributes) : [],
        },
        seller,
        collection,
      }));
    } catch (error) {
      safeLogger.error('Error getting active auctions:', error);
      throw new Error('Failed to get active auctions');
    }
  }

  /**
   * Get offers for an NFT
   */
  async getNFTOffers(nftId: string): Promise<any[]> {
    try {
      const result = await db.select({
        offer: nftOffers,
        buyer: {
          id: users.id,
          walletAddress: users.walletAddress,
          handle: users.handle,
        },
      })
      .from(nftOffers)
      .leftJoin(users, eq(nftOffers.buyerId, users.id))
      .where(and(
        eq(nftOffers.nftId, nftId),
        eq(nftOffers.status, 'pending'),
        sql`${nftOffers.expiresAt} > NOW()`
      ))
      .orderBy(desc(nftOffers.price));

      return result.map(({ offer, buyer }) => ({
        ...offer,
        buyer,
      }));
    } catch (error) {
      safeLogger.error('Error getting NFT offers:', error);
      throw new Error('Failed to get NFT offers');
    }
  }

  /**
   * Verify NFT authenticity
   */
  async verifyNFT(nftId: string, verifierId: string): Promise<void> {
    try {
      await db.update(nfts)
        .set({
          isVerified: true,
          verifiedAt: new Date(),
          verifierId,
        })
        .where(eq(nfts.id, nftId));
    } catch (error) {
      safeLogger.error('Error verifying NFT:', error);
      throw new Error('Failed to verify NFT');
    }
  }

  /**
   * Get NFT provenance (ownership history)
   */
  async getNFTProvenance(nftId: string): Promise<any[]> {
    try {
      // This would typically come from blockchain events
      // For now, return a placeholder structure
      return [
        {
          event: 'Minted',
          from: null,
          to: 'creator_address',
          transactionHash: '0x...',
          blockNumber: 12345,
          timestamp: new Date().toISOString(),
        },
        // Additional ownership transfers would be tracked here
      ];
    } catch (error) {
      safeLogger.error('Error getting NFT provenance:', error);
      throw new Error('Failed to get NFT provenance');
    }
  }

  /**
   * Search NFTs
   */
  async searchNFTs(query: string, filters?: {
    collectionId?: string;
    creatorId?: string;
    minPrice?: string;
    maxPrice?: string;
    attributes?: Array<{ trait_type: string; value: string }>;
  }, limit = 20, offset = 0): Promise<any[]> {
    try {
      let whereConditions = [];

      if (query) {
        whereConditions.push(
          or(
            sql`${nfts.name} ILIKE ${`%${query}%`}`,
            sql`${nfts.description} ILIKE ${`%${query}%`}`
          )
        );
      }

      if (filters?.collectionId) {
        whereConditions.push(eq(nfts.collectionId, filters.collectionId));
      }

      if (filters?.creatorId) {
        whereConditions.push(eq(nfts.creatorId, filters.creatorId));
      }

      const result = await db.select({
        nft: nfts,
        creator: {
          id: users.id,
          walletAddress: users.walletAddress,
          handle: users.handle,
        },
        collection: nftCollections,
      })
      .from(nfts)
      .leftJoin(users, eq(nfts.creatorId, users.id))
      .leftJoin(nftCollections, eq(nfts.collectionId, nftCollections.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(nfts.createdAt))
      .limit(limit)
      .offset(offset);

      return result.map(({ nft, creator, collection }) => ({
        ...nft,
        imageUrl: `${ipfsService.getGatewayUrl()}${nft.imageHash}`,
        metadataUrl: nft.metadataUri,
        animationUrl: nft.animationHash ? `${ipfsService.getGatewayUrl()}${nft.animationHash}` : null,
        attributes: nft.attributes ? JSON.parse(nft.attributes) : [],
        creator,
        collection,
      }));
    } catch (error) {
      safeLogger.error('Error searching NFTs:', error);
      throw new Error('Failed to search NFTs');
    }
  }
}

export default new NFTService();
