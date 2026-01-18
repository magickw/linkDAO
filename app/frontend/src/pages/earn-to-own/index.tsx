import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import {
    Coins,
    TrendingUp,
    Award,
    Users,
    Zap,
    Target,
    CheckCircle,
    ArrowRight,
    Trophy,
    Gift,
    Clock
} from 'lucide-react';
import { earnToOwnService, EarnToOwnChallenge, EarnToOwnProgress } from '@/services/earnToOwnService';
import { useRouter } from 'next/router';

export default function EarnToOwnPage() {
    const { address } = useAccount();
    const router = useRouter();
    const [challenges, setChallenges] = useState<EarnToOwnChallenge[]>([]);
    const [progress, setProgress] = useState<EarnToOwnProgress | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [challengesData, progressData] = await Promise.all([
                    earnToOwnService.getActiveChallenges(),
                    address ? earnToOwnService.getUserProgress(address) : Promise.resolve(null)
                ]);
                setChallenges(challengesData);
                setProgress(progressData);
            } catch (error) {
                console.error('Error fetching earn-to-own data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [address]);

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

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white">
                <div className="absolute inset-0 bg-black/10" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center"
                    >
                        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                            <Coins className="w-5 h-5" />
                            <span className="font-semibold">Earn LDAO Tokens</span>
                        </div>

                        <h1 className="text-5xl md:text-6xl font-bold mb-6">
                            Earn-to-Own Program
                        </h1>

                        <p className="text-xl md:text-2xl text-purple-100 mb-8 max-w-3xl mx-auto">
                            Participate, contribute, and earn LDAO tokens. Build your stake in the platform you help grow.
                        </p>

                        {address ? (
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="px-8 py-4 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    View Dashboard
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                                <button className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white rounded-lg font-semibold hover:bg-white/30 transition-all border-2 border-white/30">
                                    Browse Challenges
                                </button>
                            </div>
                        ) : (
                            <button className="px-8 py-4 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-all shadow-lg">
                                Connect Wallet to Start Earning
                            </button>
                        )}

                        {progress && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
                            >
                                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                    <div className="text-3xl font-bold">{progress.totalEarned.toFixed(0)}</div>
                                    <div className="text-sm text-purple-200">Total Earned</div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                    <div className="text-3xl font-bold">{progress.currentBalance.toFixed(0)}</div>
                                    <div className="text-sm text-purple-200">Current Balance</div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                    <div className="text-3xl font-bold">{progress.completedChallenges}</div>
                                    <div className="text-sm text-purple-200">Completed</div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                    <div className="text-3xl font-bold">#{progress.rank}</div>
                                    <div className="text-sm text-purple-200">Leaderboard Rank</div>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-20 bg-white dark:bg-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            How It Works
                        </h2>
                        <p className="text-xl text-gray-600 dark:text-gray-400">
                            Three simple steps to start earning LDAO tokens
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                step: 1,
                                icon: <Target className="w-8 h-8" />,
                                title: 'Choose Challenges',
                                description: 'Browse daily, weekly, and milestone challenges that match your interests and skills.'
                            },
                            {
                                step: 2,
                                icon: <Zap className="w-8 h-8" />,
                                title: 'Complete Activities',
                                description: 'Participate in the platform - create content, trade, vote on proposals, and engage with the community.'
                            },
                            {
                                step: 3,
                                icon: <Coins className="w-8 h-8" />,
                                title: 'Earn LDAO',
                                description: 'Claim your rewards and build your stake in LinkDAO. The more you contribute, the more you earn.'
                            }
                        ].map((item) => (
                            <motion.div
                                key={item.step}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: item.step * 0.1 }}
                                viewport={{ once: true }}
                                className="relative bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-700 dark:to-gray-800 rounded-2xl p-8 border border-purple-200 dark:border-purple-800"
                            >
                                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                                    {item.step}
                                </div>
                                <div className="text-purple-600 dark:text-purple-400 mb-4">
                                    {item.icon}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                                    {item.title}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {item.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Active Challenges */}
            <section className="py-20 bg-gray-50 dark:bg-gray-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Active Challenges
                        </h2>
                        <p className="text-xl text-gray-600 dark:text-gray-400">
                            Start earning today with these opportunities
                        </p>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {challenges.slice(0, 6).map((challenge) => (
                                <motion.div
                                    key={challenge.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getChallengeColor(challenge.type)} flex items-center justify-center text-white`}>
                                            {getChallengeIcon(challenge.type)}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                                +{challenge.rewardAmount}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">LDAO</div>
                                        </div>
                                    </div>

                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                                        {challenge.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        {challenge.description}
                                    </p>

                                    {/* Progress Bar */}
                                    <div className="mb-3">
                                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                                            <span>Progress</span>
                                            <span>{challenge.progress}/{challenge.target}</span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full bg-gradient-to-r ${getChallengeColor(challenge.type)} transition-all`}
                                                style={{ width: `${(challenge.progress / challenge.target) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                            {challenge.type}
                                        </span>
                                        {challenge.expiresAt && (
                                            <span className="text-xs text-orange-600 dark:text-orange-400">
                                                {Math.ceil((challenge.expiresAt.getTime() - Date.now()) / 86400000)}d left
                                            </span>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    <div className="text-center mt-12">
                        <button className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg">
                            View All Challenges
                        </button>
                    </div>
                </div>
            </section>

            {/* Benefits */}
            <section className="py-20 bg-white dark:bg-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Why Participate?
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { icon: <TrendingUp />, title: 'Build Ownership', desc: 'Earn tokens and become a true stakeholder' },
                            { icon: <Users />, title: 'Community Rewards', desc: 'Get recognized for your contributions' },
                            { icon: <Award />, title: 'Exclusive Benefits', desc: 'Unlock premium features and perks' },
                            { icon: <Trophy />, title: 'Compete & Win', desc: 'Climb the leaderboard for bonus rewards' }
                        ].map((benefit, i) => (
                            <div key={i} className="text-center p-6">
                                <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white mx-auto mb-4">
                                    {benefit.icon}
                                </div>
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{benefit.title}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{benefit.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-4xl font-bold mb-6">
                        Ready to Start Earning?
                    </h2>
                    <p className="text-xl text-purple-100 mb-8">
                        Join thousands of users building their stake in LinkDAO
                    </p>
                    <button className="px-8 py-4 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-all shadow-lg text-lg">
                        Get Started Now
                    </button>
                </div>
            </section>
        </div>
    );
}
