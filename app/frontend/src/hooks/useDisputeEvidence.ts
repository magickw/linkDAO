/**
 * useDisputeEvidence Hook
 * React hook for managing dispute evidence
 */

import { useState, useCallback } from 'react';
import {
  disputeEvidenceService,
  DisputeEvidence,
  EvidenceSubmission,
  EvidenceType,
  EvidenceListResponse,
} from '../services/disputeEvidenceService';
import { UploadProgress } from '../services/ipfsUploadService';
import { useToast } from '../context/ToastContext';

interface UseDisputeEvidenceResult {
  // State
  evidence: DisputeEvidence[];
  buyerEvidence: DisputeEvidence[];
  sellerEvidence: DisputeEvidence[];
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: UploadProgress | null;
  error: string | null;

  // Actions
  loadEvidence: (escrowId: string) => Promise<void>;
  submitEvidence: (submission: Omit<EvidenceSubmission, 'escrowId'>, escrowId: string) => Promise<DisputeEvidence | null>;
  deleteEvidence: (evidenceId: string) => Promise<boolean>;
  verifyEvidence: (evidence: DisputeEvidence) => Promise<boolean>;
  canSubmitMore: (escrowId: string, party: 'buyer' | 'seller') => Promise<{ allowed: boolean; remaining: number }>;
  clearError: () => void;

  // Helpers
  allowedTypes: string[];
  maxFileSize: number;
  maxEvidencePerParty: number;
}

export function useDisputeEvidence(): UseDisputeEvidenceResult {
  const { addToast } = useToast();

  const [evidence, setEvidence] = useState<DisputeEvidence[]>([]);
  const [buyerEvidence, setBuyerEvidence] = useState<DisputeEvidence[]>([]);
  const [sellerEvidence, setSellerEvidence] = useState<DisputeEvidence[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load evidence for a dispute
  const loadEvidence = useCallback(async (escrowId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result: EvidenceListResponse = await disputeEvidenceService.getDisputeEvidence(escrowId);
      setEvidence(result.evidence);
      setBuyerEvidence(result.buyerEvidence);
      setSellerEvidence(result.sellerEvidence);
    } catch (err) {
      const message = (err as Error).message || 'Failed to load evidence';
      setError(message);
      console.error('[useDisputeEvidence] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Submit new evidence
  const submitEvidence = useCallback(
    async (
      submission: Omit<EvidenceSubmission, 'escrowId'>,
      escrowId: string
    ): Promise<DisputeEvidence | null> => {
      setIsUploading(true);
      setUploadProgress(null);
      setError(null);

      try {
        const fullSubmission: EvidenceSubmission = {
          ...submission,
          escrowId,
        };

        const newEvidence = await disputeEvidenceService.submitEvidence(
          fullSubmission,
          (progress) => setUploadProgress(progress)
        );

        // Update local state
        setEvidence((prev) => [...prev, newEvidence]);

        addToast('Evidence submitted successfully', 'success');
        return newEvidence;
      } catch (err) {
        const message = (err as Error).message || 'Failed to submit evidence';
        setError(message);
        addToast(message, 'error');
        console.error('[useDisputeEvidence] Submit error:', err);
        return null;
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
      }
    },
    [addToast]
  );

  // Delete evidence
  const deleteEvidenceAction = useCallback(
    async (evidenceId: string): Promise<boolean> => {
      setError(null);

      try {
        await disputeEvidenceService.deleteEvidence(evidenceId);

        // Update local state
        setEvidence((prev) => prev.filter((e) => e.id !== evidenceId));
        setBuyerEvidence((prev) => prev.filter((e) => e.id !== evidenceId));
        setSellerEvidence((prev) => prev.filter((e) => e.id !== evidenceId));

        addToast('Evidence deleted', 'info');
        return true;
      } catch (err) {
        const message = (err as Error).message || 'Failed to delete evidence';
        setError(message);
        addToast(message, 'error');
        console.error('[useDisputeEvidence] Delete error:', err);
        return false;
      }
    },
    [addToast]
  );

  // Verify evidence
  const verifyEvidence = useCallback(async (evidenceItem: DisputeEvidence): Promise<boolean> => {
    try {
      return await disputeEvidenceService.verifyEvidence(evidenceItem);
    } catch {
      return false;
    }
  }, []);

  // Check if party can submit more evidence
  const canSubmitMore = useCallback(
    async (
      escrowId: string,
      party: 'buyer' | 'seller'
    ): Promise<{ allowed: boolean; remaining: number }> => {
      try {
        return await disputeEvidenceService.canSubmitEvidence(escrowId, party);
      } catch {
        return { allowed: false, remaining: 0 };
      }
    },
    []
  );

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    evidence,
    buyerEvidence,
    sellerEvidence,
    isLoading,
    isUploading,
    uploadProgress,
    error,

    // Actions
    loadEvidence,
    submitEvidence,
    deleteEvidence: deleteEvidenceAction,
    verifyEvidence,
    canSubmitMore,
    clearError,

    // Helpers
    allowedTypes: disputeEvidenceService.getAllowedTypes(),
    maxFileSize: disputeEvidenceService.getMaxFileSize(),
    maxEvidencePerParty: disputeEvidenceService.getMaxEvidencePerParty(),
  };
}

/**
 * Evidence type labels for UI
 */
export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  screenshot: 'Screenshot',
  document: 'Document',
  communication: 'Communication Record',
  receipt: 'Receipt/Invoice',
  tracking: 'Shipping/Tracking Info',
  photo: 'Photo',
  video: 'Video',
  other: 'Other',
};

/**
 * Get file accept string for input element
 */
export function getEvidenceAcceptString(): string {
  return disputeEvidenceService.getAllowedTypes().join(',');
}
