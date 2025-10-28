import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: Date;
}

interface TicketListProps {
  tickets: Ticket[];
  onTicketClick: (id: string) => void;
}

export const TicketList: React.FC<TicketListProps> = ({ tickets, onTicketClick }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const totalPages = Math.ceil(tickets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTickets = tickets.slice(startIndex, endIndex);

  return (
    <div>
      <div className="space-y-4">
        {currentTickets.map((ticket) => (
          <div
            key={ticket.id}
            onClick={() => onTicketClick(ticket.id)}
            className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
          >
            <h3 className="font-semibold">{ticket.subject}</h3>
            <div className="flex gap-2 mt-2">
              <span className="text-xs px-2 py-1 rounded bg-gray-100">{ticket.status}</span>
              <span className="text-xs px-2 py-1 rounded bg-gray-100">{ticket.priority}</span>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center px-4 py-2 border rounded disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </button>
          
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center px-4 py-2 border rounded disabled:opacity-50"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      )}
    </div>
  );
};
