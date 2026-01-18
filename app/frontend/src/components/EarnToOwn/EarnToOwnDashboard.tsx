import React from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    Award,
    Target,
    Clock,
    Trophy,
    Gift,
    CheckCircle,
    ArrowRight
} from 'lucide-react';
import { EarnToOwnChallenge, EarnToOwnProgress } from '@/services/earnToOwnService';

interface EarnToOwnDashboardProps {
    progress: EarnToOwnProgress;
    challenges: EarnToOwnChallenge[];
    onClaimReward: (challengeId: string) => void;
}

export function EarnToOwnDashboard({ progress, challenges, onClaimReward }: EarnToOwnDashboardProps) {
    const getChallengeIcon = (type: string) => {
        switch (type) {
            case 'daily': return <Clock className="w-5 h-5" />;
            case 'weekly': return <Target className="w-5 h-5" />;
            case 'monthly': return <Trophy className="w-5 h-5" />;
            case 'milestone': return <Award className="w-5 h-5" />;
            default: return <Gift className="w-5 h-5" />;
        }
    };

    const getChallengeColor = (type: string) => {
        switch (type) {
            case 'daily': return 'from-blue-500 to-cyan-500';
            case 'weekly': return 'from-purple-500 to-pink-500';
            case 'monthly': return 'from-yellow-500 to-orange-500';
            case 'milestone': return 'from-green-500 to-emerald-500';
            default: return 'from-gray-500 to-gray-600';
        }
    };

    const completedChallenges = challenges.filter(c => c.isCompleted);
    const activeChallenges = challenges.filter(c => !c.isCompleted);

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl p-6 text-white"
                >
                    <div className="flex items-center justify-between mb-2">
                        <TrendingUp className="w-8 h-8" />
                        <div className="text-right">
                            <div className="text-3xl font-bold">{progress.totalEarned.toFixed(0)}</div>
                            <div className="text-sm text-purple-100">LDAO</div>
                        </div>
                    </div>
                    <div className="text-sm text-purple-100">Total Earned</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
                >
                    <div className="flex items-center justify-between mb-2">
                        <Award className="w-8 h-8 text-yellow-500" />
                        <div className="text-right">
                            <div className="text-3xl font-bold text-gray-900 dark:text-white">{progress.completedChallenges}</div>
                            <div className="text-sm text-gray-500">Challenges</div>
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
                >
                    <div className="flex items-center justify-between mb-2">
                        <Trophy className="w-8 h-8 text-orange-500" />
                        <div className="text-right">
                            <div className="text-3xl font-bold text-gray-900 dark:text-white">#{progress.rank}</div>
                            <div className="text-sm text-gray-500">of {progress.totalUsers}</div>
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Leaderboard Rank</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white"
                >
                    <div className="flex items-center justify-between mb-2">
                        <Target className="w-8 h-8" />
                        <div className="text-right">
                            <div className="text-3xl font-bold">{progress.nextMilestone.amount}</div>
                            <div className="text-sm text-green-100">LDAO</div>
                        </div>
                    </div>
                    <div className="text-sm text-green-100">Next Milestone</div>
                    <div className="text-xs text-green-200 mt-1">+{progress.nextMilestone.reward} bonus</div>
                </motion.div>
            </div>

            {/* Active Challenges */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Active Challenges ({activeChallenges.length})
                    </h2>
                    <button className="text-purple-600 dark:text-purple-400 hover:text-purple-700 font-medium flex items-center gap-2">
                        View All
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    {activeChallenges.map((challenge) => (
                        <div
                            key={challenge.id}
                            className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getChallengeColor(challenge.type)} flex items-center justify-center text-white`}>
                                    {getChallengeIcon(challenge.type)}
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                                        +{challenge.rewardAmount}
                                    </div>
                                    <div className="text-xs text-gray-500">LDAO</div>
                                </div>
                            </div>

                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                {challenge.title}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                {challenge.description}
                            </p>

                            {/* Progress */}
                            <div className="mb-3">
                                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                                    <span>Progress</span>
                                    <span>{challenge.progress}/{challenge.target}</span>
                                </div>
                                <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full bg-gradient-to-r ${getChallengeColor(challenge.type)} transition-all`}
                                        style={{ width: `${(challenge.progress / challenge.target) * 100}%` }}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500 capitalize">{challenge.type}</span>
                                {challenge.expiresAt && (
                                    <span className="text-xs text-orange-600">
                                        {Math.ceil((challenge.expiresAt.getTime() - Date.now()) / 86400000)}d left
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Completed Challenges */}
            {completedChallenges.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                        Completed Challenges ({completedChallenges.length})
                    </h2>

                    <div className="space-y-3">
                        {completedChallenges.map((challenge) => (
                            <div
                                key={challenge.id}
                                className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                            >
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white">
                                            {challenge.title}
                                        </h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Earned {challenge.rewardAmount} LDAO
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onClaimReward(challenge.id)}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                                >
                                    Claim Reward
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
