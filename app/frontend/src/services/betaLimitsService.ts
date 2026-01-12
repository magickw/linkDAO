/**
 * Beta Transaction Limits Service
 * Enforces transaction limits during beta period
 */

// Beta configuration
export const BETA_CONFIG = {
  enabled: true, // Set to false to disable beta limits
  version: '0.1.0-beta',

  // Transaction limits
  maxTransactionWei: BigInt('1000000000000000000'), // 1 ETH
  maxDailyWei: BigInt('5000000000000000000'), // 5 ETH
  warningThresholdWei: BigInt('500000000000000000'), // 0.5 ETH

  // Rate limits
  maxTransactionsPerHour: 10,
  maxTransactionsPerDay: 50,

  // End date (optional - set to null for indefinite beta)
  betaEndDate: null as Date | null,
};

// Storage keys
const STORAGE_KEY_DAILY = 'linkdao_beta_daily_tx';
const STORAGE_KEY_HOURLY = 'linkdao_beta_hourly_tx';

interface DailyTransactionRecord {
  date: string; // YYYY-MM-DD
  totalWei: string;
  count: number;
}

interface HourlyTransactionRecord {
  hour: string; // YYYY-MM-DD-HH
  count: number;
}

/**
 * Check if beta limits are currently active
 */
export const isBetaActive = (): boolean => {
  if (!BETA_CONFIG.enabled) return false;

  if (BETA_CONFIG.betaEndDate) {
    return new Date() < BETA_CONFIG.betaEndDate;
  }

  return true;
};

/**
 * Get current date string (YYYY-MM-DD)
 */
const getCurrentDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Get current hour string (YYYY-MM-DD-HH)
 */
const getCurrentHourString = (): string => {
  const now = new Date();
  return `${now.toISOString().split('T')[0]}-${now.getHours().toString().padStart(2, '0')}`;
};

/**
 * Get daily transaction record
 */
const getDailyRecord = (): DailyTransactionRecord => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_DAILY);
    if (stored) {
      const record = JSON.parse(stored) as DailyTransactionRecord;
      if (record.date === getCurrentDateString()) {
        return record;
      }
    }
  } catch {
    // Ignore errors
  }

  return {
    date: getCurrentDateString(),
    totalWei: '0',
    count: 0,
  };
};

/**
 * Get hourly transaction record
 */
const getHourlyRecord = (): HourlyTransactionRecord => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_HOURLY);
    if (stored) {
      const record = JSON.parse(stored) as HourlyTransactionRecord;
      if (record.hour === getCurrentHourString()) {
        return record;
      }
    }
  } catch {
    // Ignore errors
  }

  return {
    hour: getCurrentHourString(),
    count: 0,
  };
};

/**
 * Save daily transaction record
 */
const saveDailyRecord = (record: DailyTransactionRecord): void => {
  try {
    localStorage.setItem(STORAGE_KEY_DAILY, JSON.stringify(record));
  } catch {
    // Ignore errors
  }
};

/**
 * Save hourly transaction record
 */
const saveHourlyRecord = (record: HourlyTransactionRecord): void => {
  try {
    localStorage.setItem(STORAGE_KEY_HOURLY, JSON.stringify(record));
  } catch {
    // Ignore errors
  }
};

/**
 * Validate transaction against beta limits
 */
export const validateBetaLimits = (
  valueWei: bigint
): {
  allowed: boolean;
  errors: string[];
  warnings: string[];
  limits: {
    maxTransaction: string;
    maxDaily: string;
    remainingDaily: string;
    transactionsToday: number;
    transactionsThisHour: number;
  };
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isBetaActive()) {
    return {
      allowed: true,
      errors: [],
      warnings: [],
      limits: {
        maxTransaction: 'unlimited',
        maxDaily: 'unlimited',
        remainingDaily: 'unlimited',
        transactionsToday: 0,
        transactionsThisHour: 0,
      },
    };
  }

  const dailyRecord = getDailyRecord();
  const hourlyRecord = getHourlyRecord();
  const currentDailyWei = BigInt(dailyRecord.totalWei);

  // Check single transaction limit
  if (valueWei > BETA_CONFIG.maxTransactionWei) {
    errors.push(
      `Transaction exceeds beta limit of ${formatEth(BETA_CONFIG.maxTransactionWei)} ETH`
    );
  }

  // Check daily limit
  const newDailyTotal = currentDailyWei + valueWei;
  if (newDailyTotal > BETA_CONFIG.maxDailyWei) {
    const remaining = BETA_CONFIG.maxDailyWei - currentDailyWei;
    if (remaining <= 0n) {
      errors.push('Daily transaction limit reached. Please try again tomorrow.');
    } else {
      errors.push(
        `Transaction would exceed daily limit. Remaining: ${formatEth(remaining)} ETH`
      );
    }
  }

  // Check hourly rate limit
  if (hourlyRecord.count >= BETA_CONFIG.maxTransactionsPerHour) {
    errors.push(
      `Hourly transaction limit (${BETA_CONFIG.maxTransactionsPerHour}) reached. Please wait.`
    );
  }

  // Check daily rate limit
  if (dailyRecord.count >= BETA_CONFIG.maxTransactionsPerDay) {
    errors.push(
      `Daily transaction limit (${BETA_CONFIG.maxTransactionsPerDay}) reached.`
    );
  }

  // Add warning for large transactions within limit
  if (valueWei > BETA_CONFIG.warningThresholdWei && errors.length === 0) {
    warnings.push(
      `Large transaction (${formatEth(valueWei)} ETH). Please verify all details carefully.`
    );
  }

  // Calculate remaining daily allowance
  const remainingDaily = BETA_CONFIG.maxDailyWei - currentDailyWei;

  return {
    allowed: errors.length === 0,
    errors,
    warnings,
    limits: {
      maxTransaction: formatEth(BETA_CONFIG.maxTransactionWei),
      maxDaily: formatEth(BETA_CONFIG.maxDailyWei),
      remainingDaily: remainingDaily > 0n ? formatEth(remainingDaily) : '0',
      transactionsToday: dailyRecord.count,
      transactionsThisHour: hourlyRecord.count,
    },
  };
};

/**
 * Record a completed transaction
 * Call this after a transaction is successfully submitted
 */
export const recordTransaction = (valueWei: bigint): void => {
  if (!isBetaActive()) return;

  // Update daily record
  const dailyRecord = getDailyRecord();
  dailyRecord.totalWei = (BigInt(dailyRecord.totalWei) + valueWei).toString();
  dailyRecord.count += 1;
  saveDailyRecord(dailyRecord);

  // Update hourly record
  const hourlyRecord = getHourlyRecord();
  hourlyRecord.count += 1;
  saveHourlyRecord(hourlyRecord);
};

/**
 * Get current beta status for display
 */
export const getBetaStatus = (): {
  isActive: boolean;
  version: string;
  limits: {
    maxTransactionEth: string;
    maxDailyEth: string;
    remainingDailyEth: string;
    transactionsToday: number;
    maxTransactionsPerDay: number;
  };
} => {
  const dailyRecord = getDailyRecord();
  const currentDailyWei = BigInt(dailyRecord.totalWei);
  const remainingDaily = BETA_CONFIG.maxDailyWei - currentDailyWei;

  return {
    isActive: isBetaActive(),
    version: BETA_CONFIG.version,
    limits: {
      maxTransactionEth: formatEth(BETA_CONFIG.maxTransactionWei),
      maxDailyEth: formatEth(BETA_CONFIG.maxDailyWei),
      remainingDailyEth: remainingDaily > 0n ? formatEth(remainingDaily) : '0',
      transactionsToday: dailyRecord.count,
      maxTransactionsPerDay: BETA_CONFIG.maxTransactionsPerDay,
    },
  };
};

/**
 * Reset beta limits (for testing/admin)
 */
export const resetBetaLimits = (): void => {
  localStorage.removeItem(STORAGE_KEY_DAILY);
  localStorage.removeItem(STORAGE_KEY_HOURLY);
};

/**
 * Format wei to ETH string
 */
function formatEth(wei: bigint): string {
  const eth = Number(wei) / 1e18;
  return eth.toFixed(eth < 0.01 ? 6 : 4);
}
