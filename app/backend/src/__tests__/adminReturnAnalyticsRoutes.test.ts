import request from 'supertest';
import express from 'express';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import adminReturnAnalyticsRoutes from '../routes/adminReturnAnalyticsRoutes';
import { returnAnalyticsService } from '../services/returnAnalyticsService';

// Mock dependencies
jest.mock('../services/returnAnalyticsService');
jest.mock('../utils/logger', () => ({
    safeLogger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

// Mock middleware
jest.mock('../middleware/authMiddleware', () => ({
    authMiddleware: (req: any, res: any, next: any) => {
        req.user = {
            id: 'admin-123',
            email: 'admin@test.com',
            role: 'admin',
            permissions: ['returns.view', 'returns.analytics', 'system.settings'],
        };
        next();
    },
}));

jest.mock('../middleware/adminAuthMiddleware', () => ({
    validateAdminRole: (req: any, res: any, next: any) => next(),
    requirePermission: (permission: string) => (req: any, res: any, next: any) => {
        if (req.user && req.user.permissions.includes(permission)) {
            next();
        } else {
            res.status(403).json({ success: false, error: 'Insufficient permissions' });
        }
    },
    adminRateLimit: () => (req: any, res: any, next: any) => next(),
    auditAdminAction: () => (req: any, res: any, next: any) => next(),
    AuthenticatedRequest: {} as any,
}));

describe('Admin Return Analytics Routes', () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/admin/returns', adminReturnAnalyticsRoutes);
        jest.clearAllMocks();
    });

    // ========================================================================
    // REAL-TIME METRICS ENDPOINT TESTS
    // ========================================================================

    describe('GET /api/admin/returns/metrics', () => {
        it('should return real-time metrics successfully', async () => {
            const mockMetrics = {
                timestamp: new Date(),
                activeReturns: 42,
                pendingApproval: 15,
                pendingRefund: 8,
                inTransitReturns: 12,
                returnsPerMinute: 2.4,
                approvalsPerMinute: 1.2,
                refundsPerMinute: 0.8,
                manualReviewQueueDepth: 5,
                refundProcessingQueueDepth: 8,
                inspectionQueueDepth: 3,
                volumeSpikeDetected: false
            };

            (returnAnalyticsService.getRealtimeMetrics as any).mockResolvedValue(mockMetrics);

            const response = await request(app).get('/api/admin/returns/metrics');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.activeReturns).toBe(42);
            expect(response.body.meta).toBeDefined();
            expect(response.body.meta.cached).toBe(true);
        });

        it('should handle errors gracefully', async () => {
            (returnAnalyticsService.getRealtimeMetrics as any).mockRejectedValue(
                new Error('Database error')
            );

            const response = await request(app).get('/api/admin/returns/metrics');

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Failed to fetch real-time metrics');
        });
    });

    // ========================================================================
    // COMPREHENSIVE ANALYTICS ENDPOINT TESTS
    // ========================================================================

    describe('GET /api/admin/returns/analytics', () => {
        it('should return analytics for valid date range', async () => {
            const mockAnalytics = {
                metrics: {
                    totalReturns: 150,
                    approvedReturns: 120,
                    rejectedReturns: 15,
                },
                financial: {
                    totalRefundAmount: 15000,
                    averageRefundAmount: 125,
                },
            };

            (returnAnalyticsService.getEnhancedAnalytics as any).mockResolvedValue(mockAnalytics);

            const response = await request(app)
                .get('/api/admin/returns/analytics')
                .query({
                    start: '2024-01-01T00:00:00Z',
                    end: '2024-01-31T23:59:59Z',
                    sellerId: 'seller-123',
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockAnalytics);
            expect(response.body.meta.period).toBeDefined();
        });

        it('should return 400 for missing start date', async () => {
            const response = await request(app)
                .get('/api/admin/returns/analytics')
                .query({ end: '2024-01-31T23:59:59Z' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Missing required parameters');
        });

        it('should return 400 for missing end date', async () => {
            const response = await request(app)
                .get('/api/admin/returns/analytics')
                .query({ start: '2024-01-01T00:00:00Z' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Missing required parameters');
        });

        it('should return 400 for invalid date format', async () => {
            const response = await request(app)
                .get('/api/admin/returns/analytics')
                .query({ start: 'invalid-date', end: '2024-01-31T23:59:59Z' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid date format');
        });

        it('should return 400 when start date is after end date', async () => {
            const response = await request(app)
                .get('/api/admin/returns/analytics')
                .query({
                    start: '2024-02-01T00:00:00Z',
                    end: '2024-01-01T00:00:00Z',
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid date range');
        });
    });

    // ========================================================================
    // EVENT HISTORY ENDPOINT TESTS
    // ========================================================================

    describe('GET /api/admin/returns/events/:returnId', () => {
        it('should return event history for valid return ID', async () => {
            const mockEvents = [
                {
                    id: 'event-1',
                    returnId: 'return-123',
                    eventType: 'created',
                    eventCategory: 'lifecycle',
                    timestamp: new Date(),
                },
                {
                    id: 'event-2',
                    returnId: 'return-123',
                    eventType: 'status_changed',
                    eventCategory: 'lifecycle',
                    timestamp: new Date(),
                },
            ];

            (returnAnalyticsService.getReturnEventHistory as any).mockResolvedValue(mockEvents);

            const response = await request(app).get('/api/admin/returns/events/return-123');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.meta.count).toBe(2);
            expect(response.body.meta.returnId).toBe('return-123');
        });

        it('should return 404 for non-existent return', async () => {
            (returnAnalyticsService.getReturnEventHistory as any).mockRejectedValue(
                new Error('Return not found')
            );

            const response = await request(app).get('/api/admin/returns/events/invalid-id');

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Return not found');
        });
    });

    // ========================================================================
    // STATUS DISTRIBUTION ENDPOINT TESTS
    // ========================================================================

    describe('GET /api/admin/returns/status-distribution', () => {
        it('should return status distribution for valid date range', async () => {
            const mockDistribution = {
                requested: 25,
                approved: 40,
                completed: 35,
                rejected: 5,
            };

            (returnAnalyticsService.getStatusDistribution as any).mockResolvedValue(
                mockDistribution
            );

            const response = await request(app)
                .get('/api/admin/returns/status-distribution')
                .query({
                    start: '2024-01-01T00:00:00Z',
                    end: '2024-01-31T23:59:59Z',
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockDistribution);
        });

        it('should return 400 for missing parameters', async () => {
            const response = await request(app).get('/api/admin/returns/status-distribution');

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    // ========================================================================
    // PROCESSING METRICS ENDPOINT TESTS
    // ========================================================================

    describe('GET /api/admin/returns/processing-metrics', () => {
        it('should return processing metrics for valid parameters', async () => {
            const mockMetrics = {
                averageApprovalTime: 24.5,
                averageRefundTime: 48.2,
                averageTotalResolutionTime: 96.7,
                medianApprovalTime: 18.0,
                p95ApprovalTime: 72.0,
                p99ApprovalTime: 120.0,
            };

            (returnAnalyticsService.getProcessingTimeMetrics as any).mockResolvedValue(
                mockMetrics
            );

            const response = await request(app)
                .get('/api/admin/returns/processing-metrics')
                .query({
                    sellerId: 'seller-123',
                    start: '2024-01-01T00:00:00Z',
                    end: '2024-01-31T23:59:59Z',
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockMetrics);
        });

        it('should return 400 for missing sellerId', async () => {
            const response = await request(app)
                .get('/api/admin/returns/processing-metrics')
                .query({
                    start: '2024-01-01T00:00:00Z',
                    end: '2024-01-31T23:59:59Z',
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Missing required parameters');
        });
    });

    // ========================================================================
    // CACHE WARMING ENDPOINT TESTS
    // ========================================================================

    describe('POST /api/admin/returns/cache/warm', () => {
        it('should warm cache successfully', async () => {
            (returnAnalyticsService.warmCache as any).mockResolvedValue(undefined);

            const response = await request(app)
                .post('/api/admin/returns/cache/warm')
                .send({ sellerId: 'seller-123' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.message).toBe('Cache warmed successfully');
            expect(returnAnalyticsService.warmCache).toHaveBeenCalledWith('seller-123');
        });

        it('should return 400 for missing sellerId', async () => {
            const response = await request(app).post('/api/admin/returns/cache/warm').send({});

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Missing required parameter');
        });

        it('should handle errors during cache warming', async () => {
            (returnAnalyticsService.warmCache as any).mockRejectedValue(
                new Error('Cache error')
            );

            const response = await request(app)
                .post('/api/admin/returns/cache/warm')
                .send({ sellerId: 'seller-123' });

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Failed to warm cache');
        });
    });

    // ========================================================================
    // AUTHORIZATION TESTS
    // ========================================================================

    describe('Authorization', () => {
        it('should reject requests without proper permissions', async () => {
            // Create app with user without permissions
            const appNoPerms = express();
            appNoPerms.use(express.json());
            appNoPerms.use((req: any, res, next) => {
                req.user = {
                    id: 'user-123',
                    email: 'user@test.com',
                    role: 'user',
                    permissions: [],
                };
                next();
            });
            appNoPerms.use('/api/admin/returns', adminReturnAnalyticsRoutes);

            const response = await request(appNoPerms).get('/api/admin/returns/metrics');

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });
});
