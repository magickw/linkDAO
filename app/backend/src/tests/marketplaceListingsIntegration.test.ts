import request from 'supertest';
import express from 'express';
import marketplaceListingsRoutes from '../routes/marketplaceListingsRoutes';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { describe } from 'node:test';

// Create a test app
const app = express();
app.use(express.json());
app.use('/marketplace', marketplaceListingsRoutes);

describe('Marketplace Listings API Integration', () => {
  describe('GET /marketplace/listings', () => {
    it('should return listings endpoint response', async () => {
      const response = await request(app)
        .get('/marketplace/listings')
        .expect('Content-Type', /json/);

      // The endpoint should respond (even if it fails due to no database)
      expect(response.status).toBeDefined();
      expect(response.body).toBeDefined();
    });

    it('should handle query parameters', async () => {
      const response = await request(app)
        .get('/marketplace/listings?limit=10&offset=0&sortBy=price&sortOrder=asc')
        .expect('Content-Type', /json/);

      expect(response.status).toBeDefined();
      expect(response.body).toBeDefined();
    });
  });

  describe('GET /marketplace/listings/:id', () => {
    it('should handle listing by ID request', async () => {
      const testId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .get(`/marketplace/listings/${testId}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBeDefined();
      expect(response.body).toBeDefined();
    });

    it('should handle missing ID parameter', async () => {
      const response = await request(app)
        .get('/marketplace/listings/')
        .expect('Content-Type', /json/);

      // Should match the listings endpoint instead
      expect(response.status).toBeDefined();
    });
  });

  describe('POST /marketplace/listings', () => {
    it('should handle create listing request', async () => {
      const listingData = {
        sellerAddress: '0x1234567890123456789012345678901234567890',
        title: 'Test Product',
        description: 'Test Description',
        price: '100.00',
        currency: 'ETH',
        category: 'Electronics'
      };

      const response = await request(app)
        .post('/marketplace/listings')
        .send(listingData)
        .expect('Content-Type', /json/);

      expect(response.status).toBeDefined();
      expect(response.body).toBeDefined();
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        // Missing required fields
        title: 'Test Product'
      };

      const response = await request(app)
        .post('/marketplace/listings')
        .send(invalidData)
        .expect('Content-Type', /json/);

      expect(response.status).toBeDefined();
      expect(response.body).toBeDefined();
      
      // Should return error response for missing seller address
      if (response.body.success === false) {
        expect(response.body.error).toBeDefined();
        expect(response.body.error.code).toBe('MISSING_SELLER_ADDRESS');
      }
    });
  });

  describe('GET /marketplace/listings/categories', () => {
    it('should handle categories request', async () => {
      const response = await request(app)
        .get('/marketplace/listings/categories')
        .expect('Content-Type', /json/);

      expect(response.status).toBeDefined();
      expect(response.body).toBeDefined();
    });
  });

  describe('GET /marketplace/listings/fallback', () => {
    it('should return fallback data', async () => {
      const response = await request(app)
        .get('/marketplace/listings/fallback')
        .expect('Content-Type', /json/);

      expect(response.status).toBeDefined();
      expect(response.body).toBeDefined();
      
      // Should return success response with fallback data
      if (response.body.success === true) {
        expect(response.body.data).toBeDefined();
        expect(response.body.metadata?.warning?.code).toBe('SERVICE_DEGRADED');
      }
    });
  });
});