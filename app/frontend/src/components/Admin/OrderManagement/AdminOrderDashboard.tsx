import React, { useState, useEffect } from 'react';
import { Package, Truck, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { adminService, AdminOrderMetrics } from '@/services/adminService';
import { GlassPanel, Button } from '@/design-system';
import { AdminOrderList } from './AdminOrderList';
import { OrderStatisticsCharts } from './OrderStatisticsCharts';

export function AdminOrderDashboard() {
    const [metrics, setMetrics] = useState<AdminOrderMetrics | null>(null);
    const [delayedOrdersCount, setDelayedOrdersCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [activeView, setActiveView] = useState<'all' | 'delayed'>('all');
    const [performanceMetrics, setPerformanceMetrics] = useState({
        avgProcessingTime: 0,
        fulfillmentRate: 0
    });

    useEffect(() => {
        loadMetrics();
        loadDelayedOrdersCount();
        
        // Auto-refresh every 30 seconds if enabled
        let refreshInterval: NodeJS.Timeout;
        if (autoRefresh) {
            refreshInterval = setInterval(() => {
                loadMetrics();
                loadDelayedOrdersCount();
            }, 30000);
        }

        return () => {
            if (refreshInterval) clearInterval(refreshInterval);
        };
    }, [autoRefresh]);

    const loadMetrics = async () => {
        try {
            setLoading(true);
            const data = await adminService.getOrderMetrics();
            setMetrics(data);
            setLastUpdated(new Date());
            calculatePerformanceMetrics();
        } catch (error) {
            console.error('Failed to load order metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadDelayedOrdersCount = async () => {
        try {
            const delayedOrders = await adminService.getDelayedOrders();
            setDelayedOrdersCount(delayedOrders.length);
        } catch (error) {
            console.error('Failed to load delayed orders count:', error);
        }
    };

    const handleManualRefresh = async () => {
        setRefreshing(true);
        await Promise.all([loadMetrics(), loadDelayedOrdersCount()]);
        setRefreshing(false);
    };

    const getTimeSinceUpdate = () => {
        if (!lastUpdated) return 'Never';
        const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        return `${Math.floor(seconds / 3600)}h ago`;
    };

    const calculatePerformanceMetrics = () => {
        if (!metrics || metrics.totalOrders === 0) {
            setPerformanceMetrics({ avgProcessingTime: 0, fulfillmentRate: 0 });
            return;
        }

        // Calculate fulfillment rate (completed orders / total orders)
        const completedOrders = metrics.ordersByStatus?.completed || 0;
        const fulfillmentRate = (completedOrders / metrics.totalOrders) * 100;

        // For avg processing time, we'll use a mock value for now
        // In a real app, this would come from the order timeline data
        const avgProcessingTime = 2.5; // Mock value in days

        setPerformanceMetrics({
            avgProcessingTime,
            fulfillmentRate
        });
    };

    const StatCard = ({ title, value, icon: Icon, color }: any) => (
        <GlassPanel className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-400 text-sm">{title}</p>
                    <p className="text-2xl font-bold text-white mt-1">{value}</p>
                </div>
                <div className={`p-3 rounded-lg ${color}`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
        </GlassPanel>
    );

    return (
        <div className="space-y-6">
            {/* Refresh Controls */}
            <GlassPanel className="p-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleManualRefresh}
                            disabled={refreshing}
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="auto-refresh"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="rounded border-gray-600 bg-white/10 text-blue-500 focus:ring-blue-500"
                            />
                            <label htmlFor="auto-refresh" className="text-sm text-gray-300">
                                Auto-refresh (30s)
                            </label>
                        </div>
                        <span className="text-xs text-gray-500">
                            Last updated: {getTimeSinceUpdate()}
                        </span>
                    </div>
                </div>
            </GlassPanel>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard
                    title="Total Orders"
                    value={metrics?.totalOrders.toLocaleString() || '0'}
                    icon={Package}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Total Revenue"
                    value={`$${(metrics?.totalRevenue || 0).toLocaleString()}`}
                    icon={Truck}
                    color="bg-green-500"
                />
                <StatCard
                    title="Avg. Order Value"
                    value={`$${(metrics?.averageOrderValue || 0).toFixed(2)}`}
                    icon={Clock}
                    color="bg-purple-500"
                />
                <StatCard
                    title="Delayed Orders"
                    value={delayedOrdersCount.toLocaleString()}
                    icon={AlertTriangle}
                    color="bg-red-500"
                />
                <StatCard
                    title="Avg. Processing Time"
                    value={`${performanceMetrics.avgProcessingTime.toFixed(1)} days`}
                    icon={Clock}
                    color="bg-orange-500"
                />
                <StatCard
                    title="Fulfillment Rate"
                    value={`${performanceMetrics.fulfillmentRate.toFixed(1)}%`}
                    icon={Package}
                    color="bg-teal-500"
                />
            </div>

            {/* Order Statistics Charts */}
            <OrderStatisticsCharts refreshTrigger={lastUpdated?.getTime()} />

            {/* View Toggle */}
            <div className="flex items-center gap-4">
                <Button
                    variant={activeView === 'all' ? 'primary' : 'outline'}
                    onClick={() => setActiveView('all')}
                >
                    All Orders
                </Button>
                <Button
                    variant={activeView === 'delayed' ? 'primary' : 'outline'}
                    onClick={() => setActiveView('delayed')}
                >
                    Delayed Orders
                </Button>
            </div>

            {/* Order List */}
            <AdminOrderList view={activeView} />
        </div>
    );
}
