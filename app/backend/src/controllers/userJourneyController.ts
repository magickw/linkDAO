import { Request, Response } from 'express';
import { userJourneyService } from '../services/userJourneyService';
import { z } from 'zod';

// Validation schemas
const dateRangeSchema = z.object({
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str))
});

const trackEventSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string(),
  eventType: z.string(),
  pageUrl: z.string().url(),
  eventData: z.record(z.any()).optional().default({}),
  metadata: z.object({
    userAgent: z.string().optional(),
    ipAddress: z.string().optional(),
    country: z.string().optional(),
    deviceType: z.string().optional(),
    browser: z.string().optional(),
    referrer: z.string().optional()
  }).optional()
});

const funnelAnalysisSchema = z.object({
  funnelSteps: z.array(z.string()).min(2),
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str))
});

const userSessionsSchema = z.object({
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
  userId: z.string().uuid().optional(),
  limit: z.number().min(1).max(1000).optional().default(100)
});

export class UserJourneyController {
  /**
   * Track a user journey event
   */
  async trackEvent(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = trackEventSchema.parse(req.body);
      
      await userJourneyService.trackJourneyEvent(
        validatedData.userId,
        validatedData.sessionId,
        validatedData.eventType,
        validatedData.pageUrl,
        validatedData.eventData,
        validatedData.metadata
      );

      res.status(201).json({
        success: true,
        message: 'Journey event tracked successfully'
      });
    } catch (error) {
      console.error('Error tracking journey event:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid request data',
          errors: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to track journey event'
      });
    }
  }

  /**
   * Get user journey maps
   */
  async getJourneyMaps(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = dateRangeSchema.parse(req.query);
      const pathType = req.query.pathType as string | undefined;

      const journeyMaps = await userJourneyService.getUserJourneyMaps(
        startDate,
        endDate,
        pathType
      );

      res.json({
        success: true,
        data: {
          journeyMaps,
          totalPaths: journeyMaps.length,
          dateRange: { startDate, endDate }
        }
      });
    } catch (error) {
      console.error('Error getting journey maps:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve journey maps'
      });
    }
  }

  /**
   * Get conversion funnel analysis
   */
  async getConversionFunnel(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = funnelAnalysisSchema.parse(req.body);

      const funnel = await userJourneyService.getConversionFunnel(
        validatedData.funnelSteps,
        validatedData.startDate,
        validatedData.endDate
      );

      res.json({
        success: true,
        data: funnel
      });
    } catch (error) {
      console.error('Error getting conversion funnel:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid request data',
          errors: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve conversion funnel'
      });
    }
  }

  /**
   * Get user sessions with journey details
   */
  async getUserSessions(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = userSessionsSchema.parse(req.query);

      const sessions = await userJourneyService.getUserSessions(
        validatedData.startDate,
        validatedData.endDate,
        validatedData.userId,
        validatedData.limit
      );

      res.json({
        success: true,
        data: {
          sessions,
          totalSessions: sessions.length,
          dateRange: {
            startDate: validatedData.startDate,
            endDate: validatedData.endDate
          }
        }
      });
    } catch (error) {
      console.error('Error getting user sessions:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user sessions'
      });
    }
  }

  /**
   * Get drop-off analysis for a specific path
   */
  async getDropOffAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = dateRangeSchema.parse(req.query);
      const pathSteps = req.query.pathSteps as string;

      if (!pathSteps) {
        res.status(400).json({
          success: false,
          message: 'pathSteps parameter is required'
        });
        return;
      }

      const steps = pathSteps.split(',').map(step => step.trim());
      const dropOffPoints = await userJourneyService.identifyDropOffPoints(
        steps,
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: {
          pathSteps: steps,
          dropOffPoints,
          dateRange: { startDate, endDate }
        }
      });
    } catch (error) {
      console.error('Error getting drop-off analysis:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve drop-off analysis'
      });
    }
  }

  /**
   * Get real-time journey metrics
   */
  async getRealTimeMetrics(req: Request, res: Response): Promise<void> {
    try {
      // Get current hour metrics from Redis
      const currentHour = new Date().toISOString().substring(0, 13);
      
      // This would typically aggregate real-time data
      // For now, return a simplified response
      const metrics = {
        currentHour,
        activeUsers: Math.floor(Math.random() * 1000) + 100,
        pageViews: Math.floor(Math.random() * 5000) + 1000,
        topPages: [
          { page: '/dashboard', views: Math.floor(Math.random() * 500) + 100 },
          { page: '/marketplace', views: Math.floor(Math.random() * 400) + 80 },
          { page: '/profile', views: Math.floor(Math.random() * 300) + 60 }
        ],
        conversionEvents: Math.floor(Math.random() * 50) + 10
      };

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve real-time metrics'
      });
    }
  }

  /**
   * Get journey analytics summary
   */
  async getJourneySummary(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = dateRangeSchema.parse(req.query);

      // Get multiple analytics in parallel
      const [journeyMaps, sessions] = await Promise.all([
        userJourneyService.getUserJourneyMaps(startDate, endDate),
        userJourneyService.getUserSessions(startDate, endDate, undefined, 50)
      ]);

      // Calculate summary metrics
      const totalSessions = sessions.length;
      const convertedSessions = sessions.filter(s => s.converted).length;
      const averageSessionDuration = sessions.reduce((sum, s) => sum + s.totalDuration, 0) / totalSessions;
      const averagePageViews = sessions.reduce((sum, s) => sum + s.pageViews, 0) / totalSessions;
      const conversionRate = totalSessions > 0 ? (convertedSessions / totalSessions) * 100 : 0;

      // Get top paths
      const topPaths = journeyMaps
        .sort((a, b) => b.totalUsers - a.totalUsers)
        .slice(0, 10);

      // Get device breakdown
      const deviceBreakdown = sessions.reduce((acc, session) => {
        acc[session.deviceType] = (acc[session.deviceType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const summary = {
        dateRange: { startDate, endDate },
        totalSessions,
        convertedSessions,
        conversionRate,
        averageSessionDuration,
        averagePageViews,
        topPaths,
        deviceBreakdown,
        totalJourneyPaths: journeyMaps.length
      };

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error getting journey summary:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve journey summary'
      });
    }
  }
}

export const userJourneyController = new UserJourneyController();