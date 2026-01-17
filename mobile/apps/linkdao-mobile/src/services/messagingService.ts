/**
 * Messaging Service
 * API service for messaging and conversations with real-time support
 */

import { apiClient } from '@linkdao/shared';
import { Message, Conversation } from '../store';
import { webSocketService } from './webSocketService';

// Enhanced Types
export interface CreateMessageData {
  conversationId: string;
  content: string;
  contentType?: 'text' | 'image' | 'file' | 'voice';
  replyToId?: string;
}

export interface CreateConversationData {
  participantAddress: string;
  name?: string;
  isGroup?: boolean;
}

export interface CreateDirectMessageData {
  recipientAddress: string;
  initialMessage?: string;
}

export interface CreateGroupChatData {
  name: string;
  description?: string;
  avatar?: string;
  participantAddresses: string[];
  isPublic?: boolean;
}

export interface JoinGroupChatData {
  conversationId: string;
  inviteCode?: string;
}

export interface AddMemberData {
  conversationId: string;
  memberAddress: string;
  role?: 'admin' | 'member';
}

export interface RemoveMemberData {
  conversationId: string;
  memberAddress: string;
}

export interface UpdateGroupData {
  conversationId: string;
  name?: string;
  description?: string;
  avatar?: string;
  isPublic?: boolean;
}

export interface ConversationMember {
  address: string;
  role: 'admin' | 'member';
  joinedAt: Date;
  displayName?: string;
  avatar?: string;
  isOnline?: boolean;
}

export interface GroupConversation extends Conversation {
  name: string;
  description?: string;
  avatar?: string;
  members: ConversationMember[];
  isPublic: boolean;
  memberCount: number;
  inviteCode?: string;
  createdBy: string;
  createdAt: Date;
}

export interface Contact {
  address: string;
  name?: string;
  displayName?: string;
  avatar?: string;
  ens?: string;
  addedAt: Date;
  category?: string;
  notes?: string;
}

export interface TypingIndicator {
  conversationId: string;
  userAddress: string;
  isTyping: boolean;
  timestamp: Date;
}

export interface OnlineStatus {
  address: string;
  isOnline: boolean;
  lastSeen: Date;
}

class MessagingService {
  private messageListeners: Map<string, (message: Message) => void> = new Map();
  private typingListeners: Map<string, (typing: TypingIndicator) => void> = new Map();
  private onlineStatusListeners: Map<string, (status: OnlineStatus) => void> = new Map();

  /**
   * Subscribe to new messages in a conversation
   */
  subscribeToMessages(conversationId: string, callback: (message: Message) => void): () => void {
    const eventName = `message:new:${conversationId}`;
    
    const listener = (data: any) => {
      if (data.conversationId === conversationId) {
        callback(data);
      }
    };

    this.messageListeners.set(conversationId, callback);
    webSocketService.on(eventName, listener);

    // Return unsubscribe function
    return () => {
      webSocketService.off(eventName, listener);
      this.messageListeners.delete(conversationId);
    };
  }

  /**
   * Subscribe to typing indicators
   */
  subscribeToTyping(conversationId: string, callback: (typing: TypingIndicator) => void): () => void {
    const eventName = `typing:${conversationId}`;
    
    const listener = (data: any) => {
      if (data.conversationId === conversationId) {
        callback(data);
      }
    };

    this.typingListeners.set(conversationId, callback);
    webSocketService.on(eventName, listener);

    return () => {
      webSocketService.off(eventName, listener);
      this.typingListeners.delete(conversationId);
    };
  }

  /**
   * Subscribe to online status updates
   */
  subscribeToOnlineStatus(callback: (status: OnlineStatus) => void): () => void {
    const listener = (data: any) => {
      callback(data);
    };

    this.onlineStatusListeners.set('global', callback);
    webSocketService.on('user:online', listener);
    webSocketService.on('user:offline', listener);

    return () => {
      webSocketService.off('user:online', listener);
      webSocketService.off('user:offline', listener);
      this.onlineStatusListeners.delete('global');
    };
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(conversationId: string, isTyping: boolean): void {
    webSocketService.emit('typing', {
      conversationId,
      isTyping,
    });
  }

  /**
   * Get all conversations
   */
  async getConversations(): Promise<Conversation[]> {
    const response = await apiClient.get<{ conversations: Conversation[] }>('/api/messaging/conversations');

    if (response.success && response.data) {
      return response.data.conversations;
    }

    return [];
  }

  /**
   * Get conversation by ID
   */
  async getConversation(id: string): Promise<Conversation | null> {
    const response = await apiClient.get<Conversation>(`/api/messaging/conversations/${id}`);

    if (response.success && response.data) {
      return response.data;
    }

    return null;
  }

  /**
   * Get group conversation details
   */
  async getGroupConversation(id: string): Promise<GroupConversation | null> {
    const response = await apiClient.get<GroupConversation>(`/api/messaging/conversations/${id}/group`);

    if (response.success && response.data) {
      return response.data;
    }

    return null;
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string, limit: number = 50, before?: string): Promise<Message[]> {
    const url = before 
      ? `/api/messaging/conversations/${conversationId}/messages?limit=${limit}&before=${before}`
      : `/api/messaging/conversations/${conversationId}/messages?limit=${limit}`;
    
    const response = await apiClient.get<{ messages: Message[] }>(url);

    if (response.success && response.data) {
      return response.data.messages;
    }

    return [];
  }

  /**
   * Send a message
   */
  async sendMessage(data: CreateMessageData): Promise<Message | null> {
    const response = await apiClient.post<Message>(
      `/api/messaging/conversations/${data.conversationId}/messages`,
      {
        content: data.content,
        contentType: data.contentType || 'text',
        replyToId: data.replyToId,
      }
    );

    if (response.success && response.data) {
      // Emit message through WebSocket for real-time updates
      webSocketService.emit('message:send', {
        conversationId: data.conversationId,
        message: response.data,
      });
      
      return response.data;
    }

    return null;
  }

  /**
   * Create a new conversation
   */
  async createConversation(data: CreateConversationData): Promise<Conversation | null> {
    const response = await apiClient.post<Conversation>('/api/messaging/conversations', data);

    if (response.success && response.data) {
      return response.data;
    }

    return null;
  }

  /**
   * Create or get a direct message conversation
   */
  async createDirectMessage(data: CreateDirectMessageData): Promise<Conversation | null> {
    const response = await apiClient.post<Conversation>('/api/messaging/direct', data);

    if (response.success && response.data) {
      return response.data;
    }

    return null;
  }

  /**
   * Create a new group chat
   */
  async createGroupChat(data: CreateGroupChatData): Promise<GroupConversation | null> {
    const response = await apiClient.post<GroupConversation>('/api/messaging/groups', data);

    if (response.success && response.data) {
      return response.data;
    }

    return null;
  }

  /**
   * Join a group chat
   */
  async joinGroupChat(data: JoinGroupChatData): Promise<GroupConversation | null> {
    const response = await apiClient.post<GroupConversation>(
      `/api/messaging/groups/${data.conversationId}/join`,
      { inviteCode: data.inviteCode }
    );

    if (response.success && response.data) {
      return response.data;
    }

    return null;
  }

  /**
   * Leave a group chat
   */
  async leaveGroupChat(conversationId: string): Promise<boolean> {
    const response = await apiClient.post(`/api/messaging/groups/${conversationId}/leave`);
    return response.success;
  }

  /**
   * Add member to group
   */
  async addGroupMember(data: AddMemberData): Promise<ConversationMember | null> {
    const response = await apiClient.post<ConversationMember>(
      `/api/messaging/groups/${data.conversationId}/members`,
      {
        memberAddress: data.memberAddress,
        role: data.role || 'member',
      }
    );

    if (response.success && response.data) {
      return response.data;
    }

    return null;
  }

  /**
   * Remove member from group
   */
  async removeGroupMember(data: RemoveMemberData): Promise<boolean> {
    const response = await apiClient.delete(
      `/api/messaging/groups/${data.conversationId}/members/${data.memberAddress}`
    );
    return response.success;
  }

  /**
   * Update group details
   */
  async updateGroup(data: UpdateGroupData): Promise<GroupConversation | null> {
    const response = await apiClient.put<GroupConversation>(
      `/api/messaging/groups/${data.conversationId}`,
      data
    );

    if (response.success && response.data) {
      return response.data;
    }

    return null;
  }

  /**
   * Get group members
   */
  async getGroupMembers(conversationId: string): Promise<ConversationMember[]> {
    const response = await apiClient.get<{ members: ConversationMember[] }>(
      `/api/messaging/groups/${conversationId}/members`
    );

    if (response.success && response.data) {
      return response.data.members;
    }

    return [];
  }

  /**
   * Generate group invite code
   */
  async generateInviteCode(conversationId: string): Promise<{ code: string; expiresAt: Date } | null> {
    const response = await apiClient.post<{ code: string; expiresAt: Date }>(
      `/api/messaging/groups/${conversationId}/invite`
    );

    if (response.success && response.data) {
      return response.data;
    }

    return null;
  }

  /**
   * Get public groups
   */
  async getPublicGroups(): Promise<GroupConversation[]> {
    const response = await apiClient.get<{ groups: GroupConversation[] }>('/api/messaging/groups/public');

    if (response.success && response.data) {
      return response.data.groups;
    }

    return [];
  }

  /**
   * Search groups
   */
  async searchGroups(query: string): Promise<GroupConversation[]> {
    const response = await apiClient.get<{ groups: GroupConversation[] }>(
      `/api/messaging/groups/search?q=${encodeURIComponent(query)}`
    );

    if (response.success && response.data) {
      return response.data.groups;
    }

    return [];
  }

  /**
   * Get contacts
   */
  async getContacts(): Promise<Contact[]> {
    const response = await apiClient.get<{ contacts: Contact[] }>('/api/messaging/contacts');

    if (response.success && response.data) {
      return response.data.contacts;
    }

    return [];
  }

  /**
   * Add contact
   */
  async addContact(data: { address: string; name?: string; category?: string }): Promise<Contact | null> {
    const response = await apiClient.post<Contact>('/api/messaging/contacts', data);

    if (response.success && response.data) {
      return response.data;
    }

    return null;
  }

  /**
   * Remove contact
   */
  async removeContact(address: string): Promise<boolean> {
    const response = await apiClient.delete(`/api/messaging/contacts/${address}`);
    return response.success;
  }

  /**
   * Search users by address or name
   */
  async searchUsers(query: string): Promise<Array<{ address: string; name?: string; avatar?: string }>> {
    const response = await apiClient.get<{ users: Array<{ address: string; name?: string; avatar?: string }> }>(
      `/api/messaging/users/search?q=${encodeURIComponent(query)}`
    );

    if (response.success && response.data) {
      return response.data.users;
    }

    return [];
  }

  /**
   * Get user profile
   */
  async getUserProfile(address: string): Promise<{ address: string; name?: string; avatar?: string; ens?: string } | null> {
    const response = await apiClient.get<{ address: string; name?: string; avatar?: string; ens?: string }>(
      `/api/messaging/users/${address}`
    );

    if (response.success && response.data) {
      return response.data;
    }

    return null;
  }

  /**
   * Get online users
   */
  async getOnlineUsers(): Promise<string[]> {
    const response = await apiClient.get<{ addresses: string[] }>('/api/messaging/users/online');

    if (response.success && response.data) {
      return response.data.addresses;
    }

    return [];
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string): Promise<boolean> {
    const response = await apiClient.put(`/api/messaging/conversations/${conversationId}/read`);
    return response.success;
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    const response = await apiClient.delete(`/api/messaging/messages/${messageId}`);
    return response.success;
  }

  /**
   * Edit a message
   */
  async editMessage(messageId: string, content: string): Promise<Message | null> {
    const response = await apiClient.put<Message>(`/api/messaging/messages/${messageId}`, { content });

    if (response.success && response.data) {
      return response.data;
    }

    return null;
  }

  /**
   * Search conversations
   */
  async searchConversations(query: string): Promise<Conversation[]> {
    const response = await apiClient.get<{ conversations: Conversation[] }>(
      `/api/messaging/conversations/search?q=${encodeURIComponent(query)}`
    );

    if (response.success && response.data) {
      return response.data.conversations;
    }

    return [];
  }

  /**
   * Block user
   */
  async blockUser(address: string): Promise<boolean> {
    const response = await apiClient.post(`/api/messaging/users/${address}/block`);
    return response.success;
  }

  /**
   * Unblock user
   */
  async unblockUser(address: string): Promise<boolean> {
    const response = await apiClient.delete(`/api/messaging/users/${address}/block`);
    return response.success;
  }

  /**
   * Get blocked users
   */
  async getBlockedUsers(): Promise<string[]> {
    const response = await apiClient.get<{ addresses: string[] }>('/api/messaging/users/blocked');

    if (response.success && response.data) {
      return response.data.addresses;
    }

    return [];
  }
}

export const messagingService = new MessagingService();