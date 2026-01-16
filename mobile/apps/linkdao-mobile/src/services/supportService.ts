/**
 * Support Service
 * Handles support tickets, FAQs, and live chat for mobile app
 */

import { apiClient } from './apiClient';
import { ENV } from '../constants/environment';

// Types
export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  messages?: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  sender: 'user' | 'support';
  message: string;
  attachments?: string[];
  createdAt: Date;
  isRead?: boolean;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
  views: number;
  order?: number;
}

export interface SupportCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

class SupportService {
  private baseUrl = `${ENV.BACKEND_URL}/api/support`;

  /**
   * Get user's support tickets
   */
  async getTickets(): Promise<SupportTicket[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/tickets`);
      const data = response.data.data || response.data;
      return this.transformTickets(data.tickets || data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      return [];
    }
  }

  /**
   * Get a specific ticket with messages
   */
  async getTicket(ticketId: string): Promise<SupportTicket | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/tickets/${ticketId}`);
      const data = response.data.data || response.data;
      return this.transformTicket(data);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      return null;
    }
  }

  /**
   * Create a new support ticket
   */
  async createTicket(ticketData: {
    subject: string;
    description: string;
    category: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    attachments?: string[];
  }): Promise<SupportTicket | null> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/tickets`, ticketData);
      const data = response.data.data || response.data;
      return this.transformTicket(data);
    } catch (error) {
      console.error('Error creating ticket:', error);
      return null;
    }
  }

  /**
   * Add a message to a ticket
   */
  async addMessage(ticketId: string, message: string, attachments?: string[]): Promise<TicketMessage | null> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/tickets/${ticketId}/messages`, {
        message,
        attachments,
      });
      const data = response.data.data || response.data;
      return this.transformTicketMessage(data);
    } catch (error) {
      console.error('Error adding message:', error);
      return null;
    }
  }

  /**
   * Get ticket messages
   */
  async getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/tickets/${ticketId}/messages`);
      const data = response.data.data || response.data;
      return (data.messages || data || []).map((item: any) => this.transformTicketMessage(item));
    } catch (error) {
      console.error('Error fetching ticket messages:', error);
      return [];
    }
  }

  /**
   * Close a ticket
   */
  async closeTicket(ticketId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/tickets/${ticketId}/close`);
      return { success: true };
    } catch (error: any) {
      console.error('Error closing ticket:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to close ticket',
      };
    }
  }

  /**
   * Get FAQs with optional filtering
   */
  async getFAQs(category?: string, search?: string): Promise<FAQ[]> {
    try {
      const params: any = {};
      if (category) params.category = category;
      if (search) params.search = search;

      const response = await apiClient.get(`${this.baseUrl}/faq`, { params });
      const data = response.data.data || response.data;
      return this.transformFAQs(data.faqs || data || []);
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      return this.getMockFAQs();
    }
  }

  /**
   * Get FAQ categories
   */
  async getCategories(): Promise<SupportCategory[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/categories`);
      const data = response.data.data || response.data;
      return data.categories || data || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return this.getMockCategories();
    }
  }

  /**
   * Mark FAQ as helpful or not
   */
  async markFAQHelpful(faqId: string, helpful: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/faq/${faqId}/feedback`, { helpful });
      return { success: true };
    } catch (error: any) {
      console.error('Error submitting FAQ feedback:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to submit feedback',
      };
    }
  }

  /**
   * Initiate live chat session
   */
  async initiateLiveChat(initialMessage?: string): Promise<{ sessionId: string; error?: string }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/chat/initiate`, {
        initialMessage,
      });
      const data = response.data.data || response.data;
      return { sessionId: data.sessionId || '' };
    } catch (error: any) {
      console.error('Error initiating live chat:', error);
      return {
        sessionId: '',
        error: error.response?.data?.message || error.message || 'Failed to initiate chat',
      };
    }
  }

  /**
   * Send message in live chat
   */
  async sendChatMessage(sessionId: string, message: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/chat/${sessionId}/message`, {
        message,
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error sending chat message:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to send message',
      };
    }
  }

  // Helper methods to transform API responses
  private transformTickets(data: any[]): SupportTicket[] {
    return data.map((item) => this.transformTicket(item)).filter(Boolean) as SupportTicket[];
  }

  private transformTicket(data: any): SupportTicket {
    return {
      id: data.id || '',
      subject: data.subject || '',
      description: data.description || '',
      category: data.category || 'general',
      priority: data.priority || 'medium',
      status: data.status || 'open',
      createdAt: new Date(data.createdAt || Date.now()),
      updatedAt: new Date(data.updatedAt || Date.now()),
      userId: data.userId || '',
      messages: data.messages ? data.messages.map((m: any) => this.transformTicketMessage(m)) : undefined,
    };
  }

  private transformTicketMessage(data: any): TicketMessage {
    return {
      id: data.id || '',
      ticketId: data.ticketId || '',
      sender: data.sender || 'user',
      message: data.message || '',
      attachments: data.attachments || [],
      createdAt: new Date(data.createdAt || Date.now()),
      isRead: data.isRead,
    };
  }

  private transformFAQs(data: any[]): FAQ[] {
    return data.map((item) => ({
      id: item.id || '',
      question: item.question || '',
      answer: item.answer || '',
      category: item.category || 'general',
      helpful: item.helpful || 0,
      views: item.views || 0,
      order: item.order,
    }));
  }

  // Mock data for development
  private getMockFAQs(): FAQ[] {
    return [
      {
        id: '1',
        question: 'How do I connect my wallet?',
        answer: 'To connect your wallet, tap the wallet icon in the top right corner of the app. You can connect with MetaMask, Coinbase Wallet, or any other Web3 wallet that supports WalletConnect.',
        category: 'wallet',
        helpful: 45,
        views: 234,
      },
      {
        id: '2',
        question: 'How do I participate in governance?',
        answer: 'Go to the Governance tab to view active proposals. You can vote on proposals if you hold LDAO tokens. Your voting power is determined by your token holdings and staking activity.',
        category: 'governance',
        helpful: 38,
        views: 189,
      },
      {
        id: '3',
        question: 'How do I become a seller?',
        answer: 'To become a seller, navigate to the Marketplace tab and tap on "Become a Seller". You will need to complete the seller onboarding process, which includes providing your store information and passing verification.',
        category: 'marketplace',
        helpful: 52,
        views: 312,
      },
      {
        id: '4',
        question: 'How do I tip content creators?',
        answer: 'You can tip posts, comments, or users directly by tapping the tip button on any post card. Tips are sent in LDAO tokens and the creator receives them instantly.',
        category: 'tipping',
        helpful: 29,
        views: 156,
      },
      {
        id: '5',
        question: 'What is the reputation system?',
        answer: 'The reputation system rewards active and helpful community members. You earn reputation points by creating quality content, engaging with others, and receiving positive feedback. Higher reputation unlocks special badges and privileges.',
        category: 'reputation',
        helpful: 41,
        views: 198,
      },
      {
        id: '6',
        question: 'How do I delegate my voting power?',
        answer: 'You can delegate your voting power to another community member in the Governance tab. This allows trusted representatives to vote on your behalf while you maintain ownership of your tokens.',
        category: 'governance',
        helpful: 22,
        views: 134,
      },
    ];
  }

  private getMockCategories(): SupportCategory[] {
    return [
      { id: 'general', name: 'General', description: 'General questions and help' },
      { id: 'wallet', name: 'Wallet', description: 'Wallet connection and transactions' },
      { id: 'governance', name: 'Governance', description: 'Voting and delegation' },
      { id: 'marketplace', name: 'Marketplace', description: 'Buying and selling' },
      { id: 'tipping', name: 'Tipping', description: 'Tipping and rewards' },
      { id: 'reputation', name: 'Reputation', description: 'Reputation system' },
      { id: 'account', name: 'Account', description: 'Account settings and security' },
      { id: 'technical', name: 'Technical', description: 'Technical issues and bugs' },
    ];
  }
}

export const supportService = new SupportService();