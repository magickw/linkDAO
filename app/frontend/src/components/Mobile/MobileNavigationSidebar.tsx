import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useMobileAccessibility } from '@/hooks/useMobileAccessibility';
import { QuickFilterPanel } from '@/components/Navigation/QuickFilterPanel';
import { CommunityIconList } from '@/components/Navigation/CommunityIconList';
import { EnhancedUserCard } from '@/components/Navigation/EnhancedUserCard';
import { ActivityIndicators } from '@/components/Navigation/ActivityIndicators';

interface MobileNavigationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: any; // Replace with proper user type
  communities: any[]; // Replace with proper community type
  activeFilters: any[]; // Replace with proper filter type
  onFilterChange: (filters: any[]) => void;
  onCommunitySelect: (communityId: string) => void;
  onUserProfileClick: () => void;
  className?: string;
}

export const MobileNavigationSidebar: React.FC<MobileNavigationSidebarProps> = ({
  isOpen,
  onClose,
  user,
  communities,
  activeFilters,
  onFilterChange,
  onCommunitySelect,
  onUserProfileClick,
  className = ''
}) => {
  const {
    triggerHapticFeedback,
    safeAreaInsets,
    createSwipeHandler,
    touchTargetClasses,
    mobileOptimizedClasses
  } = useMobileOptimization();

  const {
    announceToScreenReader,
    manageFocus,
    accessibilityClasses
  } = useMobileAccessibility();

  const handleSwipeClose = createSwipeHandler({
    onSwipeLeft: () => {
      triggerHapticFeedback('light');
      onClose();
    }
  });

  const handleCommunitySelect = (communityId: string) => {
    triggerHapticFeedback('light');
    onCommunitySelect(communityId);
    onClose();
    announceToScreenReader(`Selected community: ${communityId}`);
  };

  const handleFilterChange = (filters: any[]) => {
    triggerHapticFeedback('light');
    onFilterChange(filters);
    announceToScreenReader(`Applied ${filters.length} filters`);
  };

  const handleUserProfileClick = () => {
    triggerHapticFeedback('light');
    onUserProfileClick();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`
              fixed left-0 top-0 bottom-0 z-50 w-80 max-w-[85vw]
              bg-white dark:bg-gray-900 shadow-2xl overflow-hidden
              ${mobileOptimizedClasses} ${className}
            `}
            style={{ paddingTop: safeAreaInsets.top }}
            {...handleSwipeClose}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Navigation
              </h2>
              <button
                onClick={onClose}
                className={`
                  p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                  rounded-full hover:bg-gray-100 dark:hover:bg-gray-800
                  ${touchTargetClasses} ${accessibilityClasses}
                `}
                aria-label="Close navigation"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {/* User Profile Section */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <EnhancedUserCard
                  user={user}
                  onClick={handleUserProfileClick}
                  className="mobile-optimized cursor-pointer"
                />
              </div>

              {/* Quick Filters */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Quick Filters
                </h3>
                <QuickFilterPanel
                  activeFilters={activeFilters}
                  onFilterChange={handleFilterChange}
                  className="mobile-optimized"
                />
              </div>

              {/* Communities */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Communities
                </h3>
                <CommunityIconList
                  communities={communities}
                  onCommunitySelect={handleCommunitySelect}
                  className="mobile-optimized"
                />
              </div>

              {/* Activity Indicators */}
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Activity
                </h3>
                <ActivityIndicators className="mobile-optimized" />
              </div>

              {/* Additional Navigation Items */}
              <div className="p-4 space-y-2">
                <button
                  className={`
                    w-full flex items-center space-x-3 p-3 rounded-lg text-left
                    text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800
                    ${touchTargetClasses} ${accessibilityClasses}
                  `}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <span>Bookmarks</span>
                </button>

                <button
                  className={`
                    w-full flex items-center space-x-3 p-3 rounded-lg text-left
                    text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800
                    ${touchTargetClasses} ${accessibilityClasses}
                  `}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>Analytics</span>
                </button>

                <button
                  className={`
                    w-full flex items-center space-x-3 p-3 rounded-lg text-left
                    text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800
                    ${touchTargetClasses} ${accessibilityClasses}
                  `}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Settings</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div 
              className="p-4 border-t border-gray-200 dark:border-gray-700"
              style={{ paddingBottom: safeAreaInsets.bottom + 16 }}
            >
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Version 1.0.0
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};