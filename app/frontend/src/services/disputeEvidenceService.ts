/**
 * Dispute Evidence Service
 * Handles uploading, storing, and retrieving dispute evidence via IPFS
 */

import { ipfsUploadService, UploadResult, UploadProgress } from './ipfsUploadService';
import { enhancedAuthService } from './enhancedAuthService';
import { ENV_CONFIG } from '@/config/environment';

// Evidence types supported in disputes
export type EvidenceType =
  | 'screenshot'
  | 'document'
  | 'communication'
  | 'receipt'
  | 'tracking'
  | 'photo'
  | 'video'
  | 'other';

export interface DisputeEvidence {
  id: string;
  escrowId: string;
  submittedBy: string;
  type: EvidenceType;
  title: string;
  description: string;
  ipfsHash: string;
  ipfsUrl: string;
  mimeType: string;
  fileSize: number;
  timestamp: string;
  verified: boolean;
}

export interface EvidenceSubmission {
  escrowId: string;
  type: EvidenceType;
  title: string;
  description: string;
  file: File;
}

export interface EvidenceListResponse {
  evidence: DisputeEvidence[];
  total: number;
  buyerEvidence: DisputeEvidence[];
  sellerEvidence: DisputeEvidence[];
}

// Allowed file types for evidence
const ALLOWED_EVIDENCE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'application/pdf',
  'text/plain',
  'application/json',
];

const MAX_EVIDENCE_SIZE = 25 * 1024 * 1024; // 25MB per file
const MAX_EVIDENCE_PER_PARTY = 10; // Maximum pieces of evidence per party

class DisputeEvidenceService {
  /**
   * Upload dispute evidence to IPFS and register with backend
   */
  async submitEvidence(
    submission: EvidenceSubmission,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<DisputeEvidence> {
    // Validate the file
    this.validateEvidenceFile(submission.file);

    // Upload to IPFS
    let uploadResult: UploadResult;

    try {
      // Use the existing IPFS upload service
      uploadResult = await ipfsUploadService.uploadFile(submission.file);

      // Report progress as complete after upload
      if (onProgress) {
        onProgress({ loaded: submission.file.size, total: submission.file.size, percentage: 100 });
      }
    } catch (error) {
      console.error('[DisputeEvidenceService] IPFS upload failed:', error);
      throw new Error(`Failed to upload evidence to IPFS: ${(error as Error).message}`);
    }

    // Register the evidence with the backend
    try {
      const authHeaders = await enhancedAuthService.getAuthHeaders();

      const response = await fetch(`${ENV_CONFIG.BACKEND_URL}/api/disputes/evidence`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          escrowId: submission.escrowId,
          type: submission.type,
          title: submission.title,
          description: submission.description,
          ipfsHash: uploadResult.cid,
          ipfsUrl: uploadResult.url,
          mimeType: uploadResult.type,
          fileSize: uploadResult.size,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to register evidence (${response.status})`);
      }

      const data = await response.json();
      return data.evidence;
    } catch (error) {
      console.error('[DisputeEvidenceService] Backend registration failed:', error);
      throw new Error(`Failed to register evidence: ${(error as Error).message}`);
    }
  }

  /**
   * Submit multiple pieces of evidence
   */
  async submitMultipleEvidence(
    submissions: EvidenceSubmission[],
    onProgress?: (index: number, progress: UploadProgress) => void
  ): Promise<DisputeEvidence[]> {
    const results: DisputeEvidence[] = [];

    for (let i = 0; i < submissions.length; i++) {
      const evidence = await this.submitEvidence(
        submissions[i],
        onProgress ? (progress) => onProgress(i, progress) : undefined
      );
      results.push(evidence);
    }

    return results;
  }

  /**
   * Get all evidence for a dispute
   */
  async getDisputeEvidence(escrowId: string): Promise<EvidenceListResponse> {
    try {
      const authHeaders = await enhancedAuthService.getAuthHeaders();

      const response = await fetch(
        `${ENV_CONFIG.BACKEND_URL}/api/disputes/${escrowId}/evidence`,
        {
          method: 'GET',
          headers: authHeaders,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get evidence (${response.status})`);
      }

      return await response.json();
    } catch (error) {
      console.error('[DisputeEvidenceService] Failed to get evidence:', error);
      throw error;
    }
  }

  /**
   * Get a specific piece of evidence
   */
  async getEvidence(evidenceId: string): Promise<DisputeEvidence> {
    try {
      const authHeaders = await enhancedAuthService.getAuthHeaders();

      const response = await fetch(
        `${ENV_CONFIG.BACKEND_URL}/api/disputes/evidence/${evidenceId}`,
        {
          method: 'GET',
          headers: authHeaders,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get evidence (${response.status})`);
      }

      const data = await response.json();
      return data.evidence;
    } catch (error) {
      console.error('[DisputeEvidenceService] Failed to get evidence:', error);
      throw error;
    }
  }

  /**
   * Delete evidence (only allowed before dispute is resolved)
   */
  async deleteEvidence(evidenceId: string): Promise<void> {
    try {
      const authHeaders = await enhancedAuthService.getAuthHeaders();

      const response = await fetch(
        `${ENV_CONFIG.BACKEND_URL}/api/disputes/evidence/${evidenceId}`,
        {
          method: 'DELETE',
          headers: authHeaders,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete evidence (${response.status})`);
      }
    } catch (error) {
      console.error('[DisputeEvidenceService] Failed to delete evidence:', error);
      throw error;
    }
  }

  /**
   * Verify evidence integrity by checking IPFS hash
   */
  async verifyEvidence(evidence: DisputeEvidence): Promise<boolean> {
    try {
      // Fetch the file from IPFS and verify it exists
      const response = await fetch(evidence.ipfsUrl, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get evidence submission count for a party
   */
  async getEvidenceCount(escrowId: string, party: 'buyer' | 'seller'): Promise<number> {
    const evidence = await this.getDisputeEvidence(escrowId);
    const partyEvidence = party === 'buyer' ? evidence.buyerEvidence : evidence.sellerEvidence;
    return partyEvidence.length;
  }

  /**
   * Check if party can submit more evidence
   */
  async canSubmitEvidence(escrowId: string, party: 'buyer' | 'seller'): Promise<{ allowed: boolean; remaining: number }> {
    const count = await this.getEvidenceCount(escrowId, party);
    const remaining = Math.max(0, MAX_EVIDENCE_PER_PARTY - count);
    return {
      allowed: remaining > 0,
      remaining,
    };
  }

  /**
   * Validate evidence file
   */
  private validateEvidenceFile(file: File): void {
    if (file.size > MAX_EVIDENCE_SIZE) {
      throw new Error(
        `File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(MAX_EVIDENCE_SIZE)})`
      );
    }

    if (!ALLOWED_EVIDENCE_TYPES.includes(file.type)) {
      throw new Error(
        `File type "${file.type}" is not allowed. Allowed types: images (JPEG, PNG, GIF, WebP), videos (MP4, WebM), PDF, and plain text.`
      );
    }
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get allowed file types
   */
  getAllowedTypes(): string[] {
    return [...ALLOWED_EVIDENCE_TYPES];
  }

  /**
   * Get maximum file size
   */
  getMaxFileSize(): number {
    return MAX_EVIDENCE_SIZE;
  }

  /**
   * Get maximum evidence count per party
   */
  getMaxEvidencePerParty(): number {
    return MAX_EVIDENCE_PER_PARTY;
  }
}

export const disputeEvidenceService = new DisputeEvidenceService();
