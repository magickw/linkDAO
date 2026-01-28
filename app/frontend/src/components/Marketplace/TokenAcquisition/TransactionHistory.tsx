/**
 * Transaction History - Displays user's LDAO token transaction history with enhanced visual design
 */

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { transactionHistoryService } from '@/services/web3/transactionHistoryService';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { normalizeTimestamp } from '@/utils/transactionUtils';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Lock,
  Unlock,
  Gift,
  Download,
  Filter,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  Zap,
  DollarSign
} from 'lucide-react';

type Transaction = Awaited<ReturnType<typeof transactionHistoryService.getCombinedHistory>>[0];

const TransactionHistory: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'transfers' | 'staking' | 'purchases'>('all');

  // Load transaction history on component mount
  useEffect(() => {
    loadTransactionHistory();
  }, [isConnected, address, filter]);

  const loadTransactionHistory = async () => {
    if (!isConnected || !address) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const history = await transactionHistoryService.getCombinedHistory(address, 50);
      
      // Apply filter
      let filtered = history;
      if (filter === 'transfers') {
        filtered = history.filter(tx => 'value' in tx);
      } else if (filter === 'staking') {
        filtered = history.filter(tx => 'amount' in tx && tx.type !== 'purchase');
      } else if (filter === 'purchases') {
        filtered = history.filter(tx => tx.type === 'purchase');
      }
      
      setTransactions(filtered);
    } catch (error) {
      console.error('Failed to load transaction history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!isConnected || !address) return;
    
    try {
      const csv = await transactionHistoryService.exportHistoryAsCSV(address);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ldao-transaction-history-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export transaction history:', error);
    }
  };

  const formatAddress = (addr: string): string => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // Get Etherscan URL based on network (Sepolia testnet)
  const getEtherscanUrl = (txHash: string): string => {
    // Using Sepolia testnet as per deployedAddresses-sepolia.json (chainId: 11155111)
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  };

  const openEtherscan = (txHash: string): void => {
    window.open(getEtherscanUrl(txHash), '_blank', 'noopener,noreferrer');
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
  };

  const getTransactionIcon = (type: string) => {
    const iconClass = "w-6 h-6";
    switch (type) {
      case 'transfer':
        return <ArrowDownLeft className="text-green-400" size={20} />;
      case 'mint':
        return <ArrowDownLeft className="text-blue-400" size={20} />;
      case 'burn':
        return <ArrowUpRight className="text-red-400" size={20} />;
      case 'stake':
        return <Lock className="text-purple-400" size={20} />;
      case 'unstake':
        return <Unlock className="text-yellow-400" size={20} />;
      case 'claim':
        return <Gift className="text-green-400" size={20} />;
      case 'purchase':
        return <Zap className="text-blue-400" size={20} />;
      default:
        return <ArrowDownLeft className="text-gray-400" size={20} />;
    }
  };

  const getTransactionIconBackground = (type: string) => {
    switch (type) {
      case 'transfer':
        return 'from-green-500/20 to-green-600/20';
      case 'mint':
        return 'from-blue-500/20 to-blue-600/20';
      case 'burn':
        return 'from-red-500/20 to-red-600/20';
      case 'stake':
        return 'from-purple-500/20 to-purple-600/20';
      case 'unstake':
        return 'from-yellow-500/20 to-yellow-600/20';
      case 'claim':
        return 'from-green-500/20 to-green-600/20';
      case 'purchase':
        return 'from-blue-500/20 to-blue-600/20';
      default:
        return 'from-gray-500/20 to-gray-600/20';
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'transfer':
        return 'Transfer';
      case 'mint':
        return 'Mint';
      case 'burn':
        return 'Burn';
      case 'stake':
        return 'Stake';
      case 'unstake':
        return 'Unstake';
      case 'claim':
        return 'Reward Claim';
      case 'purchase':
        return 'Token Purchase';
      default:
        return type;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Success
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1 animate-pulse" />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-400 border border-gray-500/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            Unknown
          </span>
        );
    }
  };

  if (!isConnected) {
    return (
      <GlassPanel variant="secondary" className="p-8 text-center">
        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Filter size={40} className="text-white/50" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">Connect Wallet for History</h3>
        <p className="text-white/70 mb-6 max-w-md mx-auto">
          Connect your wallet to view your LDAO token transaction history.
        </p>
        <Button variant="primary" className="px-8 py-3">Connect Wallet</Button>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with gradient */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white mb-1">Transaction History</h2>
            <p className="text-white/80 text-sm">
              {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl p-1">
              <Button
                variant={filter === 'all' ? 'primary' : 'ghost'}
                onClick={() => setFilter('all')}
                className="py-2 px-4 text-sm font-medium"
              >
                All
              </Button>
              <Button
                variant={filter === 'transfers' ? 'primary' : 'ghost'}
                onClick={() => setFilter('transfers')}
                className="py-2 px-4 text-sm font-medium"
              >
                Transfers
              </Button>
              <Button
                variant={filter === 'staking' ? 'primary' : 'ghost'}
                onClick={() => setFilter('staking')}
                className="py-2 px-4 text-sm font-medium"
              >
                Staking
              </Button>
              <Button
                variant={filter === 'purchases' ? 'primary' : 'ghost'}
                onClick={() => setFilter('purchases')}
                className="py-2 px-4 text-sm font-medium"
              >
                Purchases
              </Button>
            </div>
            
            <Button
              variant="outline"
              onClick={handleExport}
              className="flex items-center gap-2 py-2 px-4 text-sm bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
            >
              <Download size={16} />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Loading State */}
      {loading && (
        <GlassPanel variant="secondary" className="p-12 text-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mb-4"></div>
            <p className="text-white/80 text-lg font-medium">Loading transaction history...</p>
          </div>
        </GlassPanel>
      )}

      {/* Enhanced Empty State */}
      {!loading && transactions.length === 0 && (
        <GlassPanel variant="secondary" className="p-12 text-center">
          <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Filter size={48} className="text-white/50" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">No Transactions Found</h3>
          <p className="text-white/70 max-w-md mx-auto">
            {filter === 'all' 
              ? "You don't have any LDAO token transactions yet." 
              : filter === 'purchases'
                ? "You don't have any token purchases yet."
                : `You don't have any ${filter} transactions yet.`}
          </p>
        </GlassPanel>
      )}

      {/* Enhanced Transaction List */}
      {!loading && transactions.length > 0 && (
        <div className="space-y-4">
          {transactions.map((tx, index) => (
            <GlassPanel 
              key={index} 
              variant="secondary" 
              className="p-5 hover:bg-white/5 transition-all group border border-white/10 hover:border-purple-500/50"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getTransactionIconBackground('value' in tx ? tx.type : tx.type)} flex items-center justify-center flex-shrink-0`}>
                    {getTransactionIcon('value' in tx ? tx.type : tx.type)}
                  </div>
                  <div>
                    <div className="font-bold text-white text-lg">
                      {getTransactionTypeLabel('value' in tx ? tx.type : tx.type)}
                    </div>
                    <div className="text-sm text-white/60 flex items-center gap-2 mt-1">
                      <Clock size={14} />
                      {normalizeTimestamp(tx.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  {'value' in tx ? (
                    <>
                      <div className={`font-bold text-2xl ${tx.from === address ? 'text-red-400' : 'text-green-400'}`}>
                        {tx.from === address ? '-' : '+'}{tx.value} LDAO
                      </div>
                      <div className="text-sm text-white/70 mt-1">
                        {tx.from === address ? `To: ${formatAddress(tx.to)}` : `From: ${formatAddress(tx.from)}`}
                      </div>
                    </>
                  ) : tx.type === 'purchase' ? (
                    <>
                      <div className="font-bold text-2xl text-blue-400">
                        +{tx.amount} LDAO
                      </div>
                      <div className="text-sm text-white/70 mt-1 flex items-center justify-end gap-1">
                        <DollarSign size={14} />
                        Paid {tx.cost} {tx.currency}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={`font-bold text-2xl ${
                        tx.type === 'stake' ? 'text-purple-400' : 
                        tx.type === 'unstake' ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {tx.type === 'claim' ? '+' : ''}{tx.amount} LDAO
                      </div>
                      {tx.rewardAmount && (
                        <div className="text-sm text-green-400 mt-1 flex items-center justify-end gap-1">
                          <Gift size={14} />
                          +{tx.rewardAmount} Rewards
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <button
                  onClick={() => openEtherscan(tx.hash)}
                  className="flex items-center gap-2 text-sm text-white/70 hover:text-blue-400 transition-colors group/btn"
                >
                  <ExternalLink size={16} className="opacity-70 group-hover/btn:opacity-100" />
                  <span className="font-mono text-xs">{tx.hash.substring(0, 10)}...{tx.hash.substring(tx.hash.length - 8)}</span>
                </button>
                <div className="flex items-center gap-3">
                  {getStatusBadge(tx.status)}
                  <button
                    onClick={() => handleCopyHash(tx.hash)}
                    className="p-2 text-white/50 hover:text-white/80 hover:bg-white/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Copy transaction hash"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;