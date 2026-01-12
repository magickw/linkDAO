/**
 * Transaction History View Component
 * Displays transaction history with filtering and details
 */

import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, ExternalLink, Filter, Search, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Transaction } from '@/services/walletService';
import { useToast } from '@/context/ToastContext';

type TransactionType = 'all' | 'send' | 'receive' | 'swap' | 'contract_interaction';
type TransactionStatus = 'all' | 'pending' | 'confirmed' | 'failed';

interface TransactionHistoryViewProps {
  transactions: Transaction[];
  isLoading?: boolean;
  className?: string;
}

export const TransactionHistoryView: React.FC<TransactionHistoryViewProps> = ({
  transactions,
  isLoading = false,
  className = '',
}) => {
  const { addToast } = useToast();
  const [filter, setFilter] = useState<TransactionType>('all');
  const [statusFilter, setStatusFilter] = useState<TransactionStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const formatCurrency = (value: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parseFloat(value));
  };

  const formatDate = (timestamp: string): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getExplorerUrl = (hash: string, chainId: number): string => {
    const explorers: Record<number, string> = {
      1: 'https://etherscan.io',
      8453: 'https://basescan.org',
      84532: 'https://sepolia.basescan.org',
      137: 'https://polygonscan.com',
      42161: 'https://arbiscan.io',
      11155111: 'https://sepolia.etherscan.io',
    };
    const baseUrl = explorers[chainId] || 'https://etherscan.io';
    return `${baseUrl}/tx/${hash}`;
  };

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'send':
        return <ArrowUpRight className="w-5 h-5 text-red-500" />;
      case 'receive':
        return <ArrowDownLeft className="w-5 h-5 text-green-500" />;
      case 'swap':
        return <ExternalLink className="w-5 h-5 text-blue-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleViewOnExplorer = (hash: string, chainId: number) => {
    const url = getExplorerUrl(hash, chainId);
    window.open(url, '_blank', 'noopener,noreferrer');
    addToast('Opening transaction on explorer...', 'info');
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    addToast('Transaction hash copied to clipboard', 'success');
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    // Type filter
    if (filter !== 'all' && tx.type !== filter) return false;

    // Status filter
    if (statusFilter !== 'all' && tx.status !== statusFilter) return false;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        tx.hash.toLowerCase().includes(searchLower) ||
        tx.from.toLowerCase().includes(searchLower) ||
        tx.to.toLowerCase().includes(searchLower) ||
        tx.token.symbol.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  // Group transactions by date
  const groupedTransactions = filteredTransactions.reduce(
    (groups, tx) => {
      const date = formatDate(tx.timestamp);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(tx);
      return groups;
    },
    {} as Record<string, Transaction[]>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Transaction History
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              // Refresh transactions
              addToast('Transaction history refreshed', 'info');
            }}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Refresh"
          >
            <Clock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white text-sm"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as TransactionType)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All Types</option>
              <option value="send">Sent</option>
              <option value="receive">Received</option>
              <option value="swap">Swaps</option>
              <option value="contract_interaction">Contract</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TransactionStatus)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          <span className="ml-3 text-gray-600 dark:text-gray-300">Loading transactions...</span>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedTransactions).map(([date, txs]) => (
            <div key={date}>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                {date}
              </p>
              <div className="space-y-2">
                {txs.map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => setSelectedTransaction(tx)}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          {getTransactionIcon(tx.type)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white capitalize">
                            {tx.type.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {tx.token.symbol}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p
                          className={`font-semibold ${
                            tx.type === 'receive'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {tx.type === 'receive' ? '+' : '-'}
                          {tx.amount} {tx.token.symbol}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatCurrency(tx.valueUSD)}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        {getStatusIcon(tx.status)}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(tx.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Transaction Details
              </h3>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(selectedTransaction.status)}
                  <span className="font-medium text-gray-900 dark:text-white capitalize">
                    {selectedTransaction.status}
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <span className="text-sm text-gray-600 dark:text-gray-400">Amount</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedTransaction.type === 'receive' ? '+' : '-'}
                  {selectedTransaction.amount} {selectedTransaction.token.symbol}
                </span>
              </div>

              {/* Value */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <span className="text-sm text-gray-600 dark:text-gray-400">Value</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(selectedTransaction.valueUSD)}
                </span>
              </div>

              {/* From */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <span className="text-sm text-gray-600 dark:text-gray-400 block mb-1">From</span>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                    {selectedTransaction.from}
                  </span>
                  <button
                    onClick={() => handleCopyHash(selectedTransaction.from)}
                    className="text-blue-500 hover:text-blue-600 text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* To */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <span className="text-sm text-gray-600 dark:text-gray-400 block mb-1">To</span>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                    {selectedTransaction.to}
                  </span>
                  <button
                    onClick={() => handleCopyHash(selectedTransaction.to)}
                    className="text-blue-500 hover:text-blue-600 text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Hash */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <span className="text-sm text-gray-600 dark:text-gray-400 block mb-1">Transaction Hash</span>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                    {selectedTransaction.hash}
                  </span>
                  <button
                    onClick={() => handleCopyHash(selectedTransaction.hash)}
                    className="text-blue-500 hover:text-blue-600 text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Timestamp */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <span className="text-sm text-gray-600 dark:text-gray-400">Timestamp</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatDate(selectedTransaction.timestamp)} at{' '}
                  {formatTime(selectedTransaction.timestamp)}
                </span>
              </div>

              {/* View on Explorer */}
              <button
                onClick={() =>
                  handleViewOnExplorer(
                    selectedTransaction.hash,
                    selectedTransaction.blockNumber ? 1 : 8453
                  )
                }
                className="w-full py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center space-x-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>View on Explorer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};