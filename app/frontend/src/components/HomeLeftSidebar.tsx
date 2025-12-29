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
        if (address) {
            router.push(`/profile/${address}`);
        }
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
                    </div>
                </div>
            </div>
        </div>
    );
}
