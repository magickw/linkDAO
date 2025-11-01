/**
 * Advanced Analytics Controller
 * Handles API endpoints for marketplace analytics and insights
 */

import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { AdvancedAnalyticsService, AnalyticsTimeRange } from '../services/advancedAnalyticsService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

const advancedAnalyticsService = new AdvancedAnalyticsService();

/**
 * Parse time range from query parameters
 */
function parseTimeRange(timeframe: string): AnalyticsTimeRange {
  const end = new Date();
  let start: Date;
  let period: AnalyticsTimeRange['period'];
  
  switch (timeframe) {
    case '24h':
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      period = '24h';
      break;
    case '7d':
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      period = '7d';
      break;
    case '30d':
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      period = '30d';
      break;
    case '90d':
      start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
      period = '90d';
      break;
    case '1y':
      start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
      period = '1y';
      break;
    default:
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      period = '7d';
  }
  
  return { start, end, period };
}

/**
 * Get marketplace analytics overview
 */
export const getMarketplaceAnalytics = async (req: Request, res: Response) => {
  try {
    const { timeframe = '7d' } = req.query;
    const timeRange = parseTimeRange(timeframe as string);
    
    const analytics = await advancedAnalyticsService.getMarketplaceAnalytics(timeRange);
    
    res.json({
      success: true,
      data: analytics,
      message: 'Marketplace analytics retrieved successfully'
    });
  } catch (error) {
    safeLogger.error('Error getting marketplace analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve marketplace analytics'
    });
  }
};

/**
 * Get time series data for a specific metric
 */
export const getTimeSeriesData = async (req: Request, res: Response) => {
  try {
    const { metric } = req.params;
    const { timeframe = '7d', interval = 'day' } = req.query;
    const timeRange = parseTimeRange(timeframe as string);
    
    const timeSeriesData = await advancedAnalyticsService.getTimeSeriesData(
      metric,
      timeRange,
      interval as 'hour' | 'day' | 'week' | 'month'
    );
    
    res.json({
      success: true,
      data: timeSeriesData,
      message: 'Time series data retrieved successfully'
    });
  } catch (error) {
    safeLogger.error('Error getting time series data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve time series data'
    });
  }
};

/**
 * Get analytics insights and recommendations
 */
export const getAnalyticsInsights = async (req: Request, res: Response) => {
  try {
    const { timeframe = '7d' } = req.query;
    const timeRange = parseTimeRange(timeframe as string);
    
    const insights = await advancedAnalyticsService.generateInsights(timeRange);
    
    res.json({
      success: true,
      data: insights,
      message: 'Analytics insights retrieved successfully'
    });
  } catch (error) {
    safeLogger.error('Error getting analytics insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analytics insights'
    });
  }
};

/**
 * Get real-time metrics
 */
export const getRealTimeMetrics = async (req: Request, res: Response) => {
  try {
    const realTimeMetrics = await advancedAnalyticsService.getRealTimeMetrics();
    
    res.json({
      success: true,
      data: realTimeMetrics,
      message: 'Real-time metrics retrieved successfully'
    });
  } catch (error) {
    safeLogger.error('Error getting real-time metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve real-time metrics'
    });
  }
};

/**
 * Get user behavior analytics
 */
export const getUserBehaviorAnalytics = async (req: Request, res: Response) => {
  try {
    const { timeframe = '7d' } = req.query;
    const timeRange = parseTimeRange(timeframe as string);
    
    const behaviorAnalytics = await advancedAnalyticsService.getUserBehaviorAnalytics(timeRange);
    
    res.json({
      success: true,
      data: behaviorAnalytics,
      message: 'User behavior analytics retrieved successfully'
    });
  } catch (error) {
    safeLogger.error('Error getting user behavior analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user behavior analytics'
    });
  }
};

/**
 * Get seller performance analytics
 */
export const getSellerPerformanceAnalytics = async (req: Request, res: Response) => {
  try {
    const { sellerId } = req.query;
    
    const sellerAnalytics = await advancedAnalyticsService.getSellerPerformanceAnalytics(sellerId as string);
    
    res.json({
      success: true,
      data: sellerAnalytics,
      message: 'Seller performance analytics retrieved successfully'
    });
  } catch (error) {
    safeLogger.error('Error getting seller performance analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve seller performance analytics'
    });
  }
};

/**
 * Export analytics data
 */
export const exportAnalyticsData = async (req: Request, res: Response) => {
  try {
    const { format = 'json', timeframe = '7d' } = req.query;
    const timeRange = parseTimeRange(timeframe as string);
    
    const exportData = await advancedAnalyticsService.exportAnalyticsData(
      timeRange,
      format as 'csv' | 'json' | 'xlsx'
    );
    
    res.json({
      success: true,
      data: exportData,
      message: 'Analytics data export initiated successfully'
    });
  } catch (error) {
    safeLogger.error('Error exporting analytics data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export analytics data'
    });
  }
};

/**
 * Configure analytics alerts
 */
export const configureAnalyticsAlerts = async (req: Request, res: Response) => {
  try {
    const { config } = req.body;
    
    await advancedAnalyticsService.configureAlerts(config);
    
    res.json({
      success: true,
      message: 'Analytics alerts configured successfully'
    });
  } catch (error) {
    safeLogger.error('Error configuring analytics alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to configure analytics alerts'
    });
  }
};

/**
 * Get dashboard data
 */
export const getDashboardData = async (req: Request, res: Response) => {
  try {
    // Combine multiple analytics into a dashboard view
    const [analytics, insights, realTimeMetrics] = await Promise.all([
      advancedAnalyticsService.getMarketplaceAnalytics(parseTimeRange('7d')),
      advancedAnalyticsService.generateInsights(parseTimeRange('7d')),
      advancedAnalyticsService.getRealTimeMetrics()
    ]);
    
    const dashboardData = {
      overview: analytics.overview,
      growth: analytics.growth,
      realTime: realTimeMetrics,
      insights: insights.slice(0, 5), // Top 5 insights
      topCategories: Object.entries(analytics.categories)
        .sort(([,a], [,b]) => b.revenue - a.revenue)
        .slice(0, 5)
        .map(([name, data]) => ({ name, ...data }))
    };
    
    res.json({
      success: true,
      data: dashboardData,
      message: 'Dashboard data retrieved successfully'
    });
  } catch (error) {
    safeLogger.error('Error getting dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard data'
    });
  }
};