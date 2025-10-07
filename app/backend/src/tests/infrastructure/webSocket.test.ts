/**
 * WebSocket Service Tests
 * Tests for WebSocket connection and message broadcasting
 */

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { WebSocketService } from '../../services/webSocketService';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';

describe('WebSocketService', () => {
  let httpServer: HttpServer;
  let webSocketService: WebSocketService;
  let clientSocket: ClientSocket;
  let serverPort: number;

  beforeAll((done) => {
    httpServer = createServer();
    webSocketService = new WebSocketService(httpServer);
    
    httpServer.listen(() => {
      const address = httpServer.address();
      serverPort = typeof address === 'string' ? parseInt(address) : address?.port || 3001;
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
    it('should handle client connection', (done) => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    it('should authenticate user with wallet address', (done) => {
      const walletAddress = 'test-wallet-address';
      
      clientSocket.emit('authenticate', { walletAddress });
      
      clientSocket.on('authenticated', (data) => {
        expect(data.message).toBe('Successfully authenticated');
        expect(data.connectedUsers).toBeGreaterThan(0);
        expect(data.reconnecting).toBe(false);
        done();
      });
    });

    it('should handle authentication error for missing wallet address', (done) => {
      clientSocket.emit('authenticate', {});
      
      clientSocket.on('auth_error', (data) => {
        expect(data.message).toBe('Wallet address required');
        done();
      });
    });

    it('should handle reconnection', (done) => {
      const walletAddress = 'test-wallet-address';
      
      clientSocket.emit('authenticate', { walletAddress, reconnecting: true });
      
      clientSocket.on('authenticated', (data) => {
        expect(data.reconnecting).toBe(true);
        done();
      });
    });

    it('should track user connection state', (done) => {
      const walletAddress = 'test-wallet-address';
      
      clientSocket.emit('authenticate', { walletAddress });
      
      clientSocket.on('authenticated', () => {
        const isOnline = webSocketService.isUserOnline(walletAddress);
        expect(isOnline).toBe(true);
        
        const connectionState = webSocketService.getUserConnectionState(walletAddress);
        expect(connectionState).toBe('online');
        
        done();
      });
    });
  });

  describe('Subscription Management', () => {
    beforeEach((done) => {
      clientSocket.emit('authenticate', { walletAddress: 'test-wallet-address' });
      clientSocket.on('authenticated', () => done());
    });

    it('should handle feed subscription', (done) => {
      const subscriptionData = {
        type: 'feed' as const,
        target: 'global',
        filters: {
          eventTypes: ['new_post', 'feed_update'],
          priority: ['medium', 'high'] as ('low' | 'medium' | 'high' | 'urgent')[]
        }
      };
      
      clientSocket.emit('subscribe', subscriptionData);
      
      clientSocket.on('subscribed', (data) => {
        expect(data.type).toBe(subscriptionData.type);
        expect(data.target).toBe(subscriptionData.target);
        expect(data.subscriptionId).toBeDefined();
        done();
      });
    });

    it('should handle community subscription', (done) => {
      const subscriptionData = {
        type: 'community' as const,
        target: 'test-community-id'
      };
      
      clientSocket.emit('subscribe', subscriptionData);
      
      clientSocket.on('subscribed', (data) => {
        expect(data.type).toBe(subscriptionData.type);
        expect(data.target).toBe(subscriptionData.target);
        done();
      });
    });

    it('should handle conversation subscription', (done) => {
      const subscriptionData = {
        type: 'conversation' as const,
        target: 'test-conversation-id'
      };
      
      clientSocket.emit('subscribe', subscriptionData);
      
      clientSocket.on('subscribed', (data) => {
        expect(data.type).toBe(subscriptionData.type);
        expect(data.target).toBe(subscriptionData.target);
        done();
      });
    });

    it('should handle unsubscription', (done) => {
      const subscriptionData = {
        type: 'feed' as const,
        target: 'global'
      };
      
      clientSocket.emit('subscribe', subscriptionData);
      
      clientSocket.on('subscribed', (data) => {
        clientSocket.emit('unsubscribe', { subscriptionId: data.subscriptionId });
        
        clientSocket.on('unsubscribed', (unsubData) => {
          expect(unsubData.subscriptionId).toBe(data.subscriptionId);
          done();
        });
      });
    });

    it('should handle subscription error for unauthenticated user', (done) => {
      // Create new socket without authentication
      const unauthSocket = Client(`http://localhost:${serverPort}`);
      
      unauthSocket.on('connect', () => {
        unauthSocket.emit('subscribe', { type: 'feed', target: 'global' });
        
        unauthSocket.on('subscription_error', (data) => {
          expect(data.message).toBe('User not authenticated');
          unauthSocket.disconnect();
          done();
        });
      });
    });
  });

  describe('Real-time Messaging', () => {
    beforeEach((done) => {
      clientSocket.emit('authenticate', { walletAddress: 'test-wallet-address' });
      clientSocket.on('authenticated', () => done());
    });

    it('should send feed updates', (done) => {
      const feedData = {
        postId: 'test-post-id',
        authorAddress: 'author-address',
        communityId: 'test-community-id'
      };
      
      // Subscribe to feed updates
      clientSocket.emit('subscribe', { type: 'feed', target: 'global' });
      
      clientSocket.on('subscribed', () => {
        // Listen for feed updates
        clientSocket.on('feed_update', (data) => {
          expect(data.type).toBe('new_post');
          expect(data.data.postId).toBe(feedData.postId);
          done();
        });
        
        // Trigger feed update
        webSocketService.sendFeedUpdate(feedData);
      });
    });

    it('should send message updates', (done) => {
      const conversationId = 'test-conversation-id';
      const messageData = {
        id: 'test-message-id',
        content: 'Test message content',
        fromAddress: 'sender-address'
      };
      
      // Subscribe to conversation
      clientSocket.emit('subscribe', { type: 'conversation', target: conversationId });
      
      clientSocket.on('subscribed', () => {
        // Listen for new messages
        clientSocket.on('new_message', (data) => {
          expect(data.id).toBe(messageData.id);
          expect(data.encrypted).toBe(true);
          expect(data.deliveredAt).toBeDefined();
          done();
        });
        
        // Trigger message update
        webSocketService.sendMessageUpdate(conversationId, messageData);
      });
    });

    it('should send reaction updates', (done) => {
      const reactionData = {
        postId: 'test-post-id',
        type: 'like',
        count: 5,
        userReacted: true
      };
      
      // Listen for reaction updates
      clientSocket.on('reaction_update', (data) => {
        expect(data.postId).toBe(reactionData.postId);
        expect(data.aggregated).toBe(true);
        done();
      });
      
      // Trigger reaction update
      webSocketService.sendReactionUpdate(reactionData.postId, reactionData);
    });

    it('should send tip notifications', (done) => {
      const walletAddress = 'test-wallet-address';
      const tipData = {
        amount: 10,
        tokenType: 'ETH',
        fromAddress: 'sender-address',
        txHash: '0x123...',
        confirmations: 1
      };
      
      // Listen for tip notifications
      clientSocket.on('tip_received', (data) => {
        expect(data.amount).toBe(tipData.amount);
        expect(data.transactionHash).toBe(tipData.txHash);
        expect(data.confirmations).toBe(tipData.confirmations);
        done();
      });
      
      // Trigger tip notification
      webSocketService.sendTipNotification(walletAddress, tipData);
    });

    it('should send community updates', (done) => {
      const communityId = 'test-community-id';
      const updateData = {
        memberCount: 150,
        newMember: 'new-member-address'
      };
      
      // Subscribe to community
      clientSocket.emit('subscribe', { type: 'community', target: communityId });
      
      clientSocket.on('subscribed', () => {
        // Listen for community updates
        clientSocket.on('community_update', (data) => {
          expect(data.type).toBe('member_joined');
          expect(data.communityId).toBe(communityId);
          expect(data.memberCount).toBe(updateData.memberCount);
          done();
        });
        
        // Trigger community update
        webSocketService.sendCommunityUpdate(communityId, 'member_joined', updateData);
      });
    });
  });

  describe('Typing Indicators', () => {
    beforeEach((done) => {
      clientSocket.emit('authenticate', { walletAddress: 'test-wallet-address' });
      clientSocket.on('authenticated', () => done());
    });

    it('should handle typing start', (done) => {
      const conversationId = 'test-conversation-id';
      
      // Join conversation room
      clientSocket.emit('join_conversation', { conversationId });
      
      clientSocket.on('joined_conversation', () => {
        // Create second client to receive typing indicator
        const secondClient = Client(`http://localhost:${serverPort}`);
        
        secondClient.on('connect', () => {
          secondClient.emit('authenticate', { walletAddress: 'other-user-address' });
          
          secondClient.on('authenticated', () => {
            secondClient.emit('join_conversation', { conversationId });
            
            secondClient.on('joined_conversation', () => {
              // Listen for typing indicator
              secondClient.on('user_typing', (data) => {
                expect(data.userAddress).toBe('test-wallet-address');
                expect(data.conversationId).toBe(conversationId);
                secondClient.disconnect();
                done();
              });
              
              // Start typing
              clientSocket.emit('typing_start', { conversationId });
            });
          });
        });
      });
    });

    it('should handle typing stop', (done) => {
      const conversationId = 'test-conversation-id';
      
      // Join conversation room
      clientSocket.emit('join_conversation', { conversationId });
      
      clientSocket.on('joined_conversation', () => {
        // Create second client to receive typing indicator
        const secondClient = Client(`http://localhost:${serverPort}`);
        
        secondClient.on('connect', () => {
          secondClient.emit('authenticate', { walletAddress: 'other-user-address' });
          
          secondClient.on('authenticated', () => {
            secondClient.emit('join_conversation', { conversationId });
            
            secondClient.on('joined_conversation', () => {
              // Listen for typing stop indicator
              secondClient.on('user_stopped_typing', (data) => {
                expect(data.userAddress).toBe('test-wallet-address');
                expect(data.conversationId).toBe(conversationId);
                secondClient.disconnect();
                done();
              });
              
              // Stop typing
              clientSocket.emit('typing_stop', { conversationId });
            });
          });
        });
      });
    });
  });

  describe('Heartbeat and Connection Health', () => {
    beforeEach((done) => {
      clientSocket.emit('authenticate', { walletAddress: 'test-wallet-address' });
      clientSocket.on('authenticated', () => done());
    });

    it('should handle heartbeat', (done) => {
      clientSocket.emit('heartbeat');
      
      clientSocket.on('heartbeat_ack', (data) => {
        expect(data.timestamp).toBeDefined();
        expect(new Date(data.timestamp)).toBeInstanceOf(Date);
        done();
      });
    });

    it('should handle ping/pong', (done) => {
      clientSocket.emit('ping');
      
      clientSocket.on('pong', (data) => {
        expect(data.timestamp).toBeDefined();
        done();
      });
    });

    it('should handle connection state updates', (done) => {
      clientSocket.emit('connection_state', { state: 'unstable' });
      
      // Check that connection state was updated
      setTimeout(() => {
        const connectionState = webSocketService.getUserConnectionState('test-wallet-address');
        expect(connectionState).toBe('reconnecting');
        done();
      }, 100);
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach((done) => {
      clientSocket.emit('authenticate', { walletAddress: 'test-wallet-address' });
      clientSocket.on('authenticated', () => done());
    });

    it('should provide connection statistics', () => {
      const stats = webSocketService.getStats();
      
      expect(stats).toHaveProperty('connectedUsers');
      expect(stats).toHaveProperty('uniqueUsers');
      expect(stats).toHaveProperty('activeUsers');
      expect(stats).toHaveProperty('totalSubscriptions');
      expect(stats).toHaveProperty('rooms');
      expect(stats).toHaveProperty('queuedMessages');
      expect(stats).toHaveProperty('reconnectionTimeouts');
      
      expect(stats.connectedUsers).toBeGreaterThan(0);
      expect(stats.uniqueUsers).toBeGreaterThan(0);
    });

    it('should get connected users', () => {
      const users = webSocketService.getConnectedUsers();
      
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
      
      const user = users[0];
      expect(user).toHaveProperty('userId');
      expect(user).toHaveProperty('walletAddress');
      expect(user).toHaveProperty('socketId');
      expect(user).toHaveProperty('connectedAt');
      expect(user).toHaveProperty('connectionState');
    });

    it('should get user subscriptions', (done) => {
      const walletAddress = 'test-wallet-address';
      
      // Add a subscription first
      clientSocket.emit('subscribe', { type: 'feed', target: 'global' });
      
      clientSocket.on('subscribed', () => {
        const subscriptions = webSocketService.getUserSubscriptions(walletAddress);
        
        expect(Array.isArray(subscriptions)).toBe(true);
        expect(subscriptions.length).toBeGreaterThan(0);
        
        const subscription = subscriptions[0];
        expect(subscription).toHaveProperty('id');
        expect(subscription).toHaveProperty('type');
        expect(subscription).toHaveProperty('target');
        expect(subscription).toHaveProperty('createdAt');
        
        done();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle disconnection gracefully', (done) => {
      const walletAddress = 'test-disconnect-user';
      
      clientSocket.emit('authenticate', { walletAddress });
      
      clientSocket.on('authenticated', () => {
        expect(webSocketService.isUserOnline(walletAddress)).toBe(true);
        
        clientSocket.disconnect();
        
        // Check that user is marked as offline after disconnect
        setTimeout(() => {
          expect(webSocketService.isUserOnline(walletAddress)).toBe(false);
          done();
        }, 100);
      });
    });

    it('should handle multiple connections from same user', (done) => {
      const walletAddress = 'test-multi-connection-user';
      
      // First connection
      clientSocket.emit('authenticate', { walletAddress });
      
      clientSocket.on('authenticated', () => {
        // Second connection
        const secondClient = Client(`http://localhost:${serverPort}`);
        
        secondClient.on('connect', () => {
          secondClient.emit('authenticate', { walletAddress });
          
          secondClient.on('authenticated', () => {
            // Both should be online
            expect(webSocketService.isUserOnline(walletAddress)).toBe(true);
            
            const stats = webSocketService.getStats();
            expect(stats.connectedUsers).toBe(2); // Two socket connections
            expect(stats.uniqueUsers).toBe(1); // One unique user
            
            secondClient.disconnect();
            done();
          });
        });
      });
    });

    it('should cleanup stale connections', () => {
      // This would test the cleanup functionality
      // In a real test, we'd need to mock timers and simulate stale connections
      webSocketService.cleanup();
      
      // Verify cleanup doesn't crash
      const stats = webSocketService.getStats();
      expect(stats).toBeDefined();
    });
  });
});