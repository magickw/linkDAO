import request from 'supertest';
import app from '../index';
import { generateToken } from '../middleware/authMiddleware';

// Mock the indexer service to prevent it from running during tests
jest.mock('../services/indexerService', () => {
  return {
    IndexerService: jest.fn().mockImplementation(() => {
      return {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined)
      };
    })
  };
});

// Mock the WebSocket server
jest.mock('socket.io', () => {
  return {
    Server: jest.fn().mockImplementation(() => {
      return {
        on: jest.fn(),
        close: jest.fn()
      };
    })
  };
});

describe('Marketplace API', () => {
  const testSellerAddress = '0x1234567890123456789012345678901234567890';
  const testBuyerAddress = '0xabcdef1234567890abcdef1234567890abcdef12';
  const testToken = generateToken(testSellerAddress);

  // Set a longer timeout for tests
  jest.setTimeout(30000);

  describe('POST /api/marketplace/listings', () => {
    it('should create a new fixed price listing', async () => {
      const listingData = {
        sellerAddress: testSellerAddress,
        tokenAddress: '0x0000000000000000000000000000000000000000',
        price: '1000000000000000000',
        quantity: 5,
        itemType: 'DIGITAL',
        listingType: 'FIXED_PRICE',
        metadataURI: 'ipfs://test-metadata'
      };

      const response = await request(app)
        .post('/api/marketplace/listings')
        .set('Authorization', `Bearer ${testToken}`)
        .send(listingData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.sellerAddress).toBe(testSellerAddress);
      expect(response.body.price).toBe(listingData.price);
      expect(response.body.quantity).toBe(listingData.quantity);
    });

    it('should create a new auction listing', async () => {
      const listingData = {
        sellerAddress: testSellerAddress,
        tokenAddress: '0x0000000000000000000000000000000000000000',
        price: '1000000000000000000',
        quantity: 1,
        itemType: 'NFT',
        listingType: 'AUCTION',
        duration: 86400,
        metadataURI: 'ipfs://test-metadata'
      };

      const response = await request(app)
        .post('/api/marketplace/listings')
        .set('Authorization', `Bearer ${testToken}`)
        .send(listingData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.listingType).toBe('AUCTION');
      expect(response.body.endTime).toBeDefined();
    });

    it('should return 400 for invalid listing data', async () => {
      const invalidListingData = {
        sellerAddress: testSellerAddress,
        // Missing required fields
      };

      await request(app)
        .post('/api/marketplace/listings')
        .set('Authorization', `Bearer ${testToken}`)
        .send(invalidListingData)
        .expect(400);
    });
  });

  describe('GET /api/marketplace/listings', () => {
    it('should retrieve all active listings', async () => {
      // Create a listing first
      const listingData = {
        sellerAddress: testSellerAddress,
        tokenAddress: '0x0000000000000000000000000000000000000000',
        price: '1000000000000000000',
        quantity: 5,
        itemType: 'DIGITAL',
        listingType: 'FIXED_PRICE',
        metadataURI: 'ipfs://test-metadata'
      };

      await request(app)
        .post('/api/marketplace/listings')
        .set('Authorization', `Bearer ${testToken}`)
        .send(listingData);

      const response = await request(app)
        .get('/api/marketplace/listings')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/marketplace/listings/:id', () => {
    it('should retrieve a specific listing by ID', async () => {
      // Create a listing first
      const listingData = {
        sellerAddress: testSellerAddress,
        tokenAddress: '0x0000000000000000000000000000000000000000',
        price: '1000000000000000000',
        quantity: 5,
        itemType: 'DIGITAL',
        listingType: 'FIXED_PRICE',
        metadataURI: 'ipfs://test-metadata'
      };

      const createResponse = await request(app)
        .post('/api/marketplace/listings')
        .set('Authorization', `Bearer ${testToken}`)
        .send(listingData);

      const listingId = createResponse.body.id;

      const response = await request(app)
        .get(`/api/marketplace/listings/${listingId}`)
        .expect(200);

      expect(response.body.id).toBe(listingId);
      expect(response.body.sellerAddress).toBe(testSellerAddress);
    });

    it('should return 404 for non-existent listing', async () => {
      await request(app)
        .get('/api/marketplace/listings/999999')
        .expect(404);
    });
  });

  describe('PUT /api/marketplace/listings/:id', () => {
    it('should update a listing', async () => {
      // Create a listing first
      const listingData = {
        sellerAddress: testSellerAddress,
        tokenAddress: '0x0000000000000000000000000000000000000000',
        price: '1000000000000000000',
        quantity: 5,
        itemType: 'DIGITAL',
        listingType: 'FIXED_PRICE',
        metadataURI: 'ipfs://test-metadata'
      };

      const createResponse = await request(app)
        .post('/api/marketplace/listings')
        .set('Authorization', `Bearer ${testToken}`)
        .send(listingData);

      const listingId = createResponse.body.id;

      // Update the listing
      const updateData = {
        price: '2000000000000000000',
        quantity: 3
      };

      const response = await request(app)
        .put(`/api/marketplace/listings/${listingId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.price).toBe(updateData.price);
      expect(response.body.quantity).toBe(updateData.quantity);
    });
  });

  describe('POST /api/marketplace/bids/listing/:listingId', () => {
    it('should place a bid on an auction listing', async () => {
      // Create an auction listing first
      const listingData = {
        sellerAddress: testSellerAddress,
        tokenAddress: '0x0000000000000000000000000000000000000000',
        price: '1000000000000000000',
        quantity: 1,
        itemType: 'NFT',
        listingType: 'AUCTION',
        duration: 86400,
        metadataURI: 'ipfs://test-metadata'
      };

      const createResponse = await request(app)
        .post('/api/marketplace/listings')
        .set('Authorization', `Bearer ${testToken}`)
        .send(listingData);

      const listingId = createResponse.body.id;

      // Place a bid
      const bidData = {
        bidderAddress: testBuyerAddress,
        amount: '1500000000000000000'
      };

      const response = await request(app)
        .post(`/api/marketplace/bids/listing/${listingId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(bidData)
        .expect(201);

      expect(response.body.bidderAddress).toBe(testBuyerAddress);
      expect(response.body.amount).toBe(bidData.amount);
    });
  });

  describe('GET /api/marketplace/reputation/:address', () => {
    it('should retrieve user reputation', async () => {
      const response = await request(app)
        .get(`/api/marketplace/reputation/${testSellerAddress}`)
        .expect(200);

      expect(response.body).toHaveProperty('address');
      expect(response.body).toHaveProperty('score');
      expect(response.body).toHaveProperty('daoApproved');
    });
  });
});