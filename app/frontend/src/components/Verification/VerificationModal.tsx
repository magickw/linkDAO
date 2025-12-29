import React, { useState } from 'react';
import { useVerification } from '../../hooks/useVerification';
import { CreateVerificationRequestInput } from '../../models/Verification';

interface VerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({ isOpen, onClose }) => {
    const { submitRequest, isLoading, error } = useVerification();
    const [formData, setFormData] = useState<CreateVerificationRequestInput>({
        entityType: 'individual',
        category: 'creator',
        description: '',
        website: '',
        socialProof: {}
    });
    const [success, setSuccess] = useState(false);

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

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 text-center">
                <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>
                <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl dark:bg-gray-800">
                    <h3 className="text-xl font-medium leading-6 text-gray-900 dark:text-white mb-4">
                        Apply for Verification
                    </h3>

                    {success ? (
                        <div className="p-4 bg-green-100 text-green-700 rounded-md">
                            Application submitted successfully!
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                                <select
                                    value={formData.entityType}
                                    onChange={(e) => setFormData({ ...formData, entityType: e.target.value as any })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2"
                                >
                                    <option value="individual">Individual</option>
                                    <option value="organization">Organization</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                                <input
                                    type="text"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2"
                                    placeholder="e.g. Artist, Developer"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2"
                                    placeholder="Tell us about yourself..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Website</label>
                                <input
                                    type="url"
                                    value={formData.website}
                                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2"
                                    placeholder="https://example.com"
                                />
                            </div>

                            <div className="mt-5 sm:mt-6 flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm disabled:opacity-50"
                                >
                                    {isLoading ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
