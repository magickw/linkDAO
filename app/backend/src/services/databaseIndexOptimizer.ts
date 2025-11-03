import { Pool } from 'pg';
import { safeLogger } from '../utils/safeLogger';
import { performance } from 'perf_hooks';

interface IndexRecommendation {
  tableName: string;
  columns: string[];
  indexType: 'btree' | 'hash' | 'gin' | 'gist' | 'brin';
  reason: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedImpact: number;
  createStatement: string;
  estimatedSize: string;
  maintenanceCost: 'low' | 'medium' | 'high';
}

interface IndexUsageStats {
  schemaName: string;
  tableName: string;
  indexName: string;
  indexSize: string;
  indexScans: number;
  tuplesRead: number;
  tuplesReturned: number;
  isUnique: boolean;
  definition: string;
  lastUsed?: Date;
  efficiency: number;
}

interface TableAnalysis {
  tableName: string;
  rowCount: number;
  tableSize: string;
  indexSize: string;
  totalSize: string;
  sequentialScans: number;
  indexScans: number;
  tuplesInserted: number;
  tuplesUpdated: number;
  tuplesDeleted: number;
  lastVacuum?: Date;
  lastAnalyze?: Date;
  needsVacuum: boolean;
  needsAnalyze: boolean;
}

interface QueryPattern {
  queryHash: string;
  normalizedQuery: string;
  executionCount: number;
  averageTime: number;
  totalTime: number;
  tablesUsed: string[];
  whereColumns: string[];
  orderByColumns: string[];
  joinColumns: string[];
  hasSequentialScan: boolean;
  lastSeen: Date;
}

/**
 * Database Index Optimizer
 * Implements advanced database indexing optimization for PostgreSQL
 */
export class DatabaseIndexOptimizer {
  private pool: Pool;
  private queryPatterns: Map<string, QueryPattern> = new Map();
  private indexRecommendations: IndexRecommendation[] = [];
  private monitoringInterval?: NodeJS.Timeout;

  constructor(pool: Pool) {
    this.pool = pool;
    this.startMonitoring();
  }

  /**
   * Start monitoring query patterns and index usage
   */
  private startMonitoring(): void {
    // Analyze indexes every hour
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.analyzeIndexUsage();
        await this.generateIndexRecommendations();
      } catch (error) {
        safeLogger.error('Index monitoring error:', error);
      }
    }, 3600000); // 1 hour
  }

  /**
   * Analyze query and track patterns
   */
  async analyzeQuery(query: string, executionTime: number, queryPlan?: any): Promise<void> {
    try {
      const normalizedQuery = this.normalizeQuery(query);
      const queryHash = this.hashQuery(normalizedQuery);
      
      // Extract query characteristics
      const tablesUsed = this.extractTables(query);
      const whereColumns = this.extractWhereColumns(query);
      const orderByColumns = this.extractOrderByColumns(query);
      const joinColumns = this.extractJoinColumns(query);
      const hasSequentialScan = queryPlan ? this.hasSequentialScan(queryPlan) : false;

      // Update or create query pattern
      const existingPattern = this.queryPatterns.get(queryHash);
      if (existingPattern) {
        existingPattern.executionCount++;
        existingPattern.totalTime += executionTime;
        existingPattern.averageTime = existingPattern.totalTime / existingPattern.executionCount;
        existingPattern.lastSeen = new Date();
        existingPattern.hasSequentialScan = existingPattern.hasSequentialScan || hasSequentialScan;
      } else {
        this.queryPatterns.set(queryHash, {
          queryHash,
          normalizedQuery,
          executionCount: 1,
          averageTime: executionTime,
          totalTime: executionTime,
          tablesUsed,
          whereColumns,
          orderByColumns,
          joinColumns,
          hasSequentialScan,
          lastSeen: new Date()
        });
      }

      // Generate recommendations for slow queries with sequential scans
      if (executionTime > 1000 && hasSequentialScan) {
        await this.generateQuerySpecificRecommendations(queryHash);
      }

    } catch (error) {
      safeLogger.error('Error analyzing query:', error);
    }
  }

  /**
   * Analyze current index usage
   */
  async analyzeIndexUsage(): Promise<IndexUsageStats[]> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          schemaname,
          relname as tablename,
          indexrelname as indexname,
          pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
          idx_scan as index_scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_returned,
          indisunique as is_unique,
          pg_get_indexdef(indexrelid) as definition
        FROM pg_stat_user_indexes 
        JOIN pg_index ON pg_stat_user_indexes.indexrelid = pg_index.indexrelid
        WHERE schemaname = 'public'
        ORDER BY idx_scan DESC
      `);

      const indexStats: IndexUsageStats[] = result.rows.map(row => ({
        schemaName: row.schemaname,
        tableName: row.tablename,
        indexName: row.indexname,
        indexSize: row.index_size,
        indexScans: parseInt(row.index_scans) || 0,
        tuplesRead: parseInt(row.tuples_read) || 0,
        tuplesReturned: parseInt(row.tuples_returned) || 0,
        isUnique: row.is_unique,
        definition: row.definition,
        efficiency: this.calculateIndexEfficiency(
          parseInt(row.index_scans) || 0,
          parseInt(row.tuples_read) || 0,
          parseInt(row.tuples_returned) || 0
        )
      }));

      return indexStats;

    } finally {
      client.release();
    }
  }

  /**
   * Analyze table statistics
   */
  async analyzeTableStatistics(): Promise<TableAnalysis[]> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          schemaname,
          relname as tablename,
          n_live_tup as row_count,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size,
          pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) as table_size,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname) - pg_relation_size(schemaname||'.'||relname)) as index_size,
          seq_scan as sequential_scans,
          idx_scan as index_scans,
          n_tup_ins as tuples_inserted,
          n_tup_upd as tuples_updated,
          n_tup_del as tuples_deleted,
          n_dead_tup as dead_tuples,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables 
        WHERE schemaname = 'public'
        ORDER BY n_live_tup DESC
      `);

      const tableAnalysis: TableAnalysis[] = result.rows.map(row => {
        const deadTuples = parseInt(row.dead_tuples) || 0;
        const liveTuples = parseInt(row.row_count) || 0;
        const needsVacuum = deadTuples > Math.max(50, liveTuples * 0.1);
        const needsAnalyze = !row.last_analyze && !row.last_autoanalyze;

        return {
          tableName: row.tablename,
          rowCount: liveTuples,
          tableSize: row.table_size,
          indexSize: row.index_size,
          totalSize: row.total_size,
          sequentialScans: parseInt(row.sequential_scans) || 0,
          indexScans: parseInt(row.index_scans) || 0,
          tuplesInserted: parseInt(row.tuples_inserted) || 0,
          tuplesUpdated: parseInt(row.tuples_updated) || 0,
          tuplesDeleted: parseInt(row.tuples_deleted) || 0,
          lastVacuum: row.last_vacuum ? new Date(row.last_vacuum) : undefined,
          lastAnalyze: row.last_analyze ? new Date(row.last_analyze) : undefined,
          needsVacuum,
          needsAnalyze
        };
      });

      return tableAnalysis;

    } finally {
      client.release();
    }
  }

  /**
   * Generate index recommendations
   */
  async generateIndexRecommendations(): Promise<IndexRecommendation[]> {
    try {
      const recommendations: IndexRecommendation[] = [];
      
      // Analyze query patterns for index opportunities
      for (const [queryHash, pattern] of this.queryPatterns.entries()) {
        if (pattern.executionCount >= 5 && pattern.averageTime > 100) {
          const queryRecommendations = await this.generateQuerySpecificRecommendations(queryHash);
          recommendations.push(...queryRecommendations);
        }
      }

      // Analyze table statistics for missing indexes
      const tableStats = await this.analyzeTableStatistics();
      for (const table of tableStats) {
        const tableRecommendations = await this.generateTableSpecificRecommendations(table);
        recommendations.push(...tableRecommendations);
      }

      // Remove duplicates and sort by priority
      const uniqueRecommendations = this.deduplicateRecommendations(recommendations);
      this.indexRecommendations = uniqueRecommendations.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      return this.indexRecommendations;

    } catch (error) {
      safeLogger.error('Error generating index recommendations:', error);
      return [];
    }
  }

  /**
   * Generate recommendations for specific query
   */
  private async generateQuerySpecificRecommendations(queryHash: string): Promise<IndexRecommendation[]> {
    const pattern = this.queryPatterns.get(queryHash);
    if (!pattern) return [];

    const recommendations: IndexRecommendation[] = [];

    // Recommend indexes for WHERE clauses
    for (const table of pattern.tablesUsed) {
      const whereColumns = pattern.whereColumns.filter(col => col.includes(table));
      if (whereColumns.length > 0) {
        const columns = whereColumns.map(col => col.split('.').pop()!);
        
        recommendations.push({
          tableName: table,
          columns,
          indexType: 'btree',
          reason: `Frequent WHERE clause usage (${pattern.executionCount} times, avg ${pattern.averageTime.toFixed(2)}ms)`,
          priority: pattern.averageTime > 2000 ? 'critical' : pattern.averageTime > 1000 ? 'high' : 'medium',
          estimatedImpact: this.calculateEstimatedImpact(pattern),
          createStatement: `CREATE INDEX CONCURRENTLY idx_${table}_${columns.join('_')} ON ${table} (${columns.join(', ')});`,
          estimatedSize: await this.estimateIndexSize(table, columns),
          maintenanceCost: columns.length > 3 ? 'high' : columns.length > 1 ? 'medium' : 'low'
        });
      }
    }

    // Recommend indexes for ORDER BY clauses
    for (const table of pattern.tablesUsed) {
      const orderColumns = pattern.orderByColumns.filter(col => col.includes(table));
      if (orderColumns.length > 0) {
        const columns = orderColumns.map(col => col.split('.').pop()!);
        
        recommendations.push({
          tableName: table,
          columns,
          indexType: 'btree',
          reason: `ORDER BY clause optimization (${pattern.executionCount} executions)`,
          priority: pattern.averageTime > 1000 ? 'high' : 'medium',
          estimatedImpact: this.calculateEstimatedImpact(pattern) * 0.7,
          createStatement: `CREATE INDEX CONCURRENTLY idx_${table}_sort_${columns.join('_')} ON ${table} (${columns.join(', ')});`,
          estimatedSize: await this.estimateIndexSize(table, columns),
          maintenanceCost: 'low'
        });
      }
    }

    // Recommend indexes for JOIN conditions
    for (const table of pattern.tablesUsed) {
      const joinColumns = pattern.joinColumns.filter(col => col.includes(table));
      if (joinColumns.length > 0) {
        const columns = joinColumns.map(col => col.split('.').pop()!);
        
        recommendations.push({
          tableName: table,
          columns,
          indexType: 'btree',
          reason: `JOIN optimization (${pattern.executionCount} executions)`,
          priority: 'medium',
          estimatedImpact: this.calculateEstimatedImpact(pattern) * 0.8,
          createStatement: `CREATE INDEX CONCURRENTLY idx_${table}_join_${columns.join('_')} ON ${table} (${columns.join(', ')});`,
          estimatedSize: await this.estimateIndexSize(table, columns),
          maintenanceCost: 'low'
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate recommendations for specific table
   */
  private async generateTableSpecificRecommendations(table: TableAnalysis): Promise<IndexRecommendation[]> {
    const recommendations: IndexRecommendation[] = [];

    // High sequential scan ratio
    const totalScans = table.sequentialScans + table.indexScans;
    const seqScanRatio = totalScans > 0 ? table.sequentialScans / totalScans : 0;

    if (seqScanRatio > 0.7 && table.rowCount > 1000) {
      // Recommend common indexes for marketplace tables
      const commonIndexes = this.getCommonIndexesForTable(table.tableName);
      recommendations.push(...commonIndexes);
    }

    // High update/insert ratio suggests need for partial indexes
    const writeRatio = table.rowCount > 0 
      ? (table.tuplesInserted + table.tuplesUpdated) / table.rowCount 
      : 0;

    if (writeRatio > 0.1) {
      const partialIndexes = this.getPartialIndexRecommendations(table.tableName);
      recommendations.push(...partialIndexes);
    }

    return recommendations;
  }

  /**
   * Get common indexes for marketplace tables
   */
  private getCommonIndexesForTable(tableName: string): IndexRecommendation[] {
    const commonIndexes: { [key: string]: IndexRecommendation[] } = {
      products: [
        {
          tableName: 'products',
          columns: ['category'],
          indexType: 'btree',
          reason: 'Category filtering is common in marketplace queries',
          priority: 'high',
          estimatedImpact: 0.6,
          createStatement: 'CREATE INDEX CONCURRENTLY idx_products_category ON products (category);',
          estimatedSize: '~2MB',
          maintenanceCost: 'low'
        },
        {
          tableName: 'products',
          columns: ['seller_id'],
          indexType: 'btree',
          reason: 'Seller product lookups are frequent',
          priority: 'high',
          estimatedImpact: 0.7,
          createStatement: 'CREATE INDEX CONCURRENTLY idx_products_seller_id ON products (seller_id);',
          estimatedSize: '~1.5MB',
          maintenanceCost: 'low'
        },
        {
          tableName: 'products',
          columns: ['created_at'],
          indexType: 'btree',
          reason: 'Sorting by creation date is common',
          priority: 'medium',
          estimatedImpact: 0.4,
          createStatement: 'CREATE INDEX CONCURRENTLY idx_products_created_at ON products (created_at DESC);',
          estimatedSize: '~1MB',
          maintenanceCost: 'low'
        }
      ],
      orders: [
        {
          tableName: 'orders',
          columns: ['user_id'],
          indexType: 'btree',
          reason: 'User order history queries',
          priority: 'high',
          estimatedImpact: 0.8,
          createStatement: 'CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders (user_id);',
          estimatedSize: '~1MB',
          maintenanceCost: 'low'
        },
        {
          tableName: 'orders',
          columns: ['status'],
          indexType: 'btree',
          reason: 'Order status filtering',
          priority: 'medium',
          estimatedImpact: 0.5,
          createStatement: 'CREATE INDEX CONCURRENTLY idx_orders_status ON orders (status);',
          estimatedSize: '~500KB',
          maintenanceCost: 'low'
        }
      ],
      users: [
        {
          tableName: 'users',
          columns: ['wallet_address'],
          indexType: 'btree',
          reason: 'Wallet address lookups for authentication',
          priority: 'critical',
          estimatedImpact: 0.9,
          createStatement: 'CREATE UNIQUE INDEX CONCURRENTLY idx_users_wallet_address ON users (wallet_address);',
          estimatedSize: '~800KB',
          maintenanceCost: 'low'
        }
      ]
    };

    return commonIndexes[tableName] || [];
  }

  /**
   * Get partial index recommendations
   */
  private getPartialIndexRecommendations(tableName: string): IndexRecommendation[] {
    const partialIndexes: { [key: string]: IndexRecommendation[] } = {
      products: [
        {
          tableName: 'products',
          columns: ['created_at'],
          indexType: 'btree',
          reason: 'Partial index for active products only',
          priority: 'medium',
          estimatedImpact: 0.4,
          createStatement: 'CREATE INDEX CONCURRENTLY idx_products_active_created_at ON products (created_at) WHERE status = \'active\';',
          estimatedSize: '~500KB',
          maintenanceCost: 'low'
        }
      ],
      orders: [
        {
          tableName: 'orders',
          columns: ['created_at'],
          indexType: 'btree',
          reason: 'Partial index for pending orders',
          priority: 'medium',
          estimatedImpact: 0.3,
          createStatement: 'CREATE INDEX CONCURRENTLY idx_orders_pending_created_at ON orders (created_at) WHERE status = \'pending\';',
          estimatedSize: '~200KB',
          maintenanceCost: 'low'
        }
      ]
    };

    return partialIndexes[tableName] || [];
  }

  /**
   * Validate DDL statement to prevent SQL injection
   */
  private isValidDDLStatement(statement: string): boolean {
    const trimmedStatement = statement.trim();

    // Only allow CREATE INDEX and DROP INDEX statements
    const allowedPatterns = [
      /^CREATE\s+INDEX\s+CONCURRENTLY/i,
      /^CREATE\s+UNIQUE\s+INDEX\s+CONCURRENTLY/i,
      /^DROP\s+INDEX\s+CONCURRENTLY/i,
      /^DROP\s+INDEX\s+IF\s+EXISTS\s+CONCURRENTLY/i
    ];

    const isAllowedOperation = allowedPatterns.some(pattern => pattern.test(trimmedStatement));
    if (!isAllowedOperation) {
      return false;
    }

    // Block dangerous patterns even in allowed statements
    const dangerousPatterns = [
      /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP\s+TABLE|DROP\s+DATABASE|CREATE\s+TABLE|ALTER|EXEC|GRANT)/i,
      /--/,  // SQL comments
      /\/\*/,  // Block comments
      /xp_/i,  // Extended stored procedures
      /sp_/i,  // System stored procedures
    ];

    const hasDangerousPattern = dangerousPatterns.some(pattern => pattern.test(trimmedStatement));
    if (hasDangerousPattern) {
      return false;
    }

    return true;
  }

  /**
   * Create recommended index
   */
  async createIndex(recommendation: IndexRecommendation): Promise<{
    success: boolean;
    message: string;
    executionTime?: number;
  }> {
    const client = await this.pool.connect();
    const startTime = performance.now();

    try {
      // Validate DDL statement before execution
      if (!this.isValidDDLStatement(recommendation.createStatement)) {
        return {
          success: false,
          message: 'Invalid or unauthorized DDL statement. Only CREATE INDEX and DROP INDEX operations are allowed.'
        };
      }

      // Log the operation for audit trail
      safeLogger.info('Creating database index', {
        statement: recommendation.createStatement,
        tableName: recommendation.tableName,
        priority: recommendation.priority
      });

      await client.query(recommendation.createStatement);
      const executionTime = performance.now() - startTime;

      // Remove the recommendation since it's been implemented
      this.indexRecommendations = this.indexRecommendations.filter(rec => rec !== recommendation);

      safeLogger.info('Index created successfully', {
        statement: recommendation.createStatement,
        executionTime
      });

      return {
        success: true,
        message: `Index created successfully: ${recommendation.createStatement}`,
        executionTime
      };

    } catch (error) {
      safeLogger.error('Failed to create index', {
        error,
        statement: recommendation.createStatement
      });
      return {
        success: false,
        message: `Failed to create index: ${error}`
      };
    } finally {
      client.release();
    }
  }

  /**
   * Safely quote PostgreSQL identifier to prevent SQL injection
   */
  private quoteIdentifier(identifier: string): string {
    // Validate identifier format
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
      throw new Error(`Invalid identifier format: ${identifier}`);
    }

    // Quote identifier for PostgreSQL
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  /**
   * Drop unused indexes
   */
  async dropUnusedIndexes(minUsageThreshold: number = 100): Promise<{
    droppedIndexes: string[];
    spaceReclaimed: string;
  }> {
    const indexStats = await this.analyzeIndexUsage();
    const unusedIndexes = indexStats.filter(stat =>
      stat.indexScans < minUsageThreshold &&
      !stat.isUnique &&
      !stat.indexName.endsWith('_pkey')
    );

    const droppedIndexes: string[] = [];
    let totalSpaceReclaimed = 0;

    const client = await this.pool.connect();

    try {
      for (const index of unusedIndexes) {
        try {
          // Safely quote identifier to prevent SQL injection
          const quotedIndexName = this.quoteIdentifier(index.indexName);
          const dropStatement = `DROP INDEX CONCURRENTLY ${quotedIndexName}`;

          // Log the operation for audit trail
          safeLogger.info('Dropping unused index', {
            indexName: index.indexName,
            indexScans: index.indexScans,
            indexSize: index.indexSize
          });

          await client.query(dropStatement);
          droppedIndexes.push(index.indexName);

          // Parse size string to estimate space reclaimed
          const sizeMatch = index.indexSize.match(/(\d+(?:\.\d+)?)\s*(\w+)/);
          if (sizeMatch) {
            const size = parseFloat(sizeMatch[1]);
            const unit = sizeMatch[2].toLowerCase();
            const multiplier = unit === 'gb' ? 1024 : unit === 'mb' ? 1 : 0.001;
            totalSpaceReclaimed += size * multiplier;
          }

          safeLogger.info('Index dropped successfully', {
            indexName: index.indexName
          });
        } catch (error) {
          safeLogger.error(`Failed to drop index ${index.indexName}:`, error);
        }
      }

      return {
        droppedIndexes,
        spaceReclaimed: `${totalSpaceReclaimed.toFixed(2)} MB`
      };

    } finally {
      client.release();
    }
  }

  /**
   * Utility methods
   */
  private normalizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .replace(/\$\d+/g, '?')
      .replace(/\d+/g, 'N')
      .replace(/'[^']*'/g, "'?'")
      .trim()
      .toLowerCase();
  }

  private hashQuery(query: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(query).digest('hex');
  }

  private extractTables(query: string): string[] {
    const tables: string[] = [];
    const fromMatch = query.match(/from\s+(\w+)/gi);
    const joinMatch = query.match(/join\s+(\w+)/gi);
    
    if (fromMatch) {
      fromMatch.forEach(match => {
        const table = match.split(/\s+/)[1];
        if (table && !tables.includes(table)) {
          tables.push(table);
        }
      });
    }
    
    if (joinMatch) {
      joinMatch.forEach(match => {
        const table = match.split(/\s+/)[1];
        if (table && !tables.includes(table)) {
          tables.push(table);
        }
      });
    }
    
    return tables;
  }

  private extractWhereColumns(query: string): string[] {
    const columns: string[] = [];
    const whereMatch = query.match(/where\s+(.+?)(?:\s+order|\s+group|\s+limit|$)/i);
    
    if (whereMatch) {
      const whereClause = whereMatch[1];
      const columnMatches = whereClause.match(/(\w+\.\w+|\w+)\s*[=<>!]/g);
      
      if (columnMatches) {
        columnMatches.forEach(match => {
          const column = match.replace(/\s*[=<>!].*/, '').trim();
          if (!columns.includes(column)) {
            columns.push(column);
          }
        });
      }
    }
    
    return columns;
  }

  private extractOrderByColumns(query: string): string[] {
    const columns: string[] = [];
    const orderMatch = query.match(/order\s+by\s+(.+?)(?:\s+limit|$)/i);
    
    if (orderMatch) {
      const orderClause = orderMatch[1];
      const columnMatches = orderClause.split(',');
      
      columnMatches.forEach(match => {
        const column = match.trim().replace(/\s+(asc|desc)$/i, '');
        if (!columns.includes(column)) {
          columns.push(column);
        }
      });
    }
    
    return columns;
  }

  private extractJoinColumns(query: string): string[] {
    const columns: string[] = [];
    const joinMatches = query.match(/on\s+(\w+\.\w+|\w+)\s*=\s*(\w+\.\w+|\w+)/gi);
    
    if (joinMatches) {
      joinMatches.forEach(match => {
        const parts = match.replace(/on\s+/i, '').split('=');
        parts.forEach(part => {
          const column = part.trim();
          if (!columns.includes(column)) {
            columns.push(column);
          }
        });
      });
    }
    
    return columns;
  }

  private hasSequentialScan(queryPlan: any): boolean {
    const planText = JSON.stringify(queryPlan).toLowerCase();
    return planText.includes('seq scan');
  }

  private calculateIndexEfficiency(scans: number, tuplesRead: number, tuplesReturned: number): number {
    if (scans === 0) return 0;
    if (tuplesRead === 0) return 1;
    return tuplesReturned / tuplesRead;
  }

  private calculateEstimatedImpact(pattern: QueryPattern): number {
    // Base impact on execution frequency and time
    const frequencyFactor = Math.min(pattern.executionCount / 100, 1);
    const timeFactor = Math.min(pattern.averageTime / 5000, 1);
    return (frequencyFactor + timeFactor) / 2;
  }

  private async estimateIndexSize(tableName: string, columns: string[]): Promise<string> {
    try {
      const client = await this.pool.connect();
      
      try {
        const result = await client.query(`
          SELECT pg_size_pretty(pg_relation_size($1)) as table_size,
                 count(*) as row_count
          FROM ${tableName}
        `, [tableName]);
        
        const rowCount = parseInt(result.rows[0]?.row_count || '0');
        const estimatedBytes = rowCount * columns.length * 8; // Rough estimate
        
        if (estimatedBytes > 1024 * 1024) {
          return `~${(estimatedBytes / (1024 * 1024)).toFixed(1)}MB`;
        } else {
          return `~${(estimatedBytes / 1024).toFixed(0)}KB`;
        }
      } finally {
        client.release();
      }
    } catch (error) {
      return '~Unknown';
    }
  }

  private deduplicateRecommendations(recommendations: IndexRecommendation[]): IndexRecommendation[] {
    const seen = new Set<string>();
    return recommendations.filter(rec => {
      const key = `${rec.tableName}:${rec.columns.join(',')}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Public API methods
   */
  getIndexRecommendations(): IndexRecommendation[] {
    return [...this.indexRecommendations];
  }

  getQueryPatterns(): QueryPattern[] {
    return Array.from(this.queryPatterns.values());
  }

  async getIndexUsageReport(): Promise<{
    totalIndexes: number;
    usedIndexes: number;
    unusedIndexes: number;
    totalIndexSize: string;
    recommendations: number;
  }> {
    const indexStats = await this.analyzeIndexUsage();
    const usedIndexes = indexStats.filter(stat => stat.indexScans > 0).length;
    const unusedIndexes = indexStats.length - usedIndexes;
    
    return {
      totalIndexes: indexStats.length,
      usedIndexes,
      unusedIndexes,
      totalIndexSize: 'Calculating...', // Would need additional query
      recommendations: this.indexRecommendations.length
    };
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  clearPatterns(): void {
    this.queryPatterns.clear();
    this.indexRecommendations = [];
  }
}

export default DatabaseIndexOptimizer;




