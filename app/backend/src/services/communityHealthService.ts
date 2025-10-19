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
  inArray,
  isNull
} from 'drizzle-orm';
import { 
  communities, 
  communityMembers, 
  communityStats, 
  posts, 
  reactions, 
  views,
  communityGovernanceProposals,
  communityGovernanceVotes,
  users
} from '../db/schema';

export interface CommunityHealthMetrics {
  communityId: string;
  name: string;
  displayName: string;
  memberCount: number;
  activeMembers: number;
  postCount: number;
  engagementRate: number;
  growthRate7d: number;
  growthRate30d: number;
  trendingScore: number;
  
  // Content health metrics
  posts7d: number;
  posts30d: number;
  avgPostsPerDay: number;
  contentDiversity: number; // 0-1 score
  
  // Member health metrics
  activeMembers7d: number;
  activeMembers30d: number;
  memberRetentionRate: number;
  newMembers7d: number;
  newMembers30d: number;
  
  // Governance health metrics
  totalProposals: number;
  activeProposals: number;
  proposalPassRate: number;
  avgVoterParticipation: number;
  governanceActivity: number; // 0-100 score
  
  // Quality metrics
  spamRate: number; // percentage
  moderationActions: number;
  avgResponseTime: number; // hours
  
  // Sentiment metrics
  sentimentScore: number; // -1 to 1
  positiveEngagement: number; // percentage
  
  // Health score
  healthScore: number; // 0-100 composite score
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  lastUpdated: Date;
}

export interface CommunityHealthTrend {
  date: Date;
  memberCount: number;
  activeMembers: number;
  postCount: number;
  engagementRate: number;
  trendingScore: number;
  governanceActivity: number;
}

export interface CommunityComparison {
  communityId: string;
  name: string;
  displayName: string;
  healthScore: number;
  memberCount: number;
  growthRate: number;
  engagementRate: number;
  governanceActivity: number;
  rank: number;
}

export interface HealthAlert {
  id: string;
  communityId: string;
  type: 'declining_members' | 'low_engagement' | 'inactive_governance' | 'spam_spike' | 'moderation_needed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  currentValue: number;
  threshold: number;
  createdAt: Date;
}

export class CommunityHealthService {
  /**
   * Get comprehensive health metrics for a community
   */
  async getCommunityHealthMetrics(communityId: string): Promise<CommunityHealthMetrics> {
    try {
      // Get community data
      const communityData = await db
        .select({
          id: communities.id,
          name: communities.name,
          displayName: communities.displayName,
          memberCount: communities.memberCount,
          postCount: communities.postCount
        })
        .from(communities)
        .where(eq(communities.id, communityId))
        .limit(1);

      if (communityData.length === 0) {
        throw new Error('Community not found');
      }

      const community = communityData[0];

      // Get community stats
      const statsData = await db
        .select()
        .from(communityStats)
        .where(eq(communityStats.communityId, communityId))
        .limit(1);

      const stats = statsData.length > 0 ? statsData[0] : {
        activeMembers7d: 0,
        activeMembers30d: 0,
        posts7d: 0,
        posts30d: 0,
        engagementRate: '0',
        growthRate7d: '0',
        growthRate30d: '0',
        trendingScore: '0'
      };

      // Get recent member data
      const recentMembers = await db
        .select({
          count: count(),
          joinedAt: communityMembers.joinedAt
        })
        .from(communityMembers)
        .where(and(
          eq(communityMembers.communityId, communityId),
          gte(communityMembers.joinedAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        ))
        .groupBy(communityMembers.joinedAt);

      const newMembers7d = recentMembers.filter(m => 
        new Date(m.joinedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).reduce((sum, m) => sum + m.count, 0);

      const newMembers30d = recentMembers.reduce((sum, m) => sum + m.count, 0);

      // Get governance data
      const governanceData = await db
        .select({
          total: count(),
          active: count(sql`CASE WHEN ${communityGovernanceProposals.status} = 'active' THEN 1 END`),
          passed: count(sql`CASE WHEN ${communityGovernanceProposals.status} = 'passed' THEN 1 END`)
        })
        .from(communityGovernanceProposals)
        .where(eq(communityGovernanceProposals.communityId, communityId));

      const totalProposals = governanceData[0]?.total || 0;
      const activeProposals = governanceData[0]?.active || 0;
      const passedProposals = governanceData[0]?.passed || 0;
      const proposalPassRate = totalProposals > 0 ? (passedProposals / totalProposals) * 100 : 0;

      // Get voting data
      const votingData = await db
        .select({
          totalVotes: count(),
          uniqueVoters: count(sql`DISTINCT ${communityGovernanceVotes.voterAddress}`)
        })
        .from(communityGovernanceVotes)
        .innerJoin(communityGovernanceProposals, 
          eq(communityGovernanceVotes.proposalId, communityGovernanceProposals.id))
        .where(eq(communityGovernanceProposals.communityId, communityId));

      const totalVotes = votingData[0]?.totalVotes || 0;
      const uniqueVoters = votingData[0]?.uniqueVoters || 0;
      const avgVoterParticipation = activeProposals > 0 ? uniqueVoters / activeProposals : 0;

      // Calculate governance activity score (0-100)
      const governanceActivity = Math.round(
        (activeProposals * 10) + 
        (proposalPassRate * 0.5) + 
        (avgVoterParticipation * 20)
      );

      // Calculate content diversity (simplified)
      const contentDiversity = Math.min(1, (stats.posts7d / 7) / 10);

      // Calculate member retention (simplified)
      const memberRetentionRate = community.memberCount > 0 ? 
        ((community.memberCount - newMembers30d) / community.memberCount) * 100 : 0;

      // Calculate average posts per day (last 7 days)
      const avgPostsPerDay = stats.posts7d / 7;

      // Calculate health score (weighted composite)
      const healthScore = Math.round(
        (parseFloat(stats.engagementRate.toString()) * 25) + 
        (parseFloat(stats.growthRate7d.toString()) * 20) + 
        (governanceActivity * 0.3) + 
        (contentDiversity * 15) + 
        (memberRetentionRate * 0.2)
      );

      // Determine health status
      let healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' = 'fair';
      if (healthScore >= 80) healthStatus = 'excellent';
      else if (healthScore >= 60) healthStatus = 'good';
      else if (healthScore >= 40) healthStatus = 'fair';
      else if (healthScore >= 20) healthStatus = 'poor';
      else healthStatus = 'critical';

      // Placeholder values for metrics that would require more complex analysis
      const spamRate = 2.5; // percentage
      const moderationActions = 12;
      const avgResponseTime = 4.2; // hours
      const sentimentScore = 0.3; // -1 to 1
      const positiveEngagement = 78; // percentage

      return {
        communityId,
        name: community.name,
        displayName: community.displayName,
        memberCount: community.memberCount,
        activeMembers: stats.activeMembers7d,
        postCount: community.postCount,
        engagementRate: parseFloat(stats.engagementRate.toString()),
        growthRate7d: parseFloat(stats.growthRate7d.toString()),
        growthRate30d: parseFloat(stats.growthRate30d.toString()),
        trendingScore: parseFloat(stats.trendingScore.toString()),
        posts7d: stats.posts7d,
        posts30d: stats.posts30d,
        avgPostsPerDay,
        contentDiversity,
        activeMembers7d: stats.activeMembers7d,
        activeMembers30d: stats.activeMembers30d,
        memberRetentionRate,
        newMembers7d,
        newMembers30d,
        totalProposals,
        activeProposals,
        proposalPassRate,
        avgVoterParticipation,
        governanceActivity,
        spamRate,
        moderationActions,
        avgResponseTime,
        sentimentScore,
        positiveEngagement,
        healthScore,
        healthStatus,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting community health metrics:', error);
      throw new Error('Failed to retrieve community health metrics');
    }
  }

  /**
   * Get health trends over time for a community
   */
  async getCommunityHealthTrends(
    communityId: string,
    days: number = 30
  ): Promise<CommunityHealthTrend[]> {
    try {
      const trends: CommunityHealthTrend[] = [];
      const endDate = new Date();
      
      // Generate daily trends for the specified period
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        
        // In a real implementation, this would query historical data
        // For now, we'll generate simulated data based on current metrics
        const baseMetrics = await this.getCommunityHealthMetrics(communityId);
        
        // Apply some variation to simulate trends
        const variation = (Math.random() - 0.5) * 0.2; // -10% to +10% variation
        
        trends.push({
          date,
          memberCount: Math.max(0, Math.round(baseMetrics.memberCount * (1 + variation))),
          activeMembers: Math.max(0, Math.round(baseMetrics.activeMembers * (1 + variation))),
          postCount: Math.max(0, Math.round(baseMetrics.postCount * (1 + variation))),
          engagementRate: Math.max(0, Math.min(100, baseMetrics.engagementRate * (1 + variation))),
          trendingScore: Math.max(0, baseMetrics.trendingScore * (1 + variation)),
          governanceActivity: Math.max(0, Math.min(100, baseMetrics.governanceActivity * (1 + variation)))
        });
      }
      
      return trends;
    } catch (error) {
      console.error('Error getting community health trends:', error);
      throw new Error('Failed to retrieve community health trends');
    }
  }

  /**
   * Get community health comparisons
   */
  async getCommunityComparisons(
    limit: number = 10,
    sortBy: 'health' | 'members' | 'growth' | 'engagement' = 'health'
  ): Promise<CommunityComparison[]> {
    try {
      // Get top communities by the specified sort criteria
      let orderBy;
      switch (sortBy) {
        case 'health':
          orderBy = desc(communityStats.trendingScore);
          break;
        case 'members':
          orderBy = desc(communities.memberCount);
          break;
        case 'growth':
          orderBy = desc(communityStats.growthRate7d);
          break;
        case 'engagement':
          orderBy = desc(communityStats.engagementRate);
          break;
        default:
          orderBy = desc(communityStats.trendingScore);
      }

      const communityData = await db
        .select({
          id: communities.id,
          name: communities.name,
          displayName: communities.displayName,
          memberCount: communities.memberCount,
          trendingScore: communityStats.trendingScore,
          growthRate7d: communityStats.growthRate7d,
          engagementRate: communityStats.engagementRate
        })
        .from(communities)
        .leftJoin(communityStats, eq(communities.id, communityStats.communityId))
        .where(eq(communities.isPublic, true))
        .orderBy(orderBy)
        .limit(limit);

      // Convert to comparison format and add rankings
      const comparisons: CommunityComparison[] = communityData.map((community, index) => ({
        communityId: community.id,
        name: community.name,
        displayName: community.displayName,
        healthScore: parseFloat(community.trendingScore?.toString() || '0'),
        memberCount: community.memberCount,
        growthRate: parseFloat(community.growthRate7d?.toString() || '0'),
        engagementRate: parseFloat(community.engagementRate?.toString() || '0'),
        governanceActivity: 50, // Placeholder
        rank: index + 1
      }));

      return comparisons;
    } catch (error) {
      console.error('Error getting community comparisons:', error);
      throw new Error('Failed to retrieve community comparisons');
    }
  }

  /**
   * Get health alerts for communities
   */
  async getHealthAlerts(
    communityId?: string,
    severity?: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<HealthAlert[]> {
    try {
      const alerts: HealthAlert[] = [];
      
      // Define alert rules
      const alertRules = [
        {
          type: 'declining_members' as const,
          check: (metrics: CommunityHealthMetrics) => metrics.growthRate7d < -5,
          severity: 'high' as const,
          message: 'Member count declining rapidly'
        },
        {
          type: 'low_engagement' as const,
          check: (metrics: CommunityHealthMetrics) => metrics.engagementRate < 2,
          severity: 'medium' as const,
          message: 'Low community engagement'
        },
        {
          type: 'inactive_governance' as const,
          check: (metrics: CommunityHealthMetrics) => metrics.activeProposals === 0 && metrics.totalProposals > 5,
          severity: 'medium' as const,
          message: 'Governance activity has stalled'
        }
      ];

      // If specific community requested, check only that one
      if (communityId) {
        const metrics = await this.getCommunityHealthMetrics(communityId);
        
        alertRules.forEach(rule => {
          if (rule.check(metrics)) {
            alerts.push({
              id: `alert_${communityId}_${rule.type}`,
              communityId,
              type: rule.type,
              severity: rule.severity,
              title: rule.message,
              description: `Community health metric below threshold: ${rule.type}`,
              currentValue: this.getAlertValue(metrics, rule.type),
              threshold: this.getAlertThreshold(rule.type),
              createdAt: new Date()
            });
          }
        });
      } else {
        // Check all communities (limited for performance)
        const communitiesData = await db
          .select({ id: communities.id })
          .from(communities)
          .where(eq(communities.isPublic, true))
          .limit(50); // Limit for performance
        
        for (const community of communitiesData) {
          try {
            const metrics = await this.getCommunityHealthMetrics(community.id);
            
            alertRules.forEach(rule => {
              if (rule.check(metrics)) {
                alerts.push({
                  id: `alert_${community.id}_${rule.type}`,
                  communityId: community.id,
                  type: rule.type,
                  severity: rule.severity,
                  title: rule.message,
                  description: `Community health metric below threshold: ${rule.type}`,
                  currentValue: this.getAlertValue(metrics, rule.type),
                  threshold: this.getAlertThreshold(rule.type),
                  createdAt: new Date()
                });
              }
            });
          } catch (error) {
            // Skip communities that fail to load metrics
            continue;
          }
        }
      }

      // Filter by severity if specified
      if (severity) {
        return alerts.filter(alert => alert.severity === severity);
      }

      return alerts;
    } catch (error) {
      console.error('Error getting health alerts:', error);
      throw new Error('Failed to retrieve health alerts');
    }
  }

  /**
   * Get real-time community health snapshot
   */
  async getRealTimeHealthSnapshot(): Promise<{
    totalCommunities: number;
    avgHealthScore: number;
    healthyCommunities: number;
    atRiskCommunities: number;
    criticalCommunities: number;
    topGrowingCommunity: CommunityComparison | null;
    mostActiveCommunity: CommunityComparison | null;
  }> {
    try {
      // Get total communities
      const totalResult = await db
        .select({ count: count() })
        .from(communities)
        .where(eq(communities.isPublic, true));
      
      const totalCommunities = totalResult[0].count;

      // Get community health data
      const healthData = await db
        .select({
          id: communities.id,
          name: communities.name,
          displayName: communities.displayName,
          memberCount: communities.memberCount,
          trendingScore: communityStats.trendingScore,
          growthRate7d: communityStats.growthRate7d,
          engagementRate: communityStats.engagementRate
        })
        .from(communities)
        .leftJoin(communityStats, eq(communities.id, communityStats.communityId))
        .where(eq(communities.isPublic, true))
        .limit(100); // Limit for performance

      // Calculate health scores and categorize
      let totalHealthScore = 0;
      let healthyCount = 0;
      let atRiskCount = 0;
      let criticalCount = 0;
      let topGrowing: any = null;
      let mostActive: any = null;

      for (const community of healthData) {
        const healthScore = parseFloat(community.trendingScore?.toString() || '0');
        totalHealthScore += healthScore;

        if (healthScore >= 70) {
          healthyCount++;
        } else if (healthScore >= 40) {
          atRiskCount++;
        } else {
          criticalCount++;
        }

        // Track top growing community
        const growthRate = parseFloat(community.growthRate7d?.toString() || '0');
        if (!topGrowing || growthRate > parseFloat(topGrowing.growthRate7d?.toString() || '0')) {
          topGrowing = community;
        }

        // Track most active community
        const engagementRate = parseFloat(community.engagementRate?.toString() || '0');
        if (!mostActive || engagementRate > parseFloat(mostActive.engagementRate?.toString() || '0')) {
          mostActive = community;
        }
      }

      const avgHealthScore = totalCommunities > 0 ? totalHealthScore / totalCommunities : 0;

      return {
        totalCommunities,
        avgHealthScore: Math.round(avgHealthScore),
        healthyCommunities: healthyCount,
        atRiskCommunities: atRiskCount,
        criticalCommunities: criticalCount,
        topGrowingCommunity: topGrowing ? {
          communityId: topGrowing.id,
          name: topGrowing.name,
          displayName: topGrowing.displayName,
          healthScore: parseFloat(topGrowing.trendingScore?.toString() || '0'),
          memberCount: topGrowing.memberCount,
          growthRate: parseFloat(topGrowing.growthRate7d?.toString() || '0'),
          engagementRate: parseFloat(topGrowing.engagementRate?.toString() || '0'),
          governanceActivity: 50, // Placeholder
          rank: 1
        } : null,
        mostActiveCommunity: mostActive ? {
          communityId: mostActive.id,
          name: mostActive.name,
          displayName: mostActive.displayName,
          healthScore: parseFloat(mostActive.trendingScore?.toString() || '0'),
          memberCount: mostActive.memberCount,
          growthRate: parseFloat(mostActive.growthRate7d?.toString() || '0'),
          engagementRate: parseFloat(mostActive.engagementRate?.toString() || '0'),
          governanceActivity: 50, // Placeholder
          rank: 1
        } : null
      };
    } catch (error) {
      console.error('Error getting real-time health snapshot:', error);
      throw new Error('Failed to retrieve real-time health snapshot');
    }
  }

  // Helper methods
  private getAlertValue(metrics: CommunityHealthMetrics, type: string): number {
    switch (type) {
      case 'declining_members':
        return metrics.growthRate7d;
      case 'low_engagement':
        return metrics.engagementRate;
      case 'inactive_governance':
        return metrics.activeProposals;
      default:
        return 0;
    }
  }

  private getAlertThreshold(type: string): number {
    switch (type) {
      case 'declining_members':
        return -5;
      case 'low_engagement':
        return 2;
      case 'inactive_governance':
        return 1;
      default:
        return 0;
    }
  }
}

export default new CommunityHealthService();