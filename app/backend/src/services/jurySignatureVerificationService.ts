import { safeLogger } from '../utils/safeLogger';
import { databaseService } from './databaseService';
import { appeal_jurors, moderation_appeals } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { createHash } from 'crypto';
import { ModerationErrorHandler, ModerationErrorType } from '../utils/moderationErrorHandler';

export interface VoteData {
  appealId: number;
  jurorId: string;
  vote: 'uphold' | 'overturn' | 'partial';
  voteReveal?: string;
  timestamp: number;
}

export interface SignatureVerificationResult {
  isValid: boolean;
  jurorId: string;
  recoveredAddress?: string;
  error?: string;
  verifiedAt: Date;
}

/**
 * Service for verifying cryptographic signatures on jury votes
 */
export class JurySignatureVerificationService {
  /**
   * Verify a juror's vote signature
   */
  async verifyVoteSignature(
    appealId: number,
    jurorId: string,
    signature: string,
    voteData: VoteData
  ): Promise<SignatureVerificationResult> {
    try {
      const db = databaseService.getDatabase();

      // Get appeal and juror data
      const [appeal] = await db
        .select()
        .from(moderation_appeals)
        .where(eq(moderation_appeals.id, appealId));

      if (!appeal) {
        throw ModerationErrorHandler.handleBusinessLogicError(
          ModerationErrorType.MODERATION_CASE_NOT_FOUND,
          'Appeal not found',
          { appealId }
        );
      }

      // Check if appeal is in voting phase
      if (appeal.status !== 'voting') {
        throw ModerationErrorHandler.handleBusinessLogicError(
          ModerationErrorType.UNAUTHORIZED_MODERATION_ACTION,
          'Appeal is not in voting phase',
          { appealId, status: appeal.status }
        );
      }

      // Check if juror is part of this appeal
      const [juror] = await db
        .select()
        .from(appeal_jurors)
        .where(
          and(
            eq(appeal_jurors.appealId, appealId),
            eq(appeal_jurors.jurorId, jurorId)
          )
        );

      if (!juror) {
        throw ModerationErrorHandler.handleBusinessLogicError(
          ModerationErrorType.UNAUTHORIZED_MODERATION_ACTION,
          'Juror not part of this appeal',
          { appealId, jurorId }
        );
      }

      // Construct message to verify
      const message = this.constructVoteMessage(voteData, appeal.caseId);

      // Verify signature
      const verification = await this.verifyEthereumSignature(
        message,
        signature
      );

      if (!verification.isValid) {
        safeLogger.warn('Vote signature verification failed:', {
          appealId,
          jurorId,
          error: verification.error
        });

        return {
          isValid: false,
          jurorId,
          error: verification.error,
          verifiedAt: new Date()
        };
      }

      // Check if recovered address matches juror's wallet address
      // (Assuming jurorId is a wallet address - adjust if different)
      const walletAddressMatch = this.recoveredAddressMatches(
        verification.recoveredAddress,
        jurorId
      );

      if (!walletAddressMatch) {
        safeLogger.warn('Vote signature address mismatch:', {
          appealId,
          jurorId,
          recoveredAddress: verification.recoveredAddress
        });

        return {
          isValid: false,
          jurorId,
          recoveredAddress: verification.recoveredAddress,
          error: 'Signature address does not match juror',
          verifiedAt: new Date()
        };
      }

      // Update juror record with verified signature
      await db
        .update(appeal_jurors)
        .set({
          vote_signature: signature,
          vote_signature_verified: true,
          signature_timestamp: new Date()
        })
        .where(
          and(
            eq(appeal_jurors.appealId, appealId),
            eq(appeal_jurors.jurorId, jurorId)
          )
        );

      safeLogger.info('Vote signature verified successfully:', {
        appealId,
        jurorId,
        recoveredAddress: verification.recoveredAddress
      });

      return {
        isValid: true,
        jurorId,
        recoveredAddress: verification.recoveredAddress,
        verifiedAt: new Date()
      };

    } catch (error) {
      safeLogger.error(`Failed to verify vote signature for appeal ${appealId}, juror ${jurorId}:`, error);
      
      if (error instanceof ModerationErrorHandler || error.name === 'ModerationError') {
        throw error;
      }
      
      return {
        isValid: false,
        jurorId,
        error: error instanceof Error ? error.message : 'Unknown error',
        verifiedAt: new Date()
      };
    }
  }

  /**
   * Verify a commitment signature (for commit-reveal voting)
   */
  async verifyCommitmentSignature(
    appealId: number,
    jurorId: string,
    commitmentHash: string,
    signature: string
  ): Promise<SignatureVerificationResult> {
    try {
      const db = databaseService.getDatabase();

      // Check if juror is part of this appeal
      const [juror] = await db
        .select()
        .from(appeal_jurors)
        .where(
          and(
            eq(appeal_jurors.appealId, appealId),
            eq(appeal_jurors.jurorId, jurorId)
          )
        );

      if (!juror) {
        throw ModerationErrorHandler.handleBusinessLogicError(
          ModerationErrorType.UNAUTHORIZED_MODERATION_ACTION,
          'Juror not part of this appeal',
          { appealId, jurorId }
        );
      }

      // Construct commitment message
      const message = `Commit vote for appeal #${appealId}\nCommitment: ${commitmentHash}\nTimestamp: ${Date.now()}`;

      // Verify signature
      const verification = await this.verifyEthereumSignature(message, signature);

      if (!verification.isValid) {
        return {
          isValid: false,
          jurorId,
          error: verification.error,
          verifiedAt: new Date()
        };
      }

      // Verify address match
      const walletAddressMatch = this.recoveredAddressMatches(
        verification.recoveredAddress,
        jurorId
      );

      if (!walletAddressMatch) {
        return {
          isValid: false,
          jurorId,
          recoveredAddress: verification.recoveredAddress,
          error: 'Signature address does not match juror',
          verifiedAt: new Date()
        };
      }

      // Update juror record with commitment
      await db
        .update(appeal_jurors)
        .set({
          vote_commitment: commitmentHash
        })
        .where(
          and(
            eq(appeal_jurors.appealId, appealId),
            eq(appeal_jurors.jurorId, jurorId)
          )
        );

      return {
        isValid: true,
        jurorId,
        recoveredAddress: verification.recoveredAddress,
        verifiedAt: new Date()
      };

    } catch (error) {
      safeLogger.error(`Failed to verify commitment signature for appeal ${appealId}, juror ${jurorId}:`, error);
      
      return {
        isValid: false,
        jurorId,
        error: error instanceof Error ? error.message : 'Unknown error',
        verifiedAt: new Date()
      };
    }
  }

  /**
   * Verify a reveal signature (for commit-reveal voting)
   */
  async verifyRevealSignature(
    appealId: number,
    jurorId: string,
    vote: 'uphold' | 'overturn' | 'partial',
    signature: string,
    nonce?: string
  ): Promise<SignatureVerificationResult> {
    try {
      const db = databaseService.getDatabase();

      // Get juror's commitment
      const [juror] = await db
        .select()
        .from(appeal_jurors)
        .where(
          and(
            eq(appeal_jurors.appealId, appealId),
            eq(appeal_jurors.jurorId, jurorId)
          )
        );

      if (!juror) {
        throw ModerationErrorHandler.handleBusinessLogicError(
          ModerationErrorType.UNAUTHORIZED_MODERATION_ACTION,
          'Juror not part of this appeal',
          { appealId, jurorId }
        );
      }

      if (!juror.voteCommitment) {
        throw ModerationErrorHandler.handleBusinessLogicError(
          ModerationErrorType.UNAUTHORIZED_MODERATION_ACTION,
          'No commitment found for juror',
          { appealId, jurorId }
        );
      }

      // Construct reveal message
      const noncePart = nonce ? `\nNonce: ${nonce}` : '';
      const message = `Reveal vote for appeal #${appealId}\nVote: ${vote}${noncePart}`;

      // Verify signature
      const verification = await this.verifyEthereumSignature(message, signature);

      if (!verification.isValid) {
        return {
          isValid: false,
          jurorId,
          error: verification.error,
          verifiedAt: new Date()
        };
      }

      // Verify address match
      const walletAddressMatch = this.recoveredAddressMatches(
        verification.recoveredAddress,
        jurorId
      );

      if (!walletAddressMatch) {
        return {
          isValid: false,
          jurorId,
          recoveredAddress: verification.recoveredAddress,
          error: 'Signature address does not match juror',
          verifiedAt: new Date()
        };
      }

      return {
        isValid: true,
        jurorId,
        recoveredAddress: verification.recoveredAddress,
        verifiedAt: new Date()
      };

    } catch (error) {
      safeLogger.error(`Failed to verify reveal signature for appeal ${appealId}, juror ${jurorId}:`, error);
      
      return {
        isValid: false,
        jurorId,
        error: error instanceof Error ? error.message : 'Unknown error',
        verifiedAt: new Date()
      };
    }
  }

  /**
   * Verify Ethereum signature
   */
  private async verifyEthereumSignature(
    message: string,
    signature: string
  ): Promise<{ isValid: boolean; recoveredAddress?: string; error?: string }> {
    try {
      // In a real implementation, you would use ethers.js or viem to recover the address
      // For now, we'll implement a simplified version
      
      // Add Ethereum message prefix
      const prefix = '\x19Ethereum Signed Message:\n' + message.length;
      const prefixedMessage = prefix + message;
      
      // Hash the message
      const messageHash = createHash('sha256').update(prefixedMessage).digest('hex');
      
      // Note: This is a simplified implementation. In production, use ethers.js or viem:
      // const recoveredAddress = ethers.utils.verifyMessage(message, signature);
      
      // For now, return a placeholder - this would need proper ECDSA signature recovery
      // This requires a library like ethers.js, viem, or web3.js
      
      safeLogger.warn('Ethereum signature verification requires ethers.js or viem library');
      
      return {
        isValid: false,
        error: 'Signature verification library not available'
      };

    } catch (error) {
      safeLogger.error('Ethereum signature verification error:', error);
      
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Construct vote message for signing
   */
  private constructVoteMessage(voteData: VoteData, caseId: number): string {
    return `Vote for appeal #${voteData.appealId}\n` +
           `Case ID: ${caseId}\n` +
           `Vote: ${voteData.vote}\n` +
           `Timestamp: ${voteData.timestamp}\n` +
           `LinkDAO Jury System`;
  }

  /**
   * Check if recovered address matches juror ID
   */
  private recoveredAddressMatches(recoveredAddress: string, jurorId: string): boolean {
    // Normalize addresses for comparison
    const normalize = (addr: string) => addr.toLowerCase().trim();
    
    // Check direct match
    if (normalize(recoveredAddress) === normalize(jurorId)) {
      return true;
    }
    
    // Check with 0x prefix handling
    const withPrefix = jurorId.startsWith('0x') ? jurorId : `0x${jurorId}`;
    const withoutPrefix = jurorId.startsWith('0x') ? jurorId.slice(2) : jurorId;
    
    return (
      normalize(recoveredAddress) === normalize(withPrefix) ||
      normalize(recoveredAddress) === normalize(withoutPrefix)
    );
  }

  /**
   * Batch verify vote signatures
   */
  async batchVerifyVoteSignatures(
    votes: Array<{
      appealId: number;
      jurorId: string;
      signature: string;
      voteData: VoteData;
    }>
  ): Promise<Map<string, SignatureVerificationResult>> {
    const results = new Map<string, SignatureVerificationResult>();

    // Process in parallel with concurrency limit
    const concurrencyLimit = 5;
    for (let i = 0; i < votes.length; i += concurrencyLimit) {
      const batch = votes.slice(i, i + concurrencyLimit);
      
      const promises = batch.map(async (vote) => {
        const result = await this.verifyVoteSignature(
          vote.appealId,
          vote.jurorId,
          vote.signature,
          vote.voteData
        );
        return { key: `${vote.appealId}:${vote.jurorId}`, result };
      });

      const settled = await Promise.allSettled(promises);
      
      settled.forEach((settledResult) => {
        if (settledResult.status === 'fulfilled') {
          results.set(settledResult.value.key, settledResult.value.result);
        }
      });
    }

    return results;
  }

  /**
   * Get verification status for a juror's vote
   */
  async getVerificationStatus(
    appealId: number,
    jurorId: string
  ): Promise<{
    signatureVerified: boolean;
    commitmentVerified: boolean;
    revealVerified: boolean;
  }> {
    try {
      const db = databaseService.getDatabase();

      const [juror] = await db
        .select()
        .from(appeal_jurors)
        .where(
          and(
            eq(appeal_jurors.appealId, appealId),
            eq(appeal_jurors.jurorId, jurorId)
          )
        );

      if (!juror) {
        throw ModerationErrorHandler.handleBusinessLogicError(
          ModerationErrorType.MODERATION_CASE_NOT_FOUND,
          'Juror not found',
          { appealId, jurorId }
        );
      }

      return {
        signatureVerified: !!juror.vote_signature_verified,
        commitmentVerified: !!juror.vote_commitment,
        revealVerified: !!juror.vote_reveal
      };

    } catch (error) {
      safeLogger.error(`Failed to get verification status for appeal ${appealId}, juror ${jurorId}:`, error);
      
      return {
        signatureVerified: false,
        commitmentVerified: false,
        revealVerified: false
      };
    }
  }
}

export const jurySignatureVerificationService = new JurySignatureVerificationService();
