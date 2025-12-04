/**
 * Community Health Metrics Component
 * Displays daily/weekly community statistics and trends
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Users, MessageSquare, Vote, Coins } from 'lucide-react';
import MiniSparkline from './MiniSparkline';

interface Metric {
    label: string;
    value: number;
    change: number;
    trend: number[];
    icon: React.ReactNode;
    color: string;
}

interface CommunityHealthMetricsProps {
    communityId?: string;
    timeRange?: 'day' | 'week' | 'month';
    className?: string;
    compact?: boolean;
}

export const CommunityHealthMetrics: React.FC<CommunityHealthMetricsProps> = ({
    communityId,
    timeRange = 'week',
    className = '',
    compact = false
}) => {
    const [metrics, setMetrics] = useState<Metric[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock data for demonstration - replace with actual API call
        const mockMetrics: Metric[] = [
            {
                label: 'New Posts',
                value: 142,
                change: 12.5,
                trend: [120, 125, 130, 135, 138, 140, 142],
                icon: <MessageSquare className="w-4 h-4" />,
                color: 'text-blue-600'
            },
            {
                label: 'New Members',
                value: 89,
                change: 8.3,
                trend: [75, 78, 80, 82, 85, 87, 89],
                icon: <Users className="w-4 h-4" />,
                color: 'text-green-600'
            },
            {
                label: 'Voting Participation',
                value: 67,
                change: -3.2,
                trend: [72, 71, 70, 69, 68, 67, 67],
                icon: <Vote className="w-4 h-4" />,
                color: 'text-purple-600'
            },
            {
                label: 'Token Staking Rate',
                value: 45,
                change: 5.7,
                trend: [40, 41, 42, 43, 44, 44, 45],
                icon: <Coins className="w-4 h-4" />,
                color: 'text-orange-600'
            }
        ];

        setTimeout(() => {
            setMetrics(mockMetrics);
            setLoading(false);
        }, 500);
    }, [communityId, timeRange]);

    const formatValue = (label: string, value: number): string => {
        if (label.includes('Rate') || label.includes('Participation')) {
            return `${value}%`;
        }
        return value.toString();
    };

    if (loading) {
        return (
            <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse ${className}`}>
                <div className="space-y-3">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40" />
                    <div className="grid grid-cols-2 gap-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (compact) {
        return (
            <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Community Health
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    {metrics.slice(0, 2).map((metric) => (
                        <div key={metric.label}>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                {metric.label}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                    {formatValue(metric.label, metric.value)}
                                </span>
                                <span className={`text-xs font-medium ${metric.change >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {metric.change >= 0 ? '+' : ''}{metric.change}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Community Health
                    </h3>
                    <select
                        value={timeRange}
                        className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                        <option value="day">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                    </select>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {metrics.map((metric) => (
                    <div
                        key={metric.label}
                        className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className={`${metric.color}`}>
                                    {metric.icon}
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {metric.label}
                                </span>
                            </div>
                            <div className={`flex items-center gap-1 text-sm font-semibold ${metric.change >= 0
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}>
                                {metric.change >= 0 ? (
                                    <TrendingUp className="w-4 h-4" />
                                ) : (
                                    <TrendingDown className="w-4 h-4" />
                                )}
                                {Math.abs(metric.change)}%
                            </div>
                        </div>

                        <div className="flex items-end justify-between">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatValue(metric.label, metric.value)}
                            </div>
                            <MiniSparkline
                                data={metric.trend}
                                width={80}
                                height={40}
                                color={metric.change >= 0 ? '#10b981' : '#ef4444'}
                                strokeWidth={2}
                                showArea={true}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Summary */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                        Overall community growth
                    </span>
                    <span className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        +8.2% this {timeRange}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default CommunityHealthMetrics;
