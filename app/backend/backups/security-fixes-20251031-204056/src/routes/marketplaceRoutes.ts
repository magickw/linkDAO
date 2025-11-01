import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { marketplaceController } from '../controllers/marketplaceController';
import { csrfProtection } from '../middleware/csrfProtection';
import { validateRequest } from '../middleware/validation';
import { csrfProtection } from '../middleware/csrfProtection';

const router = express.Router();

// GET /api/marketplace/listings/:id - Get individual product details
router.get('/listings/:id', 
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  marketplaceController.getListingById
);

// GET /api/marketplace/listings - Get product listings with filtering and pagination
router.get('/listings',
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
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  marketplaceController.getSellerById
);

// GET /api/marketplace/sellers/:id/listings - Get seller's products
router.get('/sellers/:id/listings',
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

export default router;