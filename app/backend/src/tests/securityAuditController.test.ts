import { Request, Response } from 'express';
import { SecurityAuditController } from '../controllers/securityAuditController';
import { securityAuditService } from '../services/securityAuditService';

// Mock the security audit service
jest.mock('../services/securityAuditService');

describe('SecurityAuditController', () => {
  let securityAuditController: SecurityAuditController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonResponse: jest.Mock;
  let statusResponse: jest.Mock;

  beforeEach(() => {
    securityAuditController = new SecurityAuditController();
    jsonResponse = jest.fn();
    statusResponse = jest.fn().mockReturnValue({ json: jsonResponse });
    
    mockRequest = {};
    mockResponse = {
      json: jsonResponse,
      status: statusResponse.mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeService', () => {
    it('should initialize the service successfully', async () => {
      (securityAuditService.initialize as jest.Mock).mockResolvedValue(undefined);

      await securityAuditController.initializeService(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusResponse).toHaveBeenCalledWith(200);
      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        message: 'Security audit service initialized successfully'
      });
    });

    it('should handle initialization errors', async () => {
      (securityAuditService.initialize as jest.Mock).mockRejectedValue(new Error('Initialization failed'));

      await securityAuditController.initializeService(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusResponse).toHaveBeenCalledWith(500);
      expect(jsonResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to initialize security audit service',
        message: 'Initialization failed'
      });
    });
  });

  describe('logSecurityEvent', () => {
    it('should log a security event successfully', async () => {
      mockRequest = {
        body: {
          ipAddress: '192.168.1.1',
          actionType: 'user_login',
          resourceType: 'authentication',
          actionCategory: 'read',
          riskScore: 2,
          severity: 'low',
          outcome: 'success',
          complianceFlags: ['GDPR']
        }
      };

      (securityAuditService.logSecurityEvent as jest.Mock).mockResolvedValue('event-123');

      await securityAuditController.logSecurityEvent(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusResponse).toHaveBeenCalledWith(201);
      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        data: { eventId: 'event-123' }
      });
    });

    it('should handle validation errors', async () => {
      mockRequest = {
        body: {
          ipAddress: 'invalid-ip',
          actionType: 'user_login',
          resourceType: 'authentication',
          actionCategory: 'invalid-category',
          riskScore: -1,
          severity: 'invalid-severity',
          outcome: 'invalid-outcome',
          complianceFlags: 'not-an-array'
        }
      };

      await securityAuditController.logSecurityEvent(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusResponse).toHaveBeenCalledWith(400);
      expect(jsonResponse).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Invalid request data'
      }));
    });
  });

  describe('logAuthenticationEvent', () => {
    it('should log authentication event successfully', async () => {
      mockRequest = {
        body: {
          userId: 'user-123',
          action: 'login',
          outcome: 'success',
          details: { method: 'password' }
        },
        ip: '192.168.1.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0')
      };

      (securityAuditService.logAuthenticationEvent as jest.Mock).mockResolvedValue('event-123');

      await securityAuditController.logAuthenticationEvent(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusResponse).toHaveBeenCalledWith(201);
      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        data: { eventId: 'event-123' }
      });
    });

    it('should handle missing required fields', async () => {
      mockRequest = {
        body: {
          userId: 'user-123',
          // Missing action and outcome
          details: { method: 'password' }
        }
      };

      await securityAuditController.logAuthenticationEvent(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusResponse).toHaveBeenCalledWith(400);
      expect(jsonResponse).toHaveBeenCalledWith({
        success: false,
        error: 'userId, action, and outcome are required'
      });
    });
  });

  describe('logDataAccessEvent', () => {
    it('should log data access event successfully', async () => {
      mockRequest = {
        body: {
          userId: 'user-123',
          resource: 'user_profile',
          action: 'view',
          outcome: 'success',
          details: { resourceId: 'profile-456' }
        }
      };

      (securityAuditService.logDataAccessEvent as jest.Mock).mockResolvedValue('event-123');

      await securityAuditController.logDataAccessEvent(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusResponse).toHaveBeenCalledWith(201);
      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        data: { eventId: 'event-123' }
      });
    });

    it('should handle missing required fields', async () => {
      mockRequest = {
        body: {
          userId: 'user-123',
          resource: 'user_profile',
          // Missing action and outcome
          details: { resourceId: 'profile-456' }
        }
      };

      await securityAuditController.logDataAccessEvent(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusResponse).toHaveBeenCalledWith(400);
      expect(jsonResponse).toHaveBeenCalledWith({
        success: false,
        error: 'userId, resource, action, and outcome are required'
      });
    });
  });

  describe('logAdminAction', () => {
    it('should log admin action successfully', async () => {
      mockRequest = {
        body: {
          adminUserId: 'admin-123',
          action: 'update_settings',
          targetResource: 'system_config',
          outcome: 'success',
          details: { setting: 'timeout', oldValue: 30, newValue: 60 }
        },
        ip: '192.168.1.1'
      };

      (securityAuditService.logAdminAction as jest.Mock).mockResolvedValue('event-123');

      await securityAuditController.logAdminAction(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusResponse).toHaveBeenCalledWith(201);
      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        data: { eventId: 'event-123' }
      });
    });

    it('should handle missing required fields', async () => {
      mockRequest = {
        body: {
          adminUserId: 'admin-123',
          action: 'update_settings',
          targetResource: 'system_config',
          // Missing outcome
          details: { setting: 'timeout', oldValue: 30, newValue: 60 }
        }
      };

      await securityAuditController.logAdminAction(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusResponse).toHaveBeenCalledWith(400);
      expect(jsonResponse).toHaveBeenCalledWith({
        success: false,
        error: 'adminUserId, action, targetResource, and outcome are required'
      });
    });
  });

  describe('logSecurityIncident', () => {
    it('should log security incident successfully', async () => {
      mockRequest = {
        body: {
          incidentType: 'unauthorized_access',
          severity: 'high',
          details: { description: 'Multiple failed login attempts' },
          threatIndicators: ['brute_force', 'multiple_attempts']
        },
        ip: '192.168.1.1'
      };

      (securityAuditService.logSecurityIncident as jest.Mock).mockResolvedValue('event-123');

      await securityAuditController.logSecurityIncident(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusResponse).toHaveBeenCalledWith(201);
      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        data: { eventId: 'event-123' }
      });
    });

    it('should handle missing required fields', async () => {
      mockRequest = {
        body: {
          incidentType: 'unauthorized_access',
          severity: 'high',
          // Missing details
          threatIndicators: ['brute_force', 'multiple_attempts']
        }
      };

      await securityAuditController.logSecurityIncident(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusResponse).toHaveBeenCalledWith(400);
      expect(jsonResponse).toHaveBeenCalledWith({
        success: false,
        error: 'incidentType, severity, and details are required'
      });
    });
  });

  describe('queryAuditEvents', () => {
    it('should query audit events successfully', async () => {
      mockRequest = {
        query: {
          userId: 'user-123',
          actionType: 'login',
          startDate: '2023-01-01',
          endDate: '2023-12-31'
        }
      };

      const mockEvents = [
        {
          id: 'event-1',
          timestamp: new Date(),
          userId: 'user-123',
          ipAddress: '192.168.1.1',
          actionType: 'user_login',
          resourceType: 'authentication',
          actionCategory: 'read',
          riskScore: 2,
          severity: 'low',
          outcome: 'success',
          complianceFlags: ['GDPR']
        }
      ];

      (securityAuditService.queryAuditEvents as jest.Mock).mockResolvedValue(mockEvents);

      await securityAuditController.queryAuditEvents(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        data: mockEvents,
        count: mockEvents.length,
        timestamp: expect.any(String)
      });
    });

    it('should handle validation errors', async () => {
      mockRequest = {
        query: {
          userId: 'user-123',
          actionType: 'login',
          startDate: 'invalid-date',
          endDate: '2023-12-31'
        }
      };

      await securityAuditController.queryAuditEvents(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusResponse).toHaveBeenCalledWith(400);
      expect(jsonResponse).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Invalid query parameters'
      }));
    });
  });

  describe('reportIncident', () => {
    it('should report an incident successfully', async () => {
      mockRequest = {
        body: {
          severity: 'high',
          category: 'attack',
          title: 'Brute Force Attack',
          description: 'Multiple failed login attempts detected',
          affectedSystems: ['authentication_system'],
          indicators: ['brute_force', 'multiple_attempts']
        }
      };

      const mockIncident = {
        id: 'incident-123',
        timestamp: new Date(),
        severity: 'high',
        category: 'attack',
        title: 'Brute Force Attack',
        description: 'Multiple failed login attempts detected',
        affectedSystems: ['authentication_system'],
        indicators: ['brute_force', 'multiple_attempts'],
        status: 'detected',
        actionsTaken: [],
        timeline: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (securityAuditService.reportIncident as jest.Mock).mockResolvedValue(mockIncident);

      await securityAuditController.reportIncident(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusResponse).toHaveBeenCalledWith(201);
      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        data: mockIncident
      });
    });

    it('should handle validation errors', async () => {
      mockRequest = {
        body: {
          severity: 'invalid-severity',
          category: 'attack',
          title: 'Brute Force Attack',
          description: 'Multiple failed login attempts detected',
          affectedSystems: ['authentication_system'],
          indicators: ['brute_force', 'multiple_attempts']
        }
      };

      await securityAuditController.reportIncident(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusResponse).toHaveBeenCalledWith(400);
      expect(jsonResponse).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Invalid request data'
      }));
    });
  });

  describe('getIncident', () => {
    it('should retrieve an incident successfully', async () => {
      mockRequest = {
        params: {
          incidentId: 'incident-123'
        }
      };

      const mockIncident = {
        id: 'incident-123',
        timestamp: new Date(),
        severity: 'high',
        category: 'attack',
        title: 'Brute Force Attack',
        description: 'Multiple failed login attempts detected',
        affectedSystems: ['authentication_system'],
        indicators: ['brute_force', 'multiple_attempts'],
        status: 'detected',
        actionsTaken: [],
        timeline: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (securityAuditService.getIncident as jest.Mock).mockReturnValue(mockIncident);

      await securityAuditController.getIncident(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        data: mockIncident
      });
    });

    it('should handle non-existent incident', async () => {
      mockRequest = {
        params: {
          incidentId: 'non-existent-id'
        }
      };

      (securityAuditService.getIncident as jest.Mock).mockReturnValue(undefined);

      await securityAuditController.getIncident(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusResponse).toHaveBeenCalledWith(404);
      expect(jsonResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Incident not found'
      });
    });
  });

  describe('getAllIncidents', () => {
    it('should retrieve all incidents successfully', async () => {
      const mockIncidents = [
        {
          id: 'incident-1',
          timestamp: new Date(),
          severity: 'high',
          category: 'attack',
          title: 'Brute Force Attack',
          description: 'Multiple failed login attempts detected',
          affectedSystems: ['authentication_system'],
          indicators: ['brute_force', 'multiple_attempts'],
          status: 'detected',
          actionsTaken: [],
          timeline: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (securityAuditService.getAllIncidents as jest.Mock).mockReturnValue(mockIncidents);

      await securityAuditController.getAllIncidents(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        data: mockIncidents,
        count: mockIncidents.length,
        timestamp: expect.any(String)
      });
    });
  });

  describe('updateIncidentStatus', () => {
    it('should update incident status successfully', async () => {
      mockRequest = {
        params: {
          incidentId: 'incident-123'
        },
        body: {
          status: 'investigating',
          updatedBy: 'admin-456'
        }
      };

      (securityAuditService.updateIncidentStatus as jest.Mock).mockResolvedValue(true);

      await securityAuditController.updateIncidentStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        message: 'Incident status updated successfully'
      });
    });

    it('should handle missing required fields', async () => {
      mockRequest = {
        params: {
          incidentId: 'incident-123'
        },
        body: {
          status: 'investigating'
          // Missing updatedBy
        }
      };

      await securityAuditController.updateIncidentStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusResponse).toHaveBeenCalledWith(400);
      expect(jsonResponse).toHaveBeenCalledWith({
        success: false,
        error: 'status and updatedBy are required'
      });
    });

    it('should handle non-existent incident', async () => {
      mockRequest = {
        params: {
          incidentId: 'non-existent-id'
        },
        body: {
          status: 'investigating',
          updatedBy: 'admin-456'
        }
      };

      (securityAuditService.updateIncidentStatus as jest.Mock).mockResolvedValue(false);

      await securityAuditController.updateIncidentStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusResponse).toHaveBeenCalledWith(404);
      expect(jsonResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Incident not found'
      });
    });
  });

  describe('recordTamperDetection', () => {
    it('should record tamper detection successfully', async () => {
      mockRequest = {
        body: {
          resourceType: 'user_record',
          resourceId: 'user-123',
          expectedHash: 'expected-hash-value',
          actualHash: 'actual-hash-value',
          detectedBy: 'system',
          discrepancy: 'hash_mismatch'
        }
      };

      const mockRecord = {
        id: 'record-123',
        timestamp: new Date(),
        resourceType: 'user_record',
        resourceId: 'user-123',
        expectedHash: 'expected-hash-value',
        actualHash: 'actual-hash-value',
        discrepancy: 'hash_mismatch',
        detectedBy: 'system',
        resolved: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (securityAuditService.recordTamperDetection as jest.Mock).mockResolvedValue(mockRecord);

      await securityAuditController.recordTamperDetection(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusResponse).toHaveBeenCalledWith(201);
      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        data: mockRecord
      });
    });

    it('should handle validation errors', async () => {
      mockRequest = {
        body: {
          resourceType: 'user_record',
          resourceId: 'user-123',
          expectedHash: 'expected-hash-value',
          actualHash: 'actual-hash-value',
          detectedBy: 'system',
          discrepancy: '' // Empty discrepancy
        }
      };

      await securityAuditController.recordTamperDetection(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusResponse).toHaveBeenCalledWith(400);
      expect(jsonResponse).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Invalid request data'
      }));
    });
  });

  describe('resolveTamperDetection', () => {
    it('should resolve tamper detection successfully', async () => {
      mockRequest = {
        body: {
          recordId: 'record-123',
          resolutionNotes: 'Issue resolved by admin',
          resolvedBy: 'admin-456'
        }
      };

      (securityAuditService.resolveTamperDetection as jest.Mock).mockResolvedValue(true);

      await securityAuditController.resolveTamperDetection(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        message: 'Tamper detection resolved successfully'
      });
    });

    it('should handle validation errors', async () => {
      mockRequest = {
        body: {
          recordId: 'record-123',
          resolutionNotes: 'Issue resolved by admin'
          // Missing resolvedBy
        }
      };

      await securityAuditController.resolveTamperDetection(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusResponse).toHaveBeenCalledWith(400);
      expect(jsonResponse).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Invalid request data'
      }));
    });

    it('should handle non-existent tamper record', async () => {
      mockRequest = {
        body: {
          recordId: 'non-existent-id',
          resolutionNotes: 'Issue resolved by admin',
          resolvedBy: 'admin-456'
        }
      };

      (securityAuditService.resolveTamperDetection as jest.Mock).mockResolvedValue(false);

      await securityAuditController.resolveTamperDetection(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusResponse).toHaveBeenCalledWith(404);
      expect(jsonResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Tamper detection record not found'
      });
    });
  });

  describe('generateAuditReport', () => {
    it('should generate audit report successfully', async () => {
      mockRequest = {
        query: {
          startDate: '2023-01-01',
          endDate: '2023-12-31'
        }
      };

      const mockReport = {
        period: {
          start: new Date('2023-01-01'),
          end: new Date('2023-12-31')
        },
        summary: {
          totalEvents: 125,
          byActionType: { login: 50, view: 75 },
          byResourceType: { authentication: 50, user_profile: 75 },
          bySeverity: { low: 125 }
        },
        events: [],
        compliance: {
          gdprEvents: 125,
          soxEvents: 0,
          isoEvents: 0
        },
        incidents: [],
        tamperRecords: []
      };

      (securityAuditService.generateAuditReport as jest.Mock).mockResolvedValue(mockReport);

      await securityAuditController.generateAuditReport(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        data: mockReport,
        timestamp: expect.any(String)
      });
    });

    it('should handle missing required fields', async () => {
      mockRequest = {
        query: {
          startDate: '2023-01-01'
          // Missing endDate
        }
      };

      await securityAuditController.generateAuditReport(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusResponse).toHaveBeenCalledWith(400);
      expect(jsonResponse).toHaveBeenCalledWith({
        success: false,
        error: 'startDate and endDate are required'
      });
    });
  });
});