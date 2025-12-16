import { globalFetch, get, post, put, patch, del } from '../globalFetchWrapper';
import { enhancedAuthService } from '../enhancedAuthService';

// Mock the enhancedAuthService
jest.mock('../enhancedAuthService', () => ({
  enhancedAuthService: {
    isAuthenticated: jest.fn(),
    getAuthHeaders: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn()
  }
}));

// Mock fetch
global.fetch = jest.fn();

describe('globalFetchWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the module state
    const module = require('../globalFetchWrapper');
    if (module.isRefreshing) {
      module.isRefreshing = false;
      module.refreshPromise = null;
      module.failedRequestQueue.length = 0;
    }
  });

  describe('globalFetch', () => {
    it('should make a successful GET request', async () => {
      const mockResponse = { id: 1, name: 'Test' };
      const headers = new Headers();
      headers.set('content-type', 'application/json');
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      (enhancedAuthService.isAuthenticated as jest.Mock).mockReturnValue(true);
      (enhancedAuthService.getAuthHeaders as jest.Mock).mockReturnValue({
        'Authorization': 'Bearer token123'
      });

      const result = await globalFetch('/api/test');

      expect(fetch).toHaveBeenCalledWith('/api/test', {
        headers: expect.any(Headers)
      });
      expect(fetch.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer token123');
      expect(result).toEqual({
        data: mockResponse,
        success: true,
        status: 200,
        headers: expect.any(Headers)
      });
    });

    it('should handle 401 error and refresh token', async () => {
      // First call returns 401
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          headers: new Headers()
        });

      (enhancedAuthService.isAuthenticated as jest.Mock).mockReturnValue(true);
      (enhancedAuthService.getAuthHeaders as jest.Mock).mockReturnValue({
        'Authorization': 'Bearer old-token'
      });

      // Mock successful token refresh
      (enhancedAuthService.refreshToken as jest.Mock).mockResolvedValueOnce({
        success: true,
        token: 'new-token',
        user: { id: '1', address: '0x123' }
      });

      // Second call after refresh succeeds
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: jest.fn().mockResolvedValue({ data: 'success' })
      });

      // Update auth headers after refresh
      (enhancedAuthService.getAuthHeaders as jest.Mock).mockReturnValue({
        'Authorization': 'Bearer new-token'
      });

      const result = await globalFetch('/api/test');

      expect(enhancedAuthService.refreshToken).toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    it('should handle failed token refresh', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers()
      });

      (enhancedAuthService.isAuthenticated as jest.Mock).mockReturnValue(true);
      (enhancedAuthService.getAuthHeaders as jest.Mock).mockReturnValue({
        'Authorization': 'Bearer old-token'
      });

      // Mock failed token refresh
      (enhancedAuthService.refreshToken as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Refresh failed'
      });

      const result = await globalFetch('/api/test');

      expect(enhancedAuthService.logout).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed. Please log in again.');
    });

    it('should skip authentication when skipAuth is true', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: jest.fn().mockResolvedValue({ data: 'public' })
      });

      const result = await globalFetch('/api/public', { skipAuth: true });

      expect(enhancedAuthService.isAuthenticated).not.toHaveBeenCalled();
      expect(enhancedAuthService.getAuthHeaders).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle network errors with retry', async () => {
      (fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: jest.fn().mockResolvedValue({ data: 'success after retry' })
        });

      (enhancedAuthService.isAuthenticated as jest.Mock).mockReturnValue(false);

      const result = await globalFetch('/api/test', { maxRetries: 2 });

      expect(fetch).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      const headers = new Headers();
      headers.set('content-type', 'application/json');
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers,
        json: jest.fn().mockResolvedValue({ data: 'success' })
      });
      (enhancedAuthService.isAuthenticated as jest.Mock).mockReturnValue(false);
    });

    it('get should make GET request', async () => {
      await get('/api/test');
      expect(fetch).toHaveBeenCalledWith('/api/test', {
        headers: expect.any(Headers),
        method: 'GET'
      });
      expect(fetch.mock.calls[0][1].headers.get('Content-Type')).toBeNull();
    });

    it('post should make POST request with body', async () => {
      await post('/api/test', { name: 'Test' });
      expect(fetch).toHaveBeenCalledWith('/api/test', {
        headers: expect.any(Headers),
        method: 'POST',
        body: JSON.stringify({ name: 'Test' })
      });
      expect(fetch.mock.calls[0][1].headers.get('Content-Type')).toBe('application/json');
    });

    it('put should make PUT request with body', async () => {
      await put('/api/test', { name: 'Updated' });
      expect(fetch).toHaveBeenCalledWith('/api/test', {
        headers: expect.any(Headers),
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' })
      });
      expect(fetch.mock.calls[0][1].headers.get('Content-Type')).toBe('application/json');
    });

    it('patch should make PATCH request with body', async () => {
      await patch('/api/test', { name: 'Patched' });
      expect(fetch).toHaveBeenCalledWith('/api/test', {
        headers: expect.any(Headers),
        method: 'PATCH',
        body: JSON.stringify({ name: 'Patched' })
      });
      expect(fetch.mock.calls[0][1].headers.get('Content-Type')).toBe('application/json');
    });

    it('del should make DELETE request', async () => {
      await del('/api/test/1');
      expect(fetch).toHaveBeenCalledWith('/api/test/1', {
        headers: expect.any(Headers),
        method: 'DELETE'
      });
      expect(fetch.mock.calls[0][1].headers.get('Content-Type')).toBeNull();
    });
  });

  describe('request queuing during refresh', () => {
    it('should queue requests when token is refreshing', async () => {
      // Set up refreshing state
      const module = require('../globalFetchWrapper');
      module.isRefreshing = true;
      module.failedRequestQueue = [];

      let resolveRefresh: (value: boolean) => void;
      const refreshPromise = new Promise<boolean>((resolve) => {
        resolveRefresh = resolve;
      });
      module.refreshPromise = refreshPromise;

      // Mock successful responses after refresh
      const headers = new Headers();
      headers.set('content-type', 'application/json');
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers,
        json: jest.fn().mockResolvedValue({ data: 'success' })
      });

      (enhancedAuthService.isAuthenticated as jest.Mock).mockReturnValue(true);
      (enhancedAuthService.getAuthHeaders as jest.Mock).mockReturnValue({
        'Authorization': 'Bearer token'
      });

      // Make multiple requests while refreshing
      const request1 = globalFetch('/api/test1');
      const request2 = globalFetch('/api/test2');

      // Resolve the refresh
      resolveRefresh(true);

      // Wait for requests to complete
      const [result1, result2] = await Promise.all([request1, request2]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
});