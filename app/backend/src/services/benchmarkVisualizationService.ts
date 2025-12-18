/**
 * Benchmark Visualization Service
 * 
 * Provides visualization data and chart configurations for benchmarking
 * performance metrics, comparisons, and trends.
 */

import { logger } from '../utils/logger';
import { performanceBenchmarkService } from './performanceBenchmarkService';
import { BenchmarkData, HistoricalComparison } from './performanceBenchmarkService';

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
    type?: 'line' | 'bar' | 'radar' | 'doughnut' | 'polarArea';
    borderDash?: number[];
  }>;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'radar' | 'doughnut' | 'polarArea' | 'scatter';
  data: ChartData;
  options: {
    responsive: boolean;
    maintainAspectRatio: boolean;
    plugins: {
      title: {
        display: boolean;
        text: string;
        font: {
          size: number;
          weight: string;
        };
      };
      legend: {
        display: boolean;
        position: 'top' | 'bottom' | 'left' | 'right';
      };
      tooltip: {
        enabled: boolean;
        callbacks?: {
          label?: (context: any) => string;
        };
      };
    };
    scales?: {
      x?: {
        display: boolean;
        title: {
          display: boolean;
          text: string;
        };
      };
      y?: {
        display: boolean;
        title: {
          display: boolean;
          text: string;
        };
        beginAtZero?: boolean;
      };
      r?: {
        display: boolean;
        beginAtZero?: boolean;
        max?: number;
        ticks?: {
          stepSize?: number;
        };
      };
    };
  };
}

export interface VisualizationData {
  chartType: string;
  title: string;
  description: string;
  config: ChartConfig;
  insights: string[];
  recommendations: string[];
}

export interface DashboardLayout {
  id: string;
  title: string;
  description: string;
  widgets: Array<{
    id: string;
    type: string;
    title: string;
    size: 'small' | 'medium' | 'large';
    position: { x: number; y: number; w: number; h: number };
    data: any;
  }>;
  lastUpdated: Date;
}

export class BenchmarkVisualizationService {
  private readonly COLOR_PALETTE = {
    primary: '#3b82f6',
    secondary: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#6366f1',
    success: '#22c55e',
    gray: '#6b7280',
    light: '#f3f4f6',
    dark: '#1f2937'
  };

  /**
   * Generate performance comparison chart
   */
  generatePerformanceComparisonChart(benchmarkData: BenchmarkData): VisualizationData {
    const metrics = benchmarkData.metrics;
    const labels = metrics.map(m => m.name);
    const sellerValues = metrics.map(m => m.currentValue);
    const industryValues = metrics.map(m => m.industryAverage);
    const topQuartileValues = metrics.map(m => m.topQuartile);
    const bottomQuartileValues = metrics.map(m => m.bottomQuartile);

    const chartConfig: ChartConfig = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Current Performance',
            data: sellerValues,
            backgroundColor: this.COLOR_PALETTE.primary,
            borderColor: this.COLOR_PALETTE.primary,
            borderWidth: 1
          },
          {
            label: 'Industry Average',
            data: industryValues,
            backgroundColor: this.COLOR_PALETTE.secondary,
            borderColor: this.COLOR_PALETTE.secondary,
            borderWidth: 1
          },
          {
            label: 'Top Quartile',
            data: topQuartileValues,
            backgroundColor: this.COLOR_PALETTE.success,
            borderColor: this.COLOR_PALETTE.success,
            borderWidth: 1
          },
          {
            label: 'Bottom Quartile',
            data: bottomQuartileValues,
            backgroundColor: this.COLOR_PALETTE.danger,
            borderColor: this.COLOR_PALETTE.danger,
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Performance Comparison: Seller vs Industry',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            enabled: true,
            callbacks: {
              label: (context: any) => {
                const metric = metrics[context.dataIndex];
                return `${context.dataset.label}: ${context.parsed.y} ${metric.unit}`;
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Metrics'
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Values'
            },
            beginAtZero: true
          }
        }
      }
    };

    const insights = this.generateComparisonInsights(benchmarkData);
    const recommendations = this.generateComparisonRecommendations(benchmarkData);

    return {
      chartType: 'performance-comparison',
      title: 'Performance Comparison',
      description: 'Compare your performance against industry benchmarks',
      config: chartConfig,
      insights,
      recommendations
    };
  }

  /**
   * Generate radar chart for multi-dimensional performance
   */
  generatePerformanceRadarChart(benchmarkData: BenchmarkData): VisualizationData {
    const metrics = benchmarkData.metrics;
    const labels = metrics.map(m => m.name);
    
    // Normalize values to 0-100 scale for radar chart
    const normalizeValue = (value: number, metric: any) => {
      const range = metric.topQuartile - metric.bottomQuartile;
      if (range === 0) return 50;
      const normalized = ((value - metric.bottomQuartile) / range) * 100;
      return Math.max(0, Math.min(100, normalized));
    };

    const sellerValues = metrics.map(m => normalizeValue(m.currentValue, m));
    const industryValues = metrics.map(m => normalizeValue(m.industryAverage, m));
    const topQuartileValues = metrics.map(m => 100); // Top quartile is 100%
    const bottomQuartileValues = metrics.map(m => 0); // Bottom quartile is 0%

    const chartConfig: ChartConfig = {
      type: 'radar',
      data: {
        labels,
        datasets: [
          {
            label: 'Current Performance',
            data: sellerValues,
            backgroundColor: `${this.COLOR_PALETTE.primary}33`,
            borderColor: this.COLOR_PALETTE.primary,
            borderWidth: 2,
            fill: true,
            tension: 0.1
          },
          {
            label: 'Industry Average',
            data: industryValues,
            backgroundColor: `${this.COLOR_PALETTE.secondary}33`,
            borderColor: this.COLOR_PALETTE.secondary,
            borderWidth: 2,
            fill: true,
            tension: 0.1
          },
          {
            label: 'Top Quartile',
            data: topQuartileValues,
            backgroundColor: `${this.COLOR_PALETTE.success}33`,
            borderColor: this.COLOR_PALETTE.success,
            borderWidth: 2,
            fill: false,
            tension: 0.1
          },
          {
            label: 'Bottom Quartile',
            data: bottomQuartileValues,
            backgroundColor: `${this.COLOR_PALETTE.danger}33`,
            borderColor: this.COLOR_PALETTE.danger,
            borderWidth: 2,
            fill: false,
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Multi-Dimensional Performance Analysis',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            enabled: true,
            callbacks: {
              label: (context: any) => {
                const metric = metrics[context.dataIndex];
                return `${context.dataset.label}: ${context.parsed.r.toFixed(1)}%`;
              }
            }
          }
        },
        scales: {
          r: {
            display: true,
            beginAtZero: true,
            max: 100,
            ticks: {
              stepSize: 20
            }
          }
        }
      }
    };

    const insights = [
      `Overall performance score: ${benchmarkData.overallScore.toFixed(1)}`,
      `Performance grade: ${benchmarkData.performanceGrade}`,
      `Industry percentile: ${benchmarkData.percentile}th`,
      `Rank: ${benchmarkData.industryRank} out of ${benchmarkData.totalSellers} sellers`
    ];

    const recommendations = benchmarkData.recommendations.slice(0, 3).map(r => r.description);

    return {
      chartType: 'performance-radar',
      title: 'Performance Radar',
      description: 'Multi-dimensional view of performance across all metrics',
      config: chartConfig,
      insights,
      recommendations
    };
  }

  /**
   * Generate trend analysis chart
   */
  async generateTrendAnalysisChart(
    sellerId: string,
    metricId: string,
    startDate: Date,
    endDate: Date,
    granularity: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ): Promise<VisualizationData> {
    try {
      const timeSeriesData = await performanceBenchmarkService.getTimeSeriesAnalysis(
        sellerId,
        metricId,
        startDate,
        endDate,
        granularity
      );

      const labels = timeSeriesData.dataPoints.map(dp => dp.period);
      const values = timeSeriesData.dataPoints.map(dp => dp.value);
      const trendline = timeSeriesData.statisticalAnalysis.trendline.map(point => point.y);

      const chartConfig: ChartConfig = {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Actual Performance',
              data: values,
              backgroundColor: `${this.COLOR_PALETTE.primary}33`,
              borderColor: this.COLOR_PALETTE.primary,
              borderWidth: 2,
              fill: true,
              tension: 0.4
            },
            {
              label: 'Trend Line',
              data: trendline,
              backgroundColor: 'transparent',
              borderColor: this.COLOR_PALETTE.warning,
              borderWidth: 2,
              fill: false,
              tension: 0,
              borderDash: [5, 5]
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: `Trend Analysis: ${metricId.replace(/_/g, ' ').toUpperCase()}`,
              font: {
                size: 16,
                weight: 'bold'
              }
            },
            legend: {
              display: true,
              position: 'top'
            },
            tooltip: {
              enabled: true
            }
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: 'Time Period'
              }
            },
            y: {
              display: true,
              title: {
                display: true,
                text: 'Performance Value'
              },
              beginAtZero: false
            }
          }
        }
      };

      const insights = [
        `Trend direction: ${timeSeriesData.trendAnalysis.direction}`,
        `Trend strength: ${(timeSeriesData.trendAnalysis.correlation * 100).toFixed(1)}%`,
        `Average performance: ${timeSeriesData.statisticalAnalysis.mean.toFixed(2)}`,
        `Volatility (std dev): ${timeSeriesData.statisticalAnalysis.standardDeviation.toFixed(2)}`,
        `Seasonality detected: ${timeSeriesData.trendAnalysis.seasonality ? 'Yes' : 'No'}`
      ];

      const recommendations = [
        timeSeriesData.trendAnalysis.direction === 'declining' 
          ? 'Investigate causes of declining performance'
          : 'Continue current practices to maintain positive trend',
        timeSeriesData.trendAnalysis.seasonality 
          ? 'Consider seasonal factors in planning'
          : 'Monitor for emerging patterns',
        `Focus on reducing volatility: ${timeSeriesData.statisticalAnalysis.standardDeviation > timeSeriesData.statisticalAnalysis.mean * 0.2 ? 'High volatility detected' : 'Volatility within acceptable range'}`
      ];

      return {
        chartType: 'trend-analysis',
        title: 'Trend Analysis',
        description: `Historical performance trend for ${metricId.replace(/_/g, ' ')}`,
        config: chartConfig,
        insights,
        recommendations
      };
    } catch (error) {
      logger.error('Error generating trend analysis chart:', error);
      throw error;
    }
  }

  /**
   * Generate performance distribution chart
   */
  generatePerformanceDistributionChart(benchmarkData: BenchmarkData): VisualizationData {
    const metrics = benchmarkData.metrics;
    const categories = ['efficiency', 'quality', 'compliance', 'financial', 'customer_satisfaction'];
    
    const categoryScores = categories.map(category => {
      const categoryMetrics = metrics.filter(m => m.category === category);
      if (categoryMetrics.length === 0) return 0;
      
      const averageScore = categoryMetrics.reduce((sum, metric) => {
        const benchmarkData = metric.industryAverage;
        const range = metric.topQuartile - metric.bottomQuartile;
        if (range === 0) return sum + 50;
        
        const normalized = ((metric.currentValue - metric.bottomQuartile) / range) * 100;
        return sum + Math.max(0, Math.min(100, normalized));
      }, 0) / categoryMetrics.length;
      
      return averageScore;
    });

    const chartConfig: ChartConfig = {
      type: 'doughnut',
      data: {
        labels: categories.map(c => c.charAt(0).toUpperCase() + c.slice(1).replace(/_/g, ' ')),
        datasets: [
          {
            label: 'Performance Score',
            data: categoryScores,
            backgroundColor: [
              this.COLOR_PALETTE.primary,
              this.COLOR_PALETTE.secondary,
              this.COLOR_PALETTE.success,
              this.COLOR_PALETTE.warning,
              this.COLOR_PALETTE.info
            ],
            borderColor: '#ffffff',
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Performance Distribution by Category',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: true,
            position: 'right'
          },
          tooltip: {
            enabled: true,
            callbacks: {
              label: (context: any) => {
                return `${context.label}: ${context.parsed.toFixed(1)}%`;
              }
            }
          }
        }
      }
    };

    const insights = [
      `Strongest category: ${categories[categoryScores.indexOf(Math.max(...categoryScores))].replace(/_/g, ' ')}`,
      `Weakest category: ${categories[categoryScores.indexOf(Math.min(...categoryScores))].replace(/_/g, ' ')}`,
      `Overall balance: ${Math.max(...categoryScores) - Math.min(...categoryScores) > 30 ? 'Unbalanced performance' : 'Balanced performance'}`
    ];

    const recommendations = [
      `Focus on improving ${categories[categoryScores.indexOf(Math.min(...categoryScores))].replace(/_/g, ' ')}`,
      'Maintain strong performance in leading categories',
      'Consider cross-functional improvements to balance overall performance'
    ];

    return {
      chartType: 'performance-distribution',
      title: 'Performance Distribution',
      description: 'Breakdown of performance across different categories',
      config: chartConfig,
      insights,
      recommendations
    };
  }

  /**
   * Generate historical comparison chart
   */
  generateHistoricalComparisonChart(comparisons: HistoricalComparison[]): VisualizationData {
    const labels = comparisons.map(c => c.metricId.replace(/_/g, ' ').toUpperCase());
    const currentValues = comparisons.map(c => c.currentPeriod.value);
    const previousValues = comparisons.map(c => c.previousPeriod.value);
    const changes = comparisons.map(c => c.changePercentage);

    const chartConfig: ChartConfig = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Current Period',
            data: currentValues,
            backgroundColor: this.COLOR_PALETTE.primary,
            borderColor: this.COLOR_PALETTE.primary,
            borderWidth: 1
          },
          {
            label: 'Previous Period',
            data: previousValues,
            backgroundColor: this.COLOR_PALETTE.secondary,
            borderColor: this.COLOR_PALETTE.secondary,
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Period-over-Period Comparison',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            enabled: true,
            callbacks: {
              label: (context: any) => {
                const comparison = comparisons[context.dataIndex];
                const changeText = comparison.changePercentage > 0 
                  ? `+${comparison.changePercentage.toFixed(1)}%` 
                  : `${comparison.changePercentage.toFixed(1)}%`;
                return `${context.dataset.label}: ${context.parsed.y} (${changeText})`;
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Metrics'
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Values'
            },
            beginAtZero: true
          }
        }
      }
    };

    const insights = [
      `Improved metrics: ${comparisons.filter(c => c.trend === 'improving').length}`,
      `Declined metrics: ${comparisons.filter(c => c.trend === 'declining').length}`,
      `Stable metrics: ${comparisons.filter(c => c.trend === 'stable').length}`,
      `Significant changes: ${comparisons.filter(c => c.significance === 'significant').length}`
    ];

    const recommendations = [
      'Focus on metrics with significant declines',
      'Analyze drivers of improvement in growing metrics',
      'Monitor stable metrics for early warning signs'
    ];

    return {
      chartType: 'historical-comparison',
      title: 'Historical Comparison',
      description: 'Compare performance between current and previous periods',
      config: chartConfig,
      insights,
      recommendations
    };
  }

  /**
   * Generate comprehensive dashboard layout
   */
  async generateBenchmarkDashboard(
    sellerId: string,
    sellerName: string,
    period: { startDate: Date; endDate: Date }
  ): Promise<DashboardLayout> {
    try {
      // Generate benchmark data
      const benchmarkData = await performanceBenchmarkService.generateBenchmarkData(
        sellerId,
        sellerName,
        period.startDate,
        period.endDate
      );

      // Generate visualizations
      const performanceComparison = this.generatePerformanceComparisonChart(benchmarkData);
      const performanceRadar = this.generatePerformanceRadarChart(benchmarkData);
      const performanceDistribution = this.generatePerformanceDistributionChart(benchmarkData);

      // Generate trend analysis for key metrics
      const keyMetrics = ['processing_time', 'approval_rate', 'customer_satisfaction'];
      const trendCharts = await Promise.all(
        keyMetrics.map(metricId => 
          this.generateTrendAnalysisChart(sellerId, metricId, period.startDate, period.endDate)
        )
      );

      const dashboard: DashboardLayout = {
        id: `benchmark-dashboard-${sellerId}-${Date.now()}`,
        title: `${sellerName} - Performance Benchmark Dashboard`,
        description: `Comprehensive performance analysis for ${period.startDate.toLocaleDateString()} to ${period.endDate.toLocaleDateString()}`,
        widgets: [
          {
            id: 'performance-comparison',
            type: 'chart',
            title: 'Performance Comparison',
            size: 'large',
            position: { x: 0, y: 0, w: 8, h: 4 },
            data: performanceComparison
          },
          {
            id: 'performance-radar',
            type: 'chart',
            title: 'Performance Radar',
            size: 'medium',
            position: { x: 8, y: 0, w: 4, h: 4 },
            data: performanceRadar
          },
          {
            id: 'performance-distribution',
            type: 'chart',
            title: 'Performance Distribution',
            size: 'medium',
            position: { x: 0, y: 4, w: 4, h: 4 },
            data: performanceDistribution
          },
          {
            id: 'overall-score',
            type: 'metric',
            title: 'Overall Performance Score',
            size: 'small',
            position: { x: 4, y: 4, w: 2, h: 2 },
            data: {
              value: benchmarkData.overallScore,
              grade: benchmarkData.performanceGrade,
              percentile: benchmarkData.percentile,
              rank: benchmarkData.industryRank,
              total: benchmarkData.totalSellers
            }
          },
          {
            id: 'key-metrics',
            type: 'table',
            title: 'Key Performance Metrics',
            size: 'small',
            position: { x: 6, y: 4, w: 2, h: 2 },
            data: benchmarkData.metrics.slice(0, 4).map(m => ({
              name: m.name,
              value: `${m.currentValue} ${m.unit}`,
              trend: m.trend,
              benchmark: `${m.industryAverage} ${m.unit}`
            }))
          },
          ...trendCharts.map((chart, index) => ({
            id: `trend-${keyMetrics[index]}`,
            type: 'chart',
            title: `Trend: ${keyMetrics[index].replace(/_/g, ' ').toUpperCase()}`,
            size: 'medium' as 'small' | 'medium' | 'large',
            position: { x: (index % 2) * 6, y: 6 + Math.floor(index / 2) * 3, w: 6, h: 3 },
            data: chart
          }))
        ],
        lastUpdated: new Date()
      };

      return dashboard;
    } catch (error) {
      logger.error('Error generating benchmark dashboard:', error);
      throw error;
    }
  }

  /**
   * Generate comparison insights
   */
  private generateComparisonInsights(benchmarkData: BenchmarkData): string[] {
    const insights: string[] = [];
    const metrics = benchmarkData.metrics;

    // Overall performance insights
    insights.push(`Overall performance score: ${benchmarkData.overallScore.toFixed(1)}/100`);
    insights.push(`Industry ranking: ${benchmarkData.industryRank} out of ${benchmarkData.totalSellers} sellers`);
    insights.push(`Performance grade: ${benchmarkData.performanceGrade}`);

    // Strengths and weaknesses
    if (benchmarkData.strengths.length > 0) {
      insights.push(`Key strengths: ${benchmarkData.strengths.slice(0, 3).join(', ')}`);
    }

    if (benchmarkData.improvementAreas.length > 0) {
      insights.push(`Areas for improvement: ${benchmarkData.improvementAreas.slice(0, 3).join(', ')}`);
    }

    // Metric-specific insights
    const topPerformers = metrics
      .filter(m => m.currentValue >= m.topQuartile)
      .map(m => m.name);
    
    if (topPerformers.length > 0) {
      insights.push(`Top quartile performance: ${topPerformers.join(', ')}`);
    }

    const bottomPerformers = metrics
      .filter(m => m.currentValue <= m.bottomQuartile)
      .map(m => m.name);
    
    if (bottomPerformers.length > 0) {
      insights.push(`Below bottom quartile: ${bottomPerformers.join(', ')}`);
    }

    return insights;
  }

  /**
   * Generate comparison recommendations
   */
  private generateComparisonRecommendations(benchmarkData: BenchmarkData): string[] {
    return benchmarkData.recommendations
      .slice(0, 5)
      .map(r => r.description);
  }

  /**
   * Export visualization data for external tools
   */
  exportVisualizationData(visualization: VisualizationData, format: 'json' | 'csv' | 'excel'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(visualization, null, 2);
      
      case 'csv':
        return this.convertToCSV(visualization);
      
      case 'excel':
        // This would typically use a library like xlsx
        return JSON.stringify(visualization, null, 2); // Placeholder
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Convert visualization data to CSV format
   */
  private convertToCSV(visualization: VisualizationData): string {
    if (visualization.config.data.datasets.length === 0) {
      return '';
    }

    const labels = visualization.config.data.labels;
    const datasets = visualization.config.data.datasets;
    
    let csv = 'Period,' + datasets.map(d => d.label).join(',') + '\n';
    
    for (let i = 0; i < labels.length; i++) {
      const row = [labels[i]];
      for (const dataset of datasets) {
        row.push(dataset.data[i]?.toString() || '');
      }
      csv += row.join(',') + '\n';
    }
    
    return csv;
  }

  /**
   * Get available chart types and their descriptions
   */
  getAvailableChartTypes(): Array<{
    type: string;
    name: string;
    description: string;
    bestFor: string[];
  }> {
    return [
      {
        type: 'performance-comparison',
        name: 'Performance Comparison',
        description: 'Compare performance against industry benchmarks',
        bestFor: ['Benchmarking', 'Performance analysis', 'Industry comparison']
      },
      {
        type: 'performance-radar',
        name: 'Performance Radar',
        description: 'Multi-dimensional performance visualization',
        bestFor: ['Overall assessment', 'Strength/weakness analysis', 'Balanced scorecard']
      },
      {
        type: 'trend-analysis',
        name: 'Trend Analysis',
        description: 'Historical performance trends and patterns',
        bestFor: ['Time-series analysis', 'Trend identification', 'Performance tracking']
      },
      {
        type: 'performance-distribution',
        name: 'Performance Distribution',
        description: 'Performance breakdown by category',
        bestFor: ['Category analysis', 'Resource allocation', 'Strategic planning']
      },
      {
        type: 'historical-comparison',
        name: 'Historical Comparison',
        description: 'Period-over-period performance comparison',
        bestFor: ['Progress tracking', 'Impact measurement', 'Goal assessment']
      }
    ];
  }
}

export const benchmarkVisualizationService = new BenchmarkVisualizationService();