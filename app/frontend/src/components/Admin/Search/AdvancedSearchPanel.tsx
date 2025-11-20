import React, { useState } from 'react';
import { Search, Filter, Calendar, X, Save, Trash2 } from 'lucide-react';
import { Button, GlassPanel } from '@/design-system';

export interface SearchFilters {
    query: string;
    type?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    category?: string;
    [key: string]: string | undefined;
}

interface AdvancedSearchPanelProps {
    onSearch: (filters: SearchFilters) => void;
    onClear: () => void;
    filterOptions?: {
        types?: Array<{ value: string; label: string }>;
        statuses?: Array<{ value: string; label: string }>;
        categories?: Array<{ value: string; label: string }>;
    };
    savedFilters?: SavedFilter[];
    onSaveFilter?: (name: string, filters: SearchFilters) => void;
    onDeleteFilter?: (id: string) => void;
    onLoadFilter?: (filter: SavedFilter) => void;
}

export interface SavedFilter {
    id: string;
    name: string;
    filters: SearchFilters;
    createdAt: string;
}

export function AdvancedSearchPanel({
    onSearch,
    onClear,
    filterOptions = {},
    savedFilters = [],
    onSaveFilter,
    onDeleteFilter,
    onLoadFilter,
}: AdvancedSearchPanelProps) {
    const [filters, setFilters] = useState<SearchFilters>({
        query: '',
    });
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [filterName, setFilterName] = useState('');
    const [expanded, setExpanded] = useState(false);

    const handleFilterChange = (key: string, value: string) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleSearch = () => {
        onSearch(filters);
    };

    const handleClear = () => {
        setFilters({ query: '' });
        onClear();
    };

    const handleSaveFilter = () => {
        if (filterName.trim() && onSaveFilter) {
            onSaveFilter(filterName, filters);
            setFilterName('');
            setShowSaveDialog(false);
        }
    };

    const handleLoadFilter = (filter: SavedFilter) => {
        setFilters(filter.filters);
        onSearch(filter.filters);
        if (onLoadFilter) {
            onLoadFilter(filter);
        }
    };

    const hasActiveFilters = Object.values(filters).some((v) => v && v !== '');

    return (
        <GlassPanel className="p-4 mb-4">
            {/* Main Search Bar */}
            <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={filters.query}
                        onChange={(e) => handleFilterChange('query', e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <Button
                    onClick={() => setExpanded(!expanded)}
                    variant="outline"
                    className="flex items-center gap-2"
                >
                    <Filter className="w-4 h-4" />
                    Filters
                    {hasActiveFilters && (
                        <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {Object.values(filters).filter((v) => v && v !== '').length}
                        </span>
                    )}
                </Button>
                <Button onClick={handleSearch} variant="primary">
                    Search
                </Button>
            </div>

            {/* Advanced Filters */}
            {expanded && (
                <div className="space-y-4 pt-4 border-t border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Type Filter */}
                        {filterOptions.types && (
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Type</label>
                                <select
                                    value={filters.type || ''}
                                    onChange={(e) => handleFilterChange('type', e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                                >
                                    <option value="">All Types</option>
                                    {filterOptions.types.map((type) => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Status Filter */}
                        {filterOptions.statuses && (
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Status</label>
                                <select
                                    value={filters.status || ''}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                                >
                                    <option value="">All Statuses</option>
                                    {filterOptions.statuses.map((status) => (
                                        <option key={status.value} value={status.value}>
                                            {status.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Category Filter */}
                        {filterOptions.categories && (
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Category</label>
                                <select
                                    value={filters.category || ''}
                                    onChange={(e) => handleFilterChange('category', e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                                >
                                    <option value="">All Categories</option>
                                    {filterOptions.categories.map((category) => (
                                        <option key={category.value} value={category.value}>
                                            {category.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Date From */}
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">From Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="date"
                                    value={filters.dateFrom || ''}
                                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white"
                                />
                            </div>
                        </div>

                        {/* Date To */}
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">To Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="date"
                                    value={filters.dateTo || ''}
                                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                        <div className="flex gap-2">
                            <Button onClick={handleClear} variant="outline" size="small">
                                <X className="w-4 h-4 mr-1" />
                                Clear Filters
                            </Button>
                            {onSaveFilter && hasActiveFilters && (
                                <Button
                                    onClick={() => setShowSaveDialog(true)}
                                    variant="outline"
                                    size="small"
                                >
                                    <Save className="w-4 h-4 mr-1" />
                                    Save Filter
                                </Button>
                            )}
                        </div>
                        <Button onClick={handleSearch} variant="primary" size="small">
                            Apply Filters
                        </Button>
                    </div>
                </div>
            )}

            {/* Saved Filters */}
            {savedFilters.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                    <h4 className="text-gray-400 text-sm mb-2">Saved Filters</h4>
                    <div className="flex flex-wrap gap-2">
                        {savedFilters.map((filter) => (
                            <div
                                key={filter.id}
                                className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5 border border-gray-700"
                            >
                                <button
                                    onClick={() => handleLoadFilter(filter)}
                                    className="text-white text-sm hover:text-blue-400 transition-colors"
                                >
                                    {filter.name}
                                </button>
                                {onDeleteFilter && (
                                    <button
                                        onClick={() => onDeleteFilter(filter.id)}
                                        className="text-gray-400 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Save Filter Dialog */}
            {showSaveDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <GlassPanel className="p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-white mb-4">Save Filter</h3>
                        <input
                            type="text"
                            placeholder="Filter name..."
                            value={filterName}
                            onChange={(e) => setFilterName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveFilter()}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white mb-4"
                            autoFocus
                        />
                        <div className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={handleSaveFilter}>
                                Save
                            </Button>
                        </div>
                    </GlassPanel>
                </div>
            )}
        </GlassPanel>
    );
}
