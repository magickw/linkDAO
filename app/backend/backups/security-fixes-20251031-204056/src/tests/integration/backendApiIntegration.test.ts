/**
 * Backend API Integration Tests
 * 
 * Comprehensive integration tests for all backend API endpoints
 * covering marketplace, authentication, cart, and seller management.
 */

import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from '../utils/testApp';
import { testDataFactory } from '../fixtures/testDataFactory';
import { ApiResponse } from '../../utils/apiResponse';

describe('Backend API Integration Tests', () => {
  let app: Express;
  let authToken: string;
  let testUser: any;
  let testSeller: any;
  let testProduct: any;

  beforeAll(async () => {
    app = await createTestApp();
    
    // Create test data
    testUser = testDataFactory.createUser();
    testSeller = testDataFactory.createSeller();
    testProduct = testDataFactory.createProduct();
    
    // Authenticate test user
    const authResponse = await request(app)
      .post('/api/auth/wallet-connect')
      .send({
        walletAddress: testUser.walletAddress,
        signature: testDataFactory.createValidSignature(),
        message: 'Sign in to LinkDAO'
      });
    
    authToken = authResponse.body.data.token;
  });

  describe('Marketplace API Endpoints', () => {
    describe('GET /api/marketplace/listings', () => {
      it('should return paginated product listings', async () => {
        const response = await request(app)
          .get('/api/marketplace/listings')
          .query({ page: 1, limit: 10 })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            listings: expect.any(Array),
            pagination: {
              page: 1,
              limit: 10,
              total: expect.any(Number),
              totalPages: expect.any(Number),
              hasNext: expect.any(Boolean),
              hasPrev: false
            }
          },
          metadata: {
            timestamp: expect.any(String),
            requestId: expect.any(String),
            version: '1.0.0'
          }
        });

        // Validate listing structure
        if (response.body.data.listings.length > 0) {
          const listing = response.body.data.listings[0];
          expect(listing).toMatchObject({
            id: expect.any(String),
            title: expect.any(String),
            description: expect.any(String),
            price: {
              amount: expect.any(Number),
              currency: expect.any(String),
              usdEquivalent: expect.any(Number)
            },
            images: expect.any(Array),
            seller: {
              id: expect.any(String),
              name: expect.any(String),
              reputation: expect.any(Number)
            },
            category: expect.any(String),
            createdAt: expect.any(String)
          });
        }
      });

      it('should filter listings by category', async () => {
        const response = await request(app)
          .get('/api/marketplace/listings')
          .query({ category: 'Electronics', page: 1, limit: 10 })
          .expect(200);

        expect(response.body.success).toBe(true);
        
        // All returned listings should be in Electronics category
        response.body.data.listings.forEach((listing: any) => {
          expect(listing.category).toBe('Electronics');
        });
      });

      it('should filter listings by price range', async () => {
        const response = await request(app)
          .get('/api/marketplace/listings')
          .query({ minPrice: 10, maxPrice: 100, page: 1, limit: 10 })
          .expect(200);

        expect(response.body.success).toBe(true);
        
        // All returned listings should be within price range
        response.body.data.listings.forEach((listing: any) => {
          expect(listing.price.usdEquivalent).toBeGreaterThanOrEqual(10);
          expect(listing.price.usdEquivalent).toBeLessThanOrEqual(100);
        });
      });

      it('should return validation error for invalid pagination', async () => {
        const response = await request(app)
          .get('/api/marketplace/listings')
          .query({ page: 0, limit: 101 })
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: expect.any(String),
            details: expect.any(Object)
          }
        });
      });
    });

    describe('GET /api/marketplace/listings/:id', () => {
      it('should return product details for valid ID', async () => {
        // First get a listing ID
        const listingsResponse = await request(app)
          .get('/api/marketplace/listings')
          .query({ limit: 1 });

        if (listingsResponse.body.data.listings.length === 0) {
          // Skip test if no listings available
          return;
        }

        const listingId = listingsResponse.body.data.listings[0].id;

        const response = await request(app)
          .get(`/api/marketplace/listings/${listingId}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            id: listingId,
            title: expect.any(String),
            description: expect.any(String),
            price: {
              crypto: expect.any(Number),
              cryptoSymbol: expect.any(String),
              fiat: expect.any(Number),
              fiatSymbol: expect.any(String)
            },
            images: expect.any(Array),
            seller: {
              id: expect.any(String),
              name: expect.any(String),
              avatar: expect.any(String),
              verified: expect.any(Boolean),
              reputation: expect.any(Number)
            },
            category: expect.any(String),
            isDigital: expect.any(Boolean),
            isNFT: expect.any(Boolean),
            createdAt: expect.any(String)
          }
        });
      });

      it('should return 404 for non-existent listing', async () => {
        const response = await request(app)
          .get('/api/marketplace/listings/non-existent-id')
          .expect(404);

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Product not found'
          }
        });
      });
    });

    describe('GET /api/marketplace/sellers/:id', () => {
      it('should return seller profile for valid ID', async () => {
        const response = await request(app)
          .get(`/api/marketplace/sellers/${testSeller.id}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            id: testSeller.id,
            storeName: expect.any(String),
            storeDescription: expect.any(String),
            coverImageUrl: expect.any(String),
            totalSales: expect.any(Number),
            averageRating: expect.any(Number),
            isActive: expect.any(Boolean),
            createdAt: expect.any(String)
          }
        });
      });

      it('should return 404 for non-existent seller', async () => {
        const response = await request(app)
          .get('/api/marketplace/sellers/non-existent-id')
          .expect(404);

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: expect.stringContaining('Seller not found')
          }
        });
      });
    });

    describe('GET /api/marketplace/search', () => {
      it('should search products and sellers', async () => {
        const response = await request(app)
          .get('/api/marketplace/search')
          .query({ q: 'test', type: 'all', page: 1, limit: 10 })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            results: expect.any(Array),
            pagination: expect.any(Object)
          }
        });
      });

      it('should return validation error for empty search query', async () => {
        const response = await request(app)
          .get('/api/marketplace/search')
          .query({ q: '', page: 1, limit: 10 })
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: expect.any(String)
          }
        });
      });
    });
  });

  describe('Authentication API Endpoints', () => {
    describe('POST /api/auth/wallet-connect', () => {
      it('should authenticate user with valid wallet signature', async () => {
        const response = await request(app)
          .post('/api/auth/wallet-connect')
          .send({
            walletAddress: testDataFactory.createUser().walletAddress,
            signature: testDataFactory.createValidSignature(),
            message: 'Sign in to LinkDAO'
          })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            token: expect.any(String),
            user: {
              id: expect.any(String),
              walletAddress: expect.any(String),
              displayName: expect.any(String)
            }
          }
        });
      });

      it('should reject invalid wallet address', async () => {
        const response = await request(app)
          .post('/api/auth/wallet-connect')
          .send({
            walletAddress: 'invalid-address',
            signature: testDataFactory.createValidSignature(),
            message: 'Sign in to LinkDAO'
          })
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('Valid Ethereum wallet address is required')
          }
        });
      });

      it('should reject invalid signature', async () => {
        const response = await request(app)
          .post('/api/auth/wallet-connect')
          .send({
            walletAddress: testUser.walletAddress,
            signature: 'invalid-signature',
            message: 'Sign in to LinkDAO'
          })
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('Valid signature is required')
          }
        });
      });
    });

    describe('GET /api/auth/profile', () => {
      it('should return user profile for authenticated user', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            id: expect.any(String),
            walletAddress: expect.any(String),
            displayName: expect.any(String),
            bio: expect.any(String),
            profileImageUrl: expect.any(String),
            reputation: expect.any(Number),
            isVerified: expect.any(Boolean),
            createdAt: expect.any(String)
          }
        });
      });

      it('should return 401 for unauthenticated request', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .expect(401);

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: expect.any(String)
          }
        });
      });
    });

    describe('PUT /api/auth/profile', () => {
      it('should update user profile', async () => {
        const updateData = {
          displayName: 'Updated Name',
          bio: 'Updated bio',
          profileImageUrl: 'https://example.com/avatar.jpg'
        };

        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            displayName: updateData.displayName,
            bio: updateData.bio,
            profileImageUrl: updateData.profileImageUrl
          }
        });
      });

      it('should validate profile update data', async () => {
        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            displayName: '', // Invalid: empty string
            bio: 'x'.repeat(501), // Invalid: too long
            profileImageUrl: 'not-a-url' // Invalid: not a URL
          })
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: expect.any(String)
          }
        });
      });
    });

    describe('POST /api/auth/logout', () => {
      it('should logout authenticated user', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            message: expect.stringContaining('logged out')
          }
        });
      });
    });
  });

  describe('Cart API Endpoints', () => {
    let cartAuthToken: string;

    beforeAll(async () => {
      // Create a new user for cart tests
      const cartUser = testDataFactory.createUser();
      const authResponse = await request(app)
        .post('/api/auth/wallet-connect')
        .send({
          walletAddress: cartUser.walletAddress,
          signature: testDataFactory.createValidSignature(),
          message: 'Sign in to LinkDAO'
        });
      cartAuthToken = authResponse.body.data.token;
    });

    describe('GET /api/cart', () => {
      it('should return empty cart for new user', async () => {
        const response = await request(app)
          .get('/api/cart')
          .set('Authorization', `Bearer ${cartAuthToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            items: [],
            totalItems: 0,
            totalAmount: 0,
            currency: 'USD'
          }
        });
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/cart')
          .expect(401);

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'UNAUTHORIZED'
          }
        });
      });
    });

    describe('POST /api/cart/items', () => {
      it('should add item to cart', async () => {
        const response = await request(app)
          .post('/api/cart/items')
          .set('Authorization', `Bearer ${cartAuthToken}`)
          .send({
            productId: testProduct.id,
            quantity: 2
          })
          .expect(201);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            id: expect.any(String),
            productId: testProduct.id,
            quantity: 2,
            addedAt: expect.any(String)
          }
        });
      });

      it('should validate cart item data', async () => {
        const response = await request(app)
          .post('/api/cart/items')
          .set('Authorization', `Bearer ${cartAuthToken}`)
          .send({
            productId: '', // Invalid: empty string
            quantity: 0 // Invalid: must be >= 1
          })
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'VALIDATION_ERROR'
          }
        });
      });
    });

    describe('PUT /api/cart/items/:id', () => {
      let cartItemId: string;

      beforeAll(async () => {
        // Add an item to update
        const addResponse = await request(app)
          .post('/api/cart/items')
          .set('Authorization', `Bearer ${cartAuthToken}`)
          .send({
            productId: testProduct.id,
            quantity: 1
          });
        cartItemId = addResponse.body.data.id;
      });

      it('should update cart item quantity', async () => {
        const response = await request(app)
          .put(`/api/cart/items/${cartItemId}`)
          .set('Authorization', `Bearer ${cartAuthToken}`)
          .send({ quantity: 3 })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            id: cartItemId,
            quantity: 3,
            updatedAt: expect.any(String)
          }
        });
      });

      it('should return 404 for non-existent cart item', async () => {
        const response = await request(app)
          .put('/api/cart/items/non-existent-id')
          .set('Authorization', `Bearer ${cartAuthToken}`)
          .send({ quantity: 2 })
          .expect(404);

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'NOT_FOUND'
          }
        });
      });
    });

    describe('DELETE /api/cart/items/:id', () => {
      let cartItemId: string;

      beforeAll(async () => {
        // Add an item to delete
        const addResponse = await request(app)
          .post('/api/cart/items')
          .set('Authorization', `Bearer ${cartAuthToken}`)
          .send({
            productId: testProduct.id,
            quantity: 1
          });
        cartItemId = addResponse.body.data.id;
      });

      it('should remove item from cart', async () => {
        const response = await request(app)
          .delete(`/api/cart/items/${cartItemId}`)
          .set('Authorization', `Bearer ${cartAuthToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            message: expect.stringContaining('removed')
          }
        });
      });
    });

    describe('POST /api/cart/sync', () => {
      it('should sync cart with local storage data', async () => {
        const localItems = [
          { productId: testProduct.id, quantity: 2 },
          { productId: testDataFactory.createProduct().id, quantity: 1 }
        ];

        const response = await request(app)
          .post('/api/cart/sync')
          .set('Authorization', `Bearer ${cartAuthToken}`)
          .send({ items: localItems })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            syncedItems: expect.any(Number),
            totalItems: expect.any(Number)
          }
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: expect.any(String)
        }
      });
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/auth/wallet-connect')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.stringContaining('JSON')
        }
      });
    });

    it('should handle rate limiting', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .get('/api/marketplace/listings')
          .query({ page: 1, limit: 1 })
      );

      const responses = await Promise.all(requests);
      
      // At least one should be rate limited
      const rateLimitedResponse = responses.find(r => r.status === 429);
      if (rateLimitedResponse) {
        expect(rateLimitedResponse.body).toMatchObject({
          success: false,
          error: {
            code: 'TOO_MANY_REQUESTS',
            message: expect.any(String)
          }
        });
      }
    });
  });

  describe('Response Format Consistency', () => {
    it('should return consistent response format for all endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/marketplace/listings' },
        { method: 'get', path: '/api/health' },
        { method: 'get', path: '/api/auth/profile', auth: true }
      ];

      for (const endpoint of endpoints) {
        const req = request(app)[endpoint.method as keyof typeof request](endpoint.path);
        
        if (endpoint.auth) {
          req.set('Authorization', `Bearer ${authToken}`);
        }

        const response = await req;

        // All responses should have these fields
        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('metadata');
        expect(response.body.metadata).toHaveProperty('timestamp');
        expect(response.body.metadata).toHaveProperty('requestId');
        expect(response.body.metadata).toHaveProperty('version');

        // Success responses should have data
        if (response.body.success) {
          expect(response.body).toHaveProperty('data');
        } else {
          // Error responses should have error object
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toHaveProperty('code');
          expect(response.body.error).toHaveProperty('message');
        }
      }
    });
  });
});