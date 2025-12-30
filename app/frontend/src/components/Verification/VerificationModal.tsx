import React, { useState, useEffect } from 'react';
import { useVerification } from '../../hooks/useVerification';
import { CreateVerificationRequestInput } from '../../models/Verification';
import { UserVerificationBadge, VerificationBadgeType } from './UserVerificationBadge';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';

interface VerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CATEGORIES = {
    individual: [
        'Influencer', 'Creator', 'Developer', 'Artist', 'Musician',
        'Founder', 'Journalist', 'Athlete', 'Thought Leader', 'Other'
    ],
    organization: [
        'Company', 'DAO', 'Protocol', 'NFT Project', 'Media Outlet',
        'Non-Profit', 'Educational', 'Other'
    ],
    government: [
        'Official', 'Agency', 'Public Service', 'Institution', 'Representative', 'Other'
    ]
};

const BADGE_TYPES: Record<string, VerificationBadgeType> = {
    individual: 'blue_check',
    organization: 'gold_check',
    government: 'grey_check'
};

const TYPE_DESCRIPTIONS: Record<string, string> = {
    individual: 'Public figures, creators, and notable individuals.',
    organization: 'Companies, DAOs, and organizations.',
    government: 'Government agencies and officials.'
};

export const VerificationModal: React.FC<VerificationModalProps> = ({ isOpen, onClose }) => {
    const { submitRequest, isLoading, error } = useVerification();
    const [formData, setFormData] = useState<CreateVerificationRequestInput>({
        entityType: 'individual',
        category: '',
        description: '',
        website: '',
        socialProof: {}
    });
    const [success, setSuccess] = useState(false);

    // Reset category when type changes
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            category: CATEGORIES[prev.entityType as keyof typeof CATEGORIES][0]
        }));
    }, [formData.entityType]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await submitRequest(formData);
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
            }, 2000);
        } catch (err) {
            // Error handled by hook
        }
    };

    const currentBadgeType = BADGE_TYPES[formData.entityType] || 'blue_check';

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 text-center">
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

                <GlassPanel className="inline-block w-full max-w-lg p-0 my-8 overflow-hidden text-left align-middle transition-all transform shadow-2xl rounded-2xl border border-gray-200 dark:border-gray-700 relative z-10 bg-white dark:bg-gray-900">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-2xl font-bold">
                                Apply for Verification
                            </h3>
                            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <p className="text-blue-100 text-sm">
                            Get a verified badge to build trust and authenticity on LinkDAO.
                        </p>
                    </div>

                    <div className="p-6">
                        {success ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Application Submitted!</h4>
                                <p className="text-gray-500 dark:text-gray-400">
                                    We'll review your application and get back to you shortly.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm flex items-start gap-3">
                                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Entity Type Selection */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                        Verification Type
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {(Object.keys(CATEGORIES) as Array<keyof typeof CATEGORIES>).map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, entityType: type })}
                                                className={`
                                                    relative p-3 rounded-xl border-2 text-center transition-all duration-200 flex flex-col items-center gap-2
                                                    ${formData.entityType === type
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
                                                    }
                                                `}
                                            >
                                                <UserVerificationBadge badgeType={BADGE_TYPES[type]} size="md" showTooltip={false} />
                                                <span className="text-xs font-medium capitalize text-gray-700 dark:text-gray-300">
                                                    {type}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        {TYPE_DESCRIPTIONS[formData.entityType]}
                                    </p>
                                </div>

                                {/* Category Dropdown */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Category
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="block w-full pl-4 pr-10 py-3 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white transition-colors"
                                            required
                                        >
                                            {CATEGORIES[formData.entityType as keyof typeof CATEGORIES].map((cat) => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={4}
                                        className="block w-full p-4 text-base border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white transition-colors resize-none placeholder-gray-400"
                                        placeholder="Tell us about yourself and why you should be verified..."
                                        required
                                    />
                                    <div className="mt-1 text-right">
                                        <span className={`text-xs ${formData.description.length < 50 ? 'text-red-500' : 'text-green-500'}`}>
                                            {formData.description.length} / 50 min chars
                                        </span>
                                    </div>
                                </div>

                                {/* Website */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Website Link (Optional)
                                    </label>
                                    <div className="relative rounded-xl shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-gray-500 sm:text-sm">https://</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.website.replace('https://', '')}
                                            onChange={(e) => setFormData({ ...formData, website: `https://${e.target.value.replace('https://', '')}` })}
                                            className="block w-full pl-16 p-3 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white sm:text-sm"
                                            placeholder="www.example.com"
                                        />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={onClose}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        disabled={isLoading || formData.description.length < 50}
                                        loading={isLoading}
                                        className="flex-1 shadow-lg shadow-blue-500/30"
                                    >
                                        Submit Application
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                </GlassPanel>
            </div>
        </div>
    );
};
