import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import nftService from '../services/nftService';
import multer from 'multer';
import { z } from 'zod';

// Validation schemas
const createNFTSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000),
  externalUrl: z.string().url().optional(),
  attributes: z.array(z.object({
    trait_type: z.string(),
    value: z.union([z.string(), z.number()]),
    display_type: z.string().optional(),
  })),
  royalty: z.number().min(0).max(1000), // max 10%
  collectionId: z.string().uuid().optional(),
});

const createCollectionSchema = z.object({
  name: z.string().min(1).max(255),
  symbol: z.string().min(1).max(32),
  description: z.string().max(2000),
  externalUrl: z.string().url().optional(),
  maxSupply: z.number().positive().optional(),
  mintPrice: z.string(), // in wei
  isPublicMint: z.boolean(),
  royalty: z.number().min(0).max(1000),
});

const listNFTSchema = z.object({
  price: z.string(), // in wei
  duration: z.number().positive(), // in seconds
  currency: z.string().min(1),
});

const createAuctionSchema = z.object({
  startingPrice: z.string(),
  reservePrice: z.string().optional(),
  duration: z.number().positive(),
  currency: z.string().min(1),
});

const makeOfferSchema = z.object({
  amount: z.string(),
  duration: z.number().positive(),
  currency: z.string().min(1),
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  },
});

export class NFTController {
  /**
   * Create a new NFT
   */
  static async createNFT(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Validate request body
      const validatedData = createNFTSchema.parse(req.body);

      // Check for required files
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (!files?.image?.[0]) {
        res.status(400).json({ error: 'Image file is required' });
        return;
      }

      const imageFile = files.image[0];
      const animationFile = files.animation?.[0];

      const nft = await nftService.createNFT({
        creatorId: userId,
        collectionId: validatedData.collectionId,
        name: validatedData.name,
        description: validatedData.description,
        image: imageFile.buffer,
        animationFile: animationFile?.buffer,
        externalUrl: validatedData.externalUrl,
        attributes: validatedData.attributes,
        royalty: validatedData.royalty,
      });

      res.status(201).json({
        success: true,
        data: nft,
      });
    } catch (error) {
      console.error('Error creating NFT:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }
      res.status(500).json({
        error: 'Failed to create NFT',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Create a new NFT collection
   */
  static async createCollection(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const validatedData = createCollectionSchema.parse(req.body);

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (!files?.image?.[0]) {
        res.status(400).json({ error: 'Collection image is required' });
        return;
      }

      const imageFile = files.image[0];

      const collection = await nftService.createCollection({
        creatorId: userId,
        name: validatedData.name,
        symbol: validatedData.symbol,
        description: validatedData.description,
        image: imageFile.buffer,
        externalUrl: validatedData.externalUrl,
        maxSupply: validatedData.maxSupply,
        mintPrice: validatedData.mintPrice,
        isPublicMint: validatedData.isPublicMint,
        royalty: validatedData.royalty,
      });

      res.status(201).json({
        success: true,
        data: collection,
      });
    } catch (error) {
      console.error('Error creating collection:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }
      res.status(500).json({
        error: 'Failed to create collection',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get NFT by ID
   */
  static async getNFT(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const nft = await nftService.getNFTById(id);
      if (!nft) {
        res.status(404).json({ error: 'NFT not found' });
        return;
      }

      res.json({
        success: true,
        data: nft,
      });
    } catch (error) {
      console.error('Error getting NFT:', error);
      res.status(500).json({
        error: 'Failed to get NFT',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get NFTs by creator
   */
  static async getNFTsByCreator(req: AuthenticatedRequest, res: Response) {
    try {
      const { creatorId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const nfts = await nftService.getNFTsByCreator(creatorId, limit, offset);

      res.json({
        success: true,
        data: nfts,
        pagination: {
          limit,
          offset,
          total: nfts.length,
        },
      });
    } catch (error) {
      console.error('Error getting creator NFTs:', error);
      res.status(500).json({
        error: 'Failed to get creator NFTs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get NFTs in a collection
   */
  static async getNFTsByCollection(req: AuthenticatedRequest, res: Response) {
    try {
      const { collectionId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const nfts = await nftService.getNFTsByCollection(collectionId, limit, offset);

      res.json({
        success: true,
        data: nfts,
        pagination: {
          limit,
          offset,
          total: nfts.length,
        },
      });
    } catch (error) {
      console.error('Error getting collection NFTs:', error);
      res.status(500).json({
        error: 'Failed to get collection NFTs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * List NFT for sale
   */
  static async listNFT(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const validatedData = listNFTSchema.parse(req.body);

      const listing = await nftService.listNFT({
        nftId: id,
        sellerId: userId,
        price: validatedData.price,
        duration: validatedData.duration,
        currency: validatedData.currency,
      });

      res.status(201).json({
        success: true,
        data: listing,
      });
    } catch (error) {
      console.error('Error listing NFT:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }
      res.status(500).json({
        error: 'Failed to list NFT',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Create auction for NFT
   */
  static async createAuction(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const validatedData = createAuctionSchema.parse(req.body);

      const auction = await nftService.createAuction({
        nftId: id,
        sellerId: userId,
        startingPrice: validatedData.startingPrice,
        reservePrice: validatedData.reservePrice,
        duration: validatedData.duration,
        currency: validatedData.currency,
      });

      res.status(201).json({
        success: true,
        data: auction,
      });
    } catch (error) {
      console.error('Error creating auction:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }
      res.status(500).json({
        error: 'Failed to create auction',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Make offer on NFT
   */
  static async makeOffer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const validatedData = makeOfferSchema.parse(req.body);

      const offer = await nftService.makeOffer({
        nftId: id,
        buyerId: userId,
        amount: validatedData.amount,
        duration: validatedData.duration,
        currency: validatedData.currency,
      });

      res.status(201).json({
        success: true,
        data: offer,
      });
    } catch (error) {
      console.error('Error making offer:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }
      res.status(500).json({
        error: 'Failed to make offer',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get active listings
   */
  static async getActiveListings(req: AuthenticatedRequest, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const listings = await nftService.getActiveListings(limit, offset);

      res.json({
        success: true,
        data: listings,
        pagination: {
          limit,
          offset,
          total: listings.length,
        },
      });
    } catch (error) {
      console.error('Error getting active listings:', error);
      res.status(500).json({
        error: 'Failed to get active listings',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get active auctions
   */
  static async getActiveAuctions(req: AuthenticatedRequest, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const auctions = await nftService.getActiveAuctions(limit, offset);

      res.json({
        success: true,
        data: auctions,
        pagination: {
          limit,
          offset,
          total: auctions.length,
        },
      });
    } catch (error) {
      console.error('Error getting active auctions:', error);
      res.status(500).json({
        error: 'Failed to get active auctions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get offers for NFT
   */
  static async getNFTOffers(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const offers = await nftService.getNFTOffers(id);

      res.json({
        success: true,
        data: offers,
      });
    } catch (error) {
      console.error('Error getting NFT offers:', error);
      res.status(500).json({
        error: 'Failed to get NFT offers',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Search NFTs
   */
  static async searchNFTs(req: AuthenticatedRequest, res: Response) {
    try {
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const filters = {
        collectionId: req.query.collectionId as string,
        creatorId: req.query.creatorId as string,
        minPrice: req.query.minPrice as string,
        maxPrice: req.query.maxPrice as string,
      };

      const nfts = await nftService.searchNFTs(query, filters, limit, offset);

      res.json({
        success: true,
        data: nfts,
        pagination: {
          limit,
          offset,
          total: nfts.length,
        },
      });
    } catch (error) {
      console.error('Error searching NFTs:', error);
      res.status(500).json({
        error: 'Failed to search NFTs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get NFT provenance
   */
  static async getNFTProvenance(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const provenance = await nftService.getNFTProvenance(id);

      res.json({
        success: true,
        data: provenance,
      });
    } catch (error) {
      console.error('Error getting NFT provenance:', error);
      res.status(500).json({
        error: 'Failed to get NFT provenance',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Verify NFT (admin only)
   */
  static async verifyNFT(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // TODO: Add admin role check
      const { id } = req.params;

      await nftService.verifyNFT(id, userId);

      res.json({
        success: true,
        message: 'NFT verified successfully',
      });
    } catch (error) {
      console.error('Error verifying NFT:', error);
      res.status(500).json({
        error: 'Failed to verify NFT',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// Export multer upload middleware
export const uploadNFTFiles = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'animation', maxCount: 1 },
]);