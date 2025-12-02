import { Request, Response } from 'express';
import { CommunicationManagerController } from '../controllers/communicationManagerController';
import { communicationManagerService } from '../services/communicationManagerService';

// Mock the communication manager service
jest.mock('../services/communicationManagerService');

describe('CommunicationManagerController', () => {
  let communicationManagerController: CommunicationManagerController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonResponse: jest.Mock;

  beforeEach(() => {
    communicationManagerController = new CommunicationManagerController();
    jsonResponse = jest.fn();
    mockRequest = {};
    mockResponse = {
      json: jsonResponse,
      status: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logCommunication', () => {
    it('should log communication successfully', async () => {
      mockRequest = {
        body: {
          conversationId: 'conv-123',
          messageId: 'msg-456',
          senderAddress: '0x123456789abcdef123456789abcdef123456789a',
          recipientAddress: '0xabcdef123456789abcdef123456789abcdef12345',
          contentPreview: 'Hello world',
          messageType: 'text'
        }
      };

      const mockLogEntry = {
        id: 'log-123',
        conversationId: 'conv-123',
        messageId: 'msg-456',
        senderAddress: '0x123456789abcdef123456789abcdef123456789a',
        recipientAddress: '0xabcdef123456789abcdef123456789abcdef12345',
        contentPreview: 'Hello world',
        messageType: 'text',
        timestamp: new Date(),
        readStatus: false
      };

      (communicationManagerService.logCommunication as jest.Mock).mockResolvedValue(mockLogEntry);

      await communicationManagerController.logCommunication(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        data: mockLogEntry,
        message: 'Communication logged successfully'
      });
    });

    it('should handle validation errors', async () => {
      mockRequest = {
        body: {
          conversationId: 'invalid-id',
          messageId: 'msg-456',
          senderAddress: 'invalid-address',
          recipientAddress: '0xabcdef123456789abcdef123456789abcdef12345',
          contentPreview: 'Hello world',
          messageType: 'text'
        }
      };

      await communicationManagerController.logCommunication(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonResponse).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Invalid request data'
      }));
    });
  });

  describe('getCommunicationLogs', () => {
    it('should retrieve communication logs', async () => {
      mockRequest = {
        query: {
          userAddress: '0x123456789abcdef123456789abcdef123456789a',
          startDate: '2023-01-01',
          endDate: '2023-12-31'
        }
      };

      const mockLogs = [
        {
          id: 'log-1',
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

      (communicationManagerService.getCommunicationLogs as jest.Mock).mockResolvedValue(mockLogs);

      await communicationManagerController.getCommunicationLogs(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        data: mockLogs,
        count: mockLogs.length,
        timestamp: expect.any(String)
      });
    });
  });

  describe('createEscalationTrigger', () => {
    it('should create escalation trigger successfully', async () => {
      mockRequest = {
        body: {
          conversationId: 'conv-123',
          triggerType: 'negative_sentiment',
          thresholdValue: 0.7,
          currentValue: 0.85,
          notes: 'Customer expressed dissatisfaction'
        }
      };

      const mockTrigger = {
        id: 'trigger-123',
        conversationId: 'conv-123',
        triggerType: 'negative_sentiment',
        thresholdValue: 0.7,
        currentValue: 0.85,
        triggeredAt: new Date(),
        resolved: false
      };

      (communicationManagerService.createEscalationTrigger as jest.Mock).mockResolvedValue(mockTrigger);

      await communicationManagerController.createEscalationTrigger(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        data: mockTrigger,
        message: 'Escalation trigger created successfully'
      });
    });
  });

  describe('resolveEscalation', () => {
    it('should resolve escalation successfully', async () => {
      mockRequest = {
        params: {
          escalationId: 'escalation-123'
        },
        body: {
          resolutionNotes: 'Issue resolved by support team'
        }
      };

      (communicationManagerService.resolveEscalation as jest.Mock).mockResolvedValue(true);

      await communicationManagerController.resolveEscalation(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        message: 'Escalation resolved successfully'
      });
    });
  });

  describe('getEscalationTriggers', () => {
    it('should retrieve escalation triggers', async () => {
      mockRequest = {
        query: {
          conversationId: 'conv-123',
          resolved: 'false'
        }
      };

      const mockTriggers = [
        {
          id: 'trigger-123',
          conversationId: 'conv-123',
          triggerType: 'negative_sentiment',
          thresholdValue: 0.7,
          currentValue: 0.85,
          triggeredAt: new Date(),
          resolved: false
        }
      ];

      (communicationManagerService.getEscalationTriggers as jest.Mock).mockResolvedValue(mockTriggers);

      await communicationManagerController.getEscalationTriggers(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        data: mockTriggers,
        count: mockTriggers.length,
        timestamp: expect.any(String)
      });
    });
  });

  describe('routeEscalation', () => {
    it('should route escalation successfully', async () => {
      mockRequest = {
        params: {
          escalationId: 'escalation-123'
        },
        body: {
          teamRoutingRules: {}
        }
      };

      const mockTriggers = [
        {
          id: 'trigger-123',
          conversationId: 'conv-123',
          triggerType: 'negative_sentiment',
          thresholdValue: 0.7,
          currentValue: 0.85,
          triggeredAt: new Date(),
          resolved: false
        }
      ];

      (communicationManagerService.getEscalationTriggers as jest.Mock).mockResolvedValue(mockTriggers);
      (communicationManagerService.routeEscalation as jest.Mock).mockResolvedValue('customer_success');

      await communicationManagerController.routeEscalation(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        data: {
          escalationId: 'escalation-123',
          assignedTeam: 'customer_success'
        },
        message: 'Escalation routed successfully'
      });
    });

    it('should handle missing escalation trigger', async () => {
      mockRequest = {
        params: {
          escalationId: 'escalation-123'
        },
        body: {
          teamRoutingRules: {}
        }
      };

      (communicationManagerService.getEscalationTriggers as jest.Mock).mockResolvedValue([]);

      await communicationManagerController.routeEscalation(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(jsonResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Escalation trigger not found'
      });
    });
  });

  describe('preserveEscalationContext', () => {
    it('should preserve escalation context successfully', async () => {
      mockRequest = {
        params: {
          escalationId: 'escalation-123'
        },
        body: {
          contextData: { key: 'value' }
        }
      };

      (communicationManagerService.preserveEscalationContext as jest.Mock).mockResolvedValue(true);

      await communicationManagerController.preserveEscalationContext(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        message: 'Escalation context preserved successfully'
      });
    });
  });

  describe('getCommunicationPatterns', () => {
    it('should retrieve communication patterns', async () => {
      mockRequest = {
        query: {
          startDate: '2023-01-01',
          endDate: '2023-12-31'
        }
      };

      const mockPatterns = [
        {
          patternType: 'negative_sentiment_cluster',
          frequency: 15,
          lastDetected: new Date(),
          affectedUsers: ['0x123...', '0x456...'],
          suggestedActions: ['Increase moderator presence'],
          severity: 'high'
        }
      ];

      (communicationManagerService.detectCommunicationPatterns as jest.Mock).mockResolvedValue(mockPatterns);

      await communicationManagerController.getCommunicationPatterns(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        data: mockPatterns,
        count: mockPatterns.length,
        timestamp: expect.any(String)
      });
    });
  });

  describe('getCommunicationAnalytics', () => {
    it('should generate communication analytics', async () => {
      mockRequest = {
        query: {
          startDate: '2023-01-01',
          endDate: '2023-12-31'
        }
      };

      const mockAnalytics = {
        period: {
          start: new Date('2023-01-01'),
          end: new Date('2023-12-31')
        },
        messageVolume: {
          total: 12543,
          byType: {
            text: 11200,
            image: 890
          },
          byUser: {
            '0x123...': 1250
          }
        },
        responseMetrics: {
          averageResponseTime: 180,
          responseRate: 87
        },
        escalationStats: {
          totalTriggers: 24,
          resolvedEscalations: 19,
          pendingEscalations: 5
        },
        detectedPatterns: []
      };

      (communicationManagerService.generateCommunicationAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);

      await communicationManagerController.getCommunicationAnalytics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        data: mockAnalytics,
        timestamp: expect.any(String)
      });
    });
  });
});