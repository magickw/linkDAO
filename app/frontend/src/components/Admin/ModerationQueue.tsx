import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock,
  Filter,
  Search,
  User,
  MessageSquare
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { ModerationQueue as ModerationQueueType } from '@/types/auth';
import { Button, GlassPanel } from '@/design-system';

export function ModerationQueue() {
  const [items, setItems] = useState<ModerationQueueType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ModerationQueueType | null>(null);
  const [filters, setFilters] = useState({
    type: '',
    status: 'pending',
    priority: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });

  useEffect(() => {
    loadModerationQueue();
  }, [filters, pagination.page]);

  const loadModerationQueue = async () => {
    try {
      setLoading(true);
      const response = await adminService.getModerationQueue({
        ...filters,
        page: pagination.page,
        limit: 20
      });
      
      setItems(response.items);
      setPagination({
        page: response.page,
        totalPages: response.totalPages,
        total: response.total
      });
    } catch (error) {
      console.error('Failed to load moderation queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (itemId: string, action: 'approve' | 'reject' | 'escalate', reason: string) => {
    try {
      await adminService.resolveModerationItem(itemId, {
        action,
        reason,
        details: { resolvedAt: new Date().toISOString() }
      });
      
      // Refresh the queue
      loadModerationQueue();
      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to resolve moderation item:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400 bg-red-500/20';
      case 'high': return 'text-orange-400 bg-orange-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'post': return MessageSquare;
      case 'user_report': return User;
      case 'seller_application': return Shield;
      default: return AlertTriangle;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <GlassPanel className="p-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-white font-medium">Filters:</span>
          </div>
          
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          >
            <option value="">All Types</option>
            <option value="post">Posts</option>
            <option value="user_report">User Reports</option>
            <option value="seller_application">Seller Applications</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_review">In Review</option>
            <option value="escalated">Escalated</option>
          </select>

          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white flex-1"
            />
          </div>
        </div>
      </GlassPanel>

      {/* Queue Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Moderation Queue ({pagination.total})</h2>
          
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <GlassPanel key={i} className="p-4 animate-pulse">
                  <div className="h-20 bg-white/10 rounded"></div>
                </GlassPanel>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const TypeIcon = getTypeIcon(item.type);
                return (
                  <GlassPanel
                    key={item.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedItem?.id === item.id ? 'ring-2 ring-purple-500' : 'hover:bg-white/5'
                    }`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <TypeIcon className="w-5 h-5 text-gray-400 mt-1" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-medium capitalize">
                              {item.type.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                              {item.priority}
                            </span>
                          </div>
                          <p className="text-gray-300 text-sm mb-2">{item.reason}</p>
                          <p className="text-gray-400 text-xs">
                            Reported {new Date(item.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          item.status === 'in_review' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </GlassPanel>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                disabled={pagination.page === 1}
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              >
                Previous
              </Button>
              <span className="text-white px-4 py-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Item Details */}
        <div>
          {selectedItem ? (
            <GlassPanel className="p-6 sticky top-4">
              <h3 className="text-lg font-bold text-white mb-4">Review Item</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm">Type</label>
                  <p className="text-white capitalize">{selectedItem.type.replace('_', ' ')}</p>
                </div>
                
                <div>
                  <label className="text-gray-400 text-sm">Priority</label>
                  <p className="text-white capitalize">{selectedItem.priority}</p>
                </div>
                
                <div>
                  <label className="text-gray-400 text-sm">Reason</label>
                  <p className="text-white">{selectedItem.reason}</p>
                </div>
                
                {selectedItem.description && (
                  <div>
                    <label className="text-gray-400 text-sm">Description</label>
                    <p className="text-white">{selectedItem.description}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-gray-400 text-sm">Reported</label>
                  <p className="text-white">{new Date(selectedItem.createdAt).toLocaleString()}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => handleResolve(selectedItem.id, 'approve', 'Approved by admin')}
                    variant="primary"
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleResolve(selectedItem.id, 'reject', 'Rejected by admin')}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleResolve(selectedItem.id, 'escalate', 'Escalated for review')}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Escalate
                  </Button>
                </div>
              </div>
            </GlassPanel>
          ) : (
            <GlassPanel className="p-6 text-center">
              <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">Select an item to review</p>
            </GlassPanel>
          )}
        </div>
      </div>
    </div>
  );
}