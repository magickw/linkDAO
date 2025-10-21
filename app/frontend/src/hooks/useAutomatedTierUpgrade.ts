/**
 * useAutomatedTierUpgrade Hook
 * React hook for automated tier upgrade functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { automatedTierUpgradeService, TierProgressionData, TierEvaluationResult, TierCriteria } from '../services/automatedTierUpgradeService';
import { useSellerWebSocket } from './useSellerWebSocket';

export interface UseAutomatedTierUpgradeOptions {
  walletAddress: string;
  enableRealTimeUpdates?: boolean;
  refetchInterval?: number;
}

export interface UseAutomatedTierUpgradeReturn {
  // Tier progression data
  progression: TierProgressionData | null;
  progressionLoading: boolean;
  progressionError: Error | null;
  
  // Tier criteria
  criteria: TierCriteria[] | null;
  criteriaLoading: boolean;
  criteriaError: Error | null;
  
  // Evaluation functions
  triggerEvaluation: (force?: boolean) => Promise<TierEvaluationResult>;
  evaluationLoading: boolean;
  evaluationError: Error | null;
  
  // Notifications
  notifications: any[] | null;
  notificationsLoading: boolean;
  notificationsError: Error | null;
  unreadNotificationCount: number;
  
  // Utility functions
  canTriggerManualEvaluation: boolean;
  formatRequirement: (requirement: string, current: number, required: number) => string;
  formatEstimatedTime: (days: number | null) => string;
  getTierColor: (tier: string) => string;
  getTierIcon: (tier: string) => string;
  
  // Refresh functions
  refreshProgression: () => void;
  refreshNotifications: () => void;
  refreshAll: () => void;
}

export const useAutomatedTierUpgrade = ({
  walletAddress,
  enableRealTimeUpdates = true,
  refetchInterval = 5 * 60 * 1000, // 5 minutes
}: UseAutomatedTierUpgradeOptions): UseAutomatedTierUpgradeReturn => {
  const queryClient = useQueryClient();
  const [lastEvaluationDate, setLastEvaluationDate] = useState<string | null>(null);

  // Query keys
  const progressionQueryKey = ['tier', 'progression', walletAddress];
  const criteriaQueryKey = ['tier', 'criteria'];
  const notificationsQueryKey = ['tier', 'notifications', walletAddress];

  // Tier progression query
  const {
    data: progression,
    isLoading: progressionLoading,
    error: progressionError,
    refetch: refetchProgression,
  } = useQuery({
    queryKey: progressionQueryKey,
    queryFn: () => automatedTierUpgradeService.getTierProgressionTracking(walletAddress),
    enabled: !!walletAddress,
    refetchInterval,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  // Tier criteria query
  const {
    data: criteria,
    isLoading: criteriaLoading,
    error: criteriaError,
  } = useQuery({
    queryKey: criteriaQueryKey,
    queryFn: () => automatedTierUpgradeService.getTierCriteria(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour (formerly cacheTime)
  });

  // Tier notifications query
  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    error: notificationsError,
    refetch: refetchNotifications,
  } = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: () => automatedTierUpgradeService.getTierUpgradeNotifications(walletAddress),
    enabled: !!walletAddress,
    refetchInterval: 2 * 60 * 1000, // 2 minutes
    staleTime: 60 * 1000, // 1 minute
  });

  // Manual tier evaluation mutation
  const {
    mutateAsync: triggerEvaluation,
    isPending: evaluationLoading,
    error: evaluationError,
  } = useMutation({
    mutationFn: ({ force = false }: { force?: boolean }) =>
      automatedTierUpgradeService.triggerTierEvaluation(walletAddress, force),
    onSuccess: (result) => {
      // Update last evaluation date
      setLastEvaluationDate(new Date().toISOString());

      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: progressionQueryKey });
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey });

      // If upgrade occurred, invalidate seller data
      if (result.upgradeEligible) {
        queryClient.invalidateQueries({ queryKey: ['seller', 'profile', walletAddress] });
        queryClient.invalidateQueries({ queryKey: ['seller', 'tier', walletAddress] });
      }
    },
    onError: (error) => {
      console.error('Tier evaluation failed:', error);
    },
  });

  // WebSocket integration for real-time updates
  const { onTierUpgrade } = useSellerWebSocket({
    walletAddress,
    autoConnect: enableRealTimeUpdates,
  });

  // Handle real-time tier upgrade notifications
  useEffect(() => {
    if (!enableRealTimeUpdates) return;

    const cleanup = onTierUpgrade((data) => {
      console.log('Real-time tier upgrade received:', data);

      // Invalidate and refetch all tier-related data
      queryClient.invalidateQueries({ queryKey: progressionQueryKey });
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      queryClient.invalidateQueries({ queryKey: ['seller', 'profile', walletAddress] });
      queryClient.invalidateQueries({ queryKey: ['seller', 'tier', walletAddress] });

      // Show success notification
      // This would integrate with your notification system
    });

    return cleanup;
  }, [enableRealTimeUpdates, onTierUpgrade, queryClient, progressionQueryKey, notificationsQueryKey, walletAddress]);

  // Note: onTierEvaluation not available in useSellerWebSocket
  // Tier evaluation updates are handled through the tier upgrade event

  // Utility functions
  const canTriggerManualEvaluation = automatedTierUpgradeService.canTriggerManualEvaluation(lastEvaluationDate);

  const formatRequirement = useCallback((requirement: string, current: number, required: number) => {
    return automatedTierUpgradeService.formatRequirementDescription(requirement, current, required);
  }, []);

  const formatEstimatedTime = useCallback((days: number | null) => {
    return automatedTierUpgradeService.formatEstimatedUpgradeTime(days);
  }, []);

  const getTierColor = useCallback((tier: string) => {
    return automatedTierUpgradeService.getTierColor(tier);
  }, []);

  const getTierIcon = useCallback((tier: string) => {
    return automatedTierUpgradeService.getTierIcon(tier);
  }, []);

  // Refresh functions
  const refreshProgression = useCallback(() => {
    refetchProgression();
  }, [refetchProgression]);

  const refreshNotifications = useCallback(() => {
    refetchNotifications();
  }, [refetchNotifications]);

  const refreshAll = useCallback(() => {
    refetchProgression();
    refetchNotifications();
    queryClient.invalidateQueries({ queryKey: ['seller', 'profile', walletAddress] });
    queryClient.invalidateQueries({ queryKey: ['seller', 'tier', walletAddress] });
  }, [refetchProgression, refetchNotifications, queryClient, walletAddress]);

  // Wrapped trigger evaluation function
  const wrappedTriggerEvaluation = useCallback(async (force = false) => {
    return triggerEvaluation({ force });
  }, [triggerEvaluation]);

  return {
    // Tier progression data
    progression: progression || null,
    progressionLoading,
    progressionError: progressionError as Error | null,
    
    // Tier criteria
    criteria: criteria || null,
    criteriaLoading,
    criteriaError: criteriaError as Error | null,
    
    // Evaluation functions
    triggerEvaluation: wrappedTriggerEvaluation,
    evaluationLoading,
    evaluationError: evaluationError as Error | null,
    
    // Notifications
    notifications: notificationsData?.notifications || null,
    notificationsLoading,
    notificationsError: notificationsError as Error | null,
    unreadNotificationCount: notificationsData?.unreadCount || 0,
    
    // Utility functions
    canTriggerManualEvaluation,
    formatRequirement,
    formatEstimatedTime,
    getTierColor,
    getTierIcon,
    
    // Refresh functions
    refreshProgression,
    refreshNotifications,
    refreshAll,
  };
};

export default useAutomatedTierUpgrade;