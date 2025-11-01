import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { enhancedSystemHealthService } from '../services/enhancedSystemHealthService';
import { intelligentAlertingService } from '../services/intelligentAlertingService';
import { capacityPlanningService } from '../services/capacityPlanningService';
import { performanceAnalyticsService } from '../services/performanceAnalyticsService';
import { systemHealthMonitoringService } from '../services/systemHealthMonitoringService';

/**
 * System Health Monitoring Controller
 * Handles API endpoints for the enhanced system health monitoring dashboard
 */
export class SystemHealthMonitoringController {
  /**
   * Get current system health overview
   */
  async getSystemHealthOverview(req: Request, res: Response): Promise<void> {
    try {
      const healthScore = enhancedSystemHealthService.getCurrentHealthScore();
      const baseMetrics = systemHealthMonitoringService.getCurrentMetrics();
      const activeAlerts = intelligentAlertingService.getActiveAlerts();
      const bottlenecks = capacityPlanningService.getPerformanceBottlenecks();
      
      const overview = {
        timestamp: new Date(),
        healthScore: healthScore?.overall || 0,
        status: healthScore?.overall ? 
          (healthScore.overall > 80 ? 'healthy' : healthScore.overall > 60 ? 'degraded' : 'critical') : 'unknown',
        
        metrics: {
          cpu: baseMetrics?.systemLoad.cpu || 0,
          memory: baseMetrics?.systemLoad.memory || 0,
          services: {
            total: baseMetrics ? Object.keys(baseMetrics.services).length : 0,
            healthy: baseMetrics ? Object.values(baseMetrics.services).filter(s => s.status === 'healthy').length : 0,
            degraded: baseMetrics ? Object.values(baseMetrics.services).filter(s => s.status === 'degraded').length : 0,
            failed: baseMetrics ? Object.values(baseMetrics.services).filter(s => s.status === 'failed').length : 0
          }
        },
        
        alerts: {
          total: activeAlerts.length,
          critical: activeAlerts.filter(a => a.severity === 'critical').length,
          warning: activeAlerts.filter(a => a.severity === 'warning').length,
          info: activeAlerts.filter(a => a.severity === 'info').length
        },
        
        bottlenecks: {
          total: bottlenecks.length,
          critical: bottlenecks.filter(b => b.severity === 'critical').length,
          high: bottlenecks.filter(b => b.severity === 'high').length
        },
        
        trends: healthScore?.trends || {
          direction: 'stable',
          changeRate: 0,
          confidence: 0
        }
      };
      
      res.json({
        success: true,
        data: overview
      });
    } catch (error) {
      safeLogger.error('Error getting system health overview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get system health overview'
      });
    }
  }

  /**
   * Get detailed system health metrics
   */
  async getSystemHealthMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { timeframe = '1h' } = req.query;
      
      const healthScore = enhancedSystemHealthService.getCurrentHealthScore();
      const healthHistory = enhancedSystemHealthService.getHealthScoreHistory(100);
      const performanceTrends = enhancedSystemHealthService.getPerformanceTrends();
      const componentDependencies = enhancedSystemHealthService.getComponentDependencyMap();
      
      const metrics = {
        current: {
          healthScore: healthScore?.overall || 0,
          components: healthScore?.components || {},
          trends: healthScore?.trends || { direction: 'stable', changeRate: 0, confidence: 0 }
        },
        
        history: healthHistory.map(h => ({
          timestamp: h.timestamp,
          score: h.score.overall,
          components: Object.keys(h.score.components).length
        })),
        
        trends: performanceTrends.filter(t => t.timeframe === timeframe),
        
        dependencies: componentDependencies.map(dep => ({
          id: dep.id,
          name: dep.name,
          type: dep.type,
          criticality: dep.criticality,
          dependencies: dep.dependencies,
          dependents: dep.dependents
        }))
      };
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      safeLogger.error('Error getting system health metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get system health metrics'
      });
    }
  }

  /**
   * Get component dependency map
   */
  async getComponentDependencies(req: Request, res: Response): Promise<void> {
    try {
      const dependencies = enhancedSystemHealthService.getComponentDependencyMap();
      
      // Create a graph structure for visualization
      const nodes = dependencies.map(dep => ({
        id: dep.id,
        name: dep.name,
        type: dep.type,
        criticality: dep.criticality,
        status: 'healthy' // Would be determined from actual health checks
      }));
      
      const edges = [];
      for (const dep of dependencies) {
        for (const dependency of dep.dependencies) {
          edges.push({
            source: dependency,
            target: dep.id,
            type: 'dependency'
          });
        }
      }
      
      res.json({
        success: true,
        data: {
          nodes,
          edges,
          metadata: {
            totalComponents: nodes.length,
            totalDependencies: edges.length,
            criticalComponents: nodes.filter(n => n.criticality === 'critical').length
          }
        }
      });
    } catch (error) {
      safeLogger.error('Error getting component dependencies:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get component dependencies'
      });
    }
  }

  /**
   * Get intelligent alerts
   */
  async getIntelligentAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { status, severity, limit = 50 } = req.query;
      
      let alerts = intelligentAlertingService.getActiveAlerts();
      
      // Filter by status
      if (status && status !== 'all') {
        alerts = alerts.filter(alert => alert.status === status);
      }
      
      // Filter by severity
      if (severity && severity !== 'all') {
        alerts = alerts.filter(alert => alert.severity === severity);
      }
      
      // Limit results
      alerts = alerts.slice(0, Number(limit));
      
      // Get alert correlations
      const correlations = intelligentAlertingService.getAlertCorrelations();
      
      res.json({
        success: true,
        data: {
          alerts: alerts.map(alert => ({
            id: alert.id,
            ruleId: alert.ruleId,
            timestamp: alert.timestamp,
            severity: alert.severity,
            title: alert.title,
            message: alert.message,
            confidence: alert.confidence,
            predictedImpact: alert.predictedImpact,
            status: alert.status,
            escalationLevel: alert.escalationLevel,
            rootCause: alert.rootCauseAnalysis.primaryCause,
            affectedComponents: alert.rootCauseAnalysis.affectedComponents,
            recommendedActions: alert.rootCauseAnalysis.recommendedActions
          })),
          correlations: correlations.map(corr => ({
            alertIds: corr.alertIds,
            type: corr.correlationType,
            confidence: corr.confidence,
            rootCause: corr.rootCause,
            affectedServices: corr.impactAssessment.affectedServices,
            businessImpact: corr.impactAssessment.businessImpact
          })),
          summary: {
            total: alerts.length,
            critical: alerts.filter(a => a.severity === 'critical').length,
            warning: alerts.filter(a => a.severity === 'warning').length,
            info: alerts.filter(a => a.severity === 'info').length,
            correlations: correlations.length
          }
        }
      });
    } catch (error) {
      safeLogger.error('Error getting intelligent alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get intelligent alerts'
      });
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(req: Request, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;
      const { acknowledgedBy } = req.body;
      
      if (!acknowledgedBy) {
        res.status(400).json({
          success: false,
          error: 'acknowledgedBy is required'
        });
        return;
      }
      
      const success = intelligentAlertingService.acknowledgeAlert(alertId, acknowledgedBy);
      
      if (success) {
        res.json({
          success: true,
          message: 'Alert acknowledged successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Alert not found or already acknowledged'
        });
      }
    } catch (error) {
      safeLogger.error('Error acknowledging alert:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to acknowledge alert'
      });
    }
  }

  /**
   * Resolve alert
   */
  async resolveAlert(req: Request, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;
      
      const success = intelligentAlertingService.resolveAlert(alertId);
      
      if (success) {
        res.json({
          success: true,
          message: 'Alert resolved successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Alert not found'
        });
      }
    } catch (error) {
      safeLogger.error('Error resolving alert:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to resolve alert'
      });
    }
  }

  /**
   * Get capacity planning data
   */
  async getCapacityPlanningData(req: Request, res: Response): Promise<void> {
    try {
      const { resource, timeframe } = req.query;
      
      const predictions = capacityPlanningService.getResourcePredictions(
        resource as any,
        timeframe as any
      );
      
      const scalingRecommendations = capacityPlanningService.getScalingRecommendations();
      const bottlenecks = capacityPlanningService.getPerformanceBottlenecks();
      const costAnalyses = capacityPlanningService.getCostOptimizationAnalyses(5);
      const resourceHistory = capacityPlanningService.getResourceUsageHistory(24);
      
      res.json({
        success: true,
        data: {
          predictions: predictions.map(pred => ({
            resource: pred.resource,
            timeframe: pred.timeframe,
            predictions: pred.predictions.slice(0, 20), // Limit to 20 points
            thresholds: pred.thresholds,
            projectedExhaustion: pred.projectedExhaustion
          })),
          
          scalingRecommendations: scalingRecommendations.slice(0, 10).map(rec => ({
            id: rec.id,
            timestamp: rec.timestamp,
            component: rec.component,
            action: rec.action,
            priority: rec.priority,
            trigger: rec.trigger,
            recommendation: rec.recommendation,
            costOptimization: rec.costOptimization
          })),
          
          bottlenecks: bottlenecks.map(bottleneck => ({
            id: bottleneck.id,
            component: bottleneck.component,
            type: bottleneck.type,
            severity: bottleneck.severity,
            metrics: bottleneck.metrics,
            impact: bottleneck.impact,
            resolution: bottleneck.resolution
          })),
          
          costAnalysis: costAnalyses.length > 0 ? {
            timestamp: costAnalyses[0].timestamp,
            totalCost: costAnalyses[0].totalCost,
            breakdown: costAnalyses[0].breakdown,
            optimizations: costAnalyses[0].optimizations.slice(0, 5),
            rightsizing: costAnalyses[0].rightsizing.slice(0, 5)
          } : null,
          
          resourceHistory: resourceHistory.slice(-100).map(h => ({
            timestamp: h.timestamp,
            cpu: h.cpu,
            memory: h.memory,
            storage: h.storage,
            network: h.network,
            connections: h.connections
          }))
        }
      });
    } catch (error) {
      safeLogger.error('Error getting capacity planning data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get capacity planning data'
      });
    }
  }

  /**
   * Get performance analytics
   */
  async getPerformanceAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { metric, timeframe, limit = 100 } = req.query;
      
      const performanceMetrics = performanceAnalyticsService.getPerformanceMetrics(
        metric as string
      ).slice(-Number(limit));
      
      const benchmarks = performanceAnalyticsService.getPerformanceBenchmarks();
      const optimizationRecommendations = performanceAnalyticsService.getOptimizationRecommendations();
      const trendAnalyses = performanceAnalyticsService.getTrendAnalyses(
        metric as string,
        timeframe as any
      );
      const impactAssessments = performanceAnalyticsService.getPerformanceImpactAssessments(10);
      
      res.json({
        success: true,
        data: {
          metrics: performanceMetrics.map(m => ({
            name: m.name,
            value: m.value,
            unit: m.unit,
            timestamp: m.timestamp,
            tags: m.tags
          })),
          
          benchmarks: benchmarks.map(b => ({
            id: b.id,
            name: b.name,
            category: b.category,
            target: b.target,
            current: b.current,
            trend: b.trend,
            sla: b.sla,
            historical: b.historical.slice(-50) // Last 50 points
          })),
          
          optimizationRecommendations: optimizationRecommendations.slice(0, 10).map(rec => ({
            id: rec.id,
            timestamp: rec.timestamp,
            category: rec.category,
            priority: rec.priority,
            issue: rec.issue,
            recommendation: rec.recommendation,
            metrics: rec.metrics,
            riskAssessment: rec.riskAssessment
          })),
          
          trendAnalyses: trendAnalyses.map(analysis => ({
            metric: analysis.metric,
            timeframe: analysis.timeframe,
            trend: analysis.trend,
            statistics: analysis.statistics,
            seasonality: analysis.seasonality,
            anomalies: analysis.anomalies.slice(-10), // Last 10 anomalies
            forecast: analysis.forecast.slice(0, 12) // Next 12 points
          })),
          
          impactAssessments: impactAssessments.map(assessment => ({
            changeId: assessment.changeId,
            timestamp: assessment.timestamp,
            changeType: assessment.changeType,
            impact: assessment.impact,
            affectedMetrics: assessment.affectedMetrics,
            userExperienceImpact: assessment.userExperienceImpact
          }))
        }
      });
    } catch (error) {
      safeLogger.error('Error getting performance analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get performance analytics'
      });
    }
  }

  /**
   * Get system performance trends
   */
  async getPerformanceTrends(req: Request, res: Response): Promise<void> {
    try {
      const { metric, timeframe = '24h' } = req.query;
      
      const trends = performanceAnalyticsService.getTrendAnalyses(
        metric as string,
        timeframe as any
      );
      
      const performanceTrends = enhancedSystemHealthService.getPerformanceTrends(
        metric as string,
        timeframe as any
      );
      
      res.json({
        success: true,
        data: {
          analytics: trends.map(trend => ({
            metric: trend.metric,
            timeframe: trend.timeframe,
            direction: trend.trend.direction,
            strength: trend.trend.strength,
            confidence: trend.trend.confidence,
            statistics: trend.statistics,
            forecast: trend.forecast.slice(0, 10)
          })),
          
          systemTrends: performanceTrends.map(trend => ({
            metric: trend.metric,
            timeframe: trend.timeframe,
            values: trend.values.slice(-50),
            trend: trend.trend,
            forecast: trend.forecast.slice(0, 10)
          }))
        }
      });
    } catch (error) {
      safeLogger.error('Error getting performance trends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get performance trends'
      });
    }
  }

  /**
   * Get system status for dashboard
   */
  async getSystemStatus(req: Request, res: Response): Promise<void> {
    try {
      const healthSummary = systemHealthMonitoringService.getHealthSummary();
      const healthScore = enhancedSystemHealthService.getCurrentHealthScore();
      const activeAlerts = intelligentAlertingService.getActiveAlerts();
      const criticalBottlenecks = capacityPlanningService.getPerformanceBottlenecks('critical');
      
      const status = {
        timestamp: new Date(),
        
        overall: {
          status: healthSummary.status,
          score: healthScore?.overall || 0,
          uptime: healthSummary.uptime,
          lastUpdate: healthSummary.lastUpdate
        },
        
        services: {
          total: healthSummary.servicesStatus.healthy + 
                 healthSummary.servicesStatus.degraded + 
                 healthSummary.servicesStatus.failed,
          healthy: healthSummary.servicesStatus.healthy,
          degraded: healthSummary.servicesStatus.degraded,
          failed: healthSummary.servicesStatus.failed
        },
        
        alerts: {
          active: healthSummary.activeAlerts,
          critical: healthSummary.criticalAlerts,
          recent: activeAlerts.slice(0, 5).map(alert => ({
            id: alert.id,
            severity: alert.severity,
            title: alert.title,
            timestamp: alert.timestamp
          }))
        },
        
        performance: {
          criticalBottlenecks: criticalBottlenecks.length,
          trends: healthScore?.trends || { direction: 'stable', changeRate: 0, confidence: 0 }
        }
      };
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      safeLogger.error('Error getting system status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get system status'
      });
    }
  }
}

export const systemHealthMonitoringController = new SystemHealthMonitoringController();
