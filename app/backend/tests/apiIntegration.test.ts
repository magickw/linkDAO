import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import express, { Express } from 'express';
import request from 'supertest';

// Mock the database
const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock('../src/db', () => ({
  db: mockDb,
}));

// Mock the schema
jest.mock('../src/db/schema', () => ({
  posts: { id: 'id', communityId: 'community_id', authorId: 'author_id', isPinned: 'is_pinned' },
  announcements: { id: 'id', communityId: 'community_id' },
  monthlyUpdates: { id: 'id', communityId: 'community_id' },
  communities: { id: 'id', creatorAddress: 'creator_address' },
  communityMembers: { communityId: 'community_id', userAddress: 'user_address', role: 'role' },
  users: { id: 'id', walletAddress: 'wallet_address' },
  pinnedPosts: { id: 'id', postId: 'post_id', communityId: 'community_id' },
}));

// Mock auth middleware
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id', walletAddress: '0x123' };
    next();
  },
}));

// Import routes after mocking
import announcementRoutes from '../src/routes/announcementRoutes';
import postManagementRoutes from '../src/routes/postManagementRoutes';
import monthlyUpdateRoutes from '../src/routes/monthlyUpdateRoutes';

describe('API Integration Tests', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());

    // Mount routes
    app.use('/api', announcementRoutes);
    app.use('/api/posts', postManagementRoutes);
    app.use('/api', monthlyUpdateRoutes);
  });

  describe('Announcement Routes', () => {
    describe('POST /api/communities/:id/announcements', () => {
      it('should create a new announcement', async () => {
        const mockResult = {
          success: true,
          data: {
            id: 'announcement-1',
            title: 'Test Announcement',
            content: 'Test content',
            type: 'info',
          },
        };

        // Mock the service response by mocking db operations
        mockDb.select.mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ role: 'admin' }]),
          }),
        });

        mockDb.insert.mockReturnValue({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockResult.data]),
          }),
        });

        const response = await request(app)
          .post('/api/communities/community-1/announcements')
          .send({
            title: 'Test Announcement',
            content: 'Test content',
            type: 'info',
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      it('should return 400 when title is missing', async () => {
        const response = await request(app)
          .post('/api/communities/community-1/announcements')
          .send({
            content: 'Test content',
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('required');
      });

      it('should return 400 when content is missing', async () => {
        const response = await request(app)
          .post('/api/communities/community-1/announcements')
          .send({
            title: 'Test Title',
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/communities/:id/announcements', () => {
      it('should return active announcements', async () => {
        const mockAnnouncements = [
          { id: '1', title: 'Announcement 1', isActive: true },
          { id: '2', title: 'Announcement 2', isActive: true },
        ];

        mockDb.select.mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(mockAnnouncements),
          }),
        });

        const response = await request(app)
          .get('/api/communities/community-1/announcements');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('PUT /api/announcements/:id', () => {
      it('should update an announcement', async () => {
        mockDb.select.mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{ id: 'announcement-1', communityId: 'community-1' }]),
            }),
          }),
        });

        mockDb.update.mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([{ id: 'announcement-1', title: 'Updated' }]),
            }),
          }),
        });

        const response = await request(app)
          .put('/api/announcements/announcement-1')
          .send({
            title: 'Updated Title',
          });

        expect(response.status).toBe(200);
      });
    });

    describe('DELETE /api/announcements/:id', () => {
      it('should delete an announcement', async () => {
        mockDb.select.mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{ id: 'announcement-1', communityId: 'community-1' }]),
            }),
          }),
        });

        mockDb.delete.mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        });

        const response = await request(app)
          .delete('/api/announcements/announcement-1');

        expect(response.status).toBe(200);
      });
    });
  });

  describe('Post Management Routes', () => {
    describe('POST /api/posts/:id/pin', () => {
      it('should pin a post', async () => {
        mockDb.select.mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{ id: 'post-1', communityId: 'community-1' }]),
            }),
          }),
        });

        mockDb.insert.mockReturnValue({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'pinned-1', postId: 'post-1' }]),
          }),
        });

        const response = await request(app)
          .post('/api/posts/post-1/pin')
          .send({
            communityId: 'community-1',
          });

        expect(response.status).toBe(200);
      });

      it('should return 400 when communityId is missing', async () => {
        const response = await request(app)
          .post('/api/posts/post-1/pin')
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Community ID');
      });
    });

    describe('DELETE /api/posts/:id/pin', () => {
      it('should unpin a post', async () => {
        mockDb.select.mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{ id: 'pinned-1', postId: 'post-1' }]),
            }),
          }),
        });

        mockDb.delete.mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        });

        const response = await request(app)
          .delete('/api/posts/post-1/pin');

        expect(response.status).toBe(200);
      });
    });

    describe('GET /api/communities/:id/pinned-posts', () => {
      it('should return pinned posts', async () => {
        const mockPinnedPosts = [
          { id: 'pinned-1', postId: 'post-1', title: 'Pinned Post 1' },
          { id: 'pinned-2', postId: 'post-2', title: 'Pinned Post 2' },
        ];

        mockDb.select.mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(mockPinnedPosts),
              }),
            }),
          }),
        });

        const response = await request(app)
          .get('/api/posts/communities/community-1/pinned-posts');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should respect limit parameter', async () => {
        mockDb.select.mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        });

        const response = await request(app)
          .get('/api/posts/communities/community-1/pinned-posts?limit=10');

        expect(response.status).toBe(200);
      });
    });
  });

  describe('Monthly Update Routes', () => {
    describe('POST /api/communities/:id/monthly-updates', () => {
      it('should create a monthly update', async () => {
        mockDb.select.mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ role: 'admin' }]),
          }),
        });

        mockDb.insert.mockReturnValue({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              id: 'update-1',
              title: 'December Update',
              month: 12,
              year: 2024,
            }]),
          }),
        });

        const response = await request(app)
          .post('/api/communities/community-1/monthly-updates')
          .send({
            title: 'December Update',
            content: 'Monthly update content',
            month: 12,
            year: 2024,
          });

        expect(response.status).toBe(201);
      });

      it('should return 400 for missing required fields', async () => {
        const response = await request(app)
          .post('/api/communities/community-1/monthly-updates')
          .send({
            title: 'December Update',
            // missing content, month, year
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('required');
      });
    });

    describe('GET /api/communities/:id/monthly-updates', () => {
      it('should return published monthly updates', async () => {
        const mockUpdates = [
          { id: '1', title: 'November Update', month: 11, year: 2024, isPublished: true },
          { id: '2', title: 'October Update', month: 10, year: 2024, isPublished: true },
        ];

        mockDb.select.mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(mockUpdates),
              }),
            }),
          }),
        });

        const response = await request(app)
          .get('/api/communities/community-1/monthly-updates');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/communities/:id/monthly-updates/latest', () => {
      it('should return the latest monthly update', async () => {
        const mockUpdate = {
          id: '1',
          title: 'December Update',
          month: 12,
          year: 2024,
          isPublished: true,
        };

        mockDb.select.mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([mockUpdate]),
              }),
            }),
          }),
        });

        const response = await request(app)
          .get('/api/communities/community-1/monthly-updates/latest');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should return null when no updates exist', async () => {
        mockDb.select.mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        });

        const response = await request(app)
          .get('/api/communities/community-1/monthly-updates/latest');

        expect(response.status).toBe(200);
        expect(response.body.data).toBeNull();
      });
    });

    describe('GET /api/communities/:id/monthly-updates/:year/:month', () => {
      it('should return update for specific month/year', async () => {
        const mockUpdate = {
          id: '1',
          title: 'November Update',
          month: 11,
          year: 2024,
          isPublished: true,
        };

        mockDb.select.mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockUpdate]),
            }),
          }),
        });

        const response = await request(app)
          .get('/api/communities/community-1/monthly-updates/2024/11');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should return 404 when update not found', async () => {
        mockDb.select.mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        });

        const response = await request(app)
          .get('/api/communities/community-1/monthly-updates/2024/1');

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/monthly-updates/:id/publish', () => {
      it('should publish a monthly update', async () => {
        mockDb.select.mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{ id: 'update-1', communityId: 'community-1' }]),
            }),
          }),
        });

        mockDb.select.mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ role: 'admin' }]),
          }),
        });

        mockDb.update.mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([{ id: 'update-1', isPublished: true }]),
            }),
          }),
        });

        const response = await request(app)
          .post('/api/monthly-updates/update-1/publish');

        expect(response.status).toBe(200);
      });
    });

    describe('POST /api/monthly-updates/:id/unpublish', () => {
      it('should unpublish a monthly update', async () => {
        mockDb.select.mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{ id: 'update-1', communityId: 'community-1', isPublished: true }]),
            }),
          }),
        });

        mockDb.select.mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ role: 'admin' }]),
          }),
        });

        mockDb.update.mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([{ id: 'update-1', isPublished: false }]),
            }),
          }),
        });

        const response = await request(app)
          .post('/api/monthly-updates/update-1/unpublish');

        expect(response.status).toBe(200);
      });
    });

    describe('PUT /api/monthly-updates/:id', () => {
      it('should update a monthly update', async () => {
        mockDb.select.mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{ id: 'update-1', communityId: 'community-1' }]),
            }),
          }),
        });

        mockDb.select.mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ role: 'admin' }]),
          }),
        });

        mockDb.update.mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([{ id: 'update-1', title: 'Updated Title' }]),
            }),
          }),
        });

        const response = await request(app)
          .put('/api/monthly-updates/update-1')
          .send({
            title: 'Updated Title',
          });

        expect(response.status).toBe(200);
      });
    });

    describe('DELETE /api/monthly-updates/:id', () => {
      it('should delete a monthly update', async () => {
        mockDb.select.mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{ id: 'update-1', communityId: 'community-1' }]),
            }),
          }),
        });

        mockDb.select.mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ role: 'admin' }]),
          }),
        });

        mockDb.delete.mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        });

        const response = await request(app)
          .delete('/api/monthly-updates/update-1');

        expect(response.status).toBe(200);
      });
    });
  });

  describe('Cross-Route Integration', () => {
    it('should handle multiple operations in sequence', async () => {
      // Create announcement
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ role: 'admin' }]),
        }),
      });

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{
            id: 'announcement-1',
            title: 'Test',
          }]),
        }),
      });

      const createResponse = await request(app)
        .post('/api/communities/community-1/announcements')
        .send({
          title: 'Integration Test',
          content: 'Test content',
        });

      expect(createResponse.status).toBe(201);

      // Update the announcement
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: 'announcement-1', communityId: 'community-1' }]),
          }),
        }),
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'announcement-1', title: 'Updated' }]),
          }),
        }),
      });

      const updateResponse = await request(app)
        .put('/api/announcements/announcement-1')
        .send({
          title: 'Updated Title',
        });

      expect(updateResponse.status).toBe(200);
    });

    it('should handle concurrent read operations', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      // Perform multiple read operations concurrently
      const [announcementsRes, pinnedPostsRes, monthlyUpdatesRes] = await Promise.all([
        request(app).get('/api/communities/community-1/announcements'),
        request(app).get('/api/posts/communities/community-1/pinned-posts'),
        request(app).get('/api/communities/community-1/monthly-updates'),
      ]);

      expect(announcementsRes.status).toBe(200);
      expect(pinnedPostsRes.status).toBe(200);
      expect(monthlyUpdatesRes.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error('Database connection error');
      });

      const response = await request(app)
        .get('/api/communities/community-1/announcements');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/communities/community-1/announcements')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });
  });
});
