import React, { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { useAccount, useBalance } from 'wagmi';
import { useWalletData } from '@/hooks/useWalletData';
import { formatDistanceToNow } from 'date-fns';
import {
  RefreshCw,
  ExternalLink,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Calendar,
  DollarSign
} from 'lucide-react';

type TransactionFilter = 'all' | 'sent' | 'received' | 'pending' | 'failed';
type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

export default function WalletTransactions() {
  const { address, chain } = useAccount();
  const chainId = chain?.id;

  const [filter, setFilter] = useState<TransactionFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Get wallet data with transactions
  const {
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
    maxTransactions: 100
  });

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...transactions];

    // Apply filter
    if (filter === 'sent') {
      result = result.filter(tx => tx.type === 'send');
    } else if (filter === 'received') {
      result = result.filter(tx => tx.type === 'receive');
    } else if (filter === 'pending') {
      result = result.filter(tx => tx.status === 'pending');
    } else if (filter === 'failed') {
      result = result.filter(tx => tx.status === 'failed');
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(tx =>
        tx.hash.toLowerCase().includes(query) ||
        (typeof tx.token === 'string' ? tx.token.toLowerCase().includes(query) : tx.token.symbol.toLowerCase().includes(query))
      );
    }

    // Apply date filters
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      result = result.filter(tx => new Date(tx.timestamp) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      result = result.filter(tx => new Date(tx.timestamp) <= toDate);
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'date-asc':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'amount-desc':
          return (typeof b.valueUSD === 'number' ? b.valueUSD : 0) - (typeof a.valueUSD === 'number' ? a.valueUSD : 0);
        case 'amount-asc':
          return (typeof a.valueUSD === 'number' ? a.valueUSD : 0) - (typeof b.valueUSD === 'number' ? b.valueUSD : 0);
        default:
          return 0;
      }
    });

    return result;
  }, [transactions, filter, sortBy, searchQuery, dateFrom, dateTo]);

  // Calculate statistics
  const stats = useMemo(() => {
    const sent = transactions.filter(tx => tx.type === 'send');
    const received = transactions.filter(tx => tx.type === 'receive');
    const pending = transactions.filter(tx => tx.status === 'pending');

    return {
      total: transactions.length,
      sent: sent.length,
      received: received.length,
      pending: pending.length,
      totalSentUSD: sent.reduce((sum, tx) => sum + (typeof tx.valueUSD === 'number' ? tx.valueUSD : 0), 0),
      totalReceivedUSD: received.reduce((sum, tx) => sum + (typeof tx.valueUSD === 'number' ? tx.valueUSD : 0), 0),
    };
  }, [transactions]);

  const handleRefresh = async () => {
    await refresh();
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ['Date', 'Type', 'Token', 'Amount', 'Value (USD)', 'Status', 'Hash'];
    const rows = filteredAndSortedTransactions.map(tx => [
      new Date(tx.timestamp).toLocaleString(),
      tx.type,
      typeof tx.token === 'string' ? tx.token : tx.token.symbol,
      tx.amount,
      typeof tx.valueUSD === 'number' ? tx.valueUSD.toFixed(2) : 'N/A',
      tx.status,
      tx.hash
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallet-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getExplorerUrl = (hash: string): string => {
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
    return `${baseUrl}/tx/${hash}`;
  };

  const formatCurrency = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <Layout title="Transaction History - LinkDAO" fullWidth={true}>
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Transaction History</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                View and manage all your wallet transactions
              </p>
            </div>
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
                title="Refresh transactions"
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-300 ${
                  isRefreshing ? 'animate-spin' : ''
                }`} />
              </button>
              <button
                onClick={handleExport}
                disabled={filteredAndSortedTransactions.length === 0}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
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

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Transactions</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <Filter className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Sent</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.sent}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {formatCurrency(stats.totalSentUSD)}
                  </p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                  <ArrowUpRight className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Received</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.received}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {formatCurrency(stats.totalReceivedUSD)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <ArrowDownLeft className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                  <RefreshCw className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Hash, token..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Filter */}
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filter
                </label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as TransactionFilter)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Transactions</option>
                  <option value="sent">Sent</option>
                  <option value="received">Received</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Sort */}
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="date-desc">Date (Newest)</option>
                  <option value="date-asc">Date (Oldest)</option>
                  <option value="amount-desc">Amount (Highest)</option>
                  <option value="amount-asc">Amount (Lowest)</option>
                </select>
              </div>

              {/* Date Range */}
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date Range
                </label>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="flex-1 px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="flex-1 px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Clear Filters */}
            {(searchQuery || filter !== 'all' || dateFrom || dateTo) && (
              <div className="mt-4">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilter('all');
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-300 mt-2 block">Loading transactions...</span>
            </div>
          )}

          {/* Transactions Table */}
          {!isLoading && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              {filteredAndSortedTransactions.length === 0 ? (
                <div className="p-8 text-center">
                  <Filter className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No transactions found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {filter !== 'all' || searchQuery || dateFrom || dateTo
                      ? 'Try adjusting your filters'
                      : 'Your transaction history will appear here'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Date & Time
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Type
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Token
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Amount
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Value (USD)
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Transaction
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredAndSortedTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                            <div className="flex flex-col">
                              <span className="font-medium">{new Date(tx.timestamp).toLocaleDateString()}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(tx.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center space-x-2">
                              {tx.type === 'send' ? (
                                <>
                                  <ArrowUpRight className="w-4 h-4 text-red-500" />
                                  <span className="text-red-600 dark:text-red-400 font-medium">Sent</span>
                                </>
                              ) : (
                                <>
                                  <ArrowDownLeft className="w-4 h-4 text-green-500" />
                                  <span className="text-green-600 dark:text-green-400 font-medium">Received</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                  {(typeof tx.token === 'string' ? tx.token : tx.token.symbol).charAt(0)}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {typeof tx.token === 'string' ? tx.token : tx.token.symbol}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {tx.type === 'send' ? '-' : '+'}{tx.amount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                            {typeof tx.valueUSD === 'number' ? formatCurrency(tx.valueUSD) : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              tx.status === 'confirmed'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : tx.status === 'failed'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}>
                              {tx.status === 'confirmed' ? 'Confirmed' : tx.status === 'failed' ? 'Failed' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <a
                              href={getExplorerUrl(tx.hash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                              title="View on Explorer"
                            >
                              <span className="font-mono">{tx.hash.slice(0, 6)}...{tx.hash.slice(-4)}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Results Summary */}
          {!isLoading && filteredAndSortedTransactions.length > 0 && (
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
              Showing {filteredAndSortedTransactions.length} of {transactions.length} transactions
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
