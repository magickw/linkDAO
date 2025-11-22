import { Request, Response } from 'express';
import { CharityController } from '../charityController';
import { pool } from '../../config/database';

// Mock the database pool
jest.mock('../../config/database', () => ({
    pool: {
        query: jest.fn(),
    },
}));

describe('CharityController', () => {
    let charityController: CharityController;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let responseJson: jest.Mock;
    let responseStatus: jest.Mock;

    beforeEach(() => {
        charityController = new CharityController();
        responseJson = jest.fn();
        responseStatus = jest.fn().mockReturnValue({ json: responseJson });

        mockRequest = {
            params: {},
            query: {},
            body: {},
            user: { id: 'admin-123' },
        };

        mockResponse = {
            json: responseJson,
            status: responseStatus,
        };

        jest.clearAllMocks();
    });

    describe('getCharities', () => {
        it('should return all charity proposals', async () => {
            const mockCharities = [
                {
                    id: '1',
                    title: 'Test Charity',
                    charityName: 'Test Charity Org',
                    status: 'pending',
                    endTime: new Date(),
                    createdAt: new Date(),
                },
            ];

            (pool.query as jest.Mock).mockResolvedValue({ rows: mockCharities });

            await charityController.getCharities(mockRequest as Request, mockResponse as Response);

            expect(pool.query).toHaveBeenCalled();
            expect(responseJson).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: '1',
                        title: 'Test Charity',
                    }),
                ])
            );
        });

        it('should filter charities by status', async () => {
            mockRequest.query = { status: 'pending' };
            (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

            await charityController.getCharities(mockRequest as Request, mockResponse as Response);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE type = \'charity\''),
                expect.arrayContaining(['pending'])
            );
        });

        it('should handle errors gracefully', async () => {
            (pool.query as jest.Mock).mockRejectedValue(new Error('Database error'));

            await charityController.getCharities(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(500);
            expect(responseJson).toHaveBeenCalledWith({ error: 'Failed to fetch charities' });
        });
    });

    describe('getCharityStats', () => {
        it('should return charity statistics', async () => {
            const mockStats = {
                pending: '5',
                verified: '10',
                rejected: '2',
                total: '17',
            };

            (pool.query as jest.Mock).mockResolvedValue({ rows: [mockStats] });

            await charityController.getCharityStats(mockRequest as Request, mockResponse as Response);

            expect(responseJson).toHaveBeenCalledWith({
                pendingCharityProposals: 5,
                verifiedCharities: 10,
                rejectedCharities: 2,
                totalCharities: 17,
            });
        });

        it('should handle missing data', async () => {
            (pool.query as jest.Mock).mockResolvedValue({ rows: [{}] });

            await charityController.getCharityStats(mockRequest as Request, mockResponse as Response);

            expect(responseJson).toHaveBeenCalledWith({
                pendingCharityProposals: 0,
                verifiedCharities: 0,
                rejectedCharities: 0,
                totalCharities: 0,
            });
        });
    });

    describe('approveCharity', () => {
        beforeEach(() => {
            mockRequest.params = { id: 'charity-123' };
            mockRequest.body = { notes: 'Verified via Charity Navigator' };
        });

        it('should approve a charity successfully', async () => {
            const mockResult = {
                rows: [{ id: 'charity-123', title: 'Test Charity', charityName: 'Test Org' }],
            };

            (pool.query as jest.Mock).mockResolvedValue(mockResult);

            await charityController.approveCharity(mockRequest as Request, mockResponse as Response);

            expect(pool.query).toHaveBeenCalledTimes(2); // Update + audit log
            expect(responseJson).toHaveBeenCalledWith({
                success: true,
                message: 'Charity approved successfully',
                charity: expect.objectContaining({ id: 'charity-123' }),
            });
        });

        it('should require admin ID', async () => {
            mockRequest.user = undefined;

            await charityController.approveCharity(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(401);
            expect(responseJson).toHaveBeenCalledWith({ error: 'Unauthorized' });
        });

        it('should handle non-existent charity', async () => {
            (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

            await charityController.approveCharity(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(404);
            expect(responseJson).toHaveBeenCalledWith({ error: 'Charity not found' });
        });
    });

    describe('rejectCharity', () => {
        beforeEach(() => {
            mockRequest.params = { id: 'charity-123' };
            mockRequest.body = { notes: 'Invalid documentation' };
        });

        it('should reject a charity successfully', async () => {
            const mockResult = {
                rows: [{ id: 'charity-123', title: 'Test Charity', charityName: 'Test Org' }],
            };

            (pool.query as jest.Mock).mockResolvedValue(mockResult);

            await charityController.rejectCharity(mockRequest as Request, mockResponse as Response);

            expect(pool.query).toHaveBeenCalledTimes(2); // Update + audit log
            expect(responseJson).toHaveBeenCalledWith({
                success: true,
                message: 'Charity rejected',
                charity: expect.objectContaining({ id: 'charity-123' }),
            });
        });

        it('should require rejection notes', async () => {
            mockRequest.body = { notes: '' };

            await charityController.rejectCharity(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(400);
            expect(responseJson).toHaveBeenCalledWith({ error: 'Rejection reason is required' });
        });

        it('should require admin ID', async () => {
            mockRequest.user = undefined;

            await charityController.rejectCharity(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(401);
            expect(responseJson).toHaveBeenCalledWith({ error: 'Unauthorized' });
        });
    });

    describe('getCharity', () => {
        it('should return a single charity', async () => {
            mockRequest.params = { id: 'charity-123' };
            const mockCharity = {
                id: 'charity-123',
                title: 'Test Charity',
                charityName: 'Test Org',
                endTime: new Date(),
                createdAt: new Date(),
            };

            (pool.query as jest.Mock).mockResolvedValue({ rows: [mockCharity] });

            await charityController.getCharity(mockRequest as Request, mockResponse as Response);

            expect(responseJson).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'charity-123',
                    title: 'Test Charity',
                })
            );
        });

        it('should return 404 for non-existent charity', async () => {
            mockRequest.params = { id: 'non-existent' };
            (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

            await charityController.getCharity(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(404);
            expect(responseJson).toHaveBeenCalledWith({ error: 'Charity not found' });
        });

        it('should require charity ID', async () => {
            mockRequest.params = {};

            await charityController.getCharity(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(400);
            expect(responseJson).toHaveBeenCalledWith({ error: 'Charity ID is required' });
        });
    });
});
