/**
 * Social Proof Indicators Component
 * Displays mutual follows, shared community memberships, and connection strength
 */

import React, { useState, useEffect } from 'react';

export interface SocialConnection {
  userId: string;
  handle: string;
  avatar?: string;
  ensName?: string;
  connectionType: 'mutual_follow' | 'shared_community' | 'frequent_interaction' | 'recent_interaction';
  strength: 'weak' | 'medium' | 'strong';
  metadata?: {
    communityName?: string;
    interactionCount?: number;
    lastInteraction?: Date;
    followedSince?: Date;
  };
}

export interface SocialProofData {
  mutualFollows: SocialConnection[];
  sharedCommunities: Array<{
    communityId: string;
    communityName: string;
    memberCount: number;
    mutualMembers: SocialConnection[];
  }>;
  connectionStrength: 'none' | 'weak' | 'medium' | 'strong';
  interactionHistory: {
    totalInteractions: number;
    recentInteractions: number;
    lastInteraction?: Date;
  };
  trustScore: number; // 0-100
}

export interface SocialProofIndicatorsProps {
  targetUserId: string;
  currentUserId: string;
  socialProofData?: SocialProofData;
  showMutualFollows?: boolean;
  showSharedCommunities?: boolean;
  showConnectionStrength?: boolean;
  showTrustScore?: boolean;
  showPrivacyControls?: boolean;
  maxMutualFollows?: number;
  maxSharedCommunities?: number;
  onPrivacyChange?: (setting: string, enabled: boolean) => void;
  className?: string;
}

const CONNECTION_STRENGTH_CONFIG = {
  none: { color: '#9ca3af', icon: '○', label: 'No connection' },
  weak: { color: '#fbbf24', icon: '◔', label: 'Weak connection' },
  medium: { color: '#f59e0b', icon: '◑', label: 'Medium connection' },
  strong: { color: '#10b981', icon: '●', label: 'Strong connection' },
};

const TRUST_SCORE_CONFIG = {
  low: { color: '#ef4444', range: [0, 30], label: 'Low trust' },
  medium: { color: '#f59e0b', range: [31, 70], label: 'Medium trust' },
  high: { color: '#10b981', range: [71, 100], label: 'High trust' },
};

const SocialProofIndicators: React.FC<SocialProofIndicatorsProps> = ({
  targetUserId,
  currentUserId,
  socialProofData,
  showMutualFollows = true,
  showSharedCommunities = true,
  showConnectionStrength = true,
  showTrustScore = true,
  showPrivacyControls = false,
  maxMutualFollows = 5,
  maxSharedCommunities = 3,
  onPrivacyChange,
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(!socialProofData);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SocialProofData | null>(socialProofData || null);
  const [privacySettings, setPrivacySettings] = useState({
    showMutualFollows: true,
    showSharedCommunities: true,
    showConnectionStrength: true,
    showTrustScore: false, // More sensitive, default off
  });

  // Load social proof data if not provided
  useEffect(() => {
    if (!socialProofData && targetUserId !== currentUserId) {
      loadSocialProofData();
    }
  }, [targetUserId, currentUserId, socialProofData]);

  const loadSocialProofData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Mock API call - replace with actual service
      await new Promise(resolve => setTimeout(resolve, 800));

      // Generate mock social proof data
      const mockData: SocialProofData = {
        mutualFollows: Array.from({ length: Math.floor(Math.random() * 8) + 1 }, (_, i) => ({
          userId: `user_${i}`,
          username: `user${i}`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`,
          ensName: Math.random() > 0.7 ? `user${i}.eth` : undefined,
          connectionType: 'mutual_follow' as const,
          strength: ['weak', 'medium', 'strong'][Math.floor(Math.random() * 3)] as any,
          metadata: {
            followedSince: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
          },
        })),
        sharedCommunities: Array.from({ length: Math.floor(Math.random() * 4) + 1 }, (_, i) => ({
          communityId: `community_${i}`,
          communityName: `Community ${i + 1}`,
          memberCount: Math.floor(Math.random() * 1000) + 100,
          mutualMembers: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, j) => ({
            userId: `member_${j}`,
            username: `member${j}`,
            connectionType: 'shared_community' as const,
            strength: 'medium' as const,
          })),
        })),
        connectionStrength: ['none', 'weak', 'medium', 'strong'][Math.floor(Math.random() * 4)] as any,
        interactionHistory: {
          totalInteractions: Math.floor(Math.random() * 50),
          recentInteractions: Math.floor(Math.random() * 10),
          lastInteraction: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : undefined,
        },
        trustScore: Math.floor(Math.random() * 100),
      };

      setData(mockData);
    } catch (err) {
      setError('Failed to load social proof data');
      console.error('Social proof loading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle privacy setting changes
  const handlePrivacyChange = (setting: string, enabled: boolean) => {
    setPrivacySettings(prev => ({ ...prev, [setting]: enabled }));
    onPrivacyChange?.(setting, enabled);
  };

  // Get trust score level
  const getTrustScoreLevel = (score: number) => {
    for (const [level, config] of Object.entries(TRUST_SCORE_CONFIG)) {
      if (score >= config.range[0] && score <= config.range[1]) {
        return { level, ...config };
      }
    }
    return { level: 'low', ...TRUST_SCORE_CONFIG.low };
  };

  // Format time ago
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  // Don't show for same user
  if (targetUserId === currentUserId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`ce-social-proof-indicators ce-loading ${className}`}>
        <div className="ce-social-proof-skeleton">
          <div className="ce-skeleton ce-skeleton-line"></div>
          <div className="ce-skeleton ce-skeleton-line ce-skeleton-short"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`ce-social-proof-indicators ce-error ${className}`}>
        <span className="ce-error-message">Unable to load social connections</span>
      </div>
    );
  }

  const hasAnyProof = (
    (showMutualFollows && privacySettings.showMutualFollows && data.mutualFollows.length > 0) ||
    (showSharedCommunities && privacySettings.showSharedCommunities && data.sharedCommunities.length > 0) ||
    (showConnectionStrength && privacySettings.showConnectionStrength && data.connectionStrength !== 'none') ||
    (showTrustScore && privacySettings.showTrustScore && data.trustScore > 0)
  );

  if (!hasAnyProof) {
    return null;
  }

  const connectionConfig = CONNECTION_STRENGTH_CONFIG[data.connectionStrength];
  const trustScoreInfo = getTrustScoreLevel(data.trustScore);

  return (
    <div className={`ce-social-proof-indicators ${className}`}>
      {/* Connection Strength */}
      {showConnectionStrength && privacySettings.showConnectionStrength && data.connectionStrength !== 'none' && (
        <div className="ce-connection-strength">
          <span 
            className="ce-strength-indicator"
            style={{ color: connectionConfig.color }}
            title={connectionConfig.label}
          >
            {connectionConfig.icon}
          </span>
          <span className="ce-strength-label">{connectionConfig.label}</span>
        </div>
      )}

      {/* Trust Score */}
      {showTrustScore && privacySettings.showTrustScore && data.trustScore > 0 && (
        <div className="ce-trust-score">
          <div className="ce-trust-score-bar">
            <div 
              className="ce-trust-score-fill"
              style={{ 
                width: `${data.trustScore}%`,
                backgroundColor: trustScoreInfo.color 
              }}
            ></div>
          </div>
          <span className="ce-trust-score-label">
            {data.trustScore}% trust score
          </span>
        </div>
      )}

      {/* Mutual Follows */}
      {showMutualFollows && privacySettings.showMutualFollows && data.mutualFollows.length > 0 && (
        <div className="ce-mutual-follows">
          <div className="ce-mutual-follows-header">
            <span className="ce-mutual-follows-count">
              {data.mutualFollows.length} mutual follow{data.mutualFollows.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="ce-mutual-follows-list">
            {data.mutualFollows.slice(0, maxMutualFollows).map(follow => (
              <div key={follow.userId} className="ce-mutual-follow-item">
                <img 
                  src={follow.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${follow.userId}`}
                  alt={follow.username}
                  className="ce-mutual-follow-avatar"
                />
                <div className="ce-mutual-follow-info">
                  <span className="ce-mutual-follow-name">
                    {follow.ensName || follow.username}
                  </span>
                  {follow.metadata?.followedSince && (
                    <span className="ce-mutual-follow-since">
                      Following since {formatTimeAgo(follow.metadata.followedSince)}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {data.mutualFollows.length > maxMutualFollows && (
              <div className="ce-mutual-follows-more">
                +{data.mutualFollows.length - maxMutualFollows} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shared Communities */}
      {showSharedCommunities && privacySettings.showSharedCommunities && data.sharedCommunities.length > 0 && (
        <div className="ce-shared-communities">
          <div className="ce-shared-communities-header">
            <span className="ce-shared-communities-count">
              {data.sharedCommunities.length} shared communit{data.sharedCommunities.length !== 1 ? 'ies' : 'y'}
            </span>
          </div>
          <div className="ce-shared-communities-list">
            {data.sharedCommunities.slice(0, maxSharedCommunities).map(community => (
              <div key={community.communityId} className="ce-shared-community-item">
                <div className="ce-community-info">
                  <span className="ce-community-name">{community.communityName}</span>
                  <span className="ce-community-members">
                    {community.mutualMembers.length} mutual member{community.mutualMembers.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
            {data.sharedCommunities.length > maxSharedCommunities && (
              <div className="ce-shared-communities-more">
                +{data.sharedCommunities.length - maxSharedCommunities} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interaction History */}
      {data.interactionHistory.totalInteractions > 0 && (
        <div className="ce-interaction-history">
          <span className="ce-interaction-count">
            {data.interactionHistory.totalInteractions} past interaction{data.interactionHistory.totalInteractions !== 1 ? 's' : ''}
          </span>
          {data.interactionHistory.lastInteraction && (
            <span className="ce-last-interaction">
              Last: {formatTimeAgo(data.interactionHistory.lastInteraction)}
            </span>
          )}
        </div>
      )}

      {/* Privacy Controls */}
      {showPrivacyControls && (
        <div className="ce-privacy-controls">
          <details className="ce-privacy-dropdown">
            <summary className="ce-privacy-toggle">Privacy Settings</summary>
            <div className="ce-privacy-options">
              <label className="ce-privacy-option">
                <input
                  type="checkbox"
                  checked={privacySettings.showMutualFollows}
                  onChange={(e) => handlePrivacyChange('showMutualFollows', e.target.checked)}
                />
                Show mutual follows
              </label>
              <label className="ce-privacy-option">
                <input
                  type="checkbox"
                  checked={privacySettings.showSharedCommunities}
                  onChange={(e) => handlePrivacyChange('showSharedCommunities', e.target.checked)}
                />
                Show shared communities
              </label>
              <label className="ce-privacy-option">
                <input
                  type="checkbox"
                  checked={privacySettings.showConnectionStrength}
                  onChange={(e) => handlePrivacyChange('showConnectionStrength', e.target.checked)}
                />
                Show connection strength
              </label>
              <label className="ce-privacy-option">
                <input
                  type="checkbox"
                  checked={privacySettings.showTrustScore}
                  onChange={(e) => handlePrivacyChange('showTrustScore', e.target.checked)}
                />
                Show trust score
              </label>
            </div>
          </details>
        </div>
      )}

      <style jsx>{`
        .ce-social-proof-indicators {
          display: flex;
          flex-direction: column;
          gap: var(--ce-space-sm);
          padding: var(--ce-space-md);
          background: var(--ce-bg-secondary);
          border: 1px solid var(--ce-border-light);
          border-radius: var(--ce-radius-md);
          font-size: var(--ce-font-size-sm);
        }
        
        .ce-social-proof-indicators.ce-loading,
        .ce-social-proof-indicators.ce-error {
          padding: var(--ce-space-sm);
        }
        
        .ce-social-proof-skeleton {
          display: flex;
          flex-direction: column;
          gap: var(--ce-space-xs);
        }
        
        .ce-skeleton {
          background: var(--ce-bg-tertiary);
          border-radius: var(--ce-radius-sm);
          animation: ce-pulse 1.5s ease-in-out infinite;
        }
        
        .ce-skeleton-line {
          height: 1rem;
          width: 100%;
        }
        
        .ce-skeleton-short {
          width: 60%;
        }
        
        .ce-error-message {
          color: var(--ce-text-tertiary);
          font-style: italic;
        }
        
        .ce-connection-strength {
          display: flex;
          align-items: center;
          gap: var(--ce-space-xs);
        }
        
        .ce-strength-indicator {
          font-size: 1.2em;
          font-weight: bold;
        }
        
        .ce-strength-label {
          color: var(--ce-text-secondary);
          font-weight: 500;
        }
        
        .ce-trust-score {
          display: flex;
          flex-direction: column;
          gap: var(--ce-space-xs);
        }
        
        .ce-trust-score-bar {
          height: 4px;
          background: var(--ce-bg-tertiary);
          border-radius: 2px;
          overflow: hidden;
        }
        
        .ce-trust-score-fill {
          height: 100%;
          transition: width 0.3s ease;
        }
        
        .ce-trust-score-label {
          color: var(--ce-text-secondary);
          font-size: var(--ce-font-size-xs);
        }
        
        .ce-mutual-follows,
        .ce-shared-communities {
          display: flex;
          flex-direction: column;
          gap: var(--ce-space-xs);
        }
        
        .ce-mutual-follows-count,
        .ce-shared-communities-count {
          color: var(--ce-text-primary);
          font-weight: 500;
        }
        
        .ce-mutual-follows-list,
        .ce-shared-communities-list {
          display: flex;
          flex-direction: column;
          gap: var(--ce-space-xs);
        }
        
        .ce-mutual-follow-item {
          display: flex;
          align-items: center;
          gap: var(--ce-space-sm);
        }
        
        .ce-mutual-follow-avatar {
          width: 24px;
          height: 24px;
          border-radius: var(--ce-radius-full);
          border: 1px solid var(--ce-border-light);
        }
        
        .ce-mutual-follow-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .ce-mutual-follow-name {
          color: var(--ce-text-primary);
          font-weight: 500;
        }
        
        .ce-mutual-follow-since {
          color: var(--ce-text-tertiary);
          font-size: var(--ce-font-size-xs);
        }
        
        .ce-mutual-follows-more,
        .ce-shared-communities-more {
          color: var(--ce-text-secondary);
          font-size: var(--ce-font-size-xs);
          font-style: italic;
          padding-left: var(--ce-space-lg);
        }
        
        .ce-shared-community-item {
          padding-left: var(--ce-space-sm);
        }
        
        .ce-community-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .ce-community-name {
          color: var(--ce-text-primary);
          font-weight: 500;
        }
        
        .ce-community-members {
          color: var(--ce-text-tertiary);
          font-size: var(--ce-font-size-xs);
        }
        
        .ce-interaction-history {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-top: var(--ce-space-xs);
          border-top: 1px solid var(--ce-border-light);
        }
        
        .ce-interaction-count {
          color: var(--ce-text-secondary);
          font-weight: 500;
        }
        
        .ce-last-interaction {
          color: var(--ce-text-tertiary);
          font-size: var(--ce-font-size-xs);
        }
        
        .ce-privacy-controls {
          margin-top: var(--ce-space-sm);
          padding-top: var(--ce-space-sm);
          border-top: 1px solid var(--ce-border-light);
        }
        
        .ce-privacy-dropdown {
          font-size: var(--ce-font-size-xs);
        }
        
        .ce-privacy-toggle {
          color: var(--ce-color-primary);
          cursor: pointer;
          user-select: none;
        }
        
        .ce-privacy-toggle:hover {
          text-decoration: underline;
        }
        
        .ce-privacy-options {
          margin-top: var(--ce-space-sm);
          display: flex;
          flex-direction: column;
          gap: var(--ce-space-xs);
        }
        
        .ce-privacy-option {
          display: flex;
          align-items: center;
          gap: var(--ce-space-xs);
          cursor: pointer;
          color: var(--ce-text-secondary);
        }
        
        .ce-privacy-option input[type="checkbox"] {
          margin: 0;
        }
        
        @keyframes ce-pulse {
          0%, 100% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
        }
        
        @media (max-width: 768px) {
          .ce-social-proof-indicators {
            padding: var(--ce-space-sm);
            font-size: var(--ce-font-size-xs);
          }
          
          .ce-mutual-follow-avatar {
            width: 20px;
            height: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default SocialProofIndicators;