import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { EnhancedCommunityData } from '../../../types/communityEnhancements';

interface MobileQuickNavigationPanelProps {
  communities: EnhancedCommunityData[];
  onCommunitySelect: (communityId: string) => void;
  onQuickAction: (action: string, communityId?: string) => void;
}

/**
 * MobileQuickNavigationPanel Component
 * 
 * Touch-optimized quick access panel with frequently accessed communities,
 * recent activity indicators, and quick action buttons.
 */
export const MobileQuickNavigationPanel: React.FC<MobileQuickNavigationPanelProps> = ({
  communities,
  onCommunitySelect,
  onQuickAction
}) => {
  // Get frequently accessed and recently active communities
  const { frequentCommunities, recentCommunities, urgentCommunities } = useMemo(() => {
    const joined = communities.filter(c => c.userMembership.isJoined);
    
    // Sort by activity and engagement
    const frequent = joined
      .sort((a, b) => b.activityMetrics.engagementRate - a.activityMetrics.engagementRate)
      .slice(0, 4);
    
    const recent = joined
      .filter(c => c.activityMetrics.postsToday > 0)
      .sort((a, b) => b.activityMetrics.postsToday - a.activityMetrics.postsToday)
      .slice(0, 3);
    
    const urgent = joined
      .filter(c => c.governance.activeProposals > 0 && c.governance.nextDeadline)
      .sort((a, b) => {
        const aTime = a.governance.nextDeadline?.getTime() || Infinity;
        const bTime = b.governance.nextDeadline?.getTime() || Infinity;
        return aTime - bTime;
      })
      .slice(0, 2);

    return { frequentCommunities: frequent, recentCommunities: recent, urgentCommunities: urgent };
  }, [communities]);

  const handleCommunityPress = (communityId: string) => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    onCommunitySelect(communityId);
  };

  const handleQuickAction = (action: string, communityId?: string) => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
    onQuickAction(action, communityId);
  };

  return (
    <div className="px-4 space-y-6">
      {/* Quick Actions */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-3">
          <QuickActionButton
            icon="📝"
            label="Create Post"
            onClick={() => handleQuickAction('create-post')}
            color="bg-blue-500"
          />
          <QuickActionButton
            icon="🗳️"
            label="Vote"
            onClick={() => handleQuickAction('governance')}
            color="bg-purple-500"
            badge={urgentCommunities.reduce((sum, c) => sum + c.governance.activeProposals, 0)}
          />
          <QuickActionButton
            icon="🔍"
            label="Explore"
            onClick={() => handleQuickAction('explore')}
            color="bg-green-500"
          />
          <QuickActionButton
            icon="💰"
            label="Rewards"
            onClick={() => handleQuickAction('rewards')}
            color="bg-yellow-500"
          />
        </div>
      </div>

      {/* Urgent Governance */}
      {urgentCommunities.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-3 flex items-center">
            <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
            Urgent Votes
          </h4>
          <div className="space-y-2">
            {urgentCommunities.map((community) => (
              <UrgentCommunityItem
                key={community.id}
                community={community}
                onSelect={handleCommunityPress}
              />
            ))}
          </div>
        </div>
      )}

      {/* Frequently Accessed */}
      {frequentCommunities.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Frequently Accessed</h4>
          <div className="grid grid-cols-2 gap-2">
            {frequentCommunities.map((community) => (
              <FrequentCommunityItem
                key={community.id}
                community={community}
                onSelect={handleCommunityPress}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recentCommunities.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Recent Activity</h4>
          <div className="space-y-2">
            {recentCommunities.map((community) => (
              <RecentCommunityItem
                key={community.id}
                community={community}
                onSelect={handleCommunityPress}
              />
            ))}
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Hint */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          💡 Long press for more options
        </p>
      </div>
    </div>
  );
};

interface QuickActionButtonProps {
  icon: string;
  label: string;
  onClick: () => void;
  color: string;
  badge?: number;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon,
  label,
  onClick,
  color,
  badge
}) => {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center p-4 rounded-xl text-white ${color} shadow-lg hover:shadow-xl transition-all duration-200`}
    >
      <span className="text-2xl mb-1">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
      
      {badge && badge > 0 && (
        <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </motion.button>
  );
};

interface UrgentCommunityItemProps {
  community: EnhancedCommunityData;
  onSelect: (communityId: string) => void;
}

const UrgentCommunityItem: React.FC<UrgentCommunityItemProps> = ({
  community,
  onSelect
}) => {
  const timeRemaining = community.governance.nextDeadline 
    ? Math.max(0, community.governance.nextDeadline.getTime() - Date.now())
    : 0;
  
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(community.id)}
      className="w-full flex items-center space-x-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
    >
      <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
        <img
          src={community.icon}
          alt={community.name}
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="flex-1 min-w-0 text-left">
        <p className="font-medium text-gray-900 dark:text-white truncate">
          {community.name}
        </p>
        <p className="text-sm text-red-600 dark:text-red-400">
          {community.governance.activeProposals} proposals • {hoursRemaining}h left
        </p>
      </div>
      
      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </motion.button>
  );
};

interface FrequentCommunityItemProps {
  community: EnhancedCommunityData;
  onSelect: (communityId: string) => void;
}

const FrequentCommunityItem: React.FC<FrequentCommunityItemProps> = ({
  community,
  onSelect
}) => {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => onSelect(community.id)}
      className="flex flex-col items-center p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 mb-2">
        <img
          src={community.icon}
          alt={community.name}
          className="w-full h-full object-cover"
        />
      </div>
      <span className="text-sm font-medium text-gray-900 dark:text-white text-center truncate w-full">
        {community.name}
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {Math.round(community.activityMetrics.engagementRate * 100)}% active
      </span>
    </motion.button>
  );
};

interface RecentCommunityItemProps {
  community: EnhancedCommunityData;
  onSelect: (communityId: string) => void;
}

const RecentCommunityItem: React.FC<RecentCommunityItemProps> = ({
  community,
  onSelect
}) => {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(community.id)}
      className="w-full flex items-center space-x-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
    >
      <div className="relative">
        <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
          <img
            src={community.icon}
            alt={community.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white dark:border-gray-800"></div>
      </div>
      
      <div className="flex-1 min-w-0 text-left">
        <p className="font-medium text-gray-900 dark:text-white truncate">
          {community.name}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {community.activityMetrics.postsToday} new posts today
        </p>
      </div>
      
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </motion.button>
  );
};

export default MobileQuickNavigationPanel;