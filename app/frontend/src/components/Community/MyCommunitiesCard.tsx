import React from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { Community } from '@/models/Community';
import CommunityAvatar from './CommunityAvatar';

interface MyCommunitiesCardProps {
  communities: Community[];
  maxDisplay?: number;
  onManageClick?: () => void;
}

const MyCommunitiesCard: React.FC<MyCommunitiesCardProps> = ({
  communities,
  maxDisplay = 10,
  onManageClick
}) => {
  const displayedCommunities = communities.slice(0, maxDisplay);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          My Communities
        </h2>
        <button
          onClick={onManageClick}
          className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          title="Manage Communities"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Manage</span>
        </button>
      </div>

      <div className="p-2">
        {displayedCommunities.length === 0 ? (
          <div className="text-center py-6 px-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              You haven't joined any communities yet
            </p>
            <Link
              href="/communities"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Explore Communities
            </Link>
          </div>
        ) : (
          <>
            {displayedCommunities.map((community) => (
              <Link
                key={community.id}
                href={`/communities/${encodeURIComponent(community.slug ?? community.id ?? community.name ?? '')}`}
                className="w-full flex items-center space-x-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
              >
                <CommunityAvatar
                  avatar={community.avatar}
                  name={community.displayName || community.name}
                  size="sm"
                />
                <div className="text-left flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {community.displayName || community.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {community.memberCount?.toLocaleString() || 0} members
                  </div>
                </div>
              </Link>
            ))}

            {communities.length > maxDisplay && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={onManageClick}
                  className="w-full text-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  View all {communities.length} communities
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MyCommunitiesCard;
