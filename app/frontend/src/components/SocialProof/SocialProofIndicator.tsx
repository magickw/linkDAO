import React, { useState } from 'react';

export interface SocialProofData {
  followedUsersWhoEngaged: UserProfile[];
  totalEngagementFromFollowed: number;
  communityLeadersWhoEngaged: UserProfile[];
  verifiedUsersWhoEngaged: UserProfile[];
}

export interface UserProfile {
  id: string;
  address: string;
  handle?: string;
  displayName?: string;
  avatar?: string;
  verified: boolean;
  reputation?: number;
  badges?: string[];
}

interface SocialProofIndicatorProps {
  socialProof: SocialProofData;
  className?: string;
  maxAvatars?: number;
  showModal?: boolean;
}

export default function SocialProofIndicator({
  socialProof,
  className = '',
  maxAvatars = 3,
  showModal = true
}: SocialProofIndicatorProps) {
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const {
    followedUsersWhoEngaged,
    totalEngagementFromFollowed,
    communityLeadersWhoEngaged,
    verifiedUsersWhoEngaged
  } = socialProof;

  // Combine all engaged users with priority: verified > leaders > followed
  const allEngagedUsers = [
    ...verifiedUsersWhoEngaged,
    ...communityLeadersWhoEngaged.filter(user => !verifiedUsersWhoEngaged.find(v => v.id === user.id)),
    ...followedUsersWhoEngaged.filter(user => 
      !verifiedUsersWhoEngaged.find(v => v.id === user.id) &&
      !communityLeadersWhoEngaged.find(l => l.id === user.id)
    )
  ];

  const displayUsers = allEngagedUsers.slice(0, maxAvatars);
  const remainingCount = allEngagedUsers.length - maxAvatars;

  if (allEngagedUsers.length === 0) {
    return null;
  }

  const generateSocialProofText = () => {
    const verifiedCount = verifiedUsersWhoEngaged.length;
    const leaderCount = communityLeadersWhoEngaged.length;
    const followedCount = followedUsersWhoEngaged.length;

    if (verifiedCount > 0 && leaderCount > 0) {
      return `${verifiedCount} verified user${verifiedCount > 1 ? 's' : ''} and ${leaderCount} community leader${leaderCount > 1 ? 's' : ''} engaged`;
    } else if (verifiedCount > 0) {
      return `${verifiedCount} verified user${verifiedCount > 1 ? 's' : ''} engaged`;
    } else if (leaderCount > 0) {
      return `${leaderCount} community leader${leaderCount > 1 ? 's' : ''} engaged`;
    } else if (followedCount > 0) {
      return `${followedCount} user${followedCount > 1 ? 's' : ''} you follow engaged`;
    }
    return '';
  };

  const UserAvatar = ({ user, size = 'sm' }: { user: UserProfile; size?: 'xs' | 'sm' | 'md' }) => {
    const sizeClasses = {
      xs: 'w-6 h-6',
      sm: 'w-8 h-8',
      md: 'w-10 h-10'
    };

    return (
      <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm`}>
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.displayName || user.handle || 'User'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center">
            <span className="text-white font-bold text-xs">
              {(user.displayName || user.handle || user.address).charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        {/* Verification Badge */}
        {user.verified && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border border-white dark:border-gray-800 flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        
        {/* Community Leader Badge */}
        {communityLeadersWhoEngaged.find(l => l.id === user.id) && !user.verified && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-yellow-500 rounded-full border border-white dark:border-gray-800 flex items-center justify-center">
            <span className="text-white text-xs">👑</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className={`flex items-center space-x-2 ${className}`}>
        {/* Avatar Stack */}
        <div className="flex -space-x-2">
          {displayUsers.map((user, index) => (
            <UserAvatar key={user.id} user={user} />
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

        {/* Engagement Score */}
        {totalEngagementFromFollowed > 0 && (
          <div className="flex items-center space-x-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 rounded-full">
            <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">
              {totalEngagementFromFollowed}
            </span>
            <svg className="w-3 h-3 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
            </svg>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailsModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-96 overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Social Proof
                </h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4 max-h-80 overflow-y-auto">
              {/* Verified Users */}
              {verifiedUsersWhoEngaged.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <svg className="w-4 h-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified Users ({verifiedUsersWhoEngaged.length})
                  </h4>
                  <div className="space-y-2">
                    {verifiedUsersWhoEngaged.map(user => (
                      <div key={user.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                        <UserAvatar user={user} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {user.displayName || user.handle || 'Anonymous'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 font-mono truncate">
                            {user.address.substring(0, 6)}...{user.address.substring(38)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Community Leaders */}
              {communityLeadersWhoEngaged.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <span className="mr-2">👑</span>
                    Community Leaders ({communityLeadersWhoEngaged.length})
                  </h4>
                  <div className="space-y-2">
                    {communityLeadersWhoEngaged.map(user => (
                      <div key={user.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                        <UserAvatar user={user} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {user.displayName || user.handle || 'Anonymous'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 font-mono truncate">
                            {user.address.substring(0, 6)}...{user.address.substring(38)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Followed Users */}
              {followedUsersWhoEngaged.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <svg className="w-4 h-4 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    People You Follow ({followedUsersWhoEngaged.length})
                  </h4>
                  <div className="space-y-2">
                    {followedUsersWhoEngaged.map(user => (
                      <div key={user.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                        <UserAvatar user={user} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {user.displayName || user.handle || 'Anonymous'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 font-mono truncate">
                            {user.address.substring(0, 6)}...{user.address.substring(38)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}