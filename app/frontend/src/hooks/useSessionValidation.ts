import { useCallback } from 'react';
import { enhancedAuthService } from '@/services/enhancedAuthService';
import { authService } from '@/services/authService';

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
      // 1. Check enhanced auth service first (highest priority)
      if (enhancedAuthService.isAuthenticated()) {
        const currentUser = await enhancedAuthService.getCurrentUser();
        if (currentUser && currentUser.address === address) {
          console.log('✅ Valid session found in enhanced auth service');
          return {
            isValid: true,
            userAddress: currentUser.address,
            token: enhancedAuthService.getToken() || undefined
          };
        }
      }

      // 2. Check regular auth service
      const existingToken = authService.getToken();
      if (existingToken && !existingToken.startsWith('mock_token_')) {
        try {
          const currentUser = await authService.getCurrentUser();
          if (currentUser && currentUser.address === address) {
            console.log('✅ Valid session found in regular auth service');
            return {
              isValid: true,
              userAddress: currentUser.address,
              token: existingToken
            };
          }
        } catch (error) {
          console.log('Existing token in auth service is invalid');
        }
      }

      // 3. Check localStorage for valid session data
      const storedAddress = localStorage.getItem('linkdao_wallet_address');
      const storedToken = localStorage.getItem('linkdao_access_token');
      const storedTimestamp = localStorage.getItem('linkdao_signature_timestamp');
      
      if (storedAddress === address && storedToken && storedTimestamp) {
        const timestamp = parseInt(storedTimestamp);
        const now = Date.now();
        const TOKEN_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours
        
        if (now - timestamp < TOKEN_EXPIRY_TIME) {
          console.log('✅ Valid session found in localStorage');
          return {
            isValid: true,
            userAddress: storedAddress,
            token: storedToken
          };
        } else {
          console.log('⏰ Stored session expired, clearing...');
          // Clear expired session
          localStorage.removeItem('linkdao_access_token');
          localStorage.removeItem('linkdao_wallet_address');
          localStorage.removeItem('linkdao_signature_timestamp');
          localStorage.removeItem('linkdao_user_data');
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

    // Clear regular auth service session
    try {
      localStorage.removeItem('auth_token');
    } catch (error) {
      console.warn('Could not clear auth service session:', error);
    }

    // Clear all localStorage session data
    try {
      localStorage.removeItem('linkdao_access_token');
      localStorage.removeItem('linkdao_wallet_address');
      localStorage.removeItem('linkdao_signature_timestamp');
      localStorage.removeItem('linkdao_user_data');
      localStorage.removeItem('linkdao_refresh_token');
      localStorage.removeItem('linkdao_session_data');
    } catch (error) {
      console.warn('Could not clear localStorage sessions:', error);
    }

    console.log('🧹 All sessions cleared');
  }, []);

  return {
    validateSession,
    clearAllSessions
  };
};