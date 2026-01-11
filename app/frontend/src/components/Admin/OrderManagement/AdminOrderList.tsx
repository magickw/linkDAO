import React, { useState, useEffect } from 'react';
import { adminService, AdminOrderFilters } from '@/services/adminService';
import { GlassPanel, Button } from '@/design-system';
import { Input } from '@/components/ui/input';
import { Search, Filter, ChevronLeft, ChevronRight, Eye, ChevronDown, Calendar, DollarSign, X, Download } from 'lucide-react';
import { AdminOrderDetails } from './AdminOrderDetails';

interface AdminOrderListProps {
    view: 'all' | 'delayed';
}

export function AdminOrderList({ view }: AdminOrderListProps) {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);

    // Pagination & Filters
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState<AdminOrderFilters>({
        limit: 10,
        search: '',
        status: '',
        startDate: undefined,
        endDate: undefined,
        minAmount: undefined,
        maxAmount: undefined,
        paymentMethod: ''
    });

    useEffect(() => {
        loadOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view, page, filters]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            if (view === 'delayed') {
                const delayed = await adminService.getDelayedOrders();
                setOrders(delayed);
                setTotalPages(1); // Delayed endpoint doesn't support pagination yet
            } else {
                const result = await adminService.getOrders({ ...filters, page });
                setOrders(result.orders);
                setTotalPages(result.totalPages);
            }
        } catch (error) {
            console.error('Failed to load orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        loadOrders();
    };

    const exportToCSV = () => {
        // Define CSV headers
        const headers = ['Order ID', 'Date', 'Customer', 'Status', 'Total Amount', 'Payment Method'];
        
        // Convert orders to CSV rows
        const csvRows = [
            headers.join(','),
            ...orders.map(order => [
                order.id,
                new Date(order.createdAt).toLocaleDateString(),
                order.buyerId || 'N/A',
                order.status,
                order.totalAmount || 0,
                order.paymentMethod || 'N/A'
            ].join(','))
        ];

        // Create CSV content
        const csvContent = csvRows.join('\n');
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `orders_${view}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const clearFilters = () => {
        setFilters({
            limit: 10,
            search: '',
            status: '',
            startDate: undefined,
            endDate: undefined,
            minAmount: undefined,
            maxAmount: undefined,
            paymentMethod: ''
        });
        setPage(1);
    };

    const hasActiveFilters = filters.status || filters.startDate || filters.endDate || 
                              filters.minAmount || filters.maxAmount || filters.paymentMethod;

    const handleSelectOrder = (orderId: string) => {
        setSelectedOrders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(orderId)) {
                newSet.delete(orderId);
            } else {
                newSet.add(orderId);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (selectedOrders.size === orders.length) {
            setSelectedOrders(new Set());
        } else {
            setSelectedOrders(new Set(orders.map(order => order.id)));
        }
    };

    const handleBulkAction = async (action: string) => {
        if (selectedOrders.size === 0) return;
        
        const confirmMessage = action === 'cancel' 
            ? `Are you sure you want to cancel ${selectedOrders.size} order(s)?`
            : `Are you sure you want to ${action} ${selectedOrders.size} order(s)?`;
        
        if (!confirm(confirmMessage)) return;

        setBulkActionLoading(true);
        try {
            const promises = Array.from(selectedOrders).map(orderId =>
                adminService.performAdminAction(orderId, action, `Bulk ${action} action`, 'Performed via admin dashboard')
            );
            
            await Promise.all(promises);
            
            // Refresh orders
            loadOrders();
            setSelectedOrders(new Set());
            setShowBulkActions(false);
            
            alert(`Successfully ${action}ed ${selectedOrders.size} order(s)`);
        } catch (error) {
            console.error('Bulk action failed:', error);
            alert('Failed to perform bulk action. Please try again.');
        } finally {
            setBulkActionLoading(false);
        }
    };

    if (selectedOrderId) {
        return (
            <div>
                <Button variant="ghost" onClick={() => setSelectedOrderId(null)} className="mb-4">
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back to list
                </Button>
                <AdminOrderDetails orderId={selectedOrderId} onBack={() => setSelectedOrderId(null)} />
            </div>
        );
    }

    return (
        <GlassPanel className="p-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                <form onSubmit={handleSearch} className="flex gap-2 flex-1">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Search by order ID, seller..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="pl-10"
                        />
                    </div>
                    <Button type="submit">Search</Button>
                </form>

                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className={showAdvancedFilters ? 'bg-white/10' : ''}
                    >
                        <Filter className="w-4 h-4 mr-2" />
                        Advanced Filters
                        <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={exportToCSV}
                        disabled={orders.length === 0}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </Button>
                    {hasActiveFilters && (
                        <Button variant="ghost" onClick={clearFilters}>
                            <X className="w-4 h-4 mr-2" />
                            Clear
                        </Button>
                    )}
                </div>
            </div>

            {/* Advanced Filters Panel */}
            {showAdvancedFilters && (
                <GlassPanel className="p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="paid">Paid</option>
                                <option value="processing">Processing</option>
                                <option value="shipped">Shipped</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="refunded">Refunded</option>
                                <option value="disputed">Disputed</option>
                            </select>
                        </div>

                        {/* Payment Method Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Payment Method</label>
                            <select
                                value={filters.paymentMethod}
                                onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Methods</option>
                                <option value="crypto">Crypto</option>
                                <option value="fiat">Fiat (Card)</option>
                                <option value="escrow">Escrow</option>
                            </select>
                        </div>

                        {/* Date Range Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Date Range</label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Input
                                        type="date"
                                        value={filters.startDate || ''}
                                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })}
                                        className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex-1">
                                    <Input
                                        type="date"
                                        value={filters.endDate || ''}
                                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value || undefined })}
                                        className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Amount Range Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Amount Range</label>
                            <div className="flex gap-2 items-center">
                                <div className="relative flex-1">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <Input
                                        type="number"
                                        placeholder="Min"
                                        value={filters.minAmount || ''}
                                        onChange={(e) => setFilters({ ...filters, minAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
                                        className="pl-8 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <span className="text-gray-400">-</span>
                                <div className="relative flex-1">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <Input
                                        type="number"
                                        placeholder="Max"
                                        value={filters.maxAmount || ''}
                                        onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
                                        className="pl-8 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={clearFilters}>
                            Clear All Filters
                        </Button>
                        <Button onClick={() => { setPage(1); loadOrders(); }}>
                            Apply Filters
                        </Button>
                    </div>
                </GlassPanel>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                {/* Bulk Actions Bar */}
                {selectedOrders.size > 0 && (
                    <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="text-white font-medium">{selectedOrders.size} order(s) selected</span>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedOrders(new Set())}>
                                Clear selection
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                value=""
                                onChange={(e) => {
                                    if (e.target.value) {
                                        handleBulkAction(e.target.value);
                                        e.target.value = '';
                                    }
                                }}
                                disabled={bulkActionLoading}
                                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Bulk Actions</option>
                                <option value="cancel">Cancel Orders</option>
                                <option value="mark_processing">Mark as Processing</option>
                                <option value="mark_shipped">Mark as Shipped</option>
                                <option value="mark_completed">Mark as Completed</option>
                            </select>
                        </div>
                    </div>
                )}

                <table className="w-full">
                    <thead>
                        <tr className="text-left text-gray-400 border-b border-gray-700">
                            <th className="pb-3 pl-4 w-12">
                                <input
                                    type="checkbox"
                                    checked={selectedOrders.size === orders.length && orders.length > 0}
                                    onChange={handleSelectAll}
                                    className="rounded border-gray-600 bg-white/10 text-blue-500 focus:ring-blue-500"
                                />
                            </th>
                            <th className="pb-3">Order ID</th>
                            <th className="pb-3">Date</th>
                            <th className="pb-3">Customer</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3">Total</th>
                            <th className="pb-3 pr-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {loading ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="py-4 pl-4"><div className="h-4 bg-gray-700 rounded w-4"></div></td>
                                    <td className="py-4"><div className="h-4 bg-gray-700 rounded w-24"></div></td>
                                    <td className="py-4"><div className="h-4 bg-gray-700 rounded w-32"></div></td>
                                    <td className="py-4"><div className="h-4 bg-gray-700 rounded w-32"></div></td>
                                    <td className="py-4"><div className="h-4 bg-gray-700 rounded w-20"></div></td>
                                    <td className="py-4"><div className="h-4 bg-gray-700 rounded w-16"></div></td>
                                    <td className="py-4 pr-4"><div className="h-8 bg-gray-700 rounded w-8"></div></td>
                                </tr>
                            ))
                        ) : orders.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-8 text-center text-gray-500">No orders found</td>
                            </tr>
                        ) : (
                            orders.map((order) => (
                                <tr key={order.id} className="hover:bg-white/5 transition-colors">
                                    <td className="py-4 pl-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedOrders.has(order.id)}
                                            onChange={() => handleSelectOrder(order.id)}
                                            className="rounded border-gray-600 bg-white/10 text-blue-500 focus:ring-blue-500"
                                        />
                                    </td>
                                    <td className="py-4 font-mono text-sm text-gray-300">{order.id.slice(0, 8)}...</td>
                                    <td className="py-4 text-sm text-gray-300">
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="py-4 text-sm text-gray-300">{order.buyerId?.slice(0, 6)}...</td>
                                    <td className="py-4">
                                        <span className={`px-2 py-1 text-xs rounded-full ${order.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                                            order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                                                order.status === 'cancelled' ? 'bg-red-500/20 text-red-300' :
                                                    'bg-blue-500/20 text-blue-300'
                                            }`}>
                                            {order.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="py-4 text-sm font-medium text-white">
                                        ${order.totalAmount?.toLocaleString()}
                                    </td>
                                    <td className="py-4 pr-4">
                                        <Button size="sm" variant="ghost" onClick={() => setSelectedOrderId(order.id)}>
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                    <Button
                        variant="outline"
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-gray-400 text-sm">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        disabled={page === totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            )}
        </GlassPanel>
    );
}
