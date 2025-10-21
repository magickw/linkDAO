/**
 * Seller Query Optimizer
 * Specialized query optimization for seller-related database operations
 * Task 15: Optimize database queries and performance for seller integration consistency
 */

import { Pool, PoolClient } from 'pg';
import { performance } from 'perf_hooks';

interface SellerQueryMetrics {
  queryType: string;
  sellerWalletAddress?: string;
  executionTime: number;
  rowsReturned: number;
  queryHash: string;
  timestamp: number;
  metadata: Record<string, any>;
}

interface SellerQueryOptimization {
  queryType: string;
  originalQuery: string;
  optimizedQuery: string;
  estimatedImprovement: number;
  reason: string;
  indexRecommendations: string[];
}

interface SellerCacheStrategy {
  key: string;
  ttl: number;
  invalidationTriggers: string[];
  compressionEnabled: boolean;
}

/**
 * Seller Query Optimizer
 * Optimizes database queries specifically for seller operations
 */
export class SellerQueryOptimizer {
  private pool: Pool;
  private queryMetrics: SellerQueryMetrics[] = [];
  private optimizedQueries: Map<string, string> = new Map();
  private cacheStrategies: Map<string, SellerCacheStrategy> = new Map();

  constructor(pool: Pool) {
    this.pool = pool;
    this.initializeOptimizedQueries();
    this.initializeCacheStrategies();
  }

  /**
   * Initialize pre-optimized queries for common seller operations
   */
  private initializeOptimizedQueries(): void {
    // Seller profile lookup optimization
    this.optimizedQueries.set('getSellerProfile', `
      SELECT 
        s.wallet_address,
        s.display_name,
        s.store_name,
        s.bio,
        s.tier_id,
        s.performance_score,
        s.total_sales,
        s.total_orders,
        s.average_rating,
        s.is_verified,
        s.onboarding_completed,
        s.profile_image_cdn,
        s.cover_image_cdn,
        s.created_at,
        s.updated_at,
        st.name as tier_name,
        st.benefits as tier_benefits
      FROM sellers s
      LEFT JOIN seller_tiers st ON s.tier_id = st.id
      WHERE s.wallet_address = $1
      LIMIT 1
    `);

    // Seller dashboard data optimization
    this.optimizedQueries.set('getSellerDashboard', `
      SELECT 
        s.*,
        st.name as tier_name,
        st.benefits as tier_benefits,
        st.limitations as tier_limitations,
        COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active') as active_listings,
        COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'pending') as pending_orders,
        COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'completed' AND o.created_at > NOW() - INTERVAL '30 days') as recent_completed_orders,
        COALESCE(AVG(o.total_amount) FILTER (WHERE o.status = 'completed' AND o.created_at > NOW() - INTERVAL '30 days'), 0) as avg_order_value_30d
      FROM sellers s
      LEFT JOIN seller_tiers st ON s.tier_id = st.id
      LEFT JOIN products p ON s.id = p.seller_id
      LEFT JOIN orders o ON s.id = o.seller_id
      WHERE s.wallet_address = $1
      GROUP BY s.id, st.id, st.name, st.benefits, st.limitations
    `);

    // Seller listings optimization with pagination
    this.optimizedQueries.set('getSellerListings', `
      SELECT 
        p.id,
        p.title,
        p.description,
        p.price_amount,
        p.price_currency,
        p.status,
        p.listing_status,
        p.views,
        p.favorites,
        p.image_cdn_urls,
        p.primary_image_index,
        p.created_at,
        p.updated_at,
        c.name as category_name,
        c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.seller_id = (SELECT id FROM sellers WHERE wallet_address = $1)
        AND ($2::text IS NULL OR p.status = $2)
      ORDER BY p.updated_at DESC
      LIMIT $3 OFFSET $4
    `);

    // Seller analytics optimization
    this.optimizedQueries.set('getSellerAnalytics', `
      WITH recent_analytics AS (
        SELECT 
          metric_type,
          metric_value,
          recorded_at,
          ROW_NUMBER() OVER (PARTITION BY metric_type ORDER BY recorded_at DESC) as rn
        FROM seller_analytics
        WHERE seller_wallet_address = $1
          AND recorded_at > NOW() - INTERVAL '90 days'
      ),
      aggregated_metrics AS (
        SELECT 
          metric_type,
          AVG(metric_value) as avg_value,
          MAX(metric_value) as max_value,
          MIN(metric_value) as min_value,
          COUNT(*) as data_points
        FROM recent_analytics
        WHERE rn <= 30 -- Last 30 data points per metric
        GROUP BY metric_type
      )
      SELECT 
        am.*,
        ra.metric_value as latest_value,
        ra.recorded_at as latest_recorded_at
      FROM aggregated_metrics am
      LEFT JOIN recent_analytics ra ON am.metric_type = ra.metric_type AND ra.rn = 1
      ORDER BY am.metric_type
    `);

    // Seller store page optimization
    this.optimizedQueries.set('getSellerStore', `
      SELECT 
        s.wallet_address,
        s.display_name,
        s.store_name,
        s.bio,
        s.description,
        s.tier_id,
        s.performance_score,
        s.average_rating,
        s.is_verified,
        s.profile_image_cdn,
        s.cover_image_cdn,
        s.social_links,
        st.name as tier_name,
        COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active') as total_active_listings,
        COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'completed') as total_completed_orders,
        COALESCE(s.total_sales, 0) as total_sales
      FROM sellers s
      LEFT JOIN seller_tiers st ON s.tier_id = st.id
      LEFT JOIN products p ON s.id = p.seller_id
      LEFT JOIN orders o ON s.id = o.seller_id
      WHERE s.wallet_address = $1
      GROUP BY s.id, st.id, st.name
    `);

    // Seller tier upgrade check optimization
    this.optimizedQueries.set('checkTierUpgradeEligibility', `
      WITH seller_stats AS (
        SELECT 
          s.wallet_address,
          s.tier_id,
          s.total_sales,
          s.average_rating,
          s.total_orders,
          s.performance_score
        FROM sellers s
        WHERE s.wallet_address = $1
      ),
      next_tier AS (
        SELECT *
        FROM seller_tiers st
        WHERE st.level > (
          SELECT level FROM seller_tiers WHERE id = (SELECT tier_id FROM seller_stats)
        )
        ORDER BY st.level ASC
        LIMIT 1
      )
      SELECT 
        ss.*,
        nt.id as next_tier_id,
        nt.name as next_tier_name,
        nt.requirements as next_tier_requirements,
        nt.benefits as next_tier_benefits,
        CASE 
          WHEN ss.total_sales >= COALESCE((nt.requirements->>'min_sales')::numeric, 0)
            AND ss.average_rating >= COALESCE((nt.requirements->>'min_rating')::numeric, 0)
          THEN true
          ELSE false
        END as eligible_for_upgrade
      FROM seller_stats ss
      CROSS JOIN next_tier nt
    `);
  }

  /**
   * Initialize cache strategies for seller data
   */
  private initializeCacheStrategies(): void {
    this.cacheStrategies.set('sellerProfile', {
      key: 'seller:profile:{walletAddress}',
      ttl: 300, // 5 minutes
      invalidationTriggers: ['profile_update', 'tier_change'],
      compressionEnabled: true
    });

    this.cacheStrategies.set('sellerDashboard', {
      key: 'seller:dashboard:{walletAddress}',
      ttl: 180, // 3 minutes
      invalidationTriggers: ['profile_update', 'order_status_change', 'listing_update'],
      compressionEnabled: true
    });

    this.cacheStrategies.set('sellerListings', {
      key: 'seller:listings:{walletAddress}:{status}:{page}',
      ttl: 120, // 2 minutes
      invalidationTriggers: ['listing_update', 'listing_create', 'listing_delete'],
      compressionEnabled: false
    });

    this.cacheStrategies.set('sellerAnalytics', {
      key: 'seller:analytics:{walletAddress}',
      ttl: 600, // 10 minutes
      invalidationTriggers: ['analytics_update', 'order_completion'],
      compressionEnabled: true
    });

    this.cacheStrategies.set('sellerStore', {
      key: 'seller:store:{walletAddress}',
      ttl: 300, // 5 minutes
      invalidationTriggers: ['profile_update', 'store_update'],
      compressionEnabled: true
    });
  }

  /**
   * Execute optimized seller query with performance monitoring
   */
  async executeSellerQuery<T = any>(
    queryType: string,
    params: any[] = [],
    sellerWalletAddress?: string
  ): Promise<{
    rows: T[];
    metrics: SellerQueryMetrics;
    fromCache?: boolean;
  }> {
    const startTime = performance.now();
    const queryHash = this.generateQueryHash(queryType, params);

    try {
      // Check if we have an optimized version of this query
      const optimizedQuery = this.optimizedQueries.get(queryType);
      if (!optimizedQuery) {
        throw new Error(`No optimized query found for type: ${queryType}`);
      }

      // Execute the query
      const client = await this.pool.connect();
      let result;
      
      try {
        result = await client.query(optimizedQuery, params);
      } finally {
        client.release();
      }

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Create metrics
      const metrics: SellerQueryMetrics = {
        queryType,
        sellerWalletAddress,
        executionTime,
        rowsReturned: result.rowCount || 0,
        queryHash,
        timestamp: Date.now(),
        metadata: {
          paramsCount: params.length,
          optimized: true
        }
      };

      // Store metrics
      this.queryMetrics.push(metrics);
      
      // Keep only recent metrics (last 1000)
      if (this.queryMetrics.length > 1000) {
        this.queryMetrics = this.queryMetrics.slice(-1000);
      }

      // Track performance in database
      await this.trackQueryPerformance(metrics);

      return {
        rows: result.rows,
        metrics
      };

    } catch (error) {
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Log error metrics
      const errorMetrics: SellerQueryMetrics = {
        queryType,
        sellerWalletAddress,
        executionTime,
        rowsReturned: 0,
        queryHash,
        timestamp: Date.now(),
        metadata: {
          error: error.message,
          paramsCount: params.length
        }
      };

      this.queryMetrics.push(errorMetrics);
      throw error;
    }
  }

  /**
   * Track query performance in database
   */
  private async trackQueryPerformance(metrics: SellerQueryMetrics): Promise<void> {
    try {
      const client = await this.pool.connect();
      
      try {
        await client.query(`
          SELECT track_seller_query_performance($1, $2, $3, $4, $5)
        `, [
          metrics.queryType,
          metrics.sellerWalletAddress,
          metrics.executionTime,
          metrics.rowsReturned,
          JSON.stringify(metrics.metadata)
        ]);
      } finally {
        client.release();
      }
    } catch (error) {
      // Don't throw on tracking errors, just log
      console.error('Failed to track query performance:', error);
    }
  }

  /**
   * Generate query hash for caching and identification
   */
  private generateQueryHash(queryType: string, params: any[]): string {
    const crypto = require('crypto');
    const hashInput = queryType + JSON.stringify(params);
    return crypto.createHash('md5').update(hashInput).digest('hex');
  }

  /**
   * Get seller profile with optimization
   */
  async getSellerProfile(walletAddress: string): Promise<any> {
    const result = await this.executeSellerQuery(
      'getSellerProfile',
      [walletAddress],
      walletAddress
    );
    return result.rows[0] || null;
  }

  /**
   * Get seller dashboard data with optimization
   */
  async getSellerDashboard(walletAddress: string): Promise<any> {
    const result = await this.executeSellerQuery(
      'getSellerDashboard',
      [walletAddress],
      walletAddress
    );
    return result.rows[0] || null;
  }

  /**
   * Get seller listings with optimization and pagination
   */
  async getSellerListings(
    walletAddress: string,
    status?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<any[]> {
    const result = await this.executeSellerQuery(
      'getSellerListings',
      [walletAddress, status, limit, offset],
      walletAddress
    );
    return result.rows;
  }

  /**
   * Get seller analytics with optimization
   */
  async getSellerAnalytics(walletAddress: string): Promise<any[]> {
    const result = await this.executeSellerQuery(
      'getSellerAnalytics',
      [walletAddress],
      walletAddress
    );
    return result.rows;
  }

  /**
   * Get seller store data with optimization
   */
  async getSellerStore(walletAddress: string): Promise<any> {
    const result = await this.executeSellerQuery(
      'getSellerStore',
      [walletAddress],
      walletAddress
    );
    return result.rows[0] || null;
  }

  /**
   * Check tier upgrade eligibility with optimization
   */
  async checkTierUpgradeEligibility(walletAddress: string): Promise<any> {
    const result = await this.executeSellerQuery(
      'checkTierUpgradeEligibility',
      [walletAddress],
      walletAddress
    );
    return result.rows[0] || null;
  }

  /**
   * Invalidate seller cache
   */
  async invalidateSellerCache(
    walletAddress: string,
    invalidationType: string,
    component?: string
  ): Promise<void> {
    try {
      const client = await this.pool.connect();
      
      try {
        await client.query(`
          SELECT invalidate_seller_cache($1, $2, $3)
        `, [walletAddress, invalidationType, component]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Failed to invalidate seller cache:', error);
      throw error;
    }
  }

  /**
   * Update seller performance metrics
   */
  async updateSellerPerformanceMetrics(walletAddress: string): Promise<void> {
    try {
      const client = await this.pool.connect();
      
      try {
        await client.query(`
          SELECT update_seller_performance_metrics($1)
        `, [walletAddress]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Failed to update seller performance metrics:', error);
      throw error;
    }
  }

  /**
   * Get query performance metrics
   */
  getQueryMetrics(queryType?: string, limit: number = 100): SellerQueryMetrics[] {
    let metrics = this.queryMetrics;
    
    if (queryType) {
      metrics = metrics.filter(m => m.queryType === queryType);
    }
    
    return metrics
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get slow queries
   */
  getSlowQueries(threshold: number = 500, limit: number = 20): SellerQueryMetrics[] {
    return this.queryMetrics
      .filter(m => m.executionTime > threshold)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit);
  }

  /**
   * Get query performance statistics
   */
  getQueryStatistics(): {
    totalQueries: number;
    averageExecutionTime: number;
    slowQueries: number;
    queryTypeBreakdown: Record<string, number>;
    performanceByType: Record<string, { avg: number; max: number; min: number; count: number }>;
  } {
    const totalQueries = this.queryMetrics.length;
    const averageExecutionTime = totalQueries > 0 
      ? this.queryMetrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries 
      : 0;
    const slowQueries = this.queryMetrics.filter(m => m.executionTime > 500).length;

    const queryTypeBreakdown: Record<string, number> = {};
    const performanceByType: Record<string, { avg: number; max: number; min: number; count: number }> = {};

    this.queryMetrics.forEach(metric => {
      // Query type breakdown
      queryTypeBreakdown[metric.queryType] = (queryTypeBreakdown[metric.queryType] || 0) + 1;

      // Performance by type
      if (!performanceByType[metric.queryType]) {
        performanceByType[metric.queryType] = {
          avg: 0,
          max: metric.executionTime,
          min: metric.executionTime,
          count: 0
        };
      }

      const perf = performanceByType[metric.queryType];
      perf.count++;
      perf.max = Math.max(perf.max, metric.executionTime);
      perf.min = Math.min(perf.min, metric.executionTime);
      perf.avg = (perf.avg * (perf.count - 1) + metric.executionTime) / perf.count;
    });

    return {
      totalQueries,
      averageExecutionTime,
      slowQueries,
      queryTypeBreakdown,
      performanceByType
    };
  }

  /**
   * Generate optimization recommendations
   */
  async generateOptimizationRecommendations(): Promise<SellerQueryOptimization[]> {
    const recommendations: SellerQueryOptimization[] = [];
    const stats = this.getQueryStatistics();

    // Check for slow query types
    Object.entries(stats.performanceByType).forEach(([queryType, perf]) => {
      if (perf.avg > 1000) { // Queries averaging over 1 second
        recommendations.push({
          queryType,
          originalQuery: this.optimizedQueries.get(queryType) || 'Unknown',
          optimizedQuery: 'Consider adding more specific indexes or query restructuring',
          estimatedImprovement: 0.4,
          reason: `Average execution time of ${perf.avg.toFixed(2)}ms is too high`,
          indexRecommendations: this.generateIndexRecommendations(queryType)
        });
      }
    });

    return recommendations;
  }

  /**
   * Generate index recommendations for query type
   */
  private generateIndexRecommendations(queryType: string): string[] {
    const recommendations: string[] = [];

    switch (queryType) {
      case 'getSellerProfile':
        recommendations.push('CREATE INDEX IF NOT EXISTS idx_sellers_wallet_lookup ON sellers(wallet_address) WHERE wallet_address IS NOT NULL;');
        break;
      case 'getSellerDashboard':
        recommendations.push('CREATE INDEX IF NOT EXISTS idx_products_seller_status ON products(seller_id, status);');
        recommendations.push('CREATE INDEX IF NOT EXISTS idx_orders_seller_status_date ON orders(seller_id, status, created_at);');
        break;
      case 'getSellerListings':
        recommendations.push('CREATE INDEX IF NOT EXISTS idx_products_seller_status_updated ON products(seller_id, status, updated_at DESC);');
        break;
      case 'getSellerAnalytics':
        recommendations.push('CREATE INDEX IF NOT EXISTS idx_seller_analytics_wallet_date ON seller_analytics(seller_wallet_address, recorded_at DESC);');
        break;
    }

    return recommendations;
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.queryMetrics = [];
  }

  /**
   * Get cache strategy for query type
   */
  getCacheStrategy(queryType: string): SellerCacheStrategy | undefined {
    return this.cacheStrategies.get(queryType);
  }

  /**
   * Refresh seller performance dashboard materialized view
   */
  async refreshSellerPerformanceDashboard(): Promise<void> {
    try {
      const client = await this.pool.connect();
      
      try {
        await client.query('SELECT refresh_seller_performance_dashboard()');
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Failed to refresh seller performance dashboard:', error);
      throw error;
    }
  }
}

export default SellerQueryOptimizer;