import React from 'react';
import { Skeleton } from './CommunityEnhancements/SharedComponents/LoadingSkeletons';

/**
 * GlobalLoading
 * A premium, branded initial loading state for the application.
 * Replaces the raw "Loading..." text with a proper app shell skeleton.
 */
const GlobalLoading: React.FC = () => {
    return (
        <div className="fixed inset-0 bg-[#0a0b0f] z-[9999] flex overflow-hidden">
            {/* Sidebar Skeleton */}
            <div className="hidden md:flex w-64 flex-col border-r border-white/5 bg-white/[0.02] p-4 gap-6">
                {/* Brand Area */}
                <div className="flex items-center gap-3 px-2">
                    <Skeleton width={32} height={32} borderRadius="8px" className="bg-white/10" />
                    <Skeleton width={120} height={24} className="bg-white/10" />
                </div>

                {/* Navigation Items */}
                <div className="flex flex-col gap-3 mt-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="flex items-center gap-3 px-2 py-2">
                            <Skeleton width={20} height={20} borderRadius="4px" className="bg-white/5" />
                            <Skeleton width="60%" height={16} className="bg-white/5" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative">
                {/* Header Skeleton */}
                <div className="h-16 border-b border-white/5 bg-white/[0.01] flex items-center justify-between px-6">
                    <Skeleton width={200} height={24} className="bg-white/5" />
                    <div className="flex items-center gap-4">
                        <Skeleton width={100} height={36} borderRadius="18px" className="bg-white/5" />
                        <Skeleton width={36} height={36} borderRadius="50%" className="bg-white/10" />
                    </div>
                </div>

                {/* Content Skeleton */}
                <div className="flex-1 p-6 overflow-hidden relative">

                    {/* Center Brand Pulse Animation */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 animate-pulse flex items-center justify-center backdrop-blur-md border border-indigo-500/30">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/50" />
                            </div>
                            <div className="absolute -inset-4 bg-indigo-500/10 blur-xl rounded-full animate-pulse" />
                        </div>
                        <div className="mt-4 text-white/30 text-sm font-medium tracking-[0.2em] animate-pulse">
                            INITIALIZING LINKDAO
                        </div>
                    </div>

                    {/* Background Grid Skeleton Elements (Subtle) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-30 blur-[1px]">
                        <div className="col-span-2 space-y-4">
                            <Skeleton width="100%" height={240} borderRadius="16px" className="bg-white/5" />
                            <Skeleton width="100%" height={120} borderRadius="16px" className="bg-white/5" />
                            <Skeleton width="100%" height={120} borderRadius="16px" className="bg-white/5" />
                        </div>
                        <div className="space-y-4 hidden md:block">
                            <Skeleton width="100%" height={300} borderRadius="16px" className="bg-white/5" />
                            <Skeleton width="100%" height={200} borderRadius="16px" className="bg-white/5" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalLoading;
