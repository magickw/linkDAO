import React, { useState, useEffect } from 'react';
import { Package, Truck, AlertTriangle, Clock } from 'lucide-react';
import { adminService, AdminOrderMetrics } from '@/services/adminService';
import { GlassPanel, Button } from '@/design-system';
import { AdminOrderList } from './AdminOrderList';

export function AdminOrderDashboard() {
    const [metrics, setMetrics] = useState<AdminOrderMetrics | null>(null);
    const [delayedOrdersCount, setDelayedOrdersCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<'all' | 'delayed'>('all');

    useEffect(() => {
        loadMetrics();
        loadDelayedOrdersCount();
    }, []);

    const loadMetrics = async () => {
        try {
            setLoading(true);
            const data = await adminService.getOrderMetrics();
            setMetrics(data);
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
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            </div>

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
