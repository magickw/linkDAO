/**
 * Mini Profile Card
 * Hoverable profile card with user information display
 */

import React, { useState, useRef, useEffect } from 'react';
import { MiniProfileCardProps, UserProfile } from '../../../types/communityEnhancements';
import { useAnimation } from './AnimationProvider';

const MiniProfileCard: React.FC<MiniProfileCardProps> = ({
  userId,
  trigger,
  position = 'top',
  showWalletInfo = true,
  showMutualConnections = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const triggerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const { triggerAnimation } = useAnimation();

  // Load user profile data
  const loadUserProfile = async () => {
    if (userProfile || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Mock API call - replace with actual service
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock user data - replace with actual API response
      const mockProfile: UserProfile = {
        id: userId,
        username: `user_${userId}`,
        ensName: `user${userId}.eth`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
        reputation: Math.floor(Math.random() * 1000) + 100,
        badges: [
          { id: '1', name: 'Early Adopter', icon: '🚀', description: 'Joined in the first month', rarity: 'rare' },
          { id: '2', name: 'Active Contributor', icon: '⭐', description: 'Made 100+ posts', rarity: 'common' },
        ],
        walletAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
        mutualConnections: Math.floor(Math.random() * 50),
        isFollowing: Math.random() > 0.5,
      };
      
      setUserProfile(mockProfile);
    } catch (err) {
      setError('Failed to load profile');
      console.error('Error loading user profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle mouse enter
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      loadUserProfile();
    }, 300); // Delay to prevent accidental triggers
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 150);
  };

  // Handle follow/unfollow
  const handleFollowToggle = async () => {
    if (!userProfile) return;
    
    try {
      // Optimistic update
      setUserProfile(prev => prev ? { ...prev, isFollowing: !prev.isFollowing } : null);
      
      // Trigger celebration animation
      if (cardRef.current) {
        triggerAnimation(cardRef.current, 'celebrate');
      }
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`${userProfile.isFollowing ? 'Unfollowed' : 'Followed'} user ${userId}`);
    } catch (err) {
      // Revert on error
      setUserProfile(prev => prev ? { ...prev, isFollowing: !prev.isFollowing } : null);
      console.error('Error toggling follow:', err);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Calculate card position
  const getCardPosition = () => {
    const positions = {
      top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' },
      bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px' },
      left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '8px' },
      right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '8px' },
    };
    return positions[position];
  };

  return (
    <div 
      className="ce-mini-profile-trigger"
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {trigger}
      
      {isVisible && (
        <div 
          className="ce-mini-profile-card"
          ref={cardRef}
          style={getCardPosition()}
          onMouseEnter={() => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
          }}
          onMouseLeave={handleMouseLeave}
        >
          {isLoading && (
            <div className="ce-profile-loading">
              <div className="ce-skeleton ce-skeleton-avatar"></div>
              <div className="ce-skeleton-content">
                <div className="ce-skeleton ce-skeleton-name"></div>
                <div className="ce-skeleton ce-skeleton-text"></div>
              </div>
            </div>
          )}
          
          {error && (
            <div className="ce-profile-error">
              <p>Failed to load profile</p>
              <button 
                className="ce-button ce-button-secondary ce-button-sm"
                onClick={loadUserProfile}
              >
                Retry
              </button>
            </div>
          )}
          
          {userProfile && !isLoading && (
            <div className="ce-profile-content">
              {/* Header */}
              <div className="ce-profile-header">
                <img 
                  src={userProfile.avatar} 
                  alt={userProfile.username}
                  className="ce-profile-avatar"
                />
                <div className="ce-profile-info">
                  <h4 className="ce-profile-username">{userProfile.username}</h4>
                  {userProfile.ensName && (
                    <p className="ce-profile-ens">{userProfile.ensName}</p>
                  )}
                </div>
              </div>
              
              {/* Stats */}
              <div className="ce-profile-stats">
                <div className="ce-stat">
                  <span className="ce-stat-value">{userProfile.reputation}</span>
                  <span className="ce-stat-label">Reputation</span>
                </div>
                {showMutualConnections && (
                  <div className="ce-stat">
                    <span className="ce-stat-value">{userProfile.mutualConnections}</span>
                    <span className="ce-stat-label">Mutual</span>
                  </div>
                )}
              </div>
              
              {/* Badges */}
              {userProfile.badges.length > 0 && (
                <div className="ce-profile-badges">
                  {userProfile.badges.slice(0, 3).map(badge => (
                    <div key={badge.id} className="ce-badge" title={badge.description}>
                      <span className="ce-badge-icon">{badge.icon}</span>
                      <span className="ce-badge-name">{badge.name}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Wallet Info */}
              {showWalletInfo && (
                <div className="ce-profile-wallet">
                  <span className="ce-wallet-label">Wallet:</span>
                  <span className="ce-wallet-address">
                    {userProfile.walletAddress.slice(0, 6)}...{userProfile.walletAddress.slice(-4)}
                  </span>
                </div>
              )}
              
              {/* Actions */}
              <div className="ce-profile-actions">
                <button 
                  className={`ce-button ${userProfile.isFollowing ? 'ce-button-secondary' : 'ce-button-primary'}`}
                  onClick={handleFollowToggle}
                >
                  {userProfile.isFollowing ? 'Following' : 'Follow'}
                </button>
                <button className="ce-button ce-button-secondary">
                  Message
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      <style jsx>{`
        .ce-mini-profile-trigger {
          position: relative;
          display: inline-block;
        }
        
        .ce-mini-profile-card {
          position: absolute;
          z-index: var(--ce-z-popover);
          width: 280px;
          background: var(--ce-bg-primary);
          border: 1px solid var(--ce-border-light);
          border-radius: var(--ce-radius-lg);
          box-shadow: var(--ce-shadow-xl);
          padding: var(--ce-space-lg);
          animation: ce-fadeIn 0.2s ease-out;
        }
        
        .ce-profile-loading,
        .ce-profile-error {
          display: flex;
          align-items: center;
          gap: var(--ce-space-sm);
          padding: var(--ce-space-md);
        }
        
        .ce-skeleton-avatar {
          width: 40px;
          height: 40px;
          border-radius: var(--ce-radius-full);
        }
        
        .ce-skeleton-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--ce-space-xs);
        }
        
        .ce-skeleton-name {
          height: 1rem;
          width: 80%;
        }
        
        .ce-skeleton-text {
          height: 0.875rem;
          width: 60%;
        }
        
        .ce-profile-error {
          flex-direction: column;
          text-align: center;
        }
        
        .ce-profile-error p {
          margin: 0 0 var(--ce-space-sm) 0;
          color: var(--ce-text-secondary);
          font-size: var(--ce-font-size-sm);
        }
        
        .ce-profile-header {
          display: flex;
          align-items: center;
          gap: var(--ce-space-sm);
          margin-bottom: var(--ce-space-md);
        }
        
        .ce-profile-avatar {
          width: 48px;
          height: 48px;
          border-radius: var(--ce-radius-full);
          border: 2px solid var(--ce-border-light);
        }
        
        .ce-profile-info {
          flex: 1;
        }
        
        .ce-profile-username {
          margin: 0 0 var(--ce-space-xs) 0;
          font-size: var(--ce-font-size-base);
          font-weight: 600;
          color: var(--ce-text-primary);
        }
        
        .ce-profile-ens {
          margin: 0;
          font-size: var(--ce-font-size-sm);
          color: var(--ce-text-secondary);
        }
        
        .ce-profile-stats {
          display: flex;
          gap: var(--ce-space-lg);
          margin-bottom: var(--ce-space-md);
          padding-bottom: var(--ce-space-md);
          border-bottom: 1px solid var(--ce-border-light);
        }
        
        .ce-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        
        .ce-stat-value {
          font-size: var(--ce-font-size-lg);
          font-weight: 600;
          color: var(--ce-text-primary);
        }
        
        .ce-stat-label {
          font-size: var(--ce-font-size-xs);
          color: var(--ce-text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .ce-profile-badges {
          display: flex;
          flex-wrap: wrap;
          gap: var(--ce-space-xs);
          margin-bottom: var(--ce-space-md);
        }
        
        .ce-badge {
          display: flex;
          align-items: center;
          gap: var(--ce-space-xs);
          padding: var(--ce-space-xs) var(--ce-space-sm);
          background: var(--ce-bg-secondary);
          border-radius: var(--ce-radius-full);
          font-size: var(--ce-font-size-xs);
        }
        
        .ce-badge-icon {
          font-size: 0.875rem;
        }
        
        .ce-badge-name {
          color: var(--ce-text-secondary);
        }
        
        .ce-profile-wallet {
          display: flex;
          align-items: center;
          gap: var(--ce-space-sm);
          margin-bottom: var(--ce-space-md);
          padding: var(--ce-space-sm);
          background: var(--ce-bg-secondary);
          border-radius: var(--ce-radius-md);
          font-size: var(--ce-font-size-xs);
        }
        
        .ce-wallet-label {
          color: var(--ce-text-tertiary);
        }
        
        .ce-wallet-address {
          color: var(--ce-text-secondary);
          font-family: monospace;
        }
        
        .ce-profile-actions {
          display: flex;
          gap: var(--ce-space-sm);
        }
        
        .ce-profile-actions .ce-button {
          flex: 1;
          font-size: var(--ce-font-size-xs);
          padding: var(--ce-space-sm);
        }
        
        .ce-button-sm {
          padding: var(--ce-space-xs) var(--ce-space-sm);
          font-size: var(--ce-font-size-xs);
        }
        
        @keyframes ce-fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @media (max-width: 768px) {
          .ce-mini-profile-card {
            width: 260px;
            padding: var(--ce-space-md);
          }
        }
      `}</style>
    </div>
  );
};

export default MiniProfileCard;