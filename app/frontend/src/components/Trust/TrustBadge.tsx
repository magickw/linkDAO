import React from 'react';

export type VerificationTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
export type VerificationStatus = 'verified' | 'pending' | 'unverified';

interface TrustBadgeProps {
    tier: VerificationTier;
    status: VerificationStatus;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    className?: string;
}

const tierConfig = {
    bronze: {
        color: 'from-amber-700 to-amber-900',
        icon: '🥉',
        label: 'Bronze',
        textColor: 'text-amber-700'
    },
    silver: {
        color: 'from-gray-400 to-gray-600',
        icon: '🥈',
        label: 'Silver',
        textColor: 'text-gray-600'
    },
    gold: {
        color: 'from-yellow-400 to-yellow-600',
        icon: '🥇',
        label: 'Gold',
        textColor: 'text-yellow-600'
    },
    platinum: {
        color: 'from-slate-300 to-slate-500',
        icon: '💎',
        label: 'Platinum',
        textColor: 'text-slate-500'
    },
    diamond: {
        color: 'from-cyan-400 to-blue-600',
        icon: '💠',
        label: 'Diamond',
        textColor: 'text-blue-600'
    }
};

const sizeConfig = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-12 w-12 text-base'
};

export function TrustBadge({
    tier,
    status,
    size = 'md',
    showLabel = false,
    className = ''
}: TrustBadgeProps) {
    const config = tierConfig[tier];
    const sizeClass = sizeConfig[size];

    if (status === 'unverified') {
        return (
            <div className={`inline-flex items-center gap-2 ${className}`}>
                <div className={`${sizeClass} rounded-full bg-gray-200 flex items-center justify-center`}>
                    <span className="text-gray-400">?</span>
                </div>
                {showLabel && (
                    <span className="text-sm text-gray-500">Unverified</span>
                )}
            </div>
        );
    }

    return (
        <div className={`inline-flex items-center gap-2 ${className}`}>
            <div
                className={`${sizeClass} rounded-full bg-gradient-to-br ${config.color} flex items-center justify-center shadow-md relative group cursor-help`}
                title={`${config.label} Tier - ${status === 'verified' ? 'Verified' : 'Pending Verification'}`}
            >
                <span className="text-white font-bold">{config.icon}</span>

                {status === 'verified' && (
                    <div className="absolute -top-1 -right-1 bg-green-500 rounded-full h-3 w-3 border-2 border-white">
                        <svg className="h-2 w-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                )}

                {status === 'pending' && (
                    <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full h-3 w-3 border-2 border-white animate-pulse" />
                )}

                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-50">
                    <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-xl">
                        <div className="font-semibold">{config.label} Tier</div>
                        <div className="text-gray-300">
                            {status === 'verified' ? '✓ Verified Seller' : '⏳ Verification Pending'}
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                    </div>
                </div>
            </div>

            {showLabel && (
                <div className="flex flex-col">
                    <span className={`text-sm font-semibold ${config.textColor}`}>
                        {config.label}
                    </span>
                    {status === 'verified' && (
                        <span className="text-xs text-green-600">✓ Verified</span>
                    )}
                    {status === 'pending' && (
                        <span className="text-xs text-yellow-600">⏳ Pending</span>
                    )}
                </div>
            )}
        </div>
    );
}
