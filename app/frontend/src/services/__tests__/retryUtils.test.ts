import { retryWithBackoff, fetchWithRetry } from '../retryUtils';

describe('retryUtils', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('retryWithBackoff', () => {
    it('should resolve immediately if the function succeeds on first try', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await retryWithBackoff(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('first failure'))
        .mockRejectedValueOnce(new Error('second failure'))
        .mockResolvedValue('success');

      const resultPromise = retryWithBackoff(fn, { maxRetries: 3 });
      
      // Advance timers to allow retries
      await jest.advanceTimersByTimeAsync(1000);
      await jest.advanceTimersByTimeAsync(2000);
      
      const result = await resultPromise;
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw the last error if all retries fail', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('persistent failure'));
      
      await expect(retryWithBackoff(fn, { maxRetries: 2 })).rejects.toThrow('persistent failure');
      expect(fn).toHaveBeenCalledTimes(3); // Initial call + 2 retries
    });

    it('should not retry if shouldRetry returns false', async () => {
      const error = new Error('non-retryable error');
      const fn = jest.fn().mockRejectedValue(error);
      const shouldRetry = jest.fn().mockReturnValue(false);
      
      await expect(retryWithBackoff(fn, { maxRetries: 2, shouldRetry })).rejects.toThrow('non-retryable error');
      expect(fn).toHaveBeenCalledTimes(1); // Only initial call
      expect(shouldRetry).toHaveBeenCalledWith(error);
    });

    it('should apply jitter to delay times', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('failure'))
        .mockResolvedValue('success');

      const resultPromise = retryWithBackoff(fn, { maxRetries: 1, initialDelay: 1000 });
      
      // Advance timers to allow retry
      await jest.advanceTimersByTimeAsync(1500); // Allow for jitter
      
      const result = await resultPromise;
      expect(result).toBe('success');
    });
  });

  describe('fetchWithRetry', () => {
    it('should make a successful fetch request', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      } as any);

      const response = await fetchWithRetry('/api/test');
      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/test', undefined);
    });

    it('should retry on network errors', async () => {
      global.fetch = jest.fn()
        .mockRejectedValueOnce(new TypeError('fetch failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: 'test' })
        } as any);

      const response = await fetchWithRetry('/api/test', undefined, { maxRetries: 1 });
      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 5xx errors', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: 'test' })
        } as any);

      const response = await fetchWithRetry('/api/test', undefined, { maxRetries: 1 });
      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 429 errors', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests'
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: 'test' })
        } as any);

      const response = await fetchWithRetry('/api/test', undefined, { maxRetries: 1 });
      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 4xx errors (except 429)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as any);

      await expect(fetchWithRetry('/api/test')).rejects.toThrow('HTTP 404: Not Found');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});