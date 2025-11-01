import { logger } from '../utils/logger';

// User experience metrics interfaces
interface UserSessionMetrics {
  sessionId: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  pageViews: number;
  interactions: number;
  errors: number;
  slowLoads: number;
  bounced: boolean;
  converted: boolean;
  userAgent: string;
  device: 'mobile' | 'tablet' | 'desktop';
  lastActivity: Date;
}

interface PageLoadMetrics {
  sessionId: string;
  page: string;
  loadTime: number;
  timeToFirstByte: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  timestamp: Date;
}

interface UserInteractionMetrics {
  sessionId: string;
  type: 'click' | 'scroll' | 'form_submit' | 'search' | 'navigation' | 'error';
  element?: string;
  page: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface ErrorMetrics {
  sessionId: string;
  type: 'javascript' | 'network' | 'api' | 'validation';
  message: string;
  stack?: string;
  page: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved?: boolean;
}

interface ConversionMetrics {
  sessionId: string;
  userId?: string;
  type: 'signup' | 'purchase' | 'listing_created' | 'profile_completed' | 'community_joined';
  value?: number;
  timestamp: Date;
  funnel: string[];
  metadata?: Record<string, any>;
}

interface UXHealthMetrics {
  averagePageLoadTime: number;
  averageSessionDuration: number;
  bounceRate: number;
  errorRate: number;
  conversionRate: number;
  userSatisfactionScore: number;
  coreWebVitals: {
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
  };
  timestamp: Date;
}

interface UXAlert {
  id: string;
  type: 'high_bounce_rate' | 'slow_page_loads' | 'high_error_rate' | 'poor_core_web_vitals' | 'low_conversion_rate';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  metadata: Record<string, any>;
  resolved?: Date;
}

class UserExperienceMetricsService {
  private sessions: Map<string, UserSessionMetrics> = new Map();
  private pageLoads: PageLoadMetrics[] = [];
  private interactions: UserInteractionMetrics[] = [];
  private errors: ErrorMetrics[] = [];
  private conversions: ConversionMetrics[] = [];
  private alerts: UXAlert[] = [];
  
  private readonly THRESHOLDS = {
    SLOW_PAGE_LOAD: 3000, // 3 seconds
    VERY_SLOW_PAGE_LOAD: 5000, // 5 seconds
    HIGH_BOUNCE_RATE: 70, // 70%
    HIGH_ERROR_RATE: 5, // 5%
    LOW_CONVERSION_RATE: 1, // 1%
    POOR_LCP: 2500, // 2.5 seconds
    POOR_FID: 100, // 100ms
    POOR_CLS: 0.1, // 0.1
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    MAX_HISTORY_SIZE: 10000
  };

  // Start a new user session
  startSession(sessionId: string, userAgent: string, userId?: string): void {
    const device = this.detectDevice(userAgent);
    
    const session: UserSessionMetrics = {
      sessionId,
      userId,
      startTime: new Date(),
      pageViews: 0,
      interactions: 0,
      errors: 0,
      slowLoads: 0,
      bounced: false,
      converted: false,
      userAgent,
      device,
      lastActivity: new Date()
    };

    this.sessions.set(sessionId, session);
    
    logger.debug('User session started', {
      sessionId,
      userId,
      device,
      userAgent: userAgent.substring(0, 100)
    });
  }

  // End a user session
  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const now = new Date();
    session.endTime = now;
    session.duration = now.getTime() - session.startTime.getTime();
    
    // Determine if session bounced (single page view, short duration)
    session.bounced = session.pageViews <= 1 && session.duration < 30000; // Less than 30 seconds

    logger.debug('User session ended', {
      sessionId: session.sessionId,
      duration: session.duration,
      pageViews: session.pageViews,
      interactions: session.interactions,
      bounced: session.bounced,
      converted: session.converted
    });

    // Remove from active sessions
    this.sessions.delete(sessionId);
  }

  // Record page load metrics
  recordPageLoad(metrics: Omit<PageLoadMetrics, 'timestamp'>): void {
    const pageLoadMetrics: PageLoadMetrics = {
      ...metrics,
      timestamp: new Date()
    };

    this.pageLoads.push(pageLoadMetrics);
    
    // Update session metrics
    const session = this.sessions.get(metrics.sessionId);
    if (session) {
      session.pageViews++;
      session.lastActivity = new Date();
      
      if (metrics.loadTime > this.THRESHOLDS.SLOW_PAGE_LOAD) {
        session.slowLoads++;
      }
    }

    // Check for performance alerts
    this.checkPageLoadAlerts(pageLoadMetrics);

    // Trim history
    this.trimHistory();

    logger.debug('Page load recorded', {
      sessionId: metrics.sessionId,
      page: metrics.page,
      loadTime: metrics.loadTime,
      lcp: metrics.largestContentfulPaint,
      fid: metrics.firstInputDelay,
      cls: metrics.cumulativeLayoutShift
    });
  }

  // Record user interaction
  recordInteraction(interaction: Omit<UserInteractionMetrics, 'timestamp'>): void {
    const interactionMetrics: UserInteractionMetrics = {
      ...interaction,
      timestamp: new Date()
    };

    this.interactions.push(interactionMetrics);
    
    // Update session metrics
    const session = this.sessions.get(interaction.sessionId);
    if (session) {
      session.interactions++;
      session.lastActivity = new Date();
    }

    // Trim history
    this.trimHistory();

    logger.debug('User interaction recorded', {
      sessionId: interaction.sessionId,
      type: interaction.type,
      page: interaction.page,
      element: interaction.element
    });
  }

  // Record error
  recordError(error: Omit<ErrorMetrics, 'timestamp'>): void {
    const errorMetrics: ErrorMetrics = {
      ...error,
      timestamp: new Date()
    };

    this.errors.push(errorMetrics);
    
    // Update session metrics
    const session = this.sessions.get(error.sessionId);
    if (session) {
      session.errors++;
      session.lastActivity = new Date();
    }

    // Check for error rate alerts
    this.checkErrorAlerts(errorMetrics);

    // Trim history
    this.trimHistory();

    const logLevel = error.severity === 'critical' ? 'error' : error.severity === 'high' ? 'warn' : 'info';
    logger[logLevel]('User experience error recorded', {
      sessionId: error.sessionId,
      type: error.type,
      message: error.message,
      page: error.page,
      severity: error.severity
    });
  }

  // Record conversion
  recordConversion(conversion: Omit<ConversionMetrics, 'timestamp'>): void {
    const conversionMetrics: ConversionMetrics = {
      ...conversion,
      timestamp: new Date()
    };

    this.conversions.push(conversionMetrics);
    
    // Update session metrics
    const session = this.sessions.get(conversion.sessionId);
    if (session) {
      session.converted = true;
      session.lastActivity = new Date();
    }

    // Trim history
    this.trimHistory();

    logger.info('Conversion recorded', {
      sessionId: conversion.sessionId,
      userId: conversion.userId,
      type: conversion.type,
      value: conversion.value
    });
  }

  // Detect device type from user agent
  private detectDevice(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'mobile';
    }
    
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    }
    
    return 'desktop';
  }

  // Check for page load performance alerts
  private checkPageLoadAlerts(metrics: PageLoadMetrics): void {
    const alerts: UXAlert[] = [];

    // Check for slow page loads
    if (metrics.loadTime > this.THRESHOLDS.VERY_SLOW_PAGE_LOAD) {
      alerts.push({
        id: `slow_load_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'slow_page_loads',
        message: `Very slow page load: ${metrics.page} took ${metrics.loadTime}ms`,
        severity: 'high',
        timestamp: new Date(),
        metadata: {
          page: metrics.page,
          loadTime: metrics.loadTime,
          sessionId: metrics.sessionId
        }
      });
    } else if (metrics.loadTime > this.THRESHOLDS.SLOW_PAGE_LOAD) {
      alerts.push({
        id: `slow_load_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'slow_page_loads',
        message: `Slow page load: ${metrics.page} took ${metrics.loadTime}ms`,
        severity: 'medium',
        timestamp: new Date(),
        metadata: {
          page: metrics.page,
          loadTime: metrics.loadTime,
          sessionId: metrics.sessionId
        }
      });
    }

    // Check Core Web Vitals
    if (metrics.largestContentfulPaint > this.THRESHOLDS.POOR_LCP ||
        metrics.firstInputDelay > this.THRESHOLDS.POOR_FID ||
        metrics.cumulativeLayoutShift > this.THRESHOLDS.POOR_CLS) {
      
      alerts.push({
        id: `cwv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'poor_core_web_vitals',
        message: `Poor Core Web Vitals on ${metrics.page}`,
        severity: 'medium',
        timestamp: new Date(),
        metadata: {
          page: metrics.page,
          lcp: metrics.largestContentfulPaint,
          fid: metrics.firstInputDelay,
          cls: metrics.cumulativeLayoutShift,
          sessionId: metrics.sessionId
        }
      });
    }

    // Add alerts
    alerts.forEach(alert => this.addAlert(alert));
  }

  // Check for error rate alerts
  private checkErrorAlerts(error: ErrorMetrics): void {
    // Calculate recent error rate
    const recentErrors = this.getRecentErrors(5); // Last 5 minutes
    const recentSessions = this.getRecentSessions(5);
    
    if (recentSessions.length === 0) return;

    const errorRate = (recentErrors.length / recentSessions.length) * 100;
    
    if (errorRate > this.THRESHOLDS.HIGH_ERROR_RATE) {
      const alert: UXAlert = {
        id: `error_rate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'high_error_rate',
        message: `High user experience error rate: ${errorRate.toFixed(2)}%`,
        severity: errorRate > 10 ? 'high' : 'medium',
        timestamp: new Date(),
        metadata: {
          errorRate,
          recentErrors: recentErrors.length,
          recentSessions: recentSessions.length,
          latestError: {
            type: error.type,
            message: error.message,
            page: error.page
          }
        }
      };

      this.addAlert(alert);
    }
  }

  // Add alert
  private addAlert(alert: UXAlert): void {
    this.alerts.unshift(alert);
    
    // Keep only recent alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(0, 1000);
    }

    const logLevel = alert.severity === 'critical' ? 'error' : alert.severity === 'high' ? 'warn' : 'info';
    logger[logLevel](`UX Alert: ${alert.message}`, {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      metadata: alert.metadata
    });
  }

  // Get recent errors
  private getRecentErrors(minutes: number): ErrorMetrics[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.errors.filter(error => error.timestamp.getTime() > cutoff);
  }

  // Get recent sessions
  private getRecentSessions(minutes: number): UserSessionMetrics[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    const activeSessions = Array.from(this.sessions.values());
    return activeSessions.filter(session => session.lastActivity.getTime() > cutoff);
  }

  // Trim history to prevent memory issues
  private trimHistory(): void {
    if (this.pageLoads.length > this.THRESHOLDS.MAX_HISTORY_SIZE) {
      this.pageLoads = this.pageLoads.slice(-this.THRESHOLDS.MAX_HISTORY_SIZE);
    }
    
    if (this.interactions.length > this.THRESHOLDS.MAX_HISTORY_SIZE) {
      this.interactions = this.interactions.slice(-this.THRESHOLDS.MAX_HISTORY_SIZE);
    }
    
    if (this.errors.length > this.THRESHOLDS.MAX_HISTORY_SIZE) {
      this.errors = this.errors.slice(-this.THRESHOLDS.MAX_HISTORY_SIZE);
    }
    
    if (this.conversions.length > this.THRESHOLDS.MAX_HISTORY_SIZE) {
      this.conversions = this.conversions.slice(-this.THRESHOLDS.MAX_HISTORY_SIZE);
    }
  }

  // Clean up expired sessions
  cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const timeSinceLastActivity = now - session.lastActivity.getTime();
      
      if (timeSinceLastActivity > this.THRESHOLDS.SESSION_TIMEOUT) {
        this.endSession(sessionId);
        expiredSessions.push(sessionId);
      }
    }

    if (expiredSessions.length > 0) {
      logger.debug('Expired sessions cleaned up', {
        count: expiredSessions.length,
        sessionIds: expiredSessions
      });
    }
  }

  // Calculate UX health metrics
  calculateUXHealth(timeWindowMinutes: number = 60): UXHealthMetrics {
    const cutoff = Date.now() - (timeWindowMinutes * 60 * 1000);
    
    // Filter recent data
    const recentPageLoads = this.pageLoads.filter(p => p.timestamp.getTime() > cutoff);
    const recentSessions = Array.from(this.sessions.values()).filter(s => s.startTime.getTime() > cutoff);
    const recentErrors = this.errors.filter(e => e.timestamp.getTime() > cutoff);
    const recentConversions = this.conversions.filter(c => c.timestamp.getTime() > cutoff);

    // Calculate metrics
    const averagePageLoadTime = recentPageLoads.length > 0
      ? recentPageLoads.reduce((sum, p) => sum + p.loadTime, 0) / recentPageLoads.length
      : 0;

    const averageSessionDuration = recentSessions.length > 0
      ? recentSessions
          .filter(s => s.duration)
          .reduce((sum, s) => sum + (s.duration || 0), 0) / recentSessions.filter(s => s.duration).length
      : 0;

    const bounceRate = recentSessions.length > 0
      ? (recentSessions.filter(s => s.bounced).length / recentSessions.length) * 100
      : 0;

    const errorRate = recentSessions.length > 0
      ? (recentErrors.length / recentSessions.length) * 100
      : 0;

    const conversionRate = recentSessions.length > 0
      ? (recentConversions.length / recentSessions.length) * 100
      : 0;

    // Calculate Core Web Vitals averages
    const coreWebVitals = {
      lcp: recentPageLoads.length > 0
        ? recentPageLoads.reduce((sum, p) => sum + p.largestContentfulPaint, 0) / recentPageLoads.length
        : 0,
      fid: recentPageLoads.length > 0
        ? recentPageLoads.reduce((sum, p) => sum + p.firstInputDelay, 0) / recentPageLoads.length
        : 0,
      cls: recentPageLoads.length > 0
        ? recentPageLoads.reduce((sum, p) => sum + p.cumulativeLayoutShift, 0) / recentPageLoads.length
        : 0
    };

    // Calculate user satisfaction score (0-100)
    let satisfactionScore = 100;
    
    // Deduct points for poor metrics
    if (averagePageLoadTime > this.THRESHOLDS.SLOW_PAGE_LOAD) satisfactionScore -= 20;
    if (bounceRate > this.THRESHOLDS.HIGH_BOUNCE_RATE) satisfactionScore -= 15;
    if (errorRate > this.THRESHOLDS.HIGH_ERROR_RATE) satisfactionScore -= 25;
    if (conversionRate < this.THRESHOLDS.LOW_CONVERSION_RATE) satisfactionScore -= 10;
    if (coreWebVitals.lcp > this.THRESHOLDS.POOR_LCP) satisfactionScore -= 10;
    if (coreWebVitals.fid > this.THRESHOLDS.POOR_FID) satisfactionScore -= 10;
    if (coreWebVitals.cls > this.THRESHOLDS.POOR_CLS) satisfactionScore -= 10;

    satisfactionScore = Math.max(0, satisfactionScore);

    return {
      averagePageLoadTime,
      averageSessionDuration,
      bounceRate,
      errorRate,
      conversionRate,
      userSatisfactionScore: satisfactionScore,
      coreWebVitals,
      timestamp: new Date()
    };
  }

  // Get active sessions
  getActiveSessions(): UserSessionMetrics[] {
    return Array.from(this.sessions.values());
  }

  // Get recent page loads
  getRecentPageLoads(limit: number = 100): PageLoadMetrics[] {
    return this.pageLoads.slice(-limit);
  }

  // Get recent interactions
  getRecentInteractions(limit: number = 100): UserInteractionMetrics[] {
    return this.interactions.slice(-limit);
  }

  // Get recent errors
  getRecentErrorMetrics(limit: number = 100): ErrorMetrics[] {
    return this.errors.slice(-limit);
  }

  // Get recent conversions
  getRecentConversions(limit: number = 100): ConversionMetrics[] {
    return this.conversions.slice(-limit);
  }

  // Get UX alerts
  getUXAlerts(limit: number = 50): UXAlert[] {
    return this.alerts.slice(0, limit);
  }

  // Resolve UX alert
  resolveUXAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = new Date();
      logger.info(`UX alert resolved: ${alertId}`);
      return true;
    }
    return false;
  }

  // Get comprehensive UX report
  generateUXReport(timeWindowMinutes: number = 60): {
    health: UXHealthMetrics;
    summary: {
      activeSessions: number;
      totalPageViews: number;
      totalInteractions: number;
      totalErrors: number;
      totalConversions: number;
    };
    topPages: Array<{ page: string; views: number; averageLoadTime: number }>;
    deviceBreakdown: Record<string, number>;
    errorBreakdown: Record<string, number>;
    conversionFunnels: Record<string, number>;
    alerts: UXAlert[];
  } {
    const health = this.calculateUXHealth(timeWindowMinutes);
    const cutoff = Date.now() - (timeWindowMinutes * 60 * 1000);
    
    // Filter recent data
    const recentPageLoads = this.pageLoads.filter(p => p.timestamp.getTime() > cutoff);
    const recentInteractions = this.interactions.filter(i => i.timestamp.getTime() > cutoff);
    const recentErrors = this.errors.filter(e => e.timestamp.getTime() > cutoff);
    const recentConversions = this.conversions.filter(c => c.timestamp.getTime() > cutoff);
    const activeSessions = this.getActiveSessions();

    // Calculate top pages
    const pageStats = new Map<string, { views: number; totalLoadTime: number }>();
    recentPageLoads.forEach(p => {
      const stats = pageStats.get(p.page) || { views: 0, totalLoadTime: 0 };
      stats.views++;
      stats.totalLoadTime += p.loadTime;
      pageStats.set(p.page, stats);
    });

    const topPages = Array.from(pageStats.entries())
      .map(([page, stats]) => ({
        page,
        views: stats.views,
        averageLoadTime: stats.totalLoadTime / stats.views
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Device breakdown
    const deviceBreakdown: Record<string, number> = {};
    activeSessions.forEach(session => {
      deviceBreakdown[session.device] = (deviceBreakdown[session.device] || 0) + 1;
    });

    // Error breakdown
    const errorBreakdown: Record<string, number> = {};
    recentErrors.forEach(error => {
      errorBreakdown[error.type] = (errorBreakdown[error.type] || 0) + 1;
    });

    // Conversion funnels
    const conversionFunnels: Record<string, number> = {};
    recentConversions.forEach(conversion => {
      conversionFunnels[conversion.type] = (conversionFunnels[conversion.type] || 0) + 1;
    });

    return {
      health,
      summary: {
        activeSessions: activeSessions.length,
        totalPageViews: recentPageLoads.length,
        totalInteractions: recentInteractions.length,
        totalErrors: recentErrors.length,
        totalConversions: recentConversions.length
      },
      topPages,
      deviceBreakdown,
      errorBreakdown,
      conversionFunnels,
      alerts: this.getUXAlerts(20)
    };
  }

  // Reset metrics (for testing)
  resetMetrics(): void {
    this.sessions.clear();
    this.pageLoads = [];
    this.interactions = [];
    this.errors = [];
    this.conversions = [];
    this.alerts = [];
    
    logger.info('User experience metrics reset');
  }
}

// Export singleton instance
export const userExperienceMetricsService = new UserExperienceMetricsService();

// Export types
export type {
  UserSessionMetrics,
  PageLoadMetrics,
  UserInteractionMetrics,
  ErrorMetrics,
  ConversionMetrics,
  UXHealthMetrics,
  UXAlert
};
