import { describe, it, expect, jest, beforeAll, afterAll, beforeEach } from '@jest/globals';
import WebSocket from 'ws';
import { createTestAdmin, createTestUser, cleanupTestData } from '../fixtures/testDataFactory';
import { AdminWebSocketService } from '../../services/adminWebSocketService';

describe('WebSocket Real-Time Updates Integration Tests', () => {
  let adminToken: string;
  let testAdminId: string;
  let wsServer: any;
  let testPort: number;

  beforeAll(async () => {
    testPort = 3001; // Use different port for testing
    
    const testAdmin = await createTestAdmin({
      email: 'ws-admin@test.com',
      role: 'super_admin',
      permissions: ['dashboard_access', 'real_time_monitoring']
    });
    testAdminId = testAdmin.id;
    adminToken = testAdmin.token;

    // Start WebSocket server for testing
    wsServer = new AdminWebSocketService();
    await wsServer.start(testPort);
  });

  afterAll(async () => {
    if (wsServer) {
      await wsServer.stop();
    }
    await cleanupTestData();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WebSocket Connection Management', () => {
    it('should establish authenticated WebSocket connection', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}/admin-dashboard`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      ws.on('open', () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
        done();
      });

      ws.on('error', (error) => {
        done(error);
      });
    });

    it('should reject unauthenticated connections', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}/admin-dashboard`);

      ws.on('error', (error) => {
        expect(error.message).toContain('Unauthorized');
        done();
      });

      ws.on('open', () => {
        done(new Error('Connection should have been rejected'));
      });
    });

    it('should reject connections with invalid tokens', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}/admin-dashboard`, {
        headers: {
          Authorization: 'Bearer invalid-token'
        }
      });

      ws.on('error', (error) => {
        expect(error.message).toContain('Invalid token');
        done();
      });

      ws.on('open', () => {
        done(new Error('Connection should have been rejected'));
      });
    });
  });

  describe('Channel Subscription Management', () => {
    it('should handle channel subscriptions', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}/admin-dashboard`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          channels: ['metrics', 'alerts', 'system_health']
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscription_confirmed') {
          expect(message.channels).toEqual(['metrics', 'alerts', 'system_health']);
          expect(message.subscriberId).toBeDefined();
          ws.close();
          done();
        }
      });

      ws.on('error', done);
    });

    it('should handle channel unsubscriptions', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}/admin-dashboard`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      let subscribed = false;

      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          channels: ['metrics', 'alerts']
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscription_confirmed' && !subscribed) {
          subscribed = true;
          ws.send(JSON.stringify({
            type: 'unsubscribe',
            channels: ['alerts']
          }));
        } else if (message.type === 'unsubscription_confirmed') {
          expect(message.channels).toEqual(['alerts']);
          expect(message.remainingChannels).toEqual(['metrics']);
          ws.close();
          done();
        }
      });

      ws.on('error', done);
    });

    it('should validate channel permissions', (done) => {
      // Create admin with limited permissions
      createTestAdmin({
        email: 'limited-ws@test.com',
        role: 'moderator',
        permissions: ['content_moderation'] // No dashboard access
      }).then(limitedAdmin => {
        const ws = new WebSocket(`ws://localhost:${testPort}/admin-dashboard`, {
          headers: {
            Authorization: `Bearer ${limitedAdmin.token}`
          }
        });

        ws.on('open', () => {
          ws.send(JSON.stringify({
            type: 'subscribe',
            channels: ['system_health'] // Requires system monitoring permission
          }));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'subscription_error') {
            expect(message.error).toContain('Insufficient permissions');
            expect(message.deniedChannels).toContain('system_health');
            ws.close();
            done();
          }
        });

        ws.on('error', done);
      });
    });
  });

  describe('Real-Time Metrics Broadcasting', () => {
    it('should broadcast metrics updates to subscribers', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}/admin-dashboard`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      let subscribed = false;

      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          channels: ['metrics']
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscription_confirmed' && !subscribed) {
          subscribed = true;
          
          // Trigger metrics update
          setTimeout(() => {
            wsServer.broadcastMetrics({
              realTimeUsers: 150,
              systemLoad: 0.65,
              moderationQueue: 5,
              timestamp: new Date().toISOString()
            });
          }, 100);
          
        } else if (message.type === 'metrics_update') {
          expect(message.data).toHaveProperty('realTimeUsers', 150);
          expect(message.data).toHaveProperty('systemLoad', 0.65);
          expect(message.data).toHaveProperty('moderationQueue', 5);
          expect(message.data).toHaveProperty('timestamp');
          ws.close();
          done();
        }
      });

      ws.on('error', done);
    });

    it('should handle high-frequency metrics updates efficiently', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}/admin-dashboard`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      let subscribed = false;
      let updateCount = 0;
      const expectedUpdates = 10;

      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          channels: ['metrics']
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscription_confirmed' && !subscribed) {
          subscribed = true;
          
          // Send rapid metrics updates
          for (let i = 0; i < expectedUpdates; i++) {
            setTimeout(() => {
              wsServer.broadcastMetrics({
                realTimeUsers: 100 + i,
                updateId: i,
                timestamp: new Date().toISOString()
              });
            }, i * 50); // 50ms intervals
          }
          
        } else if (message.type === 'metrics_update') {
          updateCount++;
          expect(message.data).toHaveProperty('updateId');
          
          if (updateCount === expectedUpdates) {
            ws.close();
            done();
          }
        }
      });

      ws.on('error', done);
    });
  });

  describe('Alert Broadcasting', () => {
    it('should broadcast critical alerts immediately', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}/admin-dashboard`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      let subscribed = false;

      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          channels: ['alerts']
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscription_confirmed' && !subscribed) {
          subscribed = true;
          
          // Trigger critical alert
          setTimeout(() => {
            wsServer.broadcastAlert({
              id: 'alert-123',
              type: 'system_overload',
              severity: 'critical',
              message: 'CPU usage exceeds 95%',
              timestamp: new Date().toISOString(),
              requiresImmedateAction: true
            });
          }, 100);
          
        } else if (message.type === 'alert') {
          expect(message.data).toHaveProperty('id', 'alert-123');
          expect(message.data).toHaveProperty('severity', 'critical');
          expect(message.data).toHaveProperty('requiresImmedateAction', true);
          ws.close();
          done();
        }
      });

      ws.on('error', done);
    });

    it('should handle alert acknowledgments', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}/admin-dashboard`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      let alertReceived = false;

      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          channels: ['alerts']
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscription_confirmed' && !alertReceived) {
          // Trigger alert
          wsServer.broadcastAlert({
            id: 'alert-ack-test',
            type: 'security_incident',
            severity: 'high',
            message: 'Suspicious login detected'
          });
          
        } else if (message.type === 'alert' && !alertReceived) {
          alertReceived = true;
          
          // Send acknowledgment
          ws.send(JSON.stringify({
            type: 'acknowledge_alert',
            alertId: 'alert-ack-test',
            adminId: testAdminId,
            timestamp: new Date().toISOString()
          }));
          
        } else if (message.type === 'alert_acknowledged') {
          expect(message.alertId).toBe('alert-ack-test');
          expect(message.acknowledgedBy).toBe(testAdminId);
          ws.close();
          done();
        }
      });

      ws.on('error', done);
    });
  });

  describe('System Health Updates', () => {
    it('should broadcast system health changes', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}/admin-dashboard`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      let subscribed = false;

      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          channels: ['system_health']
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscription_confirmed' && !subscribed) {
          subscribed = true;
          
          // Trigger system health update
          setTimeout(() => {
            wsServer.broadcastSystemHealth({
              overall: 'degraded',
              components: [
                { name: 'database', status: 'healthy', responseTime: 50 },
                { name: 'api', status: 'degraded', responseTime: 500 },
                { name: 'cache', status: 'healthy', responseTime: 10 }
              ],
              alerts: [
                { component: 'api', message: 'High response time detected' }
              ],
              timestamp: new Date().toISOString()
            });
          }, 100);
          
        } else if (message.type === 'system_health_update') {
          expect(message.data).toHaveProperty('overall', 'degraded');
          expect(message.data).toHaveProperty('components');
          expect(Array.isArray(message.data.components)).toBe(true);
          expect(message.data.components).toHaveLength(3);
          
          const apiComponent = message.data.components.find((c: any) => c.name === 'api');
          expect(apiComponent.status).toBe('degraded');
          
          ws.close();
          done();
        }
      });

      ws.on('error', done);
    });
  });

  describe('Connection Resilience', () => {
    it('should handle connection drops and reconnections', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}/admin-dashboard`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      let connectionCount = 0;

      ws.on('open', () => {
        connectionCount++;
        
        if (connectionCount === 1) {
          // Subscribe and then close connection
          ws.send(JSON.stringify({
            type: 'subscribe',
            channels: ['metrics']
          }));
          
          setTimeout(() => {
            ws.close();
          }, 500);
        }
      });

      ws.on('close', () => {
        if (connectionCount === 1) {
          // Reconnect
          const ws2 = new WebSocket(`ws://localhost:${testPort}/admin-dashboard`, {
            headers: {
              Authorization: `Bearer ${adminToken}`
            }
          });

          ws2.on('open', () => {
            connectionCount++;
            
            // Re-subscribe
            ws2.send(JSON.stringify({
              type: 'subscribe',
              channels: ['metrics']
            }));
          });

          ws2.on('message', (data) => {
            const message = JSON.parse(data.toString());
            
            if (message.type === 'subscription_confirmed') {
              expect(connectionCount).toBe(2);
              ws2.close();
              done();
            }
          });

          ws2.on('error', done);
        }
      });

      ws.on('error', done);
    });

    it('should handle server-side connection cleanup', (done) => {
      const connections: WebSocket[] = [];
      const connectionPromises: Promise<void>[] = [];

      // Create multiple connections
      for (let i = 0; i < 5; i++) {
        const promise = new Promise<void>((resolve, reject) => {
          const ws = new WebSocket(`ws://localhost:${testPort}/admin-dashboard`, {
            headers: {
              Authorization: `Bearer ${adminToken}`
            }
          });

          ws.on('open', () => {
            connections.push(ws);
            resolve();
          });

          ws.on('error', reject);
        });

        connectionPromises.push(promise);
      }

      Promise.all(connectionPromises).then(() => {
        expect(connections).toHaveLength(5);
        
        // Close all connections
        connections.forEach(ws => ws.close());
        
        // Verify server cleaned up connections
        setTimeout(() => {
          const activeConnections = wsServer.getActiveConnectionCount();
          expect(activeConnections).toBe(0);
          done();
        }, 1000);
      }).catch(done);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent connections efficiently', (done) => {
      const connectionCount = 20;
      const connections: WebSocket[] = [];
      let connectedCount = 0;

      for (let i = 0; i < connectionCount; i++) {
        const ws = new WebSocket(`ws://localhost:${testPort}/admin-dashboard`, {
          headers: {
            Authorization: `Bearer ${adminToken}`
          }
        });

        ws.on('open', () => {
          connections.push(ws);
          connectedCount++;
          
          if (connectedCount === connectionCount) {
            // All connections established, now test broadcasting
            wsServer.broadcastMetrics({
              realTimeUsers: 200,
              testId: 'concurrent-test',
              timestamp: new Date().toISOString()
            });
          }
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'metrics_update' && message.data.testId === 'concurrent-test') {
            // Close this connection
            ws.close();
            
            // Check if all connections received the message
            if (connections.filter(c => c.readyState === WebSocket.CLOSED).length === connectionCount) {
              done();
            }
          }
        });

        ws.on('error', done);
      }
    });

    it('should throttle high-frequency updates appropriately', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}/admin-dashboard`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      let subscribed = false;
      let updateCount = 0;
      const startTime = Date.now();

      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          channels: ['metrics']
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscription_confirmed' && !subscribed) {
          subscribed = true;
          
          // Send very high frequency updates (should be throttled)
          for (let i = 0; i < 100; i++) {
            setTimeout(() => {
              wsServer.broadcastMetrics({
                realTimeUsers: 100 + i,
                updateId: i,
                timestamp: new Date().toISOString()
              });
            }, i * 10); // 10ms intervals
          }
          
        } else if (message.type === 'metrics_update') {
          updateCount++;
          
          // After 2 seconds, check that updates were throttled
          setTimeout(() => {
            const elapsed = Date.now() - startTime;
            expect(elapsed).toBeGreaterThan(1000); // At least 1 second elapsed
            expect(updateCount).toBeLessThan(100); // Should be throttled
            expect(updateCount).toBeGreaterThan(5); // But some updates should get through
            ws.close();
            done();
          }, 2000);
        }
      });

      ws.on('error', done);
    });
  });
});