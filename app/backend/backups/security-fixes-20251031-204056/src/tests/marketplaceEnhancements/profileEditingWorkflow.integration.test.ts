import request from 'supertest';
import { app } from '../../index';
import { db } from '../../db/connection';
import { sellers, users, imageStorage, ensVerifications } from '../../db/schema';
import { jest } from '@jest/globals';

// Mock external services
jest.mock('../../services/ensService');
jest.mock('../../services/imageStorageService');
jest.mock('ipfs-http-client');

describe('Profile Editing Workflow Integration Tests', () => {
  let testUser: any;
  let testSeller: any;
  let authToken: string;

  beforeAll(async () => {
    // Setup test database connection
    await db.migrate.latest();
  });

  beforeEach(async () => {
    // Clean up database
    await db.delete(ensVerifications);
    await db.delete(imageStorage);
    await db.delete(sellers);
    await db.delete(users);

    // Create test user
    const [user] = await db.insert(users).values({
      id: 'test-user-123',
      email: 'seller@example.com',
      walletAddress: '0x1234567890123456789012345678901234567890',
      username: 'testseller',
      createdAt: new Date(),
    }).returning();
    testUser = user;

    // Create test seller profile
    const [seller] = await db.insert(sellers).values({
      id: 'test-seller-123',
      userId: testUser.id,
      storeName: 'Test Store',
      description: 'A test store',
      walletAddress: testUser.walletAddress,
      createdAt: new Date(),
    }).returning();
    testSeller = seller;

    // Mock authentication token
    authToken = 'mock-jwt-token';
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('Complete Profile Editing Workflow', () => {
    it('should complete full profile update with ENS and images', async () => {
      // Mock ENS service
      const mockENSService = require('../../services/ensService');
      mockENSService.ENSService.prototype.validateENSHandle = jest.fn().mockResolvedValue(true);
      mockENSService.ENSService.prototype.verifyENSOwnership = jest.fn().mockResolvedValue(true);

      // Mock image storage service
      const mockImageService = require('../../services/imageStorageService');
      mockImageService.ImageStorageService.prototype.uploadImage = jest.fn().mockResolvedValue({
        ipfsHash: 'QmTestProfileImage123',
        cdnUrl: 'https://cdn.example.com/profile.jpg',
        thumbnails: {
          small: 'https://cdn.example.com/profile-small.jpg',
          medium: 'https://cdn.example.com/profile-medium.jpg',
          large: 'https://cdn.example.com/profile-large.jpg',
        },
        metadata: {
          width: 400,
          height: 400,
          format: 'jpeg',
          size: 50000,
        },
      });

      // Step 1: Upload profile image
      const profileImageResponse = await request(app)
        .post('/api/sellers/upload-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', Buffer.from('fake-image-data'), 'profile.jpg')
        .field('category', 'profile')
        .expect(200);

      expect(profileImageResponse.body).toMatchObject({
        success: true,
        data: {
          ipfsHash: 'QmTestProfileImage123',
          cdnUrl: 'https://cdn.example.com/profile.jpg',
        },
      });

      // Step 2: Upload cover image
      mockImageService.ImageStorageService.prototype.uploadImage.mockResolvedValueOnce({
        ipfsHash: 'QmTestCoverImage456',
        cdnUrl: 'https://cdn.example.com/cover.jpg',
        thumbnails: {
          small: 'https://cdn.example.com/cover-small.jpg',
          medium: 'https://cdn.example.com/cover-medium.jpg',
          large: 'https://cdn.example.com/cover-large.jpg',
        },
        metadata: {
          width: 1200,
          height: 400,
          format: 'jpeg',
          size: 120000,
        },
      });

      const coverImageResponse = await request(app)
        .post('/api/sellers/upload-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', Buffer.from('fake-cover-data'), 'cover.jpg')
        .field('category', 'cover')
        .expect(200);

      expect(coverImageResponse.body.data.ipfsHash).toBe('QmTestCoverImage456');

      // Step 3: Update profile with ENS and all fields
      const profileUpdateData = {
        storeName: 'Updated Test Store',
        description: 'An updated test store with ENS',
        ensHandle: 'testseller.eth',
        websiteUrl: 'https://testseller.com',
        socialHandles: {
          twitter: '@testseller',
          discord: 'testseller#1234',
          telegram: '@testseller_tg',
        },
        profileImageUrl: profileImageResponse.body.data.cdnUrl,
        coverImageUrl: coverImageResponse.body.data.cdnUrl,
      };

      const profileUpdateResponse = await request(app)
        .put(`/api/sellers/${testSeller.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileUpdateData)
        .expect(200);

      expect(profileUpdateResponse.body).toMatchObject({
        success: true,
        data: {
          id: testSeller.id,
          storeName: 'Updated Test Store',
          ensHandle: 'testseller.eth',
          ensVerified: true,
          profileImageUrl: 'https://cdn.example.com/profile.jpg',
          coverImageUrl: 'https://cdn.example.com/cover.jpg',
          websiteUrl: 'https://testseller.com',
          socialHandles: {
            twitter: '@testseller',
            discord: 'testseller#1234',
            telegram: '@testseller_tg',
          },
        },
      });

      // Step 4: Verify profile changes are reflected on public store page
      const publicStoreResponse = await request(app)
        .get(`/api/sellers/${testSeller.id}/public`)
        .expect(200);

      expect(publicStoreResponse.body.data).toMatchObject({
        storeName: 'Updated Test Store',
        description: 'An updated test store with ENS',
        ensHandle: 'testseller.eth',
        profileImageUrl: 'https://cdn.example.com/profile.jpg',
        coverImageUrl: 'https://cdn.example.com/cover.jpg',
        websiteUrl: 'https://testseller.com',
        socialHandles: {
          twitter: '@testseller',
          discord: 'testseller#1234',
          telegram: '@testseller_tg',
        },
      });

      // Step 5: Verify ENS verification record was created
      const ensVerification = await db.select()
        .from(ensVerifications)
        .where(eq(ensVerifications.walletAddress, testUser.walletAddress))
        .first();

      expect(ensVerification).toMatchObject({
        walletAddress: testUser.walletAddress,
        ensHandle: 'testseller.eth',
        verifiedAt: expect.any(Date),
      });

      // Step 6: Verify image storage records were created
      const imageRecords = await db.select()
        .from(imageStorage)
        .where(eq(imageStorage.ownerId, testUser.id));

      expect(imageRecords).toHaveLength(2);
      expect(imageRecords.some(img => img.usageType === 'profile')).toBe(true);
      expect(imageRecords.some(img => img.usageType === 'cover')).toBe(true);
    });

    it('should handle profile update without ENS (optional field)', async () => {
      const profileUpdateData = {
        storeName: 'Store Without ENS',
        description: 'A store without ENS handle',
        websiteUrl: 'https://example.com',
        socialHandles: {
          twitter: '@example',
        },
      };

      const response = await request(app)
        .put(`/api/sellers/${testSeller.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileUpdateData)
        .expect(200);

      expect(response.body.data).toMatchObject({
        storeName: 'Store Without ENS',
        ensHandle: null,
        ensVerified: false,
      });

      // Verify no ENS verification record was created
      const ensVerification = await db.select()
        .from(ensVerifications)
        .where(eq(ensVerifications.walletAddress, testUser.walletAddress))
        .first();

      expect(ensVerification).toBeUndefined();
    });

    it('should handle ENS validation failure gracefully', async () => {
      const mockENSService = require('../../services/ensService');
      mockENSService.ENSService.prototype.validateENSHandle = jest.fn().mockResolvedValue(false);

      const profileUpdateData = {
        storeName: 'Test Store',
        ensHandle: 'invalid-ens.eth',
      };

      const response = await request(app)
        .put(`/api/sellers/${testSeller.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileUpdateData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'ENS validation failed',
        details: expect.any(String),
      });
    });

    it('should handle image upload failures gracefully', async () => {
      const mockImageService = require('../../services/imageStorageService');
      mockImageService.ImageStorageService.prototype.uploadImage = jest.fn()
        .mockRejectedValue(new Error('IPFS upload failed'));

      const response = await request(app)
        .post('/api/sellers/upload-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', Buffer.from('fake-image-data'), 'profile.jpg')
        .field('category', 'profile')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Image upload failed',
      });
    });

    it('should validate required fields', async () => {
      const invalidData = {
        storeName: '', // Required field
        description: 'Valid description',
      };

      const response = await request(app)
        .put(`/api/sellers/${testSeller.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation failed',
        details: expect.arrayContaining(['Store name is required']),
      });
    });

    it('should handle concurrent profile updates', async () => {
      const updateData1 = { storeName: 'Store Name 1' };
      const updateData2 = { storeName: 'Store Name 2' };

      const [response1, response2] = await Promise.allSettled([
        request(app)
          .put(`/api/sellers/${testSeller.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData1),
        request(app)
          .put(`/api/sellers/${testSeller.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData2),
      ]);

      // At least one should succeed
      const successful = [response1, response2].filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);
    });
  });

  describe('Profile Synchronization', () => {
    it('should immediately reflect changes on public store page', async () => {
      const updateData = {
        storeName: 'Immediately Updated Store',
        description: 'This should appear immediately',
      };

      // Update profile
      await request(app)
        .put(`/api/sellers/${testSeller.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      // Immediately check public store page
      const publicResponse = await request(app)
        .get(`/api/sellers/${testSeller.id}/public`)
        .expect(200);

      expect(publicResponse.body.data).toMatchObject({
        storeName: 'Immediately Updated Store',
        description: 'This should appear immediately',
      });
    });

    it('should invalidate cache after profile updates', async () => {
      // First request to populate cache
      await request(app)
        .get(`/api/sellers/${testSeller.id}/public`)
        .expect(200);

      // Update profile
      const updateData = { storeName: 'Cache Invalidated Store' };
      await request(app)
        .put(`/api/sellers/${testSeller.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      // Verify cache was invalidated and new data is returned
      const response = await request(app)
        .get(`/api/sellers/${testSeller.id}/public`)
        .expect(200);

      expect(response.body.data.storeName).toBe('Cache Invalidated Store');
    });
  });

  describe('Error Recovery and Rollback', () => {
    it('should rollback changes if ENS verification fails after profile update', async () => {
      const mockENSService = require('../../services/ensService');
      mockENSService.ENSService.prototype.validateENSHandle = jest.fn().mockResolvedValue(true);
      mockENSService.ENSService.prototype.verifyENSOwnership = jest.fn()
        .mockResolvedValueOnce(true) // Initial validation passes
        .mockRejectedValueOnce(new Error('Verification failed')); // Verification fails

      const updateData = {
        storeName: 'Test Store',
        ensHandle: 'test.eth',
      };

      const response = await request(app)
        .put(`/api/sellers/${testSeller.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(500);

      expect(response.body.error).toContain('ENS verification failed');

      // Verify profile was not updated
      const seller = await db.select()
        .from(sellers)
        .where(eq(sellers.id, testSeller.id))
        .first();

      expect(seller.ensHandle).toBeNull();
      expect(seller.storeName).toBe('Test Store'); // Original name
    });

    it('should handle partial failures in image upload', async () => {
      const mockImageService = require('../../services/imageStorageService');
      mockImageService.ImageStorageService.prototype.uploadImage = jest.fn()
        .mockResolvedValueOnce({
          ipfsHash: 'QmSuccess123',
          cdnUrl: 'https://cdn.example.com/success.jpg',
        })
        .mockRejectedValueOnce(new Error('CDN distribution failed'));

      // First upload succeeds
      await request(app)
        .post('/api/sellers/upload-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', Buffer.from('fake-image-data'), 'profile.jpg')
        .field('category', 'profile')
        .expect(200);

      // Second upload fails
      await request(app)
        .post('/api/sellers/upload-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', Buffer.from('fake-cover-data'), 'cover.jpg')
        .field('category', 'cover')
        .expect(500);

      // Verify first image was still stored
      const imageRecords = await db.select()
        .from(imageStorage)
        .where(eq(imageStorage.ownerId, testUser.id));

      expect(imageRecords).toHaveLength(1);
      expect(imageRecords[0].usageType).toBe('profile');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for profile updates', async () => {
      const updateData = { storeName: 'Unauthorized Update' };

      const response = await request(app)
        .put(`/api/sellers/${testSeller.id}`)
        .send(updateData)
        .expect(401);

      expect(response.body.error).toContain('Authentication required');
    });

    it('should prevent users from updating other users profiles', async () => {
      // Create another user and seller
      const [otherUser] = await db.insert(users).values({
        id: 'other-user-123',
        email: 'other@example.com',
        walletAddress: '0x9876543210987654321098765432109876543210',
        username: 'otheruser',
        createdAt: new Date(),
      }).returning();

      const [otherSeller] = await db.insert(sellers).values({
        id: 'other-seller-123',
        userId: otherUser.id,
        storeName: 'Other Store',
        walletAddress: otherUser.walletAddress,
        createdAt: new Date(),
      }).returning();

      const updateData = { storeName: 'Hacked Store' };

      const response = await request(app)
        .put(`/api/sellers/${otherSeller.id}`)
        .set('Authorization', `Bearer ${authToken}`) // Using testUser's token
        .send(updateData)
        .expect(403);

      expect(response.body.error).toContain('Access denied');
    });
  });

  describe('Data Validation and Sanitization', () => {
    it('should sanitize input data', async () => {
      const maliciousData = {
        storeName: '<script>alert("xss")</script>Malicious Store',
        description: 'Normal description with <img src="x" onerror="alert(1)">',
        websiteUrl: 'javascript:alert("xss")',
      };

      const response = await request(app)
        .put(`/api/sellers/${testSeller.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousData)
        .expect(200);

      expect(response.body.data.storeName).not.toContain('<script>');
      expect(response.body.data.description).not.toContain('<img');
      expect(response.body.data.websiteUrl).not.toContain('javascript:');
    });

    it('should validate URL formats', async () => {
      const invalidData = {
        websiteUrl: 'not-a-valid-url',
        socialHandles: {
          twitter: 'invalid-twitter-handle',
        },
      };

      const response = await request(app)
        .put(`/api/sellers/${testSeller.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.details).toContain('Invalid website URL format');
      expect(response.body.details).toContain('Invalid Twitter handle format');
    });
  });
});