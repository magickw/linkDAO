import React, { useState, useEffect } from 'react';
import { adminService, AdminOrderFilters } from '@/services/adminService';
import { GlassPanel, Button } from '@/design-system';
import { Input } from '@/components/ui/input';
import { Search, Filter, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { AdminOrderDetails } from './AdminOrderDetails';

interface AdminOrderListProps {
    view: 'all' | 'delayed';
}

export function AdminOrderList({ view }: AdminOrderListProps) {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

    // Pagination & Filters
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState<AdminOrderFilters>({
        limit: 10,
        search: '',
        status: ''
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
                    {/* Add more filters here if needed */}
                    <Button variant="outline"><Filter className="w-4 h-4 mr-2" /> Filter</Button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="text-left text-gray-400 border-b border-gray-700">
                            <th className="pb-3 pl-4">Order ID</th>
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
                                    <td className="py-4 pl-4"><div className="h-4 bg-gray-700 rounded w-24"></div></td>
                                    <td className="py-4"><div className="h-4 bg-gray-700 rounded w-32"></div></td>
                                    <td className="py-4"><div className="h-4 bg-gray-700 rounded w-32"></div></td>
                                    <td className="py-4"><div className="h-4 bg-gray-700 rounded w-20"></div></td>
                                    <td className="py-4"><div className="h-4 bg-gray-700 rounded w-16"></div></td>
                                    <td className="py-4 pr-4"><div className="h-8 bg-gray-700 rounded w-8"></div></td>
                                </tr>
                            ))
                        ) : orders.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-gray-500">No orders found</td>
                            </tr>
                        ) : (
                            orders.map((order) => (
                                <tr key={order.id} className="hover:bg-white/5 transition-colors">
                                    <td className="py-4 pl-4 font-mono text-sm text-gray-300">{order.id.slice(0, 8)}...</td>
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
