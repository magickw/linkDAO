/**
 * Rate Limiter Service
 * Provides rate limiting for sensitive operations like password attempts
 */

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
  decayAfterMs?: number;
}

export interface RateLimitState {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
  blockedUntil: number | null;
  isBlocked: boolean;
}

export class RateLimiter {
  private static instance: RateLimiter;
  private limits: Map<string, RateLimitConfig> = new Map();
  private states: Map<string, RateLimitState> = new Map();

  private constructor() {
    // Default configurations
    this.limits.set('password', {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
      blockDurationMs: 30 * 60 * 1000, // 30 minutes
      decayAfterMs: 5 * 60 * 1000 // 5 minutes
    });

    this.limits.set('login', {
      maxAttempts: 10,
      windowMs: 60 * 60 * 1000, // 1 hour
      blockDurationMs: 60 * 60 * 1000, // 1 hour
      decayAfterMs: 10 * 60 * 1000 // 10 minutes
    });

    this.limits.set('transaction', {
      maxAttempts: 3,
      windowMs: 5 * 60 * 1000, // 5 minutes
      blockDurationMs: 15 * 60 * 1000, // 15 minutes
      decayAfterMs: 2 * 60 * 1000 // 2 minutes
    });

    this.limits.set('api', {
      maxAttempts: 100,
      windowMs: 60 * 1000, // 1 minute
      blockDurationMs: 5 * 60 * 1000, // 5 minutes
      decayAfterMs: 30 * 1000 // 30 seconds
    });

    // Load states from localStorage
    this.loadStates();

    // Clean up expired states periodically
    setInterval(() => this.cleanupExpiredStates(), 60 * 1000); // Every minute
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  /**
   * Check if action is allowed
   */
  isAllowed(identifier: string, type: string): { allowed: boolean; remainingAttempts?: number; blockedUntil?: number } {
    const key = `${type}:${identifier}`;
    const config = this.limits.get(type);

    if (!config) {
      return { allowed: true };
    }

    const state = this.getState(key);
    const now = Date.now();

    // Check if blocked
    if (state.blockedUntil && state.blockedUntil > now) {
      return {
        allowed: false,
        blockedUntil: state.blockedUntil
      };
    }

    // Check if window has expired
    const windowExpired = now - state.firstAttempt > config.windowMs;
    if (windowExpired) {
      this.resetState(key);
      return { allowed: true, remainingAttempts: config.maxAttempts };
    }

    // Apply decay if configured
    if (config.decayAfterMs && now - state.lastAttempt > config.decayAfterMs) {
      const decayFactor = Math.floor((now - state.lastAttempt) / config.decayAfterMs);
      state.attempts = Math.max(0, state.attempts - decayFactor);
      this.saveState(key, state);
    }

    // Check if max attempts reached
    const remainingAttempts = config.maxAttempts - state.attempts;
    if (remainingAttempts <= 0) {
      // Block the identifier
      state.blockedUntil = now + config.blockDurationMs;
      state.isBlocked = true;
      this.saveState(key, state);

      return {
        allowed: false,
        blockedUntil: state.blockedUntil
      };
    }

    return {
      allowed: true,
      remainingAttempts
    };
  }

  /**
   * Record an attempt
   */
  recordAttempt(identifier: string, type: string, success: boolean = false): void {
    const key = `${type}:${identifier}`;
    const config = this.limits.get(type);

    if (!config) {
      return;
    }

    const state = this.getState(key);
    const now = Date.now();

    if (success) {
      // Reset on successful attempt
      this.resetState(key);
    } else {
      // Increment attempts
      state.attempts++;
      state.lastAttempt = now;

      // Check if should be blocked
      if (state.attempts >= config.maxAttempts) {
        state.blockedUntil = now + config.blockDurationMs;
        state.isBlocked = true;
      }

      this.saveState(key, state);
    }
  }

  /**
   * Get current state
   */
  getState(identifier: string): RateLimitState {
    if (!this.states.has(identifier)) {
      this.states.set(identifier, {
        attempts: 0,
        firstAttempt: Date.now(),
        lastAttempt: Date.now(),
        blockedUntil: null,
        isBlocked: false
      });
    }
    return { ...this.states.get(identifier)! };
  }

  /**
   * Reset state for identifier
   */
  resetState(identifier: string): void {
    this.states.delete(identifier);
    localStorage.removeItem(`rate_limit_${identifier}`);
  }

  /**
   * Reset all states
   */
  resetAllStates(): void {
    this.states.clear();
    this.saveStates();
  }

  /**
   * Get remaining attempts
   */
  getRemainingAttempts(identifier: string, type: string): number {
    const key = `${type}:${identifier}`;
    const config = this.limits.get(type);

    if (!config) {
      return Infinity;
    }

    const state = this.getState(key);
    const now = Date.now();

    // Check if blocked
    if (state.blockedUntil && state.blockedUntil > now) {
      return 0;
    }

    // Check if window has expired
    if (now - state.firstAttempt > config.windowMs) {
      return config.maxAttempts;
    }

    return Math.max(0, config.maxAttempts - state.attempts);
  }

  /**
   * Get time until unblocked
   */
  getTimeUntilUnblocked(identifier: string, type: string): number | null {
    const key = `${type}:${identifier}`;
    const state = this.getState(key);

    if (!state.blockedUntil) {
      return null;
    }

    const now = Date.now();
    const remaining = state.blockedUntil - now;

    return remaining > 0 ? remaining : null;
  }

  /**
   * Check if blocked
   */
  isBlocked(identifier: string, type: string): boolean {
    const key = `${type}:${identifier}`;
    const state = this.getState(key);
    const now = Date.now();

    if (!state.blockedUntil) {
      return false;
    }

    if (state.blockedUntil <= now) {
      // Unblock if time has passed
      state.blockedUntil = null;
      state.isBlocked = false;
      this.saveState(key, state);
      return false;
    }

    return true;
  }

  /**
   * Add custom rate limit configuration
   */
  addLimit(type: string, config: RateLimitConfig): void {
    this.limits.set(type, config);
  }

  /**
   * Remove rate limit configuration
   */
  removeLimit(type: string): void {
    this.limits.delete(type);
  }

  /**
   * Get configuration
   */
  getConfig(type: string): RateLimitConfig | undefined {
    return this.limits.get(type);
  }

  /**
   * Save state to localStorage
   */
  private saveState(key: string, state: RateLimitState): void {
    this.states.set(key, state);
    try {
      localStorage.setItem(`rate_limit_${key}`, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save rate limit state:', error);
    }
  }

  /**
   * Save all states to localStorage
   */
  private saveStates(): void {
    try {
      const data = JSON.stringify(Array.from(this.states.entries()));
      localStorage.setItem('rate_limit_states', data);
    } catch (error) {
      console.error('Failed to save rate limit states:', error);
    }
  }

  /**
   * Load states from localStorage
   */
  private loadStates(): void {
    try {
      const data = localStorage.getItem('rate_limit_states');
      if (data) {
        const entries = JSON.parse(data);
        this.states = new Map(entries);
      }
    } catch (error) {
      console.error('Failed to load rate limit states:', error);
    }
  }

  /**
   * Clean up expired states
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, state] of this.states.entries()) {
      const config = this.limits.get(key.split(':')[0]);
      
      if (!config) {
        keysToDelete.push(key);
        continue;
      }

      // Delete if window expired and not blocked
      if (!state.blockedUntil && now - state.firstAttempt > config.windowMs) {
        keysToDelete.push(key);
      }

      // Delete if block expired
      if (state.blockedUntil && state.blockedUntil <= now) {
        state.blockedUntil = null;
        state.isBlocked = false;
        state.attempts = 0;
        this.saveState(key, state);
      }
    }

    // Delete expired states
    keysToDelete.forEach(key => {
      this.states.delete(key);
      localStorage.removeItem(`rate_limit_${key}`);
    });

    if (keysToDelete.length > 0) {
      this.saveStates();
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalStates: number;
    blockedStates: number;
    byType: Record<string, number>;
  } {
    const byType: Record<string, number> = {};
    let blockedStates = 0;

    for (const [key, state] of this.states.entries()) {
      const type = key.split(':')[0];
      byType[type] = (byType[type] || 0) + 1;

      if (state.isBlocked) {
        blockedStates++;
      }
    }

    return {
      totalStates: this.states.size,
      blockedStates,
      byType
    };
  }
}

// Export singleton instance
export const rateLimiter = RateLimiter.getInstance();
