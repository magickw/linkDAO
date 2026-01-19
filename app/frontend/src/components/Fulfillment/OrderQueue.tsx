import React from 'react';
import { OrderCard } from './OrderCard';
import type { OrderQueueItem } from '../../types/fulfillment';

interface OrderQueueProps {
    orders: OrderQueueItem[];
    selectedOrders: string[];
    onSelectOrder: (orderId: string) => void;
    onSelectAll: () => void;
    onShipOrder: (orderId: string) => void;
    loading?: boolean;
}

export function OrderQueue({
    orders,
    selectedOrders,
    onSelectOrder,
    onSelectAll,
    onShipOrder,
    loading
}: OrderQueueProps) {
    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-gray-100 dark:bg-gray-700 rounded-lg h-32 animate-pulse"></div>
                ))}
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No orders in this queue
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                    All caught up! Check back later.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Select All */}
            <div className="flex items-center px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                <input
                    type="checkbox"
                    checked={selectedOrders.length === orders.length}
                    onChange={onSelectAll}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                    Select all ({orders.length})
                </label>
            </div>

            {/* Order List */}
            {orders.map((order) => (
                <OrderCard
                    key={order.id}
                    order={order}
                    selected={selectedOrders.includes(order.id)}
                    onSelect={() => onSelectOrder(order.id)}
                    onShip={() => onShipOrder(order.id)}
                />
            ))}
        </div>
    );
}
