import { Request, Response } from 'express';
import { LinkSafetyService } from '../services/linkSafetyService.js';
import { DomainReputationService } from '../services/domainReputationService.js';
import { LinkMonitoringService } from '../services/linkMonitoringService.js';
import { GoogleSafeBrowsingService } from '../services/vendors/googleSafeBrowsingService.js';
import { PhishFortService } from '../services/vendors/phishFortService.js';

export class LinkSafetyController {
  private linkSafetyService: LinkSafetyService;
  private domainReputationService: DomainReputationService;
  private linkMonitoringService: LinkMonitoringService;
  private googleSafeBrowsingService: GoogleSafeBrowsingService;
  private phishFortService: PhishFortService;

  constructor() {
    this.linkSafetyService = new LinkSafetyService();
    this.domainReputationService = new DomainReputationService();
    this.linkMonitoringService = new LinkMonitoringService();
    this.googleSafeBrowsingService = new GoogleSafeBrowsingService();
    this.phishFortService = new PhishFortService();
  }

  /**
   * Analyze a single URL for safety
   */
  analyzeUrl = async (req: Request, res: Response): Promise<void> => {
    try {
      const { url, forceReanalysis = false } = req.body;

      if (!url) {
        res.status(400).json({ error: 'URL is required' });
        return;
      }

      const result = await this.linkSafetyService.analyzeUrl(url, forceReanalysis);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error analyzing URL:', error);
      res.status(500).json({ 
        error: 'Failed to analyze URL',
        details: error.message 
      });
    }
  };

  /**
   * Analyze multiple URLs in batch
   */
  analyzeUrls = async (req: Request, res: Response): Promise<void> => {
    try {
      const { urls } = req.body;

      if (!Array.isArray(urls) || urls.length === 0) {
        res.status(400).json({ error: 'URLs array is required' });
        return;
      }

      if (urls.length > 100) {
        res.status(400).json({ error: 'Maximum 100 URLs allowed per batch' });
        return;
      }

      const results = await this.linkSafetyService.analyzeUrls(urls);
      
      res.json({
        success: true,
        data: results,
        processed: results.length,
        total: urls.length,
      });
    } catch (error) {
      console.error('Error analyzing URLs:', error);
      res.status(500).json({ 
        error: 'Failed to analyze URLs',
        details: error.message 
      });
    }
  };

  /**
   * Analyze all links in content
   */
  analyzeContentLinks = async (req: Request, res: Response): Promise<void> => {
    try {
      const { contentId, contentType, content } = req.body;

      if (!contentId || !contentType || !content) {
        res.status(400).json({ 
          error: 'contentId, contentType, and content are required' 
        });
        return;
      }

      const results = await this.linkSafetyService.analyzeContentLinks(
        contentId, 
        contentType, 
        content
      );
      
      res.json({
        success: true,
        data: results,
        linksFound: results.length,
      });
    } catch (error) {
      console.error('Error analyzing content links:', error);
      res.status(500).json({ 
        error: 'Failed to analyze content links',
        details: error.message 
      });
    }
  };

  /**
   * Get domain reputation information
   */
  getDomainReputation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { domain } = req.params;

      if (!domain) {
        res.status(400).json({ error: 'Domain is required' });
        return;
      }

      const reputation = await this.domainReputationService.getDomainReputation(domain);
      
      if (!reputation) {
        res.status(404).json({ error: 'Domain reputation not found' });
        return;
      }

      res.json({
        success: true,
        data: reputation,
      });
    } catch (error) {
      console.error('Error getting domain reputation:', error);
      res.status(500).json({ 
        error: 'Failed to get domain reputation',
        details: error.message 
      });
    }
  };

  /**
   * Get domain analytics and trends
   */
  getDomainAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { domain } = req.params;

      if (!domain) {
        res.status(400).json({ error: 'Domain is required' });
        return;
      }

      const analytics = await this.domainReputationService.getDomainAnalytics(domain);
      
      if (!analytics) {
        res.status(404).json({ error: 'Domain analytics not found' });
        return;
      }

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error('Error getting domain analytics:', error);
      res.status(500).json({ 
        error: 'Failed to get domain analytics',
        details: error.message 
      });
    }
  };

  /**
   * Add entry to custom blacklist
   */
  addToBlacklist = async (req: Request, res: Response): Promise<void> => {
    try {
      const { entryType, entryValue, category, severity, description } = req.body;
      const addedBy = req.user?.walletAddress; // Using walletAddress as the user identifier

      if (!entryType || !entryValue || !category) {
        res.status(400).json({ 
          error: 'entryType, entryValue, and category are required' 
        });
        return;
      }

      if (!['domain', 'url', 'pattern'].includes(entryType)) {
        res.status(400).json({ 
          error: 'entryType must be domain, url, or pattern' 
        });
        return;
      }

      if (!['low', 'medium', 'high', 'critical'].includes(severity || 'medium')) {
        res.status(400).json({ 
          error: 'severity must be low, medium, high, or critical' 
        });
        return;
      }

      await this.linkSafetyService.addToBlacklist(
        entryType,
        entryValue,
        category,
        severity || 'medium',
        description,
        addedBy
      );
      
      res.json({
        success: true,
        message: 'Entry added to blacklist successfully',
      });
    } catch (error) {
      console.error('Error adding to blacklist:', error);
      res.status(500).json({ 
        error: 'Failed to add to blacklist',
        details: error.message 
      });
    }
  };

  /**
   * Get active monitoring alerts
   */
  getMonitoringAlerts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { severity, alertType, limit = 100 } = req.query;

      const alerts = await this.linkMonitoringService.getActiveAlerts(
        severity as any,
        alertType as string,
        parseInt(limit as string) || 100
      );
      
      res.json({
        success: true,
        data: alerts,
        count: alerts.length,
      });
    } catch (error) {
      console.error('Error getting monitoring alerts:', error);
      res.status(500).json({ 
        error: 'Failed to get monitoring alerts',
        details: error.message 
      });
    }
  };

  /**
   * Get monitoring statistics
   */
  getMonitoringStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.linkMonitoringService.getMonitoringStats();
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error getting monitoring stats:', error);
      res.status(500).json({ 
        error: 'Failed to get monitoring stats',
        details: error.message 
      });
    }
  };

  /**
   * Assess content impact
   */
  assessContentImpact = async (req: Request, res: Response): Promise<void> => {
    try {
      const { contentId, contentType } = req.params;

      if (!contentId || !contentType) {
        res.status(400).json({ 
          error: 'contentId and contentType are required' 
        });
        return;
      }

      const assessment = await this.linkMonitoringService.assessContentImpact(
        contentId, 
        contentType
      );
      
      res.json({
        success: true,
        data: assessment,
      });
    } catch (error) {
      console.error('Error assessing content impact:', error);
      res.status(500).json({ 
        error: 'Failed to assess content impact',
        details: error.message 
      });
    }
  };

  /**
   * Resolve a monitoring alert
   */
  resolveAlert = async (req: Request, res: Response): Promise<void> => {
    try {
      const { alertId } = req.params;
      const { resolution } = req.body;

      if (!alertId) {
        res.status(400).json({ error: 'Alert ID is required' });
        return;
      }

      await this.linkMonitoringService.resolveAlert(
        parseInt(alertId), 
        resolution
      );
      
      res.json({
        success: true,
        message: 'Alert resolved successfully',
      });
    } catch (error) {
      console.error('Error resolving alert:', error);
      res.status(500).json({ 
        error: 'Failed to resolve alert',
        details: error.message 
      });
    }
  };

  /**
   * Start link monitoring
   */
  startMonitoring = async (req: Request, res: Response): Promise<void> => {
    try {
      this.linkMonitoringService.startMonitoring();
      
      res.json({
        success: true,
        message: 'Link monitoring started',
      });
    } catch (error) {
      console.error('Error starting monitoring:', error);
      res.status(500).json({ 
        error: 'Failed to start monitoring',
        details: error.message 
      });
    }
  };

  /**
   * Stop link monitoring
   */
  stopMonitoring = async (req: Request, res: Response): Promise<void> => {
    try {
      this.linkMonitoringService.stopMonitoring();
      
      res.json({
        success: true,
        message: 'Link monitoring stopped',
      });
    } catch (error) {
      console.error('Error stopping monitoring:', error);
      res.status(500).json({ 
        error: 'Failed to stop monitoring',
        details: error.message 
      });
    }
  };

  /**
   * Test vendor API connections
   */
  testVendorConnections = async (req: Request, res: Response): Promise<void> => {
    try {
      const [googleTest, phishfortTest] = await Promise.all([
        this.googleSafeBrowsingService.testConnection(),
        this.phishFortService.testConnection(),
      ]);

      res.json({
        success: true,
        data: {
          googleSafeBrowsing: {
            configured: this.googleSafeBrowsingService.isConfigured(),
            connection: googleTest,
          },
          phishFort: {
            configured: this.phishFortService.isConfigured(),
            connection: phishfortTest,
          },
        },
      });
    } catch (error) {
      console.error('Error testing vendor connections:', error);
      res.status(500).json({ 
        error: 'Failed to test vendor connections',
        details: error.message 
      });
    }
  };

  /**
   * Get top domains by reputation
   */
  getTopDomains = async (req: Request, res: Response): Promise<void> => {
    try {
      const { limit = 100, category } = req.query;

      const domains = await this.domainReputationService.getTopDomains(
        parseInt(limit as string) || 100,
        category as string
      );
      
      res.json({
        success: true,
        data: domains,
        count: domains.length,
      });
    } catch (error) {
      console.error('Error getting top domains:', error);
      res.status(500).json({ 
        error: 'Failed to get top domains',
        details: error.message 
      });
    }
  };

  /**
   * Verify a domain (admin only)
   */
  verifyDomain = async (req: Request, res: Response): Promise<void> => {
    try {
      const { domain } = req.params;
      const { category } = req.body;

      if (!domain) {
        res.status(400).json({ error: 'Domain is required' });
        return;
      }

      await this.domainReputationService.verifyDomain(domain, category);
      
      res.json({
        success: true,
        message: 'Domain verified successfully',
      });
    } catch (error) {
      console.error('Error verifying domain:', error);
      res.status(500).json({ 
        error: 'Failed to verify domain',
        details: error.message 
      });
    }
  };

  /**
   * Blacklist a domain (admin only)
   */
  blacklistDomain = async (req: Request, res: Response): Promise<void> => {
    try {
      const { domain } = req.params;
      const { reason, severity = 'high' } = req.body;

      if (!domain || !reason) {
        res.status(400).json({ 
          error: 'Domain and reason are required' 
        });
        return;
      }

      await this.domainReputationService.blacklistDomain(
        domain, 
        reason, 
        severity
      );
      
      res.json({
        success: true,
        message: 'Domain blacklisted successfully',
      });
    } catch (error) {
      console.error('Error blacklisting domain:', error);
      res.status(500).json({ 
        error: 'Failed to blacklist domain',
        details: error.message 
      });
    }
  };
}