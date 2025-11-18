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
  
  if (context) {
    return context;
  }
  
  // Fallback implementation when no provider is present
  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    console.log(`[Toast fallback] ${type.toUpperCase()}: ${message}`);
  };
  
  return { addToast };
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