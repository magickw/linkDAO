import { Pool, PoolClient } from 'pg';
import { Redis } from 'ioredis';
import { performance } from 'perf_hooks';
import { CachingStrategiesService } from './cachingStrategiesService';

interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  params?: any[];
  cacheHit?: boolean;
}

interface ConnectionPoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number;
  min: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

interface QueryOptimizationOptions {
  useCache?: boolean;
  cacheTTL?: number;
  useReadReplica?: boolean;
  enableQueryPlan?: boolean;
  timeout?: number;
}

export class EnhancedDatabaseOptimizationService {
  private pool: Pool;
  private readReplicaPool?: Pool;
  private cache: CachingStrategiesService;
  private queryMetrics: QueryMetrics[] = [];
  private slowQueryThreshold = 1000; // 1 second
  private queryPlanCache = new Map<string, any>();

  constructor(
    config: ConnectionPoolConfig, 
    readReplicaConfig?: ConnectionPoolConfig,
    cacheService?: CachingStrategiesService
  ) {
    // Primary database pool with optimized settings
    this.pool = new Pool({
      ...config,
      max: config.max || 25, // Increased pool size
      min: config.min || 5,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      // Additional performance settings
      statement_timeout: 30000,
      query_timeout: 25000,
      application_name: 'marketplace_enhanced'
    });

    // Read replica pool for read-heavy operations
    if (readReplicaConfig) {
      this.readReplicaPool = new Pool({
        ...readReplicaConfig,
        max: readReplicaConfig.max || 20,
        min: readReplicaConfig.min || 3,
        idleTimeoutMillis: readReplicaConfig.idleTimeoutMillis || 30000,
        connectionTimeoutMillis: readReplicaConfig.connectionTimeoutMillis || 2000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
        application_name: 'marketplace_enhanced_readonly'
      });
    }

    // Initialize cache service
    this.cache = cacheService || new CachingStrategiesService({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        keyPrefix: 'marketplace:db:'
      },
      memory: {
        maxSize: 1000,
        ttl: 300000 // 5 minutes
      }
    });

    this.setupPoolEventHandlers();
  }

  private setupPoolEventHandlers(): void {
    this.pool.on('connect', (client: PoolClient) => {
      console.log('Primary database client connected');
      this.optimizeClientConnection(client);
    });

    this.pool.on('error', (err: Error) => {
      console.error('Primary database pool error:', err);
    });

    if (this.readReplicaPool) {
      this.readReplicaPool.on('connect', (client: PoolClient) => {
        console.log('Read replica client connected');
        this.optimizeClientConnection(client);
      });

      this.readReplicaPool.on('error', (err: Error) => {
        console.error('Read replica pool error:', err);
      });
    }
  }

  private async optimizeClientConnection(client: PoolClient): Promise<void> {
    try {
      // Set session-level optimizations
      await client.query('SET statement_timeout = 30000');
      await client.query('SET lock_timeout = 10000');
      await client.query('SET idle_in_transaction_session_timeout = 60000');
      await client.query('SET work_mem = "64MB"');
      await client.query('SET maintenance_work_mem = "256MB"');
      await client.query('SET effective_cache_size = "1GB"');
      await client.query('SET random_page_cost = 1.1');
      await client.query('SET seq_page_cost = 1.0');
    } catch (error) {
      console.warn('Failed to optimize client connection:', error);
    }
  }

  async executeOptimizedQuery<T = any>(
    query: string,
    params: any[] = [],
    options: QueryOptimizationOptions = {}
  ): Promise<T[]> {
    const {
      useCache = true,
      cacheTTL = 300,
      useReadReplica = false,
      enableQueryPlan = false,
      timeout = 25000
    } = options;

    const startTime = performance.now();
    const queryHash = this.generateQueryHash(query, params);
    const cacheKey = `query:${queryHash}`;

    try {
      // Check cache first if enabled
      if (useCache) {
        const cached = await this.cache.get<T[]>(cacheKey);
        if (cached) {
          this.recordQueryMetrics(query, performance.now() - startTime, params, true);
          return cached;
        }
      }

      // Get query execution plan if enabled
      if (enableQueryPlan) {
        await this.analyzeQueryPlan(query, params);
      }

      // Choose appropriate pool
      const pool = useReadReplica && this.readReplicaPool ? this.readReplicaPool : this.pool;
      
      // Execute query with timeout
      const client = await pool.connect();
      try {
        // Set query timeout
        await client.query(`SET statement_timeout = ${timeout}`);
        
        const result = await client.query(query, params);
        const data = result.rows;

        // Cache result if enabled
        if (useCache && data.length > 0) {
          await this.cache.set(cacheKey, data, cacheTTL);
        }

        return data;
      } finally {
        client.release();
      }
    } finally {
      const duration = performance.now() - startTime;
      this.recordQueryMetrics(query, duration, params, false);
    }
  }

  // Enhanced marketplace-specific queries
  async getOptimizedProductsWithPagination(
    limit: number = 20,
    offset: number = 0,
    filters: any = {}
  ): Promise<any[]> {
    const cacheKey = `products:enhanced:${limit}:${offset}:${JSON.stringify(filters)}`;
    
    let whereClause = 'WHERE p.status = $1 AND p.listing_status = $2';
    let params: any[] = ['active', 'published'];
    let paramIndex = 3;

    // Build dynamic where clause
    if (filters.category) {
      whereClause += ` AND p.category_id = $${paramIndex}`;
      params.push(filters.category);
      paramIndex++;
    }

    if (filters.minPrice) {
      whereClause += ` AND p.price_amount >= $${paramIndex}`;
      params.push(filters.minPrice);
      paramIndex++;
    }

    if (filters.maxPrice) {
      whereClause += ` AND p.price_amount <= $${paramIndex}`;
      params.push(filters.maxPrice);
      paramIndex++;
    }

    if (filters.sellerId) {
      whereClause += ` AND p.seller_id = $${paramIndex}`;
      params.push(filters.sellerId);
      paramIndex++;
    }

    if (filters.search) {
      whereClause += ` AND (p.search_vector @@ plainto_tsquery($${paramIndex}) OR p.title ILIKE $${paramIndex + 1})`;
      params.push(filters.search, `%${filters.search}%`);
      paramIndex += 2;
    }

    if (filters.hasImages) {
      whereClause += ` AND (p.image_ipfs_hashes IS NOT NULL AND array_length(p.image_ipfs_hashes, 1) > 0)`;
    }

    params.push(limit, offset);

    const query = `
      WITH seller_stats AS (
        SELECT 
          u.id,
          u.username,
          u.wallet_address,
          u.ens_handle,
          COALESCE(AVG(r.rating), 0) as avg_rating,
          COUNT(r.id) as review_count,
          COUNT(DISTINCT o.id) as total_sales
        FROM users u
        LEFT JOIN reviews r ON r.reviewee_id = u.id AND r.created_at > NOW() - INTERVAL '1 year'
        LEFT JOIN orders o ON o.seller_id = u.id AND o.status = 'completed'
        GROUP BY u.id, u.username, u.wallet_address, u.ens_handle
      )
      SELECT 
        p.id,
        p.title,
        p.description,
        p.price_amount,
        p.price_currency,
        p.image_cdn_urls,
        p.image_ipfs_hashes,
        p.created_at,
        p.published_at,
        p.escrow_enabled,
        ss.username as seller_name,
        ss.wallet_address as seller_address,
        ss.ens_handle as seller_ens,
        ss.avg_rating as seller_rating,
        ss.review_count as seller_review_count,
        ss.total_sales as seller_total_sales,
        COUNT(*) OVER() as total_count
      FROM products p
      JOIN seller_stats ss ON p.seller_id = ss.id
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN p.published_at IS NOT NULL THEN p.published_at 
          ELSE p.created_at 
        END DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    return this.executeOptimizedQuery(query, params, {
      useCache: true,
      cacheTTL: 300,
      useReadReplica: true,
      enableQueryPlan: false
    });
  }

  async getOptimizedUserOrders(
    userId: string, 
    limit: number = 10,
    status?: string
  ): Promise<any[]> {
    const cacheKey = `user_orders:enhanced:${userId}:${limit}:${status || 'all'}`;
    
    let whereClause = 'WHERE (o.buyer_id = $1 OR o.seller_id = $1)';
    let params: any[] = [userId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND o.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    params.push(limit);

    const query = `
      SELECT 
        o.id,
        o.status,
        o.total_amount,
        o.currency,
        o.payment_method,
        o.created_at,
        o.updated_at,
        o.tracking_number,
        o.estimated_delivery,
        p.title as product_title,
        p.image_cdn_urls as product_images,
        p.price_amount as product_price,
        seller.username as seller_name,
        seller.ens_handle as seller_ens,
        buyer.username as buyer_name,
        buyer.ens_handle as buyer_ens,
        CASE WHEN o.buyer_id = $1 THEN 'buyer' ELSE 'seller' END as user_role
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users seller ON o.seller_id = seller.id
      JOIN users buyer ON o.buyer_id = buyer.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${paramIndex}
    `;

    return this.executeOptimizedQuery(query, params, {
      useCache: true,
      cacheTTL: 180,
      useReadReplica: true
    });
  }

  async getOptimizedSellerProfile(sellerId: string): Promise<any> {
    const cacheKey = `seller_profile:enhanced:${sellerId}`;
    
    const query = `
      WITH seller_metrics AS (
        SELECT 
          u.id,
          COUNT(DISTINCT p.id) as total_products,
          COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_products,
          COUNT(DISTINCT o.id) as total_orders,
          COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END) as completed_orders,
          COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total_amount END), 0) as total_revenue,
          COALESCE(AVG(r.rating), 0) as avg_rating,
          COUNT(r.id) as review_count,
          MAX(o.created_at) as last_sale_date
        FROM users u
        LEFT JOIN products p ON p.seller_id = u.id
        LEFT JOIN orders o ON o.seller_id = u.id
        LEFT JOIN reviews r ON r.reviewee_id = u.id AND r.created_at > NOW() - INTERVAL '1 year'
        WHERE u.id = $1
        GROUP BY u.id
      )
      SELECT 
        u.id,
        u.username,
        u.wallet_address,
        u.ens_handle,
        u.ens_verified,
        u.profile_image_ipfs,
        u.cover_image_ipfs,
        u.website_url,
        u.twitter_handle,
        u.discord_handle,
        u.telegram_handle,
        u.created_at,
        sm.total_products,
        sm.active_products,
        sm.total_orders,
        sm.completed_orders,
        sm.total_revenue,
        sm.avg_rating,
        sm.review_count,
        sm.last_sale_date
      FROM users u
      JOIN seller_metrics sm ON u.id = sm.id
      WHERE u.id = $1
    `;

    const result = await this.executeOptimizedQuery(query, [sellerId], {
      useCache: true,
      cacheTTL: 600,
      useReadReplica: true
    });

    return result[0] || null;
  }

  // Query plan analysis
  private async analyzeQueryPlan(query: string, params: any[]): Promise<void> {
    const planKey = this.generateQueryHash(query, []);
    
    if (this.queryPlanCache.has(planKey)) {
      return;
    }

    try {
      const client = await this.pool.connect();
      try {
        const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
        const result = await client.query(explainQuery, params);
        const plan = result.rows[0]['QUERY PLAN'][0];
        
        this.queryPlanCache.set(planKey, plan);
        
        // Log expensive queries
        if (plan['Execution Time'] > 1000) {
          console.warn('Expensive query detected:', {
            executionTime: plan['Execution Time'],
            query: query.substring(0, 100),
            plan: plan['Plan']
          });
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Query plan analysis failed:', error);
    }
  }

  // Enhanced indexing strategies
  async createMarketplaceOptimizedIndexes(): Promise<void> {
    const indexes = [
      // Products indexes with enhanced coverage
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_status_listing_published ON products(status, listing_status, published_at DESC) WHERE status = \'active\' AND listing_status = \'published\'',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_price ON products(category_id, price_amount) WHERE status = \'active\'',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_seller_status ON products(seller_id, status, created_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_search_vector ON products USING gin(search_vector)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_images ON products USING gin(image_ipfs_hashes) WHERE image_ipfs_hashes IS NOT NULL',
      
      // Orders indexes for enhanced performance
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_buyer_status_created ON orders(buyer_id, status, created_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_seller_status_created ON orders(seller_id, status, created_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_payment_method ON orders(payment_method, status)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tracking ON orders(tracking_number) WHERE tracking_number IS NOT NULL',
      
      // Users/Sellers indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_ens_handle ON users(ens_handle) WHERE ens_handle IS NOT NULL',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_wallet_verified ON users(wallet_address, ens_verified)',
      
      // Reviews indexes for reputation calculations
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_reviewee_recent ON reviews(reviewee_id, created_at DESC) WHERE created_at > NOW() - INTERVAL \'1 year\'',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_rating_recent ON reviews(reviewee_id, rating, created_at) WHERE created_at > NOW() - INTERVAL \'1 year\'',
      
      // Image storage indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_image_storage_usage ON image_storage(usage_type, usage_reference_id, owner_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_image_storage_owner_created ON image_storage(owner_id, created_at DESC)',
      
      // Composite indexes for complex queries
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_composite_search ON products(status, listing_status, category_id, price_amount, created_at DESC) WHERE status = \'active\'',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_composite_tracking ON orders(buyer_id, seller_id, status, created_at DESC)'
    ];

    for (const indexQuery of indexes) {
      try {
        console.log('Creating index:', indexQuery.split(' ')[6]);
        await this.pool.query(indexQuery);
        console.log('✓ Index created successfully');
      } catch (error) {
        console.error('✗ Error creating index:', error.message);
      }
    }
  }

  // Database maintenance operations
  async performMaintenanceOperations(): Promise<void> {
    console.log('Starting database maintenance operations...');
    
    try {
      // Update table statistics
      await this.analyzeTablePerformance();
      
      // Vacuum and reindex critical tables
      await this.vacuumCriticalTables();
      
      // Update search vectors
      await this.updateSearchVectors();
      
      console.log('Database maintenance completed successfully');
    } catch (error) {
      console.error('Database maintenance failed:', error);
    }
  }

  private async analyzeTablePerformance(): Promise<void> {
    const tables = ['products', 'orders', 'users', 'reviews', 'image_storage'];
    
    for (const table of tables) {
      try {
        await this.pool.query(`ANALYZE ${table}`);
        console.log(`✓ Analyzed table: ${table}`);
      } catch (error) {
        console.error(`✗ Error analyzing table ${table}:`, error);
      }
    }
  }

  private async vacuumCriticalTables(): Promise<void> {
    const tables = ['products', 'orders', 'image_storage'];
    
    for (const table of tables) {
      try {
        await this.pool.query(`VACUUM ANALYZE ${table}`);
        console.log(`✓ Vacuumed table: ${table}`);
      } catch (error) {
        console.error(`✗ Error vacuuming table ${table}:`, error);
      }
    }
  }

  private async updateSearchVectors(): Promise<void> {
    try {
      const query = `
        UPDATE products 
        SET search_vector = to_tsvector('english', 
          COALESCE(title, '') || ' ' || 
          COALESCE(description, '') || ' ' ||
          COALESCE((SELECT username FROM users WHERE id = products.seller_id), '')
        )
        WHERE search_vector IS NULL OR updated_at > NOW() - INTERVAL '1 day'
      `;
      
      const result = await this.pool.query(query);
      console.log(`✓ Updated ${result.rowCount} search vectors`);
    } catch (error) {
      console.error('✗ Error updating search vectors:', error);
    }
  }

  // Utility methods
  private generateQueryHash(query: string, params: any[]): string {
    const content = query + JSON.stringify(params);
    return Buffer.from(content).toString('base64').substring(0, 32);
  }

  private recordQueryMetrics(query: string, duration: number, params?: any[], cacheHit: boolean = false): void {
    const metrics: QueryMetrics = {
      query: query.substring(0, 200),
      duration,
      timestamp: new Date(),
      params: params?.length ? params.slice(0, 5) : undefined,
      cacheHit
    };

    this.queryMetrics.push(metrics);

    // Log slow queries
    if (duration > this.slowQueryThreshold && !cacheHit) {
      console.warn('Slow query detected:', {
        query: metrics.query,
        duration: `${duration.toFixed(2)}ms`,
        params: metrics.params,
      });
    }

    // Keep only last 1000 metrics
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics = this.queryMetrics.slice(-1000);
    }
  }

  // Performance monitoring
  getQueryMetrics(): QueryMetrics[] {
    return this.queryMetrics.slice();
  }

  getSlowQueries(threshold: number = 1000): QueryMetrics[] {
    return this.queryMetrics.filter(m => m.duration > threshold && !m.cacheHit);
  }

  async getPoolStats(): Promise<any> {
    const primaryStats = {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };

    const replicaStats = this.readReplicaPool ? {
      totalCount: this.readReplicaPool.totalCount,
      idleCount: this.readReplicaPool.idleCount,
      waitingCount: this.readReplicaPool.waitingCount,
    } : null;

    return {
      primary: primaryStats,
      replica: replicaStats
    };
  }

  getCacheStats() {
    return this.cache.getStats();
  }

  // Cleanup
  async close(): Promise<void> {
    await this.pool.end();
    if (this.readReplicaPool) {
      await this.readReplicaPool.end();
    }
    await this.cache.close();
  }
}