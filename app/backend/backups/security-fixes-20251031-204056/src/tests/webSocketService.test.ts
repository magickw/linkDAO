import { createServer } from 'http';
import { WebSocketService } from '../services/webSocketService';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import test from '../../../frontend/src/pages/api/test';
import test from '../../../frontend/src/pages/api/test';
import test from '../../../frontend/src/pages/api/test';
import test from '../../../frontend/src/pages/api/test';
import test from '../../../frontend/src/pages/api/test';
import test from '../../../frontend/src/pages/api/test';
import test from '../../../frontend/src/pages/api/test';
import test from '../../../frontend/src/pages/api/test';
import test from '../../../frontend/src/pages/api/test';
import test from '../../../frontend/src/pages/api/test';
import test from '../../../frontend/src/pages/api/test';
import test from '../../../frontend/src/pages/api/test';
import test from '../../../frontend/src/pages/api/test';
import test from '../../../frontend/src/pages/api/test';
import test from '../../../frontend/src/pages/api/test';

describe('WebSocketService', () => {
  let httpServer: any;
  let webSocketService: WebSocketService;
  let clientSocket: ClientSocket;
  let serverPort: number;

  beforeAll((done) => {
    httpServer = createServer();
    webSocketService = new WebSocketService(httpServer);
    
    httpServer.listen(() => {
      serverPort = httpServer.address()?.port;
      done();
    });
  });

  afterAll((done) => {
    webSocketService.close();
    httpServer.close(done);
  });

  beforeEach((done) => {
    clientSocket = Client(`http://localhost:${serverPort}`);
    clientSocket.on('connect', done);
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Connection Management', () => {
    test('should handle client connection', (done) => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    test('should authenticate user', (done) => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      
      clientSocket.on('authenticated', (data) => {
        expect(data.message).toBe('Successfully authenticated');
        expect(data.connectedUsers).toBe(1);
        done();
      });

      clientSocket.emit('authenticate', { walletAddress });
    });

    test('should handle authentication error', (done) => {
      clientSocket.on('auth_error', (error) => {
        expect(error.message).toBe('Wallet address required');
        done();
      });

      clientSocket.emit('authenticate', {});
    });
  });

  describe('Subscription Management', () => {
    const walletAddress = '0x1234567890123456789012345678901234567890';

    beforeEach((done) => {
      clientSocket.on('authenticated', () => done());
      clientSocket.emit('authenticate', { walletAddress });
    });

    test('should handle subscription to feed', (done) => {
      clientSocket.on('subscribed', (data) => {
        expect(data.type).toBe('feed');
        expect(data.target).toBe('global');
        done();
      });

      clientSocket.emit('subscribe', {
        type: 'feed',
        target: 'global'
      });
    });

    test('should handle subscription to community', (done) => {
      const communityId = 'test-community';
      
      clientSocket.on('subscribed', (data) => {
        expect(data.type).toBe('community');
        expect(data.target).toBe(communityId);
        done();
      });

      clientSocket.emit('subscribe', {
        type: 'community',
        target: communityId
      });
    });

    test('should handle unsubscription', (done) => {
      // First subscribe to get a valid subscription ID
      clientSocket.on('subscribed', (subscribeData) => {
        const subscriptionId = subscribeData.subscriptionId || 'test-subscription-id';
        
        clientSocket.on('unsubscribed', (data) => {
          expect(data.subscriptionId).toBe(subscriptionId);
          done();
        });

        clientSocket.emit('unsubscribe', { subscriptionId });
      });

      clientSocket.emit('subscribe', {
        type: 'feed',
        target: 'test-unsubscribe'
      });
    });
  });

  describe('Real-time Updates', () => {
    const walletAddress = '0x1234567890123456789012345678901234567890';

    beforeEach((done) => {
      clientSocket.on('authenticated', () => done());
      clientSocket.emit('authenticate', { walletAddress });
    });

    test('should receive feed updates', (done) => {
      // Subscribe to feed first to ensure we receive the update
      clientSocket.on('subscribed', () => {
        clientSocket.on('feed_update', (data) => {
          expect(data.type).toBe('new_post');
          expect(data.data.postId).toBe('test-post-id');
          done();
        });

        // Wait a bit for the subscription to be fully set up, then send update
        setTimeout(() => {
          webSocketService.sendFeedUpdate({
            postId: 'test-post-id',
            authorAddress: walletAddress
          });
        }, 100);
      });

      // Subscribe to global feed
      clientSocket.emit('subscribe', {
        type: 'global',
        target: 'all'
      });
    });

    test('should receive notifications', (done) => {
      clientSocket.on('notification', (data) => {
        expect(data.type).toBe('test');
        expect(data.title).toBe('Test Notification');
        done();
      });

      // Send notification
      webSocketService.sendNotification(walletAddress, {
        type: 'test',
        title: 'Test Notification',
        message: 'This is a test notification'
      });
    });

    test('should receive tip notifications', (done) => {
      clientSocket.on('tip_received', (data) => {
        expect(data.amount).toBe('1.0');
        expect(data.from).toBe('0xabcd');
        done();
      });

      // Send tip notification
      webSocketService.sendTipNotification(walletAddress, {
        amount: '1.0',
        from: '0xabcd',
        txHash: '0x123'
      });
    });
  });

  describe('Typing Indicators', () => {
    const walletAddress = '0x1234567890123456789012345678901234567890';
    const conversationId = 'test-conversation';

    beforeEach((done) => {
      clientSocket.on('authenticated', () => {
        clientSocket.emit('join_conversation', { conversationId });
        done();
      });
      clientSocket.emit('authenticate', { walletAddress });
    });

    test('should handle typing start', (done) => {
      // Create a second client to receive the typing indicator
      const secondClient = Client(`http://localhost:${serverPort}`);
      
      secondClient.on('connect', () => {
        secondClient.emit('authenticate', { walletAddress: '0xother' });
        
        secondClient.on('authenticated', () => {
          secondClient.emit('join_conversation', { conversationId });
          
          secondClient.on('user_typing', (data) => {
            expect(data.userAddress).toBe(walletAddress);
            expect(data.conversationId).toBe(conversationId);
            secondClient.disconnect();
            done();
          });

          // Now emit typing from first client
          clientSocket.emit('typing_start', { conversationId });
        });
      });
    });

    test('should handle typing stop', (done) => {
      // Create a second client to receive the typing indicator
      const secondClient = Client(`http://localhost:${serverPort}`);
      
      secondClient.on('connect', () => {
        secondClient.emit('authenticate', { walletAddress: '0xother' });
        
        secondClient.on('authenticated', () => {
          secondClient.emit('join_conversation', { conversationId });
          
          secondClient.on('user_stopped_typing', (data) => {
            expect(data.userAddress).toBe(walletAddress);
            expect(data.conversationId).toBe(conversationId);
            secondClient.disconnect();
            done();
          });

          // Now emit typing stop from first client
          clientSocket.emit('typing_stop', { conversationId });
        });
      });
    });
  });

  describe('Connection Health', () => {
    const walletAddress = '0x1234567890123456789012345678901234567890';

    beforeEach((done) => {
      clientSocket.on('authenticated', () => done());
      clientSocket.emit('authenticate', { walletAddress });
    });

    test('should respond to heartbeat', (done) => {
      clientSocket.on('heartbeat_ack', (data) => {
        expect(data.timestamp).toBeDefined();
        done();
      });

      clientSocket.emit('heartbeat');
    });

    test('should respond to ping', (done) => {
      clientSocket.on('pong', (data) => {
        expect(data.timestamp).toBeDefined();
        done();
      });

      clientSocket.emit('ping');
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should provide connection statistics', () => {
      const stats = webSocketService.getStats();
      
      expect(stats).toHaveProperty('connectedUsers');
      expect(stats).toHaveProperty('uniqueUsers');
      expect(stats).toHaveProperty('activeUsers');
      expect(stats).toHaveProperty('totalSubscriptions');
      expect(stats).toHaveProperty('rooms');
      expect(stats).toHaveProperty('queuedMessages');
      expect(stats).toHaveProperty('reconnectionTimeouts');
    });

    test('should check user online status', () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      
      // User should be offline initially
      expect(webSocketService.isUserOnline(walletAddress)).toBe(false);
    });
  });
});