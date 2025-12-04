import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    TrendingUp,
    Users,
    FileText,
    ChevronRight,
    ExternalLink,
    Star,
    Clock
} from 'lucide-react';
import { monthlyUpdateService, MonthlyUpdate } from '@/services/monthlyUpdateService';

interface MonthlyUpdatesSectionProps {
    communityId: string;
    maxDisplay?: number;
}

const MonthlyUpdatesSection: React.FC<MonthlyUpdatesSectionProps> = ({
    communityId,
    maxDisplay = 3
}) => {
    const [updates, setUpdates] = useState<MonthlyUpdate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        loadUpdates();
    }, [communityId]);

    const loadUpdates = async () => {
        try {
            setLoading(true);
            const response = await monthlyUpdateService.getPublishedUpdates(communityId, maxDisplay);
            if (response.success) {
                setUpdates(response.data);
            }
        } catch (err) {
            setError('Failed to load updates');
            console.error('Error loading monthly updates:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="animate-pulse space-y-3">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                    <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
            </div>
        );
    }

    if (error || updates.length === 0) {
        return null; // Don't show section if no updates
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-4">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-500" />
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Monthly Updates
                        </h2>
                    </div>
                    {updates.length > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {updates.length} update{updates.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                <AnimatePresence>
                    {updates.map((update, index) => (
                        <motion.div
                            key={update.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ delay: index * 0.1 }}
                            className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                            onClick={() => setExpandedId(expandedId === update.id ? null : update.id)}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                                            {monthlyUpdateService.formatUpdateDate(update.month, update.year)}
                                        </span>
                                        {index === 0 && (
                                            <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded flex items-center gap-1">
                                                <Star className="w-3 h-3" />
                                                Latest
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                        {update.title}
                                    </h3>
                                    {update.summary && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                            {update.summary}
                                        </p>
                                    )}
                                </div>
                                <ChevronRight
                                    className={`w-5 h-5 text-gray-400 transition-transform ${
                                        expandedId === update.id ? 'rotate-90' : ''
                                    }`}
                                />
                            </div>

                            {/* Expanded content */}
                            <AnimatePresence>
                                {expandedId === update.id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                            {/* Metrics */}
                                            {update.metrics && Object.keys(update.metrics).length > 0 && (
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                                    {update.metrics.newMembers !== undefined && (
                                                        <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                                                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                                <Users className="w-3 h-3" />
                                                                New Members
                                                            </div>
                                                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                +{update.metrics.newMembers}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {update.metrics.totalPosts !== undefined && (
                                                        <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                                                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                                <FileText className="w-3 h-3" />
                                                                Posts
                                                            </div>
                                                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                {update.metrics.totalPosts}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {update.metrics.engagementRate !== undefined && (
                                                        <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                                                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                                <TrendingUp className="w-3 h-3" />
                                                                Engagement
                                                            </div>
                                                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                {(update.metrics.engagementRate * 100).toFixed(1)}%
                                                            </div>
                                                        </div>
                                                    )}
                                                    {update.metrics.activeProposals !== undefined && (
                                                        <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                                                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                                <Star className="w-3 h-3" />
                                                                Proposals
                                                            </div>
                                                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                {update.metrics.activeProposals}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Highlights */}
                                            {update.highlights && update.highlights.length > 0 && (
                                                <div className="mb-4">
                                                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                        Highlights
                                                    </h4>
                                                    <ul className="space-y-2">
                                                        {update.highlights.map((highlight, idx) => (
                                                            <li
                                                                key={idx}
                                                                className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400"
                                                            >
                                                                <span className="text-blue-500 mt-0.5">
                                                                    {highlight.icon || '•'}
                                                                </span>
                                                                <div>
                                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                                        {highlight.title}
                                                                    </span>
                                                                    {highlight.description && (
                                                                        <span className="ml-1">
                                                                            - {highlight.description}
                                                                        </span>
                                                                    )}
                                                                    {highlight.link && (
                                                                        <a
                                                                            href={highlight.link}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="ml-1 text-blue-500 hover:text-blue-600"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            <ExternalLink className="w-3 h-3 inline" />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Full content */}
                                            <div className="text-xs text-gray-600 dark:text-gray-400 prose prose-sm dark:prose-invert max-w-none">
                                                {update.content}
                                            </div>

                                            {/* Published date */}
                                            {update.publishedAt && (
                                                <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
                                                    <Clock className="w-3 h-3" />
                                                    Published {new Date(update.publishedAt).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default MonthlyUpdatesSection;
