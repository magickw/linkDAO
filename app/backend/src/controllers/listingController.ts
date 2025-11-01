import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { UnifiedMarketplaceService } from '../services/unifiedMarketplaceService';
import { CreateListingInput, UpdateListingInput, ListingStatus } from '../services/listingService';
import { ProductSearchFilters, ProductSortOptions, PaginationOptions } from '../models/Product';
import { ValidationError } from '../models/validation';

export class ListingController {
  private unifiedMarketplaceService: UnifiedMarketplaceService;

  constructor() {
    this.unifiedMarketplaceService = new UnifiedMarketplaceService();
  }

  /**
   * Create a new listing
   * POST /api/listings
   * Requirements: 3.1, 3.2, 3.4
   */
  async createListing(req: Request, res: Response): Promise<Response> {
    try {
      const input: CreateListingInput = req.body;
      
      // Validate required fields
      if (!input.sellerId || !input.title || !input.description || !input.price || !input.categoryId) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['sellerId', 'title', 'description', 'price', 'categoryId']
        });
      }

      const result = await this.unifiedMarketplaceService.createListing(input);
      const listing = result.product;
      
      return res.status(201).json({
        success: true,
        listing,
        message: 'Listing created successfully'
      });
    } catch (error: any) {
      safeLogger.error('Error creating listing:', error);
      
      if (error instanceof ValidationError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.message,
          field: error.field
        });
      }
      
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create listing'
      });
    }
  }

  /**
   * Get listing by ID
   * GET /api/listings/:id
   * Requirements: 3.2, 3.3
   */
  async getListingById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const result = await this.unifiedMarketplaceService.getListingById(id);
      const listing = result.product;
      
      if (!listing) {
        return res.status(404).json({
          error: 'Listing not found',
          message: `No listing found with ID: ${id}`
        });
      }
      
      return res.json({
        success: true,
        listing
      });
    } catch (error: any) {
      safeLogger.error('Error fetching listing:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch listing'
      });
    }
  }

  /**
   * Update listing
   * PUT /api/listings/:id
   * Requirements: 3.1, 3.4
   */
  async updateListing(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const input: UpdateListingInput = req.body;
      
      const result = await this.unifiedMarketplaceService.updateListing(id, input);
      const listing = result.product;
      
      if (!listing) {
        return res.status(404).json({
          error: 'Listing not found',
          message: `No listing found with ID: ${id}`
        });
      }
      
      return res.json({
        success: true,
        listing,
        message: 'Listing updated successfully'
      });
    } catch (error: any) {
      safeLogger.error('Error updating listing:', error);
      
      if (error instanceof ValidationError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.message,
          field: error.field
        });
      }
      
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update listing'
      });
    }
  }

  /**
   * Get marketplace listings with real-time visibility
   * GET /api/listings/marketplace
   * Requirements: 3.2, 3.3
   */
  async getMarketplaceListings(req: Request, res: Response): Promise<Response> {
    try {
      // Parse query parameters
      const filters: ProductSearchFilters = {
        query: req.query.query as string,
        categoryId: req.query.categoryId as string,
        sellerId: req.query.sellerId as string,
        priceMin: req.query.priceMin as string,
        priceMax: req.query.priceMax as string,
        currency: req.query.currency as string,
        inStock: req.query.inStock === 'true',
        freeShipping: req.query.freeShipping === 'true'
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof ProductSearchFilters] === undefined) {
          delete filters[key as keyof ProductSearchFilters];
        }
      });

      const sort: ProductSortOptions = {
        field: (req.query.sortBy as any) || 'publishedAt',
        direction: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
      };

      const pagination: PaginationOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100) // Max 100 items per page
      };

      const result = await this.unifiedMarketplaceService.searchListings(filters, sort, pagination);
      
      return res.json({
        success: true,
        ...result
      });
    } catch (error: any) {
      safeLogger.error('Error fetching marketplace listings:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch marketplace listings'
      });
    }
  }

  /**
   * Search listings with enhanced full-text search
   * GET /api/listings/search
   * Requirements: 3.2, 3.3
   */
  async searchListings(req: Request, res: Response): Promise<Response> {
    try {
      // Parse query parameters
      const filters: ProductSearchFilters & { listingStatus?: string } = {
        query: req.query.q as string || req.query.query as string,
        categoryId: req.query.categoryId as string,
        sellerId: req.query.sellerId as string,
        priceMin: req.query.priceMin as string,
        priceMax: req.query.priceMax as string,
        currency: req.query.currency as string,
        inStock: req.query.inStock === 'true',
        freeShipping: req.query.freeShipping === 'true',
        listingStatus: req.query.listingStatus as string
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters] === undefined) {
          delete filters[key as keyof typeof filters];
        }
      });

      const sort: ProductSortOptions = {
        field: (req.query.sortBy as any) || 'createdAt',
        direction: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
      };

      const pagination: PaginationOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100)
      };

      const result = await this.unifiedMarketplaceService.searchListings(filters, sort, pagination);
      
      return res.json({
        success: true,
        ...result
      });
    } catch (error: any) {
      safeLogger.error('Error searching listings:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to search listings'
      });
    }
  }

  /**
   * Publish a listing (change status to published)
   * POST /api/listings/:id/publish
   * Requirements: 3.2, 3.3
   */
  async publishListing(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const result = await this.unifiedMarketplaceService.updateListing(id, {
        status: 'active'
      });
      
      const { product: listing } = result;
      
      if (!listing) {
        return res.status(404).json({
          error: 'Listing not found',
          message: `No listing found with ID: ${id}`
        });
      }
      
      return res.json({
        success: true,
        listing,
        message: 'Listing published successfully'
      });
    } catch (error: any) {
      safeLogger.error('Error publishing listing:', error);
      
      if (error instanceof ValidationError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.message,
          field: error.field
        });
      }
      
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to publish listing'
      });
    }
  }

  /**
   * Unpublish a listing (change status to inactive)
   * POST /api/listings/:id/unpublish
   * Requirements: 3.2, 3.4
   */
  async unpublishListing(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const result = await this.unifiedMarketplaceService.updateListing(id, {
        status: 'inactive'
      });
      
      const { product: listing } = result;
      
      if (!listing) {
        return res.status(404).json({
          error: 'Listing not found',
          message: `No listing found with ID: ${id}`
        });
      }
      
      return res.json({
        success: true,
        listing,
        message: 'Listing unpublished successfully'
      });
    } catch (error: any) {
      safeLogger.error('Error unpublishing listing:', error);
      
      if (error instanceof ValidationError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.message,
          field: error.field
        });
      }
      
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to unpublish listing'
      });
    }
  }

  /**
   * Get listings by seller
   * GET /api/listings/seller/:sellerId
   * Requirements: 3.2, 3.3
   */
  async getListingsBySeller(req: Request, res: Response): Promise<Response> {
    try {
      const { sellerId } = req.params;
      
      const filters: ProductSearchFilters = {
        sellerId,
        query: req.query.query as string,
        categoryId: req.query.categoryId as string,
        status: req.query.status ? [req.query.status as any] : undefined
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof ProductSearchFilters] === undefined) {
          delete filters[key as keyof ProductSearchFilters];
        }
      });

      const sort: ProductSortOptions = {
        field: (req.query.sortBy as any) || 'createdAt',
        direction: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
      };

      const pagination: PaginationOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100)
      };

      const result = await this.unifiedMarketplaceService.searchListings(filters, sort, pagination);
      
      return res.json({
        success: true,
        ...result
      });
    } catch (error: any) {
      safeLogger.error('Error fetching seller listings:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch seller listings'
      });
    }
  }

  /**
   * Get listing statistics
   * GET /api/listings/:id/stats
   * Requirements: 3.3
   */
  async getListingStats(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const result = await this.unifiedMarketplaceService.getListingById(id);
      const { product: listing } = result;
      
      if (!listing) {
        return res.status(404).json({
          error: 'Listing not found',
          message: `No listing found with ID: ${id}`
        });
      }
      
      // Return basic stats (in a real implementation, this would include more detailed analytics)
      const stats = {
        views: (listing as any).views || 0,
        favorites: (listing as any).favorites || 0,
        status: listing.status,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
        inventory: (listing as any).inventory || 0,
        price: listing.price
      };
      
      return res.json({
        success: true,
        stats
      });
    } catch (error: any) {
      safeLogger.error('Error fetching listing stats:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch listing statistics'
      });
    }
  }

  /**
   * Validate listing data
   * POST /api/listings/validate
   * Requirements: 3.1, 3.4
   */
  async validateListing(req: Request, res: Response): Promise<Response> {
    try {
      const input: CreateListingInput = req.body;
      
      // Use the private validation method from ListingService
      // Note: In a real implementation, we'd expose this as a public method
      const validation = await (this.unifiedMarketplaceService as any).validateListingInput(input);
      
      return res.json({
        success: true,
        validation
      });
    } catch (error: any) {
      safeLogger.error('Error validating listing:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to validate listing'
      });
    }
  }

  /**
   * Publish listing to blockchain marketplace
   * POST /api/listings/:id/publish-blockchain
   * Requirements: Blockchain integration
   */
  async publishToBlockchain(req: Request, res: Response): Promise<Response> {
    try {
      const { id: listingId } = req.params;
      const options = req.body;
      
      const blockchainListing = await this.unifiedMarketplaceService.publishToBlockchain(listingId, options);
      
      if (!blockchainListing) {
        return res.status(400).json({
          error: 'Publication failed',
          message: 'Failed to publish listing to blockchain'
        });
      }

      return res.json({
        success: true,
        message: 'Listing published to blockchain successfully',
        blockchainListing
      });
    } catch (error: any) {
      safeLogger.error('Error publishing to blockchain:', error);
      
      if (error instanceof ValidationError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.message,
          field: error.field
        });
      }
      
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to publish to blockchain'
      });
    }
  }

  /**
   * Sync listing with blockchain
   * POST /api/listings/:id/sync-blockchain
   * Requirements: Blockchain synchronization
   */
  async syncWithBlockchain(req: Request, res: Response): Promise<Response> {
    try {
      const { id: listingId } = req.params;
      
      const syncResult = await this.unifiedMarketplaceService.syncWithBlockchain(listingId);
      
      return res.json({
        success: true,
        message: syncResult.synced ? 'Listing is in sync' : 'Listing synchronized',
        syncResult
      });
    } catch (error: any) {
      safeLogger.error('Error syncing with blockchain:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to sync with blockchain'
      });
    }
  }

  /**
   * Get blockchain data for listing
   * GET /api/listings/:id/blockchain-data
   * Requirements: Blockchain data access
   */
  async getBlockchainData(req: Request, res: Response): Promise<Response> {
    try {
      const { id: listingId } = req.params;
      
      const blockchainData = await this.unifiedMarketplaceService.getBlockchainData(listingId);
      
      return res.json({
        success: true,
        blockchainData
      });
    } catch (error: any) {
      safeLogger.error('Error fetching blockchain data:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch blockchain data'
      });
    }
  }
}
