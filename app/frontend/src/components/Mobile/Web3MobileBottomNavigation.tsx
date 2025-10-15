import React from 'react';
import { motion } from 'framer-motion';
import { 
  HomeIcon, 
  MagnifyingGlassIcon, 
  PlusIcon, 
  ChatBubbleLeftRightIcon, 
  UserIcon,
  Squares2X2Icon,
  CurrencyDollarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { 
  HomeIcon as HomeIconSolid, 
  MagnifyingGlassIcon as MagnifyingGlassIconSolid, 
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid, 
  UserIcon as UserIconSolid,
  Squares2X2Icon as Squares2X2IconSolid,
  CurrencyDollarIcon as CurrencyDollarIconSolid,
  ChartBarIcon as ChartBarIconSolid
} from '@heroicons/react/24/solid';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useMobileAccessibility } from '@/hooks/useMobileAccessibility';

interface Web3NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeIcon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
  isActive?: boolean;
  web3Feature?: boolean;
  stakingRewards?: number;
  governanceNotifications?: number;
}

interface Web3MobileBottomNavigationProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onCreatePost: () => void;
  unreadMessages?: number;
  stakingRewards?: number;
  governanceNotifications?: number;
  walletConnected?: boolean;
  className?: string;
}

export const Web3MobileBottomNavigation: React.FC<Web3MobileBottomNavigationProps> = ({
  currentPath,
  onNavigate,
  onCreatePost,
  unreadMessages = 0,
  stakingRewards = 0,
  governanceNotifications = 0,
  walletConnected = false,
  className = ''
}) => {
  const { triggerHapticFeedback, touchTargetClasses, safeAreaInsets } = useMobileOptimization();
  const { announceToScreenReader, accessibilityClasses } = useMobileAccessibility();

  const navigationItems: Web3NavigationItem[] = [
    {
      id: 'home',
      label: 'Feed',
      icon: HomeIcon,
      activeIcon: HomeIconSolid,
      href: '/',
      isActive: currentPath === '/'
    },
    {
      id: 'communities',
      label: 'Communities',
      icon: Squares2X2Icon,
      activeIcon: Squares2X2IconSolid,
      href: '/communities',
      isActive: currentPath === '/communities',
      governanceNotifications
    },
    {
      id: 'create',
      label: 'Create',
      icon: PlusIcon,
      activeIcon: PlusIcon,
      href: '#',
      isActive: false
    },
    {
      id: 'staking',
      label: 'Staking',
      icon: CurrencyDollarIcon,
      activeIcon: CurrencyDollarIconSolid,
      href: '/staking',
      isActive: currentPath === '/staking',
      web3Feature: true,
      stakingRewards
    },
    {
      id: 'governance',
      label: 'Governance',
      icon: ChartBarIcon,
      activeIcon: ChartBarIconSolid,
      href: '/governance',
      isActive: currentPath === '/governance',
      web3Feature: true,
      governanceNotifications
    }
  ];

  const handleItemPress = (item: Web3NavigationItem) => {
    triggerHapticFeedback('light');
    
    if (item.id === 'create') {
      onCreatePost();
      announceToScreenReader('Opening post composer');
    } else if (item.web3Feature && !walletConnected) {
      announceToScreenReader('Please connect your wallet to access Web3 features');
      // Could trigger wallet connection modal here
    } else {
      onNavigate(item.href);
      announceToScreenReader(`Navigating to ${item.label}`);
    }
  };

  return (
    <motion.nav
      className={`
        fixed bottom-0 left-0 right-0 z-50
        bg-white/95 dark:bg-gray-900/95
        backdrop-blur-xl border-t border-gray-200 dark:border-gray-700
        shadow-lg
        ${className}
        ${accessibilityClasses}
      `}
      style={{
        paddingBottom: `max(${safeAreaInsets.bottom}px, 8px)`
      }}
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      role="navigation"
      aria-label="Web3 navigation"
    >
      <div className="flex items-center justify-around px-1 py-2">
        {navigationItems.map((item) => {
          const IconComponent = item.isActive ? item.activeIcon : item.icon;
          const isCreateButton = item.id === 'create';
          const isWeb3Feature = item.web3Feature && !walletConnected;
          const hasNotifications = (item.governanceNotifications && item.governanceNotifications > 0) || 
                                 (item.stakingRewards && item.stakingRewards > 0);
          
          return (
            <motion.button
              key={item.id}
              onClick={() => handleItemPress(item)}
              className={`
                relative flex flex-col items-center justify-center
                ${touchTargetClasses}
                ${isCreateButton 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full p-3 shadow-lg' 
                  : 'text-gray-600 dark:text-gray-400 p-2'
                }
                ${item.isActive && !isCreateButton 
                  ? 'text-blue-500 dark:text-blue-400' 
                  : ''
                }
                ${isWeb3Feature ? 'opacity-60' : ''}
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              aria-label={`${item.label}${isWeb3Feature ? ' (requires wallet connection)' : ''}`}
              aria-current={item.isActive ? 'page' : undefined}
            >
              <div className="relative">
                <IconComponent 
                  className={`
                    ${isCreateButton ? 'w-6 h-6' : 'w-6 h-6'}
                    transition-transform duration-200
                  `} 
                />
                
                {/* Web3 feature indicator */}
                {item.web3Feature && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full border border-white dark:border-gray-900" />
                )}
                
                {/* Notification badges */}
                {hasNotifications && (
                  <motion.div
                    className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    aria-label={`${item.governanceNotifications || item.stakingRewards} notifications`}
                  >
                    {(item.governanceNotifications || item.stakingRewards || 0) > 99 ? '99+' : (item.governanceNotifications || item.stakingRewards)}
                  </motion.div>
                )}
                
                {/* Staking rewards indicator */}
                {item.stakingRewards && item.stakingRewards > 0 && (
                  <motion.div
                    className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs rounded-full w-2 h-2"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    aria-label="Staking rewards available"
                  />
                )}
              </div>
              
              {/* Label */}
              {!isCreateButton && (
                <span className={`
                  text-xs mt-1 font-medium
                  ${item.isActive ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}
                  ${isWeb3Feature ? 'opacity-60' : ''}
                  transition-colors duration-200
                `}>
                  {item.label}
                </span>
              )}
              
              {/* Active indicator */}
              {item.isActive && !isCreateButton && (
                <motion.div
                  className="absolute -bottom-1 w-1 h-1 bg-blue-500 rounded-full"
                  layoutId="activeIndicator"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
      
      {/* Wallet connection indicator */}
      {!walletConnected && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-red-500" />
      )}
    </motion.nav>
  );
};

export default Web3MobileBottomNavigation;