/**
 * WalletLoginBridgeWithToast - Enhanced version with toast notifications
 * This version should be placed in _app.tsx after ToastProvider
 */

import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { WalletLoginBridge } from './WalletLoginBridge';

export const WalletLoginBridgeWithToast: React.FC = () => {
  const { connector } = useAccount();
  const [isToastReady, setIsToastReady] = useState(false);
  const toastContext = useToast();

  useEffect(() => {
    // Check if toast context is properly initialized
    if (toastContext && toastContext.addToast && typeof toastContext.addToast === 'function') {
      setIsToastReady(true);
    }
  }, [toastContext]);

  const handleLoginSuccess = (user: any) => {
    const { addToast } = toastContext;
    
    // Check if addToast is available
    if (!isToastReady || !addToast || typeof addToast !== 'function') {
      // Fallback to console logging
      const walletName = connector?.name || 'Wallet';
      const isBaseWallet = connector?.name?.toLowerCase().includes('coinbase') || 
                          connector?.id === 'coinbaseWallet';
      
      if (isBaseWallet) {
        console.log(`🎉 Successfully logged in with ${walletName}! Welcome to Base!`);
      } else {
        console.log(`✅ Successfully logged in with ${walletName}!`);
      }
      return;
    }
    
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
    const { addToast } = toastContext;
    
    // Check if addToast is available
    if (!isToastReady || !addToast || typeof addToast !== 'function') {
      // Fallback to console logging
      if (error.includes('signature')) {
        console.log('📝 Please sign the message in your wallet to complete login');
      } else if (error.includes('rejected') || error.includes('denied')) {
        console.log('❌ Login cancelled. You can connect again anytime.');
      } else {
        console.log('🔴 Login failed. Please try connecting your wallet again.');
      }
      return;
    }
    
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