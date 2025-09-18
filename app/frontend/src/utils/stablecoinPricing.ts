import { PaymentToken } from '../types/payment';
import { USDC_MAINNET, USDT_MAINNET, USDC_POLYGON, USDT_POLYGON, USDC_ARBITRUM, USDC_SEPOLIA } from '../config/payment';

/**
 * Stablecoin-first pricing utilities
 * Prioritizes USDC/USDT over volatile cryptocurrencies like ETH
 */

// Default stablecoin preferences by chain
export const DEFAULT_STABLECOINS = {
  1: USDC_MAINNET,     // Ethereum Mainnet
  137: USDC_POLYGON,   // Polygon
  42161: USDC_ARBITRUM, // Arbitrum
  11155111: USDC_SEPOLIA // Sepolia Testnet
};

// All supported stablecoins
export const SUPPORTED_STABLECOINS: PaymentToken[] = [
  USDC_MAINNET,
  USDT_MAINNET,
  USDC_POLYGON,
  USDT_POLYGON,
  USDC_ARBITRUM,
  USDC_SEPOLIA
];

/**
 * Get the preferred stablecoin for a given chain
 */
export function getPreferredStablecoin(chainId: number): PaymentToken | null {
  return DEFAULT_STABLECOINS[chainId as keyof typeof DEFAULT_STABLECOINS] || null;
}

/**
 * Get all stablecoins available on a specific chain
 */
export function getStablecoinsForChain(chainId: number): PaymentToken[] {
  return SUPPORTED_STABLECOINS.filter(token => token.chainId === chainId);
}

/**
 * Check if a token is a stablecoin
 */
export function isStablecoin(token: PaymentToken): boolean {
  const stablecoinSymbols = ['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX'];
  return stablecoinSymbols.includes(token.symbol.toUpperCase());
}

/**
 * Format stablecoin price for display
 */
export function formatStablecoinPrice(amount: string | number, symbol: string = 'USDC'): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return '0.00 ' + symbol;
  
  // For stablecoins, show 2 decimal places for amounts >= 1
  // Show more precision for smaller amounts
  if (numAmount >= 1) {
    return `${numAmount.toFixed(2)} ${symbol}`;
  } else if (numAmount >= 0.01) {
    return `${numAmount.toFixed(4)} ${symbol}`;
  } else {
    return `${numAmount.toFixed(6)} ${symbol}`;
  }
}

/**
 * Convert ETH price to USDC equivalent (approximate)
 */
export function convertEthToUsdc(ethAmount: string | number, ethPriceUsd: number = 2400): string {
  const numEthAmount = typeof ethAmount === 'string' ? parseFloat(ethAmount) : ethAmount;
  const usdcAmount = numEthAmount * ethPriceUsd;
  return usdcAmount.toFixed(2);
}

/**
 * Get pricing display preferences
 */
export interface PricingPreferences {
  primaryToken: PaymentToken;
  showFiatEquivalent: boolean;
  preferStablecoins: boolean;
}

export function getDefaultPricingPreferences(chainId: number): PricingPreferences {
  const preferredStablecoin = getPreferredStablecoin(chainId);
  
  return {
    primaryToken: preferredStablecoin || USDC_MAINNET,
    showFiatEquivalent: true,
    preferStablecoins: true
  };
}

/**
 * Stablecoin pricing benefits for user education
 */
export const STABLECOIN_BENEFITS = {
  'Price Stability': 'Prices remain consistent - no surprise changes due to crypto volatility',
  'Lower Gas Fees': 'USDC on Polygon/Arbitrum costs pennies compared to ETH mainnet',
  'Familiar Pricing': 'Prices in dollars make it easy to understand value',
  'Instant Settlement': 'No waiting for price confirmations or volatility concerns',
  'Global Standard': 'USDC is widely accepted and trusted across DeFi platforms'
};

/**
 * Get gas cost comparison between chains for stablecoin transactions
 */
export const GAS_COST_COMPARISON = {
  ethereum: {
    name: 'Ethereum',
    avgGasCost: '$15-50',
    speed: 'Slow (2-5 min)',
    recommendation: 'Use for large transactions only'
  },
  polygon: {
    name: 'Polygon',
    avgGasCost: '$0.01-0.10',
    speed: 'Fast (2-5 sec)',
    recommendation: 'Best for everyday transactions'
  },
  arbitrum: {
    name: 'Arbitrum',
    avgGasCost: '$0.50-2.00',
    speed: 'Fast (1-2 min)',
    recommendation: 'Good balance of cost and security'
  }
};

/**
 * Suggested pricing tiers for different product categories
 */
export const SUGGESTED_PRICING_TIERS = {
  digital_art: {
    low: '5.00',
    medium: '25.00',
    high: '100.00',
    premium: '500.00'
  },
  physical_goods: {
    low: '10.00',
    medium: '50.00',
    high: '200.00',
    premium: '1000.00'
  },
  services: {
    low: '15.00',
    medium: '75.00',
    high: '300.00',
    premium: '1500.00'
  },
  courses: {
    low: '20.00',
    medium: '100.00',
    high: '500.00',
    premium: '2000.00'
  }
};

/**
 * Get suggested price for a product category
 */
export function getSuggestedPrice(category: keyof typeof SUGGESTED_PRICING_TIERS, tier: 'low' | 'medium' | 'high' | 'premium' = 'medium'): string {
  return SUGGESTED_PRICING_TIERS[category]?.[tier] || '25.00';
}