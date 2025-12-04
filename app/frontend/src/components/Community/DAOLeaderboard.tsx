import React, { useState, useEffect } from 'react';
import { Trophy, Vote, MessageSquare, Activity, Coins, Medal, Crown } from 'lucide-react';
import OnChainIdentityBadge from './OnChainIdentityBadge';
import { leaderboardService, type LeaderboardEntry } from '@/services/leaderboardService';

type LeaderboardType = 'voters' | 'posters' | 'engaged' | 'stakers';

interface DAOLeaderboardProps {
    communityId?: string;
    className?: string;
    maxEntries?: number;
    currentUserAddress?: string;
}

export const DAOLeaderboard: React.FC<DAOLeaderboardProps> = ({
    communityId,
    className = '',
    maxEntries = 10,
    currentUserAddress
}) => {
    const [activeTab, setActiveTab] = useState<LeaderboardType>('voters');
    const [leaderboardData, setLeaderboardData] = useState<Record<LeaderboardType, LeaderboardEntry[]>>({
        voters: [],
        posters: [],
        engaged: [],
        stakers: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLeaderboardData = async () => {
            setLoading(true);
            setError(null);

            try {
                // Fetch all leaderboard data in parallel
                const [votersRes, postersRes, engagedRes, stakersRes] = await Promise.all([
                    leaderboardService.getTopVoters({
                        communityId,
                        limit: maxEntries,
                        timeRange: '7d',
                        userAddress: currentUserAddress
                    }),
                    leaderboardService.getTopPosters({
                        communityId,
                        limit: maxEntries,
                        timeRange: '7d',
                        userAddress: currentUserAddress
                    }),
                    leaderboardService.getMostEngaged({
                        communityId,
                        limit: maxEntries,
                        timeRange: '7d',
                        userAddress: currentUserAddress
                    }),
                    leaderboardService.getTopStakers({
                        communityId,
                        limit: maxEntries,
                        userAddress: currentUserAddress
                    })
                ]);

                setLeaderboardData({
                    voters: votersRes.success ? votersRes.data : [],
                    posters: postersRes.success ? postersRes.data : [],
                    engaged: engagedRes.success ? engagedRes.data : [],
                    stakers: stakersRes.success ? stakersRes.data : []
                });
            } catch (err) {
                console.error('Error fetching leaderboard data:', err);
                setError('Failed to load leaderboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboardData();
    }, [communityId, currentUserAddress, maxEntries]);

    const tabs: Array<{ id: LeaderboardType; label: string; icon: React.ReactNode }> = [
        { id: 'voters', label: 'Top Voters', icon: <Vote className="w-4 h-4" /> },
        { id: 'posters', label: 'Top Posters', icon: <MessageSquare className="w-4 h-4" /> },
        { id: 'engaged', label: 'Most Engaged', icon: <Activity className="w-4 h-4" /> },
        { id: 'stakers', label: 'Top Stakers', icon: <Coins className="w-4 h-4" /> }
    ];

    const formatValue = (type: LeaderboardType, value: number): string => {
        switch (type) {
            case 'voters':
                return `${value} votes`;
            case 'posters':
                return `${value} posts`;
            case 'engaged':
                return `${value.toLocaleString()} pts`;
            case 'stakers':
                return `${(value / 1000).toFixed(1)}K LDAO`;
            default:
                return value.toString();
        }
    };

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Crown className="w-5 h-5 text-yellow-500" />;
            case 2:
                return <Medal className="w-5 h-5 text-gray-400" />;
            case 3:
                return <Medal className="w-5 h-5 text-orange-600" />;
            default:
                return <span className="text-sm font-semibold text-gray-500">#{rank}</span>;
        }
    };

    if (loading) {
        return (
            <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse ${className}`}>
                <div className="space-y-3">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
                <div className="text-center py-8">
                    <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const currentData = leaderboardData[activeTab];

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        DAO Leaderboard
                    </h3>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${activeTab === tab.id
                                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Leaderboard List */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {currentData.slice(0, maxEntries).map((entry) => (
                    <div
                        key={entry.rank}
                        className={`p-4 transition-colors ${entry.isCurrentUser
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            {/* Rank */}
                            <div className="flex-shrink-0 w-8 flex items-center justify-center">
                                {getRankIcon(entry.rank)}
                            </div>

                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                                <OnChainIdentityBadge
                                    address={entry.address}
                                    identityData={{
                                        address: entry.address,
                                        ensName: entry.ensName,
                                        reputationScore: 750 - (entry.rank - 1) * 50,
                                        votingPower: entry.value,
                                        xpBadges: [],
                                        totalContributions: entry.value
                                    }}
                                    size="sm"
                                    showTooltip={true}
                                />
                                {entry.isCurrentUser && (
                                    <span className="ml-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                                        (You)
                                    </span>
                                )}
                            </div>

                            {/* Value & Change */}
                            <div className="flex-shrink-0 text-right">
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {formatValue(activeTab, entry.value)}
                                </div>
                                {entry.change !== undefined && (
                                    <div className={`text-xs font-medium ${entry.change > 0
                                        ? 'text-green-600 dark:text-green-400'
                                        : entry.change < 0
                                            ? 'text-red-600 dark:text-red-400'
                                            : 'text-gray-500'
                                        }`}>
                                        {entry.change > 0 ? '+' : ''}{entry.change}%
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <button className="w-full text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                    View Full Leaderboard
                </button>
            </div>
        </div>
    );
};

export default DAOLeaderboard;
