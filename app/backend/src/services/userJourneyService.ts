import { db } from '../db/connection';
import { sql } from 'drizzle-orm';
import { Redis } from 'ioredis';

export interface UserJourneyStep {
  step: string;
  stepOrder: number;
  users: number;
  dropoffRate: number;
  conversionRate: number;
  averageTimeSpent: number;
  timestamp: Date;
}

export interface JourneyMap {
  pathId: string;
  pathName: string;
  steps: UserJourneyStep[];
  totalUsers: number;
  overallConversionRate: number;
  averageDuration: number;
  dropOffPoints: DropOffPoint[];
}

export interface DropOffPoint {
  stepName: string;
  stepOrder: number;
  dropoffRate: number;
  usersLost: number;
  commonExitPages: string[];
  suggestedImprovements: string[];
}

export interface ConversionFunnel {
  funnelName: string;
  steps: FunnelStep[];
  overallConversionRate: number;
  totalEntries: number;
  totalConversions: number;
}

export interface FunnelStep {
  stepName: string;
  stepOrder: number;
  users: number;
  conversionRate: number;
  dropoffRate: number;
  averageTimeToNext: number;
}

export interface UserSession {
  sessionId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  totalDuration: number;
  pageViews: number;
  events: SessionEvent[];
  deviceType: string;
  browser: string;
  country?: string;
  converted: boolean;
  conversionValue?: number;
}

export interface SessionEvent {
  eventType: string;
  pageUrl: string;
  timestamp: Date;
  eventData: any;
  timeFromStart: number;
}

export class UserJourneyService {
  private redis: Redis;
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Track a user journey event
   */
  async trackJourneyEvent(
    userId: string,
    sessionId: string,
    eventType: string,
    pageUrl: string,
    eventData: any = {},
    metadata?: {
      userAgent?: string;
      ipAddress?: string;
      country?: string;
      deviceType?: string;
      browser?: string;
      referrer?: string;
    }
  ): Promise<void> {
    try {
      // Insert the event into user_analytics table
      await db.execute(sql`
        INSERT INTO user_analytics (
          user_id, session_id, event_type, event_data,
          page_url, user_agent, ip_address, country,
          device_type, browser, referrer, timestamp
        ) VALUES (
          ${userId}, ${sessionId}, ${eventType}, ${JSON.stringify(eventData)},
          ${pageUrl}, ${metadata?.userAgent}, ${metadata?.ipAddress}, ${metadata?.country},
          ${metadata?.deviceType}, ${metadata?.browser}, ${metadata?.referrer}, NOW()
        )
      `);

      // Update real-time journey metrics
      await this.updateRealTimeJourneyMetrics(eventType, pageUrl);
    } catch (error) {
      console.error('Error tracking journey event:', error);
      throw new Error('Failed to track user journey event');
    }
  }

  /**
   * Get user journey maps for a specific time period
   */
  async getUserJourneyMaps(
    startDate: Date,
    endDate: Date,
    pathType?: string
  ): Promise<JourneyMap[]> {
    try {
      const cacheKey = `journey:maps:${startDate.toISOString()}:${endDate.toISOString()}:${pathType || 'all'}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Get journey paths using SQL window functions
      const journeyData = await db.execute(sql`
        WITH user_sessions AS (
          SELECT 
            user_id,
            session_id,
            event_type,
            page_url,
            timestamp,
            ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY timestamp) as step_order,
            LEAD(timestamp) OVER (PARTITION BY session_id ORDER BY timestamp) as next_timestamp
          FROM user_analytics
          WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}
          AND event_type IN ('page_view', 'click', 'form_submit', 'purchase', 'signup')
        ),
        journey_paths AS (
          SELECT 
            session_id,
            user_id,
            STRING_AGG(page_url, ' -> ' ORDER BY step_order) as path,
            COUNT(*) as steps,
            MIN(timestamp) as start_time,
            MAX(timestamp) as end_time,
            EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) as duration_seconds
          FROM user_sessions
          GROUP BY session_id, user_id
        ),
        path_analysis AS (
          SELECT 
            path,
            COUNT(*) as user_count,
            AVG(duration_seconds) as avg_duration,
            COUNT(CASE WHEN path LIKE '%purchase%' OR path LIKE '%checkout%' THEN 1 END) as conversions
          FROM journey_paths
          WHERE steps >= 2
          GROUP BY path
          HAVING COUNT(*) >= 5  -- Only include paths with at least 5 users
        )
        SELECT 
          path,
          user_count,
          avg_duration,
          conversions,
          CASE WHEN user_count > 0 THEN (conversions::float / user_count::float * 100) ELSE 0 END as conversion_rate
        FROM path_analysis
        ORDER BY user_count DESC
        LIMIT 20
      `);

      const journeyMaps: JourneyMap[] = [];

      for (const row of journeyData) {
        const pathSteps = String(row.path).split(' -> ');
        const steps = await this.getDetailedStepAnalysis(pathSteps, startDate, endDate);
        const dropOffPoints = await this.identifyDropOffPoints(pathSteps, startDate, endDate);

        journeyMaps.push({
          pathId: this.generatePathId(String(row.path)),
          pathName: this.generatePathName(pathSteps),
          steps,
          totalUsers: Number(row.user_count),
          overallConversionRate: Number(row.conversion_rate),
          averageDuration: Number(row.avg_duration),
          dropOffPoints
        });
      }

      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(journeyMaps));
      return journeyMaps;
    } catch (error) {
      console.error('Error getting user journey maps:', error);
      throw new Error('Failed to retrieve user journey maps');
    }
  }

  /**
   * Get conversion funnel analysis
   */
  async getConversionFunnel(
    funnelSteps: string[],
    startDate: Date,
    endDate: Date
  ): Promise<ConversionFunnel> {
    try {
      const cacheKey = `funnel:${funnelSteps.join(',')}:${startDate.toISOString()}:${endDate.toISOString()}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const funnelData = await db.execute(sql`
        WITH funnel_events AS (
          SELECT 
            user_id,
            session_id,
            event_type,
            page_url,
            timestamp,
            CASE 
              ${sql.raw(funnelSteps.map((step, index) => 
                `WHEN page_url LIKE '%${step}%' THEN ${index + 1}`
              ).join(' '))}
              ELSE 0
            END as funnel_step
          FROM user_analytics
          WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}
          AND (${sql.raw(funnelSteps.map(step => `page_url LIKE '%${step}%'`).join(' OR '))})
        ),
        user_funnel_progress AS (
          SELECT 
            user_id,
            session_id,
            MAX(funnel_step) as max_step_reached,
            MIN(timestamp) as first_step_time,
            MAX(timestamp) as last_step_time
          FROM funnel_events
          WHERE funnel_step > 0
          GROUP BY user_id, session_id
        ),
        step_analysis AS (
          SELECT 
            generate_series(1, ${funnelSteps.length}) as step_number,
            COUNT(CASE WHEN max_step_reached >= generate_series(1, ${funnelSteps.length}) THEN 1 END) as users_at_step
          FROM user_funnel_progress
          GROUP BY step_number
        )
        SELECT 
          step_number,
          users_at_step,
          LAG(users_at_step) OVER (ORDER BY step_number) as prev_step_users
        FROM step_analysis
        ORDER BY step_number
      `);

      const steps: FunnelStep[] = [];
      let totalEntries = 0;
      let totalConversions = 0;

      for (let i = 0; i < funnelData.length; i++) {
        const row = funnelData[i];
        const stepNumber = Number(row.step_number);
        const usersAtStep = Number(row.users_at_step);
        const prevStepUsers = Number(row.prev_step_users) || usersAtStep;

        if (stepNumber === 1) {
          totalEntries = usersAtStep;
        }
        if (stepNumber === funnelSteps.length) {
          totalConversions = usersAtStep;
        }

        const conversionRate = prevStepUsers > 0 ? (usersAtStep / prevStepUsers) * 100 : 0;
        const dropoffRate = prevStepUsers > 0 ? ((prevStepUsers - usersAtStep) / prevStepUsers) * 100 : 0;

        // Get average time to next step
        const avgTimeToNext = await this.getAverageTimeToNextStep(
          funnelSteps[stepNumber - 1],
          stepNumber < funnelSteps.length ? funnelSteps[stepNumber] : null,
          startDate,
          endDate
        );

        steps.push({
          stepName: funnelSteps[stepNumber - 1],
          stepOrder: stepNumber,
          users: usersAtStep,
          conversionRate,
          dropoffRate,
          averageTimeToNext: avgTimeToNext
        });
      }

      const overallConversionRate = totalEntries > 0 ? (totalConversions / totalEntries) * 100 : 0;

      const funnel: ConversionFunnel = {
        funnelName: `${funnelSteps[0]} to ${funnelSteps[funnelSteps.length - 1]}`,
        steps,
        overallConversionRate,
        totalEntries,
        totalConversions
      };

      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(funnel));
      return funnel;
    } catch (error) {
      console.error('Error getting conversion funnel:', error);
      throw new Error('Failed to retrieve conversion funnel');
    }
  }

  /**
   * Get user sessions with detailed journey information
   */
  async getUserSessions(
    startDate: Date,
    endDate: Date,
    userId?: string,
    limit: number = 100
  ): Promise<UserSession[]> {
    try {
      const userFilter = userId ? sql`AND user_id = ${userId}` : sql``;
      
      const sessionData = await db.execute(sql`
        WITH session_summary AS (
          SELECT 
            session_id,
            user_id,
            MIN(timestamp) as start_time,
            MAX(timestamp) as end_time,
            EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) as duration_seconds,
            COUNT(*) as page_views,
            MAX(device_type) as device_type,
            MAX(browser) as browser,
            MAX(country) as country,
            BOOL_OR(event_type IN ('purchase', 'order_complete', 'signup_complete')) as converted,
            SUM(CASE WHEN event_type = 'purchase' THEN (event_data->>'amount')::numeric ELSE 0 END) as conversion_value
          FROM user_analytics
          WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}
          ${userFilter}
          GROUP BY session_id, user_id
        )
        SELECT *
        FROM session_summary
        ORDER BY start_time DESC
        LIMIT ${limit}
      `);

      const sessions: UserSession[] = [];

      for (const row of sessionData) {
        // Get detailed events for this session
        const events = await this.getSessionEvents(String(row.session_id));

        sessions.push({
          sessionId: String(row.session_id),
          userId: String(row.user_id),
          startTime: new Date(row.start_time),
          endTime: row.end_time ? new Date(row.end_time) : undefined,
          totalDuration: Number(row.duration_seconds),
          pageViews: Number(row.page_views),
          events,
          deviceType: String(row.device_type || 'unknown'),
          browser: String(row.browser || 'unknown'),
          country: row.country ? String(row.country) : undefined,
          converted: Boolean(row.converted),
          conversionValue: row.conversion_value ? Number(row.conversion_value) : undefined
        });
      }

      return sessions;
    } catch (error) {
      console.error('Error getting user sessions:', error);
      throw new Error('Failed to retrieve user sessions');
    }
  }

  /**
   * Identify drop-off points in user journeys
   */
  async identifyDropOffPoints(
    pathSteps: string[],
    startDate: Date,
    endDate: Date
  ): Promise<DropOffPoint[]> {
    try {
      const dropOffPoints: DropOffPoint[] = [];

      for (let i = 0; i < pathSteps.length - 1; i++) {
        const currentStep = pathSteps[i];
        const nextStep = pathSteps[i + 1];

        const dropOffData = await db.execute(sql`
          WITH step_transitions AS (
            SELECT 
              session_id,
              user_id,
              BOOL_OR(page_url LIKE '%' || ${currentStep} || '%') as reached_current,
              BOOL_OR(page_url LIKE '%' || ${nextStep} || '%') as reached_next
            FROM user_analytics
            WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}
            GROUP BY session_id, user_id
          ),
          dropoff_analysis AS (
            SELECT 
              COUNT(CASE WHEN reached_current THEN 1 END) as users_at_current,
              COUNT(CASE WHEN reached_current AND reached_next THEN 1 END) as users_continued,
              COUNT(CASE WHEN reached_current AND NOT reached_next THEN 1 END) as users_dropped
            FROM step_transitions
          )
          SELECT 
            users_at_current,
            users_continued,
            users_dropped,
            CASE WHEN users_at_current > 0 THEN (users_dropped::float / users_at_current::float * 100) ELSE 0 END as dropoff_rate
          FROM dropoff_analysis
        `);

        if (dropOffData.length > 0) {
          const row = dropOffData[0];
          const dropoffRate = Number(row.dropoff_rate);

          if (dropoffRate > 20) { // Only include significant drop-off points
            // Get common exit pages for users who dropped off
            const exitPages = await this.getCommonExitPages(currentStep, startDate, endDate);
            
            dropOffPoints.push({
              stepName: currentStep,
              stepOrder: i + 1,
              dropoffRate,
              usersLost: Number(row.users_dropped),
              commonExitPages: exitPages,
              suggestedImprovements: this.generateImprovementSuggestions(currentStep, dropoffRate)
            });
          }
        }
      }

      return dropOffPoints;
    } catch (error) {
      console.error('Error identifying drop-off points:', error);
      return [];
    }
  }

  // Private helper methods

  private async getDetailedStepAnalysis(
    pathSteps: string[],
    startDate: Date,
    endDate: Date
  ): Promise<UserJourneyStep[]> {
    const steps: UserJourneyStep[] = [];

    for (let i = 0; i < pathSteps.length; i++) {
      const step = pathSteps[i];
      
      const stepData = await db.execute(sql`
        WITH step_metrics AS (
          SELECT 
            COUNT(DISTINCT user_id) as users,
            AVG(EXTRACT(EPOCH FROM (
              LEAD(timestamp) OVER (PARTITION BY session_id ORDER BY timestamp) - timestamp
            ))) as avg_time_spent
          FROM user_analytics
          WHERE page_url LIKE '%' || ${step} || '%'
          AND timestamp >= ${startDate} AND timestamp <= ${endDate}
        )
        SELECT users, avg_time_spent FROM step_metrics
      `);

      const row = stepData[0];
      const users = Number(row?.users) || 0;
      const avgTimeSpent = Number(row?.avg_time_spent) || 0;

      // Calculate conversion rate (simplified - could be more sophisticated)
      const conversionRate = i === pathSteps.length - 1 ? 100 : 
        (i < pathSteps.length - 1 ? 80 - (i * 10) : 0); // Mock calculation

      // Calculate drop-off rate
      const dropoffRate = i === 0 ? 0 : (i * 15); // Mock calculation

      steps.push({
        step,
        stepOrder: i + 1,
        users,
        dropoffRate,
        conversionRate,
        averageTimeSpent: avgTimeSpent,
        timestamp: new Date()
      });
    }

    return steps;
  }

  private async getSessionEvents(sessionId: string): Promise<SessionEvent[]> {
    try {
      const eventData = await db.execute(sql`
        SELECT 
          event_type,
          page_url,
          timestamp,
          event_data,
          EXTRACT(EPOCH FROM (timestamp - MIN(timestamp) OVER (PARTITION BY session_id))) as time_from_start
        FROM user_analytics
        WHERE session_id = ${sessionId}
        ORDER BY timestamp
      `);

      return eventData.map(row => ({
        eventType: String(row.event_type),
        pageUrl: String(row.page_url),
        timestamp: new Date(row.timestamp),
        eventData: row.event_data,
        timeFromStart: Number(row.time_from_start)
      }));
    } catch (error) {
      console.error('Error getting session events:', error);
      return [];
    }
  }

  private async getAverageTimeToNextStep(
    currentStep: string,
    nextStep: string | null,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    if (!nextStep) return 0;

    try {
      const result = await db.execute(sql`
        WITH step_transitions AS (
          SELECT 
            session_id,
            MIN(CASE WHEN page_url LIKE '%' || ${currentStep} || '%' THEN timestamp END) as current_time,
            MIN(CASE WHEN page_url LIKE '%' || ${nextStep} || '%' THEN timestamp END) as next_time
          FROM user_analytics
          WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}
          AND (page_url LIKE '%' || ${currentStep} || '%' OR page_url LIKE '%' || ${nextStep} || '%')
          GROUP BY session_id
          HAVING MIN(CASE WHEN page_url LIKE '%' || ${currentStep} || '%' THEN timestamp END) IS NOT NULL
          AND MIN(CASE WHEN page_url LIKE '%' || ${nextStep} || '%' THEN timestamp END) IS NOT NULL
        )
        SELECT AVG(EXTRACT(EPOCH FROM (next_time - current_time))) as avg_time
        FROM step_transitions
        WHERE next_time > current_time
      `);

      return Number(result[0]?.avg_time) || 0;
    } catch (error) {
      console.error('Error getting average time to next step:', error);
      return 0;
    }
  }

  private async getCommonExitPages(
    step: string,
    startDate: Date,
    endDate: Date
  ): Promise<string[]> {
    try {
      const result = await db.execute(sql`
        WITH user_last_pages AS (
          SELECT 
            session_id,
            page_url,
            ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY timestamp DESC) as rn
          FROM user_analytics
          WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}
          AND session_id IN (
            SELECT DISTINCT session_id 
            FROM user_analytics 
            WHERE page_url LIKE '%' || ${step} || '%'
            AND timestamp >= ${startDate} AND timestamp <= ${endDate}
          )
        )
        SELECT page_url, COUNT(*) as exit_count
        FROM user_last_pages
        WHERE rn = 1
        GROUP BY page_url
        ORDER BY exit_count DESC
        LIMIT 5
      `);

      return result.map(row => String(row.page_url));
    } catch (error) {
      console.error('Error getting common exit pages:', error);
      return [];
    }
  }

  private generatePathId(path: string): string {
    return Buffer.from(path).toString('base64').substring(0, 16);
  }

  private generatePathName(steps: string[]): string {
    if (steps.length <= 3) {
      return steps.join(' → ');
    }
    return `${steps[0]} → ... → ${steps[steps.length - 1]} (${steps.length} steps)`;
  }

  private generateImprovementSuggestions(step: string, dropoffRate: number): string[] {
    const suggestions: string[] = [];

    if (dropoffRate > 50) {
      suggestions.push('Critical: Review page load time and user experience');
      suggestions.push('Consider A/B testing different page layouts');
    } else if (dropoffRate > 30) {
      suggestions.push('Optimize page content and call-to-action placement');
      suggestions.push('Review form complexity and required fields');
    } else if (dropoffRate > 20) {
      suggestions.push('Minor optimization opportunities available');
    }

    if (step.includes('checkout') || step.includes('payment')) {
      suggestions.push('Review payment options and security indicators');
      suggestions.push('Consider guest checkout option');
    }

    if (step.includes('signup') || step.includes('register')) {
      suggestions.push('Simplify registration process');
      suggestions.push('Add social login options');
    }

    return suggestions;
  }

  private async updateRealTimeJourneyMetrics(eventType: string, pageUrl: string): Promise<void> {
    try {
      // Update real-time metrics in Redis
      const hourKey = `journey:hourly:${new Date().toISOString().substring(0, 13)}`;
      const eventKey = `${hourKey}:${eventType}`;
      const pageKey = `${hourKey}:page:${pageUrl}`;

      await Promise.all([
        this.redis.incr(eventKey),
        this.redis.incr(pageKey),
        this.redis.expire(eventKey, 3600), // 1 hour TTL
        this.redis.expire(pageKey, 3600)
      ]);
    } catch (error) {
      console.error('Error updating real-time journey metrics:', error);
    }
  }
}

export const userJourneyService = new UserJourneyService();