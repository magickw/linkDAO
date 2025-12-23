/**
 * Unified Seller Hooks
 * 
 * React hooks for managing seller data using the unified interfaces
 * and providing consistent data access across all seller components.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  UnifiedSellerProfile,
  UnifiedSellerListing,
  UnifiedSellerDashboard,
  SellerNotification,
  SellerOrder,
  SellerAnalytics,
  SellerTier,
  OnboardingStep
} from '@/types/unifiedSeller';

import { unifiedSellerService } from '@/services/unifiedSellerService';
import { SellerAPIError, SellerErrorType } from '@/services/unifiedSellerAPIClient';

// ============================================================================
// SELLER PROFILE HOOKS
// ============================================================================

export function useUnifiedSeller(walletAddress?: string) {
  const { address } = useAccount();
  const effectiveAddress = walletAddress || address;

  // Debug logging
  useEffect(() => {
    console.log('useUnifiedSeller Debug:', {
      walletAddress,
      address,
      effectiveAddress,
      hasEffectiveAddress: !!effectiveAddress,
      queryEnabled: !!effectiveAddress
    });
  }, [walletAddress, address, effectiveAddress]);

  const {
    data: profile,
    isLoading: loading,
    error,
    refetch
  } = useQuery<UnifiedSellerProfile | null>({
    queryKey: ['unified-seller', 'profile', effectiveAddress],
    queryFn: () => {
      console.log('useUnifiedSeller queryFn called with address:', effectiveAddress);
      return effectiveAddress ? unifiedSellerService.getProfile(effectiveAddress) : null;
    },
    enabled: !!effectiveAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      console.log('useUnifiedSeller retry:', { failureCount, error });
      // Don't retry on certain error types
      if (error instanceof SellerAPIError && error.type === SellerErrorType.PERMISSION_ERROR) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const queryClient = useQueryClient();

  const createProfile = useMutation({
    mutationFn: (profileData: Partial<UnifiedSellerProfile>) => {
      // Get the current effective address
      const currentAddress = effectiveAddress;
      // Add the wallet address to the profile data
      const profileDataWithAddress = {
        ...profileData,
        walletAddress: currentAddress
      };
      return unifiedSellerService.createProfile(profileDataWithAddress);
    },
    onSuccess: (createdProfile) => {
      // Update the cache with the new profile data
      queryClient.setQueryData(['unified-seller', 'profile', effectiveAddress], createdProfile);

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['unified-seller', 'dashboard', effectiveAddress] });
    },
    onError: (error) => {
      console.error('Failed to create seller profile:', error);
    },
  });

  const updateProfile = useMutation({
    mutationFn: (updates: Partial<UnifiedSellerProfile>) => {
      if (!effectiveAddress) throw new Error('No wallet address available');
      return unifiedSellerService.updateProfile(effectiveAddress, updates);
    },
    onSuccess: (updatedProfile) => {
      // Update the cache with the new profile data
      queryClient.setQueryData(['unified-seller', 'profile', effectiveAddress], updatedProfile);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['unified-seller', 'dashboard', effectiveAddress] });
    },
    onError: (error) => {
      console.error('Failed to update seller profile:', error);
    },
  });

  const invalidateProfile = useCallback(() => {
    if (effectiveAddress) {
      queryClient.invalidateQueries({ queryKey: ['unified-seller', 'profile', effectiveAddress] });
    }
  }, [effectiveAddress, queryClient]);

  const clearCache = useCallback(() => {
    if (effectiveAddress) {
      unifiedSellerService.clearCache(effectiveAddress);
      queryClient.removeQueries({ queryKey: ['unified-seller', 'profile', effectiveAddress] });
    }
  }, [effectiveAddress, queryClient]);

  return {
    profile,
    loading,
    error,
    refetch,
    createProfile: createProfile.mutate,
    isCreating: createProfile.isPending,
    createError: createProfile.error,
    updateProfile: updateProfile.mutate,
    isUpdating: updateProfile.isPending,
    updateError: updateProfile.error,
    invalidateProfile,
    clearCache,
    address: effectiveAddress,
  };
}

// ============================================================================
// SELLER LISTINGS HOOKS
// ============================================================================

export function useUnifiedSellerListings(walletAddress?: string) {
  const { address } = useAccount();
  const effectiveAddress = walletAddress || address;

  const {
    data: listings,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['unified-seller', 'listings', effectiveAddress],
    queryFn: () => effectiveAddress ? unifiedSellerService.getListings(effectiveAddress) : [],
    enabled: !!effectiveAddress,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const queryClient = useQueryClient();

  const createListing = useMutation({
    mutationFn: (listingData: Partial<UnifiedSellerListing>) => {
      if (!effectiveAddress) throw new Error('No wallet address available');
      return unifiedSellerService.createListing(effectiveAddress, listingData);
    },
    onSuccess: () => {
      // Invalidate listings and dashboard queries
      queryClient.invalidateQueries({ queryKey: ['unified-seller', 'listings', effectiveAddress] });
      queryClient.invalidateQueries({ queryKey: ['unified-seller', 'dashboard', effectiveAddress] });
    },
  });

  const updateListing = useMutation({
    mutationFn: ({ listingId, updates }: { listingId: string; updates: Partial<UnifiedSellerListing> }) => {
      if (!effectiveAddress) throw new Error('No wallet address available');
      return unifiedSellerService.updateListing(effectiveAddress, listingId, updates);
    },
    onSuccess: () => {
      // Invalidate listings and dashboard queries
      queryClient.invalidateQueries({ queryKey: ['unified-seller', 'listings', effectiveAddress] });
      queryClient.invalidateQueries({ queryKey: ['unified-seller', 'dashboard', effectiveAddress] });
    },
  });

  // Computed values
  const listingsSummary = useMemo(() => {
    if (!listings) return null;

    return {
      total: listings.length,
      active: listings.filter(l => l.status === 'active').length,
      draft: listings.filter(l => l.status === 'draft').length,
      sold: listings.filter(l => l.status === 'sold').length,
      paused: listings.filter(l => l.status === 'paused').length,
      expired: listings.filter(l => l.status === 'expired').length,
    };
  }, [listings]);

  const featuredListings = useMemo(() => {
    if (!listings) return [];
    return listings
      .filter(l => l.status === 'active')
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);
  }, [listings]);

  return {
    listings: listings || [],
    loading,
    error,
    refetch,
    createListing: createListing.mutate,
    isCreating: createListing.isPending,
    createError: createListing.error,
    updateListing: updateListing.mutate,
    isUpdating: updateListing.isPending,
    updateError: updateListing.error,
    listingsSummary,
    featuredListings,
    address: effectiveAddress,
  };
}

// ============================================================================
// SELLER DASHBOARD HOOKS
// ============================================================================

export function useUnifiedSellerDashboard(walletAddress?: string) {
  const { address } = useAccount();
  const effectiveAddress = walletAddress || address;

  const {
    data: dashboard,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['unified-seller', 'dashboard', effectiveAddress],
    queryFn: () => effectiveAddress ? unifiedSellerService.getDashboard(effectiveAddress) : null,
    enabled: !!effectiveAddress,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const queryClient = useQueryClient();

  // Computed values from dashboard
  const stats = useMemo(() => dashboard?.financial || null, [dashboard]);
  const notifications = useMemo(() => dashboard?.notifications || [], [dashboard]);
  const unreadNotifications = useMemo(() => 
    notifications.filter(n => !n.read).length, 
    [notifications]
  );

  const markNotificationRead = useMutation({
    mutationFn: (notificationId: string) => {
      if (!effectiveAddress) throw new Error('No wallet address available');
      return unifiedSellerService.markNotificationRead(effectiveAddress, notificationId);
    },
    onSuccess: () => {
      // Invalidate dashboard to refresh notifications
      queryClient.invalidateQueries({ queryKey: ['unified-seller', 'dashboard', effectiveAddress] });
    },
  });

  const refreshDashboard = useCallback(() => {
    if (effectiveAddress) {
      queryClient.invalidateQueries({ queryKey: ['unified-seller', 'dashboard', effectiveAddress] });
      // Also invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['unified-seller', 'profile', effectiveAddress] });
      queryClient.invalidateQueries({ queryKey: ['unified-seller', 'listings', effectiveAddress] });
    }
  }, [effectiveAddress, queryClient]);

  return {
    dashboard,
    stats,
    notifications,
    unreadNotifications,
    loading,
    error,
    refetch,
    markNotificationRead: markNotificationRead.mutate,
    isMarkingRead: markNotificationRead.isPending,
    refreshDashboard,
    address: effectiveAddress,
  };
}

// ============================================================================
// SELLER ORDERS HOOKS
// ============================================================================

export function useUnifiedSellerOrders(walletAddress?: string) {
  const { address } = useAccount();
  const effectiveAddress = walletAddress || address;

  const {
    data: orders,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['unified-seller', 'orders', effectiveAddress],
    queryFn: () => effectiveAddress ? unifiedSellerService.getOrders(effectiveAddress) : [],
    enabled: !!effectiveAddress,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  });

  // Computed values
  const ordersSummary = useMemo(() => {
    if (!orders) return null;

    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      processing: orders.filter(o => o.status === 'processing').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      disputed: orders.filter(o => o.status === 'disputed').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
    };
  }, [orders]);

  const recentOrders = useMemo(() => {
    if (!orders) return [];
    return orders
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [orders]);

  return {
    orders: orders || [],
    loading,
    error,
    refetch,
    ordersSummary,
    recentOrders,
    address: effectiveAddress,
  };
}

// ============================================================================
// SELLER ANALYTICS HOOKS
// ============================================================================

export function useUnifiedSellerAnalytics(walletAddress?: string) {
  const { address } = useAccount();
  const effectiveAddress = walletAddress || address;

  const {
    data: analytics,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['unified-seller', 'analytics', effectiveAddress],
    queryFn: () => effectiveAddress ? unifiedSellerService.getAnalytics(effectiveAddress) : null,
    enabled: !!effectiveAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    analytics,
    loading,
    error,
    refetch,
    address: effectiveAddress,
  };
}

// ============================================================================
// SELLER TIERS HOOKS
// ============================================================================

export function useSellerTiers() {
  const tiers = useMemo(() => unifiedSellerService.getSellerTiers(), []);

  const getTierById = useCallback((tierId: string): SellerTier | undefined => {
    return tiers.find(tier => tier.id === tierId);
  }, [tiers]);

  const getNextTier = useCallback((currentTierId: string): SellerTier | undefined => {
    const currentTier = getTierById(currentTierId);
    if (!currentTier) return undefined;
    
    return tiers.find(tier => tier.level === currentTier.level + 1);
  }, [tiers, getTierById]);

  const getTierProgress = useCallback((profile: UnifiedSellerProfile): number => {
    const currentTier = getTierById(profile.tier.id);
    const nextTier = getNextTier(profile.tier.id);
    
    if (!currentTier || !nextTier) return 100;
    
    // Calculate progress based on requirements
    const metRequirements = nextTier.requirements.filter(req => req.met).length;
    const totalRequirements = nextTier.requirements.length;
    
    return totalRequirements > 0 ? (metRequirements / totalRequirements) * 100 : 100;
  }, [getTierById, getNextTier]);

  return {
    tiers,
    getTierById,
    getNextTier,
    getTierProgress,
  };
}

// ============================================================================
// SELLER ONBOARDING HOOKS
// ============================================================================

export function useUnifiedSellerOnboarding(walletAddress?: string) {
  const { address } = useAccount();
  const effectiveAddress = walletAddress || address;

  const {
    data: onboardingSteps,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['unified-seller', 'onboarding', effectiveAddress],
    queryFn: () => effectiveAddress ? unifiedSellerService.getOnboardingSteps(effectiveAddress) : [],
    enabled: !!effectiveAddress,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Computed values
  const progress = useMemo(() => {
    if (!onboardingSteps) return { completed: 0, total: 0, percentage: 0 };
    
    const completed = onboardingSteps.filter(step => step.completed).length;
    const total = onboardingSteps.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    
    return { completed, total, percentage };
  }, [onboardingSteps]);

  const currentStep = useMemo(() => {
    if (!onboardingSteps) return null;
    return onboardingSteps.find(step => !step.completed) || null;
  }, [onboardingSteps]);

  const isCompleted = useMemo(() => {
    return progress.percentage === 100;
  }, [progress]);

  return {
    onboardingSteps: onboardingSteps || [],
    loading,
    error,
    refetch,
    progress,
    currentStep,
    isCompleted,
    address: effectiveAddress,
  };
}

// ============================================================================
// COMBINED SELLER DATA HOOK
// ============================================================================

/**
 * Combined hook that provides all seller data in one place
 * Useful for components that need multiple types of seller data
 */
export function useUnifiedSellerData(walletAddress?: string) {
  const { address } = useAccount();
  const effectiveAddress = walletAddress || address;

  const profile = useUnifiedSeller(effectiveAddress);
  const listings = useUnifiedSellerListings(effectiveAddress);
  const dashboard = useUnifiedSellerDashboard(effectiveAddress);
  const orders = useUnifiedSellerOrders(effectiveAddress);
  const analytics = useUnifiedSellerAnalytics(effectiveAddress);
  const onboarding = useUnifiedSellerOnboarding(effectiveAddress);
  const tiers = useSellerTiers();

  const isLoading = profile.loading || listings.loading || dashboard.loading;
  const hasError = profile.error || listings.error || dashboard.error;

  const refreshAll = useCallback(() => {
    profile.refetch();
    listings.refetch();
    dashboard.refetch();
    orders.refetch();
    analytics.refetch();
    onboarding.refetch();
  }, [profile, listings, dashboard, orders, analytics, onboarding]);

  return {
    profile,
    listings,
    dashboard,
    orders,
    analytics,
    onboarding,
    tiers,
    isLoading,
    hasError,
    refreshAll,
    address: effectiveAddress,
  };
}

// ============================================================================
// CACHE MANAGEMENT HOOKS
// ============================================================================

export function useSellerCacheManager() {
  const queryClient = useQueryClient();

  const invalidateSellerCache = useCallback((walletAddress: string) => {
    // Invalidate all seller-related queries for the given address
    queryClient.invalidateQueries({ queryKey: ['unified-seller', 'profile', walletAddress] });
    queryClient.invalidateQueries({ queryKey: ['unified-seller', 'listings', walletAddress] });
    queryClient.invalidateQueries({ queryKey: ['unified-seller', 'dashboard', walletAddress] });
    queryClient.invalidateQueries({ queryKey: ['unified-seller', 'orders', walletAddress] });
    queryClient.invalidateQueries({ queryKey: ['unified-seller', 'analytics', walletAddress] });
    queryClient.invalidateQueries({ queryKey: ['unified-seller', 'onboarding', walletAddress] });
    
    // Also clear service-level cache
    unifiedSellerService.clearCache(walletAddress);
  }, [queryClient]);

  const clearAllSellerCache = useCallback(() => {
    // Remove all seller-related queries
    queryClient.removeQueries({ queryKey: ['unified-seller'] });

    // Clear service-level cache
    unifiedSellerService.clearCache();
  }, [queryClient]);

  const prefetchSellerData = useCallback(async (walletAddress: string) => {
    // Prefetch core seller data
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['unified-seller', 'profile', walletAddress],
        queryFn: () => unifiedSellerService.getProfile(walletAddress),
        staleTime: 5 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: ['unified-seller', 'listings', walletAddress],
        queryFn: () => unifiedSellerService.getListings(walletAddress),
        staleTime: 2 * 60 * 1000,
      }),
    ]);
  }, [queryClient]);

  return {
    invalidateSellerCache,
    clearAllSellerCache,
    prefetchSellerData,
  };
}