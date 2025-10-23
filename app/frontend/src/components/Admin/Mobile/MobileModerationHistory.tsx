import React, { useState, useEffect } from 'react';
import { History, Filter, Search, Eye, Calendar, AlertTriangle } from 'lucide-react';
import { adminService } from '@/services/adminService';
import { AdminAction } from '@/types/auth';

export const MobileModerationHistory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('7d');
  const [actionFilter, setActionFilter] = useState('all');
  const [historyItems, setHistoryItems] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getAuditLog({});
      setHistoryItems(response.actions);
    } catch (err) {
      console.error('Failed to load history:', err);
      setError('Failed to load moderation history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
          <div className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg animate-pulse"></div>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <div>
            <p className="text-white/70 text-sm mb-2">Time Period</p>
            <div className="flex space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="px-3 py-1.5 rounded-lg bg-white/10 animate-pulse"></div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-white/70 text-sm mb-2">Action Type</p>
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="px-3 py-1.5 rounded-lg bg-white/10 animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>

        {/* History Items */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/10 backdrop-blur-md rounded-lg p-4 animate-pulse">
              <div className="h-24 bg-white/20 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={loadHistory}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

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
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${getActionColor(item.action)}`}>
                  {getActionIcon(item.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium">{item.description}</h3>
                  <p className="text-white/70 text-sm">by {item.adminId}</p>
                </div>
              </div>
              <button className="p-1 text-white/70 hover:text-white">
                <Eye className="w-4 h-4" />
              </button>
            </div>

            {/* Details */}
            <div className="mb-3">
              <p className="text-white/50 text-xs mb-1">Target</p>
              <p className="text-white text-sm">{item.targetType}: {item.targetId}</p>
            </div>

            <div className="mb-3">
              <p className="text-white/50 text-xs mb-1">Reason</p>
              <p className="text-white text-sm">{item.metadata?.reason || 'No reason provided'}</p>
            </div>

            {/* Timestamp */}
            <div className="flex items-center space-x-2 text-white/50 text-xs">
              <Calendar className="w-3 h-3" />
              <span>{new Date(item.timestamp).toLocaleString()}</span>
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