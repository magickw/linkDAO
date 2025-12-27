
import request from 'supertest';
import express from 'express';
import { describe, it, expect, jest, beforeAll } from '@jest/globals';

// Mocks
const mockAuthMiddleware = (req: any, res: any, next: any) => {
    req.user = {
        id: 'seller-test-id',
        address: '0x1234567890123456789012345678901234567890',
        role: 'seller'
    };
    next();
};

jest.mock('../middleware/authMiddleware', () => ({
    authMiddleware: mockAuthMiddleware,
    requireAuth: mockAuthMiddleware,
    requireSeller: mockAuthMiddleware
}));

// Import valid routes (dynamic import to apply mocks)
// We need to import these AFTER mocking middleware
import sellerRoutes from '../routes/sellerRoutes';
// sellerListingRoutes path might handle specific params or be mounted differently
import sellerListingRoutes from '../routes/sellerListingRoutes';

const app = express();
app.use(express.json());

// Mount routes as they are in index.ts
app.use('/api/sellers', sellerRoutes);
// Note: we mounted this at /api/sellers/listings in index.ts optimization
app.use('/api/sellers/listings', sellerListingRoutes);

describe('Seller Dashboard Verification', () => {
    it('GET /api/sellers/dashboard should return 200 and dashboard data', async () => {
        const res = await request(app)
            .get('/api/sellers/dashboard')
            .expect(200);

        // Verify structure matches expected SellerDashboard response
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('stats');
        expect(res.body.data).toHaveProperty('recentOrders');
        // If DB is empty, this is fine. If it crashes, it will fail.
    });

    it('POST /api/sellers/listings should validate input (400) or create (200)', async () => {
        // We expect validation error for empty body, which confirms the controller is reached and validation logic runs
        const res = await request(app)
            .post('/api/sellers/listings')
            .send({})
            .expect(400); // Bad Request due to missing fields

        expect(res.body.success).toBe(false);
    });

    // Verification of product creation with valid data would require mocking DatabaseService insert
    // But getting 400 proves the route works and validation logic is active.
});
