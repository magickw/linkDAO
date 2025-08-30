import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { appealsService, AppealSubmission } from '../services/appealsService';
import { databaseService } from '../services/databaseService';

// Mock the database service
jest.mock('../services/databaseService');
const mockDatabaseService = databaseService as jest.Mocked<typeof databaseService>;

// Mock database operations
const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis()
};

describe('Appeals System - Basic Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDatabaseService.getDatabase.mockReturnValue(mockDb as any);
  });

  describe('Appeal Submission Validation', () => {
    it('should validate appeal submission data structure', async () => {
      const validSubmission: AppealSubmission = {
        caseId: 1,
        appellantId: '123e4567-e89b-12d3-a456-426614174000',
        reasoning: 'This content was incorrectly flagged as hate speech. It was actually a quote from a historical document for educational purposes.',
        stakeAmount: '150.0',
        evidenceUrls: ['https://example.com/evidence1.pdf'],
        contactInfo: 'test@example.com'
      };

      // Mock database responses
      mockDb.select.mockImplementation(() => ({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              id: 1,
              contentId: 'post_123',
              contentType: 'post',
              userId: validSubmission.appellantId,
              status: 'blocked',
              decision: 'block'
            }])
          })
        })
      }));

      // Mock no existing appeal
      mockDb.select.mockImplementationOnce(() => ({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              id: 1,
              contentId: 'post_123',
              contentType: 'post',
              userId: validSubmission.appellantId,
              status: 'blocked',
              decision: 'block'
            }])
          })
        })
      })).mockImplementationOnce(() => ({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]) // No existing appeal
          })
        })
      }));

      mockDb.insert.mockImplementation(() => ({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 1 }])
        })
      }));

      mockDb.update.mockImplementation(() => ({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      }));

      const result = await appealsService.submitAppeal(validSubmission);

      expect(result.success).toBe(true);
      expect(result.appealId).toBeDefined();
    });

    it('should reject appeal with invalid data', async () => {
      const invalidSubmission = {
        caseId: 'invalid', // Should be number
        appellantId: 'not-a-uuid',
        reasoning: 'Too short', // Below 50 character minimum
        stakeAmount: 'invalid-amount'
      } as any;

      const result = await appealsService.submitAppeal(invalidSubmission);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid appeal data');
    });

    it('should reject appeal with insufficient reasoning length', async () => {
      const shortReasoningSubmission: AppealSubmission = {
        caseId: 1,
        appellantId: '123e4567-e89b-12d3-a456-426614174000',
        reasoning: 'Too short', // Below 50 character minimum
        stakeAmount: '150.0'
      };

      const result = await appealsService.submitAppeal(shortReasoningSubmission);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid appeal data');
    });

    it('should reject appeal with invalid stake amount format', async () => {
      const invalidStakeSubmission: AppealSubmission = {
        caseId: 1,
        appellantId: '123e4567-e89b-12d3-a456-426614174000',
        reasoning: 'This content was incorrectly flagged as hate speech. It was actually a quote from a historical document for educational purposes.',
        stakeAmount: 'not-a-number'
      };

      const result = await appealsService.submitAppeal(invalidStakeSubmission);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid appeal data');
    });
  });

  describe('Appeal Status Management', () => {
    it('should validate status transition logic', async () => {
      // Mock getting current appeal
      mockDb.select.mockImplementation(() => ({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              id: 1,
              status: 'open'
            }])
          })
        })
      }));

      mockDb.update.mockImplementation(() => ({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      }));

      mockDb.insert.mockImplementation(() => ({
        values: jest.fn().mockResolvedValue(undefined)
      }));

      const validUpdate = {
        appealId: 1,
        status: 'jury_selection' as const,
        executedBy: 'system'
      };

      const result = await appealsService.updateAppealStatus(validUpdate);

      expect(result.success).toBe(true);
    });

    it('should reject invalid status transitions', async () => {
      // Mock getting current appeal
      mockDb.select.mockImplementation(() => ({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              id: 1,
              status: 'open'
            }])
          })
        })
      }));

      const invalidUpdate = {
        appealId: 1,
        status: 'executed' as const, // Invalid: can't go directly from 'open' to 'executed'
        executedBy: 'system'
      };

      const result = await appealsService.updateAppealStatus(invalidUpdate);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid status transition');
    });
  });

  describe('Appeal Retrieval', () => {
    it('should handle non-existent appeal gracefully', async () => {
      // Mock empty result
      mockDb.select.mockImplementation(() => ({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]) // No appeal found
            })
          })
        })
      }));

      const result = await appealsService.getAppealCase(999);

      expect(result).toBeNull();
    });

    it('should return appeal with original case details', async () => {
      // Mock appeal with original case
      mockDb.select.mockImplementation(() => ({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{
                appeal: {
                  id: 1,
                  caseId: 1,
                  appellantId: '123e4567-e89b-12d3-a456-426614174000',
                  status: 'open',
                  stakeAmount: '150.0',
                  createdAt: new Date()
                },
                originalCase: {
                  id: 1,
                  contentId: 'post_123',
                  contentType: 'post',
                  decision: 'block',
                  reasonCode: 'hate_speech',
                  confidence: '0.92'
                }
              }])
            })
          })
        })
      }));

      const result = await appealsService.getAppealCase(1);

      expect(result).toBeDefined();
      expect(result!.id).toBe(1);
      expect(result!.status).toBe('open');
      expect(result!.originalCase).toBeDefined();
      expect(result!.originalCase!.decision).toBe('block');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockDb.select.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const submission: AppealSubmission = {
        caseId: 1,
        appellantId: '123e4567-e89b-12d3-a456-426614174000',
        reasoning: 'This content was incorrectly flagged as hate speech. It was actually a quote from a historical document for educational purposes.',
        stakeAmount: '150.0'
      };

      const result = await appealsService.submitAppeal(submission);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to submit appeal');
    });

    it('should validate appeal ID parameter', async () => {
      const invalidUpdate = {
        appealId: -1, // Invalid ID
        status: 'jury_selection' as const,
        executedBy: 'system'
      };

      const result = await appealsService.updateAppealStatus(invalidUpdate);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid update data');
    });
  });

  describe('Pagination', () => {
    it('should handle pagination parameters correctly', async () => {
      // Mock count query
      mockDb.select.mockImplementationOnce(() => ({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 25 }])
        })
      }));

      // Mock appeals query
      mockDb.select.mockImplementationOnce(() => ({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue([
                    {
                      appeal: { id: 1, appellantId: 'user1', status: 'open', createdAt: new Date() },
                      originalCase: { id: 1, contentId: 'post_1' }
                    }
                  ])
                })
              })
            })
          })
        })
      }));

      const result = await appealsService.getUserAppeals('user1', 1, 10);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(25);
      expect(result.appeals).toHaveLength(1);
    });
  });
});