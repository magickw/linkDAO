/**
 * Social Proof Hook
 * Provides social proof data and privacy management functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { socialProofService, PrivacySettings } from '../services/socialProofService';
import { SocialProofData } from '../components/CommunityEnhancements/AdvancedInteractions/SocialProofIndicators';

export interface UseSocialProofOptions {
  autoLoad?: boolean;
  refreshInterval?: number;
  enablePrivacyControls?: boolean;
}

export interface UseSocialProofReturn {
  socialProofData: SocialProofData | null;
  privacySettings: PrivacySettings | null;
  isLoading: boolean;
  error: string | null;
  loadSocialProof: (targetUserId: string) => Promise<void>;
  updatePrivacySetting: (setting: keyof PrivacySettings, value: boolean) => Promise<void>;
  refreshData: () => Promise<void>;
  clearCache: () => void;
}

export const useSocialProof = (
  currentUserId: string,
  targetUserId?: string,
  options: UseSocialProofOptions = {}
): UseSocialProofReturn => {
  const {
    autoLoad = true,
    refreshInterval = 0,
    enablePrivacyControls = false,
  } = options;

  const [socialProofData, setSocialProofData] = useState<SocialProofData | null>(null);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentTargetRef = useRef<string | undefined>(targetUserId);

  // Load privacy settings
  const loadPrivacySettings = useCallback(async () => {
    if (!enablePrivacyControls || !currentUserId) return;

    try {
      const settings = await socialProofService.getPrivacySettings(currentUserId);
      setPrivacySettings(settings);
    } catch (err) {
      console.error('Failed to load privacy settings:', err);
      // Use default settings on error
      setPrivacySettings({
        showMutualFollows: true,
        showSharedCommunities: true,
        showConnectionStrength: true,
        showTrustScore: false,
        showInteractionHistory: true,
        allowDataCollection: true,
      });
    }
  }, [currentUserId, enablePrivacyControls]);

  // Load social proof data
  const loadSocialProof = useCallback(async (targetId: string) => {
    if (!currentUserId || !targetId || currentUserId === targetId) {
      setSocialProofData(null);
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);
    currentTargetRef.current = targetId;

    try {
      const data = await socialProofService.getSocialProofData(
        currentUserId,
        targetId,
        privacySettings || undefined
      );

      // Only update if this is still the current target
      if (currentTargetRef.current === targetId) {
        setSocialProofData(data);
      }
    } catch (err) {
      if (currentTargetRef.current === targetId) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load social proof data';
        setError(errorMessage);
        setSocialProofData(null);
      }
    } finally {
      if (currentTargetRef.current === targetId) {
        setIsLoading(false);
      }
    }
  }, [currentUserId, privacySettings]);

  // Update privacy setting
  const updatePrivacySetting = useCallback(async (
    setting: keyof PrivacySettings,
    value: boolean
  ) => {
    if (!enablePrivacyControls || !currentUserId || !privacySettings) return;

    try {
      // Optimistic update
      const newSettings = { ...privacySettings, [setting]: value };
      setPrivacySettings(newSettings);

      // Update on server
      await socialProofService.updatePrivacySettings(currentUserId, { [setting]: value });

      // Refresh social proof data with new settings
      if (currentTargetRef.current) {
        await loadSocialProof(currentTargetRef.current);
      }
    } catch (err) {
      // Revert optimistic update on error
      setPrivacySettings(privacySettings);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update privacy setting';
      setError(errorMessage);
    }
  }, [currentUserId, privacySettings, enablePrivacyControls, loadSocialProof]);

  // Refresh current data
  const refreshData = useCallback(async () => {
    if (currentTargetRef.current) {
      await loadSocialProof(currentTargetRef.current);
    }
    if (enablePrivacyControls) {
      await loadPrivacySettings();
    }
  }, [loadSocialProof, loadPrivacySettings, enablePrivacyControls]);

  // Clear cache
  const clearCache = useCallback(() => {
    socialProofService.clearCache();
  }, []);

  // Load privacy settings on mount
  useEffect(() => {
    if (enablePrivacyControls) {
      loadPrivacySettings();
    }
  }, [loadPrivacySettings, enablePrivacyControls]);

  // Auto-load social proof data
  useEffect(() => {
    if (autoLoad && targetUserId) {
      loadSocialProof(targetUserId);
    }
  }, [autoLoad, targetUserId, loadSocialProof]);

  // Set up refresh interval
  useEffect(() => {
    if (refreshInterval > 0 && targetUserId) {
      refreshTimeoutRef.current = setInterval(() => {
        if (currentTargetRef.current) {
          loadSocialProof(currentTargetRef.current);
        }
      }, refreshInterval);

      return () => {
        if (refreshTimeoutRef.current) {
          clearInterval(refreshTimeoutRef.current);
        }
      };
    }
  }, [refreshInterval, targetUserId, loadSocialProof]);

  // Update current target reference
  useEffect(() => {
    currentTargetRef.current = targetUserId;
  }, [targetUserId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (refreshTimeoutRef.current) {
        clearInterval(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    socialProofData,
    privacySettings,
    isLoading,
    error,
    loadSocialProof,
    updatePrivacySetting,
    refreshData,
    clearCache,
  };
};

export default useSocialProof;