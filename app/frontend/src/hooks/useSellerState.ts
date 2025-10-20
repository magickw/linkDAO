import { useCallback } from 'react';
import { useAccount } from 'wagmi';
import { 
  useSellerProfile, 
  useSellerDashboard, 
  useSellerListings, 
  useSellerOrders, 
  useSellerNotifications, 
  useSellerAnalytics,
  useSellerCacheManager 
} from './useSellerCache';
import { SellerProfile, SellerListing, SellerOrder } from '../types/seller';

/**
 * Comprehensive hook for seller state management with React Query
 * This is the main hook that components should use for seller data
 */
export function useSellerState(walletAddress?: string) {
  const { address } = useAccount();
  const effectiveAddress = walletAddress || address;

  // Profile management
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
    updateProfile,
    invalidateProfile,
    isCacheValid: profileCacheValid
  } = useSellerProfile(effectiveAddress);

  // Dashboard data
  const {
    data: dashboardStats,
    isLoading: dashboardLoading,
    error: dashboardError,
    invalidateDashboard,
    isCacheValid: dashboardCacheValid
  } = useSellerDashboard(effectiveAddress);

  // Listings management
  const {
    data: listings = [],
    isLoading: listingsLoading,
    error: listingsError,
    createListing,
    updateListing,
    deleteListing,
    invalidateListings,
    isCacheValid: listingsCacheValid
  } = useSellerListings(effectiveAddress);

  // Orders management
  const {
    data: orders = [],
    isLoading: ordersLoading,
    error: ordersError,
    updateOrderStatus,
    invalidateOrders,
    isCacheValid: ordersCacheValid
  } = useSellerOrders(effectiveAddress);

  // Notifications
  const {
    data: notifications = [],
    isLoading: notificationsLoading,
    error: notificationsError,
    markAsRead,
    invalidateNotifications,
    isCacheValid: notificationsCacheValid
  } = useSellerNotifications(effectiveAddress);

  // Analytics
  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
    invalidateAnalytics,
    isCacheValid: analyticsCacheValid
  } = useSellerAnalytics(effectiveAddress);

  // Cache management
  const {
    invalidateAll,
    clearAll,
    warmCache,
    getCacheStats,
    batchInvalidate
  } = useSellerCacheManager(effectiveAddress);

  // Computed values
  const isLoading = profileLoading || dashboardLoading || listingsLoading || 
                   ordersLoading || notificationsLoading || analyticsLoading;

  const hasError = profileError || dashboardError || listingsError || 
                  ordersError || notificationsError || analyticsError;

  const unreadNotifications = notifications.filter(n => !n.read);
  const activeListings = listings.filter(l => l.status === 'active');
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'paid');

  // Actions
  const createNewListing = useCallback(async (listingData: Partial<SellerListing>) => {
    if (!effectiveAddress) throw new Error('Wallet not connected');
    return await createListing.mutateAsync(listingData);
  }, [effectiveAddress, createListing]);

  const updateExistingListing = useCallback(async (listingId: string, updates: Partial<SellerListing>) => {
    return await updateListing.mutateAsync({ listingId, updates });
  }, [updateListing]);

  const removeListingById = useCallback(async (listingId: string) => {
    return await deleteListing.mutateAsync(listingId);
  }, [deleteListing]);

  const updateProfileData = useCallback(async (updates: Partial<SellerProfile>) => {
    if (!effectiveAddress) throw new Error('Wallet not connected');
    return await updateProfile.mutateAsync(updates);
  }, [effectiveAddress, updateProfile]);

  const updateOrderStatusById = useCallback(async (orderId: string, status: string, data?: any) => {
    return await updateOrderStatus.mutateAsync({ orderId, status, data });
  }, [updateOrderStatus]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    return await markAsRead.mutateAsync(notificationId);
  }, [markAsRead]);

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    if (!effectiveAddress) return;
    
    await Promise.all([
      invalidateProfile(),
      invalidateDashboard(),
      invalidateListings(),
      invalidateOrders(),
      invalidateNotifications(),
      invalidateAnalytics()
    ]);
  }, [
    effectiveAddress,
    invalidateProfile,
    invalidateDashboard,
    invalidateListings,
    invalidateOrders,
    invalidateNotifications,
    invalidateAnalytics
  ]);

  // Cache status
  const cacheStatus = {
    profile: profileCacheValid,
    dashboard: dashboardCacheValid,
    listings: listingsCacheValid,
    orders: ordersCacheValid,
    notifications: notificationsCacheValid,
    analytics: analyticsCacheValid
  };

  return {
    // Data
    profile,
    dashboardStats,
    listings,
    orders,
    notifications,
    analytics,
    
    // Computed values
    unreadNotifications,
    activeListings,
    pendingOrders,
    
    // Loading states
    isLoading,
    profileLoading,
    dashboardLoading,
    listingsLoading,
    ordersLoading,
    notificationsLoading,
    analyticsLoading,
    
    // Error states
    hasError,
    profileError,
    dashboardError,
    listingsError,
    ordersError,
    notificationsError,
    analyticsError,
    
    // Actions
    createNewListing,
    updateExistingListing,
    removeListingById,
    updateProfileData,
    updateOrderStatusById,
    markNotificationAsRead,
    refreshAllData,
    
    // Cache management
    invalidateAll,
    clearAll,
    warmCache,
    getCacheStats,
    batchInvalidate,
    cacheStatus,
    
    // Mutation states
    isCreatingListing: createListing.isPending,
    isUpdatingListing: updateListing.isPending,
    isDeletingListing: deleteListing.isPending,
    isUpdatingProfile: updateProfile.isPending,
    isUpdatingOrder: updateOrderStatus.isPending,
    isMarkingNotificationRead: markAsRead.isPending,
    
    // Connection status
    isConnected: !!effectiveAddress,
    walletAddress: effectiveAddress,
  };
}

/**
 * Hook for seller profile management specifically
 */
export function useSellerProfileState(walletAddress?: string) {
  const { address } = useAccount();
  const effectiveAddress = walletAddress || address;

  const {
    data: profile,
    isLoading,
    error,
    updateProfile,
    invalidateProfile,
    isCacheValid
  } = useSellerProfile(effectiveAddress);

  const updateProfileData = useCallback(async (updates: Partial<SellerProfile>) => {
    if (!effectiveAddress) throw new Error('Wallet not connected');
    return await updateProfile.mutateAsync(updates);
  }, [effectiveAddress, updateProfile]);

  return {
    profile,
    isLoading,
    error,
    updateProfileData,
    invalidateProfile,
    isCacheValid,
    isUpdating: updateProfile.isPending,
    isConnected: !!effectiveAddress,
    walletAddress: effectiveAddress,
  };
}

/**
 * Hook for seller dashboard data specifically
 */
export function useSellerDashboardState(walletAddress?: string) {
  const { address } = useAccount();
  const effectiveAddress = walletAddress || address;

  const {
    data: dashboardStats,
    isLoading,
    error,
    invalidateDashboard,
    isCacheValid
  } = useSellerDashboard(effectiveAddress);

  const {
    data: notifications = [],
    markAsRead
  } = useSellerNotifications(effectiveAddress);

  const unreadNotifications = notifications.filter(n => !n.read);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    return await markAsRead.mutateAsync(notificationId);
  }, [markAsRead]);

  return {
    dashboardStats,
    notifications,
    unreadNotifications,
    isLoading,
    error,
    invalidateDashboard,
    isCacheValid,
    markNotificationAsRead,
    isMarkingNotificationRead: markAsRead.isPending,
    isConnected: !!effectiveAddress,
    walletAddress: effectiveAddress,
  };
}

/**
 * Hook for seller listings management specifically
 */
export function useSellerListingsState(walletAddress?: string, status?: string) {
  const { address } = useAccount();
  const effectiveAddress = walletAddress || address;

  const {
    data: listings = [],
    isLoading,
    error,
    createListing,
    updateListing,
    deleteListing,
    invalidateListings,
    isCacheValid
  } = useSellerListings(effectiveAddress, status);

  const activeListings = listings.filter(l => l.status === 'active');
  const draftListings = listings.filter(l => l.status === 'draft');

  const createNewListing = useCallback(async (listingData: Partial<SellerListing>) => {
    if (!effectiveAddress) throw new Error('Wallet not connected');
    return await createListing.mutateAsync(listingData);
  }, [effectiveAddress, createListing]);

  const updateExistingListing = useCallback(async (listingId: string, updates: Partial<SellerListing>) => {
    return await updateListing.mutateAsync({ listingId, updates });
  }, [updateListing]);

  const removeListingById = useCallback(async (listingId: string) => {
    return await deleteListing.mutateAsync(listingId);
  }, [deleteListing]);

  return {
    listings,
    activeListings,
    draftListings,
    isLoading,
    error,
    createNewListing,
    updateExistingListing,
    removeListingById,
    invalidateListings,
    isCacheValid,
    isCreatingListing: createListing.isPending,
    isUpdatingListing: updateListing.isPending,
    isDeletingListing: deleteListing.isPending,
    isConnected: !!effectiveAddress,
    walletAddress: effectiveAddress,
  };
}

/**
 * Hook for seller orders management specifically
 */
export function useSellerOrdersState(walletAddress?: string, status?: string) {
  const { address } = useAccount();
  const effectiveAddress = walletAddress || address;

  const {
    data: orders = [],
    isLoading,
    error,
    updateOrderStatus,
    invalidateOrders,
    isCacheValid
  } = useSellerOrders(effectiveAddress, status);

  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'paid');
  const shippedOrders = orders.filter(o => o.status === 'shipped');
  const completedOrders = orders.filter(o => o.status === 'delivered');

  const updateOrderStatusById = useCallback(async (orderId: string, newStatus: string, data?: any) => {
    return await updateOrderStatus.mutateAsync({ orderId, status: newStatus, data });
  }, [updateOrderStatus]);

  return {
    orders,
    pendingOrders,
    shippedOrders,
    completedOrders,
    isLoading,
    error,
    updateOrderStatusById,
    invalidateOrders,
    isCacheValid,
    isUpdatingOrder: updateOrderStatus.isPending,
    isConnected: !!effectiveAddress,
    walletAddress: effectiveAddress,
  };
}