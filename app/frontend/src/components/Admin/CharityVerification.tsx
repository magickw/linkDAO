import React, { useState, useEffect } from 'react';
import { CharityVerificationPanel } from './CharityVerificationPanel';
import { CharityProposal } from '../Governance/CharityProposalCard';
import { adminService } from '@/services/adminService';
import toast from 'react-hot-toast';

export function CharityVerification() {
    const [proposals, setProposals] = useState<CharityProposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadCharities();
    }, []);

    const loadCharities = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await adminService.getCharities();

            // Transform the data to match CharityProposal interface
            const transformedProposals: CharityProposal[] = data.map((charity: any) => ({
                id: charity.id,
                title: charity.title,
                description: charity.description,
                charityName: charity.charityName,
                charityDescription: charity.charityDescription,
                charityRecipient: charity.charityRecipient || '',
                ein: charity.ein,
                donationAmount: String(charity.donationAmount || 0),
                charityNavigatorRating: charity.charityNavigatorRating,
                documentIPFSHashes: charity.documentIPFSHashes || [],
                proofOfVerification: charity.proofOfVerification,
                impactMetrics: charity.impactMetrics,
                status: charity.status,
                isVerifiedCharity: charity.isVerifiedCharity || false,
                endTime: charity.endTime ? new Date(charity.endTime) : new Date(),
                createdAt: charity.createdAt ? new Date(charity.createdAt) : new Date(),
                proposer: charity.proposer || '',
                forVotes: String(charity.forVotes || 0),
                againstVotes: String(charity.againstVotes || 0),
                abstainVotes: String(charity.abstainVotes || 0),
            }));

            setProposals(transformedProposals);
        } catch (err: any) {
            console.error('Failed to load charities:', err);
            setError(err.message || 'Failed to load charity proposals');
            toast.error('Failed to load charity proposals');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string, notes?: string) => {
        try {
            const result = await adminService.approveCharity(id, notes);

            if (result.success) {
                toast.success('Charity approved successfully');
                await loadCharities(); // Refresh the list
            } else {
                toast.error('Failed to approve charity');
            }
        } catch (err: any) {
            console.error('Failed to approve charity:', err);
            toast.error(err.message || 'Failed to approve charity');
        }
    };

    const handleReject = async (id: string, notes: string) => {
        try {
            if (!notes || !notes.trim()) {
                toast.error('Please provide a reason for rejection');
                return;
            }

            const result = await adminService.rejectCharity(id, notes);

            if (result.success) {
                toast.error('Charity rejected');
                await loadCharities(); // Refresh the list
            } else {
                toast.error('Failed to reject charity');
            }
        } catch (err: any) {
            console.error('Failed to reject charity:', err);
            toast.error(err.message || 'Failed to reject charity');
        }
    };

    if (error && !loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Charities</div>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                    <button
                        onClick={loadCharities}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <CharityVerificationPanel
            proposals={proposals}
            onApprove={handleApprove}
            onReject={handleReject}
            isLoading={loading}
        />
    );
}
