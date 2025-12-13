/**
 * Smart Contract Dashboard - Fixed Version
 * Real-time monitoring and interaction with all deployed contracts
 */

import React, { useState, useEffect } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { ethers } from 'ethers';
import { contractRegistryService } from '@/services/contractRegistryService';
import { useTheme } from '@/components/ui/EnhancedTheme';
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
  Award,
  Menu,
  X,
  ChevronDown
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
  const { actualTheme } = useTheme();
  
  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedContractMobile, setSelectedContractMobile] = useState<string | null>(null);
  
  // Convert to ethers provider/signer for contract interactions
  const [ethersProvider, setEthersProvider] = useState<ethers.BrowserProvider | undefined>();
  const [ethersSigner, setEthersSigner] = useState<ethers.JsonRpcSigner | undefined>();
  
  useEffect(() => {
    const initializeEthers = async () => {
      if (walletClient && publicClient) {
        try {
          // Create a custom provider that works with wagmi v2
          const provider = new ethers.BrowserProvider(walletClient.transport);
          setEthersProvider(provider);
          
          // Get the signer
          const signer = await provider.getSigner();
          setEthersSigner(signer);
        } catch (error) {
          console.error('Failed to initialize ethers provider/signer:', error);
          // Fallback to window.ethereum if available
          if (typeof window !== 'undefined' && (window as any).ethereum) {
            const fallbackProvider = new ethers.BrowserProvider((window as any).ethereum);
            setEthersProvider(fallbackProvider);
            fallbackProvider.getSigner().then(setEthersSigner);
          }
        }
      }
    };
    
    initializeEthers();
  }, [walletClient, publicClient, isConnected]);
  
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

      // Fetch LDAO token balance and additional info
      try {
        const ldaoAddress = await contractRegistryService.getContractAddress('LDAOToken');
        const tokenContract = new ethers.Contract(
          ldaoAddress,
          [
            'function balanceOf(address) view returns (uint256)',
            'function totalSupply() view returns (uint256)',
            'function decimals() view returns (uint8)',
            'function symbol() view returns (string)',
            'function allowance(address owner, address spender) view returns (uint256)'
          ],
          ethersProvider
        );
        const balance = await tokenContract.balanceOf(address);
        const totalSupply = await tokenContract.totalSupply();
        const decimals = await tokenContract.decimals();
        const symbol = await tokenContract.symbol();
        
        // Calculate USD value (mock calculation for demo)
        const balanceInEther = ethers.formatEther(balance);
        const mockPrice = 0.1; // Mock price in USD
        const usdValue = (parseFloat(balanceInEther) * mockPrice).toFixed(2);
        
        data.LDAOToken = {
          symbol,
          decimals,
          userBalance: balanceInEther,
          userBalanceFormatted: `${parseFloat(balanceInEther).toLocaleString()} ${symbol}`,
          totalSupply: ethers.formatEther(totalSupply),
          totalSupplyFormatted: `${parseFloat(ethers.formatEther(totalSupply)).toLocaleString()} ${symbol}`,
          usdValue: `$${usdValue}`,
          lastUpdated: new Date().toISOString()
        };
      } catch (err) {
        console.error('Failed to fetch LDAO token data:', err);
      }

      // Fetch user reputation if available
      try {
        const reputationAddress = await contractRegistryService.getContractAddress('ReputationSystem');
        const reputationContract = new ethers.Contract(
          reputationAddress,
          [
            'function getUserReputation(address) view returns (uint256)',
            'function getUserLevel(address) view returns (uint256)'
          ],
          ethersProvider
        );
        const reputation = await reputationContract.getUserReputation(address);
        const level = await reputationContract.getUserLevel(address);
        
        data.ReputationSystem = {
          userReputation: reputation.toString(),
          userLevel: level.toString(),
          nextLevelThreshold: (parseInt(level.toString()) + 1) * 100, // Mock calculation
          progressToNext: (parseInt(reputation.toString()) % 100).toString()
        };
      } catch (err) {
        console.error('Failed to fetch reputation data:', err);
      }

      // Fetch staking info if available
      try {
        const stakingAddress = await contractRegistryService.getContractAddress('EnhancedLDAOStaking');
        const stakingContract = new ethers.Contract(
          stakingAddress,
          [
            'function getUserStakes(address) view returns (tuple(uint256 amount, uint256 startTime, uint256 lockPeriod, uint256 rewardRate, uint256 lastRewardClaim, bool isActive)[])',
            'function getTotalStaked(address) view returns (uint256)',
            'function getPendingRewards(address) view returns (uint256)'
          ],
          ethersProvider
        );
        const totalStaked = await stakingContract.getTotalStaked(address);
        const pendingRewards = await stakingContract.getPendingRewards(address);
        
        data.Staking = {
          totalStaked: ethers.formatEther(totalStaked),
          totalStakedFormatted: `${parseFloat(ethers.formatEther(totalStaked)).toLocaleString()} LDAO`,
          pendingRewards: ethers.formatEther(pendingRewards),
          pendingRewardsFormatted: `${parseFloat(ethers.formatEther(pendingRewards)).toFixed(4)} LDAO`,
          apy: '12.5%' // Mock APY
        };
      } catch (err) {
        console.error('Failed to fetch staking data:', err);
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
      let tx;
      
      // Handle LDAOToken transfers
      if (contractName === 'LDAOToken') {
        const tokenAddress = await contractRegistryService.getContractAddress('LDAOToken');
        const tokenContract = new ethers.Contract(
          tokenAddress,
          [
            'function transfer(address to, uint256 amount) returns (bool)',
            'function approve(address spender, uint256 amount) returns (bool)',
            'function transferFrom(address from, address to, uint256 amount) returns (bool)'
          ],
          ethersSigner
        );
        
        if (functionName === 'transfer') {
          const [to, amount] = params;
          tx = await tokenContract.transfer(to, amount);
        } else if (functionName === 'approve') {
          const [spender, amount] = params;
          tx = await tokenContract.approve(spender, amount);
        } else if (functionName === 'transferFrom') {
          const [from, to, amount] = params;
          tx = await tokenContract.transferFrom(from, to, amount);
        }
      }
      // Handle ReputationSystem updates
      else if (contractName === 'ReputationSystem') {
        const reputationAddress = await contractRegistryService.getContractAddress('ReputationSystem');
        const reputationContract = new ethers.Contract(
          reputationAddress,
          [
            'function updateReputation(address user, string action, uint256 amount)',
            'function batchUpdateReputation(address[] users, string[] actions, uint256[] amounts)'
          ],
          ethersSigner
        );
        
        if (functionName === 'updateReputation') {
          const [user, action, amount] = params;
          tx = await reputationContract.updateReputation(user, action, amount);
        } else if (functionName === 'batchUpdateReputation') {
          const [users, actions, amounts] = params;
          tx = await reputationContract.batchUpdateReputation(users, actions, amounts);
        }
      }
      // Handle Staking operations
      else if (contractName === 'EnhancedLDAOStaking') {
        const stakingAddress = await contractRegistryService.getContractAddress('EnhancedLDAOStaking');
        const stakingContract = new ethers.Contract(
          stakingAddress,
          [
            'function stake(uint256 amount, uint256 tierId)',
            'function unstake(uint256 stakeIndex, uint256 amount)',
            'function claimRewards(uint256 stakeIndex)',
            'function claimAllRewards()'
          ],
          ethersSigner
        );
        
        if (functionName === 'stake') {
          const [amount, tierId] = params;
          tx = await stakingContract.stake(amount, tierId);
        } else if (functionName === 'unstake') {
          const [stakeIndex, amount] = params;
          tx = await stakingContract.unstake(stakeIndex, amount);
        } else if (functionName === 'claimRewards') {
          const [stakeIndex] = params;
          tx = await stakingContract.claimRewards(stakeIndex);
        } else if (functionName === 'claimAllRewards') {
          tx = await stakingContract.claimAllRewards();
        }
      }
      // Handle NFTMarketplace operations
      else if (contractName === 'NFTMarketplace') {
        const marketplaceAddress = await contractRegistryService.getContractAddress('NFTMarketplace');
        const marketplaceContract = new ethers.Contract(
          marketplaceAddress,
          [
            'function createListing(uint256 tokenId, uint256 price)',
            'function buyListing(uint256 listingId)',
            'function cancelListing(uint256 listingId)',
            'function makeOffer(uint256 listingId, uint256 amount)'
          ],
          ethersSigner
        );
        
        if (functionName === 'createListing') {
          const [tokenId, price] = params;
          tx = await marketplaceContract.createListing(tokenId, price);
        } else if (functionName === 'buyListing') {
          const [listingId] = params;
          tx = await marketplaceContract.buyListing(listingId);
        } else if (functionName === 'cancelListing') {
          const [listingId] = params;
          tx = await marketplaceContract.cancelListing(listingId);
        } else if (functionName === 'makeOffer') {
          const [listingId, amount] = params;
          tx = await marketplaceContract.makeOffer(listingId, amount);
        }
      }
      
      if (!tx) {
        throw new Error(`Unknown function: ${functionName} on contract ${contractName}`);
      }
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      // Update transaction state with success
      setTransactionState({ 
        status: 'success', 
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      });
      
      // Refresh data after successful transaction
      setTimeout(() => {
        fetchRealTimeData();
      }, 2000);
      
      // Show success notification
      console.log(`Transaction successful: ${tx.hash}`);
      
    } catch (err) {
      console.error('Transaction failed:', err);
      
      // Extract meaningful error message
      let errorMessage = 'Transaction failed';
      if (err instanceof Error) {
        // Check for common error patterns
        if (err.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for this transaction';
        } else if (err.message.includes('user rejected')) {
          errorMessage = 'Transaction was rejected by user';
        } else if (err.message.includes('gas required exceeds allowance')) {
          errorMessage = 'Insufficient gas for transaction';
        } else if (err.message.includes('execution reverted')) {
          errorMessage = 'Transaction was reverted by contract';
        } else {
          errorMessage = err.message;
        }
      }
      
      setTransactionState({ 
        status: 'error', 
        error: errorMessage 
      });
    }
  };

  const getContractIcon = (name: string) => {
    const icons: Record<string, React.ReactNode> = {
      'LDAOToken': <Coins className="w-5 h-5 text-yellow-500" />,
      'Governance': <Shield className="w-5 h-5 text-blue-500" />,
      'ReputationSystem': <Award className="w-5 h-5 text-purple-500" />,
      'NFTMarketplace': <ShoppingBag className="w-5 h-5 text-orange-500" />,
      'EnhancedEscrow': <Shield className="w-5 h-5 text-red-500" />,
      'RewardPool': <TrendingUp className="w-5 h-5 text-green-500" />,
      'LDAOTreasury': <Coins className="w-5 h-5 text-emerald-500" />,
      'ProfileRegistry': <Users className="w-5 h-5 text-indigo-500" />,
      'TipRouter': <Activity className="w-5 h-5 text-pink-500" />,
      'FollowModule': <Activity className="w-5 h-5 text-teal-500" />,
      'DisputeResolution': <AlertCircle className="w-5 h-5 text-red-500" />,
      'MultiSigWallet': <Shield className="w-5 h-5 text-gray-500" />,
      'NFTCollectionFactory': <Hash className="w-5 h-5 text-cyan-500" />
    };
    return icons[name] || <Hash className="w-5 h-5 text-gray-500" />;
  };

  return (

      <>

        <div className={`min-h-screen ${actualTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} p-4 sm:p-6`}>

          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

            {/* Header - Mobile Responsive */}

            <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4 sm:p-6`}>

              {/* Mobile Header */}

              <div className="sm:hidden flex justify-between items-center mb-4">

                <div className="flex items-center gap-3">

                  <button

                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}

                    className={`p-2 rounded-lg ${actualTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}

                  >

                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}

                  </button>

                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">Contracts</h1>

                </div>

                {isConnected && (

                  <div className="text-xs text-green-600 dark:text-green-400">

                    {address?.slice(0, 6)}...{address?.slice(-4)}

                  </div>

                )}

              </div>

              

              {/* Desktop Header */}

              <div className="hidden sm:flex justify-between items-center">

                <div>

                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Smart Contract Dashboard</h1>

                  <p className={`mt-1 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>

                    Real-time monitoring and interaction with LinkDAO contracts

                  </p>

                  {isConnected ? (

                    <p className="text-sm text-green-600 dark:text-green-400">

                      Connected: {address?.slice(0, 6)}...{address?.slice(-4)}

                    </p>

                  ) : (

                    <p className="text-sm text-red-600 dark:text-red-400">

                      Please connect your wallet

                    </p>

                  )}

                </div>

                <div className="flex items-center gap-2 sm:gap-4">

                  <div className={`text-xs sm:text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>

                    <span className="hidden sm:inline">Network: </span>

                    <span className="font-medium">Sepolia Testnet</span>

                  </div>

                  <button

                    onClick={initializeContracts}

                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"

                    disabled={transactionState.status === 'pending'}

                  >

                    <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />

                  </button>

                </div>

              </div>

            </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Contract Status */}
          <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4 sm:p-6`}>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">Contract Status</h2>
            
            {/* Mobile Contract Selector */}
            <div className="sm:hidden">
              <select
                value={selectedContractMobile || ''}
                onChange={(e) => setSelectedContractMobile(e.target.value)}
                className={`w-full p-3 rounded-lg border ${actualTheme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
              >
                <option value="">Select a contract</option>
                {contracts.map((contract) => (
                  <option key={contract.name} value={contract.name}>
                    {contract.name} {contract.isConnected ? '✓' : '✗'}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Desktop Grid */}
            <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contracts.map((contract) => (
                <div
                  key={contract.name}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedContract === contract.name
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : actualTheme === 'dark' 
                        ? 'border-gray-700 hover:border-gray-600' 
                        : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedContract(contract.name)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getContractIcon(contract.name)}
                      <h3 className="font-medium text-gray-900 dark:text-white">{contract.name}</h3>
                    </div>
                    {contract.isConnected ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <p className={`text-xs mb-2 font-mono break-all ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {contract.address}
                  </p>
                  <p className={`text-xs ${actualTheme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    Last updated: {new Date(contract.lastUpdated).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Token Balances */}
          {Object.keys(realTimeData).length > 0 && (
            <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4 sm:p-6`}>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">Real-time Balances & Data</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* LDAO Token Balance */}
                {realTimeData.LDAOToken && (
                  <div className={`border ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} rounded-lg p-4`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`font-medium flex items-center gap-2 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        <Coins className="w-5 h-5 text-yellow-500" />
                        {realTimeData.LDAOToken.symbol}
                      </h3>
                      <span className={`text-xs ${actualTheme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                        {new Date(realTimeData.LDAOToken.lastUpdated).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Your Balance</p>
                        <p className={`text-2xl font-bold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {realTimeData.LDAOToken.userBalanceFormatted}
                        </p>
                        <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{realTimeData.LDAOToken.usdValue}</p>
                      </div>
                      <div>
                        <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Supply</p>
                        <p className={`text-sm font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {realTimeData.LDAOToken.totalSupplyFormatted}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Reputation */}
                {realTimeData.ReputationSystem && (
                  <div className={`border ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} rounded-lg p-4`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`font-medium flex items-center gap-2 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        <Award className="w-5 h-5 text-purple-500" />
                        Reputation
                      </h3>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Your Reputation</p>
                        <p className={`text-2xl font-bold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {realTimeData.ReputationSystem.userReputation}
                        </p>
                        <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Level {realTimeData.ReputationSystem.userLevel}</p>
                      </div>
                      <div>
                        <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Progress to Next Level</p>
                        <div className={`w-full ${actualTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2 mt-1`}>
                          <div 
                            className="bg-purple-600 h-2 rounded-full" 
                            style={{ width: `${realTimeData.ReputationSystem.progressToNext}%` }}
                          ></div>
                        </div>
                        <p className={`text-xs ${actualTheme === 'dark' ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                          {realTimeData.ReputationSystem.progressToNext}% complete
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Staking */}
                {realTimeData.Staking && (
                  <div className={`border ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} rounded-lg p-4`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`font-medium flex items-center gap-2 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        <TrendingUp className="w-5 h-5 text-green-500" />
                        Staking
                      </h3>
                      <span className={`text-xs ${actualTheme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'} px-2 py-1 rounded`}>
                        {realTimeData.Staking.apy} APY
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Staked</p>
                        <p className={`text-2xl font-bold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {realTimeData.Staking.totalStakedFormatted}
                        </p>
                      </div>
                      <div>
                        <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Pending Rewards</p>
                        <p className="text-lg font-medium text-green-600">
                          {realTimeData.Staking.pendingRewardsFormatted}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Selected Contract Details */}
          {(selectedContract || selectedContractMobile) && (
            <div className={`${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4 sm:p-6`}>
              <h2 className={`text-lg sm:text-xl font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>
                {(selectedContract || selectedContractMobile)} Details
              </h2>
              <div className="space-y-4">
                <div className={`p-4 ${actualTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                  <h3 className={`font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>Contract Address</h3>
                  <p className="text-sm font-mono break-all text-gray-600 dark:text-gray-400">
                    {contracts.find(c => c.name === (selectedContract || selectedContractMobile))?.address}
                  </p>
                </div>
                
                <div className="space-y-4">
                {/* Token Transfer Actions */}
                {(selectedContract === 'LDAOToken' || selectedContractMobile === 'LDAOToken') && (
                  <div className="space-y-3">
                    <h4 className={`font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Token Actions</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          const recipient = prompt('Enter recipient address:');
                          if (recipient) {
                            const amount = prompt('Enter amount to send:');
                            if (amount) {
                              executeTransaction('LDAOToken', 'transfer', [recipient, ethers.parseEther(amount)]);
                            }
                          }
                        }}
                        disabled={transactionState.status === 'pending' || !isConnected}
                        className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                      >
                        Send LDAO
                      </button>
                      <button
                        onClick={() => {
                          const spender = prompt('Enter spender address:');
                          if (spender) {
                            const amount = prompt('Enter amount to approve:');
                            if (amount) {
                              executeTransaction('LDAOToken', 'approve', [spender, ethers.parseEther(amount)]);
                            }
                          }
                        }}
                        disabled={transactionState.status === 'pending' || !isConnected}
                        className="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
                      >
                        Approve Spending
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Reputation Actions */}
                {(selectedContract === 'ReputationSystem' || selectedContractMobile === 'ReputationSystem') && (
                  <div className="space-y-3">
                    <h4 className={`font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Reputation Actions</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => executeTransaction('ReputationSystem', 'updateReputation', [address, 'POST_CREATED', ethers.parseEther('10')])}
                        disabled={transactionState.status === 'pending' || !isConnected}
                        className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
                      >
                        Add Reputation
                      </button>
                      <button
                        onClick={() => {
                          const targetUser = prompt('Enter user address:');
                          if (targetUser) {
                            executeTransaction('ReputationSystem', 'updateReputation', [targetUser, 'COMMENT_CREATED', ethers.parseEther('5')]);
                          }
                        }}
                        disabled={transactionState.status === 'pending' || !isConnected}
                        className="px-3 sm:px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 text-sm"
                      >
                        Award Points
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Staking Actions */}
                {(selectedContract === 'EnhancedLDAOStaking' || selectedContractMobile === 'EnhancedLDAOStaking') && (
                  <div className="space-y-3">
                    <h4 className={`font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Staking Actions</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          const amount = prompt('Enter amount to stake:');
                          if (amount) {
                            const tierId = prompt('Enter tier ID (0-2):');
                            if (tierId) {
                              executeTransaction('EnhancedLDAOStaking', 'stake', [ethers.parseEther(amount), parseInt(tierId)]);
                            }
                          }
                        }}
                        disabled={transactionState.status === 'pending' || !isConnected}
                        className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                      >
                        Stake Tokens
                      </button>
                      <button
                        onClick={() => {
                          const stakeIndex = prompt('Enter stake index:');
                          if (stakeIndex) {
                            executeTransaction('EnhancedLDAOStaking', 'claimRewards', [parseInt(stakeIndex)]);
                          }
                        }}
                        disabled={transactionState.status === 'pending' || !isConnected}
                        className="px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm"
                      >
                        Claim Rewards
                      </button>
                    </div>
                  </div>
                )}
                
                {/* NFT Marketplace Actions */}
                {(selectedContract === 'NFTMarketplace' || selectedContractMobile === 'NFTMarketplace') && (
                  <div className="space-y-3">
                    <h4 className={`font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Marketplace Actions</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          const tokenId = prompt('Enter NFT token ID:');
                          if (tokenId) {
                            const price = prompt('Enter price in ETH:');
                            if (price) {
                              executeTransaction('NFTMarketplace', 'createListing', [parseInt(tokenId), ethers.parseEther(price)]);
                            }
                          }
                        }}
                        disabled={transactionState.status === 'pending' || !isConnected}
                        className="px-3 sm:px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm"
                      >
                        Create Listing
                      </button>
                      <button
                        onClick={() => {
                          const listingId = prompt('Enter listing ID:');
                          if (listingId) {
                            executeTransaction('NFTMarketplace', 'buyListing', [parseInt(listingId)]);
                          }
                        }}
                        disabled={transactionState.status === 'pending' || !isConnected}
                        className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                      >
                        Buy NFT
                      </button>
                    </div>
                  </div>
                )}
              </div>
              </div>
            </div>
          )}

          {/* Transaction Status */}
          {transactionState.status !== 'idle' && (
            <div className={`p-4 sm:p-6 rounded-lg border ${
              transactionState.status === 'pending' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
              transactionState.status === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                <div className="flex items-center gap-3">
                  {transactionState.status === 'pending' && (
                    <div className="animate-spin">
                      <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
                    </div>
                  )}
                  {transactionState.status === 'success' && <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />}
                  {transactionState.status === 'error' && <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />}
                  
                  <h3 className={`text-base sm:text-lg font-semibold ${
                    transactionState.status === 'pending' ? 'text-yellow-800 dark:text-yellow-200' :
                    transactionState.status === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                  }`}>
                    {transactionState.status === 'pending' ? 'Transaction Pending' :
                     transactionState.status === 'success' ? 'Transaction Successful' : 'Transaction Failed'}
                  </h3>
                </div>
                
                {transactionState.status === 'pending' && (
                  <button
                    onClick={() => setTransactionState({ status: 'idle' })}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                )}
              </div>
              
              {/* Transaction Details */}
              <div className="space-y-3">
                {transactionState.hash && (
                  <div>
                    <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Transaction Hash</p>
                    <div className="flex items-center gap-2">
                      <code className={`text-sm font-mono ${actualTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'} px-2 py-1 rounded break-all`}>
                        {transactionState.hash}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(transactionState.hash!)}
                        className={`${actualTheme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                        title="Copy hash"
                      >
                        <Link className="w-4 h-4" />
                      </button>
                    </div>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${transactionState.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      View on Etherscan →
                    </a>
                  </div>
                )}
                
                {transactionState.blockNumber && (
                  <div>
                    <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Block Number</p>
                    <p className="text-sm font-medium">{transactionState.blockNumber}</p>
                  </div>
                )}
                
                {transactionState.gasUsed && (
                  <div>
                    <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Gas Used</p>
                    <p className="text-sm font-medium">{transactionState.gasUsed}</p>
                  </div>
                )}
                
                {transactionState.error && (
                  <div className={`border ${actualTheme === 'dark' ? 'bg-red-900/20 border-red-800' : 'bg-red-100 border-red-200'} rounded p-3`}>
                    <p className={`text-sm font-medium ${actualTheme === 'dark' ? 'text-red-200' : 'text-red-800'} mb-1`}>Error Details</p>
                    <p className={`text-sm ${actualTheme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>{transactionState.error}</p>
                    
                    {/* Common error suggestions */}
                    <div className="mt-3 space-y-1">
                      {transactionState.error.includes('insufficient funds') && (
                        <p className={`text-xs ${actualTheme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                          💡 Make sure you have enough ETH in your wallet for gas fees
                        </p>
                      )}
                      {transactionState.error.includes('user rejected') && (
                        <p className={`text-xs ${actualTheme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                          💡 Please approve the transaction in your wallet
                        </p>
                      )}
                      {transactionState.error.includes('gas required exceeds allowance') && (
                        <p className={`text-xs ${actualTheme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                          💡 Try increasing the gas limit in your wallet settings
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                {transactionState.status === 'success' && (
                  <div className={`border ${actualTheme === 'dark' ? 'bg-green-900/20 border-green-800' : 'bg-green-100 border-green-200'} rounded p-3`}>
                    <p className={`text-sm ${actualTheme === 'dark' ? 'text-green-200' : 'text-green-800'}`}>
                      ✅ Your transaction has been successfully processed on the blockchain
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};