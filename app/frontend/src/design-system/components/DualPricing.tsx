/**
 * DualPricing Component - Advanced crypto/fiat pricing with real-time conversion
 * Features: Live price feeds, multiple currencies, price history, conversion tracking
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle, Clock, Zap } from 'lucide-react';
import { designTokens } from '../tokens';

interface PriceHistory {
  timestamp: number;
  price: number;
  change: number;
}

interface DualPricingProps {
  /** Cryptocurrency price */
  cryptoPrice: string;
  /** Cryptocurrency symbol */
  cryptoSymbol?: string;
  /** Fiat equivalent price */
  fiatPrice?: string;
  /** Fiat currency symbol */
  fiatSymbol?: string;
  /** Enable real-time conversion */
  realTimeConversion?: boolean;
  /** Price size variant */
  size?: 'small' | 'medium' | 'large';
  /** Layout orientation */
  layout?: 'horizontal' | 'vertical' | 'stacked';
  /** Show conversion toggle */
  showToggle?: boolean;
  /** Show price change indicator */
  showChange?: boolean;
  /** Show last updated timestamp */
  showLastUpdated?: boolean;
  /** Price update interval in milliseconds */
  updateInterval?: number;
  /** Enable price history tracking */
  trackHistory?: boolean;
  /** Support multiple fiat currencies */
  supportedCurrencies?: string[];
  /** Custom conversion API endpoint */
  conversionApi?: string;
  /** Show loading states */
  showLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Callback for price updates */
  onPriceUpdate?: (newPrice: string, currency: string) => void;
}

export const DualPricing: React.FC<DualPricingProps> = ({
  cryptoPrice,
  cryptoSymbol = 'ETH',
  fiatPrice,
  fiatSymbol = 'USD',
  realTimeConversion = true,
  size = 'medium',
  layout = 'horizontal',
  showToggle = false,
  showChange = true,
  showLastUpdated = false,
  updateInterval = 120000, // 2 minutes
  trackHistory = false,
  supportedCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD'],
  conversionApi,
  showLoading = true,
  className = '',
  onPriceUpdate,
}) => {
  const [primaryDisplay, setPrimaryDisplay] = useState<'crypto' | 'fiat'>('crypto');
  const [currentCurrency, setCurrentCurrency] = useState(fiatSymbol);
  const [isConverting, setIsConverting] = useState(false);
  const [convertedPrices, setConvertedPrices] = useState<Record<string, string>>({});
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  // Store props in refs to avoid recreating updatePrices
  const cryptoPriceRef = useRef(cryptoPrice);
  const cryptoSymbolRef = useRef(cryptoSymbol);
  const supportedCurrenciesRef = useRef(supportedCurrencies);
  const realTimeConversionRef = useRef(realTimeConversion);
  const trackHistoryRef = useRef(trackHistory);
  const currentCurrencyRef = useRef(currentCurrency);
  const conversionApiRef = useRef(conversionApi);

  useEffect(() => {
    cryptoPriceRef.current = cryptoPrice;
    cryptoSymbolRef.current = cryptoSymbol;
    supportedCurrenciesRef.current = supportedCurrencies;
    realTimeConversionRef.current = realTimeConversion;
    trackHistoryRef.current = trackHistory;
    currentCurrencyRef.current = currentCurrency;
    conversionApiRef.current = conversionApi;
  });

  // Mock conversion rates (in real app, these would come from API)
  const mockRates = {
    'ETH-USD': 2400,
    'ETH-EUR': 2200,
    'ETH-GBP': 1900,
    'ETH-JPY': 350000,
    'ETH-CAD': 3200,
    'BTC-USD': 45000,
    'BTC-EUR': 41000,
    'BTC-GBP': 35000,
    'USDC-USD': 1,
    'USDC-EUR': 0.91,
    'USDC-GBP': 0.78,
  };

  // Enhanced conversion function with multiple currencies
  const convertPrice = useCallback(async (price: string, from: string, to: string): Promise<string> => {
    try {
      if (conversionApiRef.current) {
        // Use custom API
        const response = await fetch(`${conversionApiRef.current}?from=${from}&to=${to}&amount=${price}`);
        const data = await response.json();
        return data.converted.toString();
      } else {
        // Use mock rates
        const rateKey = `${from.toUpperCase()}-${to.toUpperCase()}`;
        const rate = mockRates[rateKey as keyof typeof mockRates] || 1;
        const numericPrice = parseFloat(price);
        return (numericPrice * rate).toFixed(2);
      }
    } catch (error) {
      console.error('Conversion failed:', error);
      throw new Error('Conversion failed');
    }
  }, []);

  // Stable reference for onPriceUpdate callback
  const onPriceUpdateRef = useRef(onPriceUpdate);
  useEffect(() => {
    onPriceUpdateRef.current = onPriceUpdate;
  }, [onPriceUpdate]);

  // Real-time price updates - stable function that doesn't change
  const updatePrices = useCallback(async () => {
    if (!realTimeConversionRef.current) return;

    setIsConverting(true);
    setConversionError(null);

    try {
      const newPrices: Record<string, string> = {};

      // Convert to all supported currencies
      for (const currency of supportedCurrenciesRef.current) {
        const converted = await convertPrice(cryptoPriceRef.current, cryptoSymbolRef.current, currency);
        newPrices[currency] = converted;
      }

      setConvertedPrices(newPrices);

      // Track price history
      if (trackHistoryRef.current) {
        const currentPrice = parseFloat(newPrices[currentCurrencyRef.current] || '0');
        // Use functional update to avoid dependency issues
        setPriceHistory(prev => {
          const lastPrice = prev.length > 0 ? prev[prev.length - 1].price : currentPrice;
          const change = prev.length > 0 ? ((currentPrice - lastPrice) / lastPrice) * 100 : 0;

          setPriceChange(change);

          return [
            ...prev.slice(-19), // Keep last 20 entries
            {
              timestamp: Date.now(),
              price: currentPrice,
              change: change
            }
          ];
        });
      }

      setLastUpdated(new Date());
      onPriceUpdateRef.current?.(newPrices[currentCurrencyRef.current] || '0', currentCurrencyRef.current);
    } catch (error) {
      setConversionError('Failed to update prices');
    } finally {
      setIsConverting(false);
    }
  }, [convertPrice]);

  // Set up automatic price updates - only re-run if updateInterval changes
  useEffect(() => {
    if (realTimeConversionRef.current && updateInterval > 0) {
      updatePrices(); // Initial update

      intervalRef.current = setInterval(updatePrices, updateInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [updateInterval, updatePrices]);

  // Initialize prices - only run when fiatPrice or currentCurrency changes
  useEffect(() => {
    if (fiatPrice) {
      setConvertedPrices(prev => ({
        ...prev,
        [currentCurrency]: fiatPrice
      }));
    }
  }, [fiatPrice, currentCurrency]);

  const sizeConfig = {
    small: {
      primarySize: designTokens.typography.fontSize.base,
      secondarySize: designTokens.typography.fontSize.sm,
      spacing: designTokens.spacing.xs,
    },
    medium: {
      primarySize: designTokens.typography.fontSize.xl,
      secondarySize: designTokens.typography.fontSize.base,
      spacing: designTokens.spacing.sm,
    },
    large: {
      primarySize: designTokens.typography.fontSize['2xl'],
      secondarySize: designTokens.typography.fontSize.lg,
      spacing: designTokens.spacing.md,
    },
  };

  const config = sizeConfig[size];

  const handleToggle = () => {
    setPrimaryDisplay(prev => prev === 'crypto' ? 'fiat' : 'crypto');
  };

  const handleCurrencyChange = (currency: string) => {
    setCurrentCurrency(currency);
    setShowCurrencyMenu(false);
  };

  const handleRefresh = () => {
    updatePrices();
  };

  const displayPrice = convertedPrices[currentCurrency] || fiatPrice;
  const showSecondary = displayPrice && !isConverting;

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CAD': 'C$',
    };
    return symbols[currency] || currency;
  };

  const priceVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: 'easeOut' as const },
    },
  };

  const updateVariants = {
    updating: {
      scale: [1, 1.05, 1],
      transition: { duration: 0.6, ease: 'easeInOut' as const },
    },
  };

  const containerStyle = {
    display: 'flex',
    alignItems: layout === 'horizontal' ? 'center' : 'flex-start',
    flexDirection: layout === 'vertical' ? 'column' : 'row',
    gap: config.spacing,
    position: 'relative',
  } as const;

  return (
    <motion.div
      style={containerStyle}
      className={`dual-pricing dual-pricing--${layout} ${className}`}
      variants={priceVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Primary Price Display */}
      <motion.div
        className="primary-price flex items-center gap-2"
        variants={updateVariants}
        animate={isConverting ? 'updating' : undefined}
      >
        <div style={{
          fontSize: config.primarySize,
          fontWeight: designTokens.typography.fontWeight.bold,
          color: '#ffffff',
          lineHeight: 1.2,
        }}>
          {primaryDisplay === 'crypto' ? (
            `${cryptoPrice} ${cryptoSymbol}`
          ) : (
            `${getCurrencySymbol(currentCurrency)}${displayPrice}`
          )}
        </div>

        {/* Loading indicator */}
        {isConverting && showLoading && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw size={config.primarySize === designTokens.typography.fontSize['2xl'] ? 20 : 16} className="text-white/60" />
          </motion.div>
        )}

        {/* Price change indicator */}
        {showChange && trackHistory && priceChange !== 0 && !isConverting && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
              priceChange > 0
                ? 'text-green-400 bg-green-400/10'
                : 'text-red-400 bg-red-400/10'
            }`}
          >
            {priceChange > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(priceChange).toFixed(2)}%
          </motion.div>
        )}
      </motion.div>

      {/* Secondary Price Display */}
      <AnimatePresence>
        {showSecondary && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="secondary-price"
          >
            <div style={{
              fontSize: config.secondarySize,
              fontWeight: designTokens.typography.fontWeight.medium,
              color: 'rgba(255, 255, 255, 0.7)',
              lineHeight: 1.2,
            }}>
              {primaryDisplay === 'crypto' ? (
                `≈ ${getCurrencySymbol(currentCurrency)}${displayPrice}`
              ) : (
                `≈ ${cryptoPrice} ${cryptoSymbol}`
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      <AnimatePresence>
        {conversionError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2 text-red-400 text-sm"
          >
            <AlertCircle size={14} />
            <span>{conversionError}</span>
            <button
              onClick={handleRefresh}
              className="text-red-400 hover:text-red-300 underline"
            >
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        {/* Toggle button */}
        {showToggle && showSecondary && (
          <motion.button
            onClick={handleToggle}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white/80 hover:bg-white/20 text-xs backdrop-blur-sm"
          >
            ⇄
          </motion.button>
        )}

        {/* Currency selector */}
        {supportedCurrencies.length > 1 && (
          <div className="relative">
            <motion.button
              onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white/80 hover:bg-white/20 text-xs backdrop-blur-sm"
            >
              {currentCurrency}
            </motion.button>

            <AnimatePresence>
              {showCurrencyMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 mt-1 bg-black/80 backdrop-blur-sm border border-white/20 rounded shadow-lg z-10"
                >
                  {supportedCurrencies.map(currency => (
                    <button
                      key={currency}
                      onClick={() => handleCurrencyChange(currency)}
                      className={`block w-full px-3 py-2 text-left text-sm hover:bg-white/10 ${
                        currency === currentCurrency ? 'text-blue-400' : 'text-white/80'
                      }`}
                    >
                      {currency}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Refresh button */}
        {realTimeConversion && (
          <motion.button
            onClick={handleRefresh}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95, rotate: 180 }}
            disabled={isConverting}
            className="p-1 text-white/60 hover:text-white disabled:opacity-50"
          >
            <RefreshCw size={14} />
          </motion.button>
        )}
      </div>

      {/* Last Updated */}
      {showLastUpdated && lastUpdated && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-1 text-xs text-white/50"
        >
          <Clock size={12} />
          {formatTimeAgo(lastUpdated)}
        </motion.div>
      )}

      {/* Real-time indicator */}
      {realTimeConversion && !conversionError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-1 text-xs text-white/60"
        >
          <motion.div
            className="w-2 h-2 rounded-full bg-green-400"
            animate={{
              opacity: [1, 0.3, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          Live
        </motion.div>
      )}
    </motion.div>
  );
};

// Specialized pricing components
export const ProductPricing: React.FC<Omit<DualPricingProps, 'size'>> = (props) => (
  <DualPricing size="large" showToggle {...props} />
);

export const CardPricing: React.FC<Omit<DualPricingProps, 'size' | 'layout'>> = (props) => (
  <DualPricing size="medium" layout="vertical" {...props} />
);

export const CompactPricing: React.FC<Omit<DualPricingProps, 'size' | 'layout'>> = (props) => (
  <DualPricing size="small" layout="horizontal" {...props} />
);