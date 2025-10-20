import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { sellerService } from '../services/sellerService';
import { SellerProfile, SellerDashboardStats, SellerNotification, SellerOrder, SellerListing, OnboardingStep, SellerTier } from '../types/seller';
import { 
  useSellerProfile as useSellerProfileCache, 
  useSellerDashboard as useSellerDashboardCache,
  useSellerListings as useSellerListingsCache,
  useSellerOrders as useSellerOrdersCache,
  useSellerNotifications as useSellerNotificationsCache
} from './useSellerCache';

export function useSeller() {
  const { address } = useAccount();
  
  // Use the new cache-enabled hook
  const {
    data: profile,
    isLoading: loading,
    error: queryError,
    updateProfile: updateProfileMutation,
    invalidateProfile,
  } = useSellerProfileCache(address);

  // Convert query error to string for backward compatibility
  const error = queryError ? (queryError as any).message || 'Failed to fetch seller profile' : null;

  const createProfile = useCallback(async (profileData: Partial<SellerProfile>) => {
    if (!address) throw new Error('Wallet not connected');
    
    try {
      const newProfile = await sellerService.createSellerProfile({
        ...profileData,
        walletAddress: address,
      });
      
      // Invalidate cache to refetch fresh data
      await invalidateProfile();
      
      return newProfile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create seller profile';
      throw new Error(errorMessage);
    }
  }, [address, invalidateProfile]);

  const updateProfile = useCallback(async (updates: Partial<SellerProfile>) => {
    if (!address) throw new Error('Wallet not connected');
    
    try {
      // Use the cache-enabled mutation for optimistic updates
      return await updateProfileMutation.mutateAsync(updates);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update seller profile';
      throw new Error(errorMessage);
    }
  }, [address, updateProfileMutation]);

  const refetchProfile = useCallback(async () => {
    await invalidateProfile();
  }, [invalidateProfile]);
  
  return {
    profile,
    loading,
    error,
    createProfile,
    updateProfile,
    refetch: refetchProfile,
    isConnected: !!address,
    walletAddress: address,
  };
}

export function useSellerOnboarding() {
  const { address } = useAccount();
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOnboardingSteps = useCallback(async () => {
    if (!address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const onboardingSteps = await sellerService.getOnboardingSteps(address);
      setSteps(onboardingSteps);
      
      // Find current step (first incomplete step)
      const currentStepIndex = onboardingSteps.findIndex(step => !step.completed);
      setCurrentStep(currentStepIndex >= 0 ? currentStepIndex : onboardingSteps.length - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch onboarding steps');
    } finally {
      setLoading(false);
    }
  }, [address]);

  const updateStep = useCallback(async (stepId: string, data: any) => {
    if (!address) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      await sellerService.updateOnboardingStep(address, stepId, data);
      
      // Update local state
      setSteps(prevSteps => 
        prevSteps.map(step => 
          step.id === stepId 
            ? { ...step, completed: true, data }
            : step
        )
      );
      
      // Move to next step if current step is completed
      const stepIndex = steps.findIndex(step => step.id === stepId);
      if (stepIndex === currentStep && stepIndex < steps.length - 1) {
        setCurrentStep(stepIndex + 1);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update onboarding step';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [address, steps, currentStep]);

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex);
    }
  }, [steps.length]);

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, steps.length]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  useEffect(() => {
    if (address) {
      fetchOnboardingSteps();
    } else {
      setSteps([]);
      setCurrentStep(0);
    }
  }, [address, fetchOnboardingSteps]); // Include fetchOnboardingSteps in dependencies

  const isCompleted = steps.length > 0 && steps.every(step => step.completed);
  const progress = steps.length > 0 ? (steps.filter(step => step.completed).length / steps.length) * 100 : 0;

  return {
    steps,
    currentStep,
    loading,
    error,
    updateStep,
    goToStep,
    nextStep,
    previousStep,
    isCompleted,
    progress,
    refetch: fetchOnboardingSteps,
  };
}

export function useSellerDashboard(mockWalletAddress?: string) {
  const { address } = useAccount();
  // Use mockWalletAddress if provided, otherwise use the actual wallet address
  const effectiveAddress = mockWalletAddress || address;
  
  // Use cache-enabled hooks
  const {
    data: stats,
    isLoading: dashboardLoading,
    error: dashboardError,
    invalidateDashboard,
  } = useSellerDashboardCache(effectiveAddress);

  const {
    data: notifications = [],
    isLoading: notificationsLoading,
    error: notificationsError,
    markAsRead,
  } = useSellerNotificationsCache(effectiveAddress);

  // Combine loading states
  const loading = dashboardLoading || notificationsLoading;
  
  // Combine errors
  const error = dashboardError || notificationsError 
    ? (dashboardError as any)?.message || (notificationsError as any)?.message || 'Failed to fetch dashboard data'
    : null;

  const markNotificationRead = useCallback(async (notificationId: string) => {
    try {
      await markAsRead.mutateAsync(notificationId);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, [markAsRead]);

  const refetch = useCallback(async () => {
    await invalidateDashboard();
  }, [invalidateDashboard]);

  const unreadNotifications = notifications.filter(n => !n.read);

  return {
    stats,
    notifications,
    unreadNotifications,
    loading,
    error,
    markNotificationRead,
    refetch,
    address: effectiveAddress,
  };
}

export function useSellerOrders() {
  const { address } = useAccount();
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (status?: string) => {
    if (!address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const sellerOrders = await sellerService.getOrders(address, status);
      setOrders(sellerOrders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [address]);

  const updateOrderStatus = useCallback(async (orderId: string, status: string, data?: any) => {
    try {
      await sellerService.updateOrderStatus(orderId, status, data);
      
      // Update local state
      setOrders(prev => 
        prev.map(order => 
          order.id === orderId 
            ? { ...order, status: status as any, ...data }
            : order
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update order status';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const addTrackingNumber = useCallback(async (orderId: string, trackingNumber: string, carrier: string) => {
    try {
      await sellerService.addTrackingNumber(orderId, trackingNumber, carrier);
      
      // Update local state
      setOrders(prev => 
        prev.map(order => 
          order.id === orderId 
            ? { ...order, trackingNumber, status: 'shipped' }
            : order
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add tracking number';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  useEffect(() => {
    if (address) {
      fetchOrders();
    } else {
      setOrders([]);
    }
  }, [address, fetchOrders]); // Include fetchOrders in dependencies

  return {
    orders,
    loading,
    error,
    fetchOrders,
    updateOrderStatus,
    addTrackingNumber,
    refetch: () => fetchOrders(),
  };
}

export function useSellerListings(walletAddress?: string) {
  const { address } = useAccount();
  const effectiveAddress = walletAddress || address;
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = useCallback(async (status?: string) => {
    if (!effectiveAddress) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('SellerListings hook: Fetching listings for wallet address:', effectiveAddress);
      const sellerListings = await sellerService.getListings(effectiveAddress, status);
      console.log('SellerListings hook: Retrieved listings:', sellerListings);
      
      // If no listings found for this address, but there are test listings with test address, show them for demo purposes
      if (sellerListings.length === 0) {
        console.log('SellerListings hook: No listings found for current address, checking for demo listings...');
        try {
          const demoListings = await sellerService.getListings('0x1234567890123456789012345678901234567890', status);
          if (demoListings && demoListings.length > 0) {
            console.log('SellerListings hook: Found demo listings, displaying them for current user:', demoListings.length);
            // Update the seller address to match current user for display purposes
            const updatedDemoListings = demoListings.map(listing => ({
              ...listing,
              sellerAddress: effectiveAddress
            }));
            setListings(updatedDemoListings);
            return;
          }
        } catch (demoError) {
          console.log('SellerListings hook: No demo listings available either');
        }
      }
      
      setListings(sellerListings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch listings');
    } finally {
      setLoading(false);
    }
  }, [effectiveAddress]);

  const createListing = useCallback(async (listingData: Partial<SellerListing>) => {
    if (!effectiveAddress) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);
    
    try {
      const newListing = await sellerService.createListing(effectiveAddress, listingData);
      setListings(prev => [newListing, ...prev]);
      return newListing;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create listing';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [effectiveAddress]);

  const updateListing = useCallback(async (listingId: string, updates: Partial<SellerListing>) => {
    try {
      const updatedListing = await sellerService.updateListing(listingId, updates);
      setListings(prev => 
        prev.map(listing => 
          listing.id === listingId ? updatedListing : listing
        )
      );
      return updatedListing;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update listing';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const deleteListing = useCallback(async (listingId: string) => {
    try {
      await sellerService.deleteListing(listingId);
      setListings(prev => prev.filter(listing => listing.id !== listingId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete listing';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  useEffect(() => {
    if (effectiveAddress) {
      fetchListings();
    } else {
      setListings([]);
    }
  }, [effectiveAddress, fetchListings]); // Include fetchListings in dependencies

  return {
    listings,
    loading,
    error,
    createListing,
    updateListing,
    deleteListing,
    fetchListings,
    refetch: () => fetchListings(),
  };
}

export function useSellerTiers() {
  const [tiers] = useState<SellerTier[]>(sellerService.getSellerTiers());
  
  const getTierById = useCallback((tierId: string) => {
    return tiers.find(tier => tier.id === tierId);
  }, [tiers]);
  
  const getNextTier = useCallback((currentTierId: string) => {
    const currentIndex = tiers.findIndex(tier => tier.id === currentTierId);
    return currentIndex >= 0 && currentIndex < tiers.length - 1 
      ? tiers[currentIndex + 1] 
      : null;
  }, [tiers]);
  
  return {
    tiers,
    getTierById,
    getNextTier,
  };
}