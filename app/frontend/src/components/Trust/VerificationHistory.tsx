import React from 'react';

interface VerificationEvent {
    date: string;
    type: 'tier_upgrade' | 'kyc_verified' | 'document_verified' | 'initial_verification';
    title: string;
    description: string;
    tier?: string;
}

interface VerificationHistoryProps {
    userId: string;
    events?: VerificationEvent[];
    currentTier: string;
    verifiedAt?: string;
}

export function VerificationHistory({
    userId,
    events = [],
    currentTier,
    verifiedAt
}: VerificationHistoryProps) {
    // Mock data if no events provided
    const defaultEvents: VerificationEvent[] = verifiedAt ? [
        {
            date: verifiedAt,
            type: 'initial_verification',
            title: 'Account Verified',
            description: 'Successfully completed initial verification',
            tier: 'bronze'
        }
    ] : [];

    const historyEvents = events.length > 0 ? events : defaultEvents;

    const getEventIcon = (type: VerificationEvent['type']) => {
        switch (type) {
            case 'tier_upgrade':
                return '⬆️';
            case 'kyc_verified':
                return '✓';
            case 'document_verified':
                return '📄';
            case 'initial_verification':
                return '🎉';
            default:
                return '•';
        }
    };

    const getEventColor = (type: VerificationEvent['type']) => {
        switch (type) {
            case 'tier_upgrade':
                return 'bg-purple-500';
            case 'kyc_verified':
                return 'bg-green-500';
            case 'document_verified':
                return 'bg-blue-500';
            case 'initial_verification':
                return 'bg-yellow-500';
            default:
                return 'bg-gray-500';
        }
    };

    if (historyEvents.length === 0) {
        return (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
                <div className="text-gray-400 mb-2">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <p className="text-gray-600">No verification history available</p>
                <p className="text-sm text-gray-500 mt-1">Complete verification to see your history</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Verification History</h3>

            <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                {/* Events */}
                <div className="space-y-6">
                    {historyEvents.map((event, index) => (
                        <div key={index} className="relative flex gap-4">
                            {/* Icon */}
                            <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${getEventColor(event.type)} text-white flex-shrink-0`}>
                                <span className="text-sm">{getEventIcon(event.type)}</span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 pb-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="font-medium text-gray-900">{event.title}</h4>
                                        <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                                        {event.tier && (
                                            <span className="inline-block mt-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium capitalize">
                                                {event.tier} Tier
                                            </span>
                                        )}
                                    </div>
                                    <time className="text-sm text-gray-500 flex-shrink-0 ml-4">
                                        {new Date(event.date).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </time>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Current Status */}
            <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-600">Current Tier</p>
                        <p className="text-lg font-semibold text-gray-900 capitalize">{currentTier}</p>
                    </div>
                    <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                        Upgrade Tier →
                    </button>
                </div>
            </div>
        </div>
    );
}
