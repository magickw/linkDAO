/**
 * Data Management Service
 * Handles data export, deletion, and GDPR compliance
 */

import fs from 'fs/promises';
import { safeLogger } from '../../utils/safeLogger';
import path from 'path';
import archiver from 'archiver';
import { securityConfig } from '../../config/securityConfig';

export interface DataCategory {
  name: string;
  description: string;
  tables: string[];
  retention: {
    required: boolean;
    period: number; // days
    reason?: string;
  };
  sensitive: boolean;
  exportable: boolean;
  deletable: boolean;
}

export interface DataInventory {
  userId: string;
  categories: Record<string, {
    recordCount: number;
    oldestRecord: Date;
    newestRecord: Date;
    size: number; // bytes
    lastAccessed: Date;
  }>;
  totalSize: number;
  complianceStatus: {
    gdpr: boolean;
    ccpa: boolean;
    retention: boolean;
  };
}

export interface DataProcessingActivity {
  id: string;
  userId: string;
  activity: string;
  purpose: string;
  legalBasis: string;
  dataCategories: string[];
  recipients: string[];
  retentionPeriod: number;
  crossBorderTransfer: boolean;
  automatedDecisionMaking: boolean;
  timestamp: Date;
}

export interface DataSubjectRequest {
  id: string;
  userId: string;
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  status: 'received' | 'processing' | 'completed' | 'rejected';
  requestDate: Date;
  responseDate?: Date;
  deadline: Date;
  details: string;
  response?: string;
  documents: string[];
}

export class DataManagementService {
  private static readonly DATA_CATEGORIES: Record<string, DataCategory> = {
    profile: {
      name: 'Profile Information',
      description: 'Basic user profile data including name, email, bio',
      tables: ['users', 'profiles'],
      retention: { required: false, period: 2555 }, // 7 years
      sensitive: false,
      exportable: true,
      deletable: true
    },
    posts: {
      name: 'Posts and Content',
      description: 'User-generated posts, comments, and media',
      tables: ['posts', 'comments', 'media'],
      retention: { required: false, period: 1825 }, // 5 years
      sensitive: false,
      exportable: true,
      deletable: true
    },
    messages: {
      name: 'Private Messages',
      description: 'Direct messages and private communications',
      tables: ['messages', 'conversations'],
      retention: { required: false, period: 365 }, // 1 year
      sensitive: true,
      exportable: true,
      deletable: true
    },
    analytics: {
      name: 'Analytics Data',
      description: 'Usage analytics, behavior tracking, and metrics',
      tables: ['analytics_events', 'user_sessions'],
      retention: { required: false, period: 730 }, // 2 years
      sensitive: false,
      exportable: true,
      deletable: true
    },
    financial: {
      name: 'Financial Data',
      description: 'Payment information, transaction history',
      tables: ['transactions', 'payment_methods'],
      retention: { required: true, period: 2555, reason: 'Legal requirement' }, // 7 years
      sensitive: true,
      exportable: true,
      deletable: false
    },
    security: {
      name: 'Security Logs',
      description: 'Login attempts, security events, audit logs',
      tables: ['security_logs', 'audit_logs'],
      retention: { required: true, period: 2190, reason: 'Security compliance' }, // 6 years
      sensitive: true,
      exportable: false,
      deletable: false
    },
    preferences: {
      name: 'User Preferences',
      description: 'Privacy settings, notification preferences',
      tables: ['user_preferences', 'privacy_settings'],
      retention: { required: false, period: 365 }, // 1 year
      sensitive: false,
      exportable: true,
      deletable: true
    }
  };

  /**
   * Get data inventory for user
   */
  static async getDataInventory(userId: string): Promise<DataInventory> {
    try {
      const categories: DataInventory['categories'] = {};
      let totalSize = 0;

      for (const [categoryId, category] of Object.entries(this.DATA_CATEGORIES)) {
        // In production, query actual database tables
        const categoryData = await this.getCategoryData(userId, category);
        
        categories[categoryId] = {
          recordCount: categoryData.count,
          oldestRecord: categoryData.oldest,
          newestRecord: categoryData.newest,
          size: categoryData.size,
          lastAccessed: categoryData.lastAccessed
        };

        totalSize += categoryData.size;
      }

      const complianceStatus = await this.checkComplianceStatus(userId);

      return {
        userId,
        categories,
        totalSize,
        complianceStatus
      };
    } catch (error) {
      safeLogger.error('Error getting data inventory:', error);
      throw new Error('Failed to retrieve data inventory');
    }
  }

  /**
   * Export user data in structured format
   */
  static async exportUserData(
    userId: string,
    categories: string[] = Object.keys(this.DATA_CATEGORIES),
    format: 'json' | 'csv' | 'xml' = 'json'
  ): Promise<{
    filePath: string;
    size: number;
    checksum: string;
  }> {
    try {
      const exportData: Record<string, any> = {
        exportInfo: {
          userId,
          exportDate: new Date().toISOString(),
          format,
          categories,
          version: '1.0'
        },
        data: {}
      };

      // Collect data for each category
      for (const categoryId of categories) {
        const category = this.DATA_CATEGORIES[categoryId];
        if (!category || !category.exportable) continue;

        exportData.data[categoryId] = await this.exportCategoryData(userId, category, format);
      }

      // Generate export file
      const exportDir = path.join(process.cwd(), 'temp', 'exports');
      await fs.mkdir(exportDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `user-data-${userId}-${timestamp}.${format}`;
      const filePath = path.join(exportDir, fileName);

      let fileContent: string;
      switch (format) {
        case 'json':
          fileContent = JSON.stringify(exportData, null, 2);
          break;
        case 'csv':
          fileContent = this.convertToCSV(exportData);
          break;
        case 'xml':
          fileContent = this.convertToXML(exportData);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      await fs.writeFile(filePath, fileContent, 'utf8');

      // Calculate file size and checksum
      const stats = await fs.stat(filePath);
      const checksum = await this.calculateChecksum(filePath);

      // Log the export
      await this.logDataProcessingActivity({
        userId,
        activity: 'data_export',
        purpose: 'User data portability request',
        legalBasis: 'Article 20 GDPR',
        dataCategories: categories,
        recipients: ['User'],
        retentionPeriod: 7, // Export files kept for 7 days
        crossBorderTransfer: false,
        automatedDecisionMaking: false
      });

      return {
        filePath,
        size: stats.size,
        checksum
      };
    } catch (error) {
      safeLogger.error('Error exporting user data:', error);
      throw new Error('Failed to export user data');
    }
  }

  /**
   * Create compressed archive of user data
   */
  static async createDataArchive(
    userId: string,
    categories: string[] = Object.keys(this.DATA_CATEGORIES)
  ): Promise<{
    archivePath: string;
    size: number;
    checksum: string;
  }> {
    try {
      const exportDir = path.join(process.cwd(), 'temp', 'exports');
      await fs.mkdir(exportDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archiveName = `user-data-archive-${userId}-${timestamp}.zip`;
      const archivePath = path.join(exportDir, archiveName);

      const output = require('fs').createWriteStream(archivePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      return new Promise(async (resolve, reject) => {
        output.on('close', async () => {
          try {
            const stats = await fs.stat(archivePath);
            const checksum = await this.calculateChecksum(archivePath);
            resolve({
              archivePath,
              size: stats.size,
              checksum
            });
          } catch (error) {
            reject(error);
          }
        });

        archive.on('error', reject);
        archive.pipe(output);

        // Add metadata file
        const metadata = {
          userId,
          exportDate: new Date().toISOString(),
          categories,
          dataCategories: Object.fromEntries(
            categories.map(id => [id, this.DATA_CATEGORIES[id]])
          )
        };
        archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

        // Add data files for each category
        for (const categoryId of categories) {
          const category = this.DATA_CATEGORIES[categoryId];
          if (!category || !category.exportable) continue;

          const categoryData = await this.exportCategoryData(userId, category, 'json');
          const fileName = `${categoryId}.json`;
          archive.append(JSON.stringify(categoryData, null, 2), { name: fileName });
        }

        // Add privacy policy and terms
        archive.append(await this.getPrivacyPolicy(), { name: 'privacy-policy.txt' });
        archive.append(await this.getTermsOfService(), { name: 'terms-of-service.txt' });

        archive.finalize();
      });
    } catch (error) {
      safeLogger.error('Error creating data archive:', error);
      throw new Error('Failed to create data archive');
    }
  }

  /**
   * Delete user data based on categories
   */
  static async deleteUserData(
    userId: string,
    categories: string[],
    reason: string = 'User request'
  ): Promise<{
    deletedCategories: string[];
    skippedCategories: string[];
    errors: string[];
  }> {
    try {
      const deletedCategories: string[] = [];
      const skippedCategories: string[] = [];
      const errors: string[] = [];

      for (const categoryId of categories) {
        const category = this.DATA_CATEGORIES[categoryId];
        
        if (!category) {
          errors.push(`Unknown category: ${categoryId}`);
          continue;
        }

        if (!category.deletable) {
          skippedCategories.push(categoryId);
          continue;
        }

        if (category.retention.required) {
          const retentionCheck = await this.checkRetentionRequirement(userId, category);
          if (!retentionCheck.canDelete) {
            skippedCategories.push(categoryId);
            errors.push(`Cannot delete ${categoryId}: ${retentionCheck.reason}`);
            continue;
          }
        }

        try {
          await this.deleteCategoryData(userId, category);
          deletedCategories.push(categoryId);
        } catch (error) {
          errors.push(`Failed to delete ${categoryId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Log the deletion
      if (deletedCategories.length > 0) {
        await this.logDataProcessingActivity({
          userId,
          activity: 'data_deletion',
          purpose: reason,
          legalBasis: 'Article 17 GDPR',
          dataCategories: deletedCategories,
          recipients: [],
          retentionPeriod: 0,
          crossBorderTransfer: false,
          automatedDecisionMaking: false
        });
      }

      return {
        deletedCategories,
        skippedCategories,
        errors
      };
    } catch (error) {
      safeLogger.error('Error deleting user data:', error);
      throw new Error('Failed to delete user data');
    }
  }

  /**
   * Anonymize user data
   */
  static async anonymizeUserData(
    userId: string,
    categories: string[]
  ): Promise<{
    anonymizedCategories: string[];
    errors: string[];
  }> {
    try {
      const anonymizedCategories: string[] = [];
      const errors: string[] = [];

      for (const categoryId of categories) {
        const category = this.DATA_CATEGORIES[categoryId];
        
        if (!category) {
          errors.push(`Unknown category: ${categoryId}`);
          continue;
        }

        try {
          await this.anonymizeCategoryData(userId, category);
          anonymizedCategories.push(categoryId);
        } catch (error) {
          errors.push(`Failed to anonymize ${categoryId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Log the anonymization
      if (anonymizedCategories.length > 0) {
        await this.logDataProcessingActivity({
          userId,
          activity: 'data_anonymization',
          purpose: 'Privacy protection',
          legalBasis: 'Legitimate interest',
          dataCategories: anonymizedCategories,
          recipients: [],
          retentionPeriod: 0,
          crossBorderTransfer: false,
          automatedDecisionMaking: false
        });
      }

      return {
        anonymizedCategories,
        errors
      };
    } catch (error) {
      safeLogger.error('Error anonymizing user data:', error);
      throw new Error('Failed to anonymize user data');
    }
  }

  /**
   * Process data subject request
   */
  static async processDataSubjectRequest(request: Omit<DataSubjectRequest, 'id' | 'status' | 'requestDate' | 'deadline'>): Promise<DataSubjectRequest> {
    try {
      const requestId = `dsr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const requestDate = new Date();
      const deadline = new Date(requestDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const dsRequest: DataSubjectRequest = {
        ...request,
        id: requestId,
        status: 'received',
        requestDate,
        deadline
      };

      // Log the request
      await this.logDataProcessingActivity({
        userId: request.userId,
        activity: 'data_subject_request',
        purpose: `Data subject ${request.type} request`,
        legalBasis: 'GDPR compliance',
        dataCategories: ['all'],
        recipients: ['Data Protection Officer'],
        retentionPeriod: 2555, // 7 years
        crossBorderTransfer: false,
        automatedDecisionMaking: false
      });

      safeLogger.info(`Data subject request received: ${request.type} for user ${request.userId}`);
      return dsRequest;
    } catch (error) {
      safeLogger.error('Error processing data subject request:', error);
      throw new Error('Failed to process data subject request');
    }
  }

  /**
   * Check data retention compliance
   */
  static async checkRetentionCompliance(userId?: string): Promise<{
    compliant: boolean;
    violations: Array<{
      category: string;
      reason: string;
      recordCount: number;
      oldestRecord: Date;
    }>;
  }> {
    try {
      const violations: any[] = [];
      const now = new Date();

      for (const [categoryId, category] of Object.entries(this.DATA_CATEGORIES)) {
        const categoryData = await this.getCategoryData(userId || 'all', category);
        
        if (categoryData.count > 0) {
          const retentionDeadline = new Date(categoryData.oldest.getTime() + category.retention.period * 24 * 60 * 60 * 1000);
          
          if (now > retentionDeadline && !category.retention.required) {
            violations.push({
              category: categoryId,
              reason: `Data older than retention period (${category.retention.period} days)`,
              recordCount: categoryData.count,
              oldestRecord: categoryData.oldest
            });
          }
        }
      }

      return {
        compliant: violations.length === 0,
        violations
      };
    } catch (error) {
      safeLogger.error('Error checking retention compliance:', error);
      throw new Error('Failed to check retention compliance');
    }
  }

  /**
   * Helper methods
   */
  private static async getCategoryData(userId: string, category: DataCategory): Promise<{
    count: number;
    oldest: Date;
    newest: Date;
    size: number;
    lastAccessed: Date;
  }> {
    // In production, query actual database tables
    const now = new Date();
    return {
      count: Math.floor(Math.random() * 1000),
      oldest: new Date(now.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      newest: now,
      size: Math.floor(Math.random() * 1024 * 1024), // Random size up to 1MB
      lastAccessed: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    };
  }

  private static async exportCategoryData(userId: string, category: DataCategory, format: string): Promise<any> {
    // In production, export actual data from database tables
    return {
      category: category.name,
      description: category.description,
      exportDate: new Date().toISOString(),
      data: []
    };
  }

  private static async deleteCategoryData(userId: string, category: DataCategory): Promise<void> {
    // In production, delete data from actual database tables
    safeLogger.info(`Deleting ${category.name} data for user ${userId}`);
  }

  private static async anonymizeCategoryData(userId: string, category: DataCategory): Promise<void> {
    // In production, anonymize data in actual database tables
    safeLogger.info(`Anonymizing ${category.name} data for user ${userId}`);
  }

  private static async checkRetentionRequirement(userId: string, category: DataCategory): Promise<{
    canDelete: boolean;
    reason?: string;
  }> {
    // In production, check actual retention requirements
    return { canDelete: true };
  }

  private static async checkComplianceStatus(userId: string): Promise<{
    gdpr: boolean;
    ccpa: boolean;
    retention: boolean;
  }> {
    // In production, check actual compliance status
    return {
      gdpr: securityConfig.compliance.gdpr.enabled,
      ccpa: securityConfig.compliance.ccpa.enabled,
      retention: true
    };
  }

  private static convertToCSV(data: any): string {
    // Simple CSV conversion - in production, use proper CSV library
    return JSON.stringify(data);
  }

  private static convertToXML(data: any): string {
    // Simple XML conversion - in production, use proper XML library
    return `<?xml version="1.0" encoding="UTF-8"?>\n<data>${JSON.stringify(data)}</data>`;
  }

  private static async calculateChecksum(filePath: string): Promise<string> {
    const crypto = require('crypto');
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  private static async getPrivacyPolicy(): Promise<string> {
    return 'Privacy Policy content would be loaded here...';
  }

  private static async getTermsOfService(): Promise<string> {
    return 'Terms of Service content would be loaded here...';
  }

  private static async logDataProcessingActivity(activity: Omit<DataProcessingActivity, 'id' | 'timestamp'>): Promise<void> {
    const activityRecord: DataProcessingActivity = {
      ...activity,
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    // In production, save to database
    safeLogger.info('Data processing activity logged:', activityRecord);
  }
}

export default DataManagementService;
