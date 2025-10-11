import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useWritePaymentRouterSendEthPayment, useWritePaymentRouterSendTokenPayment } from '@/generated';
import { useWeb3 } from '@/context/Web3Context';
import { useWalletData, usePortfolioPerformance } from '@/hooks/useWalletData';
import { useToast } from '@/context/ToastContext';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw, TrendingUp, TrendingDown, ExternalLink, Copy } from 'lucide-react';
import { useAccount, useBalance } from 'wagmi';

export default function Wallet() {
  const { isConnected } = useWeb3();
  const { address, chain } = useAccount();
  const { data: balanceData } = useBalance({ address: address as `0x${string}` | undefined });
  const chainId = chain?.id;
  
  const { addToast } = useToast();
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [token, setToken] = useState('ETH');
  const [activeTab, setActiveTab] = useState<'overview' | 'send' | 'history'>('overview');
  const [portfolioTimeframe, setPortfolioTimeframe] = useState<'1d' | '1w' | '1m' | '1y'>('1d');
  
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

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recipient || !amount) {
      addToast('Please fill in all fields', 'error');
      return;
    }
    
    const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
    
    if (token === 'ETH') {
      sendEthPayment({
        args: [recipient as `0x${string}`, amountInWei, ''],
        value: amountInWei,
      });
    } else {
      // For token payments, we would need the token address
      // This is a simplified example
      addToast('Token payments not fully implemented in this example', 'info');
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
      // Open in new tab - using _blank as target
      window.open(explorerUrl, '_blank');
      addToast('Opening blockchain explorer...', 'success');
    } catch (error) {
      console.error('Error opening explorer:', error);
      addToast('Failed to open explorer. Please check your popup blocker.', 'error');
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
  const portfolioData = tokens.map(token => ({
    name: token.symbol,
    balance: token.balanceFormatted,
    value: formatCurrency(token.valueUSD),
    change: formatPercentage(token.change24h),
    changeType: token.change24h > 0 ? 'positive' : token.change24h < 0 ? 'negative' : 'neutral'
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

  return (
    <Layout title="Wallet - LinkDAO" fullWidth={true}>
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Wallet</h1>
            <div className="flex items-center space-x-3">
              {lastUpdated && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                </span>
              )}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
                  isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title="Refresh wallet data"
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-300 ${
                  isRefreshing ? 'animate-spin' : ''
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
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('send')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'send'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Send
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg shadow-md p-6 text-white">
                  <h2 className="text-lg font-medium mb-2">Total Balance</h2>
                  <p className="text-3xl font-bold">
                    {portfolio ? formatCurrency(portfolio.totalValueUSD) : formatCurrency(parseFloat(balanceData?.formatted || '0') * 1700)}
                  </p>
                  <div className="flex items-center mt-1">
                    {portfolio && getChangeIcon(portfolio.change24hPercent)}
                    <p className={`text-sm ml-1 ${
                      portfolio ? getChangeColor(portfolio.change24hPercent) : 'text-white/80'
                    }`}>
                      {portfolio ? formatPercentage(portfolio.change24hPercent) : '+2.5%'} (24h)
                    </p>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">ETH Balance</h2>
                  <p className="text-3xl font-bold text-primary-600 dark:text-primary-400 mt-2">{balanceData?.formatted || '0'} ETH</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">≈ ${(parseFloat(balanceData?.formatted || '0') * 1700).toLocaleString()}</p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Portfolio Value</h2>
                  <p className="text-3xl font-bold text-secondary-600 dark:text-secondary-400 mt-2">
                    {portfolio ? formatCurrency(portfolio.totalValueUSD) : '$6,900'}
                  </p>
                  <div className="flex items-center mt-1">
                    {portfolio && getChangeIcon(portfolio.change24hPercent)}
                    <p className={`text-sm ml-1 ${
                      portfolio ? getChangeColor(portfolio.change24hPercent) : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {portfolio ? formatPercentage(portfolio.change24hPercent) : '+3.2%'} (7d)
                    </p>
                  </div>
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
                        className={`px-3 py-1 text-xs rounded-full ${
                          portfolioTimeframe === timeframe
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
              
              {/* Token Balances */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
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
                              <div className="flex-shrink-0 h-10 w-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                                <span className="text-gray-700 dark:text-gray-300 font-medium">{asset.name.charAt(0)}</span>
                              </div>
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
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              asset.changeType === 'positive' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                : asset.changeType === 'negative' 
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {asset.change}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 mr-3">
                              Send
                            </button>
                            <button className="text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-secondary-300">
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
            </div>
          )}
          
          {activeTab === 'send' && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Send Payment</h2>
              
              <form onSubmit={handleSend}>
                <div className="mb-4">
                  <label htmlFor="token" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Token
                  </label>
                  <select
                    id="token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="ETH">ETH</option>
                    <option value="USDC">USDC</option>
                    <option value="USDT">USDT</option>
                  </select>
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
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Recent Transactions</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
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
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            transaction.status === 'Completed'
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
    </Layout>
  );
}