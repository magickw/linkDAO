/**
 * Document Freshness Service
 * Automated system for checking document freshness and generating update alerts
 */

import { promises as fs } from 'fs';
import { safeLogger } from '../utils/safeLogger';
import path from 'path';
import matter from 'gray-matter';
import { differenceInDays, parseISO, format } from 'date-fns';

export interface DocumentMetadata {
  title: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  lastUpdated: string;
  version: string;
  author: string;
  reviewCycle: number; // days
  tags: string[];
  dependencies?: string[];
  criticalityLevel: 'low' | 'medium' | 'high' | 'critical';
  // Adding missing properties to match the expected structure
  [key: string]: any;
}

export interface FreshnessAlert {
  documentPath: string;
  title: string;
  category: string;
  lastUpdated: Date;
  daysSinceUpdate: number;
  recommendedReviewDate: Date;
  alertLevel: 'info' | 'warning' | 'urgent' | 'critical';
  reasons: string[];
  suggestedActions: string[];
}

export interface ContentChangeDetection {
  documentPath: string;
  changeType: 'content' | 'metadata' | 'structure';
  changeDescription: string;
  timestamp: Date;
  severity: 'minor' | 'major' | 'breaking';
}

export class DocumentFreshnessService {
  private documentsPath: string;
  private alertThresholds: Record<string, number>;
  private criticalityMultipliers: Record<string, number>;

  constructor(documentsPath: string = 'app/frontend/public/docs/support') {
    this.documentsPath = documentsPath;
    
    // Default alert thresholds in days
    this.alertThresholds = {
      info: 30,      // 1 month
      warning: 60,   // 2 months
      urgent: 90,    // 3 months
      critical: 180  // 6 months
    };

    // Criticality level multipliers for review cycles
    this.criticalityMultipliers = {
      low: 1.5,
      medium: 1.0,
      high: 0.7,
      critical: 0.5
    };
  }

  /**
   * Scan all documents and check freshness
   */
  async checkDocumentFreshness(): Promise<FreshnessAlert[]> {
    const alerts: FreshnessAlert[] = [];
    
    try {
      const documentFiles = await this.getDocumentFiles();
      
      for (const filePath of documentFiles) {
        const alert = await this.checkSingleDocument(filePath);
        if (alert) {
          alerts.push(alert);
        }
      }

      // Sort alerts by severity and days since update
      alerts.sort((a, b) => {
        const severityOrder = { critical: 4, urgent: 3, warning: 2, info: 1 };
        const severityDiff = severityOrder[b.alertLevel] - severityOrder[a.alertLevel];
        if (severityDiff !== 0) return severityDiff;
        return b.daysSinceUpdate - a.daysSinceUpdate;
      });

      return alerts;
    } catch (error) {
      safeLogger.error('Error checking document freshness:', error);
      throw new Error(`Failed to check document freshness: ${error.message}`);
    }
  }

  /**
   * Check freshness of a single document
   */
  private async checkSingleDocument(filePath: string): Promise<FreshnessAlert | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const { data: metadata } = matter(content);
      
      // Cast metadata to DocumentMetadata type
      const docMetadata = metadata as DocumentMetadata;
      
      if (!docMetadata.lastUpdated) {
        return this.createAlert(filePath, docMetadata, new Date(0), 999, 'critical', [
          'Document missing lastUpdated metadata',
          'Cannot determine document age'
        ]);
      }

      const lastUpdated = parseISO(docMetadata.lastUpdated);
      const daysSinceUpdate = differenceInDays(new Date(), lastUpdated);
      const reviewCycle = this.calculateReviewCycle(docMetadata);
      
      if (daysSinceUpdate <= reviewCycle) {
        return null; // Document is fresh
      }

      const alertLevel = this.determineAlertLevel(daysSinceUpdate, docMetadata);
      const reasons = this.generateReasons(daysSinceUpdate, reviewCycle, docMetadata);
      
      return this.createAlert(filePath, docMetadata, lastUpdated, daysSinceUpdate, alertLevel, reasons);
    } catch (error) {
      safeLogger.error(`Error checking document ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Calculate review cycle based on document metadata
   */
  private calculateReviewCycle(metadata: DocumentMetadata): number {
    const baseReviewCycle = metadata.reviewCycle || 60; // Default 60 days
    const criticalityLevel = metadata.criticalityLevel || 'medium';
    const multiplier = this.criticalityMultipliers[criticalityLevel];
    
    return Math.floor(baseReviewCycle * multiplier);
  }

  /**
   * Determine alert level based on days since update
   */
  private determineAlertLevel(daysSinceUpdate: number, metadata: DocumentMetadata): FreshnessAlert['alertLevel'] {
    const criticalityLevel = metadata.criticalityLevel || 'medium';
    
    // Adjust thresholds based on criticality
    const multiplier = this.criticalityMultipliers[criticalityLevel];
    const adjustedThresholds = {
      info: Math.floor(this.alertThresholds.info * multiplier),
      warning: Math.floor(this.alertThresholds.warning * multiplier),
      urgent: Math.floor(this.alertThresholds.urgent * multiplier),
      critical: Math.floor(this.alertThresholds.critical * multiplier)
    };

    if (daysSinceUpdate >= adjustedThresholds.critical) return 'critical';
    if (daysSinceUpdate >= adjustedThresholds.urgent) return 'urgent';
    if (daysSinceUpdate >= adjustedThresholds.warning) return 'warning';
    return 'info';
  }

  /**
   * Generate reasons for the alert
   */
  private generateReasons(daysSinceUpdate: number, reviewCycle: number, metadata: DocumentMetadata): string[] {
    const reasons: string[] = [];
    
    reasons.push(`Document is ${daysSinceUpdate} days old (review cycle: ${reviewCycle} days)`);
    
    if (metadata.criticalityLevel === 'critical') {
      reasons.push('Critical document requires frequent updates');
    }
    
    if (metadata.category === 'security') {
      reasons.push('Security documentation needs regular review');
    }
    
    if (metadata.tags?.includes('api') || metadata.tags?.includes('technical')) {
      reasons.push('Technical documentation may be affected by system changes');
    }
    
    if (daysSinceUpdate > 180) {
      reasons.push('Document significantly outdated - may contain obsolete information');
    }
    
    return reasons;
  }

  /**
   * Create a freshness alert
   */
  private createAlert(
    filePath: string,
    metadata: any,
    lastUpdated: Date,
    daysSinceUpdate: number,
    alertLevel: FreshnessAlert['alertLevel'],
    reasons: string[]
  ): FreshnessAlert {
    const reviewCycle = this.calculateReviewCycle(metadata);
    const recommendedReviewDate = new Date();
    recommendedReviewDate.setDate(recommendedReviewDate.getDate() + reviewCycle);

    return {
      documentPath: filePath,
      title: metadata.title || path.basename(filePath, '.md'),
      category: metadata.category || 'uncategorized',
      lastUpdated,
      daysSinceUpdate,
      recommendedReviewDate,
      alertLevel,
      reasons,
      suggestedActions: this.generateSuggestedActions(alertLevel, metadata)
    };
  }

  /**
   * Generate suggested actions based on alert level
   */
  private generateSuggestedActions(alertLevel: FreshnessAlert['alertLevel'], metadata: any): string[] {
    const actions: string[] = [];
    
    switch (alertLevel) {
      case 'critical':
        actions.push('Immediate review required');
        actions.push('Verify all information is current');
        actions.push('Check for breaking changes in related systems');
        actions.push('Update or archive if obsolete');
        break;
      case 'urgent':
        actions.push('Schedule review within 1 week');
        actions.push('Verify key information accuracy');
        actions.push('Update lastUpdated date if content is current');
        break;
      case 'warning':
        actions.push('Schedule review within 2 weeks');
        actions.push('Check for minor updates needed');
        break;
      case 'info':
        actions.push('Schedule routine review');
        actions.push('Consider if content needs refreshing');
        break;
    }
    
    if (metadata.category === 'security') {
      actions.push('Review security best practices for changes');
    }
    
    if (metadata.tags?.includes('api')) {
      actions.push('Check API documentation for updates');
    }
    
    return actions;
  }

  /**
   * Get all document files recursively
   */
  private async getDocumentFiles(): Promise<string[]> {
    const files: string[] = [];
    
    const scanDirectory = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.md')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        safeLogger.warn(`Could not scan directory ${dir}:`, error.message);
      }
    };
    
    await scanDirectory(this.documentsPath);
    return files;
  }

  /**
   * Generate freshness report
   */
  async generateFreshnessReport(): Promise<{
    summary: {
      totalDocuments: number;
      freshDocuments: number;
      staleDocuments: number;
      criticalAlerts: number;
      urgentAlerts: number;
    };
    alerts: FreshnessAlert[];
    recommendations: string[];
  }> {
    const alerts = await this.checkDocumentFreshness();
    const totalDocuments = (await this.getDocumentFiles()).length;
    
    const criticalAlerts = alerts.filter(a => a.alertLevel === 'critical').length;
    const urgentAlerts = alerts.filter(a => a.alertLevel === 'urgent').length;
    
    const recommendations = this.generateRecommendations(alerts);
    
    return {
      summary: {
        totalDocuments,
        freshDocuments: totalDocuments - alerts.length,
        staleDocuments: alerts.length,
        criticalAlerts,
        urgentAlerts
      },
      alerts,
      recommendations
    };
  }

  /**
   * Generate recommendations based on alerts
   */
  private generateRecommendations(alerts: FreshnessAlert[]): string[] {
    const recommendations: string[] = [];
    
    const criticalCount = alerts.filter(a => a.alertLevel === 'critical').length;
    const urgentCount = alerts.filter(a => a.alertLevel === 'urgent').length;
    
    if (criticalCount > 0) {
      recommendations.push(`${criticalCount} documents require immediate attention`);
    }
    
    if (urgentCount > 0) {
      recommendations.push(`${urgentCount} documents need review within 1 week`);
    }
    
    const securityDocs = alerts.filter(a => a.category === 'security').length;
    if (securityDocs > 0) {
      recommendations.push(`${securityDocs} security documents need updating`);
    }
    
    const oldDocs = alerts.filter(a => a.daysSinceUpdate > 180).length;
    if (oldDocs > 0) {
      recommendations.push(`${oldDocs} documents are over 6 months old - consider archiving obsolete content`);
    }
    
    if (alerts.length === 0) {
      recommendations.push('All documents are up to date');
    }
    
    return recommendations;
  }

  /**
   * Schedule automated freshness checks
   */
  startAutomatedChecks(intervalHours: number = 24): NodeJS.Timeout {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    return setInterval(async () => {
      try {
        const report = await this.generateFreshnessReport();
        
        if (report.alerts.length > 0) {
          safeLogger.info(`Document freshness check: ${report.alerts.length} documents need attention`);
          
          // Send alerts to monitoring system
          await this.sendFreshnessAlerts(report);
        }
      } catch (error) {
        safeLogger.error('Automated freshness check failed:', error);
      }
    }, intervalMs);
  }

  /**
   * Send freshness alerts to monitoring system
   */
  private async sendFreshnessAlerts(report: any): Promise<void> {
    // This would integrate with your monitoring/alerting system
    // For now, we'll log the alerts
    safeLogger.info('Document Freshness Report:', {
      timestamp: new Date().toISOString(),
      summary: report.summary,
      criticalAlerts: report.alerts.filter((a: FreshnessAlert) => a.alertLevel === 'critical'),
      recommendations: report.recommendations
    });
  }
}

export const documentFreshnessService = new DocumentFreshnessService();
