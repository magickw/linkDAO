import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PriceData {
  timestamp: number;
  price: number;
}

interface TokenPriceSparklineProps {
  priceHistory: PriceData[];
  currentPrice: number;
  currency?: string;
  width?: number;
  height?: number;
  showChange?: boolean;
  className?: string;
}

const TokenPriceSparkline: React.FC<TokenPriceSparklineProps> = ({
  priceHistory,
  currentPrice,
  currency = 'USD',
  width = 100,
  height = 30,
  showChange = true,
  className = ''
}) => {
  const { path, minPrice, maxPrice, priceChange, changePercent } = useMemo(() => {
    if (!priceHistory || priceHistory.length === 0) {
      return { path: '', minPrice: 0, maxPrice: 0, priceChange: 0, changePercent: 0 };
    }

    const prices = priceHistory.map(d => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    // Generate SVG path
    const points = priceHistory.map((d, i) => {
      const x = (i / (priceHistory.length - 1)) * width;
      const y = height - ((d.price - min) / range) * height;
      return `${x},${y}`;
    });

    const pathStr = `M ${points.join(' L ')}`;

    // Calculate price change
    const firstPrice = priceHistory[0].price;
    const lastPrice = priceHistory[priceHistory.length - 1].price;
    const change = lastPrice - firstPrice;
    const percent = ((change / firstPrice) * 100);

    return {
      path: pathStr,
      minPrice: min,
      maxPrice: max,
      priceChange: change,
      changePercent: percent
    };
  }, [priceHistory, width, height]);

  const isPositive = priceChange >= 0;
  const isNeutral = Math.abs(changePercent) < 0.1;

  const getTrendColor = () => {
    if (isNeutral) return 'text-gray-500 dark:text-gray-400';
    return isPositive ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400';
  };

  const getStrokeColor = () => {
    if (isNeutral) return '#9ca3af';
    return isPositive ? '#10b981' : '#ef4444';
  };

  const getTrendIcon = () => {
    if (isNeutral) return Minus;
    return isPositive ? TrendingUp : TrendingDown;
  };

  const TrendIcon = getTrendIcon();

  if (!priceHistory || priceHistory.length === 0) {
    return (
      <div className={`flex items-center text-xs text-gray-400 ${className}`}>
        <span>No data</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Sparkline Chart */}
      <svg
        width={width}
        height={height}
        className="flex-shrink-0"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        {/* Area fill */}
        <defs>
          <linearGradient id={`gradient-${currentPrice}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={getStrokeColor()} stopOpacity="0.2" />
            <stop offset="100%" stopColor={getStrokeColor()} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        <path
          d={`${path} L ${width},${height} L 0,${height} Z`}
          fill={`url(#gradient-${currentPrice})`}
        />
        
        {/* Line */}
        <path
          d={path}
          fill="none"
          stroke={getStrokeColor()}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Price Change */}
      {showChange && (
        <div className="flex items-center gap-1 text-xs font-medium">
          <TrendIcon className={`w-3 h-3 ${getTrendColor()}`} />
          <span className={getTrendColor()}>
            {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default TokenPriceSparkline;

// Helper function to generate mock price history for testing
export const generateMockPriceHistory = (days: number = 7): PriceData[] => {
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  const basePrice = 1.0 + Math.random() * 10;
  
  return Array.from({ length: days }, (_, i) => {
    const timestamp = now - (days - 1 - i) * msPerDay;
    const volatility = 0.1; // 10% daily volatility
    const change = (Math.random() - 0.5) * 2 * volatility;
    const price = basePrice * (1 + change * (i / days));
    
    return {
      timestamp,
      price: Math.max(0.01, price)
    };
  });
};
