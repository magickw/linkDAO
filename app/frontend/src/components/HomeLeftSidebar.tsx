import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
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

                {/* Quick Navigation */}
                {address && (
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
                        <div className="p-4">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Quick Links</h3>
                            <nav className="space-y-1">
                                <Link
                                    href="/bookmarks"
                                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                                        router.pathname === '/bookmarks'
                                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                    }`}
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                    </svg>
                                    <span className="font-medium">Bookmarks</span>
                                </Link>
                                <Link
                                    href="/profile"
                                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                                        router.pathname === '/profile'
                                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                    }`}
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span className="font-medium">My Profile</span>
                                </Link>
                                <Link
                                    href="/settings"
                                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                                        router.pathname === '/settings'
                                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                    }`}
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="font-medium">Settings</span>
                                </Link>
                            </nav>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
