import { useCallback } from 'react';
import { enhancedAuthService } from '@/services/enhancedAuthService';

interface SessionValidationResult {
  isValid: boolean;
  userAddress?: string;
  token?: string;
}

/**
 * Hook to validate existing authentication sessions and prevent unnecessary signature prompts
 */
export const useSessionValidation = () => {
  /**
   * Check for valid authentication session across all available services
   */
  const validateSession = useCallback(async (address: string): Promise<SessionValidationResult> => {
    try {
      // Normalize address for case-insensitive comparison
      const normalizedAddress = address.toLowerCase();

      // 1. Check enhanced auth service first (highest priority)
      if (enhancedAuthService.isAuthenticated()) {
        const currentUser = await enhancedAuthService.getCurrentUser();
        if (currentUser && currentUser.address?.toLowerCase() === normalizedAddress) {
          console.log('✅ Valid session found in enhanced auth service');
          return {
            isValid: true,
            userAddress: currentUser.address,
            token: enhancedAuthService.getToken() || undefined
          };
        }
      }

      // No valid session found
      return {
        isValid: false
      };
    } catch (error) {
      console.error('Error validating session:', error);
      return {
        isValid: false
      };
    }
  }, []);

  /**
   * Force clear all session data
   */
  const clearAllSessions = useCallback(() => {
    // Clear enhanced auth service session
    try {
      enhancedAuthService['clearStoredSession']?.();
    } catch (error) {
      console.warn('Could not clear enhanced auth service session:', error);
    }

    console.log('🧹 All sessions cleared');
  }, []);

  return {
    validateSession,
    clearAllSessions
  };
};