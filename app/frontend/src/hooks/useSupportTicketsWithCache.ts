import useSWR from 'swr';
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

const fetcher = async (url: string, token: string) => {
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch');
  const data = await response.json();
  return data.data || [];
};

export const useSupportTicketsWithCache = () => {
  const { user } = useAuth();
  
  const { data, error, mutate, isLoading } = useSWR(
    user ? ['/api/support/tickets', user.address] : null,
    ([url, token]) => fetcher(url, token),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minute
    }
  );

  const createTicket = async (ticketData: any) => {
    const response = await fetch('/api/support/tickets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user?.address}`,
      },
      body: JSON.stringify(ticketData),
    });
    
    if (!response.ok) throw new Error('Failed to create ticket');
    
    const result = await response.json();
    mutate([result.data, ...(data || [])], false);
    return result.data;
  };

  return {
    tickets: data || [],
    loading: isLoading,
    error,
    createTicket,
    refresh: mutate,
  };
};
