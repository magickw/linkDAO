import ipfsService from './ipfsService';
import { safeLogger } from '../utils/safeLogger';
import { EvidenceBundle, ModerationCase, AIModelResult } from '../models/ModerationModels';
import crypto from 'crypto';

export interface EvidenceBundleInput {
  caseId: number;
  contentId: string;
  contentType: string;
  contentHash: string;
  screenshots?: Buffer[];
  modelOutputs: Record<string, AIModelResult>;
  decisionRationale: string;
  policyVersion: string;
  moderatorId?: string;
  originalContent?: {
    text?: string;
    mediaUrls?: string[];
    metadata?: Record<string, any>;
  };
  redactedContent?: {
    text?: string;
    mediaUrls?: string[];
    metadata?: Record<string, any>;
  };
}

export interface StoredEvidenceBundle extends EvidenceBundle {
  ipfsHash: string;
  bundleSize: number;
  verificationHash: string;
}

export interface EvidenceRetrievalResult {
  bundle: EvidenceBundle;
  ipfsHash: string;
  isValid: boolean;
  retrievedAt: Date;
}

class EvidenceStorageService {
  private readonly EVIDENCE_VERSION = '1.0';
  private readonly MAX_BUNDLE_SIZE = 50 * 1024 * 1024; // 50MB limit
  private readonly RETENTION_DAYS = 2555; // ~7 years for legal compliance

  /**
   * Create and store evidence bundle to IPFS
   */
  async storeEvidenceBundle(input: EvidenceBundleInput): Promise<StoredEvidenceBundle> {
    try {
      // Create evidence bundle
      const bundle = await this.createEvidenceBundle(input);
      
      // Validate bundle size
      const bundleJson = JSON.stringify(bundle);
      const bundleSize = Buffer.byteLength(bundleJson, 'utf8');
      
      if (bundleSize > this.MAX_BUNDLE_SIZE) {
        throw new Error(`Evidence bundle too large: ${bundleSize} bytes (max: ${this.MAX_BUNDLE_SIZE})`);
      }

      // Generate verification hash
      const verificationHash = this.generateVerificationHash(bundle);

      // Store to IPFS
      const ipfsResult = await ipfsService.uploadMetadata(bundle as any);
      
      // Pin for long-term storage
      await ipfsService.pinFile(ipfsResult.ipfsHash);

      return {
        ...bundle,
        ipfsHash: ipfsResult.ipfsHash,
        bundleSize,
        verificationHash,
      };
    } catch (error) {
      safeLogger.error('Error storing evidence bundle:', error);
      throw new Error(`Failed to store evidence bundle: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve and verify evidence bundle from IPFS
   */
  async retrieveEvidenceBundle(ipfsHash: string): Promise<EvidenceRetrievalResult> {
    try {
      // Retrieve from IPFS
      const content = await ipfsService.getContent(ipfsHash);
      const bundle = JSON.parse(content.toString()) as EvidenceBundle;

      // Verify bundle integrity
      const expectedHash = this.generateVerificationHash(bundle);
      const isValid = await this.verifyBundleIntegrity(bundle, expectedHash);

      return {
        bundle,
        ipfsHash,
        isValid,
        retrievedAt: new Date(),
      };
    } catch (error) {
      safeLogger.error('Error retrieving evidence bundle:', error);
      throw new Error(`Failed to retrieve evidence bundle: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create evidence bundle with PII redaction
   */
  private async createEvidenceBundle(input: EvidenceBundleInput): Promise<EvidenceBundle> {
    const bundle: EvidenceBundle = {
      caseId: input.caseId,
      contentHash: input.contentHash,
      modelOutputs: await this.sanitizeModelOutputs(input.modelOutputs),
      decisionRationale: input.decisionRationale,
      policyVersion: input.policyVersion,
      timestamp: new Date(),
      moderatorId: input.moderatorId,
    };

    // Add screenshots if provided
    if (input.screenshots && input.screenshots.length > 0) {
      bundle.screenshots = await this.storeScreenshots(input.screenshots);
    }

    return bundle;
  }

  /**
   * Store screenshots to IPFS and return hashes
   */
  private async storeScreenshots(screenshots: Buffer[]): Promise<string[]> {
    const screenshotHashes: string[] = [];

    for (let i = 0; i < screenshots.length; i++) {
      const screenshot = screenshots[i];
      const result = await ipfsService.uploadFile(screenshot, { metadata: { name: `screenshot_${i}.png` } });
      screenshotHashes.push(result.ipfsHash);
      
      // Pin screenshot for retention
      await ipfsService.pinFile(result.ipfsHash);
    }

    return screenshotHashes;
  }

  /**
   * Sanitize model outputs to remove sensitive data
   */
  private async sanitizeModelOutputs(modelOutputs: Record<string, AIModelResult>): Promise<Record<string, any>> {
    const sanitized: Record<string, any> = {};

    for (const [vendor, result] of Object.entries(modelOutputs)) {
      sanitized[vendor] = {
        confidence: result.confidence,
        categories: result.categories,
        reasoning: await this.redactPII(result.reasoning || ''),
        cost: result.cost,
        latency: result.latency,
        // Exclude raw response to prevent PII leakage
        rawResponse: undefined,
      };
    }

    return sanitized;
  }

  /**
   * Redact PII from text content
   */
  private async redactPII(text: string): Promise<string> {
    if (!text) return text;

    let redacted = text;

    // Email addresses
    redacted = redacted.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]');

    // Phone numbers (various formats)
    redacted = redacted.replace(/(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g, '[PHONE_REDACTED]');

    // Social Security Numbers
    redacted = redacted.replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '[SSN_REDACTED]');

    // Credit card numbers (basic pattern)
    redacted = redacted.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD_REDACTED]');

    // Crypto seed phrases (12-24 words)
    const seedPhrasePattern = /\b(?:[a-z]+\s+){11,23}[a-z]+\b/gi;
    redacted = redacted.replace(seedPhrasePattern, '[SEED_PHRASE_REDACTED]');

    // Wallet addresses (Ethereum format)
    redacted = redacted.replace(/\b0x[a-fA-F0-9]{40}\b/g, '[WALLET_ADDRESS_REDACTED]');

    // IP addresses
    redacted = redacted.replace(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g, '[IP_ADDRESS_REDACTED]');

    return redacted;
  }

  /**
   * Generate verification hash for bundle integrity
   */
  private generateVerificationHash(bundle: EvidenceBundle): string {
    const bundleString = JSON.stringify(bundle, Object.keys(bundle).sort());
    return crypto.createHash('sha256').update(bundleString).digest('hex');
  }

  /**
   * Verify bundle integrity
   */
  private async verifyBundleIntegrity(bundle: EvidenceBundle, expectedHash: string): Promise<boolean> {
    try {
      const actualHash = this.generateVerificationHash(bundle);
      return actualHash === expectedHash;
    } catch (error) {
      safeLogger.error('Error verifying bundle integrity:', error);
      return false;
    }
  }

  /**
   * Create audit record for evidence storage
   */
  async createAuditRecord(params: {
    caseId: number;
    action: string;
    actorId?: string;
    actorType: 'user' | 'moderator' | 'system' | 'ai';
    oldState?: any;
    newState?: any;
    reasoning?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<string> {
    try {
      const auditRecord = {
        id: crypto.randomUUID(),
        caseId: params.caseId,
        actionType: params.action,
        actorId: params.actorId,
        actorType: params.actorType,
        oldState: params.oldState,
        newState: params.newState,
        reasoning: await this.redactPII(params.reasoning || ''),
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        timestamp: new Date(),
        version: this.EVIDENCE_VERSION,
      };

      // Store audit record to IPFS
      const auditJson = JSON.stringify(auditRecord, null, 2);
      const result = await ipfsService.uploadFile(Buffer.from(auditJson), { metadata: { name: `audit_${auditRecord.id}.json` } });
      
      // Pin for long-term retention
      await ipfsService.pinFile(result.ipfsHash);

      return result.ipfsHash;
    } catch (error) {
      safeLogger.error('Error creating audit record:', error);
      throw new Error(`Failed to create audit record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve audit record from IPFS
   */
  async retrieveAuditRecord(ipfsHash: string): Promise<any> {
    try {
      const content = await ipfsService.getContent(ipfsHash);
      return JSON.parse(content.toString());
    } catch (error) {
      safeLogger.error('Error retrieving audit record:', error);
      throw new Error(`Failed to retrieve audit record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Batch store multiple evidence bundles
   */
  async batchStoreEvidenceBundles(inputs: EvidenceBundleInput[]): Promise<StoredEvidenceBundle[]> {
    const results: StoredEvidenceBundle[] = [];

    for (const input of inputs) {
      try {
        const result = await this.storeEvidenceBundle(input);
        results.push(result);
      } catch (error) {
        safeLogger.error(`Error storing evidence bundle for case ${input.caseId}:`, error);
        // Continue with other bundles even if one fails
      }
    }

    return results;
  }

  /**
   * Check if evidence bundle exists and is accessible
   */
  async verifyEvidenceExists(ipfsHash: string): Promise<boolean> {
    try {
      await ipfsService.getContent(ipfsHash);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get evidence bundle metadata without full retrieval
   */
  async getEvidenceBundleMetadata(ipfsHash: string): Promise<{
    exists: boolean;
    size?: number;
    caseId?: number;
    timestamp?: Date;
  }> {
    try {
      const content = await ipfsService.getContent(ipfsHash);
      const bundle = JSON.parse(content.toString()) as EvidenceBundle;

      return {
        exists: true,
        size: content.length,
        caseId: bundle.caseId,
        timestamp: bundle.timestamp,
      };
    } catch (error) {
      return { exists: false };
    }
  }

  /**
   * Clean up old evidence bundles (for compliance)
   */
  async cleanupExpiredEvidence(retentionDays: number = this.RETENTION_DAYS): Promise<number> {
    // This would typically be implemented with a database query to find expired evidence
    // and then unpin from IPFS. For now, return 0 as placeholder.
    safeLogger.info(`Cleanup would remove evidence older than ${retentionDays} days`);
    return 0;
  }

  /**
   * Generate evidence bundle summary for quick review
   */
  generateEvidenceSummary(bundle: EvidenceBundle): {
    caseId: number;
    timestamp: Date;
    modelCount: number;
    hasScreenshots: boolean;
    primaryCategory?: string;
    overallConfidence?: number;
  } {
    const modelOutputs = Object.values(bundle.modelOutputs);
    const confidences = modelOutputs.map(output => output.confidence || 0);
    const categories = modelOutputs.flatMap(output => output.categories || []);

    return {
      caseId: bundle.caseId,
      timestamp: bundle.timestamp,
      modelCount: modelOutputs.length,
      hasScreenshots: Boolean(bundle.screenshots && bundle.screenshots.length > 0),
      primaryCategory: categories[0],
      overallConfidence: confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : undefined,
    };
  }
}

export default new EvidenceStorageService();
