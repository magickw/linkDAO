import React from 'react';
import type { FulfillmentMetrics } from '../../types/fulfillment';

interface MetricsOverviewProps {
    metrics?: {
        avgTimeToShip: number;
        avgDeliveryTime: number;
        onTimeRate: number;
        totalOrders: number;
    };
}

export function MetricsOverview({ metrics }: MetricsOverviewProps) {
    if (!metrics) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                ))}
            </div>
        );
    }

    const cards = [
        {
            title: 'Avg Ship Time',
            value: `${metrics.avgTimeToShip.toFixed(1)}h`,
            subtitle: 'Hours to ship',
            icon: '⏱️',
            color: metrics.avgTimeToShip < 24 ? 'green' : metrics.avgTimeToShip < 48 ? 'yellow' : 'red',
        },
        {
            title: 'Avg Delivery',
            value: `${(metrics.avgDeliveryTime / 24).toFixed(1)}d`,
            subtitle: 'Days to deliver',
            icon: '🚚',
            color: 'blue',
        },
        {
            title: 'On-Time Rate',
            value: `${metrics.onTimeRate.toFixed(0)}%`,
            subtitle: 'Delivered on time',
            icon: '✓',
            color: metrics.onTimeRate >= 95 ? 'green' : metrics.onTimeRate >= 85 ? 'yellow' : 'red',
        },
        {
            title: 'Total Orders',
            value: metrics.totalOrders.toString(),
            subtitle: 'Last 30 days',
            icon: '📦',
            color: 'purple',
        },
    ];

    const colorClasses = {
        green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
        yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
        red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
        purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, index) => (
                <div
                    key={index}
                    className={`rounded-lg shadow p-6 border-2 ${colorClasses[card.color as keyof typeof colorClasses]}`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {card.title}
                        </h3>
                        <span className="text-2xl">{card.icon}</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {card.value}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {card.subtitle}
                    </p>
                </div>
            ))}
        </div>
    );
}
