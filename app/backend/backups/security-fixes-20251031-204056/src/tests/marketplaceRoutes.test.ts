import request from 'supertest';
import express from 'express';
import marketplaceRoutes from '../routes/marketplaceRoutes';
import { marketplaceController } from '../controllers/marketplaceController';

// Mock the controller
jest.mock('../controllers/marketplaceController', () => ({
  marketplaceController: {
    getListingById: jest.fn(),
    getListings: jest.fn(),
    getSellerById: jest.fn(),
    getSellerListings: jest.fn(),
    searchMarketplace: jest.fn()
  }
}));

describe('Marketplace Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/marketplace', marketplaceRoutes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/marketplace/listings/:id', () => {
    it('should call getListingById controller', async () => {
      const mockController = marketplaceController.getListingById as jest.Mock;
      mockController.mockImplementation((req, res) => {
        res.json({ success: true, data: { id: 'test-id' } });
      });

      const response = await request(app)
        .get('/api/marketplace/listings/test-id')
        .expect(200);

      expect(mockController).toHaveBeenCalled();
      expect(response.body.success).toBe(true);
    });

    it('should validate required id parameter', async () => {
      const response = await request(app)
        .get('/api/marketplace/listings/')
        .expect(404); // Express will return 404 for missing route parameter
    });
  });

  describe('GET /api/marketplace/listings', () => {
    it('should call getListings controller', async () => {
      const mockController = marketplaceController.getListings as jest.Mock;
      mockController.mockImplementation((req, res) => {
        res.json({ success: true, data: [] });
      });

      const response = await request(app)
        .get('/api/marketplace/listings')
        .expect(200);

      expect(mockController).toHaveBeenCalled();
      expect(response.body.success).toBe(true);
    });

    it('should accept valid query parameters', async () => {
      const mockController = marketplaceController.getListings as jest.Mock;
      mockController.mockImplementation((req, res) => {
        res.json({ success: true, data: [] });
      });

      await request(app)
        .get('/api/marketplace/listings?page=1&limit=20&category=electronics')
        .expect(200);

      expect(mockController).toHaveBeenCalled();
    });
  });

  describe('GET /api/marketplace/sellers/:id', () => {
    it('should call getSellerById controller', async () => {
      const mockController = marketplaceController.getSellerById as jest.Mock;
      mockController.mockImplementation((req, res) => {
        res.json({ success: true, data: { id: 'seller-id' } });
      });

      const response = await request(app)
        .get('/api/marketplace/sellers/0x1234567890123456789012345678901234567890')
        .expect(200);

      expect(mockController).toHaveBeenCalled();
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/marketplace/sellers/:id/listings', () => {
    it('should call getSellerListings controller', async () => {
      const mockController = marketplaceController.getSellerListings as jest.Mock;
      mockController.mockImplementation((req, res) => {
        res.json({ success: true, data: [] });
      });

      const response = await request(app)
        .get('/api/marketplace/sellers/0x1234567890123456789012345678901234567890/listings')
        .expect(200);

      expect(mockController).toHaveBeenCalled();
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/marketplace/search', () => {
    it('should call searchMarketplace controller with valid query', async () => {
      const mockController = marketplaceController.searchMarketplace as jest.Mock;
      mockController.mockImplementation((req, res) => {
        res.json({ success: true, data: { results: { products: [], sellers: [] } } });
      });

      const response = await request(app)
        .get('/api/marketplace/search?q=test')
        .expect(200);

      expect(mockController).toHaveBeenCalled();
      expect(response.body.success).toBe(true);
    });

    it('should require search query parameter', async () => {
      const response = await request(app)
        .get('/api/marketplace/search')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});