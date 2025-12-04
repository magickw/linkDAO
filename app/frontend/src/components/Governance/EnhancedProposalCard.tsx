import React from 'react';
import Link from 'next/link';
import { Proposal } from '@/types/governance';
import { CircularProgressTimer } from './CircularProgressTimer';
import { AIProposalAnalysis } from '@/services/aiGovernanceService';

interface EnhancedProposalCardProps {
    proposal: Proposal;
    analysis?: AIProposalAnalysis;
    userVote?: 'For' | 'Against' | 'Abstain';
    onClick?: () => void;
}

export const EnhancedProposalCard: React.FC<EnhancedProposalCardProps> = ({
    proposal,
    analysis,
    userVote,
    onClick
}) => {
    const totalVotes = (Number(proposal.forVotes) || 0) + (Number(proposal.againstVotes) || 0) + (Number(proposal.abstainVotes) || 0);
    const forPercentage = totalVotes > 0 ? ((Number(proposal.forVotes) || 0) / totalVotes) * 100 : 0;
    const againstPercentage = totalVotes > 0 ? ((Number(proposal.againstVotes) || 0) / totalVotes) * 100 : 0;

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
            case 'passed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
            case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        }
    };

    return (
        <div
            onClick={onClick}
            className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:-translate-y-0.5"
        >
            {/* Status Bar */}
            <div className={`h-1 w-full ${proposal.status === 'active' ? 'bg-green-500' :
                proposal.status === 'passed' ? 'bg-blue-500' :
                    proposal.status === 'failed' ? 'bg-red-500' : 'bg-gray-300'
                }`} />

            <div className="p-6">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(proposal.status)}`}>
                                {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                #{proposal.id.slice(0, 8)}
                            </span>
                            {userVote && (
                                <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full border ${userVote === 'For' ? 'border-green-200 text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-300' :
                                    userVote === 'Against' ? 'border-red-200 text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-300' :
                                        'border-gray-200 text-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-gray-300'
                                    }`}>
                                    You voted: {userVote}
                                </span>
                            )}
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            {proposal.title}
                        </h3>

                        <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-4">
                            {proposal.description}
                        </p>

                        {/* Voting Stats */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                <span>Votes: {totalVotes.toLocaleString()}</span>
                                <div className="space-x-3">
                                    <span className="text-green-600 dark:text-green-400 font-medium">For: {forPercentage.toFixed(1)}%</span>
                                    <span className="text-red-600 dark:text-red-400 font-medium">Against: {againstPercentage.toFixed(1)}%</span>
                                </div>
                            </div>
                            <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
                                <div style={{ width: `${forPercentage}%` }} className="h-full bg-green-500" />
                                <div style={{ width: `${againstPercentage}%` }} className="h-full bg-red-500" />
                            </div>
                        </div>
                    </div>

                    {/* Timer */}
                    {proposal.status === 'active' && proposal.endTime && (
                        <div className="flex-shrink-0 ml-2">
                            <CircularProgressTimer endTime={new Date(proposal.endTime)} size={60} />
                        </div>
                    )}
                </div>

                {/* AI Analysis Summary */}
                {analysis && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                AI Insight:
                            </span>
                            <span className="text-gray-600 dark:text-gray-300 truncate flex-1">
                                {analysis.analysis.split('.')[0]}.
                            </span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${analysis.recommendation === 'APPROVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                analysis.recommendation === 'REJECT' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                }`}>
                                {analysis.recommendation}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
