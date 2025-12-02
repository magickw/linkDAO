/**
 * Live Compliance Dashboard Service
 * 
 * Provides real-time dashboard updates for compliance monitoring,
 * including live metrics, charts, and alert feeds.
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { realTimeComplianceMonitoringService } from './realTimeComplianceMonitoringService';
import { realTimeComplianceAlertService } from './realTimeComplianceAlertService';
import { sellerReturnPerformanceService } from './sellerReturnPerformanceService';

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'alert_feed' | 'leaderboard' | 'trend';
  title: string;
  position: { x: number; y: number; width: number; height: number };
  config: any;
  data: any;
  lastUpdated: Date;
  refreshInterval: number; // seconds
}

export interface LiveMetrics {
  timestamp: Date;
  totalSellers: number;
  activeSellers: number;
  averageComplianceScore: number;
  criticalViolations: number;
  highViolations: number;
  mediumViolations: number;
  lowViolations: number;
  pendingAlerts: number;
  acknowledgedAlerts: number;
  resolvedToday: number;
  processingTimeCompliance: number;
  approvalRateCompliance: number;
}

export interface ChartDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
  metadata?: any;
}

export interface ComplianceTrend {
  sellerId: string;
  sellerName: string;
  trend: 'improving' | 'declining' | 'stable';
  scoreChange: number;
  period: '7d' | '30d' | '90d';
  confidence: number;
}

export class LiveComplianceDashboardService extends EventEmitter {
  private dashboardWidgets: Map<string, DashboardWidget> = new Map();
  private metricsHistory: LiveMetrics[] = [];
  private chartData: Map<string, ChartDataPoint[]> = new Map();
  private subscriberCount: number = 0;
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly UPDATE_INTERVAL = 30000; // 30 seconds
  private readonly MAX_HISTORY_POINTS = 100;

  constructor() {
    super();
    this.initializeDefaultWidgets();
    this.setupEventListeners();
    this.startLiveUpdates();
  }

  /**
   * Initialize default dashboard widgets
   */
  private initializeDefaultWidgets(): void {
    const defaultWidgets: DashboardWidget[] = [
      {
        id: 'overview_metrics',
        type: 'metric',
        title: 'Compliance Overview',
        position: { x: 0, y: 0, width: 4, height: 2 },
        config: {
          metrics: [
            { key: 'totalSellers', label: 'Total Sellers', format: 'number' },
            { key: 'averageComplianceScore', label: 'Avg Compliance Score', format: 'percentage' },
            { key: 'criticalViolations', label: 'Critical Violations', format: 'number', color: 'red' },
            { key: 'pendingAlerts', label: 'Pending Alerts', format: 'number', color: 'orange' }
          ]
        },
        data: {},
        lastUpdated: new Date(),
        refreshInterval: 30
      },
      {
        id: 'compliance_trend',
        type: 'chart',
        title: 'Compliance Score Trend',
        position: { x: 4, y: 0, width: 8, height: 4 },
        config: {
          chartType: 'line',
          timeRange: '24h',
          yAxis: { min: 0, max: 100 },
          series: [
            { key: 'averageComplianceScore', label: 'Platform Average', color: '#3b82f6' },
            { key: 'processingTimeCompliance', label: 'Processing Time', color: '#10b981' },
            { key: 'approvalRateCompliance', label: 'Approval Rate', color: '#f59e0b' }
          ]
        },
        data: {},
        lastUpdated: new Date(),
        refreshInterval: 60
      },
      {
        id: 'violation_breakdown',
        type: 'chart',
        title: 'Violation Breakdown',
        position: { x: 0, y: 2, width: 4, height: 4 },
        config: {
          chartType: 'donut',
          series: [
            { key: 'criticalViolations', label: 'Critical', color: '#ef4444' },
            { key: 'highViolations', label: 'High', color: '#f97316' },
            { key: 'mediumViolations', label: 'Medium', color: '#eab308' },
            { key: 'lowViolations', label: 'Low', color: '#22c55e' }
          ]
        },
        data: {},
        lastUpdated: new Date(),
        refreshInterval: 60
      },
      {
        id: 'alert_feed',
        type: 'alert_feed',
        title: 'Recent Alerts',
        position: { x: 8, y: 4, width: 4, height: 6 },
        config: {
          maxItems: 10,
          showSeverity: true,
          showTimestamp: true,
          autoRefresh: true
        },
        data: [],
        lastUpdated: new Date(),
        refreshInterval: 15
      },
      {
        id: 'seller_leaderboard',
        type: 'leaderboard',
        title: 'Top Performing Sellers',
        position: { x: 0, y: 6, width: 6, height: 4 },
        config: {
          sortBy: 'complianceScore',
          order: 'desc',
          maxItems: 10,
          showTrend: true
        },
        data: [],
        lastUpdated: new Date(),
        refreshInterval: 120
      },
      {
        id: 'compliance_trends',
        type: 'trend',
        title: 'Seller Compliance Trends',
        position: { x: 6, y: 6, width: 6, height: 4 },
        config: {
          periods: ['7d', '30d'],
          showImproving: true,
          showDeclining: true,
          showStable: true
        },
        data: [],
        lastUpdated: new Date(),
        refreshInterval: 300
      }
    ];

    defaultWidgets.forEach(widget => {
      this.dashboardWidgets.set(widget.id, widget);
    });

    logger.info(`Initialized ${defaultWidgets.length} default dashboard widgets`);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen to real-time monitoring events
    realTimeComplianceMonitoringService.on('violation_detected', (alert) => {
      this.handleRealTimeViolation(alert);
    });

    // Listen to alert service events
    realTimeComplianceAlertService.on('alert_processed', (alert) => {
      this.handleNewAlert(alert);
    });

    realTimeComplianceAlertService.on('alert_acknowledged', (alert) => {
      this.handleAlertAcknowledged(alert);
    });

    realTimeComplianceAlertService.on('alert_resolved', (alert) => {
      this.handleAlertResolved(alert);
    });
  }

  /**
   * Start live updates
   */
  private startLiveUpdates(): void {
    this.updateInterval = setInterval(async () => {
      await this.updateDashboardData();
    }, this.UPDATE_INTERVAL);

    logger.info('Live compliance dashboard updates started');
  }

  /**
   * Update dashboard data
   */
  private async updateDashboardData(): Promise<void> {
    try {
      // Update live metrics
      const metrics = await this.calculateLiveMetrics();
      this.metricsHistory.push(metrics);
      
      // Keep history within limits
      if (this.metricsHistory.length > this.MAX_HISTORY_POINTS) {
        this.metricsHistory = this.metricsHistory.slice(-this.MAX_HISTORY_POINTS);
      }

      // Update chart data
      this.updateChartData(metrics);

      // Update widgets
      await this.updateWidgets(metrics);

      // Emit update event
      this.emit('dashboard_updated', {
        timestamp: new Date(),
        metrics,
        widgets: Array.from(this.dashboardWidgets.values())
      });

    } catch (error) {
      logger.error('Error updating dashboard data:', error);
    }
  }

  /**
   * Calculate live metrics
   */
  private async calculateLiveMetrics(): Promise<LiveMetrics> {
    try {
      // Get active alerts
      const activeAlerts = realTimeComplianceAlertService.getActiveAlerts();
      
      // Get today's resolved alerts
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const resolvedToday = realTimeComplianceAlertService.getAlertHistory()
        .filter(alert => alert.resolvedAt && alert.resolvedAt >= today)
        .length;

      // Get seller metrics (placeholder - would be actual database queries)
      const sellerMetrics = await this.getSellerMetrics();

      return {
        timestamp: new Date(),
        totalSellers: sellerMetrics.total,
        activeSellers: sellerMetrics.active,
        averageComplianceScore: sellerMetrics.avgComplianceScore,
        criticalViolations: activeAlerts.filter(a => a.severity === 'critical').length,
        highViolations: activeAlerts.filter(a => a.severity === 'high').length,
        mediumViolations: activeAlerts.filter(a => a.severity === 'medium').length,
        lowViolations: activeAlerts.filter(a => a.severity === 'low').length,
        pendingAlerts: activeAlerts.filter(a => !a.acknowledged && !a.resolved).length,
        acknowledgedAlerts: activeAlerts.filter(a => a.acknowledged && !a.resolved).length,
        resolvedToday,
        processingTimeCompliance: sellerMetrics.processingTimeCompliance,
        approvalRateCompliance: sellerMetrics.approvalRateCompliance
      };
    } catch (error) {
      logger.error('Error calculating live metrics:', error);
      return this.getDefaultMetrics();
    }
  }

  /**
   * Get seller metrics (placeholder implementation)
   */
  private async getSellerMetrics(): Promise<any> {
    // TODO: Implement actual database queries
    return {
      total: 150,
      active: 142,
      avgComplianceScore: 87.5,
      processingTimeCompliance: 92.3,
      approvalRateCompliance: 88.7
    };
  }

  /**
   * Get default metrics
   */
  private getDefaultMetrics(): LiveMetrics {
    return {
      timestamp: new Date(),
      totalSellers: 0,
      activeSellers: 0,
      averageComplianceScore: 0,
      criticalViolations: 0,
      highViolations: 0,
      mediumViolations: 0,
      lowViolations: 0,
      pendingAlerts: 0,
      acknowledgedAlerts: 0,
      resolvedToday: 0,
      processingTimeCompliance: 0,
      approvalRateCompliance: 0
    };
  }

  /**
   * Update chart data
   */
  private updateChartData(metrics: LiveMetrics): void {
    // Update compliance score trend
    let complianceTrend = this.chartData.get('compliance_score_trend') || [];
    complianceTrend.push({
      timestamp: metrics.timestamp,
      value: metrics.averageComplianceScore,
      label: 'Platform Average'
    });
    
    if (complianceTrend.length > this.MAX_HISTORY_POINTS) {
      complianceTrend = complianceTrend.slice(-this.MAX_HISTORY_POINTS);
    }
    this.chartData.set('compliance_score_trend', complianceTrend);

    // Update violation trend
    let violationTrend = this.chartData.get('violation_trend') || [];
    const totalViolations = metrics.criticalViolations + metrics.highViolations + 
                          metrics.mediumViolations + metrics.lowViolations;
    violationTrend.push({
      timestamp: metrics.timestamp,
      value: totalViolations,
      label: 'Total Violations'
    });
    
    if (violationTrend.length > this.MAX_HISTORY_POINTS) {
      violationTrend = violationTrend.slice(-this.MAX_HISTORY_POINTS);
    }
    this.chartData.set('violation_trend', violationTrend);
  }

  /**
   * Update widgets with latest data
   */
  private async updateWidgets(metrics: LiveMetrics): Promise<void> {
    for (const widget of this.dashboardWidgets.values()) {
      if (Date.now() - widget.lastUpdated.getTime() < widget.refreshInterval * 1000) {
        continue; // Skip if not time to update yet
      }

      switch (widget.type) {
        case 'metric':
          await this.updateMetricWidget(widget, metrics);
          break;
        case 'chart':
          await this.updateChartWidget(widget);
          break;
        case 'alert_feed':
          await this.updateAlertFeedWidget(widget);
          break;
        case 'leaderboard':
          await this.updateLeaderboardWidget(widget);
          break;
        case 'trend':
          await this.updateTrendWidget(widget);
          break;
      }

      widget.lastUpdated = new Date();
    }
  }

  /**
   * Update metric widget
   */
  private async updateMetricWidget(widget: DashboardWidget, metrics: LiveMetrics): Promise<void> {
    widget.data = widget.config.metrics.reduce((acc: any, metric: any) => {
      acc[metric.key] = {
        value: metrics[metric.key as keyof LiveMetrics],
        label: metric.label,
        format: metric.format,
        color: metric.color
      };
      return acc;
    }, {});
  }

  /**
   * Update chart widget
   */
  private async updateChartWidget(widget: DashboardWidget): Promise<void> {
    const chartData = this.chartData.get(widget.id) || [];
    widget.data = {
      chartType: widget.config.chartType,
      series: widget.config.series.map((series: any) => ({
        ...series,
        data: chartData.map(point => ({
          timestamp: point.timestamp,
          value: series.key === 'averageComplianceScore' ? point.value : 
                series.key === 'processingTimeCompliance' ? 92.3 : 88.7 // Placeholder data
        }))
      }))
    };
  }

  /**
   * Update alert feed widget
   */
  private async updateAlertFeedWidget(widget: DashboardWidget): Promise<void> {
    const activeAlerts = realTimeComplianceAlertService.getActiveAlerts();
    widget.data = activeAlerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, widget.config.maxItems)
      .map(alert => ({
        id: alert.id,
        severity: alert.severity,
        message: alert.description,
        sellerName: alert.sellerName,
        timestamp: alert.timestamp,
        acknowledged: alert.acknowledged,
        escalationLevel: alert.escalationLevel
      }));
  }

  /**
   * Update leaderboard widget
   */
  private async updateLeaderboardWidget(widget: DashboardWidget): Promise<void> {
    // TODO: Implement actual seller leaderboard query
    widget.data = [
      { sellerId: 'S001', sellerName: 'TechStore Pro', score: 98, trend: 'up' },
      { sellerId: 'S002', sellerName: 'Fashion Hub', score: 95, trend: 'stable' },
      { sellerId: 'S003', sellerName: 'Home Essentials', score: 92, trend: 'down' },
      { sellerId: 'S004', sellerName: 'Book World', score: 90, trend: 'up' },
      { sellerId: 'S005', sellerName: 'Sports Gear', score: 88, trend: 'stable' }
    ].slice(0, widget.config.maxItems);
  }

  /**
   * Update trend widget
   */
  private async updateTrendWidget(widget: DashboardWidget): Promise<void> {
    // TODO: Implement actual trend analysis
    widget.data = {
      improving: [
        { sellerId: 'S001', sellerName: 'TechStore Pro', change: 5.2, period: '7d' },
        { sellerId: 'S004', sellerName: 'Book World', change: 3.1, period: '7d' }
      ],
      declining: [
        { sellerId: 'S003', sellerName: 'Home Essentials', change: -2.8, period: '7d' },
        { sellerId: 'S005', sellerName: 'Sports Gear', change: -1.5, period: '7d' }
      ],
      stable: [
        { sellerId: 'S002', sellerName: 'Fashion Hub', change: 0.1, period: '7d' }
      ]
    };
  }

  /**
   * Handle real-time violation detection
   */
  private handleRealTimeViolation(alert: any): void {
    // Update relevant widgets immediately
    const alertFeedWidget = this.dashboardWidgets.get('alert_feed');
    if (alertFeedWidget) {
      this.updateAlertFeedWidget(alertFeedWidget);
      alertFeedWidget.lastUpdated = new Date();
    }

    // Emit immediate update
    this.emit('real_time_alert', alert);
  }

  /**
   * Handle new alert
   */
  private handleNewAlert(alert: any): void {
    this.emit('new_alert', alert);
  }

  /**
   * Handle alert acknowledged
   */
  private handleAlertAcknowledged(alert: any): void {
    this.emit('alert_acknowledged', alert);
  }

  /**
   * Handle alert resolved
   */
  private handleAlertResolved(alert: any): void {
    this.emit('alert_resolved', alert);
  }

  /**
   * Get dashboard data for client
   */
  public getDashboardData(): any {
    return {
      widgets: Array.from(this.dashboardWidgets.values()),
      metrics: this.metricsHistory.slice(-1)[0] || this.getDefaultMetrics(),
      timestamp: new Date(),
      subscriberCount: this.subscriberCount
    };
  }

  /**
   * Get chart data
   */
  public getChartData(chartId: string): ChartDataPoint[] {
    return this.chartData.get(chartId) || [];
  }

  /**
   * Get metrics history
   */
  public getMetricsHistory(limit: number = 50): LiveMetrics[] {
    return this.metricsHistory.slice(-limit);
  }

  /**
   * Add subscriber
   */
  public addSubscriber(): void {
    this.subscriberCount++;
  }

  /**
   * Remove subscriber
   */
  public removeSubscriber(): void {
    this.subscriberCount = Math.max(0, this.subscriberCount - 1);
  }

  /**
   * Get service statistics
   */
  public getStats(): any {
    return {
      subscriberCount: this.subscriberCount,
      widgetCount: this.dashboardWidgets.size,
      metricsHistoryPoints: this.metricsHistory.length,
      chartDataSeries: this.chartData.size,
      lastUpdate: this.metricsHistory.slice(-1)[0]?.timestamp || new Date(),
      uptime: process.uptime()
    };
  }

  /**
   * Graceful shutdown
   */
  public shutdown(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.removeAllListeners();
    logger.info('Live compliance dashboard service shut down');
  }
}

export const liveComplianceDashboardService = new LiveComplianceDashboardService();