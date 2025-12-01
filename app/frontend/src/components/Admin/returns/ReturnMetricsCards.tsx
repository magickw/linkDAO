import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpIcon, ArrowDownIcon, ClockIcon, CurrencyDollarIcon, InboxIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { RealtimeMetrics } from '../../services/returnAnalyticsService';

interface ReturnMetricsCardsProps {
    metrics: RealtimeMetrics | null;
    isLoading: boolean;
}

export const ReturnMetricsCards: React.FC<ReturnMetricsCardsProps> = ({ metrics, isLoading }) => {
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    if (isLoading || !metrics) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-gray-800/50 rounded-xl p-6 h-32 animate-pulse" />
                ))}
            </div>
        );
    }

    const cards = [
        {
            title: 'Active Returns',
            value: metrics.activeReturns,
            change: metrics.returnsPerMinute > 0 ? `+${metrics.returnsPerMinute.toFixed(1)}/min` : 'Stable',
            trend: metrics.returnsPerMinute > 0 ? 'up' : 'neutral',
            icon: InboxIcon,
            color: 'text-blue-400',
            bg: 'bg-blue-400/10',
        },
        {
            title: 'Pending Approval',
            value: metrics.pendingApproval,
            change: 'Requires Action',
            trend: metrics.pendingApproval > 5 ? 'down' : 'neutral', // 'down' here means bad/warning
            icon: ClockIcon,
            color: 'text-yellow-400',
            bg: 'bg-yellow-400/10',
        },
        {
            title: 'Pending Refund',
            value: metrics.pendingRefund,
            change: `${metrics.refundProcessingQueueDepth} in queue`,
            trend: 'neutral',
            icon: CurrencyDollarIcon,
            color: 'text-green-400',
            bg: 'bg-green-400/10',
        },
        {
            title: 'Issues / Alerts',
            value: metrics.manualReviewQueueDepth,
            change: metrics.volumeSpikeDetected ? 'Volume Spike Detected' : 'Normal Operation',
            trend: metrics.volumeSpikeDetected ? 'down' : 'up',
            icon: ExclamationTriangleIcon,
            color: 'text-red-400',
            bg: 'bg-red-400/10',
        },
    ];

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
            {cards.map((card, index) => (
                <motion.div
                    key={index}
                    variants={item}
                    className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6 hover:border-gray-600 transition-colors"
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-gray-400 text-sm font-medium mb-1">{card.title}</p>
                            <h3 className="text-3xl font-bold text-white mb-2">{card.value}</h3>
                            <div className="flex items-center space-x-2">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${card.trend === 'up' ? 'bg-green-400/10 text-green-400' :
                                        card.trend === 'down' ? 'bg-red-400/10 text-red-400' :
                                            'bg-gray-700 text-gray-400'
                                    }`}>
                                    {card.change}
                                </span>
                            </div>
                        </div>
                        <div className={`p-3 rounded-lg ${card.bg}`}>
                            <card.icon className={`w-6 h-6 ${card.color}`} />
                        </div>
                    </div>
                </motion.div>
            ))}
        </motion.div>
    );
};
