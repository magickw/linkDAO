/**
 * Quests Widget Component
 * Displays available quests/missions for earning LDAO rewards
 */

import React, { useState, useEffect } from 'react';
import { Target, CheckCircle, Clock, Gift, TrendingUp } from 'lucide-react';
import { NoQuestsEmptyState } from './EmptyState';

interface Quest {
    id: string;
    title: string;
    description: string;
    reward: number;
    progress: number;
    target: number;
    completed: boolean;
    expiresAt?: Date;
    icon: 'post' | 'comment' | 'vote' | 'stake' | 'invite';
}

interface QuestsWidgetProps {
    userAddress?: string;
    className?: string;
    compact?: boolean;
}

export const QuestsWidget: React.FC<QuestsWidgetProps> = ({
    userAddress,
    className = '',
    compact = false
}) => {
    const [quests, setQuests] = useState<Quest[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalRewardsEarned, setTotalRewardsEarned] = useState(0);

    useEffect(() => {
        // TODO: Replace with actual quests API call
        // For now, show empty state indicating no quests available
        const fetchQuests = async () => {
            try {
                // Real API integration would go here
                // const response = await fetch(`/api/users/${userAddress}/quests`);
                // const data = await response.json();
                // setQuests(data.quests);
                // setTotalRewardsEarned(data.totalRewardsEarned);

                // No mock data - show empty state
                setQuests([]);
                setTotalRewardsEarned(0);
            } catch (error) {
                console.error('Error fetching quests:', error);
                setQuests([]);
                setTotalRewardsEarned(0);
            } finally {
                setLoading(false);
            }
        };

        fetchQuests();
    }, [userAddress]);

    const getQuestIcon = (icon: Quest['icon']) => {
        const iconClasses = "w-5 h-5";
        switch (icon) {
            case 'post':
                return <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
            case 'comment':
                return <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>;
            case 'vote':
                return <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
            case 'stake':
                return <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
            case 'invite':
                return <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>;
            default:
                return <Target className={iconClasses} />;
        }
    };

    const getProgressPercentage = (quest: Quest): number => {
        return Math.min((quest.progress / quest.target) * 100, 100);
    };

    const formatTimeRemaining = (date: Date): string => {
        const hours = Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60));
        if (hours < 1) return 'Less than 1h';
        if (hours < 24) return `${hours}h remaining`;
        const days = Math.floor(hours / 24);
        return `${days}d remaining`;
    };

    if (loading) {
        return (
            <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse ${className}`}>
                <div className="space-y-3">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                    <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (compact) {
        const activeQuests = quests.filter(q => !q.completed);
        return (
            <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-purple-500" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Quests</h3>
                    </div>
                    <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                        {activeQuests.length} active
                    </span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {totalRewardsEarned} LDAO
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Earned this week</div>
            </div>
        );
    }

    // Empty state when no quests available
    if (quests.length === 0) {
        return (
            <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden ${className}`}>
                <NoQuestsEmptyState />
            </div>
        );
    }

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-purple-500" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Daily Quests
                        </h3>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                        <Gift className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                            {totalRewardsEarned} LDAO
                        </span>
                    </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Complete quests to earn LDAO rewards
                </p>
            </div>

            {/* Quests List */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {quests.map((quest) => (
                    <div
                        key={quest.id}
                        className={`p-4 transition-colors ${quest.completed
                            ? 'bg-green-50 dark:bg-green-900/10'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${quest.completed
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                                }`}>
                                {quest.completed ? <CheckCircle className="w-5 h-5" /> : getQuestIcon(quest.icon)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                        {quest.title}
                                    </h4>
                                    <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold text-sm flex-shrink-0">
                                        <Gift className="w-3.5 h-3.5" />
                                        +{quest.reward}
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    {quest.description}
                                </p>

                                {/* Progress Bar */}
                                {!quest.completed && (
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                            <span>
                                                {quest.progress} / {quest.target}
                                            </span>
                                            {quest.expiresAt && (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatTimeRemaining(quest.expiresAt)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-500"
                                                style={{ width: `${getProgressPercentage(quest)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Completed Badge */}
                                {quest.completed && (
                                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                                        <CheckCircle className="w-3 h-3" />
                                        Completed
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                        {quests.filter(q => q.completed).length} of {quests.length} completed
                    </span>
                    <button className="font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
                        View All Quests
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuestsWidget;
