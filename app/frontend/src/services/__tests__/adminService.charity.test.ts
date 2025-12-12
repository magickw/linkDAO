import { adminService } from '../adminService';
import { enhancedAuthService } from '../enhancedAuthService';

// Mock enhancedAuthService
jest.mock('../enhancedAuthService', () => ({
    enhancedAuthService: {
        getAuthHeaders: jest.fn(() => ({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
        })),
    },
}));

// Mock fetch
global.fetch = jest.fn();

describe('AdminService - Charity Methods', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getCharities', () => {
        it('should fetch charities without filters', async () => {
            const mockCharities = [
                { id: '1', title: 'Test Charity 1', status: 'pending' },
                { id: '2', title: 'Test Charity 2', status: 'verified' },
            ];

            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => mockCharities,
            });

            const result = await adminService.getCharities();

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/admin/charities'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-token',
                    }),
                })
            );
            expect(result).toEqual(mockCharities);
        });

        it('should fetch charities with status filter', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => [],
            });

            await adminService.getCharities({ status: 'pending' });

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('status=pending'),
                expect.any(Object)
            );
        });

        it('should fetch charities with limit', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => [],
            });

            await adminService.getCharities({ limit: 10 });

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('limit=10'),
                expect.any(Object)
            );
        });

        it('should return empty array on error', async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

            const result = await adminService.getCharities();

            expect(result).toEqual([]);
        });

        it('should return empty array on non-ok response', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                json: async () => ({ error: 'Server error' }),
            });

            const result = await adminService.getCharities();

            expect(result).toEqual([]);
        });
    });

    describe('getCharityStats', () => {
        it('should fetch charity statistics', async () => {
            const mockStats = {
                pendingCharityProposals: 5,
                verifiedCharities: 10,
                rejectedCharities: 2,
                totalCharities: 17,
            };

            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => mockStats,
            });

            const result = await adminService.getCharityStats();

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/admin/charities/stats'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-token',
                    }),
                })
            );
            expect(result).toEqual(mockStats);
        });

        it('should return zero stats on error', async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

            const result = await adminService.getCharityStats();

            expect(result).toEqual({
                pendingCharityProposals: 0,
                verifiedCharities: 0,
                rejectedCharities: 0,
                totalCharities: 0,
            });
        });
    });

    describe('approveCharity', () => {
        it('should approve charity without notes', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ success: true }),
            });

            const result = await adminService.approveCharity('charity-123');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/admin/charities/charity-123/approve'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-token',
                        'Content-Type': 'application/json',
                    }),
                    body: JSON.stringify({ notes: undefined }),
                })
            );
            expect(result).toEqual({ success: true });
        });

        it('should approve charity with notes', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ success: true }),
            });

            await adminService.approveCharity('charity-123', 'Verified via Charity Navigator');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: JSON.stringify({ notes: 'Verified via Charity Navigator' }),
                })
            );
        });

        it('should return failure on error', async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

            const result = await adminService.approveCharity('charity-123');

            expect(result).toEqual({ success: false });
        });

        it('should return failure on non-ok response', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                json: async () => ({ error: 'Charity not found' }),
            });

            const result = await adminService.approveCharity('charity-123');

            expect(result).toEqual({ success: false });
        });
    });

    describe('rejectCharity', () => {
        it('should reject charity with notes', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ success: true }),
            });

            const result = await adminService.rejectCharity('charity-123', 'Invalid documentation');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/admin/charities/charity-123/reject'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-token',
                        'Content-Type': 'application/json',
                    }),
                    body: JSON.stringify({ notes: 'Invalid documentation' }),
                })
            );
            expect(result).toEqual({ success: true });
        });

        it('should return failure on error', async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

            const result = await adminService.rejectCharity('charity-123', 'Test reason');

            expect(result).toEqual({ success: false });
        });

        it('should return failure on non-ok response', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                json: async () => ({ error: 'Rejection reason is required' }),
            });

            const result = await adminService.rejectCharity('charity-123', '');

            expect(result).toEqual({ success: false });
        });
    });

    describe('getAdminStats - Charity Integration', () => {
        it('should include charity stats in admin stats', async () => {
            const mockAdminStats = {
                pendingModerations: 5,
                pendingSellerApplications: 3,
                openDisputes: 2,
                suspendedUsers: 1,
                totalUsers: 100,
                totalSellers: 20,
                recentActions: [],
            };

            const mockCharityStats = {
                pendingCharityProposals: 7,
            };

            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockAdminStats,
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockCharityStats,
                });

            const result = await adminService.getAdminStats();

            expect(result).toEqual({
                ...mockAdminStats,
                pendingCharityProposals: 7,
            });
        });

        it('should default to 0 if charity stats fail', async () => {
            const mockAdminStats = {
                pendingModerations: 5,
                pendingSellerApplications: 3,
                openDisputes: 2,
                suspendedUsers: 1,
                totalUsers: 100,
                totalSellers: 20,
                recentActions: [],
            };

            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockAdminStats,
                })
                .mockResolvedValueOnce({
                    ok: false,
                    status: 500,
                });

            const result = await adminService.getAdminStats();

            expect(result.pendingCharityProposals).toBe(0);
        });
    });
});
