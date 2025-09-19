import { Router } from 'express';
import { ListingController } from '../controllers/listingController';
import { ListingVisibilityController } from '../controllers/listingVisibilityController';
import { ListingImageController } from '../controllers/listingImageController';
import { auth } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();
const listingController = new ListingController();
const listingVisibilityController = new ListingVisibilityController();
const listingImageController = new ListingImageController();

// Public routes (no authentication required)

/**
 * Get marketplace listings with real-time visibility
 * GET /api/listings/marketplace
 * Requirements: 3.2, 3.3
 */
router.get('/marketplace', 
  rateLimiter({ windowMs: 60000, max: 100 }), // 100 requests per minute
  listingController.getMarketplaceListings.bind(listingController)
);

/**
 * Get real-time marketplace feed
 * GET /api/listings/marketplace/real-time
 * Requirements: 3.2, 3.3
 */
router.get('/marketplace/real-time',
  rateLimiter({ windowMs: 60000, max: 200 }), // 200 requests per minute for real-time
  listingVisibilityController.getRealTimeMarketplaceFeed.bind(listingVisibilityController)
);

/**
 * Search listings with enhanced full-text search
 * GET /api/listings/search
 * Requirements: 3.2, 3.3
 */
router.get('/search',
  rateLimiter({ windowMs: 60000, max: 100 }), // 100 requests per minute
  listingController.searchListings.bind(listingController)
);

/**
 * Get listing by ID
 * GET /api/listings/:id
 * Requirements: 3.2, 3.3
 */
router.get('/:id',
  rateLimiter({ windowMs: 60000, max: 200 }), // 200 requests per minute
  listingController.getListingById.bind(listingController)
);

/**
 * Get listing statistics
 * GET /api/listings/:id/stats
 * Requirements: 3.3
 */
router.get('/:id/stats',
  rateLimiter({ windowMs: 60000, max: 100 }), // 100 requests per minute
  listingController.getListingStats.bind(listingController)
);

/**
 * Get listings by seller
 * GET /api/listings/seller/:sellerId
 * Requirements: 3.2, 3.3
 */
router.get('/seller/:sellerId',
  rateLimiter({ windowMs: 60000, max: 100 }), // 100 requests per minute
  listingController.getListingsBySeller.bind(listingController)
);

// Protected routes (authentication required)

/**
 * Create a new listing
 * POST /api/listings
 * Requirements: 3.1, 3.2, 3.4
 */
router.post('/',
  auth,
  rateLimiter({ windowMs: 60000, max: 10 }), // 10 listings per minute
  listingController.createListing.bind(listingController)
);

/**
 * Update listing
 * PUT /api/listings/:id
 * Requirements: 3.1, 3.4
 */
router.put('/:id',
  auth,
  rateLimiter({ windowMs: 60000, max: 20 }), // 20 updates per minute
  listingController.updateListing.bind(listingController)
);

/**
 * Publish a listing (change status to published)
 * POST /api/listings/:id/publish
 * Requirements: 3.2, 3.3
 */
router.post('/:id/publish',
  auth,
  rateLimiter({ windowMs: 60000, max: 20 }), // 20 publishes per minute
  listingController.publishListing.bind(listingController)
);

/**
 * Unpublish a listing (change status to inactive)
 * POST /api/listings/:id/unpublish
 * Requirements: 3.2, 3.4
 */
router.post('/:id/unpublish',
  auth,
  rateLimiter({ windowMs: 60000, max: 20 }), // 20 unpublishes per minute
  listingController.unpublishListing.bind(listingController)
);

/**
 * Validate listing data
 * POST /api/listings/validate
 * Requirements: 3.1, 3.4
 */
router.post('/validate',
  auth,
  rateLimiter({ windowMs: 60000, max: 50 }), // 50 validations per minute
  listingController.validateListing.bind(listingController)
);

// Real-time visibility routes

/**
 * Publish listing with immediate marketplace visibility
 * POST /api/listings/:id/publish-immediate
 * Requirements: 3.2, 3.3
 */
router.post('/:id/publish-immediate',
  auth,
  rateLimiter({ windowMs: 60000, max: 20 }), // 20 immediate publishes per minute
  listingVisibilityController.publishListingImmediate.bind(listingVisibilityController)
);

/**
 * Unpublish listing with immediate removal from marketplace
 * POST /api/listings/:id/unpublish-immediate
 * Requirements: 3.2, 3.4
 */
router.post('/:id/unpublish-immediate',
  auth,
  rateLimiter({ windowMs: 60000, max: 20 }), // 20 immediate unpublishes per minute
  listingVisibilityController.unpublishListingImmediate.bind(listingVisibilityController)
);

/**
 * Get publication workflow status
 * GET /api/listings/:id/publication-status
 * Requirements: 3.3
 */
router.get('/:id/publication-status',
  rateLimiter({ windowMs: 60000, max: 100 }), // 100 status checks per minute
  listingVisibilityController.getPublicationStatus.bind(listingVisibilityController)
);

/**
 * Get listing visibility metrics
 * GET /api/listings/:id/visibility-metrics
 * Requirements: 3.3
 */
router.get('/:id/visibility-metrics',
  rateLimiter({ windowMs: 60000, max: 100 }), // 100 metrics requests per minute
  listingVisibilityController.getListingVisibilityMetrics.bind(listingVisibilityController)
);

/**
 * Batch publish multiple listings
 * POST /api/listings/batch-publish
 * Requirements: 3.2, 3.3
 */
router.post('/batch-publish',
  auth,
  rateLimiter({ windowMs: 300000, max: 5 }), // 5 batch operations per 5 minutes
  listingVisibilityController.batchPublishListings.bind(listingVisibilityController)
);

/**
 * Batch unpublish multiple listings
 * POST /api/listings/batch-unpublish
 * Requirements: 3.2, 3.4
 */
router.post('/batch-unpublish',
  auth,
  rateLimiter({ windowMs: 300000, max: 5 }), // 5 batch operations per 5 minutes
  listingVisibilityController.batchUnpublishListings.bind(listingVisibilityController)
);

/**
 * Force refresh marketplace cache
 * POST /api/listings/marketplace/refresh-cache
 * Requirements: 3.2, 3.3
 */
router.post('/marketplace/refresh-cache',
  auth,
  rateLimiter({ windowMs: 300000, max: 2 }), // 2 cache refreshes per 5 minutes
  listingVisibilityController.refreshMarketplaceCache.bind(listingVisibilityController)
);

// Listing image routes

/**
 * Upload multiple images for a listing
 * POST /api/listings/:id/images
 * Requirements: 2.1, 3.1, 3.4
 */
router.post('/:id/images',
  auth,
  rateLimiter({ windowMs: 60000, max: 10 }), // 10 image uploads per minute
  listingImageController.getUploadMiddleware(),
  listingImageController.uploadImages.bind(listingImageController)
);

/**
 * Get all images for a listing
 * GET /api/listings/:id/images
 * Requirements: 2.1, 3.1, 3.4
 */
router.get('/:id/images',
  rateLimiter({ windowMs: 60000, max: 100 }), // 100 requests per minute
  listingImageController.getListingImages.bind(listingImageController)
);

/**
 * Get image gallery data for display
 * GET /api/listings/:id/images/gallery
 * Requirements: 3.1, 3.4
 */
router.get('/:id/images/gallery',
  rateLimiter({ windowMs: 60000, max: 100 }), // 100 requests per minute
  listingImageController.getImageGalleryData.bind(listingImageController)
);

/**
 * Get optimized image URLs for specific context
 * GET /api/listings/:id/images/optimized
 * Requirements: 2.1, 3.4
 */
router.get('/:id/images/optimized',
  rateLimiter({ windowMs: 60000, max: 200 }), // 200 requests per minute
  listingImageController.getOptimizedImages.bind(listingImageController)
);

/**
 * Set primary image for listing
 * PUT /api/listings/:id/images/primary
 * Requirements: 2.1, 3.1, 3.4
 */
router.put('/:id/images/primary',
  auth,
  rateLimiter({ windowMs: 60000, max: 20 }), // 20 updates per minute
  listingImageController.setPrimaryImage.bind(listingImageController)
);

/**
 * Reorder images in listing gallery
 * PUT /api/listings/:id/images/reorder
 * Requirements: 2.1, 3.1, 3.4
 */
router.put('/:id/images/reorder',
  auth,
  rateLimiter({ windowMs: 60000, max: 20 }), // 20 reorders per minute
  listingImageController.reorderImages.bind(listingImageController)
);

/**
 * Get image display URLs for different sizes
 * GET /api/listings/:id/images/:imageId/urls
 * Requirements: 2.1, 3.4
 */
router.get('/:id/images/:imageId/urls',
  rateLimiter({ windowMs: 60000, max: 200 }), // 200 requests per minute
  listingImageController.getImageUrls.bind(listingImageController)
);

/**
 * Delete image from listing
 * DELETE /api/listings/:id/images/:imageId
 * Requirements: 2.1, 3.1, 3.4
 */
router.delete('/:id/images/:imageId',
  auth,
  rateLimiter({ windowMs: 60000, max: 20 }), // 20 deletions per minute
  listingImageController.deleteImage.bind(listingImageController)
);

/**
 * Batch process images for multiple listings
 * POST /api/listings/images/batch
 * Requirements: 2.1, 3.1
 */
router.post('/images/batch',
  auth,
  rateLimiter({ windowMs: 300000, max: 5 }), // 5 batch operations per 5 minutes
  listingImageController.batchProcessImages.bind(listingImageController)
);

// Blockchain integration routes

/**
 * Publish listing to blockchain marketplace
 * POST /api/listings/:id/publish-blockchain
 * Requirements: Blockchain integration
 */
router.post('/:id/publish-blockchain',
  auth,
  rateLimiter({ windowMs: 60000, max: 10 }), // 10 blockchain publishes per minute
  listingController.publishToBlockchain.bind(listingController)
);

/**
 * Sync listing with blockchain
 * POST /api/listings/:id/sync-blockchain
 * Requirements: Blockchain synchronization
 */
router.post('/:id/sync-blockchain',
  auth,
  rateLimiter({ windowMs: 60000, max: 20 }), // 20 sync operations per minute
  listingController.syncWithBlockchain.bind(listingController)
);

/**
 * Get blockchain data for listing
 * GET /api/listings/:id/blockchain-data
 * Requirements: Blockchain data access
 */
router.get('/:id/blockchain-data',
  rateLimiter({ windowMs: 60000, max: 100 }), // 100 blockchain data requests per minute
  listingController.getBlockchainData.bind(listingController)
);

export default router;