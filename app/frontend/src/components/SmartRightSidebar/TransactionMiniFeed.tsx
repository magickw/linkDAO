import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, TransactionStatus } from '../../types/wallet';

interface TransactionMiniFeedProps {
  transactions: Transaction[];
  onTransactionClick?: (transaction: Transaction) => void;
  className?: string;
}

const TransactionMiniFeed = React.memo(function TransactionMiniFeed({ 
  transactions, 
  onTransactionClick,
  className = '' 
}: TransactionMiniFeedProps) {
  const [visibleTransactions, setVisibleTransactions] = useState(5);
  const [newTransactionIds, setNewTransactionIds] = useState<Set<string>>(new Set());

  // Detect new transactions for animation - use stable reference
  const [previousTransactionIds, setPreviousTransactionIds] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    const currentIds = new Set(transactions.map(tx => tx.id));
    const newIds = new Set([...currentIds].filter(id => !previousTransactionIds.has(id)));
    
    if (newIds.size > 0 && previousTransactionIds.size > 0) { // Don't animate on initial load
      setNewTransactionIds(newIds);
      // Clear the new transaction indicators after animation
      setTimeout(() => {
        setNewTransactionIds(new Set());
      }, 2000);
    }
    
    setPreviousTransactionIds(currentIds);
  }, [transactions.length, transactions.map(tx => tx.id).join(',')]); // Use stable dependencies

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatTokenAmount = (amount: number, symbol: string) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M ${symbol}`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K ${symbol}`;
    }
    return `${amount.toFixed(4)} ${symbol}`;
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getTransactionIcon = (type: TransactionType, status: TransactionStatus) => {
    const baseClasses = "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold";
    
    if (status === TransactionStatus.PENDING) {
      return (
        <div className={`${baseClasses} bg-yellow-500 animate-pulse`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    }

    if (status === TransactionStatus.FAILED) {
      return (
        <div className={`${baseClasses} bg-red-500`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    }

    switch (type) {
      case TransactionType.SEND:
        return (
          <div className={`${baseClasses} bg-red-500`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
          </div>
        );
      case TransactionType.RECEIVE:
        return (
          <div className={`${baseClasses} bg-green-500`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
          </div>
        );
      case TransactionType.SWAP:
        return (
          <div className={`${baseClasses} bg-blue-500`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
        );
      case TransactionType.CONTRACT:
        return (
          <div className={`${baseClasses} bg-purple-500`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        );
      case TransactionType.NFT:
        return (
          <div className={`${baseClasses} bg-pink-500`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className={`${baseClasses} bg-gray-500`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        );
    }
  };

  const getTransactionDescription = (transaction: Transaction) => {
    switch (transaction.type) {
      case TransactionType.SEND:
        return `Sent ${formatTokenAmount(transaction.amount, transaction.token)} to ${transaction.to?.substring(0, 6)}...`;
      case TransactionType.RECEIVE:
        return `Received ${formatTokenAmount(transaction.amount, transaction.token)} from ${transaction.from?.substring(0, 6)}...`;
      case TransactionType.SWAP:
        return `Swapped ${formatTokenAmount(transaction.amount, transaction.token)} for ${transaction.toToken}`;
      case TransactionType.CONTRACT:
        return `Contract interaction: ${transaction.contractName || 'Unknown'}`;
      case TransactionType.NFT:
        return `NFT ${transaction.nftAction}: ${transaction.nftName || 'Unknown'}`;
      default:
        return `${transaction.type} transaction`;
    }
  };

  const getStatusBadge = (status: TransactionStatus) => {
    switch (status) {
      case TransactionStatus.PENDING:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1 animate-pulse" />
            Pending
          </span>
        );
      case TransactionStatus.CONFIRMED:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1" />
            Confirmed
          </span>
        );
      case TransactionStatus.FAILED:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-1" />
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  const displayedTransactions = transactions.slice(0, visibleTransactions);

  const chainLabel = (cid?: number) => {
    switch (cid) {
      case 1: return 'Ethereum';
      case 8453: return 'Base';
      case 84532: return 'Base Sepolia';
      case 137: return 'Polygon';
      case 42161: return 'Arbitrum';
      default: return 'Unknown';
    }
  };

  const explorerUrl = (cid?: number, hash?: string) => {
    if (!hash) return '#';
    switch (cid) {
      case 1: return `https://etherscan.io/tx/${hash}`;
      case 8453: return `https://basescan.org/tx/${hash}`;
      case 84532: return `https://base-sepolia.basescan.org/tx/${hash}`;
      case 137: return `https://polygonscan.com/tx/${hash}`;
      case 42161: return `https://arbiscan.io/tx/${hash}`;
      default: return `https://etherscan.io/tx/${hash}`;
    }
  };

  return (
    <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
          <svg className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Recent Transactions
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {transactions.length} transactions
        </p>
      </div>

      {/* Transaction List */}
      <div className="p-4">
        {displayedTransactions.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">No recent transactions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedTransactions.map((transaction) => {
              const isNew = newTransactionIds.has(transaction.id);
              
              return (
                <div
                  key={transaction.id}
                  onClick={() => onTransactionClick?.(transaction)}
                  className={`
                    flex items-center space-x-3 p-3 rounded-lg transition-all duration-300 cursor-pointer
                    ${isNew ? 'bg-primary-50 dark:bg-primary-900/20 animate-pulse' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}
                    ${onTransactionClick ? 'hover:scale-[1.02]' : ''}
                  `}
                >
                  {/* Transaction Icon */}
                  <div className="flex-shrink-0">
                    {getTransactionIcon(transaction.type, transaction.status)}
                  </div>

                  {/* Transaction Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {getTransactionDescription(transaction)}
                      </p>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        {formatTimeAgo(transaction.timestamp)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(transaction.status)}
                        {/* Chain badge */}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200">
                          {chainLabel((transaction as any).chainId)}
                        </span>
                        {/* Explorer link */}
                        {transaction.hash && (
                          <a
                            href={explorerUrl((transaction as any).chainId, transaction.hash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View
                          </a>
                        )}
                        {transaction.gasUsed && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Gas: {transaction.gasUsed.toLocaleString()}
                          </span>
                        )}
                      </div>
                      
                      {transaction.valueUSD && (
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(transaction.valueUSD)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Chevron for clickable transactions */}
                  {onTransactionClick && (
                    <div className="flex-shrink-0">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Load More Button */}
        {transactions.length > visibleTransactions && (
          <button
            onClick={() => setVisibleTransactions(prev => prev + 5)}
            className="w-full mt-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors duration-200"
          >
            Load More ({transactions.length - visibleTransactions} remaining)
          </button>
        )}

        {/* View All Button */}
        {transactions.length > 0 && (
          <button
            onClick={() => onTransactionClick?.(transactions[0])} // Navigate to full transaction history
            className="w-full mt-2 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
          >
            View All Transactions →
          </button>
        )}
      </div>
    </div>
  );
});

export default TransactionMiniFeed;