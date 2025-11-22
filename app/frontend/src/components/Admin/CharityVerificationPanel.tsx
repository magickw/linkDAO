import React, { useState } from 'react';
import { CharityProposal } from '../Governance/CharityProposalCard';
import { formatEIN } from '@/utils/linkValidator';

interface CharityVerificationPanelProps {
    proposals: CharityProposal[];
    onApprove: (proposalId: string, notes?: string) => void;
    onReject: (proposalId: string, notes: string) => void;
    isLoading?: boolean;
}

type VerificationFilter = 'all' | 'pending' | 'verified' | 'rejected';

export const CharityVerificationPanel: React.FC<CharityVerificationPanelProps> = ({
    proposals,
    onApprove,
    onReject,
    isLoading = false,
}) => {
    const [filter, setFilter] = useState<VerificationFilter>('pending');
    const [selectedProposal, setSelectedProposal] = useState<CharityProposal | null>(null);
    const [verificationNotes, setVerificationNotes] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Filter proposals based on verification status
    const filteredProposals = proposals.filter(proposal => {
        if (filter === 'all') return true;
        if (filter === 'pending') return proposal.status === 'pending' || proposal.status === 'active';
        if (filter === 'verified') return proposal.isVerifiedCharity;
        if (filter === 'rejected') return proposal.status === 'defeated';
        return true;
    });

    const handleApprove = async () => {
        if (!selectedProposal) return;

        setIsProcessing(true);
        try {
            await onApprove(selectedProposal.id, verificationNotes);
            setSelectedProposal(null);
            setVerificationNotes('');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedProposal || !verificationNotes.trim()) {
            alert('Please provide a reason for rejection');
            return;
        }

        setIsProcessing(true);
        try {
            await onReject(selectedProposal.id, verificationNotes);
            setSelectedProposal(null);
            setVerificationNotes('');
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusBadge = (proposal: CharityProposal) => {
        if (proposal.isVerifiedCharity) {
            return (
                <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Verified
                </span>
            );
        }
        if (proposal.status === 'defeated') {
            return (
                <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    Rejected
                </span>
            );
        }
        return (
            <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                Pending Review
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Charity Verification
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Review and approve charity proposals
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        {filteredProposals.length} proposal{filteredProposals.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                    {(['all', 'pending', 'verified', 'rejected'] as VerificationFilter[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${filter === tab
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            )}

            {/* Proposals List */}
            {!isLoading && filteredProposals.length === 0 && (
                <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        No {filter !== 'all' ? filter : ''} proposals found
                    </p>
                </div>
            )}

            {!isLoading && filteredProposals.length > 0 && (
                <div className="grid gap-4">
                    {filteredProposals.map((proposal) => (
                        <div
                            key={proposal.id}
                            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => setSelectedProposal(proposal)}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {proposal.title}
                                        </h3>
                                        {getStatusBadge(proposal)}
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                        {proposal.charityName}
                                    </p>
                                    {proposal.ein && (
                                        <p className="text-xs text-gray-500 dark:text-gray-500 font-mono">
                                            EIN: {formatEIN(proposal.ein)}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {proposal.donationAmount} LDAO
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Ends: {proposal.endTime.toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center space-x-4">
                                    {proposal.charityNavigatorRating && (
                                        <span className="text-yellow-600 dark:text-yellow-400">
                                            ⭐ {proposal.charityNavigatorRating}/4
                                        </span>
                                    )}
                                    {proposal.documentIPFSHashes && proposal.documentIPFSHashes.length > 0 && (
                                        <span className="text-purple-600 dark:text-purple-400">
                                            📄 {proposal.documentIPFSHashes.length} document{proposal.documentIPFSHashes.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {proposal.proofOfVerification && (
                                        <span className="text-blue-600 dark:text-blue-400">
                                            🔗 Verification link
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProposal(proposal);
                                    }}
                                    className="text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    Review →
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Review Modal */}
            {selectedProposal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            {/* Modal Header */}
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                        {selectedProposal.title}
                                    </h3>
                                    {getStatusBadge(selectedProposal)}
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedProposal(null);
                                        setVerificationNotes('');
                                    }}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Charity Details */}
                            <div className="space-y-4 mb-6">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                        🏥 {selectedProposal.charityName}
                                    </h4>
                                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                                        {selectedProposal.charityDescription}
                                    </p>
                                    {selectedProposal.ein && (
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-blue-700 dark:text-blue-300 font-mono">
                                                EIN: {formatEIN(selectedProposal.ein)}
                                            </p>
                                            <a
                                                href={`https://www.charitynavigator.org/ein/${selectedProposal.ein.replace(/-/g, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                                View on Charity Navigator →
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">Description</h5>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {selectedProposal.description}
                                    </p>
                                </div>

                                {selectedProposal.impactMetrics && (
                                    <div>
                                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">Expected Impact</h5>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {selectedProposal.impactMetrics}
                                        </p>
                                    </div>
                                )}

                                {/* Verification Documents */}
                                {selectedProposal.documentIPFSHashes && selectedProposal.documentIPFSHashes.length > 0 && (
                                    <div>
                                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">Verification Documents</h5>
                                        <div className="space-y-2">
                                            {selectedProposal.documentIPFSHashes.map((hash, index) => (
                                                <a
                                                    key={index}
                                                    href={`https://ipfs.io/ipfs/${hash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center text-sm text-purple-600 dark:text-purple-400 hover:underline p-2 bg-purple-50 dark:bg-purple-900/20 rounded"
                                                >
                                                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                                    </svg>
                                                    Document {index + 1} - View on IPFS
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Verification Link */}
                                {selectedProposal.proofOfVerification && (
                                    <div>
                                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">Verification Link</h5>
                                        <a
                                            href={selectedProposal.proofOfVerification}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                                        >
                                            {selectedProposal.proofOfVerification}
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Verification Notes */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Verification Notes {!selectedProposal.isVerifiedCharity && <span className="text-red-500">*</span>}
                                </label>
                                <textarea
                                    value={verificationNotes}
                                    onChange={(e) => setVerificationNotes(e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                    placeholder="Add notes about the verification decision..."
                                />
                            </div>

                            {/* Action Buttons */}
                            {!selectedProposal.isVerifiedCharity && selectedProposal.status !== 'defeated' && (
                                <div className="flex justify-end space-x-3">
                                    <button
                                        onClick={handleReject}
                                        disabled={isProcessing || !verificationNotes.trim()}
                                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isProcessing ? 'Processing...' : 'Reject'}
                                    </button>
                                    <button
                                        onClick={handleApprove}
                                        disabled={isProcessing}
                                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isProcessing ? 'Processing...' : 'Approve'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
