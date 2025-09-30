import { db } from '../db';
import { 
  urlAnalysisResults, 
  domainReputation, 
  customBlacklist, 
  linkSafetyVendorResults,
  contentLinks,
  linkMonitoringAlerts
} from '../db/schema';
import { eq, and, or, desc, sql, inArray } from 'drizzle-orm';
import crypto from 'crypto';
import { URL } from 'url';

export interface LinkAnalysisResult {
  id: number;
  url: string;
  domain: string;
  status: 'safe' | 'suspicious' | 'malicious' | 'pending' | 'error';
  riskScore: number;
  analysisResults: Record<string, any>;
  unfurledContent?: {
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
  };
  lastAnalyzed: Date;
}

export interface DomainReputationInfo {
  domain: string;
  reputationScore: number;
  category?: string;
  isVerified: boolean;
  isBlacklisted: boolean;
  blacklistReason?: string;
  analysisCount: number;
  maliciousCount: number;
}

export interface VendorAnalysisResult {
  vendor: string;
  status: 'safe' | 'malicious' | 'suspicious' | 'error';
  threatTypes: string[];
  confidence: number;
  analysisTimeMs: number;
  rawResponse: Record<string, any>;
}

export class LinkSafetyService {
  private readonly CACHE_DURATION_HOURS = 24;
  private readonly REANALYSIS_THRESHOLD_HOURS = 168; // 1 week

  /**
   * Analyze a URL for safety using multiple vendors and custom rules
   */
  async analyzeUrl(url: string, forceReanalysis = false): Promise<LinkAnalysisResult> {
    try {
      const normalizedUrl = this.normalizeUrl(url);
      const urlHash = this.generateUrlHash(normalizedUrl);
      const domain = this.extractDomain(normalizedUrl);

      // Check if we have recent analysis
      if (!forceReanalysis) {
        const existingAnalysis = await this.getExistingAnalysis(urlHash);
        if (existingAnalysis && this.isAnalysisRecent(existingAnalysis.lastAnalyzed)) {
          return existingAnalysis;
        }
      }

      // Check custom blacklist first
      const blacklistResult = await this.checkCustomBlacklist(normalizedUrl, domain);
      if (blacklistResult.isBlacklisted) {
        return await this.saveAnalysisResult({
          url: normalizedUrl,
          urlHash,
          domain,
          status: 'malicious',
          riskScore: 100,
          analysisResults: { blacklist: blacklistResult },
          unfurledContent: {},
        });
      }

      // Run vendor analysis in parallel
      const vendorResults = await this.runVendorAnalysis(normalizedUrl);
      
      // Unfurl content for additional context
      const unfurledContent = await this.unfurlUrl(normalizedUrl);

      // Calculate overall risk score and status
      const { status, riskScore } = this.calculateOverallRisk(vendorResults, domain);

      // Save analysis result
      const result = await this.saveAnalysisResult({
        url: normalizedUrl,
        urlHash,
        domain,
        status,
        riskScore,
        analysisResults: { vendors: vendorResults },
        unfurledContent,
      });

      // Save vendor results
      await this.saveVendorResults(result.id, vendorResults);

      // Update domain reputation
      await this.updateDomainReputation(domain, status, riskScore);

      return result;
    } catch (error) {
      console.error('Error analyzing URL:', error);
      throw new Error(`Failed to analyze URL: ${error.message}`);
    }
  }

  /**
   * Batch analyze multiple URLs
   */
  async analyzeUrls(urls: string[]): Promise<LinkAnalysisResult[]> {
    const results = await Promise.allSettled(
      urls.map(url => this.analyzeUrl(url))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<LinkAnalysisResult> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  }

  /**
   * Extract and analyze all URLs from content
   */
  async analyzeContentLinks(
    contentId: string, 
    contentType: string, 
    content: string
  ): Promise<LinkAnalysisResult[]> {
    const urls = this.extractUrlsFromContent(content);
    if (urls.length === 0) return [];

    const analysisResults = await this.analyzeUrls(urls.map(u => u.url));
    
    // Save content-link associations
    await this.saveContentLinkAssociations(contentId, contentType, urls, analysisResults);

    return analysisResults;
  }

  /**
   * Get domain reputation information
   */
  async getDomainReputation(domain: string): Promise<DomainReputationInfo | null> {
    const [reputation] = await db
      .select()
      .from(domainReputation)
      .where(eq(domainReputation.domain, domain))
      .limit(1);

    if (!reputation) return null;

    return {
      domain: reputation.domain,
      reputationScore: parseFloat(reputation.reputationScore || '50'),
      category: reputation.category || undefined,
      isVerified: reputation.isVerified || false,
      isBlacklisted: reputation.isBlacklisted || false,
      blacklistReason: reputation.blacklistReason || undefined,
      analysisCount: reputation.analysisCount || 0,
      maliciousCount: reputation.maliciousCount || 0,
    };
  }

  /**
   * Add entry to custom blacklist
   */
  async addToBlacklist(
    entryType: 'domain' | 'url' | 'pattern',
    entryValue: string,
    category: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    description?: string,
    addedBy?: string
  ): Promise<void> {
    await db.insert(customBlacklist).values({
      entryType,
      entryValue,
      category,
      severity,
      description,
      source: 'manual',
      addedBy,
      isActive: true,
    });
  }

  /**
   * Monitor links in real-time for reputation changes
   */
  async monitorLinksForChanges(): Promise<void> {
    // Get URLs that need re-analysis (older than threshold)
    const staleUrls = await db
      .select()
      .from(urlAnalysisResults)
      .where(
        sql`${urlAnalysisResults.lastAnalyzed} < NOW() - INTERVAL '${this.REANALYSIS_THRESHOLD_HOURS} hours'`
      )
      .limit(100);

    for (const urlResult of staleUrls) {
      try {
        const newAnalysis = await this.analyzeUrl(urlResult.url, true);
        
        // Check if status changed significantly
        if (this.hasSignificantChange(urlResult, newAnalysis)) {
          await this.createMonitoringAlert(
            newAnalysis.id,
            'reputation_change',
            `Domain ${newAnalysis.domain} reputation changed from ${urlResult.status} to ${newAnalysis.status}`,
            this.calculateAlertSeverity(urlResult.status, newAnalysis.status)
          );
        }
      } catch (error) {
        console.error(`Error monitoring URL ${urlResult.url}:`, error);
      }
    }
  }

  // Private helper methods

  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove tracking parameters and fragments
      urlObj.hash = '';
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'];
      trackingParams.forEach(param => urlObj.searchParams.delete(param));
      return urlObj.toString();
    } catch {
      return url; // Return original if parsing fails
    }
  }

  private generateUrlHash(url: string): string {
    return crypto.createHash('sha256').update(url).digest('hex');
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  private async getExistingAnalysis(urlHash: string): Promise<LinkAnalysisResult | null> {
    const [result] = await db
      .select()
      .from(urlAnalysisResults)
      .where(eq(urlAnalysisResults.urlHash, urlHash))
      .limit(1);

    if (!result) return null;

    return {
      id: result.id,
      url: result.url,
      domain: result.domain,
      status: result.status as any,
      riskScore: parseFloat(result.riskScore || '0'),
      analysisResults: JSON.parse(result.analysisResults || '{}'),
      unfurledContent: JSON.parse(result.unfurledContent || '{}'),
      lastAnalyzed: result.lastAnalyzed || new Date(),
    };
  }

  private isAnalysisRecent(lastAnalyzed: Date): boolean {
    const hoursSinceAnalysis = (Date.now() - lastAnalyzed.getTime()) / (1000 * 60 * 60);
    return hoursSinceAnalysis < this.CACHE_DURATION_HOURS;
  }

  private async checkCustomBlacklist(url: string, domain: string): Promise<{
    isBlacklisted: boolean;
    reason?: string;
    severity?: string;
  }> {
    const blacklistEntries = await db
      .select()
      .from(customBlacklist)
      .where(
        and(
          eq(customBlacklist.isActive, true),
          or(
            and(eq(customBlacklist.entryType, 'url'), eq(customBlacklist.entryValue, url)),
            and(eq(customBlacklist.entryType, 'domain'), eq(customBlacklist.entryValue, domain)),
            and(eq(customBlacklist.entryType, 'pattern'), sql`${url} ~ ${customBlacklist.entryValue}`)
          )
        )
      );

    if (blacklistEntries.length > 0) {
      const highestSeverity = blacklistEntries.reduce((max, entry) => {
        const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
        return severityOrder[entry.severity as keyof typeof severityOrder] > 
               severityOrder[max.severity as keyof typeof severityOrder] ? entry : max;
      });

      return {
        isBlacklisted: true,
        reason: highestSeverity.description || 'Custom blacklist match',
        severity: highestSeverity.severity || 'medium',
      };
    }

    return { isBlacklisted: false };
  }

  private async runVendorAnalysis(url: string): Promise<VendorAnalysisResult[]> {
    const results: VendorAnalysisResult[] = [];

    // Google Safe Browsing (mock implementation - replace with actual API)
    try {
      const googleResult = await this.analyzeWithGoogleSafeBrowsing(url);
      results.push(googleResult);
    } catch (error) {
      console.error('Google Safe Browsing analysis failed:', error);
    }

    // PhishFort (mock implementation - replace with actual API)
    try {
      const phishfortResult = await this.analyzeWithPhishFort(url);
      results.push(phishfortResult);
    } catch (error) {
      console.error('PhishFort analysis failed:', error);
    }

    return results;
  }

  private async analyzeWithGoogleSafeBrowsing(url: string): Promise<VendorAnalysisResult> {
    const startTime = Date.now();
    
    // Mock implementation - replace with actual Google Safe Browsing API
    const mockResult = {
      vendor: 'google_safe_browsing',
      status: 'safe' as const,
      threatTypes: [],
      confidence: 95,
      analysisTimeMs: Date.now() - startTime,
      rawResponse: { status: 'safe', threats: [] },
    };

    return mockResult;
  }

  private async analyzeWithPhishFort(url: string): Promise<VendorAnalysisResult> {
    const startTime = Date.now();
    
    // Mock implementation - replace with actual PhishFort API
    const mockResult = {
      vendor: 'phishfort',
      status: 'safe' as const,
      threatTypes: [],
      confidence: 90,
      analysisTimeMs: Date.now() - startTime,
      rawResponse: { status: 'safe', category: 'legitimate' },
    };

    return mockResult;
  }

  private async unfurlUrl(url: string): Promise<Record<string, any>> {
    try {
      // Mock implementation - replace with actual URL unfurling
      return {
        title: 'Sample Title',
        description: 'Sample description',
        image: null,
        siteName: this.extractDomain(url),
      };
    } catch (error) {
      console.error('URL unfurling failed:', error);
      return {};
    }
  }

  private calculateOverallRisk(
    vendorResults: VendorAnalysisResult[], 
    domain: string
  ): { status: 'safe' | 'suspicious' | 'malicious', riskScore: number } {
    if (vendorResults.length === 0) {
      return { status: 'safe', riskScore: 0 };
    }

    const maliciousCount = vendorResults.filter(r => r.status === 'malicious').length;
    const suspiciousCount = vendorResults.filter(r => r.status === 'suspicious').length;
    const totalVendors = vendorResults.length;

    // Calculate weighted risk score
    let riskScore = 0;
    vendorResults.forEach(result => {
      const weight = result.confidence / 100;
      if (result.status === 'malicious') {
        riskScore += 100 * weight;
      } else if (result.status === 'suspicious') {
        riskScore += 50 * weight;
      }
    });

    riskScore = Math.min(100, riskScore / totalVendors);

    // Determine status based on consensus
    if (maliciousCount > totalVendors / 2) {
      return { status: 'malicious', riskScore: Math.max(80, riskScore) };
    } else if (suspiciousCount > 0 || riskScore > 30) {
      return { status: 'suspicious', riskScore };
    } else {
      return { status: 'safe', riskScore };
    }
  }

  private async saveAnalysisResult(data: {
    url: string;
    urlHash: string;
    domain: string;
    status: string;
    riskScore: number;
    analysisResults: Record<string, any>;
    unfurledContent: Record<string, any>;
  }): Promise<LinkAnalysisResult> {
    const [result] = await db
      .insert(urlAnalysisResults)
      .values({
        url: data.url,
        urlHash: data.urlHash,
        domain: data.domain,
        status: data.status,
        riskScore: data.riskScore.toString(),
        analysisResults: JSON.stringify(data.analysisResults),
        unfurledContent: JSON.stringify(data.unfurledContent),
        lastAnalyzed: new Date(),
      })
      .onConflictDoUpdate({
        target: urlAnalysisResults.urlHash,
        set: {
          status: data.status,
          riskScore: data.riskScore.toString(),
          analysisResults: JSON.stringify(data.analysisResults),
          unfurledContent: JSON.stringify(data.unfurledContent),
          lastAnalyzed: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();

    return {
      id: result.id,
      url: result.url,
      domain: result.domain,
      status: result.status as any,
      riskScore: parseFloat(result.riskScore || '0'),
      analysisResults: JSON.parse(result.analysisResults || '{}'),
      unfurledContent: JSON.parse(result.unfurledContent || '{}'),
      lastAnalyzed: result.lastAnalyzed || new Date(),
    };
  }

  private async saveVendorResults(urlAnalysisId: number, vendorResults: VendorAnalysisResult[]): Promise<void> {
    if (vendorResults.length === 0) return;

    await db.insert(linkSafetyVendorResults).values(
      vendorResults.map(result => ({
        urlAnalysisId,
        vendorName: result.vendor,
        vendorStatus: result.status,
        threatTypes: JSON.stringify(result.threatTypes),
        confidence: result.confidence.toString(),
        rawResponse: JSON.stringify(result.rawResponse),
        analysisTimeMs: result.analysisTimeMs,
      }))
    );
  }

  private async updateDomainReputation(domain: string, status: string, riskScore: number): Promise<void> {
    const isMalicious = status === 'malicious';
    
    await db
      .insert(domainReputation)
      .values({
        domain,
        reputationScore: (100 - riskScore).toString(),
        analysisCount: 1,
        maliciousCount: isMalicious ? 1 : 0,
        firstSeen: new Date(),
        lastUpdated: new Date(),
      })
      .onConflictDoUpdate({
        target: domainReputation.domain,
        set: {
          reputationScore: sql`GREATEST(0, ${domainReputation.reputationScore} + (${100 - riskScore} - ${domainReputation.reputationScore}) * 0.1)`,
          analysisCount: sql`${domainReputation.analysisCount} + 1`,
          maliciousCount: isMalicious ? sql`${domainReputation.maliciousCount} + 1` : sql`${domainReputation.maliciousCount}`,
          lastUpdated: new Date(),
        },
      });
  }

  private extractUrlsFromContent(content: string): Array<{ url: string; position: number; text?: string }> {
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
    const urls: Array<{ url: string; position: number; text?: string }> = [];
    let match;

    while ((match = urlRegex.exec(content)) !== null) {
      urls.push({
        url: match[0],
        position: match.index,
        text: this.extractLinkContext(content, match.index, match[0].length),
      });
    }

    return urls;
  }

  private extractLinkContext(content: string, position: number, linkLength: number): string {
    const contextLength = 50;
    const start = Math.max(0, position - contextLength);
    const end = Math.min(content.length, position + linkLength + contextLength);
    return content.substring(start, end).trim();
  }

  private async saveContentLinkAssociations(
    contentId: string,
    contentType: string,
    urls: Array<{ url: string; position: number; text?: string }>,
    analysisResults: LinkAnalysisResult[]
  ): Promise<void> {
    const associations = urls.map((urlInfo, index) => {
      const analysis = analysisResults.find(r => r.url === this.normalizeUrl(urlInfo.url));
      return {
        contentId,
        contentType,
        urlAnalysisId: analysis?.id,
        positionInContent: urlInfo.position,
        linkText: urlInfo.text,
        isShortened: this.isShortUrl(urlInfo.url),
        originalUrl: urlInfo.url,
      };
    }).filter(assoc => assoc.urlAnalysisId);

    if (associations.length > 0) {
      await db.insert(contentLinks).values(associations);
    }
  }

  private isShortUrl(url: string): boolean {
    const shortDomains = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'short.link'];
    const domain = this.extractDomain(url);
    return shortDomains.some(shortDomain => domain.includes(shortDomain));
  }

  private hasSignificantChange(oldResult: any, newResult: LinkAnalysisResult): boolean {
    return oldResult.status !== newResult.status || 
           Math.abs(parseFloat(oldResult.riskScore || '0') - newResult.riskScore) > 20;
  }

  private calculateAlertSeverity(oldStatus: string, newStatus: string): string {
    if (oldStatus === 'safe' && newStatus === 'malicious') return 'critical';
    if (oldStatus === 'safe' && newStatus === 'suspicious') return 'high';
    if (oldStatus === 'suspicious' && newStatus === 'malicious') return 'high';
    if (oldStatus === 'malicious' && newStatus === 'safe') return 'medium';
    return 'low';
  }

  private async createMonitoringAlert(
    urlAnalysisId: number,
    alertType: string,
    description: string,
    severity: string
  ): Promise<void> {
    // Count affected content
    const [contentCount] = await db
      .select({ count: sql<number>`count(*)` })
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
}