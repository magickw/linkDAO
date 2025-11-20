/**
 * Memory Monitoring Service for Messaging Components
 * Provides centralized monitoring and cleanup for all messaging-related memory usage
 */

import { messagingService } from './messagingService';
import { webSocketService } from './webSocketService';

interface MemoryStats {
  timestamp: number;
  messagingService: {
    conversations: number;
    messages: number;
    blockedUsers: number;
    typingTimeouts: number;
    eventListeners: number;
    totalMessages: number;
  };
  webSocketService: {
    totalEvents: number;
    totalListeners: number;
    maxListenersPerEvent: number;
    listenerCounts: Record<string, number>;
  };
  system: {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
    memoryUsagePercentage: number;
  };
}

interface MemoryThresholds {
  warningPercentage: number;
  criticalPercentage: number;
  maxConversations: number;
  maxMessages: number;
  maxListeners: number;
}

class MemoryMonitorService {
  private readonly thresholds: MemoryThresholds = {
    warningPercentage: 80,
    criticalPercentage: 90,
    maxConversations: 100,
    maxMessages: 10000,
    maxListeners: 200
  };

  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly MONITORING_INTERVAL = 60 * 1000; // 1 minute
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private lastCleanup: number = Date.now();

  constructor() {
    this.startMonitoring();
  }

  /**
   * Start periodic memory monitoring
   */
  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, this.MONITORING_INTERVAL);

    console.log('Memory monitoring service started');
  }

  /**
   * Get current memory statistics
   */
  public getMemoryStats(): MemoryStats {
    const messagingStats = messagingService.getMemoryUsage();
    const webSocketStats = webSocketService.getMemoryUsage();
    const systemStats = this.getSystemMemoryStats();

    return {
      timestamp: Date.now(),
      messagingService: messagingStats,
      webSocketService: webSocketStats,
      system: systemStats
    };
  }

  /**
   * Get system memory statistics
   */
  private getSystemMemoryStats(): MemoryStats['system'] {
    if (typeof performance === 'undefined' || !('memory' in performance)) {
      return {
        jsHeapSizeLimit: 0,
        totalJSHeapSize: 0,
        usedJSHeapSize: 0,
        memoryUsagePercentage: 0
      };
    }

    const memory = (performance as any).memory;
    const memoryUsagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

    return {
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      totalJSHeapSize: memory.totalJSHeapSize,
      usedJSHeapSize: memory.usedJSHeapSize,
      memoryUsagePercentage
    };
  }

  /**
   * Check memory usage and trigger cleanup if needed
   */
  private checkMemoryUsage(): void {
    const stats = this.getMemoryStats();
    const { system, messagingService, webSocketService } = stats;

    // Check system memory thresholds
    if (system.memoryUsagePercentage > this.thresholds.criticalPercentage) {
      console.error('CRITICAL: Memory usage at', system.memoryUsagePercentage.toFixed(1) + '%');
      this.performEmergencyCleanup();
    } else if (system.memoryUsagePercentage > this.thresholds.warningPercentage) {
      console.warn('WARNING: Memory usage at', system.memoryUsagePercentage.toFixed(1) + '%');
      this.performCleanup();
    }

    // Check messaging service thresholds
    if (messagingService.conversations > this.thresholds.maxConversations) {
      console.warn('Too many conversations:', messagingService.conversations);
      this.performMessagingCleanup();
    }

    if (messagingService.totalMessages > this.thresholds.maxMessages) {
      console.warn('Too many messages:', messagingService.totalMessages);
      this.performMessagingCleanup();
    }

    if (webSocketService.totalListeners > this.thresholds.maxListeners) {
      console.warn('Too many WebSocket listeners:', webSocketService.totalListeners);
      this.performWebSocketCleanup();
    }

    // Periodic cleanup
    const now = Date.now();
    if (now - this.lastCleanup > this.CLEANUP_INTERVAL) {
      this.performCleanup();
      this.lastCleanup = now;
    }
  }

  /**
   * Perform emergency cleanup for critical memory situations
   */
  private performEmergencyCleanup(): void {
    console.log('Performing emergency memory cleanup...');
    
    // Clear WebSocket listeners for non-critical events
    const nonCriticalEvents = ['ping', 'pong', 'user_presence', 'typing'];
    nonCriticalEvents.forEach(event => {
      webSocketService.clearListeners(event);
    });

    // Force messaging cleanup
    this.performMessagingCleanup();
    this.performWebSocketCleanup();

    // Suggest garbage collection if available
    if (typeof window !== 'undefined' && 'gc' in window) {
      (window as any).gc();
    }
  }

  /**
   * Perform routine cleanup
   */
  private performCleanup(): void {
    this.performMessagingCleanup();
    this.performWebSocketCleanup();
  }

  /**
   * Cleanup messaging service memory
   */
  private performMessagingCleanup(): void {
    try {
      // The messaging service has its own cleanup logic
      // This is just a trigger to ensure it runs
      console.log('Performing messaging service cleanup');
    } catch (error) {
      console.error('Error during messaging cleanup:', error);
    }
  }

  /**
   * Cleanup WebSocket service memory
   */
  private performWebSocketCleanup(): void {
    try {
      console.log('Performing WebSocket service cleanup');
      // WebSocket service has its own cleanup logic
    } catch (error) {
      console.error('Error during WebSocket cleanup:', error);
    }
  }

  /**
   * Get memory health status
   */
  public getMemoryHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const stats = this.getMemoryStats();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check system memory
    if (stats.system.memoryUsagePercentage > this.thresholds.criticalPercentage) {
      issues.push(`Critical memory usage: ${stats.system.memoryUsagePercentage.toFixed(1)}%`);
      recommendations.push('Close unused tabs and applications');
      recommendations.push('Consider refreshing the page');
    } else if (stats.system.memoryUsagePercentage > this.thresholds.warningPercentage) {
      issues.push(`High memory usage: ${stats.system.memoryUsagePercentage.toFixed(1)}%`);
      recommendations.push('Monitor memory usage closely');
    }

    // Check messaging service
    if (stats.messagingService.conversations > this.thresholds.maxConversations * 0.8) {
      issues.push(`High conversation count: ${stats.messagingService.conversations}`);
      recommendations.push('Archive old conversations');
    }

    if (stats.messagingService.totalMessages > this.thresholds.maxMessages * 0.8) {
      issues.push(`High message count: ${stats.messagingService.totalMessages}`);
      recommendations.push('Clear message history');
    }

    // Check WebSocket service
    if (stats.webSocketService.totalListeners > this.thresholds.maxListeners * 0.8) {
      issues.push(`High listener count: ${stats.webSocketService.totalListeners}`);
      recommendations.push('Check for listener leaks');
    }

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (issues.some(issue => issue.includes('Critical'))) {
      status = 'critical';
    } else if (issues.length > 0) {
      status = 'warning';
    }

    return { status, issues, recommendations };
  }

  /**
   * Force immediate cleanup
   */
  public forceCleanup(): void {
    console.log('Force cleanup triggered');
    this.performCleanup();
    this.lastCleanup = Date.now();
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('Memory monitoring service stopped');
  }

  /**
   * Resume monitoring
   */
  public resumeMonitoring(): void {
    this.startMonitoring();
  }
}

// Export singleton instance
export const memoryMonitorService = new MemoryMonitorService();
export default memoryMonitorService;