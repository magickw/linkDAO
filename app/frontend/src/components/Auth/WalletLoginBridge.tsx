/**
 * WalletLoginBridge - Automatic authentication bridge for wallet connections
 * Triggers authentication flow when a user connects their wallet (including Base wallet)
 */

import React, { useEffect, useState, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useAuth } from '@/context/AuthContext';

interface WalletLoginBridgeProps {
  autoLogin?: boolean;
  onLoginSuccess?: (user: any) => void;
  onLoginError?: (error: string) => void;
  skipIfAuthenticated?: boolean;
}

// Global flag to prevent multiple WalletLoginBridge instances from running simultaneously
let isGlobalAuthInProgress = false;

export const WalletLoginBridge: React.FC<WalletLoginBridgeProps> = ({
  autoLogin = true,
  onLoginSuccess,
  onLoginError,
  skipIfAuthenticated = true
}) => {
  const { address, isConnected, connector, status } = useAccount();
  const { user, isAuthenticated, isLoading: isAuthLoading, login } = useAuth();

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const lastAddressRef = useRef<string | undefined>();
  const hasTriedLoginRef = useRef(false);
  const loginAttemptTimestampRef = useRef<number>(0);

  // Prevent page refresh loops by tracking failed attempts
  const [failedAttempts, setFailedAttempts] = useState(0);
  const maxFailedAttempts = 3;
  
  // Add a cooldown period to prevent rapid retries
  const AUTH_COOLDOWN_MS = 2000;

  // Simple notification function (will be enhanced when ToastProvider is available)
  const notify = (message: string, type: 'info' | 'success' | 'warning' | 'error') => {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // Could also use browser notifications here if needed
  };

  useEffect(() => {
    // Check if wallet connection has changed
    const addressChanged = lastAddressRef.current !== address;
    lastAddressRef.current = address;

    // CRITICAL: Wait for auth initialization to complete before attempting login
    // This prevents signature prompts when a valid session already exists
    if (isAuthLoading) {
      console.log('⏳ Waiting for auth initialization to complete...');
      return;
    }

    // Skip if conditions not met
    if (!autoLogin || !isConnected || !address || isLoggingIn || status !== 'connected' || !connector) {
      return;
    }

    // Skip if user is already authenticated and we should skip
    if (skipIfAuthenticated && isAuthenticated) {
      console.log('📝 Skipping auto-login: user already authenticated');
      // Reset the login attempt flag when user is authenticated
      hasTriedLoginRef.current = false;
      return;
    }

    // Skip if we already tried login for this address recently (cooldown)
    const now = Date.now();
    if (!addressChanged && (now - loginAttemptTimestampRef.current < AUTH_COOLDOWN_MS)) {
      console.log('📝 Skipping auto-login: cooldown period active');
      return;
    }

    // Check for existing valid session BEFORE attempting login
    const storedToken = localStorage.getItem('linkdao_access_token');
    const storedAddress = localStorage.getItem('linkdao_wallet_address');
    const storedTimestamp = localStorage.getItem('linkdao_signature_timestamp');
    const storedUserData = localStorage.getItem('linkdao_user_data');
    
    if (storedToken && storedAddress === address && storedTimestamp && storedUserData) {
      const timestamp = parseInt(storedTimestamp);
      const now = Date.now();
      const TOKEN_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours
      
      if (now - timestamp < TOKEN_EXPIRY_TIME) {
        console.log('✅ Valid session exists, ensuring auth context is updated');
        hasTriedLoginRef.current = false;
        // Ensure the auth context is updated with the stored session
        if (!isAuthenticated && !isAuthLoading && !isLoggingIn) {
          console.log('🔄 Updating auth context with stored session');
          // Set a small delay to ensure auth context is ready to update
          setTimeout(() => {
            login(address, connector, status).catch(err => {
              console.warn('Failed to update auth context with stored session:', err);
            });
          }, 100);
        }
        return;
      } else {
        console.log('⏰ Stored session expired, clearing expired session');
        // Clear expired session
        const storageKeys = [
          'linkdao_access_token',
          'linkdao_wallet_address', 
          'linkdao_signature_timestamp',
          'linkdao_user_data'
        ];
        storageKeys.forEach(key => localStorage.removeItem(key));
      }
    }

    // Add a short delay to ensure all initialization is complete
    const timer = setTimeout(() => {
      console.log('🚀 Triggering auto-login for:', address);
      handleAutoLogin();
    }, 500); // Reduced back to 500ms since we now properly wait for initialization

    return () => clearTimeout(timer);
  }, [address, isConnected, isAuthenticated, isAuthLoading, autoLogin, skipIfAuthenticated, isLoggingIn, status, connector]);

  const handleAutoLogin = async () => {
    // Check global auth flag to prevent duplicate authentication
    if (isGlobalAuthInProgress) {
      console.log('📝 Skipping auto-login: global authentication in progress');
      return;
    }
    
    if (!address || isLoggingIn || !connector || status !== 'connected' || failedAttempts >= maxFailedAttempts) return;

    try {
      isGlobalAuthInProgress = true;
      setIsLoggingIn(true);
      hasTriedLoginRef.current = true;
      
      // Set the attempt timestamp to prevent rapid retries
      loginAttemptTimestampRef.current = Date.now();

      console.log(`🔐 Attempting automatic login for wallet: ${address} via ${connector?.name || 'Unknown'}`);

      // First check if we already have a valid session to avoid unnecessary signature prompts
      const storedToken = localStorage.getItem('linkdao_access_token');
      const storedAddress = localStorage.getItem('linkdao_wallet_address');
      const storedTimestamp = localStorage.getItem('linkdao_signature_timestamp');
      const storedUserData = localStorage.getItem('linkdao_user_data');
      
      if (storedToken && storedAddress === address && storedTimestamp && storedUserData) {
        const timestamp = parseInt(storedTimestamp);
        const now = Date.now();
        const TOKEN_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours
        
        if (now - timestamp < TOKEN_EXPIRY_TIME) {
          console.log('✅ Found valid stored session, skipping signature request');
          // Reset failed attempts on successful session restoration
          setFailedAttempts(0);
          hasTriedLoginRef.current = false;
          
          // Still call login to ensure the AuthContext state is updated
          const result = await login(address, connector, status);
          
          if (result.success) {
            const walletName = connector?.name || 'Wallet';
            console.log(`✅ Session restored successfully for ${walletName}!`);
            
            if (onLoginSuccess) {
              onLoginSuccess({ address });
            }
          }
          
          return;
        }
      }

      const result = await login(address, connector, status);
      console.log('🔍 Login result:', result);

      if (result.success) {
        const walletName = connector?.name || 'Wallet';
        console.log(`✅ Login successful for ${walletName}!`);
        setFailedAttempts(0); // Reset failed attempts on success
        
        if (onLoginSuccess) {
          onLoginSuccess({ address });
        }
      } else {
        const errorMessage = result.error || 'Authentication failed';
        console.error('❌ Auto-login failed:', errorMessage);
        
        // Increment failed attempts for certain types of errors
        if (errorMessage.includes('Connector not connected') || errorMessage.includes('Failed to sign')) {
          setFailedAttempts(prev => prev + 1);
        }
        
        // Don't show error notifications for connector issues to prevent spam
        if (!errorMessage.includes('Connector not connected')) {
          if (onLoginError) {
            onLoginError(errorMessage);
          }
        }
      }
    } catch (error) {
      console.error('💥 Auto-login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      
      // Increment failed attempts for connector errors
      if (errorMessage.includes('Connector not connected') || errorMessage.includes('Failed to sign')) {
        setFailedAttempts(prev => prev + 1);
      }
      
      // Don't show error notifications for connector issues
      if (!errorMessage.includes('Connector not connected')) {
        if (onLoginError) {
          onLoginError(errorMessage);
        }
      }
    } finally {
      setIsLoggingIn(false);
      isGlobalAuthInProgress = false; // Reset the global flag
    }
  };

  // Reset attempt flag when wallet disconnects or connector changes
  useEffect(() => {
    if (!isConnected || !connector) {
      hasTriedLoginRef.current = false;
    }
  }, [isConnected, connector]);

  // Monitor authentication status and reset login attempt when authenticated
  useEffect(() => {
    if (isAuthenticated && user && user.address === address) {
      // User is now authenticated for the current address, reset the login attempt flag
      // This prevents repeated login attempts for the same session
      if (hasTriedLoginRef.current) {
        hasTriedLoginRef.current = false;
        console.log('User authenticated successfully, resetting login attempt flag');
      }
    }
  }, [isAuthenticated, user, address]);

  useEffect(() => {
    if (failedAttempts >= maxFailedAttempts) {
      console.log('Max failed login attempts reached, stopping auto-login');
      hasTriedLoginRef.current = true; // Prevent further attempts
    }
  }, [failedAttempts]);

  // Cleanup function to reset global flag when component unmounts
  useEffect(() => {
    return () => {
      if (hasTriedLoginRef.current) {
        isGlobalAuthInProgress = false;
      }
    };
  }, []);

  // This component doesn't render anything visible
  return null;
};

export default WalletLoginBridge;