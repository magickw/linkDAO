import React from 'react';
import { utils } from 'ethers';

export interface CharityProposal {
    id: string;
    title: string;
    description: string;
    charityName: string;
    charityRecipient: string;
    donationAmount: string;
    charityDescription: string;
    proofOfVerification?: string;
    impactMetrics?: string;
    isVerifiedCharity: boolean;
    forVotes: string;
    againstVotes: string;
    abstainVotes: string;
    status: 'pending' | 'active' | 'succeeded' | 'defeated' | 'executed';
    endTime: Date;
    proposer: string;
}

interface CharityProposalCardProps {
    proposal: CharityProposal;
    onVote?: (proposalId: string, support: 0 | 1 | 2) => void;
    userHasVoted?: boolean;
    isVoting?: boolean;
}

export const CharityProposalCard: React.FC<CharityProposalCardProps> = ({
    proposal,
    onVote,
    userHasVoted = false,
    isVoting = false
}) => {
    const totalVotes = parseFloat(proposal.forVotes) + parseFloat(proposal.againstVotes) + parseFloat(proposal.abstainVotes);
    const forPercentage = totalVotes > 0 ? (parseFloat(proposal.forVotes) / totalVotes) * 100 : 0;
    const againstPercentage = totalVotes > 0 ? (parseFloat(proposal.againstVotes) / totalVotes) * 100 : 0;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'succeeded':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'executed':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
            case 'defeated':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
        }
    };

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const formatAmount = (amount: string) => {
        try {
            const formatted = formatUnits(amount, 18);
            return parseFloat(formatted).toLocaleString(undefined, { maximumFractionDigits: 2 });
        } catch {
            return amount;
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {proposal.title}
                        </h3>
                        {proposal.isVerifiedCharity && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Verified
                            </span>
                        )}
                    </div>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusColor(proposal.status)}`}>
                        {proposal.status.toUpperCase()}
                    </span>
                </div>
            </div>

            {/* Charity Info */}
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                        🏥 {proposal.charityName}
                    </h4>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {formatAmount(proposal.donationAmount)} LDAO
                    </span>
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                    {proposal.charityDescription}
                </p>
                <div className="flex items-center text-xs text-blue-700 dark:text-blue-300">
                    <span className="font-mono">{formatAddress(proposal.charityRecipient)}</span>
                    <button
                        onClick={() => navigator.clipboard.writeText(proposal.charityRecipient)}
                        className="ml-2 hover:text-blue-900 dark:hover:text-blue-100"
                        title="Copy address"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Description */}
            <p className="text-gray-700 dark:text-gray-300 mb-4">
                {proposal.description}
            </p>

            {/* Impact Metrics */}
            {proposal.impactMetrics && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded">
                    <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        Expected Impact:
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {proposal.impactMetrics}
                    </p>
                </div>
            )}

            {/* Proof of Verification */}
            {proposal.proofOfVerification && (
                <div className="mb-4">
                    <a
                        href={proposal.proofOfVerification}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View Verification Proof
                    </a>
                </div>
            )}

            {/* Voting Progress */}
            <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Voting Progress</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                        {formatAmount(totalVotes.toString())} votes
                    </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                    <div className="flex h-full rounded-full overflow-hidden">
                        <div
                            className="bg-green-500"
                            style={{ width: `${forPercentage}%` }}
                        />
                        <div
                            className="bg-red-500"
                            style={{ width: `${againstPercentage}%` }}
                        />
                    </div>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-green-600 dark:text-green-400">
                        For: {forPercentage.toFixed(1)}%
                    </span>
                    <span className="text-red-600 dark:text-red-400">
                        Against: {againstPercentage.toFixed(1)}%
                    </span>
                </div>
            </div>

            {/* Vote Buttons */}
            {proposal.status === 'active' && onVote && (
                <div className="flex gap-2">
                    <button
                        onClick={() => onVote(proposal.id, 1)}
                        disabled={userHasVoted || isVoting}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                        {isVoting ? 'Voting...' : userHasVoted ? 'Voted' : 'Vote For'}
                    </button>
                    <button
                        onClick={() => onVote(proposal.id, 0)}
                        disabled={userHasVoted || isVoting}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                        {isVoting ? 'Voting...' : userHasVoted ? 'Voted' : 'Vote Against'}
                    </button>
                    <button
                        onClick={() => onVote(proposal.id, 2)}
                        disabled={userHasVoted || isVoting}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                        Abstain
                    </button>
                </div>
            )}

            {/* Footer Info */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Proposed by {formatAddress(proposal.proposer)}</span>
                <span>Ends: {proposal.endTime.toLocaleDateString()}</span>
            </div>
        </div>
    );
};
