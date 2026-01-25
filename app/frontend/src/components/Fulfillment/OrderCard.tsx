import React from 'react';
import type { OrderQueueItem } from '../../types/fulfillment';
import { GlassPanel, Button } from '../../design-system';

interface OrderCardProps {
    order: OrderQueueItem;
    selected: boolean;
    onSelect: () => void;
    onShip: () => void;
}

export function OrderCard({ order, selected, onSelect, onShip }: OrderCardProps) {
    const urgencyColors = {
        low: 'bg-green-900/50 text-green-200 border border-green-800',
        medium: 'bg-yellow-900/50 text-yellow-200 border border-yellow-800',
        high: 'bg-red-900/50 text-red-200 border border-red-800',
    };

    const timeAgo = (date: Date) => {
        const hours = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60));
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    return (
        <GlassPanel className={`
            p-4 transition-all border
            ${selected
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-transparent hover:border-gray-600'
            }
        `}>
            <div className="flex items-start gap-4">
                {/* Checkbox */}
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={onSelect}
                    className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-600 bg-gray-700 focus:ring-blue-500"
                />

                {/* Order Details */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-white">
                                Order #{order.orderNumber}
                            </h3>
                            {order.urgency === 'high' && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${urgencyColors[order.urgency]}`}>
                                    URGENT
                                </span>
                            )}
                        </div>
                        <span className="text-sm text-gray-400">
                            {timeAgo(order.createdAt)}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                            <span className="text-gray-400">Buyer:</span>
                            <span className="ml-2 text-white font-medium">
                                {order.buyerName}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-400">Amount:</span>
                            <span className="ml-2 text-white font-medium">
                                ${order.amount}
                            </span>
                        </div>
                        <div className="col-span-2">
                            <span className="text-gray-400">Product:</span>
                            <span className="ml-2 text-white">
                                {order.productName}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                        <div className="text-sm">
                            <span className="text-gray-400">Action:</span>
                            <span className="ml-2 text-blue-400 font-medium">
                                {order.actionRequired}
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={onShip}
                                variant="primary"
                                size="sm"
                            >
                                Ship Now
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                            >
                                View Details
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </GlassPanel>
    );
}
