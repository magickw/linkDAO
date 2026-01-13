import { useState, useEffect, useRef } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useAuth } from '@/context/AuthContext';
import { useSessionValidation } from '@/hooks/useSessionValidation';
import { WalletInfo } from '@/types/wallet';

interface UseWalletAuthReturn {
  isAuthenticating: boolean;
  walletInfo: WalletInfo;
  authenticate: () => Promise<{ success: boolean; error?: string }>;
  error: string | null;
}

export const useWalletAuth = (): UseWalletAuthReturn => {
  const { address, isConnected, connector } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { login, isAuthenticated, user } = useAuth();
  const { validateSession, clearAllSessions } = useSessionValidation();

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletInfo, setWalletInfo] = useState<WalletInfo>({
    isBaseWallet: false,
  });

  // Track authentication attempts to prevent loops
  const authAttemptRef = useRef<string | null>(null);
  const lastAuthTimeRef = useRef<number>(0);

  // Update wallet info when connection changes
  useEffect(() => {
    if (isConnected && connector) {
      setWalletInfo({
        isBaseWallet: connector.name?.toLowerCase().includes('base') || false,
        chainId: connector.chains?.[0]?.id,
        connector: connector.name,
      });
    } else {
      setWalletInfo({
        isBaseWallet: false,
      });
    }
  }, [isConnected, connector]);

  // DISABLED: Auto-authentication to prevent excessive signature prompts
  // Users must now explicitly authenticate via button click or other user action
  // This prevents the hook from automatically triggering signature requests on wallet connection
  // 
  // The previous auto-authentication logic would trigger on:
  // - Initial wallet connection
  // - Page refresh with connected wallet
  // - Component re-renders
  // 
  // This caused excessive signature prompts even when valid sessions existed.
  // Authentication now only happens when explicitly requested by calling authenticate()

  // Note: Session restoration still happens automatically via AuthContext
  // This hook just provides the authenticate() method for explicit user actions

  const authenticate = async (): Promise<{ success: boolean; error?: string }> => {
    if (!address || !isConnected) {
      const errorMsg = 'Wallet not connected';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    if (isAuthenticating) {
      return { success: false, error: 'Authentication already in progress' };
    }

    // Normalize address for case-insensitive comparison
    const normalizedAddress = address.toLowerCase();

    // Check if already authenticated for this address (case-insensitive)
    if (isAuthenticated && user?.address?.toLowerCase() === normalizedAddress) {
      console.log('✅ Already authenticated for address:', address);
      return { success: true };
    }

    // Check persistent localStorage to prevent re-prompting across page refreshes
    const lastAuthAttempt = localStorage.getItem(`linkdao_last_auth_attempt_${normalizedAddress}`);
    if (lastAuthAttempt) {
      const lastAttemptTime = parseInt(lastAuthAttempt);
      const now = Date.now();
      const COOLDOWN_PERIOD = 5 * 60 * 1000; // 5 minutes cooldown

      if (now - lastAttemptTime < COOLDOWN_PERIOD) {
        console.log('⏳ Authentication cooldown active, skipping signature request');
        // Still check for valid session even during cooldown
        const sessionValidation = await validateSession(address);
        if (sessionValidation.isValid) {
          console.log('✅ Using existing valid session during cooldown');
          return { success: true };
        }
        return {
          success: false,
          error: 'Please wait a few minutes before trying to authenticate again'
        };
      }
    }

    // Check for existing valid session before prompting for signature
    const sessionValidation = await validateSession(address);
    if (sessionValidation.isValid) {
      console.log('✅ Using existing valid session for address:', address);
      // Clear the cooldown since we have a valid session
      localStorage.removeItem(`linkdao_last_auth_attempt_${normalizedAddress}`);
      return { success: true };
    }

    // Store attempt timestamp in localStorage for persistence across page refreshes
    localStorage.setItem(`linkdao_last_auth_attempt_${normalizedAddress}`, Date.now().toString());

    // Set authenticating state but ensure navigation is not blocked
    setIsAuthenticating(true);
    setError(null);

    // Use setTimeout to ensure the authenticating state update happens before
    // the async operation to prevent blocking any UI updates
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          console.log('🔐 Requesting wallet signature for authentication...');
          // Use the login method from AuthContext which handles the full flow
          const loginResult = await login(address, connector, 'connected');

          if (loginResult.success) {
            console.log('✅ Wallet authentication successful');
            // Clear the cooldown on successful authentication
            localStorage.removeItem(`linkdao_last_auth_attempt_${normalizedAddress}`);
            resolve({ success: true });
          } else {
            const errorMsg = loginResult.error || 'Authentication failed';
            setError(errorMsg);
            resolve({ success: false, error: errorMsg });
          }
        } catch (error: any) {
          const errorMsg = error?.message || String(error) || 'Authentication error';
          console.error('❌ Wallet authentication error:', error);
          setError(errorMsg);
          resolve({ success: false, error: errorMsg });
        } finally {
          // Ensure authenticating state is reset even after async operation completes
          setIsAuthenticating(false);
        }
      }, 0); // Use 0ms timeout to defer to next tick of event loop
    });
  };

  return {
    isAuthenticating,
    walletInfo,
    authenticate,
    error,
  };
};