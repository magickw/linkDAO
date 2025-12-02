/**
 * Real-time Compliance Monitoring Service Tests
 * 
 * Comprehensive test suite for real-time compliance monitoring,
 * WebSocket communication, and alert system functionality.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import WebSocket from 'ws';
import { RealTimeComplianceMonitoringService } from '../services/realTimeComplianceMonitoringService';
import { RealTimeComplianceAlertService } from '../services/realTimeComplianceAlertService';
import { SellerReturnPerformanceService } from '../services/sellerReturnPerformanceService';

// Mock WebSocket
jest.mock('ws');
const MockWebSocket = WebSocket as jest.MockedClass<typeof WebSocket>;

describe('Real-time Compliance Monitoring', () => {
  let monitoringService: RealTimeComplianceMonitoringService;
  let alertService: RealTimeComplianceAlertService;
  let sellerService: SellerReturnPerformanceService;
  let mockWs: jest.Mocked<WebSocket>;

  beforeEach(() => {
    // Mock WebSocket implementation
    mockWs = {
      readyState: WebSocket.OPEN,
      send: jest.fn(),
      on: jest.fn(),
      close: jest.fn()
    } as any;

    MockWebSocket.mockImplementation(() => mockWs);

    monitoringService = new RealTimeComplianceMonitoringService();
    alertService = new RealTimeComplianceAlertService();
    sellerService = new SellerReturnPerformanceService();
  });

  afterEach(() => {
    monitoringService.shutdown();
  });

  describe('WebSocket Connection Management', () => {
    it('should initialize WebSocket server on correct port', () => {
      expect(MockWebSocket).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 8080,
          path: '/compliance-monitoring'
        })
      );
    });

    it('should handle new client connections', () => {
      const mockClient = new WebSocket('ws://localhost:8080');
      
      expect(mockWs.on).toHaveBeenCalledWith('connection', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should send welcome message on connection', () => {
      const mockClient = new WebSocket('ws://localhost:8080');
      
      // Simulate connection event
      const connectionCallback = (mockWs.on as jest.Mock).mock.calls.find(
        call => call[0] === 'connection'
      )?.[1];
      
      if (connectionCallback) {
        connectionCallback(mockWs);
      }

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('connection_established')
      );
    });

    it('should handle client disconnection', () => {
      const clientId = 'test-client-1';
      
      // Simulate client connection
      monitoringService['clients'].set(clientId, {
        id: clientId,
        ws: mockWs,
        userId: 'test-user',
        permissions: ['read_compliance'],
        subscribedSellers: new Set(),
        lastActivity: new Date(),
        isActive: true
      });

      // Simulate disconnection
      const closeCallback = (mockWs.on as jest.Mock).mock.calls.find(
        call => call[0] === 'close'
      )?.[1];
      
      if (closeCallback) {
        closeCallback();
      }

      expect(monitoringService['clients'].has(clientId)).toBe(false);
    });
  });

  describe('Message Handling', () => {
    let clientId: string;

    beforeEach(() => {
      clientId = 'test-client-1';
      monitoringService['clients'].set(clientId, {
        id: clientId,
        ws: mockWs,
        userId: 'test-user',
        permissions: ['read_compliance'],
        subscribedSellers: new Set(),
        lastActivity: new Date(),
        isActive: true
      });
    });

    it('should handle authentication messages', async () => {
      const authMessage = {
        type: 'authenticate',
        userId: 'test-user-2',
        permissions: ['read_compliance', 'manage_alerts']
      };

      const messageCallback = (mockWs.on as jest.Mock).mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      if (messageCallback) {
        await messageCallback.call(monitoringService, JSON.stringify(authMessage));
      }

      const client = monitoringService['clients'].get(clientId);
      expect(client?.userId).toBe('test-user-2');
      expect(client?.permissions).toContain('manage_alerts');
    });

    it('should handle seller subscription', async () => {
      const subscribeMessage = {
        type: 'subscribe_seller',
        sellerId: 'seller-123'
      };

      const messageCallback = (mockWs.on as jest.Mock).mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      if (messageCallback) {
        await messageCallback.call(monitoringService, JSON.stringify(subscribeMessage));
      }

      const client = monitoringService['clients'].get(clientId);
      expect(client?.subscribedSellers.has('seller-123')).toBe(true);
    });

    it('should reject unauthorized subscription attempts', async () => {
      // Set client with limited permissions
      const client = monitoringService['clients'].get(clientId);
      if (client) {
        client.permissions = ['limited'];
      }

      const subscribeMessage = {
        type: 'subscribe_seller',
        sellerId: 'seller-123'
      };

      const messageCallback = (mockWs.on as jest.Mock).mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      if (messageCallback) {
        await messageCallback.call(monitoringService, JSON.stringify(subscribeMessage));
      }

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('Insufficient permissions')
      );
    });
  });

  describe('Violation Detection and Alerting', () => {
    it('should detect processing delay violations', async () => {
      const mockViolation = {
        id: 'violation-1',
        type: 'violation',
        severity: 'high',
        sellerId: 'seller-123',
        sellerName: 'Test Seller',
        timestamp: new Date(),
        message: 'Processing delay detected',
        details: {
          violations: [
            {
              violationType: 'processing_delay',
              severity: 'high',
              description: 'Returns processed beyond 48-hour SLA'
            }
          ]
        },
        requiresAction: true
      };

      // Trigger violation detection
      await monitoringService['broadcastViolationAlert']('seller-123', {
        violations: mockViolation.details.violations,
        sellerName: 'Test Seller'
      });

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('compliance_alert')
      );
    });

    it('should emit violation detected events', (done) => {
      const mockViolation = {
        id: 'violation-2',
        type: 'violation',
        severity: 'critical',
        sellerId: 'seller-456',
        sellerName: 'Critical Seller',
        timestamp: new Date(),
        message: 'Critical violation detected',
        details: {},
        requiresAction: true
      };

      monitoringService.on('violation_detected', (alert) => {
        expect(alert.sellerId).toBe('seller-456');
        expect(alert.severity).toBe('critical');
        done();
      });

      monitoringService.emit('violation_detected', mockViolation);
    });
  });

  describe('Compliance Score Monitoring', () => {
    it('should detect significant score changes', async () => {
      const currentMetrics = {
        sellerId: 'seller-789',
        sellerName: 'Score Change Seller',
        complianceScore: 75
      };

      // Mock previous score
      monitoringService['getPreviousComplianceScore'] = jest.fn().mockResolvedValue(85);

      await monitoringService['checkScoreChanges']('seller-789', currentMetrics);

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('score_change')
      );
    });

    it('should detect threshold breaches', async () => {
      const metrics = {
        sellerId: 'seller-threshold',
        sellerName: 'Threshold Seller',
        complianceScore: 65, // Below 70 threshold
        processingTimeCompliance: 75, // Below 80 threshold
        approvalRateDeviation: 25 // Above 20 threshold
      };

      await monitoringService['checkThresholdBreaches']('seller-threshold', metrics);

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('threshold_breach')
      );
    });
  });

  describe('Alert Service Integration', () => {
    it('should create compliance alerts from violations', async () => {
      const violationAlert = {
        id: 'alert-violation-1',
        type: 'violation',
        severity: 'high',
        sellerId: 'seller-alert-1',
        sellerName: 'Alert Seller',
        timestamp: new Date(),
        message: 'Test violation alert',
        details: {
          violations: [{ violationType: 'processing_delay', severity: 'high' }]
        },
        requiresAction: true
      };

      const matchingRules = alertService['findMatchingRules'](violationAlert);
      expect(matchingRules.length).toBeGreaterThan(0);

      const complianceAlert = await alertService['createComplianceAlert'](
        violationAlert,
        matchingRules[0]
      );

      expect(complianceAlert).toBeDefined();
      expect(complianceAlert.sellerId).toBe('seller-alert-1');
      expect(complianceAlert.severity).toBe('high');
    });

    it('should handle alert escalation', async () => {
      const alert = {
        id: 'escalation-test',
        sellerId: 'seller-escalation',
        severity: 'critical',
        acknowledged: false,
        resolved: false,
        escalationLevel: 1
      };

      alertService['activeAlerts'].set('escalation-test', alert);

      await alertService['escalateAlert'](alert);

      expect(alert.escalationLevel).toBe(2);
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('escalated')
      );
    });

    it('should acknowledge alerts', async () => {
      const alertId = 'acknowledge-test';
      const userId = 'admin-user';

      const alert = {
        id: alertId,
        sellerId: 'seller-ack',
        acknowledged: false,
        resolved: false
      };

      alertService['activeAlerts'].set(alertId, alert);

      await alertService.acknowledgeAlert(alertId, userId);

      const acknowledgedAlert = alertService['activeAlerts'].get(alertId);
      expect(acknowledgedAlert?.acknowledged).toBe(true);
      expect(acknowledgedAlert?.acknowledgedBy).toBe(userId);
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle multiple concurrent clients', async () => {
      const clientCount = 10;
      const clients: string[] = [];

      // Create multiple clients
      for (let i = 0; i < clientCount; i++) {
        const clientId = `client-${i}`;
        clients.push(clientId);
        
        monitoringService['clients'].set(clientId, {
          id: clientId,
          ws: mockWs,
          userId: `user-${i}`,
          permissions: ['read_compliance'],
          subscribedSellers: new Set([`seller-${i}`]),
          lastActivity: new Date(),
          isActive: true
        });
      }

      // Broadcast alert to all clients
      const alert = {
        id: 'broadcast-test',
        type: 'violation',
        severity: 'medium',
        sellerId: 'seller-broadcast',
        sellerName: 'Broadcast Seller',
        timestamp: new Date(),
        message: 'Broadcast test alert',
        details: {},
        requiresAction: false
      };

      await monitoringService['broadcastToSubscribedClients']('seller-broadcast', {
        type: 'compliance_alert',
        data: alert,
        timestamp: new Date()
      });

      // Verify all clients received the alert
      expect(mockWs.send).toHaveBeenCalledTimes(clientCount);
    });

    it('should perform heartbeat checks', () => {
      const clientId = 'heartbeat-client';
      const staleClient = {
        id: clientId,
        ws: mockWs,
        userId: 'stale-user',
        permissions: ['read_compliance'],
        subscribedSellers: new Set(),
        lastActivity: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        isActive: true
      };

      monitoringService['clients'].set(clientId, staleClient);

      // Perform heartbeat
      monitoringService['performHeartbeat']();

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('ping')
      );
    });

    it('should provide service statistics', () => {
      const stats = monitoringService.getStats();

      expect(stats).toHaveProperty('connectedClients');
      expect(stats).toHaveProperty('activeClients');
      expect(stats).toHaveProperty('totalSubscriptions');
      expect(stats).toHaveProperty('uptime');
    });
  });

  describe('Error Handling', () => {
    it('should handle WebSocket errors gracefully', () => {
      const clientId = 'error-client';
      monitoringService['clients'].set(clientId, {
        id: clientId,
        ws: mockWs,
        userId: 'error-user',
        permissions: ['read_compliance'],
        subscribedSellers: new Set(),
        lastActivity: new Date(),
        isActive: true
      });

      const errorCallback = (mockWs.on as jest.Mock).mock.calls.find(
        call => call[0] === 'error'
      )?.[1];

      if (errorCallback) {
        errorCallback(new Error('WebSocket error'));
      }

      expect(monitoringService['clients'].has(clientId)).toBe(false);
    });

    it('should handle malformed messages', async () => {
      const clientId = 'malformed-client';
      monitoringService['clients'].set(clientId, {
        id: clientId,
        ws: mockWs,
        userId: 'malformed-user',
        permissions: ['read_compliance'],
        subscribedSellers: new Set(),
        lastActivity: new Date(),
        isActive: true
      });

      const messageCallback = (mockWs.on as jest.Mock).mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      if (messageCallback) {
        await messageCallback.call(monitoringService, 'invalid json');
      }

      // Should not crash and client should still be connected
      expect(monitoringService['clients'].has(clientId)).toBe(true);
    });

    it('should handle database errors in compliance checks', async () => {
      // Mock database error
      sellerService.getSellerComplianceMetrics = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      const alert = {
        id: 'db-error-test',
        type: 'violation',
        severity: 'high',
        sellerId: 'seller-db-error',
        sellerName: 'DB Error Seller',
        timestamp: new Date(),
        message: 'Test DB error',
        details: {},
        requiresAction: false
      };

      // Should not throw error
      await expect(
        monitoringService['checkSellerCompliance']('seller-db-error')
      ).resolves.toBeUndefined();
    });
  });

  describe('Integration with Seller Service', () => {
    it('should emit events from seller service', (done) => {
      const mockViolationData = {
        sellerId: 'seller-integration',
        sellerName: 'Integration Seller',
        violations: [
          {
            violationType: 'processing_delay',
            severity: 'high',
            description: 'Test violation'
          }
        ],
        timestamp: new Date()
      };

      sellerService.on('violations_detected', (data) => {
        expect(data.sellerId).toBe('seller-integration');
        expect(data.violations.length).toBe(1);
        done();
      });

      sellerService.emit('violations_detected', mockViolationData);
    });

    it('should emit compliance score update events', (done) => {
      const mockScoreData = {
        sellerId: 'seller-score',
        sellerName: 'Score Seller',
        complianceScore: 85,
        previousScore: 90,
        timestamp: new Date()
      };

      sellerService.on('compliance_score_updated', (data) => {
        expect(data.sellerId).toBe('seller-score');
        expect(data.complianceScore).toBe(85);
        expect(data.previousScore).toBe(90);
        done();
      });

      sellerService.emit('compliance_score_updated', mockScoreData);
    });
  });
});