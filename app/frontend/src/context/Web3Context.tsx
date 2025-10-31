import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

interface Web3ContextType {
  address: string | undefined;
  isConnected: boolean;
  connect: (connectorId?: string) => void;
  disconnect: () => void;
  switchNetwork: (chainId: number) => void;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

interface Web3ProviderProps {
  children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const handleConnect = (connectorId?: string) => {
    // Find MetaMask connector first, then fall back to injected, then first available
    let connector;
    
    if (connectorId) {
      connector = connectors.find(c => c.id === connectorId);
    } else {
      // Try to find MetaMask specifically
      connector = connectors.find(c => c.id === 'metaMask') || 
                  connectors.find(c => c.id === 'injected') || 
                  connectors[0];
    }
    
    if (connector) {
      connect({ connector });
    } else {
      console.error('No wallet connector found');
    }
  };

  const handleSwitchNetwork = (chainId: number) => {
    // Implementation for network switching
    console.log('Switching to network:', chainId);
  };

  const value: Web3ContextType = {
    address,
    isConnected,
    connect: handleConnect,
    disconnect,
    switchNetwork: handleSwitchNetwork,
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