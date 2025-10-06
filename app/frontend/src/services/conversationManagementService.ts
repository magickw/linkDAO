import { 
  Conversation, 
  ConversationFilter, 
  ConversationSettings, 
  MessageSearchQuery, 
  MessageSearchResult,
  GroupConversation,
  ConversationMember
} from '../types/messaging';

export class ConversationManagementService {
  private static instance: ConversationManagementService;

  private constructor() {}

  public static getInstance(): ConversationManagementService {
    if (!ConversationManagementService.instance) {
      ConversationManagementService.instance = new ConversationManagementService();
    }
    return ConversationManagementService.instance;
  }

  /**
   * Search conversations by various criteria
   */
  async searchConversations(
    query: string,
    filter?: ConversationFilter,
    userAddress?: string
  ): Promise<Conversation[]> {
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (filter?.type) params.append('type', filter.type);
      if (filter?.hasUnread !== undefined) params.append('hasUnread', filter.hasUnread.toString());
      if (filter?.isArchived !== undefined) params.append('isArchived', filter.isArchived.toString());
      if (filter?.isPinned !== undefined) params.append('isPinned', filter.isPinned.toString());
      if (filter?.participantAddress) params.append('participant', filter.participantAddress);

      const response = await fetch(`/api/conversations/search?${params}`, {
        headers: {
          'Authorization': `Bearer ${userAddress}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.conversations;
      }

      return [];
    } catch (error) {
      console.error('Conversation search failed:', error);
      return [];
    }
  }

  /**
   * Search messages within conversations
   */
  async searchMessages(
    searchQuery: MessageSearchQuery,
    userAddress: string
  ): Promise<MessageSearchResult[]> {
    try {
      const response = await fetch('/api/messages/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAddress}`,
        },
        body: JSON.stringify(searchQuery),
      });

      if (response.ok) {
        const data = await response.json();
        return data.results;
      }

      return [];
    } catch (error) {
      console.error('Message search failed:', error);
      return [];
    }
  }

  /**
   * Archive a conversation
   */
  async archiveConversation(
    conversationId: string,
    userAddress: string,
    reason?: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAddress}`,
        },
        body: JSON.stringify({ reason }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to archive conversation:', error);
      return false;
    }
  }

  /**
   * Unarchive a conversation
   */
  async unarchiveConversation(
    conversationId: string,
    userAddress: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/unarchive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userAddress}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to unarchive conversation:', error);
      return false;
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(
    conversationId: string,
    userAddress: string,
    deleteForEveryone: boolean = false
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAddress}`,
        },
        body: JSON.stringify({ deleteForEveryone }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      return false;
    }
  }

  /**
   * Pin/unpin a conversation
   */
  async toggleConversationPin(
    conversationId: string,
    userAddress: string,
    isPinned: boolean
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/pin`, {
        method: isPinned ? 'POST' : 'DELETE',
        headers: {
          'Authorization': `Bearer ${userAddress}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to toggle conversation pin:', error);
      return false;
    }
  }

  /**
   * Mute/unmute a conversation
   */
  async toggleConversationMute(
    conversationId: string,
    userAddress: string,
    isMuted: boolean,
    muteUntil?: Date
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/mute`, {
        method: isMuted ? 'POST' : 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAddress}`,
        },
        body: JSON.stringify({ muteUntil }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to toggle conversation mute:', error);
      return false;
    }
  }

  /**
   * Update conversation settings
   */
  async updateConversationSettings(
    conversationId: string,
    settings: Partial<ConversationSettings>,
    userAddress: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAddress}`,
        },
        body: JSON.stringify(settings),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to update conversation settings:', error);
      return false;
    }
  }

  /**
   * Get conversation settings
   */
  async getConversationSettings(
    conversationId: string,
    userAddress: string
  ): Promise<ConversationSettings | null> {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/settings`, {
        headers: {
          'Authorization': `Bearer ${userAddress}`,
        },
      });

      if (response.ok) {
        return await response.json();
      }

      return null;
    } catch (error) {
      console.error('Failed to get conversation settings:', error);
      return null;
    }
  }

  /**
   * Set custom title for a conversation
   */
  async setConversationTitle(
    conversationId: string,
    title: string,
    userAddress: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/title`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAddress}`,
        },
        body: JSON.stringify({ title }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to set conversation title:', error);
      return false;
    }
  }

  /**
   * Create a group conversation
   */
  async createGroupConversation(
    name: string,
    description: string,
    participants: string[],
    creatorAddress: string,
    settings?: Partial<GroupConversation['settings']>
  ): Promise<GroupConversation | null> {
    try {
      const response = await fetch('/api/conversations/group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${creatorAddress}`,
        },
        body: JSON.stringify({
          name,
          description,
          participants,
          settings: {
            isPublic: false,
            requireApproval: true,
            allowMemberInvites: true,
            maxMembers: 100,
            ...settings,
          },
        }),
      });

      if (response.ok) {
        return await response.json();
      }

      return null;
    } catch (error) {
      console.error('Failed to create group conversation:', error);
      return null;
    }
  }

  /**
   * Add member to group conversation
   */
  async addGroupMember(
    conversationId: string,
    memberAddress: string,
    role: 'admin' | 'member',
    userAddress: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAddress}`,
        },
        body: JSON.stringify({
          memberAddress,
          role,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to add group member:', error);
      return false;
    }
  }

  /**
   * Remove member from group conversation
   */
  async removeGroupMember(
    conversationId: string,
    memberAddress: string,
    userAddress: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/members/${memberAddress}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${userAddress}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to remove group member:', error);
      return false;
    }
  }

  /**
   * Update member role in group conversation
   */
  async updateMemberRole(
    conversationId: string,
    memberAddress: string,
    role: 'admin' | 'member',
    userAddress: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/members/${memberAddress}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAddress}`,
        },
        body: JSON.stringify({ role }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to update member role:', error);
      return false;
    }
  }

  /**
   * Leave a group conversation
   */
  async leaveGroupConversation(
    conversationId: string,
    userAddress: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userAddress}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to leave group conversation:', error);
      return false;
    }
  }

  /**
   * Get group conversation members
   */
  async getGroupMembers(
    conversationId: string,
    userAddress: string
  ): Promise<ConversationMember[]> {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/members`, {
        headers: {
          'Authorization': `Bearer ${userAddress}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.members;
      }

      return [];
    } catch (error) {
      console.error('Failed to get group members:', error);
      return [];
    }
  }

  /**
   * Update group conversation settings
   */
  async updateGroupSettings(
    conversationId: string,
    settings: Partial<GroupConversation['settings']>,
    userAddress: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/group-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAddress}`,
        },
        body: JSON.stringify(settings),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to update group settings:', error);
      return false;
    }
  }

  /**
   * Create community announcement conversation
   */
  async createCommunityAnnouncement(
    communityId: string,
    title: string,
    description: string,
    creatorAddress: string
  ): Promise<Conversation | null> {
    try {
      const response = await fetch('/api/conversations/community-announcement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${creatorAddress}`,
        },
        body: JSON.stringify({
          communityId,
          title,
          description,
        }),
      });

      if (response.ok) {
        return await response.json();
      }

      return null;
    } catch (error) {
      console.error('Failed to create community announcement:', error);
      return null;
    }
  }

  /**
   * Get conversations by filter
   */
  async getFilteredConversations(
    filter: ConversationFilter,
    userAddress: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ conversations: Conversation[]; total: number }> {
    try {
      const params = new URLSearchParams();
      if (filter.type) params.append('type', filter.type);
      if (filter.hasUnread !== undefined) params.append('hasUnread', filter.hasUnread.toString());
      if (filter.isArchived !== undefined) params.append('isArchived', filter.isArchived.toString());
      if (filter.isPinned !== undefined) params.append('isPinned', filter.isPinned.toString());
      if (filter.participantAddress) params.append('participant', filter.participantAddress);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(`/api/conversations/filter?${params}`, {
        headers: {
          'Authorization': `Bearer ${userAddress}`,
        },
      });

      if (response.ok) {
        return await response.json();
      }

      return { conversations: [], total: 0 };
    } catch (error) {
      console.error('Failed to get filtered conversations:', error);
      return { conversations: [], total: 0 };
    }
  }

  /**
   * Export conversation data
   */
  async exportConversation(
    conversationId: string,
    format: 'json' | 'csv' | 'html',
    userAddress: string,
    options?: {
      includeMedia?: boolean;
      dateRange?: { start: Date; end: Date };
    }
  ): Promise<Blob | null> {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAddress}`,
        },
        body: JSON.stringify({
          format,
          ...options,
        }),
      });

      if (response.ok) {
        return await response.blob();
      }

      return null;
    } catch (error) {
      console.error('Failed to export conversation:', error);
      return null;
    }
  }

  /**
   * Get conversation analytics
   */
  async getConversationAnalytics(
    conversationId: string,
    userAddress: string,
    period?: { start: Date; end: Date }
  ): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (period) {
        params.append('start', period.start.toISOString());
        params.append('end', period.end.toISOString());
      }

      const response = await fetch(`/api/conversations/${conversationId}/analytics?${params}`, {
        headers: {
          'Authorization': `Bearer ${userAddress}`,
        },
      });

      if (response.ok) {
        return await response.json();
      }

      return null;
    } catch (error) {
      console.error('Failed to get conversation analytics:', error);
      return null;
    }
  }

  /**
   * Block/unblock a user in conversations
   */
  async toggleUserBlock(
    userAddress: string,
    targetAddress: string,
    isBlocked: boolean
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/users/${targetAddress}/block`, {
        method: isBlocked ? 'POST' : 'DELETE',
        headers: {
          'Authorization': `Bearer ${userAddress}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to toggle user block:', error);
      return false;
    }
  }

  /**
   * Report a conversation or user
   */
  async reportConversation(
    conversationId: string,
    reason: string,
    description: string,
    userAddress: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAddress}`,
        },
        body: JSON.stringify({
          reason,
          description,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to report conversation:', error);
      return false;
    }
  }

  /**
   * Get conversation participants info
   */
  async getParticipantsInfo(
    conversationId: string,
    userAddress: string
  ): Promise<Array<{ address: string; isOnline: boolean; lastSeen?: Date }>> {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/participants`, {
        headers: {
          'Authorization': `Bearer ${userAddress}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.participants;
      }

      return [];
    } catch (error) {
      console.error('Failed to get participants info:', error);
      return [];
    }
  }

  /**
   * Clear conversation history
   */
  async clearConversationHistory(
    conversationId: string,
    userAddress: string,
    clearForEveryone: boolean = false
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAddress}`,
        },
        body: JSON.stringify({ clearForEveryone }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to clear conversation history:', error);
      return false;
    }
  }

  /**
   * Get conversation backup
   */
  async createConversationBackup(
    conversationId: string,
    userAddress: string,
    includeMedia: boolean = true
  ): Promise<string | null> {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/backup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAddress}`,
        },
        body: JSON.stringify({ includeMedia }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.backupId;
      }

      return null;
    } catch (error) {
      console.error('Failed to create conversation backup:', error);
      return null;
    }
  }

  /**
   * Restore conversation from backup
   */
  async restoreConversationBackup(
    backupId: string,
    userAddress: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/conversations/restore/${backupId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userAddress}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to restore conversation backup:', error);
      return false;
    }
  }
}