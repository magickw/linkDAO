import { Request, Response } from 'express';
import { QuickPostController } from '../quickPostController';
import { QuickPostService } from '../../services/quickPostService';
import { MetadataService } from '../../services/metadataService';

// Mock dependencies
jest.mock('../../services/quickPostService');
jest.mock('../../services/metadataService');

describe('QuickPostController', () => {
    let controller: QuickPostController;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockQuickPostService: jest.Mocked<QuickPostService>;
    let mockMetadataService: jest.Mocked<MetadataService>;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Create mock response
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        // Create mock request
        mockRequest = {
            body: {},
            params: {},
            query: {}
        };

        // Initialize controller
        controller = new QuickPostController();

        // Get mocked service instances
        mockQuickPostService = QuickPostService.prototype as jest.Mocked<QuickPostService>;
        mockMetadataService = MetadataService.prototype as jest.Mocked<MetadataService>;
    });

    describe('createQuickPost', () => {
        it('should create a quick post with valid authorId', async () => {
            const mockPost = {
                id: '1',
                authorId: '0x1234567890abcdef',
                contentCid: 'Qm123',
                content: 'Test post content',
                createdAt: new Date()
            };

            mockRequest.body = {
                content: 'Test post content',
                authorId: '0x1234567890abcdef'
            };

            mockMetadataService.uploadToIPFS = jest.fn().mockResolvedValue('Qm123');
            mockQuickPostService.createQuickPost = jest.fn().mockResolvedValue(mockPost);

            await controller.createQuickPost(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: mockPost
                })
            );
        });

        it('should return 400 when content is missing', async () => {
            mockRequest.body = {
                authorId: '0x1234567890abcdef'
                // content is missing
            };

            await controller.createQuickPost(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Content is required'
                })
            );
        });

        it('should return 400 when authorId is missing', async () => {
            mockRequest.body = {
                content: 'Test post content'
                // authorId is missing
            };

            await controller.createQuickPost(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Author ID is required'
                })
            );
        });

        it('should return 400 when content is empty string', async () => {
            mockRequest.body = {
                content: '   ',
                authorId: '0x1234567890abcdef'
            };

            await controller.createQuickPost(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Content is required'
                })
            );
        });

        it('should handle IPFS upload failure gracefully', async () => {
            const mockPost = {
                id: '1',
                authorId: '0x1234567890abcdef',
                contentCid: expect.stringContaining('mock_content_'),
                content: 'Test post content',
                createdAt: new Date()
            };

            mockRequest.body = {
                content: 'Test post content',
                authorId: '0x1234567890abcdef'
            };

            // Simulate IPFS failure
            mockMetadataService.uploadToIPFS = jest.fn().mockRejectedValue(
                new Error('IPFS service unavailable')
            );
            mockQuickPostService.createQuickPost = jest.fn().mockResolvedValue(mockPost);

            await controller.createQuickPost(
                mockRequest as Request,
                mockResponse as Response
            );

            // Should still succeed with mock CID
            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockQuickPostService.createQuickPost).toHaveBeenCalledWith(
                expect.objectContaining({
                    authorId: '0x1234567890abcdef',
                    content: 'Test post content',
                    contentCid: expect.stringContaining('mock_content_')
                })
            );
        });

        it('should include optional fields when provided', async () => {
            const mockPost = {
                id: '1',
                authorId: '0x1234567890abcdef',
                contentCid: 'Qm123',
                content: 'Test post',
                parentId: 'parent-123',
                mediaCids: '["Qm456"]',
                tags: '["test"]',
                createdAt: new Date()
            };

            mockRequest.body = {
                content: 'Test post',
                authorId: '0x1234567890abcdef',
                parentId: 'parent-123',
                media: ['Qm456'],
                tags: ['test']
            };

            mockMetadataService.uploadToIPFS = jest.fn().mockResolvedValue('Qm123');
            mockQuickPostService.createQuickPost = jest.fn().mockResolvedValue(mockPost);

            await controller.createQuickPost(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockQuickPostService.createQuickPost).toHaveBeenCalledWith(
                expect.objectContaining({
                    authorId: '0x1234567890abcdef',
                    parentId: 'parent-123',
                    mediaCids: '["Qm456"]',
                    tags: '["test"]'
                })
            );
        });
    });

    describe('getCsrfToken', () => {
        it('should generate and return a CSRF token', async () => {
            await controller.getCsrfToken(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        csrfToken: expect.any(String)
                    })
                })
            );
        });

        it('should return a valid UUID as CSRF token', async () => {
            const jsonSpy = jest.spyOn(mockResponse, 'json');

            await controller.getCsrfToken(
                mockRequest as Request,
                mockResponse as Response
            );

            const callArgs = jsonSpy.mock.calls[0][0] as any;
            const csrfToken = callArgs.data.csrfToken;

            // UUID v4 format validation
            expect(csrfToken).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            );
        });
    });

    describe('getQuickPost', () => {
        it('should return a quick post by id', async () => {
            const mockPost = {
                id: '123',
                authorId: '0x1234567890abcdef',
                content: 'Test post',
                createdAt: new Date()
            };

            mockRequest.params = { id: '123' };
            mockQuickPostService.getQuickPost = jest.fn().mockResolvedValue(mockPost);

            await controller.getQuickPost(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: mockPost
                })
            );
        });

        it('should return 404 when post not found', async () => {
            mockRequest.params = { id: 'nonexistent' };
            mockQuickPostService.getQuickPost = jest.fn().mockResolvedValue(null);

            await controller.getQuickPost(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Quick post not found'
                })
            );
        });
    });
});
