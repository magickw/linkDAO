import React, { useState } from 'react';
import { ethers } from 'ethers';
import { CharityLookup } from './CharityLookup';
import { CharityDocumentUpload } from './CharityDocumentUpload';
import { LinkPreview } from './LinkPreview';
import { CharitySearchResult } from '@/services/charityVerificationService';
import { UploadResult } from '@/services/ipfsUploadService';

interface CharityProposalFormProps {
    onSubmit: (proposalData: CharityProposalData) => Promise<void>;
    isSubmitting: boolean;
    disabled?: boolean;
    onCancel?: () => void;
}

export interface CharityProposalData {
    title: string;
    description: string;
    charityName: string;
    charityAddress: string;
    donationAmount: string;
    charityDescription: string;
    proofOfVerification: string;
    impactMetrics: string;
    ein?: string;
    charityNavigatorRating?: number;
    documentIPFSHashes?: string[];
}

export const CharityProposalForm: React.FC<CharityProposalFormProps> = ({
    onSubmit,
    isSubmitting,
    disabled = false,
    onCancel
}) => {
    const [formData, setFormData] = useState<CharityProposalData>({
        title: '',
        description: '',
        charityName: '',
        charityAddress: '',
        donationAmount: '',
        charityDescription: '',
        proofOfVerification: '',
        impactMetrics: '',
        ein: '',
        charityNavigatorRating: undefined,
        documentIPFSHashes: [],
    });

    const [errors, setErrors] = useState<Partial<Record<keyof CharityProposalData, string>>>({});
    const [uploadedDocuments, setUploadedDocuments] = useState<UploadResult[]>([]);
    const [verificationMethod, setVerificationMethod] = useState<'link' | 'document'>('link');

    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof CharityProposalData, string>> = {};

        if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
        }

        if (!formData.description.trim()) {
            newErrors.description = 'Description is required';
        }

        if (!formData.charityName.trim()) {
            newErrors.charityName = 'Charity name is required';
        }

        if (!formData.charityAddress.trim()) {
            newErrors.charityAddress = 'Charity wallet address is required';
        } else if (!ethers.isAddress(formData.charityAddress)) {
            newErrors.charityAddress = 'Invalid Ethereum address';
        }

        if (!formData.donationAmount.trim()) {
            newErrors.donationAmount = 'Donation amount is required';
        } else {
            const amount = parseFloat(formData.donationAmount);
            if (isNaN(amount) || amount <= 0) {
                newErrors.donationAmount = 'Amount must be greater than 0';
            }
        }

        if (!formData.charityDescription.trim()) {
            newErrors.charityDescription = 'Charity mission description is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        await onSubmit(formData);
    };

    const handleChange = (field: keyof CharityProposalData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const handleCharitySelect = (charity: CharitySearchResult) => {
        setFormData(prev => ({
            ...prev,
            charityName: charity.charityName,
            charityDescription: charity.mission || '',
            ein: charity.ein,
            charityNavigatorRating: charity.overallRating,
            proofOfVerification: charity.websiteURL || '',
        }));
    };

    const handleDocumentUpload = (results: UploadResult[]) => {
        setUploadedDocuments(results);
        const ipfsHashes = results.map(r => r.cid);
        setFormData(prev => ({
            ...prev,
            documentIPFSHashes: ipfsHashes,
            proofOfVerification: results[0]?.url || prev.proofOfVerification,
        }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Proposal Title */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Proposal Title *
                </label>
                <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    disabled={disabled || isSubmitting}
                    className={`w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        } ${disabled || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="e.g., Donate to Red Cross Disaster Relief"
                />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
            </div>

            {/* Proposal Description */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Proposal Description *
                </label>
                <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    disabled={disabled || isSubmitting}
                    rows={4}
                    className={`w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        } ${disabled || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="Explain why this charity should receive funding and how it will be used..."
                />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
            </div>

            {/* Charity Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Charity Name *
                </label>
                <input
                    type="text"
                    value={formData.charityName}
                    onChange={(e) => handleChange('charityName', e.target.value)}
                    disabled={disabled || isSubmitting}
                    className={`w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.charityName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        } ${disabled || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="e.g., American Red Cross"
                />
                {errors.charityName && <p className="mt-1 text-sm text-red-600">{errors.charityName}</p>}
            </div>

            {/* Charity Wallet Address */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Charity Wallet Address *
                </label>
                <input
                    type="text"
                    value={formData.charityAddress}
                    onChange={(e) => handleChange('charityAddress', e.target.value)}
                    disabled={disabled || isSubmitting}
                    className={`w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm ${errors.charityAddress ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        } ${disabled || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="0x..."
                />
                {errors.charityAddress && <p className="mt-1 text-sm text-red-600">{errors.charityAddress}</p>}
            </div>

            {/* Donation Amount */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Donation Amount (LDAO) *
                </label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.donationAmount}
                    onChange={(e) => handleChange('donationAmount', e.target.value)}
                    disabled={disabled || isSubmitting}
                    className={`w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.donationAmount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        } ${disabled || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="1000"
                />
                {errors.donationAmount && <p className="mt-1 text-sm text-red-600">{errors.donationAmount}</p>}
            </div>

            {/* Charity Lookup */}
            <CharityLookup
                onCharitySelect={handleCharitySelect}
                disabled={disabled || isSubmitting}
            />

            {/* EIN Field */}
            {formData.ein && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        EIN (Employer Identification Number)
                    </label>
                    <input
                        type="text"
                        value={formData.ein}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white bg-gray-50 cursor-not-allowed"
                    />
                </div>
            )}

            {/* Charity Mission Description */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Charity Mission *
                </label>
                <textarea
                    value={formData.charityDescription}
                    onChange={(e) => handleChange('charityDescription', e.target.value)}
                    disabled={disabled || isSubmitting}
                    rows={3}
                    className={`w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${errors.charityDescription ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        } ${disabled || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="Describe the charity's mission and goals..."
                />
                {errors.charityDescription && <p className="mt-1 text-sm text-red-600">{errors.charityDescription}</p>}
            </div>

            {/* Proof of Verification */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Proof of Verification
                </label>

                {/* Verification Method Toggle */}
                <div className="flex space-x-4 mb-4">
                    <button
                        type="button"
                        onClick={() => setVerificationMethod('link')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${verificationMethod === 'link'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                    >
                        Link/URL
                    </button>
                    <button
                        type="button"
                        onClick={() => setVerificationMethod('document')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${verificationMethod === 'document'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                    >
                        Upload Documents
                    </button>
                </div>

                {verificationMethod === 'link' ? (
                    <div>
                        <input
                            type="text"
                            value={formData.proofOfVerification}
                            onChange={(e) => handleChange('proofOfVerification', e.target.value)}
                            disabled={disabled || isSubmitting}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="IPFS hash, website URL, or verification document link"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Provide a link to verification documents or charity website
                        </p>

                        {formData.proofOfVerification && (
                            <div className="mt-3">
                                <LinkPreview url={formData.proofOfVerification} />
                            </div>
                        )}
                    </div>
                ) : (
                    <CharityDocumentUpload
                        onUploadComplete={handleDocumentUpload}
                        metadata={{
                            documentType: 'verification',
                            charityName: formData.charityName,
                            ein: formData.ein,
                        }}
                        disabled={disabled || isSubmitting}
                    />
                )}
            </div>

            {/* Impact Metrics (Optional) */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Expected Impact Metrics (Optional)
                </label>
                <textarea
                    value={formData.impactMetrics}
                    onChange={(e) => handleChange('impactMetrics', e.target.value)}
                    disabled={disabled || isSubmitting}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    placeholder="e.g., Feed 500 families, Provide clean water to 1000 people, etc."
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Describe the expected impact of this donation
                </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-medium mb-1">Charity Proposal Requirements:</p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>Minimum 100 LDAO voting power required to create proposal</li>
                            <li>Quorum: 50,000 LDAO tokens needed to pass</li>
                            <li>No staking required for voters</li>
                            <li>Voting period: ~3 days</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
                <div className="flex space-x-2 justify-end">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={disabled || isSubmitting}
                            className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={disabled || isSubmitting}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center font-medium"
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Creating Proposal...
                            </>
                        ) : (
                            'Create Charity Proposal'
                        )}
                    </button>
                </div>
            </div>
        </form>
    );
};
