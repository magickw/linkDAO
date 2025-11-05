import { useState, useEffect, useRef } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/authService';

interface WalletInfo {
  isBaseWallet: boolean;
  chainId?: number;
  connector?: string;
}

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

  // Auto-authenticate when wallet connects (with improved logic)
  useEffect(() => {
    const shouldAutoAuthenticate = () => {
      // Don't auto-authenticate if:
      // 1. Wallet not connected
      // 2. No address
      // 3. Already authenticated for this address
      // 4. Currently authenticating
      // 5. Recently attempted authentication (within 30 seconds)
      // 6. Already attempted for this address
      
      if (!isConnected || !address || isAuthenticating) {
        return false;
      }

      if (isAuthenticated && user?.address === address) {
        return false;
      }

      const now = Date.now();
      if (now - lastAuthTimeRef.current < 30000) { // 30 seconds cooldown
        return false;
      }

      if (authAttemptRef.current === address) {
        return false;
      }

      return true;
    };

    if (shouldAutoAuthenticate()) {
      // Mark this address as attempted
      authAttemptRef.current = address;
      lastAuthTimeRef.current = Date.now();
      
      // Add a delay to ensure wallet is fully connected
      const timeoutId = setTimeout(() => {
        authenticate();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isConnected, address, isAuthenticated, isAuthenticating, user?.address]);

  const authenticate = async (): Promise<{ success: boolean; error?: string }> => {
    if (!address || !isConnected) {
      const errorMsg = 'Wallet not connected';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    if (isAuthenticating) {
      return { success: false, error: 'Authentication already in progress' };
    }

    // Check if already authenticated for this address
    if (isAuthenticated && user?.address === address) {
      console.log('Already authenticated for address:', address);
      return { success: true };
    }

    // Check if we have a valid token in storage for this address
    const existingToken = authService.getToken();
    if (existingToken && !existingToken.startsWith('mock_token_')) {
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser && currentUser.address === address) {
          console.log('Reusing existing session for address:', address);
          return { success: true };
        }
      } catch (error) {
        console.log('Existing token invalid, proceeding with new authentication');
      }
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      // Use the login method from AuthContext which handles the full flow
      const loginResult = await login(address, connector, 'connected');
      
      if (loginResult.success) {
        console.log('Wallet authentication successful');
        // Reset attempt tracking on success
        authAttemptRef.current = null;
        return { success: true };
      } else {
        const errorMsg = loginResult.error || 'Authentication failed';
        setError(errorMsg);
        // Don't reset attempt tracking on failure to prevent loops
        return { success: false, error: errorMsg };
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error) || 'Authentication error';
      console.error('Wallet authentication error:', error);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsAuthenticating(false);
    }
  };

  return {
    isAuthenticating,
    walletInfo,
    authenticate,
    error,
  };
};

export default useWalletAuth;