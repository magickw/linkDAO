import request from 'supertest';
import { app } from '../../index';
import { db } from '../../db/connection';
import { products, sellers, users, imageStorage } from '../../db/schema';
import { jest } from '@jest/globals';

// Mock external services
jest.mock('../../services/imageStorageService');
jest.mock('../../services/listingPublicationService');
jest.mock('ipfs-http-client');

describe('Listing Creation Workflow Integration Tests', () => {
  let testUser: any;
  let testSeller: any;
  let authToken: string;

  beforeAll(async () => {
    await db.migrate.latest();
  });

  beforeEach(async () => {
    // Clean up database
    await db.delete(imageStorage);
    await db.delete(products);
    await db.delete(sellers);
    await db.delete(users);

    // Create test user and seller
    const [user] = await db.insert(users).values({
      id: 'test-user-123',
      email: 'seller@example.com',
      walletAddress: '0x1234567890123456789012345678901234567890',
      username: 'testseller',
      createdAt: new Date(),
    }).returning();
    testUser = user;

    const [seller] = await db.insert(sellers).values({
      id: 'test-seller-123',
      userId: testUser.id,
      storeName: 'Test Store',
      walletAddress: testUser.walletAddress,
      createdAt: new Date(),
    }).returning();
    testSeller = seller;

    authToken = 'mock-jwt-token';
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('Complete Listing Creation Workflow', () => {
    it('should create listing with multiple images and immediate visibility', async () => {
      // Mock image storage service
      const mockImageService = require('../../services/imageStorageService');
      mockImageService.ImageStorageService.prototype.uploadImage = jest.fn()
        .mockResolvedValueOnce({
          ipfsHash: 'QmListingImage1',
          cdnUrl: 'https://cdn.example.com/listing1.jpg',
          thumbnails: {
            small: 'https://cdn.example.com/listing1-small.jpg',
            medium: 'https://cdn.example.com/listing1-medium.jpg',
            large: 'https://cdn.example.com/listing1-large.jpg',
          },
          metadata: { width: 800, height: 600, format: 'jpeg', size: 100000 },
        })
        .mockResolvedValueOnce({
          ipfsHash: 'QmListingImage2',
          cdnUrl: 'https://cdn.example.com/listing2.jpg',
          thumbnails: {
            small: 'https://cdn.example.com/listing2-small.jpg',
            medium: 'https://cdn.example.com/listing2-medium.jpg',
            large: 'https://cdn.example.com/listing2-large.jpg',
          },
          metadata: { width: 800, height: 600, format: 'jpeg', size: 95000 },
        });

      // Mock listing publication service
      const mockPublicationService = require('../../services/listingPublicationService');
      mockPublicationService.ListingPublicationService.prototype.publishListing = jest.fn()
        .mockResolvedValue({ success: true, publishedAt: new Date() });

      // Step 1: Upload first listing image
      const image1Response = await request(app)
        .post('/api/listings/upload-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', Buffer.from('fake-image-1'), 'product1.jpg')
        .expect(200);

      expect(image1Response.body).toMatchObject({
        success: true,
        data: {
          ipfsHash: 'QmListingImage1',
          cdnUrl: 'https://cdn.example.com/listing1.jpg',
        },
      });

      // Step 2: Upload second listing image
      const image2Response = await request(app)
        .post('/api/listings/upload-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', Buffer.from('fake-image-2'), 'product2.jpg')
        .expect(200);

      expect(image2Response.body.data.ipfsHash).toBe('QmListingImage2');

      // Step 3: Create listing with uploaded images
      const listingData = {
        title: 'Test Product Listing',
        description: 'A comprehensive test product with multiple images',
        price: 99.99,
        currency: 'USD',
        category: 'Electronics',
        tags: ['test', 'electronics', 'gadget'],
        images: [
          {
            ipfsHash: 'QmListingImage1',
            cdnUrl: 'https://cdn.example.com/listing1.jpg',
            isPrimary: true,
          },
          {
            ipfsHash: 'QmListingImage2',
            cdnUrl: 'https://cdn.example.com/listing2.jpg',
            isPrimary: false,
          },
        ],
        inventory: {
          quantity: 10,
          trackInventory: true,
        },
        shipping: {
          weight: 0.5,
          dimensions: { length: 10, width: 8, height: 2 },
          shippingClass: 'standard',
        },
        escrowEnabled: true,
        metadata: {
          condition: 'new',
          brand: 'TestBrand',
          model: 'TestModel',
        },
      };

      const listingResponse = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(listingData)
        .expect(201);

      expect(listingResponse.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          title: 'Test Product Listing',
          price: 99.99,
          currency: 'USD',
          sellerId: testSeller.id,
          status: 'published',
          images: expect.arrayContaining([
            expect.objectContaining({
              ipfsHash: 'QmListingImage1',
              isPrimary: true,
            }),
            expect.objectContaining({
              ipfsHash: 'QmListingImage2',
              isPrimary: false,
            }),
          ]),
          escrowEnabled: true,
        },
      });

      const listingId = listingResponse.body.data.id;

      // Step 4: Verify listing appears in marketplace immediately
      const marketplaceResponse = await request(app)
        .get('/api/marketplace/listings')
        .expect(200);

      const createdListing = marketplaceResponse.body.data.listings.find(
        (listing: any) => listing.id === listingId
      );

      expect(createdListing).toBeDefined();
      expect(createdListing).toMatchObject({
        title: 'Test Product Listing',
        price: 99.99,
        status: 'published',
        seller: {
          id: testSeller.id,
          storeName: 'Test Store',
        },
      });

      // Step 5: Verify listing detail page shows all information
      const detailResponse = await request(app)
        .get(`/api/listings/${listingId}`)
        .expect(200);

      expect(detailResponse.body.data).toMatchObject({
        title: 'Test Product Listing',
        description: 'A comprehensive test product with multiple images',
        images: expect.arrayContaining([
          expect.objectContaining({
            cdnUrl: 'https://cdn.example.com/listing1.jpg',
            thumbnails: expect.objectContaining({
              small: expect.any(String),
              medium: expect.any(String),
              large: expect.any(String),
            }),
          }),
        ]),
        inventory: {
          quantity: 10,
          trackInventory: true,
        },
        escrowEnabled: true,
      });

      // Step 6: Verify image storage records were created
      const imageRecords = await db.select()
        .from(imageStorage)
        .where(eq(imageStorage.ownerId, testUser.id));

      expect(imageRecords).toHaveLength(2);
      expect(imageRecords.every(img => img.usageType === 'listing')).toBe(true);

      // Step 7: Verify search indexing
      const searchResponse = await request(app)
        .get('/api/marketplace/search')
        .query({ q: 'Test Product' })
        .expect(200);

      const searchResult = searchResponse.body.data.results.find(
        (result: any) => result.id === listingId
      );

      expect(searchResult).toBeDefined();
      expect(searchResult.title).toBe('Test Product Listing');
    });

    it('should handle listing creation with single image', async () => {
      const mockImageService = require('../../services/imageStorageService');
      mockImageService.ImageStorageService.prototype.uploadImage = jest.fn().mockResolvedValue({
        ipfsHash: 'QmSingleImage',
        cdnUrl: 'https://cdn.example.com/single.jpg',
        thumbnails: {
          small: 'https://cdn.example.com/single-small.jpg',
          medium: 'https://cdn.example.com/single-medium.jpg',
          large: 'https://cdn.example.com/single-large.jpg',
        },
        metadata: { width: 600, height: 400, format: 'jpeg', size: 80000 },
      });

      // Upload image
      const imageResponse = await request(app)
        .post('/api/listings/upload-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', Buffer.from('single-image'), 'single.jpg')
        .expect(200);

      // Create listing
      const listingData = {
        title: 'Single Image Product',
        description: 'Product with one image',
        price: 49.99,
        currency: 'USD',
        category: 'Books',
        images: [{
          ipfsHash: 'QmSingleImage',
          cdnUrl: 'https://cdn.example.com/single.jpg',
          isPrimary: true,
        }],
      };

      const response = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(listingData)
        .expect(201);

      expect(response.body.data.images).toHaveLength(1);
      expect(response.body.data.images[0].isPrimary).toBe(true);
    });

    it('should create listing without images (text-only)', async () => {
      const listingData = {
        title: 'Digital Service Listing',
        description: 'A digital service that does not require images',
        price: 25.00,
        currency: 'USD',
        category: 'Services',
        tags: ['digital', 'service'],
        images: [],
        inventory: {
          quantity: 999,
          trackInventory: false,
        },
        escrowEnabled: false,
      };

      const response = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(listingData)
        .expect(201);

      expect(response.body.data).toMatchObject({
        title: 'Digital Service Listing',
        images: [],
        escrowEnabled: false,
      });

      // Verify it appears in marketplace
      const marketplaceResponse = await request(app)
        .get('/api/marketplace/listings')
        .expect(200);

      const listing = marketplaceResponse.body.data.listings.find(
        (l: any) => l.title === 'Digital Service Listing'
      );

      expect(listing).toBeDefined();
    });

    it('should handle draft listing creation and publication', async () => {
      const draftData = {
        title: 'Draft Product',
        description: 'This is a draft listing',
        price: 75.00,
        currency: 'USD',
        category: 'Drafts',
        status: 'draft',
      };

      // Create draft listing
      const draftResponse = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(draftData)
        .expect(201);

      expect(draftResponse.body.data.status).toBe('draft');

      const listingId = draftResponse.body.data.id;

      // Verify draft is not visible in marketplace
      const marketplaceResponse = await request(app)
        .get('/api/marketplace/listings')
        .expect(200);

      const draftInMarketplace = marketplaceResponse.body.data.listings.find(
        (l: any) => l.id === listingId
      );

      expect(draftInMarketplace).toBeUndefined();

      // Publish the draft
      const publishResponse = await request(app)
        .put(`/api/listings/${listingId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(publishResponse.body.data.status).toBe('published');

      // Verify it now appears in marketplace
      const updatedMarketplaceResponse = await request(app)
        .get('/api/marketplace/listings')
        .expect(200);

      const publishedListing = updatedMarketplaceResponse.body.data.listings.find(
        (l: any) => l.id === listingId
      );

      expect(publishedListing).toBeDefined();
    });
  });

  describe('Image Management in Listings', () => {
    it('should handle image ordering and primary image selection', async () => {
      const mockImageService = require('../../services/imageStorageService');
      mockImageService.ImageStorageService.prototype.uploadImage = jest.fn()
        .mockResolvedValueOnce({ ipfsHash: 'QmImage1', cdnUrl: 'https://cdn.example.com/1.jpg' })
        .mockResolvedValueOnce({ ipfsHash: 'QmImage2', cdnUrl: 'https://cdn.example.com/2.jpg' })
        .mockResolvedValueOnce({ ipfsHash: 'QmImage3', cdnUrl: 'https://cdn.example.com/3.jpg' });

      // Upload multiple images
      const images = await Promise.all([
        request(app)
          .post('/api/listings/upload-image')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('image', Buffer.from('image-1'), '1.jpg'),
        request(app)
          .post('/api/listings/upload-image')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('image', Buffer.from('image-2'), '2.jpg'),
        request(app)
          .post('/api/listings/upload-image')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('image', Buffer.from('image-3'), '3.jpg'),
      ]);

      // Create listing with specific image order and primary selection
      const listingData = {
        title: 'Multi-Image Product',
        description: 'Product with ordered images',
        price: 150.00,
        currency: 'USD',
        category: 'Photography',
        images: [
          { ipfsHash: 'QmImage2', cdnUrl: 'https://cdn.example.com/2.jpg', isPrimary: true, order: 0 },
          { ipfsHash: 'QmImage1', cdnUrl: 'https://cdn.example.com/1.jpg', isPrimary: false, order: 1 },
          { ipfsHash: 'QmImage3', cdnUrl: 'https://cdn.example.com/3.jpg', isPrimary: false, order: 2 },
        ],
      };

      const response = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(listingData)
        .expect(201);

      const createdImages = response.body.data.images;
      expect(createdImages).toHaveLength(3);
      
      // Verify primary image
      const primaryImage = createdImages.find((img: any) => img.isPrimary);
      expect(primaryImage.ipfsHash).toBe('QmImage2');
      
      // Verify image order
      const sortedImages = createdImages.sort((a: any, b: any) => a.order - b.order);
      expect(sortedImages[0].ipfsHash).toBe('QmImage2');
      expect(sortedImages[1].ipfsHash).toBe('QmImage1');
      expect(sortedImages[2].ipfsHash).toBe('QmImage3');
    });

    it('should handle image replacement in existing listing', async () => {
      // Create initial listing with one image
      const mockImageService = require('../../services/imageStorageService');
      mockImageService.ImageStorageService.prototype.uploadImage = jest.fn()
        .mockResolvedValueOnce({ ipfsHash: 'QmOriginal', cdnUrl: 'https://cdn.example.com/original.jpg' })
        .mockResolvedValueOnce({ ipfsHash: 'QmReplacement', cdnUrl: 'https://cdn.example.com/replacement.jpg' });

      const imageResponse = await request(app)
        .post('/api/listings/upload-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', Buffer.from('original-image'), 'original.jpg');

      const listingData = {
        title: 'Product with Replaceable Image',
        price: 100.00,
        currency: 'USD',
        category: 'Test',
        images: [{ ipfsHash: 'QmOriginal', cdnUrl: 'https://cdn.example.com/original.jpg', isPrimary: true }],
      };

      const createResponse = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(listingData)
        .expect(201);

      const listingId = createResponse.body.data.id;

      // Upload replacement image
      const replacementResponse = await request(app)
        .post('/api/listings/upload-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', Buffer.from('replacement-image'), 'replacement.jpg');

      // Update listing with new image
      const updateData = {
        images: [{ ipfsHash: 'QmReplacement', cdnUrl: 'https://cdn.example.com/replacement.jpg', isPrimary: true }],
      };

      const updateResponse = await request(app)
        .put(`/api/listings/${listingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.data.images[0].ipfsHash).toBe('QmReplacement');
    });

    it('should validate image file types and sizes', async () => {
      // Test invalid file type
      const invalidTypeResponse = await request(app)
        .post('/api/listings/upload-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', Buffer.from('not-an-image'), 'document.txt')
        .expect(400);

      expect(invalidTypeResponse.body.error).toContain('Invalid file type');

      // Test oversized file
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
      const oversizedResponse = await request(app)
        .post('/api/listings/upload-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', largeBuffer, 'large.jpg')
        .expect(400);

      expect(oversizedResponse.body.error).toContain('File size exceeds limit');
    });
  });

  describe('Listing Visibility and Search Integration', () => {
    it('should update search index when listing is created', async () => {
      const listingData = {
        title: 'Searchable Product',
        description: 'This product should be searchable immediately',
        price: 50.00,
        currency: 'USD',
        category: 'Search Test',
        tags: ['searchable', 'immediate', 'test'],
      };

      const createResponse = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(listingData)
        .expect(201);

      const listingId = createResponse.body.data.id;

      // Search should find the listing immediately
      const searchResponse = await request(app)
        .get('/api/marketplace/search')
        .query({ q: 'Searchable Product' })
        .expect(200);

      const foundListing = searchResponse.body.data.results.find(
        (result: any) => result.id === listingId
      );

      expect(foundListing).toBeDefined();
      expect(foundListing.title).toBe('Searchable Product');
    });

    it('should filter listings by category', async () => {
      // Create listings in different categories
      const categories = ['Electronics', 'Books', 'Clothing'];
      const createdListings = [];

      for (const category of categories) {
        const response = await request(app)
          .post('/api/listings')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: `${category} Product`,
            price: 25.00,
            currency: 'USD',
            category,
          })
          .expect(201);
        
        createdListings.push(response.body.data);
      }

      // Filter by Electronics category
      const electronicsResponse = await request(app)
        .get('/api/marketplace/listings')
        .query({ category: 'Electronics' })
        .expect(200);

      const electronicsListings = electronicsResponse.body.data.listings;
      expect(electronicsListings).toHaveLength(1);
      expect(electronicsListings[0].category).toBe('Electronics');
    });

    it('should handle listing status changes and visibility', async () => {
      const listingData = {
        title: 'Status Change Product',
        price: 75.00,
        currency: 'USD',
        category: 'Test',
      };

      const createResponse = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(listingData)
        .expect(201);

      const listingId = createResponse.body.data.id;

      // Verify listing is visible
      let marketplaceResponse = await request(app)
        .get('/api/marketplace/listings')
        .expect(200);

      let listing = marketplaceResponse.body.data.listings.find(
        (l: any) => l.id === listingId
      );
      expect(listing).toBeDefined();

      // Deactivate listing
      await request(app)
        .put(`/api/listings/${listingId}/deactivate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify listing is no longer visible in marketplace
      marketplaceResponse = await request(app)
        .get('/api/marketplace/listings')
        .expect(200);

      listing = marketplaceResponse.body.data.listings.find(
        (l: any) => l.id === listingId
      );
      expect(listing).toBeUndefined();
    });
  });

  describe('Error Handling and Validation', () => {
    it('should validate required listing fields', async () => {
      const invalidData = {
        // Missing title
        description: 'Product without title',
        price: 50.00,
      };

      const response = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain('Validation failed');
      expect(response.body.details).toContain('Title is required');
    });

    it('should validate price format', async () => {
      const invalidPriceData = {
        title: 'Invalid Price Product',
        price: -10.00, // Negative price
        currency: 'USD',
        category: 'Test',
      };

      const response = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPriceData)
        .expect(400);

      expect(response.body.details).toContain('Price must be greater than zero');
    });

    it('should handle image upload failures gracefully', async () => {
      const mockImageService = require('../../services/imageStorageService');
      mockImageService.ImageStorageService.prototype.uploadImage = jest.fn()
        .mockRejectedValue(new Error('IPFS service unavailable'));

      const response = await request(app)
        .post('/api/listings/upload-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', Buffer.from('test-image'), 'test.jpg')
        .expect(500);

      expect(response.body.error).toContain('Image upload failed');
    });

    it('should rollback listing creation if publication fails', async () => {
      const mockPublicationService = require('../../services/listingPublicationService');
      mockPublicationService.ListingPublicationService.prototype.publishListing = jest.fn()
        .mockRejectedValue(new Error('Publication service failed'));

      const listingData = {
        title: 'Failed Publication Product',
        price: 100.00,
        currency: 'USD',
        category: 'Test',
      };

      const response = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(listingData)
        .expect(500);

      expect(response.body.error).toContain('Failed to publish listing');

      // Verify listing was not created in database
      const listings = await db.select()
        .from(products)
        .where(eq(products.title, 'Failed Publication Product'));

      expect(listings).toHaveLength(0);
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle concurrent listing creation', async () => {
      const listingPromises = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/listings')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: `Concurrent Product ${i + 1}`,
            price: 25.00 + i,
            currency: 'USD',
            category: 'Concurrent',
          })
      );

      const results = await Promise.allSettled(listingPromises);
      const successful = results.filter(r => r.status === 'fulfilled');

      expect(successful.length).toBe(5);
    });

    it('should handle large image uploads efficiently', async () => {
      const mockImageService = require('../../services/imageStorageService');
      mockImageService.ImageStorageService.prototype.uploadImage = jest.fn()
        .mockImplementation(() => 
          new Promise(resolve => 
            setTimeout(() => resolve({
              ipfsHash: 'QmLargeImage',
              cdnUrl: 'https://cdn.example.com/large.jpg',
            }), 100)
          )
        );

      const largeImageBuffer = Buffer.alloc(4 * 1024 * 1024); // 4MB
      
      const startTime = Date.now();
      const response = await request(app)
        .post('/api/listings/upload-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', largeImageBuffer, 'large.jpg')
        .expect(200);
      
      const endTime = Date.now();
      const uploadTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(uploadTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
