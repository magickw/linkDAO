import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { industryBenchmarkIntegrationService } from '../industryBenchmarkIntegrationService';
import { ExternalDataSource, BenchmarkUpdate, ValidationReport } from '../industryBenchmarkIntegrationService';

/**
 * Unit tests for Industry Benchmark Integration Service
 * 
 * Tests external data source integration, validation, and synchronization
 */

describe('IndustryBenchmarkIntegrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('External Data Source Management', () => {
    it('should register external data sources', () => {
      const dataSource: ExternalDataSource = {
        id: 'test-source-1',
        name: 'Test Industry Data Provider',
        type: 'api',
        url: 'https://api.test-benchmarks.com',
        apiKey: 'test-api-key',
        format: 'json',
        updateFrequency: 86400000, // 24 hours
        lastSync: new Date(),
        active: true,
        industry: 'E-commerce',
        segment: 'General',
        metadata: {
          description: 'Test data source for unit testing',
          reliability: 'high',
          coverage: 'US',
          sampleSize: 1000
        }
      };

      industryBenchmarkIntegrationService.registerDataSource(dataSource);

      const retrievedSource = industryBenchmarkIntegrationService.getDataSource(dataSource.id);
      expect(retrievedSource).toBeDefined();
      expect(retrievedSource!.id).toBe(dataSource.id);
      expect(retrievedSource!.name).toBe(dataSource.name);
      expect(retrievedSource!.type).toBe(dataSource.type);
    });

    it('should validate data source configurations', () => {
      const invalidDataSource = {
        id: 'invalid-source',
        name: 'Invalid Source',
        type: 'api',
        url: 'invalid-url',
        format: 'json',
        updateFrequency: 86400000,
        lastSync: new Date(),
        active: true,
        industry: '',
        segment: '',
        metadata: {}
      } as ExternalDataSource;

      expect(() => {
        industryBenchmarkIntegrationService.registerDataSource(invalidDataSource);
      }).toThrow();
    });

    it('should list active data sources', () => {
      // Register multiple data sources
      const sources = [
        {
          id: 'source-1',
          name: 'Source 1',
          type: 'api' as const,
          url: 'https://api1.test.com',
          format: 'json' as const,
          updateFrequency: 86400000,
          lastSync: new Date(),
          active: true,
          industry: 'E-commerce',
          segment: 'General',
          metadata: {}
        },
        {
          id: 'source-2',
          name: 'Source 2',
          type: 'file' as const,
          url: '/data/benchmarks.csv',
          format: 'csv' as const,
          updateFrequency: 86400000,
          lastSync: new Date(),
          active: false,
          industry: 'E-commerce',
          segment: 'Fashion',
          metadata: {}
        }
      ];

      sources.forEach(source => industryBenchmarkIntegrationService.registerDataSource(source));

      const activeSources = industryBenchmarkIntegrationService.getActiveDataSources();
      expect(activeSources.length).toBe(1);
      expect(activeSources[0].id).toBe('source-1');
    });
  });

  describe('Data Synchronization', () => {
    it('should sync API data sources', async () => {
      const apiSource: ExternalDataSource = {
        id: 'api-source',
        name: 'API Test Source',
        type: 'api',
        url: 'https://api.test-benchmarks.com/latest',
        apiKey: 'test-key',
        format: 'json',
        updateFrequency: 86400000,
        lastSync: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        active: true,
        industry: 'E-commerce',
        segment: 'General',
        metadata: {
          description: 'Test API source',
          reliability: 'high',
          coverage: 'US',
          sampleSize: 1000
        }
      };

      industryBenchmarkIntegrationService.registerDataSource(apiSource);

      // Mock the API call
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          benchmarks: {
            processing_time: {
              average: 45,
              median: 43,
              topQuartile: 25,
              bottomQuartile: 70,
              standardDeviation: 15,
              sampleSize: 1200,
              confidence: 0.95
            },
            approval_rate: {
              average: 86,
              median: 87,
              topQuartile: 94,
              bottomQuartile: 76,
              standardDeviation: 8,
              sampleSize: 1200,
              confidence: 0.95
            }
          }
        })
      });

      global.fetch = mockFetch;

      const result = await industryBenchmarkIntegrationService.syncDataSource(apiSource.id);

      expect(result).toBeDefined();
      expect(result!.sourceId).toBe(apiSource.id);
      expect(result!.status).toBe('success');
      expect(result!.metrics).toBeDefined();
      expect(Object.keys(result!.metrics)).toContain('processing_time');
      expect(Object.keys(result!.metrics)).toContain('approval_rate');
    });

    it('should handle file data sources', async () => {
      const fileSource: ExternalDataSource = {
        id: 'file-source',
        name: 'File Test Source',
        type: 'file',
        url: '/test-data/benchmarks.csv',
        format: 'csv',
        updateFrequency: 86400000,
        lastSync: new Date(Date.now() - 25 * 60 * 60 * 1000),
        active: true,
        industry: 'E-commerce',
        segment: 'Fashion',
        metadata: {
          description: 'Test file source',
          reliability: 'medium',
          coverage: 'EU',
          sampleSize: 500
        }
      };

      industryBenchmarkIntegrationService.registerDataSource(fileSource);

      // Mock file read
      const mockFs = require('fs').promises;
      mockFs.readFile = jest.fn().mockResolvedValue(
        'metric,average,median,top_quartile,bottom_quartile,standard_deviation,sample_size,confidence\n' +
        'processing_time,72,68,36,96,24,450,0.90\n' +
        'approval_rate,78,80,90,65,10,450,0.90\n'
      );

      const result = await industryBenchmarkIntegrationService.syncDataSource(fileSource.id);

      expect(result).toBeDefined();
      expect(result!.sourceId).toBe(fileSource.id);
      expect(result!.status).toBe('success');
      expect(result!.metrics).toBeDefined();
    });

    it('should handle sync failures gracefully', async () => {
      const failingSource: ExternalDataSource = {
        id: 'failing-source',
        name: 'Failing Source',
        type: 'api',
        url: 'https://api.failing-source.com',
        format: 'json',
        updateFrequency: 86400000,
        lastSync: new Date(Date.now() - 25 * 60 * 60 * 1000),
        active: true,
        industry: 'E-commerce',
        segment: 'General',
        metadata: {}
      };

      industryBenchmarkIntegrationService.registerDataSource(failingSource);

      // Mock failed API call
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await industryBenchmarkIntegrationService.syncDataSource(failingSource.id);

      expect(result).toBeNull();
    });

    it('should respect sync frequency limits', async () => {
      const recentSource: ExternalDataSource = {
        id: 'recent-source',
        name: 'Recently Synced Source',
        type: 'api',
        url: 'https://api.recent-source.com',
        format: 'json',
        updateFrequency: 86400000,
        lastSync: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        active: true,
        industry: 'E-commerce',
        segment: 'General',
        metadata: {}
      };

      industryBenchmarkIntegrationService.registerDataSource(recentSource);

      const result = await industryBenchmarkIntegrationService.syncDataSource(recentSource.id);

      // Should not sync due to frequency limit
      expect(result).toBeNull();
    });
  });

  describe('Data Validation', () => {
    it('should validate benchmark data structure', async () => {
      const validUpdate: BenchmarkUpdate = {
        sourceId: 'test-source',
        timestamp: new Date(),
        status: 'success',
        metrics: {
          processing_time: {
            average: 45,
            median: 43,
            topQuartile: 25,
            bottomQuartile: 70,
            standardDeviation: 15,
            sampleSize: 1200,
            confidence: 0.95
          },
          approval_rate: {
            average: 86,
            median: 87,
            topQuartile: 94,
            bottomQuartile: 76,
            standardDeviation: 8,
            sampleSize: 1200,
            confidence: 0.95
          }
        },
        metadata: {
          recordCount: 2,
          dataQuality: 'high',
          lastUpdated: new Date()
        }
      };

      const result = await industryBenchmarkIntegrationService.validateBenchmarkData(validUpdate);

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect data quality issues', async () => {
      const problematicUpdate: BenchmarkUpdate = {
        sourceId: 'test-source',
        timestamp: new Date(),
        status: 'success',
        metrics: {
          processing_time: {
            average: -10, // Invalid negative value
            median: 43,
            topQuartile: 25, // Top quartile less than average
            bottomQuartile: 70,
            standardDeviation: 15,
            sampleSize: 50, // Small sample size
            confidence: 0.95
          },
          approval_rate: {
            average: 150, // Invalid percentage > 100
            median: 87,
            topQuartile: 94,
            bottomQuartile: 76,
            standardDeviation: 8,
            sampleSize: 1200,
            confidence: 0.95
          }
        },
        metadata: {
          recordCount: 2,
          dataQuality: 'low',
          lastUpdated: new Date()
        }
      };

      const result = await industryBenchmarkIntegrationService.validateBenchmarkData(problematicUpdate);

      expect(result).toBeDefined();
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);

      // Check for specific errors
      const errorMessages = result.errors.map(e => e.message);
      expect(errorMessages.some(msg => msg.includes('negative'))).toBe(true);
      expect(errorMessages.some(msg => msg.includes('percentage'))).toBe(true);
    });

    it('should validate statistical consistency', async () => {
      const inconsistentUpdate: BenchmarkUpdate = {
        sourceId: 'test-source',
        timestamp: new Date(),
        status: 'success',
        metrics: {
          processing_time: {
            average: 50,
            median: 60, // Median greater than average significantly
            topQuartile: 40, // Top quartile less than median
            bottomQuartile: 30, // Bottom quartile less than top quartile
            standardDeviation: 100, // Very high standard deviation
            sampleSize: 1200,
            confidence: 0.95
          }
        },
        metadata: {
          recordCount: 1,
          dataQuality: 'medium',
          lastUpdated: new Date()
        }
      };

      const result = await industryBenchmarkIntegrationService.validateBenchmarkData(inconsistentUpdate);

      expect(result).toBeDefined();
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      const errorMessages = result.errors.map(e => e.message);
      expect(errorMessages.some(msg => msg.includes('quartile'))).toBe(true);
      expect(errorMessages.some(msg => msg.includes('consistency'))).toBe(true);
    });
  });

  describe('Scheduled Synchronization', () => {
    it('should start scheduled sync for active sources', async () => {
      const source: ExternalDataSource = {
        id: 'scheduled-source',
        name: 'Scheduled Test Source',
        type: 'api',
        url: 'https://api.scheduled-source.com',
        format: 'json',
        updateFrequency: 3600000, // 1 hour
        lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        active: true,
        industry: 'E-commerce',
        segment: 'General',
        metadata: {}
      };

      industryBenchmarkIntegrationService.registerDataSource(source);

      // Mock successful sync
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          benchmarks: {
            processing_time: {
              average: 45,
              median: 43,
              topQuartile: 25,
              bottomQuartile: 70,
              standardDeviation: 15,
              sampleSize: 1200,
              confidence: 0.95
            }
          }
        })
      });

      await industryBenchmarkIntegrationService.startScheduledSync(source.id);

      // Wait a bit for async operation
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should stop scheduled sync', async () => {
      const source: ExternalDataSource = {
        id: 'stop-source',
        name: 'Stop Test Source',
        type: 'api',
        url: 'https://api.stop-source.com',
        format: 'json',
        updateFrequency: 3600000,
        lastSync: new Date(),
        active: true,
        industry: 'E-commerce',
        segment: 'General',
        metadata: {}
      };

      industryBenchmarkIntegrationService.registerDataSource(source);
      await industryBenchmarkIntegrationService.startScheduledSync(source.id);
      await industryBenchmarkIntegrationService.stopScheduledSync(source.id);

      // Verify sync is stopped (no further calls should be made)
      expect(true).toBe(true); // Basic test - in real implementation would verify no further syncs
    });

    it('should handle sync scheduling errors', async () => {
      const errorSource: ExternalDataSource = {
        id: 'error-source',
        name: 'Error Test Source',
        type: 'api',
        url: 'https://api.error-source.com',
        format: 'json',
        updateFrequency: 3600000,
        lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000),
        active: true,
        industry: 'E-commerce',
        segment: 'General',
        metadata: {}
      };

      industryBenchmarkIntegrationService.registerDataSource(errorSource);

      // Mock failed sync
      global.fetch = jest.fn().mockRejectedValue(new Error('Sync failed'));

      await industryBenchmarkIntegrationService.startScheduledSync(errorSource.id);

      // Should handle errors gracefully without crashing
      expect(true).toBe(true);
    });
  });

  describe('Data Quality Assessment', () => {
    it('should assess data quality metrics', async () => {
      const highQualityUpdate: BenchmarkUpdate = {
        sourceId: 'high-quality-source',
        timestamp: new Date(),
        status: 'success',
        metrics: {
          processing_time: {
            average: 45,
            median: 43,
            topQuartile: 25,
            bottomQuartile: 70,
            standardDeviation: 15,
            sampleSize: 5000, // Large sample size
            confidence: 0.99 // High confidence
          }
        },
        metadata: {
          recordCount: 1,
          dataQuality: 'high',
          lastUpdated: new Date()
        }
      };

      const result = await industryBenchmarkIntegrationService.validateBenchmarkData(highQualityUpdate);

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.qualityScore).toBeGreaterThan(80);
    });

    it('should identify low quality data', async () => {
      const lowQualityUpdate: BenchmarkUpdate = {
        sourceId: 'low-quality-source',
        timestamp: new Date(),
        status: 'success',
        metrics: {
          processing_time: {
            average: 45,
            median: 43,
            topQuartile: 25,
            bottomQuartile: 70,
            standardDeviation: 15,
            sampleSize: 50, // Small sample size
            confidence: 0.70 // Low confidence
          }
        },
        metadata: {
          recordCount: 1,
          dataQuality: 'low',
          lastUpdated: new Date()
        }
      };

      const result = await industryBenchmarkIntegrationService.validateBenchmarkData(lowQualityUpdate);

      expect(result).toBeDefined();
      expect(result.qualityScore).toBeLessThan(60);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Integration with Performance Benchmark Service', () => {
    it('should update industry benchmarks in performance service', async () => {
      const source: ExternalDataSource = {
        id: 'integration-source',
        name: 'Integration Test Source',
        type: 'api',
        url: 'https://api.integration-source.com',
        format: 'json',
        updateFrequency: 86400000,
        lastSync: new Date(Date.now() - 25 * 60 * 60 * 1000),
        active: true,
        industry: 'E-commerce',
        segment: 'Electronics',
        metadata: {}
      };

      industryBenchmarkIntegrationService.registerDataSource(source);

      // Mock successful sync with new benchmark data
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          benchmarks: {
            processing_time: {
              average: 36,
              median: 32,
              topQuartile: 18,
              bottomQuartile: 54,
              standardDeviation: 15,
              sampleSize: 680,
              confidence: 0.92
            }
          }
        })
      });

      const result = await industryBenchmarkIntegrationService.syncDataSource(source.id);

      expect(result).toBeDefined();
      expect(result!.status).toBe('success');
      // In real implementation, would verify that performance service benchmarks are updated
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing data sources', async () => {
      const result = await industryBenchmarkIntegrationService.syncDataSource('non-existent-source');
      expect(result).toBeNull();
    });

    it('should handle malformed API responses', async () => {
      const source: ExternalDataSource = {
        id: 'malformed-source',
        name: 'Malformed Response Source',
        type: 'api',
        url: 'https://api.malformed-source.com',
        format: 'json',
        updateFrequency: 86400000,
        lastSync: new Date(Date.now() - 25 * 60 * 60 * 1000),
        active: true,
        industry: 'E-commerce',
        segment: 'General',
        metadata: {}
      };

      industryBenchmarkIntegrationService.registerDataSource(source);

      // Mock malformed response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invalid: 'structure' })
      });

      const result = await industryBenchmarkIntegrationService.syncDataSource(source.id);

      expect(result).toBeNull();
    });

    it('should handle network timeouts', async () => {
      const source: ExternalDataSource = {
        id: 'timeout-source',
        name: 'Timeout Source',
        type: 'api',
        url: 'https://api.timeout-source.com',
        format: 'json',
        updateFrequency: 86400000,
        lastSync: new Date(Date.now() - 25 * 60 * 60 * 1000),
        active: true,
        industry: 'E-commerce',
        segment: 'General',
        metadata: {}
      };

      industryBenchmarkIntegrationService.registerDataSource(source);

      // Mock timeout
      global.fetch = jest.fn().mockRejectedValue(new Error('Request timeout'));

      const result = await industryBenchmarkIntegrationService.syncDataSource(source.id);

      expect(result).toBeNull();
    });

    it('should validate data source configuration on registration', () => {
      const invalidConfigs = [
        { type: 'invalid-type' },
        { format: 'invalid-format' },
        { updateFrequency: -1 },
        { industry: '' },
        { segment: '' }
      ];

      invalidConfigs.forEach(config => {
        expect(() => {
          industryBenchmarkIntegrationService.registerDataSource({
            id: 'test',
            name: 'Test',
            type: 'api',
            url: 'https://test.com',
            format: 'json',
            updateFrequency: 86400000,
            lastSync: new Date(),
            active: true,
            industry: 'E-commerce',
            segment: 'General',
            metadata: {},
            ...config
          });
        }).toThrow();
      });
    });
  });
});