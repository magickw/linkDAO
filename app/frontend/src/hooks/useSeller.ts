import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { sellerService } from '../services/sellerService';
import { SellerProfile, SellerDashboardStats, SellerNotification, SellerOrder, SellerListing, OnboardingStep, SellerTier } from '../types/seller';
import { useSellerProfileState, useSellerDashboardState, useSellerListingsState, useSellerOrdersState } from './useSellerState';

export function useSeller() {
  const { address } = useAccount();

  // Use the new centralized state management
  const {
    profile,
    isLoading: loading,
    error: queryError,
    updateProfileData,
    invalidateProfile,
    isUpdating,
  } = useSellerProfileState(address);

  // Convert query error to string for backward compatibility
  const error = queryError ? (queryError as any).message || 'Failed to fetch seller profile' : null;

  const createProfile = useCallback(async (profileData: Partial<SellerProfile>) => {
    if (!address) throw new Error('Wallet not connected');

    try {
      const newProfile = await sellerService.createSellerProfile(address, {
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
      // Use the centralized state management for optimistic updates
      return await updateProfileData(updates);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update seller profile';
      throw new Error(errorMessage);
    }
  }, [address, updateProfileData]);

  const refetchProfile = useCallback(async () => {
    await invalidateProfile();
  }, [invalidateProfile]);

  return {
    profile,
    loading: loading || isUpdating,
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

  // Use the new centralized state management
  const {
    dashboardStats: stats,
    notifications,
    unreadNotifications,
    isLoading: loading,
    error: queryError,
    markNotificationAsRead,
    invalidateDashboard,
    isMarkingNotificationRead,
  } = useSellerDashboardState(effectiveAddress);

  // Convert query error to string for backward compatibility
  const error = queryError ? (queryError as any).message || 'Failed to fetch dashboard data' : null;

  const markNotificationRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, [markNotificationAsRead]);

  const refetch = useCallback(async () => {
    await invalidateDashboard();
  }, [invalidateDashboard]);

  return {
    stats,
    notifications,
    unreadNotifications,
    loading: loading || isMarkingNotificationRead,
    error,
    markNotificationRead,
    refetch,
    address: effectiveAddress,
  };
}

export function useSellerOrders() {
  const { address } = useAccount();

  // Use the new centralized state management
  const {
    orders,
    pendingOrders,
    shippedOrders,
    completedOrders,
    isLoading: loading,
    error: queryError,
    updateOrderStatusById,
    invalidateOrders,
    isUpdatingOrder,
  } = useSellerOrdersState(address);

  // Convert query error to string for backward compatibility
  const error = queryError ? (queryError as any).message || 'Failed to fetch orders' : null;

  const fetchOrders = useCallback(async (status?: string) => {
    await invalidateOrders();
  }, [invalidateOrders]);

  const updateOrderStatus = useCallback(async (orderId: string, status: string, data?: any) => {
    try {
      await updateOrderStatusById(orderId, status, data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update order status';
      throw new Error(errorMessage);
    }
  }, [updateOrderStatusById]);

  const addTrackingNumber = useCallback(async (orderId: string, trackingNumber: string, carrier: string) => {
    try {
      await sellerService.addTrackingNumber(orderId, trackingNumber, carrier);
      // Invalidate orders to refetch with updated data
      await invalidateOrders();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add tracking number';
      throw new Error(errorMessage);
    }
  }, [invalidateOrders]);

  return {
    orders,
    loading: loading || isUpdatingOrder,
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

  // Use the new centralized state management
  const {
    listings,
    activeListings,
    draftListings,
    isLoading: loading,
    error: queryError,
    createNewListing,
    updateExistingListing,
    removeListingById,
    invalidateListings,
    isCreatingListing,
    isUpdatingListing,
    isDeletingListing,
  } = useSellerListingsState(effectiveAddress);

  // Convert query error to string for backward compatibility
  const error = queryError ? (queryError as any).message || 'Failed to fetch listings' : null;

  const createListing = useCallback(async (listingData: Partial<SellerListing>) => {
    if (!effectiveAddress) throw new Error('Wallet not connected');

    try {
      return await createNewListing(listingData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create listing';
      throw new Error(errorMessage);
    }
  }, [effectiveAddress, createNewListing]);

  const updateListing = useCallback(async (listingId: string, updates: Partial<SellerListing>) => {
    try {
      return await updateExistingListing(listingId, updates);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update listing';
      throw new Error(errorMessage);
    }
  }, [updateExistingListing]);

  const deleteListing = useCallback(async (listingId: string) => {
    try {
      await removeListingById(listingId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete listing';
      throw new Error(errorMessage);
    }
  }, [removeListingById]);

  const fetchListings = useCallback(async () => {
    await invalidateListings();
  }, [invalidateListings]);

  return {
    listings,
    loading: loading || isCreatingListing || isUpdatingListing || isDeletingListing,
    error,
    createListing,
    updateListing,
    deleteListing,
    fetchListings,
    refetch: fetchListings,
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