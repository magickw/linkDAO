/**
 * Rate Limiter for Password Attempts
 * Prevents brute-force attacks by limiting failed authentication attempts
 */

interface RateLimitEntry {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

const STORAGE_KEY = 'linkdao_rate_limit';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes window for counting attempts

class RateLimiter {
  private static instance: RateLimiter;

  private constructor() {}

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  /**
   * Get rate limit data for an address
   */
  private getEntry(address: string): RateLimitEntry {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${address.toLowerCase()}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse errors
    }
    return {
      attempts: 0,
      firstAttemptAt: 0,
      lockedUntil: null,
    };
  }

  /**
   * Save rate limit data for an address
   */
  private saveEntry(address: string, entry: RateLimitEntry): void {
    try {
      localStorage.setItem(
        `${STORAGE_KEY}_${address.toLowerCase()}`,
        JSON.stringify(entry)
      );
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Check if an address is currently locked out
   */
  isLocked(address: string): { locked: boolean; remainingMs: number } {
    const entry = this.getEntry(address);
    const now = Date.now();

    if (entry.lockedUntil && entry.lockedUntil > now) {
      return {
        locked: true,
        remainingMs: entry.lockedUntil - now,
      };
    }

    // Clear lockout if expired
    if (entry.lockedUntil && entry.lockedUntil <= now) {
      this.reset(address);
    }

    return { locked: false, remainingMs: 0 };
  }

  /**
   * Get formatted remaining lockout time
   */
  getRemainingLockoutTime(address: string): string {
    const { locked, remainingMs } = this.isLocked(address);
    if (!locked) return '';

    const minutes = Math.ceil(remainingMs / 60000);
    if (minutes > 1) {
      return `${minutes} minutes`;
    }
    const seconds = Math.ceil(remainingMs / 1000);
    return `${seconds} seconds`;
  }

  /**
   * Record a failed attempt
   * Returns true if account is now locked
   */
  recordFailedAttempt(address: string): {
    locked: boolean;
    attemptsRemaining: number;
    lockoutDuration?: string;
  } {
    const now = Date.now();
    let entry = this.getEntry(address);

    // Check if we're currently locked
    if (entry.lockedUntil && entry.lockedUntil > now) {
      return {
        locked: true,
        attemptsRemaining: 0,
        lockoutDuration: this.getRemainingLockoutTime(address),
      };
    }

    // Reset if attempt window has passed
    if (entry.firstAttemptAt && now - entry.firstAttemptAt > ATTEMPT_WINDOW_MS) {
      entry = {
        attempts: 0,
        firstAttemptAt: 0,
        lockedUntil: null,
      };
    }

    // Record the attempt
    if (entry.attempts === 0) {
      entry.firstAttemptAt = now;
    }
    entry.attempts += 1;

    // Check if we should lock
    if (entry.attempts >= MAX_ATTEMPTS) {
      entry.lockedUntil = now + LOCKOUT_DURATION_MS;
      this.saveEntry(address, entry);
      return {
        locked: true,
        attemptsRemaining: 0,
        lockoutDuration: '15 minutes',
      };
    }

    this.saveEntry(address, entry);
    return {
      locked: false,
      attemptsRemaining: MAX_ATTEMPTS - entry.attempts,
    };
  }

  /**
   * Record a successful attempt (reset the counter)
   */
  recordSuccessfulAttempt(address: string): void {
    this.reset(address);
  }

  /**
   * Reset rate limit for an address
   */
  reset(address: string): void {
    try {
      localStorage.removeItem(`${STORAGE_KEY}_${address.toLowerCase()}`);
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Get current attempt count
   */
  getAttemptCount(address: string): number {
    const entry = this.getEntry(address);
    const now = Date.now();

    // Reset if window has passed
    if (entry.firstAttemptAt && now - entry.firstAttemptAt > ATTEMPT_WINDOW_MS) {
      return 0;
    }

    return entry.attempts;
  }

  /**
   * Clear all rate limit data (for testing/admin)
   */
  clearAll(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }
}

// Export singleton instance
export const rateLimiter = RateLimiter.getInstance();

// Export utility functions
export const isAddressLocked = (address: string) => rateLimiter.isLocked(address);
export const recordFailedAttempt = (address: string) => rateLimiter.recordFailedAttempt(address);
export const recordSuccessfulAttempt = (address: string) => rateLimiter.recordSuccessfulAttempt(address);
export const getRemainingLockoutTime = (address: string) => rateLimiter.getRemainingLockoutTime(address);
