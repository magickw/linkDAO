/**
 * Advanced Analytics Controller
 * Handles API endpoints for marketplace analytics
 */

import { Request, Response } from 'express';
import { AdvancedAnalyticsService, AnalyticsTimeRange } from '../services/advancedAnalyticsService';

const analyticsService = new AdvancedAnalyticsService();

/**
 * Helper function to parse time range from query parameters
 */
const parseTimeRange = (period: string): AnalyticsTimeRange => {
  const end = new Date();
  const start = new Date();
  
  switch (period) {
    case '24h':
      start.setHours(start.getHours() - 24);
      break;
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
    case '1y':
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      start.setDate(start.getDate() - 30);
  }
  
  return { start, end, period: period as any };
};

/**
 * Get marketplace analytics overview
 */
export const getMarketplaceAnalytics = async (req: Request, res: Response) => {
  try {
    const { period = '30d' } = req.query;
    const timeRange = parseTimeRange(period as string);
    
    const analytics = await analyticsService.getMarketplaceAnalytics(timeRange);
    
    res.json({
      success: true,
      data: analytics,
      message: 'Marketplace analytics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting marketplace analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve marketplace analytics'
    });
  }
};

/**
 * Get time series data for specific metric
 */
export const getTimeSeriesData = async (req: Request, res: Response) => {
  try {
    const { metric } = req.params;
    const { period = '30d', granularity = 'day' } = req.query;
    
    if (!metric) {
      return res.status(400).json({
        success: false,
        error: 'Metric parameter is required'
      });
    }
    
    const timeRange = parseTimeRange(period as string);
    const data = await analyticsService.getTimeSeriesData(
      metric,
      timeRange,
      granularity as 'hour' | 'day' | 'week' | 'month'
    );
    
    res.json({
      success: true,
      data: {
        metric,
        timeRange,
        granularity,
        points: data
      },
      message: 'Time series data retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting time series data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve time series data'
    });
  }
};

/**
 * Get AI-generated insights
 */
export const getAnalyticsInsights = async (req: Request, res: Response) => {
  try {
    const { period = '30d' } = req.query;
    const timeRange = parseTimeRange(period as string);
    
    const insights = await analyticsService.generateInsights(timeRange);
    
    res.json({
      success: true,
      data: insights,
      message: 'Analytics insights generated successfully'
    });
  } catch (error) {
    console.error('Error generating analytics insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate analytics insights'
    });
  }
};

/**
 * Get real-time metrics
 */
export const getRealTimeMetrics = async (req: Request, res: Response) => {
  try {
    const metrics = await analyticsService.getRealTimeMetrics();
    
    res.json({
      success: true,
      data: {
        ...metrics,
        timestamp: new Date().toISOString()
      },
      message: 'Real-time metrics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting real-time metrics:', error);
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
    const { period = '30d' } = req.query;
    const timeRange = parseTimeRange(period as string);
    
    const behaviorData = await analyticsService.getUserBehaviorAnalytics(timeRange);
    
    res.json({
      success: true,
      data: behaviorData,
      message: 'User behavior analytics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting user behavior analytics:', error);
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
    
    const performanceData = await analyticsService.getSellerPerformanceAnalytics(
      sellerId as string
    );
    
    res.json({
      success: true,
      data: performanceData,
      message: 'Seller performance analytics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting seller performance analytics:', error);
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
    const { period = '30d', format = 'csv' } = req.query;
    
    if (!['csv', 'json', 'xlsx'].includes(format as string)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid format. Supported formats: csv, json, xlsx'
      });
    }
    
    const timeRange = parseTimeRange(period as string);
    const exportResult = await analyticsService.exportAnalyticsData(
      timeRange,
      format as 'csv' | 'json' | 'xlsx'
    );
    
    res.json({
      success: true,
      data: exportResult,
      message: 'Analytics data export prepared successfully'
    });
  } catch (error) {
    console.error('Error exporting analytics data:', error);
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
    const { 
      revenueDropThreshold, 
      disputeRateThreshold, 
      userGrowthThreshold, 
      gasFeeSavingsGoal 
    } = req.body;
    
    if (
      revenueDropThreshold === undefined ||
      disputeRateThreshold === undefined ||
      userGrowthThreshold === undefined ||
      gasFeeSavingsGoal === undefined
    ) {
      return res.status(400).json({
        success: false,
        error: 'Missing required alert configuration parameters'
      });
    }
    
    await analyticsService.configureAlerts({
      revenueDropThreshold,
      disputeRateThreshold,
      userGrowthThreshold,
      gasFeeSavingsGoal
    });
    
    res.json({
      success: true,
      message: 'Analytics alerts configured successfully'
    });
  } catch (error) {
    console.error('Error configuring analytics alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to configure analytics alerts'
    });
  }
};

/**
 * Get comprehensive analytics dashboard data
 */
export const getDashboardData = async (req: Request, res: Response) => {
  try {
    const { period = '30d' } = req.query;
    const timeRange = parseTimeRange(period as string);
    
    // Fetch all analytics data in parallel
    const [analytics, insights, realTimeMetrics, userBehavior, sellerPerformance] = await Promise.all([
      analyticsService.getMarketplaceAnalytics(timeRange),
      analyticsService.generateInsights(timeRange),
      analyticsService.getRealTimeMetrics(),
      analyticsService.getUserBehaviorAnalytics(timeRange),
      analyticsService.getSellerPerformanceAnalytics()
    ]);
    
    res.json({
      success: true,
      data: {
        analytics,
        insights,
        realTimeMetrics: {
          ...realTimeMetrics,
          timestamp: new Date().toISOString()
        },
        userBehavior,
        sellerPerformance,
        timeRange
      },
      message: 'Dashboard data retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard data'
    });
  }
};", "original_text": "", "replace_all": false}]