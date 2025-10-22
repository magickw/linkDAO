import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EnhancedCommunityData, FilterOption } from '../../../types/communityEnhancements';
import { useResponsive } from '../../../design-system/hooks/useResponsive';
import { MobileCommunityIconList } from './MobileCommunityIconList';
import { MobileMultiSelectFilters } from './MobileMultiSelectFilters';
import { MobileQuickNavigationPanel } from './MobileQuickNavigationPanel';
import { useSimpleSwipe } from './utils/touchHandlers';

interface MobileEnhancedLeftSidebarProps {
  communities: EnhancedCommunityData[];
  selectedCommunity?: string;
  availableFilters: FilterOption[];
  selectedFilters: string[];
  onCommunitySelect: (communityId: string) => void;
  onFiltersChange: (filters: string[]) => void;
  onQuickAction: (action: string, communityId?: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * MobileEnhancedLeftSidebar Component
 * 
 * Mobile-optimized version of the enhanced left sidebar with touch-friendly
 * interactions, swipe gestures, and collapsible sections.
 */
export const MobileEnhancedLeftSidebar: React.FC<MobileEnhancedLeftSidebarProps> = ({
  communities,
  selectedCommunity,
  availableFilters,
  selectedFilters,
  onCommunitySelect,
  onFiltersChange,
  onQuickAction,
  isOpen,
  onClose
}) => {
  const { isMobile } = useResponsive();
  const [expandedSections, setExpandedSections] = useState({
    quickNav: true,
    filters: false,
    communities: true
  });

  // Handle swipe gestures for closing sidebar
  const swipeHandlers = useSimpleSwipe({
    onSwipedLeft: () => {
      if (isOpen) {
        onClose();
      }
    }
  });

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  const handleCommunitySelect = useCallback((communityId: string) => {
    onCommunitySelect(communityId);
    // Auto-close on mobile after selection
    if (isMobile) {
      onClose();
    }
  }, [onCommunitySelect, onClose, isMobile]);

  if (!isMobile) {
    return null;
  }

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
            {...swipeHandlers}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring' as any, damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white dark:bg-gray-900 z-50 shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Communities
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close sidebar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Quick Navigation Panel */}
              <CollapsibleSection
                title="Quick Access"
                isExpanded={expandedSections.quickNav}
                onToggle={() => toggleSection('quickNav')}
              >
                <MobileQuickNavigationPanel
                  communities={communities}
                  onCommunitySelect={handleCommunitySelect}
                  onQuickAction={onQuickAction}
                />
              </CollapsibleSection>

              {/* Multi-Select Filters */}
              <CollapsibleSection
                title="Filters"
                isExpanded={expandedSections.filters}
                onToggle={() => toggleSection('filters')}
                badge={selectedFilters.length > 0 ? selectedFilters.length : undefined}
              >
                <MobileMultiSelectFilters
                  availableFilters={availableFilters}
                  selectedFilters={selectedFilters}
                  onFiltersChange={onFiltersChange}
                  allowCombinations={true}
                />
              </CollapsibleSection>

              {/* Community List */}
              <CollapsibleSection
                title="All Communities"
                isExpanded={expandedSections.communities}
                onToggle={() => toggleSection('communities')}
                badge={communities.filter(c => c.userMembership.isJoined).length}
              >
                <MobileCommunityIconList
                  communities={communities}
                  selectedCommunity={selectedCommunity}
                  onCommunitySelect={handleCommunitySelect}
                  showBadges={true}
                />
              </CollapsibleSection>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

interface CollapsibleSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  badge?: number;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  isExpanded,
  onToggle,
  badge,
  children
}) => {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-900 dark:text-white">{title}</span>
          {badge && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {badge}
            </span>
          )}
        </div>
        <motion.svg
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-5 h-5 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileEnhancedLeftSidebar;