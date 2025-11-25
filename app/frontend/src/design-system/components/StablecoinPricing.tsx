/**
 * StablecoinPricing Component - Simplified pricing for stablecoins like USDC/USDT
 * Features: Direct USD pricing, no conversion needed, clean display
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { designTokens } from '../tokens';

interface StablecoinPricingProps {
  /** Stablecoin price (e.g., "25.99") */
  price: string;
  /** Stablecoin symbol (default: USDC) */
  symbol?: string;
  /** Show equivalent USD value (default: true) */
  showUsdEquivalent?: boolean;
  /** Price size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Layout orientation */
  layout?: 'horizontal' | 'vertical';
  /** Additional CSS classes */
  className?: string;
}

export const StablecoinPricing: React.FC<StablecoinPricingProps> = ({
  price,
  symbol = 'USDC',
  showUsdEquivalent = true,
  size = 'md',
  layout = 'horizontal',
  className = '',
}) => {
  const [isStablecoin] = useState(true); // Always true for this component

  const sizeConfig = {
    sm: {
      primarySize: designTokens?.typography?.fontSize?.base || '1rem',
      secondarySize: designTokens?.typography?.fontSize?.sm || '0.875rem',
      spacing: designTokens?.spacing?.xs || '0.25rem',
    },
    md: {
      primarySize: designTokens?.typography?.fontSize?.xl || '1.25rem',
      secondarySize: designTokens?.typography?.fontSize?.base || '1rem',
      spacing: designTokens?.spacing?.sm || '0.5rem',
    },
    lg: {
      primarySize: designTokens?.typography?.fontSize?.['2xl'] || '1.5rem',
      secondarySize: designTokens?.typography?.fontSize?.lg || '1.125rem',
      spacing: designTokens?.spacing?.md || '1rem',
    },
  };

  const config = sizeConfig[size] || sizeConfig.md;

  const containerStyle = {
    display: 'flex',
    alignItems: layout === 'horizontal' ? 'center' : 'flex-start',
    flexDirection: layout === 'vertical' ? 'column' : 'row',
    gap: config.spacing,
    position: 'relative',
  } as const;

  // Format price with proper decimals for stablecoins
  const formatStablecoinPrice = (amount: string): string => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return '0.00';
    
    // For stablecoins, show 2 decimal places for amounts >= 1
    // Show more precision for smaller amounts
    if (numAmount >= 1) {
      return numAmount.toFixed(2);
    } else if (numAmount >= 0.01) {
      return numAmount.toFixed(4);
    } else {
      return numAmount.toFixed(6);
    }
  };

  const formattedPrice = formatStablecoinPrice(price);

  return (
    <motion.div
      style={containerStyle}
      className={`stablecoin-pricing stablecoin-pricing--${layout} ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Primary Price Display */}
      <div
        style={{
          fontSize: config.primarySize,
          fontWeight: designTokens.typography.fontWeight.bold,
          color: '#ffffff',
          lineHeight: 1.2,
        }}
      >
        {formattedPrice} {symbol}
      </div>

      {/* USD Equivalent Display - always shown as USD since we only support USD */}
      {showUsdEquivalent && (
        <div
          style={{
            fontSize: config.secondarySize,
            fontWeight: designTokens.typography.fontWeight.medium,
            color: 'rgba(255, 255, 255, 0.7)',
            lineHeight: 1.2,
          }}
        >
          ${formattedPrice} USD
        </div>
      )}
    </motion.div>
  );
};

// Specialized pricing components for different contexts
export const ProductStablecoinPricing: React.FC<Omit<StablecoinPricingProps, 'size'>> = (props) => (
  <StablecoinPricing size="lg" {...props} />
);

export const CardStablecoinPricing: React.FC<Omit<StablecoinPricingProps, 'size' | 'layout'>> = (props) => (
  <StablecoinPricing size="md" layout="vertical" {...props} />
);

export const CompactStablecoinPricing: React.FC<Omit<StablecoinPricingProps, 'size' | 'layout'>> = (props) => (
  <StablecoinPricing size="sm" layout="horizontal" {...props} />
);