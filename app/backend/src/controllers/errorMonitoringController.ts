import { Request, Response } from 'express';
import { ErrorLoggingService } from '../services/errorLoggingService';
import { asyncHandler } from '../middleware/errorHandler';

export class ErrorMonitoringController {
  // Get error statistics
  static getErrorStats = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    
    let timeRange;
    if (startDate && endDate) {
      timeRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };
    }

    const stats = ErrorLoggingService.getErrorStats(timeRange);

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  });

  // Search errors
  static searchErrors = asyncHandler(async (req: Request, res: Response) => {
    const {
      code,
      level,
      resolved,
      userId,
      startDate,
      endDate,
      tags,
      limit = 50
    } = req.query;

    const criteria: any = {
      limit: parseInt(limit as string)
    };

    if (code) criteria.code = code as string;
    if (level) criteria.level = level as string;
    if (resolved !== undefined) criteria.resolved = resolved === 'true';
    if (userId) criteria.userId = userId as string;
    if (tags) criteria.tags = (tags as string).split(',');

    if (startDate && endDate) {
      criteria.timeRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };
    }

    const errors = ErrorLoggingService.searchErrors(criteria);

    res.json({
      success: true,
      data: {
        errors,
        total: errors.length,
        criteria
      },
      timestamp: new Date().toISOString()
    });
  });

  // Resolve an error
  static resolveError = asyncHandler(async (req: Request, res: Response) => {
    const { errorId } = req.params;
    const { resolvedBy } = req.body;

    if (!resolvedBy) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'resolvedBy is required'
        }
      });
    }

    const resolved = ErrorLoggingService.resolveError(errorId, resolvedBy);

    if (!resolved) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Error not found or already resolved'
        }
      });
    }

    res.json({
      success: true,
      message: 'Error marked as resolved',
      timestamp: new Date().toISOString()
    });
  });

  // Export error logs
  static exportLogs = asyncHandler(async (req: Request, res: Response) => {
    const { format = 'json' } = req.query;

    const exportData = ErrorLoggingService.exportLogs(format as 'json' | 'csv');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="error-logs-${timestamp}.csv"`);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="error-logs-${timestamp}.json"`);
    }

    res.send(exportData);
  });

  // Get system health status
  static getHealthStatus = asyncHandler(async (req: Request, res: Response) => {
    const healthStatus = ErrorLoggingService.getHealthStatus();

    res.json({
      success: true,
      data: healthStatus,
      timestamp: new Date().toISOString()
    });
  });

  // Get error trends
  static getErrorTrends = asyncHandler(async (req: Request, res: Response) => {
    const { period = '24h' } = req.query;
    
    const now = new Date();
    let startDate: Date;
    let interval: number;

    switch (period) {
      case '1h':
        startDate = new Date(now.getTime() - 3600000);
        interval = 300000; // 5 minutes
        break;
      case '24h':
        startDate = new Date(now.getTime() - 86400000);
        interval = 3600000; // 1 hour
        break;
      case '7d':
        startDate = new Date(now.getTime() - 604800000);
        interval = 86400000; // 1 day
        break;
      case '30d':
        startDate = new Date(now.getTime() - 2592000000);
        interval = 86400000; // 1 day
        break;
      default:
        startDate = new Date(now.getTime() - 86400000);
        interval = 3600000;
    }

    const stats = ErrorLoggingService.getErrorStats({ start: startDate, end: now });
    
    // Generate time series data
    const timeSlots: { [key: string]: number } = {};
    const currentTime = startDate.getTime();
    const endTime = now.getTime();

    for (let time = currentTime; time <= endTime; time += interval) {
      const slotKey = new Date(time).toISOString();
      timeSlots[slotKey] = 0;
    }

    // Count errors in each time slot
    const errors = ErrorLoggingService.searchErrors({
      timeRange: { start: startDate, end: now }
    });

    errors.forEach(error => {
      const errorTime = error.timestamp.getTime();
      const slotTime = Math.floor((errorTime - currentTime) / interval) * interval + currentTime;
      const slotKey = new Date(slotTime).toISOString();
      
      if (timeSlots[slotKey] !== undefined) {
        timeSlots[slotKey]++;
      }
    });

    const trendData = Object.entries(timeSlots).map(([timestamp, count]) => ({
      timestamp,
      errorCount: count
    }));

    res.json({
      success: true,
      data: {
        period,
        interval: interval / 1000, // Convert to seconds
        trends: trendData,
        summary: stats
      },
      timestamp: new Date().toISOString()
    });
  });

  // Get error details by ID
  static getErrorDetails = asyncHandler(async (req: Request, res: Response) => {
    const { errorId } = req.params;

    const errors = ErrorLoggingService.searchErrors({ limit: 1000 });
    const error = errors.find(e => e.id === errorId);

    if (!error) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Error not found'
        }
      });
    }

    // Get related errors (same code, recent timeframe)
    const relatedErrors = ErrorLoggingService.searchErrors({
      code: error.code,
      timeRange: {
        start: new Date(error.timestamp.getTime() - 3600000), // 1 hour before
        end: new Date(error.timestamp.getTime() + 3600000)   // 1 hour after
      },
      limit: 10
    }).filter(e => e.id !== errorId);

    res.json({
      success: true,
      data: {
        error,
        relatedErrors,
        context: {
          totalSimilarErrors: ErrorLoggingService.searchErrors({ code: error.code }).length,
          firstOccurrence: ErrorLoggingService.searchErrors({ code: error.code, limit: 1000 })
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())[0]?.timestamp,
          lastOccurrence: ErrorLoggingService.searchErrors({ code: error.code, limit: 1000 })
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]?.timestamp
        }
      },
      timestamp: new Date().toISOString()
    });
  });
}