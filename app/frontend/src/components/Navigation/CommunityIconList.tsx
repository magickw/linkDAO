import React from 'react';

interface Community {
  id: string;
  name: string;
  icon: string;
  unreadCount?: number;
  isJoined?: boolean;
  displayName?: string;
  avatar?: string;
}

interface CommunityIconListProps {
  communities: Community[];
  onCommunitySelect: (communityId: string) => void;
  favoriteCommunities?: string[];
  onToggleFavorite?: (communityId: string) => void;
  className?: string;
}

export const CommunityIconList: React.FC<CommunityIconListProps> = ({
  communities,
  onCommunitySelect,
  favoriteCommunities = [],
  onToggleFavorite,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {communities.map((community) => (
        <div key={community.id} className="flex items-center">
          <button
            onClick={() => onCommunitySelect(community.id)}
            className="flex-1 flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
          >
            <div className="text-2xl">
              {community.avatar ? (
                <img 
                  src={community.avatar} 
                  alt={community.displayName || community.name} 
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                community.icon || '👥'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 dark:text-white truncate">
                {community.displayName || community.name}
              </div>
            </div>
            {community.unreadCount && community.unreadCount > 0 && (
              <div className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                {community.unreadCount}
              </div>
            )}
          </button>
          {onToggleFavorite && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(community.id);
              }}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label={favoriteCommunities.includes(community.id) ? "Remove from favorites" : "Add to favorites"}
            >
              <svg 
                className={`w-4 h-4 ${favoriteCommunities.includes(community.id) ? 'text-yellow-400 fill-current' : 'text-gray-400'}`} 
                viewBox="0 0 24 24"
              >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
};