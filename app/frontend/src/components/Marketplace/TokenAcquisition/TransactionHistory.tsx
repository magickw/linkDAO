/**
 * Transaction History - Displays user's LDAO token transaction history
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
  ExternalLink
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

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'transfer':
        return <ArrowDownLeft className="text-green-400" size={16} />;
      case 'mint':
        return <ArrowDownLeft className="text-blue-400" size={16} />;
      case 'burn':
        return <ArrowUpRight className="text-red-400" size={16} />;
      case 'stake':
        return <Lock className="text-purple-400" size={16} />;
      case 'unstake':
        return <Unlock className="text-yellow-400" size={16} />;
      case 'claim':
        return <Gift className="text-green-400" size={16} />;
      case 'purchase':
        return <ArrowDownLeft className="text-blue-400" size={16} />;
      default:
        return <ArrowDownLeft className="text-gray-400" size={16} />;
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

  if (!isConnected) {
    return (
      <GlassPanel variant="secondary" className="p-6 text-center">
        <div className="text-white/50 mb-4">
          <Filter size={48} className="mx-auto" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Connect Wallet for History</h3>
        <p className="text-white/70 mb-4">
          Connect your wallet to view your LDAO token transaction history.
        </p>
        <Button variant="primary">Connect Wallet</Button>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-white">Transaction History</h2>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant={filter === 'all' ? 'primary' : 'outline'}
              onClick={() => setFilter('all')}
              className="py-2 px-3 text-sm"
            >
              All
            </Button>
            <Button
              variant={filter === 'transfers' ? 'primary' : 'outline'}
              onClick={() => setFilter('transfers')}
              className="py-2 px-3 text-sm"
            >
              Transfers
            </Button>
            <Button
              variant={filter === 'staking' ? 'primary' : 'outline'}
              onClick={() => setFilter('staking')}
              className="py-2 px-3 text-sm"
            >
              Staking
            </Button>
            <Button
              variant={filter === 'purchases' ? 'primary' : 'outline'}
              onClick={() => setFilter('purchases')}
              className="py-2 px-3 text-sm"
            >
              Purchases
            </Button>
          </div>
          
          <Button
            variant="outline"
            onClick={handleExport}
            className="flex items-center gap-2 py-2 px-3 text-sm border-white/30 text-white hover:bg-white/10"
          >
            <Download size={16} />
            Export
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <GlassPanel variant="secondary" className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
          <p className="text-white/70 mt-2">Loading transaction history...</p>
        </GlassPanel>
      )}

      {/* Empty State */}
      {!loading && transactions.length === 0 && (
        <GlassPanel variant="secondary" className="p-8 text-center">
          <Filter className="mx-auto text-white/50 mb-4" size={48} />
          <h3 className="text-xl font-bold text-white mb-2">No Transactions Found</h3>
          <p className="text-white/70">
            {filter === 'all' 
              ? "You don't have any LDAO token transactions yet." 
              : filter === 'purchases'
                ? "You don't have any token purchases yet."
                : `You don't have any ${filter} transactions yet.`}
          </p>
        </GlassPanel>
      )}

      {/* Transaction List */}
      {!loading && transactions.length > 0 && (
        <div className="space-y-4">
          {transactions.map((tx, index) => (
            <GlassPanel key={index} variant="secondary" className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    {getTransactionIcon('value' in tx ? tx.type : tx.type)}
                  </div>
                  <div>
                    <div className="font-medium text-white">
                      {getTransactionTypeLabel('value' in tx ? tx.type : tx.type)}
                    </div>
                    <div className="text-sm text-white/70">
                      {normalizeTimestamp(tx.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  {'value' in tx ? (
                    <>
                      <div className={`font-bold ${tx.from === address ? 'text-red-400' : 'text-green-400'}`}>
                        {tx.from === address ? '-' : '+'}{tx.value} LDAO
                      </div>
                      <div className="text-sm text-white/70">
                        {tx.from === address ? `To: ${formatAddress(tx.to)}` : `From: ${formatAddress(tx.from)}`}
                      </div>
                    </>
                  ) : tx.type === 'purchase' ? (
                    <>
                      <div className="font-bold text-blue-400">
                        +{tx.amount} LDAO
                      </div>
                      <div className="text-sm text-white/70">
                        Paid {tx.cost} {tx.currency}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={`font-bold ${
                        tx.type === 'stake' ? 'text-purple-400' : 
                        tx.type === 'unstake' ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {tx.type === 'claim' ? '+' : ''}{tx.amount} LDAO
                      </div>
                      {tx.rewardAmount && (
                        <div className="text-sm text-green-400">
                          +{tx.rewardAmount} Rewards
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-sm">
                <button
                  onClick={() => openEtherscan(tx.hash)}
                  className="flex items-center gap-1 text-white/70 hover:text-blue-400 transition-colors group"
                >
                  <span>Tx: {tx.hash.substring(0, 10)}...{tx.hash.substring(tx.hash.length - 8)}</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <div className={`px-2 py-1 rounded text-xs ${
                  tx.status === 'success'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {tx.status}
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