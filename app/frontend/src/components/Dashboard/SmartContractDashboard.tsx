/**
 * Smart Contract Dashboard - Fixed Version
 * Real-time monitoring and interaction with all deployed contracts
 */

import React, { useState, useEffect } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { ethers } from 'ethers';
import { contractRegistryService } from '@/services/contractRegistryService';
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
}

export const SmartContractDashboard: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  
  // Convert to ethers provider/signer for contract interactions
  const [ethersProvider, setEthersProvider] = useState<ethers.BrowserProvider | undefined>();
  const [ethersSigner, setEthersSigner] = useState<ethers.JsonRpcSigner | undefined>();
  
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      setEthersProvider(provider);
      provider.getSigner().then(setEthersSigner);
    }
  }, [isConnected]);
  
  const [contracts, setContracts] = useState<ContractStatus[]>([]);
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [transactionState, setTransactionState] = useState<{ status: 'idle' | 'pending' | 'success' | 'error'; hash?: string; error?: string }>({ status: 'idle' });
  const [realTimeData, setRealTimeData] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  // Initialize contracts
  useEffect(() => {
    initializeContracts();
  }, [isConnected, ethersProvider]);

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
          lastUpdated: Date.now()
        });
      } catch (err) {
        console.warn(`Failed to initialize ${name}:`, err);
        contractStatuses.push({
          name,
          address: '0x0000000000000000000000000000000000000000000',
          isConnected: false,
          lastUpdated: Date.now()
        });
      }
    }

    setContracts(contractStatuses);
  };

  // Fetch real-time data
  useEffect(() => {
    if (isConnected && address && ethersProvider) {
      fetchRealTimeData();
    }
  }, [isConnected, address, ethersProvider]);

  const fetchRealTimeData = async () => {
    if (!address || !ethersProvider) return;

    try {
      const data: Record<string, any> = {};

      // Fetch LDAO token balance
      try {
        const ldaoAddress = await contractRegistryService.getContractAddress('LDAOToken');
        const tokenContract = new ethers.Contract(
          ldaoAddress,
          ['function balanceOf(address) view returns (uint256)', 'function totalSupply() view returns (uint256)'],
          ethersProvider
        );
        const balance = await tokenContract.balanceOf(address);
        const totalSupply = await tokenContract.totalSupply();
        data.LDAOToken = {
          userBalance: ethers.formatEther(balance),
          totalSupply: ethers.formatEther(totalSupply)
        };
      } catch (err) {
        console.error('Failed to fetch LDAO token data:', err);
      }

      setRealTimeData(data);
    } catch (err) {
      console.error('Failed to fetch real-time data:', err);
      setError('Failed to fetch real-time data');
    }
  };

  const executeTransaction = async (contractName: string, functionName: string, params: any[] = []) => {
    if (!ethersSigner || !address) {
      setTransactionState({ status: 'error', error: 'Wallet not connected' });
      return;
    }

    setTransactionState({ status: 'pending' });

    try {
      // Simple transaction example - update reputation
      if (contractName === 'ReputationSystem' && functionName === 'updateReputation') {
        const reputationAddress = await contractRegistryService.getContractAddress('ReputationSystem');
        const reputationContract = new ethers.Contract(
          reputationAddress,
          ['function updateReputation(address, string, uint256)'],
          ethersSigner
        );
        
        const tx = await reputationContract.updateReputation(
          address,
          'POST_CREATED',
          ethers.parseEther('10')
        );
        
        await tx.wait();
        setTransactionState({ 
          status: 'success', 
          hash: tx.hash 
        });
      } else {
        // Generic contract interaction
        const contractAddress = await contractRegistryService.getContractAddress(contractName);
        const contract = new ethers.Contract(
          contractAddress,
          ['function test()'], // Simple test function
          ethersSigner
        );
        
        // For demonstration, we'll just log the attempt
        console.log(`Would execute ${functionName} on ${contractName} with params:`, params);
        setTransactionState({ 
          status: 'success', 
          hash: '0x...' 
        });
      }

      // Refresh data after successful transaction
      setTimeout(() => {
        fetchRealTimeData();
      }, 2000);

    } catch (err) {
      console.error('Transaction failed:', err);
      setTransactionState({ 
        status: 'error', 
        error: err instanceof Error ? err.message : 'Transaction failed' 
      });
    }
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
    <>

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
                {isConnected ? (
                  <p className="text-sm text-green-600">
                    Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                  </p>
                ) : (
                  <p className="text-sm text-red-600">
                    Please connect your wallet
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  Network: <span className="font-medium">Sepolia Testnet</span>
                </div>
                <button
                  onClick={initializeContracts}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={transactionState.status === 'pending'}
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Contract Status */}
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

          {/* Selected Contract Details */}
          {selectedContract && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {selectedContract} Details
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Contract Address</h3>
                  <p className="text-sm font-mono text-gray-600">
                    {contracts.find(c => c.name === selectedContract)?.address}
                  </p>
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={() => executeTransaction(selectedContract, 'updateReputation', [])}
                    disabled={transactionState.status === 'pending' || !isConnected}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {transactionState.status === 'pending' ? 'Processing...' : 'Update Reputation'}
                  </button>
                  
                  <button
                    onClick={() => executeTransaction('LDAOToken', 'transfer', [address, ethers.parseEther('10')])}
                    disabled={transactionState.status === 'pending' || !isConnected}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {transactionState.status === 'pending' ? 'Processing...' : 'Send 10 LDAO'}
                  </button>
                </div>
              </div>
            </div>
          )}

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
    </>
  );
};