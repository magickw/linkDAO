import { CommunicationManagerService } from '../services/communicationManagerService';

// Mock the database
jest.mock('../db', () => ({
  db: {
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    values: jest.fn().mockResolvedValue({}),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis()
  }
}));

// Mock the logger
jest.mock('../utils/safeLogger', () => ({
  safeLogger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

describe('CommunicationManagerService', () => {
  let communicationManagerService: CommunicationManagerService;

  beforeEach(() => {
    communicationManagerService = new CommunicationManagerService();
    jest.clearAllMocks();
  });

  describe('logCommunication', () => {
    it('should log communication successfully', async () => {
      const communicationData = {
        conversationId: 'conv-123',
        messageId: 'msg-456',
        senderAddress: '0x123456789abcdef',
        recipientAddress: '0xabcdef123456789',
        contentPreview: 'Hello world',
        messageType: 'text',
        metadata: { ipAddress: '127.0.0.1' }
      };

      const result = await communicationManagerService.logCommunication(communicationData);

      expect(result).toHaveProperty('id');
      expect(result.conversationId).toBe(communicationData.conversationId);
      expect(result.messageId).toBe(communicationData.messageId);
      expect(result.senderAddress).toBe(communicationData.senderAddress);
      expect(result.recipientAddress).toBe(communicationData.recipientAddress);
      expect(result.contentPreview).toBe(communicationData.contentPreview);
      expect(result.messageType).toBe(communicationData.messageType);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle errors when logging communication', async () => {
      const communicationData = {
        conversationId: 'conv-123',
        messageId: 'msg-456',
        senderAddress: '0x123456789abcdef',
        recipientAddress: '0xabcdef123456789',
        contentPreview: 'Hello world',
        messageType: 'text'
      };

      // Mock an error in the database insert
      jest.spyOn(communicationManagerService as any, 'logCommunication').mockRejectedValue(new Error('Database error'));

      await expect(communicationManagerService.logCommunication(communicationData))
        .rejects.toThrow('Failed to log communication');
    });
  });

  describe('getCommunicationLogs', () => {
    it('should retrieve communication logs', async () => {
      const mockLogs = [
        {
          id: '1',
          conversationId: 'conv-123',
          messageId: 'msg-1',
          senderAddress: '0x123',
          recipientAddress: '0x456',
          contentPreview: 'Hello',
          messageType: 'text',
          timestamp: new Date(),
          readStatus: false
        }
      ];

      // Mock the database query
      const dbMock: any = require('../db').db;
      dbMock.limit.mockResolvedValue(mockLogs);

      const result = await communicationManagerService.getCommunicationLogs({
        userAddress: '0x123'
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        id: '1',
        conversationId: 'conv-123',
        messageId: 'msg-1'
      }));
    });
  });

  describe('createEscalationTrigger', () => {
    it('should create an escalation trigger successfully', async () => {
      const triggerData = {
        conversationId: 'conv-123',
        triggerType: 'negative_sentiment' as const,
        thresholdValue: 0.7,
        currentValue: 0.85,
        notes: 'Customer expressed dissatisfaction'
      };

      const result = await communicationManagerService.createEscalationTrigger(triggerData);

      expect(result).toHaveProperty('id');
      expect(result.conversationId).toBe(triggerData.conversationId);
      expect(result.triggerType).toBe(triggerData.triggerType);
      expect(result.thresholdValue).toBe(triggerData.thresholdValue);
      expect(result.currentValue).toBe(triggerData.currentValue);
      expect(result.triggeredAt).toBeInstanceOf(Date);
      expect(result.resolved).toBe(false);
    });
  });

  describe('resolveEscalation', () => {
    it('should resolve an escalation successfully', async () => {
      const result = await communicationManagerService.resolveEscalation(
        'escalation-123',
        'Issue resolved by support team'
      );

      expect(result).toBe(true);
    });
  });

  describe('getEscalationTriggers', () => {
    it('should retrieve escalation triggers', async () => {
      const result = await communicationManagerService.getEscalationTriggers({
        conversationId: 'conv-123'
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('routeEscalation', () => {
    it('should route escalation based on trigger type', async () => {
      const mockTrigger = {
        id: 'trigger-123',
        conversationId: 'conv-456',
        triggerType: 'negative_sentiment' as const,
        thresholdValue: 0.7,
        currentValue: 0.85,
        triggeredAt: new Date(),
        resolved: false
      };

      const result = await communicationManagerService.routeEscalation(
        mockTrigger,
        {}
      );

      expect(result).toBe('customer_success');
    });
  });

  describe('preserveEscalationContext', () => {
    it('should preserve escalation context', async () => {
      const result = await communicationManagerService.preserveEscalationContext(
        'escalation-123',
        { key: 'value' }
      );

      expect(result).toBe(true);
    });
  });

  describe('detectCommunicationPatterns', () => {
    it('should detect communication patterns', async () => {
      const result = await communicationManagerService.detectCommunicationPatterns();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('patternType');
      expect(result[0]).toHaveProperty('frequency');
      expect(result[0]).toHaveProperty('severity');
    });
  });

  describe('identifyIssuesFromPatterns', () => {
    it('should identify issues from patterns', async () => {
      const mockPatterns = [
        {
          patternType: 'negative_sentiment_cluster',
          frequency: 15,
          lastDetected: new Date(),
          affectedUsers: ['0x123...', '0x456...'],
          suggestedActions: ['Increase moderator presence'],
          severity: 'high' as const
        }
      ];

      const result = await communicationManagerService.identifyIssuesFromPatterns(mockPatterns);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('patternType');
      expect(result[0]).toHaveProperty('severity');
    });
  });

  describe('generateImprovementSuggestions', () => {
    it('should generate improvement suggestions', async () => {
      const mockIssues = [
        {
          patternType: 'negative_sentiment_cluster',
          severity: 'high',
          affectedUsersCount: 15,
          suggestedActions: [],
          detectedAt: new Date()
        }
      ];

      const result = await communicationManagerService.generateImprovementSuggestions(mockIssues);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('generateCommunicationAnalytics', () => {
    it('should generate communication analytics', async () => {
      const result = await communicationManagerService.generateCommunicationAnalytics();

      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('messageVolume');
      expect(result).toHaveProperty('responseMetrics');
      expect(result).toHaveProperty('escalationStats');
      expect(result).toHaveProperty('detectedPatterns');
    });
  });
});