// Progressive Enhancement Utilities
// Provides fallback functionality when backend services are unavailable

export interface FeatureConfig {
  name: string;
  isAvailable: boolean;
  fallbackEnabled: boolean;
  priority: 'critical' | 'important' | 'optional';
}

interface CachedData {
  timestamp: number;
  data: any;
  ttl: number;
}

class ProgressiveEnhancementService {
  private features: Map<string, FeatureConfig> = new Map();
  private cachedData: Map<string, CachedData> = new Map();
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.initializeFeatures();
    this.setupConnectivityListeners();
  }

  private initializeFeatures() {
    // Define core features and their availability
    const coreFeatures: FeatureConfig[] = [
      { name: 'feed', isAvailable: true, fallbackEnabled: true, priority: 'critical' },
      { name: 'posts', isAvailable: true, fallbackEnabled: true, priority: 'critical' },
      { name: 'communities', isAvailable: true, fallbackEnabled: true, priority: 'critical' },
      { name: 'profiles', isAvailable: true, fallbackEnabled: true, priority: 'important' },
      { name: 'search', isAvailable: true, fallbackEnabled: true, priority: 'important' },
      { name: 'notifications', isAvailable: true, fallbackEnabled: false, priority: 'optional' },
      { name: 'realtime', isAvailable: true, fallbackEnabled: false, priority: 'optional' },
      { name: 'analytics', isAvailable: true, fallbackEnabled: false, priority: 'optional' }
    ];

    coreFeatures.forEach(feature => {
      this.features.set(feature.name, feature);
    });
  }

  private setupConnectivityListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.enableAllFeatures();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.enableFallbackMode();
    });
  }

  // Check if a feature is available
  isFeatureAvailable(featureName: string): boolean {
    const feature = this.features.get(featureName);
    if (!feature) return false;

    // If offline, only return true if fallback is enabled
    if (!this.isOnline) {
      return feature.fallbackEnabled;
    }

    return feature.isAvailable;
  }

  // Disable a feature (e.g., when backend service is down)
  disableFeature(featureName: string, reason?: string) {
    const feature = this.features.get(featureName);
    if (feature) {
      feature.isAvailable = false;
      console.warn(`Feature '${featureName}' disabled: ${reason || 'Unknown reason'}`);
    }
  }

  // Enable a feature
  enableFeature(featureName: string) {
    const feature = this.features.get(featureName);
    if (feature) {
      feature.isAvailable = true;
      console.log(`Feature '${featureName}' enabled`);
    }
  }

  // Enable all features (when coming back online)
  private enableAllFeatures() {
    this.features.forEach((feature, name) => {
      feature.isAvailable = true;
    });
    console.log('All features enabled - connection restored');
  }

  // Enable only fallback features (when going offline)
  private enableFallbackMode() {
    this.features.forEach((feature, name) => {
      feature.isAvailable = feature.fallbackEnabled;
    });
    console.log('Fallback mode enabled - limited functionality available');
  }

  // Cache data for offline use
  cacheData(key: string, data: any, ttl: number = 300000) { // 5 minutes default TTL
    this.cachedData.set(key, {
      timestamp: Date.now(),
      data,
      ttl
    });
  }

  // Get cached data
  getCachedData(key: string): any | null {
    const cached = this.cachedData.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > cached.ttl) {
      this.cachedData.delete(key);
      return null;
    }

    return cached.data;
  }

  // Check if data is cached and fresh
  hasFreshCache(key: string): boolean {
    const cached = this.cachedData.get(key);
    if (!cached) return false;

    const age = Date.now() - cached.timestamp;
    return age <= cached.ttl;
  }

  // Get fallback data for a feature
  getFallbackData(featureName: string): any {
    switch (featureName) {
      case 'feed':
        return this.getCachedData('feed') || this.getEmptyFeedData();
      case 'communities':
        return this.getCachedData('communities') || this.getEmptyCommunitiesData();
      case 'posts':
        return this.getCachedData('posts') || this.getEmptyPostsData();
      case 'profiles':
        return this.getCachedData('profiles') || this.getEmptyProfileData();
      default:
        return null;
    }
  }

  // Generate empty data structures for fallback
  private getEmptyFeedData() {
    return {
      posts: [],
      hasMore: false,
      message: 'No cached posts available. Connect to internet to load fresh content.'
    };
  }

  private getEmptyCommunitiesData() {
    return {
      communities: [],
      message: 'No cached communities available. Connect to internet to browse communities.'
    };
  }

  private getEmptyPostsData() {
    return {
      posts: [],
      message: 'No cached posts available.'
    };
  }

  private getEmptyProfileData() {
    return {
      user: null,
      message: 'Profile data not available offline.'
    };
  }

  // Get feature status for UI
  getFeatureStatus(featureName: string): {
    available: boolean;
    fallback: boolean;
    priority: string;
    message?: string;
  } {
    const feature = this.features.get(featureName);
    if (!feature) {
      return {
        available: false,
        fallback: false,
        priority: 'optional',
        message: 'Feature not found'
      };
    }

    const isUsingFallback = !this.isOnline && feature.fallbackEnabled;
    
    return {
      available: feature.isAvailable,
      fallback: isUsingFallback,
      priority: feature.priority,
      message: isUsingFallback ? 'Using cached data' : undefined
    };
  }

  // Get all feature statuses
  getAllFeatureStatuses(): Record<string, any> {
    const statuses: Record<string, any> = {};
    
    this.features.forEach((feature, name) => {
      statuses[name] = this.getFeatureStatus(name);
    });

    return statuses;
  }

  // Check if core functionality is available
  isCoreAvailable(): boolean {
    const coreFeatures = ['feed', 'posts', 'communities'];
    return coreFeatures.some(feature => this.isFeatureAvailable(feature));
  }

  // Get degraded mode message
  getDegradedModeMessage(): string | null {
    if (this.isOnline) return null;

    const availableFeatures = Array.from(this.features.entries())
      .filter(([name, feature]) => feature.fallbackEnabled)
      .map(([name]) => name);

    if (availableFeatures.length === 0) {
      return 'You are offline. Limited functionality available.';
    }

    return `You are offline. Available features: ${availableFeatures.join(', ')}`;
  }

  // Clear expired cache entries
  clearExpiredCache() {
    const now = Date.now();
    
    this.cachedData.forEach((cached, key) => {
      const age = now - cached.timestamp;
      if (age > cached.ttl) {
        this.cachedData.delete(key);
      }
    });
  }

  // Get cache statistics
  getCacheStats(): {
    totalEntries: number;
    totalSize: number;
    expiredEntries: number;
  } {
    const now = Date.now();
    let totalSize = 0;
    let expiredEntries = 0;

    this.cachedData.forEach((cached) => {
      totalSize += JSON.stringify(cached.data).length;
      const age = now - cached.timestamp;
      if (age > cached.ttl) {
        expiredEntries++;
      }
    });

    return {
      totalEntries: this.cachedData.size,
      totalSize,
      expiredEntries
    };
  }
}

// Export singleton instance
export const progressiveEnhancement = new ProgressiveEnhancementService();

// Utility functions for components
export const withFallback = <T>(
  featureName: string,
  primaryAction: () => Promise<T>,
  fallbackAction?: () => T
): Promise<T> => {
  if (!progressiveEnhancement.isFeatureAvailable(featureName)) {
    if (fallbackAction) {
      return Promise.resolve(fallbackAction());
    }
    throw new Error(`Feature '${featureName}' is not available`);
  }

  return primaryAction().catch((error) => {
    console.error(`Primary action failed for '${featureName}':`, error);
    
    if (fallbackAction) {
      console.log(`Using fallback for '${featureName}'`);
      return fallbackAction();
    }
    
    throw error;
  });
};

// Hook for React components (to be imported separately)
export const createProgressiveEnhancementHook = () => {
  return (featureName: string) => {
    // This will be implemented in a separate hook file to avoid React dependency here
    return progressiveEnhancement.getFeatureStatus(featureName);
  };
};

export default progressiveEnhancement;