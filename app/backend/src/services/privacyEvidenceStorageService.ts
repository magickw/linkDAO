import { createHash, createCipher, createDecipher, randomBytes } from 'crypto';
import { piiDetectionService } from './piiDetectionService';
import { geofencingComplianceService } from './geofencingComplianceService';

export interface EvidenceBundle {
  id: string;
  caseId: number;
  contentHash: string;
  evidenceType: 'moderation_decision' | 'appeal_evidence' | 'audit_trail';
  
  // Privacy-compliant content
  safeContent: string;
  redactedScreenshots?: string[];
  modelOutputs: Record<string, any>;
  decisionRationale: string;
  
  // Metadata
  policyVersion: string;
  timestamp: Date;
  moderatorId?: string;
  region: string;
  
  // Privacy and security
  encryptionKey?: string;
  piiRedactionMap?: Record<string, string>;
  retentionExpiresAt: Date;
  accessLog: AccessLogEntry[];
  
  // Compliance
  legalBasis: string;
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  processingPurpose: string;
}

export interface AccessLogEntry {
  accessedBy: string;
  accessedAt: Date;
  purpose: string;
  ipAddress: string;
  userAgent: string;
}

export interface PrivacyStorageOptions {
  encryptSensitive: boolean;
  redactPII: boolean;
  region: string;
  retentionDays?: number;
  dataClassification: EvidenceBundle['dataClassification'];
  legalBasis: string;
  processingPurpose: string;
}

export interface StorageResult {
  evidenceId: string;
  ipfsCid?: string;
  encryptionApplied: boolean;
  piiRedacted: boolean;
  retentionExpiresAt: Date;
  accessKey?: string;
}

export interface RetrievalOptions {
  includeRedactedContent: boolean;
  purpose: string;
  requestedBy: string;
  ipAddress: string;
  userAgent: string;
}

export interface RetrievalResult {
  evidence: EvidenceBundle;
  accessGranted: boolean;
  redactionApplied: boolean;
  accessLogged: boolean;
}

export class PrivacyEvidenceStorageService {
  private evidenceStore: Map<string, EvidenceBundle> = new Map();
  private encryptionKeys: Map<string, string> = new Map();

  /**
   * Store evidence bundle with privacy compliance
   */
  async storeEvidence(
    caseId: number,
    content: string,
    modelOutputs: Record<string, any>,
    decisionRationale: string,
    options: PrivacyStorageOptions
  ): Promise<StorageResult> {
    const evidenceId = this.generateEvidenceId();
    const timestamp = new Date();
    
    // Determine retention period based on region and classification
    const retentionDays = options.retentionDays || 
      this.getDefaultRetentionPeriod(options.region, options.dataClassification);
    
    const retentionExpiresAt = new Date();
    retentionExpiresAt.setDate(retentionExpiresAt.getDate() + retentionDays);

    // Process content for privacy compliance
    let safeContent = content;
    let piiRedactionMap: Record<string, string> | undefined;
    let piiRedacted = false;

    if (options.redactPII) {
      const piiResult = await piiDetectionService.createSafeEvidence(content);
      safeContent = piiResult.safeContent;
      piiRedactionMap = piiResult.piiMap;
      piiRedacted = Object.keys(piiResult.piiMap).length > 0;
    }

    // Apply encryption if required
    let encryptionKey: string | undefined;
    let encryptionApplied = false;

    if (options.encryptSensitive || options.dataClassification === 'restricted' || options.dataClassification === 'confidential') {
      encryptionKey = this.generateEncryptionKey();
      safeContent = this.encryptContent(safeContent, encryptionKey);
      
      if (piiRedactionMap) {
        piiRedactionMap = this.encryptPIIMap(piiRedactionMap, encryptionKey);
      }
      
      encryptionApplied = true;
    }

    // Create content hash for integrity
    const contentHash = this.createContentHash(content);

    // Create evidence bundle
    const evidenceBundle: EvidenceBundle = {
      id: evidenceId,
      caseId,
      contentHash,
      evidenceType: 'moderation_decision',
      safeContent,
      modelOutputs: this.sanitizeModelOutputs(modelOutputs),
      decisionRationale,
      policyVersion: '1.0',
      timestamp,
      region: options.region,
      encryptionKey: encryptionKey ? this.hashKey(encryptionKey) : undefined,
      piiRedactionMap,
      retentionExpiresAt,
      accessLog: [],
      legalBasis: options.legalBasis,
      dataClassification: options.dataClassification,
      processingPurpose: options.processingPurpose
    };

    // Store evidence bundle
    await this.persistEvidenceBundle(evidenceBundle);
    
    // Store encryption key separately if used
    if (encryptionKey) {
      this.encryptionKeys.set(evidenceId, encryptionKey);
    }

    // TODO: Store to IPFS for immutable evidence
    const ipfsCid = await this.storeToIPFS(evidenceBundle);

    return {
      evidenceId,
      ipfsCid,
      encryptionApplied,
      piiRedacted,
      retentionExpiresAt,
      accessKey: encryptionKey ? this.hashKey(encryptionKey) : undefined
    };
  }

  /**
   * Retrieve evidence bundle with access control
   */
  async retrieveEvidence(
    evidenceId: string,
    options: RetrievalOptions
  ): Promise<RetrievalResult | null> {
    const evidence = this.evidenceStore.get(evidenceId);
    
    if (!evidence) {
      return null;
    }

    // Check retention expiration
    if (evidence.retentionExpiresAt < new Date()) {
      // Evidence has expired, should be deleted
      await this.deleteExpiredEvidence(evidenceId);
      return null;
    }

    // Log access
    const accessEntry: AccessLogEntry = {
      accessedBy: options.requestedBy,
      accessedAt: new Date(),
      purpose: options.purpose,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent
    };

    evidence.accessLog.push(accessEntry);
    await this.updateEvidenceBundle(evidence);

    // Decrypt content if encrypted
    let processedEvidence = { ...evidence };
    let redactionApplied = false;

    if (evidence.encryptionKey) {
      const encryptionKey = this.encryptionKeys.get(evidenceId);
      if (encryptionKey) {
        processedEvidence.safeContent = this.decryptContent(evidence.safeContent, encryptionKey);
        
        if (evidence.piiRedactionMap && options.includeRedactedContent) {
          processedEvidence.piiRedactionMap = this.decryptPIIMap(evidence.piiRedactionMap, encryptionKey);
        }
      }
    }

    // Apply additional redaction if not authorized for full content
    if (!options.includeRedactedContent && evidence.piiRedactionMap) {
      redactionApplied = true;
      // Keep content redacted
    }

    return {
      evidence: processedEvidence,
      accessGranted: true,
      redactionApplied,
      accessLogged: true
    };
  }

  /**
   * Update evidence bundle (for appeals, additional context)
   */
  async updateEvidence(
    evidenceId: string,
    updates: Partial<EvidenceBundle>,
    updatedBy: string
  ): Promise<boolean> {
    const evidence = this.evidenceStore.get(evidenceId);
    
    if (!evidence) {
      return false;
    }

    // Log the update
    const accessEntry: AccessLogEntry = {
      accessedBy: updatedBy,
      accessedAt: new Date(),
      purpose: 'evidence_update',
      ipAddress: 'system',
      userAgent: 'system'
    };

    evidence.accessLog.push(accessEntry);

    // Apply updates (only allow certain fields to be updated)
    const allowedUpdates = ['decisionRationale', 'modelOutputs', 'evidenceType'];
    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        (evidence as any)[key] = value;
      }
    }

    await this.updateEvidenceBundle(evidence);
    return true;
  }

  /**
   * Delete evidence (for right to erasure)
   */
  async deleteEvidence(evidenceId: string, reason: string): Promise<boolean> {
    const evidence = this.evidenceStore.get(evidenceId);
    
    if (!evidence) {
      return false;
    }

    // Log deletion
    const accessEntry: AccessLogEntry = {
      accessedBy: 'system',
      accessedAt: new Date(),
      purpose: `deletion: ${reason}`,
      ipAddress: 'system',
      userAgent: 'system'
    };

    evidence.accessLog.push(accessEntry);

    // Remove from storage
    this.evidenceStore.delete(evidenceId);
    this.encryptionKeys.delete(evidenceId);

    // TODO: Remove from IPFS (if possible) or mark as deleted
    await this.markIPFSDeleted(evidenceId);

    return true;
  }

  /**
   * Get evidence access log
   */
  async getAccessLog(evidenceId: string): Promise<AccessLogEntry[]> {
    const evidence = this.evidenceStore.get(evidenceId);
    return evidence ? [...evidence.accessLog] : [];
  }

  /**
   * Clean up expired evidence
   */
  async cleanupExpiredEvidence(): Promise<number> {
    const now = new Date();
    let deletedCount = 0;

    for (const [evidenceId, evidence] of this.evidenceStore.entries()) {
      if (evidence.retentionExpiresAt < now) {
        await this.deleteExpiredEvidence(evidenceId);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Get evidence statistics
   */
  async getStorageStatistics(): Promise<{
    totalEvidence: number;
    encryptedEvidence: number;
    expiredEvidence: number;
    totalAccessLogs: number;
    storageByClassification: Record<string, number>;
  }> {
    const now = new Date();
    let totalEvidence = 0;
    let encryptedEvidence = 0;
    let expiredEvidence = 0;
    let totalAccessLogs = 0;
    const storageByClassification: Record<string, number> = {};

    for (const evidence of this.evidenceStore.values()) {
      totalEvidence++;
      
      if (evidence.encryptionKey) {
        encryptedEvidence++;
      }
      
      if (evidence.retentionExpiresAt < now) {
        expiredEvidence++;
      }
      
      totalAccessLogs += evidence.accessLog.length;
      
      storageByClassification[evidence.dataClassification] = 
        (storageByClassification[evidence.dataClassification] || 0) + 1;
    }

    return {
      totalEvidence,
      encryptedEvidence,
      expiredEvidence,
      totalAccessLogs,
      storageByClassification
    };
  }

  private generateEvidenceId(): string {
    return `evidence_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  private generateEncryptionKey(): string {
    return randomBytes(32).toString('hex');
  }

  private createContentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  private encryptContent(content: string, key: string): string {
    const cipher = createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(content, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private decryptContent(encryptedContent: string, key: string): string {
    const decipher = createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private encryptPIIMap(piiMap: Record<string, string>, key: string): Record<string, string> {
    const encrypted: Record<string, string> = {};
    for (const [k, v] of Object.entries(piiMap)) {
      encrypted[k] = this.encryptContent(v, key);
    }
    return encrypted;
  }

  private decryptPIIMap(encryptedPIIMap: Record<string, string>, key: string): Record<string, string> {
    const decrypted: Record<string, string> = {};
    for (const [k, v] of Object.entries(encryptedPIIMap)) {
      decrypted[k] = this.decryptContent(v, key);
    }
    return decrypted;
  }

  private sanitizeModelOutputs(outputs: Record<string, any>): Record<string, any> {
    // Remove any potentially sensitive information from model outputs
    const sanitized = { ...outputs };
    
    // Remove raw API responses that might contain sensitive data
    delete sanitized.rawResponse;
    delete sanitized.debugInfo;
    
    return sanitized;
  }

  private getDefaultRetentionPeriod(region: string, classification: EvidenceBundle['dataClassification']): number {
    // Get region-specific retention requirements
    const baseRetention = geofencingComplianceService.getDataRetentionPeriod(region, 'UNKNOWN');
    
    // Adjust based on data classification
    const classificationMultiplier = {
      'public': 0.5,
      'internal': 1.0,
      'confidential': 1.5,
      'restricted': 2.0
    };

    return Math.floor(baseRetention * classificationMultiplier[classification]);
  }

  private async persistEvidenceBundle(evidence: EvidenceBundle): Promise<void> {
    this.evidenceStore.set(evidence.id, evidence);
    
    // TODO: Persist to database
    console.log(`Stored evidence bundle ${evidence.id}`);
  }

  private async updateEvidenceBundle(evidence: EvidenceBundle): Promise<void> {
    this.evidenceStore.set(evidence.id, evidence);
    
    // TODO: Update in database
    console.log(`Updated evidence bundle ${evidence.id}`);
  }

  private async deleteExpiredEvidence(evidenceId: string): Promise<void> {
    this.evidenceStore.delete(evidenceId);
    this.encryptionKeys.delete(evidenceId);
    
    // TODO: Remove from database and IPFS
    console.log(`Deleted expired evidence ${evidenceId}`);
  }

  private async storeToIPFS(evidence: EvidenceBundle): Promise<string> {
    // TODO: Implement IPFS storage
    // For now, return a mock CID
    const mockCid = `Qm${randomBytes(22).toString('base64').replace(/[^a-zA-Z0-9]/g, '')}`;
    console.log(`Stored evidence ${evidence.id} to IPFS: ${mockCid}`);
    return mockCid;
  }

  private async markIPFSDeleted(evidenceId: string): Promise<void> {
    // TODO: Implement IPFS deletion marking
    console.log(`Marked IPFS evidence ${evidenceId} as deleted`);
  }
}

export const privacyEvidenceStorageService = new PrivacyEvidenceStorageService();