import React, { useState, useEffect } from 'react';
import { Shield, Eye, Check, X, Flag, MoreVertical, AlertTriangle } from 'lucide-react';
import { SwipeableCard, PullToRefresh, TouchOptimizedButton } from './TouchInteractions';
import { adminService } from '@/services/adminService';
import { ModerationQueue } from '@/types/auth';

interface MobileModerationQueueProps {
  onRefresh?: () => void;
}

export const MobileModerationQueue: React.FC<MobileModerationQueueProps> = ({
  onRefresh
}) => {
  const [filter, setFilter] = useState('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [moderationItems, setModerationItems] = useState<ModerationQueue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadModerationItems();
  }, []);

  const loadModerationItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getModerationQueue({});
      setModerationItems(response.items);
    } catch (err) {
      console.error('Failed to load moderation items:', err);
      setError('Failed to load moderation items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      const response = await adminService.getModerationQueue({});
      setModerationItems(response.items);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to refresh moderation items:', err);
      setError('Failed to refresh moderation items.');
    }
  };

  const filters = [
    { id: 'all', label: 'All', count: moderationItems.length },
    { id: 'high', label: 'High Priority', count: moderationItems.filter(item => item.priority === 'high').length },
    { id: 'medium', label: 'Medium', count: moderationItems.filter(item => item.priority === 'medium').length },
    { id: 'low', label: 'Low', count: moderationItems.filter(item => item.priority === 'low').length }
  ];

  const handleAction = async (itemId: string, action: 'approve' | 'reject' | 'escalate' | 'view') => {
    try {
      switch (action) {
        case 'approve':
          await adminService.resolveModerationItem(itemId, {
            action: 'approve',
            reason: 'Approved by admin'
          });
          // Remove item from list after approval
          setModerationItems(prev => prev.filter(item => item.id !== itemId));
          break;
        case 'reject':
          await adminService.resolveModerationItem(itemId, {
            action: 'reject',
            reason: 'Rejected by admin'
          });
          // Remove item from list after rejection
          setModerationItems(prev => prev.filter(item => item.id !== itemId));
          break;
        case 'escalate':
          await adminService.resolveModerationItem(itemId, {
            action: 'escalate',
            reason: 'Escalated by admin'
          });
          // Remove item from list after escalation
          setModerationItems(prev => prev.filter(item => item.id !== itemId));
          break;
        case 'view':
          console.log(`Viewing details for item ${itemId}`);
          break;
        default:
          console.log(`Unknown action ${action} on item ${itemId}`);
      }
    } catch (err) {
      console.error(`Failed to perform action ${action} on item ${itemId}:`, err);
    }
  };

  const toggleSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
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

        {/* Moderation Items */}
        <div className="space-y-3">
          {[1, 2].map((i) => (
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
        <h3 className="text-lg font-medium text-white mb-2">Error Loading Items</h3>
        <p className="text-white/70 text-sm mb-4">{error}</p>
        <TouchOptimizedButton onClick={loadModerationItems} variant="primary">
          Try Again
        </TouchOptimizedButton>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4">
        {/* Filter Tabs */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {filters.map((filterItem) => (
            <TouchOptimizedButton
              key={filterItem.id}
              onClick={() => setFilter(filterItem.id)}
              variant={filter === filterItem.id ? 'primary' : 'ghost'}
              size="small"
              className="whitespace-nowrap"
            >
              {filterItem.label} ({filterItem.count})
            </TouchOptimizedButton>
          ))}
        </div>

        {/* Bulk Actions */}
        {selectedItems.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm">
                {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex space-x-2">
                <TouchOptimizedButton variant="primary" size="small">
                  Approve All
                </TouchOptimizedButton>
                <TouchOptimizedButton variant="danger" size="small">
                  Reject All
                </TouchOptimizedButton>
              </div>
            </div>
          </div>
        )}

        {/* Moderation Items */}
        <div className="space-y-3">
          {moderationItems.map((item) => (
            <SwipeableCard
              key={item.id}
              leftActions={[
                {
                  id: 'approve',
                  label: 'Approve',
                  icon: Check,
                  color: 'text-white',
                  backgroundColor: 'bg-green-500',
                  onAction: () => handleAction(item.id, 'approve')
                }
              ]}
              rightActions={[
                {
                  id: 'reject',
                  label: 'Reject',
                  icon: X,
                  color: 'text-white',
                  backgroundColor: 'bg-red-500',
                  onAction: () => handleAction(item.id, 'reject')
                },
                {
                  id: 'flag',
                  label: 'Flag',
                  icon: Flag,
                  color: 'text-white',
                  backgroundColor: 'bg-orange-500',
                  onAction: () => handleAction(item.id, 'escalate')
                }
              ]}
              onSwipe={(direction, actionId) => {
                console.log(`Swiped ${direction} with action ${actionId} on item ${item.id}`);
              }}
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => toggleSelection(item.id)}
                      className="rounded border-gray-300"
                    />
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      item.priority === 'high' ? 'bg-red-100 text-red-800' :
                      item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.priority.toUpperCase()}
                    </div>
                    <span className="text-white/70 text-xs">{item.type}</span>
                  </div>
                  <button className="p-1 text-white/70 hover:text-white">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="mb-3">
                  <p className="text-white text-sm mb-2 line-clamp-3">
                    {item.description || 'No description available'}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-white/70">
                    <span>By: {item.reportedBy || 'Unknown'}</span>
                    <span>Reason: {item.reason || 'No reason provided'}</span>
                    <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <TouchOptimizedButton
                    onClick={() => handleAction(item.id, 'approve')}
                    variant="primary"
                    size="small"
                    className="flex-1"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </TouchOptimizedButton>
                  <TouchOptimizedButton
                    onClick={() => handleAction(item.id, 'reject')}
                    variant="danger"
                    size="small"
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </TouchOptimizedButton>
                  <TouchOptimizedButton
                    onClick={() => handleAction(item.id, 'view')}
                    variant="ghost"
                    size="small"
                  >
                    <Eye className="w-4 h-4" />
                  </TouchOptimizedButton>
                </div>
              </div>
            </SwipeableCard>
          ))}
        </div>

        {/* Empty State */}
        {moderationItems.length === 0 && (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-white/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No items to review</h3>
            <p className="text-white/70 text-sm">
              All content has been reviewed. Great job!
            </p>
          </div>
        )}

        <style jsx>{`
          .line-clamp-3 {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        `}</style>
      </div>
    </PullToRefresh>
  );
};