import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { MarketplaceListingsService } from '../services/marketplaceListingsService';
import { createSuccessResponse, createErrorResponse } from '../utils/apiResponse';
import { MarketplaceListingFilters } from '../types/marketplaceListing';
import { BlockchainMarketplaceService } from '../services/marketplaceService';

export class MarketplaceListingsController {
  private listingsService: MarketplaceListingsService;
  private marketplaceService: BlockchainMarketplaceService;

  constructor() {
    this.listingsService = new MarketplaceListingsService();
    this.marketplaceService = new BlockchainMarketplaceService();
  }

  /**
   * GET /marketplace/listings
   * Get paginated marketplace listings with filtering and sorting
   */
  getListings = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        limit,
        offset,
        sortBy,
        sortOrder,
        category,
        priceMin,
        priceMax,
        sellerAddress,
        isActive,
        search
      } = req.query;

      // Build filters for the database query
      const filters: MarketplaceListingFilters = {
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0,
        sortBy: ['createdAt', 'price', 'title'].includes(sortBy as string)
          ? (sortBy as 'createdAt' | 'price' | 'title')
          : 'createdAt',
        sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
        isActive: isActive !== 'false' // Default to true unless explicitly set to false
      };

      if (category) {
        filters.category = category as string;
      }

      if (sellerAddress) {
        filters.sellerAddress = sellerAddress as string;
      }

      if (priceMin || priceMax) {
        filters.priceRange = {
          min: priceMin ? (priceMin as string) : '0',
          max: priceMax ? (priceMax as string) : '999999999'
        };
      }

      // Use the database service to get listings from products table
      let result;
      if (search) {
        result = await this.listingsService.searchListings(search as string, filters);
      } else {
        result = await this.listingsService.getListings(filters);
      }

      // Map listings to the expected response format with enriched data
      const mappedListings = result.listings.map(listing => ({
        id: listing.id,
        sellerId: listing.sellerAddress,
        title: listing.title,
        description: listing.description || '',
        price: Number(listing.price),
        currency: listing.currency || 'USD',
        category: listing.category ? {
          id: listing.category,
          name: listing.category,
          slug: listing.category.toLowerCase()
        } : null,
        images: listing.images || [],
        inventory: 1,
        status: listing.isActive ? 'active' : 'inactive',
        tags: [],
        shipping: {
          weight: 0.5,
          freeShipping: true
        },
        nft: null,
        views: 0,
        favorites: 0,
        listingStatus: listing.isActive ? 'active' : 'inactive',
        publishedAt: listing.createdAt,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
        seller: {
          id: listing.sellerAddress,
          walletAddress: listing.sellerAddress,
          displayName: listing.sellerAddress ? `Seller ${listing.sellerAddress.substring(0, 6)}...` : 'Unknown',
          storeName: listing.sellerAddress ? `Store ${listing.sellerAddress.substring(0, 6)}` : 'Unknown Store',
          rating: 4.5,
          reputation: 85,
          verified: true,
          daoApproved: false,
          profileImageUrl: '/images/default-avatar.png',
          isOnline: true
        },
        trust: {
          verified: true,
          escrowProtected: true,
          onChainCertified: false,
          safetyScore: 85
        },
        metadata: {
          condition: 'new',
          brand: 'Unknown'
        },
        specifications: {}
      }));

      const response = {
        listings: mappedListings,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasNext: result.hasNext,
        hasPrevious: result.hasPrevious
      };

      res.json(createSuccessResponse(response));
    } catch (error) {
      safeLogger.error('Error in getListings:', error);
      res.status(500).json(createErrorResponse(
        'LISTINGS_FETCH_ERROR',
        'Failed to retrieve marketplace listings',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  };

  /**
   * GET /marketplace/listings/:id
   * Get a single marketplace listing by ID
   */
  getListingById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json(createErrorResponse(
          'INVALID_LISTING_ID',
          'Listing ID is required'
        ));
        return;
      }

      // Use the database service to get the listing
      const listing = await this.listingsService.getListingById(id);

      if (!listing) {
        res.status(404).json(createErrorResponse(
          'LISTING_NOT_FOUND',
          'Marketplace listing not found'
        ));
        return;
      }

      // Map the listing to the expected response format
      const responseListing = {
        id: listing.id,
        sellerId: listing.sellerAddress,
        title: listing.title,
        description: listing.description || '',
        price: Number(listing.price),
        currency: listing.currency || 'USD',
        category: listing.category ? {
          id: listing.category,
          name: listing.category,
          slug: listing.category.toLowerCase()
        } : null,
        images: listing.images || [],
        inventory: 1,
        status: listing.isActive ? 'active' : 'inactive',
        tags: [],
        shipping: {
          weight: 0.5,
          freeShipping: true
        },
        nft: null,
        views: 0,
        favorites: 0,
        listingStatus: listing.isActive ? 'active' : 'inactive',
        publishedAt: listing.createdAt,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
        seller: {
          id: listing.sellerAddress,
          walletAddress: listing.sellerAddress,
          displayName: listing.sellerAddress ? `Seller ${listing.sellerAddress.substring(0, 6)}...` : 'Unknown',
          storeName: listing.sellerAddress ? `Store ${listing.sellerAddress.substring(0, 6)}` : 'Unknown Store',
          rating: 4.5,
          reputation: 85,
          verified: true,
          daoApproved: false,
          profileImageUrl: '/images/default-avatar.png',
          isOnline: true
        },
        trust: {
          verified: true,
          escrowProtected: true,
          onChainCertified: false,
          safetyScore: 85
        },
        metadata: {
          condition: 'new',
          brand: 'Unknown'
        },
        specifications: {}
      };

      res.json(createSuccessResponse(responseListing));
    } catch (error) {
      safeLogger.error('Error in getListingById:', error);
      res.status(500).json(createErrorResponse(
        'LISTING_FETCH_ERROR',
        'Failed to retrieve marketplace listing',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  };

  /**
   * POST /marketplace/listings
   * Create a new marketplace listing
   */
  createListing = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sellerAddress } = req.body;
      const listingData = req.body;

      // Validate required fields
      if (!sellerAddress) {
        res.status(400).json(createErrorResponse(
          'MISSING_SELLER_ADDRESS',
          'Seller address is required'
        ));
        return;
      }

      if (!listingData.title) {
        res.status(400).json(createErrorResponse(
          'MISSING_TITLE',
          'Listing title is required'
        ));
        return;
      }

      if (!listingData.price) {
        res.status(400).json(createErrorResponse(
          'MISSING_PRICE',
          'Listing price is required'
        ));
        return;
      }

      // Validate price is a valid number
      const priceNum = parseFloat(listingData.price);
      if (isNaN(priceNum) || priceNum <= 0) {
        res.status(400).json(createErrorResponse(
          'INVALID_PRICE',
          'Price must be a valid positive number'
        ));
        return;
      }

      const listing = await this.listingsService.createListing(sellerAddress, {
        title: listingData.title,
        description: listingData.description,
        price: listingData.price,
        currency: listingData.currency,
        images: listingData.images,
        category: listingData.category
      });

      res.status(201).json(createSuccessResponse(listing));
    } catch (error) {
      safeLogger.error('Error in createListing:', error);
      res.status(500).json(createErrorResponse(
        'LISTING_CREATE_ERROR',
        'Failed to create marketplace listing',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  };

  /**
   * PUT /marketplace/listings/:id
   * Update an existing marketplace listing
   */
  updateListing = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { sellerAddress } = req.body;
      const updateData = req.body;

      if (!id) {
        res.status(400).json(createErrorResponse(
          'INVALID_LISTING_ID',
          'Listing ID is required'
        ));
        return;
      }

      if (!sellerAddress) {
        res.status(400).json(createErrorResponse(
          'MISSING_SELLER_ADDRESS',
          'Seller address is required'
        ));
        return;
      }

      // Validate price if provided
      if (updateData.price !== undefined) {
        const priceNum = parseFloat(updateData.price);
        if (isNaN(priceNum) || priceNum <= 0) {
          res.status(400).json(createErrorResponse(
            'INVALID_PRICE',
            'Price must be a valid positive number'
          ));
          return;
        }
      }

      const listing = await this.listingsService.updateListing(id, sellerAddress, {
        title: updateData.title,
        description: updateData.description,
        price: updateData.price,
        currency: updateData.currency,
        images: updateData.images,
        category: updateData.category,
        isActive: updateData.isActive
      });

      if (!listing) {
        res.status(404).json(createErrorResponse(
          'LISTING_NOT_FOUND',
          'Marketplace listing not found or unauthorized'
        ));
        return;
      }

      res.json(createSuccessResponse(listing));
    } catch (error) {
      safeLogger.error('Error in updateListing:', error);
      
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        res.status(403).json(createErrorResponse(
          'UNAUTHORIZED',
          'You are not authorized to update this listing'
        ));
        return;
      }

      res.status(500).json(createErrorResponse(
        'LISTING_UPDATE_ERROR',
        'Failed to update marketplace listing',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  };

  /**
   * DELETE /marketplace/listings/:id
   * Delete (deactivate) a marketplace listing
   */
  deleteListing = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { sellerAddress } = req.body;

      if (!id) {
        res.status(400).json(createErrorResponse(
          'INVALID_LISTING_ID',
          'Listing ID is required'
        ));
        return;
      }

      if (!sellerAddress) {
        res.status(400).json(createErrorResponse(
          'MISSING_SELLER_ADDRESS',
          'Seller address is required'
        ));
        return;
      }

      const success = await this.listingsService.deleteListing(id, sellerAddress);

      if (!success) {
        res.status(404).json(createErrorResponse(
          'LISTING_NOT_FOUND',
          'Marketplace listing not found or unauthorized'
        ));
        return;
      }

      res.json(createSuccessResponse({ message: 'Listing deleted successfully' }));
    } catch (error) {
      safeLogger.error('Error in deleteListing:', error);
      
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        res.status(403).json(createErrorResponse(
          'UNAUTHORIZED',
          'You are not authorized to delete this listing'
        ));
        return;
      }

      res.status(500).json(createErrorResponse(
        'LISTING_DELETE_ERROR',
        'Failed to delete marketplace listing',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  };

  /**
   * GET /marketplace/listings/categories
   * Get available categories with listing counts
   */
  getCategories = async (req: Request, res: Response): Promise<void> => {
    try {
      const categories = await this.listingsService.getCategories();
      res.json(createSuccessResponse(categories));
    } catch (error) {
      safeLogger.error('Error in getCategories:', error);
      res.status(500).json(createErrorResponse(
        'CATEGORIES_FETCH_ERROR',
        'Failed to retrieve categories',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  };

  /**
   * Fallback handler for when enhanced marketplace service fails
   * Returns mock data or cached data
   */
  getFallbackListings = async (req: Request, res: Response): Promise<void> => {
    try {
      // Return basic fallback data when enhanced service is unavailable
      const fallbackData = {
        listings: [],
        total: 0,
        limit: 20,
        offset: 0,
        hasNext: false,
        hasPrevious: false
      };

      const response = createSuccessResponse(fallbackData);
      response.metadata = {
        ...response.metadata,
        warning: {
          code: 'SERVICE_DEGRADED',
          message: 'Enhanced marketplace service unavailable, showing fallback data',
          serviceName: 'marketplace-listings'
        }
      };
      res.json(response);
    } catch (error) {
      safeLogger.error('Error in getFallbackListings:', error);
      res.status(500).json(createErrorResponse(
        'FALLBACK_ERROR',
        'Failed to retrieve fallback listings data',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  };

  /**
   * POST /marketplace/listings/:id/view
   * Track a view for a marketplace listing
   */
  trackView = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json(createErrorResponse(
          'INVALID_LISTING_ID',
          'Listing ID is required'
        ));
        return;
      }

      // Increment view count for the listing
      const success = await this.listingsService.incrementViews(id);
      
      if (!success) {
        res.status(404).json(createErrorResponse(
          'LISTING_NOT_FOUND',
          'Marketplace listing not found'
        ));
        return;
      }

      res.json(createSuccessResponse({ message: 'View tracked successfully' }));
    } catch (error) {
      safeLogger.error('Error in trackView:', error);
      res.status(500).json(createErrorResponse(
        'VIEW_TRACK_ERROR',
        'Failed to track view for marketplace listing',
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  };
}
