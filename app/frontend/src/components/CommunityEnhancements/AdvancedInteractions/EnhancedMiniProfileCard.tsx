/**
 * Enhanced Mini Profile Card with ENS Integration
 * Extended profile card that shows ENS/SNS information and validation
 */

import React, { useState, useRef, useEffect } from 'react';
import { MiniProfileCardProps, UserProfile } from '../../../types/communityEnhancements';
import { ResolvedName } from '../../../services/ensService';
import { useAnimation } from '../SharedComponents/AnimationProvider';
import { useENSIntegration } from '../../../hooks/useENSIntegration';
import { ProfileService } from '../../../services/profileService';
import { UserProfile as DbUserProfile } from '../../../models/UserProfile';

export interface EnhancedMiniProfileCardProps extends MiniProfileCardProps {
  resolvedName?: ResolvedName;
  showENSInfo?: boolean;
  showValidationStatus?: boolean;
}

const EnhancedMiniProfileCard: React.FC<EnhancedMiniProfileCardProps> = ({
  userId,
  trigger,
  position = 'top',
  showWalletInfo = true,
  showMutualConnections = true,
  resolvedName,
  showENSInfo = true,
  showValidationStatus = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const { triggerAnimation } = useAnimation();
  const { resolveName, isENSName, isSNSName, isValidAddress } = useENSIntegration();

  // Load user profile data with ENS integration
  const loadUserProfile = async () => {
    if (userProfile || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // Resolve ENS/SNS if not already provided
      let nameResolution = resolvedName;
      if (!nameResolution && (isENSName(userId) || isSNSName(userId))) {
        nameResolution = await resolveName(userId);
      }

      // Mock API call - replace with actual service
      // await new Promise(resolve => setTimeout(resolve, 500));

      // Fetch real profile from backend
      let dbProfile: DbUserProfile | null = null;
      try {
        if (userId.startsWith('0x')) {
          dbProfile = await ProfileService.getProfileByAddress(userId);
        } else {
          dbProfile = await ProfileService.getProfileById(userId);
        }
      } catch (e) {
        console.error('Failed to fetch real profile', e);
      }

      // Enhanced user data with ENS integration
      const displayProfile: UserProfile = {
        id: userId,
        // Use DB profile data if available, otherwise fallback to ENS or default
        username: dbProfile?.displayName || dbProfile?.handle || (nameResolution?.type === 'ens' || nameResolution?.type === 'sns'
          ? nameResolution.original
          : `user_${userId.slice(0, 6)}`),
        ensName: dbProfile?.ens || (nameResolution?.type === 'ens' ? nameResolution.original : undefined),
        avatar: dbProfile?.avatarCid ? `https://ipfs.io/ipfs/${dbProfile.avatarCid}` : (nameResolution?.profile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`),
        reputation: 0, // TODO: Fetch real reputation
        badges: [
          ...(dbProfile && (dbProfile as any).isVerified ? [{
            id: 'verified',
            name: 'Verified',
            icon: '✓',
            description: 'Verified User',
            rarity: 'legendary' as const
          }] : []),
          // Keep ENS badges if needed, or remove to avoid confusion
          ...(nameResolution?.isValid ? [
            {
              id: 'ens-verified',
              name: nameResolution.type === 'ens' ? 'ENS Verified' : 'SNS Verified',
              icon: nameResolution.type === 'ens' ? '⟠' : '◎',
              description: `Verified ${nameResolution.type.toUpperCase()} name`,
              rarity: 'epic' as const
            }
          ] : []),
        ],
        walletAddress: dbProfile?.walletAddress || nameResolution?.resolved || userId,
        mutualConnections: 0,
        isFollowing: false, // TODO: Check following status
      };

      setUserProfile(displayProfile);
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
    }, 300);
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

  // Get validation status info
  const getValidationInfo = () => {
    if (!resolvedName || !showValidationStatus) return null;

    const statusInfo = {
      ens: {
        icon: '⟠',
        label: 'ENS Verified',
        color: 'var(--ce-color-ens, #627eea)',
      },
      sns: {
        icon: '◎',
        label: 'SNS Verified',
        color: 'var(--ce-color-sns, #9945ff)',
      },
      address: {
        icon: '📍',
        label: 'Address',
        color: 'var(--ce-text-secondary)',
      },
    };

    return resolvedName.isValid ? statusInfo[resolvedName.type] : null;
  };

  const validationInfo = getValidationInfo();

  return (
    <div
      className="ce-enhanced-mini-profile-trigger"
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {trigger}

      {isVisible && (
        <div
          className="ce-enhanced-mini-profile-card"
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
              {/* Header with validation status */}
              <div className="ce-profile-header">
                <div className="ce-profile-avatar-container">
                  <img
                    src={userProfile.avatar}
                    alt={userProfile.username}
                    className="ce-profile-avatar"
                  />
                  {validationInfo && (
                    <div
                      className="ce-validation-badge"
                      style={{ backgroundColor: validationInfo.color }}
                      title={validationInfo.label}
                    >
                      {validationInfo.icon}
                    </div>
                  )}
                </div>
                <div className="ce-profile-info">
                  <h4 className="ce-profile-username">{userProfile.username}</h4>
                  {userProfile.ensName && showENSInfo && (
                    <p className="ce-profile-ens">{userProfile.ensName}</p>
                  )}
                  {resolvedName?.profile?.description && (
                    <p className="ce-profile-description">{resolvedName.profile.description}</p>
                  )}
                </div>
              </div>

              {/* ENS Profile Links */}
              {showENSInfo && resolvedName?.profile && (
                <div className="ce-ens-links">
                  {resolvedName.profile.twitter && (
                    <a
                      href={`https://twitter.com/${resolvedName.profile.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ce-ens-link"
                      title="Twitter"
                    >
                      🐦
                    </a>
                  )}
                  {resolvedName.profile.github && (
                    <a
                      href={`https://github.com/${resolvedName.profile.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ce-ens-link"
                      title="GitHub"
                    >
                      🐙
                    </a>
                  )}
                  {resolvedName.profile.website && (
                    <a
                      href={resolvedName.profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ce-ens-link"
                      title="Website"
                    >
                      🌐
                    </a>
                  )}
                </div>
              )}

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
                    <div
                      key={badge.id}
                      className={`ce-badge ce-badge-${badge.rarity}`}
                      title={badge.description}
                    >
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
                  {isValidAddress(userProfile.walletAddress) && (
                    <span className="ce-wallet-verified" title="Valid Ethereum address">✓</span>
                  )}
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
        .ce-enhanced-mini-profile-trigger {
          position: relative;
          display: inline-block;
        }
        
        .ce-enhanced-mini-profile-card {
          position: absolute;
          z-index: var(--ce-z-popover);
          width: 300px;
          background: var(--ce-bg-primary);
          border: 1px solid var(--ce-border-light);
          border-radius: var(--ce-radius-lg);
          box-shadow: var(--ce-shadow-xl);
          padding: var(--ce-space-lg);
          animation: ce-fadeIn 0.2s ease-out;
        }
        
        .ce-profile-avatar-container {
          position: relative;
          display: inline-block;
        }
        
        .ce-validation-badge {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: white;
          border: 2px solid var(--ce-bg-primary);
        }
        
        .ce-ens-links {
          display: flex;
          gap: var(--ce-space-sm);
          margin-bottom: var(--ce-space-md);
          padding-bottom: var(--ce-space-sm);
          border-bottom: 1px solid var(--ce-border-light);
        }
        
        .ce-ens-link {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: var(--ce-radius-md);
          background: var(--ce-bg-secondary);
          text-decoration: none;
          font-size: 14px;
          transition: all 0.2s ease;
        }
        
        .ce-ens-link:hover {
          background: var(--ce-bg-tertiary);
          transform: translateY(-1px);
        }
        
        .ce-profile-description {
          margin: var(--ce-space-xs) 0 0 0;
          font-size: var(--ce-font-size-sm);
          color: var(--ce-text-secondary);
          line-height: 1.4;
          max-height: 2.8em;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        
        .ce-badge-epic {
          background: linear-gradient(135deg, #9c27b0, #673ab7);
          color: white;
        }
        
        .ce-badge-legendary {
          background: linear-gradient(135deg, #ff9800, #f57c00);
          color: white;
        }
        
        .ce-wallet-verified {
          color: var(--ce-color-success);
          font-size: var(--ce-font-size-xs);
          margin-left: var(--ce-space-xs);
        }
        
        /* Inherit all other styles from base component */
        .ce-profile-loading,
        .ce-profile-error,
        .ce-skeleton-avatar,
        .ce-skeleton-content,
        .ce-skeleton-name,
        .ce-skeleton-text,
        .ce-profile-header,
        .ce-profile-avatar,
        .ce-profile-info,
        .ce-profile-username,
        .ce-profile-ens,
        .ce-profile-stats,
        .ce-stat,
        .ce-stat-value,
        .ce-stat-label,
        .ce-profile-badges,
        .ce-badge,
        .ce-badge-icon,
        .ce-badge-name,
        .ce-profile-wallet,
        .ce-wallet-label,
        .ce-wallet-address,
        .ce-profile-actions,
        .ce-button,
        .ce-button-sm {
          /* Styles inherited from MiniProfileCard */
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
          .ce-enhanced-mini-profile-card {
            width: 280px;
            padding: var(--ce-space-md);
          }
        }
      `}</style>
    </div>
  );
};

export default EnhancedMiniProfileCard;