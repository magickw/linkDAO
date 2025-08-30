/**
 * DualPricing Component - Displays crypto and fiat prices with real-time conversion
 * Shows both cryptocurrency and fiat equivalent pricing
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { designTokens } from '../tokens';

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
  /** Additional CSS classes */
  className?: string;
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
  className = '',
}) => {
  const [primaryDisplay, setPrimaryDisplay] = useState<'crypto' | 'fiat'>('crypto');
  const [isConverting, setIsConverting] = useState(false);
  const [convertedPrice, setConvertedPrice] = useState(fiatPrice);

  // Simulate real-time conversion (in real app, this would call an API)
  useEffect(() => {
    if (realTimeConversion && !fiatPrice) {
      setIsConverting(true);
      const timer = setTimeout(() => {
        // Mock conversion rate (ETH to USD)
        const mockRate = 1800;
        const numericPrice = parseFloat(cryptoPrice);
        if (!isNaN(numericPrice)) {
          setConvertedPrice((numericPrice * mockRate).toFixed(2));
        }
        setIsConverting(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [cryptoPrice, fiatPrice, realTimeConversion]);

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

  const containerStyle = {
    display: 'flex',
    alignItems: layout === 'horizontal' ? 'center' : 'flex-start',
    flexDirection: layout === 'vertical' ? 'column' : 'row' as const,
    gap: config.spacing,
  };

  const primaryPriceStyle = {
    fontSize: config.primarySize,
    fontWeight: designTokens.typography.fontWeight.bold,
    color: '#ffffff',
    lineHeight: 1.2,
  };

  const secondaryPriceStyle = {
    fontSize: config.secondarySize,
    fontWeight: designTokens.typography.fontWeight.medium,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 1.2,
  };

  const toggleButtonStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '6px',
    padding: `${designTokens.spacing.xs} ${designTokens.spacing.sm}`,
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: designTokens.typography.fontSize.xs,
    cursor: 'pointer',
    backdropFilter: 'blur(4px)',
  };

  const handleToggle = () => {
    setPrimaryDisplay(prev => prev === 'crypto' ? 'fiat' : 'crypto');
  };

  const displayPrice = convertedPrice || fiatPrice;
  const showSecondary = displayPrice && !isConverting;

  const priceVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: 'easeOut' },
    },
  };

  const pulseVariants = {
    pulse: {
      scale: [1, 1.02, 1],
      transition: { duration: 0.6, ease: 'easeInOut' },
    },
  };

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
        className="primary-price"
        variants={pulseVariants}
        animate={realTimeConversion ? 'pulse' : undefined}
      >
        {primaryDisplay === 'crypto' ? (
          <div style={primaryPriceStyle}>
            {cryptoPrice} {cryptoSymbol}
          </div>
        ) : (
          <div style={primaryPriceStyle}>
            {fiatSymbol === 'USD' ? '$' : fiatSymbol}{displayPrice}
          </div>
        )}
      </motion.div>

      {/* Secondary Price Display */}
      {showSecondary && (
        <motion.div
          className="secondary-price"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {primaryDisplay === 'crypto' ? (
            <div style={secondaryPriceStyle}>
              ≈ {fiatSymbol === 'USD' ? '$' : fiatSymbol}{displayPrice}
            </div>
          ) : (
            <div style={secondaryPriceStyle}>
              ≈ {cryptoPrice} {cryptoSymbol}
            </div>
          )}
        </motion.div>
      )}

      {/* Loading indicator for conversion */}
      {isConverting && (
        <motion.div
          className="conversion-loading"
          style={secondaryPriceStyle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Converting...
        </motion.div>
      )}

      {/* Toggle button */}
      {showToggle && showSecondary && (
        <motion.button
          style={toggleButtonStyle}
          onClick={handleToggle}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="price-toggle"
        >
          ⇄
        </motion.button>
      )}

      {/* Real-time indicator */}
      {realTimeConversion && (
        <motion.div
          className="realtime-indicator"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: designTokens.typography.fontSize.xs,
            color: 'rgba(255, 255, 255, 0.6)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <motion.div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: designTokens.colors.status.success,
            }}
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