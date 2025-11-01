import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

// Import validation schemas from appeals service
const AppealSubmissionSchema = z.object({
  caseId: z.number().positive(),
  appellantId: z.string().uuid(),
  reasoning: z.string().min(50).max(2000),
  stakeAmount: z.string().regex(/^\d+(\.\d{1,8})?$/),
  evidenceUrls: z.array(z.string().url()).optional(),
  contactInfo: z.string().email().optional()
});

const AppealStatusUpdateSchema = z.object({
  appealId: z.number().positive(),
  status: z.enum(['open', 'jury_selection', 'voting', 'decided', 'executed']),
  juryDecision: z.enum(['uphold', 'overturn', 'partial']).optional(),
  decisionCid: z.string().optional(),
  executedBy: z.string().optional()
});

describe('Appeals System - Validation Logic', () => {
  describe('Appeal Submission Validation', () => {
    it('should validate correct appeal submission data', () => {
      const validSubmission = {
        caseId: 1,
        appellantId: '123e4567-e89b-12d3-a456-426614174000',
        reasoning: 'This content was incorrectly flagged as hate speech. It was actually a quote from a historical document for educational purposes. I have additional context that shows this was taken out of context.',
        stakeAmount: '150.0',
        evidenceUrls: ['https://example.com/evidence1.pdf', 'https://example.com/context.jpg'],
        contactInfo: 'appellant@example.com'
      };

      const result = AppealSubmissionSchema.safeParse(validSubmission);
      expect(result.success).toBe(true);
    });

    it('should reject appeal with invalid case ID', () => {
      const invalidSubmission = {
        caseId: -1, // Invalid: negative number
        appellantId: '123e4567-e89b-12d3-a456-426614174000',
        reasoning: 'This content was incorrectly flagged as hate speech. It was actually a quote from a historical document for educational purposes.',
        stakeAmount: '150.0'
      };

      const result = AppealSubmissionSchema.safeParse(invalidSubmission);
      expect(result.success).toBe(false);
    });

    it('should reject appeal with invalid UUID', () => {
      const invalidSubmission = {
        caseId: 1,
        appellantId: 'not-a-valid-uuid',
        reasoning: 'This content was incorrectly flagged as hate speech. It was actually a quote from a historical document for educational purposes.',
        stakeAmount: '150.0'
      };

      const result = AppealSubmissionSchema.safeParse(invalidSubmission);
      expect(result.success).toBe(false);
    });

    it('should reject appeal with reasoning too short', () => {
      const invalidSubmission = {
        caseId: 1,
        appellantId: '123e4567-e89b-12d3-a456-426614174000',
        reasoning: 'Too short', // Less than 50 characters
        stakeAmount: '150.0'
      };

      const result = AppealSubmissionSchema.safeParse(invalidSubmission);
      expect(result.success).toBe(false);
    });

    it('should reject appeal with reasoning too long', () => {
      const invalidSubmission = {
        caseId: 1,
        appellantId: '123e4567-e89b-12d3-a456-426614174000',
        reasoning: 'A'.repeat(2001), // More than 2000 characters
        stakeAmount: '150.0'
      };

      const result = AppealSubmissionSchema.safeParse(invalidSubmission);
      expect(result.success).toBe(false);
    });

    it('should reject appeal with invalid stake amount format', () => {
      const invalidSubmission = {
        caseId: 1,
        appellantId: '123e4567-e89b-12d3-a456-426614174000',
        reasoning: 'This content was incorrectly flagged as hate speech. It was actually a quote from a historical document for educational purposes.',
        stakeAmount: 'not-a-number'
      };

      const result = AppealSubmissionSchema.safeParse(invalidSubmission);
      expect(result.success).toBe(false);
    });

    it('should accept valid stake amount formats', () => {
      const validStakeAmounts = ['100', '150.0', '99.12345678'];
      
      validStakeAmounts.forEach(stakeAmount => {
        const submission = {
          caseId: 1,
          appellantId: '123e4567-e89b-12d3-a456-426614174000',
          reasoning: 'This content was incorrectly flagged as hate speech. It was actually a quote from a historical document for educational purposes.',
          stakeAmount
        };

        const result = AppealSubmissionSchema.safeParse(submission);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid evidence URLs', () => {
      const invalidSubmission = {
        caseId: 1,
        appellantId: '123e4567-e89b-12d3-a456-426614174000',
        reasoning: 'This content was incorrectly flagged as hate speech. It was actually a quote from a historical document for educational purposes.',
        stakeAmount: '150.0',
        evidenceUrls: ['not-a-valid-url', 'also-invalid']
      };

      const result = AppealSubmissionSchema.safeParse(invalidSubmission);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email format', () => {
      const invalidSubmission = {
        caseId: 1,
        appellantId: '123e4567-e89b-12d3-a456-426614174000',
        reasoning: 'This content was incorrectly flagged as hate speech. It was actually a quote from a historical document for educational purposes.',
        stakeAmount: '150.0',
        contactInfo: 'not-an-email'
      };

      const result = AppealSubmissionSchema.safeParse(invalidSubmission);
      expect(result.success).toBe(false);
    });
  });

  describe('Appeal Status Update Validation', () => {
    it('should validate correct status update data', () => {
      const validUpdate = {
        appealId: 1,
        status: 'jury_selection' as const,
        executedBy: 'admin_123'
      };

      const result = AppealStatusUpdateSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('should validate status update with jury decision', () => {
      const validUpdate = {
        appealId: 1,
        status: 'decided' as const,
        juryDecision: 'overturn' as const,
        decisionCid: 'QmJuryDecision123',
        executedBy: 'system'
      };

      const result = AppealStatusUpdateSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('should reject invalid appeal ID', () => {
      const invalidUpdate = {
        appealId: -1,
        status: 'jury_selection' as const,
        executedBy: 'admin_123'
      };

      const result = AppealStatusUpdateSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    it('should reject invalid status', () => {
      const invalidUpdate = {
        appealId: 1,
        status: 'invalid_status',
        executedBy: 'admin_123'
      };

      const result = AppealStatusUpdateSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    it('should reject invalid jury decision', () => {
      const invalidUpdate = {
        appealId: 1,
        status: 'decided' as const,
        juryDecision: 'invalid_decision',
        executedBy: 'admin_123'
      };

      const result = AppealStatusUpdateSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });

  describe('Status Transition Logic', () => {
    const isValidStatusTransition = (
      currentStatus: 'open' | 'jury_selection' | 'voting' | 'decided' | 'executed',
      newStatus: 'open' | 'jury_selection' | 'voting' | 'decided' | 'executed'
    ): boolean => {
      const validTransitions: Record<string, string[]> = {
        'open': ['jury_selection'],
        'jury_selection': ['voting'],
        'voting': ['decided'],
        'decided': ['executed']
      };

      return validTransitions[currentStatus]?.includes(newStatus) || false;
    };

    it('should allow valid status transitions', () => {
      const validTransitions = [
        ['open', 'jury_selection'],
        ['jury_selection', 'voting'],
        ['voting', 'decided'],
        ['decided', 'executed']
      ];

      validTransitions.forEach(([current, next]) => {
        const isValid = isValidStatusTransition(current as any, next as any);
        expect(isValid).toBe(true);
      });
    });

    it('should reject invalid status transitions', () => {
      const invalidTransitions = [
        ['open', 'voting'],      // Skip jury_selection
        ['open', 'decided'],     // Skip multiple steps
        ['open', 'executed'],    // Skip to end
        ['jury_selection', 'decided'], // Skip voting
        ['voting', 'executed'],  // Skip decided
        ['decided', 'open'],     // Backwards transition
        ['executed', 'decided']  // Backwards transition
      ];

      invalidTransitions.forEach(([current, next]) => {
        const isValid = isValidStatusTransition(current as any, next as any);
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Stake Amount Validation', () => {
    const validateStakeAmount = (stakeAmount: string, minimumRequired: number): boolean => {
      const stake = parseFloat(stakeAmount);
      return !isNaN(stake) && stake >= minimumRequired && stake > 0;
    };

    it('should validate sufficient stake amounts', () => {
      const testCases = [
        { stake: '100.0', minimum: 100, expected: true },
        { stake: '150.5', minimum: 100, expected: true },
        { stake: '1000', minimum: 100, expected: true }
      ];

      testCases.forEach(({ stake, minimum, expected }) => {
        const isValid = validateStakeAmount(stake, minimum);
        expect(isValid).toBe(expected);
      });
    });

    it('should reject insufficient stake amounts', () => {
      const testCases = [
        { stake: '50.0', minimum: 100, expected: false },
        { stake: '99.99', minimum: 100, expected: false },
        { stake: '0', minimum: 100, expected: false },
        { stake: '-10', minimum: 100, expected: false }
      ];

      testCases.forEach(({ stake, minimum, expected }) => {
        const isValid = validateStakeAmount(stake, minimum);
        expect(isValid).toBe(expected);
      });
    });

    it('should handle invalid stake formats', () => {
      const invalidStakes = ['abc', 'not-a-number', ''];

      invalidStakes.forEach(stake => {
        const isValid = validateStakeAmount(stake, 100);
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Evidence URL Validation', () => {
    it('should validate correct URLs', () => {
      const validUrls = [
        'https://example.com/evidence.pdf',
        'https://ipfs.io/ipfs/QmHash123',
        'https://storage.googleapis.com/bucket/file.jpg',
        'https://s3.amazonaws.com/bucket/evidence.png'
      ];

      validUrls.forEach(url => {
        const result = z.string().url().safeParse(url);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'invalid-url-format'
      ];

      invalidUrls.forEach(url => {
        const result = z.string().url().safeParse(url);
        expect(result.success).toBe(false);
      });
    });
  });
});
