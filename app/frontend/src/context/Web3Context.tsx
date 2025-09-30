import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount, useBalance, useContractRead, useContractWrite } from 'wagmi';

// Define types for our context
interface Web3ContextType {
  isConnected: boolean;
  address: `0x${string}` | undefined;
  balance: string;
  chainId: number | undefined;
}

// Create the context
const Web3Context = createContext<Web3ContextType | undefined>(undefined);

// Provider component
export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const { address, isConnected, chain } = useAccount();
  const { data: balanceData } = useBalance({
    address: address,
  });

  const [balance, setBalance] = useState<string>('0');

  // Prevent multiple initializations of WalletConnect
  useEffect(() => {
    // Check if WalletConnect is already initialized
    const isWalletConnectInitialized = (window as any).__walletConnectInitialized;
    if (isWalletConnectInitialized) {
      console.log('WalletConnect is already initialized, skipping duplicate initialization');
      return;
    }
    
    // Mark as initialized
    (window as any).__walletConnectInitialized = true;
    
    // Cleanup on unmount
    return () => {
      (window as any).__walletConnectInitialized = false;
    };
  }, []);

  useEffect(() => {
    if (balanceData) {
      setBalance(balanceData.formatted);
    }
  }, [balanceData]);

  return (
    <Web3Context.Provider
      value={{
        isConnected,
        address,
        balance,
        chainId: chain?.id,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

// Hook to use the context
export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};