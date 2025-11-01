import { Pool } from 'pg';
import PerformanceOptimizationIntegration from '../middleware/performanceOptimizationIntegration';
import { ResponseCachingMiddleware } from '../middleware/responseCachingMiddleware';
import CompressionOptimizationMiddleware from '../middleware/compressionOptimizationMiddleware';
import ConnectionPoolOptimizer from '../services/connectionPoolOptimizer';
import DatabaseIndexOptimizer from '../services/databaseIndexOptimizer';

// Mock Pool for testing
const mockPool = {
  totalCount: 10,
  idleCount: 5,
  waitingCount: 0,
  connect: jest.fn().mockResolvedValue({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn(),
    processID: 12345
  }),
  on: jest.fn(),
  options: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  }
} as unknown as Pool;

describe('Performance Optimization Integration', () => {
  let performanceOptimizer: PerformanceOptimizationIntegration;

  beforeEach(() => {
    performanceOptimizer = new PerformanceOptimizationIntegration(mockPool, {
      enableCaching: true,
      enableCompression: true,
      enableDatabaseOptimization: true,
      enableConnectionPooling: true,
      enableIndexOptimization: true,
      enableMetrics: true,
      enableAutoOptimization: false // Disable for testing
    });
  });

  afterEach(() => {
    performanceOptimizer.stop();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(performanceOptimizer).toBeDefined();
    });

    it('should provide metrics', () => {
      const metrics = performanceOptimizer.getMetrics();
      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('cacheHitRate');
      expect(metrics).toHaveProperty('compressionRate');
    });
  });

  describe('Middleware Integration', () => {
    it('should create optimization middleware', () => {
      const middleware = performanceOptimizer.optimize();
      expect(typeof middleware).toBe('function');
    });

    it('should add performance context to request', (done) => {
      const middleware = performanceOptimizer.optimize();
      const mockReq = { 
        path: '/test',
        method: 'GET',
        get: jest.fn().mockReturnValue('gzip'),
        headers: { 'accept-encoding': 'gzip' }
      } as any;
      const mockRes = { 
        on: jest.fn(),
        set: jest.fn(),
        get: jest.fn()
      } as any;
      const mockNext = jest.fn(() => {
        expect(mockReq.performance).toBeDefined();
        expect(mockReq.performance.startTime).toBeDefined();
        expect(mockReq.performance.optimizations).toBeDefined();
        done();
      });

      middleware(mockReq, mockRes, mockNext);
    });
  });

  describe('Performance Report', () => {
    it('should generate performance report', async () => {
      const report = await performanceOptimizer.getPerformanceReport();
      
      expect(report).toHaveProperty('overall');
      expect(report).toHaveProperty('components');
      expect(report.overall).toHaveProperty('status');
      expect(report.overall).toHaveProperty('score');
      expect(report.overall).toHaveProperty('recommendations');
    });
  });

  describe('Metrics Reset', () => {
    it('should reset metrics', () => {
      performanceOptimizer.resetMetrics();
      const metrics = performanceOptimizer.getMetrics();
      
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.averageResponseTime).toBe(0);
    });
  });
});

describe('Response Caching Middleware', () => {
  let cachingMiddleware: ResponseCachingMiddleware;

  beforeEach(() => {
    cachingMiddleware = new ResponseCachingMiddleware();
  });

  describe('Cache Middleware Creation', () => {
    it('should create cache middleware with default options', () => {
      const middleware = cachingMiddleware.cache();
      expect(typeof middleware).toBe('function');
    });

    it('should create cache middleware with custom options', () => {
      const middleware = cachingMiddleware.cache({
        ttl: 600,
        keyGenerator: (req) => `custom:${req.path}`,
        condition: (req, res) => req.method === 'GET'
      });
      expect(typeof middleware).toBe('function');
    });
  });

  describe('Metrics', () => {
    it('should provide cache metrics', () => {
      const metrics = cachingMiddleware.getMetrics();
      
      expect(metrics).toHaveProperty('hits');
      expect(metrics).toHaveProperty('misses');
      expect(metrics).toHaveProperty('hitRate');
      expect(metrics).toHaveProperty('totalRequests');
    });

    it('should reset metrics', () => {
      cachingMiddleware.resetMetrics();
      const metrics = cachingMiddleware.getMetrics();
      
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.totalRequests).toBe(0);
    });
  });
});

describe('Compression Optimization Middleware', () => {
  let compressionMiddleware: CompressionOptimizationMiddleware;

  beforeEach(() => {
    compressionMiddleware = new CompressionOptimizationMiddleware({
      threshold: 1024,
      level: 6,
      enableBrotli: true,
      enableGzip: true
    });
  });

  describe('Compression Middleware Creation', () => {
    it('should create adaptive compression middleware', () => {
      const middleware = compressionMiddleware.adaptiveCompression();
      expect(typeof middleware).toBe('function');
    });

    it('should create content-aware compression middleware', () => {
      const middleware = compressionMiddleware.contentAwareCompression();
      expect(typeof middleware).toBe('function');
    });
  });

  describe('Metrics', () => {
    it('should provide compression metrics', () => {
      const metrics = compressionMiddleware.getMetrics();
      
      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('compressedRequests');
      expect(metrics).toHaveProperty('compressionRatio');
      expect(metrics).toHaveProperty('totalBytesSaved');
    });

    it('should generate compression report', () => {
      const report = compressionMiddleware.getCompressionReport();
      
      expect(report).toHaveProperty('efficiency');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('stats');
    });
  });
});

describe('Connection Pool Optimizer', () => {
  let poolOptimizer: ConnectionPoolOptimizer;

  beforeEach(() => {
    poolOptimizer = new ConnectionPoolOptimizer(mockPool);
  });

  afterEach(() => {
    poolOptimizer.stopMonitoring();
  });

  describe('Pool Metrics', () => {
    it('should provide pool metrics', () => {
      const metrics = poolOptimizer.getMetrics();
      
      expect(metrics).toHaveProperty('totalConnections');
      expect(metrics).toHaveProperty('activeConnections');
      expect(metrics).toHaveProperty('idleConnections');
      expect(metrics).toHaveProperty('poolUtilization');
    });

    it('should provide pool status', () => {
      const status = poolOptimizer.getPoolStatus();
      
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('issues');
      expect(status).toHaveProperty('recommendations');
      expect(['healthy', 'degraded', 'critical']).toContain(status.status);
    });
  });

  describe('Query Execution', () => {
    it('should execute queries with monitoring', async () => {
      const result = await poolOptimizer.executeQuery('SELECT 1', []);
      
      expect(result).toHaveProperty('rows');
      expect(result).toHaveProperty('executionTime');
      expect(result).toHaveProperty('connectionId');
      expect(typeof result.executionTime).toBe('number');
    });
  });

  describe('Optimization Report', () => {
    it('should generate optimization report', async () => {
      const report = await poolOptimizer.getOptimizationReport();
      
      expect(report).toHaveProperty('currentConfig');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('connectionHealth');
      expect(report).toHaveProperty('estimatedImpact');
    });
  });
});

describe('Database Index Optimizer', () => {
  let indexOptimizer: DatabaseIndexOptimizer;

  beforeEach(() => {
    indexOptimizer = new DatabaseIndexOptimizer(mockPool);
  });

  afterEach(() => {
    indexOptimizer.stopMonitoring();
  });

  describe('Query Analysis', () => {
    it('should analyze queries for optimization opportunities', async () => {
      await indexOptimizer.analyzeQuery(
        'SELECT * FROM products WHERE category = $1 ORDER BY created_at DESC',
        1500 // execution time
      );

      const patterns = indexOptimizer.getQueryPatterns();
      expect(patterns.length).toBeGreaterThan(0);
    });
  });

  describe('Index Recommendations', () => {
    it('should generate index recommendations', async () => {
      // Simulate some query patterns first
      await indexOptimizer.analyzeQuery(
        'SELECT * FROM products WHERE category = $1',
        1200
      );
      
      const recommendations = await indexOptimizer.generateIndexRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should provide index usage report', async () => {
      const report = await indexOptimizer.getIndexUsageReport();
      
      expect(report).toHaveProperty('totalIndexes');
      expect(report).toHaveProperty('usedIndexes');
      expect(report).toHaveProperty('unusedIndexes');
      expect(report).toHaveProperty('recommendations');
    });
  });
});

describe('Integration Tests', () => {
  let performanceOptimizer: PerformanceOptimizationIntegration;

  beforeEach(() => {
    performanceOptimizer = new PerformanceOptimizationIntegration(mockPool);
  });

  afterEach(() => {
    performanceOptimizer.stop();
  });

  it('should handle multiple optimization components together', async () => {
    const middleware = performanceOptimizer.optimize();
    const mockReq = { 
      path: '/api/marketplace/listings',
      method: 'GET',
      query: { category: 'electronics' },
      get: jest.fn().mockReturnValue('gzip, deflate'),
      headers: { 'accept-encoding': 'gzip, deflate' }
    } as any;
    const mockRes = { 
      on: jest.fn(),
      set: jest.fn(),
      json: jest.fn(),
      statusCode: 200,
      get: jest.fn()
    } as any;
    const mockNext = jest.fn();

    // Execute middleware
    middleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.performance).toBeDefined();
  });

  it('should provide comprehensive metrics from all components', () => {
    const metrics = performanceOptimizer.getMetrics();
    
    expect(metrics).toHaveProperty('components');
    expect(metrics.components).toHaveProperty('caching');
    expect(metrics.components).toHaveProperty('compression');
    expect(metrics.components).toHaveProperty('database');
    expect(metrics.components).toHaveProperty('connectionPool');
  });

  it('should run optimization without errors', async () => {
    await expect(performanceOptimizer.runOptimization()).resolves.not.toThrow();
  });
});
