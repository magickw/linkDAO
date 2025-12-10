import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { MarketplaceListingsController } from '../controllers/marketplaceListingsController';
import { cachingMiddleware, rateLimitWithCache } from '../middleware/cachingMiddleware';

const router = Router();
const controller = new MarketplaceListingsController();

/**
 * @route GET /marketplace/listings
 * @desc Get paginated marketplace listings with filtering and sorting
 * @query {number} limit - Number of listings per page (default: 20)
 * @query {number} offset - Number of listings to skip (default: 0)
 * @query {string} sortBy - Field to sort by: createdAt, price, title (default: createdAt)
 * @query {string} sortOrder - Sort order: asc, desc (default: desc)
 * @query {string} category - Filter by category
 * @query {string} priceMin - Minimum price filter
 * @query {string} priceMax - Maximum price filter
 * @query {string} sellerAddress - Filter by seller address
 * @query {boolean} isActive - Filter by active status (default: true)
 * @query {string} search - Search term for title/description
 */
router.get('/listings', 
  rateLimitWithCache(req => `listings:${req.ip}`, 1000, 60), // 1000 requests per minute - increased for Service Worker
  cachingMiddleware.listingsCache(),
  controller.getListings
);

/**
 * @route GET /marketplace/listings/categories
 * @desc Get available categories with listing counts
 */
router.get('/listings/categories',
  rateLimitWithCache(req => `categories:${req.ip}`, 500, 60), // 500 requests per minute - increased for Service Worker
  cachingMiddleware.cache('default', { ttl: 600 }), // Cache categories for 10 minutes
  controller.getCategories
);

/**
 * @route GET /marketplace/listings/fallback
 * @desc Fallback endpoint when enhanced marketplace service fails
 */
router.get('/listings/fallback', controller.getFallbackListings);

/**
 * @route GET /marketplace/listings/:id
 * @desc Get a single marketplace listing by ID
 * @param {string} id - Listing ID
 */
router.get('/listings/:id',
  rateLimitWithCache(req => `listing_detail:${req.ip}`, 300, 60), // 300 requests per minute - increased for Service Worker
  cachingMiddleware.cache('default', { 
    ttl: 300,
    keyGenerator: (req) => `listing:${req.params.id}`
  }),
  controller.getListingById
);

/**
 * @route POST /marketplace/listings
 * @desc Create a new marketplace listing
 * @body {string} sellerAddress - Seller's wallet address
 * @body {string} title - Listing title
 * @body {string} description - Listing description (optional)
 * @body {string} price - Listing price
 * @body {string} currency - Price currency (optional, default: ETH)
 * @body {string[]} images - Array of image URLs/IPFS hashes (optional)
 * @body {string} category - Listing category (optional)
 */
router.post('/listings', csrfProtection,  controller.createListing);

/**
 * @route PUT /marketplace/listings/:id
 * @desc Update an existing marketplace listing
 * @param {string} id - Listing ID
 * @body {string} sellerAddress - Seller's wallet address (for authorization)
 * @body {string} title - Listing title (optional)
 * @body {string} description - Listing description (optional)
 * @body {string} price - Listing price (optional)
 * @body {string} currency - Price currency (optional)
 * @body {string[]} images - Array of image URLs/IPFS hashes (optional)
 * @body {string} category - Listing category (optional)
 * @body {boolean} isActive - Active status (optional)
 */
router.put('/listings/:id', csrfProtection,  controller.updateListing);

/**
 * @route DELETE /marketplace/listings/:id
 * @desc Delete (deactivate) a marketplace listing
 * @param {string} id - Listing ID
 * @body {string} sellerAddress - Seller's wallet address (for authorization)
 */
router.delete('/listings/:id', csrfProtection,  controller.deleteListing);

/**
 * @route POST /marketplace/listings/:id/view
 * @desc Track a view for a marketplace listing
 * @param {string} id - Listing ID
 */
router.post('/listings/:id/view', controller.trackView);

export default router;
