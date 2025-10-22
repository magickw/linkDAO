/**
 * Prioritization Performance Metrics Service
 * Tracks and analyzes performance metrics for payment method prioritization
 */

import { 
  PaymentMethod,
  PrioritizedPaymentMethod,
  PrioritizationResult,
  PrioritizationContext
} from '../types/paymentPrioritization';
import { paymentSystemHealthMonitor } from './paymentSystemHealthMonitor';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  context?: string;
  metadata?: any;
}

interface PrioritizationSession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  context: PrioritizationContext;
  result?: PrioritizationResult;
  performanceMetrics: PerformanceMetric[];
  userInteractions: UserInteraction[];
  cacheHits: number;
  cacheMisses: number;
  apiCalls: ApiCallMetric[];
}

interface UserInteraction {
  type: 'method_selected' | 'method_switched' | 'checkout_completed' | 'checkout_abandoned';
  timestamp: Date;
  selectedMethod?: PaymentMethod;
  previousMethod?: PaymentMethod;
  metadata?: any;
}

interface ApiCallMetric {
  service: string;
  endpoint: string;
  startTime: Date;
  endTime: Date;
  success: boolean;
  responseTime: number;
  error?: string;
}

interface PerformanceSummary {
  totalSessions: number;
  averageProcessingTime: number;
  cacheHitRate: number;
  userSatisfactionScore: number;
  apiSuccessRate: number;
  averageApiResponseTime: number;
  topPerformingMethods: { method: PaymentMethod; selectionRate: number }[];
  performanceTrends: { metric: string; trend: 'improving' | 'stable' | 'degrading' }[];
  timeRange: { start: Date; end: Date };
}

export class PrioritizationPerformanceMetrics {
  private sessions: Map<string, PrioritizationSession> = new Map();
  private metrics: PerformanceMetric[] = [];
  private listeners: Map<string, Set<Function>> = new Map();
  private isTracking = false;

  // Configuration
  private readonly MAX_SESSIONS = 1000;
  private readonly METRICS_RETENTION_HOURS = 48;
  private readonly PERFORMANCE_THRESHOLDS = {
    processingTime: {
      excellent: 200, // ms
      good: 500,
      poor: 1000
    },
    cacheHitRate: {
      excellent: 90, // %
      good: 75,
      poor: 50
    },
    apiResponseTime: {
      excellent: 500, // ms
      good: 1500,
      poor: 3000
    }
  };

  constructor() {
    this.startTracking();
  }

  /**
   * Start performance tracking
   */
  startTracking(): void {
    if (this.isTracking) return;

    console.log('Starting prioritization performance tracking');
    this.isTracking = true;

    // Set up periodic cleanup
    setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000); // Every hour

    this.emit('tracking_started', { timestamp: new Date() });
  }

  /**
   * Stop performance tracking
   */
  stopTracking(): void {
    if (!this.isTracking) return;

    console.log('Stopping prioritization performance tracking');
    this.isTracking = false;

    this.emit('tracking_stopped', { timestamp: new Date() });
  }

  /**
   * Start a new prioritization session
   */
  startSession(context: PrioritizationContext): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: PrioritizationSession = {
      sessionId,
      startTime: new Date(),
      context,
      performanceMetrics: [],
      userInteractions: [],
      cacheHits: 0,
      cacheMisses: 0,
      apiCalls: []
    };

    this.sessions.set(sessionId, session);

    // Cleanup old sessions if we have too many
    if (this.sessions.size > this.MAX_SESSIONS) {
      const oldestSession = Array.from(this.sessions.values())
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0];
      this.sessions.delete(oldestSession.sessionId);
    }

    this.emit('session_started', { sessionId, context });
    return sessionId;
  }

  /**
   * End a prioritization session
   */
  endSession(sessionId: string, result?: PrioritizationResult): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.endTime = new Date();
    session.result = result;

    // Calculate session metrics
    const processingTime = session.endTime.getTime() - session.startTime.getTime();
    this.recordMetric(sessionId, 'session_processing_time', processingTime, 'ms');

    const cacheHitRate = session.cacheHits + session.cacheMisses > 0 
      ? (session.cacheHits / (session.cacheHits + session.cacheMisses)) * 100 
      : 0;
    this.recordMetric(sessionId, 'session_cache_hit_rate', cacheHitRate, '%');

    // Calculate API performance
    if (session.apiCalls.length > 0) {
      const avgApiResponseTime = session.apiCalls.reduce((sum, call) => sum + call.responseTime, 0) / session.apiCalls.length;
      const apiSuccessRate = (session.apiCalls.filter(call => call.success).length / session.apiCalls.length) * 100;
      
      this.recordMetric(sessionId, 'session_api_response_time', avgApiResponseTime, 'ms');
      this.recordMetric(sessionId, 'session_api_success_rate', apiSuccessRate, '%');
    }

    // Report to health monitor
    paymentSystemHealthMonitor.recordPrioritizationPerformance(
      sessionId,
      result?.prioritizedMethods.length || 0,
      processingTime,
      cacheHitRate / 100,
      this.calculateSessionAccuracy(session)
    );

    this.emit('session_ended', { sessionId, session, processingTime });
  }

  /**
   * Record a performance metric
   */
  recordMetric(sessionId: string, name: string, value: number, unit: string, metadata?: any): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      context: sessionId,
      metadata
    };

    this.metrics.push(metric);

    // Add to session if it exists
    const session = this.sessions.get(sessionId);
    if (session) {
      session.performanceMetrics.push(metric);
    }

    this.emit('metric_recorded', metric);
  }

  /**
   * Record cache hit
   */
  recordCacheHit(sessionId: string, cacheKey: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.cacheHits++;
      this.recordMetric(sessionId, 'cache_hit', 1, 'count', { cacheKey });
    }
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(sessionId: string, cacheKey: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.cacheMisses++;
      this.recordMetric(sessionId, 'cache_miss', 1, 'count', { cacheKey });
    }
  }

  /**
   * Record API call
   */
  recordApiCall(
    sessionId: string,
    service: string,
    endpoint: string,
    startTime: Date,
    endTime: Date,
    success: boolean,
    error?: string
  ): void {
    const apiCall: ApiCallMetric = {
      service,
      endpoint,
      startTime,
      endTime,
      success,
      responseTime: endTime.getTime() - startTime.getTime(),
      error
    };

    const session = this.sessions.get(sessionId);
    if (session) {
      session.apiCalls.push(apiCall);
    }

    this.recordMetric(sessionId, 'api_call_response_time', apiCall.responseTime, 'ms', {
      service,
      endpoint,
      success,
      error
    });
  }

  /**
   * Record user interaction
   */
  recordUserInteraction(
    sessionId: string,
    type: UserInteraction['type'],
    selectedMethod?: PaymentMethod,
    previousMethod?: PaymentMethod,
    metadata?: any
  ): void {
    const interaction: UserInteraction = {
      type,
      timestamp: new Date(),
      selectedMethod,
      previousMethod,
      metadata
    };

    const session = this.sessions.get(sessionId);
    if (session) {
      session.userInteractions.push(interaction);
    }

    // Record specific metrics based on interaction type
    switch (type) {
      case 'method_selected':
        this.recordMetric(sessionId, 'method_selection', 1, 'count', {
          methodType: selectedMethod?.type,
          methodName: selectedMethod?.name
        });
        break;
      
      case 'method_switched':
        this.recordMetric(sessionId, 'method_switch', 1, 'count', {
          fromMethod: previousMethod?.type,
          toMethod: selectedMethod?.type
        });
        break;
      
      case 'checkout_completed':
        this.recordMetric(sessionId, 'checkout_completion', 1, 'count', {
          finalMethod: selectedMethod?.type
        });
        break;
      
      case 'checkout_abandoned':
        this.recordMetric(sessionId, 'checkout_abandonment', 1, 'count', metadata);
        break;
    }

    this.emit('user_interaction_recorded', { sessionId, interaction });
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(hours: number = 24): PerformanceSummary {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const recentSessions = Array.from(this.sessions.values())
      .filter(session => session.startTime.getTime() > cutoff);

    const recentMetrics = this.metrics.filter(metric => metric.timestamp.getTime() > cutoff);

    // Calculate averages
    const processingTimes = recentMetrics
      .filter(m => m.name === 'session_processing_time')
      .map(m => m.value);
    const averageProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
      : 0;

    const cacheHitRates = recentMetrics
      .filter(m => m.name === 'session_cache_hit_rate')
      .map(m => m.value);
    const cacheHitRate = cacheHitRates.length > 0 
      ? cacheHitRates.reduce((sum, rate) => sum + rate, 0) / cacheHitRates.length 
      : 0;

    const apiResponseTimes = recentMetrics
      .filter(m => m.name === 'api_call_response_time')
      .map(m => m.value);
    const averageApiResponseTime = apiResponseTimes.length > 0 
      ? apiResponseTimes.reduce((sum, time) => sum + time, 0) / apiResponseTimes.length 
      : 0;

    const apiSuccessRates = recentMetrics
      .filter(m => m.name === 'session_api_success_rate')
      .map(m => m.value);
    const apiSuccessRate = apiSuccessRates.length > 0 
      ? apiSuccessRates.reduce((sum, rate) => sum + rate, 0) / apiSuccessRates.length 
      : 100;

    // Calculate user satisfaction score
    const userSatisfactionScore = this.calculateUserSatisfactionScore(recentSessions);

    // Get top performing methods
    const topPerformingMethods = this.getTopPerformingMethods(recentSessions);

    // Calculate performance trends
    const performanceTrends = this.calculatePerformanceTrends(hours);

    return {
      totalSessions: recentSessions.length,
      averageProcessingTime,
      cacheHitRate,
      userSatisfactionScore,
      apiSuccessRate,
      averageApiResponseTime,
      topPerformingMethods,
      performanceTrends,
      timeRange: {
        start: new Date(cutoff),
        end: new Date()
      }
    };
  }

  /**
   * Get session details
   */
  getSession(sessionId: string): PrioritizationSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get recent sessions
   */
  getRecentSessions(hours: number = 24): PrioritizationSession[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return Array.from(this.sessions.values())
      .filter(session => session.startTime.getTime() > cutoff)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string, hours: number = 24): PerformanceMetric[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.metrics
      .filter(metric => metric.name === name && metric.timestamp.getTime() > cutoff)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get performance grade
   */
  getPerformanceGrade(): 'A' | 'B' | 'C' | 'D' | 'F' {
    const summary = this.getPerformanceSummary(24);
    let score = 0;

    // Processing time score (30%)
    if (summary.averageProcessingTime <= this.PERFORMANCE_THRESHOLDS.processingTime.excellent) {
      score += 30;
    } else if (summary.averageProcessingTime <= this.PERFORMANCE_THRESHOLDS.processingTime.good) {
      score += 25;
    } else if (summary.averageProcessingTime <= this.PERFORMANCE_THRESHOLDS.processingTime.poor) {
      score += 15;
    }

    // Cache hit rate score (25%)
    if (summary.cacheHitRate >= this.PERFORMANCE_THRESHOLDS.cacheHitRate.excellent) {
      score += 25;
    } else if (summary.cacheHitRate >= this.PERFORMANCE_THRESHOLDS.cacheHitRate.good) {
      score += 20;
    } else if (summary.cacheHitRate >= this.PERFORMANCE_THRESHOLDS.cacheHitRate.poor) {
      score += 10;
    }

    // API response time score (25%)
    if (summary.averageApiResponseTime <= this.PERFORMANCE_THRESHOLDS.apiResponseTime.excellent) {
      score += 25;
    } else if (summary.averageApiResponseTime <= this.PERFORMANCE_THRESHOLDS.apiResponseTime.good) {
      score += 20;
    } else if (summary.averageApiResponseTime <= this.PERFORMANCE_THRESHOLDS.apiResponseTime.poor) {
      score += 10;
    }

    // User satisfaction score (20%)
    score += (summary.userSatisfactionScore / 100) * 20;

    // Convert to letter grade
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  // Helper methods
  private calculateSessionAccuracy(session: PrioritizationSession): number {
    // Calculate accuracy based on user interactions
    const completions = session.userInteractions.filter(i => i.type === 'checkout_completed').length;
    const abandonments = session.userInteractions.filter(i => i.type === 'checkout_abandoned').length;
    const switches = session.userInteractions.filter(i => i.type === 'method_switched').length;

    if (completions + abandonments === 0) return 0.9; // Default assumption

    // Higher accuracy if users complete without switching methods
    let accuracy = completions / (completions + abandonments);
    
    // Reduce accuracy for method switches (indicates initial recommendation wasn't optimal)
    if (switches > 0) {
      accuracy *= Math.max(0.5, 1 - (switches * 0.1));
    }

    return Math.max(0, Math.min(1, accuracy));
  }

  private calculateUserSatisfactionScore(sessions: PrioritizationSession[]): number {
    if (sessions.length === 0) return 0;

    let totalScore = 0;
    let scoredSessions = 0;

    for (const session of sessions) {
      const completions = session.userInteractions.filter(i => i.type === 'checkout_completed').length;
      const abandonments = session.userInteractions.filter(i => i.type === 'checkout_abandoned').length;
      const switches = session.userInteractions.filter(i => i.type === 'method_switched').length;

      if (completions + abandonments === 0) continue;

      let sessionScore = 100;

      // Reduce score for abandonments
      sessionScore -= (abandonments * 50);

      // Reduce score for method switches
      sessionScore -= (switches * 10);

      // Bonus for quick completions
      if (session.endTime && session.endTime.getTime() - session.startTime.getTime() < 30000) {
        sessionScore += 10;
      }

      totalScore += Math.max(0, Math.min(100, sessionScore));
      scoredSessions++;
    }

    return scoredSessions > 0 ? totalScore / scoredSessions : 0;
  }

  private getTopPerformingMethods(sessions: PrioritizationSession[]): { method: PaymentMethod; selectionRate: number }[] {
    const methodCounts = new Map<string, { method: PaymentMethod; count: number }>();
    let totalSelections = 0;

    for (const session of sessions) {
      for (const interaction of session.userInteractions) {
        if (interaction.type === 'method_selected' && interaction.selectedMethod) {
          const key = `${interaction.selectedMethod.type}_${interaction.selectedMethod.id}`;
          const existing = methodCounts.get(key);
          
          if (existing) {
            existing.count++;
          } else {
            methodCounts.set(key, {
              method: interaction.selectedMethod,
              count: 1
            });
          }
          totalSelections++;
        }
      }
    }

    return Array.from(methodCounts.values())
      .map(({ method, count }) => ({
        method,
        selectionRate: (count / totalSelections) * 100
      }))
      .sort((a, b) => b.selectionRate - a.selectionRate)
      .slice(0, 5); // Top 5
  }

  private calculatePerformanceTrends(hours: number): { metric: string; trend: 'improving' | 'stable' | 'degrading' }[] {
    const trends: { metric: string; trend: 'improving' | 'stable' | 'degrading' }[] = [];
    const halfPeriod = hours / 2;
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const midpoint = Date.now() - (halfPeriod * 60 * 60 * 1000);

    const metricNames = ['session_processing_time', 'session_cache_hit_rate', 'api_call_response_time'];

    for (const metricName of metricNames) {
      const firstHalf = this.metrics.filter(
        m => m.name === metricName && 
             m.timestamp.getTime() > cutoff && 
             m.timestamp.getTime() <= midpoint
      );
      
      const secondHalf = this.metrics.filter(
        m => m.name === metricName && 
             m.timestamp.getTime() > midpoint
      );

      if (firstHalf.length === 0 || secondHalf.length === 0) {
        trends.push({ metric: metricName, trend: 'stable' });
        continue;
      }

      const firstAvg = firstHalf.reduce((sum, m) => sum + m.value, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, m) => sum + m.value, 0) / secondHalf.length;
      const change = ((secondAvg - firstAvg) / firstAvg) * 100;

      let trend: 'improving' | 'stable' | 'degrading';
      
      if (metricName === 'session_cache_hit_rate') {
        // For cache hit rate, higher is better
        if (change > 5) trend = 'improving';
        else if (change < -5) trend = 'degrading';
        else trend = 'stable';
      } else {
        // For processing time and response time, lower is better
        if (change < -5) trend = 'improving';
        else if (change > 5) trend = 'degrading';
        else trend = 'stable';
      }

      trends.push({ metric: metricName, trend });
    }

    return trends;
  }

  private cleanupOldData(): void {
    const cutoff = Date.now() - (this.METRICS_RETENTION_HOURS * 60 * 60 * 1000);

    // Cleanup old metrics
    this.metrics = this.metrics.filter(metric => metric.timestamp.getTime() > cutoff);

    // Cleanup old sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.startTime.getTime() < cutoff) {
        this.sessions.delete(sessionId);
      }
    }

    console.log(`Cleaned up old performance data. Metrics: ${this.metrics.length}, Sessions: ${this.sessions.size}`);
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in performance metrics event callback:', error);
        }
      });
    }
  }
}

// Export singleton instance
export const prioritizationPerformanceMetrics = new PrioritizationPerformanceMetrics();

export default PrioritizationPerformanceMetrics;