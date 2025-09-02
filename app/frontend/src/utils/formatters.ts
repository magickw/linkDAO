/**
 * Format currency values with proper symbols and decimals
 */
export const formatCurrency = (
  value: number | string,
  currency: string = 'USD',
  options: Intl.NumberFormatOptions = {}
): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '$0.00';

  // Handle crypto currencies
  if (currency === 'ETH') {
    return `${numValue.toFixed(4)} ETH`;
  }
  
  if (currency === 'USDC' || currency === 'USDT') {
    return `${numValue.toFixed(2)} ${currency}`;
  }

  // Handle fiat currencies
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  };

  try {
    return new Intl.NumberFormat('en-US', defaultOptions).format(numValue);
  } catch (error) {
    // Fallback for unsupported currencies
    return `${currency} ${numValue.toFixed(2)}`;
  }
};

/**
 * Format large numbers with appropriate suffixes (K, M, B)
 */
export const formatNumber = (
  value: number | string,
  options: {
    decimals?: number;
    compact?: boolean;
    notation?: 'standard' | 'scientific' | 'engineering' | 'compact';
  } = {}
): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '0';

  const { decimals = 1, compact = true, notation = 'compact' } = options;

  if (compact && Math.abs(numValue) >= 1000) {
    try {
      return new Intl.NumberFormat('en-US', {
        notation,
        compactDisplay: 'short',
        maximumFractionDigits: decimals
      }).format(numValue);
    } catch (error) {
      // Fallback for older browsers
      if (Math.abs(numValue) >= 1e9) {
        return `${(numValue / 1e9).toFixed(decimals)}B`;
      } else if (Math.abs(numValue) >= 1e6) {
        return `${(numValue / 1e6).toFixed(decimals)}M`;
      } else if (Math.abs(numValue) >= 1e3) {
        return `${(numValue / 1e3).toFixed(decimals)}K`;
      }
    }
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimals
  }).format(numValue);
};

/**
 * Format percentage values
 */
export const formatPercentage = (
  value: number | string,
  options: {
    decimals?: number;
    showSign?: boolean;
  } = {}
): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '0%';

  const { decimals = 1, showSign = false } = options;
  const sign = showSign && numValue > 0 ? '+' : '';
  
  return `${sign}${numValue.toFixed(decimals)}%`;
};

/**
 * Format time durations in human-readable format
 */
export const formatDuration = (
  milliseconds: number,
  options: {
    format?: 'short' | 'long';
    maxUnits?: number;
  } = {}
): string => {
  const { format = 'short', maxUnits = 2 } = options;
  
  if (milliseconds < 1000) {
    return format === 'short' ? `${milliseconds}ms` : `${milliseconds} milliseconds`;
  }

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const units = [];

  if (days > 0) {
    units.push(format === 'short' ? `${days}d` : `${days} day${days !== 1 ? 's' : ''}`);
  }
  if (hours % 24 > 0) {
    units.push(format === 'short' ? `${hours % 24}h` : `${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`);
  }
  if (minutes % 60 > 0) {
    units.push(format === 'short' ? `${minutes % 60}m` : `${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`);
  }
  if (seconds % 60 > 0 && units.length < maxUnits) {
    units.push(format === 'short' ? `${seconds % 60}s` : `${seconds % 60} second${seconds % 60 !== 1 ? 's' : ''}`);
  }

  return units.slice(0, maxUnits).join(' ');
};

/**
 * Format dates in various formats
 */
export const formatDate = (
  date: Date | string | number,
  options: {
    format?: 'short' | 'medium' | 'long' | 'relative';
    includeTime?: boolean;
    timezone?: string;
  } = {}
): string => {
  const { format = 'medium', includeTime = false, timezone } = options;
  
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) return 'Invalid Date';

  if (format === 'relative') {
    return formatRelativeTime(dateObj);
  }

  const formatOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone
  };

  switch (format) {
    case 'short':
      formatOptions.dateStyle = 'short';
      break;
    case 'medium':
      formatOptions.dateStyle = 'medium';
      break;
    case 'long':
      formatOptions.dateStyle = 'long';
      break;
  }

  if (includeTime) {
    formatOptions.timeStyle = 'short';
  }

  return new Intl.DateTimeFormat('en-US', formatOptions).format(dateObj);
};

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export const formatRelativeTime = (date: Date | string | number): string => {
  const dateObj = new Date(date);
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (Math.abs(diffSeconds) < 60) {
    return 'just now';
  } else if (Math.abs(diffMinutes) < 60) {
    return diffMinutes > 0 ? `in ${diffMinutes}m` : `${Math.abs(diffMinutes)}m ago`;
  } else if (Math.abs(diffHours) < 24) {
    return diffHours > 0 ? `in ${diffHours}h` : `${Math.abs(diffHours)}h ago`;
  } else if (Math.abs(diffDays) < 7) {
    return diffDays > 0 ? `in ${diffDays}d` : `${Math.abs(diffDays)}d ago`;
  } else {
    return formatDate(dateObj, { format: 'short' });
  }
};

/**
 * Format file sizes in human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Format blockchain addresses with ellipsis
 */
export const formatAddress = (
  address: string,
  options: {
    startChars?: number;
    endChars?: number;
    separator?: string;
  } = {}
): string => {
  const { startChars = 6, endChars = 4, separator = '...' } = options;
  
  if (!address || address.length <= startChars + endChars) {
    return address;
  }

  return `${address.slice(0, startChars)}${separator}${address.slice(-endChars)}`;
};

/**
 * Format transaction hashes
 */
export const formatTxHash = (hash: string): string => {
  return formatAddress(hash, { startChars: 8, endChars: 6 });
};

/**
 * Format gas values
 */
export const formatGas = (gas: number | string): string => {
  const numGas = typeof gas === 'string' ? parseFloat(gas) : gas;
  
  if (isNaN(numGas)) return '0';

  if (numGas >= 1e6) {
    return `${(numGas / 1e6).toFixed(2)}M`;
  } else if (numGas >= 1e3) {
    return `${(numGas / 1e3).toFixed(1)}K`;
  }

  return numGas.toString();
};

/**
 * Format Wei to Ether
 */
export const formatWeiToEther = (wei: string | number, decimals: number = 4): string => {
  const weiValue = typeof wei === 'string' ? BigInt(wei) : BigInt(Math.floor(wei));
  const etherValue = Number(weiValue) / 1e18;
  
  return etherValue.toFixed(decimals);
};

/**
 * Format growth rates with appropriate colors and icons
 */
export const formatGrowthRate = (
  current: number,
  previous: number,
  options: {
    asPercentage?: boolean;
    showIcon?: boolean;
    decimals?: number;
  } = {}
): {
  value: string;
  trend: 'up' | 'down' | 'neutral';
  color: string;
  icon?: string;
} => {
  const { asPercentage = true, showIcon = true, decimals = 1 } = options;
  
  if (previous === 0) {
    return {
      value: asPercentage ? '0%' : '0',
      trend: 'neutral',
      color: 'text-gray-400',
      icon: showIcon ? '→' : undefined
    };
  }

  const change = current - previous;
  const changePercent = (change / previous) * 100;
  
  const value = asPercentage 
    ? `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(decimals)}%`
    : `${change >= 0 ? '+' : ''}${change.toFixed(decimals)}`;

  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
  
  const color = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-gray-400'
  }[trend];

  const icon = showIcon ? {
    up: '↗',
    down: '↘',
    neutral: '→'
  }[trend] : undefined;

  return { value, trend, color, icon };
};

/**
 * Sanitize and format user input for display
 */
export const sanitizeText = (text: string, maxLength?: number): string => {
  let sanitized = text
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();

  if (maxLength && sanitized.length > maxLength) {
    sanitized = `${sanitized.slice(0, maxLength)}...`;
  }

  return sanitized;
};

/**
 * Format API response times
 */
export const formatResponseTime = (ms: number): string => {
  if (ms < 1000) {
    return `${ms}ms`;
  } else {
    return `${(ms / 1000).toFixed(2)}s`;
  }
};

/**
 * Format error rates
 */
export const formatErrorRate = (rate: number): string => {
  if (rate < 0.01) {
    return '<0.01%';
  }
  return `${rate.toFixed(2)}%`;
};