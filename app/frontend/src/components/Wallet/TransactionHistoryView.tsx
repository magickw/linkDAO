/**
 * Transaction History View Component
 * Displays transaction history with enhanced visual design and better information hierarchy
 */

import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, ExternalLink, Filter, Search, Clock, CheckCircle, XCircle, AlertCircle, Copy, DollarSign, Zap, Wallet } from 'lucide-react';
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
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
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
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3 h-3 mr-1 animate-pulse" />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400">
            <AlertCircle className="w-3 h-3 mr-1" />
            Unknown
          </span>
        );
    }
  };

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'send':
        return (
          <div className="p-3 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 rounded-xl">
            <ArrowUpRight className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
        );
      case 'receive':
        return (
          <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-xl">
            <ArrowDownLeft className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
        );
      case 'swap':
        return (
          <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl">
            <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        );
      case 'contract_interaction':
        return (
          <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl">
            <Wallet className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
        );
      default:
        return (
          <div className="p-3 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-xl">
            <Clock className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </div>
        );
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
    <div className={`space-y-6 ${className}`}>
      {/* Header with prominent styling */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 shadow-lg text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">Transaction History</h2>
            <p className="text-white/80 text-sm">
              {filteredTransactions.length} {filteredTransactions.length === 1 ? 'transaction' : 'transactions'}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                addToast('Transaction history refreshed', 'info');
              }}
              className="p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all backdrop-blur-sm"
              title="Refresh"
            >
              <Clock className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by address, hash, or token..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white text-sm transition-all hover:border-blue-300 dark:hover:border-blue-600"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as TransactionType)}
              className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white text-sm font-medium transition-all hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer"
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
              className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white text-sm font-medium transition-all hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer"
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
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
            <span className="text-gray-600 dark:text-gray-300 text-lg font-medium">Loading transactions...</span>
          </div>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-md">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-10 h-10 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Transactions Found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm || filter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters or search terms'
              : 'Your transaction history will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTransactions).map(([date, txs]) => (
            <div key={date}>
              <div className="flex items-center mb-4">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                <h3 className="px-4 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {date}
                </h3>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
              </div>
              <div className="space-y-3">
                {txs.map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => setSelectedTransaction(tx)}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-md border-2 border-gray-100 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-all hover:shadow-lg group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {getTransactionIcon(tx.type)}
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-lg capitalize">
                            {tx.type.replace('_', ' ')}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                              {tx.token.symbol}
                            </span>
                            <span className="text-gray-300 dark:text-gray-600">•</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {formatTime(tx.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p
                          className={`font-bold text-xl ${
                            tx.type === 'receive'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {tx.type === 'receive' ? '+' : '-'}
                          {tx.amount} {tx.token.symbol}
                        </p>
                        <div className="flex items-center justify-end space-x-2 mt-1">
                          <DollarSign className="w-3 h-3 text-gray-400" />
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            {formatCurrency(tx.valueUSD)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-2">
                        {getStatusBadge(tx.status)}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewOnExplorer(tx.hash, tx.blockNumber ? 1 : 8453);
                          }}
                          className="text-blue-500 hover:text-blue-600 text-xs font-medium flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enhanced Transaction Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                Transaction Details
              </h3>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-all"
              >
                <XCircle className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Status */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Status</p>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(selectedTransaction.status)}
                      <span className="font-bold text-gray-900 dark:text-white text-lg capitalize">
                        {selectedTransaction.status}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(selectedTransaction.status)}
                </div>
              </div>

              {/* Amount and Value */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl p-5">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Amount</p>
                  <p className="font-bold text-gray-900 dark:text-white text-xl">
                    {selectedTransaction.type === 'receive' ? '+' : '-'}
                    {selectedTransaction.amount} {selectedTransaction.token.symbol}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-2xl p-5">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Value</p>
                  <p className="font-bold text-gray-900 dark:text-white text-xl">
                    {formatCurrency(selectedTransaction.valueUSD)}
                  </p>
                </div>
              </div>

              {/* From */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">From</p>
                <div className="flex items-center justify-between">
                  <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
                    {selectedTransaction.from}
                  </p>
                  <button
                    onClick={() => handleCopyHash(selectedTransaction.from)}
                    className="ml-3 p-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg transition-all flex-shrink-0"
                  >
                    <Copy className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </button>
                </div>
              </div>

              {/* To */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">To</p>
                <div className="flex items-center justify-between">
                  <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
                    {selectedTransaction.to}
                  </p>
                  <button
                    onClick={() => handleCopyHash(selectedTransaction.to)}
                    className="ml-3 p-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg transition-all flex-shrink-0"
                  >
                    <Copy className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </button>
                </div>
              </div>

              {/* Hash */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Transaction Hash</p>
                <div className="flex items-center justify-between">
                  <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
                    {selectedTransaction.hash}
                  </p>
                  <button
                    onClick={() => handleCopyHash(selectedTransaction.hash)}
                    className="ml-3 p-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg transition-all flex-shrink-0"
                  >
                    <Copy className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </button>
                </div>
              </div>

              {/* Timestamp */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Timestamp</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatDate(selectedTransaction.timestamp)} at{' '}
                  {formatTime(selectedTransaction.timestamp)}
                </p>
              </div>

              {/* View on Explorer */}
              <button
                onClick={() =>
                  handleViewOnExplorer(
                    selectedTransaction.hash,
                    selectedTransaction.blockNumber ? 1 : 8453
                  )
                }
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
              >
                <ExternalLink className="w-5 h-5" />
                <span>View on Blockchain Explorer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};