import React, { useState, useEffect } from 'react';
import { AlertTriangle, MessageSquare, FileText, Clock, CheckCircle } from 'lucide-react';
import { adminService } from '@/services/adminService';
import { DisputeCase } from '@/types/auth';

export const MobileDisputeResolution: React.FC = () => {
  const [filter, setFilter] = useState('open');
  const [disputes, setDisputes] = useState<DisputeCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getDisputes({});
      setDisputes(response.disputes);
    } catch (err) {
      console.error('Failed to load disputes:', err);
      setError('Failed to load disputes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filters = [
    { id: 'open', label: 'Open', count: disputes.filter(d => d.status === 'open').length },
    { id: 'investigating', label: 'Investigating', count: disputes.filter(d => d.status === 'investigating').length },
    { id: 'resolved', label: 'Resolved', count: disputes.filter(d => d.status === 'resolved').length },
    { id: 'escalated', label: 'Escalated', count: disputes.filter(d => d.status === 'escalated').length }
  ];

  const handleAction = async (disputeId: string, action: string) => {
    try {
      switch (action) {
        case 'view':
          console.log(`Viewing details for dispute ${disputeId}`);
          break;
        case 'resolve':
          // In a real implementation, you would call the resolve API
          console.log(`Resolving dispute ${disputeId}`);
          break;
        default:
          console.log(`Action ${action} on dispute ${disputeId}`);
      }
    } catch (err) {
      console.error(`Failed to perform action ${action} on dispute ${disputeId}:`, err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'investigating': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'escalated': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Filter Tabs */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="px-3 py-1.5 rounded-full bg-white/10 animate-pulse"></div>
          ))}
        </div>

        {/* Disputes List */}
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white/10 backdrop-blur-md rounded-lg p-4 animate-pulse">
              <div className="h-32 bg-white/20 rounded"></div>
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
          onClick={loadDisputes}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {filters.map((filterItem) => (
          <button
            key={filterItem.id}
            onClick={() => setFilter(filterItem.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === filterItem.id
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {filterItem.label} ({filterItem.count})
          </button>
        ))}
      </div>

      {/* Disputes List */}
      <div className="space-y-3">
        {disputes.map((dispute) => (
          <div key={dispute.id} className="bg-white/10 backdrop-blur-md rounded-lg p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${getPriorityColor(dispute.priority || 'medium')}`}></div>
                  <h3 className="text-white font-medium truncate">{dispute.title}</h3>
                </div>
                <p className="text-white/70 text-sm">
                  {dispute.buyer} vs {dispute.seller}
                </p>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(dispute.status)}`}>
                {dispute.status.toUpperCase()}
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-white/50 text-xs">Amount</p>
                <p className="text-white text-sm font-medium">${dispute.amount}</p>
              </div>
              <div>
                <p className="text-white/50 text-xs">Priority</p>
                <p className="text-white text-sm capitalize">{dispute.priority || 'medium'}</p>
              </div>
              <div>
                <p className="text-white/50 text-xs">Created</p>
                <p className="text-white text-sm">{new Date(dispute.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-white/50 text-xs">Last Update</p>
                <p className="text-white text-sm">{new Date(dispute.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Messages Indicator */}
            <div className="flex items-center space-x-2 mb-3">
              <MessageSquare className="w-4 h-4 text-white/50" />
              <span className="text-white/70 text-sm">{dispute.messageCount || 0} messages</span>
              {dispute.messageCount && dispute.messageCount > 0 && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={() => handleAction(dispute.id, 'view')}
                className="flex-1 flex items-center justify-center space-x-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>View Details</span>
              </button>
              <button
                onClick={() => handleAction(dispute.id, 'resolve')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {disputes.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No disputes</h3>
          <p className="text-white/70 text-sm">
            No disputes in this category. Great job!
          </p>
        </div>
      )}
    </div>
  );
};