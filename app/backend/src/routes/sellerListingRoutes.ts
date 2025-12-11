import { Router, Request, Response } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { sellerListingService } from '../services/sellerListingService';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '../utils/apiResponse';
import { cachingMiddleware, rateLimitWithCache } from '../middleware/cachingMiddleware';

const router = Router();

/**
 * GET /api/marketplace/seller/listings/:walletAddress
 * Get all listings for a seller
 *
 * Note: This router is mounted at /api/marketplace/seller/listings
 * so the route path is just /:walletAddress
 */
router.get('/:walletAddress',
  rateLimitWithCache(req => `seller_listings:${req.ip}`, 60, 60), // 60 requests per minute
  cachingMiddleware.cache('sellerListings', { ttl: 60 }), // Cache for 1 minute
  async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      const { status, limit = '50', offset = '0', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      // Validate wallet address format
      if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return validationErrorResponse(res, [
          { field: 'walletAddress', message: 'Invalid wallet address format' }
        ], 'Invalid wallet address');
      }

      // Validate limit and offset
      const parsedLimit = parseInt(limit as string, 10);
      const parsedOffset = parseInt(offset as string, 10);

      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return validationErrorResponse(res, [
          { field: 'limit', message: 'Limit must be between 1 and 100' }
        ]);
      }

      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return validationErrorResponse(res, [
          { field: 'offset', message: 'Offset must be 0 or greater' }
        ]);
      }

      const result = await sellerListingService.getSellerListings(
        walletAddress,
        {
          status: status as string,
          limit: parsedLimit,
          offset: parsedOffset,
          sortBy: sortBy as string,
          sortOrder: sortOrder as 'asc' | 'desc',
        }
      );

      return successResponse(res, result, 200);
    } catch (error) {
      safeLogger.error('Error fetching seller listings:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return notFoundResponse(res, 'Seller not found');
        }
      }

      return errorResponse(
        res,
        'LISTINGS_FETCH_ERROR',
        'Failed to fetch seller listings',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  });

/**
 * POST /api/marketplace/seller/listings
 * Create a new listing
 *
 * Note: This router is mounted at /api/marketplace/seller/listings
 */
router.post('/', csrfProtection, 
  rateLimitWithCache(req => `create_listing:${req.ip}`, 10, 60), // 10 requests per minute
  cachingMiddleware.invalidate('sellerListings'),
  async (req: Request, res: Response) => {
    try {
      const listingData = req.body;

      // Validate required fields
      const requiredFields = ['walletAddress', 'title', 'description', 'price', 'categoryId'];
      const missingFields = requiredFields.filter(field => !listingData[field]);

      if (missingFields.length > 0) {
        return validationErrorResponse(res,
          missingFields.map(field => ({
            field,
            message: `${field} is required`
          })),
          'Missing required fields'
        );
      }

      // Validate wallet address
      if (!/^0x[a-fA-F0-9]{40}$/.test(listingData.walletAddress)) {
        return validationErrorResponse(res, [
          { field: 'walletAddress', message: 'Invalid wallet address format' }
        ]);
      }

      // Validate price
      const price = parseFloat(listingData.price);
      if (isNaN(price) || price < 0) {
        return validationErrorResponse(res, [
          { field: 'price', message: 'Price must be a valid positive number' }
        ]);
      }

      const listing = await sellerListingService.createListing(listingData);

      return successResponse(res, listing, 201);
    } catch (error) {
      safeLogger.error('Error creating listing:', error);

      if (error instanceof Error) {
        // Handle specific error cases
        if (error.message.includes('User not found')) {
          return notFoundResponse(res, 'User account not found');
        }
        if (error.message.includes('Seller profile not found')) {
          return errorResponse(res, 'SELLER_NOT_FOUND', error.message, 400);
        }
        if (error.message.includes('Category not found')) {
          return validationErrorResponse(res, [
            { field: 'categoryId', message: error.message }
          ]);
        }
        if (error.message.includes('invalid')) {
          return validationErrorResponse(res, [
            { field: 'general', message: error.message }
          ]);
        }
      }

      return errorResponse(
        res,
        'LISTING_CREATE_ERROR',
        'Failed to create listing',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  });

/**
 * PUT /api/marketplace/seller/listings/:listingId
 * Update an existing listing
 *
 * Note: This router is mounted at /api/marketplace/seller/listings
 */
router.put('/:listingId', csrfProtection, 
  rateLimitWithCache(req => `update_listing:${req.ip}`, 30, 60), // 30 requests per minute
  cachingMiddleware.invalidate('sellerListings'),
  async (req: Request, res: Response) => {
    try {
      const { listingId } = req.params;
      const updateData = req.body;

      // Validate listing ID (UUID format)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(listingId)) {
        return validationErrorResponse(res, [
          { field: 'listingId', message: 'Invalid listing ID format' }
        ]);
      }

      // Validate price if provided
      if (updateData.price !== undefined) {
        const price = parseFloat(updateData.price);
        if (isNaN(price) || price < 0) {
          return validationErrorResponse(res, [
            { field: 'price', message: 'Price must be a valid positive number' }
          ]);
        }
      }

      // Validate status if provided
      if (updateData.status) {
        const validStatuses = ['active', 'inactive', 'sold_out', 'suspended', 'draft'];
        if (!validStatuses.includes(updateData.status)) {
          return validationErrorResponse(res, [
            { field: 'status', message: `Status must be one of: ${validStatuses.join(', ')}` }
          ]);
        }
      }

      const listing = await sellerListingService.updateListing(listingId, updateData);

      return successResponse(res, listing, 200);
    } catch (error) {
      safeLogger.error('Error updating listing:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return notFoundResponse(res, 'Listing not found');
        }
        if (error.message.includes('not authorized')) {
          return errorResponse(res, 'NOT_AUTHORIZED', 'Not authorized to update this listing', 403);
        }
      }

      return errorResponse(
        res,
        'LISTING_UPDATE_ERROR',
        'Failed to update listing',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  });

/**
 * DELETE /api/marketplace/seller/listings/:listingId
 * Delete a listing
 *
 * Note: This router is mounted at /api/marketplace/seller/listings
 */
router.delete('/:listingId', csrfProtection, 
  rateLimitWithCache(req => `delete_listing:${req.ip}`, 20, 60), // 20 requests per minute
  cachingMiddleware.invalidate('sellerListings'),
  async (req: Request, res: Response) => {
    try {
      const { listingId } = req.params;

      // Validate listing ID (UUID format)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(listingId)) {
        return validationErrorResponse(res, [
          { field: 'listingId', message: 'Invalid listing ID format' }
        ]);
      }

      await sellerListingService.deleteListing(listingId);

      return successResponse(res, {
        message: 'Listing deleted successfully',
        listingId
      }, 200);
    } catch (error) {
      safeLogger.error('Error deleting listing:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return notFoundResponse(res, 'Listing not found');
        }
        if (error.message.includes('not authorized')) {
          return errorResponse(res, 'NOT_AUTHORIZED', 'Not authorized to delete this listing', 403);
        }
        if (error.message.includes('has active orders')) {
          return errorResponse(
            res,
            'LISTING_HAS_ORDERS',
            'Cannot delete listing with active orders',
            400
          );
        }
      }

      return errorResponse(
        res,
        'LISTING_DELETE_ERROR',
        'Failed to delete listing',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  });

/**
 * GET /api/marketplace/seller/listings/detail/:listingId
 * Get single listing details
 *
 * Note: This router is mounted at /api/marketplace/seller/listings
 */
router.get('/detail/:listingId',
  rateLimitWithCache(req => `listing_detail:${req.ip}`, 120, 60), // 120 requests per minute
  cachingMiddleware.cache('listingDetail', { ttl: 60 }), // Cache for 1 minute
  async (req: Request, res: Response) => {
    try {
      const { listingId } = req.params;

      // Validate listing ID (UUID format)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(listingId)) {
        return validationErrorResponse(res, [
          { field: 'listingId', message: 'Invalid listing ID format' }
        ]);
      }

      const listing = await sellerListingService.getListingById(listingId);

      return successResponse(res, listing, 200);
    } catch (error) {
      safeLogger.error('Error fetching listing details:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return notFoundResponse(res, 'Listing not found');
        }
      }

      return errorResponse(
        res,
        'LISTING_FETCH_ERROR',
        'Failed to fetch listing details',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  });

export default router;
