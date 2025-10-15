import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { OnChainProof } from '../../types/onChainVerification';
import { Proposal } from '../../types/governance';
import { web3ErrorHandler } from '../../utils/web3ErrorHandling';

interface BlockchainData {
  // Token data
  tokenPrices: Map<string, number>;
  tokenBalances: Map<string, number>;
  
  // Governance data
  activeProposals: Proposal[];
  userVotes: Map<string, any>;
  
  // Transaction data
  pendingTransactions: Map<string, OnChainProof>;
  confirmedTransactions: Map<string, OnChainProof>;
  
  // Network status
  blockNumber: number;
  gasPrice: number;
  networkStatus: 'connected' | 'disconnected' | 'syncing';
}

interface BlockchainDataContextType {
  data: BlockchainData;
  isLoading: boolean;
  error: string | null;
  
  // Data fetching methods
  refreshTokenPrice: (tokenAddress: string) => Promise<void>;
  refreshUserBalance: (userAddress: string, tokenAddress: string) => Promise<void>;
  refreshProposals: (communityId?: string) => Promise<void>;
  
  // Transaction monitoring
  watchTransaction: (txHash: string) => Promise<void>;
  unwatchTransaction: (txHash: string) => void;
  
  // Real-time subscriptions
  subscribeToBlocks: () => void;
  unsubscribeFromBlocks: () => void;
  subscribeToTokenPrice: (tokenAddress: string) => void;
  unsubscribeFromTokenPrice: (tokenAddress: string) => void;
}

const BlockchainDataContext = createContext<BlockchainDataContextType | null>(null);

interface BlockchainDataProviderProps {
  children: React.ReactNode;
  autoRefreshInterval?: number;
  enableRealTimeUpdates?: boolean;
}

export const BlockchainDataProvider: React.FC<BlockchainDataProviderProps> = ({
  children,
  autoRefreshInterval = 30000, // 30 seconds
  enableRealTimeUpdates = true
}) => {
  const [data, setData] = useState<BlockchainData>({
    tokenPrices: new Map(),
    tokenBalances: new Map(),
    activeProposals: [],
    userVotes: new Map(),
    pendingTransactions: new Map(),
    confirmedTransactions: new Map(),
    blockNumber: 0,
    gasPrice: 0,
    networkStatus: 'disconnected'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<Set<string>>(new Set());
  const [watchedTransactions, setWatchedTransactions] = useState<Set<string>>(new Set());

  // WebSocket connection for real-time updates
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (enableRealTimeUpdates) {
      initializeWebSocket();
    }
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [enableRealTimeUpdates]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshAllData();
    }, autoRefreshInterval);

    return () => clearInterval(interval);
  }, [autoRefreshInterval]);

  const initializeWebSocket = () => {
    try {
      // This would connect to your WebSocket endpoint for real-time blockchain data
      const websocket = new WebSocket(process.env.NEXT_PUBLIC_WS_ENDPOINT || 'ws://localhost:8080');
      
      websocket.onopen = () => {
        console.log('Blockchain WebSocket connected');
        setData(prev => ({ ...prev, networkStatus: 'connected' }));
      };
      
      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      websocket.onclose = () => {
        console.log('Blockchain WebSocket disconnected');
        setData(prev => ({ ...prev, networkStatus: 'disconnected' }));
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (enableRealTimeUpdates) {
            initializeWebSocket();
          }
        }, 5000);
      };
      
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection failed');
      };
      
      setWs(websocket);
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      setError('Failed to connect to blockchain data feed');
    }
  };

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'newBlock':
        setData(prev => ({
          ...prev,
          blockNumber: message.data.number,
          gasPrice: message.data.gasPrice
        }));
        break;
        
      case 'tokenPriceUpdate':
        setData(prev => ({
          ...prev,
          tokenPrices: new Map(prev.tokenPrices.set(message.data.address, message.data.price))
        }));
        break;
        
      case 'transactionConfirmed':
        if (watchedTransactions.has(message.data.hash)) {
          setData(prev => {
            const newConfirmed = new Map(prev.confirmedTransactions);
            const newPending = new Map(prev.pendingTransactions);
            
            newConfirmed.set(message.data.hash, message.data);
            newPending.delete(message.data.hash);
            
            return {
              ...prev,
              confirmedTransactions: newConfirmed,
              pendingTransactions: newPending
            };
          });
        }
        break;
        
      case 'proposalUpdate':
        refreshProposals();
        break;
    }
  };

  const refreshAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Refresh basic network data
      await Promise.all([
        refreshNetworkStatus(),
        refreshGasPrice()
      ]);
    } catch (error) {
      const errorMessage = web3ErrorHandler.handleError(error as Error, {
        action: 'refreshAllData',
        component: 'BlockchainDataProvider'
      }).message;
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshNetworkStatus = async () => {
    try {
      // This would fetch current block number from RPC
      const blockNumber = await fetchCurrentBlockNumber();
      setData(prev => ({ ...prev, blockNumber, networkStatus: 'connected' }));
    } catch (error) {
      setData(prev => ({ ...prev, networkStatus: 'disconnected' }));
      throw error;
    }
  };

  const refreshGasPrice = async () => {
    try {
      // This would fetch current gas price from RPC
      const gasPrice = await fetchCurrentGasPrice();
      setData(prev => ({ ...prev, gasPrice }));
    } catch (error) {
      console.error('Failed to refresh gas price:', error);
    }
  };

  const refreshTokenPrice = useCallback(async (tokenAddress: string) => {
    try {
      // This would fetch token price from price feed API
      const price = await fetchTokenPrice(tokenAddress);
      setData(prev => ({
        ...prev,
        tokenPrices: new Map(prev.tokenPrices.set(tokenAddress, price))
      }));
    } catch (error) {
      console.error(`Failed to refresh token price for ${tokenAddress}:`, error);
    }
  }, []);

  const refreshUserBalance = useCallback(async (userAddress: string, tokenAddress: string) => {
    try {
      // This would fetch user balance from blockchain
      const balance = await fetchUserBalance(userAddress, tokenAddress);
      const key = `${userAddress}-${tokenAddress}`;
      setData(prev => ({
        ...prev,
        tokenBalances: new Map(prev.tokenBalances.set(key, balance))
      }));
    } catch (error) {
      console.error(`Failed to refresh balance for ${userAddress}:`, error);
    }
  }, []);

  const refreshProposals = useCallback(async (communityId?: string) => {
    try {
      // This would fetch active proposals from governance contracts
      const proposals = await fetchActiveProposals(communityId);
      setData(prev => ({ ...prev, activeProposals: proposals }));
    } catch (error) {
      console.error('Failed to refresh proposals:', error);
    }
  }, []);

  const watchTransaction = useCallback(async (txHash: string) => {
    setWatchedTransactions(prev => new Set(prev.add(txHash)));
    
    try {
      // Add to pending transactions
      setData(prev => ({
        ...prev,
        pendingTransactions: new Map(prev.pendingTransactions.set(txHash, {
          id: txHash,
          transactionHash: txHash,
          blockNumber: 0,
          contractAddress: '',
          verified: false,
          proofType: 'custom',
          status: 'pending',
          verificationSource: 'blockchain-rpc',
          confirmations: 0,
          requiredConfirmations: 12,
          timestamp: new Date(),
          fromAddress: ''
        }))
      }));
      
      // Subscribe to transaction updates via WebSocket
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'watchTransaction',
          data: { hash: txHash }
        }));
      }
    } catch (error) {
      console.error(`Failed to watch transaction ${txHash}:`, error);
    }
  }, [ws]);

  const unwatchTransaction = useCallback((txHash: string) => {
    setWatchedTransactions(prev => {
      const newSet = new Set(prev);
      newSet.delete(txHash);
      return newSet;
    });
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'unwatchTransaction',
        data: { hash: txHash }
      }));
    }
  }, [ws]);

  const subscribeToBlocks = useCallback(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'subscribeBlocks' }));
    }
  }, [ws]);

  const unsubscribeFromBlocks = useCallback(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'unsubscribeBlocks' }));
    }
  }, [ws]);

  const subscribeToTokenPrice = useCallback((tokenAddress: string) => {
    setSubscriptions(prev => new Set(prev.add(`price-${tokenAddress}`)));
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'subscribeTokenPrice',
        data: { address: tokenAddress }
      }));
    }
  }, [ws]);

  const unsubscribeFromTokenPrice = useCallback((tokenAddress: string) => {
    setSubscriptions(prev => {
      const newSet = new Set(prev);
      newSet.delete(`price-${tokenAddress}`);
      return newSet;
    });
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'unsubscribeTokenPrice',
        data: { address: tokenAddress }
      }));
    }
  }, [ws]);

  // Mock API functions (these would be replaced with actual blockchain calls)
  const fetchCurrentBlockNumber = async (): Promise<number> => {
    // Mock implementation
    return Math.floor(Date.now() / 1000 / 12); // Approximate block number
  };

  const fetchCurrentGasPrice = async (): Promise<number> => {
    // Mock implementation
    return 20; // 20 gwei
  };

  const fetchTokenPrice = async (tokenAddress: string): Promise<number> => {
    // Mock implementation
    return Math.random() * 1000;
  };

  const fetchUserBalance = async (userAddress: string, tokenAddress: string): Promise<number> => {
    // Mock implementation
    return Math.random() * 10000;
  };

  const fetchActiveProposals = async (communityId?: string): Promise<Proposal[]> => {
    // Mock implementation
    return [];
  };

  const contextValue: BlockchainDataContextType = {
    data,
    isLoading,
    error,
    refreshTokenPrice,
    refreshUserBalance,
    refreshProposals,
    watchTransaction,
    unwatchTransaction,
    subscribeToBlocks,
    unsubscribeFromBlocks,
    subscribeToTokenPrice,
    unsubscribeFromTokenPrice
  };

  return (
    <BlockchainDataContext.Provider value={contextValue}>
      {children}
    </BlockchainDataContext.Provider>
  );
};

export const useBlockchainData = () => {
  const context = useContext(BlockchainDataContext);
  if (!context) {
    throw new Error('useBlockchainData must be used within a BlockchainDataProvider');
  }
  return context;
};