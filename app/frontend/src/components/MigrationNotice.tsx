import React, { useState } from 'react';

interface MigrationNoticeProps {
    type: 'dashboard' | 'social' | 'general';
    onDismiss: () => void;
    customMessage?: string;
}

export default function MigrationNotice({ type, onDismiss, customMessage }: MigrationNoticeProps) {
    const [isVisible, setIsVisible] = useState(true);

    const handleDismiss = () => {
        setIsVisible(false);
        onDismiss();
    };

    if (!isVisible) return null;

    const getNoticeContent = () => {
        switch (type) {
            case 'dashboard':
                return {
                    title: '🎉 Welcome to the New Dashboard!',
                    message: customMessage || 'We\'ve redesigned your dashboard to bring together your social feed, communities, and Web3 activities in one place. All your favorite features are still here, just better organized!',
                    features: [
                        'Unified social feed with community posts',
                        'Integrated wallet and DeFi information',
                        'Seamless navigation between feeds and communities',
                        'Enhanced mobile experience'
                    ]
                };
            case 'social':
                return {
                    title: '📱 Social Feed Has Moved!',
                    message: customMessage || 'Your social feed is now part of the integrated dashboard experience. You\'ll find all your posts, communities, and social interactions in one convenient location.',
                    features: [
                        'All your social content in the dashboard',
                        'Better community integration',
                        'Improved post creation experience',
                        'Enhanced Web3 features'
                    ]
                };
            case 'general':
                return {
                    title: '✨ Platform Updates',
                    message: customMessage || 'We\'ve made some improvements to enhance your experience. Here\'s what\'s new:',
                    features: []
                };
        }
    };

    const content = getNoticeContent();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary-500 to-secondary-500 p-6 text-white">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold">{content.title}</h2>
                        <button
                            onClick={handleDismiss}
                            className="text-white hover:text-gray-200 transition-colors"
                            aria-label="Close notice"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                        {content.message}
                    </p>

                    {content.features.length > 0 && (
                        <div className="mb-6">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">What's New:</h3>
                            <ul className="space-y-2">
                                {content.features.map((feature, index) => (
                                    <li key={index} className="flex items-start">
                                        <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-3">
                        <button
                            onClick={handleDismiss}
                            className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors font-medium"
                        >
                            Got it!
                        </button>
                        <button
                            onClick={() => {
                                // Open help or tour
                                handleDismiss();
                            }}
                            className="px-4 py-2 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors font-medium"
                        >
                            Take Tour
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}