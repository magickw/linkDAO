import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fulfillmentService } from '../../services/fulfillmentService';
import { MetricsOverview } from '../../components/Fulfillment/MetricsOverview';
import { OrderQueue } from '../../components/Fulfillment/OrderQueue';
import { BulkActionsBar } from '../../components/Fulfillment/BulkActionsBar';
import { ShippingLabelModal } from '../../components/Fulfillment/ShippingLabelModal';
import { GlassPanel, Button, LoadingSkeleton } from '../../design-system';
import type { QueueType } from '../../types/fulfillment';

export default function FulfillmentDashboardPage() {
    const [activeTab, setActiveTab] = useState<QueueType>('ready_to_ship');
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    const [labelModalOpen, setLabelModalOpen] = useState(false);
    const [selectedOrderForLabel, setSelectedOrderForLabel] = useState<string | null>(null);

    // Fetch dashboard data
    const { data: dashboard, isLoading } = useQuery({
        queryKey: ['fulfillment-dashboard'],
        queryFn: () => fulfillmentService.getDashboard(),
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    // Fetch active queue
    const { data: queueOrders, isLoading: queueLoading } = useQuery({
        queryKey: ['fulfillment-queue', activeTab],
        queryFn: () => fulfillmentService.getQueue(activeTab),
        refetchInterval: 30000,
    });

    const handleSelectOrder = (orderId: string) => {
        setSelectedOrders(prev =>
            prev.includes(orderId)
                ? prev.filter(id => id !== orderId)
                : [...prev, orderId]
        );
    };

    const handleSelectAll = () => {
        if (selectedOrders.length === queueOrders?.length) {
            setSelectedOrders([]);
        } else {
            setSelectedOrders(queueOrders?.map(o => o.id) || []);
        }
    };

    const handleBulkAction = async (action: string) => {
        if (selectedOrders.length === 0) return;

        try {
            await fulfillmentService.performBulkAction(selectedOrders, action as any);
            setSelectedOrders([]);
            // Refetch data
        } catch (error) {
            console.error('Bulk action failed:', error);
        }
    };

    const handleShipOrder = (orderId: string) => {
        setSelectedOrderForLabel(orderId);
        setLabelModalOpen(true);
    };

    if (isLoading) {
        return (
            <div className="space-y-4 p-6">
                <LoadingSkeleton className="h-12 w-full" />
                <LoadingSkeleton className="h-64 w-full" />
            </div>
        );
    }

    const tabs = [
        { key: 'ready_to_ship' as QueueType, label: 'Ready to Ship', count: dashboard?.queues.readyToShip || 0, icon: '📦' },
        { key: 'overdue' as QueueType, label: 'Overdue', count: dashboard?.queues.overdue || 0, icon: '⚠️', urgent: true },
        { key: 'in_transit' as QueueType, label: 'In Transit', count: dashboard?.queues.inTransit || 0, icon: '🚚' },
        { key: 'requires_attention' as QueueType, label: 'Requires Attention', count: dashboard?.queues.requiresAttention || 0, icon: '⚡' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold text-white">
                    Fulfillment Dashboard
                </h1>
                <p className="text-gray-400">
                    Manage your orders and shipping efficiently
                </p>
            </div>

            {/* Metrics Overview */}
            <MetricsOverview metrics={dashboard?.metrics} />

            {/* Queue Tabs */}
            <GlassPanel className="p-6">
                <div className="border-b border-gray-700 mb-6">
                    <nav className="flex space-x-4">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => {
                                    setActiveTab(tab.key);
                                    setSelectedOrders([]);
                                }}
                                className={`
                                    py-3 px-4 text-center font-medium text-sm rounded-t-lg transition-colors relative
                                    ${activeTab === tab.key
                                        ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-500/10'
                                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                                    }
                                `}
                            >
                                <span className="mr-2">{tab.icon}</span>
                                {tab.label}
                                {tab.count > 0 && (
                                    <span className={`
                                        ml-2 px-2 py-0.5 rounded-full text-xs
                                        ${tab.urgent
                                            ? 'bg-red-900/50 text-red-200'
                                            : 'bg-gray-700 text-gray-300'
                                        }
                                    `}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Bulk Actions Bar */}
                {selectedOrders.length > 0 && (
                    <BulkActionsBar
                        selectedCount={selectedOrders.length}
                        onMarkShipped={() => handleBulkAction('mark_shipped')}
                        onPrintLabels={() => handleBulkAction('print_labels')}
                        onExportCSV={() => handleBulkAction('export_csv')}
                        onClear={() => setSelectedOrders([])}
                    />
                )}

                {/* Order Queue */}
                <OrderQueue
                    orders={queueOrders || []}
                    selectedOrders={selectedOrders}
                    onSelectOrder={handleSelectOrder}
                    onSelectAll={handleSelectAll}
                    onShipOrder={handleShipOrder}
                    loading={queueLoading}
                />
            </GlassPanel>

            {/* Shipping Label Modal */}
            {labelModalOpen && selectedOrderForLabel && (
                <ShippingLabelModal
                    orderId={selectedOrderForLabel}
                    onClose={() => {
                        setLabelModalOpen(false);
                        setSelectedOrderForLabel(null);
                    }}
                    onSuccess={() => {
                        setLabelModalOpen(false);
                        setSelectedOrderForLabel(null);
                        // Refetch queue
                    }}
                />
            )}
        </div>
    );
}
