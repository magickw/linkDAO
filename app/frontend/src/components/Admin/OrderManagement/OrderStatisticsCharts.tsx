import React, { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { GlassPanel } from '@/design-system';
import { TrendingUp, PieChart } from 'lucide-react';

interface OrderStatisticsChartsProps {
    refreshTrigger?: number;
}

export function OrderStatisticsCharts({ refreshTrigger }: OrderStatisticsChartsProps) {
    const [revenueData, setRevenueData] = useState<{ date: string; revenue: number; orders: number }[]>([]);
    const [statusData, setStatusData] = useState<{ status: string; count: number; percentage: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStatistics();
    }, [refreshTrigger]);

    const loadStatistics = async () => {
        try {
            setLoading(true);
            // Get metrics which include orders by status
            const metrics = await adminService.getOrderMetrics();
            
            // Transform status data for pie chart
            const statusArray = Object.entries(metrics.ordersByStatus || {}).map(([status, count]) => ({
                status,
                count: count as number,
                percentage: ((count as number) / metrics.totalOrders) * 100
            }));
            setStatusData(statusArray);

            // Generate mock revenue data for the last 7 days
            // In a real app, this would come from an API endpoint
            const mockRevenueData = generateMockRevenueData();
            setRevenueData(mockRevenueData);
        } catch (error) {
            console.error('Failed to load order statistics:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateMockRevenueData = () => {
        const data = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const revenue = Math.floor(Math.random() * 5000) + 1000;
            const orders = Math.floor(Math.random() * 20) + 5;
            data.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                revenue,
                orders
            });
        }
        return data;
    };

    const maxRevenue = Math.max(...revenueData.map(d => d.revenue));

    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GlassPanel className="p-6">
                    <div className="animate-pulse">
                        <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
                        <div className="h-64 bg-gray-700 rounded"></div>
                    </div>
                </GlassPanel>
                <GlassPanel className="p-6">
                    <div className="animate-pulse">
                        <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
                        <div className="h-64 bg-gray-700 rounded"></div>
                    </div>
                </GlassPanel>
            </div>
        );
    }

    const statusColors: Record<string, string> = {
        pending: 'bg-yellow-500',
        paid: 'bg-blue-500',
        processing: 'bg-purple-500',
        shipped: 'bg-indigo-500',
        completed: 'bg-green-500',
        cancelled: 'bg-red-500',
        refunded: 'bg-orange-500',
        disputed: 'bg-pink-500'
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Over Time Chart */}
            <GlassPanel className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-white">Revenue Over Time</h3>
                        <p className="text-sm text-gray-400">Last 7 days</p>
                    </div>
                    <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <div className="h-64">
                    <div className="flex items-end justify-between h-full gap-2">
                        {revenueData.map((data, index) => (
                            <div key={index} className="flex-1 flex flex-col items-center">
                                <div className="w-full relative">
                                    <div
                                        className="bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all duration-300 hover:from-blue-500 hover:to-blue-300"
                                        style={{
                                            height: `${(data.revenue / maxRevenue) * 100}%`,
                                            minHeight: '20px'
                                        }}
                                    />
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity whitespace-nowrap">
                                        ${data.revenue.toLocaleString()}
                                    </div>
                                </div>
                                <div className="text-xs text-gray-400 mt-2 text-center">
                                    {data.date}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex justify-center gap-6 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gradient-to-t from-blue-600 to-blue-400 rounded"></div>
                        <span className="text-gray-400">Revenue</span>
                    </div>
                </div>
            </GlassPanel>

            {/* Orders by Status Chart */}
            <GlassPanel className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-white">Orders by Status</h3>
                        <p className="text-sm text-gray-400">Current distribution</p>
                    </div>
                    <PieChart className="w-5 h-5 text-purple-400" />
                </div>
                <div className="h-64">
                    {statusData.length > 0 ? (
                        <div className="space-y-3">
                            {statusData.map((item, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <div className="w-24 text-sm text-gray-300 capitalize">{item.status}</div>
                                    <div className="flex-1 h-6 bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${statusColors[item.status] || 'bg-gray-500'} transition-all duration-300`}
                                            style={{ width: `${item.percentage}%` }}
                                        />
                                    </div>
                                    <div className="w-20 text-right">
                                        <span className="text-sm text-white font-medium">{item.count}</span>
                                        <span className="text-xs text-gray-400 ml-1">({item.percentage.toFixed(1)}%)</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            No order data available
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap gap-3 mt-4">
                    {Object.entries(statusColors).map(([status, color]) => (
                        <div key={status} className="flex items-center gap-1">
                            <div className={`w-3 h-3 ${color} rounded`}></div>
                            <span className="text-xs text-gray-400 capitalize">{status}</span>
                        </div>
                    ))}
                </div>
            </GlassPanel>
        </div>
    );
}