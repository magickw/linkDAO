import React, { useState } from 'react';
import { Shield, Eye, Check, X, Flag, MoreVertical } from 'lucide-react';
import { SwipeableCard, PullToRefresh, TouchOptimizedButton } from './TouchInteractions';

interface MobileModerationQueueProps {
  onRefresh?: () => void;
}

export const MobileModerationQueue: React.FC<MobileModerationQueueProps> = ({
  onRefresh
}) => {
  const [filter, setFilter] = useState('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Mock data - replace with actual API call
  const moderationItems = [
    {
      id: '1',
      type: 'post',
      content: 'This is a sample post that needs moderation review...',
      author: 'user123',
      reportReason: 'Spam',
      priority: 'high',
      timestamp: new Date(),
      status: 'pending'
    },
    {
      id: '2',
      type: 'comment',
      content: 'Sample comment content here',
      author: 'user456',
      reportReason: 'Inappropriate content',
      priority: 'medium',
      timestamp: new Date(),
      status: 'pending'
    }
  ];

  const filters = [
    { id: 'all', label: 'All', count: moderationItems.length },
    { id: 'high', label: 'High Priority', count: 1 },
    { id: 'medium', label: 'Medium', count: 1 },
    { id: 'low', label: 'Low', count: 0 }
  ];

  const handleAction = (itemId: string, action: 'approve' | 'reject' | 'escalate' | 'view') => {
    console.log(`Action ${action} on item ${itemId}`);
    // TODO: Implement actual moderation actions
  };

  const toggleSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  return (
    <PullToRefresh onRefresh={onRefresh || (() => Promise.resolve())}>
      <div className="space-y-4">
        {/* Filter Tabs */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {filters.map((filterItem) => (
            <TouchOptimizedButton
              key={filterItem.id}
              onClick={() => setFilter(filterItem.id)}
              variant={filter === filterItem.id ? 'primary' : 'ghost'}
              size="sm"
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
                <TouchOptimizedButton variant="primary" size="sm">
                  Approve All
                </TouchOptimizedButton>
                <TouchOptimizedButton variant="danger" size="sm">
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
                    {item.content}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-white/70">
                    <span>By: {item.author}</span>
                    <span>Reason: {item.reportReason}</span>
                    <span>{item.timestamp.toLocaleTimeString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <TouchOptimizedButton
                    onClick={() => handleAction(item.id, 'approve')}
                    variant="primary"
                    size="sm"
                    className="flex-1"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </TouchOptimizedButton>
                  <TouchOptimizedButton
                    onClick={() => handleAction(item.id, 'reject')}
                    variant="danger"
                    size="sm"
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </TouchOptimizedButton>
                  <TouchOptimizedButton
                    onClick={() => handleAction(item.id, 'view')}
                    variant="ghost"
                    size="sm"
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