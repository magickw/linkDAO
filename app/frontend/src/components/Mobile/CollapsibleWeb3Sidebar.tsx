import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  Squares2X2Icon,
  CurrencyDollarIcon,
  ChartBarIcon,
  UserGroupIcon,
  BellIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useMobileAccessibility } from '@/hooks/useMobileAccessibility';

interface CommunityItem {
  id: string;
  name: string;
  avatar: string;
  memberCount: number;
  isActive: boolean;
  userRole: 'admin' | 'moderator' | 'member';
  tokenBalance?: number;
  governanceNotifications?: number;
  stakingRewards?: number;
}

interface CollapsibleWeb3SidebarProps {
  communities: CommunityItem[];
  currentCommunity?: string;
  onCommunitySelect: (communityId: string) => void;
  onCreateCommunity: () => void;
  walletConnected?: boolean;
  totalStakingRewards?: number;
  governanceNotifications?: number;
  className?: string;
}

export const CollapsibleWeb3Sidebar: React.FC<CollapsibleWeb3SidebarProps> = ({
  communities,
  currentCommunity,
  onCommunitySelect,
  onCreateCommunity,
  walletConnected = false,
  totalStakingRewards = 0,
  governanceNotifications = 0,
  className = ''
}) => {
  const { triggerHapticFeedback, touchTargetClasses, safeAreaInsets } = useMobileOptimization();
  const { announceToScreenReader, accessibilityClasses } = useMobileAccessibility();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Auto-hide on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > lastScrollY;
      
      if (isScrollingDown && currentScrollY > 100) {
        setIsVisible(false);
        setIsExpanded(false);
      } else if (!isScrollingDown) {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleToggle = () => {
    triggerHapticFeedback('medium');
    setIsExpanded(!isExpanded);
    announceToScreenReader(isExpanded ? 'Sidebar collapsed' : 'Sidebar expanded');
  };

  const handleCommunitySelect = (communityId: string) => {
    triggerHapticFeedback('light');
    onCommunitySelect(communityId);
    setIsExpanded(false);
    announceToScreenReader(`Selected community: ${communities.find(c => c.id === communityId)?.name}`);
  };

  const sidebarVariants = {
    collapsed: {
      width: '60px',
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    },
    expanded: {
      width: '280px',
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    },
    hidden: {
      x: '-100%',
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    }
  };

  const contentVariants = {
    collapsed: {
      opacity: 0,
      x: -20,
      transition: { duration: 0.2 }
    },
    expanded: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3, delay: 0.1 }
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          className={`
            fixed left-0 top-20 bottom-20 z-40
            bg-white/95 dark:bg-gray-900/95
            backdrop-blur-xl border-r border-gray-200 dark:border-gray-700
            shadow-lg overflow-hidden
            ${className}
            ${accessibilityClasses}
          `}
          variants={sidebarVariants}
          initial="collapsed"
          animate={isExpanded ? "expanded" : "collapsed"}
          exit="hidden"
          style={{
            paddingTop: `${safeAreaInsets.top}px`,
            paddingBottom: `${safeAreaInsets.bottom}px`
          }}
        >
          {/* Toggle Button */}
          <motion.button
            onClick={handleToggle}
            className={`
              absolute top-4 right-2 z-50
              ${touchTargetClasses}
              bg-gray-100 dark:bg-gray-800 rounded-full p-2
              text-gray-600 dark:text-gray-400
              hover:bg-gray-200 dark:hover:bg-gray-700
              focus:outline-none focus:ring-2 focus:ring-blue-500
              transition-colors duration-200
            `}
            whileTap={{ scale: 0.95 }}
            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isExpanded ? (
              <ChevronLeftIcon className="w-5 h-5" />
            ) : (
              <ChevronRightIcon className="w-5 h-5" />
            )}
          </motion.button>

          {/* Collapsed View - Icons Only */}
          {!isExpanded && (
            <div className="flex flex-col items-center py-6 space-y-4">
              {/* Communities Icon */}
              <button
                onClick={() => setIsExpanded(true)}
                className={`
                  ${touchTargetClasses}
                  p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20
                  text-blue-600 dark:text-blue-400
                  hover:bg-blue-100 dark:hover:bg-blue-900/40
                  transition-colors duration-200
                `}
                aria-label="View communities"
              >
                <Squares2X2Icon className="w-6 h-6" />
                {governanceNotifications > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                )}
              </button>

              {/* Staking Icon */}
              {walletConnected && (
                <button
                  onClick={() => setIsExpanded(true)}
                  className={`
                    ${touchTargetClasses}
                    p-3 rounded-xl bg-green-50 dark:bg-green-900/20
                    text-green-600 dark:text-green-400
                    hover:bg-green-100 dark:hover:bg-green-900/40
                    transition-colors duration-200
                  `}
                  aria-label="View staking rewards"
                >
                  <CurrencyDollarIcon className="w-6 h-6" />
                  {totalStakingRewards > 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  )}
                </button>
              )}

              {/* Governance Icon */}
              {walletConnected && (
                <button
                  onClick={() => setIsExpanded(true)}
                  className={`
                    ${touchTargetClasses}
                    p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20
                    text-purple-600 dark:text-purple-400
                    hover:bg-purple-100 dark:hover:bg-purple-900/40
                    transition-colors duration-200
                  `}
                  aria-label="View governance"
                >
                  <ChartBarIcon className="w-6 h-6" />
                </button>
              )}
            </div>
          )}

          {/* Expanded View - Full Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                variants={contentVariants}
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
                className="p-4 h-full overflow-y-auto"
              >
                {/* Header */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Communities
                  </h2>
                  
                  {/* Web3 Status */}
                  <div className={`
                    flex items-center space-x-2 p-2 rounded-lg
                    ${walletConnected 
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                      : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                    }
                  `}>
                    <div className={`
                      w-2 h-2 rounded-full
                      ${walletConnected ? 'bg-green-500' : 'bg-orange-500'}
                    `} />
                    <span className="text-sm font-medium">
                      {walletConnected ? 'Wallet Connected' : 'Wallet Disconnected'}
                    </span>
                  </div>
                </div>

                {/* Create Community Button */}
                <motion.button
                  onClick={onCreateCommunity}
                  className={`
                    w-full ${touchTargetClasses}
                    bg-gradient-to-r from-blue-500 to-purple-600
                    text-white rounded-xl p-3 mb-4
                    hover:from-blue-600 hover:to-purple-700
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    transition-all duration-200
                    font-medium
                  `}
                  whileTap={{ scale: 0.98 }}
                >
                  + Create Community
                </motion.button>

                {/* Communities List */}
                <div className="space-y-2">
                  {communities.map((community) => (
                    <motion.button
                      key={community.id}
                      onClick={() => handleCommunitySelect(community.id)}
                      className={`
                        w-full ${touchTargetClasses}
                        flex items-center space-x-3 p-3 rounded-xl
                        ${currentCommunity === community.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        }
                        transition-all duration-200
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                      `}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Community Avatar */}
                      <div className="relative">
                        <img
                          src={community.avatar}
                          alt={community.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        {community.isActive && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
                        )}
                      </div>

                      {/* Community Info */}
                      <div className="flex-1 text-left">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">
                            {community.name}
                          </h3>
                          {/* Role Badge */}
                          <span className={`
                            px-2 py-0.5 text-xs rounded-full
                            ${community.userRole === 'admin' 
                              ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                              : community.userRole === 'moderator'
                              ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            }
                          `}>
                            {community.userRole}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {community.memberCount.toLocaleString()} members
                          </span>
                          
                          {/* Web3 Indicators */}
                          <div className="flex items-center space-x-1">
                            {community.tokenBalance && community.tokenBalance > 0 && (
                              <div className="flex items-center space-x-1 text-xs text-green-600 dark:text-green-400">
                                <CurrencyDollarIcon className="w-3 h-3" />
                                <span>{community.tokenBalance}</span>
                              </div>
                            )}
                            
                            {community.governanceNotifications && community.governanceNotifications > 0 && (
                              <div className="flex items-center space-x-1 text-xs text-purple-600 dark:text-purple-400">
                                <BellIcon className="w-3 h-3" />
                                <span>{community.governanceNotifications}</span>
                              </div>
                            )}
                            
                            {community.stakingRewards && community.stakingRewards > 0 && (
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Web3 Summary */}
                {walletConnected && (
                  <div className="mt-6 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      Web3 Summary
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total Staking Rewards:</span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {totalStakingRewards} tokens
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Governance Notifications:</span>
                        <span className="font-medium text-purple-600 dark:text-purple-400">
                          {governanceNotifications}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default CollapsibleWeb3Sidebar;