/**
 * CommunitySidebar Component
 * Left sidebar with community info, navigation tabs, and quick stats
 */

import React from 'react';
import { Community } from '../../models/Community';
import { formatNumber, formatDate } from '../../utils/formatters';

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

interface CommunitySidebarProps {
  community: Community;
  stats: CommunityStats | null;
  membershipStatus: MembershipStatus;
  activeTab: 'posts' | 'rules' | 'members' | 'moderation' | 'performance';
  onTabChange: (tab: 'posts' | 'rules' | 'members' | 'moderation' | 'performance') => void;
}

export const CommunitySidebar: React.FC<CommunitySidebarProps> = ({
  community,
  stats,
  membershipStatus,
  activeTab,
  onTabChange
}) => {
  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'posts':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
          </svg>
        );
      case 'rules':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        );
      case 'members':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A3.01 3.01 0 0 0 17.1 6H16c-.8 0-1.54.37-2.03.99L12 9l-1.97-2.01A2.99 2.99 0 0 0 8 6H6.9c-1.3 0-2.44.84-2.86 2.37L1.5 16H4v6h2v-6h2.5l2.5-3 2.5 3H16v6h4zM12.5 11.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5S11 9.17 11 10s.67 1.5 1.5 1.5z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const getActivityLevel = () => {
    if (!stats) return 'low';
    
    const { activeMembers, memberCount } = stats;
    const activityRatio = activeMembers / memberCount;
    
    if (activityRatio > 0.3) return 'high';
    if (activityRatio > 0.15) return 'medium';
    return 'low';
  };

  const getActivityColor = (level: string) => {
    switch (level) {
      case 'high': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'low': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  return (
    <aside className="community-sidebar">
      {/* Navigation Tabs */}
      <nav className="sidebar-nav">
        <button
          onClick={() => onTabChange('posts')}
          className={`nav-tab ${activeTab === 'posts' ? 'active' : ''}`}
        >
          {getTabIcon('posts')}
          <span>Posts</span>
          {stats && (
            <span className="tab-count">{formatNumber(stats.postCount)}</span>
          )}
        </button>

        <button
          onClick={() => onTabChange('rules')}
          className={`nav-tab ${activeTab === 'rules' ? 'active' : ''}`}
        >
          {getTabIcon('rules')}
          <span>Rules</span>
          <span className="tab-count">{community.rules.length}</span>
        </button>

        <button
          onClick={() => onTabChange('members')}
          className={`nav-tab ${activeTab === 'members' ? 'active' : ''}`}
        >
          {getTabIcon('members')}
          <span>Members</span>
          {stats && (
            <span className="tab-count">{formatNumber(stats.memberCount)}</span>
          )}
        </button>
        
        {membershipStatus.canModerate && (
          <button
            onClick={() => onTabChange('moderation')}
            className={`nav-tab ${activeTab === 'moderation' ? 'active' : ''}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
            </svg>
            <span>Moderation</span>
          </button>
        )}
        
        {membershipStatus.canModerate && (
          <button
            onClick={() => onTabChange('performance' as any)}
            className={`nav-tab ${activeTab === 'performance' ? 'active' : ''}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
            </svg>
            <span>Performance</span>
          </button>
        )}
      </nav>

      {/* Community Info Card */}
      <div className="info-card">
        <h3>About Community</h3>
        
        {/* Basic Stats */}
        <div className="stats-grid">
          {stats && (
            <>
              <div className="stat-item">
                <span className="stat-label">Members</span>
                <span className="stat-value">{formatNumber(stats.memberCount)}</span>
              </div>
              
              <div className="stat-item">
                <span className="stat-label">Posts</span>
                <span className="stat-value">{formatNumber(stats.postCount)}</span>
              </div>
              
              <div className="stat-item">
                <span className="stat-label">Online</span>
                <span className="stat-value">
                  <span 
                    className="activity-dot"
                    style={{ backgroundColor: getActivityColor(getActivityLevel()) }}
                  ></span>
                  {formatNumber(stats.activeMembers)}
                </span>
              </div>
              
              {stats.postsThisWeek > 0 && (
                <div className="stat-item">
                  <span className="stat-label">This Week</span>
                  <span className="stat-value">{formatNumber(stats.postsThisWeek)}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Community Details */}
        <div className="community-details">
          <div className="detail-item">
            <span className="detail-label">Created</span>
            <span className="detail-value">
              {formatDate(community.createdAt, { format: 'medium' })}
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Category</span>
            <span className="detail-value">{community.category}</span>
          </div>

          {community.treasuryAddress && (
            <div className="detail-item">
              <span className="detail-label">Treasury</span>
              <span className="detail-value treasury-address">
                {community.treasuryAddress.slice(0, 6)}...{community.treasuryAddress.slice(-4)}
              </span>
            </div>
          )}

          {membershipStatus.isMember && membershipStatus.joinedAt && (
            <div className="detail-item">
              <span className="detail-label">Joined</span>
              <span className="detail-value">
                {formatDate(membershipStatus.joinedAt, { format: 'medium' })}
              </span>
            </div>
          )}
        </div>

        {/* Community Type Badge */}
        <div className="community-type">
          <span className={`type-badge ${community.isPublic ? 'public' : 'private'}`}>
            {community.isPublic ? '🌐 Public' : '🔒 Private'}
          </span>
        </div>
      </div>

      {/* Moderators Card */}
      {community.moderators.length > 0 && (
        <div className="info-card">
          <h3>Moderators</h3>
          <div className="moderators-list">
            {community.moderators.slice(0, 5).map((moderator, index) => (
              <div key={index} className="moderator-item">
                <div className="moderator-avatar">
                  {moderator.slice(0, 2).toUpperCase()}
                </div>
                <span className="moderator-address">
                  {moderator.slice(0, 6)}...{moderator.slice(-4)}
                </span>
              </div>
            ))}
            {community.moderators.length > 5 && (
              <div className="more-moderators">
                +{community.moderators.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {membershipStatus.isMember && (
        <div className="info-card">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            <button className="action-button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
              </svg>
              Create Post
            </button>
            
            <button className="action-button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Favorite
            </button>
            
            <button className="action-button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
              </svg>
              Share
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .community-sidebar {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .sidebar-nav {
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .nav-tab {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 1rem;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
          border-bottom: 1px solid var(--border-light);
        }

        .nav-tab:last-child {
          border-bottom: none;
        }

        .nav-tab:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .nav-tab.active {
          background: var(--primary-color);
          color: white;
        }

        .nav-tab span:first-of-type {
          flex: 1;
          text-align: left;
        }

        .tab-count {
          font-size: 0.875rem;
          padding: 0.25rem 0.5rem;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 1rem;
          min-width: 1.5rem;
          text-align: center;
        }

        .nav-tab:not(.active) .tab-count {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }

        .info-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 0.5rem;
          padding: 1.5rem;
        }

        .info-card h3 {
          margin: 0 0 1rem 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.25rem;
        }

        .stat-value {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .activity-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .community-details {
          margin-bottom: 1.5rem;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--border-light);
        }

        .detail-item:last-child {
          border-bottom: none;
        }

        .detail-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .detail-value {
          font-size: 0.875rem;
          color: var(--text-primary);
          font-weight: 500;
        }

        .treasury-address {
          font-family: monospace;
          font-size: 0.75rem;
        }

        .community-type {
          text-align: center;
        }

        .type-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 1rem;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .type-badge.public {
          background: rgba(76, 175, 80, 0.1);
          color: #4CAF50;
          border: 1px solid rgba(76, 175, 80, 0.3);
        }

        .type-badge.private {
          background: rgba(255, 152, 0, 0.1);
          color: #FF9800;
          border: 1px solid rgba(255, 152, 0, 0.3);
        }

        .moderators-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .moderator-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .moderator-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--primary-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: bold;
          color: white;
        }

        .moderator-address {
          font-family: monospace;
          font-size: 0.875rem;
          color: var(--text-primary);
        }

        .more-moderators {
          text-align: center;
          font-size: 0.875rem;
          color: var(--text-secondary);
          padding: 0.5rem;
          background: var(--bg-tertiary);
          border-radius: 0.25rem;
        }

        .quick-actions {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .action-button {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-light);
          border-radius: 0.25rem;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.875rem;
        }

        .action-button:hover {
          background: var(--bg-quaternary);
          border-color: var(--border-medium);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }

          .stat-item {
            flex-direction: row;
            justify-content: space-between;
            text-align: left;
          }

          .stat-value {
            font-size: 1rem;
          }
        }
      `}</style>
    </aside>
  );
};

export default CommunitySidebar;