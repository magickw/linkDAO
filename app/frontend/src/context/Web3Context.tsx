import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount, useConnect, useDisconnect, useSigner } from 'wagmi';
import { hasInjectedProvider, requestWalletConnection, onAccountsChanged, onChainChanged } from '@/utils/walletConnector';

interface Web3ContextType {
  address: string | undefined;
  isConnected: boolean;
  hasWallet: boolean;
  signer: any;
  connect: (connectorId?: string) => void;
  disconnect: () => void;
  switchNetwork: (chainId: number) => void;
  requestConnection: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

interface Web3ProviderProps {
  children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  const { address, isConnected, connector } = useAccount();
  const { data: signer } = useSigner();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // Check for injected provider availability
  const [hasWallet, setHasWallet] = useState(false);

  useEffect(() => {
    // Check if injected provider is available
    setHasWallet(hasInjectedProvider());
    
    // Set up listeners for account and chain changes
    const cleanupAccountsListener = onAccountsChanged((accounts: string[]) => {
      if (accounts.length === 0) {
        // Wallet disconnected
        console.log('Wallet disconnected');
      } else {
        // Account changed
        console.log('Account changed:', accounts[0]);
      }
    });
    
    const cleanupChainListener = onChainChanged((chainId: string) => {
      console.log('Chain changed:', chainId);
    });
    
    return () => {
      cleanupAccountsListener();
      cleanupChainListener();
    };
  }, []);

  const handleConnect = (connectorId?: string) => {
    // Find MetaMask connector first, then fall back to injected, then first available
    let connectorToUse;
    
    if (connectorId) {
      connectorToUse = connectors.find(c => c.id === connectorId);
    } else {
      // Try to find MetaMask specifically
      connectorToUse = connectors.find(c => c.id === 'metaMask') || 
                      connectors.find(c => c.id === 'injected') || 
                      connectors[0];
    }
    
    if (connectorToUse) {
      connect({ connector: connectorToUse });
    } else {
      console.error('No wallet connector found');
    }
  };

  const handleRequestConnection = async () => {
    try {
      await requestWalletConnection();
    } catch (error) {
      console.error('Failed to request wallet connection:', error);
    }
  };

  const handleSwitchNetwork = (chainId: number) => {
    // Implementation for network switching
    console.log('Switching to network:', chainId);
  };

  const value: Web3ContextType = {
    address,
    isConnected,
    hasWallet,
    signer,
    connect: handleConnect,
    disconnect,
    switchNetwork: handleSwitchNetwork,
    requestConnection: handleRequestConnection,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}