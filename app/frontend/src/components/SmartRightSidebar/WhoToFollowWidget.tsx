import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Check } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';

interface SuggestedUser {
  id: string;
  displayName: string;
  username: string;
  avatar: string;
  isVerified: boolean;
  followerCount: number;
  postCount: number;
}

interface WhoToFollowWidgetProps {
  className?: string;
}

export default function WhoToFollowWidget({ className = '' }: WhoToFollowWidgetProps) {
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [currentUserAddress, setCurrentUserAddress] = useState<string | null>(null);

  useEffect(() => {
    // Get current user address from localStorage or context
    const getCurrentUserAddress = () => {
      try {
        const session = localStorage.getItem('user_session');
        if (session) {
          const sessionData = JSON.parse(session);
          return sessionData.address || null;
        }
      } catch (error) {
        console.error('Error getting current user address:', error);
      }
      return null;
    };

    setCurrentUserAddress(getCurrentUserAddress());
  }, []);

  useEffect(() => {
    const fetchSuggestedUsers = async () => {
      try {
        setIsLoading(true);

        // TODO: Implement API call to fetch suggested users
        // For now, return empty array until the API is ready
        setSuggestedUsers([]);
      } catch (error) {
        console.error('Error fetching suggested users:', error);
        setSuggestedUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestedUsers();
  }, []);

  const handleFollow = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (following.has(userId)) {
      setFollowing(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    } else {
      setFollowing(prev => new Set(prev).add(userId));
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Who to follow</h2>
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : suggestedUsers.length > 0 ? (
          suggestedUsers.map(user => (
            <div
              key={user.id}
              className="flex items-start justify-between py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-700">
                  <img
                    src={user.avatar}
                    alt={user.displayName}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {user.displayName}
                    </span>
                    {user.isVerified && (
                      <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block truncate">
                    @{user.handle}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatNumber(user.followerCount)} followers
                    </span>
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatNumber(user.postCount)} posts
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => handleFollow(user.id, e)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 ${following.has(user.id)
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    : 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200'
                  }`}
              >
                {following.has(user.id) ? (
                  <>
                    <Check className="w-3 h-3" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3 h-3" />
                    Follow
                  </>
                )}
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            No suggestions yet
          </div>
        )}

        <button className="w-full mt-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
          Show more
        </button>
      </div>
    </div>
  );
}