import { Request, Response } from 'express';
import communityHealthService from '../services/communityHealthService';

/**
 * Get community health metrics
 */
export const getCommunityHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { communityId } = req.params;
    
    if (!communityId) {
      res.status(400).json({ error: 'Community ID is required' });
      return;
    }
    
    const healthMetrics = await communityHealthService.getCommunityHealthMetrics(communityId);
    
    res.json({
      success: true,
      data: healthMetrics
    });
  } catch (error) {
    console.error('Error getting community health:', error);
    res.status(500).json({ error: 'Failed to retrieve community health metrics' });
  }
};

/**
 * Get community health trends
 */
export const getCommunityHealthTrends = async (req: Request, res: Response): Promise<void> => {
  try {
    const { communityId } = req.params;
    const { days } = req.query;
    const daysNum = days ? parseInt(days as string) : 30;
    
    if (!communityId) {
      res.status(400).json({ error: 'Community ID is required' });
      return;
    }
    
    const trends = await communityHealthService.getCommunityHealthTrends(communityId, daysNum);
    
    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Error getting community health trends:', error);
    res.status(500).json({ error: 'Failed to retrieve community health trends' });
  }
};

/**
 * Get community comparisons
 */
export const getCommunityComparisons = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit, sortBy } = req.query;
    const limitNum = limit ? parseInt(limit as string) : 10;
    const sortField = (sortBy as string) || 'health';
    
    const comparisons = await communityHealthService.getCommunityComparisons(limitNum, sortField as any);
    
    res.json({
      success: true,
      data: comparisons
    });
  } catch (error) {
    console.error('Error getting community comparisons:', error);
    res.status(500).json({ error: 'Failed to retrieve community comparisons' });
  }
};

/**
 * Get health alerts
 */
export const getHealthAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { communityId, severity } = req.query;
    
    const alerts = await communityHealthService.getHealthAlerts(
      communityId as string,
      severity as 'low' | 'medium' | 'high' | 'critical'
    );
    
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error getting health alerts:', error);
    res.status(500).json({ error: 'Failed to retrieve health alerts' });
  }
};

/**
 * Get real-time health snapshot
 */
export const getRealTimeHealthSnapshot = async (req: Request, res: Response): Promise<void> => {
  try {
    const snapshot = await communityHealthService.getRealTimeHealthSnapshot();
    
    res.json({
      success: true,
      data: snapshot
    });
  } catch (error) {
    console.error('Error getting real-time health snapshot:', error);
    res.status(500).json({ error: 'Failed to retrieve real-time health snapshot' });
  }
};

/**
 * Export health report
 */
export const exportHealthReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { communityId, format } = req.query;
    
    if (!communityId) {
      res.status(400).json({ error: 'Community ID is required' });
      return;
    }
    
    // In a real implementation, this would generate and return a report
    // For now, we'll just return a mock response
    const reportData = await communityHealthService.getCommunityHealthMetrics(communityId as string);
    
    const exportFormat = (format as string) || 'json';
    
    if (exportFormat === 'csv') {
      // Generate CSV content
      const csvContent = `Community Health Report
Community: ${reportData.displayName}
Health Score: ${reportData.healthScore}
Members: ${reportData.memberCount}
Engagement Rate: ${reportData.engagementRate}%
Growth Rate (7d): ${reportData.growthRate7d}%
Last Updated: ${reportData.lastUpdated.toISOString()}`;
      
      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', `attachment; filename="community-health-${communityId}.csv"`);
      res.send(csvContent);
    } else {
      // Return JSON
      res.json({
        success: true,
        data: reportData,
        exportedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error exporting health report:', error);
    res.status(500).json({ error: 'Failed to export health report' });
  }
};