import React, { useState, useEffect } from 'react';

interface TokenBalance {
  symbol: string;
  name: string;
  balance: number;
  valueUSD: number;
  change24h: number;
}

interface WalletSnapshotEmbedProps {
  walletAddress: string;
  className?: string;
}

export default function WalletSnapshotEmbed({ walletAddress, className = '' }: WalletSnapshotEmbedProps) {
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('24h');
  const [portfolioValue, setPortfolioValue] = useState<number>(0);
  const [portfolioChange, setPortfolioChange] = useState<number>(0);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [series, setSeries] = useState<number[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Generate lightweight synthetic series for sparkline based on timeframe
  useEffect(() => {
    const points = 24; // 24 points for 24h default
    const base = Math.max(1, portfolioValue || 1000);
    const arr: number[] = [];
    let val = base * (0.98 + Math.random() * 0.04);
    for (let i = 0; i < points; i++) {
      const drift = (Math.random() - 0.5) * 0.015 * base; // small drift
      val = Math.max(base * 0.8, Math.min(base * 1.2, val + drift));
      arr.push(val);
    }
    setSeries(arr);
  }, [timeframe, walletAddress, portfolioValue]);

  // Mock data for demonstration (regenerate on refresh)
  React.useEffect(() => {
    // In a real implementation, this would fetch from blockchain APIs
    // For now, we'll generate mock data
    
    // Mock portfolio value and change
    const mockValue = Math.random() * 100000 + 50000;
    const mockChange = (Math.random() - 0.5) * 10;
    
    setPortfolioValue(parseFloat(mockValue.toFixed(2)));
    setPortfolioChange(parseFloat(mockChange.toFixed(2)));
    
    // Mock token balances
    const mockBalances: TokenBalance[] = [
      { symbol: 'ETH', name: 'Ethereum', balance: Math.random() * 50 + 10, valueUSD: mockValue * 0.4, change24h: (Math.random() - 0.5) * 5 },
      { symbol: 'USDC', name: 'USD Coin', balance: Math.random() * 50000 + 10000, valueUSD: mockValue * 0.3, change24h: 0 },
      { symbol: 'LINK', name: 'Chainlink', balance: Math.random() * 1000 + 200, valueUSD: mockValue * 0.15, change24h: (Math.random() - 0.5) * 15 },
      { symbol: 'UNI', name: 'Uniswap', balance: Math.random() * 500 + 100, valueUSD: mockValue * 0.1, change24h: (Math.random() - 0.5) * 12 },
      { symbol: 'COMP', name: 'Compound', balance: Math.random() * 100 + 20, valueUSD: mockValue * 0.05, change24h: (Math.random() - 0.5) * 8 },
    ];
    
    setTokenBalances(mockBalances);
    setIsRefreshing(false);
  }, [walletAddress, refreshTick]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const isPositive = portfolioChange >= 0;

  return (
    <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">Wallet Snapshot</h3>
            <button
              onClick={() => { setIsRefreshing(true); setRefreshTick((t) => t + 1); }}
              title="Update Wallet Data"
              className="inline-flex items-center justify-center rounded p-1 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
              aria-label="Update Wallet Data"
            >
              <svg className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0114.13-3.36L23 10"></path>
                <path d="M20.49 15a9 9 0 01-14.13 3.36L1 14"></path>
              </svg>
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {walletAddress.substring(0, 6)}...{walletAddress.substring(38)}
            </p>
          </div>
          <div className="text-right">
            <p className={`font-semibold text-gray-900 dark:text-white`}>{formatCurrency(portfolioValue)}</p>
            <p className={`text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? '+' : ''}{portfolioChange.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {/* Inline SVG sparkline */}
        {series.length > 1 && (
          <div className="mb-3">
            {(() => {
              const width = 300;
              const height = 40;
              const min = Math.min(...series);
              const max = Math.max(...series);
              const range = Math.max(1, max - min);
              const pts = series
                .map((v, i) => {
                  const x = (i / (series.length - 1)) * width;
                  const y = height - ((v - min) / range) * height;
                  return `${x.toFixed(2)},${y.toFixed(2)}`;
                })
                .join(' ');
              const rising = series[series.length - 1] >= series[0];
              return (
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-10">
                  <polyline
                    fill="none"
                    stroke={rising ? '#10b981' : '#ef4444'}
                    strokeWidth="2"
                    points={pts}
                  />
                </svg>
              );
            })()}
          </div>
        )}
        <div className="flex justify-center space-x-2 mb-4">
          {(['24h', '7d', '30d'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 text-xs rounded-full ${
                timeframe === tf
                  ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-200'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
        
        <div className="space-y-3">
          {tokenBalances.map((token, index) => {
            const percentage = (token.valueUSD / portfolioValue) * 100;
            const isTokenPositive = token.change24h >= 0;
            
            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center text-white text-xs font-bold">
                    {token.symbol.substring(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{token.symbol}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{token.name}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-medium text-gray-900 dark:text-white">{formatNumber(token.valueUSD)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {token.balance.toFixed(2)} {token.symbol}
                  </p>
                  {token.change24h !== 0 && (
                    <p className={`text-xs ${isTokenPositive ? 'text-green-500' : 'text-red-500'}`}>
                      {isTokenPositive ? '+' : ''}{token.change24h.toFixed(2)}%
                    </p>
                  )}
                </div>
                
                <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ml-2">
                  <div 
                    className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
          <button className="w-full py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
            View Full Portfolio
          </button>
        </div>
      </div>
    </div>
  );
}