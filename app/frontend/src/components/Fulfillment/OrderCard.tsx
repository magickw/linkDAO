import React from 'react';
import type { OrderQueueItem } from '../../types/fulfillment';

interface OrderCardProps {
    order: OrderQueueItem;
    selected: boolean;
    onSelect: () => void;
    onShip: () => void;
}

export function OrderCard({ order, selected, onSelect, onShip }: OrderCardProps) {
    const urgencyColors = {
        low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };

    const timeAgo = (date: Date) => {
        const hours = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60));
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    return (
        <div className={`
      border-2 rounded-lg p-4 transition-all
      ${selected
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
            }
      hover:shadow-md
    `}>
            <div className="flex items-start gap-4">
                {/* Checkbox */}
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={onSelect}
                    className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />

                {/* Order Details */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Order #{order.orderNumber}
                            </h3>
                            {order.urgency === 'high' && (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${urgencyColors[order.urgency]}`}>
                                    URGENT
                                </span>
                            )}
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {timeAgo(order.createdAt)}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                            <span className="text-gray-500 dark:text-gray-400">Buyer:</span>
                            <span className="ml-2 text-gray-900 dark:text-white font-medium">
                                {order.buyerName}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                            <span className="ml-2 text-gray-900 dark:text-white font-medium">
                                ${order.amount}
                            </span>
                        </div>
                        <div className="col-span-2">
                            <span className="text-gray-500 dark:text-gray-400">Product:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">
                                {order.productName}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Action:</span>
                            <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                                {order.actionRequired}
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={onShip}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                                Ship Now
                            </button>
                            <button
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                            >
                                View Details
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
