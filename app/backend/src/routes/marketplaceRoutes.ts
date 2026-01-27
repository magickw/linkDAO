import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { marketplaceController } from '../controllers/marketplaceController';
import { validateRequest } from '../middleware/validation';
import rateLimit from 'express-rate-limit';
import { sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

// Rate limiting for marketplace endpoints
const marketplaceRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute
  message: {
    success: false,
    error: {
      code: 'MARKETPLACE_RATE_LIMIT_EXCEEDED',
      message: 'Too many marketplace requests, please try again later',
    }
  }
});

const router = express.Router();

// REMOVED: Conflicting /listings/:id route that duplicates functionality in marketplaceListingsRoutes.ts
// Individual listing details are now handled by marketplaceListingsRoutes.ts which is mounted at /api/marketplace/listings

/**
 * @route GET /marketplace/sellers/:id - Get seller profile information
 */
router.get('/sellers/:id',
  marketplaceRateLimit,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  marketplaceController.getSellerById
);

// GET /api/marketplace/sellers/:id/listings - Get seller's products
router.get('/sellers/:id/listings',
  marketplaceRateLimit,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    query: {
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 100 }
    }
  }),
  marketplaceController.getSellerListings
);

// GET /api/marketplace/search - Search products and sellers
router.get('/search',
  marketplaceRateLimit,
  validateRequest({
    query: {
      q: { type: 'string', required: true, minLength: 1 },
      type: { type: 'string', optional: true, enum: ['products', 'sellers', 'all'] },
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 100 },
      category: { type: 'string', optional: true },
      minPrice: { type: 'number', optional: true, min: 0 },
      maxPrice: { type: 'number', optional: true, min: 0 }
    }
  }),
  marketplaceController.searchMarketplace
);

// GET /api/marketplace/test - Test endpoint to verify controller is working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Marketplace controller is working',
    timestamp: new Date().toISOString()
  });
});

// POST /api/marketplace/test/create - Create a test product
router.post('/test/create', csrfProtection, async (req, res) => {
  try {
    // This is a simplified test endpoint to create a product
    res.json({
      success: true,
      message: 'Test product creation endpoint',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create test product'
      }
    });
  }
});

// GET /api/marketplace/test/db - Test database connection
router.get('/test/db', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Database connection test endpoint',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Database connection test failed'
      }
    });
  }
});

// GET /api/marketplace/health - Health check endpoint for marketplace service
router.get('/health', async (req, res) => {
  try {
    // Test database connection
    const { db } = await import('../db');
    if (!db) {
      return res.status(503).json({
        success: false,
        status: 'unhealthy',
        service: 'marketplace',
        error: 'Database connection unavailable',
        timestamp: new Date().toISOString(),
        recommendation: 'Check DATABASE_URL environment variable and database connectivity'
      });
    }

    // Test a simple query with better error handling
    try {
      await db.execute(sql`SELECT 1`);
    } catch (dbError) {
      return res.status(503).json({
        success: false,
        status: 'unhealthy',
        service: 'marketplace',
        error: 'Database query failed',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined,
        timestamp: new Date().toISOString(),
        recommendation: 'Check database connection and credentials'
      });
    }

    // Test marketplace service with the new health check method
    try {
      const { marketplaceService } = await import('../services/marketplaceService');
      const healthCheck = await marketplaceService.healthCheck();

      if (!healthCheck.healthy) {
        return res.status(503).json({
          success: false,
          status: 'unhealthy',
          service: 'marketplace',
          error: 'Marketplace service failed',
          details: process.env.NODE_ENV === 'development' ? healthCheck.error : undefined,
          timestamp: new Date().toISOString(),
          recommendation: 'Check marketplace service implementation and dependencies'
        });
      }
    } catch (serviceError) {
      return res.status(503).json({
        success: false,
        status: 'unhealthy',
        service: 'marketplace',
        error: 'Marketplace service failed',
        details: process.env.NODE_ENV === 'development' ? serviceError.message : undefined,
        timestamp: new Date().toISOString(),
        recommendation: 'Check marketplace service implementation'
      });
    }

    res.status(200).json({
      success: true,
      status: 'healthy',
      service: 'marketplace',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      service: 'marketplace',
      error: 'Health check failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
      recommendation: 'Check server logs for detailed error information'
    });
  }
});

// GET /api/marketplace/search-suggestions - Legacy search suggestions endpoint
router.get('/search-suggestions', marketplaceController.getSearchSuggestions);

// GET /api/marketplace/auctions/active - Get active auctions
router.get('/auctions/active', marketplaceController.getActiveAuctions);

// GET /api/marketplace/stats - Get marketplace statistics
router.get('/stats', async (req, res) => {
  try {
    const listingsService = new (await import('../services/marketplaceListingsService')).MarketplaceListingsService();

    // Get total listings count
    const listingsResult = await listingsService.getListings({ limit: 1, offset: 0 });

    // Get categories
    const categories = await listingsService.getCategories();

    res.json({
      success: true,
      data: {
        totalListings: listingsResult.total,
        totalCategories: categories.length,
        categories: categories.slice(0, 10), // Top 10 categories
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    safeLogger.error('Error getting marketplace stats:', error);

    // Return graceful fallback
    res.status(200).json({
      success: true,
      data: {
        totalListings: 0,
        totalCategories: 0,
        categories: [],
        timestamp: new Date().toISOString(),
        message: 'Marketplace service temporarily unavailable'
      }
    });
  }
});

// GET /api/marketplace/inventory/:listingId - Check inventory availability
router.get('/inventory/:listingId', marketplaceController.checkInventoryAvailability);

export default router;
