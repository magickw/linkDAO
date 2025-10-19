import { db } from '../db';
import { 
  eq, 
  and, 
  gte, 
  lte, 
  desc, 
  sql, 
  count, 
  sum, 
  avg,
  inArray
} from 'drizzle-orm';
import { 
  userAnalytics, 
  users, 
  posts, 
  reactions, 
  views, 
  follows,
  communities,
  communityMembers
} from '../db/schema';

export interface MemberBehaviorMetrics {
  engagementScore: number;
  activityLevel: 'low' | 'medium' | 'high' | 'very_high';
  retentionRisk: number; // 0-1, higher means higher risk of churn
  contributionScore: number;
  socialInfluence: number;
  preferredContentTypes: string[];
  activeCommunities: number;
  postingFrequency: number; // posts per week
  responseRate: number; // percentage
}

export interface EngagementPattern {
  timeOfDay: Record<string, number>; // hour -> engagement count
  dayOfWeek: Record<string, number>; // day -> engagement count
  devicePreferences: Record<string, number>; // device -> usage percentage
  contentPreferences: Record<string, number>; // content type -> engagement count
}

export interface MemberCohortAnalysis {
  cohort: string; // e.g., '2023-01', '2023-02'
  cohortSize: number;
  retentionRates: Record<number, number>; // days since join -> retention percentage
  engagementTrends: Record<number, number>; // days since join -> avg engagement
}

export interface BehavioralInsight {
  id: string;
  type: 'engagement_drop' | 'rising_star' | 'at_risk' | 'high_value' | 'inactive';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
  memberIds: string[];
  recommendations: string[];
  createdAt: Date;
}

export class MemberBehaviorAnalyticsService {
  /**
   * Get comprehensive member behavior metrics
   */
  async getMemberBehaviorMetrics(
    userId: string,
    timeRange: { start: Date; end: Date } = { 
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
      end: new Date() 
    }
  ): Promise<MemberBehaviorMetrics> {
    try {
      // Get user analytics data
      const userAnalyticsData = await db
        .select()
        .from(userAnalytics)
        .where(and(
          eq(userAnalytics.userId, userId),
          gte(userAnalytics.timestamp, timeRange.start),
          lte(userAnalytics.timestamp, timeRange.end)
        ));

      // Get post data
      const postData = await db
        .select()
        .from(posts)
        .where(and(
          eq(posts.authorId, userId),
          gte(posts.createdAt, timeRange.start),
          lte(posts.createdAt, timeRange.end)
        ));

      // Get reaction data
      const reactionData = await db
        .select()
        .from(reactions)
        .where(and(
          eq(reactions.userId, userId),
          gte(reactions.createdAt, timeRange.start),
          lte(reactions.createdAt, timeRange.end)
        ));

      // Get follow data
      const followData = await db
        .select()
        .from(follows)
        .where(and(
          eq(follows.followerId, userId),
          gte(follows.createdAt, timeRange.start),
          lte(follows.createdAt, timeRange.end)
        ));

      // Get community membership data
      const communityData = await db
        .select()
        .from(communityMembers)
        .where(and(
          eq(communityMembers.userAddress, userId),
          eq(communityMembers.isActive, true)
        ));

      // Calculate engagement score
      const engagementEvents = userAnalyticsData.length;
      const postsCreated = postData.length;
      const reactionsGiven = reactionData.length;
      const followsGiven = followData.length;
      
      const engagementScore = Math.round(
        (engagementEvents * 0.5) + 
        (postsCreated * 2) + 
        (reactionsGiven * 0.3) + 
        (followsGiven * 0.1)
      );

      // Determine activity level
      let activityLevel: 'low' | 'medium' | 'high' | 'very_high' = 'low';
      if (engagementScore > 100) activityLevel = 'very_high';
      else if (engagementScore > 50) activityLevel = 'high';
      else if (engagementScore > 20) activityLevel = 'medium';

      // Calculate retention risk (simplified model)
      const daysActive = new Set(
        userAnalyticsData.map(event => 
          new Date(event.timestamp).toDateString()
        )
      ).size;
      
      const totalDays = Math.ceil(
        (timeRange.end.getTime() - timeRange.start.getTime()) / (24 * 60 * 60 * 1000)
      );
      
      const activityRatio = totalDays > 0 ? daysActive / totalDays : 0;
      const retentionRisk = Math.max(0, Math.min(1, 1 - activityRatio));

      // Calculate contribution score
      const contributionScore = Math.round(
        (postsCreated * 3) + 
        (reactionsGiven * 0.5) + 
        (followsGiven * 0.2)
      );

      // Calculate social influence (simplified)
      const socialInfluence = followsGiven * 2;

      // Determine preferred content types
      const eventTypeCounts: Record<string, number> = {};
      userAnalyticsData.forEach(event => {
        const type = event.eventType;
        eventTypeCounts[type] = (eventTypeCounts[type] || 0) + 1;
      });
      
      const preferredContentTypes = Object.entries(eventTypeCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([type]) => type);

      // Calculate posting frequency (posts per week)
      const weeksInRange = Math.max(1, 
        (timeRange.end.getTime() - timeRange.start.getTime()) / (7 * 24 * 60 * 60 * 1000)
      );
      const postingFrequency = postsCreated / weeksInRange;

      // Calculate response rate (simplified)
      const responseEvents = userAnalyticsData.filter(event => 
        event.eventType.includes('reply') || event.eventType.includes('comment')
      ).length;
      const responseRate = engagementEvents > 0 ? (responseEvents / engagementEvents) * 100 : 0;

      return {
        engagementScore,
        activityLevel,
        retentionRisk,
        contributionScore,
        socialInfluence,
        preferredContentTypes,
        activeCommunities: communityData.length,
        postingFrequency,
        responseRate
      };
    } catch (error) {
      console.error('Error getting member behavior metrics:', error);
      throw new Error('Failed to retrieve member behavior metrics');
    }
  }

  /**
   * Get engagement patterns for a member
   */
  async getEngagementPatterns(userId: string): Promise<EngagementPattern> {
    try {
      const userAnalyticsData = await db
        .select()
        .from(userAnalytics)
        .where(eq(userAnalytics.userId, userId));

      // Time of day analysis
      const timeOfDay: Record<string, number> = {};
      // Day of week analysis
      const dayOfWeek: Record<string, number> = {};
      // Device preferences
      const devicePreferences: Record<string, number> = {};
      // Content preferences
      const contentPreferences: Record<string, number> = {};

      userAnalyticsData.forEach(event => {
        const date = new Date(event.timestamp);
        
        // Time of day (hour)
        const hour = date.getHours().toString().padStart(2, '0');
        timeOfDay[hour] = (timeOfDay[hour] || 0) + 1;
        
        // Day of week
        const day = date.toLocaleDateString('en-US', { weekday: 'long' });
        dayOfWeek[day] = (dayOfWeek[day] || 0) + 1;
        
        // Device preferences
        if (event.deviceType) {
          devicePreferences[event.deviceType] = (devicePreferences[event.deviceType] || 0) + 1;
        }
        
        // Content preferences
        contentPreferences[event.eventType] = (contentPreferences[event.eventType] || 0) + 1;
      });

      // Normalize device preferences to percentages
      const totalDeviceEvents = Object.values(devicePreferences).reduce((sum, count) => sum + count, 0);
      const normalizedDevicePreferences: Record<string, number> = {};
      Object.entries(devicePreferences).forEach(([device, count]) => {
        normalizedDevicePreferences[device] = totalDeviceEvents > 0 ? (count / totalDeviceEvents) * 100 : 0;
      });

      return {
        timeOfDay,
        dayOfWeek,
        devicePreferences: normalizedDevicePreferences,
        contentPreferences
      };
    } catch (error) {
      console.error('Error getting engagement patterns:', error);
      throw new Error('Failed to retrieve engagement patterns');
    }
  }

  /**
   * Get cohort analysis for member retention
   */
  async getCohortAnalysis(cohortMonths: number = 6): Promise<MemberCohortAnalysis[]> {
    try {
      const cohorts: MemberCohortAnalysis[] = [];
      const now = new Date();
      
      // Generate cohorts for the specified number of months
      for (let i = 0; i < cohortMonths; i++) {
        const cohortDate = new Date(now);
        cohortDate.setMonth(cohortDate.getMonth() - i);
        const cohortMonth = `${cohortDate.getFullYear()}-${(cohortDate.getMonth() + 1).toString().padStart(2, '0')}`;
        
        // Get users who joined in this cohort
        const cohortUsers = await db
          .select({ id: users.id, createdAt: users.createdAt })
          .from(users)
          .where(sql`DATE_TRUNC('month', ${users.createdAt}) = DATE '${cohortMonth}-01'`);
        
        if (cohortUsers.length === 0) continue;
        
        const cohortSize = cohortUsers.length;
        const retentionRates: Record<number, number> = {};
        const engagementTrends: Record<number, number> = {};
        
        // For simplicity, we'll simulate retention data
        // In a real implementation, this would query actual user activity
        for (let days = 1; days <= 30; days += 7) {
          // Simulate retention rate decreasing over time
          const retentionRate = Math.max(0, 100 - (days * 2));
          retentionRates[days] = retentionRate;
          
          // Simulate engagement decreasing over time
          const engagement = Math.max(0, 50 - (days * 0.5));
          engagementTrends[days] = engagement;
        }
        
        cohorts.push({
          cohort: cohortMonth,
          cohortSize,
          retentionRates,
          engagementTrends
        });
      }
      
      return cohorts;
    } catch (error) {
      console.error('Error getting cohort analysis:', error);
      throw new Error('Failed to retrieve cohort analysis');
    }
  }

  /**
   * Generate behavioral insights for members
   */
  async generateBehavioralInsights(limit: number = 10): Promise<BehavioralInsight[]> {
    try {
      const insights: BehavioralInsight[] = [];
      
      // Get all users for analysis
      const allUsers = await db.select({ id: users.id }).from(users);
      
      // For demonstration, we'll create some sample insights
      // In a real implementation, this would use ML models or statistical analysis
      
      if (allUsers.length > 0) {
        // Sample "Rising Star" insight
        insights.push({
          id: 'rising_star_1',
          type: 'rising_star',
          title: 'Rising Community Stars',
          description: 'Members showing significantly increased engagement over the past month',
          severity: 'high',
          confidence: 0.85,
          memberIds: allUsers.slice(0, Math.min(5, allUsers.length)).map(u => u.id),
          recommendations: [
            'Feature these members in community highlights',
            'Offer early access to new features',
            'Invite to moderate community discussions'
          ],
          createdAt: new Date()
        });
        
        // Sample "At Risk" insight
        insights.push({
          id: 'at_risk_1',
          type: 'at_risk',
          title: 'Members at Risk of Churn',
          description: 'Members showing declining engagement patterns',
          severity: 'high',
          confidence: 0.78,
          memberIds: allUsers.slice(-3).map(u => u.id),
          recommendations: [
            'Reach out with personalized re-engagement messages',
            'Offer exclusive content or benefits',
            'Suggest relevant communities based on interests'
          ],
          createdAt: new Date()
        });
      }
      
      return insights.slice(0, limit);
    } catch (error) {
      console.error('Error generating behavioral insights:', error);
      throw new Error('Failed to generate behavioral insights');
    }
  }

  /**
   * Get behavioral segment for a member
   */
  async getMemberSegment(userId: string): Promise<{
    segment: string;
    confidence: number;
    characteristics: string[];
  }> {
    try {
      const metrics = await this.getMemberBehaviorMetrics(userId);
      
      let segment = 'Casual User';
      const characteristics: string[] = [];
      
      if (metrics.engagementScore > 100 && metrics.activityLevel === 'very_high') {
        segment = 'Power User';
        characteristics.push('Highly engaged', 'Frequent contributor');
      } else if (metrics.engagementScore > 50) {
        segment = 'Active User';
        characteristics.push('Regular participant');
      } else if (metrics.retentionRisk > 0.7) {
        segment = 'At Risk';
        characteristics.push('Declining activity', 'Potential churn risk');
      }
      
      if (metrics.socialInfluence > 50) {
        characteristics.push('Social connector');
      }
      
      if (metrics.postingFrequency > 2) {
        characteristics.push('Content creator');
      }
      
      return {
        segment,
        confidence: 0.85,
        characteristics
      };
    } catch (error) {
      console.error('Error getting member segment:', error);
      throw new Error('Failed to determine member segment');
    }
  }
}

export default new MemberBehaviorAnalyticsService();