import { SecurityAuditService } from '../services/securityAuditService';

// Mock the database
jest.mock('../db', () => ({
  db: {
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    values: jest.fn().mockResolvedValue({}),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis()
  }
}));

// Mock the logger
jest.mock('../utils/safeLogger', () => ({
  safeLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('SecurityAuditService', () => {
  let securityAuditService: SecurityAuditService;

  beforeEach(() => {
    securityAuditService = new SecurityAuditService();
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize the service successfully', async () => {
      await securityAuditService.initialize();
      
      // Verify the service is initialized
      expect(securityAuditService).toBeDefined();
    });
  });

  describe('logSecurityEvent', () => {
    it('should log a security event successfully', async () => {
      const eventData = {
        ipAddress: '192.168.1.1',
        actionType: 'user_login',
        resourceType: 'authentication',
        actionCategory: 'read' as const,
        riskScore: 2,
        severity: 'low' as const,
        outcome: 'success' as const,
        complianceFlags: ['GDPR']
      };

      const result = await securityAuditService.logSecurityEvent(eventData);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle errors when logging security event', async () => {
      // Mock an error in the database insert
      const dbMock: any = require('../db').db;
      dbMock.values.mockRejectedValue(new Error('Database error'));

      const eventData = {
        ipAddress: '192.168.1.1',
        actionType: 'user_login',
        resourceType: 'authentication',
        actionCategory: 'read' as const,
        riskScore: 2,
        severity: 'low' as const,
        outcome: 'success' as const,
        complianceFlags: ['GDPR']
      };

      await expect(securityAuditService.logSecurityEvent(eventData))
        .rejects.toThrow('Failed to log security event');
    });
  });

  describe('queryAuditEvents', () => {
    it('should query audit events successfully', async () => {
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

      // Mock the database query
      const dbMock: any = require('../db').db;
      dbMock.limit.mockResolvedValue([
        {
          id: 'event-1',
          adminId: 'user-123',
          ipAddress: '192.168.1.1',
          actionType: 'user_login',
          entityType: 'authentication',
          actionCategory: 'read',
          timestamp: new Date(),
          requiresApproval: false
        }
      ]);

      const result = await securityAuditService.queryAuditEvents({
        userId: 'user-123'
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('logAuthenticationEvent', () => {
    it('should log authentication event successfully', async () => {
      const result = await securityAuditService.logAuthenticationEvent(
        'user-123',
        'login',
        'success',
        '192.168.1.1',
        { method: 'password' }
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('logDataAccessEvent', () => {
    it('should log data access event successfully', async () => {
      const result = await securityAuditService.logDataAccessEvent(
        'user-123',
        'user_profile',
        'view',
        'success',
        { resourceId: 'profile-456' }
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('logAdminAction', () => {
    it('should log admin action successfully', async () => {
      const result = await securityAuditService.logAdminAction(
        'admin-123',
        'update_settings',
        'system_config',
        'success',
        '192.168.1.1',
        { setting: 'timeout', oldValue: 30, newValue: 60 }
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('logSecurityIncident', () => {
    it('should log security incident successfully', async () => {
      const result = await securityAuditService.logSecurityIncident(
        'unauthorized_access',
        'high',
        '192.168.1.100',
        { description: 'Multiple failed login attempts' },
        ['brute_force', 'multiple_attempts']
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('reportIncident', () => {
    it('should report an incident successfully', async () => {
      const result = await securityAuditService.reportIncident(
        'high',
        'attack',
        'Brute Force Attack',
        'Multiple failed login attempts detected',
        ['authentication_system'],
        ['brute_force', 'multiple_attempts']
      );

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe('Brute Force Attack');
      expect(result.severity).toBe('high');
    });
  });

  describe('getIncident', () => {
    it('should retrieve an incident by ID', async () => {
      // First report an incident
      const incident = await securityAuditService.reportIncident(
        'medium',
        'suspicious_activity',
        'Suspicious Activity',
        'Unusual pattern detected',
        ['user_accounts'],
        ['unusual_pattern']
      );

      // Then retrieve it
      const result = securityAuditService.getIncident(incident.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(incident.id);
      expect(result?.title).toBe('Suspicious Activity');
    });

    it('should return undefined for non-existent incident', () => {
      const result = securityAuditService.getIncident('non-existent-id');
      
      expect(result).toBeUndefined();
    });
  });

  describe('getAllIncidents', () => {
    it('should retrieve all incidents', async () => {
      // Report a couple of incidents
      await securityAuditService.reportIncident(
        'low',
        'test',
        'Test Incident 1',
        'Test description',
        ['test_system'],
        ['test_indicator']
      );

      await securityAuditService.reportIncident(
        'medium',
        'test',
        'Test Incident 2',
        'Test description',
        ['test_system'],
        ['test_indicator']
      );

      const result = securityAuditService.getAllIncidents();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('updateIncidentStatus', () => {
    it('should update incident status successfully', async () => {
      // First report an incident
      const incident = await securityAuditService.reportIncident(
        'high',
        'attack',
        'Test Attack',
        'Test attack description',
        ['authentication_system'],
        ['test_attack']
      );

      // Then update its status
      const result = await securityAuditService.updateIncidentStatus(
        incident.id,
        'investigating',
        'admin-123'
      );

      expect(result).toBe(true);
    });

    it('should return false for non-existent incident', async () => {
      const result = await securityAuditService.updateIncidentStatus(
        'non-existent-id',
        'investigating',
        'admin-123'
      );

      expect(result).toBe(false);
    });
  });

  describe('recordTamperDetection', () => {
    it('should record tamper detection successfully', async () => {
      const result = await securityAuditService.recordTamperDetection(
        'user_record',
        'user-123',
        'expected-hash-value',
        'actual-hash-value',
        'system',
        'hash_mismatch'
      );

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.resourceType).toBe('user_record');
      expect(result.resourceId).toBe('user-123');
    });
  });

  describe('resolveTamperDetection', () => {
    it('should resolve tamper detection successfully', async () => {
      // First record tamper detection
      const record = await securityAuditService.recordTamperDetection(
        'user_record',
        'user-123',
        'expected-hash-value',
        'actual-hash-value',
        'system',
        'hash_mismatch'
      );

      // Then resolve it
      const result = await securityAuditService.resolveTamperDetection(
        record.id,
        'Issue resolved by admin',
        'admin-456'
      );

      expect(result).toBe(true);
    });

    it('should return false for non-existent tamper record', async () => {
      const result = await securityAuditService.resolveTamperDetection(
        'non-existent-id',
        'Test resolution',
        'admin-456'
      );

      expect(result).toBe(false);
    });
  });

  describe('generateAuditReport', () => {
    it('should generate audit report successfully', async () => {
      const result = await securityAuditService.generateAuditReport(
        new Date(Date.now() - 86400000), // 24 hours ago
        new Date(),
        {
          userId: 'user-123',
          actionTypes: ['login', 'view'],
          severityLevels: ['low', 'medium']
        }
      );

      expect(result).toBeDefined();
      expect(result.period).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.events).toBeDefined();
    });
  });
});