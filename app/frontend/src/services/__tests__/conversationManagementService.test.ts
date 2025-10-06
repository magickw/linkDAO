import { ConversationManagementService } from '../conversationManagementService';
import { 
  Conversation, 
  ConversationFilter, 
  ConversationSettings,
  MessageSearchQuery,
  GroupConversation,
  ConversationMember
} from '../../types/messaging';

// Mock fetch
global.fetch = jest.fn();

describe('ConversationManagementService', () => {
  let conversationService: ConversationManagementService;
  const mockUserAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (ConversationManagementService as any).instance = undefined;
    conversationService = ConversationManagementService.getInstance();
  });

  describe('Conversation Search', () => {
    it('should search conversations with query and filters', async () => {
      const mockConversations: Conversation[] = [
        {
          id: 'conv-1',
          participants: [mockUserAddress, '0x2222'],
          lastActivity: new Date(),
          unreadCounts: {},
          isEncrypted: true,
          metadata: { type: 'direct' },
        },
        {
          id: 'conv-2',
          participants: [mockUserAddress, '0x3333'],
          lastActivity: new Date(),
          unreadCounts: {},
          isEncrypted: true,
          metadata: { type: 'group' },
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ conversations: mockConversations }),
      });

      const filter: ConversationFilter = {
        type: 'direct',
        hasUnread: false,
      };

      const result = await conversationService.searchConversations(
        'test query',
        filter,
        mockUserAddress
      );

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/conversations/search'),
        expect.objectContaining({
          headers: {
            'Authorization': `Bearer ${mockUserAddress}`,
          },
        })
      );

      expect(result).toEqual(mockConversations);
    });

    it('should handle search errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await conversationService.searchConversations('test', undefined, mockUserAddress);

      expect(result).toEqual([]);
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await conversationService.searchConversations('test', undefined, mockUserAddress);

      expect(result).toEqual([]);
    });
  });

  describe('Message Search', () => {
    it('should search messages with query parameters', async () => {
      const mockSearchResults = [
        {
          message: {
            id: 'msg-1',
            conversationId: 'conv-1',
            fromAddress: '0x2222',
            content: 'Hello world',
            contentType: 'text' as const,
            timestamp: new Date(),
            deliveryStatus: 'delivered' as const,
          },
          conversation: {
            id: 'conv-1',
            participants: [mockUserAddress, '0x2222'],
            lastActivity: new Date(),
            unreadCounts: {},
            isEncrypted: true,
            metadata: { type: 'direct' as const },
          },
          matchedText: 'Hello world',
          context: [],
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ results: mockSearchResults }),
      });

      const searchQuery: MessageSearchQuery = {
        query: 'hello',
        conversationId: 'conv-1',
        contentType: 'text',
        limit: 10,
      };

      const result = await conversationService.searchMessages(searchQuery, mockUserAddress);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/messages/search',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockUserAddress}`,
          },
          body: JSON.stringify(searchQuery),
        })
      );

      expect(result).toEqual(mockSearchResults);
    });

    it('should handle message search errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      const searchQuery: MessageSearchQuery = {
        query: 'test',
      };

      const result = await conversationService.searchMessages(searchQuery, mockUserAddress);

      expect(result).toEqual([]);
    });
  });

  describe('Conversation Management', () => {
    it('should archive a conversation', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await conversationService.archiveConversation(
        'conv-1',
        mockUserAddress,
        'No longer needed'
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversations/conv-1/archive',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockUserAddress}`,
          },
          body: JSON.stringify({ reason: 'No longer needed' }),
        })
      );

      expect(result).toBe(true);
    });

    it('should unarchive a conversation', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await conversationService.unarchiveConversation('conv-1', mockUserAddress);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversations/conv-1/unarchive',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockUserAddress}`,
          },
        })
      );

      expect(result).toBe(true);
    });

    it('should delete a conversation', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await conversationService.deleteConversation(
        'conv-1',
        mockUserAddress,
        false
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversations/conv-1',
        expect.objectContaining({
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockUserAddress}`,
          },
          body: JSON.stringify({ deleteForEveryone: false }),
        })
      );

      expect(result).toBe(true);
    });

    it('should toggle conversation pin', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await conversationService.toggleConversationPin(
        'conv-1',
        mockUserAddress,
        true
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversations/conv-1/pin',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockUserAddress}`,
          },
        })
      );

      expect(result).toBe(true);
    });

    it('should toggle conversation mute', async () => {
      const muteUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await conversationService.toggleConversationMute(
        'conv-1',
        mockUserAddress,
        true,
        muteUntil
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversations/conv-1/mute',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockUserAddress}`,
          },
          body: JSON.stringify({ muteUntil }),
        })
      );

      expect(result).toBe(true);
    });
  });

  describe('Conversation Settings', () => {
    it('should update conversation settings', async () => {
      const settings: Partial<ConversationSettings> = {
        notifications: false,
        archived: true,
        customTitle: 'My Custom Title',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await conversationService.updateConversationSettings(
        'conv-1',
        settings,
        mockUserAddress
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversations/conv-1/settings',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockUserAddress}`,
          },
          body: JSON.stringify(settings),
        })
      );

      expect(result).toBe(true);
    });

    it('should get conversation settings', async () => {
      const mockSettings: ConversationSettings = {
        notifications: true,
        archived: false,
        pinned: false,
        customTitle: 'Test Conversation',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockSettings,
      });

      const result = await conversationService.getConversationSettings('conv-1', mockUserAddress);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversations/conv-1/settings',
        expect.objectContaining({
          headers: {
            'Authorization': `Bearer ${mockUserAddress}`,
          },
        })
      );

      expect(result).toEqual(mockSettings);
    });

    it('should set conversation title', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await conversationService.setConversationTitle(
        'conv-1',
        'New Title',
        mockUserAddress
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversations/conv-1/title',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockUserAddress}`,
          },
          body: JSON.stringify({ title: 'New Title' }),
        })
      );

      expect(result).toBe(true);
    });
  });

  describe('Group Conversation Management', () => {
    it('should create a group conversation', async () => {
      const mockGroupConversation: GroupConversation = {
        id: 'group-1',
        participants: [mockUserAddress, '0x2222', '0x3333'],
        lastActivity: new Date(),
        unreadCounts: {},
        isEncrypted: true,
        metadata: { type: 'group' },
        name: 'Test Group',
        description: 'A test group conversation',
        members: [],
        settings: {
          isPublic: false,
          requireApproval: true,
          allowMemberInvites: true,
          maxMembers: 100,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockGroupConversation,
      });

      const result = await conversationService.createGroupConversation(
        'Test Group',
        'A test group conversation',
        ['0x2222', '0x3333'],
        mockUserAddress,
        { maxMembers: 50 }
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversations/group',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockUserAddress}`,
          },
          body: JSON.stringify({
            name: 'Test Group',
            description: 'A test group conversation',
            participants: ['0x2222', '0x3333'],
            settings: {
              isPublic: false,
              requireApproval: true,
              allowMemberInvites: true,
              maxMembers: 50,
            },
          }),
        })
      );

      expect(result).toEqual(mockGroupConversation);
    });

    it('should add member to group conversation', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await conversationService.addGroupMember(
        'group-1',
        '0x4444',
        'member',
        mockUserAddress
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversations/group-1/members',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockUserAddress}`,
          },
          body: JSON.stringify({
            memberAddress: '0x4444',
            role: 'member',
          }),
        })
      );

      expect(result).toBe(true);
    });

    it('should remove member from group conversation', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await conversationService.removeGroupMember(
        'group-1',
        '0x4444',
        mockUserAddress
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversations/group-1/members/0x4444',
        expect.objectContaining({
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${mockUserAddress}`,
          },
        })
      );

      expect(result).toBe(true);
    });

    it('should update member role', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await conversationService.updateMemberRole(
        'group-1',
        '0x4444',
        'admin',
        mockUserAddress
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversations/group-1/members/0x4444/role',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockUserAddress}`,
          },
          body: JSON.stringify({ role: 'admin' }),
        })
      );

      expect(result).toBe(true);
    });

    it('should leave group conversation', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await conversationService.leaveGroupConversation('group-1', mockUserAddress);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversations/group-1/leave',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockUserAddress}`,
          },
        })
      );

      expect(result).toBe(true);
    });

    it('should get group members', async () => {
      const mockMembers: ConversationMember[] = [
        {
          address: mockUserAddress,
          role: 'admin',
          joinedAt: new Date(),
          permissions: {
            canSendMessages: true,
            canAddMembers: true,
            canRemoveMembers: true,
            canChangeSettings: true,
          },
        },
        {
          address: '0x2222',
          role: 'member',
          joinedAt: new Date(),
          permissions: {
            canSendMessages: true,
            canAddMembers: false,
            canRemoveMembers: false,
            canChangeSettings: false,
          },
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ members: mockMembers }),
      });

      const result = await conversationService.getGroupMembers('group-1', mockUserAddress);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversations/group-1/members',
        expect.objectContaining({
          headers: {
            'Authorization': `Bearer ${mockUserAddress}`,
          },
        })
      );

      expect(result).toEqual(mockMembers);
    });
  });

  describe('Community Announcements', () => {
    it('should create community announcement conversation', async () => {
      const mockConversation: Conversation = {
        id: 'announcement-1',
        participants: [mockUserAddress],
        lastActivity: new Date(),
        unreadCounts: {},
        isEncrypted: false,
        metadata: {
          type: 'announcement',
          communityId: 'community-1',
          title: 'Community Updates',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockConversation,
      });

      const result = await conversationService.createCommunityAnnouncement(
        'community-1',
        'Community Updates',
        'Important announcements for the community',
        mockUserAddress
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversations/community-announcement',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockUserAddress}`,
          },
          body: JSON.stringify({
            communityId: 'community-1',
            title: 'Community Updates',
            description: 'Important announcements for the community',
          }),
        })
      );

      expect(result).toEqual(mockConversation);
    });
  });

  describe('Conversation Filtering', () => {
    it('should get filtered conversations', async () => {
      const mockResponse = {
        conversations: [
          {
            id: 'conv-1',
            participants: [mockUserAddress, '0x2222'],
            lastActivity: new Date(),
            unreadCounts: {},
            isEncrypted: true,
            metadata: { type: 'direct' },
          },
        ],
        total: 1,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const filter: ConversationFilter = {
        type: 'direct',
        hasUnread: true,
        isPinned: false,
      };

      const result = await conversationService.getFilteredConversations(
        filter,
        mockUserAddress,
        25,
        0
      );

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/conversations/filter'),
        expect.objectContaining({
          headers: {
            'Authorization': `Bearer ${mockUserAddress}`,
          },
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Conversation Export and Analytics', () => {
    it('should export conversation data', async () => {
      const mockBlob = new Blob(['conversation data'], { type: 'application/json' });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        blob: async () => mockBlob,
      });

      const result = await conversationService.exportConversation(
        'conv-1',
        'json',
        mockUserAddress,
        {
          includeMedia: true,
          dateRange: {
            start: new Date('2023-01-01'),
            end: new Date('2023-12-31'),
          },
        }
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversations/conv-1/export',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockUserAddress}`,
          },
          body: JSON.stringify({
            format: 'json',
            includeMedia: true,
            dateRange: {
              start: new Date('2023-01-01'),
              end: new Date('2023-12-31'),
            },
          }),
        })
      );

      expect(result).toBe(mockBlob);
    });

    it('should get conversation analytics', async () => {
      const mockAnalytics = {
        messageCount: 150,
        participantActivity: {
          [mockUserAddress]: {
            messageCount: 75,
            lastActive: new Date(),
            averageResponseTime: 300,
          },
          '0x2222': {
            messageCount: 75,
            lastActive: new Date(),
            averageResponseTime: 450,
          },
        },
        peakActivityHours: [9, 10, 14, 15, 20],
        averageMessageLength: 45,
        mediaShareCount: 12,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockAnalytics,
      });

      const period = {
        start: new Date('2023-01-01'),
        end: new Date('2023-01-31'),
      };

      const result = await conversationService.getConversationAnalytics(
        'conv-1',
        mockUserAddress,
        period
      );

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/conversations/conv-1/analytics'),
        expect.objectContaining({
          headers: {
            'Authorization': `Bearer ${mockUserAddress}`,
          },
        })
      );

      expect(result).toEqual(mockAnalytics);
    });
  });

  describe('User Management', () => {
    it('should toggle user block', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await conversationService.toggleUserBlock(
        mockUserAddress,
        '0x2222',
        true
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/users/0x2222/block',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockUserAddress}`,
          },
        })
      );

      expect(result).toBe(true);
    });

    it('should report conversation', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await conversationService.reportConversation(
        'conv-1',
        'spam',
        'This conversation contains spam messages',
        mockUserAddress
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversations/conv-1/report',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockUserAddress}`,
          },
          body: JSON.stringify({
            reason: 'spam',
            description: 'This conversation contains spam messages',
          }),
        })
      );

      expect(result).toBe(true);
    });
  });

  describe('Conversation Utilities', () => {
    it('should get participants info', async () => {
      const mockParticipants = [
        {
          address: mockUserAddress,
          isOnline: true,
          lastSeen: new Date(),
        },
        {
          address: '0x2222',
          isOnline: false,
          lastSeen: new Date(Date.now() - 60000),
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ participants: mockParticipants }),
      });

      const result = await conversationService.getParticipantsInfo('conv-1', mockUserAddress);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversations/conv-1/participants',
        expect.objectContaining({
          headers: {
            'Authorization': `Bearer ${mockUserAddress}`,
          },
        })
      );

      expect(result).toEqual(mockParticipants);
    });

    it('should clear conversation history', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await conversationService.clearConversationHistory(
        'conv-1',
        mockUserAddress,
        false
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversations/conv-1/clear',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockUserAddress}`,
          },
          body: JSON.stringify({ clearForEveryone: false }),
        })
      );

      expect(result).toBe(true);
    });
  });

  describe('Backup and Restore', () => {
    it('should create conversation backup', async () => {
      const mockBackupId = 'backup-123';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ backupId: mockBackupId }),
      });

      const result = await conversationService.createConversationBackup(
        'conv-1',
        mockUserAddress,
        true
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversations/conv-1/backup',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockUserAddress}`,
          },
          body: JSON.stringify({ includeMedia: true }),
        })
      );

      expect(result).toBe(mockBackupId);
    });

    it('should restore conversation backup', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await conversationService.restoreConversationBackup(
        'backup-123',
        mockUserAddress
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversations/restore/backup-123',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockUserAddress}`,
          },
        })
      );

      expect(result).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await conversationService.archiveConversation('conv-1', mockUserAddress);

      expect(result).toBe(false);
    });

    it('should handle network failures', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await conversationService.deleteConversation('conv-1', mockUserAddress);

      expect(result).toBe(false);
    });

    it('should return null for failed data retrieval', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await conversationService.getConversationSettings('conv-1', mockUserAddress);

      expect(result).toBeNull();
    });

    it('should return empty arrays for failed list operations', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Server error'));

      const result = await conversationService.getGroupMembers('group-1', mockUserAddress);

      expect(result).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search results', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ conversations: [] }),
      });

      const result = await conversationService.searchConversations('nonexistent', undefined, mockUserAddress);

      expect(result).toEqual([]);
    });

    it('should handle malformed API responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ invalid: 'response' }),
      });

      const result = await conversationService.searchConversations('test', undefined, mockUserAddress);

      expect(result).toEqual([]);
    });

    it('should handle missing optional parameters', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await conversationService.archiveConversation('conv-1', mockUserAddress);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversations/conv-1/archive',
        expect.objectContaining({
          body: JSON.stringify({ reason: undefined }),
        })
      );

      expect(result).toBe(true);
    });

    it('should handle concurrent operations', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const operations = [
        conversationService.archiveConversation('conv-1', mockUserAddress),
        conversationService.toggleConversationPin('conv-2', mockUserAddress, true),
        conversationService.toggleConversationMute('conv-3', mockUserAddress, false),
      ];

      const results = await Promise.all(operations);

      expect(results).toEqual([true, true, true]);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });
});