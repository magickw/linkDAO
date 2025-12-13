/**
 * Smart Contract Dashboard
 * Real-time monitoring and interaction with all deployed contracts
 */

import React, { useState, useEffect } from 'react';
import { useAccount, useSigner, useProvider } from 'wagmi';
import { ethers } from 'ethers';
import { contractRegistryService } from '@/services/contractRegistryService';
import { reputationService } from '@/services/contracts/reputationService';
import { nftMarketplaceService } from '@/services/contracts/nftMarketplaceService';
import { stakingService } from '@/services/contracts/stakingService';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Globe, 
  Hash, 
  Link, 
  RefreshCw, 
  TrendingUp,
  Users,
  Coins,
  Shield,
  ShoppingBag,
  Award
} from 'lucide-react';

interface ContractStatus {
  name: string;
  address: string;
  isConnected: boolean;
  lastUpdated: number;
  events: ContractEvent[];
}

interface ContractEvent {
  type: string;
  data: any;
  timestamp: number;
  transactionHash: string;
}

interface TransactionState {
  status: 'idle' | 'pending' | 'success' | 'error';
  hash?: string;
  error?: string;
}

export const SmartContractDashboard: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { data: signer } = useSigner();
  const { data: provider } = useProvider();
  
  const [contracts, setContracts] = useState<ContractStatus[]>([]);
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [transactionState, setTransactionState] = useState<TransactionState>({ status: 'idle' });
  const [realTimeData, setRealTimeData] = useState<Record<string, any>>({});
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Initialize contracts and start real-time monitoring
  useEffect(() => {
    initializeContracts();
    startRealTimeMonitoring();

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      cleanupEventListeners();
    };
  }, [isConnected, provider]);

  const initializeContracts = async () => {
    const contractNames = [
      'LDAOToken',
      'Governance',
      'ReputationSystem',
      'NFTMarketplace',
      'EnhancedEscrow',
      'RewardPool',
      'LDAOTreasury',
      'ProfileRegistry',
      'TipRouter',
      'FollowModule',
      'DisputeResolution',
      'MultiSigWallet',
      'NFTCollectionFactory'
    ];

    const contractStatuses: ContractStatus[] = [];

    for (const name of contractNames) {
      try {
        const address = await contractRegistryService.getContractAddress(name);
        contractStatuses.push({
          name,
          address,
          isConnected: true,
          lastUpdated: Date.now(),
          events: []
        });
      } catch (error) {
        console.warn(`Failed to initialize ${name}:`, error);
        contractStatuses.push({
          name,
          address: '0x0000000000000000000000000000000000000000',
          isConnected: false,
          lastUpdated: Date.now(),
          events: []
        });
      }
    }

    setContracts(contractStatuses);
  };

  const startRealTimeMonitoring = () => {
    // Update real-time data every 5 seconds
    const interval = setInterval(async () => {
      if (isConnected && address) {
        await fetchRealTimeData();
      }
    }, 5000);

    setRefreshInterval(interval);

    // Set up event listeners
    setupEventListeners();
  };

  const fetchRealTimeData = async () => {
    if (!address) return;

    try {
      const { smartContractInteractionService } = await import('@/services/smartContractInteractionService');
      const data = await smartContractInteractionService.getRealTimeData(address, provider);
      setRealTimeData(data);
    } catch (error) {
      console.error('Failed to fetch real-time data:', error);
    }
  };

  const setupEventListeners = () => {
    // Listen to reputation events
    reputationService.listenToReputationUpdates((user, action, amount, newScore) => {
      if (user.toLowerCase() === address?.toLowerCase()) {
        addEventToContract('ReputationSystem', {
          type: 'ReputationUpdated',
          data: { user, action, amount, newScore },
          timestamp: Date.now(),
          transactionHash: '0x' // Would come from actual event
        });
      }
    });

    // Listen to NFT marketplace events
    nftMarketplaceService.listenToEvents({
      onListingCreated: (listingId, seller, nftContract, tokenId, price) => {
        addEventToContract('NFTMarketplace', {
          type: 'ListingCreated',
          data: { listingId, seller, nftContract, tokenId, price },
          timestamp: Date.now(),
          transactionHash: '0x'
        });
      },
      onSaleExecuted: (listingId, buyer, price) => {
        addEventToContract('NFTMarketplace', {
          type: 'SaleExecuted',
          data: { listingId, buyer, price },
          timestamp: Date.now(),
          transactionHash: '0x'
        });
      }
    });

    // Listen to staking events
    stakingService.listenToStakingEvents({
      onStaked: (user, amount, tierId, stakeIndex) => {
        if (user.toLowerCase() === address?.toLowerCase()) {
          addEventToContract('EnhancedStaking', {
            type: 'Staked',
            data: { user, amount, tierId, stakeIndex },
            timestamp: Date.now(),
            transactionHash: '0x'
          });
        }
      }
    });
  };

  const addEventToContract = (contractName: string, event: ContractEvent) => {
    setContracts(prev => prev.map(contract => {
      if (contract.name === contractName) {
        return {
          ...contract,
          events: [event, ...contract.events.slice(0, 9)], // Keep last 10 events
          lastUpdated: Date.now()
        };
      }
      return contract;
    }));
  };

  const cleanupEventListeners = () => {
    reputationService.cleanup();
    nftMarketplaceService.cleanup();
    stakingService.cleanup();
  };

  const executeTransaction = async (contractName: string, functionName: string, params: any[]) => {
    if (!signer) {
      setTransactionState({ status: 'error', error: 'Wallet not connected' });
      return;
    }

    setTransactionState({ status: 'pending' });

    try {
      const { smartContractInteractionService } = await import('@/services/smartContractInteractionService');
      
      // Handle special cases with service methods
      if (contractName === 'ReputationSystem' && functionName === 'updateReputation') {
        await reputationService.updateReputation(
          address,
          'POST_CREATED',
          10,
          signer
        );
        setTransactionState({ status: 'success', hash: '0x...' });
      } else if (contractName === 'EnhancedStaking' && functionName === 'stake') {
        await stakingService.stake(100, 1, signer);
        setTransactionState({ status: 'success', hash: '0x...' });
      } else {
        // Use the generic service
        const result = await smartContractInteractionService.executeTransaction(
          contractName,
          functionName,
          params,
          signer
        );

        if (result.success) {
          setTransactionState({ 
            status: 'success', 
            hash: result.hash 
          });
        } else {
          setTransactionState({ 
            status: 'error', 
            error: result.error 
          });
        }
      }

      // Refresh data after successful transaction
      setTimeout(() => {
        fetchRealTimeData();
      }, 2000);

    } catch (error) {
      setTransactionState({ 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Transaction failed' 
      });
    }
  };

  const refreshContractData = async () => {
    await initializeContracts();
    await fetchRealTimeData();
  };

  const getContractIcon = (name: string) => {
    const icons: Record<string, React.ReactNode> = {
      'LDAOToken': <Coins className="w-5 h-5" />,
      'Governance': <Award className="w-5 h-5" />,
      'ReputationSystem': <Shield className="w-5 h-5" />,
      'NFTMarketplace': <ShoppingBag className="w-5 h-5" />,
      'EnhancedEscrow': <Users className="w-5 h-5" />,
      'RewardPool': <TrendingUp className="w-5 h-5" />,
      'LDAOTreasury': <Coins className="w-5 h-5" />,
      'ProfileRegistry': <Users className="w-5 h-5" />,
      'TipRouter': <Activity className="w-5 h-5" />,
      'FollowModule': <Users className="w-5 h-5" />,
      'DisputeResolution': <AlertCircle className="w-5 h-5" />,
      'MultiSigWallet': <Shield className="w-5 h-5" />,
      'NFTCollectionFactory': <ShoppingBag className="w-5 h-5" />
    };
    return icons[name] || <Hash className="w-5 h-5" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Smart Contract Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Real-time monitoring and interaction with LinkDAO contracts
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Network: <span className="font-medium">Sepolia Testnet</span>
              </div>
              <button
                onClick={refreshContractData}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                disabled={transactionState.status === 'pending'}
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Contract Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contracts.map((contract) => (
              <div
                key={contract.name}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedContract === contract.name
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedContract(contract.name)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getContractIcon(contract.name)}
                    <h3 className="font-medium text-gray-900">{contract.name}</h3>
                  </div>
                  {contract.isConnected ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <p className="text-xs text-gray-600 mb-2 font-mono">
                  {contract.address}
                </p>
                <p className="text-xs text-gray-500">
                  Last updated: {new Date(contract.lastUpdated).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Data */}
        {Object.keys(realTimeData).length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Real-time Data</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(realTimeData).map(([contract, data]) => (
                <div key={contract} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">{contract}</h3>
                  <pre className="text-xs text-gray-600 overflow-x-auto">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contract Events */}
        {selectedContract && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {selectedContract} Events
            </h2>
            {contracts.find(c => c.name === selectedContract)?.events.length === 0 ? (
              <p className="text-gray-600">No events received yet</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {contracts
                  .find(c => c.name === selectedContract)
                  ?.events.map((event, index) => (
                    <div key={index} className="border border-gray-200 rounded p-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-blue-600">{event.type}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <pre className="text-xs text-gray-600">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Transaction Controls */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Execute Transactions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <button
              onClick={() => executeTransaction('ReputationSystem', 'updateReputation', [])}
              disabled={transactionState.status === 'pending' || !isConnected}
              className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              Update Reputation (+10)
            </button>
            
            <button
              onClick={() => executeTransaction('EnhancedStaking', 'stake', [])}
              disabled={transactionState.status === 'pending' || !isConnected}
              className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Stake 100 LDAO
            </button>
            
            <button
              onClick={() => executeTransaction('NFTMarketplace', 'createListing', [])}
              disabled={transactionState.status === 'pending' || !isConnected}
              className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Create NFT Listing
            </button>
          </div>

          {/* Transaction Status */}
          {transactionState.status !== 'idle' && (
            <div className={`p-4 rounded-lg ${
              transactionState.status === 'pending' ? 'bg-yellow-50' :
              transactionState.status === 'success' ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className="flex items-center gap-2">
                {transactionState.status === 'pending' && <Clock className="w-5 h-5 text-yellow-600" />}
                {transactionState.status === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                {transactionState.status === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
                
                <span className={`font-medium ${
                  transactionState.status === 'pending' ? 'text-yellow-800' :
                  transactionState.status === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {transactionState.status === 'pending' ? 'Transaction Pending...' :
                   transactionState.status === 'success' ? 'Transaction Successful' : 'Transaction Failed'}
                </span>
              </div>
              
              {transactionState.hash && (
                <p className="text-sm text-gray-600 mt-1">
                  Hash: {transactionState.hash}
                </p>
              )}
              
              {transactionState.error && (
                <p className="text-sm text-red-600 mt-1">
                  {transactionState.error}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};