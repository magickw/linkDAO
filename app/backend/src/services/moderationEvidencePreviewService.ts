import { databaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { moderationCases } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';
import { ModerationErrorHandler, ModerationErrorType } from '../utils/moderationErrorHandler';

export interface EvidencePreview {
  caseId: number;
  contentId: string;
  contentType: string;
  evidenceCid: string;
  evidenceContentHash: string;
  previewUrl: string;
  previewGeneratedAt: Date;
  isVerified: boolean;
  verificationDetails: {
    hashMatch: boolean;
    cidValid: boolean;
    timestamp: Date;
  };
}

export interface EvidenceContent {
  text?: string;
  mediaUrls?: string[];
  vendorResults?: Array<{
    vendor: string;
    confidence: number;
    categories: string[];
    reasoning?: string;
  }>;
  metadata?: Record<string, any>;
}

/**
 * Service for generating and verifying evidence previews for moderation cases
 */
export class ModerationEvidencePreviewService {
  private ipfsGatewayUrl: string;
  private previewCache = new Map<string, { preview: EvidencePreview; timestamp: number }>();
  private readonly CACHE_TTL = 3600000; // 1 hour

  constructor() {
    // Use public IPFS gateway (can be configured to use custom gateway)
    this.ipfsGatewayUrl = process.env.IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs/';
  }

  /**
   * Generate evidence preview for a moderation case
   */
  async generateEvidencePreview(caseId: number): Promise<EvidencePreview> {
    try {
      const db = databaseService.getDatabase();

      // Get moderation case
      const [caseData] = await db
        .select()
        .from(moderationCases)
        .where(eq(moderationCases.id, caseId));

      if (!caseData) {
        throw ModerationErrorHandler.handleBusinessLogicError(
          ModerationErrorType.MODERATION_CASE_NOT_FOUND,
          `Moderation case ${caseId} not found`,
          { caseId }
        );
      }

      // Check if evidence CID exists
      if (!caseData.evidenceCid) {
        throw ModerationErrorHandler.handleBusinessLogicError(
          ModerationErrorType.INVALID_INPUT,
          'No evidence CID available for this case',
          { caseId }
        );
      }

      // Retrieve evidence from IPFS
      const evidenceContent = await this.retrieveEvidenceFromIPFS(caseData.evidenceCid);

      // Generate content hash
      const contentHash = this.generateContentHash(evidenceContent);

      // Generate preview URL
      const previewUrl = this.generatePreviewUrl(caseData.evidenceCid, evidenceContent);

      // Verify evidence integrity
      const verificationDetails = await this.verifyEvidenceIntegrity(
        caseData.evidenceCid,
        contentHash,
        caseData.evidenceContentHash
      );

      // Create preview object
      const preview: EvidencePreview = {
        caseId,
        contentId: caseData.contentId,
        contentType: caseData.contentType,
        evidenceCid: caseData.evidenceCid,
        evidenceContentHash: contentHash,
        previewUrl,
        previewGeneratedAt: new Date(),
        isVerified: verificationDetails.hashMatch && verificationDetails.cidValid,
        verificationDetails
      };

      // Update case with preview data
      await db
        .update(moderationCases)
        .set({
          evidencePreviewUrl: previewUrl,
          evidencePreviewGeneratedAt: new Date(),
          evidenceContentHash: contentHash
        })
        .where(eq(moderationCases.id, caseId));

      // Cache the preview
      this.previewCache.set(`case_${caseId}`, { preview, timestamp: Date.now() });

      safeLogger.info(`Generated evidence preview for case ${caseId}`);
      return preview;

    } catch (error) {
      safeLogger.error(`Failed to generate evidence preview for case ${caseId}:`, error);
      throw ModerationErrorHandler.wrapError(error, 'generateEvidencePreview');
    }
  }

  /**
   * Get evidence preview (from cache or generate new)
   */
  async getEvidencePreview(caseId: number): Promise<EvidencePreview> {
    const cacheKey = `case_${caseId}`;
    const cached = this.previewCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.preview;
    }

    return await this.generateEvidencePreview(caseId);
  }

  /**
   * Retrieve evidence from IPFS
   */
  private async retrieveEvidenceFromIPFS(cid: string): Promise<EvidenceContent> {
    try {
      const url = `${this.ipfsGatewayUrl}${cid}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`IPFS retrieval failed: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        return await response.json();
      } else {
        // Treat as text content
        const text = await response.text();
        return { text };
      }

    } catch (error) {
      safeLogger.error(`Failed to retrieve evidence from IPFS (CID: ${cid}):`, error);
      throw ModerationErrorHandler.handleIPFSError(error, 'retrieval', 'retrieveEvidenceFromIPFS');
    }
  }

  /**
   * Generate content hash for evidence
   */
  private generateContentHash(content: EvidenceContent): string {
    const contentString = JSON.stringify(content);
    return createHash('sha256').update(contentString).digest('hex');
  }

  /**
   * Generate preview URL for evidence
   */
  private generatePreviewUrl(cid: string, content: EvidenceContent): string {
    // For JSON content, use IPFS gateway with format query
    if (content.text !== undefined || content.vendorResults) {
      return `${this.ipfsGatewayUrl}${cid}?format=json`;
    }
    
    // For media content, return direct gateway URL
    return `${this.ipfsGatewayUrl}${cid}`;
  }

  /**
   * Verify evidence integrity
   */
  private async verifyEvidenceIntegrity(
    cid: string,
    currentHash: string,
    storedHash?: string | null
  ): Promise<{
    hashMatch: boolean;
    cidValid: boolean;
    timestamp: Date;
  }> {
    const verification = {
      hashMatch: false,
      cidValid: true, // Assume valid if retrieval succeeded
      timestamp: new Date()
    };

    // Verify hash if stored hash exists
    if (storedHash) {
      verification.hashMatch = currentHash === storedHash;
      
      if (!verification.hashMatch) {
        safeLogger.warn(`Evidence hash mismatch for CID ${cid}:`, {
          stored: storedHash,
          current: currentHash
        });
      }
    } else {
      // No stored hash to compare, consider it valid
      verification.hashMatch = true;
    }

    // Basic CID validation
    verification.cidValid = this.isValidCID(cid);

    return verification;
  }

  /**
   * Validate CID format
   */
  private isValidCID(cid: string): boolean {
    // Basic CID validation - should start with valid CIDv0 or CIDv1 format
    const cidv0Pattern = /^Qm[a-zA-Z0-9]{44}$/;
    const cidv1Pattern = /^[a-zA-Z0-9]+$/;
    
    return cidv0Pattern.test(cid) || (cid.length >= 1 && cidv1Pattern.test(cid));
  }

  /**
   * Batch generate evidence previews for multiple cases
   */
  async batchGenerateEvidencePreviews(caseIds: number[]): Promise<Map<number, EvidencePreview>> {
    const results = new Map<number, EvidencePreview>();

    // Process in parallel with concurrency limit
    const concurrencyLimit = 5;
    for (let i = 0; i < caseIds.length; i += concurrencyLimit) {
      const batch = caseIds.slice(i, i + concurrencyLimit);
      
      const promises = batch.map(async (caseId) => {
        try {
          const preview = await this.generateEvidencePreview(caseId);
          results.set(caseId, preview);
        } catch (error) {
          safeLogger.error(`Failed to generate preview for case ${caseId}:`, error);
          // Continue with other cases even if one fails
        }
      });

      await Promise.allSettled(promises);
    }

    return results;
  }

  /**
   * Clear preview cache
   */
  clearCache(): void {
    this.previewCache.clear();
    safeLogger.info('Evidence preview cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    ttl: number;
    entries: number;
  } {
    return {
      size: this.previewCache.size,
      ttl: this.CACHE_TTL,
      entries: this.previewCache.size
    };
  }

  /**
   * Verify evidence hash for a case
   */
  async verifyEvidenceHash(caseId: number, providedHash: string): Promise<boolean> {
    try {
      const db = databaseService.getDatabase();

      const [caseData] = await db
        .select()
        .from(moderationCases)
        .where(eq(moderationCases.id, caseId));

      if (!caseData || !caseData.evidenceContentHash) {
        throw ModerationErrorHandler.handleBusinessLogicError(
          ModerationErrorType.MODERATION_CASE_NOT_FOUND,
          'Case or evidence hash not found',
          { caseId }
        );
      }

      const isValid = caseData.evidenceContentHash === providedHash;

      if (!isValid) {
        safeLogger.warn(`Evidence hash verification failed for case ${caseId}:`, {
          expected: caseData.evidenceContentHash,
          provided: providedHash
        });
      }

      return isValid;

    } catch (error) {
      safeLogger.error(`Failed to verify evidence hash for case ${caseId}:`, error);
      throw ModerationErrorHandler.wrapError(error, 'verifyEvidenceHash');
    }
  }

  /**
   * Regenerate evidence preview (force refresh)
   */
  async regenerateEvidencePreview(caseId: number): Promise<EvidencePreview> {
    // Clear cache for this case
    this.previewCache.delete(`case_${caseId}`);
    
    // Generate new preview
    return await this.generateEvidencePreview(caseId);
  }
}

export const moderationEvidencePreviewService = new ModerationEvidencePreviewService();