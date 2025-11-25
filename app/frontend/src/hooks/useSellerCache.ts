import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { SellerProfile, SellerListing, SellerDashboardStats, SellerOrder, SellerNotification, SellerAnalytics } from '../types/seller';
import { unifiedSellerAPIClient } from '../services/unifiedSellerAPIClient';
import { getSellerCacheManager, OptimisticUpdateConfig } from '../services/sellerCacheManager';

// Query key factory for consistent cache keys
export const sellerQueryKeys = {
  all: ['seller'] as const,
  profile: (walletAddress: string) => ['seller', 'profile', walletAddress] as const,
  dashboard: (walletAddress: string) => ['seller', 'dashboard', walletAddress] as const,
  listings: (walletAddress: string, status?: string) => 
    ['seller', 'listings', walletAddress, ...(status ? [status] : [])] as const,
  orders: (walletAddress: string, status?: string) => 
    ['seller', 'orders', walletAddress, ...(status ? [status] : [])] as const,
  notifications: (walletAddress: string) => ['seller', 'notifications', walletAddress] as const,
  analytics: (walletAddress: string, period?: string) => 
    ['seller', 'analytics', walletAddress, ...(period ? [period] : [])] as const,
  store: (walletAddress: string) => ['seller', 'store', walletAddress] as const,
};

// Default query options for seller data
const defaultQueryOptions = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  retry: 2,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
};

/**
 * Hook for seller profile data with cache management
 */
export function useSellerProfile(
  walletAddress: string | undefined,
  options?: Partial<UseQueryOptions<SellerProfile | null>>
) {
  const queryClient = useQueryClient();
  const cacheManager = getSellerCacheManager();

  const query = useQuery({
    queryKey: sellerQueryKeys.profile(walletAddress || ''),
    queryFn: async () => {
      if (!walletAddress) return null;
      return await unifiedSellerAPIClient.getProfile(walletAddress);
    },
    enabled: !!walletAddress,
    ...defaultQueryOptions,
    ...options,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<SellerProfile>) => {
      if (!walletAddress) throw new Error('Wallet address required');
      return await unifiedSellerAPIClient.updateProfile(walletAddress, updates);
    },
    onMutate: async (updates) => {
      if (!walletAddress || !cacheManager) return;

      // Optimistic update
      await cacheManager.updateSellerData(
        walletAddress,
        'profile',
        updates,
        {
          updateFn: (oldData, newData) => ({
            ...oldData,
            ...newData,
            updatedAt: new Date().toISOString(),
          } as SellerProfile),
          onSuccess: (data) => {
            // Trigger profile update event
            window.dispatchEvent(new CustomEvent('seller-profile-updated', {
              detail: { walletAddress, profile: data }
            }));
          }
        }
      );
    },
    onSuccess: (data) => {
      if (!walletAddress || !cacheManager) return;
      
      // Update cache with fresh data
      queryClient.setQueryData(sellerQueryKeys.profile(walletAddress), data);
      
      // Invalidate related caches
      cacheManager.invalidateSellerCache(walletAddress, {
        immediate: true,
        cascade: true,
        dependencies: ['profile']
      });
    },
    onError: (error) => {
      console.error('Profile update failed:', error);
      // Cache manager handles rollback automatically
    }
  });

  const invalidateProfile = useCallback(async () => {
    if (!walletAddress || !cacheManager) return;
    await cacheManager.forceRefresh(walletAddress, 'profile');
  }, [walletAddress, cacheManager]);

  return {
    ...query,
    updateProfile,
    invalidateProfile,
    isCacheValid: walletAddress ? cacheManager?.isCacheValid(walletAddress, 'profile') : false,
  };
}

/**
 * Hook for seller dashboard data with cache management
 */
export function useSellerDashboard(
  walletAddress: string | undefined,
  options?: Partial<UseQueryOptions<SellerDashboardStats>>
) {
  const queryClient = useQueryClient();
  const cacheManager = getSellerCacheManager();

  const query = useQuery({
    queryKey: sellerQueryKeys.dashboard(walletAddress || ''),
    queryFn: async () => {
      if (!walletAddress) throw new Error('Wallet address required');
      return await unifiedSellerAPIClient.getDashboardStats(walletAddress);
    },
    enabled: !!walletAddress,
    ...defaultQueryOptions,
    ...options,
  });

  const invalidateDashboard = useCallback(async () => {
    if (!walletAddress || !cacheManager) return;
    await cacheManager.forceRefresh(walletAddress, 'dashboard');
  }, [walletAddress, cacheManager]);

  return {
    ...query,
    invalidateDashboard,
    isCacheValid: walletAddress ? cacheManager?.isCacheValid(walletAddress, 'dashboard') : false,
  };
}

/**
 * Hook for seller listings with cache management
 */
export function useSellerListings(
  walletAddress: string | undefined,
  status?: string,
  options?: Partial<UseQueryOptions<SellerListing[]>>
) {
  const queryClient = useQueryClient();
  const cacheManager = getSellerCacheManager();

  const query = useQuery({
    queryKey: sellerQueryKeys.listings(walletAddress || '', status),
    queryFn: async () => {
      if (!walletAddress) return [];
      return await unifiedSellerAPIClient.getListings(walletAddress, status);
    },
    enabled: !!walletAddress,
    ...defaultQueryOptions,
    ...options,
  });

  const createListing = useMutation({
    mutationFn: async (listingData: Partial<SellerListing>) => {
      if (!walletAddress) throw new Error('Wallet address required');
      return await unifiedSellerAPIClient.createListing(listingData);
    },
    onSuccess: (newListing) => {
      if (!walletAddress || !cacheManager) return;

      // Update listings cache optimistically
      const queryKey = sellerQueryKeys.listings(walletAddress, status);
      queryClient.setQueryData(queryKey, (oldData: SellerListing[] | undefined) => {
        return [newListing, ...(oldData || [])];
      });

      // Invalidate related caches
      cacheManager.invalidateSellerCache(walletAddress, {
        immediate: true,
        cascade: true,
        dependencies: ['listings']
      });

      // Trigger listing update event
      window.dispatchEvent(new CustomEvent('seller-listing-updated', {
        detail: { walletAddress, listing: newListing, action: 'created' }
      }));
    }
  });

  const updateListing = useMutation({
    mutationFn: async ({ listingId, updates }: { listingId: string; updates: Partial<SellerListing> }) => {
      return await unifiedSellerAPIClient.updateListing(listingId, updates);
    },
    onMutate: async ({ listingId, updates }) => {
      if (!walletAddress || !cacheManager) return;

      // Optimistic update for listings
      const queryKey = sellerQueryKeys.listings(walletAddress, status);
      const previousListings = queryClient.getQueryData<SellerListing[]>(queryKey);

      queryClient.setQueryData(queryKey, (oldData: SellerListing[] | undefined) => {
        return oldData?.map(listing => 
          listing.id === listingId 
            ? { ...listing, ...updates, updatedAt: new Date().toISOString() }
            : listing
        ) || [];
      });

      return { previousListings };
    },
    onSuccess: (updatedListing) => {
      if (!walletAddress || !cacheManager) return;

      // Invalidate related caches
      cacheManager.invalidateSellerCache(walletAddress, {
        immediate: true,
        cascade: true,
        dependencies: ['listings']
      });

      // Trigger listing update event
      window.dispatchEvent(new CustomEvent('seller-listing-updated', {
        detail: { walletAddress, listing: updatedListing, action: 'updated' }
      }));
    },
    onError: (error, variables, context) => {
      if (!walletAddress || !context?.previousListings) return;

      // Rollback on error
      const queryKey = sellerQueryKeys.listings(walletAddress, status);
      queryClient.setQueryData(queryKey, context.previousListings);
    }
  });

  const deleteListing = useMutation({
    mutationFn: async (listingId: string) => {
      await unifiedSellerAPIClient.deleteListing(listingId);
      return listingId;
    },
    onSuccess: (deletedListingId) => {
      if (!walletAddress || !cacheManager) return;

      // Remove from cache
      const queryKey = sellerQueryKeys.listings(walletAddress, status);
      queryClient.setQueryData(queryKey, (oldData: SellerListing[] | undefined) => {
        return oldData?.filter(listing => listing.id !== deletedListingId) || [];
      });

      // Invalidate related caches
      cacheManager.invalidateSellerCache(walletAddress, {
        immediate: true,
        cascade: true,
        dependencies: ['listings']
      });

      // Trigger listing update event
      window.dispatchEvent(new CustomEvent('seller-listing-updated', {
        detail: { walletAddress, listingId: deletedListingId, action: 'deleted' }
      }));
    }
  });

  const invalidateListings = useCallback(async () => {
    if (!walletAddress || !cacheManager) return;
    await cacheManager.forceRefresh(walletAddress, 'listings');
  }, [walletAddress, cacheManager]);

  return {
    ...query,
    createListing,
    updateListing,
    deleteListing,
    invalidateListings,
    isCacheValid: walletAddress ? cacheManager?.isCacheValid(walletAddress, 'listings') : false,
  };
}

/**
 * Hook for seller orders with cache management
 */
export function useSellerOrders(
  walletAddress: string | undefined,
  status?: string,
  options?: Partial<UseQueryOptions<SellerOrder[]>>
) {
  const queryClient = useQueryClient();
  const cacheManager = getSellerCacheManager();

  const query = useQuery({
    queryKey: sellerQueryKeys.orders(walletAddress || '', status),
    queryFn: async () => {
      if (!walletAddress) return [];
      return await unifiedSellerAPIClient.getOrders(walletAddress, status);
    },
    enabled: !!walletAddress,
    ...defaultQueryOptions,
    ...options,
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status: newStatus, data }: { orderId: string; status: string; data?: any }) => {
      await unifiedSellerAPIClient.updateOrderStatus(orderId, newStatus, data);
      return { orderId, status: newStatus, data };
    },
    onMutate: async ({ orderId, status: newStatus, data }) => {
      if (!walletAddress) return;

      // Optimistic update
      const queryKey = sellerQueryKeys.orders(walletAddress, status);
      const previousOrders = queryClient.getQueryData<SellerOrder[]>(queryKey);

      queryClient.setQueryData(queryKey, (oldData: SellerOrder[] | undefined) => {
        return oldData?.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus as any, ...data, updatedAt: new Date().toISOString() }
            : order
        ) || [];
      });

      return { previousOrders };
    },
    onSuccess: ({ orderId, status: newStatus }) => {
      if (!walletAddress || !cacheManager) return;

      // Invalidate related caches
      cacheManager.invalidateSellerCache(walletAddress, {
        immediate: true,
        cascade: true,
        dependencies: ['orders']
      });

      // Trigger order update event
      window.dispatchEvent(new CustomEvent('seller-order-updated', {
        detail: { walletAddress, orderId, status: newStatus }
      }));
    },
    onError: (error, variables, context) => {
      if (!walletAddress || !context?.previousOrders) return;

      // Rollback on error
      const queryKey = sellerQueryKeys.orders(walletAddress, status);
      queryClient.setQueryData(queryKey, context.previousOrders);
    }
  });

  const invalidateOrders = useCallback(async () => {
    if (!walletAddress || !cacheManager) return;
    await cacheManager.forceRefresh(walletAddress, 'orders');
  }, [walletAddress, cacheManager]);

  return {
    ...query,
    updateOrderStatus,
    invalidateOrders,
    isCacheValid: walletAddress ? cacheManager?.isCacheValid(walletAddress, 'orders') : false,
  };
}

/**
 * Hook for seller notifications with cache management
 */
export function useSellerNotifications(
  walletAddress: string | undefined,
  options?: Partial<UseQueryOptions<SellerNotification[]>>
) {
  const queryClient = useQueryClient();
  const cacheManager = getSellerCacheManager();

  const query = useQuery({
    queryKey: sellerQueryKeys.notifications(walletAddress || ''),
    queryFn: async () => {
      if (!walletAddress) return [];
      return await unifiedSellerAPIClient.getNotifications(walletAddress);
    },
    enabled: !!walletAddress,
    ...defaultQueryOptions,
    ...options,
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      await unifiedSellerAPIClient.markNotificationRead(notificationId);
      return notificationId;
    },
    onMutate: async (notificationId) => {
      if (!walletAddress) return;

      // Optimistic update
      const queryKey = sellerQueryKeys.notifications(walletAddress);
      const previousNotifications = queryClient.getQueryData<SellerNotification[]>(queryKey);

      queryClient.setQueryData(queryKey, (oldData: SellerNotification[] | undefined) => {
        return oldData?.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        ) || [];
      });

      return { previousNotifications };
    },
    onError: (error, notificationId, context) => {
      if (!walletAddress || !context?.previousNotifications) return;

      // Rollback on error
      const queryKey = sellerQueryKeys.notifications(walletAddress);
      queryClient.setQueryData(queryKey, context.previousNotifications);
    }
  });

  const invalidateNotifications = useCallback(async () => {
    if (!walletAddress || !cacheManager) return;
    await cacheManager.forceRefresh(walletAddress, 'notifications');
  }, [walletAddress, cacheManager]);

  return {
    ...query,
    markAsRead,
    invalidateNotifications,
    isCacheValid: walletAddress ? cacheManager?.isCacheValid(walletAddress, 'notifications') : false,
  };
}

/**
 * Hook for seller analytics with cache management
 */
export function useSellerAnalytics(
  walletAddress: string | undefined,
  period: string = '30d',
  options?: Partial<UseQueryOptions<SellerAnalytics>>
) {
  const cacheManager = getSellerCacheManager();

  const query = useQuery({
    queryKey: sellerQueryKeys.analytics(walletAddress || '', period),
    queryFn: async () => {
      if (!walletAddress) throw new Error('Wallet address required');
      return await unifiedSellerAPIClient.getAnalytics(walletAddress, period);
    },
    enabled: !!walletAddress,
    ...defaultQueryOptions,
    staleTime: 10 * 60 * 1000, // 10 minutes for analytics
    ...options,
  });

  const invalidateAnalytics = useCallback(async () => {
    if (!walletAddress || !cacheManager) return;
    await cacheManager.forceRefresh(walletAddress, 'analytics');
  }, [walletAddress, cacheManager]);

  return {
    ...query,
    invalidateAnalytics,
    isCacheValid: walletAddress ? cacheManager?.isCacheValid(walletAddress, 'analytics') : false,
  };
}

/**
 * Hook for managing seller cache globally
 */
export function useSellerCacheManager(walletAddress?: string) {
  const queryClient = useQueryClient();
  const cacheManager = getSellerCacheManager();

  const invalidateAll = useCallback(async () => {
    if (!walletAddress || !cacheManager) return;
    await cacheManager.invalidateSellerCache(walletAddress);
  }, [walletAddress, cacheManager]);

  const clearAll = useCallback(async () => {
    if (!walletAddress || !cacheManager) return;
    await cacheManager.clearSellerCache(walletAddress);
  }, [walletAddress, cacheManager]);

  const warmCache = useCallback(async (dataTypes?: string[]) => {
    if (!walletAddress || !cacheManager) return;
    await cacheManager.warmCache(walletAddress, dataTypes);
  }, [walletAddress, cacheManager]);

  const getCacheStats = useCallback(() => {
    return cacheManager?.getCacheStats() || null;
  }, [cacheManager]);

  const batchInvalidate = useCallback(async (walletAddresses: string[]) => {
    if (!cacheManager) return;
    await cacheManager.batchInvalidate(walletAddresses);
  }, [cacheManager]);

  return {
    invalidateAll,
    clearAll,
    warmCache,
    getCacheStats,
    batchInvalidate,
    cacheManager,
  };
}