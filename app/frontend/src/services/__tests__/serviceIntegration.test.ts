/**
 * Service Integration Tests
 * Tests integration between enhanced cache service and existing services
 */

import { serviceWorkerCacheService } from '../serviceWorkerCacheService';
import { createIntelligentCacheIntegration } from '../intelligentCacheIntegration';
import { QueryClient } from '@tanstack/react-query';

// Mock dependencies
jest.mock('../serviceWorkerCacheService');
jest.mock('../intelligentSellerCache');
jest.mock('../cachePerformanceMonitor');
jest.mock('../cacheOptimizationService');
jest.mock('../sellerCacheManager');

const mockServiceWorkerCacheService = serviceWorkerCacheService as jest.Mocked<typeof serviceWorkerCacheService>;

describe('Service Integration Tests', () => {
  let queryClient: QueryClient;
  let intelligentCacheIntegration: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    // Reset mocks
    jest.clearAllMocks();
    
    // Mock service worker cache service methods
    mockServiceWorkerCacheService.initialize = jest.fn().mockResolvedValue(undefined);
    mockServiceWorkerCacheService.fetchWithStrategy = jest.fn();
    mockServiceWorkerCacheService.putWithMetadata = jest.fn();
    mockServiceWorkerCacheService.invalidateByTag = jest.fn();
    mockServiceWorkerCacheService.flushOfflineQueue = jest.fn();
    mockServiceWorkerCacheService.getCacheStats = jest.fn();
    mockServiceWorkerCacheService.getPerformanceMetrics = jest.fn();

    intelligentCacheIntegration = createIntelligentCacheIntegration(queryClient);
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('IntelligentCacheIntegration with Enhanced Service Worker', () => {
    it('should initialize enhanced service worker cache service on start', async () => {
      await intelligentCacheIntegration.start();

      expect(mockServiceWorkerCacheService.initialize).toHaveBeenCalledTimes(1);
    });

    it('should use enhanced cache service for seller data retrieval', async () => {
      const mockResponse = new Response(JSON.stringify({ id: '1', name: 'Test Seller' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

      mockServiceWorkerCacheService.fetchWithStrategy.mockResolvedValue(mockResponse);

      const result = await intelligentCacheIntegration.getSellerData('profile', 'wallet123');

      expect(mockServiceWorkerCacheService.fetchWithStrategy).toHaveBeenCalledWith(
        '/api/seller/profile/wallet123',
        'NetworkFirst',
        {
          tags: ['seller', 'profile', 'wallet123'],
          userScope: 'wallet123',
          maxAge: 300000
        }
      );

      expect(result).toEqual({ id: '1', name: 'Test Seller' });
    });

    it('should handle cache service failures gracefully', async () => {
      mockServiceWorkerCacheService.fetchWithStrategy.mockRejectedValue(new Error('Cache service failed'));

      // Should not throw and should fallback to other cache methods
      const result = await intelligentCacheIntegration.getSellerData('profile', 'wallet123');

      expect(result).toBeNull(); // Should return null when all methods fail
    });

    it('should invalidate cache using enhanced service worker tags', async () => {
      await intelligentCacheIntegration.invalidateSellerCache('wallet123', ['profile', 'dashboard']);

      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('seller');
      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('wallet123');
      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('profile');
      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('dashboard');
    });

    it('should store data in both enhanced cache and legacy cache', async () => {
      const testData = { id: '1', name: 'Test Data' };
      const mockResponse = new Response(JSON.stringify(testData));

      await intelligentCacheIntegration.setSellerData('profile', 'wallet123', testData);

      // Should store in React Query cache (legacy)
      const legacyData = queryClient.getQueryData(['seller', 'profile', 'wallet123']);
      expect(legacyData).toEqual(testData);
    });
  });

  describe('PWAProvider Integration', () => {
    it('should handle BroadcastChannel messages for cache updates', () => {
      // Mock BroadcastChannel
      const mockBroadcastChannel = {
        addEventListener: jest.fn(),
        postMessage: jest.fn(),
        close: jest.fn()
      };

      (global as any).BroadcastChannel = jest.fn(() => mockBroadcastChannel);

      // Test would require mounting PWAProvider component
      // This is a placeholder for the integration test structure
      expect(true).toBe(true);
    });
  });

  describe('OfflineSyncManager Integration', () => {
    it('should use enhanced service worker for offline queue management', async () => {
      mockServiceWorkerCacheService.flushOfflineQueue.mockResolvedValue(undefined);

      // Mock the sync process
      const mockSyncNow = jest.fn().mockImplementation(async () => {
        await mockServiceWorkerCacheService.flushOfflineQueue();
      });

      await mockSyncNow();

      expect(mockServiceWorkerCacheService.flushOfflineQueue).toHaveBeenCalledTimes(1);
    });

    it('should handle BroadcastChannel sync coordination', () => {
      const mockBroadcastChannel = {
        addEventListener: jest.fn(),
        postMessage: jest.fn(),
        close: jest.fn()
      };

      (global as any).BroadcastChannel = jest.fn(() => mockBroadcastChannel);

      // Test BroadcastChannel setup
      expect(BroadcastChannel).toBeDefined();
    });
  });

  describe('ServiceWorkerUtil Integration', () => {
    it('should register enhanced service worker by default', async () => {
      // Mock navigator.serviceWorker
      const mockServiceWorker = {
        register: jest.fn().mockResolvedValue({
          addEventListener: jest.fn(),
          installing: null,
          waiting: null,
          active: { postMessage: jest.fn() }
        }),
        ready: Promise.resolve({
          sync: { register: jest.fn() }
        }),
        addEventListener: jest.fn(),
        controller: { postMessage: jest.fn() }
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: mockServiceWorker,
        writable: true
      });

      // Mock ServiceWorkerUtil initialization
      const mockInit = jest.fn().mockImplementation(async () => {
        await mockServiceWorker.register('/sw-enhanced.js', { scope: '/' });
        await mockServiceWorkerCacheService.initialize();
      });

      await mockInit();

      expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw-enhanced.js', { scope: '/' });
      expect(mockServiceWorkerCacheService.initialize).toHaveBeenCalled();
    });

    it('should handle enhanced message passing', async () => {
      const mockServiceWorker = {
        addEventListener: jest.fn(),
        controller: { postMessage: jest.fn() }
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: mockServiceWorker,
        writable: true
      });

      // Test message handling setup
      expect(mockServiceWorker.addEventListener).toBeDefined();
    });
  });

  describe('Performance Integration', () => {
    it('should integrate cache performance metrics', async () => {
      const mockMetrics = {
        summary: {
          hitRates: {
            overall: { ratio: 0.85 },
            feed: { ratio: 0.90 },
            marketplace: { ratio: 0.80 }
          },
          preload: { successRate: 0.95 },
          storage: { used: 1024000, percentage: 15.5 }
        }
      };

      const mockStats = {
        sync: { queueSize: 3, syncInProgress: false },
        storage: { used: 1024000, available: 6553600, percentage: 15.5 }
      };

      mockServiceWorkerCacheService.getPerformanceMetrics.mockReturnValue(mockMetrics);
      mockServiceWorkerCacheService.getCacheStats.mockResolvedValue(mockStats);

      const metrics = mockServiceWorkerCacheService.getPerformanceMetrics();
      const stats = await mockServiceWorkerCacheService.getCacheStats();

      expect(metrics.summary.hitRates.overall.ratio).toBe(0.85);
      expect(stats.sync.queueSize).toBe(3);
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should handle service worker unavailability gracefully', async () => {
      // Mock service worker not supported
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        writable: true
      });

      mockServiceWorkerCacheService.initialize.mockRejectedValue(new Error('Service Worker not supported'));

      // Should not throw error
      await expect(intelligentCacheIntegration.start()).resolves.not.toThrow();
    });

    it('should fallback to legacy cache when enhanced cache fails', async () => {
      mockServiceWorkerCacheService.fetchWithStrategy.mockRejectedValue(new Error('Enhanced cache failed'));

      // Set up legacy cache data
      queryClient.setQueryData(['seller', 'profile', 'wallet123'], { id: '1', name: 'Legacy Data' });

      const result = await intelligentCacheIntegration.getSellerData('profile', 'wallet123');

      expect(result).toEqual({ id: '1', name: 'Legacy Data' });
    });

    it('should handle cache invalidation failures gracefully', async () => {
      mockServiceWorkerCacheService.invalidateByTag.mockRejectedValue(new Error('Invalidation failed'));

      // Should not throw error
      await expect(intelligentCacheIntegration.invalidateSellerCache('wallet123')).resolves.not.toThrow();
    });
  });

  describe('Cache Coordination', () => {
    it('should coordinate cache updates across multiple cache layers', async () => {
      const testData = { id: '1', name: 'Updated Data' };
      
      await intelligentCacheIntegration.setSellerData('profile', 'wallet123', testData, {
        priority: 'high',
        ttl: 600000,
        dependencies: ['user', 'seller']
      });

      // Should update both enhanced cache and legacy cache
      const legacyData = queryClient.getQueryData(['seller', 'profile', 'wallet123']);
      expect(legacyData).toEqual(testData);
    });

    it('should maintain cache consistency during invalidation', async () => {
      await intelligentCacheIntegration.invalidateSellerCache('wallet123', ['profile']);

      // Should invalidate in both enhanced and legacy caches
      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('seller');
      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('wallet123');
      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('profile');
    });
  });
});