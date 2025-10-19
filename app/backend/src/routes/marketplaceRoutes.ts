import express from 'express';
import { marketplaceController } from '../controllers/marketplaceController';
import { validateRequest } from '../middleware/validation';

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

export default router;