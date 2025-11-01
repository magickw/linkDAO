import { db } from '../db';
import { domainReputation, customBlacklist, urlAnalysisResults } from '../db/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';

export interface DomainReputationScore {
  domain: string;
  reputationScore: number;
  category?: string;
  isVerified: boolean;
  isBlacklisted: boolean;
  blacklistReason?: string;
  analysisCount: number;
  maliciousCount: number;
  firstSeen: Date;
  lastUpdated: Date;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  trustLevel: 'unknown' | 'low' | 'medium' | 'high' | 'verified';
}

export interface DomainAnalytics {
  domain: string;
  totalAnalyses: number;
  maliciousRate: number;
  averageRiskScore: number;
  recentTrend: 'improving' | 'stable' | 'declining';
  commonThreatTypes: string[];
  relatedDomains: string[];
}

export class DomainReputationService {
  private readonly REPUTATION_DECAY_FACTOR = 0.95; // Daily decay factor
  private readonly MIN_ANALYSES_FOR_TRUST = 10;
  private readonly VERIFIED_DOMAINS = new Set([
    'google.com', 'github.com', 'stackoverflow.com', 'wikipedia.org',
    'coinbase.com', 'binance.com', 'uniswap.org', 'ethereum.org',
    'bitcoin.org', 'metamask.io', 'opensea.io', 'discord.com',
    'twitter.com', 'reddit.com', 'youtube.com', 'medium.com'
  ]);

  /**
   * Get comprehensive domain reputation information
   */
  async getDomainReputation(domain: string): Promise<DomainReputationScore | null> {
    const normalizedDomain = this.normalizeDomain(domain);
    
    const [reputation] = await db
      .select()
      .from(domainReputation)
      .where(eq(domainReputation.domain, normalizedDomain))
      .limit(1);

    if (!reputation) {
      // Check if domain is in verified list
      if (this.VERIFIED_DOMAINS.has(normalizedDomain)) {
        return await this.createVerifiedDomainReputation(normalizedDomain);
      }
      return null;
    }

    const reputationScore = parseFloat(reputation.reputationScore || '50');
    
    return {
      domain: reputation.domain,
      reputationScore,
      category: reputation.category || undefined,
      isVerified: reputation.isVerified || false,
      isBlacklisted: reputation.isBlacklisted || false,
      blacklistReason: reputation.blacklistReason || undefined,
      analysisCount: reputation.analysisCount || 0,
      maliciousCount: reputation.maliciousCount || 0,
      firstSeen: reputation.firstSeen || new Date(),
      lastUpdated: reputation.lastUpdated || new Date(),
      riskLevel: this.calculateRiskLevel(reputationScore, reputation.maliciousCount || 0, reputation.analysisCount || 0),
      trustLevel: this.calculateTrustLevel(reputationScore, reputation.analysisCount || 0, reputation.isVerified || false),
    };
  }

  /**
   * Update domain reputation based on new analysis
   */
  async updateDomainReputation(
    domain: string, 
    analysisResult: {
      status: 'safe' | 'suspicious' | 'malicious';
      riskScore: number;
      threatTypes?: string[];
    }
  ): Promise<void> {
    const normalizedDomain = this.normalizeDomain(domain);
    const isMalicious = analysisResult.status === 'malicious';
    const reputationImpact = this.calculateReputationImpact(analysisResult);

    await db
      .insert(domainReputation)
      .values({
        domain: normalizedDomain,
        reputationScore: (100 - analysisResult.riskScore).toString(),
        category: this.inferDomainCategory(domain),
        analysisCount: 1,
        maliciousCount: isMalicious ? 1 : 0,
        firstSeen: new Date(),
        lastUpdated: new Date(),
      })
      .onConflictDoUpdate({
        target: domainReputation.domain,
        set: {
          reputationScore: sql`GREATEST(0, LEAST(100, ${domainReputation.reputationScore} + ${reputationImpact}))`,
          analysisCount: sql`${domainReputation.analysisCount} + 1`,
          maliciousCount: isMalicious ? sql`${domainReputation.maliciousCount} + 1` : sql`${domainReputation.maliciousCount}`,
          lastUpdated: new Date(),
        },
      });
  }

  /**
   * Bulk update domain reputations
   */
  async bulkUpdateReputations(
    updates: Array<{
      domain: string;
      status: 'safe' | 'suspicious' | 'malicious';
      riskScore: number;
      threatTypes?: string[];
    }>
  ): Promise<void> {
    for (const update of updates) {
      await this.updateDomainReputation(update.domain, update);
    }
  }

  /**
   * Get domain analytics and trends
   */
  async getDomainAnalytics(domain: string): Promise<DomainAnalytics | null> {
    const normalizedDomain = this.normalizeDomain(domain);
    
    // Get basic stats
    const [stats] = await db
      .select({
        totalAnalyses: sql<number>`COUNT(${urlAnalysisResults.id})`,
        averageRiskScore: sql<number>`AVG(CAST(${urlAnalysisResults.riskScore} AS NUMERIC))`,
      })
      .from(urlAnalysisResults)
      .where(eq(urlAnalysisResults.domain, normalizedDomain));

    if (!stats || stats.totalAnalyses === 0) {
      return null;
    }

    // Get malicious rate
    const [maliciousStats] = await db
      .select({
        maliciousCount: sql<number>`COUNT(${urlAnalysisResults.id})`,
      })
      .from(urlAnalysisResults)
      .where(
        and(
          eq(urlAnalysisResults.domain, normalizedDomain),
          eq(urlAnalysisResults.status, 'malicious')
        )
      );

    const maliciousRate = (maliciousStats?.maliciousCount || 0) / stats.totalAnalyses;

    // Get recent trend (last 30 days vs previous 30 days)
    const recentTrend = await this.calculateRecentTrend(normalizedDomain);

    // Get common threat types
    const commonThreatTypes = await this.getCommonThreatTypes(normalizedDomain);

    // Get related domains (same IP, similar names, etc.)
    const relatedDomains = await this.getRelatedDomains(normalizedDomain);

    return {
      domain: normalizedDomain,
      totalAnalyses: stats.totalAnalyses,
      maliciousRate,
      averageRiskScore: parseFloat(stats.averageRiskScore?.toString() || '0'),
      recentTrend,
      commonThreatTypes,
      relatedDomains,
    };
  }

  /**
   * Get top domains by reputation
   */
  async getTopDomains(
    limit = 100,
    category?: string
  ): Promise<DomainReputationScore[]> {
    const query = db
      .select()
      .from(domainReputation)
      .orderBy(desc(domainReputation.reputationScore))
      .limit(limit);

    if (category) {
      query.where(eq(domainReputation.category, category));
    }

    const results = await query;

    return results.map(reputation => ({
      domain: reputation.domain,
      reputationScore: parseFloat(reputation.reputationScore || '50'),
      category: reputation.category || undefined,
      isVerified: reputation.isVerified || false,
      isBlacklisted: reputation.isBlacklisted || false,
      blacklistReason: reputation.blacklistReason || undefined,
      analysisCount: reputation.analysisCount || 0,
      maliciousCount: reputation.maliciousCount || 0,
      firstSeen: reputation.firstSeen || new Date(),
      lastUpdated: reputation.lastUpdated || new Date(),
      riskLevel: this.calculateRiskLevel(
        parseFloat(reputation.reputationScore || '50'),
        reputation.maliciousCount || 0,
        reputation.analysisCount || 0
      ),
      trustLevel: this.calculateTrustLevel(
        parseFloat(reputation.reputationScore || '50'),
        reputation.analysisCount || 0,
        reputation.isVerified || false
      ),
    }));
  }

  /**
   * Mark domain as verified
   */
  async verifyDomain(domain: string, category?: string): Promise<void> {
    const normalizedDomain = this.normalizeDomain(domain);
    
    await db
      .insert(domainReputation)
      .values({
        domain: normalizedDomain,
        reputationScore: '95',
        category,
        isVerified: true,
        analysisCount: 0,
        maliciousCount: 0,
        firstSeen: new Date(),
        lastUpdated: new Date(),
      })
      .onConflictDoUpdate({
        target: domainReputation.domain,
        set: {
          isVerified: true,
          reputationScore: sql`GREATEST(${domainReputation.reputationScore}, 95)`,
          category: category || sql`${domainReputation.category}`,
          lastUpdated: new Date(),
        },
      });
  }

  /**
   * Blacklist a domain
   */
  async blacklistDomain(
    domain: string, 
    reason: string, 
    severity: 'low' | 'medium' | 'high' | 'critical' = 'high'
  ): Promise<void> {
    const normalizedDomain = this.normalizeDomain(domain);
    
    // Add to custom blacklist
    await db.insert(customBlacklist).values({
      entryType: 'domain',
      entryValue: normalizedDomain,
      category: 'manual_blacklist',
      severity,
      description: reason,
      source: 'manual',
      isActive: true,
    });

    // Update domain reputation
    await db
      .insert(domainReputation)
      .values({
        domain: normalizedDomain,
        reputationScore: '0',
        isBlacklisted: true,
        blacklistReason: reason,
        analysisCount: 0,
        maliciousCount: 1,
        firstSeen: new Date(),
        lastUpdated: new Date(),
      })
      .onConflictDoUpdate({
        target: domainReputation.domain,
        set: {
          isBlacklisted: true,
          blacklistReason: reason,
          reputationScore: '0',
          lastUpdated: new Date(),
        },
      });
  }

  /**
   * Apply daily reputation decay to prevent stale scores
   */
  async applyReputationDecay(): Promise<void> {
    await db
      .update(domainReputation)
      .set({
        reputationScore: sql`GREATEST(0, ${domainReputation.reputationScore} * ${this.REPUTATION_DECAY_FACTOR})`,
        lastUpdated: new Date(),
      })
      .where(
        sql`${domainReputation.lastUpdated} < NOW() - INTERVAL '1 day'`
      );
  }

  // Private helper methods

  private normalizeDomain(domain: string): string {
    return domain.toLowerCase().replace(/^www\./, '');
  }

  private calculateReputationImpact(analysisResult: {
    status: 'safe' | 'suspicious' | 'malicious';
    riskScore: number;
  }): number {
    switch (analysisResult.status) {
      case 'safe':
        return Math.min(5, (100 - analysisResult.riskScore) * 0.1);
      case 'suspicious':
        return -Math.min(10, analysisResult.riskScore * 0.2);
      case 'malicious':
        return -Math.min(30, analysisResult.riskScore * 0.5);
      default:
        return 0;
    }
  }

  private calculateRiskLevel(
    reputationScore: number, 
    maliciousCount: number, 
    totalCount: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    const maliciousRate = totalCount > 0 ? maliciousCount / totalCount : 0;

    if (reputationScore < 20 || maliciousRate > 0.5) {
      return 'critical';
    } else if (reputationScore < 40 || maliciousRate > 0.2) {
      return 'high';
    } else if (reputationScore < 60 || maliciousRate > 0.1) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private calculateTrustLevel(
    reputationScore: number, 
    analysisCount: number, 
    isVerified: boolean
  ): 'unknown' | 'low' | 'medium' | 'high' | 'verified' {
    if (isVerified) {
      return 'verified';
    }

    if (analysisCount < this.MIN_ANALYSES_FOR_TRUST) {
      return 'unknown';
    }

    if (reputationScore >= 80) {
      return 'high';
    } else if (reputationScore >= 60) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private inferDomainCategory(domain: string): string | undefined {
    const categoryPatterns = {
      'social': ['twitter.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'discord.com', 'telegram.org'],
      'crypto': ['coinbase.com', 'binance.com', 'kraken.com', 'uniswap.org', 'ethereum.org', 'bitcoin.org'],
      'defi': ['uniswap.org', 'compound.finance', 'aave.com', 'makerdao.com', 'yearn.finance'],
      'nft': ['opensea.io', 'rarible.com', 'foundation.app', 'superrare.com'],
      'news': ['coindesk.com', 'cointelegraph.com', 'decrypt.co', 'theblock.co'],
      'tech': ['github.com', 'stackoverflow.com', 'medium.com', 'dev.to'],
      'search': ['google.com', 'bing.com', 'duckduckgo.com'],
      'reference': ['wikipedia.org', 'docs.microsoft.com', 'developer.mozilla.org'],
    };

    for (const [category, domains] of Object.entries(categoryPatterns)) {
      if (domains.some(d => domain.includes(d) || d.includes(domain))) {
        return category;
      }
    }

    return undefined;
  }

  private async createVerifiedDomainReputation(domain: string): Promise<DomainReputationScore> {
    await this.verifyDomain(domain, this.inferDomainCategory(domain));
    
    return {
      domain,
      reputationScore: 95,
      category: this.inferDomainCategory(domain),
      isVerified: true,
      isBlacklisted: false,
      analysisCount: 0,
      maliciousCount: 0,
      firstSeen: new Date(),
      lastUpdated: new Date(),
      riskLevel: 'low',
      trustLevel: 'verified',
    };
  }

  private async calculateRecentTrend(domain: string): Promise<'improving' | 'stable' | 'declining'> {
    // Get average risk score for last 30 days
    const [recent] = await db
      .select({
        avgRisk: sql<number>`AVG(CAST(${urlAnalysisResults.riskScore} AS NUMERIC))`,
      })
      .from(urlAnalysisResults)
      .where(
        and(
          eq(urlAnalysisResults.domain, domain),
          sql`${urlAnalysisResults.createdAt} >= NOW() - INTERVAL '30 days'`
        )
      );

    // Get average risk score for previous 30 days
    const [previous] = await db
      .select({
        avgRisk: sql<number>`AVG(CAST(${urlAnalysisResults.riskScore} AS NUMERIC))`,
      })
      .from(urlAnalysisResults)
      .where(
        and(
          eq(urlAnalysisResults.domain, domain),
          sql`${urlAnalysisResults.createdAt} >= NOW() - INTERVAL '60 days'`,
          sql`${urlAnalysisResults.createdAt} < NOW() - INTERVAL '30 days'`
        )
      );

    const recentRisk = parseFloat(recent?.avgRisk?.toString() || '0');
    const previousRisk = parseFloat(previous?.avgRisk?.toString() || '0');

    if (Math.abs(recentRisk - previousRisk) < 5) {
      return 'stable';
    } else if (recentRisk < previousRisk) {
      return 'improving';
    } else {
      return 'declining';
    }
  }

  private async getCommonThreatTypes(domain: string): Promise<string[]> {
    // This would require parsing threat types from analysis results
    // For now, return empty array - implement based on actual vendor response structure
    return [];
  }

  private async getRelatedDomains(domain: string): Promise<string[]> {
    // Find domains with similar names or patterns
    const similarDomains = await db
      .select({ domain: domainReputation.domain })
      .from(domainReputation)
      .where(
        and(
          sql`${domainReputation.domain} != ${domain}`,
          or(
            sql`${domainReputation.domain} LIKE '%' || ${domain.split('.')[0]} || '%'`,
            sql`levenshtein(${domainReputation.domain}, ${domain}) < 3`
          )
        )
      )
      .limit(10);

    return similarDomains.map(d => d.domain);
  }
}
