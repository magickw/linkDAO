import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import WebSocket from 'ws';
import RealTimeNotificationService from '../services/realTimeNotificationService';

describe('RealTimeNotificationService', () => {
  let notificationService: RealTimeNotificationService;
  let testPort: number;

  beforeAll(() => {
    testPort = 10000; // Use different port for testing
    notificationService = new RealTimeNotificationService(testPort);
  });

  afterAll(() => {
    if (notificationService) {
      notificationService.close();
    }
  });

  describe('WebSocket Connection', () => {
    test('should accept valid WebSocket connections', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}?userId=test-user&token=valid-token`);
      
      ws.on('open', () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
        done();
      });

      ws.on('error', (error) => {
        done(error);
      });
    });

    test('should reject connections without token', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}?userId=test-user`);
      
      ws.on('error', () => {
        // Expected to fail
        done();
      });

      ws.on('open', () => {
        ws.close();
        done(new Error('Connection should have been rejected'));
      });
    });

    test('should reject connections without userId', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}?token=valid-token`);
      
      ws.on('error', () => {
        // Expected to fail
        done();
      });

      ws.on('open', () => {
        ws.close();
        done(new Error('Connection should have been rejected'));
      });
    });
  });

  describe('Notification Sending', () => {
    let ws: WebSocket;
    let receivedMessages: any[] = [];

    beforeEach((done) => {
      receivedMessages = [];
      ws = new WebSocket(`ws://localhost:${testPort}?userId=test-user&token=valid-token`);
      
      ws.on('open', () => {
        done();
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        receivedMessages.push(message);
      });
    });

    afterEach(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    test('should send mention notifications', (done) => {
      const mentionData = {
        postId: 'post-123',
        commentId: 'comment-456',
        mentionedBy: 'user-789',
        mentionedByUsername: 'TestUser',
        context: 'Test mention @test-user'
      };

      notificationService.createMentionNotification('test-user', mentionData);

      setTimeout(() => {
        const notificationMessage = receivedMessages.find(msg => msg.type === 'notification');
        expect(notificationMessage).toBeDefined();
        expect(notificationMessage.payload.category).toBe('mention');
        expect(notificationMessage.payload.metadata.mentionedByUsername).toBe('TestUser');
        done();
      }, 100);
    });

    test('should send tip notifications', (done) => {
      const tipData = {
        postId: 'post-123',
        tipAmount: 5,
        tokenSymbol: 'USDC',
        tipperAddress: 'tipper-address',
        tipperUsername: 'Tipper'
      };

      notificationService.createTipNotification('test-user', tipData);

      setTimeout(() => {
        const notificationMessage = receivedMessages.find(msg => msg.type === 'notification');
        expect(notificationMessage).toBeDefined();
        expect(notificationMessage.payload.category).toBe('tip');
        expect(notificationMessage.payload.metadata.tipAmount).toBe(5);
        expect(notificationMessage.payload.metadata.tokenSymbol).toBe('USDC');
        done();
      }, 100);
    });

    test('should send governance notifications', (done) => {
      const governanceData = {
        proposalId: 'proposal-123',
        proposalTitle: 'Test Proposal',
        action: 'voting_ending' as const,
        votingDeadline: new Date(Date.now() + 3600000),
        userVoteStatus: 'not_voted' as const
      };

      notificationService.createGovernanceNotification('test-user', governanceData);

      setTimeout(() => {
        const notificationMessage = receivedMessages.find(msg => msg.type === 'notification');
        expect(notificationMessage).toBeDefined();
        expect(notificationMessage.payload.category).toBe('governance');
        expect(notificationMessage.payload.priority).toBe('urgent');
        expect(notificationMessage.payload.metadata.proposalTitle).toBe('Test Proposal');
        done();
      }, 100);
    });

    test('should send community notifications', (done) => {
      const communityData = {
        communityId: 'community-123',
        communityName: 'Test Community',
        eventType: 'new_post' as const,
        eventData: { postId: 'new-post-123' }
      };

      notificationService.createCommunityNotification('test-user', communityData);

      setTimeout(() => {
        const notificationMessage = receivedMessages.find(msg => msg.type === 'notification');
        expect(notificationMessage).toBeDefined();
        expect(notificationMessage.payload.category).toBe('community');
        expect(notificationMessage.payload.metadata.communityName).toBe('Test Community');
        done();
      }, 100);
    });

    test('should send reaction notifications', (done) => {
      const reactionData = {
        postId: 'post-123',
        reactionType: 'fire',
        reactionEmoji: '🔥',
        reactorAddress: 'reactor-address',
        reactorUsername: 'Reactor',
        tokenAmount: 2
      };

      notificationService.createReactionNotification('test-user', reactionData);

      setTimeout(() => {
        const notificationMessage = receivedMessages.find(msg => msg.type === 'notification');
        expect(notificationMessage).toBeDefined();
        expect(notificationMessage.payload.category).toBe('reaction');
        expect(notificationMessage.payload.metadata.reactionEmoji).toBe('🔥');
        expect(notificationMessage.payload.metadata.tokenAmount).toBe(2);
        done();
      }, 100);
    });
  });

  describe('Post Subscriptions', () => {
    let ws: WebSocket;
    let receivedMessages: any[] = [];

    beforeEach((done) => {
      receivedMessages = [];
      ws = new WebSocket(`ws://localhost:${testPort}?userId=test-user&token=valid-token`);
      
      ws.on('open', () => {
        done();
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        receivedMessages.push(message);
      });
    });

    afterEach(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    test('should handle post subscription', (done) => {
      ws.send(JSON.stringify({
        type: 'subscribe_post',
        payload: { postId: 'post-123' }
      }));

      // Send a comment notification to the subscribed post
      setTimeout(() => {
        notificationService.notifyNewComment('post-123', {
          commentId: 'comment-456',
          authorId: 'author-789',
          authorUsername: 'Author',
          content: 'Test comment'
        });

        setTimeout(() => {
          const liveUpdateMessage = receivedMessages.find(msg => msg.type === 'live_update');
          expect(liveUpdateMessage).toBeDefined();
          expect(liveUpdateMessage.payload.type).toBe('new_comments');
          expect(liveUpdateMessage.payload.contextId).toBe('post-123');
          done();
        }, 100);
      }, 100);
    });

    test('should handle post unsubscription', (done) => {
      // First subscribe
      ws.send(JSON.stringify({
        type: 'subscribe_post',
        payload: { postId: 'post-123' }
      }));

      setTimeout(() => {
        // Then unsubscribe
        ws.send(JSON.stringify({
          type: 'unsubscribe_post',
          payload: { postId: 'post-123' }
        }));

        setTimeout(() => {
          // Send a comment notification - should not receive it
          notificationService.notifyNewComment('post-123', {
            commentId: 'comment-456',
            authorId: 'author-789',
            authorUsername: 'Author',
            content: 'Test comment'
          });

          setTimeout(() => {
            const liveUpdateMessage = receivedMessages.find(msg => msg.type === 'live_update');
            expect(liveUpdateMessage).toBeUndefined();
            done();
          }, 100);
        }, 100);
      }, 100);
    });
  });

  describe('Batch Notifications', () => {
    let ws: WebSocket;
    let receivedMessages: any[] = [];

    beforeEach((done) => {
      receivedMessages = [];
      ws = new WebSocket(`ws://localhost:${testPort}?userId=test-user&token=valid-token`);
      
      ws.on('open', () => {
        done();
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        receivedMessages.push(message);
      });
    });

    afterEach(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    test('should send batch notifications', (done) => {
      const notifications = [
        {
          id: 'batch-1',
          category: 'mention',
          priority: 'high',
          title: 'Batch Mention',
          message: 'Batch mention message'
        },
        {
          id: 'batch-2',
          category: 'tip',
          priority: 'high',
          title: 'Batch Tip',
          message: 'Batch tip message'
        }
      ];

      notificationService.sendBatchNotificationsToUser('test-user', notifications);

      setTimeout(() => {
        const batchMessage = receivedMessages.find(msg => msg.type === 'batch_notifications');
        expect(batchMessage).toBeDefined();
        expect(batchMessage.payload).toHaveLength(2);
        expect(batchMessage.payload[0].category).toBe('mention');
        expect(batchMessage.payload[1].category).toBe('tip');
        done();
      }, 100);
    });
  });

  describe('Live Updates', () => {
    let ws: WebSocket;
    let receivedMessages: any[] = [];

    beforeEach((done) => {
      receivedMessages = [];
      ws = new WebSocket(`ws://localhost:${testPort}?userId=test-user&token=valid-token`);
      
      ws.on('open', () => {
        // Subscribe to a post for live updates
        ws.send(JSON.stringify({
          type: 'subscribe_post',
          payload: { postId: 'live-post-123' }
        }));
        done();
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        receivedMessages.push(message);
      });
    });

    afterEach(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    test('should send live comment updates', (done) => {
      setTimeout(() => {
        notificationService.notifyNewComment('live-post-123', {
          commentId: 'live-comment-456',
          authorId: 'live-author-789',
          authorUsername: 'LiveAuthor',
          content: 'Live comment content'
        });

        setTimeout(() => {
          const liveUpdateMessage = receivedMessages.find(msg => msg.type === 'live_update');
          expect(liveUpdateMessage).toBeDefined();
          expect(liveUpdateMessage.payload.type).toBe('new_comments');
          expect(liveUpdateMessage.payload.count).toBe(1);
          expect(liveUpdateMessage.payload.contextId).toBe('live-post-123');
          done();
        }, 100);
      }, 100);
    });

    test('should send live reaction updates', (done) => {
      setTimeout(() => {
        notificationService.notifyReactionUpdate('live-post-123', {
          reactionType: 'fire',
          reactionEmoji: '🔥',
          count: 5,
          userReacted: true,
          tokenAmount: 3
        });

        setTimeout(() => {
          const liveUpdateMessage = receivedMessages.find(msg => msg.type === 'live_update');
          expect(liveUpdateMessage).toBeDefined();
          expect(liveUpdateMessage.payload.type).toBe('new_reactions');
          expect(liveUpdateMessage.payload.contextId).toBe('live-post-123');
          done();
        }, 100);
      }, 100);
    });
  });

  describe('Service Statistics', () => {
    test('should return correct statistics', () => {
      const stats = notificationService.getStats();
      expect(stats).toHaveProperty('connectedClients');
      expect(stats).toHaveProperty('connectedUsers');
      expect(stats).toHaveProperty('postSubscriptions');
      expect(typeof stats.connectedClients).toBe('number');
      expect(typeof stats.connectedUsers).toBe('number');
      expect(typeof stats.postSubscriptions).toBe('number');
    });
  });

  describe('Heartbeat and Connection Management', () => {
    test('should handle ping/pong messages', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}?userId=test-user&token=valid-token`);
      let receivedPong = false;

      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'ping' }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'pong') {
          receivedPong = true;
          ws.close();
        }
      });

      ws.on('close', () => {
        expect(receivedPong).toBe(true);
        done();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid JSON messages gracefully', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}?userId=test-user&token=valid-token`);

      ws.on('open', () => {
        // Send invalid JSON
        ws.send('invalid json');
        
        // Connection should remain open
        setTimeout(() => {
          expect(ws.readyState).toBe(WebSocket.OPEN);
          ws.close();
          done();
        }, 100);
      });
    });

    test('should handle unknown message types gracefully', (done) => {
      const ws = new WebSocket(`ws://localhost:${testPort}?userId=test-user&token=valid-token`);

      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'unknown_type' }));
        
        // Connection should remain open
        setTimeout(() => {
          expect(ws.readyState).toBe(WebSocket.OPEN);
          ws.close();
          done();
        }, 100);
      });
    });
  });
});
