import React, { useState, useEffect } from 'react';
import {
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  Calendar,
  Download,
  Search,
  RotateCcw,
  Eye
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { Button, GlassPanel } from '@/design-system';

interface ModerationAction {
  id: string;
  moderatorId: string;
  moderatorName: string;
  action: 'approve' | 'reject' | 'escalate' | 'undo';
  itemId: string;
  itemType: string;
  reason: string;
  timestamp: string;
  metadata?: {
    bulkAction?: boolean;
    previousState?: string;
    details?: any;
  };
}

export function ModerationHistory() {
  const [actions, setActions] = useState<ModerationAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    moderatorId: '',
    action: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });
  const [selectedAction, setSelectedAction] = useState<ModerationAction | null>(null);

  useEffect(() => {
    loadHistory();
  }, [filters, pagination.page]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await adminService.getModerationHistory({
        ...filters,
        page: pagination.page,
        limit: 20
      });

      setActions(response.actions || []);
      setPagination({
        page: response.page || 1,
        totalPages: response.totalPages || 1,
        total: response.total || 0
      });
    } catch (error) {
      console.error('Failed to load moderation history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = async (actionId: string) => {
    try {
      await adminService.undoModerationAction(actionId);
      loadHistory();
    } catch (error) {
      console.error('Failed to undo action:', error);
    }
  };

  const exportHistory = async () => {
    try {
      await adminService.exportModerationHistory(filters);
    } catch (error) {
      console.error('Failed to export history:', error);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approve': return CheckCircle;
      case 'reject': return XCircle;
      case 'escalate': return AlertTriangle;
      case 'undo': return RotateCcw;
      default: return Eye;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'approve': return 'text-green-400 bg-green-500/20';
      case 'reject': return 'text-red-400 bg-red-500/20';
      case 'escalate': return 'text-yellow-400 bg-yellow-500/20';
      case 'undo': return 'text-blue-400 bg-blue-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Moderation History</h2>
          <p className="text-gray-400 text-sm">Complete audit trail of all moderation actions</p>
        </div>
        <Button
          onClick={exportHistory}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <GlassPanel className="p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="text-gray-400 text-xs sm:text-sm mb-2 block">Action Type</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="">All Actions</option>
              <option value="approve">Approve</option>
              <option value="reject">Reject</option>
              <option value="escalate">Escalate</option>
              <option value="undo">Undo</option>
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-xs sm:text-sm mb-2 block">Date From</label>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs sm:text-sm mb-2 block">Date To</label>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          </div>

          <div className="sm:col-span-2 md:col-span-3">
            <label className="text-gray-400 text-xs sm:text-sm mb-2 block">Search</label>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by moderator, item ID, or reason..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* History Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4">
          <GlassPanel className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Actions ({pagination.total})</h3>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="p-4 bg-white/5 rounded-lg animate-pulse">
                    <div className="h-16 bg-white/10 rounded"></div>
                  </div>
                ))}
              </div>
            ) : actions.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No moderation actions found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {actions.map((action) => {
                  const ActionIcon = getActionIcon(action.action);
                  return (
                    <div
                      key={action.id}
                      onClick={() => setSelectedAction(action)}
                      className={`p-4 bg-white/5 rounded-lg cursor-pointer transition-colors ${
                        selectedAction?.id === action.id
                          ? 'ring-2 ring-purple-500 bg-purple-500/10'
                          : 'hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${getActionColor(action.action)}`}>
                          <ActionIcon className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-white font-medium text-sm capitalize">
                              {action.action}
                            </span>
                            <span className="text-gray-400 text-xs">by</span>
                            <span className="text-purple-400 text-sm">
                              {action.moderatorName}
                            </span>
                            {action.metadata?.bulkAction && (
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                                Bulk
                              </span>
                            )}
                          </div>
                          <p className="text-gray-300 text-xs sm:text-sm mb-1 break-words">
                            {action.reason}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimeAgo(action.timestamp)}</span>
                            <span>•</span>
                            <span>{action.itemType}</span>
                          </div>
                        </div>

                        {action.action !== 'undo' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUndo(action.id);
                            }}
                            className="flex items-center gap-1 text-xs"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Undo
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                >
                  Previous
                </Button>
                <span className="text-white px-4 py-2 text-sm">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                >
                  Next
                </Button>
              </div>
            )}
          </GlassPanel>
        </div>

        {/* Action Details */}
        <div>
          {selectedAction ? (
            <GlassPanel className="p-4 sm:p-6 sticky top-4">
              <h3 className="text-lg font-bold text-white mb-4">Action Details</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-xs">Action</label>
                  <p className="text-white capitalize">{selectedAction.action}</p>
                </div>

                <div>
                  <label className="text-gray-400 text-xs">Moderator</label>
                  <p className="text-white">{selectedAction.moderatorName}</p>
                </div>

                <div>
                  <label className="text-gray-400 text-xs">Item Type</label>
                  <p className="text-white capitalize">{selectedAction.itemType}</p>
                </div>

                <div>
                  <label className="text-gray-400 text-xs">Item ID</label>
                  <p className="text-white font-mono text-sm">{selectedAction.itemId}</p>
                </div>

                <div>
                  <label className="text-gray-400 text-xs">Reason</label>
                  <p className="text-white">{selectedAction.reason}</p>
                </div>

                <div>
                  <label className="text-gray-400 text-xs">Timestamp</label>
                  <p className="text-white">
                    {new Date(selectedAction.timestamp).toLocaleString()}
                  </p>
                </div>

                {selectedAction.metadata?.previousState && (
                  <div>
                    <label className="text-gray-400 text-xs">Previous State</label>
                    <p className="text-white">{selectedAction.metadata.previousState}</p>
                  </div>
                )}

                {selectedAction.metadata?.details && (
                  <div>
                    <label className="text-gray-400 text-xs">Additional Details</label>
                    <pre className="text-white text-xs bg-black/30 p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(selectedAction.metadata.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </GlassPanel>
          ) : (
            <GlassPanel className="p-6 text-center">
              <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">Select an action to view details</p>
            </GlassPanel>
          )}
        </div>
      </div>
    </div>
  );
}
