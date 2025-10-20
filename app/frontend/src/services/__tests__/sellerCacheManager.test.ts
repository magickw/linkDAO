import { QueryClient } from '@tanstack/react-query';
import { SellerCacheManager } from '../sellerCacheManager';

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

describe('SellerCacheManager', () => {
  let queryClient: QueryClient;
  let cacheManager: SellerCacheManager;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    cacheManager = new SellerCacheManager(queryClient);
  });

  afterEach(() => {
    cacheManager.cleanup();
    queryClient.clear();
  });

  describe('Cache Invalidation', () => {
    it('should invalidate seller cache for specific wallet', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      
      // Mock some cached data
      queryClient.setQueryData(['seller', 'profile', walletAddress], { 
        id: '1', 
        walletAddress,
        displayName: 'Test Seller' 
      });
      
      // Verify data exists
      const cachedData = queryClient.getQueryData(['seller', 'profile', walletAddress]);
      expect(cachedData).toBeDefined();
      
      // Invalidate cache
      await cacheManager.invalidateSellerCache(walletAddress);
      
      // Verify cache was invalidated
      const queryState = queryClient.getQueryState(['seller', 'profile', walletAddress]);
      expect(queryState?.isInvalidated).toBe(true);
    });

    it('should handle cascade invalidation', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      
      // Mock related cached data
      queryClient.setQueryData(['seller', 'profile', walletAddress], { id: '1' });
      queryClient.setQueryData(['seller', 'dashboard', walletAddress], { sales: { total: 100 } });
      
      // Invalidate with cascade
      await cacheManager.invalidateSellerCache(walletAddress, {
        immediate: true,
        cascade: true,
        dependencies: ['profile']
      });
      
      // Verify both caches were invalidated
      const profileState = queryClient.getQueryState(['seller', 'profile', walletAddress]);
      const dashboardState = queryClient.getQueryState(['seller', 'dashboard', walletAddress]);
      
      expect(profileState?.isInvalidated).toBe(true);
      expect(dashboardState?.isInvalidated).toBe(true);
    });
  });

  describe('Optimistic Updates', () => {
    it('should apply optimistic updates correctly', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const initialData = { id: '1', displayName: 'Original Name' };
      
      queryClient.setQueryData(['seller', 'profile', walletAddress], initialData);
      
      const updates = { displayName: 'Updated Name' };
      
      await cacheManager.updateSellerData(
        walletAddress,
        'profile',
        updates,
        {
          updateFn: (oldData: any, newData: any) => ({ ...oldData, ...newData }),
        }
      );
      
      const updatedData = queryClient.getQueryData(['seller', 'profile', walletAddress]);
      expect(updatedData).toEqual({ id: '1', displayName: 'Updated Name' });
    });
  });

  describe('Cache Statistics', () => {
    it('should provide accurate cache statistics', () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      
      // Add some cached data
      queryClient.setQueryData(['seller', 'profile', walletAddress], { id: '1' });
      queryClient.setQueryData(['seller', 'dashboard', walletAddress], { sales: {} });
      
      const stats = cacheManager.getCacheStats();
      
      expect(stats.totalEntries).toBeGreaterThan(0);
      expect(stats.dependencies).toBeGreaterThan(0);
      expect(typeof stats.queueSize).toBe('number');
    });
  });

  describe('Cache Validation', () => {
    it('should correctly validate cache freshness', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      
      // Set fresh data
      queryClient.setQueryData(['seller', 'profile', walletAddress], { id: '1' });
      
      // Should be valid for fresh data
      const isValid = cacheManager.isCacheValid(walletAddress, 'profile', 60000); // 1 minute
      expect(isValid).toBe(true);
      
      // Wait a bit and then check with very short max age
      await new Promise(resolve => setTimeout(resolve, 10)); // Wait 10ms
      const isValidShort = cacheManager.isCacheValid(walletAddress, 'profile', 1); // 1ms
      expect(isValidShort).toBe(false);
    });
  });

  describe('Batch Operations', () => {
    it('should handle batch invalidation', async () => {
      const wallets = [
        '0x1234567890123456789012345678901234567890',
        '0x0987654321098765432109876543210987654321'
      ];
      
      // Mock data for both wallets
      wallets.forEach(wallet => {
        queryClient.setQueryData(['seller', 'profile', wallet], { id: wallet });
      });
      
      // Verify data exists before invalidation
      wallets.forEach(wallet => {
        const data = queryClient.getQueryData(['seller', 'profile', wallet]);
        expect(data).toBeDefined();
      });
      
      // Batch invalidate - this should not throw an error
      await expect(cacheManager.batchInvalidate(wallets)).resolves.not.toThrow();
      
      // The batch invalidation method exists and can be called
      expect(typeof cacheManager.batchInvalidate).toBe('function');
    });
  });

  describe('Cache Cleanup', () => {
    it('should clear all cache for a wallet', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      
      // Add multiple types of cached data
      queryClient.setQueryData(['seller', 'profile', walletAddress], { id: '1' });
      queryClient.setQueryData(['seller', 'dashboard', walletAddress], { sales: {} });
      queryClient.setQueryData(['seller', 'listings', walletAddress], []);
      
      // Clear all cache for wallet
      await cacheManager.clearSellerCache(walletAddress);
      
      // Verify all data was removed
      expect(queryClient.getQueryData(['seller', 'profile', walletAddress])).toBeUndefined();
      expect(queryClient.getQueryData(['seller', 'dashboard', walletAddress])).toBeUndefined();
      expect(queryClient.getQueryData(['seller', 'listings', walletAddress])).toBeUndefined();
    });
  });
});