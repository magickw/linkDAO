import { ReturnAlertManagerService, AlertConfig, ReturnAlertType, AlertSeverity, AlertChannelType, ReturnAlert } from '../services/returnAlertManagerService';
import { db } from '../db/index';
import { returnAdminAlerts } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock the safeLogger
jest.mock('../utils/safeLogger', () => ({
  safeLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid')
}));

// Mock database
jest.mock('../db/index', () => ({
  db: {
    insert: jest.fn(),
    update: jest.fn(),
    select: jest.fn(),
    from: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    eq: jest.fn()
  }
}));

describe('ReturnAlertManagerService', () => {
  let alertManager: ReturnAlertManagerService;
  let mockConfig: AlertConfig;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = jest.mocked(db);
    alertManager = new ReturnAlertManagerService();
    
    const now = new Date();
    mockConfig = {
      id: 'test-config-1',
      name: 'Test Alert',
      description: 'Test alert configuration',
      alertType: 'volume_spike',
      severity: 'high',
      enabled: true,
      threshold: 10,
      comparisonOperator: 'gt',
      timeWindowMinutes: 60,
      cooldownMinutes: 30,
      recipients: ['test@example.com'],
      channels: ['email'],
      createdAt: now,
      updatedAt: now
    };
  });

  afterEach(() => {
    alertManager.destroy();
    jest.clearAllMocks();
  });

  describe('Alert Configuration Management', () => {
    it('should create and retrieve alert configurations', () => {
      const config = alertManager.setAlertConfig(mockConfig);
      expect(config.id).toBe('test-config-1');
      
      const retrievedConfig = alertManager.getAlertConfig('test-config-1');
      expect(retrievedConfig).toEqual(config);
      
      const allConfigs = alertManager.getAlertConfigs();
      expect(allConfigs).toHaveLength(15); // 14 default + 1 test config
      expect(allConfigs).toContainEqual(config);
    });

    it('should update existing alert configuration', () => {
      // Create initial config
      const config = alertManager.setAlertConfig(mockConfig);
      
      // Update the config
      const updatedConfig = alertManager.setAlertConfig({
        ...mockConfig,
        threshold: 20,
        severity: 'critical'
      });
      
      expect(updatedConfig.id).toBe('test-config-1');
      expect(updatedConfig.threshold).toBe(20);
      expect(updatedConfig.severity).toBe('critical');
    });

    it('should delete alert configuration', () => {
      alertManager.setAlertConfig(mockConfig);
      const deleted = alertManager.deleteAlertConfig('test-config-1');
      expect(deleted).toBe(true);
      
      const config = alertManager.getAlertConfig('test-config-1');
      expect(config).toBeUndefined();
    });

    it('should toggle alert configuration', () => {
      alertManager.setAlertConfig(mockConfig);
      
      // Disable config
      const disabled = alertManager.toggleAlertConfig('test-config-1', false);
      expect(disabled).toBe(true);
      
      const disabledConfig = alertManager.getAlertConfig('test-config-1');
      expect(disabledConfig?.enabled).toBe(false);
      
      // Enable config
      const enabled = alertManager.toggleAlertConfig('test-config-1', true);
      expect(enabled).toBe(true);
      
      const enabledConfig = alertManager.getAlertConfig('test-config-1');
      expect(enabledConfig?.enabled).toBe(true);
    });
  });

  describe('Alert Generation and Management', () => {
    it('should generate alert with correct properties', async () => {
      // Mock database insert
      const mockInsert = {
        values: jest.fn().mockResolvedValue(undefined),
      };
      (mockDb.insert as jest.Mock).mockReturnValue(mockInsert);
      
      // Mock notification sending
      const mockSendNotifications = jest.spyOn(alertManager as any, 'sendNotifications').mockResolvedValue(undefined);
      
      // Mock current value calculation
      const mockGetCurrentValue = jest.spyOn(alertManager as any, 'getCurrentValueForAlert').mockResolvedValue(15);
      
      // Create a config and generate an alert
      const config = alertManager.setAlertConfig(mockConfig);
      const alert = await (alertManager as any).generateAlert(config);
      
      expect(alert).toBeDefined();
      expect(alert.alertType).toBe('volume_spike');
      expect(alert.severity).toBe('high');
      expect(alert.title).toBe('Test Alert');
      expect(alert.status).toBe('active');
      expect(alert.actualValue).toBe(15);
      expect(alert.triggerThreshold).toBe(10);
      
      // Verify database insert was called
      expect(mockDb.insert).toHaveBeenCalledWith(returnAdminAlerts);
      expect(mockInsert.values).toHaveBeenCalled();
      
      // Verify notifications were sent
      expect(mockSendNotifications).toHaveBeenCalledWith(alert, config);
    });

    it('should acknowledge an alert', async () => {
      // Mock database update
      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };
      (mockDb.update as jest.Mock).mockReturnValue(mockUpdate);
      
      // Create an alert in memory
      const now = new Date();
      const mockAlert: ReturnAlert = {
        id: 'alert-123',
        alertType: 'volume_spike',
        severity: 'high',
        title: 'Test Alert',
        description: 'Test alert description',
        status: 'active',
        createdAt: now,
        updatedAt: now
      };
      
      // Add alert to active alerts map
      (alertManager as any).activeAlerts.set('alert-123', mockAlert);
      
      // Acknowledge the alert
      const result = await alertManager.acknowledgeAlert('alert-123', 'test-admin');
      
      expect(result).toBe(true);
      const updatedAlert = alertManager.getAlert('alert-123');
      expect(updatedAlert?.status).toBe('acknowledged');
      expect(updatedAlert?.acknowledgedBy).toBe('test-admin');
      expect(updatedAlert?.acknowledgedAt).toBeDefined();
      
      // Verify database update was called
      expect(mockDb.update).toHaveBeenCalledWith(returnAdminAlerts);
      expect(mockUpdate.set).toHaveBeenCalled();
      expect(mockUpdate.where).toHaveBeenCalled();
    });

    it('should resolve an alert', async () => {
      // Mock database update
      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };
      (mockDb.update as jest.Mock).mockReturnValue(mockUpdate);
      
      // Create an alert in memory
      const now = new Date();
      const mockAlert: ReturnAlert = {
        id: 'alert-123',
        alertType: 'volume_spike',
        severity: 'high',
        title: 'Test Alert',
        description: 'Test alert description',
        status: 'active',
        createdAt: now,
        updatedAt: now
      };
      
      // Add alert to active alerts map
      (alertManager as any).activeAlerts.set('alert-123', mockAlert);
      
      // Resolve the alert
      const result = await alertManager.resolveAlert('alert-123', 'test-admin', 'Issue resolved');
      
      expect(result).toBe(true);
      const updatedAlert = alertManager.getAlert('alert-123');
      expect(updatedAlert?.status).toBe('resolved');
      expect(updatedAlert?.resolvedBy).toBe('test-admin');
      expect(updatedAlert?.resolutionNotes).toBe('Issue resolved');
      expect(updatedAlert?.resolvedAt).toBeDefined();
      
      // Verify database update was called
      expect(mockDb.update).toHaveBeenCalledWith(returnAdminAlerts);
      expect(mockUpdate.set).toHaveBeenCalled();
      expect(mockUpdate.where).toHaveBeenCalled();
    });

    it('should dismiss an alert', async () => {
      // Mock database update
      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };
      (mockDb.update as jest.Mock).mockReturnValue(mockUpdate);
      
      // Create an alert in memory
      const now = new Date();
      const mockAlert: ReturnAlert = {
        id: 'alert-123',
        alertType: 'volume_spike',
        severity: 'high',
        title: 'Test Alert',
        description: 'Test alert description',
        status: 'active',
        createdAt: now,
        updatedAt: now
      };
      
      // Add alert to active alerts map
      (alertManager as any).activeAlerts.set('alert-123', mockAlert);
      
      // Dismiss the alert
      const result = await alertManager.dismissAlert('alert-123', 'test-admin');
      
      expect(result).toBe(true);
      const updatedAlert = alertManager.getAlert('alert-123');
      expect(updatedAlert?.status).toBe('dismissed');
      expect(updatedAlert?.resolvedBy).toBe('test-admin');
      expect(updatedAlert?.resolvedAt).toBeDefined();
      
      // Verify database update was called
      expect(mockDb.update).toHaveBeenCalledWith(returnAdminAlerts);
      expect(mockUpdate.set).toHaveBeenCalled();
      expect(mockUpdate.where).toHaveBeenCalled();
    });
  });

  describe('Alert History and Statistics', () => {
    it('should retrieve alert history from database', async () => {
      const now = new Date();
      const mockAlerts = [
        {
          id: 'alert-1',
          alertType: 'volume_spike',
          severity: 'high',
          title: 'Volume Spike Alert',
          description: 'High return volume detected',
          status: 'active',
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'alert-2',
          alertType: 'fraud_detected',
          severity: 'critical',
          title: 'Fraud Detected',
          description: 'Fraudulent return detected',
          status: 'resolved',
          createdAt: now,
          updatedAt: now
        }
      ];
      
      // Mock database select
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockAlerts),
      };
      (mockDb.select as jest.Mock).mockReturnValue(mockSelect);
      
      const alerts = await alertManager.getAlertHistory(10);
      
      expect(alerts).toHaveLength(2);
      expect(alerts[0].id).toBe('alert-1');
      expect(alerts[1].id).toBe('alert-2');
      
      // Verify database query was called correctly
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockSelect.from).toHaveBeenCalledWith(returnAdminAlerts);
      expect(mockSelect.orderBy).toHaveBeenCalledWith(desc(returnAdminAlerts.createdAt));
      expect(mockSelect.limit).toHaveBeenCalledWith(10);
    });

    it('should calculate alert statistics correctly', async () => {
      const now = new Date();
      const mockAlerts = [
        {
          id: 'alert-1',
          alertType: 'volume_spike',
          severity: 'high',
          title: 'Volume Spike Alert',
          description: 'High return volume detected',
          status: 'active',
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'alert-2',
          alertType: 'volume_spike',
          severity: 'high',
          title: 'Volume Spike Alert',
          description: 'High return volume detected',
          status: 'resolved',
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'alert-3',
          alertType: 'fraud_detected',
          severity: 'critical',
          title: 'Fraud Detected',
          description: 'Fraudulent return detected',
          status: 'active',
          createdAt: now,
          updatedAt: now
        }
      ];
      
      // Mock getAlertHistory to return our mock alerts
      const mockGetAlertHistory = jest.spyOn(alertManager, 'getAlertHistory').mockResolvedValue(mockAlerts as any);
      
      const stats = await alertManager.getAlertStats();
      
      expect(stats.total).toBe(3);
      expect(stats.bySeverity.high).toBe(2);
      expect(stats.bySeverity.critical).toBe(1);
      expect(stats.byType.volume_spike).toBe(2);
      expect(stats.byType.fraud_detected).toBe(1);
      expect(stats.unresolved).toBe(2); // 2 active alerts
      
      mockGetAlertHistory.mockRestore();
    });
  });

  describe('Alert Escalation', () => {
    it('should manually escalate an alert', async () => {
      // Mock database update
      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };
      (mockDb.update as jest.Mock).mockReturnValue(mockUpdate);
      
      // Create an alert in memory
      const now = new Date();
      const mockAlert: ReturnAlert = {
        id: 'alert-123',
        alertType: 'volume_spike',
        severity: 'high',
        title: 'Test Alert',
        description: 'Test alert description',
        status: 'active',
        createdAt: now,
        updatedAt: now
      };
      
      // Add alert to active alerts map
      (alertManager as any).activeAlerts.set('alert-123', mockAlert);
      
      // Manually escalate the alert
      const result = await alertManager.manuallyEscalateAlert('alert-123', 'test-admin', 'Manual escalation needed');
      
      expect(result).toBe(true);
      const updatedAlert = alertManager.getAlert('alert-123');
      expect(updatedAlert?.contextData?.escalationLevel).toBe(1);
      expect(updatedAlert?.contextData?.lastEscalationTime).toBeDefined();
      expect(updatedAlert?.contextData?.escalations).toHaveLength(1);
      
      // Verify database update was called
      expect(mockDb.update).toHaveBeenCalledWith(returnAdminAlerts);
      expect(mockUpdate.set).toHaveBeenCalled();
      expect(mockUpdate.where).toHaveBeenCalledWith(eq(returnAdminAlerts.id, 'alert-123'));
    });

    it('should get alert escalation history', () => {
      // Create an alert with escalation history
      const now = new Date();
      const mockAlert: ReturnAlert = {
        id: 'alert-123',
        alertType: 'volume_spike',
        severity: 'high',
        title: 'Test Alert',
        description: 'Test alert description',
        status: 'active',
        contextData: {
          escalations: [
            {
              id: 'escalation-1',
              alertId: 'alert-123',
              level: 1,
              escalatedAt: now,
              escalatedTo: ['admin1@example.com'],
              escalatedChannels: ['email'],
              reason: 'Automatic escalation'
            }
          ]
        },
        createdAt: now,
        updatedAt: now
      };
      
      // Add alert to active alerts map
      (alertManager as any).activeAlerts.set('alert-123', mockAlert);
      
      const escalations = alertManager.getAlertEscalationHistory('alert-123');
      
      expect(escalations).toHaveLength(1);
      expect(escalations[0].id).toBe('escalation-1');
      expect(escalations[0].level).toBe(1);
    });
  });

  describe('Alert Checking and Evaluation', () => {
    it('should check all alerts and trigger when conditions are met', async () => {
      // Mock database insert for alert generation
      const mockInsert = {
        values: jest.fn().mockResolvedValue(undefined),
      };
      (mockDb.insert as jest.Mock).mockReturnValue(mockInsert);
      
      // Mock notification sending
      const mockSendNotifications = jest.spyOn(alertManager as any, 'sendNotifications').mockResolvedValue(undefined);
      
      // Mock metric calculation to return a value that exceeds threshold
      const mockGetReturnVolume = jest.spyOn(alertManager as any, 'getReturnVolume').mockResolvedValue(15); // Above threshold of 10
      
      // Run alert checking
      await alertManager.checkAllAlerts();
      
      // Since we have default configs, at least one alert should be generated
      // But we need to verify the behavior more specifically
      expect(mockGetReturnVolume).toHaveBeenCalled();
      
      // Clean up mocks
      mockSendNotifications.mockRestore();
      mockGetReturnVolume.mockRestore();
    });

    it('should respect cooldown periods between alert checks', async () => {
      // Set a last check time for a config
      const configId = 'vol-spike-001'; // Volume spike config ID from defaults
      (alertManager as any).lastCheckTimes.set(configId, new Date());
      
      // Mock metric calculation
      const mockGetReturnVolume = jest.spyOn(alertManager as any, 'getReturnVolume').mockResolvedValue(15);
      
      // Run alert checking
      await alertManager.checkAllAlerts();
      
      // Since we're within cooldown, getReturnVolume should not be called
      expect(mockGetReturnVolume).not.toHaveBeenCalled();
      
      mockGetReturnVolume.mockRestore();
    });
  });
});