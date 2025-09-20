import React, { useState, useEffect } from 'react';
import { LikedByData, ReactionUser, TipActivity, UserProfile } from '../../types/feed';
import { FeedService } from '../../services/feedService';

interface LikedByModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

enum TabType {
  REACTIONS = 'reactions',
  TIPS = 'tips',
  ALL = 'all'
}

export default function LikedByModal({
  postId,
  isOpen,
  onClose,
  className = ''
}: LikedByModalProps) {
  const [data, setData] = useState<LikedByData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(TabType.ALL);

  // Load liked by data when modal opens
  useEffect(() => {
    if (isOpen && postId) {
      loadLikedByData();
    }
  }, [isOpen, postId]);

  const loadLikedByData = async () => {
    setLoading(true);
    setError(null);

    try {
      const likedByData = await FeedService.getLikedByData(postId);
      setData(likedByData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load engagement data');
    } finally {
      setLoading(false);
    }
  };

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`
        relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl
        w-full max-w-md mx-4 max-h-[80vh] overflow-hidden
        ${className}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Post Engagement
          </h2>
          <button
            onClick={onClose}
            className="
              p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
              hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200
            "
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={loadLikedByData} />
          ) : data ? (
            <EngagementContent data={data} activeTab={activeTab} onTabChange={setActiveTab} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Loading state component
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center space-x-3">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-primary-500" />
        <span className="text-gray-600 dark:text-gray-400">Loading engagement data...</span>
      </div>
    </div>
  );
}

// Error state component
interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="text-red-600 dark:text-red-400 text-center mb-4">
        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <p className="text-sm">{error}</p>
      </div>
      <button
        onClick={onRetry}
        className="
          px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg
          text-sm font-medium transition-colors duration-200
        "
      >
        Try Again
      </button>
    </div>
  );
}

// Main engagement content component
interface EngagementContentProps {
  data: LikedByData;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

function EngagementContent({ data, activeTab, onTabChange }: EngagementContentProps) {
  const tabs = [
    {
      type: TabType.ALL,
      label: 'All',
      count: data.reactions.length + data.tips.length,
      icon: '👥'
    },
    {
      type: TabType.REACTIONS,
      label: 'Reactions',
      count: data.reactions.length,
      icon: '❤️'
    },
    {
      type: TabType.TIPS,
      label: 'Tips',
      count: data.tips.length,
      icon: '💰'
    }
  ];

  return (
    <>
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.type}
            onClick={() => onTabChange(tab.type)}
            className={`
              flex-1 flex items-center justify-center space-x-2 py-3 px-4
              text-sm font-medium transition-colors duration-200
              ${activeTab === tab.type
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }
            `}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            <span className="
              px-2 py-0.5 rounded-full text-xs
              bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400
            ">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {activeTab === TabType.ALL && (
          <AllEngagementList reactions={data.reactions} tips={data.tips} followedUsers={data.followedUsers} />
        )}
        {activeTab === TabType.REACTIONS && (
          <ReactionsList reactions={data.reactions} followedUsers={data.followedUsers} />
        )}
        {activeTab === TabType.TIPS && (
          <TipsList tips={data.tips} followedUsers={data.followedUsers} />
        )}
      </div>

      {/* Summary */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
          {data.totalUsers} total users engaged with this post
          {data.followedUsers.length > 0 && (
            <span className="block mt-1">
              Including {data.followedUsers.length} people you follow
            </span>
          )}
        </div>
      </div>
    </>
  );
}

// All engagement list component
interface AllEngagementListProps {
  reactions: ReactionUser[];
  tips: TipActivity[];
  followedUsers: UserProfile[];
}

function AllEngagementList({ reactions, tips, followedUsers }: AllEngagementListProps) {
  // Combine and sort by timestamp
  const allEngagement = [
    ...reactions.map(r => ({ ...r, type: 'reaction' as const })),
    ...tips.map(t => ({ ...t, type: 'tip' as const, address: t.from }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (allEngagement.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">🤷‍♀️</div>
          <p>No engagement yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {allEngagement.map((item, index) => (
        <EngagementItem
          key={`${item.type}-${item.address}-${index}`}
          item={item}
          isFollowed={followedUsers.some(u => u.address === item.address)}
        />
      ))}
    </div>
  );
}

// Reactions list component
interface ReactionsListProps {
  reactions: ReactionUser[];
  followedUsers: UserProfile[];
}

function ReactionsList({ reactions, followedUsers }: ReactionsListProps) {
  if (reactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">❤️</div>
          <p>No reactions yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {reactions.map((reaction, index) => (
        <EngagementItem
          key={`reaction-${reaction.address}-${index}`}
          item={{ ...reaction, type: 'reaction' as const }}
          isFollowed={followedUsers.some(u => u.address === reaction.address)}
        />
      ))}
    </div>
  );
}

// Tips list component
interface TipsListProps {
  tips: TipActivity[];
  followedUsers: UserProfile[];
}

function TipsList({ tips, followedUsers }: TipsListProps) {
  if (tips.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">💰</div>
          <p>No tips yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {tips.map((tip, index) => (
        <EngagementItem
          key={`tip-${tip.from}-${index}`}
          item={{ ...tip, type: 'tip' as const, address: tip.from }}
          isFollowed={followedUsers.some(u => u.address === tip.from)}
        />
      ))}
    </div>
  );
}

// Individual engagement item component
interface EngagementItemProps {
  item: (ReactionUser & { type: 'reaction' }) | (TipActivity & { type: 'tip'; address: string });
  isFollowed: boolean;
}

function EngagementItem({ item, isFollowed }: EngagementItemProps) {
  const displayName = ('username' in item ? item.username : undefined) || `${item.address.slice(0, 6)}...${item.address.slice(-4)}`;
  const avatar = 'avatar' in item ? item.avatar : undefined;

  return (
    <div className="flex items-center space-x-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {avatar ? (
          <img
            src={avatar}
            alt={displayName}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-900 dark:text-white truncate">
            {displayName}
          </span>
          {isFollowed && (
            <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs rounded-full">
              Following
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2 mt-1">
          {item.type === 'reaction' ? (
            <>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Reacted with {item.amount} tokens
              </span>
            </>
          ) : (
            <>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Tipped {item.amount} {item.tokenType}
              </span>
              {item.message && (
                <span className="text-sm text-gray-600 dark:text-gray-300 italic">
                  "{item.message}"
                </span>
              )}
            </>
          )}
        </div>
        
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {new Date(item.timestamp).toLocaleString()}
        </div>
      </div>

      {/* Action indicator */}
      <div className="flex-shrink-0">
        {item.type === 'reaction' ? (
          <div className="text-red-500 text-lg">❤️</div>
        ) : (
          <div className="text-green-500 text-lg">💰</div>
        )}
      </div>
    </div>
  );
}