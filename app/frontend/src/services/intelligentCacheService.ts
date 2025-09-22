/**
 * Intelligent Caching and Preloading Service
 * Implements predictive preloading and usage-based cache management
 */

import { 
  EnhancedCommunityData, 
  UserProfile, 
  CacheConfig 
} from '../types/communityEnhancements';

// Predictive preloading interfaces
interface UserBehaviorPattern {
  userId: string;
  frequentCommunities: string[];
  commonNavigationPaths: string[];
  timeBasedPatterns: {
    hour: number;
    communities: string[];
    contentTypes: string[];
  }[];
  interactionHistory: {
    timestamp: number;
    action: string;
    target: string;
  }[];
}

interface PreloadingStrategy {
  priority: 'high' | 'medium' | 'low';
  confidence: number; // 0-1 score
  resources: string[];
  estimatedSize: number;
  networkCondition: 'fast' | 'slow' | 'offline';
}

interface CacheMetrics {
  hitRate: number;
  missRate: number;
  evictionRate: number;
  averageResponseTime: number;
  memoryUsage: number;
  networkSavings: number;
}

/**
 * Intelligent Cache Manager with predictive preloading
 */
export class IntelligentCacheManager {
  private behaviorPatterns = new Map<string, UserBehaviorPattern>();
  private preloadingQueue = new Map<string, PreloadingStrategy>();
  private networkMonitor: NetworkMonitor;
  private usageTracker: UsageTracker;
  private cacheMetrics: CacheMetrics;
  private preloadWorker: Worker | null = null;

  constructor(private config: CacheConfig = {
    maxSize: 1000,
    ttl: 15 * 60 * 1000,
    strategy: 'lru'
  }) {
    this.networkMonitor = new NetworkMonitor();
    this.usageTracker = new UsageTracker();
    this.cacheMetrics = {
      hitRate: 0,
      missRate: 0,
      evictionRate: 0,
      averageResponseTime: 0,
      memoryUsage: 0,
      networkSavings: 0
    };

    this.initializePreloadWorker();
    this.startPerformanceMonitoring();
  }

  /**
   * Initialize web worker for background preloading
   */
  private initializePreloadWorker(): void {
    if (typeof Worker !== 'undefined') {
      try {
        this.preloadWorker = new Worker('/workers/preload-worker.js');
        this.preloadWorker.onmessage = this.handleWorkerMessage.bind(this);
        this.preloadWorker.onerror = (error) => {
          console.warn('Preload worker error:', error);
          this.preloadWorker = null;
        };
      } catch (error) {
        console.warn('Failed to initialize preload worker:', error);
      }
    }
  }

  /**
   * Handle messages from preload worker
   */
  private handleWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data;
    
    switch (type) {
      case 'preload_complete':
        this.handlePreloadComplete(data);
        break;
      case 'preload_error':
        this.handlePreloadError(data);
        break;
      case 'cache_update':
        this.updateCacheFromWorker(data);
        break;
    }
  }

  /**
   * Analyze user behavior and predict next actions
   */
  analyzeUserBehavior(userId: string, action: string, target: string): void {
    let pattern = this.behaviorPatterns.get(userId);
    
    if (!pattern) {
      pattern = {
        userId,
        frequentCommunities: [],
        commonNavigationPaths: [],
        timeBasedPatterns: [],
        interactionHistory: []
      };
      this.behaviorPatterns.set(userId, pattern);
    }

    // Add to interaction history
    pattern.interactionHistory.push({
      timestamp: Date.now(),
      action,
      target
    });

    // Keep only last 1000 interactions
    if (pattern.interactionHistory.length > 1000) {
      pattern.interactionHistory = pattern.interactionHistory.slice(-1000);
    }

    // Update patterns
    this.updateBehaviorPatterns(pattern);
    
    // Trigger predictive preloading
    this.triggerPredictivePreloading(userId, action, target);
  }

  /**
   * Update behavior patterns based on interaction history
   */
  private updateBehaviorPatterns(pattern: UserBehaviorPattern): void {
    const recentInteractions = pattern.interactionHistory.slice(-100);
    
    // Analyze frequent communities
    const communityFrequency = new Map<string, number>();
    recentInteractions.forEach(interaction => {
      if (interaction.action === 'visit_community') {
        const count = communityFrequency.get(interaction.target) || 0;
        communityFrequency.set(interaction.target, count + 1);
      }
    });

    pattern.frequentCommunities = Array.from(communityFrequency.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([community]) => community);

    // Analyze time-based patterns
    this.updateTimeBasedPatterns(pattern, recentInteractions);
    
    // Analyze navigation paths
    this.updateNavigationPaths(pattern, recentInteractions);
  }

  /**
   * Update time-based usage patterns
   */
  private updateTimeBasedPatterns(
    pattern: UserBehaviorPattern, 
    interactions: typeof pattern.interactionHistory
  ): void {
    const hourlyPatterns = new Map<number, { communities: Set<string>; contentTypes: Set<string> }>();

    interactions.forEach(interaction => {
      const hour = new Date(interaction.timestamp).getHours();
      
      if (!hourlyPatterns.has(hour)) {
        hourlyPatterns.set(hour, { communities: new Set(), contentTypes: new Set() });
      }

      const hourPattern = hourlyPatterns.get(hour)!;
      
      if (interaction.action === 'visit_community') {
        hourPattern.communities.add(interaction.target);
      } else if (interaction.action === 'view_content') {
        hourPattern.contentTypes.add(interaction.target);
      }
    });

    pattern.timeBasedPatterns = Array.from(hourlyPatterns.entries()).map(([hour, data]) => ({
      hour,
      communities: Array.from(data.communities),
      contentTypes: Array.from(data.contentTypes)
    }));
  }

  /**
   * Update common navigation paths
   */
  private updateNavigationPaths(
    pattern: UserBehaviorPattern,
    interactions: typeof pattern.interactionHistory
  ): void {
    const paths: string[] = [];
    
    for (let i = 0; i < interactions.length - 1; i++) {
      const current = interactions[i];
      const next = interactions[i + 1];
      
      // Only consider navigation actions within 5 minutes
      if (next.timestamp - current.timestamp < 5 * 60 * 1000) {
        paths.push(`${current.target}->${next.target}`);
      }
    }

    // Count path frequency
    const pathFrequency = new Map<string, number>();
    paths.forEach(path => {
      const count = pathFrequency.get(path) || 0;
      pathFrequency.set(path, count + 1);
    });

    pattern.commonNavigationPaths = Array.from(pathFrequency.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([path]) => path);
  }

  /**
   * Trigger predictive preloading based on user behavior
   */
  private triggerPredictivePreloading(userId: string, action: string, target: string): void {
    const pattern = this.behaviorPatterns.get(userId);
    if (!pattern) return;

    const strategies = this.generatePreloadingStrategies(pattern, action, target);
    
    strategies.forEach(strategy => {
      if (strategy.confidence > 0.6 && this.shouldPreload(strategy)) {
        this.schedulePreloading(strategy);
      }
    });
  }

  /**
   * Generate preloading strategies based on patterns
   */
  private generatePreloadingStrategies(
    pattern: UserBehaviorPattern,
    currentAction: string,
    currentTarget: string
  ): PreloadingStrategy[] {
    const strategies: PreloadingStrategy[] = [];
    const networkCondition = this.networkMonitor.getNetworkCondition();

    // Strategy 1: Frequent communities
    if (currentAction === 'visit_community') {
      pattern.frequentCommunities.forEach((communityId, index) => {
        if (communityId !== currentTarget) {
          strategies.push({
            priority: index < 3 ? 'high' : 'medium',
            confidence: Math.max(0.8 - (index * 0.1), 0.3),
            resources: [
              `/api/communities/${communityId}`,
              `/api/communities/${communityId}/posts`,
              `/api/communities/${communityId}/icon`
            ],
            estimatedSize: 150 * 1024, // 150KB estimate
            networkCondition
          });
        }
      });
    }

    // Strategy 2: Navigation path prediction
    const currentHour = new Date().getHours();
    const timePattern = pattern.timeBasedPatterns.find(p => p.hour === currentHour);
    
    if (timePattern) {
      timePattern.communities.forEach(communityId => {
        if (communityId !== currentTarget) {
          strategies.push({
            priority: 'medium',
            confidence: 0.7,
            resources: [
              `/api/communities/${communityId}`,
              `/api/communities/${communityId}/posts`
            ],
            estimatedSize: 100 * 1024,
            networkCondition
          });
        }
      });
    }

    // Strategy 3: Common navigation paths
    const relevantPaths = pattern.commonNavigationPaths.filter(path => 
      path.startsWith(currentTarget)
    );

    relevantPaths.forEach((path, index) => {
      const nextTarget = path.split('->')[1];
      strategies.push({
        priority: index < 2 ? 'high' : 'low',
        confidence: Math.max(0.9 - (index * 0.15), 0.4),
        resources: this.getResourcesForTarget(nextTarget),
        estimatedSize: 80 * 1024,
        networkCondition
      });
    });

    // Strategy 4: Related content preloading
    if (currentAction === 'view_post') {
      strategies.push({
        priority: 'medium',
        confidence: 0.6,
        resources: [
          `/api/posts/${currentTarget}/related`,
          `/api/posts/${currentTarget}/comments`
        ],
        estimatedSize: 50 * 1024,
        networkCondition
      });
    }

    return strategies.sort((a, b) => 
      (b.confidence * this.getPriorityWeight(b.priority)) - 
      (a.confidence * this.getPriorityWeight(a.priority))
    );
  }

  /**
   * Determine if preloading should proceed based on conditions
   */
  private shouldPreload(strategy: PreloadingStrategy): boolean {
    const networkCondition = this.networkMonitor.getNetworkCondition();
    
    // Don't preload on slow networks for low priority items
    if (networkCondition === 'slow' && strategy.priority === 'low') {
      return false;
    }

    // Don't preload if offline
    if (networkCondition === 'offline') {
      return false;
    }

    // Check memory constraints
    if (this.cacheMetrics.memoryUsage > 50 * 1024 * 1024) { // 50MB limit
      return strategy.priority === 'high';
    }

    // Check if already in queue or cache
    const resourceKey = strategy.resources[0];
    if (this.preloadingQueue.has(resourceKey)) {
      return false;
    }

    return true;
  }

  /**
   * Schedule preloading with appropriate timing
   */
  private schedulePreloading(strategy: PreloadingStrategy): void {
    const delay = this.calculatePreloadDelay(strategy);
    
    setTimeout(() => {
      this.executePreloading(strategy);
    }, delay);
  }

  /**
   * Calculate appropriate delay for preloading
   */
  private calculatePreloadDelay(strategy: PreloadingStrategy): number {
    const baseDelay = {
      'high': 100,    // 100ms
      'medium': 500,  // 500ms
      'low': 2000     // 2s
    }[strategy.priority];

    const networkMultiplier = {
      'fast': 1,
      'slow': 2,
      'offline': 0
    }[strategy.networkCondition];

    return baseDelay * networkMultiplier;
  }

  /**
   * Execute preloading strategy
   */
  private async executePreloading(strategy: PreloadingStrategy): Promise<void> {
    const resourceKey = strategy.resources[0];
    this.preloadingQueue.set(resourceKey, strategy);

    try {
      if (this.preloadWorker) {
        // Use web worker for background preloading
        this.preloadWorker.postMessage({
          type: 'preload_resources',
          data: {
            resources: strategy.resources,
            priority: strategy.priority,
            networkCondition: strategy.networkCondition
          }
        });
      } else {
        // Fallback to main thread preloading
        await this.preloadResourcesMainThread(strategy.resources);
      }
    } catch (error) {
      console.warn('Preloading failed:', error);
      this.preloadingQueue.delete(resourceKey);
    }
  }

  /**
   * Preload resources on main thread (fallback)
   */
  private async preloadResourcesMainThread(resources: string[]): Promise<void> {
    const preloadPromises = resources.map(async (resource) => {
      try {
        const response = await fetch(resource, {
          method: 'GET',
          headers: { 'X-Preload': 'true' }
        });
        
        if (response.ok) {
          // Cache the response
          const cache = await caches.open('preload-cache');
          await cache.put(resource, response.clone());
        }
      } catch (error) {
        console.warn(`Failed to preload ${resource}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Handle preload completion from worker
   */
  private handlePreloadComplete(data: { resource: string; success: boolean }): void {
    this.preloadingQueue.delete(data.resource);
    
    if (data.success) {
      this.cacheMetrics.networkSavings += 1;
    }
  }

  /**
   * Handle preload error from worker
   */
  private handlePreloadError(data: { resource: string; error: string }): void {
    console.warn(`Preload error for ${data.resource}:`, data.error);
    this.preloadingQueue.delete(data.resource);
  }

  /**
   * Update cache from worker data
   */
  private updateCacheFromWorker(data: { resource: string; data: any }): void {
    // Update local cache with worker data
    // This would integrate with existing cache services
  }

  /**
   * Get resources needed for a target
   */
  private getResourcesForTarget(target: string): string[] {
    if (target.startsWith('community:')) {
      const communityId = target.replace('community:', '');
      return [
        `/api/communities/${communityId}`,
        `/api/communities/${communityId}/posts`,
        `/api/communities/${communityId}/icon`
      ];
    } else if (target.startsWith('post:')) {
      const postId = target.replace('post:', '');
      return [
        `/api/posts/${postId}`,
        `/api/posts/${postId}/comments`
      ];
    } else if (target.startsWith('user:')) {
      const userId = target.replace('user:', '');
      return [
        `/api/users/${userId}/profile`,
        `/api/users/${userId}/posts`
      ];
    }
    
    return [];
  }

  /**
   * Get priority weight for sorting
   */
  private getPriorityWeight(priority: string): number {
    return { 'high': 3, 'medium': 2, 'low': 1 }[priority] || 1;
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updateCacheMetrics();
    }, 30000); // Update every 30 seconds
  }

  /**
   * Update cache performance metrics
   */
  private updateCacheMetrics(): void {
    // This would integrate with existing cache services to get metrics
    // For now, we'll simulate some basic metrics
    
    const totalRequests = this.usageTracker.getTotalRequests();
    const cacheHits = this.usageTracker.getCacheHits();
    
    this.cacheMetrics.hitRate = totalRequests > 0 ? cacheHits / totalRequests : 0;
    this.cacheMetrics.missRate = 1 - this.cacheMetrics.hitRate;
    
    // Estimate memory usage
    this.cacheMetrics.memoryUsage = this.estimateMemoryUsage();
  }

  /**
   * Estimate current memory usage
   */
  private estimateMemoryUsage(): number {
    // Rough estimate based on cache sizes
    return (
      this.behaviorPatterns.size * 10 * 1024 + // 10KB per pattern
      this.preloadingQueue.size * 5 * 1024     // 5KB per queued item
    );
  }

  /**
   * Get current cache metrics
   */
  getCacheMetrics(): CacheMetrics {
    return { ...this.cacheMetrics };
  }

  /**
   * Get preloading queue status
   */
  getPreloadingStatus(): {
    queueSize: number;
    inProgress: string[];
    completed: number;
  } {
    return {
      queueSize: this.preloadingQueue.size,
      inProgress: Array.from(this.preloadingQueue.keys()),
      completed: this.cacheMetrics.networkSavings
    };
  }

  /**
   * Clear all behavior patterns and reset
   */
  reset(): void {
    this.behaviorPatterns.clear();
    this.preloadingQueue.clear();
    this.cacheMetrics = {
      hitRate: 0,
      missRate: 0,
      evictionRate: 0,
      averageResponseTime: 0,
      memoryUsage: 0,
      networkSavings: 0
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.preloadWorker) {
      this.preloadWorker.terminate();
      this.preloadWorker = null;
    }
    
    this.reset();
  }
}

/**
 * Network condition monitor
 */
class NetworkMonitor {
  private networkCondition: 'fast' | 'slow' | 'offline' = 'fast';
  private connectionSpeed = 0;

  constructor() {
    this.initializeNetworkMonitoring();
  }

  private initializeNetworkMonitoring(): void {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.updateNetworkCondition();
    });

    window.addEventListener('offline', () => {
      this.networkCondition = 'offline';
    });

    // Monitor connection speed if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateConnection = () => {
        this.connectionSpeed = connection.downlink || 0;
        this.updateNetworkCondition();
      };

      connection.addEventListener('change', updateConnection);
      updateConnection();
    }

    // Initial check
    this.updateNetworkCondition();
  }

  private updateNetworkCondition(): void {
    if (!navigator.onLine) {
      this.networkCondition = 'offline';
      return;
    }

    // Use connection speed if available
    if (this.connectionSpeed > 0) {
      this.networkCondition = this.connectionSpeed > 1.5 ? 'fast' : 'slow';
    } else {
      // Fallback to simple online check
      this.networkCondition = 'fast';
    }
  }

  getNetworkCondition(): 'fast' | 'slow' | 'offline' {
    return this.networkCondition;
  }

  getConnectionSpeed(): number {
    return this.connectionSpeed;
  }
}

/**
 * Usage tracking for cache optimization
 */
class UsageTracker {
  private totalRequests = 0;
  private cacheHits = 0;
  private requestTimes = new Map<string, number[]>();

  recordRequest(resource: string, fromCache: boolean, responseTime: number): void {
    this.totalRequests++;
    
    if (fromCache) {
      this.cacheHits++;
    }

    // Track response times
    if (!this.requestTimes.has(resource)) {
      this.requestTimes.set(resource, []);
    }
    
    const times = this.requestTimes.get(resource)!;
    times.push(responseTime);
    
    // Keep only last 100 times
    if (times.length > 100) {
      times.shift();
    }
  }

  getTotalRequests(): number {
    return this.totalRequests;
  }

  getCacheHits(): number {
    return this.cacheHits;
  }

  getAverageResponseTime(resource?: string): number {
    if (resource) {
      const times = this.requestTimes.get(resource) || [];
      return times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
    }

    // Overall average
    let totalTime = 0;
    let totalCount = 0;
    
    for (const times of this.requestTimes.values()) {
      totalTime += times.reduce((sum, time) => sum + time, 0);
      totalCount += times.length;
    }

    return totalCount > 0 ? totalTime / totalCount : 0;
  }

  reset(): void {
    this.totalRequests = 0;
    this.cacheHits = 0;
    this.requestTimes.clear();
  }
}

// Export singleton instance
export const intelligentCacheManager = new IntelligentCacheManager();
export default IntelligentCacheManager;