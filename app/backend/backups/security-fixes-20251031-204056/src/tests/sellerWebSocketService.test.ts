import { SellerWebSocketService } from '../services/sellerWebSocketService';
import { initializeWebSocket } from '../services/webSocketService';
import { createServer } from 'http';
import express from 'express';

describe('SellerWebSocketService', () => {
  let httpServer: any;
  let sellerWebSocketService: SellerWebSocketService;
  const testWalletAddress = '0x1234567890123456789012345678901234567890';

  beforeAll(async () => {
    // Create test HTTP server
    const app = express();
    httpServer = createServer(app);
    
    // Initialize main WebSocket service first
    initializeWebSocket(httpServer);
    
    // Initialize seller WebSocket service
    sellerWebSocketService = new SellerWebSocketService();
  });

  afterAll(async () => {
    if (sellerWebSocketService) {
      sellerWebSocketService.cleanup();
    }
    if (httpServer) {
      httpServer.close();
    }
  });

  describe('Connection Management', () => {
    test('should connect seller successfully', () => {
      sellerWebSocketService.connect(testWalletAddress);
      
      expect(sellerWebSocketService.isSellerConnected(testWalletAddress)).toBe(false); // Will be false until WebSocket actually connects
      expect(sellerWebSocketService.getConnectedSellers()).toContain(testWalletAddress);
    });

    test('should disconnect seller successfully', () => {
      sellerWebSocketService.connect(testWalletAddress);
      sellerWebSocketService.disconnect(testWalletAddress);
      
      expect(sellerWebSocketService.getConnectedSellers()).not.toContain(testWalletAddress);
    });

    test('should get connection metrics', () => {
      const metrics = sellerWebSocketService.getConnectionMetrics();
      
      expect(metrics).toHaveProperty('connectedSellers');
      expect(metrics).toHaveProperty('activeConnections');
      expect(metrics).toHaveProperty('reconnectionAttempts');
      expect(metrics).toHaveProperty('messagesSent');
      expect(metrics).toHaveProperty('messagesQueued');
      expect(typeof metrics.connectedSellers).toBe('number');
    });
  });

  describe('Event Handling', () => {
    test('should handle new order event', () => {
      const orderEvent = {
        type: 'new_order' as const,
        walletAddress: testWalletAddress,
        data: {
          id: 'order_123',
          buyerAddress: '0xbuyer123',
          listingId: 'listing_456',
          amount: 100,
          currency: 'USDC',
          status: 'pending' as const,
          createdAt: new Date()
        },
        timestamp: new Date(),
        priority: 'urgent' as const
      };

      // This should not throw an error
      expect(() => {
        sellerWebSocketService.handleSellerUpdate(orderEvent);
      }).not.toThrow();
    });

    test('should handle tier upgrade event', () => {
      const tierEvent = {
        type: 'tier_upgraded' as const,
        walletAddress: testWalletAddress,
        data: {
          newTier: 'gold',
          previousTier: 'silver',
          benefits: ['higher_limits', 'priority_support']
        },
        timestamp: new Date(),
        priority: 'high' as const
      };

      expect(() => {
        sellerWebSocketService.handleSellerUpdate(tierEvent);
      }).not.toThrow();
    });

    test('should handle payment received event', () => {
      const paymentEvent = {
        type: 'payment_received' as const,
        walletAddress: testWalletAddress,
        data: {
          amount: 100,
          currency: 'USDC',
          orderId: 'order_123',
          transactionHash: '0xtx123'
        },
        timestamp: new Date(),
        priority: 'high' as const
      };

      expect(() => {
        sellerWebSocketService.handleSellerUpdate(paymentEvent);
      }).not.toThrow();
    });
  });

  describe('Real-time Updates', () => {
    test('should send order update', () => {
      const orderId = 'order_123';
      const update = {
        status: 'shipped',
        previousStatus: 'confirmed',
        trackingNumber: 'TRACK123'
      };

      expect(() => {
        sellerWebSocketService.sendOrderUpdate(testWalletAddress, orderId, update);
      }).not.toThrow();
    });

    test('should send payment update', () => {
      const paymentData = {
        amount: 100,
        currency: 'USDC',
        orderId: 'order_123',
        transactionHash: '0xtx123'
      };

      expect(() => {
        sellerWebSocketService.sendPaymentUpdate(testWalletAddress, paymentData);
      }).not.toThrow();
    });

    test('should send tier update', () => {
      const tierData = {
        newTier: 'platinum',
        previousTier: 'gold',
        benefits: ['unlimited_listings', 'premium_support']
      };

      expect(() => {
        sellerWebSocketService.sendTierUpdate(testWalletAddress, tierData);
      }).not.toThrow();
    });

    test('should send analytics update', () => {
      const analyticsData = {
        metrics: {
          sales: 50,
          revenue: 5000,
          orders: 25,
          rating: 4.8
        },
        period: 'monthly'
      };

      expect(() => {
        sellerWebSocketService.sendAnalyticsUpdate(testWalletAddress, analyticsData);
      }).not.toThrow();
    });
  });

  describe('Broadcast Functions', () => {
    test('should broadcast to all sellers', () => {
      sellerWebSocketService.connect(testWalletAddress);
      sellerWebSocketService.connect('0xseller2');

      expect(() => {
        sellerWebSocketService.broadcastToAllSellers('system_update', {
          message: 'System maintenance scheduled',
          timestamp: new Date()
        }, 'medium');
      }).not.toThrow();
    });

    test('should send maintenance notification', () => {
      expect(() => {
        sellerWebSocketService.sendMaintenanceNotification(
          'System will be down for maintenance',
          new Date(Date.now() + 3600000) // 1 hour from now
        );
      }).not.toThrow();
    });
  });

  describe('Health Check', () => {
    test('should perform health check', () => {
      const healthCheck = sellerWebSocketService.performHealthCheck();
      
      expect(healthCheck).toHaveProperty('healthy');
      expect(healthCheck).toHaveProperty('issues');
      expect(typeof healthCheck.healthy).toBe('boolean');
      expect(Array.isArray(healthCheck.issues)).toBe(true);
    });
  });

  describe('Offline/Online Handling', () => {
    test('should handle seller going online', () => {
      expect(() => {
        sellerWebSocketService.handleSellerOnline(testWalletAddress);
      }).not.toThrow();
    });

    test('should handle seller going offline', () => {
      sellerWebSocketService.connect(testWalletAddress);
      
      expect(() => {
        sellerWebSocketService.handleSellerOffline(testWalletAddress);
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    test('should cleanup resources', () => {
      sellerWebSocketService.connect(testWalletAddress);
      sellerWebSocketService.connect('0xseller2');
      
      const initialMetrics = sellerWebSocketService.getConnectionMetrics();
      expect(initialMetrics.connectedSellers).toBeGreaterThan(0);
      
      sellerWebSocketService.cleanup();
      
      const cleanedMetrics = sellerWebSocketService.getConnectionMetrics();
      expect(cleanedMetrics.connectedSellers).toBe(0);
      expect(cleanedMetrics.activeConnections).toBe(0);
    });
  });
});