import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';

// Import components
import { FeedPage } from '@/components/Feed/FeedPage';
import { CommunityPage } from '@/components/Community/CommunityPage';
import { ConversationView } from '@/components/Messaging/ConversationView';
import { LiveUpdateIndicators } from '@/components/RealTimeNotifications/LiveUpdateIndicators';
import { LiveCommentUpdates } from '@/components/RealTimeNotifications/LiveCommentUpdates';

// Import services
import * as webSocketClientService from '@/services/webSocketClientService';
import * as communityRealTimeUpdateService from '@/services/communityRealTimeUpdateService';
import * as feedService from '@/services/feedService';

// Test providers
import { TestProviders } from '@/__tests__/setup/testSetup';

// Mock services
jest.mock('@/services/webSocketClientService');
jest.mock('@/services/communityRealTimeUpdateService');
jest.mock('@/services/feedService');

const mockWebSocketClientService = webSocketClientService as jest.Mocked<typeof webSocketClientService>;
const mockCommunityRealTimeUpdateService = communityRealTimeUpdateService as jest.Mocked<typeof communityRealTimeUpdateService>;
const mockFeedService = feedService as jest.Mocked<typeof feedService>;

describe('Real-Time Updates Integration Tests', () => {
  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    walletAddress: '0x123456789abcdef'
  };

  const mockPost = {
    id: 'post-1',
    author: { id: 'author-1', username: 'postauthor', walletAddress: '0xauthor123' },
    content: 'This is a test post for real-time updates',
    reactions: [],
    tips: [],
    comments: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockCommunity = {
    id: 'community-1',
    name: 'test-community',
    displayName: 'Test Community',
    memberCount: 150,
    onlineMembers: 12
  };

  let mockWebSocket: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock WebSocket
    mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      readyState: WebSocket.OPEN
    };
    
    mockWebSocketClientService.connect.mockResolvedValue({
      success: true,
      connection: mockWebSocket
    });
    
    mockCommunityRealTimeUpdateService.subscribeToUpdates.mockResolvedValue({
      success: true
    });
    
    mockFeedService.getFeedPosts.mockResolvedValue({
      posts: [mockPost],
      hasMore: false
    });
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <TestProviders initialUser={mockUser}>
        {component}
      </TestProviders>
    );
  };

  describe('Feed Real-Time Updates', () => {
    it('should receive and display new posts in real-time', async () => {
      renderWithProviders(<FeedPage />);
      
      // Wait for initial feed load
      await waitFor(() => {
        expect(screen.getByTestId('feed-page')).toBeInTheDocument();
        expect(screen.getByText(mockPost.content)).toBeInTheDocument();
      });
      
      // Simulate receiving a new post via WebSocket
      const newPost = {
        id: 'new-post-1',
        author: { id: 'author-2', username: 'newauthor', walletAddress: '0xnewauthor' },
        content: 'This is a brand new post!',
        reactions: [],
        tips: [],
        comments: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const newPostEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'new_post',
          payload: newPost
        })
      });
      
      // Trigger WebSocket message
      const onMessageCallback = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1];
      
      if (onMessageCallback) {
        onMessageCallback(newPostEvent);
      }
      
      // Verify new post appears at the top of feed
      await waitFor(() => {
        expect(screen.getByText('This is a brand new post!')).toBeInTheDocument();
      });
      
      // Verify new post indicator
      expect(screen.getByTestId('new-posts-indicator')).toBeInTheDocument();
      expect(screen.getByText('1 new post')).toBeInTheDocument();
    });

    it('should update post reactions in real-time', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByText(mockPost.content)).toBeInTheDocument();
      });
      
      // Simulate someone else reacting to the post
      const reactionUpdate = {
        postId: mockPost.id,
        reaction: {
          type: 'fire',
          userId: 'other-user-1',
          username: 'otheruser',
          amount: 5
        },
        totalReactions: {
          fire: 5,
          heart: 0,
          rocket: 0
        }
      };
      
      const reactionEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'post_reaction_update',
          payload: reactionUpdate
        })
      });
      
      const onMessageCallback = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1];
      
      if (onMessageCallback) {
        onMessageCallback(reactionEvent);
      }
      
      // Verify reaction count updates
      await waitFor(() => {
        const postCard = screen.getByTestId(`post-card-${mockPost.id}`);
        expect(within(postCard).getByText('🔥 5')).toBeInTheDocument();
      });
      
      // Verify reaction animation
      expect(screen.getByTestId('reaction-animation')).toBeInTheDocument();
    });

    it('should show typing indicators for post comments', async () => {
      renderWithProviders(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByText(mockPost.content)).toBeInTheDocument();
      });
      
      // Simulate someone typing a comment
      const typingEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'comment_typing',
          payload: {
            postId: mockPost.id,
            userId: 'typing-user-1',
            username: 'typinguser',
            isTyping: true
          }
        })
      });
      
      const onMessageCallback = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1];
      
      if (onMessageCallback) {
        onMessageCallback(typingEvent);
      }
      
      // Verify typing indicator appears
      await waitFor(() => {
        const postCard = screen.getByTestId(`post-card-${mockPost.id}`);
        expect(within(postCard).getByTestId('typing-indicator')).toBeInTheDocument();
        expect(within(postCard).getByText('typinguser is typing...')).toBeInTheDocument();
      });
      
      // Simulate typing stopped
      const stoppedTypingEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'comment_typing',
          payload: {
            postId: mockPost.id,
            userId: 'typing-user-1',
            username: 'typinguser',
            isTyping: false
          }
        })
      });
      
      if (onMessageCallback) {
        onMessageCallback(stoppedTypingEvent);
      }
      
      // Verify typing indicator disappears
      await waitFor(() => {
        const postCard = screen.getByTestId(`post-card-${mockPost.id}`);
        expect(within(postCard).queryByTestId('typing-indicator')).not.toBeInTheDocument();
      });
    });

    it('should batch and display multiple feed updates efficiently', async () => {
      renderWithProviders(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('feed-page')).toBeInTheDocument();
      });
      
      // Simulate multiple rapid updates
      const updates = [
        {
          type: 'post_reaction_update',
          payload: { postId: mockPost.id, reaction: { type: 'fire', amount: 1 } }
        },
        {
          type: 'post_reaction_update',
          payload: { postId: mockPost.id, reaction: { type: 'fire', amount: 2 } }
        },
        {
          type: 'post_reaction_update',
          payload: { postId: mockPost.id, reaction: { type: 'fire', amount: 3 } }
        }
      ];
      
      const onMessageCallback = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1];
      
      // Send updates rapidly
      updates.forEach((update, index) => {
        setTimeout(() => {
          if (onMessageCallback) {
            onMessageCallback(new MessageEvent('message', {
              data: JSON.stringify(update)
            }));
          }
        }, index * 50);
      });
      
      // Verify only the final state is displayed (batched updates)
      await waitFor(() => {
        const postCard = screen.getByTestId(`post-card-${mockPost.id}`);
        expect(within(postCard).getByText('🔥 3')).toBeInTheDocument();
      }, { timeout: 2000 });
      
      // Verify update batching indicator
      expect(screen.getByTestId('update-batch-indicator')).toBeInTheDocument();
    });
  });

  describe('Community Real-Time Updates', () => {
    it('should update member count and online status in real-time', async () => {
      renderWithProviders(<CommunityPage communityId={mockCommunity.id} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('community-page')).toBeInTheDocument();
      });
      
      // Simulate member joining
      const memberJoinEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'community_member_update',
          payload: {
            communityId: mockCommunity.id,
            action: 'join',
            userId: 'new-member-1',
            username: 'newmember',
            memberCount: 151,
            onlineMembers: 13
          }
        })
      });
      
      const onMessageCallback = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1];
      
      if (onMessageCallback) {
        onMessageCallback(memberJoinEvent);
      }
      
      // Verify member count updates
      await waitFor(() => {
        expect(screen.getByText('151 members')).toBeInTheDocument();
        expect(screen.getByText('13 online')).toBeInTheDocument();
      });
      
      // Verify join animation
      expect(screen.getByTestId('member-join-animation')).toBeInTheDocument();
      expect(screen.getByText('newmember joined the community')).toBeInTheDocument();
    });

    it('should show live community activity feed', async () => {
      renderWithProviders(<CommunityPage communityId={mockCommunity.id} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('community-page')).toBeInTheDocument();
      });
      
      // Simulate various community activities
      const activities = [
        {
          type: 'community_activity',
          payload: {
            communityId: mockCommunity.id,
            activity: 'new_post',
            user: { username: 'activeuser1' },
            timestamp: new Date()
          }
        },
        {
          type: 'community_activity',
          payload: {
            communityId: mockCommunity.id,
            activity: 'member_promoted',
            user: { username: 'activeuser2' },
            role: 'moderator',
            timestamp: new Date()
          }
        }
      ];
      
      const onMessageCallback = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1];
      
      activities.forEach(activity => {
        if (onMessageCallback) {
          onMessageCallback(new MessageEvent('message', {
            data: JSON.stringify(activity)
          }));
        }
      });
      
      // Verify activity feed updates
      await waitFor(() => {
        expect(screen.getByText('activeuser1 created a new post')).toBeInTheDocument();
        expect(screen.getByText('activeuser2 was promoted to moderator')).toBeInTheDocument();
      });
      
      // Verify activity indicators
      expect(screen.getByTestId('live-activity-indicator')).toBeInTheDocument();
    });

    it('should handle community governance updates in real-time', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<CommunityPage communityId={mockCommunity.id} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('community-page')).toBeInTheDocument();
      });
      
      // Simulate governance proposal update
      const proposalUpdate = {
        type: 'governance_update',
        payload: {
          communityId: mockCommunity.id,
          proposalId: 'proposal-1',
          title: 'Update Community Rules',
          action: 'new_vote',
          voter: { username: 'voter1' },
          voteCount: {
            yes: 45,
            no: 12,
            abstain: 3
          },
          totalVotes: 60
        }
      };
      
      const onMessageCallback = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1];
      
      if (onMessageCallback) {
        onMessageCallback(new MessageEvent('message', {
          data: JSON.stringify(proposalUpdate)
        }));
      }
      
      // Verify governance widget updates
      await waitFor(() => {
        const governanceWidget = screen.getByTestId('governance-widget');
        expect(within(governanceWidget).getByText('Update Community Rules')).toBeInTheDocument();
        expect(within(governanceWidget).getByText('Yes: 45')).toBeInTheDocument();
        expect(within(governanceWidget).getByText('No: 12')).toBeInTheDocument();
        expect(within(governanceWidget).getByText('60 total votes')).toBeInTheDocument();
      });
      
      // Verify live voting indicator
      expect(screen.getByTestId('live-voting-indicator')).toBeInTheDocument();
      expect(screen.getByText('voter1 just voted')).toBeInTheDocument();
    });
  });

  describe('Messaging Real-Time Updates', () => {
    it('should show live message delivery and read receipts', async () => {
      const mockConversation = {
        id: 'conv-1',
        participants: [mockUser.walletAddress, '0xother123'],
        messages: [
          {
            id: 'msg-1',
            fromAddress: mockUser.walletAddress,
            content: 'Hello there!',
            timestamp: new Date(),
            deliveryStatus: 'sent'
          }
        ]
      };
      
      renderWithProviders(<ConversationView conversationId={mockConversation.id} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('conversation-view')).toBeInTheDocument();
        expect(screen.getByText('Hello there!')).toBeInTheDocument();
      });
      
      // Simulate message delivery update
      const deliveryUpdate = {
        type: 'message_delivery_update',
        payload: {
          messageId: 'msg-1',
          status: 'delivered',
          timestamp: new Date()
        }
      };
      
      const onMessageCallback = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1];
      
      if (onMessageCallback) {
        onMessageCallback(new MessageEvent('message', {
          data: JSON.stringify(deliveryUpdate)
        }));
      }
      
      // Verify delivery status update
      await waitFor(() => {
        const message = screen.getByTestId('message-msg-1');
        expect(within(message).getByTestId('delivery-status-delivered')).toBeInTheDocument();
      });
      
      // Simulate read receipt
      const readUpdate = {
        type: 'message_delivery_update',
        payload: {
          messageId: 'msg-1',
          status: 'read',
          timestamp: new Date()
        }
      };
      
      if (onMessageCallback) {
        onMessageCallback(new MessageEvent('message', {
          data: JSON.stringify(readUpdate)
        }));
      }
      
      // Verify read status update
      await waitFor(() => {
        const message = screen.getByTestId('message-msg-1');
        expect(within(message).getByTestId('delivery-status-read')).toBeInTheDocument();
      });
    });

    it('should display typing indicators in conversations', async () => {
      const mockConversation = {
        id: 'conv-1',
        participants: [mockUser.walletAddress, '0xother123']
      };
      
      renderWithProviders(<ConversationView conversationId={mockConversation.id} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('conversation-view')).toBeInTheDocument();
      });
      
      // Simulate other user typing
      const typingEvent = {
        type: 'typing_indicator',
        payload: {
          conversationId: mockConversation.id,
          userAddress: '0xother123',
          username: 'otheruser',
          isTyping: true
        }
      };
      
      const onMessageCallback = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1];
      
      if (onMessageCallback) {
        onMessageCallback(new MessageEvent('message', {
          data: JSON.stringify(typingEvent)
        }));
      }
      
      // Verify typing indicator appears
      await waitFor(() => {
        expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
        expect(screen.getByText('otheruser is typing...')).toBeInTheDocument();
      });
      
      // Simulate typing stopped
      const stoppedTypingEvent = {
        type: 'typing_indicator',
        payload: {
          conversationId: mockConversation.id,
          userAddress: '0xother123',
          username: 'otheruser',
          isTyping: false
        }
      };
      
      if (onMessageCallback) {
        onMessageCallback(new MessageEvent('message', {
          data: JSON.stringify(stoppedTypingEvent)
        }));
      }
      
      // Verify typing indicator disappears
      await waitFor(() => {
        expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument();
      });
    });

    it('should receive new messages in real-time', async () => {
      const mockConversation = {
        id: 'conv-1',
        participants: [mockUser.walletAddress, '0xother123']
      };
      
      renderWithProviders(<ConversationView conversationId={mockConversation.id} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('conversation-view')).toBeInTheDocument();
      });
      
      // Simulate receiving a new message
      const newMessage = {
        type: 'new_message',
        payload: {
          conversationId: mockConversation.id,
          message: {
            id: 'new-msg-1',
            fromAddress: '0xother123',
            content: 'Hey! How are you doing?',
            timestamp: new Date(),
            deliveryStatus: 'delivered'
          }
        }
      };
      
      const onMessageCallback = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1];
      
      if (onMessageCallback) {
        onMessageCallback(new MessageEvent('message', {
          data: JSON.stringify(newMessage)
        }));
      }
      
      // Verify new message appears
      await waitFor(() => {
        expect(screen.getByText('Hey! How are you doing?')).toBeInTheDocument();
      });
      
      // Verify message animation
      expect(screen.getByTestId('new-message-animation')).toBeInTheDocument();
      
      // Verify conversation is marked as having unread messages
      expect(screen.getByTestId('unread-indicator')).toBeInTheDocument();
    });
  });

  describe('Connection Management and Error Handling', () => {
    it('should handle WebSocket connection loss and reconnection', async () => {
      renderWithProviders(<LiveUpdateIndicators />);
      
      // Initial connection
      await waitFor(() => {
        expect(screen.getByTestId('connection-status-connected')).toBeInTheDocument();
      });
      
      // Simulate connection loss
      const disconnectEvent = new Event('close');
      const onCloseCallback = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'close')?.[1];
      
      if (onCloseCallback) {
        onCloseCallback(disconnectEvent);
      }
      
      // Verify disconnection indicator
      await waitFor(() => {
        expect(screen.getByTestId('connection-status-disconnected')).toBeInTheDocument();
        expect(screen.getByText('Connection lost. Attempting to reconnect...')).toBeInTheDocument();
      });
      
      // Simulate reconnection
      mockWebSocketClientService.connect.mockResolvedValueOnce({
        success: true,
        connection: mockWebSocket
      });
      
      const reconnectEvent = new Event('open');
      const onOpenCallback = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'open')?.[1];
      
      if (onOpenCallback) {
        onOpenCallback(reconnectEvent);
      }
      
      // Verify reconnection
      await waitFor(() => {
        expect(screen.getByTestId('connection-status-connected')).toBeInTheDocument();
        expect(screen.getByText('Reconnected successfully')).toBeInTheDocument();
      });
    });

    it('should queue updates during connection loss and sync when reconnected', async () => {
      renderWithProviders(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('feed-page')).toBeInTheDocument();
      });
      
      // Simulate connection loss
      const disconnectEvent = new Event('close');
      const onCloseCallback = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'close')?.[1];
      
      if (onCloseCallback) {
        onCloseCallback(disconnectEvent);
      }
      
      // Verify offline mode
      await waitFor(() => {
        expect(screen.getByTestId('offline-mode-indicator')).toBeInTheDocument();
      });
      
      // Simulate reconnection with queued updates
      const queuedUpdates = [
        {
          type: 'post_reaction_update',
          payload: { postId: mockPost.id, reaction: { type: 'fire', amount: 5 } }
        },
        {
          type: 'new_post',
          payload: {
            id: 'queued-post-1',
            content: 'This was posted while offline',
            author: { username: 'queuedauthor' }
          }
        }
      ];
      
      mockWebSocketClientService.getQueuedUpdates.mockResolvedValue(queuedUpdates);
      
      const reconnectEvent = new Event('open');
      const onOpenCallback = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'open')?.[1];
      
      if (onOpenCallback) {
        onOpenCallback(reconnectEvent);
      }
      
      // Verify queued updates are applied
      await waitFor(() => {
        expect(screen.getByText('This was posted while offline')).toBeInTheDocument();
        const postCard = screen.getByTestId(`post-card-${mockPost.id}`);
        expect(within(postCard).getByText('🔥 5')).toBeInTheDocument();
      });
      
      // Verify sync indicator
      expect(screen.getByText('Synced 2 updates')).toBeInTheDocument();
    });

    it('should handle malformed real-time messages gracefully', async () => {
      renderWithProviders(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('feed-page')).toBeInTheDocument();
      });
      
      // Simulate malformed message
      const malformedEvent = new MessageEvent('message', {
        data: 'invalid json'
      });
      
      const onMessageCallback = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1];
      
      if (onMessageCallback) {
        onMessageCallback(malformedEvent);
      }
      
      // Verify error is handled gracefully (no crash)
      expect(screen.getByTestId('feed-page')).toBeInTheDocument();
      
      // Verify error is logged but not displayed to user
      expect(screen.queryByText('Error processing real-time update')).not.toBeInTheDocument();
      
      // Simulate message with missing required fields
      const incompleteEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'post_reaction_update'
          // missing payload
        })
      });
      
      if (onMessageCallback) {
        onMessageCallback(incompleteEvent);
      }
      
      // Verify graceful handling
      expect(screen.getByTestId('feed-page')).toBeInTheDocument();
    });
  });
});