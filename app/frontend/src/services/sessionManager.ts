/**
 * Session Manager Service
 * Handles session timeout, auto-lock, and session security
 */

export interface SessionConfig {
  timeoutMinutes: number;
  warningSeconds: number;
  lockOnInactivity: boolean;
  lockOnTabBlur: boolean;
  requireReauth: boolean;
}

export interface SessionState {
  isActive: boolean;
  lastActivity: number;
  warningShown: boolean;
  lockedAt: number | null;
}

export type SessionEvent = 'activity' | 'warning' | 'lock' | 'unlock' | 'expire';

export class SessionManager {
  private static instance: SessionManager;
  private config: SessionConfig;
  private state: SessionState;
  private timeoutId: NodeJS.Timeout | null = null;
  private warningTimeoutId: NodeJS.Timeout | null = null;
  private listeners: Map<SessionEvent, Set<Function>> = new Map();

  private constructor() {
    this.config = {
      timeoutMinutes: 15, // 15 minutes default
      warningSeconds: 60, // 1 minute warning
      lockOnInactivity: true,
      lockOnTabBlur: false,
      requireReauth: true
    };

    this.state = {
      isActive: true,
      lastActivity: Date.now(),
      warningShown: false,
      lockedAt: null
    };

    this.initializeEventListeners();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Initialize event listeners for activity tracking
   */
  private initializeEventListeners(): void {
    if (typeof window === 'undefined') return;

    // Track user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
      document.addEventListener(event, this.handleActivity.bind(this), { passive: true });
    });

    // Track visibility change
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // Track before unload
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
  }

  /**
   * Handle user activity
   */
  private handleActivity(): void {
    if (!this.state.isActive) return;

    this.state.lastActivity = Date.now();
    this.resetTimeouts();
  }

  /**
   * Handle visibility change
   */
  private handleVisibilityChange(): void {
    if (document.visibilityState === 'hidden' && this.config.lockOnTabBlur) {
      this.lock();
    }
  }

  /**
   * Handle before unload
   */
  private handleBeforeUnload(): void {
    this.clearTimeouts();
  }

  /**
   * Reset all timeouts
   */
  private resetTimeouts(): void {
    this.clearTimeouts();

    if (!this.state.isActive) return;

    const timeoutMs = this.config.timeoutMinutes * 60 * 1000;
    const warningMs = timeoutMs - (this.config.warningSeconds * 1000);

    // Set warning timeout
    if (warningMs > 0) {
      this.warningTimeoutId = setTimeout(() => {
        this.showWarning();
      }, warningMs);
    }

    // Set lock timeout
    this.timeoutId = setTimeout(() => {
      this.lock();
    }, timeoutMs);
  }

  /**
   * Clear all timeouts
   */
  private clearTimeouts(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.warningTimeoutId) {
      clearTimeout(this.warningTimeoutId);
      this.warningTimeoutId = null;
    }
  }

  /**
   * Show timeout warning
   */
  private showWarning(): void {
    if (this.state.warningShown) return;

    this.state.warningShown = true;
    this.emit('warning', {
      timeRemaining: this.config.warningSeconds
    });
  }

  /**
   * Lock the session
   */
  private lock(): void {
    if (!this.state.isActive) return;

    this.state.isActive = false;
    this.state.lockedAt = Date.now();
    this.clearTimeouts();
    this.emit('lock', {
      lockedAt: this.state.lockedAt,
      reason: 'timeout'
    });
  }

  /**
   * Unlock the session
   */
  unlock(): void {
    if (this.state.isActive) return;

    const wasLocked = this.state.lockedAt;
    this.state.isActive = true;
    this.state.warningShown = false;
    this.state.lockedAt = null;
    this.state.lastActivity = Date.now();

    this.resetTimeouts();
    this.emit('unlock', {
      unlockedAt: Date.now(),
      wasLocked: wasLocked,
      reason: 'user_action'
    });
  }

  /**
   * Force lock the session
   */
  forceLock(reason: string = 'manual'): void {
    this.lock();
    this.emit('lock', {
      lockedAt: this.state.lockedAt,
      reason
    });
  }

  /**
   * Check if session is active
   */
  isSessionActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Get session state
   */
  getSessionState(): SessionState {
    return { ...this.state };
  }

  /**
   * Get time until lock
   */
  getTimeUntilLock(): number {
    if (!this.state.isActive) return 0;

    const timeoutMs = this.config.timeoutMinutes * 60 * 1000;
    const elapsedMs = Date.now() - this.state.lastActivity;
    return Math.max(0, timeoutMs - elapsedMs);
  }

  /**
   * Get time until warning
   */
  getTimeUntilWarning(): number {
    if (!this.state.isActive || this.state.warningShown) return 0;

    const timeoutMs = this.config.timeoutMinutes * 60 * 1000;
    const warningMs = timeoutMs - (this.config.warningSeconds * 1000);
    const elapsedMs = Date.now() - this.state.lastActivity;
    return Math.max(0, warningMs - elapsedMs);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...config };
    this.resetTimeouts();
  }

  /**
   * Get configuration
   */
  getConfig(): SessionConfig {
    return { ...this.config };
  }

  /**
   * Add event listener
   */
  on(event: SessionEvent, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off(event: SessionEvent, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * Emit event
   */
  private emit(event: SessionEvent, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in session event listener (${event}):`, error);
        }
      });
    }
  }

  /**
   * Start session monitoring
   */
  start(): void {
    this.state.isActive = true;
    this.state.lastActivity = Date.now();
    this.resetTimeouts();
  }

  /**
   * Stop session monitoring
   */
  stop(): void {
    this.clearTimeouts();
    this.state.isActive = false;
  }

  /**
   * Reset session
   */
  reset(): void {
    this.stop();
    this.start();
  }

  /**
   * Get session duration
   */
  getSessionDuration(): number {
    if (!this.state.lockedAt) return 0;
    return Date.now() - this.state.lockedAt;
  }

  /**
   * Check if re-authentication is required
   */
  isReauthRequired(): boolean {
    return this.config.requireReauth && !this.state.isActive;
  }

  /**
   * Extend session
   */
  extendSession(): void {
    this.state.lastActivity = Date.now();
    this.state.warningShown = false;
    this.resetTimeouts();
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();
