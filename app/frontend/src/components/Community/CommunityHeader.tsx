/**
 * CommunityHeader Component
 * Community header with banner, info, join/leave functionality, and real-time member count
 */

import React, { useState } from 'react';
import Image from 'next/image';
import { Community } from '../../models/Community';
import { formatNumber } from '../../utils/formatters';
import CommunityJoinButton from './CommunityJoinButton';

interface CommunityStats {
  memberCount: number;
  postCount: number;
  activeMembers: number;
  postsThisWeek: number;
  growthRate: number;
}

interface MembershipStatus {
  isMember: boolean;
  role?: 'member' | 'moderator' | 'admin';
  joinedAt?: Date;
  canPost: boolean;
  canModerate: boolean;
}

interface CommunityHeaderProps {
  community: Community;
  stats: CommunityStats | null;
  membershipStatus: MembershipStatus;
  onJoinLeave: () => void;
  canModerate: boolean;
  isConnected: boolean;
}

export const CommunityHeader: React.FC<CommunityHeaderProps> = ({
  community,
  stats,
  membershipStatus,
  onJoinLeave,
  canModerate,
  isConnected
}) => {
  const [isJoining, setIsJoining] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleJoinLeave = async () => {
    setIsJoining(true);
    try {
      await onJoinLeave();
    } finally {
      setIsJoining(false);
    }
  };

  const getMembershipBadge = () => {
    if (!membershipStatus.isMember) return null;
    
    const roleColors = {
      admin: '#ff6b6b',
      moderator: '#4ecdc4',
      member: '#45b7d1'
    };

    const role = membershipStatus.role || 'member';
    
    return (
      <span 
        className="membership-badge"
        style={{ backgroundColor: roleColors[role] }}
      >
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  const getConnectionStatus = () => {
    return (
      <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
        <div className="status-dot"></div>
        <span>{isConnected ? 'Live' : 'Offline'}</span>
      </div>
    );
  };

  return (
    <header className="community-header">
      {/* Banner Image */}
      {community.banner && (
        <div className="community-banner">
          <Image
            src={community.banner}
            alt={`${community.displayName} banner`}
            fill
            style={{ objectFit: 'cover' }}
            priority
          />
          <div className="banner-overlay"></div>
        </div>
      )}

      {/* Header Content */}
      <div className="header-content">
        <div className="community-info">
          {/* Avatar */}
          <div className="community-avatar">
            {community.avatar ? (
              <Image
                src={community.avatar}
                alt={community.displayName}
                width={80}
                height={80}
                className="avatar-image"
              />
            ) : (
              <div className="avatar-placeholder">
                {community.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="community-details">
            <div className="title-row">
              <h1 className="community-title">{community.displayName}</h1>
              {getMembershipBadge()}
              {getConnectionStatus()}
            </div>
            
            <p className="community-name">r/{community.name}</p>
            <p className="community-description">{community.description}</p>

            {/* Tags */}
            {community.tags.length > 0 && (
              <div className="community-tags">
                {community.tags.map((tag, index) => (
                  <span key={index} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats and Actions */}
        <div className="header-actions">
          {/* Community Stats */}
          {stats && (
            <div className="community-stats">
              <div className="stat">
                <span className="stat-value">{formatNumber(stats.memberCount)}</span>
                <span className="stat-label">Members</span>
              </div>
              <div className="stat">
                <span className="stat-value">{formatNumber(stats.postCount)}</span>
                <span className="stat-label">Posts</span>
              </div>
              <div className="stat">
                <span className="stat-value">{formatNumber(stats.activeMembers)}</span>
                <span className="stat-label">Online</span>
              </div>
              {stats.growthRate > 0 && (
                <div className="stat growth">
                  <span className="stat-value">+{stats.growthRate}%</span>
                  <span className="stat-label">Growth</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="action-buttons">
            <CommunityJoinButton
              communityId={community.id}
              communityName={community.displayName}
              memberCount={stats?.memberCount || community.memberCount || 0}
              isPublic={community.isPublic}
              onMembershipChange={(isMember) => {
                // Update local state if needed
                console.log('Membership changed:', isMember);
              }}
            />

            {canModerate && (
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="btn btn-outline"
                title="Community Settings"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
                </svg>
              </button>
            )}

            <button className="btn btn-outline" title="Share Community">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92Z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Settings Dropdown */}
      {showSettings && canModerate && (
        <div className="settings-dropdown">
          <button className="settings-item">Edit Community</button>
          <button className="settings-item">Manage Rules</button>
          <button className="settings-item">Moderation Tools</button>
          <button className="settings-item">Analytics</button>
        </div>
      )}

      <style jsx>{`
        .community-header {
          position: relative;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-light);
        }

        .community-banner {
          position: relative;
          height: 200px;
          overflow: hidden;
        }

        .banner-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 100px;
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
        }

        .header-content {
          position: relative;
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 2rem;
        }

        .community-info {
          display: flex;
          gap: 1.5rem;
          flex: 1;
        }

        .community-avatar {
          position: relative;
          flex-shrink: 0;
        }

        .avatar-image {
          border-radius: 50%;
          border: 4px solid var(--bg-primary);
        }

        .avatar-placeholder {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--primary-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: bold;
          color: white;
          border: 4px solid var(--bg-primary);
        }

        .community-details {
          flex: 1;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .community-title {
          font-size: 2rem;
          font-weight: bold;
          color: var(--text-primary);
          margin: 0;
        }

        .membership-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
          text-transform: uppercase;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--error-color);
        }

        .connection-status.connected .status-dot {
          background: var(--success-color);
        }

        .community-name {
          font-size: 1rem;
          color: var(--text-secondary);
          margin: 0 0 0.5rem 0;
        }

        .community-description {
          font-size: 1rem;
          color: var(--text-primary);
          margin: 0 0 1rem 0;
          line-height: 1.5;
        }

        .community-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .tag {
          padding: 0.25rem 0.75rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-light);
          border-radius: 1rem;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .header-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 1.5rem;
        }

        .community-stats {
          display: flex;
          gap: 2rem;
        }

        .stat {
          text-align: center;
        }

        .stat-value {
          display: block;
          font-size: 1.5rem;
          font-weight: bold;
          color: var(--text-primary);
        }

        .stat-label {
          display: block;
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }

        .stat.growth .stat-value {
          color: var(--success-color);
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: var(--primary-color);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--primary-color-dark);
          transform: translateY(-1px);
        }

        .btn-secondary {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border: 1px solid var(--border-light);
        }

        .btn-secondary:hover:not(:disabled) {
          background: var(--bg-quaternary);
        }

        .btn-outline {
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid var(--border-light);
          padding: 0.75rem;
        }

        .btn-outline:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .settings-dropdown {
          position: absolute;
          top: 100%;
          right: 2rem;
          background: var(--bg-primary);
          border: 1px solid var(--border-light);
          border-radius: 0.5rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          z-index: 10;
          min-width: 200px;
        }

        .settings-item {
          display: block;
          width: 100%;
          padding: 0.75rem 1rem;
          background: none;
          border: none;
          text-align: left;
          color: var(--text-primary);
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .settings-item:hover {
          background: var(--bg-secondary);
        }

        .settings-item:first-child {
          border-radius: 0.5rem 0.5rem 0 0;
        }

        .settings-item:last-child {
          border-radius: 0 0 0.5rem 0.5rem;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .header-content {
            padding: 1.5rem;
          }

          .community-stats {
            gap: 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .community-banner {
            height: 150px;
          }

          .header-content {
            flex-direction: column;
            align-items: stretch;
            padding: 1rem;
          }

          .community-info {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .header-actions {
            align-items: center;
          }

          .community-stats {
            justify-content: center;
          }

          .action-buttons {
            justify-content: center;
          }

          .settings-dropdown {
            right: 1rem;
          }
        }

        @media (max-width: 480px) {
          .community-stats {
            gap: 1rem;
          }

          .stat-value {
            font-size: 1.25rem;
          }

          .action-buttons {
            flex-direction: column;
            width: 100%;
          }

          .btn {
            justify-content: center;
          }
        }
      `}</style>
    </header>
  );
};

export default CommunityHeader;