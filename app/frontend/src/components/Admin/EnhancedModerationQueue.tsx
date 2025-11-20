import React, { useState, useEffect } from 'react';
import { Shield, Clock, User, MessageSquare } from 'lucide-react';
import { GlassPanel, Button } from '@/design-system';
import { BulkActionsToolbar, SelectableRow, SelectAllCheckbox, BulkAction } from './BulkOperations/BulkActionsToolbar';
import { AdvancedSearchPanel, SearchFilters, SavedFilter } from './Search/AdvancedSearchPanel';
import { ExportButton } from './Export/ExportButton';

interface ModerationItem {
    id: string;
    type: 'post' | 'comment' | 'user';
    content: string;
    author: string;
    reportedBy: string;
    reason: string;
    timestamp: string;
    status: 'pending' | 'approved' | 'rejected';
}

export function EnhancedModerationQueue() {
    const [items, setItems] = useState<ModerationItem[]>([]);
    const [filteredItems, setFilteredItems] = useState<ModerationItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

    useEffect(() => {
        loadModerationItems();
        loadSavedFilters();
    }, []);

    const loadModerationItems = async () => {
        try {
            // Simulated API call - replace with actual API
            const mockItems: ModerationItem[] = [
                {
                    id: '1',
                    type: 'post',
                    content: 'This is a flagged post content...',
                    author: 'user123',
                    reportedBy: 'user456',
                    reason: 'Spam',
                    timestamp: new Date().toISOString(),
                    status: 'pending',
                },
                {
                    id: '2',
                    type: 'comment',
                    content: 'Inappropriate comment...',
                    author: 'user789',
                    reportedBy: 'user101',
                    reason: 'Harassment',
                    timestamp: new Date().toISOString(),
                    status: 'pending',
                },
                // Add more mock items as needed
            ];

            setItems(mockItems);
            setFilteredItems(mockItems);
        } catch (error) {
            console.error('Failed to load moderation items:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadSavedFilters = () => {
        const saved = localStorage.getItem('moderationFilters');
        if (saved) {
            setSavedFilters(JSON.parse(saved));
        }
    };

    const handleSearch = (filters: SearchFilters) => {
        let filtered = [...items];

        if (filters.query) {
            filtered = filtered.filter(
                (item) =>
                    item.content.toLowerCase().includes(filters.query.toLowerCase()) ||
                    item.author.toLowerCase().includes(filters.query.toLowerCase())
            );
        }

        if (filters.type) {
            filtered = filtered.filter((item) => item.type === filters.type);
        }

        if (filters.status) {
            filtered = filtered.filter((item) => item.status === filters.status);
        }

        if (filters.dateFrom) {
            filtered = filtered.filter((item) => new Date(item.timestamp) >= new Date(filters.dateFrom!));
        }

        if (filters.dateTo) {
            filtered = filtered.filter((item) => new Date(item.timestamp) <= new Date(filters.dateTo!));
        }

        setFilteredItems(filtered);
    };

    const handleClearSearch = () => {
        setFilteredItems(items);
    };

    const handleSaveFilter = (name: string, filters: SearchFilters) => {
        const newFilter: SavedFilter = {
            id: Date.now().toString(),
            name,
            filters,
            createdAt: new Date().toISOString(),
        };

        const updated = [...savedFilters, newFilter];
        setSavedFilters(updated);
        localStorage.setItem('moderationFilters', JSON.stringify(updated));
    };

    const handleDeleteFilter = (id: string) => {
        const updated = savedFilters.filter((f) => f.id !== id);
        setSavedFilters(updated);
        localStorage.setItem('moderationFilters', JSON.stringify(updated));
    };

    const handleSelect = (id: string, selected: boolean) => {
        const newSelected = new Set(selectedIds);
        if (selected) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = (selected: boolean) => {
        if (selected) {
            setSelectedIds(new Set(filteredItems.map((item) => item.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleBulkAction = async (action: BulkAction) => {
        const selectedItems = filteredItems.filter((item) => selectedIds.has(item.id));

        try {
            // Simulated API call - replace with actual API
            console.log(`Performing ${action} on ${selectedItems.length} items`);

            // Update local state
            if (action === 'approve') {
                setItems((prev) =>
                    prev.map((item) =>
                        selectedIds.has(item.id) ? { ...item, status: 'approved' as const } : item
                    )
                );
            } else if (action === 'reject') {
                setItems((prev) =>
                    prev.map((item) =>
                        selectedIds.has(item.id) ? { ...item, status: 'rejected' as const } : item
                    )
                );
            } else if (action === 'delete') {
                setItems((prev) => prev.filter((item) => !selectedIds.has(item.id)));
                setFilteredItems((prev) => prev.filter((item) => !selectedIds.has(item.id)));
            }

            // Clear selection
            setSelectedIds(new Set());
        } catch (error) {
            console.error('Bulk action failed:', error);
        }
    };

    const handleClearSelection = () => {
        setSelectedIds(new Set());
    };

    const exportColumns = [
        { key: 'id', label: 'ID' },
        { key: 'type', label: 'Type' },
        { key: 'content', label: 'Content' },
        { key: 'author', label: 'Author' },
        { key: 'reportedBy', label: 'Reported By' },
        { key: 'reason', label: 'Reason' },
        { key: 'timestamp', label: 'Timestamp' },
        { key: 'status', label: 'Status' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Shield className="w-6 h-6" />
                        Moderation Queue
                    </h2>
                    <p className="text-gray-400 mt-1">
                        {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} pending review
                    </p>
                </div>
                <ExportButton
                    data={filteredItems}
                    filename="moderation-queue"
                    columns={exportColumns}
                />
            </div>

            {/* Advanced Search */}
            <AdvancedSearchPanel
                onSearch={handleSearch}
                onClear={handleClearSearch}
                filterOptions={{
                    types: [
                        { value: 'post', label: 'Posts' },
                        { value: 'comment', label: 'Comments' },
                        { value: 'user', label: 'Users' },
                    ],
                    statuses: [
                        { value: 'pending', label: 'Pending' },
                        { value: 'approved', label: 'Approved' },
                        { value: 'rejected', label: 'Rejected' },
                    ],
                }}
                savedFilters={savedFilters}
                onSaveFilter={handleSaveFilter}
                onDeleteFilter={handleDeleteFilter}
            />

            {/* Bulk Actions Toolbar */}
            <BulkActionsToolbar
                selectedCount={selectedIds.size}
                onAction={handleBulkAction}
                onClear={handleClearSelection}
                availableActions={['approve', 'reject', 'delete', 'flag']}
            />

            {/* Items List */}
            <GlassPanel className="p-6">
                {/* Select All */}
                <div className="mb-4 pb-4 border-b border-gray-700">
                    <SelectAllCheckbox
                        totalCount={filteredItems.length}
                        selectedCount={selectedIds.size}
                        onSelectAll={handleSelectAll}
                    />
                </div>

                {/* Items */}
                {loading ? (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="animate-pulse bg-white/5 rounded-lg h-24"></div>
                        ))}
                    </div>
                ) : filteredItems.length > 0 ? (
                    <div className="space-y-3">
                        {filteredItems.map((item) => (
                            <SelectableRow
                                key={item.id}
                                id={item.id}
                                selected={selectedIds.has(item.id)}
                                onSelect={handleSelect}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${item.type === 'post' ? 'bg-blue-900/50 text-blue-300' :
                                                    item.type === 'comment' ? 'bg-purple-900/50 text-purple-300' :
                                                        'bg-gray-900/50 text-gray-300'
                                                }`}>
                                                {item.type}
                                            </span>
                                            <span className="text-gray-400 text-sm flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                {item.author}
                                            </span>
                                            <span className="text-gray-400 text-sm flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(item.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-white mb-2">{item.content}</p>
                                        <div className="flex items-center gap-4 text-sm">
                                            <span className="text-gray-400">
                                                Reported by: <span className="text-white">{item.reportedBy}</span>
                                            </span>
                                            <span className="text-gray-400">
                                                Reason: <span className="text-yellow-400">{item.reason}</span>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <Button
                                            variant="primary"
                                            size="small"
                                            onClick={() => handleBulkAction('approve')}
                                        >
                                            Approve
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="small"
                                            onClick={() => handleBulkAction('reject')}
                                        >
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            </SelectableRow>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400">No items found</p>
                    </div>
                )}
            </GlassPanel>
        </div>
    );
}
