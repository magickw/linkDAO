import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fulfillmentService } from '../../services/fulfillmentService';
import { MetricsOverview } from '../../components/Fulfillment/MetricsOverview';
import { OrderQueue } from '../../components/Fulfillment/OrderQueue';
import { BulkActionsBar } from '../../components/Fulfillment/BulkActionsBar';
import { ShippingLabelModal } from '../../components/Fulfillment/ShippingLabelModal';
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
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Fulfillment Dashboard
                    </h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Manage your orders and shipping efficiently
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Metrics Overview */}
                <MetricsOverview metrics={dashboard?.metrics} />

                {/* Queue Tabs */}
                <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <nav className="flex -mb-px">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => {
                                        setActiveTab(tab.key);
                                        setSelectedOrders([]);
                                    }}
                                    className={`
                    flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm
                    ${activeTab === tab.key
                                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                        }
                    ${tab.urgent && tab.count > 0 ? 'animate-pulse' : ''}
                  `}
                                >
                                    <span className="mr-2">{tab.icon}</span>
                                    {tab.label}
                                    {tab.count > 0 && (
                                        <span className={`
                      ml-2 px-2 py-1 rounded-full text-xs
                      ${tab.urgent
                                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
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
                    <div className="p-6">
                        <OrderQueue
                            orders={queueOrders || []}
                            selectedOrders={selectedOrders}
                            onSelectOrder={handleSelectOrder}
                            onSelectAll={handleSelectAll}
                            onShipOrder={handleShipOrder}
                            loading={queueLoading}
                        />
                    </div>
                </div>
            </div>

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
