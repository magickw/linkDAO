import React from 'react';
import type { FulfillmentMetrics } from '../../types/fulfillment';
import { GlassPanel } from '../../design-system';

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
                    <GlassPanel key={i} className="p-6 animate-pulse">
                        <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
                        <div className="h-8 bg-gray-700 rounded w-1/2"></div>
                    </GlassPanel>
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
        green: 'border-green-500/30 bg-green-500/10 text-green-400',
        yellow: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
        red: 'border-red-500/30 bg-red-500/10 text-red-400',
        blue: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
        purple: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, index) => (
                <GlassPanel
                    key={index}
                    className={`p-6 border ${colorClasses[card.color as keyof typeof colorClasses].split(' ')[0]}`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-400">
                            {card.title}
                        </h3>
                        <span className="text-2xl">{card.icon}</span>
                    </div>
                    <p className={`text-3xl font-bold ${colorClasses[card.color as keyof typeof colorClasses].split(' ').pop()}`}>
                        {card.value}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        {card.subtitle}
                    </p>
                </GlassPanel>
            ))}
        </div>
    );
}
