import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert } from '../ui/alert';

interface SupportTicket {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  userEmail: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  tags: string[];
}

interface SupportTicketDashboardProps {
  userEmail?: string;
  isAdmin?: boolean;
}

export const SupportTicketDashboard: React.FC<SupportTicketDashboardProps> = ({
  userEmail,
  isAdmin = false
}) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    priority: '',
    status: ''
  });

  useEffect(() => {
    fetchTickets();
  }, [userEmail, isAdmin, searchQuery, filters]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = '/api/support/tickets';
      const params = new URLSearchParams();

      if (isAdmin) {
        // Admin can search all tickets
        if (searchQuery) params.append('q', searchQuery);
        if (filters.category) params.append('category', filters.category);
        if (filters.priority) params.append('priority', filters.priority);
        if (filters.status) params.append('status', filters.status);
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
      } else if (userEmail) {
        // Regular users can only see their own tickets
        url = `/api/support/tickets/user/${encodeURIComponent(userEmail)}`;
      } else {
        throw new Error('User email is required for non-admin users');
      }

      const response = await fetch(url);
      const result = await response.json();

      if (response.ok && result.success) {
        setTickets(result.tickets || []);
      } else {
        throw new Error(result.error || 'Failed to fetch tickets');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Update the ticket in the local state
        setTickets(prev => prev.map(ticket => 
          ticket.id === ticketId 
            ? { ...ticket, status, updatedAt: result.ticket.updatedAt }
            : ticket
        ));
      } else {
        throw new Error(result.error || 'Failed to update ticket');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ticket');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'waiting': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading tickets...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {isAdmin ? 'Support Ticket Management' : 'My Support Tickets'}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50 text-red-800">
              {error}
            </Alert>
          )}

          {isAdmin && (
            <div className="mb-6 space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  <option value="general">General</option>
                  <option value="technical">Technical</option>
                  <option value="account">Account</option>
                  <option value="payment">Payment</option>
                  <option value="security">Security</option>
                </select>

                <select
                  value={filters.priority}
                  onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>

                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting">Waiting</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          )}

          {tickets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {isAdmin ? 'No tickets found matching your criteria.' : 'You have no support tickets yet.'}
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <Card key={ticket.id} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium text-gray-900">{ticket.title}</h3>
                          <Badge className={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                          <Badge className={getStatusColor(ticket.status)}>
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Ticket ID: {ticket.id}</p>
                          {isAdmin && <p>User: {ticket.userEmail}</p>}
                          <p>Category: {ticket.category}</p>
                          <p>Created: {formatDate(ticket.createdAt)}</p>
                          <p>Updated: {formatDate(ticket.updatedAt)}</p>
                          {ticket.resolvedAt && (
                            <p>Resolved: {formatDate(ticket.resolvedAt)}</p>
                          )}
                        </div>

                        {ticket.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {ticket.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {isAdmin && (
                        <div className="ml-4 space-y-2">
                          {ticket.status === 'open' && (
                            <Button
                              size="small"
                              onClick={() => updateTicketStatus(ticket.id, 'in_progress')}
                              className="w-full"
                            >
                              Start Work
                            </Button>
                          )}
                          {ticket.status === 'in_progress' && (
                            <Button
                              size="small"
                              onClick={() => updateTicketStatus(ticket.id, 'resolved')}
                              className="w-full bg-green-600 hover:bg-green-700"
                            >
                              Resolve
                            </Button>
                          )}
                          {ticket.status === 'resolved' && (
                            <Button
                              size="small"
                              onClick={() => updateTicketStatus(ticket.id, 'closed')}
                              className="w-full bg-gray-600 hover:bg-gray-700"
                            >
                              Close
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};