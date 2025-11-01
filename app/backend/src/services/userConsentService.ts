import { eq, and } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db/connection';
import { z } from 'zod';

// Consent types and purposes
export enum ConsentType {
  DM_SCANNING = 'dm_scanning',
  CONTENT_ANALYSIS = 'content_analysis',
  DATA_PROCESSING = 'data_processing',
  MARKETING = 'marketing',
  ANALYTICS = 'analytics',
  THIRD_PARTY_SHARING = 'third_party_sharing',
  BIOMETRIC_PROCESSING = 'biometric_processing',
  LOCATION_TRACKING = 'location_tracking'
}

export enum ConsentStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  WITHDRAWN = 'withdrawn',
  EXPIRED = 'expired',
  PENDING = 'pending'
}

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  status: ConsentStatus;
  purpose: string;
  legalBasis: string;
  grantedAt?: Date;
  withdrawnAt?: Date;
  expiresAt?: Date;
  ipAddress: string;
  userAgent: string;
  consentVersion: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsentRequest {
  userId: string;
  consentType: ConsentType;
  purpose: string;
  legalBasis: string;
  expirationDays?: number;
  metadata?: Record<string, any>;
}

export interface ConsentValidationResult {
  isValid: boolean;
  status: ConsentStatus;
  grantedAt?: Date;
  expiresAt?: Date;
  reason?: string;
}

export interface ConsentSummary {
  userId: string;
  consents: Array<{
    type: ConsentType;
    status: ConsentStatus;
    grantedAt?: Date;
    expiresAt?: Date;
  }>;
  lastUpdated: Date;
}

// Consent configuration
const CONSENT_CONFIG = {
  [ConsentType.DM_SCANNING]: {
    required: true,
    defaultExpirationDays: 365,
    renewalRequired: true,
    description: 'Scanning of direct messages for safety and compliance',
    legalBasis: 'consent'
  },
  [ConsentType.CONTENT_ANALYSIS]: {
    required: false,
    defaultExpirationDays: 730,
    renewalRequired: false,
    description: 'Analysis of public content for moderation purposes',
    legalBasis: 'legitimate_interest'
  },
  [ConsentType.DATA_PROCESSING]: {
    required: true,
    defaultExpirationDays: 1095,
    renewalRequired: true,
    description: 'Processing of personal data for platform functionality',
    legalBasis: 'consent'
  },
  [ConsentType.MARKETING]: {
    required: false,
    defaultExpirationDays: 365,
    renewalRequired: true,
    description: 'Marketing communications and promotional content',
    legalBasis: 'consent'
  },
  [ConsentType.ANALYTICS]: {
    required: false,
    defaultExpirationDays: 730,
    renewalRequired: false,
    description: 'Analytics and usage tracking for platform improvement',
    legalBasis: 'legitimate_interest'
  },
  [ConsentType.THIRD_PARTY_SHARING]: {
    required: false,
    defaultExpirationDays: 365,
    renewalRequired: true,
    description: 'Sharing data with third-party service providers',
    legalBasis: 'consent'
  },
  [ConsentType.BIOMETRIC_PROCESSING]: {
    required: true,
    defaultExpirationDays: 180,
    renewalRequired: true,
    description: 'Processing of biometric data for content verification',
    legalBasis: 'explicit_consent'
  },
  [ConsentType.LOCATION_TRACKING]: {
    required: false,
    defaultExpirationDays: 365,
    renewalRequired: true,
    description: 'Tracking location for regional compliance and features',
    legalBasis: 'consent'
  }
};

export class UserConsentService {
  private consentRecords: Map<string, ConsentRecord[]> = new Map();

  /**
   * Grant consent for a specific purpose
   */
  async grantConsent(
    request: ConsentRequest,
    ipAddress: string,
    userAgent: string
  ): Promise<ConsentRecord> {
    const config = CONSENT_CONFIG[request.consentType];
    const now = new Date();
    
    const expiresAt = request.expirationDays 
      ? new Date(now.getTime() + (request.expirationDays * 24 * 60 * 60 * 1000))
      : new Date(now.getTime() + (config.defaultExpirationDays * 24 * 60 * 60 * 1000));

    const consentRecord: ConsentRecord = {
      id: `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: request.userId,
      consentType: request.consentType,
      status: ConsentStatus.GRANTED,
      purpose: request.purpose,
      legalBasis: request.legalBasis || config.legalBasis,
      grantedAt: now,
      expiresAt,
      ipAddress,
      userAgent,
      consentVersion: '1.0',
      metadata: request.metadata || {},
      createdAt: now,
      updatedAt: now
    };

    // Store consent record
    await this.storeConsentRecord(consentRecord);

    // Withdraw any previous consents of the same type
    await this.withdrawPreviousConsents(request.userId, request.consentType);

    return consentRecord;
  }

  /**
   * Withdraw consent for a specific purpose
   */
  async withdrawConsent(
    userId: string,
    consentType: ConsentType,
    reason?: string
  ): Promise<boolean> {
    const existingConsents = await this.getUserConsents(userId);
    const activeConsent = existingConsents.find(c => 
      c.consentType === consentType && 
      c.status === ConsentStatus.GRANTED
    );

    if (!activeConsent) {
      return false;
    }

    const now = new Date();
    activeConsent.status = ConsentStatus.WITHDRAWN;
    activeConsent.withdrawnAt = now;
    activeConsent.updatedAt = now;
    
    if (reason) {
      activeConsent.metadata.withdrawalReason = reason;
    }

    await this.updateConsentRecord(activeConsent);
    return true;
  }

  /**
   * Check if user has valid consent for a specific purpose
   */
  async hasValidConsent(
    userId: string,
    consentType: ConsentType
  ): Promise<ConsentValidationResult> {
    const userConsents = await this.getUserConsents(userId);
    const relevantConsent = userConsents
      .filter(c => c.consentType === consentType)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    if (!relevantConsent) {
      return {
        isValid: false,
        status: ConsentStatus.PENDING,
        reason: 'No consent record found'
      };
    }

    const now = new Date();

    // Check if consent is withdrawn
    if (relevantConsent.status === ConsentStatus.WITHDRAWN) {
      return {
        isValid: false,
        status: ConsentStatus.WITHDRAWN,
        reason: 'Consent has been withdrawn'
      };
    }

    // Check if consent is denied
    if (relevantConsent.status === ConsentStatus.DENIED) {
      return {
        isValid: false,
        status: ConsentStatus.DENIED,
        reason: 'Consent has been denied'
      };
    }

    // Check if consent is expired
    if (relevantConsent.expiresAt && relevantConsent.expiresAt < now) {
      // Update status to expired
      relevantConsent.status = ConsentStatus.EXPIRED;
      relevantConsent.updatedAt = now;
      await this.updateConsentRecord(relevantConsent);

      return {
        isValid: false,
        status: ConsentStatus.EXPIRED,
        grantedAt: relevantConsent.grantedAt,
        expiresAt: relevantConsent.expiresAt,
        reason: 'Consent has expired'
      };
    }

    return {
      isValid: true,
      status: ConsentStatus.GRANTED,
      grantedAt: relevantConsent.grantedAt,
      expiresAt: relevantConsent.expiresAt
    };
  }

  /**
   * Get all consents for a user
   */
  async getUserConsents(userId: string): Promise<ConsentRecord[]> {
    const userConsents = this.consentRecords.get(userId) || [];
    return [...userConsents];
  }

  /**
   * Get consent summary for a user
   */
  async getConsentSummary(userId: string): Promise<ConsentSummary> {
    const userConsents = await this.getUserConsents(userId);
    
    // Get latest consent for each type
    const consentsByType = new Map<ConsentType, ConsentRecord>();
    
    userConsents.forEach(consent => {
      const existing = consentsByType.get(consent.consentType);
      if (!existing || consent.createdAt > existing.createdAt) {
        consentsByType.set(consent.consentType, consent);
      }
    });

    const consents = Array.from(consentsByType.values()).map(consent => ({
      type: consent.consentType,
      status: consent.status,
      grantedAt: consent.grantedAt,
      expiresAt: consent.expiresAt
    }));

    const lastUpdated = userConsents.length > 0
      ? new Date(Math.max(...userConsents.map(c => c.updatedAt.getTime())))
      : new Date();

    return {
      userId,
      consents,
      lastUpdated
    };
  }

  /**
   * Get consents expiring soon
   */
  async getExpiringConsents(daysAhead: number = 30): Promise<ConsentRecord[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

    const expiringConsents: ConsentRecord[] = [];

    for (const userConsents of this.consentRecords.values()) {
      for (const consent of userConsents) {
        if (
          consent.status === ConsentStatus.GRANTED &&
          consent.expiresAt &&
          consent.expiresAt <= cutoffDate &&
          consent.expiresAt > new Date()
        ) {
          expiringConsents.push(consent);
        }
      }
    }

    return expiringConsents.sort((a, b) => 
      (a.expiresAt?.getTime() || 0) - (b.expiresAt?.getTime() || 0)
    );
  }

  /**
   * Renew consent (extend expiration)
   */
  async renewConsent(
    userId: string,
    consentType: ConsentType,
    extensionDays?: number
  ): Promise<ConsentRecord | null> {
    const validation = await this.hasValidConsent(userId, consentType);
    
    if (!validation.isValid && validation.status !== ConsentStatus.EXPIRED) {
      return null;
    }

    const userConsents = await this.getUserConsents(userId);
    const existingConsent = userConsents.find(c => 
      c.consentType === consentType && 
      (c.status === ConsentStatus.GRANTED || c.status === ConsentStatus.EXPIRED)
    );

    if (!existingConsent) {
      return null;
    }

    const config = CONSENT_CONFIG[consentType];
    const now = new Date();
    const extension = extensionDays || config.defaultExpirationDays;
    const newExpiresAt = new Date(now.getTime() + (extension * 24 * 60 * 60 * 1000));

    existingConsent.status = ConsentStatus.GRANTED;
    existingConsent.expiresAt = newExpiresAt;
    existingConsent.updatedAt = now;
    existingConsent.metadata.renewed = true;
    existingConsent.metadata.renewedAt = now;

    await this.updateConsentRecord(existingConsent);
    return existingConsent;
  }

  /**
   * Bulk update consent status (for compliance requirements)
   */
  async bulkUpdateConsents(
    userIds: string[],
    consentType: ConsentType,
    newStatus: ConsentStatus,
    reason: string
  ): Promise<number> {
    let updatedCount = 0;

    for (const userId of userIds) {
      const userConsents = await this.getUserConsents(userId);
      const relevantConsents = userConsents.filter(c => c.consentType === consentType);

      for (const consent of relevantConsents) {
        if (consent.status !== newStatus) {
          consent.status = newStatus;
          consent.updatedAt = new Date();
          consent.metadata.bulkUpdateReason = reason;

          if (newStatus === ConsentStatus.WITHDRAWN) {
            consent.withdrawnAt = new Date();
          }

          await this.updateConsentRecord(consent);
          updatedCount++;
        }
      }
    }

    return updatedCount;
  }

  /**
   * Get consent configuration
   */
  getConsentConfig(consentType: ConsentType) {
    return CONSENT_CONFIG[consentType];
  }

  /**
   * Get all consent types and their configurations
   */
  getAllConsentConfigs() {
    return { ...CONSENT_CONFIG };
  }

  private async storeConsentRecord(record: ConsentRecord): Promise<void> {
    const userConsents = this.consentRecords.get(record.userId) || [];
    userConsents.push(record);
    this.consentRecords.set(record.userId, userConsents);

    // TODO: Persist to database
    safeLogger.info(`Stored consent record for user ${record.userId}:`, record);
  }

  private async updateConsentRecord(record: ConsentRecord): Promise<void> {
    const userConsents = this.consentRecords.get(record.userId) || [];
    const index = userConsents.findIndex(c => c.id === record.id);
    
    if (index >= 0) {
      userConsents[index] = record;
      this.consentRecords.set(record.userId, userConsents);
    }

    // TODO: Update in database
    safeLogger.info(`Updated consent record for user ${record.userId}:`, record);
  }

  private async withdrawPreviousConsents(
    userId: string,
    consentType: ConsentType
  ): Promise<void> {
    const userConsents = await this.getUserConsents(userId);
    const previousConsents = userConsents.filter(c => 
      c.consentType === consentType && 
      c.status === ConsentStatus.GRANTED
    );

    for (const consent of previousConsents) {
      if (consent.grantedAt && consent.grantedAt < new Date()) {
        consent.status = ConsentStatus.WITHDRAWN;
        consent.withdrawnAt = new Date();
        consent.updatedAt = new Date();
        consent.metadata.autoWithdrawn = true;
        consent.metadata.reason = 'Superseded by new consent';

        await this.updateConsentRecord(consent);
      }
    }
  }
}

export const userConsentService = new UserConsentService();
