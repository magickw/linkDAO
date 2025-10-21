import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { jest } from '@jest/globals';

// Import seller components
import { SellerProfilePage } from '../../../components/Marketplace/Seller/SellerProfilePage';
import { SellerDashboard } from '../../../components/Marketplace/Dashboard/SellerDashboard';
import { SellerStorePage } from '../../../components/Marketplace/Seller/SellerStorePage';

// Import services
import { sellerCacheManager } from '../../../services/sellerCacheManager';
import { unifiedSellerAPIClient } from '../../../services/unifiedSellerAPIClient';
import { sellerService } from '../../../services/sellerService';

// Mock fetch
global.fetch = jest.fn();

const TestWrapper: React.FC<{ children: React.ReactNode; queryClient?: QueryClient }> = ({ 
  children, 
  queryClient: providedQueryClient 
}) => {
  const queryClient = providedQueryClient || new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 10000, // 10 seconds for testing
        staleTime: 5000,   // 5 seconds for testing
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Seller Cache Invalidation Tests', () => {
  let queryClient: QueryClient;
  const testWalletAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 10000,
          staleTime: 5000,
        },
      },
    });
    
    // Clear all caches
    sellerCacheManager.clearAll();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Profile Update Cache Invalidation', () => {
    it('should invalidate profile cache when profile is updated', async () => {
      const initialProfile = { 
        walletAddress: testWalletAddress, 
        displayName: 'Initial Name',
        storeName: 'Initial Store',
        bio: 'Initial bio'
      };
      
      const updatedProfile = { 
        walletAddress: testWalletAddress, 
        displayName: 'Updated Name',
        storeName: 'Updated Store',
        bio: 'Updated bio'
      };

      // Mock initial profile fetch
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: initialProfile }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: updatedProfile }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: updatedProfile }),
        });

      // Load initial profile into cache
      const profile1 = await sellerService.getSellerProfile(testWalletAddress);
      expect(profile1?.displayName).toBe('Initial Name');

      // Update profile and invalidate cache
      await act(async () => {
        await unifiedSellerAPIClient.updateProfile(testWalletAddress, { displayName: 'Updated Name' });
        await sellerCacheManager.invalidateSellerCache(testWalletAddress);
      });

      // Fetch profile again - should get updated data
      const profile2 = await sellerService.getSellerProfile(testWalletAddress);
      expect(profile2?.displayName).toBe('Updated Name');

      // Verify cache was actually invalidated (new API call made)
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('should invalidate cache across all seller components when profile changes', async () => {
      const initialProfile = { 
        walletAddress: testWalletAddress, 
        displayName: 'Component Test Initial' 
      };
      
      const updatedProfile = { 
        walletAddress: testWalletAddress, 
        displayName: 'Component Test Updated' 
      };

      // Mock responses for different components
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: initialProfile }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { profile: initialProfile } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { seller: initialProfile } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: updatedProfile }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { profile: updatedProfile } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { seller: updatedProfile } }),
        });

      // Render multiple components
      const { rerender } = render(
        <TestWrapper queryClient={queryClient}>
          <div>
            <SellerProfilePage walletAddress={testWalletAddress} />
            <SellerDashboard walletAddress={testWalletAddress} />
            <SellerStorePage walletAddress={testWalletAddress} />
          </div>
        </TestWrapper>
      );

      // Wait for initial data load
      await waitFor(() => {
        expect(screen.getAllByText('Component Test Initial')).toHaveLength(3);
      });

      // Update profile and invalidate cache
      await act(async () => {
        await sellerCacheManager.invalidateSellerCache(testWalletAddress);
      });

      // Re-render components
      rerender(
        <TestWrapper queryClient={queryClient}>
          <div>
            <SellerProfilePage walletAddress={testWalletAddress} />
            <SellerDashboard walletAddress={testWalletAddress} />
            <SellerStorePage walletAddress={testWalletAddress} />
          </div>
        </TestWrapper>
      );

      // All components should show updated data
      await waitFor(() => {
        expect(screen.getAllByText('Component Test Updated')).toHaveLength(3);
      });
    });

    it('should handle partial cache invalidation correctly', async () => {
      const profile = { walletAddress: testWalletAddress, displayName: 'Partial Test' };
      const listings = [{ id: '1', title: 'Test Product', sellerId: testWalletAddress }];
      const dashboard = { profile, listings, stats: { totalSales: 100 } };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: profile }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: listings }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: dashboard }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { ...profile, displayName: 'Updated Partial' } }),
        });

      // Load data into cache
      await sellerService.getSellerProfile(testWalletAddress);
      await sellerService.getListings(testWalletAddress);
      await sellerService.getDashboardStats(testWalletAddress);

      // Invalidate only profile cache
      await act(async () => {
        await sellerCacheManager.invalidateProfileCache(testWalletAddress);
      });

      // Profile should be refetched, but listings should remain cached
      const updatedProfile = await sellerService.getSellerProfile(testWalletAddress);
      expect(updatedProfile?.displayName).toBe('Updated Partial');

      // Should have made 4 API calls total (3 initial + 1 profile refetch)
      expect(fetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('Listing Update Cache Invalidation', () => {
    it('should invalidate listing cache when listings are modified', async () => {
      const initialListings = [
        { id: '1', title: 'Initial Product 1', sellerId: testWalletAddress },
        { id: '2', title: 'Initial Product 2', sellerId: testWalletAddress },
      ];

      const updatedListings = [
        { id: '1', title: 'Updated Product 1', sellerId: testWalletAddress },
        { id: '2', title: 'Updated Product 2', sellerId: testWalletAddress },
        { id: '3', title: 'New Product 3', sellerId: testWalletAddress },
      ];

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: initialListings }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { id: '3', title: 'New Product 3' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: updatedListings }),
        });

      // Load initial listings
      const listings1 = await sellerService.getListings(testWalletAddress);
      expect(listings1).toHaveLength(2);

      // Add new listing and invalidate cache
      await act(async () => {
        await unifiedSellerAPIClient.createListing(testWalletAddress, {
          title: 'New Product 3',
          description: 'New product description',
          price: 100,
          currency: 'USD',
        });
        await sellerCacheManager.invalidateListingsCache(testWalletAddress);
      });

      // Fetch listings again - should include new listing
      const listings2 = await sellerService.getListings(testWalletAddress);
      expect(listings2).toHaveLength(3);
      expect(listings2?.find(l => l.id === '3')).toBeTruthy();
    });

    it('should invalidate dashboard cache when listings change', async () => {
      const profile = { walletAddress: testWalletAddress, displayName: 'Dashboard Test' };
      const initialListings = [{ id: '1', title: 'Initial Product' }];
      const updatedListings = [
        { id: '1', title: 'Initial Product' },
        { id: '2', title: 'New Product' },
      ];

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            success: true, 
            data: { profile, listings: initialListings, stats: { totalListings: 1 } }
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { id: '2', title: 'New Product' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            success: true, 
            data: { profile, listings: updatedListings, stats: { totalListings: 2 } }
          }),
        });

      // Load initial dashboard
      const dashboard1 = await sellerService.getDashboardStats(testWalletAddress);
      expect(dashboard1?.stats.totalListings).toBe(1);

      // Add listing and invalidate related caches
      await act(async () => {
        await unifiedSellerAPIClient.createListing(testWalletAddress, {
          title: 'New Product',
          description: 'New product description',
          price: 200,
          currency: 'USD',
        });
        await sellerCacheManager.invalidateRelatedCaches(testWalletAddress, 'listings');
      });

      // Dashboard should reflect updated listing count
      const dashboard2 = await sellerService.getDashboardStats(testWalletAddress);
      expect(dashboard2?.stats.totalListings).toBe(2);
    });
  });

  describe('Real-time Cache Invalidation', () => {
    it('should handle WebSocket-triggered cache invalidation', async () => {
      const initialProfile = { walletAddress: testWalletAddress, displayName: 'WebSocket Test' };
      const updatedProfile = { walletAddress: testWalletAddress, displayName: 'WebSocket Updated' };

      // Mock WebSocket
      const mockWebSocket = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1,
      };

      global.WebSocket = jest.fn().mockImplementation(() => mockWebSocket);

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: initialProfile }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: updatedProfile }),
        });

      // Load initial profile
      const profile1 = await sellerService.getSellerProfile(testWalletAddress);
      expect(profile1?.displayName).toBe('WebSocket Test');

      // Simulate WebSocket message for profile update
      const messageHandler = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')[1];

      await act(async () => {
        messageHandler({
          data: JSON.stringify({
            type: 'profile_updated',
            walletAddress: testWalletAddress,
            data: updatedProfile,
          }),
        });
      });

      // Profile should be updated via cache invalidation
      const profile2 = await sellerService.getSellerProfile(testWalletAddress);
      expect(profile2?.displayName).toBe('WebSocket Updated');
    });

    it('should batch multiple cache invalidations efficiently', async () => {
      const profile = { walletAddress: testWalletAddress, displayName: 'Batch Test' };
      const listings = [{ id: '1', title: 'Batch Product' }];

      (fetch as jest.Mock)
        .mockResolvedValue({
          ok: true,
          json: async () => ({ success: true, data: profile }),
        });

      // Load data into cache
      await sellerService.getSellerProfile(testWalletAddress);

      // Perform multiple rapid invalidations
      const invalidationPromises = [
        sellerCacheManager.invalidateProfileCache(testWalletAddress),
        sellerCacheManager.invalidateListingsCache(testWalletAddress),
        sellerCacheManager.invalidateDashboardCache(testWalletAddress),
        sellerCacheManager.invalidateStoreCache(testWalletAddress),
      ];

      await act(async () => {
        await Promise.all(invalidationPromises);
      });

      // Should batch invalidations to avoid excessive API calls
      const batchedInvalidations = sellerCacheManager.getPendingInvalidations(testWalletAddress);
      expect(batchedInvalidations).toHaveLength(0); // Should be processed
    });
  });

  describe('Cache Invalidation Error Handling', () => {
    it('should handle cache invalidation failures gracefully', async () => {
      const profile = { walletAddress: testWalletAddress, displayName: 'Error Test' };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: profile }),
      });

      // Load profile into cache
      await sellerService.getSellerProfile(testWalletAddress);

      // Mock cache invalidation failure
      jest.spyOn(queryClient, 'invalidateQueries').mockRejectedValueOnce(
        new Error('Cache invalidation failed')
      );

      // Should not throw error
      await expect(
        sellerCacheManager.invalidateSellerCache(testWalletAddress)
      ).rejects.toThrow('Cache invalidation failed');

      // But subsequent requests should still work
      const result = await sellerService.getSellerProfile(testWalletAddress);
      expect(result).toEqual(profile);
    });

    it('should retry failed cache invalidations', async () => {
      const profile = { walletAddress: testWalletAddress, displayName: 'Retry Test' };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: profile }),
      });

      let invalidationAttempts = 0;
      jest.spyOn(queryClient, 'invalidateQueries').mockImplementation(async () => {
        invalidationAttempts++;
        if (invalidationAttempts < 3) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve();
      });

      // Should retry and eventually succeed
      await act(async () => {
        await sellerCacheManager.invalidateSellerCache(testWalletAddress);
      });

      expect(invalidationAttempts).toBe(3);
    });

    it('should provide fallback when cache is corrupted', async () => {
      const profile = { walletAddress: testWalletAddress, displayName: 'Fallback Test' };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: profile }),
      });

      // Corrupt cache data
      queryClient.setQueryData(['seller', 'profile', testWalletAddress], 'corrupted-data');

      // Should detect corruption and refetch
      const result = await sellerService.getSellerProfile(testWalletAddress);
      expect(result).toEqual(profile);
    });
  });

  describe('Cache Dependency Management', () => {
    it('should invalidate dependent caches when parent data changes', async () => {
      const profile = { walletAddress: testWalletAddress, displayName: 'Dependency Test' };
      const listings = [{ id: '1', title: 'Dependent Product', sellerId: testWalletAddress }];
      const dashboard = { profile, listings };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: profile }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: listings }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: dashboard }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { ...profile, displayName: 'Updated Dependency' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { profile: { ...profile, displayName: 'Updated Dependency' }, listings } }),
        });

      // Load all data
      await sellerService.getSellerProfile(testWalletAddress);
      await sellerService.getListings(testWalletAddress);
      await sellerService.getDashboardStats(testWalletAddress);

      // Update profile (should invalidate dependent dashboard)
      await act(async () => {
        await sellerCacheManager.invalidateWithDependencies(testWalletAddress, 'profile');
      });

      // Both profile and dashboard should be updated
      const updatedProfile = await sellerService.getSellerProfile(testWalletAddress);
      const updatedDashboard = await sellerService.getDashboardStats(testWalletAddress);

      expect(updatedProfile?.displayName).toBe('Updated Dependency');
      expect(updatedDashboard?.profile.displayName).toBe('Updated Dependency');
    });

    it('should track cache dependencies correctly', async () => {
      const dependencies = sellerCacheManager.getCacheDependencies(testWalletAddress);
      
      expect(dependencies).toEqual({
        profile: ['dashboard', 'store'],
        listings: ['dashboard', 'store'],
        dashboard: [],
        store: [],
      });
    });

    it('should handle circular dependencies safely', async () => {
      // This shouldn't happen in practice, but test safety mechanism
      jest.spyOn(sellerCacheManager, 'getCacheDependencies').mockReturnValue({
        profile: ['dashboard'],
        dashboard: ['profile'], // Circular dependency
        listings: [],
        store: [],
      });

      // Should not cause infinite loop
      await expect(
        sellerCacheManager.invalidateWithDependencies(testWalletAddress, 'profile')
      ).resolves.not.toThrow();
    });
  });

  describe('Cache Performance Optimization', () => {
    it('should implement intelligent cache warming', async () => {
      const profile = { walletAddress: testWalletAddress, displayName: 'Warming Test' };
      const listings = [{ id: '1', title: 'Warm Product' }];

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: profile }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: listings }),
        });

      // Warm cache with related data
      await act(async () => {
        await sellerCacheManager.warmCache(testWalletAddress, ['profile', 'listings']);
      });

      // Subsequent requests should be served from cache
      const cachedProfile = await sellerService.getSellerProfile(testWalletAddress);
      const cachedListings = await sellerService.getListings(testWalletAddress);

      expect(cachedProfile).toEqual(profile);
      expect(cachedListings).toEqual(listings);

      // Should only have made 2 API calls (during warming)
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should implement cache size limits and eviction', async () => {
      // Fill cache with multiple sellers
      const sellers = Array.from({ length: 100 }, (_, i) => ({
        walletAddress: `0x${i.toString().padStart(40, '0')}`,
        displayName: `Seller ${i}`,
      }));

      (fetch as jest.Mock).mockImplementation(async (url) => {
        const walletAddress = url.split('/').pop();
        const seller = sellers.find(s => s.walletAddress === walletAddress);
        return {
          ok: true,
          json: async () => ({ success: true, data: seller }),
        };
      });

      // Load many sellers into cache
      for (const seller of sellers) {
        await sellerService.getSellerProfile(seller.walletAddress);
      }

      // Cache should implement LRU eviction
      const cacheSize = sellerCacheManager.getCacheSize();
      expect(cacheSize).toBeLessThanOrEqual(50); // Assuming max cache size of 50
    });

    it('should optimize cache invalidation performance', async () => {
      const startTime = performance.now();

      // Perform large batch invalidation
      const walletAddresses = Array.from({ length: 100 }, (_, i) => 
        `0x${i.toString().padStart(40, '0')}`
      );

      await act(async () => {
        await Promise.all(
          walletAddresses.map(address => 
            sellerCacheManager.invalidateSellerCache(address)
          )
        );
      });

      const endTime = performance.now();
      const invalidationTime = endTime - startTime;

      // Should complete batch invalidation within reasonable time
      expect(invalidationTime).toBeLessThan(1000); // 1 second
    });
  });
});