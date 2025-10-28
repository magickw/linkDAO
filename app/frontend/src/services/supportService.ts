export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
  views: number;
}

class SupportService {
  async getTickets(token: string): Promise<SupportTicket[]> {
    const response = await fetch('/api/support/tickets', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to fetch tickets');
    const data = await response.json();
    return data.data || [];
  }

  async createTicket(token: string, ticketData: {
    subject: string;
    description: string;
    category: string;
    priority: string;
  }): Promise<SupportTicket> {
    const response = await fetch('/api/support/tickets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(ticketData),
    });
    if (!response.ok) throw new Error('Failed to create ticket');
    const data = await response.json();
    return data.data;
  }

  async getFAQ(category?: string, search?: string): Promise<FAQ[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    
    const response = await fetch(`/api/support/faq?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch FAQ');
    const data = await response.json();
    return data.data || [];
  }

  async markFAQHelpful(faqId: string, helpful: boolean): Promise<void> {
    const response = await fetch(`/api/support/faq/${faqId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ helpful }),
    });
    if (!response.ok) throw new Error('Failed to submit feedback');
  }

  async initiateLiveChat(token: string, initialMessage?: string): Promise<string> {
    const response = await fetch('/api/support/chat/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ initialMessage }),
    });
    if (!response.ok) throw new Error('Failed to initiate chat');
    const data = await response.json();
    return data.data.sessionId;
  }
}

export const supportService = new SupportService();
