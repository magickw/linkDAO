import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessagingPage } from '../../../components/Messaging/MessagingPage';
import { MessageEncryptionService } from '../../../services/messageEncryptionService';
import { ConversationManagementService } from '../../../services/conversationManagementService';
import { OfflineMessageQueueService } from '../../../services/offlineMessageQueueService';
import { Conversation, Message } from '../../../types/messaging';

// Mock services
jest.mock('../../../services/messageEncryptionService');
jest.mock('../../../services/conversationManagementService');
jest.mock('../../../services/offlineMessageQueueService');

// Mock WebSocket
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: WebSocket.OPEN,
};

global.WebSocket = jest.fn(() => mockWebSocket) as any;

// Mock fetch
global.fetch = jest.fn();

// Mock crypto for encryption tests
const mockCrypto = {
  subtle: {
    generateKey: jest.fn(),
    exportKey: jest.fn(),
    importKey: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  },
  getRandomValues: jest.fn(),
};

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};

Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

describe('Conversation Workflows Integration Tests', () => {
  let mockEncryptionService: jest.Mocked<MessageEncryptionService>;
  let mockConversationService: jest.Mocked<ConversationManagementService>;
  let mockQueueService: jest.Mocked<OfflineMessageQueueService>;
  
  const mockUserAddress = '0x1234567890123456789012345678901234567890';
  const mockRecipientAddress = '0x2345678901234567890123456789012345678901';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock service instances
    mockEncryptionService = {
      generateKeyPair: jest.fn(),
      exportPublicKey: jest.fn(),
      importPublicKey: jest.fn(),
      encryptMessage: jest.fn(),
      decryptMessage: jest.fn(),
      verifyMessageIntegrity: jest.fn(),
      getKeyPair: jest.fn(),
      storePublicKey: jest.fn(),
      getStoredPublicKey: jest.fn(),
      initializeConversationEncryption: jest.fn(),
      getConversationEncryptionStatus: jest.fn(),
      exchangeKeys: jest.fn(),
      rotateKeys: jest.fn(),
      backupKeys: jest.fn(),
      restoreKeys: jest.fn(),
      clearAllKeys: jest.fn(),
      generateEncryptionInfo: jest.fn(),
    } as any;

    mockConversationService = {
      searchConversations: jest.fn(),
      searchMessages: jest.fn(),
      archiveConversation: jest.fn(),
      unarchiveConversation: jest.fn(),
      deleteConversation: jest.fn(),
      toggleConversationPin: jest.fn(),
      toggleConversationMute: jest.fn(),
      updateConversationSettings: jest.fn(),
      getConversationSettings: jest.fn(),
      setConversationTitle: jest.fn(),
      createGroupConversation: jest.fn(),
      addGroupMember: jest.fn(),
      removeGroupMember: jest.fn(),
      updateMemberRole: jest.fn(),
      leaveGroupConversation: jest.fn(),
      getGroupMembers: jest.fn(),
      updateGroupSettings: jest.fn(),
      createCommunityAnnouncement: jest.fn(),
      getFilteredConversations: jest.fn(),
      exportConversation: jest.fn(),
      getConversationAnalytics: jest.fn(),
      toggleUserBlock: jest.fn(),
      reportConversation: jest.fn(),
      getParticipantsInfo: jest.fn(),
      clearConversationHistory: jest.fn(),
      createConversationBackup: jest.fn(),
      restoreConversationBackup: jest.fn(),
    } as any;

    mockQueueService = {
      queueMessage: jest.fn(),
      queueOfflineAction: jest.fn(),
      getPendingMessages: jest.fn(),
      getSyncStatus: jest.fn(),
      updateSyncStatus: jest.fn(),
      syncPendingMessages: jest.fn(),
      getFailedMessages: jest.fn(),
      retryFailedMessage: jest.fn(),
      clearAllQueues: jest.fn(),
      getQueueStats: jest.fn(),
      isOnlineStatus: jest.fn(),
      forcSync: jest.fn(),
      getNetworkStatus: jest.fn(),
    } as any;

    // Mock service getInstance methods
    (MessageEncryptionService.getInstance as jest.Mock).mockReturnValue(mockEncryptionService);
    (ConversationManagementService.getInstance as jest.Mock).mockReturnValue(mockConversationService);
    (OfflineMessageQueueService.getInstance as jest.Mock).mockReturnValue(mockQueueService);

    // Mock IndexedDB
    const mockDB = {
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          put: jest.fn(() => ({ onsuccess: null, onerror: null })),
          get: jest.fn(() => ({ onsuccess: null, onerror: null, result: null })),
          getAll: jest.fn(() => ({ onsuccess: null, onerror: null, result: [] })),
          delete: jest.fn(() => ({ onsuccess: null, onerror: null })),
          createIndex: jest.fn(),
        })),
        complete: Promise.resolve(),
      })),
      objectStoreNames: { contains: jest.fn(() => false) },
      createObjectStore: jest.fn(() => ({ createIndex: jest.fn() })),
    };

    mockIndexedDB.open.mockImplementation(() => ({
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: mockDB,
    }));
  });

  describe('Complete Conversation Workflow', () => {
    it('should handle complete conversation creation and messaging workflow', async () => {
      const user = userEvent.setup();
      
      // Mock conversation data
      const mockConversation: Conversation = {
        id: 'conv-1',
        participants: [mockUserAddress, mockRecipientAddress],
        lastActivity: new Date(),
        unreadCounts: {},
        isEncrypted: true,
        metadata: { type: 'direct' },
      };

      const mockMessage: Message = {
        id: 'msg-1',
        conversationId: 'conv-1',
        fromAddress: mockUserAddress,
        content: 'Hello, this is a test message!',
        contentType: 'text',
        timestamp: new Date(),
        deliveryStatus: 'sent',
      };

      // Mock API responses
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ conversations: [mockConversation] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockConversation }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockMessage }),
        });

      // Mock encryption services
      mockEncryptionService.getConversationEncryptionStatus.mockResolvedValue({
        isEncrypted: true,
        missingKeys: [],
        readyForEncryption: true,
      });

      mockEncryptionService.encryptMessage.mockResolvedValue({
        encryptedContent: [1, 2, 3, 4],
        encryptedKey: [5, 6, 7, 8],
        iv: [9, 10, 11, 12],
      });

      mockEncryptionService.decryptMessage.mockResolvedValue('Hello, this is a test message!');

      // Mock queue service
      mockQueueService.isOnlineStatus.mockReturnValue(true);
      mockQueueService.queueMessage.mockResolvedValue('queue-1');

      // Render messaging page
      render(<MessagingPage userAddress={mockUserAddress} />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText(/messaging/i)).toBeInTheDocument();
      });

      // Start new conversation
      const newConversationButton = screen.getByRole('button', { name: /new conversation/i });
      await user.click(newConversationButton);

      // Enter recipient address
      const recipientInput = screen.getByPlaceholderText(/enter wallet address/i);
      await user.type(recipientInput, mockRecipientAddress);

      // Start conversation
      const startButton = screen.getByRole('button', { name: /start conversation/i });
      await user.click(startButton);

      // Wait for conversation to be created
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/conversations',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              participantAddress: mockRecipientAddress,
              initialMessage: undefined,
            }),
          })
        );
      });

      // Send a message
      const messageInput = screen.getByPlaceholderText(/type a message/i);
      await user.type(messageInput, 'Hello, this is a test message!');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Verify message was queued/sent
      await waitFor(() => {
        expect(mockQueueService.queueMessage).toHaveBeenCalledWith(
          'conv-1',
          'Hello, this is a test message!',
          'text',
          undefined
        );
      });

      // Verify encryption was used
      expect(mockEncryptionService.encryptMessage).toHaveBeenCalled();
    });

    it('should handle offline message queuing and sync', async () => {
      const user = userEvent.setup();
      
      const mockConversation: Conversation = {
        id: 'conv-1',
        participants: [mockUserAddress, mockRecipientAddress],
        lastActivity: new Date(),
        unreadCounts: {},
        isEncrypted: true,
        metadata: { type: 'direct' },
      };

      // Mock offline status
      mockQueueService.isOnlineStatus.mockReturnValue(false);
      mockQueueService.queueMessage.mockResolvedValue('queue-1');
      mockQueueService.getPendingMessages.mockResolvedValue([
        {
          id: 'queue-1',
          conversationId: 'conv-1',
          content: 'Offline message',
          contentType: 'text',
          timestamp: new Date(),
          retryCount: 0,
          status: 'pending',
        },
      ]);

      // Mock API responses
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ conversations: [mockConversation] }),
      });

      render(<MessagingPage userAddress={mockUserAddress} />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText(/messaging/i)).toBeInTheDocument();
      });

      // Should show offline indicator
      expect(screen.getByText(/offline/i)).toBeInTheDocument();

      // Send message while offline
      const messageInput = screen.getByPlaceholderText(/type a message/i);
      await user.type(messageInput, 'Offline message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Verify message was queued
      await waitFor(() => {
        expect(mockQueueService.queueMessage).toHaveBeenCalledWith(
          'conv-1',
          'Offline message',
          'text',
          undefined
        );
      });

      // Should show pending message indicator
      expect(screen.getByText(/pending/i)).toBeInTheDocument();

      // Simulate coming online
      mockQueueService.isOnlineStatus.mockReturnValue(true);
      mockQueueService.syncPendingMessages.mockResolvedValue();

      // Trigger sync
      const syncButton = screen.getByRole('button', { name: /sync/i });
      await user.click(syncButton);

      await waitFor(() => {
        expect(mockQueueService.syncPendingMessages).toHaveBeenCalled();
      });
    });
  });

  describe('Group Conversation Workflows', () => {
    it('should handle group conversation creation and management', async () => {
      const user = userEvent.setup();
      
      const mockGroupConversation = {
        id: 'group-1',
        participants: [mockUserAddress, mockRecipientAddress, '0x3333'],
        lastActivity: new Date(),
        unreadCounts: {},
        isEncrypted: true,
        metadata: { type: 'group' },
        name: 'Test Group',
        description: 'A test group conversation',
        members: [
          {
            address: mockUserAddress,
            role: 'admin' as const,
            joinedAt: new Date(),
            permissions: {
              canSendMessages: true,
              canAddMembers: true,
              canRemoveMembers: true,
              canChangeSettings: true,
            },
          },
        ],
        settings: {
          isPublic: false,
          requireApproval: true,
          allowMemberInvites: true,
          maxMembers: 100,
        },
      };

      // Mock service responses
      mockConversationService.createGroupConversation.mockResolvedValue(mockGroupConversation);
      mockConversationService.addGroupMember.mockResolvedValue(true);
      mockConversationService.getGroupMembers.mockResolvedValue(mockGroupConversation.members);

      render(<MessagingPage userAddress={mockUserAddress} />);

      // Create group conversation
      const createGroupButton = screen.getByRole('button', { name: /create group/i });
      await user.click(createGroupButton);

      // Fill group details
      const groupNameInput = screen.getByPlaceholderText(/group name/i);
      await user.type(groupNameInput, 'Test Group');

      const groupDescInput = screen.getByPlaceholderText(/group description/i);
      await user.type(groupDescInput, 'A test group conversation');

      // Add participants
      const participantInput = screen.getByPlaceholderText(/add participant/i);
      await user.type(participantInput, mockRecipientAddress);
      
      const addParticipantButton = screen.getByRole('button', { name: /add/i });
      await user.click(addParticipantButton);

      // Create group
      const createButton = screen.getByRole('button', { name: /create group/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockConversationService.createGroupConversation).toHaveBeenCalledWith(
          'Test Group',
          'A test group conversation',
          [mockRecipientAddress],
          mockUserAddress,
          undefined
        );
      });

      // Verify group was created
      expect(screen.getByText('Test Group')).toBeInTheDocument();

      // Add another member
      const addMemberButton = screen.getByRole('button', { name: /add member/i });
      await user.click(addMemberButton);

      const newMemberInput = screen.getByPlaceholderText(/member address/i);
      await user.type(newMemberInput, '0x3333');

      const confirmAddButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmAddButton);

      await waitFor(() => {
        expect(mockConversationService.addGroupMember).toHaveBeenCalledWith(
          'group-1',
          '0x3333',
          'member',
          mockUserAddress
        );
      });
    });
  });

  describe('Message Encryption Workflows', () => {
    it('should handle end-to-end encryption setup and messaging', async () => {
      const user = userEvent.setup();
      
      const mockConversation: Conversation = {
        id: 'conv-1',
        participants: [mockUserAddress, mockRecipientAddress],
        lastActivity: new Date(),
        unreadCounts: {},
        isEncrypted: true,
        metadata: { type: 'direct' },
      };

      // Mock encryption setup
      mockEncryptionService.getConversationEncryptionStatus.mockResolvedValue({
        isEncrypted: false,
        missingKeys: [mockRecipientAddress],
        readyForEncryption: false,
      });

      mockEncryptionService.exchangeKeys.mockResolvedValue({
        success: true,
        publicKey: 'mockPublicKey',
      });

      mockEncryptionService.initializeConversationEncryption.mockResolvedValue(true);

      render(<MessagingPage userAddress={mockUserAddress} />);

      // Should show encryption setup needed
      expect(screen.getByText(/encryption setup required/i)).toBeInTheDocument();

      // Initialize encryption
      const setupEncryptionButton = screen.getByRole('button', { name: /setup encryption/i });
      await user.click(setupEncryptionButton);

      await waitFor(() => {
        expect(mockEncryptionService.exchangeKeys).toHaveBeenCalledWith(
          mockUserAddress,
          mockRecipientAddress
        );
      });

      await waitFor(() => {
        expect(mockEncryptionService.initializeConversationEncryption).toHaveBeenCalledWith(
          'conv-1',
          [mockUserAddress, mockRecipientAddress],
          mockUserAddress
        );
      });

      // Should show encryption enabled
      expect(screen.getByText(/encrypted/i)).toBeInTheDocument();
    });

    it('should handle encryption key rotation', async () => {
      const user = userEvent.setup();
      
      mockEncryptionService.rotateKeys.mockResolvedValue(true);

      render(<MessagingPage userAddress={mockUserAddress} />);

      // Open security settings
      const securityButton = screen.getByRole('button', { name: /security/i });
      await user.click(securityButton);

      // Rotate keys
      const rotateKeysButton = screen.getByRole('button', { name: /rotate keys/i });
      await user.click(rotateKeysButton);

      // Confirm rotation
      const confirmButton = screen.getByRole('button', { name: /confirm rotation/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockEncryptionService.rotateKeys).toHaveBeenCalledWith(mockUserAddress);
      });

      // Should show success message
      expect(screen.getByText(/keys rotated successfully/i)).toBeInTheDocument();
    });

    it('should handle key backup and restore', async () => {
      const user = userEvent.setup();
      
      const mockBackupData = 'mockEncryptedBackupData';
      mockEncryptionService.backupKeys.mockResolvedValue(mockBackupData);
      mockEncryptionService.restoreKeys.mockResolvedValue(true);

      render(<MessagingPage userAddress={mockUserAddress} />);

      // Open security settings
      const securityButton = screen.getByRole('button', { name: /security/i });
      await user.click(securityButton);

      // Create backup
      const backupButton = screen.getByRole('button', { name: /backup keys/i });
      await user.click(backupButton);

      // Enter passphrase
      const passphraseInput = screen.getByPlaceholderText(/enter passphrase/i);
      await user.type(passphraseInput, 'securePassphrase123');

      const createBackupButton = screen.getByRole('button', { name: /create backup/i });
      await user.click(createBackupButton);

      await waitFor(() => {
        expect(mockEncryptionService.backupKeys).toHaveBeenCalledWith(
          mockUserAddress,
          'securePassphrase123'
        );
      });

      // Should show backup data
      expect(screen.getByText(mockBackupData)).toBeInTheDocument();

      // Test restore
      const restoreButton = screen.getByRole('button', { name: /restore keys/i });
      await user.click(restoreButton);

      const backupDataInput = screen.getByPlaceholderText(/paste backup data/i);
      await user.type(backupDataInput, mockBackupData);

      const restorePassphraseInput = screen.getByPlaceholderText(/enter passphrase/i);
      await user.type(restorePassphraseInput, 'securePassphrase123');

      const confirmRestoreButton = screen.getByRole('button', { name: /restore/i });
      await user.click(confirmRestoreButton);

      await waitFor(() => {
        expect(mockEncryptionService.restoreKeys).toHaveBeenCalledWith(
          mockBackupData,
          'securePassphrase123'
        );
      });

      // Should show success message
      expect(screen.getByText(/keys restored successfully/i)).toBeInTheDocument();
    });
  });

  describe('Conversation Management Workflows', () => {
    it('should handle conversation search and filtering', async () => {
      const user = userEvent.setup();
      
      const mockConversations: Conversation[] = [
        {
          id: 'conv-1',
          participants: [mockUserAddress, mockRecipientAddress],
          lastActivity: new Date(),
          unreadCounts: {},
          isEncrypted: true,
          metadata: { type: 'direct' },
        },
        {
          id: 'conv-2',
          participants: [mockUserAddress, '0x3333'],
          lastActivity: new Date(),
          unreadCounts: { [mockUserAddress]: 2 },
          isEncrypted: true,
          metadata: { type: 'direct' },
        },
      ];

      mockConversationService.searchConversations.mockResolvedValue(mockConversations);
      mockConversationService.getFilteredConversations.mockResolvedValue({
        conversations: [mockConversations[1]],
        total: 1,
      });

      render(<MessagingPage userAddress={mockUserAddress} />);

      // Search conversations
      const searchInput = screen.getByPlaceholderText(/search conversations/i);
      await user.type(searchInput, 'test query');

      await waitFor(() => {
        expect(mockConversationService.searchConversations).toHaveBeenCalledWith(
          'test query',
          undefined,
          mockUserAddress
        );
      });

      // Apply filters
      const filterButton = screen.getByRole('button', { name: /filter/i });
      await user.click(filterButton);

      const unreadFilter = screen.getByRole('checkbox', { name: /unread only/i });
      await user.click(unreadFilter);

      const applyFiltersButton = screen.getByRole('button', { name: /apply filters/i });
      await user.click(applyFiltersButton);

      await waitFor(() => {
        expect(mockConversationService.getFilteredConversations).toHaveBeenCalledWith(
          expect.objectContaining({
            hasUnread: true,
          }),
          mockUserAddress,
          50,
          0
        );
      });
    });

    it('should handle conversation archiving and management', async () => {
      const user = userEvent.setup();
      
      mockConversationService.archiveConversation.mockResolvedValue(true);
      mockConversationService.toggleConversationPin.mockResolvedValue(true);
      mockConversationService.deleteConversation.mockResolvedValue(true);

      render(<MessagingPage userAddress={mockUserAddress} />);

      // Archive conversation
      const conversationItem = screen.getByTestId('conversation-conv-1');
      const moreOptionsButton = conversationItem.querySelector('[data-testid="more-options"]');
      
      if (moreOptionsButton) {
        await user.click(moreOptionsButton);
      }

      const archiveButton = screen.getByRole('menuitem', { name: /archive/i });
      await user.click(archiveButton);

      await waitFor(() => {
        expect(mockConversationService.archiveConversation).toHaveBeenCalledWith(
          'conv-1',
          mockUserAddress,
          undefined
        );
      });

      // Pin conversation
      const pinButton = screen.getByRole('menuitem', { name: /pin/i });
      await user.click(pinButton);

      await waitFor(() => {
        expect(mockConversationService.toggleConversationPin).toHaveBeenCalledWith(
          'conv-1',
          mockUserAddress,
          true
        );
      });

      // Delete conversation
      const deleteButton = screen.getByRole('menuitem', { name: /delete/i });
      await user.click(deleteButton);

      // Confirm deletion
      const confirmDeleteButton = screen.getByRole('button', { name: /confirm delete/i });
      await user.click(confirmDeleteButton);

      await waitFor(() => {
        expect(mockConversationService.deleteConversation).toHaveBeenCalledWith(
          'conv-1',
          mockUserAddress,
          false
        );
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      mockQueueService.isOnlineStatus.mockReturnValue(false);
      mockQueueService.queueMessage.mockResolvedValue('queue-1');

      render(<MessagingPage userAddress={mockUserAddress} />);

      // Should show offline indicator
      expect(screen.getByText(/offline/i)).toBeInTheDocument();

      // Try to send message
      const messageInput = screen.getByPlaceholderText(/type a message/i);
      await user.type(messageInput, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Should queue message instead of failing
      await waitFor(() => {
        expect(mockQueueService.queueMessage).toHaveBeenCalled();
      });

      // Should show queued message indicator
      expect(screen.getByText(/queued/i)).toBeInTheDocument();
    });

    it('should handle encryption failures', async () => {
      const user = userEvent.setup();
      
      mockEncryptionService.encryptMessage.mockRejectedValue(new Error('Encryption failed'));
      mockQueueService.isOnlineStatus.mockReturnValue(true);

      render(<MessagingPage userAddress={mockUserAddress} />);

      // Try to send message
      const messageInput = screen.getByPlaceholderText(/type a message/i);
      await user.type(messageInput, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Should show encryption error
      await waitFor(() => {
        expect(screen.getByText(/encryption failed/i)).toBeInTheDocument();
      });

      // Should offer to send unencrypted
      const sendUnencryptedButton = screen.getByRole('button', { name: /send unencrypted/i });
      expect(sendUnencryptedButton).toBeInTheDocument();
    });

    it('should handle conversation loading errors', async () => {
      const user = userEvent.setup();
      
      // Mock API error
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      render(<MessagingPage userAddress={mockUserAddress} />);

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/failed to load conversations/i)).toBeInTheDocument();
      });

      // Should show retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      // Test retry functionality
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ conversations: [] }),
      });

      await user.click(retryButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle concurrent message sending', async () => {
      const user = userEvent.setup();
      
      mockQueueService.isOnlineStatus.mockReturnValue(true);
      mockQueueService.queueMessage
        .mockResolvedValueOnce('queue-1')
        .mockResolvedValueOnce('queue-2')
        .mockResolvedValueOnce('queue-3');

      render(<MessagingPage userAddress={mockUserAddress} />);

      const messageInput = screen.getByPlaceholderText(/type a message/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Send multiple messages quickly
      await user.type(messageInput, 'Message 1');
      await user.click(sendButton);

      await user.clear(messageInput);
      await user.type(messageInput, 'Message 2');
      await user.click(sendButton);

      await user.clear(messageInput);
      await user.type(messageInput, 'Message 3');
      await user.click(sendButton);

      // All messages should be queued
      await waitFor(() => {
        expect(mockQueueService.queueMessage).toHaveBeenCalledTimes(3);
      });

      // Should show all messages in UI
      expect(screen.getByText('Message 1')).toBeInTheDocument();
      expect(screen.getByText('Message 2')).toBeInTheDocument();
      expect(screen.getByText('Message 3')).toBeInTheDocument();
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large conversation lists efficiently', async () => {
      const user = userEvent.setup();
      
      // Generate large number of conversations
      const largeConversationList = Array.from({ length: 1000 }, (_, i) => ({
        id: `conv-${i}`,
        participants: [mockUserAddress, `0x${i.toString().padStart(40, '0')}`],
        lastActivity: new Date(),
        unreadCounts: {},
        isEncrypted: true,
        metadata: { type: 'direct' as const },
      }));

      mockConversationService.getFilteredConversations.mockResolvedValue({
        conversations: largeConversationList.slice(0, 50),
        total: 1000,
      });

      render(<MessagingPage userAddress={mockUserAddress} />);

      // Should load first page
      await waitFor(() => {
        expect(screen.getByText('conv-0')).toBeInTheDocument();
      });

      // Should implement virtual scrolling for performance
      const conversationList = screen.getByTestId('conversation-list');
      expect(conversationList).toHaveAttribute('data-virtualized', 'true');

      // Test pagination
      const loadMoreButton = screen.getByRole('button', { name: /load more/i });
      await user.click(loadMoreButton);

      await waitFor(() => {
        expect(mockConversationService.getFilteredConversations).toHaveBeenCalledWith(
          expect.any(Object),
          mockUserAddress,
          50,
          50
        );
      });
    });

    it('should optimize message rendering for long conversations', async () => {
      const user = userEvent.setup();
      
      // Generate large number of messages
      const largeMessageList = Array.from({ length: 1000 }, (_, i) => ({
        id: `msg-${i}`,
        conversationId: 'conv-1',
        fromAddress: i % 2 === 0 ? mockUserAddress : mockRecipientAddress,
        content: `Message ${i}`,
        contentType: 'text' as const,
        timestamp: new Date(Date.now() - i * 60000),
        deliveryStatus: 'delivered' as const,
      }));

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            messages: largeMessageList.slice(0, 50),
            pagination: { page: 1, limit: 50, total: 1000 },
          },
        }),
      });

      render(<MessagingPage userAddress={mockUserAddress} />);

      // Select conversation
      const conversationItem = screen.getByTestId('conversation-conv-1');
      await user.click(conversationItem);

      // Should load messages with virtual scrolling
      await waitFor(() => {
        expect(screen.getByText('Message 0')).toBeInTheDocument();
      });

      const messageList = screen.getByTestId('message-list');
      expect(messageList).toHaveAttribute('data-virtualized', 'true');

      // Test infinite scroll
      fireEvent.scroll(messageList, { target: { scrollTop: 0 } });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/conversations/conv-1/messages'),
          expect.objectContaining({
            method: 'GET',
          })
        );
      });
    });
  });
});