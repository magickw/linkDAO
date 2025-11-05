import { Transaction } from '../types/wallet';

/**
 * Normalize transaction data to ensure timestamps are proper Date objects
 */
export function normalizeTransaction(transaction: any): Transaction {
  return {
    ...transaction,
    timestamp: normalizeTimestamp(transaction.timestamp)
  };
}

/**
 * Normalize an array of transactions
 */
export function normalizeTransactions(transactions: any[]): Transaction[] {
  return transactions.map(normalizeTransaction);
}

/**
 * Normalize timestamp to ensure it's a proper Date object
 */
export function normalizeTimestamp(timestamp: any): Date {
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? new Date() : date;
  }
  
  if (typeof timestamp === 'number') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? new Date() : date;
  }
  
  // Fallback for invalid timestamps
  return new Date();
}

/**
 * Format timestamp for display
 */
export function formatTimeAgo(timestamp: Date | string | number): string {
  const now = new Date();
  const date = normalizeTimestamp(timestamp);
  
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}