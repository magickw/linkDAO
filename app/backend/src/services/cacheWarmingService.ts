import { cacheService } from './cacheService';
import { safeLogger } from '../utils/safeLogger';

import { sellerProfileService } from './sellerProfileService';
import { marketplaceListingsService } from './marketplaceListingsService';
import { reputationService } from './reputationService';
import { MarketplaceListingFilters } from '../types/marketplaceListing';

interface WarmupJob {
  key: string;
  loader: () => Promise<any>;
  priority: 'high' | 'medium' | 'low';
  ttl: number;
  dependencies?: string[];
}

interface WarmupStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  startTime: number;
  endTime?: number;
  duration?: number;
}

export class CacheWarmingService {
  private warmupQueue: WarmupJob[] = [];
  private isWarming = false;
  private stats: WarmupStats = {
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    startTime: 0
  };

  constructor() {
    // Start periodic warming
    this.startPeriodicWarming();
  }

  // Schedule a warmup job
  async scheduleWarmup(job: WarmupJob): Promise<void> {
    this.warmupQueue.push(job);
    this.sortQueueByPriority();
  }

  // Warm popular seller profiles
  async warmPopularSellerProfiles(limit: number = 10): Promise<void> { // Reduced from 50 to 10
    safeLogger.info(`Warming ${limit} popular seller profiles...`);

    // This would typically query for popular sellers from analytics
    // For now, we'll create placeholder jobs
    const popularSellerAddresses = await this.getPopularSellerAddresses(limit);

    for (const address of popularSellerAddresses) {
      await this.scheduleWarmup({
        key: `seller:profile:${address.toLowerCase()}`,
        loader: async () => {
          return await sellerProfileService.getProfile(address);
        },
        priority: 'high',
        ttl: 300 // 5 minutes
      });
    }
  }

  // Warm popular listings
  async warmPopularListings(): Promise<void> {
    safeLogger.info('Warming popular listings...');

    // Reduce the number of filter combinations to warm
    const popularFilters: MarketplaceListingFilters[] = [
      {}, // All listings
      { sortBy: 'createdAt', sortOrder: 'desc' }, // Newest first
      { limit: 10, offset: 0 }, // First page with smaller limit
    ];

    for (const filters of popularFilters) {
      await this.scheduleWarmup({
        key: `listings:${this.generateFilterHash(filters)}`,
        loader: async () => {
          return await marketplaceListingsService.getListings(filters);
        },
        priority: 'medium',
        ttl: 60 // 1 minute
      });
    }
  }

  // Warm reputation data for active users
  async warmActiveUserReputations(limit: number = 20): Promise<void> { // Reduced from 100 to 20
    safeLogger.info(`Warming reputation data for ${limit} active users...`);

    const activeUserAddresses = await this.getActiveUserAddresses(limit);

    for (const address of activeUserAddresses) {
      await this.scheduleWarmup({
        key: `reputation:${address.toLowerCase()}`,
        loader: async () => {
          return await reputationService.getReputation(address);
        },
        priority: 'medium',
        ttl: 600 // 10 minutes
      });
    }
  }

  // Warm search results for popular queries
  async warmPopularSearchResults(): Promise<void> {
    safeLogger.info('Warming popular search results...');

    const popularQueries = [
      'nft',
      'defi',
      'token',
      'art',
      'collectible',
      'gaming',
      'metaverse'
    ];

    for (const query of popularQueries) {
      await this.scheduleWarmup({
        key: `search:${Buffer.from(query).toString('base64')}`,
        loader: async () => {
          // This would call the search service
          return { query, results: [] }; // Placeholder
        },
        priority: 'low',
        ttl: 300 // 5 minutes
      });
    }
  }

  // Warm category data
  async warmCategoryData(): Promise<void> {
    safeLogger.info('Warming category data...');

    await this.scheduleWarmup({
      key: 'categories:all',
      loader: async () => {
        // This would fetch categories from the database
        return [
          { id: 'nft', name: 'NFTs', count: 0 },
          { id: 'defi', name: 'DeFi', count: 0 },
          { id: 'gaming', name: 'Gaming', count: 0 },
          { id: 'art', name: 'Art', count: 0 },
          { id: 'collectibles', name: 'Collectibles', count: 0 }
        ];
      },
      priority: 'high',
      ttl: 1800 // 30 minutes
    });
  }

  // Execute all warmup jobs
  async executeWarmup(): Promise<WarmupStats> {
    if (this.isWarming) {
      safeLogger.info('Cache warming already in progress');
      return this.stats;
    }

    this.isWarming = true;
    this.stats = {
      totalJobs: this.warmupQueue.length,
      completedJobs: 0,
      failedJobs: 0,
      startTime: Date.now()
    };

    safeLogger.info(`Starting cache warming with ${this.stats.totalJobs} jobs...`);

    // Process jobs in smaller batches to avoid overwhelming the system
    const batchSize = 3; // Reduced from 5 to 3
    while (this.warmupQueue.length > 0) {
      const batch = this.warmupQueue.splice(0, batchSize);
      
      const batchPromises = batch.map(job => this.executeWarmupJob(job));
      await Promise.allSettled(batchPromises);

      // Small delay between batches
      if (this.warmupQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 200)); // Increased delay to 200ms
      }
    }

    this.stats.endTime = Date.now();
    this.stats.duration = this.stats.endTime - this.stats.startTime;
    this.isWarming = false;

    safeLogger.info(`Cache warming completed in ${this.stats.duration}ms`);
    safeLogger.info(`Success: ${this.stats.completedJobs}, Failed: ${this.stats.failedJobs}`);

    return this.stats;
  }

  // Execute a single warmup job
  private async executeWarmupJob(job: WarmupJob): Promise<void> {
    try {
      safeLogger.info(`Warming cache: ${job.key} (priority: ${job.priority})`);
      
      const data = await job.loader();
      
      // Use dynamic import to avoid circular dependencies
      // Explicitly import the JavaScript version
      const cacheModule: any = await import('./cacheService.js');
      let cacheService;
      if (cacheModule.default) {
        // If it's a class, create an instance
        if (typeof cacheModule.default === 'function') {
          cacheService = new cacheModule.default();
        } else {
          cacheService = cacheModule.default;
        }
      } else {
        cacheService = cacheModule;
      }
      await cacheService.set(job.key, data, job.ttl);
      
      this.stats.completedJobs++;
      safeLogger.info(`✅ Warmed: ${job.key}`);
    } catch (error) {
      this.stats.failedJobs++;
      safeLogger.error(`❌ Failed to warm ${job.key}:`, error);
    }
  }

  // Sort queue by priority
  private sortQueueByPriority(): void {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    this.warmupQueue.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }

  // Start periodic warming
  private startPeriodicWarming(): void {
    // Run full warmup every hour
    setInterval(async () => {
      try {
        await this.performFullWarmup();
      } catch (error) {
        safeLogger.error('Periodic cache warming failed:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

    // Run quick warmup every 15 minutes
    setInterval(async () => {
      try {
        await this.performQuickWarmup();
      } catch (error) {
        safeLogger.error('Quick cache warming failed:', error);
      }
    }, 15 * 60 * 1000); // 15 minutes
  }

  // Perform full warmup
  async performFullWarmup(): Promise<WarmupStats> {
    safeLogger.info('Starting full cache warmup...');

    // Clear existing queue
    this.warmupQueue = [];

    // Schedule all warmup jobs
    await Promise.all([
      this.warmPopularSellerProfiles(50),
      this.warmPopularListings(),
      this.warmActiveUserReputations(100),
      this.warmPopularSearchResults(),
      this.warmCategoryData()
    ]);

    return await this.executeWarmup();
  }

  // Perform quick warmup (only high priority items)
  async performQuickWarmup(): Promise<WarmupStats> {
    safeLogger.info('Starting quick cache warmup...');

    // Clear existing queue
    this.warmupQueue = [];

    // Only warm high priority items with smaller limits
    await Promise.all([
      this.warmPopularSellerProfiles(5), // Reduced from 20 to 5
      this.warmCategoryData()
    ]);

    return await this.executeWarmup();
  }

  // Get popular seller addresses (placeholder implementation)
  private async getPopularSellerAddresses(limit: number): Promise<string[]> {
    // This would typically query analytics data or database
    // For now, return placeholder addresses
    const addresses: string[] = [];
    for (let i = 0; i < limit; i++) {
      addresses.push(`0x${i.toString(16).padStart(40, '0')}`);
    }
    return addresses;
  }

  // Get active user addresses (placeholder implementation)
  private async getActiveUserAddresses(limit: number): Promise<string[]> {
    // This would typically query recent activity data
    // For now, return placeholder addresses
    const addresses: string[] = [];
    for (let i = 0; i < limit; i++) {
      addresses.push(`0x${(i + 1000).toString(16).padStart(40, '0')}`);
    }
    return addresses;
  }

  // Generate filter hash for caching
  private generateFilterHash(filters: any): string {
    const crypto = require('crypto');
    const filterString = JSON.stringify(filters, Object.keys(filters).sort());
    return crypto.createHash('md5').update(filterString).digest('hex');
  }

  // Get current warmup stats
  getStats(): WarmupStats {
    return { ...this.stats };
  }

  // Check if warming is in progress
  isWarmingInProgress(): boolean {
    return this.isWarming;
  }

  // Get queue status
  getQueueStatus(): {
    queueLength: number;
    highPriorityJobs: number;
    mediumPriorityJobs: number;
    lowPriorityJobs: number;
  } {
    return {
      queueLength: this.warmupQueue.length,
      highPriorityJobs: this.warmupQueue.filter(job => job.priority === 'high').length,
      mediumPriorityJobs: this.warmupQueue.filter(job => job.priority === 'medium').length,
      lowPriorityJobs: this.warmupQueue.filter(job => job.priority === 'low').length
    };
  }

  // Manual trigger for warmup
  async triggerWarmup(type: 'full' | 'quick' = 'quick'): Promise<WarmupStats> {
    if (type === 'full') {
      return await this.performFullWarmup();
    } else {
      return await this.performQuickWarmup();
    }
  }
}

// Singleton instance
export const cacheWarmingService = new CacheWarmingService();
