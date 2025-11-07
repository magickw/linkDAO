// Utility functions for Marketplace components

/**
 * Format a price value from wei to ETH with 4 decimal places
 */
export const formatPrice = (price: string | number | bigint): string => {
  try {
    if (typeof price === 'bigint') {
      return (Number(price) / 1e18).toFixed(4);
    }
    if (typeof price === 'string') {
      return (parseFloat(price) / 1e18).toFixed(4);
    }
    return (price / 1e18).toFixed(4);
  } catch (error) {
    console.error('Error formatting price:', error);
    return '0.0000';
  }
};

/**
 * Format a date string or Date object to a human-readable format
 */
export const formatDate = (dateString: string | Date): string => {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

/**
 * Truncate an Ethereum address for display
 */
export const truncateAddress = (address: string, start = 6, end = 4): string => {
  if (!address) return '';
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
};

/**
 * Format a token amount with the specified number of decimals
 */
export const formatTokenAmount = (
  amount: string | number | bigint,
  decimals = 18,
  precision = 4
): string => {
  try {
    let num: number;
    if (typeof amount === 'bigint') {
      num = Number(amount);
    } else if (typeof amount === 'string') {
      num = parseFloat(amount);
    } else {
      num = amount;
    }
    return (num / Math.pow(10, decimals)).toFixed(precision);
  } catch (error) {
    console.error('Error formatting token amount:', error);
    return '0.0000';
  }
};

/**
 * Convert a number to a human-readable format (e.g., 1.5K, 2.3M)
 */
export const formatNumber = (num: number): string => {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(2) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }
  return num.toString();
};

/**
 * Format a duration in seconds to a human-readable format (e.g., 1h 30m)
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  if (seconds < 60) parts.push(`${remainingSeconds}s`);

  return parts.join(' ') || '0s';
};

/**
 * Generate a unique ID
 */
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};
