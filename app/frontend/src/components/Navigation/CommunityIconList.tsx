import React from 'react';

interface Community {
  id: string;
  name: string;
  icon: string;
  unreadCount?: number;
}

interface CommunityIconListProps {
  communities: Community[];
  onCommunitySelect: (communityId: string) => void;
  className?: string;
}

export const CommunityIconList: React.FC<CommunityIconListProps> = ({
  communities,
  onCommunitySelect,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {communities.map((community) => (
        <button
          key={community.id}
          onClick={() => onCommunitySelect(community.id)}
          className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
        >
          <div className="text-2xl">{community.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 dark:text-white truncate">
              {community.name}
            </div>
          </div>
          {community.unreadCount && community.unreadCount > 0 && (
            <div className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
              {community.unreadCount}
            </div>
          )}
        </button>
      ))}
    </div>
  );
};