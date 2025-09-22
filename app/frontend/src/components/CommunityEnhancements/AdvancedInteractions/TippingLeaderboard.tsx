/**
 * Tipping Leaderboard Component
 * Shows top tippers and most tipped content with recognition systems
 */

import React, { useState, useMemo } from 'react';
import { TipData } from './EnhancedTippingSystem';

export interface TippingLeaderboardProps {
  tips: TipData[];
  timeframe?: 'day' | 'week' | 'month' | 'all';
  showTopTippers?: boolean;
  showTopContent?: boolean;
  showTopTokens?: boolean;
  maxItems?: number;
  className?: string;
}

interface TipperStats {
  id: string;
  name: string;
  totalTipped: number;
  tipCount: number;
  tokens: Record<string, number>;
  rank: number;
  badge?: string;
}

interface ContentStats {
  postId: string;
  authorId: string;
  totalReceived: number;
  tipCount: number;
  tokens: Record<string, number>;
  rank: number;
}

interface TokenStats {
  token: string;
  totalVolume: number;
  tipCount: number;
  averageTip: number;
  topTipper: string;
}

const TOKEN_ICONS = {
  ETH: '⟠',
  SOL: '◎',
  MATIC: '⬟',
  BTC: '₿',
  USDC: '$',
  USDT: '$',
} as const;

const TOKEN_COLORS = {
  ETH: '#627eea',
  SOL: '#9945ff',
  MATIC: '#8247e5',
  BTC: '#f7931a',
  USDC: '#2775ca',
  USDT: '#26a17b',
} as const;

const TIPPER_BADGES = {
  whale: { icon: '🐋', name: 'Whale', threshold: 10 },
  generous: { icon: '💎', name: 'Generous', threshold: 50 },
  supporter: { icon: '🤝', name: 'Supporter', threshold: 20 },
  patron: { icon: '👑', name: 'Patron', threshold: 100 },
} as const;

const TippingLeaderboard: React.FC<TippingLeaderboardProps> = ({
  tips,
  timeframe = 'week',
  showTopTippers = true,
  showTopContent = true,
  showTopTokens = true,
  maxItems = 10,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'tippers' | 'content' | 'tokens'>('tippers');

  // Filter tips by timeframe
  const filteredTips = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    
    switch (timeframe) {
      case 'day':
        cutoff.setDate(now.getDate() - 1);
        break;
      case 'week':
        cutoff.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoff.setMonth(now.getMonth() - 1);
        break;
      case 'all':
      default:
        cutoff.setFullYear(1970);
        break;
    }
    
    return tips.filter(tip => tip.timestamp >= cutoff);
  }, [tips, timeframe]);

  // Calculate tipper statistics
  const topTippers = useMemo((): TipperStats[] => {
    const tipperMap = new Map<string, Omit<TipperStats, 'rank' | 'badge'>>();
    
    filteredTips.forEach(tip => {
      const existing = tipperMap.get(tip.tipper) || {
        id: tip.tipper,
        name: tip.tipperName || `${tip.tipper.slice(0, 6)}...`,
        totalTipped: 0,
        tipCount: 0,
        tokens: {},
      };
      
      existing.totalTipped += tip.amount;
      existing.tipCount += 1;
      existing.tokens[tip.token] = (existing.tokens[tip.token] || 0) + tip.amount;
      
      tipperMap.set(tip.tipper, existing);
    });
    
    return Array.from(tipperMap.values())
      .sort((a, b) => b.totalTipped - a.totalTipped)
      .slice(0, maxItems)
      .map((tipper, index) => ({
        ...tipper,
        rank: index + 1,
        badge: getBadgeForTipper(tipper.tipCount, tipper.totalTipped),
      }));
  }, [filteredTips, maxItems]);

  // Calculate content statistics
  const topContent = useMemo((): ContentStats[] => {
    const contentMap = new Map<string, Omit<ContentStats, 'rank'>>();
    
    filteredTips.forEach(tip => {
      // Assuming postId is available in tip data or can be derived
      const postId = tip.id.split('-')[0]; // Simplified extraction
      const existing = contentMap.get(postId) || {
        postId,
        authorId: tip.tipper, // This should be the recipient, not tipper
        totalReceived: 0,
        tipCount: 0,
        tokens: {},
      };
      
      existing.totalReceived += tip.amount;
      existing.tipCount += 1;
      existing.tokens[tip.token] = (existing.tokens[tip.token] || 0) + tip.amount;
      
      contentMap.set(postId, existing);
    });
    
    return Array.from(contentMap.values())
      .sort((a, b) => b.totalReceived - a.totalReceived)
      .slice(0, maxItems)
      .map((content, index) => ({
        ...content,
        rank: index + 1,
      }));
  }, [filteredTips, maxItems]);

  // Calculate token statistics
  const tokenStats = useMemo((): TokenStats[] => {
    const tokenMap = new Map<string, Omit<TokenStats, 'topTipper'>>();
    const tokenTippers = new Map<string, Map<string, number>>();
    
    filteredTips.forEach(tip => {
      const existing = tokenMap.get(tip.token) || {
        token: tip.token,
        totalVolume: 0,
        tipCount: 0,
        averageTip: 0,
      };
      
      existing.totalVolume += tip.amount;
      existing.tipCount += 1;
      existing.averageTip = existing.totalVolume / existing.tipCount;
      
      tokenMap.set(tip.token, existing);
      
      // Track tippers per token
      if (!tokenTippers.has(tip.token)) {
        tokenTippers.set(tip.token, new Map());
      }
      const tippers = tokenTippers.get(tip.token)!;
      tippers.set(tip.tipper, (tippers.get(tip.tipper) || 0) + tip.amount);
    });
    
    return Array.from(tokenMap.values())
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .map(token => {
        const tippers = tokenTippers.get(token.token);
        const topTipper = tippers ? 
          Array.from(tippers.entries()).sort(([, a], [, b]) => b - a)[0]?.[0] || 'Unknown' :
          'Unknown';
        
        return {
          ...token,
          topTipper,
        };
      });
  }, [filteredTips]);

  // Get badge for tipper based on activity
  function getBadgeForTipper(tipCount: number, totalTipped: number): string | undefined {
    if (tipCount >= TIPPER_BADGES.patron.threshold) return 'patron';
    if (tipCount >= TIPPER_BADGES.generous.threshold) return 'generous';
    if (totalTipped >= TIPPER_BADGES.whale.threshold) return 'whale';
    if (tipCount >= TIPPER_BADGES.supporter.threshold) return 'supporter';
    return undefined;
  }

  // Format amount for display
  const formatAmount = (amount: number, token?: string) => {
    if (amount < 0.001) {
      return `${(amount * 1000000).toFixed(0)}µ`;
    } else if (amount < 1) {
      return amount.toFixed(3);
    } else {
      return amount.toFixed(2);
    }
  };

  // Get token icon
  const getTokenIcon = (token: string) => {
    return TOKEN_ICONS[token as keyof typeof TOKEN_ICONS] || token.charAt(0);
  };

  // Get token color
  const getTokenColor = (token: string) => {
    return TOKEN_COLORS[token as keyof typeof TOKEN_COLORS] || '#666';
  };

  const tabs = [
    { id: 'tippers' as const, label: 'Top Tippers', show: showTopTippers },
    { id: 'content' as const, label: 'Most Tipped', show: showTopContent },
    { id: 'tokens' as const, label: 'Token Stats', show: showTopTokens },
  ].filter(tab => tab.show);

  return (
    <div className={`ce-tipping-leaderboard ${className}`}>
      {/* Header */}
      <div className="ce-leaderboard-header">
        <h3>Tipping Leaderboard</h3>
        <div className="ce-timeframe-selector">
          {(['day', 'week', 'month', 'all'] as const).map(period => (
            <button
              key={period}
              className={`ce-timeframe-option ${timeframe === period ? 'active' : ''}`}
              onClick={() => {/* Handle timeframe change */}}
            >
              {period === 'all' ? 'All Time' : `1 ${period}`}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="ce-leaderboard-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`ce-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="ce-leaderboard-content">
        {/* Top Tippers */}
        {activeTab === 'tippers' && showTopTippers && (
          <div className="ce-tippers-list">
            {topTippers.length === 0 ? (
              <div className="ce-empty-state">
                <p>No tipping activity in this timeframe</p>
              </div>
            ) : (
              topTippers.map(tipper => (
                <div key={tipper.id} className="ce-tipper-item">
                  <div className="ce-tipper-rank">
                    <span className="ce-rank-number">#{tipper.rank}</span>
                    {tipper.badge && (
                      <span 
                        className="ce-tipper-badge"
                        title={TIPPER_BADGES[tipper.badge as keyof typeof TIPPER_BADGES].name}
                      >
                        {TIPPER_BADGES[tipper.badge as keyof typeof TIPPER_BADGES].icon}
                      </span>
                    )}
                  </div>
                  
                  <div className="ce-tipper-info">
                    <div className="ce-tipper-name">{tipper.name}</div>
                    <div className="ce-tipper-stats">
                      <span className="ce-tip-count">{tipper.tipCount} tips</span>
                      <div className="ce-token-breakdown">
                        {Object.entries(tipper.tokens).map(([token, amount]) => (
                          <span key={token} className="ce-token-amount">
                            <span 
                              className="ce-token-icon"
                              style={{ color: getTokenColor(token) }}
                            >
                              {getTokenIcon(token)}
                            </span>
                            {formatAmount(amount)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Top Content */}
        {activeTab === 'content' && showTopContent && (
          <div className="ce-content-list">
            {topContent.length === 0 ? (
              <div className="ce-empty-state">
                <p>No content has received tips in this timeframe</p>
              </div>
            ) : (
              topContent.map(content => (
                <div key={content.postId} className="ce-content-item">
                  <div className="ce-content-rank">
                    <span className="ce-rank-number">#{content.rank}</span>
                  </div>
                  
                  <div className="ce-content-info">
                    <div className="ce-content-id">Post {content.postId.slice(0, 8)}...</div>
                    <div className="ce-content-stats">
                      <span className="ce-tip-count">{content.tipCount} tips received</span>
                      <div className="ce-token-breakdown">
                        {Object.entries(content.tokens).map(([token, amount]) => (
                          <span key={token} className="ce-token-amount">
                            <span 
                              className="ce-token-icon"
                              style={{ color: getTokenColor(token) }}
                            >
                              {getTokenIcon(token)}
                            </span>
                            {formatAmount(amount)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Token Stats */}
        {activeTab === 'tokens' && showTopTokens && (
          <div className="ce-tokens-list">
            {tokenStats.length === 0 ? (
              <div className="ce-empty-state">
                <p>No token activity in this timeframe</p>
              </div>
            ) : (
              tokenStats.map((token, index) => (
                <div key={token.token} className="ce-token-item">
                  <div className="ce-token-rank">
                    <span className="ce-rank-number">#{index + 1}</span>
                    <span 
                      className="ce-token-icon-large"
                      style={{ color: getTokenColor(token.token) }}
                    >
                      {getTokenIcon(token.token)}
                    </span>
                  </div>
                  
                  <div className="ce-token-info">
                    <div className="ce-token-name">{token.token}</div>
                    <div className="ce-token-stats">
                      <div className="ce-stat-row">
                        <span className="ce-stat-label">Volume:</span>
                        <span className="ce-stat-value">
                          {formatAmount(token.totalVolume)} {token.token}
                        </span>
                      </div>
                      <div className="ce-stat-row">
                        <span className="ce-stat-label">Tips:</span>
                        <span className="ce-stat-value">{token.tipCount}</span>
                      </div>
                      <div className="ce-stat-row">
                        <span className="ce-stat-label">Avg:</span>
                        <span className="ce-stat-value">
                          {formatAmount(token.averageTip)} {token.token}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .ce-tipping-leaderboard {
          background: var(--ce-bg-primary);
          border: 1px solid var(--ce-border-light);
          border-radius: var(--ce-radius-lg);
          overflow: hidden;
        }
        
        .ce-leaderboard-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--ce-space-lg);
          border-bottom: 1px solid var(--ce-border-light);
          background: var(--ce-bg-secondary);
        }
        
        .ce-leaderboard-header h3 {
          margin: 0;
          font-size: var(--ce-font-size-lg);
          color: var(--ce-text-primary);
        }
        
        .ce-timeframe-selector {
          display: flex;
          gap: var(--ce-space-xs);
        }
        
        .ce-timeframe-option {
          padding: var(--ce-space-xs) var(--ce-space-sm);
          background: var(--ce-bg-primary);
          border: 1px solid var(--ce-border-light);
          border-radius: var(--ce-radius-md);
          font-size: var(--ce-font-size-sm);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .ce-timeframe-option:hover {
          background: var(--ce-bg-tertiary);
        }
        
        .ce-timeframe-option.active {
          background: var(--ce-color-primary);
          color: white;
          border-color: var(--ce-color-primary);
        }
        
        .ce-leaderboard-tabs {
          display: flex;
          border-bottom: 1px solid var(--ce-border-light);
        }
        
        .ce-tab {
          flex: 1;
          padding: var(--ce-space-md);
          background: var(--ce-bg-secondary);
          border: none;
          border-right: 1px solid var(--ce-border-light);
          font-size: var(--ce-font-size-sm);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .ce-tab:last-child {
          border-right: none;
        }
        
        .ce-tab:hover {
          background: var(--ce-bg-tertiary);
        }
        
        .ce-tab.active {
          background: var(--ce-bg-primary);
          color: var(--ce-color-primary);
          font-weight: 500;
        }
        
        .ce-leaderboard-content {
          padding: var(--ce-space-lg);
        }
        
        .ce-tippers-list,
        .ce-content-list,
        .ce-tokens-list {
          display: flex;
          flex-direction: column;
          gap: var(--ce-space-md);
        }
        
        .ce-tipper-item,
        .ce-content-item,
        .ce-token-item {
          display: flex;
          align-items: center;
          gap: var(--ce-space-md);
          padding: var(--ce-space-md);
          background: var(--ce-bg-secondary);
          border-radius: var(--ce-radius-md);
          transition: all 0.2s ease;
        }
        
        .ce-tipper-item:hover,
        .ce-content-item:hover,
        .ce-token-item:hover {
          background: var(--ce-bg-tertiary);
          transform: translateY(-1px);
        }
        
        .ce-tipper-rank,
        .ce-content-rank,
        .ce-token-rank {
          display: flex;
          align-items: center;
          gap: var(--ce-space-xs);
          min-width: 60px;
        }
        
        .ce-rank-number {
          font-weight: 600;
          color: var(--ce-color-primary);
          font-size: var(--ce-font-size-lg);
        }
        
        .ce-tipper-badge {
          font-size: 1.2em;
        }
        
        .ce-token-icon-large {
          font-size: 1.5em;
          font-weight: bold;
        }
        
        .ce-tipper-info,
        .ce-content-info,
        .ce-token-info {
          flex: 1;
        }
        
        .ce-tipper-name,
        .ce-content-id,
        .ce-token-name {
          font-weight: 500;
          color: var(--ce-text-primary);
          margin-bottom: var(--ce-space-xs);
        }
        
        .ce-tipper-stats,
        .ce-content-stats,
        .ce-token-stats {
          display: flex;
          align-items: center;
          gap: var(--ce-space-sm);
          flex-wrap: wrap;
        }
        
        .ce-tip-count {
          font-size: var(--ce-font-size-sm);
          color: var(--ce-text-secondary);
        }
        
        .ce-token-breakdown {
          display: flex;
          gap: var(--ce-space-sm);
          flex-wrap: wrap;
        }
        
        .ce-token-amount {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: var(--ce-font-size-sm);
          font-weight: 500;
        }
        
        .ce-token-icon {
          font-size: 1em;
          font-weight: bold;
        }
        
        .ce-stat-row {
          display: flex;
          align-items: center;
          gap: var(--ce-space-xs);
        }
        
        .ce-stat-label {
          font-size: var(--ce-font-size-xs);
          color: var(--ce-text-tertiary);
          min-width: 40px;
        }
        
        .ce-stat-value {
          font-size: var(--ce-font-size-sm);
          font-weight: 500;
          color: var(--ce-text-primary);
        }
        
        .ce-empty-state {
          text-align: center;
          padding: var(--ce-space-xl);
          color: var(--ce-text-secondary);
        }
        
        .ce-empty-state p {
          margin: 0;
          font-style: italic;
        }
        
        @media (max-width: 768px) {
          .ce-leaderboard-header {
            flex-direction: column;
            gap: var(--ce-space-md);
            align-items: stretch;
          }
          
          .ce-timeframe-selector {
            justify-content: center;
          }
          
          .ce-tipper-stats,
          .ce-content-stats {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--ce-space-xs);
          }
          
          .ce-token-stats {
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
          }
        }
      `}</style>
    </div>
  );
};

export default TippingLeaderboard;