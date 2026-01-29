import React, { useState, useEffect } from 'react';
import { EngagementAnalyticsService } from '../../services/engagementAnalyticsService';
import type { 
  SocialProofIndicators,
  FollowerEngagement,
  VerifiedUserEngagement,
  CommunityLeaderEngagement
} from '../../types/engagementAnalytics';

interface EnhancedSocialProofIndicatorProps {
  postId: string;
  className?: string;
  maxAvatars?: number;
  showModal?: boolean;
  showEngagementTypes?: boolean;
  prioritizeInfluencers?: boolean;
}

function EnhancedSocialProofIndicator({
  postId,
  className = '',
  maxAvatars = 5,
  showModal = true,
  showEngagementTypes = true,
  prioritizeInfluencers = true
}: EnhancedSocialProofIndicatorProps) {
  const [indicators, setIndicators] = useState<SocialProofIndicators | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSocialProofIndicators();
  }, [postId]);

  const loadSocialProofIndicators = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await EngagementAnalyticsService.getSocialProofIndicators(postId);
      setIndicators(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load social proof data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState className={className} />;
  }

  if (error || !indicators) {
    return null;
  }

  // Combine all engaged users with priority: verified > leaders > followers
  const allEngagedUsers = [
    ...indicators.verifiedUsersWhoEngaged.map(user => ({ ...user, type: 'verified' as const, priority: 3 })),
    ...indicators.communityLeadersWhoEngaged.map(user => ({ ...user, type: 'leader' as const, priority: 2 })),
    ...indicators.followedUsersWhoEngaged.map(user => ({ ...user, type: 'follower' as const, priority: 1 }))
  ];

  // Sort by priority if enabled, otherwise by timestamp
  const sortedUsers = prioritizeInfluencers 
    ? allEngagedUsers.sort((a, b) => b.priority - a.priority || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : allEngagedUsers.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const displayUsers = sortedUsers.slice(0, maxAvatars);
  const remainingCount = Math.max(0, sortedUsers.length - maxAvatars);

  if (sortedUsers.length === 0) {
    return null;
  }

  const generateSocialProofText = () => {
    const verifiedCount = indicators.verifiedUsersWhoEngaged.length;
    const leaderCount = indicators.communityLeadersWhoEngaged.length;
    const followerCount = indicators.followedUsersWhoEngaged.length;
    const totalCount = verifiedCount + leaderCount + followerCount;

    if (verifiedCount > 0 && leaderCount > 0) {
      return `${verifiedCount} verified user${verifiedCount > 1 ? 's' : ''}, ${leaderCount} community leader${leaderCount > 1 ? 's' : ''}, and ${totalCount - verifiedCount - leaderCount} other${totalCount - verifiedCount - leaderCount > 1 ? 's' : ''} engaged`;
    } else if (verifiedCount > 0) {
      return `${verifiedCount} verified user${verifiedCount > 1 ? 's' : ''} and ${totalCount - verifiedCount} other${totalCount - verifiedCount > 1 ? 's' : ''} engaged`;
    } else if (leaderCount > 0) {
      return `${leaderCount} community leader${leaderCount > 1 ? 's' : ''} and ${totalCount - leaderCount} other${totalCount - leaderCount > 1 ? 's' : ''} engaged`;
    } else if (followerCount > 0) {
      return `${followerCount} user${followerCount > 1 ? 's' : ''} you follow engaged`;
    }
    return `${totalCount} user${totalCount > 1 ? 's' : ''} engaged`;
  };

  return (
    <>
      <div className={`flex items-center space-x-3 ${className}`}>
        {/* Avatar Stack */}
        <div className="flex -space-x-2">
          {displayUsers.map((user, index) => (
            <UserAvatar key={`${user.type}-${user.userId}`} user={user} />
          ))}
          
          {remainingCount > 0 && (
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center shadow-sm">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                +{remainingCount}
              </span>
            </div>
          )}
        </div>

        {/* Social Proof Text */}
        <div className="flex-1 min-w-0">
          <button
            onClick={() => showModal && setShowDetailsModal(true)}
            className={`text-sm text-gray-600 dark:text-gray-400 ${showModal ? 'hover:text-gray-800 dark:hover:text-gray-200 hover:underline' : ''} transition-colors duration-200`}
          >
            {generateSocialProofText()}
          </button>
        </div>

        {/* Social Proof Score */}
        <div className="flex items-center space-x-2">
          {/* Engagement Types */}
          {showEngagementTypes && (
            <div className="flex items-center space-x-1">
              {indicators.verifiedUsersWhoEngaged.length > 0 && (
                <span className="text-blue-500 text-sm" title="Verified users engaged">
                  ✓
                </span>
              )}
              {indicators.communityLeadersWhoEngaged.length > 0 && (
                <span className="text-yellow-500 text-sm" title="Community leaders engaged">
                  👑
                </span>
              )}
              {indicators.followedUsersWhoEngaged.length > 0 && (
                <span className="text-green-500 text-sm" title="Followed users engaged">
                  👥
                </span>
              )}
            </div>
          )}

          {/* Social Proof Level Indicator */}
          <SocialProofLevelBadge level={indicators.socialProofLevel} score={indicators.socialProofScore} />
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && showModal && (
        <SocialProofDetailsModal
          indicators={indicators}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
    </>
  );
}

// User avatar component with enhanced badges
interface UserAvatarProps {
  user: (FollowerEngagement | VerifiedUserEngagement | CommunityLeaderEngagement) & { 
    type: 'verified' | 'leader' | 'follower';
    priority: number;
  };
  size?: 'xs' | 'sm' | 'md';
}

function UserAvatar({ user, size = 'sm' }: UserAvatarProps) {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10'
  };

  const displayName = user.displayName || user.handle || 'Anonymous';

  return (
    <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm`}>
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={displayName}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center">
          <span className="text-white font-bold text-xs">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      
      {/* Type-specific badges */}
      {user.type === 'verified' && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border border-white dark:border-gray-800 flex items-center justify-center">
          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
      
      {user.type === 'leader' && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-yellow-500 rounded-full border border-white dark:border-gray-800 flex items-center justify-center">
          <span className="text-white text-xs">👑</span>
        </div>
      )}
      
      {user.type === 'follower' && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border border-white dark:border-gray-800 flex items-center justify-center">
          <span className="text-white text-xs">•</span>
        </div>
      )}
    </div>
  );
}

// Social proof level badge
interface SocialProofLevelBadgeProps {
  level: 'low' | 'medium' | 'high' | 'exceptional';
  score: number;
}

function SocialProofLevelBadge({ level, score }: SocialProofLevelBadgeProps) {
  const levelConfig = {
    low: { color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400', icon: '📊' },
    medium: { color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400', icon: '📈' },
    high: { color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400', icon: '🔥' },
    exceptional: { color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400', icon: '⭐' }
  };

  const config = levelConfig[level];

  return (
    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${config.color}`}>
      <span className="text-xs">{config.icon}</span>
      <span className="text-xs font-semibold">
        {score}
      </span>
    </div>
  );
}

// Social proof details modal
interface SocialProofDetailsModalProps {
  indicators: SocialProofIndicators;
  onClose: () => void;
}

function SocialProofDetailsModal({ indicators, onClose }: SocialProofDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-96 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Social Proof Details
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Social Proof Score */}
          <div className="mt-2 flex items-center space-x-2">
            <SocialProofLevelBadge level={indicators.socialProofLevel} score={indicators.socialProofScore} />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Social Proof Score
            </span>
          </div>
        </div>

        {/* Modal Content */}
        <div className="px-6 py-4 max-h-80 overflow-y-auto">
          {/* Verified Users */}
          {indicators.verifiedUsersWhoEngaged.length > 0 && (
            <EngagementSection
              title="Verified Users"
              icon="✓"
              iconColor="text-blue-500"
              users={indicators.verifiedUsersWhoEngaged}
              type="verified"
            />
          )}

          {/* Community Leaders */}
          {indicators.communityLeadersWhoEngaged.length > 0 && (
            <EngagementSection
              title="Community Leaders"
              icon="👑"
              iconColor="text-yellow-500"
              users={indicators.communityLeadersWhoEngaged}
              type="leader"
            />
          )}

          {/* Followed Users */}
          {indicators.followedUsersWhoEngaged.length > 0 && (
            <EngagementSection
              title="People You Follow"
              icon="👥"
              iconColor="text-green-500"
              users={indicators.followedUsersWhoEngaged}
              type="follower"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Engagement section in modal
interface EngagementSectionProps {
  title: string;
  icon: string;
  iconColor: string;
  users: (FollowerEngagement | VerifiedUserEngagement | CommunityLeaderEngagement)[];
  type: 'verified' | 'leader' | 'follower';
}

function EngagementSection({ title, icon, iconColor, users, type }: EngagementSectionProps) {
  return (
    <div className="mb-6">
      <h4 className={`text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center`}>
        <span className={`mr-2 ${iconColor}`}>{icon}</span>
        {title} ({users.length})
      </h4>
      <div className="space-y-2">
        {users.map((user) => (
          <EngagementUserItem key={user.userId} user={user} type={type} />
        ))}
      </div>
    </div>
  );
}

// Individual user item in engagement section
interface EngagementUserItemProps {
  user: FollowerEngagement | VerifiedUserEngagement | CommunityLeaderEngagement;
  type: 'verified' | 'leader' | 'follower';
}

function EngagementUserItem({ user, type }: EngagementUserItemProps) {
  const displayName = user.displayName || user.handle || 'Anonymous';
  
  const getInteractionIcon = (interactionType: string) => {
    switch (interactionType) {
      case 'reaction': return '❤️';
      case 'comment': return '💬';
      case 'share': return '🔄';
      case 'tip': return '💰';
      default: return '👍';
    }
  };

  const getInteractionText = (user: any) => {
    const icon = getInteractionIcon(user.interactionType);
    let text = `${icon} ${user.interactionType}`;
    
    if (user.interactionValue) {
      text += ` (${user.interactionValue})`;
    }
    
    return text;
  };

  const getAdditionalInfo = () => {
    if (type === 'verified' && 'followerCount' in user) {
      return `${(user.followerCount! / 1000).toFixed(0)}K followers`;
    }
    if (type === 'leader' && 'communityName' in user) {
      return `${user.communityName} • ${user.leadershipRole}`;
    }
    if (type === 'follower' && 'mutualFollowers' in user) {
      return `${user.mutualFollowers} mutual connections`;
    }
    return null;
  };

  return (
    <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
      <UserAvatar user={{ ...user, type, priority: 1 }} size="md" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 dark:text-white truncate">
          {displayName}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {getInteractionText(user)}
        </div>
        {getAdditionalInfo() && (
          <div className="text-xs text-gray-400 dark:text-gray-500">
            {getAdditionalInfo()}
          </div>
        )}
      </div>
      <div className="text-xs text-gray-400 dark:text-gray-500">
        {new Date(user.timestamp).toLocaleDateString()}
      </div>
    </div>
  );
}

// Loading state component
function LoadingState({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex -space-x-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
        ))}
      </div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32" />
    </div>
  );
}

export default EnhancedSocialProofIndicator;
export { EnhancedSocialProofIndicator };