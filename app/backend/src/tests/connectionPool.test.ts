import { DatabaseConnectionPool } from '../db/connectionPool';

// Mock postgres module
const mockSql = {
  begin: jest.fn(),
  end: jest.fn(),
  listen: jest.fn(),
  unsafe: jest.fn()
};

const mockPostgres = jest.fn(() => mockSql);

jest.mock('postgres', () => mockPostgres);

describe('DatabaseConnectionPool', () => {
  let dbPool: DatabaseConnectionPool;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (DatabaseConnectionPool as any).instance = undefined;
    dbPool = DatabaseConnectionPool.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = DatabaseConnectionPool.getInstance();
      const instance2 = DatabaseConnectionPool.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create postgres connection with correct config', () => {
      expect(mockPostgres).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          max: expect.any(Number),
          idle_timeout: expect.any(Number),
          connect_timeout: expect.any(Number),
          prepare: false
        })
      );
    });
  });

  describe('Connection Management', () => {
    it('should return SQL connection', () => {
      const connection = dbPool.getConnection();
      expect(connection).toBe(mockSql);
    });

    it('should perform health check successfully', async () => {
      mockSql.unsafe = jest.fn().mockImplementation((query) => {
        if (query === 'SELECT 1 as health_check') {
          return Promise.resolve([{ health_check: 1 }]);
        }
        return Promise.resolve([]);
      });

      const result = await dbPool.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.latency).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
    });

    it('should handle health check failure', async () => {
      const testError = new Error('Connection failed');
      mockSql.unsafe = jest.fn().mockRejectedValue(testError);

      const result = await dbPool.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.error).toBe('Connection failed');
      expect(result.latency).toBeUndefined();
    });

    it('should close connection gracefully', async () => {
      mockSql.end.mockResolvedValue(undefined);

      await dbPool.close();

      expect(mockSql.end).toHaveBeenCalled();
    });

    it('should handle close error gracefully', async () => {
      const testError = new Error('Close failed');
      mockSql.end.mockRejectedValue(testError);

      // Should not throw
      await expect(dbPool.close()).resolves.toBeUndefined();
    });
  });

  describe('Pool Statistics', () => {
    it('should get pool statistics successfully', async () => {
      const mockStats = [{
        total_connections: '10',
        idle_connections: '5',
        active_connections: '5'
      }];

      mockSql.unsafe = jest.fn().mockImplementation((query) => {
        if (query.includes('pg_stat_activity')) {
          return Promise.resolve(mockStats);
        }
        return Promise.resolve([]);
      });

      const stats = await dbPool.getPoolStats();

      expect(stats).toEqual({
        totalConnections: 10,
        idleConnections: 5,
        activeConnections: 5
      });
    });

    it('should handle pool statistics error', async () => {
      const testError = new Error('Stats query failed');
      mockSql.unsafe = jest.fn().mockRejectedValue(testError);

      const stats = await dbPool.getPoolStats();

      expect(stats).toEqual({
        totalConnections: 0,
        idleConnections: 0,
        activeConnections: 0
      });
    });
  });

  describe('Transaction Management', () => {
    it('should execute transaction successfully', async () => {
      const mockCallback = jest.fn().mockResolvedValue('success');
      mockSql.begin.mockImplementation((callback) => callback(mockSql));

      const result = await dbPool.withTransaction(mockCallback);

      expect(mockSql.begin).toHaveBeenCalledWith(mockCallback);
      expect(mockCallback).toHaveBeenCalledWith(mockSql);
      expect(result).toBe('success');
    });

    it('should retry on retryable error', async () => {
      const retryableError = new Error('Deadlock detected') as any;
      retryableError.code = '40P01'; // deadlock_detected

      const mockCallback = jest.fn()
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success');

      mockSql.begin
        .mockImplementationOnce(() => Promise.reject(retryableError))
        .mockImplementationOnce((callback) => callback(mockSql));

      const result = await dbPool.withTransaction(mockCallback, 3);

      expect(mockSql.begin).toHaveBeenCalledTimes(2);
      expect(result).toBe('success');
    });

    it('should not retry on non-retryable error', async () => {
      const nonRetryableError = new Error('Syntax error') as any;
      nonRetryableError.code = '42601'; // syntax_error

      const mockCallback = jest.fn();
      mockSql.begin.mockRejectedValue(nonRetryableError);

      await expect(dbPool.withTransaction(mockCallback, 3))
        .rejects.toThrow('Syntax error');

      expect(mockSql.begin).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries', async () => {
      const retryableError = new Error('Connection timeout') as any;
      retryableError.code = '08006'; // connection_failure

      const mockCallback = jest.fn();
      mockSql.begin.mockRejectedValue(retryableError);

      await expect(dbPool.withTransaction(mockCallback, 2))
        .rejects.toThrow('Connection timeout');

      expect(mockSql.begin).toHaveBeenCalledTimes(2);
    });
  });

  describe('Query Optimization', () => {
    it('should explain query in development mode', async () => {
      process.env.NODE_ENV = 'development';
      
      const mockExplainResult = [{
        'QUERY PLAN': [{ 'Plan': { 'Node Type': 'Seq Scan' } }]
      }];

      mockSql.unsafe.mockResolvedValue(mockExplainResult);

      const result = await dbPool.explainQuery('SELECT * FROM users', ['param1']);

      expect(mockSql.unsafe).toHaveBeenCalledWith(
        'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT * FROM users',
        ['param1']
      );
      expect(result).toEqual(mockExplainResult);
    });

    it('should reject explain query in production mode', async () => {
      process.env.NODE_ENV = 'production';

      await expect(dbPool.explainQuery('SELECT * FROM users'))
        .rejects.toThrow('Query explanation only available in development mode');
    });

    it('should handle explain query error', async () => {
      process.env.NODE_ENV = 'development';
      
      const testError = new Error('Explain failed');
      mockSql.unsafe.mockRejectedValue(testError);

      await expect(dbPool.explainQuery('SELECT * FROM users'))
        .rejects.toThrow('Explain failed');
    });
  });

  describe('Connection Monitoring', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start monitoring with default interval', () => {
      const mockHealthCheck = jest.spyOn(dbPool, 'healthCheck')
        .mockResolvedValue({ healthy: true, latency: 10 });
      const mockGetPoolStats = jest.spyOn(dbPool, 'getPoolStats')
        .mockResolvedValue({ totalConnections: 5, idleConnections: 3, activeConnections: 2 });

      const intervalId = dbPool.startMonitoring();

      expect(intervalId).toBeDefined();

      // Fast-forward time
      jest.advanceTimersByTime(30000);

      expect(mockHealthCheck).toHaveBeenCalled();
      expect(mockGetPoolStats).toHaveBeenCalled();

      clearInterval(intervalId);
    });

    it('should start monitoring with custom interval', () => {
      const mockHealthCheck = jest.spyOn(dbPool, 'healthCheck')
        .mockResolvedValue({ healthy: true, latency: 10 });
      const mockGetPoolStats = jest.spyOn(dbPool, 'getPoolStats')
        .mockResolvedValue({ totalConnections: 5, idleConnections: 3, activeConnections: 2 });

      const intervalId = dbPool.startMonitoring(10000);

      // Fast-forward time
      jest.advanceTimersByTime(10000);

      expect(mockHealthCheck).toHaveBeenCalled();
      expect(mockGetPoolStats).toHaveBeenCalled();

      clearInterval(intervalId);
    });

    it('should handle monitoring errors gracefully', () => {
      const mockHealthCheck = jest.spyOn(dbPool, 'healthCheck')
        .mockRejectedValue(new Error('Monitoring failed'));

      const intervalId = dbPool.startMonitoring(1000);

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      // Should not throw
      expect(mockHealthCheck).toHaveBeenCalled();

      clearInterval(intervalId);
    });
  });

  describe('Error Classification', () => {
    it('should identify retryable errors by code', () => {
      const retryableCodes = ['40001', '40P01', '53300', '08006', '08001', '08004'];
      
      retryableCodes.forEach(code => {
        const error = new Error('Test error') as any;
        error.code = code;
        
        // Access private method for testing
        const isRetryable = (dbPool as any).isRetryableError(error);
        expect(isRetryable).toBe(true);
      });
    });

    it('should identify retryable errors by message', () => {
      const connectionError = new Error('connection timeout');
      const timeoutError = new Error('query timeout occurred');
      
      const isConnectionRetryable = (dbPool as any).isRetryableError(connectionError);
      const isTimeoutRetryable = (dbPool as any).isRetryableError(timeoutError);
      
      expect(isConnectionRetryable).toBe(true);
      expect(isTimeoutRetryable).toBe(true);
    });

    it('should identify non-retryable errors', () => {
      const syntaxError = new Error('Syntax error') as any;
      syntaxError.code = '42601';
      
      const isRetryable = (dbPool as any).isRetryableError(syntaxError);
      expect(isRetryable).toBe(false);
    });

    it('should handle null/undefined errors', () => {
      const isNullRetryable = (dbPool as any).isRetryableError(null);
      const isUndefinedRetryable = (dbPool as any).isRetryableError(undefined);
      
      expect(isNullRetryable).toBe(false);
      expect(isUndefinedRetryable).toBe(false);
    });
  });
});
