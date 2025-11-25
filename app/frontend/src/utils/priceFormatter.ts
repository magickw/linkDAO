/**
 * Price Formatting Utilities
 * Ensures consistent price formatting and currency display across all marketplace components
 */

export interface PriceFormatOptions {
  currency: string;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  showSymbol?: boolean;
  showCode?: boolean;
  compact?: boolean;
}

export interface FormattedPrice {
  display: string;
  value: number;
  currency: string;
  symbol: string;
  code: string;
}

// Currency configuration
const CURRENCY_CONFIG = {
  // Fiat currencies
  'USD': { symbol: '$', decimals: 2, name: 'US Dollar' },
  'EUR': { symbol: '€', decimals: 2, name: 'Euro' },
  'GBP': { symbol: '£', decimals: 2, name: 'British Pound' },
  'JPY': { symbol: '¥', decimals: 0, name: 'Japanese Yen' },
  'CAD': { symbol: 'C$', decimals: 2, name: 'Canadian Dollar' },
  'AUD': { symbol: 'A$', decimals: 2, name: 'Australian Dollar' },
  
  // Cryptocurrencies
  'ETH': { symbol: 'Ξ', decimals: 4, name: 'Ethereum' },
  'BTC': { symbol: '₿', decimals: 6, name: 'Bitcoin' },
  'USDC': { symbol: '$', decimals: 2, name: 'USD Coin' },
  'USDT': { symbol: '$', decimals: 2, name: 'Tether' },
  'DAI': { symbol: '$', decimals: 2, name: 'Dai' },
  'MATIC': { symbol: 'MATIC', decimals: 4, name: 'Polygon' },
  'AVAX': { symbol: 'AVAX', decimals: 4, name: 'Avalanche' },
  'SOL': { symbol: 'SOL', decimals: 4, name: 'Solana' },
  'DOT': { symbol: 'DOT', decimals: 4, name: 'Polkadot' },
  'LINK': { symbol: 'LINK', decimals: 4, name: 'Chainlink' },
  
  // DAO tokens
  'LDAO': { symbol: 'LDAO', decimals: 4, name: 'LinkDAO Token' },
  'GOV': { symbol: 'GOV', decimals: 4, name: 'Governance Token' }
} as const;

type SupportedCurrency = keyof typeof CURRENCY_CONFIG;

class PriceFormatter {
  private defaultLocale = 'en-US';
  
  /**
   * Format a price with consistent styling
   */
  formatPrice(
    amount: number | string, 
    currency: string, 
    options: Partial<PriceFormatOptions> = {}
  ): FormattedPrice {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const normalizedCurrency = currency.toUpperCase() as SupportedCurrency;
    
    const config = CURRENCY_CONFIG[normalizedCurrency] || {
      symbol: normalizedCurrency,
      decimals: 2,
      name: normalizedCurrency
    };

    const {
      locale = this.defaultLocale,
      minimumFractionDigits = config.decimals,
      maximumFractionDigits = config.decimals,
      showSymbol = true,
      showCode = false,
      compact = false
    } = options;

    let formattedValue: string;

    if (compact && numericAmount >= 1000) {
      formattedValue = this.formatCompactNumber(numericAmount, locale);
    } else {
      formattedValue = new Intl.NumberFormat(locale, {
        minimumFractionDigits,
        maximumFractionDigits,
      }).format(numericAmount);
    }

    let display = formattedValue;
    
    if (showSymbol && config.symbol) {
      // For crypto currencies, put symbol after the number
      if (this.isCryptoCurrency(normalizedCurrency)) {
        display = `${formattedValue} ${config.symbol}`;
      } else {
        display = `${config.symbol}${formattedValue}`;
      }
    }
    
    if (showCode) {
      display = `${display} ${normalizedCurrency}`;
    }

    return {
      display,
      value: numericAmount,
      currency: normalizedCurrency,
      symbol: config.symbol,
      code: normalizedCurrency
    };
  }

  /**
   * Format dual pricing (crypto + fiat) - simplified for USD only
   */
  formatDualPrice(
    cryptoAmount: number | string,
    cryptoCurrency: string,
    fiatAmount: number | string,
    fiatCurrency: string = 'USD', // Only support USD
    options: {
      layout?: 'horizontal' | 'vertical';
      showBoth?: boolean;
      primaryCurrency?: 'crypto' | 'fiat';
      compact?: boolean;
    } = {}
  ): {
    primary: FormattedPrice;
    secondary: FormattedPrice;
    display: string;
  } {
    const {
      layout = 'horizontal',
      showBoth = true,
      primaryCurrency = 'crypto',
      compact = false
    } = options;

    const cryptoPrice = this.formatPrice(cryptoAmount, cryptoCurrency, { compact });
    const fiatPrice = this.formatPrice(fiatAmount, fiatCurrency, { compact });

    const primary = primaryCurrency === 'crypto' ? cryptoPrice : fiatPrice;
    const secondary = primaryCurrency === 'crypto' ? fiatPrice : cryptoPrice;

    let display: string;
    
    if (!showBoth) {
      display = primary.display;
    } else if (layout === 'vertical') {
      display = `${primary.display}\n${secondary.display}`;
    } else {
      display = `${primary.display} (${secondary.display})`;
    }

    return {
      primary,
      secondary,
      display
    };
  }

  /**
   * Format price range
   */
  formatPriceRange(
    minAmount: number | string,
    maxAmount: number | string,
    currency: string,
    options: Partial<PriceFormatOptions> = {}
  ): string {
    const minPrice = this.formatPrice(minAmount, currency, options);
    const maxPrice = this.formatPrice(maxAmount, currency, options);
    
    return `${minPrice.display} - ${maxPrice.display}`;
  }

  /**
   * Format percentage change
   */
  formatPriceChange(
    currentPrice: number,
    previousPrice: number,
    options: {
      showSign?: boolean;
      showPercentage?: boolean;
      colorCode?: boolean;
    } = {}
  ): {
    value: number;
    percentage: number;
    display: string;
    isPositive: boolean;
    color?: string;
  } {
    const {
      showSign = true,
      showPercentage = true,
      colorCode = false
    } = options;

    const change = currentPrice - previousPrice;
    const percentage = (change / previousPrice) * 100;
    const isPositive = change >= 0;

    let display = '';
    
    if (showSign) {
      display += isPositive ? '+' : '';
    }
    
    display += change.toFixed(2);
    
    if (showPercentage) {
      display += ` (${isPositive ? '+' : ''}${percentage.toFixed(2)}%)`;
    }

    let color: string | undefined;
    if (colorCode) {
      color = isPositive ? '#10B981' : '#EF4444'; // Green for positive, red for negative
    }

    return {
      value: change,
      percentage,
      display,
      isPositive,
      color
    };
  }

  /**
   * Parse price string back to number
   */
  parsePrice(priceString: string, currency: string): number {
    const normalizedCurrency = currency.toUpperCase() as SupportedCurrency;
    const config = CURRENCY_CONFIG[normalizedCurrency];
    
    // Remove currency symbols and spaces
    let cleanString = priceString
      .replace(new RegExp(`[${config?.symbol || ''}]`, 'g'), '')
      .replace(/[,\s]/g, '')
      .trim();

    return parseFloat(cleanString) || 0;
  }

  /**
   * Validate price format
   */
  validatePrice(amount: number | string, currency: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const normalizedCurrency = currency.toUpperCase();

    // Check if amount is a valid number
    if (isNaN(numericAmount) || !isFinite(numericAmount)) {
      errors.push('Invalid price amount');
    }

    // Check if amount is positive
    if (numericAmount < 0) {
      errors.push('Price amount must be positive');
    }

    // Check if currency is supported
    if (!CURRENCY_CONFIG[normalizedCurrency as SupportedCurrency]) {
      errors.push(`Unsupported currency: ${currency}`);
    }

    // Check for reasonable price limits
    if (numericAmount > 1000000000) { // 1 billion
      errors.push('Price amount exceeds maximum limit');
    }

    if (numericAmount > 0 && numericAmount < 0.000001) {
      errors.push('Price amount is too small');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get currency information
   */
  getCurrencyInfo(currency: string): {
    symbol: string;
    decimals: number;
    name: string;
    isCrypto: boolean;
    isSupported: boolean;
  } {
    const normalizedCurrency = currency.toUpperCase() as SupportedCurrency;
    const config = CURRENCY_CONFIG[normalizedCurrency];
    
    if (!config) {
      return {
        symbol: normalizedCurrency,
        decimals: 2,
        name: normalizedCurrency,
        isCrypto: false,
        isSupported: false
      };
    }

    return {
      symbol: config.symbol,
      decimals: config.decimals,
      name: config.name,
      isCrypto: this.isCryptoCurrency(normalizedCurrency),
      isSupported: true
    };
  }

  /**
   * Format compact numbers (1K, 1M, 1B)
   */
  private formatCompactNumber(amount: number, locale: string): string {
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(1)}B`;
    }
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toString();
  }

  /**
   * Check if currency is cryptocurrency
   */
  private isCryptoCurrency(currency: string): boolean {
    const cryptoCurrencies = [
      'ETH', 'BTC', 'USDC', 'USDT', 'DAI', 'MATIC', 'AVAX', 
      'SOL', 'DOT', 'LINK', 'LDAO', 'GOV'
    ];
    return cryptoCurrencies.includes(currency.toUpperCase());
  }

  /**
   * Get supported currencies list
   */
  getSupportedCurrencies(): Array<{
    code: string;
    symbol: string;
    name: string;
    isCrypto: boolean;
  }> {
    return Object.entries(CURRENCY_CONFIG).map(([code, config]) => ({
      code,
      symbol: config.symbol,
      name: config.name,
      isCrypto: this.isCryptoCurrency(code)
    }));
  }

  /**
   * Set default locale
   */
  setDefaultLocale(locale: string): void {
    this.defaultLocale = locale;
  }
}

// Export singleton instance
export const priceFormatter = new PriceFormatter();

// Export utility functions for direct use
export const formatPrice = (amount: number | string, currency: string, options?: Partial<PriceFormatOptions>) =>
  priceFormatter.formatPrice(amount, currency, options);

export const formatDualPrice = (
  cryptoAmount: number | string,
  cryptoCurrency: string,
  fiatAmount: number | string,
  fiatCurrency?: string,
  options?: Parameters<typeof priceFormatter.formatDualPrice>[4]
) => priceFormatter.formatDualPrice(cryptoAmount, cryptoCurrency, fiatAmount, fiatCurrency, options);

export const formatPriceRange = (
  minAmount: number | string,
  maxAmount: number | string,
  currency: string,
  options?: Partial<PriceFormatOptions>
) => priceFormatter.formatPriceRange(minAmount, maxAmount, currency, options);

export const validatePrice = (amount: number | string, currency: string) =>
  priceFormatter.validatePrice(amount, currency);

export const getCurrencyInfo = (currency: string) =>
  priceFormatter.getCurrencyInfo(currency);

export default priceFormatter;