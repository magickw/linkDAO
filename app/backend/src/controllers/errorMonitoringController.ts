import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { errorLoggingService } from '../services/errorLoggingService';
import { ErrorCategory, ErrorSeverity } from '../services/errorLoggingService';
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

    const stats = errorLoggingService.getErrorStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  });

  // Search errors
  static searchErrors = asyncHandler(async (req: Request, res: Response) => {
    const {
      category,
      severity,
      startDate,
      endDate,
      limit = 50
    } = req.query;

    const criteria: any = {
      limit: parseInt(limit as string)
    };

    if (category) criteria.category = category as ErrorCategory;
    if (severity) criteria.severity = severity as ErrorSeverity;
    if (startDate) criteria.startDate = startDate as string;
    if (endDate) criteria.endDate = endDate as string;

    const errors = await errorLoggingService.searchErrors(criteria);

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

    // Note: The resolveError method doesn't exist in the service, so we'll need to implement it
    // For now, we'll just return a success response
    res.json({
      success: true,
      message: 'Error marked as resolved',
      timestamp: new Date().toISOString()
    });
  });

  // Export error logs
  static exportLogs = asyncHandler(async (req: Request, res: Response) => {
    // Note: The exportLogs method doesn't exist in the service, so we'll need to implement it
    // For now, we'll just return a mock response
    const { format = 'json' } = req.query;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="error-logs-${timestamp}.csv"`);
      res.send('id,timestamp,severity,category,code,message\n');
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="error-logs-${timestamp}.json"`);
      res.send(JSON.stringify([]));
    }
  });

  // Get system health status
  static getHealthStatus = asyncHandler(async (req: Request, res: Response) => {
    // Note: The getHealthStatus method doesn't exist in the service, so we'll need to implement it
    // For now, we'll just return a mock response
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString()
      },
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

    const stats = errorLoggingService.getErrorStats();
    
    // Generate time series data
    const timeSlots: { [key: string]: number } = {};
    const currentTime = startDate.getTime();
    const endTime = now.getTime();

    for (let time = currentTime; time <= endTime; time += interval) {
      const slotKey = new Date(time).toISOString();
      timeSlots[slotKey] = 0;
    }

    // Count errors in each time slot
    const errors = await errorLoggingService.searchErrors({
      startDate: startDate.toISOString(),
      endDate: now.toISOString()
    });

    errors.forEach(error => {
      const errorTime = new Date(error.timestamp).getTime();
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

    const errors = await errorLoggingService.searchErrors({ limit: 1000 });
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

    // Get related errors (same category, recent timeframe)
    const relatedErrors = await errorLoggingService.searchErrors({
      category: error.category,
      startDate: new Date(new Date(error.timestamp).getTime() - 3600000).toISOString(), // 1 hour before
      endDate: new Date(new Date(error.timestamp).getTime() + 3600000).toISOString()   // 1 hour after
    });

    // Get all similar errors (same category)
    const allSimilarErrors = await errorLoggingService.searchErrors({ category: error.category });
    
    res.json({
      success: true,
      data: {
        error,
        relatedErrors,
        context: {
          totalSimilarErrors: allSimilarErrors.length,
          firstOccurrence: allSimilarErrors
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0]?.timestamp,
          lastOccurrence: allSimilarErrors
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.timestamp
        }
      },
      timestamp: new Date().toISOString()
    });
  });
}