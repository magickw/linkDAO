/**
 * Network condition detector for optimizing performance and handling network issues
 */

interface NetworkCondition {
  type: 'fast' | 'slow' | 'offline' | 'unstable';
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  downlink: number; // Mbps
  rtt: number; // milliseconds
  saveData: boolean;
  timestamp: Date;
}

interface NetworkOptimizationSettings {
  enableImageOptimization: boolean;
  enableDataCompression: boolean;
  reduceAnimations: boolean;
  limitRealTimeUpdates: boolean;
  enableOfflineMode: boolean;
  maxConcurrentRequests: number;
  requestTimeout: number;
  retryAttempts: number;
}

interface PerformanceMetrics {
  averageLatency: number;
  requestSuccessRate: number;
  dataUsage: number;
  errorRate: number;
  lastMeasurement: Date;
}

export class NetworkConditionDetector {
  private static instance: NetworkConditionDetector;
  private currentCondition: NetworkCondition;
  private optimizationSettings: NetworkOptimizationSettings;
  private performanceMetrics: PerformanceMetrics;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isActive = false;

  // Event listeners
  private listeners: Map<string, Set<Function>> = new Map();

  // Performance tracking
  private latencyHistory: number[] = [];
  private requestHistory: { success: boolean; timestamp: Date; latency: number }[] = [];
  private dataUsageHistory: { bytes: number; timestamp: Date }[] = [];

  static getInstance(): NetworkConditionDetector {
    if (!NetworkConditionDetector.instance) {
      NetworkConditionDetector.instance = new NetworkConditionDetector();
    }
    return NetworkConditionDetector.instance;
  }

  constructor() {
    this.currentCondition = this.getDefaultNetworkCondition();
    this.optimizationSettings = this.getDefaultOptimizationSettings();
    this.performanceMetrics = this.getDefaultPerformanceMetrics();
  }

  /**
   * Start network condition monitoring
   */
  start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    console.log('Starting network condition detection');

    // Initial detection
    this.detectNetworkCondition();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.detectNetworkCondition();
      this.updatePerformanceMetrics();
    }, 10000); // Check every 10 seconds

    // Set up event listeners
    this.setupEventListeners();

    this.emit('detector_started', { condition: this.currentCondition });
  }

  /**
   * Stop network condition monitoring
   */
  stop(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    console.log('Stopping network condition detection');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.cleanupEventListeners();
    this.emit('detector_stopped');
  }

  /**
   * Get current network condition
   */
  getCurrentCondition(): NetworkCondition {
    return { ...this.currentCondition };
  }

  /**
   * Get current optimization settings
   */
  getOptimizationSettings(): NetworkOptimizationSettings {
    return { ...this.optimizationSettings };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Record request performance
   */
  recordRequest(success: boolean, latency: number, dataBytes: number = 0): void {
    const timestamp = new Date();
    
    // Record request
    this.requestHistory.push({ success, timestamp, latency });
    
    // Record latency
    this.latencyHistory.push(latency);
    
    // Record data usage
    if (dataBytes > 0) {
      this.dataUsageHistory.push({ bytes: dataBytes, timestamp });
    }

    // Limit history size
    this.requestHistory = this.requestHistory.slice(-100);
    this.latencyHistory = this.latencyHistory.slice(-50);
    this.dataUsageHistory = this.dataUsageHistory.slice(-100);

    // Update metrics
    this.updatePerformanceMetrics();
  }

  /**
   * Get optimized settings for current network condition
   */
  getOptimizedSettings(): {
    imageQuality: number;
    enableAnimations: boolean;
    updateInterval: number;
    maxConcurrentRequests: number;
    requestTimeout: number;
    enableOfflineCache: boolean;
  } {
    const condition = this.currentCondition;
    
    switch (condition.type) {
      case 'fast':
        return {
          imageQuality: 1.0,
          enableAnimations: true,
          updateInterval: 5000,
          maxConcurrentRequests: 6,
          requestTimeout: 10000,
          enableOfflineCache: false
        };
        
      case 'slow':
        return {
          imageQuality: 0.7,
          enableAnimations: false,
          updateInterval: 15000,
          maxConcurrentRequests: 3,
          requestTimeout: 20000,
          enableOfflineCache: true
        };
        
      case 'unstable':
        return {
          imageQuality: 0.5,
          enableAnimations: false,
          updateInterval: 30000,
          maxConcurrentRequests: 2,
          requestTimeout: 30000,
          enableOfflineCache: true
        };
        
      case 'offline':
        return {
          imageQuality: 0.3,
          enableAnimations: false,
          updateInterval: 60000,
          maxConcurrentRequests: 1,
          requestTimeout: 60000,
          enableOfflineCache: true
        };
        
      default:
        return {
          imageQuality: 0.8,
          enableAnimations: true,
          updateInterval: 10000,
          maxConcurrentRequests: 4,
          requestTimeout: 15000,
          enableOfflineCache: false
        };
    }
  }

  /**
   * Check if feature should be enabled based on network condition
   */
  shouldEnableFeature(feature: 'animations' | 'realtime_updates' | 'image_preload' | 'auto_refresh'): boolean {
    const condition = this.currentCondition;
    
    switch (feature) {
      case 'animations':
        return condition.type === 'fast' && !condition.saveData;
        
      case 'realtime_updates':
        return condition.type !== 'offline' && condition.rtt < 1000;
        
      case 'image_preload':
        return condition.type === 'fast' && !condition.saveData;
        
      case 'auto_refresh':
        return condition.type !== 'offline' && condition.type !== 'unstable';
        
      default:
        return true;
    }
  }

  /**
   * Get recommended update interval based on network condition
   */
  getRecommendedUpdateInterval(baseInterval: number = 10000): number {
    const condition = this.currentCondition;
    
    switch (condition.type) {
      case 'fast':
        return baseInterval;
      case 'slow':
        return baseInterval * 2;
      case 'unstable':
        return baseInterval * 3;
      case 'offline':
        return baseInterval * 6;
      default:
        return baseInterval * 1.5;
    }
  }

  /**
   * Detect current network condition
   */
  private detectNetworkCondition(): void {
    const previousCondition = { ...this.currentCondition };
    
    // Use Network Information API if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      this.currentCondition = {
        type: this.determineNetworkType(connection),
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false,
        timestamp: new Date()
      };
    } else {
      // Fallback detection based on performance metrics
      this.currentCondition = this.detectFromPerformanceMetrics();
    }

    // Check if condition changed
    if (this.hasConditionChanged(previousCondition, this.currentCondition)) {
      console.log('Network condition changed:', this.currentCondition.type);
      this.updateOptimizationSettings();
      this.emit('condition_changed', {
        previous: previousCondition,
        current: this.currentCondition
      });
    }
  }

  /**
   * Determine network type from connection info
   */
  private determineNetworkType(connection: any): NetworkCondition['type'] {
    // Check if offline
    if (!navigator.onLine) {
      return 'offline';
    }

    const effectiveType = connection.effectiveType;
    const rtt = connection.rtt || 0;
    const downlink = connection.downlink || 0;

    // Determine based on effective type and metrics
    if (effectiveType === '4g' && rtt < 300 && downlink > 5) {
      return 'fast';
    } else if (effectiveType === '3g' || (rtt < 800 && downlink > 1)) {
      return 'slow';
    } else if (rtt > 1000 || downlink < 0.5) {
      return 'unstable';
    } else {
      return 'slow';
    }
  }

  /**
   * Detect network condition from performance metrics
   */
  private detectFromPerformanceMetrics(): NetworkCondition {
    const avgLatency = this.performanceMetrics.averageLatency;
    const successRate = this.performanceMetrics.requestSuccessRate;

    let type: NetworkCondition['type'];
    
    if (!navigator.onLine) {
      type = 'offline';
    } else if (avgLatency < 300 && successRate > 0.95) {
      type = 'fast';
    } else if (avgLatency < 800 && successRate > 0.85) {
      type = 'slow';
    } else {
      type = 'unstable';
    }

    return {
      type,
      effectiveType: 'unknown',
      downlink: 0,
      rtt: avgLatency,
      saveData: false,
      timestamp: new Date()
    };
  }

  /**
   * Check if network condition has changed significantly
   */
  private hasConditionChanged(previous: NetworkCondition, current: NetworkCondition): boolean {
    return previous.type !== current.type ||
           Math.abs(previous.rtt - current.rtt) > 200 ||
           Math.abs(previous.downlink - current.downlink) > 1;
  }

  /**
   * Update optimization settings based on current condition
   */
  private updateOptimizationSettings(): void {
    const condition = this.currentCondition;
    
    this.optimizationSettings = {
      enableImageOptimization: condition.type !== 'fast' || condition.saveData,
      enableDataCompression: condition.type === 'slow' || condition.type === 'unstable',
      reduceAnimations: condition.type !== 'fast' || condition.saveData,
      limitRealTimeUpdates: condition.type === 'slow' || condition.type === 'unstable',
      enableOfflineMode: condition.type === 'offline',
      maxConcurrentRequests: this.getMaxConcurrentRequests(condition.type),
      requestTimeout: this.getRequestTimeout(condition.type),
      retryAttempts: this.getRetryAttempts(condition.type)
    };
  }

  /**
   * Get max concurrent requests based on network type
   */
  private getMaxConcurrentRequests(type: NetworkCondition['type']): number {
    switch (type) {
      case 'fast': return 6;
      case 'slow': return 3;
      case 'unstable': return 2;
      case 'offline': return 1;
      default: return 4;
    }
  }

  /**
   * Get request timeout based on network type
   */
  private getRequestTimeout(type: NetworkCondition['type']): number {
    switch (type) {
      case 'fast': return 10000;
      case 'slow': return 20000;
      case 'unstable': return 30000;
      case 'offline': return 60000;
      default: return 15000;
    }
  }

  /**
   * Get retry attempts based on network type
   */
  private getRetryAttempts(type: NetworkCondition['type']): number {
    switch (type) {
      case 'fast': return 2;
      case 'slow': return 3;
      case 'unstable': return 4;
      case 'offline': return 5;
      default: return 3;
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    // Filter recent requests
    const recentRequests = this.requestHistory.filter(req => req.timestamp > oneMinuteAgo);
    const recentLatencies = this.latencyHistory.slice(-20);
    const recentDataUsage = this.dataUsageHistory.filter(usage => usage.timestamp > oneMinuteAgo);

    // Calculate metrics
    const averageLatency = recentLatencies.length > 0
      ? recentLatencies.reduce((sum, lat) => sum + lat, 0) / recentLatencies.length
      : 0;

    const requestSuccessRate = recentRequests.length > 0
      ? recentRequests.filter(req => req.success).length / recentRequests.length
      : 1;

    const dataUsage = recentDataUsage.reduce((sum, usage) => sum + usage.bytes, 0);

    const errorRate = 1 - requestSuccessRate;

    this.performanceMetrics = {
      averageLatency,
      requestSuccessRate,
      dataUsage,
      errorRate,
      lastMeasurement: now
    };
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    // Online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Connection change events
    if ('connection' in navigator) {
      (navigator as any).connection.addEventListener('change', this.handleConnectionChange);
    }

    // Visibility change events
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * Clean up event listeners
   */
  private cleanupEventListeners(): void {
    if (typeof window === 'undefined') return;

    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);

    if ('connection' in navigator) {
      (navigator as any).connection.removeEventListener('change', this.handleConnectionChange);
    }

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * Handle online event
   */
  private handleOnline = (): void => {
    console.log('Network came online');
    this.detectNetworkCondition();
    this.emit('network_online');
  };

  /**
   * Handle offline event
   */
  private handleOffline = (): void => {
    console.log('Network went offline');
    this.currentCondition.type = 'offline';
    this.updateOptimizationSettings();
    this.emit('network_offline');
  };

  /**
   * Handle connection change event
   */
  private handleConnectionChange = (): void => {
    console.log('Network connection changed');
    this.detectNetworkCondition();
  };

  /**
   * Handle visibility change event
   */
  private handleVisibilityChange = (): void => {
    if (!document.hidden) {
      // Page became visible, check network condition
      this.detectNetworkCondition();
    }
  };

  /**
   * Get default network condition
   */
  private getDefaultNetworkCondition(): NetworkCondition {
    return {
      type: 'fast',
      effectiveType: '4g',
      downlink: 10,
      rtt: 100,
      saveData: false,
      timestamp: new Date()
    };
  }

  /**
   * Get default optimization settings
   */
  private getDefaultOptimizationSettings(): NetworkOptimizationSettings {
    return {
      enableImageOptimization: false,
      enableDataCompression: false,
      reduceAnimations: false,
      limitRealTimeUpdates: false,
      enableOfflineMode: false,
      maxConcurrentRequests: 6,
      requestTimeout: 10000,
      retryAttempts: 2
    };
  }

  /**
   * Get default performance metrics
   */
  private getDefaultPerformanceMetrics(): PerformanceMetrics {
    return {
      averageLatency: 0,
      requestSuccessRate: 1,
      dataUsage: 0,
      errorRate: 0,
      lastMeasurement: new Date()
    };
  }

  /**
   * Event system
   */
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
          console.error('Error in network condition detector event callback:', error);
        }
      });
    }
  }
}

// Export singleton instance
export const networkConditionDetector = NetworkConditionDetector.getInstance();

// Export types
export type {
  NetworkCondition,
  NetworkOptimizationSettings,
  PerformanceMetrics
};