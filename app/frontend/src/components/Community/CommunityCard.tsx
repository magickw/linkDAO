/**
 * CommunityCard Component
 * Individual community card for discovery and browsing
 */

import React, { useState } from 'react';
import Image from 'next/image';
import { Community } from '../../models/Community';
import { formatNumber, formatDate } from '../../utils/formatters';

interface TrendingCommunity extends Community {
  trendingScore?: number;
  growthRate?: number;
  activityLevel?: 'low' | 'medium' | 'high';
}

interface CommunityCardProps {
  community: TrendingCommunity;
  onSelect?: (community: Community) => void;
  onJoin?: (communityId: string) => void;
  showTrendingInfo?: boolean;
  compact?: boolean;
}

export const CommunityCard: React.FC<CommunityCardProps> = ({
  community,
  onSelect,
  onJoin,
  showTrendingInfo = false,
  compact = false
}) => {
  const [isJoining, setIsJoining] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onJoin || isJoining) return;

    setIsJoining(true);
    try {
      await onJoin(community.id);
    } finally {
      setIsJoining(false);
    }
  };

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(community);
    }
  };

  const getActivityColor = (level?: string) => {
    switch (level) {
      case 'high': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'low': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  const getActivityLabel = (level?: string) => {
    switch (level) {
      case 'high': return 'Very Active';
      case 'medium': return 'Active';
      case 'low': return 'Less Active';
      default: return 'Unknown';
    }
  };

  const getTrendingBadge = () => {
    if (!showTrendingInfo || !community.growthRate) return null;

    const isHot = community.growthRate > 50;
    const isRising = community.growthRate > 20;

    if (isHot) {
      return <span className="trending-badge hot">🔥 Hot</span>;
    } else if (isRising) {
      return <span className="trending-badge rising">📈 Rising</span>;
    }
    return null;
  };

  return (
    <div 
      className={`community-card ${compact ? 'compact' : ''} ${onSelect ? 'clickable' : ''}`}
      onClick={handleCardClick}
    >
      {/* Banner/Header */}
      <div className="card-header">
        {community.banner && !imageError ? (
          <div className="banner-container">
            <Image
              src={community.banner}
              alt={`${community.displayName} banner`}
              fill
              style={{ objectFit: 'cover' }}
              onError={() => setImageError(true)}
            />
            <div className="banner-overlay"></div>
          </div>
        ) : (
          <div className="banner-placeholder">
            <div className="placeholder-pattern"></div>
          </div>
        )}

        {/* Trending Badge */}
        {getTrendingBadge()}

        {/* Community Avatar */}
        <div className="community-avatar">
          {community.avatar ? (
            <Image
              src={community.avatar}
              alt={community.displayName}
              width={compact ? 40 : 60}
              height={compact ? 40 : 60}
              className="avatar-image"
            />
          ) : (
            <div className="avatar-placeholder">
              {community.displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="card-content">
        <div className="community-info">
          <h3 className="community-name">{community.displayName}</h3>
          <p className="community-handle">r/{community.name}</p>
          
          {!compact && (
            <p className="community-description">
              {community.description.length > 120
                ? `${community.description.slice(0, 120)}...`
                : community.description}
            </p>
          )}

          {/* Tags */}
          {community.tags.length > 0 && (
            <div className="community-tags">
              {community.tags.slice(0, compact ? 2 : 3).map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                </span>
              ))}
              {community.tags.length > (compact ? 2 : 3) && (
                <span className="more-tags">
                  +{community.tags.length - (compact ? 2 : 3)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="community-stats">
          <div className="stat">
            <span className="stat-value">{formatNumber(community.memberCount)}</span>
            <span className="stat-label">Members</span>
          </div>
          
          {showTrendingInfo && community.activityLevel && (
            <div className="stat">
              <span 
                className="activity-indicator"
                style={{ color: getActivityColor(community.activityLevel) }}
              >
                ●
              </span>
              <span className="stat-label">{getActivityLabel(community.activityLevel)}</span>
            </div>
          )}

          {showTrendingInfo && community.growthRate && (
            <div className="stat growth">
              <span className="stat-value">+{community.growthRate}%</span>
              <span className="stat-label">Growth</span>
            </div>
          )}

          <div className="stat">
            <span className="stat-value">{community.category}</span>
            <span className="stat-label">Category</span>
          </div>
        </div>

        {/* Actions */}
        <div className="card-actions">
          {onJoin && (
            <button
              onClick={handleJoin}
              disabled={isJoining}
              className="join-button"
            >
              {isJoining ? (
                <span className="loading-spinner"></span>
              ) : (
                'Join'
              )}
            </button>
          )}

          <button className="view-button">
            View
          </button>
        </div>

        {/* Footer Info */}
        {!compact && (
          <div className="card-footer">
            <span className="created-date">
              Created {formatDate(community.createdAt, { format: 'short' })}
            </span>
            
            <div className="community-type">
              <span className={`type-badge ${community.isPublic ? 'public' : 'private'}`}>
                {community.isPublic ? '🌐' : '🔒'}
                {community.isPublic ? 'Public' : 'Private'}
              </span>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .community-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 0.75rem;
          overflow: hidden;
          transition: all 0.2s ease;
          position: relative;
        }

        .community-card:hover {
          border-color: var(--border-medium);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .community-card.clickable {
          cursor: pointer;
        }

        .community-card.compact {
          max-width: 280px;
        }

        .card-header {
          position: relative;
          height: ${compact ? '80px' : '120px'};
          overflow: hidden;
        }

        .banner-container {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .banner-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 50%;
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.3));
        }

        .banner-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, var(--primary-color), var(--primary-color-light));
          position: relative;
          overflow: hidden;
        }

        .placeholder-pattern {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
        }

        .trending-badge {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          z-index: 2;
        }

        .trending-badge.hot {
          background: rgba(244, 67, 54, 0.9);
          color: white;
        }

        .trending-badge.rising {
          background: rgba(76, 175, 80, 0.9);
          color: white;
        }

        .community-avatar {
          position: absolute;
          bottom: -${compact ? '20px' : '30px'};
          left: 1rem;
          z-index: 2;
        }

        .avatar-image {
          border-radius: 50%;
          border: 3px solid var(--bg-secondary);
        }

        .avatar-placeholder {
          width: ${compact ? '40px' : '60px'};
          height: ${compact ? '40px' : '60px'};
          border-radius: 50%;
          background: var(--primary-color);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: ${compact ? '1rem' : '1.5rem'};
          border: 3px solid var(--bg-secondary);
        }

        .card-content {
          padding: ${compact ? '1.5rem 1rem 1rem' : '2rem 1.5rem 1.5rem'};
        }

        .community-info {
          margin-bottom: 1rem;
        }

        .community-name {
          font-size: ${compact ? '1rem' : '1.25rem'};
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 0.25rem 0;
        }

        .community-handle {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin: 0 0 ${compact ? '0.5rem' : '1rem'} 0;
        }

        .community-description {
          font-size: 0.875rem;
          color: var(--text-primary);
          line-height: 1.4;
          margin: 0 0 1rem 0;
        }

        .community-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .tag {
          padding: 0.25rem 0.5rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-light);
          border-radius: 0.25rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .more-tags {
          padding: 0.25rem 0.5rem;
          color: var(--text-secondary);
          font-size: 0.75rem;
        }

        .community-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
          padding: 1rem 0;
          border-top: 1px solid var(--border-light);
          border-bottom: 1px solid var(--border-light);
        }

        .stat {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
        }

        .stat-value {
          font-size: ${compact ? '0.875rem' : '1rem'};
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat.growth .stat-value {
          color: var(--success-color);
        }

        .activity-indicator {
          font-size: 0.75rem;
        }

        .card-actions {
          display: flex;
          gap: 0.75rem;
        }

        .join-button,
        .view-button {
          flex: 1;
          padding: 0.75rem;
          border: none;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .join-button {
          background: var(--primary-color);
          color: white;
        }

        .join-button:hover:not(:disabled) {
          background: var(--primary-color-dark);
        }

        .join-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .view-button {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border: 1px solid var(--border-light);
        }

        .view-button:hover {
          background: var(--bg-quaternary);
        }

        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-light);
        }

        .created-date {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .type-badge {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .type-badge.public {
          background: rgba(76, 175, 80, 0.1);
          color: #4CAF50;
        }

        .type-badge.private {
          background: rgba(255, 152, 0, 0.1);
          color: #FF9800;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Responsive Design */
        @media (max-width: 480px) {
          .card-content {
            padding: 1.5rem 1rem 1rem;
          }

          .community-stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .card-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default CommunityCard;