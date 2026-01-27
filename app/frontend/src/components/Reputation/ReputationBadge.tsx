import React, { useState, useEffect } from 'react';
import { reputationService, REPUTATION_TIERS } from '../../services/web3/reputationService';

interface ReputationBadgeProps {
  userAddress: string;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Reputation Badge Component
 * Displays user's on-chain reputation tier and score
 */
export const ReputationBadge: React.FC<ReputationBadgeProps> = ({
  userAddress,
  showDetails = false,
  compact = false,
  className = ''
}) => {
  const [reputationInfo, setReputationInfo] = useState<{
    score: number;
    tier: keyof typeof REPUTATION_TIERS;
    tierInfo: typeof REPUTATION_TIERS[keyof typeof REPUTATION_TIERS];
    progress: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const loadReputation = async () => {
      try {
        setIsLoading(true);
        const { score, tier } = await reputationService.getReputationInfo(userAddress);

        if (score) {
          setReputationInfo({
            score: score.totalScore,
            tier: tier.tier,
            tierInfo: REPUTATION_TIERS[tier.tier],
            progress: tier.progress
          });
        }
      } catch (error) {
        console.error('Error loading reputation:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadReputation();
  }, [userAddress]);

  if (isLoading) {
    return (
      <div className={`reputation-badge loading ${className}`}>
        <span>⏳ Loading...</span>
      </div>
    );
  }

  if (!reputationInfo) {
    return null;
  }

  const { score, tier, tierInfo, progress } = reputationInfo;
  const discountRate = reputationService.getDiscountRate(tier);
  const votingPower = reputationService.getVotingPowerMultiplier(tier);

  if (compact) {
    return (
      <div className={`reputation-badge compact ${className}`} style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.25rem 0.75rem',
        background: `${tierInfo.color}20`,
        border: `1px solid ${tierInfo.color}`,
        borderRadius: '20px',
        fontSize: '0.875rem'
      }}>
        <span style={{ fontSize: '1rem' }}>{tierInfo.icon}</span>
        <span style={{ fontWeight: '500' }}>{tierInfo.name}</span>
        <span style={{ color: '#666' }}>{reputationService.formatScore(score)}</span>
      </div>
    );
  }

  return (
    <div className={`reputation-badge ${className}`} style={{
      background: '#fff',
      border: '1px solid #e0e0e0',
      borderRadius: '12px',
      padding: '1.5rem',
      maxWidth: '400px'
    }}>
      {/* Tier Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: tierInfo.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem'
        }}>
          {tierInfo.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: tierInfo.color
          }}>
            {tierInfo.name}
          </div>
          <div style={{
            fontSize: '0.875rem',
            color: '#666'
          }}>
            {reputationService.formatScore(score)} Reputation Points
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
          fontSize: '0.75rem',
          color: '#666'
        }}>
          <span>Progress to Next Tier</span>
          <span>{progress.toFixed(0)}%</span>
        </div>
        <div style={{
          width: '100%',
          height: '8px',
          background: '#e0e0e0',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: tierInfo.color,
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* Benefits */}
      <div style={{
        background: '#f5f5f5',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        <div style={{
          fontWeight: '600',
          marginBottom: '0.75rem',
          fontSize: '0.875rem'
        }}>
          Tier Benefits
        </div>
        <div style={{ fontSize: '0.875rem', color: '#666' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            💰 <strong>Discount:</strong> {(discountRate * 100).toFixed(0)}% on marketplace fees
          </div>
          <div>
            🗳️ <strong>Voting Power:</strong> {votingPower}x multiplier in governance
          </div>
        </div>
      </div>

      {/* Details Toggle */}
      {showDetails && (
        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'none',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#333',
              marginBottom: isExpanded ? '1rem' : '0'
            }}
          >
            {isExpanded ? '▼ Hide Details' : '▶ Show Details'}
          </button>

          {isExpanded && (
            <div style={{
              background: '#f9f9f9',
              padding: '1rem',
              borderRadius: '8px',
              fontSize: '0.875rem'
            }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Score Range:</strong> {tierInfo.minScore} - {tierInfo.maxScore === Infinity ? '∞' : tierInfo.maxScore}
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Current Score:</strong> {reputationService.formatScore(score)}
              </div>
              <div>
                <strong>Next Tier:</strong> {tier.name === 'DIAMOND' ? 'Max tier reached!' : `${tierInfo.nextTierName} (at ${tierInfo.nextTierScore} points)`}
              </div>
            </div>
          )}
        </div>
      )}

      {/* All Tiers Preview */}
      <div style={{ marginTop: '1rem' }}>
        <div style={{
          fontWeight: '600',
          marginBottom: '0.75rem',
          fontSize: '0.875rem'
        }}>
          Reputation Tiers
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {Object.entries(REPUTATION_TIERS).map(([key, info]) => (
            <div
              key={key}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                background: tier === key ? `${info.color}30` : '#f5f5f5',
                border: `1px solid ${tier === key ? info.color : '#e0e0e0'}`,
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                opacity: tier === key ? 1 : 0.6
              }}
            >
              <span>{info.icon}</span>
              <span style={{ fontWeight: tier === key ? '600' : '400' }}>
                {info.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .reputation-badge {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .reputation-badge.compact {
          box-shadow: none;
        }
      `}</style>
    </div>
  );
};

export default ReputationBadge;