import auditLoggingService from '../services/auditLoggingService';
import evidenceStorageService from '../services/evidenceStorageService';
import { db } from '../db';
import { moderation_audit_logs } from '../db/schema';
import { AuditLogEntry } from '../services/auditLoggingService';

// Mock dependencies
jest.mock('../services/evidenceStorageService');
jest.mock('../db');

const mockEvidenceStorageService = evidenceStorageService as jest.Mocked<typeof evidenceStorageService>;
const mockDb = {
  insert: jest.fn(),
  select: jest.fn(),
  update: jest.fn(),
} as any;

// Mock drizzle-orm functions
jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ field, value, type: 'eq' })),
  and: jest.fn((...conditions) => ({ conditions, type: 'and' })),
  gte: jest.fn((field, value) => ({ field, value, type: 'gte' })),
  lte: jest.fn((field, value) => ({ field, value, type: 'lte' })),
  desc: jest.fn((field) => ({ field, type: 'desc' })),
  asc: jest.fn((field) => ({ field, type: 'asc' })),
}));

describe('AuditLoggingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (db as any) = mockDb;
  });

  describe('createAuditLog', () => {
    const mockAuditEntry: AuditLogEntry = {
      caseId: 123,
      actionType: 'moderation_decision',
      actorId: 'mod_456',
      actorType: 'moderator',
      oldState: { status: 'pending' },
      newState: { status: 'blocked', decision: 'block' },
      reasoning: 'Content violates harassment policy',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Test Browser)',
    };

    it('should create audit log with IPFS storage', async () => {
      const mockDbResult = {
        id: 1,
        caseId: 123,
        actionType: 'moderation_decision',
        actorId: 'mod_456',
        actorType: 'moderator',
        oldState: { status: 'pending' },
        newState: { status: 'blocked', decision: 'block' },
        reasoning: 'Content violates harassment policy',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        createdAt: new Date('2024-01-01T00:00:00Z'),
      };

      const mockInsertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockDbResult]),
      };

      const mockUpdateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };

      mockDb.insert.mockReturnValue(mockInsertChain);
      mockDb.update.mockReturnValue(mockUpdateChain);
      mockEvidenceStorageService.createAuditRecord.mockResolvedValue('QmAuditHash123');

      const result = await auditLoggingService.createAuditLog(mockAuditEntry);

      expect(result).toEqual({
        ...mockDbResult,
        reasoning: 'Content violates harassment policy', // Original reasoning without IPFS hash
      });

      expect(mockDb.insert).toHaveBeenCalledWith(moderation_audit_logs);
      expect(mockInsertChain.values).toHaveBeenCalledWith({
        caseId: 123,
        actionType: 'moderation_decision',
        actorId: 'mod_456',
        actorType: 'moderator',
        oldState: { status: 'pending' },
        newState: { status: 'blocked', decision: 'block' },
        reasoning: 'Content violates harassment policy',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        createdAt: expect.any(Date),
      });

      expect(mockEvidenceStorageService.createAuditRecord).toHaveBeenCalledWith({
        caseId: 123,
        action: 'moderation_decision',
        actorId: 'mod_456',
        actorType: 'moderator',
        oldState: { status: 'pending' },
        newState: { status: 'blocked', decision: 'block' },
        reasoning: 'Content violates harassment policy',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Test Browser)',
      });

      expect(mockDb.update).toHaveBeenCalledWith(moderation_audit_logs);
      expect(mockUpdateChain.set).toHaveBeenCalledWith({
        reasoning: 'Content violates harassment policy\n[IPFS:QmAuditHash123]',
      });
    });

    it('should handle database insertion failure', async () => {
      const mockInsertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockRejectedValue(new Error('Database error')),
      };

      mockDb.insert.mockReturnValue(mockInsertChain);

      await expect(auditLoggingService.createAuditLog(mockAuditEntry))
        .rejects.toThrow('Failed to create audit log: Database error');
    });

    it('should handle IPFS storage failure gracefully', async () => {
      const mockDbResult = {
        id: 1,
        ...mockAuditEntry,
        createdAt: new Date(),
      };

      const mockInsertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockDbResult]),
      };

      mockDb.insert.mockReturnValue(mockInsertChain);
      mockEvidenceStorageService.createAuditRecord.mockRejectedValue(new Error('IPFS error'));

      await expect(auditLoggingService.createAuditLog(mockAuditEntry))
        .rejects.toThrow('Failed to create audit log: IPFS error');
    });
  });

  describe('getAuditTrail', () => {
    it('should retrieve audit trail with filters', async () => {
      const mockAuditLogs = [
        {
          id: 1,
          caseId: 123,
          actionType: 'moderation_decision',
          actorId: 'mod_456',
          actorType: 'moderator',
          reasoning: 'Test reasoning\n[IPFS:QmHash123]',
          createdAt: new Date('2024-01-01T00:00:00Z'),
        },
        {
          id: 2,
          caseId: 123,
          actionType: 'appeal_submitted',
          actorId: 'user_789',
          actorType: 'user',
          reasoning: 'Appeal reasoning\n[IPFS:QmHash456]',
          createdAt: new Date('2024-01-01T01:00:00Z'),
        },
      ];

      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockAuditLogs),
      };

      const mockCountChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 2 }]),
      };

      mockDb.select.mockReturnValueOnce(mockCountChain).mockReturnValueOnce(mockSelectChain);

      const result = await auditLoggingService.getAuditTrail({
        caseId: 123,
        limit: 10,
        offset: 0,
        orderBy: 'desc',
      });

      expect(result).toEqual({
        logs: [
          {
            id: 1,
            caseId: 123,
            actionType: 'moderation_decision',
            actorId: 'mod_456',
            actorType: 'moderator',
            reasoning: 'Test reasoning', // IPFS hash removed
            createdAt: new Date('2024-01-01T00:00:00Z'),
          },
          {
            id: 2,
            caseId: 123,
            actionType: 'appeal_submitted',
            actorId: 'user_789',
            actorType: 'user',
            reasoning: 'Appeal reasoning', // IPFS hash removed
            createdAt: new Date('2024-01-01T01:00:00Z'),
          },
        ],
        total: 2,
        hasMore: false,
      });
    });

    it('should handle empty audit trail', async () => {
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue([]),
      };

      const mockCountChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 0 }]),
      };

      mockDb.select.mockReturnValueOnce(mockCountChain).mockReturnValueOnce(mockSelectChain);

      const result = await auditLoggingService.getAuditTrail({ caseId: 999 });

      expect(result).toEqual({
        logs: [],
        total: 0,
        hasMore: false,
      });
    });

    it('should calculate hasMore correctly for pagination', async () => {
      const mockAuditLogs = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        caseId: 123,
        actionType: 'test_action',
        actorType: 'system',
        createdAt: new Date(),
      }));

      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockAuditLogs),
      };

      const mockCountChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 25 }]),
      };

      mockDb.select.mockReturnValueOnce(mockCountChain).mockReturnValueOnce(mockSelectChain);

      const result = await auditLoggingService.getAuditTrail({
        limit: 10,
        offset: 0,
      });

      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(25);
    });
  });

  describe('verifyAuditLogIntegrity', () => {
    it('should verify audit log integrity successfully', async () => {
      const mockAuditLog = {
        id: 1,
        caseId: 123,
        actionType: 'moderation_decision',
        actorId: 'mod_456',
        actorType: 'moderator',
        oldState: { status: 'pending' },
        newState: { status: 'blocked' },
        reasoning: 'Test reasoning\n[IPFS:QmTestHash123]',
        createdAt: new Date('2024-01-01T00:00:00Z'),
      };

      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([mockAuditLog]),
      };

      mockDb.select.mockReturnValue(mockSelectChain);
      mockEvidenceStorageService.verifyEvidenceExists.mockResolvedValue(true);

      const result = await auditLoggingService.verifyAuditLogIntegrity(1);

      expect(result).toMatchObject({
        id: 1,
        localHash: expect.any(String),
        ipfsHash: 'QmTestHash123',
        chainOfCustody: ['QmTestHash123'],
        isValid: true,
      });

      expect(mockEvidenceStorageService.verifyEvidenceExists).toHaveBeenCalledWith('QmTestHash123');
    });

    it('should handle audit log not found', async () => {
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };

      mockDb.select.mockReturnValue(mockSelectChain);

      await expect(auditLoggingService.verifyAuditLogIntegrity(999))
        .rejects.toThrow('Audit log not found');
    });

    it('should handle missing IPFS hash', async () => {
      const mockAuditLog = {
        id: 1,
        caseId: 123,
        actionType: 'moderation_decision',
        reasoning: 'Test reasoning without IPFS hash',
        createdAt: new Date(),
      };

      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([mockAuditLog]),
      };

      mockDb.select.mockReturnValue(mockSelectChain);

      await expect(auditLoggingService.verifyAuditLogIntegrity(1))
        .rejects.toThrow('No IPFS hash found for audit log');
    });
  });

  describe('specialized logging methods', () => {
    beforeEach(() => {
      const mockDbResult = {
        id: 1,
        createdAt: new Date(),
      };

      const mockInsertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockDbResult]),
      };

      const mockUpdateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };

      mockDb.insert.mockReturnValue(mockInsertChain);
      mockDb.update.mockReturnValue(mockUpdateChain);
      mockEvidenceStorageService.createAuditRecord.mockResolvedValue('QmTestHash');
    });

    it('should log moderation decision correctly', async () => {
      const params = {
        caseId: 123,
        decision: 'block',
        moderatorId: 'mod_456',
        reasoning: 'Violates policy',
        oldStatus: 'pending',
        newStatus: 'blocked',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser',
      };

      const result = await auditLoggingService.logModerationDecision(params);

      expect(mockEvidenceStorageService.createAuditRecord).toHaveBeenCalledWith({
        caseId: 123,
        action: 'moderation_decision',
        actorId: 'mod_456',
        actorType: 'moderator',
        oldState: { status: 'pending' },
        newState: { status: 'blocked', decision: 'block' },
        reasoning: 'Violates policy',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser',
      });
    });

    it('should log appeal submission correctly', async () => {
      const params = {
        caseId: 123,
        appellantId: 'user_789',
        stakeAmount: '100',
        reasoning: 'Decision was incorrect',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser',
      };

      await auditLoggingService.logAppealSubmission(params);

      expect(mockEvidenceStorageService.createAuditRecord).toHaveBeenCalledWith({
        caseId: 123,
        action: 'appeal_submitted',
        actorId: 'user_789',
        actorType: 'user',
        newState: { stakeAmount: '100', status: 'appealed' },
        reasoning: 'Decision was incorrect',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser',
      });
    });

    it('should log jury decision correctly', async () => {
      const params = {
        caseId: 123,
        jurorId: 'juror_456',
        decision: 'overturn',
        reasoning: 'Original decision was too harsh',
        voteWeight: 1.5,
      };

      await auditLoggingService.logJuryDecision(params);

      expect(mockEvidenceStorageService.createAuditRecord).toHaveBeenCalledWith({
        caseId: 123,
        action: 'jury_vote',
        actorId: 'juror_456',
        actorType: 'user',
        newState: { decision: 'overturn', voteWeight: 1.5 },
        reasoning: 'Original decision was too harsh',
      });
    });

    it('should log system action correctly', async () => {
      const params = {
        caseId: 123,
        action: 'auto_escalation',
        details: { threshold: 0.95, confidence: 0.97 },
        reasoning: 'High confidence detection triggered auto-escalation',
      };

      await auditLoggingService.logSystemAction(params);

      expect(mockEvidenceStorageService.createAuditRecord).toHaveBeenCalledWith({
        caseId: 123,
        action: 'auto_escalation',
        actorType: 'system',
        newState: { threshold: 0.95, confidence: 0.97 },
        reasoning: 'High confidence detection triggered auto-escalation',
      });
    });
  });

  describe('batchCreateAuditLogs', () => {
    it('should create multiple audit logs in batches', async () => {
      const entries: AuditLogEntry[] = [
        {
          caseId: 123,
          actionType: 'test_action_1',
          actorType: 'system',
        },
        {
          caseId: 124,
          actionType: 'test_action_2',
          actorType: 'system',
        },
      ];

      const mockDbResult = { id: 1, createdAt: new Date() };
      const mockInsertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockDbResult]),
      };
      const mockUpdateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };

      mockDb.insert.mockReturnValue(mockInsertChain);
      mockDb.update.mockReturnValue(mockUpdateChain);
      mockEvidenceStorageService.createAuditRecord.mockResolvedValue('QmTestHash');

      const results = await auditLoggingService.batchCreateAuditLogs(entries);

      expect(results).toHaveLength(2);
      expect(mockEvidenceStorageService.createAuditRecord).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in batch processing', async () => {
      const entries: AuditLogEntry[] = [
        { caseId: 123, actionType: 'success', actorType: 'system' },
        { caseId: 124, actionType: 'failure', actorType: 'system' },
      ];

      const mockDbResult = { id: 1, createdAt: new Date() };
      const mockInsertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn()
          .mockResolvedValueOnce([mockDbResult])
          .mockRejectedValueOnce(new Error('Database error')),
      };
      const mockUpdateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };

      mockDb.insert.mockReturnValue(mockInsertChain);
      mockDb.update.mockReturnValue(mockUpdateChain);
      mockEvidenceStorageService.createAuditRecord.mockResolvedValue('QmTestHash');

      const results = await auditLoggingService.batchCreateAuditLogs(entries);

      expect(results).toHaveLength(1); // Only successful entries
    });
  });

  describe('exportAuditTrail', () => {
    it('should export audit trail as JSON', async () => {
      const mockAuditLogs = [
        {
          id: 1,
          caseId: 123,
          actionType: 'moderation_decision',
          actorType: 'moderator',
          createdAt: new Date('2024-01-01T00:00:00Z'),
        },
      ];

      // Mock the getAuditTrail method
      jest.spyOn(auditLoggingService, 'getAuditTrail').mockResolvedValue({
        logs: mockAuditLogs as any,
        total: 1,
        hasMore: false,
      });

      const result = await auditLoggingService.exportAuditTrail({
        caseId: 123,
        format: 'json',
      });

      expect(result).toBe(JSON.stringify(mockAuditLogs, null, 2));
    });

    it('should export audit trail as CSV', async () => {
      const mockAuditLogs = [
        {
          id: 1,
          caseId: 123,
          actionType: 'moderation_decision',
          actorId: 'mod_456',
          actorType: 'moderator',
          reasoning: 'Test reasoning',
          createdAt: new Date('2024-01-01T00:00:00Z'),
        },
      ];

      jest.spyOn(auditLoggingService, 'getAuditTrail').mockResolvedValue({
        logs: mockAuditLogs as any,
        total: 1,
        hasMore: false,
      });

      const result = await auditLoggingService.exportAuditTrail({
        caseId: 123,
        format: 'csv',
      });

      const expectedCSV = [
        'id,caseId,actionType,actorId,actorType,reasoning,createdAt',
        '1,123,moderation_decision,mod_456,moderator,"Test reasoning",2024-01-01T00:00:00.000Z',
      ].join('\n');

      expect(result).toBe(expectedCSV);
    });

    it('should handle empty audit trail export', async () => {
      jest.spyOn(auditLoggingService, 'getAuditTrail').mockResolvedValue({
        logs: [],
        total: 0,
        hasMore: false,
      });

      const result = await auditLoggingService.exportAuditTrail({
        format: 'csv',
      });

      expect(result).toBe('');
    });
  });
});
