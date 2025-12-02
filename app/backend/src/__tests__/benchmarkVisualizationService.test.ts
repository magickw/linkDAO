import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { benchmarkVisualizationService } from '../benchmarkVisualizationService';
import { performanceBenchmarkService } from '../performanceBenchmarkService';
import { BenchmarkData } from '../performanceBenchmarkService';

/**
 * Unit tests for Benchmark Visualization Service
 * 
 * Tests visualization generation, chart configurations, and dashboard layouts
 */

// Mock the performanceBenchmarkService
jest.mock('../performanceBenchmarkService');
const mockPerformanceBenchmarkService = performanceBenchmarkService as jest.Mocked<typeof performanceBenchmarkService>;

describe('BenchmarkVisualizationService', () => {
  const mockBenchmarkData: BenchmarkData = {
    sellerId: 'test-seller-1',
    sellerName: 'Test Seller',
    period: {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    },
    metrics: [
      {
        id: 'processing_time',
        name: 'Average Processing Time',
        description: 'Average time to process returns',
        category: 'efficiency',
        unit: 'hours',
        currentValue: 45.5,
        targetValue: 48,
        industryAverage: 48,
        topQuartile: 24,
        bottomQuartile: 72,
        lastUpdated: new Date(),
        trend: 'improving',
        trendPercentage: 5.2
      },
      {
        id: 'approval_rate',
        name: 'Return Approval Rate',
        description: 'Percentage of returns approved',
        category: 'compliance',
        unit: '%',
        currentValue: 88.2,
        targetValue: 85,
        industryAverage: 85,
        topQuartile: 95,
        bottomQuartile: 75,
        lastUpdated: new Date(),
        trend: 'stable',
        trendPercentage: 0.5
      },
      {
        id: 'customer_satisfaction',
        name: 'Customer Satisfaction Score',
        description: 'Average customer satisfaction rating',
        category: 'customer_satisfaction',
        unit: 'points',
        currentValue: 4.3,
        targetValue: 4.2,
        industryAverage: 4.2,
        topQuartile: 4.7,
        bottomQuartile: 3.8,
        lastUpdated: new Date(),
        trend: 'improving',
        trendPercentage: 3.1
      }
    ],
    overallScore: 82.5,
    industryRank: 125,
    totalSellers: 1250,
    percentile: 85,
    performanceGrade: 'B',
    improvementAreas: ['Processing time efficiency'],
    strengths: ['High approval rate', 'Good customer satisfaction'],
    recommendations: [
      {
        metricId: 'processing_time',
        metricName: 'Average Processing Time',
        priority: 'high',
        category: 'improvement',
        description: 'Reduce processing time to meet industry standards',
        impact: 'high',
        effort: 'medium',
        timeframe: '3-6 months',
        expectedImprovement: 21.5,
        steps: ['Analyze workflow', 'Implement automation'],
        resources: ['Process automation tools', 'Staff training']
      }
    ],
    lastCalculated: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generatePerformanceComparisonChart', () => {
    it('should generate performance comparison chart with correct structure', () => {
      const result = benchmarkVisualizationService.generatePerformanceComparisonChart(mockBenchmarkData);

      expect(result).toBeDefined();
      expect(result.chartType).toBe('performance-comparison');
      expect(result.title).toBe('Performance Comparison');
      expect(result.config).toBeDefined();
      expect(result.config.type).toBe('bar');
      expect(result.config.data).toBeDefined();
      expect(result.config.data.labels).toBeDefined();
      expect(result.config.data.datasets).toBeDefined();
      expect(result.config.data.datasets.length).toBe(4); // Current, Industry, Top, Bottom
      expect(result.insights).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should include correct dataset labels and colors', () => {
      const result = benchmarkVisualizationService.generatePerformanceComparisonChart(mockBenchmarkData);

      const datasets = result.config.data.datasets;
      const labels = datasets.map(d => d.label);
      
      expect(labels).toContain('Current Performance');
      expect(labels).toContain('Industry Average');
      expect(labels).toContain('Top Quartile');
      expect(labels).toContain('Bottom Quartile');

      // Check color assignments
      expect(datasets[0].backgroundColor).toBe('#3b82f6'); // Primary for current
      expect(datasets[1].backgroundColor).toBe('#10b981'); // Secondary for industry
    });

    it('should generate meaningful insights', () => {
      const result = benchmarkVisualizationService.generatePerformanceComparisonChart(mockBenchmarkData);

      expect(result.insights).toBeDefined();
      expect(Array.isArray(result.insights)).toBe(true);
      expect(result.insights.length).toBeGreaterThan(0);

      // Check for key insight patterns
      const insightsText = result.insights.join(' ');
      expect(insightsText).toContain('overall performance score');
      expect(insightsText).toContain('ranking');
    });
  });

  describe('generatePerformanceRadarChart', () => {
    it('should generate radar chart with normalized values', () => {
      const result = benchmarkVisualizationService.generatePerformanceRadarChart(mockBenchmarkData);

      expect(result).toBeDefined();
      expect(result.config.type).toBe('radar');
      expect(result.config.data.datasets.length).toBe(4);
      
      // Check that values are normalized to 0-100 scale
      const datasets = result.config.data.datasets;
      datasets.forEach(dataset => {
        dataset.data.forEach((value: number) => {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(100);
        });
      });
    });

    it('should handle top and bottom quartile normalization correctly', () => {
      const result = benchmarkVisualizationService.generatePerformanceRadarChart(mockBenchmarkData);

      const datasets = result.config.data.datasets;
      const topQuartileDataset = datasets.find(d => d.label === 'Top Quartile');
      const bottomQuartileDataset = datasets.find(d => d.label === 'Bottom Quartile');

      expect(topQuartileDataset).toBeDefined();
      expect(bottomQuartileDataset).toBeDefined();

      // Top quartile should be 100%, bottom quartile should be 0%
      topQuartileDataset!.data.forEach((value: number) => {
        expect(value).toBe(100);
      });

      bottomQuartileDataset!.data.forEach((value: number) => {
        expect(value).toBe(0);
      });
    });
  });

  describe('generateTrendAnalysisChart', () => {
    it('should generate trend analysis chart with time-series data', async () => {
      const mockTimeSeriesData = {
        dataPoints: [
          { date: new Date('2024-01-01'), value: 45, period: 'Week 1' },
          { date: new Date('2024-01-08'), value: 43, period: 'Week 2' },
          { date: new Date('2024-01-15'), value: 42, period: 'Week 3' },
          { date: new Date('2024-01-22'), value: 40, period: 'Week 4' }
        ],
        trendAnalysis: {
          direction: 'improving' as const,
          strength: 0.85,
          correlation: 0.92,
          seasonality: false
        },
        statisticalAnalysis: {
          mean: 42.5,
          median: 42.5,
          standardDeviation: 2.1,
          min: 40,
          max: 45,
          variance: 4.4,
          trendline: [
            { x: 0, y: 45 },
            { x: 1, y: 43.5 },
            { x: 2, y: 42 },
            { x: 3, y: 40.5 }
          ]
        },
        performanceInsights: {
          bestPeriod: { date: new Date('2024-01-22'), value: 40 },
          worstPeriod: { date: new Date('2024-01-01'), value: 45 },
          mostImprovedPeriod: { 
            startDate: new Date('2024-01-01'), 
            endDate: new Date('2024-01-08'), 
            improvement: 2 
          },
          biggestDeclinePeriod: { 
            startDate: new Date('2024-01-15'), 
            endDate: new Date('2024-01-22'), 
            decline: -2 
          },
          anomalies: []
        }
      };

      mockPerformanceBenchmarkService.getTimeSeriesAnalysis.mockResolvedValue(mockTimeSeriesData);

      const result = await benchmarkVisualizationService.generateTrendAnalysisChart(
        'test-seller-1',
        'processing_time',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        'weekly'
      );

      expect(result).toBeDefined();
      expect(result.config.type).toBe('line');
      expect(result.config.data.datasets.length).toBe(2); // Actual and trendline
      expect(result.insights).toBeDefined();
      expect(result.recommendations).toBeDefined();

      // Verify trendline dataset
      const trendlineDataset = result.config.data.datasets.find(d => d.label === 'Trend Line');
      expect(trendlineDataset).toBeDefined();
      expect(trendlineDataset!.borderDash).toEqual([5, 5]); // Dashed line for trendline
    });

    it('should handle time-series analysis errors gracefully', async () => {
      mockPerformanceBenchmarkService.getTimeSeriesAnalysis.mockRejectedValue(
        new Error('Time-series analysis failed')
      );

      await expect(
        benchmarkVisualizationService.generateTrendAnalysisChart(
          'test-seller-1',
          'processing_time',
          new Date('2024-01-01'),
          new Date('2024-01-31')
        )
      ).rejects.toThrow('Time-series analysis failed');
    });
  });

  describe('generatePerformanceDistributionChart', () => {
    it('should generate doughnut chart for performance distribution', () => {
      const result = benchmarkVisualizationService.generatePerformanceDistributionChart(mockBenchmarkData);

      expect(result).toBeDefined();
      expect(result.config.type).toBe('doughnut');
      expect(result.config.data.labels).toBeDefined();
      expect(result.config.data.datasets.length).toBe(1);
      expect(result.config.data.datasets[0].data.length).toBe(5); // 5 categories
    });

    it('should calculate category scores correctly', () => {
      const result = benchmarkVisualizationService.generatePerformanceDistributionChart(mockBenchmarkData);

      const dataset = result.config.data.datasets[0];
      const data = dataset.data as number[];

      // All values should be between 0 and 100
      data.forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      });

      // Should have data for all categories
      expect(data.length).toBe(5);
    });

    it('should generate distribution insights', () => {
      const result = benchmarkVisualizationService.generatePerformanceDistributionChart(mockBenchmarkData);

      expect(result.insights).toBeDefined();
      expect(Array.isArray(result.insights)).toBe(true);
      
      const insightsText = result.insights.join(' ');
      expect(insightsText).toContain('Strongest category');
      expect(insightsText).toContain('Weakest category');
    });
  });

  describe('generateHistoricalComparisonChart', () => {
    it('should generate historical comparison chart', () => {
      const mockComparisons = [
        {
          sellerId: 'test-seller-1',
          metricId: 'processing_time',
          currentPeriod: { 
            startDate: new Date('2024-01-01'), 
            endDate: new Date('2024-01-31'), 
            value: 45 
          },
          previousPeriod: { 
            startDate: new Date('2023-12-01'), 
            endDate: new Date('2023-12-31'), 
            value: 50 
          },
          change: -5,
          changePercentage: -10,
          trend: 'improving' as const,
          significance: 'significant' as const,
          confidence: 0.85
        },
        {
          sellerId: 'test-seller-1',
          metricId: 'approval_rate',
          currentPeriod: { 
            startDate: new Date('2024-01-01'), 
            endDate: new Date('2024-01-31'), 
            value: 88 
          },
          previousPeriod: { 
            startDate: new Date('2023-12-01'), 
            endDate: new Date('2023-12-31'), 
            value: 85 
          },
          change: 3,
          changePercentage: 3.5,
          trend: 'improving' as const,
          significance: 'minor' as const,
          confidence: 0.75
        }
      ];

      const result = benchmarkVisualizationService.generateHistoricalComparisonChart(mockComparisons);

      expect(result).toBeDefined();
      expect(result.config.type).toBe('bar');
      expect(result.config.data.datasets.length).toBe(2); // Current and Previous
      expect(result.config.data.labels.length).toBe(2); // Two metrics
    });

    it('should generate correct tooltip callbacks', () => {
      const mockComparisons = [
        {
          sellerId: 'test-seller-1',
          metricId: 'processing_time',
          currentPeriod: { 
            startDate: new Date('2024-01-01'), 
            endDate: new Date('2024-01-31'), 
            value: 45 
          },
          previousPeriod: { 
            startDate: new Date('2023-12-01'), 
            endDate: new Date('2023-12-31'), 
            value: 50 
          },
          change: -5,
          changePercentage: -10,
          trend: 'improving' as const,
          significance: 'significant' as const,
          confidence: 0.85
        }
      ];

      const result = benchmarkVisualizationService.generateHistoricalComparisonChart(mockComparisons);

      const tooltipCallback = result.config.options.plugins.tooltip?.callbacks?.label;
      expect(tooltipCallback).toBeDefined();

      // Test the callback function
      const mockContext = {
        dataset: { label: 'Current Period' },
        dataIndex: 0,
        parsed: { y: 45 }
      };

      const label = tooltipCallback!(mockContext);
      expect(label).toContain('45');
      expect(label).toContain('-10.0%');
    });
  });

  describe('generateBenchmarkDashboard', () => {
    it('should generate comprehensive dashboard layout', async () => {
      mockPerformanceBenchmarkService.generateBenchmarkData.mockResolvedValue(mockBenchmarkData);
      mockPerformanceBenchmarkService.getTimeSeriesAnalysis.mockResolvedValue({
        dataPoints: [
          { date: new Date('2024-01-01'), value: 45, period: 'Week 1' },
          { date: new Date('2024-01-08'), value: 43, period: 'Week 2' }
        ],
        trendAnalysis: {
          direction: 'improving' as const,
          strength: 0.8,
          correlation: 0.9,
          seasonality: false
        },
        statisticalAnalysis: {
          mean: 44,
          median: 44,
          standardDeviation: 1.4,
          min: 43,
          max: 45,
          variance: 2,
          trendline: []
        },
        performanceInsights: {
          bestPeriod: { date: new Date('2024-01-08'), value: 43 },
          worstPeriod: { date: new Date('2024-01-01'), value: 45 },
          mostImprovedPeriod: { 
            startDate: new Date('2024-01-01'), 
            endDate: new Date('2024-01-08'), 
            improvement: 2 
          },
          biggestDeclinePeriod: { 
            startDate: new Date('2024-01-01'), 
            endDate: new Date('2024-01-08'), 
            decline: 0 
          },
          anomalies: []
        }
      });

      const result = await benchmarkVisualizationService.generateBenchmarkDashboard(
        'test-seller-1',
        'Test Seller',
        {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        }
      );

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toContain('Test Seller');
      expect(result.widgets).toBeDefined();
      expect(result.widgets.length).toBeGreaterThan(0);

      // Check for required widget types
      const widgetTypes = result.widgets.map(w => w.type);
      expect(widgetTypes).toContain('chart');
      expect(widgetTypes).toContain('metric');
      expect(widgetTypes).toContain('table');

      // Check widget structure
      result.widgets.forEach(widget => {
        expect(widget.id).toBeDefined();
        expect(widget.title).toBeDefined();
        expect(widget.size).toMatch(/^(small|medium|large)$/);
        expect(widget.position).toBeDefined();
        expect(widget.data).toBeDefined();
      });
    });

    it('should handle dashboard generation errors', async () => {
      mockPerformanceBenchmarkService.generateBenchmarkData.mockRejectedValue(
        new Error('Benchmark data generation failed')
      );

      await expect(
        benchmarkVisualizationService.generateBenchmarkDashboard(
          'test-seller-1',
          'Test Seller',
          {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-31')
          }
        )
      ).rejects.toThrow('Benchmark data generation failed');
    });
  });

  describe('exportVisualizationData', () => {
    it('should export data as JSON', () => {
      const mockVisualization = {
        chartType: 'test-chart',
        title: 'Test Chart',
        description: 'Test Description',
        config: {
          type: 'bar' as const,
          data: {
            labels: ['A', 'B', 'C'],
            datasets: [{
              label: 'Test Data',
              data: [1, 2, 3]
            }]
          },
          options: {}
        },
        insights: ['Test insight'],
        recommendations: ['Test recommendation']
      };

      const result = benchmarkVisualizationService.exportVisualizationData(mockVisualization, 'json');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      
      const parsed = JSON.parse(result);
      expect(parsed.chartType).toBe('test-chart');
      expect(parsed.title).toBe('Test Chart');
    });

    it('should export data as CSV', () => {
      const mockVisualization = {
        chartType: 'test-chart',
        title: 'Test Chart',
        description: 'Test Description',
        config: {
          type: 'bar' as const,
          data: {
            labels: ['A', 'B', 'C'],
            datasets: [{
              label: 'Test Data',
              data: [1, 2, 3]
            }]
          },
          options: {}
        },
        insights: ['Test insight'],
        recommendations: ['Test recommendation']
      };

      const result = benchmarkVisualizationService.exportVisualizationData(mockVisualization, 'csv');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('Period,Test Data');
      expect(result).toContain('A,1');
      expect(result).toContain('B,2');
      expect(result).toContain('C,3');
    });

    it('should handle unsupported export formats', () => {
      const mockVisualization = {
        chartType: 'test-chart',
        title: 'Test Chart',
        description: 'Test Description',
        config: {
          type: 'bar' as const,
          data: { labels: [], datasets: [] },
          options: {}
        },
        insights: [],
        recommendations: []
      };

      expect(() => {
        benchmarkVisualizationService.exportVisualizationData(mockVisualization, 'xml' as any);
      }).toThrow('Unsupported export format: xml');
    });
  });

  describe('getAvailableChartTypes', () => {
    it('should return available chart types with descriptions', () => {
      const result = benchmarkVisualizationService.getAvailableChartTypes();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      result.forEach(chartType => {
        expect(chartType.type).toBeDefined();
        expect(chartType.name).toBeDefined();
        expect(chartType.description).toBeDefined();
        expect(chartType.bestFor).toBeDefined();
        expect(Array.isArray(chartType.bestFor)).toBe(true);
      });
    });

    it('should include all required chart types', () => {
      const result = benchmarkVisualizationService.getAvailableChartTypes();
      const chartTypes = result.map(c => c.type);

      expect(chartTypes).toContain('performance-comparison');
      expect(chartTypes).toContain('performance-radar');
      expect(chartTypes).toContain('trend-analysis');
      expect(chartTypes).toContain('performance-distribution');
      expect(chartTypes).toContain('historical-comparison');
    });
  });

  describe('Chart Configuration Validation', () => {
    it('should generate valid chart configurations', () => {
      const result = benchmarkVisualizationService.generatePerformanceComparisonChart(mockBenchmarkData);

      // Validate Chart.js structure
      expect(result.config.type).toBeDefined();
      expect(result.config.data).toBeDefined();
      expect(result.config.options).toBeDefined();
      expect(result.config.options.responsive).toBe(true);
      expect(result.config.options.maintainAspectRatio).toBe(false);
      expect(result.config.options.plugins).toBeDefined();
      expect(result.config.options.plugins.title).toBeDefined();
    });

    it('should handle edge cases in data normalization', () => {
      // Test with zero range metrics
      const edgeCaseBenchmarkData: BenchmarkData = {
        ...mockBenchmarkData,
        metrics: [
          {
            ...mockBenchmarkData.metrics[0],
            currentValue: 50,
            industryAverage: 50,
            topQuartile: 50,
            bottomQuartile: 50
          }
        ]
      };

      const result = benchmarkVisualizationService.generatePerformanceRadarChart(edgeCaseBenchmarkData);

      // Should handle zero range gracefully
      const datasets = result.config.data.datasets;
      datasets.forEach(dataset => {
        dataset.data.forEach((value: number) => {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(100);
        });
      });
    });
  });

  describe('Property Validations', () => {
    it('should ensure visualizations are clear and understandable', () => {
      const result = benchmarkVisualizationService.generatePerformanceComparisonChart(mockBenchmarkData);

      // Check chart clarity
      expect(result.title).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);

      // Check data clarity
      expect(result.config.data.labels.length).toBeGreaterThan(0);
      expect(result.config.data.datasets.length).toBeGreaterThan(0);
      
      result.config.data.datasets.forEach(dataset => {
        expect(dataset.label).toBeDefined();
        expect(dataset.data.length).toBe(result.config.data.labels.length);
      });
    });

    it('should provide meaningful insights in all visualizations', () => {
      const visualizations = [
        benchmarkVisualizationService.generatePerformanceComparisonChart(mockBenchmarkData),
        benchmarkVisualizationService.generatePerformanceRadarChart(mockBenchmarkData),
        benchmarkVisualizationService.generatePerformanceDistributionChart(mockBenchmarkData)
      ];

      visualizations.forEach(viz => {
        expect(viz.insights).toBeDefined();
        expect(Array.isArray(viz.insights)).toBe(true);
        expect(viz.insights.length).toBeGreaterThan(0);
        
        // Insights should be meaningful
        viz.insights.forEach(insight => {
          expect(typeof insight).toBe('string');
          expect(insight.length).toBeGreaterThan(0);
        });
      });
    });
  });
});