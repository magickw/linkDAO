import DOMPurify from 'dompurify';
import React, { useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useWritePaymentRouterSendEthPayment, useWritePaymentRouterSendTokenPayment } from '@/generated';
import { useWeb3 } from '@/context/Web3Context';
import { useWalletData, usePortfolioPerformance } from '@/hooks/useWalletData';
import { useToast } from '@/context/ToastContext';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw, TrendingUp, TrendingDown, ExternalLink, Copy, Check, ChevronDown } from 'lucide-react';
import { useAccount, useBalance, useSwitchChain } from 'wagmi';
import { Listbox, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { base, baseSepolia, mainnet, polygon, arbitrum, sepolia } from '@/lib/wagmi';
import { getTokensForChain, SUPPORTED_CHAINS } from '@/config/payment';
import { getTokenLogoWithFallback } from '@/utils/tokenLogoUtils';
import { TokenSwapModal } from '@/components/Wallet/TokenSwapModal';

export default function Wallet() {
  const { isConnected } = useWeb3();
  const { address, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { data: balanceData } = useBalance({ address: address as `0x${string}` | undefined });
  const chainId = chain?.id;

  const { addToast } = useToast();
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [token, setToken] = useState('ETH');
  const [selectedChainId, setSelectedChainId] = useState(chain?.id || mainnet.id);
  const [activeTab, setActiveTab] = useState<'overview' | 'send' | 'history'>('overview');
  const [portfolioTimeframe, setPortfolioTimeframe] = useState<'1d' | '1w' | '1m' | '1y'>('1d');
  const [showTokenSwapModal, setShowTokenSwapModal] = useState(false);
  const [swapTokenIn, setSwapTokenIn] = useState(null);

  // Get available tokens for the selected chain
  const availableTokens = getTokensForChain(selectedChainId);

  // Use real wallet data
  const {
    walletData,
    portfolio,
    tokens,
    transactions,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    refresh,
    clearError
  } = useWalletData({
    autoRefresh: true,
    refreshInterval: 300000, // 5 minutes
    enableTransactionHistory: true,
    maxTransactions: 20
  });

  // Portfolio performance data
  const {
    data: performanceData,
    isLoading: isPerformanceLoading
  } = usePortfolioPerformance(portfolioTimeframe);

  const {
    writeContract: sendEthPayment,
    isPending: isSendingEth,
    isSuccess: isEthSent,
  } = useWritePaymentRouterSendEthPayment();

  const {
    writeContract: sendTokenPayment,
    isPending: isSendingToken,
    isSuccess: isTokenSent,
  } = useWritePaymentRouterSendTokenPayment();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipient || !amount) {
      addToast('Please fill in all fields', 'error');
      return;
    }

    // Switch to the selected chain if needed
    if (chainId !== selectedChainId) {
      try {
        addToast(`Switching to ${getChainName(selectedChainId)} network...`, 'info');
        await switchChain({ chainId: selectedChainId });
      } catch (error) {
        addToast('Failed to switch network. Please switch manually in your wallet.', 'error');
        return;
      }
    }

    const selectedToken = availableTokens.find(t => t.symbol === token);

    if (token === 'ETH' || (selectedToken && selectedToken.isNative)) {
      // Handle ETH/native token payments
      const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
      sendEthPayment({
        args: [recipient as `0x${string}`, amountInWei, ''],
        value: amountInWei,
        gas: 150000n,
        chainId: selectedChainId as any,
      }, {
        onSuccess: () => {
          addToast('Transaction submitted. Switching to history...', 'success');
          setActiveTab('history');
          setAmount('');
          setRecipient('');
        }
      });
    } else if (selectedToken) {
      // Handle ERC-20 token payments
      const decimals = selectedToken.decimals;
      const amountInWei = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));

      sendTokenPayment({
        args: [
          selectedToken.address as `0x${string}`,
          recipient as `0x${string}`,
          amountInWei,
          '' // memo parameter
        ],
        gas: 200000n,
        chainId: selectedChainId as any,
      }, {
        onSuccess: () => {
          addToast('Transaction submitted. Switching to history...', 'success');
          setActiveTab('history');
          setAmount('');
          setRecipient('');
        }
      });
    } else {
      addToast('Selected token not available on this network', 'error');
    }
  };

  // Helper functions
  const handleRefresh = async () => {
    try {
      await refresh();
      addToast('Wallet data refreshed', 'success');
    } catch (err) {
      addToast('Failed to refresh wallet data', 'error');
    }
  };

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      addToast('Address copied to clipboard', 'success');
    }
  };

  const getExplorerUrl = (type: 'address' | 'tx', value: string): string => {
    // Map chain IDs to their explorers
    const explorers: Record<number, string> = {
      1: 'https://etherscan.io',
      5: 'https://goerli.etherscan.io',
      11155111: 'https://sepolia.etherscan.io',
      137: 'https://polygonscan.com',
      80001: 'https://mumbai.polygonscan.com',
      8453: 'https://basescan.org',
      84532: 'https://sepolia.basescan.org',
    };

    const baseUrl = chainId ? explorers[chainId] || 'https://etherscan.io' : 'https://etherscan.io';
    return `${baseUrl}/${type}/${value}`;
  };

  const handleViewOnExplorer = () => {
    console.log('handleViewOnExplorer called');

    if (!address) {
      console.log('No address found');
      addToast('No wallet address found', 'error');
      return;
    }

    const explorerUrl = getExplorerUrl('address', address);
    console.log('Explorer URL:', explorerUrl);
    console.log('Chain ID:', chainId);
    console.log('Address:', address);

    try {
      // Open in new tab with security attributes
      const newWindow = window.open(explorerUrl, '_blank', 'noopener,noreferrer');
      if (newWindow) {
        newWindow.opener = null;
        addToast('Opening blockchain explorer...', 'success');
      } else {
        addToast('Failed to open explorer. Please check your popup blocker.', 'error');
      }
    } catch (error) {
      console.error('Error opening explorer:', error);
      addToast('Failed to open explorer. Please check your popup blocker.', 'error');
    }
  };

  const handleSendAsset = (assetName: string) => {
    // Set the token and switch to the send tab
    setToken(assetName);
    setActiveTab('send');

    // Clear previous recipient to avoid confusion
    setRecipient('');

    addToast(`Ready to send ${assetName}. Please enter recipient address.`, 'info');
  };

  const handleSwapAsset = (assetName: string) => {
    // Set the token and open integrated swap modal
    setToken(assetName);

    // Open integrated token swap modal instead of external redirect
    const selectedToken = availableTokens.find(t => t.symbol === assetName);

    if (selectedToken) {
      setShowTokenSwapModal(true);
      setSwapTokenIn(selectedToken);
      addToast(`Opening swap interface for ${assetName}...`, 'info');
    } else {
      addToast(`Swap interface not available for ${assetName}`, 'error');
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercentage = (value: number): string => {
    const formatted = Math.abs(value).toFixed(2);
    return `${value >= 0 ? '+' : '-'}${formatted}%`;
  };

  const getChangeColor = (change: number): string => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-gray-500 dark:text-gray-400';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4" />;
    if (change < 0) return <TrendingDown className="w-4 h-4" />;
    return null;
  };

  // Transform real data for display
  const portfolioData = tokens.map(tokenItem => ({
    name: tokenItem.symbol,
    balance: tokenItem.balanceFormatted,
    value: formatCurrency(tokenItem.valueUSD),
    change: formatPercentage(tokenItem.change24h),
    changeType: tokenItem.change24h > 0 ? 'positive' : tokenItem.change24h < 0 ? 'negative' : 'neutral'
  }));

  const transactionData = transactions.map(tx => ({
    id: tx.id,
    type: tx.type === 'receive' ? 'Received' : 'Sent',
    amount: `${tx.type === 'receive' ? '+' : '-'}${tx.amount} ${tx.token.symbol}`,
    value: formatCurrency(parseFloat(tx.valueUSD)),
    date: new Date(tx.timestamp).toLocaleDateString(),
    status: tx.status === 'confirmed' ? 'Completed' : tx.status === 'failed' ? 'Failed' : 'Pending',
    hash: tx.hash
  }));

  // Helper function to get chain name
  const getChainName = (chainId: number) => {
    const chain = SUPPORTED_CHAINS.find(c => c.chainId === chainId);
    return chain ? chain.name : 'Unknown Network';
  };

  // Effect to update selected chain when wallet chain changes
  React.useEffect(() => {
    if (chain?.id) {
      setSelectedChainId(chain.id);
    }
  }, [chain?.id]);

  // Effect to update token when chain changes
  React.useEffect(() => {
    const chainTokens = getTokensForChain(selectedChainId);
    if (chainTokens.length > 0 && !chainTokens.some(t => t.symbol === token)) {
      // If the currently selected token is not available on this chain, select the first available token
      setToken(chainTokens[0].symbol);
    }
  }, [selectedChainId, token]);

  return (
    <Layout title="Wallet - LinkDAO" fullWidth={true}>
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Wallet</h1>
            <div className="flex items-center space-x-3">
              {chain && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {getChainName(chain.id)}
                </span>
              )}
              {lastUpdated && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                </span>
              )}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                title="Refresh wallet data"
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-300 ${isRefreshing ? 'animate-spin' : ''
                  }`} />
              </button>
              {address && (
                <>
                  <button
                    onClick={handleCopyAddress}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title="Copy wallet address"
                  >
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </span>
                    <Copy className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                  <button
                    onClick={handleViewOnExplorer}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-primary-100 dark:bg-primary-900 hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
                    title="View on Explorer"
                  >
                    <span className="text-sm text-primary-700 dark:text-primary-300 font-medium">
                      View on Explorer
                    </span>
                    <ExternalLink className="w-4 h-4 text-primary-700 dark:text-primary-300" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-red-800 dark:text-red-200">{error}</p>
                <button
                  onClick={clearError}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="mb-6 flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-300">Loading wallet data...</span>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('send')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'send'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
              >
                Send
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'history'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
              >
                Transaction History
              </button>
            </nav>
          </div>

          {activeTab === 'overview' && (
            <div>
              {/* Portfolio Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg shadow-md p-6 text-white">
                  <h2 className="text-lg font-medium mb-2">Total Balance</h2>
                  <p className="text-3xl font-bold">
                    {portfolio ? formatCurrency(portfolio.totalValueUSD) : formatCurrency(parseFloat(balanceData?.formatted || '0') * 1700)}
                  </p>
                  <div className="flex items-center mt-1">
                    {portfolio && getChangeIcon(portfolio.change24hPercent)}
                    <p className={`text-sm ml-1 ${portfolio ? getChangeColor(portfolio.change24hPercent) : 'text-white/80'
                      }`}>
                      {portfolio ? formatPercentage(portfolio.change24hPercent) : '+2.5%'} (24h)
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Portfolio Value</h2>
                  <p className="text-3xl font-bold text-secondary-600 dark:text-secondary-400 mt-2">
                    {portfolio ? formatCurrency(portfolio.totalValueUSD) : '$6,900'}
                  </p>
                  <div className="flex items-center mt-1">
                    {portfolio && getChangeIcon(portfolio.change24hPercent)}
                    <p className={`text-sm ml-1 ${portfolio ? getChangeColor(portfolio.change24hPercent) : 'text-gray-500 dark:text-gray-400'
                      }`}>
                      {portfolio ? formatPercentage(portfolio.change24hPercent) : '+3.2%'} (7d)
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button
                    onClick={() => {
                      setActiveTab('send');
                      setToken('ETH');
                      setRecipient('');
                      addToast('Ready to send', 'info');
                    }}
                    className="flex flex-col items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                  >
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-2">
                      <span className="text-white font-bold">ETH</span>
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Send</span>
                  </button>

                  <button
                    onClick={() => {
                      const swapUrl = 'https://app.uniswap.org/swap';
                      try {
                        window.open(swapUrl, '_blank', 'noopener,noreferrer');
                        addToast('Opening swap interface...', 'info');
                      } catch (error) {
                        addToast('Failed to open swap interface', 'error');
                      }
                    }}
                    className="flex flex-col items-center justify-center p-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg transition-colors"
                  >
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mb-2">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Swap</span>
                  </button>

                  <button
                    onClick={handleViewOnExplorer}
                    className="flex flex-col items-center justify-center p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-lg transition-colors"
                  >
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-2">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14m-4 0v6" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Explorer</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('history');
                      addToast('Viewing transaction history', 'info');
                    }}
                    className="flex flex-col items-center justify-center p-4 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded-lg transition-colors"
                  >
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mb-2">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">History</span>
                  </button>
                </div>
              </div>

              {/* Your Assets */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Your Assets</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Asset
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Balance
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Value
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          24h Change
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {portfolioData.length > 0 ? portfolioData.map((asset) => (
                        <tr key={asset.name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {(() => {
                                // Find the token in the tokens array to get its logo
                                const tokenItem = tokens.find(t => t.symbol === asset.name);
                                // Tokens don't have a logoUrl property, so we only pass the symbol
                                const logoUrl = tokenItem ? getTokenLogoWithFallback(tokenItem.symbol) : null;

                                return logoUrl ? (
                                  <img
                                    src={logoUrl}
                                    alt={asset.name}
                                    className="flex-shrink-0 h-10 w-10 rounded-full object-contain"
                                    onError={(e) => {
                                      // Fallback to gradient circle with initials if image fails to load
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      target.parentElement!.innerHTML = DOMPurify.sanitize(`
                                        <div class="flex-shrink-0 h-10 w-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                                          <span class="text-gray-700 dark:text-gray-300 font-medium">${asset.name.charAt(0)}</span>
                                        </div>
                                      `);
                                    }}
                                  />
                                ) : (
                                  <div className="flex-shrink-0 h-10 w-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">{asset.name.charAt(0)}</span>
                                  </div>
                                );
                              })()}
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{asset.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                            {asset.balance}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                            {asset.value}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${asset.changeType === 'positive'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : asset.changeType === 'negative'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                              {asset.change}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleSendAsset(asset.name)}
                              className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 mr-3 transition-colors"
                            >
                              Send
                            </button>
                            <button
                              onClick={() => handleSwapAsset(asset.name)}
                              className="text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-secondary-300 transition-colors"
                            >
                              Swap
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                            {isLoading ? 'Loading assets...' : 'No assets found'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Portfolio Performance Chart */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Portfolio Performance</h2>
                  <div className="flex space-x-2">
                    {(['1d', '1w', '1m', '1y'] as const).map((timeframe) => (
                      <button
                        key={timeframe}
                        onClick={() => setPortfolioTimeframe(timeframe)}
                        className={`px-3 py-1 text-xs rounded-full ${portfolioTimeframe === timeframe
                          ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                      >
                        {timeframe.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg">
                  {isPerformanceLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div>
                      <span className="text-gray-500 dark:text-gray-400">Loading chart...</span>
                    </div>
                  ) : performanceData ? (
                    <div className="w-full h-full p-4">
                      <p className="text-gray-500 dark:text-gray-400 text-center mb-4">
                        Portfolio Performance ({portfolioTimeframe})
                      </p>
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        Chart visualization would be displayed here
                        <br />
                        Current value: {formatCurrency(performanceData.values[performanceData.values.length - 1] || 0)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-gray-500 dark:text-gray-400 mb-2">Portfolio Performance Tracking</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">
                        Historical performance data requires integration with a price API.
                        <br />
                        This feature will be available soon.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'send' && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Send Payment</h2>

              <form onSubmit={handleSend}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Network
                  </label>
                  <Listbox value={selectedChainId} onChange={(val) => setSelectedChainId(Number(val))}>
                    <div className="relative mt-1">
                      <Listbox.Button className="relative w-full cursor-default rounded-md bg-white dark:bg-gray-700 py-3 pl-3 pr-10 text-left border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm shadow-sm">
                        <span className="flex items-center truncate text-gray-900 dark:text-white">
                          {(() => {
                            const networkIconMap: Record<number, string> = {
                              1: '/networks/ethereum.png',
                              8453: '/networks/base.png',
                              137: '/networks/polygon.png',
                              42161: '/networks/arbitrum.png',
                              11155111: '/networks/ethereum.png',
                              84532: '/networks/base.png',
                            };
                            const icon = networkIconMap[selectedChainId];
                            return icon ? (
                              <img
                                src={icon}
                                alt={SUPPORTED_CHAINS.find(c => c.chainId === selectedChainId)?.name}
                                className="mr-2 h-5 w-5 rounded-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : null;
                          })()}
                          <span className="block truncate">
                            {SUPPORTED_CHAINS.find(c => c.chainId === selectedChainId)?.name}
                            {selectedChainId === chainId ? ' (Connected)' : ''}
                          </span>
                        </span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                          <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </span>
                      </Listbox.Button>
                      <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                      >
                        <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50">
                          {SUPPORTED_CHAINS.map((chainItem) => (
                            <Listbox.Option
                              key={chainItem.chainId}
                              className={({ active }) =>
                                `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-900 dark:text-primary-100' : 'text-gray-900 dark:text-gray-100'
                                }`
                              }
                              value={chainItem.chainId}
                            >
                              {({ selected }) => (
                                <>
                                  <span className="flex items-center truncate">
                                    {(() => {
                                      const networkIconMap: Record<number, string> = {
                                        1: '/networks/ethereum.png',
                                        8453: '/networks/base.png',
                                        137: '/networks/polygon.png',
                                        42161: '/networks/arbitrum.png',
                                        11155111: '/networks/ethereum.png',
                                        84532: '/networks/base.png',
                                      };
                                      const icon = networkIconMap[chainItem.chainId];
                                      return icon ? (
                                        <img
                                          src={icon}
                                          alt={chainItem.name}
                                          className="mr-2 h-5 w-5 rounded-full object-contain"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                          }}
                                        />
                                      ) : null;
                                    })()}
                                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                      {chainItem.name} {chainItem.chainId === chainId ? '(Connected)' : ''}
                                    </span>
                                  </span>
                                  {selected ? (
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600 dark:text-primary-400">
                                      <Check className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </Listbox.Option>
                          ))}
                        </Listbox.Options>
                      </Transition>
                    </div>
                  </Listbox>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Token
                  </label>
                  <Listbox value={token} onChange={setToken}>
                    <div className="relative mt-1">
                      <Listbox.Button className="relative w-full cursor-default rounded-md bg-white dark:bg-gray-700 py-3 pl-3 pr-10 text-left border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm shadow-sm">
                        <span className="flex items-center truncate text-gray-900 dark:text-white">
                          {(() => {
                            const logo = getTokenLogoWithFallback(token);
                            return logo ? (
                              <img src={logo} alt={token} className="mr-2 h-5 w-5 rounded-full" />
                            ) : (
                              <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30 text-xs font-bold text-primary-600 dark:text-primary-400">
                                {token.slice(0, 1)}
                              </div>
                            );
                          })()}
                          <span className="block truncate">{token}</span>
                        </span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                          <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </span>
                      </Listbox.Button>
                      <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                      >
                        <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50">
                          {availableTokens.map((availableToken) => (
                            <Listbox.Option
                              key={availableToken.symbol}
                              className={({ active }) =>
                                `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-900 dark:text-primary-100' : 'text-gray-900 dark:text-gray-100'
                                }`
                              }
                              value={availableToken.symbol}
                            >
                              {({ selected }) => (
                                <>
                                  <span className="flex items-center truncate">
                                    {(() => {
                                      const logo = getTokenLogoWithFallback(availableToken.symbol);
                                      return logo ? (
                                        <img src={logo} alt={availableToken.symbol} className="mr-2 h-5 w-5 rounded-full" />
                                      ) : (
                                        <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-[10px] font-bold text-gray-600 dark:text-gray-300">
                                          {availableToken.symbol.slice(0, 1)}
                                        </div>
                                      );
                                    })()}
                                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                      {availableToken.symbol} ({availableToken.name})
                                    </span>
                                  </span>
                                  {selected ? (
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600 dark:text-primary-400">
                                      <Check className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </Listbox.Option>
                          ))}
                        </Listbox.Options>
                      </Transition>
                    </div>
                  </Listbox>
                </div>

                <div className="mb-4">
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>

                <div className="mb-6">
                  <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Recipient Address
                  </label>
                  <input
                    type="text"
                    id="recipient"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="0x..."
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSendingEth || isSendingToken}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 dark:focus:ring-offset-gray-800"
                  >
                    {isSendingEth || isSendingToken ? 'Sending...' : 'Send Payment'}
                  </button>
                </div>

                {(isEthSent || isTokenSent) && (
                  <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-md dark:bg-green-900 dark:text-green-200">
                    Payment sent successfully!
                  </div>
                )}
              </form>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Recent Transactions</h2>
                <Link
                  href="/wallet/transactions"
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors text-sm font-medium"
                >
                  <span>View All Transactions</span>
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-3300 uppercase tracking-wider">
                        Transaction
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Amount
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Value
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {transactionData.length > 0 ? transactionData.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          <div className="flex items-center space-x-2">
                            <span>{transaction.type}</span>
                            <a
                              href={getExplorerUrl('tx', transaction.hash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                              title="View on Explorer"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {transaction.amount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {transaction.value}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${transaction.status === 'Completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : transaction.status === 'Failed'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}>
                            {transaction.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {transaction.date}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                          {isLoading ? 'Loading transactions...' : 'No transactions found'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Integrated Token Swap Modal */}
      <TokenSwapModal
        isOpen={showTokenSwapModal}
        onClose={() => {
          setShowTokenSwapModal(false);
          setSwapTokenIn(null);
        }}
        initialTokenIn={swapTokenIn}
      />
    </Layout>
  );
}
