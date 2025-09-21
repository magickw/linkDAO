/**
 * Security Provider Component
 * Provides security context and validation for the enhanced social dashboard
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import SecurityManager, { SecurityManagerConfig, type SecurityContext } from '../../security/securityManager';

// Mock wallet hook for security provider
const useWallet = () => ({
  walletAddress: undefined,
  isConnected: false
});

interface SecurityProviderProps {
  children: ReactNode;
  config?: Partial<SecurityManagerConfig>;
}

interface SecurityContextValue {
  securityManager: SecurityManager | null;
  isInitialized: boolean;
  securityContext: SecurityContext;
  updateSecurityContext: (updates: Partial<SecurityContext>) => void;
}

const SecurityContext = createContext<SecurityContextValue | null>(null);

export function SecurityProvider({ children, config = {} }: SecurityProviderProps) {
  const [securityManager, setSecurityManager] = useState<SecurityManager | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [securityContext, setSecurityContext] = useState<SecurityContext>({
    timestamp: new Date(),
    userAgent: typeof window !== 'undefined' && typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
  });

  const { walletAddress, isConnected } = useWallet();

  // Initialize security manager
  useEffect(() => {
    const initSecurity = async () => {
      try {
        const manager = SecurityManager.getInstance(config);
        await manager.initialize();
        setSecurityManager(manager);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize security manager:', error);
      }
    };

    initSecurity();
  }, [config]);

  // Update security context when wallet changes
  useEffect(() => {
    if (isConnected && walletAddress) {
      setSecurityContext(prev => ({
        ...prev,
        walletAddress,
        timestamp: new Date()
      }));
    }
  }, [walletAddress, isConnected]);

  // Update security context
  const updateSecurityContext = (updates: Partial<SecurityContext>) => {
    setSecurityContext(prev => ({
      ...prev,
      ...updates,
      timestamp: new Date()
    }));
  };

  const contextValue: SecurityContextValue = {
    securityManager,
    isInitialized,
    securityContext,
    updateSecurityContext
  };

  return (
    <SecurityContext.Provider value={contextValue}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurityContext(): SecurityContextValue {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurityContext must be used within a SecurityProvider');
  }
  return context;
}

export default SecurityProvider;