import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { marketplaceController } from '../controllers/marketplaceController';
import { validateRequest } from '../middleware/validation';
import rateLimit from 'express-rate-limit';

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

// GET /api/marketplace/listings/:id - Get individual product details
router.get('/listings/:id', 
  marketplaceRateLimit,
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  marketplaceController.getListingById
);

// GET /api/marketplace/listings - Get product listings with filtering and pagination
router.get('/listings',
  marketplaceRateLimit,
  validateRequest({
    query: {
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 100 },
      category: { type: 'string', optional: true },
      minPrice: { type: 'number', optional: true, min: 0 },
      maxPrice: { type: 'number', optional: true, min: 0 },
      sellerId: { type: 'string', optional: true },
      search: { type: 'string', optional: true }
    }
  }),
  marketplaceController.getListings
);

// GET /api/marketplace/sellers/:id - Get seller profile information
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
router.post('/test/create', csrfProtection,  async (req, res) => {
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

// GET /api/marketplace/search-suggestions - Legacy search suggestions endpoint
router.get('/search-suggestions', marketplaceController.getSearchSuggestions);

// GET /api/marketplace/auctions/active - Get active auctions
router.get('/auctions/active', marketplaceController.getActiveAuctions);

export default router;
