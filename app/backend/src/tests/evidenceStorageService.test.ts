import evidenceStorageService from '../services/evidenceStorageService';
import IPFSService from '../services/ipfsService';
import { EvidenceBundleInput, StoredEvidenceBundle } from '../services/evidenceStorageService';
import { AIModelResult } from '../models/ModerationModels';

// Mock IPFS Service
jest.mock('../services/ipfsService');
const mockIPFSService = IPFSService as jest.Mocked<typeof IPFSService>;

describe('EvidenceStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('storeEvidenceBundle', () => {
    const mockEvidenceInput: EvidenceBundleInput = {
      caseId: 123,
      contentId: 'content_123',
      contentType: 'post',
      contentHash: 'abc123hash',
      modelOutputs: {
        openai: {
          vendor: 'openai',
          confidence: 0.95,
          categories: ['harassment'],
          reasoning: 'Contains threatening language',
          cost: 0.001,
          latency: 150,
        } as AIModelResult,
        perspective: {
          vendor: 'perspective',
          confidence: 0.87,
          categories: ['toxicity'],
          reasoning: 'High toxicity score detected',
          cost: 0.0005,
          latency: 200,
        } as AIModelResult,
      },
      decisionRationale: 'Content violates harassment policy',
      policyVersion: '1.0',
      moderatorId: 'mod_456',
    };

    it('should successfully store evidence bundle to IPFS', async () => {
      const mockIPFSResult = {
        hash: 'QmTestHash123',
        url: 'https://ipfs.io/ipfs/QmTestHash123',
        size: 1024,
      };

      mockIPFSService.uploadMetadata.mockResolvedValue(mockIPFSResult);
      mockIPFSService.pinContent.mockResolvedValue(undefined);

      const result = await evidenceStorageService.storeEvidenceBundle(mockEvidenceInput);

      expect(result).toMatchObject({
        caseId: 123,
        contentHash: 'abc123hash',
        decisionRationale: 'Content violates harassment policy',
        policyVersion: '1.0',
        moderatorId: 'mod_456',
        ipfsHash: 'QmTestHash123',
        bundleSize: expect.any(Number),
        verificationHash: expect.any(String),
      });

      expect(mockIPFSService.uploadMetadata).toHaveBeenCalledTimes(1);
      expect(mockIPFSService.pinContent).toHaveBeenCalledWith('QmTestHash123');
    });

    it('should sanitize model outputs to remove sensitive data', async () => {
      const inputWithSensitiveData: EvidenceBundleInput = {
        ...mockEvidenceInput,
        modelOutputs: {
          openai: {
            vendor: 'openai',
            confidence: 0.95,
            categories: ['harassment'],
            reasoning: 'User email john@example.com detected in content',
            cost: 0.001,
            latency: 150,
            rawResponse: { sensitive: 'data' },
          } as AIModelResult,
        },
      };

      const mockIPFSResult = {
        hash: 'QmTestHash123',
        url: 'https://ipfs.io/ipfs/QmTestHash123',
        size: 1024,
      };

      mockIPFSService.uploadMetadata.mockResolvedValue(mockIPFSResult);
      mockIPFSService.pinContent.mockResolvedValue(undefined);

      const result = await evidenceStorageService.storeEvidenceBundle(inputWithSensitiveData);

      // Verify that the bundle was created and stored
      expect(mockIPFSService.uploadMetadata).toHaveBeenCalledTimes(1);
      
      // Get the actual bundle that was uploaded
      const uploadedBundle = mockIPFSService.uploadMetadata.mock.calls[0][0];
      
      // Check that PII was redacted and raw response was removed
      expect(uploadedBundle.modelOutputs.openai.reasoning).toBe('User email [EMAIL_REDACTED] detected in content');
      expect(uploadedBundle.modelOutputs.openai.rawResponse).toBeUndefined();
    });

    it('should handle screenshots storage', async () => {
      const screenshots = [
        Buffer.from('fake image data 1'),
        Buffer.from('fake image data 2'),
      ];

      const inputWithScreenshots: EvidenceBundleInput = {
        ...mockEvidenceInput,
        screenshots,
      };

      const mockScreenshotResults = [
        { hash: 'QmScreenshot1', url: 'https://ipfs.io/ipfs/QmScreenshot1', size: 100 },
        { hash: 'QmScreenshot2', url: 'https://ipfs.io/ipfs/QmScreenshot2', size: 150 },
      ];

      const mockBundleResult = {
        hash: 'QmTestHash123',
        url: 'https://ipfs.io/ipfs/QmTestHash123',
        size: 1024,
      };

      mockIPFSService.uploadFile
        .mockResolvedValueOnce(mockScreenshotResults[0])
        .mockResolvedValueOnce(mockScreenshotResults[1]);
      mockIPFSService.uploadMetadata.mockResolvedValue(mockBundleResult);
      mockIPFSService.pinContent.mockResolvedValue(undefined);

      const result = await evidenceStorageService.storeEvidenceBundle(inputWithScreenshots);

      expect(mockIPFSService.uploadFile).toHaveBeenCalledTimes(2);
      expect(mockIPFSService.pinContent).toHaveBeenCalledTimes(3); // 2 screenshots + 1 bundle
      expect(result.screenshots).toEqual(['QmScreenshot1', 'QmScreenshot2']);
    });

    it('should reject bundles that are too large', async () => {
      const largeInput: EvidenceBundleInput = {
        ...mockEvidenceInput,
        decisionRationale: 'x'.repeat(60 * 1024 * 1024), // 60MB string
      };

      await expect(evidenceStorageService.storeEvidenceBundle(largeInput))
        .rejects.toThrow('Evidence bundle too large');
    });

    it('should handle IPFS upload failures', async () => {
      mockIPFSService.uploadMetadata.mockRejectedValue(new Error('IPFS upload failed'));

      await expect(evidenceStorageService.storeEvidenceBundle(mockEvidenceInput))
        .rejects.toThrow('Failed to store evidence bundle: IPFS upload failed');
    });
  });

  describe('retrieveEvidenceBundle', () => {
    it('should successfully retrieve and verify evidence bundle', async () => {
      const mockBundle = {
        caseId: 123,
        contentHash: 'abc123hash',
        modelOutputs: {
          openai: {
            confidence: 0.95,
            categories: ['harassment'],
            reasoning: 'Contains threatening language',
            cost: 0.001,
            latency: 150,
          },
        },
        decisionRationale: 'Content violates harassment policy',
        policyVersion: '1.0',
        timestamp: new Date('2024-01-01T00:00:00Z'),
        moderatorId: 'mod_456',
      };

      const mockContent = Buffer.from(JSON.stringify(mockBundle));
      mockIPFSService.getContent.mockResolvedValue(mockContent);

      const result = await evidenceStorageService.retrieveEvidenceBundle('QmTestHash123');

      expect(result).toMatchObject({
        bundle: mockBundle,
        ipfsHash: 'QmTestHash123',
        isValid: expect.any(Boolean),
        retrievedAt: expect.any(Date),
      });

      expect(mockIPFSService.getContent).toHaveBeenCalledWith('QmTestHash123');
    });

    it('should handle retrieval failures', async () => {
      mockIPFSService.getContent.mockRejectedValue(new Error('Content not found'));

      await expect(evidenceStorageService.retrieveEvidenceBundle('QmInvalidHash'))
        .rejects.toThrow('Failed to retrieve evidence bundle: Content not found');
    });

    it('should handle invalid JSON in retrieved content', async () => {
      const invalidContent = Buffer.from('invalid json content');
      mockIPFSService.getContent.mockResolvedValue(invalidContent);

      await expect(evidenceStorageService.retrieveEvidenceBundle('QmTestHash123'))
        .rejects.toThrow('Failed to retrieve evidence bundle');
    });
  });

  describe('PII redaction', () => {
    it('should redact email addresses', async () => {
      const input: EvidenceBundleInput = {
        caseId: 123,
        contentId: 'content_123',
        contentType: 'post',
        contentHash: 'abc123hash',
        modelOutputs: {
          test: {
            vendor: 'test',
            confidence: 0.5,
            categories: ['test'],
            reasoning: 'Contact user at john.doe@example.com for more info',
            cost: 0,
            latency: 0,
          } as AIModelResult,
        },
        decisionRationale: 'Test case',
        policyVersion: '1.0',
      };

      mockIPFSService.uploadMetadata.mockResolvedValue({
        hash: 'QmTest',
        url: 'https://ipfs.io/ipfs/QmTest',
        size: 100,
      });
      mockIPFSService.pinContent.mockResolvedValue(undefined);

      await evidenceStorageService.storeEvidenceBundle(input);

      const uploadedBundle = mockIPFSService.uploadMetadata.mock.calls[0][0];
      expect(uploadedBundle.modelOutputs.test.reasoning).toBe('Contact user at [EMAIL_REDACTED] for more info');
    });

    it('should redact phone numbers', async () => {
      const input: EvidenceBundleInput = {
        caseId: 123,
        contentId: 'content_123',
        contentType: 'post',
        contentHash: 'abc123hash',
        modelOutputs: {
          test: {
            vendor: 'test',
            confidence: 0.5,
            categories: ['test'],
            reasoning: 'Call me at (555) 123-4567 or 555.123.4567',
            cost: 0,
            latency: 0,
          } as AIModelResult,
        },
        decisionRationale: 'Test case',
        policyVersion: '1.0',
      };

      mockIPFSService.uploadMetadata.mockResolvedValue({
        hash: 'QmTest',
        url: 'https://ipfs.io/ipfs/QmTest',
        size: 100,
      });
      mockIPFSService.pinContent.mockResolvedValue(undefined);

      await evidenceStorageService.storeEvidenceBundle(input);

      const uploadedBundle = mockIPFSService.uploadMetadata.mock.calls[0][0];
      expect(uploadedBundle.modelOutputs.test.reasoning).toBe('Call me at [PHONE_REDACTED] or [PHONE_REDACTED]');
    });

    it('should redact wallet addresses', async () => {
      const input: EvidenceBundleInput = {
        caseId: 123,
        contentId: 'content_123',
        contentType: 'post',
        contentHash: 'abc123hash',
        modelOutputs: {
          test: {
            vendor: 'test',
            confidence: 0.5,
            categories: ['test'],
            reasoning: 'Send ETH to 0x742d35Cc6634C0532925a3b8D4C9db96590e4265',
            cost: 0,
            latency: 0,
          } as AIModelResult,
        },
        decisionRationale: 'Test case',
        policyVersion: '1.0',
      };

      mockIPFSService.uploadMetadata.mockResolvedValue({
        hash: 'QmTest',
        url: 'https://ipfs.io/ipfs/QmTest',
        size: 100,
      });
      mockIPFSService.pinContent.mockResolvedValue(undefined);

      await evidenceStorageService.storeEvidenceBundle(input);

      const uploadedBundle = mockIPFSService.uploadMetadata.mock.calls[0][0];
      expect(uploadedBundle.modelOutputs.test.reasoning).toBe('Send ETH to [WALLET_ADDRESS_REDACTED]');
    });

    it('should redact seed phrases', async () => {
      const input: EvidenceBundleInput = {
        caseId: 123,
        contentId: 'content_123',
        contentType: 'post',
        contentHash: 'abc123hash',
        modelOutputs: {
          test: {
            vendor: 'test',
            confidence: 0.5,
            categories: ['test'],
            reasoning: 'My seed phrase is abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
            cost: 0,
            latency: 0,
          } as AIModelResult,
        },
        decisionRationale: 'Test case',
        policyVersion: '1.0',
      };

      mockIPFSService.uploadMetadata.mockResolvedValue({
        hash: 'QmTest',
        url: 'https://ipfs.io/ipfs/QmTest',
        size: 100,
      });
      mockIPFSService.pinContent.mockResolvedValue(undefined);

      await evidenceStorageService.storeEvidenceBundle(input);

      const uploadedBundle = mockIPFSService.uploadMetadata.mock.calls[0][0];
      expect(uploadedBundle.modelOutputs.test.reasoning).toBe('My seed phrase is [SEED_PHRASE_REDACTED]');
    });
  });

  describe('createAuditRecord', () => {
    it('should create and store audit record to IPFS', async () => {
      const auditParams = {
        caseId: 123,
        action: 'moderation_decision',
        actorId: 'mod_456',
        actorType: 'moderator' as const,
        oldState: { status: 'pending' },
        newState: { status: 'blocked', decision: 'block' },
        reasoning: 'Content violates policy',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
      };

      mockIPFSService.uploadFile.mockResolvedValue({
        hash: 'QmAuditHash123',
        url: 'https://ipfs.io/ipfs/QmAuditHash123',
        size: 512,
      });
      mockIPFSService.pinContent.mockResolvedValue(undefined);

      const result = await evidenceStorageService.createAuditRecord(auditParams);

      expect(result).toBe('QmAuditHash123');
      expect(mockIPFSService.uploadFile).toHaveBeenCalledTimes(1);
      expect(mockIPFSService.pinContent).toHaveBeenCalledWith('QmAuditHash123');

      // Verify the audit record structure
      const uploadedData = mockIPFSService.uploadFile.mock.calls[0][0] as Buffer;
      const auditRecord = JSON.parse(uploadedData.toString());
      
      expect(auditRecord).toMatchObject({
        caseId: 123,
        actionType: 'moderation_decision',
        actorId: 'mod_456',
        actorType: 'moderator',
        oldState: { status: 'pending' },
        newState: { status: 'blocked', decision: 'block' },
        reasoning: 'Content violates policy',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        timestamp: expect.any(String),
        version: '1.0',
      });
    });

    it('should redact PII from audit record reasoning', async () => {
      const auditParams = {
        caseId: 123,
        action: 'moderation_decision',
        actorId: 'mod_456',
        actorType: 'moderator' as const,
        reasoning: 'User provided email john@example.com in violation',
      };

      mockIPFSService.uploadFile.mockResolvedValue({
        hash: 'QmAuditHash123',
        url: 'https://ipfs.io/ipfs/QmAuditHash123',
        size: 512,
      });
      mockIPFSService.pinContent.mockResolvedValue(undefined);

      await evidenceStorageService.createAuditRecord(auditParams);

      const uploadedData = mockIPFSService.uploadFile.mock.calls[0][0] as Buffer;
      const auditRecord = JSON.parse(uploadedData.toString());
      
      expect(auditRecord.reasoning).toBe('User provided email [EMAIL_REDACTED] in violation');
    });
  });

  describe('verifyEvidenceExists', () => {
    it('should return true when evidence exists', async () => {
      mockIPFSService.getContent.mockResolvedValue(Buffer.from('test content'));

      const result = await evidenceStorageService.verifyEvidenceExists('QmTestHash');

      expect(result).toBe(true);
      expect(mockIPFSService.getContent).toHaveBeenCalledWith('QmTestHash');
    });

    it('should return false when evidence does not exist', async () => {
      mockIPFSService.getContent.mockRejectedValue(new Error('Not found'));

      const result = await evidenceStorageService.verifyEvidenceExists('QmInvalidHash');

      expect(result).toBe(false);
    });
  });

  describe('getEvidenceBundleMetadata', () => {
    it('should return metadata for existing bundle', async () => {
      const mockBundle = {
        caseId: 123,
        timestamp: new Date('2024-01-01T00:00:00Z'),
        contentHash: 'abc123',
      };

      const mockContent = Buffer.from(JSON.stringify(mockBundle));
      mockIPFSService.getContent.mockResolvedValue(mockContent);

      const result = await evidenceStorageService.getEvidenceBundleMetadata('QmTestHash');

      expect(result).toEqual({
        exists: true,
        size: mockContent.length,
        caseId: 123,
        timestamp: new Date('2024-01-01T00:00:00Z'),
      });
    });

    it('should return exists false for non-existent bundle', async () => {
      mockIPFSService.getContent.mockRejectedValue(new Error('Not found'));

      const result = await evidenceStorageService.getEvidenceBundleMetadata('QmInvalidHash');

      expect(result).toEqual({ exists: false });
    });
  });

  describe('generateEvidenceSummary', () => {
    it('should generate correct summary for evidence bundle', () => {
      const bundle = {
        caseId: 123,
        contentHash: 'abc123',
        modelOutputs: {
          openai: {
            confidence: 0.95,
            categories: ['harassment', 'spam'],
            reasoning: 'Test',
            cost: 0.001,
            latency: 150,
          },
          perspective: {
            confidence: 0.87,
            categories: ['toxicity'],
            reasoning: 'Test',
            cost: 0.0005,
            latency: 200,
          },
        },
        decisionRationale: 'Test rationale',
        policyVersion: '1.0',
        timestamp: new Date('2024-01-01T00:00:00Z'),
        screenshots: ['QmScreenshot1', 'QmScreenshot2'],
      };

      const summary = evidenceStorageService.generateEvidenceSummary(bundle);

      expect(summary).toEqual({
        caseId: 123,
        timestamp: new Date('2024-01-01T00:00:00Z'),
        modelCount: 2,
        hasScreenshots: true,
        primaryCategory: 'harassment',
        overallConfidence: 0.91, // (0.95 + 0.87) / 2
      });
    });

    it('should handle bundle without screenshots', () => {
      const bundle = {
        caseId: 123,
        contentHash: 'abc123',
        modelOutputs: {},
        decisionRationale: 'Test rationale',
        policyVersion: '1.0',
        timestamp: new Date('2024-01-01T00:00:00Z'),
      };

      const summary = evidenceStorageService.generateEvidenceSummary(bundle);

      expect(summary.hasScreenshots).toBe(false);
      expect(summary.modelCount).toBe(0);
      expect(summary.overallConfidence).toBeUndefined();
    });
  });
});
