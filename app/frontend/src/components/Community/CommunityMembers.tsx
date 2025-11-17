/**
 * CommunityMembers Component
 * Displays community members with role-based permissions and management tools
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CommunityMember, Community } from '../../models/Community';
import { formatNumber, formatDate } from '../../utils/formatters';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { InfiniteScroll } from '../ui/InfiniteScroll';

interface Member {
  id: string;
  address: string;
  ensName?: string;
  avatar?: string;
  role: 'member' | 'moderator' | 'admin';
  joinedAt: Date;
  reputation: number;
  postCount: number;
  lastActive: Date;
  isOnline: boolean;
  badges: Badge[];
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

interface CommunityMembersProps {
  communityId: string;
  canModerate: boolean;
  memberCount: number;
}

export const CommunityMembers: React.FC<CommunityMembersProps> = ({
  communityId,
  canModerate,
  memberCount
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'member' | 'moderator' | 'admin'>('all');
  const [sortBy, setSortBy] = useState<'joined' | 'reputation' | 'activity'>('joined');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);

  // Load members
  const loadMembers = useCallback(async (pageNum: number = 1, reset: boolean = true) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20',
        sort: sortBy,
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(searchQuery && { search: searchQuery })
      });

      const response = await fetch(`/api/communities/${communityId}/members?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to load members');
      }

      const data = await response.json();
      
      if (reset || pageNum === 1) {
        setMembers(data.members);
      } else {
        setMembers(prev => [...prev, ...data.members]);
      }

      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch (err) {
      console.error('Error loading members:', err);
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      if (pageNum === 1) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [communityId, sortBy, roleFilter, searchQuery]);

  // Load more members
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadMembers(page + 1, false);
    }
  }, [loadMembers, page, loadingMore, hasMore]);

  // Handle member role change
  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/communities/${communityId}/members/${memberId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole })
      });

      if (!response.ok) {
        throw new Error('Failed to update member role');
      }

      // Update member in local state
      setMembers(prev => prev.map(member => 
        member.id === memberId ? { ...member, role: newRole as any } : member
      ));

      setShowMemberModal(false);
    } catch (error) {
      console.error('Error updating member role:', error);
    }
  };

  // Handle member removal
  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the community?')) {
      return;
    }

    try {
      const response = await fetch(`/api/communities/${communityId}/members/${memberId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to remove member');
      }

      // Remove member from local state
      setMembers(prev => prev.filter(member => member.id !== memberId));
      setShowMemberModal(false);
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  // Load members when dependencies change
  useEffect(() => {
    loadMembers(1, true);
  }, [loadMembers]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#f44336';
      case 'moderator': return '#ff9800';
      case 'member': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
          </svg>
        );
      case 'moderator':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        );
      case 'member':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const getActivityStatus = (lastActive: Date) => {
    const now = new Date();
    const diffHours = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 1) return 'online';
    if (diffHours < 24) return 'recent';
    if (diffHours < 168) return 'week';
    return 'inactive';
  };

  const getActivityColor = (status: string) => {
    switch (status) {
      case 'online': return '#4caf50';
      case 'recent': return '#ff9800';
      case 'week': return '#2196f3';
      case 'inactive': return '#9e9e9e';
      default: return '#9e9e9e';
    }
  };

  if (loading && members.length === 0) {
    return (
      <div className="members-loading">
        <LoadingSpinner size="large" />
        <p>Loading members...</p>
      </div>
    );
  }

  return (
    <div className="community-members">
      {/* Header */}
      <div className="members-header">
        <div className="header-info">
          <h2>Members</h2>
          <span className="member-count">{formatNumber(memberCount)} members</span>
        </div>
      </div>

      {/* Controls */}
      <div className="members-controls">
        {/* Search */}
        <div className="search-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Filters */}
        <div className="filter-controls">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="filter-select"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admins</option>
            <option value="moderator">Moderators</option>
            <option value="member">Members</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="filter-select"
          >
            <option value="joined">Recently Joined</option>
            <option value="reputation">Reputation</option>
            <option value="activity">Most Active</option>
          </select>
        </div>
      </div>

      {/* Members List */}
      {error ? (
        <div className="members-error">
          <h3>Failed to load members</h3>
          <p>{error}</p>
          <button onClick={() => loadMembers(1, true)} className="retry-button">
            Try Again
          </button>
        </div>
      ) : members.length === 0 ? (
        <div className="no-members">
          <h3>No members found</h3>
          <p>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <InfiniteScroll
          hasMore={hasMore}
          loadMore={loadMore}
          loading={loadingMore}
        >
          <div className="members-list">
            {members.map(member => (
              <div key={member.id} className="member-card">
                <div className="member-info">
                  {/* Avatar */}
                  <div className="member-avatar">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.ensName || member.address} />
                    ) : (
                      <div className="avatar-placeholder">
                        {(member.ensName || member.address).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div 
                      className="activity-indicator"
                      style={{ backgroundColor: getActivityColor(getActivityStatus(member.lastActive)) }}
                      title={`Last active: ${formatDate(member.lastActive)}`}
                    ></div>
                  </div>

                  {/* Details */}
                  <div className="member-details">
                    <div className="member-name">
                      {member.ensName || `${member.address.slice(0, 6)}...${member.address.slice(-4)}`}
                    </div>
                    
                    <div className="member-meta">
                      <span 
                        className="role-badge"
                        style={{ color: getRoleColor(member.role) }}
                      >
                        {getRoleIcon(member.role)}
                        {member.role}
                      </span>
                      
                      <span className="join-date">
                        Joined {formatDate(member.joinedAt, { format: 'medium' })}
                      </span>
                    </div>

                    <div className="member-stats">
                      <span className="stat">
                        <strong>{formatNumber(member.reputation)}</strong> reputation
                      </span>
                      <span className="stat">
                        <strong>{formatNumber(member.postCount)}</strong> posts
                      </span>
                    </div>

                    {/* Badges */}
                    {member.badges.length > 0 && (
                      <div className="member-badges">
                        {member.badges.slice(0, 3).map(badge => (
                          <span 
                            key={badge.id}
                            className="badge"
                            style={{ backgroundColor: badge.color }}
                            title={badge.description}
                          >
                            {badge.icon} {badge.name}
                          </span>
                        ))}
                        {member.badges.length > 3 && (
                          <span className="more-badges">
                            +{member.badges.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {canModerate && member.role !== 'admin' && (
                  <div className="member-actions">
                    <button
                      onClick={() => {
                        setSelectedMember(member);
                        setShowMemberModal(true);
                      }}
                      className="action-button"
                      title="Manage member"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </InfiniteScroll>
      )}

      {/* Member Management Modal */}
      {showMemberModal && selectedMember && (
        <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Manage Member</h3>
              <button
                onClick={() => setShowMemberModal(false)}
                className="close-button"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="member-profile">
                <div className="member-avatar large">
                  {selectedMember.avatar ? (
                    <img src={selectedMember.avatar} alt={selectedMember.ensName || selectedMember.address} />
                  ) : (
                    <div className="avatar-placeholder">
                      {(selectedMember.ensName || selectedMember.address).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                
                <div className="profile-info">
                  <h4>{selectedMember.ensName || selectedMember.address}</h4>
                  <p>Member since {formatDate(selectedMember.joinedAt, { format: 'medium' })}</p>
                  <p>{formatNumber(selectedMember.reputation)} reputation • {formatNumber(selectedMember.postCount)} posts</p>
                </div>
              </div>

              <div className="management-actions">
                <h4>Role Management</h4>
                <div className="role-options">
                  {['member', 'moderator'].map(role => (
                    <button
                      key={role}
                      onClick={() => handleRoleChange(selectedMember.id, role)}
                      className={`role-option ${selectedMember.role === role ? 'active' : ''}`}
                      disabled={selectedMember.role === role}
                    >
                      {getRoleIcon(role)}
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="danger-zone">
                  <h4>Danger Zone</h4>
                  <button
                    onClick={() => handleRemoveMember(selectedMember.id)}
                    className="danger-button"
                  >
                    Remove from Community
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .community-members {
          max-width: 800px;
        }

        .members-loading,
        .members-error,
        .no-members {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          text-align: center;
        }

        .members-loading p,
        .members-error p,
        .no-members p {
          color: var(--text-secondary);
          margin: 1rem 0;
        }

        .members-error h3,
        .no-members h3 {
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .members-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .header-info h2 {
          color: var(--text-primary);
          margin: 0 0 0.5rem 0;
        }

        .member-count {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .members-controls {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          padding: 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 0.5rem;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
          padding: 0.5rem;
          background: var(--bg-primary);
          border: 1px solid var(--border-light);
          border-radius: 0.25rem;
        }

        .search-box svg {
          color: var(--text-secondary);
        }

        .search-input {
          flex: 1;
          border: none;
          background: none;
          color: var(--text-primary);
          font-size: 0.875rem;
        }

        .search-input:focus {
          outline: none;
        }

        .search-input::placeholder {
          color: var(--text-secondary);
        }

        .filter-controls {
          display: flex;
          gap: 1rem;
        }

        .filter-select {
          padding: 0.5rem;
          background: var(--bg-primary);
          border: 1px solid var(--border-light);
          border-radius: 0.25rem;
          color: var(--text-primary);
          cursor: pointer;
        }

        .filter-select:focus {
          outline: none;
          border-color: var(--primary-color);
        }

        .members-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .member-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 0.5rem;
          transition: all 0.2s ease;
        }

        .member-card:hover {
          border-color: var(--border-medium);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .member-info {
          display: flex;
          gap: 1rem;
          flex: 1;
        }

        .member-avatar {
          position: relative;
          flex-shrink: 0;
        }

        .member-avatar img,
        .avatar-placeholder {
          width: 48px;
          height: 48px;
          border-radius: 50%;
        }

        .member-avatar.large img,
        .member-avatar.large .avatar-placeholder {
          width: 64px;
          height: 64px;
        }

        .avatar-placeholder {
          background: var(--primary-color);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 1.25rem;
        }

        .activity-indicator {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid var(--bg-secondary);
        }

        .member-details {
          flex: 1;
        }

        .member-name {
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .member-meta {
          display: flex;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .role-badge {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .join-date {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .member-stats {
          display: flex;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .stat {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .stat strong {
          color: var(--text-primary);
        }

        .member-badges {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          color: white;
          font-weight: 500;
        }

        .more-badges {
          font-size: 0.75rem;
          color: var(--text-secondary);
          padding: 0.25rem 0.5rem;
        }

        .member-actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-button {
          padding: 0.5rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-light);
          border-radius: 0.25rem;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-button:hover {
          background: var(--bg-quaternary);
          color: var(--text-primary);
        }

        .retry-button {
          padding: 0.75rem 1.5rem;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .retry-button:hover {
          background: var(--primary-color-dark);
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: var(--bg-primary);
          border-radius: 0.5rem;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-light);
        }

        .modal-header h3 {
          margin: 0;
          color: var(--text-primary);
        }

        .close-button {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.25rem;
        }

        .close-button:hover {
          color: var(--text-primary);
        }

        .modal-body {
          padding: 1.5rem;
        }

        .member-profile {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          align-items: center;
        }

        .profile-info h4 {
          margin: 0 0 0.5rem 0;
          color: var(--text-primary);
        }

        .profile-info p {
          margin: 0.25rem 0;
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .management-actions h4 {
          margin: 0 0 1rem 0;
          color: var(--text-primary);
          font-size: 1rem;
        }

        .role-options {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
        }

        .role-option {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 0.25rem;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .role-option:hover:not(:disabled) {
          background: var(--bg-tertiary);
        }

        .role-option.active {
          background: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
        }

        .role-option:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .danger-zone {
          border-top: 1px solid var(--border-light);
          padding-top: 1.5rem;
        }

        .danger-button {
          padding: 0.75rem 1rem;
          background: var(--error-color);
          color: white;
          border: none;
          border-radius: 0.25rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .danger-button:hover {
          background: var(--error-color-dark);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .members-controls {
            flex-direction: column;
          }

          .filter-controls {
            justify-content: stretch;
          }

          .filter-select {
            flex: 1;
          }

          .member-card {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .member-actions {
            justify-content: center;
          }

          .member-meta {
            flex-direction: column;
            gap: 0.5rem;
          }

          .member-stats {
            flex-direction: column;
            gap: 0.25rem;
          }

          .role-options {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default CommunityMembers;