/**
 * On-Chain Identity Badge Component
 * Displays user's on-chain identity with ENS, reputation, voting power, and XP badges
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { Shield, Award, Vote, Star, TrendingUp, Zap } from 'lucide-react';

export interface XPBadge {
    id: string;
    name: string;
    icon: 'staking' | 'governance' | 'contribution' | 'engagement';
    level: number;
    color: string;
}

export interface OnChainIdentityData {
    address: string;
    handle?: string;
    ensName?: string;
    reputationScore: number;
    votingPower: number;
    xpBadges: XPBadge[];
    totalContributions: number;
    memberSince?: Date;
}

interface OnChainIdentityBadgeProps {
    address: string;
    identityData?: OnChainIdentityData;
    size?: 'sm' | 'md' | 'lg';
    showTooltip?: boolean;
    zenMode?: boolean;
    className?: string;
}

export const OnChainIdentityBadge: React.FC<OnChainIdentityBadgeProps> = ({
    address,
    identityData,
    size = 'md',
    showTooltip = true,
    zenMode = false,
    className = ''
}) => {
    const [showDetails, setShowDetails] = useState(false);

    // Mock data if not provided
    const data: OnChainIdentityData = identityData || {
        address,
        reputationScore: 750,
        votingPower: 1250,
        xpBadges: [
            { id: '1', name: 'Staker', icon: 'staking', level: 3, color: 'text-blue-500' },
            { id: '2', name: 'Voter', icon: 'governance', level: 2, color: 'text-purple-500' }
        ],
        totalContributions: 42
    };

    const shortenAddress = (addr: string): string => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const getReputationColor = (score: number): string => {
        if (score >= 800) return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30';
        if (score >= 600) return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
        if (score >= 400) return 'text-green-600 bg-green-100 dark:bg-green-900/30';
        if (score >= 200) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
    };

    const getReputationLabel = (score: number): string => {
        if (score >= 800) return 'Elite';
        if (score >= 600) return 'Trusted';
        if (score >= 400) return 'Active';
        if (score >= 200) return 'Member';
        return 'New';
    };

    const getBadgeIcon = (icon: string) => {
        switch (icon) {
            case 'staking':
                return <Zap className="w-3 h-3" />;
            case 'governance':
                return <Vote className="w-3 h-3" />;
            case 'contribution':
                return <Star className="w-3 h-3" />;
            case 'engagement':
                return <TrendingUp className="w-3 h-3" />;
            default:
                return <Award className="w-3 h-3" />;
        }
    };

    const sizeClasses = {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base'
    };

    return (
        <div className={`inline-flex items-center gap-2 ${className}`}>
            {/* ENS Name or Address */}
            <Link href={`/u/${data.address}`} className={`font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors ${sizeClasses[size]}`}>
                {data.handle || data.ensName || shortenAddress(data.address)}
            </Link>

            {/* Reputation Badge */}
            {!zenMode && (
                <div
                    className="relative"
                    onMouseEnter={() => showTooltip && setShowDetails(true)}
                    onMouseLeave={() => showTooltip && setShowDetails(false)}
                >
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getReputationColor(data.reputationScore)}`}>
                        <Shield className="w-3 h-3" />
                        {getReputationLabel(data.reputationScore)}
                    </span>

                    {/* Tooltip */}
                    {showDetails && showTooltip && (
                        <div className="absolute z-50 left-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
                            <div className="space-y-3">
                                {/* Reputation Score */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-gray-500 dark:text-gray-400">Reputation</span>
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">{data.reputationScore}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                        <div
                                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all"
                                            style={{ width: `${(data.reputationScore / 1000) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Voting Power */}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        <Vote className="w-3 h-3" />
                                        Voting Power
                                    </span>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {data.votingPower.toLocaleString()} LDAO
                                    </span>
                                </div>

                                {/* XP Badges */}
                                {data.xpBadges.length > 0 && (
                                    <div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Achievements</div>
                                        <div className="flex flex-wrap gap-1">
                                            {data.xpBadges.map((badge) => (
                                                <div
                                                    key={badge.id}
                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full"
                                                    title={badge.name}
                                                >
                                                    <span className={badge.color}>
                                                        {getBadgeIcon(badge.icon)}
                                                    </span>
                                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                        {badge.name} L{badge.level}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Stats */}
                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500 dark:text-gray-400">Total Contributions</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">{data.totalContributions}</span>
                                    </div>
                                    {data.memberSince && (
                                        <div className="flex items-center justify-between text-xs mt-1">
                                            <span className="text-gray-500 dark:text-gray-400">Member Since</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {data.memberSince.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* XP Badges (visible inline for larger sizes) */}
            {!zenMode && size !== 'sm' && data.xpBadges.length > 0 && (
                <div className="flex items-center gap-1">
                    {data.xpBadges.slice(0, 3).map((badge) => (
                        <div
                            key={badge.id}
                            className={`${badge.color}`}
                            title={`${badge.name} Level ${badge.level}`}
                        >
                            {getBadgeIcon(badge.icon)}
                        </div>
                    ))}
                    {data.xpBadges.length > 3 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            +{data.xpBadges.length - 3}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default OnChainIdentityBadge;
