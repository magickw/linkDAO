import React from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import { useProfile } from '@/hooks/useProfile';
import { EnhancedUserCard } from '@/components/Navigation';
import { useNavigation } from '@/context/NavigationContext';

interface HomeLeftSidebarProps {
    className?: string;
}

export default function HomeLeftSidebar({ className = '' }: HomeLeftSidebarProps) {
    const router = useRouter();
    const { address } = useAccount();
    const { profile } = useProfile(address);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userPreferences, updateUserPreferences } = useNavigation();

    const handleProfileClick = () => {
        router.push('/profile');
    };

    return (
        <div className={`flex flex-col h-full bg-white dark:bg-gray-800 overflow-y-auto ${className}`}>
            {/* Enhanced User Profile Card */}
            <div className="space-y-4">
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
                    <div className="p-4">
                        <EnhancedUserCard
                            user={profile as any}
                            address={address}
                            profile={profile as any}
                            onClick={handleProfileClick}
                        />

                        {/* Profile Details */}
                        {profile && (
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Member Since</span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Recently'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Reputation</span>
                                    <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium">
                                        <span className="mr-1">🏆</span>
                                        {(profile as any).reputationScore || 0}
                                    </div>
                                </div>
                                {(profile as any)?.xpBadges?.length > 0 && (
                                    <div className="pt-2">
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Badges</div>
                                        <div className="flex flex-wrap gap-2">
                                            {(profile as any).xpBadges.slice(0, 4).map((badge: string, i: number) => (
                                                <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                                    {badge}
                                                </span>
                                            ))}
                                            {(profile as any).xpBadges.length > 4 && (
                                                <span className="px-2 py-0.5 text-xs text-gray-500">+{(profile as any).xpBadges.length - 4}</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Stats Dashboard */}
                {profile && (
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden p-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Quick Stats</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center transition-transform hover:scale-105">
                                <div className="text-xl font-bold text-gray-900 dark:text-white">{(profile as any).postCount || 0}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Posts</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center transition-transform hover:scale-105">
                                <div className="text-xl font-bold text-gray-900 dark:text-white">{(profile as any).commentCount || 0}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Comments</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center col-span-2 transition-transform hover:scale-105">
                                <div className="text-xl font-bold text-primary-600 dark:text-primary-400">
                                    {((profile as any).totalEarned || 0).toLocaleString()} <span className="text-xs font-normal text-gray-500">LDAO</span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Total Earned</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
