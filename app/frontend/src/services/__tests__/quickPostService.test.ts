import { QuickPostService } from '../quickPostService';
import { enhancedAuthService } from '../enhancedAuthService';
import { webcrypto } from 'crypto';

// Mock fetch globally
global.fetch = jest.fn();

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
    value: {
        randomUUID: () => 'test-uuid-1234'
    }
});

// Mock enhancedAuthService
jest.mock('../enhancedAuthService', () => ({
    enhancedAuthService: {
        getAuthHeaders: jest.fn()
    }
}));

describe('QuickPostService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock localStorage
        Storage.prototype.getItem = jest.fn();
        Storage.prototype.setItem = jest.fn();
        // Mock sessionStorage
        Storage.prototype.getItem = jest.fn();
        Storage.prototype.setItem = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('createQuickPost', () => {
        it('should send authorId instead of author in request body', async () => {
            const mockPost = {
                id: '1',
                author: '0x1234567890abcdef',
                content: 'Test post content',
                createdAt: new Date().toISOString()
            };

            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ data: { csrfToken: 'test-csrf' } })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ data: mockPost })
                });

            (enhancedAuthService.getAuthHeaders as jest.Mock).mockReturnValue({
                'Authorization': 'Bearer test-token'
            });

            const postData = {
                author: '0x1234567890abcdef',
                content: 'Test post content'
            };

            await QuickPostService.createQuickPost(postData);

            // Get the POST request (second call, first is CSRF token)
            const fetchCalls = (global.fetch as jest.Mock).mock.calls;
            const postCall = fetchCalls.find(call => call[1]?.method === 'POST');
            const requestBody = JSON.parse(postCall[1].body);

            // Verify authorId is sent instead of author
            expect(requestBody).toHaveProperty('authorId');
            expect(requestBody.authorId).toBe('0x1234567890abcdef');
            expect(requestBody).not.toHaveProperty('author');
            expect(requestBody.content).toBe('Test post content');
        });

        it('should include auth headers in the request', async () => {
            const mockPost = {
                id: '1',
                author: '0x1234567890abcdef',
                content: 'Test post',
                createdAt: new Date().toISOString()
            };

            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ data: { csrfToken: 'test-csrf' } })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ data: mockPost })
                });

            const mockAuthHeaders = {
                'Authorization': 'Bearer test-token-123'
            };

            (enhancedAuthService.getAuthHeaders as jest.Mock).mockReturnValue(mockAuthHeaders);

            await QuickPostService.createQuickPost({
                author: '0x1234567890abcdef',
                content: 'Test post'
            });

            const fetchCalls = (global.fetch as jest.Mock).mock.calls;
            const postCall = fetchCalls.find(call => call[1]?.method === 'POST');
            const headers = postCall[1].headers;

            expect(headers).toMatchObject(mockAuthHeaders);
        });

        it('should handle 400 error when authorId is missing', async () => {
            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ data: { csrfToken: 'test-csrf' } })
                })
                .mockResolvedValueOnce({
                    ok: false,
                    status: 400,
                    json: async () => ({ error: 'Author ID is required' })
                });

            (enhancedAuthService.getAuthHeaders as jest.Mock).mockReturnValue({});

            await expect(
                QuickPostService.createQuickPost({
                    author: '',
                    content: 'Test post'
                })
            ).rejects.toThrow('Author ID is required');
        });

        it('should handle 401 unauthorized error', async () => {
            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ data: { csrfToken: 'test-csrf' } })
                })
                .mockResolvedValueOnce({
                    ok: false,
                    status: 401,
                    json: async () => ({ error: 'Unauthorized to create quick post' })
                });

            (enhancedAuthService.getAuthHeaders as jest.Mock).mockReturnValue({});

            await expect(
                QuickPostService.createQuickPost({
                    author: '0x1234567890abcdef',
                    content: 'Test post'
                })
            ).rejects.toThrow('Unauthorized to create quick post');
        });

        it('should handle network errors gracefully', async () => {
            // Mock CSRF token fetch to succeed, then main request to fail
            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ data: { csrfToken: 'test-csrf' } })
                })
                .mockRejectedValueOnce(
                    new Error('Failed to fetch')
                );

            (enhancedAuthService.getAuthHeaders as jest.Mock).mockReturnValue({});

            await expect(
                QuickPostService.createQuickPost({
                    author: '0x1234567890abcdef',
                    content: 'Test post'
                })
            ).rejects.toThrow('Service temporarily unavailable');
        });

        it('should include optional fields in request', async () => {
            const mockPost = {
                id: '1',
                author: '0x1234567890abcdef',
                content: 'Test post',
                createdAt: new Date().toISOString()
            };

            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ data: { csrfToken: 'test-csrf' } })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ data: mockPost })
                });

            (enhancedAuthService.getAuthHeaders as jest.Mock).mockReturnValue({});

            const postData = {
                author: '0x1234567890abcdef',
                content: 'Test post with media',
                media: ['ipfs://Qm123', 'ipfs://Qm456'],
                tags: ['test', 'demo'],
                parentId: 'parent-post-id'
            };

            await QuickPostService.createQuickPost(postData);

            const fetchCalls = (global.fetch as jest.Mock).mock.calls;
            const postCall = fetchCalls.find(call => call[1]?.method === 'POST');
            const requestBody = JSON.parse(postCall[1].body);

            expect(requestBody.media).toEqual(['ipfs://Qm123', 'ipfs://Qm456']);
            expect(requestBody.tags).toEqual(['test', 'demo']);
            expect(requestBody.parentId).toBe('parent-post-id');
        });
    });

    describe('getQuickPost', () => {
        it('should fetch a quick post by id', async () => {
            const mockPost = {
                id: '123',
                author: '0x1234567890abcdef',
                content: 'Test post',
                createdAt: new Date().toISOString()
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: mockPost })
            });

            (enhancedAuthService.getAuthHeaders as jest.Mock).mockReturnValue({});

            const result = await QuickPostService.getQuickPost('123');

            expect(result).toEqual(mockPost);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/quick-posts/123'),
                expect.any(Object)
            );
        });

        it('should return null for 404 errors', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found'
            });

            (enhancedAuthService.getAuthHeaders as jest.Mock).mockReturnValue({});

            const result = await QuickPostService.getQuickPost('nonexistent');

            expect(result).toBeNull();
        });
    });
});
