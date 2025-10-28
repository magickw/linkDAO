import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

export const useSupportTickets = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/support/tickets', {
        headers: {
          'Authorization': `Bearer ${user.address}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch tickets');
      
      const data = await response.json();
      setTickets(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createTicket = useCallback(async (ticketData: {
    subject: string;
    description: string;
    category: string;
    priority: string;
    attachments?: string[];
  }) => {
    if (!user) throw new Error('Authentication required');
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.address}`,
        },
        body: JSON.stringify(ticketData),
      });
      
      if (!response.ok) throw new Error('Failed to create ticket');
      
      const data = await response.json();
      setTickets(prev => [data.data, ...prev]);
      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create ticket';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    tickets,
    loading,
    error,
    fetchTickets,
    createTicket,
  };
};
