import { Pool, PoolClient } from 'pg';
import { Redis } from 'ioredis';
import { performance } from 'perf_hooks';

interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  params?: any[];
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

export class DatabaseOptimizationService {
  private pool: Pool;
  private redis: Redis;
  private queryMetrics: QueryMetrics[] = [];
  private slowQueryThreshold = 1000; // 1 second

  constructor(config: ConnectionPoolConfig, redisUrl: string) {
    this.pool = new Pool({
      ...config,
      // Connection pool optimization
      max: config.max || 20, // Maximum number of clients
      min: config.min || 5,  // Minimum number of clients
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,
      // Enable keep-alive
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    this.redis = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });

    this.setupPoolEventHandlers();
  }

  private setupPoolEventHandlers(): void {
    this.pool.on('connect', (client: PoolClient) => {
      console.log('Database client connected');
      // Set session-level optimizations
      client.query('SET statement_timeout = 30000'); // 30 second timeout
      client.query('SET lock_timeout = 10000'); // 10 second lock timeout
    });

    this.pool.on('error', (err: Error) => {
      console.error('Database pool error:', err);
    });

    this.pool.on('remove', () => {
      console.log('Database client removed from pool');
    });
  }

  async executeOptimizedQuery<T = any>(
    query: string,
    params: any[] = [],
    cacheKey?: string,
    cacheTTL: number = 300
  ): Promise<T[]> {
    const startTime = performance.now();

    try {
      // Check cache first if cache key provided
      if (cacheKey) {
        const cached = await this.getCachedResult<T>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Execute query with connection from pool
      const client = await this.pool.connect();
      try {
        const result = await client.query(query, params);
        const data = result.rows;

        // Cache result if cache key provided
        if (cacheKey) {
          await this.setCachedResult(cacheKey, data, cacheTTL);
        }

        return data;
      } finally {
        client.release();
      }
    } finally {
      const duration = performance.now() - startTime;
      this.recordQueryMetrics(query, duration, params);
    }
  }

  private async getCachedResult<T>(key: string): Promise<T[] | null> {
    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  private async setCachedResult<T>(key: string, data: T[], ttl: number): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  private recordQueryMetrics(query: string, duration: number, params?: any[]): void {
    const metrics: QueryMetrics = {
      query: query.substring(0, 200), // Truncate long queries
      duration,
      timestamp: new Date(),
      params: params?.length ? params.slice(0, 5) : undefined, // Limit params logged
    };

    this.queryMetrics.push(metrics);

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
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

  // Optimized queries for common operations
  async getProductsWithPagination(
    limit: number = 20,
    offset: number = 0,
    filters: any = {}
  ): Promise<any[]> {
    const cacheKey = `products:${limit}:${offset}:${JSON.stringify(filters)}`;
    
    let whereClause = 'WHERE p.status = $1';
    let params: any[] = ['active'];
    let paramIndex = 2;

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

    params.push(limit, offset);

    const query = `
      SELECT 
        p.id,
        p.title,
        p.description,
        p.price_amount,
        p.price_currency,
        p.images,
        p.created_at,
        u.username as seller_name,
        u.wallet_address as seller_address,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(r.id) as review_count
      FROM products p
      JOIN users u ON p.seller_id = u.id
      LEFT JOIN reviews r ON r.reviewee_id = u.id
      ${whereClause}
      GROUP BY p.id, u.username, u.wallet_address
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex - 1} OFFSET $${paramIndex}
    `;

    return this.executeOptimizedQuery(query, params, cacheKey, 300);
  }

  async getUserReputationWithCache(userId: string): Promise<any> {
    const cacheKey = `user_reputation:${userId}`;
    
    const query = `
      SELECT 
        u.id,
        u.username,
        u.wallet_address,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(r.id) as total_reviews,
        COUNT(CASE WHEN r.rating >= 4 THEN 1 END) as positive_reviews,
        u.created_at
      FROM users u
      LEFT JOIN reviews r ON r.reviewee_id = u.id
      WHERE u.id = $1
      GROUP BY u.id, u.username, u.wallet_address, u.created_at
    `;

    const result = await this.executeOptimizedQuery(query, [userId], cacheKey, 600);
    return result[0] || null;
  }

  async getOrdersWithDetails(userId: string, limit: number = 10): Promise<any[]> {
    const cacheKey = `user_orders:${userId}:${limit}`;
    
    const query = `
      SELECT 
        o.id,
        o.status,
        o.total_amount,
        o.currency,
        o.created_at,
        p.title as product_title,
        p.images as product_images,
        seller.username as seller_name,
        buyer.username as buyer_name
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users seller ON o.seller_id = seller.id
      JOIN users buyer ON o.buyer_id = buyer.id
      WHERE o.buyer_id = $1 OR o.seller_id = $1
      ORDER BY o.created_at DESC
      LIMIT $2
    `;

    return this.executeOptimizedQuery(query, [userId, limit], cacheKey, 180);
  }

  // Database maintenance and optimization
  async analyzeTablePerformance(): Promise<void> {
    const tables = ['products', 'orders', 'users', 'reviews'];
    
    for (const table of tables) {
      try {
        await this.pool.query(`ANALYZE ${table}`);
        console.log(`Analyzed table: ${table}`);
      } catch (error) {
        console.error(`Error analyzing table ${table}:`, error);
      }
    }
  }

  async createOptimizedIndexes(): Promise<void> {
    const indexes = [
      // Products indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_status ON products(status)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category ON products(category_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_price ON products(price_amount)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_created_at ON products(created_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_seller ON products(seller_id)',
      
      // Orders indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_buyer ON orders(buyer_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_seller ON orders(seller_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status ON orders(status)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)',
      
      // Reviews indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_order ON reviews(order_id)',
      
      // Users indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_wallet ON users(wallet_address)',
      
      // Composite indexes for common queries
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_status_category ON products(status, category_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_status ON orders(buyer_id, status)',
    ];

    for (const indexQuery of indexes) {
      try {
        await this.pool.query(indexQuery);
        console.log('Created index:', indexQuery.split(' ')[6]); // Extract index name
      } catch (error) {
        console.error('Error creating index:', error);
      }
    }
  }

  // Performance monitoring
  getQueryMetrics(): QueryMetrics[] {
    return this.queryMetrics.slice();
  }

  getSlowQueries(threshold: number = 1000): QueryMetrics[] {
    return this.queryMetrics.filter(m => m.duration > threshold);
  }

  async getPoolStats(): Promise<any> {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  // Cleanup
  async close(): Promise<void> {
    await this.pool.end();
    await this.redis.quit();
  }
}

// Query builder for complex queries
export class QueryBuilder {
  private query: string = '';
  private params: any[] = [];
  private paramIndex: number = 1;

  select(columns: string[]): this {
    this.query = `SELECT ${columns.join(', ')}`;
    return this;
  }

  from(table: string, alias?: string): this {
    this.query += ` FROM ${table}`;
    if (alias) {
      this.query += ` ${alias}`;
    }
    return this;
  }

  join(table: string, condition: string, type: 'INNER' | 'LEFT' | 'RIGHT' = 'INNER'): this {
    this.query += ` ${type} JOIN ${table} ON ${condition}`;
    return this;
  }

  where(condition: string, value?: any): this {
    if (this.query.includes('WHERE')) {
      this.query += ` AND ${condition}`;
    } else {
      this.query += ` WHERE ${condition}`;
    }
    
    if (value !== undefined) {
      this.params.push(value);
      this.query = this.query.replace('?', `$${this.paramIndex++}`);
    }
    
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.query += ` ORDER BY ${column} ${direction}`;
    return this;
  }

  limit(count: number): this {
    this.params.push(count);
    this.query += ` LIMIT $${this.paramIndex++}`;
    return this;
  }

  offset(count: number): this {
    this.params.push(count);
    this.query += ` OFFSET $${this.paramIndex++}`;
    return this;
  }

  build(): { query: string; params: any[] } {
    return {
      query: this.query,
      params: this.params,
    };
  }
}