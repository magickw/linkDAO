import React, { useState, useEffect } from 'react';

interface DeFiChartEmbedProps {
  tokenSymbol: string;
  tokenName: string;
  className?: string;
  timeframe?: '1h' | '24h' | '7d' | '30d' | '1y';
}

export default function DeFiChartEmbed({ 
  tokenSymbol, 
  tokenName, 
  className = '',
  timeframe = '24h'
}: DeFiChartEmbedProps) {
  const [price, setPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);
  const [chartData, setChartData] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data for demonstration
  useEffect(() => {
    const fetchChartData = () => {
      try {
        // In a real implementation, this would fetch from CoinGecko or DEX APIs
        // For now, we'll generate mock data
        setLoading(true);
        
        // Mock price data
        const mockPrice = Math.random() * 1000 + 100;
        const mockChange = (Math.random() - 0.5) * 20;
        
        setPrice(parseFloat(mockPrice.toFixed(2)));
        setPriceChange(parseFloat(mockChange.toFixed(2)));
        
        // Generate mock chart data
        const dataPoints = timeframe === '1h' ? 60 : 
                          timeframe === '24h' ? 24 : 
                          timeframe === '7d' ? 7 : 
                          timeframe === '30d' ? 30 : 365;
        
        const mockData = Array.from({ length: dataPoints }, (_, i) => {
          // Generate a somewhat realistic price curve
          const base = mockPrice * (1 + (Math.random() - 0.5) * 0.1);
          const trend = (i / dataPoints) * mockChange * 0.1;
          const noise = (Math.random() - 0.5) * mockPrice * 0.02;
          return parseFloat((base + trend + noise).toFixed(2));
        });
        
        setChartData(mockData);
        setLoading(false);
      } catch (err) {
        setError('Failed to load chart data');
        setLoading(false);
      }
    };

    fetchChartData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchChartData, 30000);
    return () => clearInterval(interval);
  }, [tokenSymbol, timeframe]);

  const formatTimeframe = () => {
    switch (timeframe) {
      case '1h': return '1 Hour';
      case '24h': return '24 Hours';
      case '7d': return '7 Days';
      case '30d': return '30 Days';
      case '1y': return '1 Year';
      default: return '24 Hours';
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return '--';
    if (price > 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(4)}`;
  };

  if (loading) {
    return (
      <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden ${className}`}>
        <div className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden ${className}`}>
        <div className="p-4">
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Error loading chart</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate min and max for chart scaling
  const minValue = Math.min(...chartData);
  const maxValue = Math.max(...chartData);
  const range = maxValue - minValue || 1; // Avoid division by zero

  // Generate SVG path for the chart line
  const generatePath = () => {
    if (chartData.length === 0) return '';
    
    const points = chartData.map((value, index) => {
      const x = (index / (chartData.length - 1)) * 100;
      const y = 100 - ((value - minValue) / range) * 100;
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  };

  const isPositive = priceChange !== null && priceChange >= 0;

  return (
    <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{tokenName} ({tokenSymbol})</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{formatTimeframe()} Chart</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-gray-900 dark:text-white">{formatPrice(price)}</p>
            {priceChange !== null && (
              <p className={`text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isPositive ? '+' : ''}{priceChange?.toFixed(2)}%
              </p>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="h-40 w-full relative">
          {chartData.length > 0 ? (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
              <defs>
                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={isPositive ? "#10B981" : "#EF4444"} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={isPositive ? "#10B981" : "#EF4444"} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path 
                d={generatePath()} 
                fill="none" 
                stroke={isPositive ? "#10B981" : "#EF4444"} 
                strokeWidth="0.5" 
                vectorEffect="non-scaling-stroke"
              />
              <path 
                d={`${generatePath()} L 100,100 L 0,100 Z`} 
                fill="url(#chartGradient)" 
              />
            </svg>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No chart data available
            </div>
          )}
        </div>
        
        <div className="flex justify-center space-x-2 mt-4">
          {(['1h', '24h', '7d', '30d', '1y'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => window.location.reload()} // In a real app, this would update the timeframe
              className={`px-2 py-1 text-xs rounded-full ${
                timeframe === tf
                  ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-200'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}