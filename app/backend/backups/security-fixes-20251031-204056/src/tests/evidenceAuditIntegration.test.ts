import evidenceStorageService from '../services/evidenceStorageService';
import auditLoggingService from '../services/auditLoggingService';
import IPFSService from '../services/ipfsService';
import { EvidenceBundleInput } from '../services/evidenceStorageService';
import { AIModelResult } from '../models/ModerationModels';

// Mock IPFS Service for integration tests
jest.mock('../services/ipfsService');
const mockIPFSService = IPFSService as jest.Mocked<typeof IPFSService>;

// Mock database for audit logging
jest.mock('../db', () => ({
  db: {
    insert: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
  },
}));

// Mock drizzle-orm
jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ field, value, type: 'eq' })),
  and: jest.fn((...conditions) => ({ conditions, type: 'and' })),
  gte: jest.fn((field, value) => ({ field, value, type: 'gte' })),
  lte: jest.fn((field, value) => ({ field, value, type: 'lte' })),
  desc: jest.fn((field) => ({ field, type: 'desc' })),
  asc: jest.fn((field) => ({ field, type: 'asc' })),
}));

describe('Evidence Storage and Audit System Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Moderation Case Workflow', () => {
    it('should handle complete evidence storage and audit trail for a moderation case', async () => {
      // Setup test data
      const caseId = 123;
      const contentId = 'post_456';
      const moderatorId = 'mod_789';

      const evidenceInput: EvidenceBundleInput = {
        caseId,
        contentId,
        contentType: 'post',
        contentHash: 'content_hash_abc123',
        modelOutputs: {
          openai: {
            vendor: 'openai',
            confidence: 0.95,
            categories: ['harassment', 'threats'],
            reasoning: 'Content contains threatening language directed at user john@example.com',
            cost: 0.002,
            latency: 180,
            rawResponse: { flagged: true, categories: ['harassment'] },
          } as AIModelResult,
          perspective: {
            vendor: 'perspective',
            confidence: 0.89,
            categories: ['toxicity', 'severe_toxicity'],
            reasoning: 'High toxicity score of 0.89 detected',
            cost: 0.001,
            latency: 120,
          } as AIModelResult,
        },
        decisionRationale: 'Content violates community guidelines on harassment and threats',
        policyVersion: '2.1',
        moderatorId,
        screenshots: [
          Buffer.from('screenshot1_data'),
          Buffer.from('screenshot2_data'),
        ],
      };

      // Mock IPFS responses
      const mockScreenshotHashes = ['QmScreenshot1Hash', 'QmScreenshot2Hash'];
      const mockBundleHash = 'QmEvidenceBundleHash';
      const mockAuditHash = 'QmAuditRecordHash';

      mockIPFSService.uploadFile
        .mockResolvedValueOnce({
          hash: mockScreenshotHashes[0],
          url: `https://ipfs.io/ipfs/${mockScreenshotHashes[0]}`,
          size: 100,
        })
        .mockResolvedValueOnce({
          hash: mockScreenshotHashes[1],
          url: `https://ipfs.io/ipfs/${mockScreenshotHashes[1]}`,
          size: 150,
        })
        .mockResolvedValueOnce({
          hash: mockAuditHash,
          url: `https://ipfs.io/ipfs/${mockAuditHash}`,
          size: 512,
        });

      mockIPFSService.uploadMetadata.mockResolvedValue({
        hash: mockBundleHash,
        url: `https://ipfs.io/ipfs/${mockBundleHash}`,
        size: 2048,
      });

      mockIPFSService.pinContent.mockResolvedValue(undefined);

      // Mock database operations for audit logging
      const mockDbResult = {
        id: 1,
        caseId,
        actionType: 'evidence_stored',
        actorId: moderatorId,
        actorType: 'moderator',
        newState: { evidenceHash: mockBundleHash },
        reasoning: 'Evidence bundle created for moderation case',
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

      const { db } = require('../db');
      db.insert.mockReturnValue(mockInsertChain);
      db.update.mockReturnValue(mockUpdateChain);

      // Step 1: Store evidence bundle
      const storedEvidence = await evidenceStorageService.storeEvidenceBundle(evidenceInput);

      // Verify evidence bundle was stored correctly
      expect(storedEvidence).toMatchObject({
        caseId,
        contentHash: 'content_hash_abc123',
        decisionRationale: 'Content violates community guidelines on harassment and threats',
        policyVersion: '2.1',
        moderatorId,
        ipfsHash: mockBundleHash,
        screenshots: mockScreenshotHashes,
        verificationHash: expect.any(String),
      });

      // Verify PII was redacted in model outputs
      expect(storedEvidence.modelOutputs.openai.reasoning).toBe(
        'Content contains threatening language directed at user [EMAIL_REDACTED]'
      );
      expect(storedEvidence.modelOutputs.openai.rawResponse).toBeUndefined();

      // Verify IPFS operations
      expect(mockIPFSService.uploadFile).toHaveBeenCalledTimes(3); // 2 screenshots + 1 audit record
      expect(mockIPFSService.uploadMetadata).toHaveBeenCalledTimes(1);
      expect(mockIPFSService.pinContent).toHaveBeenCalledTimes(4); // 2 screenshots + 1 bundle + 1 audit

      // Step 2: Create audit log for evidence storage
      const auditLog = await auditLoggingService.createAuditLog({
        caseId,
        actionType: 'evidence_stored',
        actorId: moderatorId,
        actorType: 'moderator',
        newState: { evidenceHash: mockBundleHash },
        reasoning: 'Evidence bundle created for moderation case',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Moderation Console)',
      });

      // Verify audit log was created
      expect(auditLog).toMatchObject({
        id: 1,
        caseId,
        actionType: 'evidence_stored',
        actorId: moderatorId,
        actorType: 'moderator',
        reasoning: 'Evidence bundle created for moderation case',
      });

      // Step 3: Simulate moderation decision and create audit trail
      const decisionAuditLog = await auditLoggingService.logModerationDecision({
        caseId,
        decision: 'block',
        moderatorId,
        reasoning: 'Content blocked due to harassment and threats',
        oldStatus: 'pending',
        newStatus: 'blocked',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Moderation Console)',
      });

      // Verify decision was logged
      expect(decisionAuditLog).toBeDefined();

      // Step 4: Verify evidence can be retrieved and validated
      const mockRetrievedBundle = {
        caseId,
        contentHash: 'content_hash_abc123',
        modelOutputs: storedEvidence.modelOutputs,
        decisionRationale: 'Content violates community guidelines on harassment and threats',
        policyVersion: '2.1',
        timestamp: storedEvidence.timestamp,
        moderatorId,
        screenshots: mockScreenshotHashes,
      };

      mockIPFSService.getContent.mockResolvedValue(
        Buffer.from(JSON.stringify(mockRetrievedBundle))
      );

      const retrievedEvidence = await evidenceStorageService.retrieveEvidenceBundle(mockBundleHash);

      expect(retrievedEvidence).toMatchObject({
        bundle: mockRetrievedBundle,
        ipfsHash: mockBundleHash,
        isValid: expect.any(Boolean),
        retrievedAt: expect.any(Date),
      });

      // Step 5: Verify audit trail can be retrieved
      const mockAuditTrail = [
        {
          id: 1,
          caseId,
          actionType: 'evidence_stored',
          actorId: moderatorId,
          actorType: 'moderator',
          reasoning: 'Evidence bundle created for moderation case\n[IPFS:QmAuditHash1]',
          createdAt: new Date('2024-01-01T00:00:00Z'),
        },
        {
          id: 2,
          caseId,
          actionType: 'moderation_decision',
          actorId: moderatorId,
          actorType: 'moderator',
          reasoning: 'Content blocked due to harassment and threats\n[IPFS:QmAuditHash2]',
          createdAt: new Date('2024-01-01T00:05:00Z'),
        },
      ];

      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockAuditTrail),
      };

      const mockCountChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 2 }]),
      };

      db.select.mockReturnValueOnce(mockCountChain).mockReturnValueOnce(mockSelectChain);

      const auditTrail = await auditLoggingService.getAuditTrail({ caseId });

      expect(auditTrail.logs).toHaveLength(2);
      expect(auditTrail.logs[0].reasoning).toBe('Evidence bundle created for moderation case');
      expect(auditTrail.logs[1].reasoning).toBe('Content blocked due to harassment and threats');
    });

    it('should handle appeal workflow with evidence and audit trail', async () => {
      const caseId = 456;
      const appellantId = 'user_123';
      const jurorId = 'juror_789';

      // Mock database for audit operations
      const mockDbResult = { id: 1, createdAt: new Date() };
      const mockInsertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockDbResult]),
      };
      const mockUpdateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };

      const { db } = require('../db');
      db.insert.mockReturnValue(mockInsertChain);
      db.update.mockReturnValue(mockUpdateChain);

      mockIPFSService.uploadFile.mockResolvedValue({
        hash: 'QmAuditHash',
        url: 'https://ipfs.io/ipfs/QmAuditHash',
        size: 256,
      });
      mockIPFSService.pinContent.mockResolvedValue(undefined);

      // Step 1: Log appeal submission
      const appealLog = await auditLoggingService.logAppealSubmission({
        caseId,
        appellantId,
        stakeAmount: '100',
        reasoning: 'The original decision was incorrect and violated my rights',
        ipAddress: '192.168.1.200',
        userAgent: 'Mozilla/5.0 (User Browser)',
      });

      expect(appealLog).toBeDefined();

      // Step 2: Log jury selection (system action)
      const jurySelectionLog = await auditLoggingService.logSystemAction({
        caseId,
        action: 'jury_selected',
        details: {
          jurors: [jurorId],
          selectionCriteria: { minReputation: 100, minStake: 50 },
        },
        reasoning: 'Jury selected based on reputation and stake requirements',
      });

      expect(jurySelectionLog).toBeDefined();

      // Step 3: Log jury decision
      const juryDecisionLog = await auditLoggingService.logJuryDecision({
        caseId,
        jurorId,
        decision: 'overturn',
        reasoning: 'Original moderation was too harsh for the content',
        voteWeight: 1.5,
      });

      expect(juryDecisionLog).toBeDefined();

      // Step 4: Create evidence bundle for appeal outcome
      const appealEvidenceInput: EvidenceBundleInput = {
        caseId,
        contentId: `appeal_${caseId}`,
        contentType: 'appeal',
        contentHash: `appeal_hash_${caseId}`,
        modelOutputs: {
          jury_decision: {
            vendor: 'dao_jury',
            confidence: 1.0,
            categories: ['appeal_overturn'],
            reasoning: 'Jury voted to overturn original decision',
            cost: 0,
            latency: 0,
          } as AIModelResult,
        },
        decisionRationale: 'Appeal successful - original decision overturned by DAO jury',
        policyVersion: '2.1',
      };

      mockIPFSService.uploadMetadata.mockResolvedValue({
        hash: 'QmAppealEvidenceHash',
        url: 'https://ipfs.io/ipfs/QmAppealEvidenceHash',
        size: 1024,
      });

      const appealEvidence = await evidenceStorageService.storeEvidenceBundle(appealEvidenceInput);

      expect(appealEvidence).toMatchObject({
        caseId,
        decisionRationale: 'Appeal successful - original decision overturned by DAO jury',
        ipfsHash: 'QmAppealEvidenceHash',
      });

      // Verify all audit operations were called
      expect(mockIPFSService.uploadFile).toHaveBeenCalledTimes(4); // 3 audit records + 1 evidence bundle
      expect(mockIPFSService.pinContent).toHaveBeenCalledTimes(4);
    });

    it('should handle batch evidence storage with audit trail', async () => {
      const evidenceInputs: EvidenceBundleInput[] = [
        {
          caseId: 100,
          contentId: 'batch_content_1',
          contentType: 'post',
          contentHash: 'hash_1',
          modelOutputs: {
            openai: {
              vendor: 'openai',
              confidence: 0.8,
              categories: ['spam'],
              reasoning: 'Detected spam patterns',
              cost: 0.001,
              latency: 100,
            } as AIModelResult,
          },
          decisionRationale: 'Spam content blocked',
          policyVersion: '2.1',
        },
        {
          caseId: 101,
          contentId: 'batch_content_2',
          contentType: 'comment',
          contentHash: 'hash_2',
          modelOutputs: {
            perspective: {
              vendor: 'perspective',
              confidence: 0.9,
              categories: ['toxicity'],
              reasoning: 'High toxicity detected',
              cost: 0.0005,
              latency: 80,
            } as AIModelResult,
          },
          decisionRationale: 'Toxic comment removed',
          policyVersion: '2.1',
        },
      ];

      // Mock IPFS responses for batch operation
      mockIPFSService.uploadMetadata
        .mockResolvedValueOnce({
          hash: 'QmBatchEvidence1',
          url: 'https://ipfs.io/ipfs/QmBatchEvidence1',
          size: 512,
        })
        .mockResolvedValueOnce({
          hash: 'QmBatchEvidence2',
          url: 'https://ipfs.io/ipfs/QmBatchEvidence2',
          size: 480,
        });

      mockIPFSService.pinContent.mockResolvedValue(undefined);

      // Store evidence bundles in batch
      const batchResults = await evidenceStorageService.batchStoreEvidenceBundles(evidenceInputs);

      expect(batchResults).toHaveLength(2);
      expect(batchResults[0].caseId).toBe(100);
      expect(batchResults[1].caseId).toBe(101);

      // Create batch audit logs
      const auditEntries = batchResults.map((result, index) => ({
        caseId: result.caseId,
        actionType: 'batch_evidence_stored',
        actorType: 'system' as const,
        newState: { evidenceHash: result.ipfsHash },
        reasoning: `Batch evidence storage for case ${result.caseId}`,
      }));

      // Mock database for batch audit logging
      const mockDbResult = { id: 1, createdAt: new Date() };
      const mockInsertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockDbResult]),
      };
      const mockUpdateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };

      const { db } = require('../db');
      db.insert.mockReturnValue(mockInsertChain);
      db.update.mockReturnValue(mockUpdateChain);

      mockIPFSService.uploadFile.mockResolvedValue({
        hash: 'QmBatchAuditHash',
        url: 'https://ipfs.io/ipfs/QmBatchAuditHash',
        size: 256,
      });

      const batchAuditResults = await auditLoggingService.batchCreateAuditLogs(auditEntries);

      expect(batchAuditResults).toHaveLength(2);
      expect(mockIPFSService.uploadMetadata).toHaveBeenCalledTimes(2); // Evidence bundles
      expect(mockIPFSService.uploadFile).toHaveBeenCalledTimes(2); // Audit records
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle IPFS failures gracefully', async () => {
      const evidenceInput: EvidenceBundleInput = {
        caseId: 999,
        contentId: 'failing_content',
        contentType: 'post',
        contentHash: 'failing_hash',
        modelOutputs: {},
        decisionRationale: 'Test failure case',
        policyVersion: '2.1',
      };

      // Simulate IPFS failure
      mockIPFSService.uploadMetadata.mockRejectedValue(new Error('IPFS node unavailable'));

      await expect(evidenceStorageService.storeEvidenceBundle(evidenceInput))
        .rejects.toThrow('Failed to store evidence bundle: IPFS node unavailable');
    });

    it('should handle partial failures in batch operations', async () => {
      const evidenceInputs: EvidenceBundleInput[] = [
        {
          caseId: 200,
          contentId: 'success_content',
          contentType: 'post',
          contentHash: 'success_hash',
          modelOutputs: {},
          decisionRationale: 'Success case',
          policyVersion: '2.1',
        },
        {
          caseId: 201,
          contentId: 'failure_content',
          contentType: 'post',
          contentHash: 'failure_hash',
          modelOutputs: {},
          decisionRationale: 'Failure case',
          policyVersion: '2.1',
        },
      ];

      // Mock first success, second failure
      mockIPFSService.uploadMetadata
        .mockResolvedValueOnce({
          hash: 'QmSuccessHash',
          url: 'https://ipfs.io/ipfs/QmSuccessHash',
          size: 512,
        })
        .mockRejectedValueOnce(new Error('IPFS failure'));

      mockIPFSService.pinContent.mockResolvedValue(undefined);

      const results = await evidenceStorageService.batchStoreEvidenceBundles(evidenceInputs);

      // Should return only successful results
      expect(results).toHaveLength(1);
      expect(results[0].caseId).toBe(200);
    });
  });

  describe('Data Integrity and Verification', () => {
    it('should maintain data integrity across storage and retrieval', async () => {
      const originalEvidence: EvidenceBundleInput = {
        caseId: 300,
        contentId: 'integrity_test',
        contentType: 'post',
        contentHash: 'integrity_hash',
        modelOutputs: {
          test_vendor: {
            vendor: 'test',
            confidence: 0.75,
            categories: ['test_category'],
            reasoning: 'Test reasoning for integrity check',
            cost: 0.001,
            latency: 50,
          } as AIModelResult,
        },
        decisionRationale: 'Test case for data integrity verification',
        policyVersion: '2.1',
        moderatorId: 'integrity_mod',
      };

      // Store evidence
      mockIPFSService.uploadMetadata.mockResolvedValue({
        hash: 'QmIntegrityHash',
        url: 'https://ipfs.io/ipfs/QmIntegrityHash',
        size: 1024,
      });
      mockIPFSService.pinContent.mockResolvedValue(undefined);

      const storedEvidence = await evidenceStorageService.storeEvidenceBundle(originalEvidence);

      // Retrieve evidence
      mockIPFSService.getContent.mockResolvedValue(
        Buffer.from(JSON.stringify({
          caseId: storedEvidence.caseId,
          contentHash: storedEvidence.contentHash,
          modelOutputs: storedEvidence.modelOutputs,
          decisionRationale: storedEvidence.decisionRationale,
          policyVersion: storedEvidence.policyVersion,
          timestamp: storedEvidence.timestamp,
          moderatorId: storedEvidence.moderatorId,
        }))
      );

      const retrievedEvidence = await evidenceStorageService.retrieveEvidenceBundle('QmIntegrityHash');

      // Verify data integrity
      expect(retrievedEvidence.bundle.caseId).toBe(originalEvidence.caseId);
      expect(retrievedEvidence.bundle.contentHash).toBe(originalEvidence.contentHash);
      expect(retrievedEvidence.bundle.decisionRationale).toBe(originalEvidence.decisionRationale);
      expect(retrievedEvidence.bundle.policyVersion).toBe(originalEvidence.policyVersion);
      expect(retrievedEvidence.bundle.moderatorId).toBe(originalEvidence.moderatorId);

      // Verify PII redaction was applied
      expect(retrievedEvidence.bundle.modelOutputs.test_vendor.reasoning).toBe('Test reasoning for integrity check');
      expect(retrievedEvidence.bundle.modelOutputs.test_vendor.rawResponse).toBeUndefined();
    });
  });
});