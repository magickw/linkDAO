import { useState, useEffect } from 'react';
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
  const { login, isAuthenticated } = useAuth();
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletInfo, setWalletInfo] = useState<WalletInfo>({
    isBaseWallet: false,
  });

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

  // Auto-authenticate when wallet connects (if not already authenticated)
  useEffect(() => {
    if (isConnected && address && !isAuthenticated && !isAuthenticating) {
      authenticate();
    }
  }, [isConnected, address, isAuthenticated, isAuthenticating]);

  const authenticate = async (): Promise<{ success: boolean; error?: string }> => {
    if (!address || !isConnected) {
      const errorMsg = 'Wallet not connected';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    if (isAuthenticating) {
      return { success: false, error: 'Authentication already in progress' };
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      // Use the auth service to handle the full authentication flow
      const result = await authService.authenticateWallet(
        address,
        connector,
        isConnected ? 'connected' : 'disconnected'
      );

      if (result.success && result.user) {
        // Update auth context
        const loginResult = await login(address, connector, 'connected');
        
        if (loginResult.success) {
          console.log('Wallet authentication successful');
          return { success: true };
        } else {
          const errorMsg = loginResult.error || 'Login failed after authentication';
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }
      } else {
        const errorMsg = result.error || 'Authentication failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Authentication error';
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