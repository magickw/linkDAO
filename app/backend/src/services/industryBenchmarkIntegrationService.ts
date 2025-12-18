/**
 * Industry Benchmark Integration Service
 * 
 * Service for integrating external industry benchmark data sources
 * and keeping benchmarks up to date.
 */

import { logger } from '../utils/logger';
import { performanceBenchmarkService } from './performanceBenchmarkService';
import { comprehensiveAuditService } from './comprehensiveAuditService';

export interface ExternalDataSource {
  id: string;
  name: string;
  description: string;
  type: 'api' | 'file' | 'database' | 'webhook';
  url?: string;
  apiKey?: string;
  credentials?: any;
  lastSync: Date;
  syncFrequency: number; // hours
  status: 'active' | 'inactive' | 'error';
  errorMessage?: string;
}

export interface BenchmarkUpdate {
  sourceId: string;
  industry: string;
  segment?: string;
  metrics: Record<string, {
    average: number;
    median: number;
    topQuartile: number;
    bottomQuartile: number;
    standardDeviation: number;
    sampleSize: number;
    confidence: number;
  }>;
  metadata: {
    methodology?: string;
    dataQuality: 'high' | 'medium' | 'low';
    coverage?: string;
    limitations?: string[];
    lastUpdated: Date;
  };
}

export interface ValidationReport {
  sourceId: string;
  isValid: boolean;
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    metric?: string;
    expected?: any;
    actual?: any;
  }>;
  recommendations: string[];
  summary: {
    totalMetrics: number;
    validMetrics: number;
    invalidMetrics: number;
    overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
  };
}

export class IndustryBenchmarkIntegrationService {
  private dataSources: Map<string, ExternalDataSource> = new Map();
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeDataSources();
    this.startScheduledSyncs();
  }

  /**
   * Initialize external data sources
   */
  private initializeDataSources(): void {
    const sources: ExternalDataSource[] = [
      {
        id: 'retail_association_api',
        name: 'Retail Association API',
        description: 'Official retail industry benchmark data',
        type: 'api',
        url: 'https://api.retail-association.org/benchmarks',
        apiKey: process.env.RETAIL_ASSOCIATION_API_KEY,
        lastSync: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        syncFrequency: 24, // 24 hours
        status: 'active'
      },
      {
        id: 'ecommerce_analytics',
        name: 'E-commerce Analytics Platform',
        description: 'Third-party e-commerce analytics and benchmarks',
        type: 'api',
        url: 'https://api.ecommerce-analytics.com/v1/benchmarks',
        apiKey: process.env.ECOMMERCE_ANALYTICS_API_KEY,
        lastSync: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        syncFrequency: 12, // 12 hours
        status: 'active'
      },
      {
        id: 'industry_reports_csv',
        name: 'Industry Reports CSV',
        description: 'Monthly industry reports in CSV format',
        type: 'file',
        credentials: {
          filePath: '/data/benchmarks/industry_reports.csv'
        },
        lastSync: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        syncFrequency: 168, // 7 days
        status: 'active'
      },
      {
        id: 'financial_database',
        name: 'Financial Database',
        description: 'Financial performance database connection',
        type: 'database',
        credentials: {
          host: process.env.FINANCIAL_DB_HOST,
          database: process.env.FINANCIAL_DB_NAME,
          username: process.env.FINANCIAL_DB_USER,
          password: process.env.FINANCIAL_DB_PASSWORD
        },
        lastSync: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        syncFrequency: 48, // 48 hours
        status: 'active'
      }
    ];

    sources.forEach(source => {
      this.dataSources.set(source.id, source);
    });
  }

  /**
   * Start scheduled syncs for all active data sources
   */
  private startScheduledSyncs(): void {
    for (const [sourceId, source] of this.dataSources.entries()) {
      if (source.status === 'active') {
        this.scheduleSync(sourceId);
      }
    }
  }

  /**
   * Schedule sync for a specific data source
   */
  private scheduleSync(sourceId: string): void {
    const source = this.dataSources.get(sourceId);
    if (!source || source.status !== 'active') return;

    // Clear existing interval
    const existingInterval = this.syncIntervals.get(sourceId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Schedule new sync
    const interval = setInterval(() => {
      this.syncDataSource(sourceId).catch(error => {
        logger.error(`Scheduled sync failed for source ${sourceId}:`, error);
      });
    }, source.syncFrequency * 60 * 60 * 1000); // Convert hours to milliseconds

    this.syncIntervals.set(sourceId, interval);
    logger.info(`Scheduled sync for source ${sourceId} every ${source.syncFrequency} hours`);
  }

  /**
   * Sync data from external source
   */
  async syncDataSource(sourceId: string): Promise<BenchmarkUpdate | null> {
    try {
      const source = this.dataSources.get(sourceId);
      if (!source) {
        throw new Error(`Data source ${sourceId} not found`);
      }

      logger.info(`Syncing data from source: ${source.name}`);

      let update: BenchmarkUpdate;

      switch (source.type) {
        case 'api':
          update = await this.syncFromApi(source);
          break;
        case 'file':
          update = await this.syncFromFile(source);
          break;
        case 'database':
          update = await this.syncFromDatabase(source);
          break;
        default:
          throw new Error(`Unsupported source type: ${source.type}`);
      }

      // Update benchmark service with new data
      await performanceBenchmarkService.updateIndustryBenchmarks(sourceId, {
        ...update,
        lastUpdated: new Date(),
        metadata: {
          methodology: update.metadata?.methodology || 'External data source',
          dataQuality: update.metadata?.dataQuality || 'medium',
          coverage: update.metadata?.coverage || 'General',
          limitations: update.metadata?.limitations || []
        }
      });

      logger.info(`Successfully synced data from ${source.name}`);
      return update;
    } catch (error) {
      logger.error(`Error syncing data source ${sourceId}:`, error);
      
      // Update source status to error
      const source = this.dataSources.get(sourceId);
      if (source) {
        source.status = 'error';
        source.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      }

      await comprehensiveAuditService.logEvent({
        action: 'benchmark_sync_failed',
        actorId: 'system',
        resourceType: 'EXTERNAL_DATA_SOURCE',
        resourceId: sourceId,
        details: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      });

      return null;
    }
  }

  /**
   * Sync from API data source
   */
  private async syncFromApi(source: ExternalDataSource): Promise<BenchmarkUpdate> {
    try {
      logger.info(`Syncing from API: ${source.url}`);
      
      // TODO: Implement actual API call
      // Mock API response for demonstration
      const mockResponse: BenchmarkUpdate = {
        sourceId: source.id,
        industry: 'E-commerce',
        metrics: {
          processing_time: {
            average: 44.5,
            median: 42,
            topQuartile: 22,
            bottomQuartile: 67,
            standardDeviation: 16.8,
            sampleSize: 1350,
            confidence: 0.92
          },
          approval_rate: {
            average: 86.5,
            median: 88.0,
            topQuartile: 94.0,
            bottomQuartile: 78.0,
            standardDeviation: 7.2,
            sampleSize: 1350,
            confidence: 0.92
          },
          return_rate: {
            average: 11.8,
            median: 10.5,
            topQuartile: 8.0,
            bottomQuartile: 16.0,
            standardDeviation: 4.5,
            sampleSize: 1350,
            confidence: 0.92
          },
          customer_satisfaction: {
            average: 4.15,
            median: 4.2,
            topQuartile: 4.6,
            bottomQuartile: 3.7,
            standardDeviation: 0.65,
            sampleSize: 1350,
            confidence: 0.92
          },
          compliance_score: {
            average: 82.5,
            median: 84.0,
            topQuartile: 91.0,
            bottomQuartile: 73.0,
            standardDeviation: 11.2,
            sampleSize: 1350,
            confidence: 0.92
          },
          refund_processing_time: {
            average: 2.8,
            median: 2.5,
            topQuartile: 1.2,
            bottomQuartile: 4.5,
            standardDeviation: 1.8,
            sampleSize: 1350,
            confidence: 0.92
          },
          policy_adherence: {
            average: 91.2,
            median: 93.0,
            topQuartile: 97.5,
            bottomQuartile: 84.0,
            standardDeviation: 5.8,
            sampleSize: 1350,
            confidence: 0.92
          },
          response_time: {
            average: 1.8,
            median: 1.5,
            topQuartile: 0.8,
            bottomQuartile: 3.2,
            standardDeviation: 1.2,
            sampleSize: 1350,
            confidence: 0.92
          },
          cost_per_return: {
            average: 16.2,
            median: 14.0,
            topQuartile: 10.0,
            bottomQuartile: 22.0,
            standardDeviation: 7.5,
            sampleSize: 1350,
            confidence: 0.92
          }
        },
        metadata: {
          methodology: 'Survey-based data collection',
          dataQuality: 'high' as const,
          coverage: 'North America and Europe',
          limitations: ['Self-reported data', 'Seasonal variations'],
          lastUpdated: new Date()
        }
      };

      // Validate the response
      const validation = await this.validateBenchmarkData(mockResponse);
      if (!validation.isValid) {
        logger.warn(`Validation failed for source ${source.id}:`, validation.issues);
        throw new Error(`Data validation failed: ${validation.issues.map(i => i.message).join(', ')}`);
      }

      // Update last sync time
      source.lastSync = new Date();
      source.status = 'active';
      source.errorMessage = undefined;

      await comprehensiveAuditService.logEvent({
        action: 'benchmark_data_synced',
        actorId: 'system',
        resourceType: 'EXTERNAL_DATA_SOURCE',
        resourceId: source.id,
        details: JSON.stringify({
          source: source.name,
          metricsCount: Object.keys(mockResponse.metrics).length,
          dataQuality: validation.summary.overallQuality
        })
      });

      return mockResponse;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Sync from file data source
   */
  private async syncFromFile(source: ExternalDataSource): Promise<BenchmarkUpdate> {
    // TODO: Implement actual file reading and parsing
    // This is a mock implementation
    throw new Error('File sync not yet implemented');
  }

  /**
   * Sync from database data source
   */
  private async syncFromDatabase(source: ExternalDataSource): Promise<BenchmarkUpdate> {
    // TODO: Implement actual database connection and query
    // This is a mock implementation
    throw new Error('Database sync not yet implemented');
  }

  /**
   * Validate benchmark data quality
   */
  async validateBenchmarkData(update: BenchmarkUpdate): Promise<ValidationReport> {
    const issues: Array<{
      type: 'error' | 'warning' | 'info';
      message: string;
      metric?: string;
      expected?: any;
      actual?: any;
    }> = [];

    let validMetrics = 0;
    const totalMetrics = Object.keys(update.metrics).length;

    // Validate each metric
    for (const [metricId, metric] of Object.entries(update.metrics)) {
      let metricValid = true;

      // Check required fields
      if (typeof metric.average !== 'number' || isNaN(metric.average)) {
        issues.push({
          type: 'error',
          message: `Invalid average value for metric ${metricId}`,
          metric: metricId,
          expected: 'number',
          actual: typeof metric.average
        });
        metricValid = false;
      }

      if (typeof metric.median !== 'number' || isNaN(metric.median)) {
        issues.push({
          type: 'error',
          message: `Invalid median value for metric ${metricId}`,
          metric: metricId,
          expected: 'number',
          actual: typeof metric.median
        });
        metricValid = false;
      }

      if (typeof metric.topQuartile !== 'number' || isNaN(metric.topQuartile)) {
        issues.push({
          type: 'error',
          message: `Invalid top quartile value for metric ${metricId}`,
          metric: metricId,
          expected: 'number',
          actual: typeof metric.topQuartile
        });
        metricValid = false;
      }

      if (typeof metric.bottomQuartile !== 'number' || isNaN(metric.bottomQuartile)) {
        issues.push({
          type: 'error',
          message: `Invalid bottom quartile value for metric ${metricId}`,
          metric: metricId,
          expected: 'number',
          actual: typeof metric.bottomQuartile
        });
        metricValid = false;
      }

      // Check logical consistency
      if (metricValid && metric.median < metric.average && metric.average < metric.topQuartile) {
        // This is unusual but possible
        issues.push({
          type: 'warning',
          message: `Unusual distribution for metric ${metricId}: median (${metric.median}) < average (${metric.average}) < top quartile (${metric.topQuartile})`
        });
      }

      if (metricValid && metric.bottomQuartile > metric.topQuartile) {
        issues.push({
          type: 'error',
          message: `Invalid quartile ranges for metric ${metricId}: bottom quartile (${metric.bottomQuartile}) > top quartile (${metric.topQuartile})`
        });
        metricValid = false;
      }

      if (metricValid && metric.standardDeviation < 0) {
        issues.push({
          type: 'error',
          message: `Invalid standard deviation for metric ${metricId}: cannot be negative`,
          metric: metricId,
          expected: '>= 0',
          actual: metric.standardDeviation
        });
        metricValid = false;
      }

      if (metricValid && metric.sampleSize < 100) {
        issues.push({
          type: 'warning',
          message: `Small sample size for metric ${metricId}: ${metric.sampleSize} (recommended: >= 100)`
        });
      }

      if (metricValid) {
        validMetrics++;
      }
    }

    // Determine overall data quality
    let overallQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
    const validPercentage = (validMetrics / totalMetrics) * 100;

    if (validPercentage >= 95) {
      overallQuality = 'excellent';
    } else if (validPercentage >= 85) {
      overallQuality = 'good';
    } else if (validPercentage >= 70) {
      overallQuality = 'fair';
    } else {
      overallQuality = 'poor';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (issues.some(i => i.type === 'error')) {
      recommendations.push('Fix data quality issues before using benchmarks');
    }
    
    if (issues.some(i => i.type === 'warning')) {
      recommendations.push('Review data quality warnings');
    }

    if (validMetrics < totalMetrics * 0.8) {
      recommendations.push('Consider improving data collection methods');
    }

    return {
      sourceId: update.sourceId,
      isValid: issues.filter(i => i.type === 'error').length === 0,
      issues,
      recommendations,
      summary: {
        totalMetrics,
        validMetrics,
        invalidMetrics: issues.length,
        overallQuality
      }
    };
  }

  /**
   * Add new data source
   */
  async addDataSource(source: Omit<ExternalDataSource, 'id' | 'lastSync' | 'status'>): Promise<string> {
    try {
      const sourceId = this.generateSourceId();
      const newSource: ExternalDataSource = {
        ...source,
        id: sourceId,
        lastSync: new Date(),
        status: 'active'
      };

      this.dataSources.set(sourceId, newSource);

      // Start sync if active
      if (newSource.status === 'active') {
        this.scheduleSync(sourceId);
      }

      await comprehensiveAuditService.logEvent({
        action: 'data_source_added',
        actorId: 'system',
        resourceType: 'EXTERNAL_DATA_SOURCE',
        resourceId: sourceId,
        details: JSON.stringify({
          name: newSource.name,
          type: newSource.type,
          syncFrequency: newSource.syncFrequency
        })
      });

      logger.info(`Added data source: ${newSource.name} (${sourceId})`);
      return sourceId;
    } catch (error) {
      logger.error('Error adding data source:', error);
      throw error;
    }
  }

  /**
   * Update data source
   */
  async updateDataSource(
    sourceId: string,
    updates: Partial<ExternalDataSource>
  ): Promise<void> {
    try {
      const existingSource = this.dataSources.get(sourceId);
      if (!existingSource) {
        throw new Error(`Data source ${sourceId} not found`);
      }

      const updatedSource = { ...existingSource, ...updates };
      this.dataSources.set(sourceId, updatedSource);

      // Reschedule sync if frequency changed
      if (updates.syncFrequency && updatedSource.status === 'active') {
        this.scheduleSync(sourceId);
      }

      await comprehensiveAuditService.logEvent({
        action: 'data_source_updated',
        actorId: 'system',
        resourceType: 'EXTERNAL_DATA_SOURCE',
        resourceId: sourceId,
        details: JSON.stringify(updates)
      });

      logger.info(`Updated data source: ${updatedSource.name} (${sourceId})`);
    } catch (error) {
      logger.error('Error updating data source:', error);
      throw error;
    }
  }

  /**
   * Remove data source
   */
  async removeDataSource(sourceId: string): Promise<void> {
    try {
      const source = this.dataSources.get(sourceId);
      if (!source) {
        throw new Error(`Data source ${sourceId} not found`);
      }

      // Clear sync interval
      const interval = this.syncIntervals.get(sourceId);
      if (interval) {
        clearInterval(interval);
        this.syncIntervals.delete(sourceId);
      }

      this.dataSources.delete(sourceId);

      await comprehensiveAuditService.logEvent({
        action: 'data_source_removed',
        actorId: 'manual',
        resourceType: 'EXTERNAL_DATA_SOURCE',
        resourceId: sourceId,
        details: JSON.stringify({
          name: source.name,
          type: source.type
        })
      });

      logger.info(`Removed data source: ${source.name} (${sourceId})`);
    } catch (error) {
      logger.error('Error removing data source:', error);
      throw error;
    }
  }

  /**
   * Get data source status
   */
  getDataSourceStatus(sourceId: string): ExternalDataSource | null {
    return this.dataSources.get(sourceId) || null;
  }

  /**
   * Get all data sources
   */
  getDataSources(): ExternalDataSource[] {
    return Array.from(this.dataSources.values());
  }

  /**
   * Get sync statistics
   */
  public getSyncStats(): any {
    const sources = Array.from(this.dataSources.values());
    
    return {
      totalSources: sources.length,
      activeSources: sources.filter(s => s.status === 'active').length,
      inactiveSources: sources.filter(s => s.status === 'inactive').length,
      errorSources: sources.filter(s => s.status === 'error').length,
      lastSyncTime: Math.max(...sources.map(s => s.lastSync.getTime())),
      upcomingSyncs: sources
        .filter(s => s.status === 'active')
        .map(s => ({
          sourceId: s.id,
          name: s.name,
          nextSync: new Date(s.lastSync.getTime() + s.syncFrequency * 60 * 60 * 1000)
        }))
    };
  }

  /**
   * Generate unique source ID
   */
  private generateSourceId(): string {
    return `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Graceful shutdown
   */
  public shutdown(): void {
    // Clear all sync intervals
    for (const [sourceId, interval] of this.syncIntervals.entries()) {
      clearInterval(interval);
    }
    this.syncIntervals.clear();
    this.dataSources.clear();
    logger.info('Industry benchmark integration service shut down');
  }
}

export const industryBenchmarkIntegrationService = new IndustryBenchmarkIntegrationService();