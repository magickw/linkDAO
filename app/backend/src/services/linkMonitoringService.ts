import { db } from '../db/index.js';
import { 
  linkMonitoringAlerts, 
  urlAnalysisResults, 
  contentLinks, 
  domainReputation 
} from '../db/schema.js';
import { eq, and, or, desc, sql, count, inArray } from 'drizzle-orm';
import { LinkSafetyService } from './linkSafetyService.js';
import { DomainReputationService } from './domainReputationService.js';

export interface MonitoringAlert {
  id: number;
  urlAnalysisId: number;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedContentCount: number;
  isResolved: boolean;
  createdAt: Date;
  resolvedAt?: Date;
  url?: string;
  domain?: string;
}

export interface MonitoringStats {
  totalActiveAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  alertsByType: Record<string, number>;
  recentTrends: {
    newAlertsLast24h: number;
    resolvedAlertsLast24h: number;
    averageResolutionTime: number;
  };
}

export interface ContentImpactAssessment {
  contentId: string;
  contentType: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  affectedUrls: string[];
  recommendedAction: 'monitor' | 'flag' | 'quarantine' | 'remove';
  reasoning: string;
}

export class LinkMonitoringService {
  private linkSafetyService: LinkSafetyService;
  private domainReputationService: DomainReputationService;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly MONITORING_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
  private readonly REANALYSIS_THRESHOLD_HOURS = 168; // 1 week

  constructor() {
    this.linkSafetyService = new LinkSafetyService();
    this.domainReputationService = new DomainReputationService();
  }

  /**
   * Start real-time link monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      console.log('Link monitoring already running');
      return;
    }

    console.log('Starting real-time link monitoring');
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performMonitoringCycle();
      } catch (error) {
        console.error('Error in monitoring cycle:', error);
      }
    }, this.MONITORING_INTERVAL_MS);

    // Run initial monitoring cycle
    this.performMonitoringCycle().catch(console.error);
  }

  /**
   * Stop real-time link monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Link monitoring stopped');
    }
  }

  /**
   * Perform a complete monitoring cycle
   */
  async performMonitoringCycle(): Promise<void> {
    console.log('Starting link monitoring cycle');

    try {
      // 1. Re-analyze stale URLs
      await this.reanalyzeStaleUrls();

      // 2. Check for domain reputation changes
      await this.checkDomainReputationChanges();

      // 3. Monitor for new threats
      await this.monitorForNewThreats();

      // 4. Update content risk assessments
      await this.updateContentRiskAssessments();

      // 5. Clean up resolved alerts
      await this.cleanupResolvedAlerts();

      console.log('Link monitoring cycle completed');
    } catch (error) {
      console.error('Error in monitoring cycle:', error);
    }
  }

  /**
   * Get all active monitoring alerts
   */
  async getActiveAlerts(
    severity?: 'low' | 'medium' | 'high' | 'critical',
    alertType?: string,
    limit = 100
  ): Promise<MonitoringAlert[]> {
    let query = db
      .select({
        alert: linkMonitoringAlerts,
        url: urlAnalysisResults.url,
        domain: urlAnalysisResults.domain,
      })
      .from(linkMonitoringAlerts)
      .leftJoin(urlAnalysisResults, eq(linkMonitoringAlerts.urlAnalysisId, urlAnalysisResults.id))
      .where(eq(linkMonitoringAlerts.isResolved, false))
      .orderBy(desc(linkMonitoringAlerts.createdAt))
      .limit(limit);

    if (severity) {
      query = query.where(
        and(
          eq(linkMonitoringAlerts.isResolved, false),
          eq(linkMonitoringAlerts.severity, severity)
        )
      );
    }

    if (alertType) {
      query = query.where(
        and(
          eq(linkMonitoringAlerts.isResolved, false),
          eq(linkMonitoringAlerts.alertType, alertType)
        )
      );
    }

    const results = await query;

    return results.map(result => ({
      id: result.alert.id,
      urlAnalysisId: result.alert.urlAnalysisId || 0,
      alertType: result.alert.alertType,
      severity: result.alert.severity as any,
      description: result.alert.description || '',
      affectedContentCount: result.alert.affectedContentCount || 0,
      isResolved: result.alert.isResolved || false,
      createdAt: result.alert.createdAt || new Date(),
      resolvedAt: result.alert.resolvedAt || undefined,
      url: result.url || undefined,
      domain: result.domain || undefined,
    }));
  }

  /**
   * Get monitoring statistics
   */
  async getMonitoringStats(): Promise<MonitoringStats> {
    // Get alert counts by severity
    const [alertCounts] = await db
      .select({
        total: count(linkMonitoringAlerts.id),
        critical: sql<number>`COUNT(CASE WHEN ${linkMonitoringAlerts.severity} = 'critical' THEN 1 END)`,
        high: sql<number>`COUNT(CASE WHEN ${linkMonitoringAlerts.severity} = 'high' THEN 1 END)`,
        medium: sql<number>`COUNT(CASE WHEN ${linkMonitoringAlerts.severity} = 'medium' THEN 1 END)`,
        low: sql<number>`COUNT(CASE WHEN ${linkMonitoringAlerts.severity} = 'low' THEN 1 END)`,
      })
      .from(linkMonitoringAlerts)
      .where(eq(linkMonitoringAlerts.isResolved, false));

    // Get alert counts by type
    const alertsByType = await db
      .select({
        alertType: linkMonitoringAlerts.alertType,
        count: count(linkMonitoringAlerts.id),
      })
      .from(linkMonitoringAlerts)
      .where(eq(linkMonitoringAlerts.isResolved, false))
      .groupBy(linkMonitoringAlerts.alertType);

    // Get recent trends
    const [recentTrends] = await db
      .select({
        newLast24h: sql<number>`COUNT(CASE WHEN ${linkMonitoringAlerts.createdAt} >= NOW() - INTERVAL '24 hours' THEN 1 END)`,
        resolvedLast24h: sql<number>`COUNT(CASE WHEN ${linkMonitoringAlerts.resolvedAt} >= NOW() - INTERVAL '24 hours' THEN 1 END)`,
        avgResolutionTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${linkMonitoringAlerts.resolvedAt} - ${linkMonitoringAlerts.createdAt})) / 3600)`,
      })
      .from(linkMonitoringAlerts);

    return {
      totalActiveAlerts: alertCounts?.total || 0,
      criticalAlerts: alertCounts?.critical || 0,
      highAlerts: alertCounts?.high || 0,
      mediumAlerts: alertCounts?.medium || 0,
      lowAlerts: alertCounts?.low || 0,
      alertsByType: Object.fromEntries(
        alertsByType.map(item => [item.alertType, item.count])
      ),
      recentTrends: {
        newAlertsLast24h: recentTrends?.newLast24h || 0,
        resolvedAlertsLast24h: recentTrends?.resolvedLast24h || 0,
        averageResolutionTime: recentTrends?.avgResolutionTime || 0,
      },
    };
  }

  /**
   * Assess content impact for specific content
   */
  async assessContentImpact(contentId: string, contentType: string): Promise<ContentImpactAssessment> {
    // Get all links associated with this content
    const contentLinkResults = await db
      .select({
        link: contentLinks,
        analysis: urlAnalysisResults,
      })
      .from(contentLinks)
      .leftJoin(urlAnalysisResults, eq(contentLinks.urlAnalysisId, urlAnalysisResults.id))
      .where(
        and(
          eq(contentLinks.contentId, contentId),
          eq(contentLinks.contentType, contentType)
        )
      );

    if (contentLinkResults.length === 0) {
      return {
        contentId,
        contentType,
        riskLevel: 'low',
        affectedUrls: [],
        recommendedAction: 'monitor',
        reasoning: 'No links found in content',
      };
    }

    const urls = contentLinkResults.map(r => r.analysis?.url).filter(Boolean) as string[];
    const riskScores = contentLinkResults
      .map(r => parseFloat(r.analysis?.riskScore || '0'))
      .filter(score => !isNaN(score));

    const maxRiskScore = Math.max(...riskScores, 0);
    const avgRiskScore = riskScores.length > 0 ? riskScores.reduce((a, b) => a + b, 0) / riskScores.length : 0;
    const maliciousCount = contentLinkResults.filter(r => r.analysis?.status === 'malicious').length;
    const suspiciousCount = contentLinkResults.filter(r => r.analysis?.status === 'suspicious').length;

    // Calculate overall risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    let recommendedAction: 'monitor' | 'flag' | 'quarantine' | 'remove';
    let reasoning: string;

    if (maliciousCount > 0) {
      riskLevel = 'critical';
      recommendedAction = 'remove';
      reasoning = `Contains ${maliciousCount} malicious link(s)`;
    } else if (maxRiskScore >= 80 || suspiciousCount >= 3) {
      riskLevel = 'high';
      recommendedAction = 'quarantine';
      reasoning = `High risk score (${maxRiskScore.toFixed(1)}) or multiple suspicious links`;
    } else if (maxRiskScore >= 50 || suspiciousCount >= 1) {
      riskLevel = 'medium';
      recommendedAction = 'flag';
      reasoning = `Medium risk score (${maxRiskScore.toFixed(1)}) or suspicious links detected`;
    } else {
      riskLevel = 'low';
      recommendedAction = 'monitor';
      reasoning = `Low risk score (${avgRiskScore.toFixed(1)})`;
    }

    return {
      contentId,
      contentType,
      riskLevel,
      affectedUrls: urls,
      recommendedAction,
      reasoning,
    };
  }

  /**
   * Resolve a monitoring alert
   */
  async resolveAlert(alertId: number, resolution?: string): Promise<void> {
    await db
      .update(linkMonitoringAlerts)
      .set({
        isResolved: true,
        resolvedAt: new Date(),
        description: resolution ? 
          sql`${linkMonitoringAlerts.description} || ' | Resolution: ' || ${resolution}` : 
          linkMonitoringAlerts.description,
      })
      .where(eq(linkMonitoringAlerts.id, alertId));
  }

  /**
   * Create a new monitoring alert
   */
  async createAlert(
    urlAnalysisId: number,
    alertType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string
  ): Promise<void> {
    // Count affected content
    const [contentCount] = await db
      .select({ count: count(contentLinks.id) })
      .from(contentLinks)
      .where(eq(contentLinks.urlAnalysisId, urlAnalysisId));

    await db.insert(linkMonitoringAlerts).values({
      urlAnalysisId,
      alertType,
      severity,
      description,
      affectedContentCount: contentCount?.count || 0,
      isResolved: false,
    });
  }

  // Private helper methods

  private async reanalyzeStaleUrls(): Promise<void> {
    // Get URLs that haven't been analyzed recently
    const staleUrls = await db
      .select()
      .from(urlAnalysisResults)
      .where(
        sql`${urlAnalysisResults.lastAnalyzed} < NOW() - INTERVAL '${this.REANALYSIS_THRESHOLD_HOURS} hours'`
      )
      .limit(50); // Process in batches

    for (const urlResult of staleUrls) {
      try {
        const newAnalysis = await this.linkSafetyService.analyzeUrl(urlResult.url, true);
        
        // Check for significant changes
        if (this.hasSignificantChange(urlResult, newAnalysis)) {
          await this.createAlert(
            newAnalysis.id,
            'reputation_change',
            this.calculateAlertSeverity(urlResult.status, newAnalysis.status),
            `URL ${urlResult.url} status changed from ${urlResult.status} to ${newAnalysis.status}`
          );
        }
      } catch (error) {
        console.error(`Error reanalyzing URL ${urlResult.url}:`, error);
      }
    }
  }

  private async checkDomainReputationChanges(): Promise<void> {
    // Get domains with recent reputation changes
    const recentDomains = await db
      .select()
      .from(domainReputation)
      .where(
        sql`${domainReputation.lastUpdated} >= NOW() - INTERVAL '24 hours'`
      )
      .limit(100);

    for (const domain of recentDomains) {
      const analytics = await this.domainReputationService.getDomainAnalytics(domain.domain);
      
      if (analytics && analytics.recentTrend === 'declining') {
        // Find all URLs from this domain
        const domainUrls = await db
          .select()
          .from(urlAnalysisResults)
          .where(eq(urlAnalysisResults.domain, domain.domain))
          .limit(10);

        for (const urlResult of domainUrls) {
          await this.createAlert(
            urlResult.id,
            'domain_reputation_decline',
            'medium',
            `Domain ${domain.domain} reputation declining (trend: ${analytics.recentTrend})`
          );
        }
      }
    }
  }

  private async monitorForNewThreats(): Promise<void> {
    // Check for newly identified threats in recent analyses
    const recentAnalyses = await db
      .select()
      .from(urlAnalysisResults)
      .where(
        and(
          sql`${urlAnalysisResults.createdAt} >= NOW() - INTERVAL '1 hour'`,
          or(
            eq(urlAnalysisResults.status, 'malicious'),
            eq(urlAnalysisResults.status, 'suspicious')
          )
        )
      );

    for (const analysis of recentAnalyses) {
      const riskScore = parseFloat(analysis.riskScore || '0');
      
      if (riskScore >= 80) {
        await this.createAlert(
          analysis.id,
          'new_threat_detected',
          'high',
          `New high-risk threat detected: ${analysis.url} (risk: ${riskScore})`
        );
      }
    }
  }

  private async updateContentRiskAssessments(): Promise<void> {
    // Get content with links that have changed status
    const affectedContent = await db
      .select({
        contentId: contentLinks.contentId,
        contentType: contentLinks.contentType,
      })
      .from(contentLinks)
      .leftJoin(urlAnalysisResults, eq(contentLinks.urlAnalysisId, urlAnalysisResults.id))
      .where(
        sql`${urlAnalysisResults.updatedAt} >= NOW() - INTERVAL '1 hour'`
      )
      .groupBy(contentLinks.contentId, contentLinks.contentType);

    for (const content of affectedContent) {
      const assessment = await this.assessContentImpact(content.contentId, content.contentType);
      
      if (assessment.riskLevel === 'critical' || assessment.riskLevel === 'high') {
        // Create alert for high-risk content
        const [urlAnalysis] = await db
          .select()
          .from(urlAnalysisResults)
          .leftJoin(contentLinks, eq(urlAnalysisResults.id, contentLinks.urlAnalysisId))
          .where(
            and(
              eq(contentLinks.contentId, content.contentId),
              eq(contentLinks.contentType, content.contentType)
            )
          )
          .limit(1);

        if (urlAnalysis) {
          await this.createAlert(
            urlAnalysis.url_analysis_results.id,
            'content_risk_escalation',
            assessment.riskLevel === 'critical' ? 'critical' : 'high',
            `Content ${content.contentType}:${content.contentId} risk escalated: ${assessment.reasoning}`
          );
        }
      }
    }
  }

  private async cleanupResolvedAlerts(): Promise<void> {
    // Auto-resolve old low-severity alerts
    await db
      .update(linkMonitoringAlerts)
      .set({
        isResolved: true,
        resolvedAt: new Date(),
        description: sql`${linkMonitoringAlerts.description} || ' | Auto-resolved: aged out'`,
      })
      .where(
        and(
          eq(linkMonitoringAlerts.isResolved, false),
          eq(linkMonitoringAlerts.severity, 'low'),
          sql`${linkMonitoringAlerts.createdAt} < NOW() - INTERVAL '7 days'`
        )
      );
  }

  private hasSignificantChange(oldResult: any, newResult: any): boolean {
    return oldResult.status !== newResult.status || 
           Math.abs(parseFloat(oldResult.riskScore || '0') - newResult.riskScore) > 20;
  }

  private calculateAlertSeverity(oldStatus: string, newStatus: string): 'low' | 'medium' | 'high' | 'critical' {
    if (oldStatus === 'safe' && newStatus === 'malicious') return 'critical';
    if (oldStatus === 'safe' && newStatus === 'suspicious') return 'high';
    if (oldStatus === 'suspicious' && newStatus === 'malicious') return 'high';
    if (oldStatus === 'malicious' && newStatus === 'safe') return 'medium';
    return 'low';
  }
}