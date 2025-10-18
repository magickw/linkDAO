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
  MessageSquare,
  CheckSquare,
  Square,
  Trash2,
  UserCheck,
  AlertCircle,
  Save,
  Calendar,
  X,
  ChevronDown
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { ModerationQueue as ModerationQueueType } from '@/types/auth';
import { Button, GlassPanel } from '@/design-system';

interface SavedFilter {
  id: string;
  name: string;
  filters: typeof initialFilters;
}

const initialFilters = {
  type: '',
  status: 'pending',
  priority: '',
  search: '',
  dateFrom: '',
  dateTo: '',
  contentKeyword: ''
};

export function ModerationQueue() {
  const [items, setItems] = useState<ModerationQueueType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ModerationQueueType | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showSaveFilterDialog, setShowSaveFilterDialog] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [filters, setFilters] = useState(initialFilters);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });

  // Load saved filters from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('moderationFilters');
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load saved filters:', error);
      }
    }
  }, []);

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

  // Bulk action handlers
  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject' | 'escalate' | 'delete') => {
    if (selectedItems.size === 0) return;

    setBulkActionLoading(true);
    try {
      const itemIds = Array.from(selectedItems);

      // Execute bulk action on backend
      await Promise.all(
        itemIds.map(itemId =>
          action === 'delete'
            ? adminService.deleteModerationItem(itemId)
            : adminService.resolveModerationItem(itemId, {
                action,
                reason: `Bulk ${action} by admin`,
                details: { resolvedAt: new Date().toISOString(), bulkAction: true }
              })
        )
      );

      // Clear selection and refresh
      setSelectedItems(new Set());
      setShowBulkActions(false);
      loadModerationQueue();
    } catch (error) {
      console.error(`Failed to execute bulk ${action}:`, error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Filter management functions
  const saveCurrentFilter = () => {
    if (!filterName.trim()) return;

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName,
      filters: { ...filters }
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem('moderationFilters', JSON.stringify(updated));
    setFilterName('');
    setShowSaveFilterDialog(false);
  };

  const loadSavedFilter = (savedFilter: SavedFilter) => {
    setFilters(savedFilter.filters);
  };

  const deleteSavedFilter = (filterId: string) => {
    const updated = savedFilters.filter(f => f.id !== filterId);
    setSavedFilters(updated);
    localStorage.setItem('moderationFilters', JSON.stringify(updated));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
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
    <div className="space-y-4 sm:space-y-6">
      {/* Filters */}
      <GlassPanel className="p-4 sm:p-6">
        <div className="space-y-4">
          {/* Basic Filters Row */}
          <div className="flex flex-wrap gap-3 sm:gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-white font-medium text-sm sm:text-base">Filters:</span>
            </div>

            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-white text-sm sm:text-base"
            >
              <option value="">All Types</option>
              <option value="post">Posts</option>
              <option value="user_report">User Reports</option>
              <option value="seller_application">Seller Applications</option>
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-white text-sm sm:text-base"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_review">In Review</option>
              <option value="escalated">Escalated</option>
            </select>

            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-white text-sm sm:text-base"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <div className="flex items-center gap-2 flex-1 min-w-[150px] sm:min-w-[200px]">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-white flex-1 text-sm sm:text-base"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant={showBulkActions ? "primary" : "outline"}
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="flex items-center gap-2 text-sm"
              >
                <CheckSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Bulk Actions</span>
              </Button>

              <Button
                variant={showAdvancedFilters ? "primary" : "outline"}
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center gap-2 text-sm"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                <span className="hidden sm:inline">Advanced</span>
              </Button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="space-y-4 p-4 bg-white/5 rounded-lg border border-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date Range */}
                <div>
                  <label className="text-gray-400 text-xs sm:text-sm mb-2 block">Date From</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-2 sm:px-3 py-1.5 text-white flex-1 text-sm"
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
                      className="bg-gray-800 border border-gray-700 rounded-lg px-2 sm:px-3 py-1.5 text-white flex-1 text-sm"
                    />
                  </div>
                </div>

                {/* Content Keyword Search */}
                <div className="sm:col-span-2">
                  <label className="text-gray-400 text-xs sm:text-sm mb-2 block">Content Keyword</label>
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search in content..."
                      value={filters.contentKeyword}
                      onChange={(e) => setFilters({ ...filters, contentKeyword: e.target.value })}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-2 sm:px-3 py-1.5 text-white flex-1 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="small"
                    onClick={clearFilters}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Clear All
                  </Button>

                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => setShowSaveFilterDialog(true)}
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Filter
                  </Button>
                </div>

                {/* Saved Filters Dropdown */}
                {savedFilters.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs sm:text-sm">Saved:</span>
                    <select
                      onChange={(e) => {
                        const filter = savedFilters.find(f => f.id === e.target.value);
                        if (filter) loadSavedFilter(filter);
                      }}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-white text-xs sm:text-sm"
                    >
                      <option value="">Load saved filter...</option>
                      {savedFilters.map(filter => (
                        <option key={filter.id} value={filter.id}>{filter.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Saved Filters List */}
              {savedFilters.length > 0 && (
                <div className="space-y-2">
                  <span className="text-gray-400 text-xs">Your Saved Filters:</span>
                  <div className="flex flex-wrap gap-2">
                    {savedFilters.map(filter => (
                      <div
                        key={filter.id}
                        className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded-lg text-sm"
                      >
                        <button
                          onClick={() => loadSavedFilter(filter)}
                          className="text-white hover:text-purple-400"
                        >
                          {filter.name}
                        </button>
                        <button
                          onClick={() => deleteSavedFilter(filter.id)}
                          className="text-gray-400 hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Save Filter Dialog */}
          {showSaveFilterDialog && (
            <div className="p-4 bg-purple-500/20 border border-purple-500/50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Save className="w-4 h-4 text-purple-400" />
                <span className="text-white font-medium text-sm">Save Current Filter</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Filter name..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && saveCurrentFilter()}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white flex-1 text-sm"
                  autoFocus
                />
                <Button
                  variant="primary"
                  size="small"
                  onClick={saveCurrentFilter}
                  disabled={!filterName.trim()}
                >
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => {
                    setShowSaveFilterDialog(false);
                    setFilterName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </GlassPanel>

      {/* Bulk Actions Toolbar */}
      {showBulkActions && selectedItems.size > 0 && (
        <GlassPanel className="p-4 bg-purple-500/20 border-purple-500/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-purple-400" />
              <span className="text-white font-medium text-sm sm:text-base">
                {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button
                onClick={() => handleBulkAction('approve')}
                disabled={bulkActionLoading}
                variant="primary"
                size="small"
                className="flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Approve All
              </Button>
              <Button
                onClick={() => handleBulkAction('reject')}
                disabled={bulkActionLoading}
                variant="outline"
                size="small"
                className="flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Reject All
              </Button>
              <Button
                onClick={() => handleBulkAction('escalate')}
                disabled={bulkActionLoading}
                variant="outline"
                size="small"
                className="flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Escalate All
              </Button>
              <Button
                onClick={() => handleBulkAction('delete')}
                disabled={bulkActionLoading}
                variant="outline"
                size="small"
                className="flex items-center gap-2 text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
                Delete All
              </Button>
            </div>
          </div>
        </GlassPanel>
      )}

      {/* Queue Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Moderation Queue ({pagination.total})
            </h2>
            {showBulkActions && items.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm"
              >
                {selectedItems.size === items.length ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Select All</span>
              </button>
            )}
          </div>

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
                const isSelected = selectedItems.has(item.id);
                return (
                  <GlassPanel
                    key={item.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedItem?.id === item.id ? 'ring-2 ring-purple-500' :
                      isSelected ? 'ring-2 ring-blue-500 bg-blue-500/10' :
                      'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Selection Checkbox */}
                      {showBulkActions && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleItemSelection(item.id);
                          }}
                          className="mt-1 flex-shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-blue-400" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400 hover:text-gray-300" />
                          )}
                        </button>
                      )}

                      {/* Item Content */}
                      <div className="flex-1 min-w-0" onClick={() => setSelectedItem(item)}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <TypeIcon className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-white font-medium capitalize text-sm sm:text-base">
                                  {item.type.replace('_', ' ')}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                                  {item.priority}
                                </span>
                              </div>
                              <p className="text-gray-300 text-xs sm:text-sm mb-2 break-words">{item.reason}</p>
                              <p className="text-gray-400 text-[10px] sm:text-xs">
                                Reported {new Date(item.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                              item.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              item.status === 'in_review' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {item.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
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