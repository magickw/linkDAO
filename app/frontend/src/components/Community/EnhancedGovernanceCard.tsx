/**
 * Enhanced Governance Card Component
 * Displays governance proposals with circular countdown timers, voting stats, and user voting status
 */

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Vote, Clock, Users, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import CircularProgressTimer from './CircularProgressTimer';

interface Proposal {
    id: string;
    title: string;
    description: string;
    status: 'active' | 'passed' | 'failed' | 'executed' | 'pending';
    votingDeadline: Date | string;
    forVotes: number;
    againstVotes: number;
    abstainVotes: number;
    quorumRequired: number;
    userVote?: 'for' | 'against' | 'abstain' | null;
    proposer: string;
    communityId?: string;
}

interface EnhancedGovernanceCardProps {
    proposal: Proposal;
    userVotingPower?: number;
    onVote?: (proposalId: string, vote: 'for' | 'against' | 'abstain') => void;
    className?: string;
}

export const EnhancedGovernanceCard: React.FC<EnhancedGovernanceCardProps> = ({
    proposal,
    userVotingPower = 0,
    onVote,
    className = ''
}) => {
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState(false);

    const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
    const forPercentage = totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0;
    const againstPercentage = totalVotes > 0 ? (proposal.againstVotes / totalVotes) * 100 : 0;
    const abstainPercentage = totalVotes > 0 ? (proposal.abstainVotes / totalVotes) * 100 : 0;
    const quorumPercentage = proposal.quorumRequired > 0 ? (totalVotes / proposal.quorumRequired) * 100 : 0;

    const getStatusColor = () => {
        switch (proposal.status) {
            case 'active':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'passed':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'failed':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            case 'executed':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const formatNumber = (num: number): string => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const handleVote = (vote: 'for' | 'against' | 'abstain') => {
        if (onVote) {
            onVote(proposal.id, vote);
        }
    };

    const handleCardClick = () => {
        router.push(`/governance/proposal/${proposal.id}`);
    };

    return (
        <div
            className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 ${className}`}
        >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
                                {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                            </span>
                            {proposal.userVote && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                                    {proposal.userVote === 'for' && <CheckCircle className="w-3 h-3" />}
                                    {proposal.userVote === 'against' && <XCircle className="w-3 h-3" />}
                                    You voted {proposal.userVote}
                                </span>
                            )}
                        </div>
                        <h3
                            className="text-lg font-semibold text-gray-900 dark:text-white mb-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            onClick={handleCardClick}
                        >
                            {proposal.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {proposal.description}
                        </p>
                    </div>

                    {/* Circular Countdown Timer */}
                    {proposal.status === 'active' && (
                        <CircularProgressTimer
                            endTime={proposal.votingDeadline}
                            size={80}
                            strokeWidth={6}
                            colorScheme="blue"
                            showLabel={true}
                        />
                    )}
                </div>
            </div>

            {/* Voting Progress */}
            <div className="p-4 space-y-3">
                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>Voting Progress</span>
                        <span>{formatNumber(totalVotes)} votes</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div className="h-full flex">
                            <div
                                className="bg-green-500 transition-all duration-500"
                                style={{ width: `${forPercentage}%` }}
                                title={`For: ${forPercentage.toFixed(1)}%`}
                            />
                            <div
                                className="bg-red-500 transition-all duration-500"
                                style={{ width: `${againstPercentage}%` }}
                                title={`Against: ${againstPercentage.toFixed(1)}%`}
                            />
                            <div
                                className="bg-gray-400 transition-all duration-500"
                                style={{ width: `${abstainPercentage}%` }}
                                title={`Abstain: ${abstainPercentage.toFixed(1)}%`}
                            />
                        </div>
                    </div>
                </div>

                {/* Vote Stats */}
                <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                            {formatNumber(proposal.forVotes)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            For ({forPercentage.toFixed(1)}%)
                        </div>
                    </div>
                    <div>
                        <div className="text-lg font-bold text-red-600 dark:text-red-400">
                            {formatNumber(proposal.againstVotes)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            Against ({againstPercentage.toFixed(1)}%)
                        </div>
                    </div>
                    <div>
                        <div className="text-lg font-bold text-gray-600 dark:text-gray-400">
                            {formatNumber(proposal.abstainVotes)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            Abstain ({abstainPercentage.toFixed(1)}%)
                        </div>
                    </div>
                </div>

                {/* Quorum Progress */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Quorum
                        </span>
                        <span>{quorumPercentage.toFixed(1)}% reached</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${quorumPercentage >= 100 ? 'bg-green-500' : 'bg-blue-500'
                                }`}
                            style={{ width: `${Math.min(quorumPercentage, 100)}%` }}
                        />
                    </div>
                </div>

                {/* User Voting Power */}
                {userVotingPower > 0 && (
                    <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
                            <Vote className="w-4 h-4" />
                            Your Voting Power
                        </span>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {formatNumber(userVotingPower)} LDAO
                        </span>
                    </div>
                )}
            </div>

            {/* Voting Buttons */}
            {proposal.status === 'active' && !proposal.userVote && userVotingPower > 0 && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleVote('for');
                            }}
                            className="px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                        >
                            Vote For
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleVote('against');
                            }}
                            className="px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                        >
                            Vote Against
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleVote('abstain');
                            }}
                            className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-lg transition-colors"
                        >
                            Abstain
                        </button>
                    </div>
                </div>
            )}

            {/* View Details Button */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={handleCardClick}
                    className="w-full px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                    View Full Proposal
                </button>
            </div>
        </div>
    );
};

export default EnhancedGovernanceCard;
