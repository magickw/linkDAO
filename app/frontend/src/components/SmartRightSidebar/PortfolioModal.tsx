import React, { useState, useEffect } from 'react';
import { EnhancedWalletData, TokenBalance, PortfolioAnalytics } from '../../types/wallet';

interface PortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletData: EnhancedWalletData;
  analytics?: PortfolioAnalytics;
}

export default function PortfolioModal({ 
  isOpen, 
  onClose, 
  walletData,
  analytics 
}: PortfolioModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'tokens' | 'nfts' | 'defi' | 'analytics'>('overview');
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | '1y'>('7d');
  // Track which tokens show per-chain breakdown
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpanded = (symbol: string) => setExpanded(prev => ({ ...prev, [symbol]: !prev[symbol] }));

  // Persist expanded state in localStorage
  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('portfolio_breakdown_expanded') : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setExpanded(parsed);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('portfolio_breakdown_expanded', JSON.stringify(expanded));
      }
    } catch {}
  }, [expanded]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatNumber = (value: number, decimals: number = 4) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}K`;
    }
    return value.toFixed(decimals);
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 8)}...${address.substring(34)}`;
  };

  const isPositive = (walletData.portfolioChange || 0) >= 0;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'tokens', label: 'Tokens', icon: '🪙' },
    { id: 'nfts', label: 'NFTs', icon: '🖼️' },
    { id: 'defi', label: 'DeFi', icon: '🏦' },
    { id: 'analytics', label: 'Analytics', icon: '📈' }
  ];

  const timeframes = [
    { id: '24h', label: '24H' },
    { id: '7d', label: '7D' },
    { id: '30d', label: '30D' },
    { id: '1y', label: '1Y' }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-6xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Portfolio Analytics
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {walletData.address ? formatAddress(walletData.address) : ''}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Timeframe Selector */}
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {timeframes.map((tf) => (
                  <button
                    key={tf.id}
                    onClick={() => setTimeframe(tf.id as any)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      timeframe === tf.id
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Portfolio Summary */}
          <div className="p-6 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Value</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(walletData.portfolioValue || 0)}
                </p>
                <p className={`text-sm flex items-center justify-center mt-1 ${
                  isPositive ? 'text-green-500' : 'text-red-500'
                }`}>
                  <svg 
                    className={`w-4 h-4 mr-1 ${isPositive ? '' : 'rotate-180'}`} 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  {isPositive ? '+' : ''}{(walletData.portfolioChange || 0).toFixed(2)}%
                </p>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Assets</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(walletData.balances || []).length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Tokens
                </p>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Best Performer</p>
                <p className="text-2xl font-bold text-green-500">
                  {walletData.balances && walletData.balances.length > 0
                    ? walletData.balances
                        .sort((a, b) => b.change24h - a.change24h)[0]?.symbol || 'N/A'
                    : 'N/A'}
                </p>
                <p className="text-sm text-green-500 mt-1">
                  {walletData.balances && walletData.balances.length > 0
                    ? `+${walletData.balances
                        .sort((a, b) => b.change24h - a.change24h)[0]?.change24h.toFixed(2) || '0'}%`
                    : '0%'}
                </p>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Transactions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(walletData.recentTransactions || []).length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Recent
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6 max-h-96 overflow-y-auto">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Asset Allocation Chart Placeholder */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Asset Allocation
                  </h3>
                  <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    📊 Portfolio allocation chart would be rendered here
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Recent Activity
                  </h3>
                  <div className="space-y-3">
                    {walletData.recentTransactions && walletData.recentTransactions.slice(0, 5).map((tx: any, index: number) => {
                      const chainId = tx.chainId as number | undefined;
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
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm">
                              {tx.type === 'send' ? '↗' : '↙'}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {tx.type === 'send' ? 'Sent' : 'Received'} {tx.token}
                              </p>
                              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                                <span>{new Date(tx.timestamp).toLocaleDateString()}</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200">
                                  {chainLabel(chainId)}
                                </span>
                                {tx.hash && (
                                  <a
                                    href={explorerUrl(chainId, tx.hash)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                                  >
                                    View
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {formatNumber(Number(tx.amount || 0))} {tx.token}
                            </p>
                            {tx.valueUSD && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {formatCurrency(Number(tx.valueUSD))}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tokens' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Token Holdings
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const all: Record<string, boolean> = {};
                        walletData.balances.forEach((t) => (all[t.symbol] = true));
                        setExpanded(all);
                      }}
                      className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                    >
                      Expand all
                    </button>
                    <button
                      onClick={() => setExpanded({})}
                      className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                    >
                      Collapse all
                    </button>
                    <button className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
                      Sort by value ↓
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {walletData.balances && walletData.balances.map((token, index) => {
                    const percentage = ((token.valueUSD || 0) / (walletData.portfolioValue || 1)) * 100;
                    const tokenIsPositive = (token.change24h || 0) >= 0;
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold">
                      {token.symbol.substring(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {token.symbol}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {token.name}
                      </p>
                      {/* Chain labels */}
                      {token.chains && token.chains.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {token.chains.map((cid) => (
                            <span
                              key={`${token.symbol}-${cid}`}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200"
                            >
                              {cid === 1 && 'Ethereum'}
                              {cid === 8453 && 'Base'}
                              {cid === 84532 && 'Base Sepolia'}
                              {cid === 137 && 'Polygon'}
                              {cid === 42161 && 'Arbitrum'}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Toggle breakdown */}
                      {token.chainBreakdown && token.chainBreakdown.length > 0 && (
                        <div className="mt-2">
                          <button
                            onClick={() => toggleExpanded(token.symbol)}
                            className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                          >
                            {expanded[token.symbol] ? 'Hide per-chain breakdown' : 'View per-chain breakdown'}
                          </button>
                          {expanded[token.symbol] && (
                            <div className="mt-2 space-y-1">
                              {token.chainBreakdown.map((b, i) => {
                                const explorerTokenUrl = (cid?: number, addr?: string) => {
                                  if (!addr || addr === '0x0000000000000000000000000000000000000000') return null;
                                  switch (cid) {
                                    case 1: return `https://etherscan.io/token/${addr}`;
                                    case 8453: return `https://basescan.org/token/${addr}`;
                                    case 84532: return `https://base-sepolia.basescan.org/token/${addr}`;
                                    case 137: return `https://polygonscan.com/token/${addr}`;
                                    case 42161: return `https://arbiscan.io/token/${addr}`;
                                    default: return null;
                                  }
                                };
                                const url = explorerTokenUrl(b.chainId, b.contractAddress);
                                return (
                                  <div key={`${token.symbol}-bd-${b.chainId}-${i}`} className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-[10px] mr-2">
                                      {b.chainId === 1 && 'Ethereum'}
                                      {b.chainId === 8453 && 'Base'}
                                      {b.chainId === 84532 && 'Base Sepolia'}
                                      {b.chainId === 137 && 'Polygon'}
                                      {b.chainId === 42161 && 'Arbitrum'}
                                    </span>
                                    <span className="mr-2">{formatNumber(b.balance)} {token.symbol}</span>
                                    <span className="text-gray-500 dark:text-gray-400">({formatCurrency(b.valueUSD)})</span>
                                    {url && (
                                      <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-2 text-[10px] text-primary-600 dark:text-primary-400 hover:underline"
                                      >
                                        View token
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                        </div>
                        
                        <div className="text-center">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {formatNumber(token.balance || 0)} {token.symbol}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {percentage.toFixed(1)}% of portfolio
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(token.valueUSD || 0)}
                          </p>
                          <p className={`text-sm ${tokenIsPositive ? 'text-green-500' : 'text-red-500'}`}>
                            {tokenIsPositive ? '+' : ''}{(token.change24h || 0).toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'nfts' && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🖼️</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  NFT Collection
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  NFT portfolio view coming soon
                </p>
              </div>
            )}

            {activeTab === 'defi' && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏦</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  DeFi Positions
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  DeFi portfolio tracking coming soon
                </p>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Performance Metrics
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total Return</span>
                        <span className={`font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                          {isPositive ? '+' : ''}{(walletData.portfolioChange || 0).toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Best Asset</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {walletData.balances && walletData.balances.length > 0
                            ? walletData.balances.sort((a, b) => b.change24h - a.change24h)[0]?.symbol
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Diversification</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {walletData.balances ? walletData.balances.length : 0} assets
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Risk Analysis
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Risk Level</span>
                        <span className="font-medium text-yellow-500">Moderate</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Volatility</span>
                        <span className="font-medium text-gray-900 dark:text-white">Medium</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Correlation</span>
                        <span className="font-medium text-gray-900 dark:text-white">0.75</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Chart Placeholder */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                    Portfolio Performance
                  </h4>
                  <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    📈 Performance chart would be rendered here
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}