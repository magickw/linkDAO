/**
 * WalletLoginBridgeWithToast - Enhanced version with toast notifications
 * This version should be placed in _app.tsx after ToastProvider
 */

import React, { useContext } from 'react';
import { useAccount } from 'wagmi';
import { useAuth } from '@/context/AuthContext';
import { ToastContext } from '@/context/ToastContext';
import { WalletLoginBridge } from './WalletLoginBridge';

// Custom hook to safely access toast context with fallback
const useToastOrFallback = () => {
  const context = useContext(ToastContext);
  
  // Return a safe fallback if context is not available
  if (!context) {
    return {
      addToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
        // In development, warn about missing context
        if (process.env.NODE_ENV === 'development') {
          console.warn('ToastContext not available, using console fallback for message:', message);
        }
        // Fallback to console logging
        console.log(`[${type}] ${message}`);
      }
    };
  }
  
  return context;
};

export const WalletLoginBridgeWithToast: React.FC = () => {
  const { connector } = useAccount();
  const { addToast } = useToastOrFallback();

  const handleLoginSuccess = (user: any) => {
    const walletName = connector?.name || 'Wallet';
    const isBaseWallet = connector?.name?.toLowerCase().includes('coinbase') || 
                        connector?.id === 'coinbaseWallet';
    
    if (isBaseWallet) {
      addToast(`🎉 Successfully logged in with ${walletName}! Welcome to Base!`, 'success');
    } else {
      addToast(`✅ Successfully logged in with ${walletName}!`, 'success');
    }
  };

  const handleLoginError = (error: string) => {
    if (error.includes('signature')) {
      addToast('📝 Please sign the message in your wallet to complete login', 'warning');
    } else if (error.includes('rejected') || error.includes('denied')) {
      addToast('❌ Login cancelled. You can connect again anytime.', 'info');
    } else {
      addToast('🔴 Login failed. Please try connecting your wallet again.', 'error');
    }
  };

  return (
    <WalletLoginBridge
      autoLogin={true}
      skipIfAuthenticated={true}
      onLoginSuccess={handleLoginSuccess}
      onLoginError={handleLoginError}
    />
  );
};

export default WalletLoginBridgeWithToast;