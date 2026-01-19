/**
 * Unified Messaging Service Tests
 *
 * Comprehensive test suite for the unified messaging service
 */

import { unifiedMessagingService } from '../unifiedMessagingService';
import { Message, Conversation } from '@/types/messaging';

// Mock fetch
global.fetch = jest.fn();

// Mock enhancedAuthService
jest.mock('../enhancedAuthService', () => ({
  enhancedAuthService: {
    getAuthHeaders: jest.fn().mockResolvedValue({
      'Authorization': 'Bearer test-token',
      'Content-Type': 'application/json'
    }),
    getToken: jest.fn().mockReturnValue('test-token')
  }
}));

describe('UnifiedMessagingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('Initialization', () => {
    it('should initialize the service with a user address', async () => {
      await unifiedMessagingService.initialize('0x123');
      expect(unifiedMessagingService['currentUserAddress']).toBe('0x123');
      expect(unifiedMessagingService['isInitialized']).toBe(true);
    });
  });

  describe('Conversations', () => {
    it('should fetch conversations from backend', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          participants: ['0x123', '0x456'],
          lastActivity: new Date().toISOString(),
          unreadCounts: {},
          isEncrypted: false,
          metadata: {}
        }
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { conversations: mockConversations, hasMore: false } })
      });

      const result = await unifiedMessagingService.getConversations();

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0].id).toBe('conv-1');
    });

    it('should create a DM conversation', async () => {
      const mockConversation = {
        id: 'conv-new',
        participants: ['0x123', '0x789'],
        lastActivity: new Date().toISOString(),
        unreadCounts: {},
        isEncrypted: false,
        metadata: {}
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockConversation })
      });

      const result = await unifiedMessagingService.getOrCreateDMConversation('0x789');

      expect(result.id).toBe('conv-new');
      expect(result.participants).toContain('0x789');
    });

    it('should create a group conversation', async () => {
      const mockGroup = {
        id: 'group-1',
        participants: ['0x123', '0x456', '0x789'],
        lastActivity: new Date().toISOString(),
        unreadCounts: {},
        isEncrypted: false,
        metadata: { type: 'group', title: 'Test Group' }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockGroup })
      });

      const result = await unifiedMessagingService.createGroupConversation({
        name: 'Test Group',
        description: 'A test group',
        participants: ['0x456', '0x789']
      });

      expect(result.metadata?.title).toBe('Test Group');
    });
  });

  describe('Messages', () => {
    it('should fetch messages for a conversation', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          fromAddress: '0x456',
          content: 'Hello',
          contentType: 'text',
          timestamp: new Date().toISOString(),
          deliveryStatus: 'read'
        }
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { messages: mockMessages, hasMore: false } })
      });

      const result = await unifiedMessagingService.getMessages('conv-1');

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('Hello');
    });

    it('should send a message with optimistic update', async () => {
      const mockSentMessage = {
        id: 'msg-new',
        conversationId: 'conv-1',
        fromAddress: '0x123',
        content: 'Test message',
        contentType: 'text',
        timestamp: new Date().toISOString(),
        deliveryStatus: 'sent'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSentMessage })
      });

      const result = await unifiedMessagingService.sendMessage({
        conversationId: 'conv-1',
        content: 'Test message',
        contentType: 'text'
      });

      expect(result.content).toBe('Test message');
    });

    it('should edit a message', async () => {
      const mockEditedMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        fromAddress: '0x123',
        content: 'Edited message',
        contentType: 'text',
        timestamp: new Date().toISOString(),
        editedAt: new Date().toISOString(),
        deliveryStatus: 'read'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockEditedMessage })
      });

      const result = await unifiedMessagingService.editMessage('msg-1', 'conv-1', 'Edited message');

      expect(result.content).toBe('Edited message');
      expect(result.editedAt).toBeDefined();
    });

    it('should delete a message', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await expect(
        unifiedMessagingService.deleteMessage('msg-1', 'conv-1')
      ).resolves.not.toThrow();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/messaging/messages/msg-1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should mark messages as read', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await unifiedMessagingService.markAsRead('conv-1', ['msg-1', 'msg-2']);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/messaging/conversations/conv-1/read'),
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  describe('Reactions', () => {
    it('should add a reaction to a message', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await unifiedMessagingService.addReaction('msg-1', '👍');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/messaging/messages/msg-1/reactions'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should remove a reaction from a message', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await unifiedMessagingService.removeReaction('msg-1', '👍');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/messaging/messages/msg-1/reactions/'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('Search', () => {
    it('should search conversations', async () => {
      const mockResults = [
        {
          id: 'conv-1',
          participants: ['0x123', '0x456'],
          lastActivity: new Date().toISOString(),
          unreadCounts: {},
          isEncrypted: false,
          metadata: {}
        }
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ conversations: mockResults })
      });

      const result = await unifiedMessagingService.searchConversations('test query');

      expect(result).toHaveLength(1);
    });

    it('should search messages', async () => {
      const mockResults = [
        {
          message: {
            id: 'msg-1',
            conversationId: 'conv-1',
            fromAddress: '0x456',
            content: 'Search result',
            contentType: 'text',
            timestamp: new Date().toISOString(),
            deliveryStatus: 'read'
          },
          conversation: {
            id: 'conv-1',
            participants: ['0x123', '0x456']
          },
          snippet: '...Search result...'
        }
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockResults })
      });

      const result = await unifiedMessagingService.searchMessages({ query: 'search' });

      expect(result).toHaveLength(1);
      expect(result[0].message.content).toContain('Search result');
    });
  });

  describe('Conversation Management', () => {
    it('should archive a conversation', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await unifiedMessagingService.archiveConversation('conv-1');

      expect(result).toBe(true);
    });

    it('should unarchive a conversation', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await unifiedMessagingService.unarchiveConversation('conv-1');

      expect(result).toBe(true);
    });

    it('should delete a conversation', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await unifiedMessagingService.deleteConversation('conv-1');

      expect(result).toBe(true);
    });

    it('should toggle conversation pin', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await unifiedMessagingService.toggleConversationPin('conv-1', undefined, true);

      expect(result).toBe(true);
    });

    it('should toggle conversation mute', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await unifiedMessagingService.toggleConversationMute('conv-1', undefined, true);

      expect(result).toBe(true);
    });

    it('should update conversation settings', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await unifiedMessagingService.updateConversationSettings('conv-1', {
        notifications: false,
        archived: true
      });

      expect(result).toBe(true);
    });

    it('should get conversation settings', async () => {
      const mockSettings = {
        notifications: true,
        archived: false,
        pinned: false
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettings
      });

      const result = await unifiedMessagingService.getConversationSettings('conv-1');

      expect(result?.notifications).toBe(true);
    });
  });

  describe('User Blocking', () => {
    it('should block a user', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await unifiedMessagingService.blockUser('0x999', 'spam');

      expect(result).toBe(true);
    });

    it('should unblock a user', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await unifiedMessagingService.unblockUser('0x999');

      expect(result).toBe(true);
    });

    it('should get blocked users list', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ blockedUsers: ['0x999', '0x888'] })
      });

      const result = await unifiedMessagingService.getBlockedUsers();

      expect(result).toHaveLength(2);
      expect(result).toContain('0x999');
    });
  });

  describe('Event System', () => {
    it('should allow subscribing to events', () => {
      const callback = jest.fn();
      const unsubscribe = unifiedMessagingService.on('message_received', callback);

      expect(typeof unsubscribe).toBe('function');

      // Emit an event manually for testing
      unifiedMessagingService['emitEvent']('message_received', {
        message: {} as Message,
        conversationId: 'conv-1'
      });

      expect(callback).toHaveBeenCalledTimes(1);

      // Unsubscribe and verify callback is not called again
      unsubscribe();
      unifiedMessagingService['emitEvent']('message_received', {
        message: {} as Message,
        conversationId: 'conv-1'
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(
        unifiedMessagingService.getMessages('conv-1')
      ).rejects.toThrow();
    });

    it('should fall back to cache on backend error', async () => {
      // Pre-populate cache
      unifiedMessagingService['messagesCache'].set('conv-1', [
        {
          id: 'cached-msg',
          conversationId: 'conv-1',
          fromAddress: '0x123',
          content: 'Cached',
          contentType: 'text',
          timestamp: new Date(),
          deliveryStatus: 'read'
        }
      ]);

      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Backend error'));

      const result = await unifiedMessagingService.getMessages('conv-1');

      expect(result.messages[0].content).toBe('Cached');
    });
  });

  describe('Offline Support', () => {
    it('should queue messages when offline', async () => {
      // Simulate offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));

      const result = await unifiedMessagingService.sendMessage({
        conversationId: 'conv-1',
        content: 'Offline message',
        contentType: 'text'
      });

      // Should return optimistic message
      expect(result.content).toBe('Offline message');
      expect(result.id).toContain('temp_');

      // Reset
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
    });
  });
});
