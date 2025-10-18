import React, { useState } from 'react';
import { History, Filter, Search, Eye, Calendar } from 'lucide-react';

export const MobileModerationHistory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('7d');
  const [actionFilter, setActionFilter] = useState('all');

  // Mock data
  const historyItems = [
    {
      id: '1',
      action: 'Approved post',
      moderator: 'admin_user',
      target: 'Post by user123',
      reason: 'Content meets community guidelines',
      timestamp: new Date('2024-10-16T10:30:00'),
      type: 'approve'
    },
    {
      id: '2',
      action: 'Rejected comment',
      moderator: 'mod_jane',
      target: 'Comment by user456',
      reason: 'Inappropriate language',
      timestamp: new Date('2024-10-16T09:15:00'),
      type: 'reject'
    },
    {
      id: '3',
      action: 'Suspended user',
      moderator: 'admin_user',
      target: 'user789',
      reason: 'Repeated policy violations',
      timestamp: new Date('2024-10-15T16:45:00'),
      type: 'suspend'
    }
  ];

  const dateFilters = [
    { id: '24h', label: '24h' },
    { id: '7d', label: '7d' },
    { id: '30d', label: '30d' },
    { id: 'all', label: 'All' }
  ];

  const actionFilters = [
    { id: 'all', label: 'All Actions' },
    { id: 'approve', label: 'Approved' },
    { id: 'reject', label: 'Rejected' },
    { id: 'suspend', label: 'Suspended' }
  ];

  const getActionColor = (type: string) => {
    switch (type) {
      case 'approve': return 'bg-green-100 text-green-800';
      case 'reject': return 'bg-red-100 text-red-800';
      case 'suspend': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'approve': return '✓';
      case 'reject': return '✗';
      case 'suspend': return '⚠';
      default: return '•';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
        <input
          type="text"
          placeholder="Search moderation history..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div>
          <p className="text-white/70 text-sm mb-2">Time Period</p>
          <div className="flex space-x-2">
            {dateFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setDateFilter(filter.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === filter.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-white/70 text-sm mb-2">Action Type</p>
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {actionFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActionFilter(filter.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  actionFilter === filter.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* History Items */}
      <div className="space-y-3">
        {historyItems.map((item) => (
          <div key={item.id} className="bg-white/10 backdrop-blur-md rounded-lg p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start space-x-3 flex-1 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${getActionColor(item.type)}`}>
                  {getActionIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium">{item.action}</h3>
                  <p className="text-white/70 text-sm">by {item.moderator}</p>
                </div>
              </div>
              <button className="p-1 text-white/70 hover:text-white">
                <Eye className="w-4 h-4" />
              </button>
            </div>

            {/* Details */}
            <div className="mb-3">
              <p className="text-white/50 text-xs mb-1">Target</p>
              <p className="text-white text-sm">{item.target}</p>
            </div>

            <div className="mb-3">
              <p className="text-white/50 text-xs mb-1">Reason</p>
              <p className="text-white text-sm">{item.reason}</p>
            </div>

            {/* Timestamp */}
            <div className="flex items-center space-x-2 text-white/50 text-xs">
              <Calendar className="w-3 h-3" />
              <span>{item.timestamp.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      <button className="w-full py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">
        Load More History
      </button>

      {/* Empty State */}
      {historyItems.length === 0 && (
        <div className="text-center py-12">
          <History className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No history found</h3>
          <p className="text-white/70 text-sm">
            No moderation actions match your search criteria.
          </p>
        </div>
      )}
    </div>
  );
};