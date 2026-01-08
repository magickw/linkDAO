/**
 * Enhanced Tipping System
 * Replaces plain text tipping with token icons and animations
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAnimation } from '../SharedComponents/AnimationProvider';

export interface TipData {
  id: string;
  amount: number;
  token: 'LDAO' | 'USDC' | string;
  tipper: string;
  tipperName?: string;
  timestamp: Date;
  transactionHash?: string;
}

export interface EnhancedTippingSystemProps {
  postId: string;
  authorId: string;
  tips: TipData[];
  onTip?: (amount: number, token: string) => Promise<void>;
  showTipButton?: boolean;
  showTipHistory?: boolean;
  showLeaderboard?: boolean;
  className?: string;
}

const TOKEN_ICONS = {
  LDAO: 'L',
  USDC: '$',
} as const;

const TOKEN_COLORS = {
  LDAO: '#627eea',
  USDC: '#2775ca',
} as const;

const EnhancedTippingSystem: React.FC<EnhancedTippingSystemProps> = ({
  postId,
  authorId,
  tips = [],
  onTip,
  showTipButton = true,
  showTipHistory = true,
  showLeaderboard = false,
  className = '',
}) => {
  // Deduplicate tips based on ID to prevent rendering errors
  const uniqueTips = React.useMemo(() => {
    if (!tips || !Array.isArray(tips)) return [];

    const seen = new Set();
    return tips.filter(tip => {
      if (!tip || !tip.id) return false;
      const duplicate = seen.has(tip.id);
      seen.add(tip.id);
      return !duplicate;
    });
  }, [tips]);

  const [showTipModal, setShowTipModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState<string>('USDC');
  const [tipAmount, setTipAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentTips, setRecentTips] = useState<TipData[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const { triggerAnimation } = useAnimation();

  // Calculate tip statistics
  const tipStats = React.useMemo(() => {
    const totalTips = uniqueTips.length;
    const totalValue = uniqueTips.reduce((sum, tip) => {
      // For simplicity, we're treating all tokens as having the same value
      return sum + tip.amount;
    }, 0);

    const tokenBreakdown = uniqueTips.reduce((acc, tip) => {
      if (!acc[tip.token]) {
        acc[tip.token] = { count: 0, total: 0 };
      }
      acc[tip.token].count++;
      acc[tip.token].total += tip.amount;
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    const topTippers = uniqueTips
      .reduce((acc, tip) => {
        if (!acc[tip.tipper]) {
          acc[tip.tipper] = {
            name: tip.tipperName || tip.tipper,
            total: 0,
            count: 0,
            tokens: {} as Record<string, number>
          };
        }
        acc[tip.tipper].total += tip.amount;
        acc[tip.tipper].count++;
        acc[tip.tipper].tokens[tip.token] = (acc[tip.tipper].tokens[tip.token] || 0) + tip.amount;
        return acc;
      }, {} as Record<string, { name: string; total: number; count: number; tokens: Record<string, number> }>);

    return {
      totalTips,
      totalValue,
      tokenBreakdown,
      topTippers: Object.entries(topTippers)
        .sort(([, a], [, b]) => b.total - a.total)
        .slice(0, 5),
    };
  }, [uniqueTips]);

  // Handle new tips (real-time updates)
  useEffect(() => {
    const newTips = uniqueTips.filter(tip =>
      Date.now() - tip.timestamp.getTime() < 10000 // Last 10 seconds
    );

    if (newTips.length > 0) {
      setRecentTips(newTips);

      // Trigger celebration animation
      if (containerRef.current) {
        triggerAnimation(containerRef.current, 'celebrate');
      }

      // Clear recent tips after animation
      setTimeout(() => setRecentTips([]), 3000);
    }
  }, [uniqueTips, triggerAnimation]);

  // Handle tip submission
  const handleTipSubmit = async () => {
    if (!onTip || !tipAmount || isNaN(Number(tipAmount))) return;

    setIsProcessing(true);

    try {
      await onTip(Number(tipAmount), selectedToken);

      // Reset form
      setTipAmount('');
      setShowTipModal(false);

      // Show success animation
      if (containerRef.current) {
        triggerAnimation(containerRef.current, 'success');
      }
    } catch (error) {
      console.error('Tip failed:', error);
      // Show error state
    } finally {
      setIsProcessing(false);
    }
  };

  // Format tip amount for display
  const formatTipAmount = (amount: number, token: string) => {
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

  return (
    <div className={`ce-enhanced-tipping-system ${className}`} ref={containerRef}>
      {/* Tip Summary */}
      {uniqueTips.length > 0 && (
        <div className="ce-tip-summary">
          <div className="ce-tip-stats">
            <span className="ce-tip-count">{tipStats.totalTips} tips</span>
            {Object.entries(tipStats.tokenBreakdown).map(([token, data]) => (
              <div key={token} className="ce-token-stat">
                <span
                  className="ce-token-icon"
                  style={{ color: getTokenColor(token) }}
                >
                  {getTokenIcon(token)}
                </span>
                <span className="ce-token-amount">
                  {formatTipAmount(data.total, token)}
                </span>
              </div>
            ))}
          </div>

          {showTipHistory && (
            <button
              className="ce-tip-history-toggle"
              onClick={() => setShowTipModal(true)}
            >
              View Tips
            </button>
          )}
        </div>
      )}

      {/* Tip Button */}
      {showTipButton && onTip && (
        <button
          className="ce-tip-button"
          onClick={() => setShowTipModal(true)}
          disabled={isProcessing}
        >
          <span className="ce-tip-icon">💰</span>
          <span>Tip</span>
        </button>
      )}

      {/* Recent Tips Animation */}
      {recentTips.length > 0 && (
        <div className="ce-recent-tips-overlay">
          {recentTips.map((tip) => (
            <div key={tip.id} className="ce-floating-tip">
              <span
                className="ce-floating-tip-icon"
                style={{ color: getTokenColor(tip.token) }}
              >
                {getTokenIcon(tip.token)}
              </span>
              <span className="ce-floating-tip-amount">
                +{formatTipAmount(tip.amount, tip.token)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tip Modal */}
      {showTipModal && (
        <div className="ce-tip-modal-overlay" onClick={() => setShowTipModal(false)}>
          <div className="ce-tip-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ce-tip-modal-header">
              <h3>Send Tip</h3>
              <button
                className="ce-modal-close"
                onClick={() => setShowTipModal(false)}
              >
                ×
              </button>
            </div>

            <div className="ce-tip-modal-content">
              {/* Token Selection */}
              <div className="ce-token-selection">
                <label>Token:</label>
                <div className="ce-token-options">
                  {['LDAO', 'USDC'].map((token) => (
                    <button
                      key={token}
                      className={`ce-token-option ${selectedToken === token ? 'selected' : ''}`}
                      onClick={() => setSelectedToken(token)}
                    >
                      <span
                        className="ce-token-icon"
                        style={{ color: getTokenColor(token) }}
                      >
                        {getTokenIcon(token)}
                      </span>
                      <span>{token}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div className="ce-amount-input">
                <label>Amount:</label>
                <div className="ce-input-group">
                  <input
                    type="number"
                    value={tipAmount}
                    onChange={(e) => setTipAmount(e.target.value)}
                    placeholder="0.001"
                    step="0.001"
                    min="0"
                  />
                  <span className="ce-input-suffix">{selectedToken}</span>
                </div>
              </div>

              {/* Quick Amount Buttons */}
              <div className="ce-quick-amounts">
                {['0.001', '0.01', '0.1', '1'].map((amount) => (
                  <button
                    key={amount}
                    className="ce-quick-amount"
                    onClick={() => setTipAmount(amount)}
                  >
                    {amount} {selectedToken}
                  </button>
                ))}
              </div>

              {/* Submit Button */}
              <button
                className="ce-tip-submit"
                onClick={handleTipSubmit}
                disabled={!tipAmount || isProcessing}
              >
                {isProcessing ? 'Processing...' : `Send ${tipAmount} ${selectedToken}`}
              </button>
            </div>

            {/* Tip History */}
            {showTipHistory && uniqueTips.length > 0 && (
              <div className="ce-tip-history">
                <h4>Recent Tips</h4>
                <div className="ce-tip-list">
                  {uniqueTips.slice(0, 10).map((tip) => (
                    <div key={tip.id} className="ce-tip-item">
                      <div className="ce-tip-item-info">
                        <span
                          className="ce-token-icon"
                          style={{ color: getTokenColor(tip.token) }}
                        >
                          {getTokenIcon(tip.token)}
                        </span>
                        <span className="ce-tip-amount">
                          {formatTipAmount(tip.amount, tip.token)} {tip.token}
                        </span>
                        <span className="ce-tip-from">
                          from {tip.tipperName || `${tip.tipper.slice(0, 6)}...`}
                        </span>
                      </div>
                      <span className="ce-tip-time">
                        {new Date(tip.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Leaderboard */}
            {showLeaderboard && tipStats.topTippers.length > 0 && (
              <div className="ce-tip-leaderboard">
                <h4>Top Tippers</h4>
                <div className="ce-leaderboard-list">
                  {tipStats.topTippers.map(([tipper, data], index) => (
                    <div key={tipper} className="ce-leaderboard-item">
                      <span className="ce-rank">#{index + 1}</span>
                      <span className="ce-tipper-name">{data.name}</span>
                      <div className="ce-tipper-tokens">
                        {Object.entries(data.tokens).map(([token, amount]) => (
                          <span key={token} className="ce-token-badge">
                            <span
                              className="ce-token-icon"
                              style={{ color: getTokenColor(token) }}
                            >
                              {getTokenIcon(token)}
                            </span>
                            {formatTipAmount(amount, token)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .ce-enhanced-tipping-system {
          position: relative;
        }
        
        .ce-tip-summary {
          display: flex;
          align-items: center;
          gap: var(--ce-space-sm);
          margin-bottom: var(--ce-space-sm);
        }
        
        .ce-tip-stats {
          display: flex;
          align-items: center;
          gap: var(--ce-space-sm);
        }
        
        .ce-tip-count {
          font-size: var(--ce-font-size-sm);
          color: var(--ce-text-secondary);
        }
        
        .ce-token-stat {
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
        
        .ce-token-amount {
          color: var(--ce-text-primary);
        }
        
        .ce-tip-history-toggle {
          background: none;
          border: none;
          color: var(--ce-color-primary);
          font-size: var(--ce-font-size-sm);
          cursor: pointer;
          text-decoration: underline;
          padding: 0;
        }
        
        .ce-tip-button {
          display: flex;
          align-items: center;
          gap: var(--ce-space-xs);
          padding: var(--ce-space-xs) var(--ce-space-sm);
          background: var(--ce-bg-secondary);
          border: 1px solid var(--ce-border-light);
          border-radius: var(--ce-radius-md);
          color: var(--ce-text-primary);
          font-size: var(--ce-font-size-sm);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .ce-tip-button:hover {
          background: var(--ce-bg-tertiary);
          transform: translateY(-1px);
        }
        
        .ce-tip-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        .ce-tip-icon {
          font-size: 1.1em;
        }
        
        .ce-recent-tips-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: var(--ce-z-overlay);
        }
        
        .ce-floating-tip {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--ce-bg-success);
          color: white;
          padding: var(--ce-space-xs) var(--ce-space-sm);
          border-radius: var(--ce-radius-full);
          font-size: var(--ce-font-size-sm);
          font-weight: 600;
          animation: ce-float-up 3s ease-out forwards;
        }
        
        .ce-floating-tip-icon {
          font-size: 1.2em;
        }
        
        .ce-tip-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: var(--ce-z-modal);
          animation: ce-fadeIn 0.2s ease-out;
        }
        
        .ce-tip-modal {
          background: var(--ce-bg-primary);
          border-radius: var(--ce-radius-lg);
          box-shadow: var(--ce-shadow-xl);
          width: 90%;
          max-width: 480px;
          max-height: 80vh;
          overflow-y: auto;
          animation: ce-slideUp 0.3s ease-out;
        }
        
        .ce-tip-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--ce-space-lg);
          border-bottom: 1px solid var(--ce-border-light);
        }
        
        .ce-tip-modal-header h3 {
          margin: 0;
          font-size: var(--ce-font-size-lg);
          color: var(--ce-text-primary);
        }
        
        .ce-modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: var(--ce-text-secondary);
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--ce-radius-md);
        }
        
        .ce-modal-close:hover {
          background: var(--ce-bg-secondary);
        }
        
        .ce-tip-modal-content {
          padding: var(--ce-space-lg);
        }
        
        .ce-token-selection {
          margin-bottom: var(--ce-space-lg);
        }
        
        .ce-token-selection label {
          display: block;
          margin-bottom: var(--ce-space-sm);
          font-weight: 500;
          color: var(--ce-text-primary);
        }
        
        .ce-token-options {
          display: flex;
          gap: var(--ce-space-sm);
          flex-wrap: wrap;
        }
        
        .ce-token-option {
          display: flex;
          align-items: center;
          gap: var(--ce-space-xs);
          padding: var(--ce-space-sm);
          background: var(--ce-bg-secondary);
          border: 1px solid var(--ce-border-light);
          border-radius: var(--ce-radius-md);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .ce-token-option:hover {
          background: var(--ce-bg-tertiary);
        }
        
        .ce-token-option.selected {
          background: var(--ce-color-primary);
          color: white;
          border-color: var(--ce-color-primary);
        }
        
        .ce-amount-input {
          margin-bottom: var(--ce-space-lg);
        }
        
        .ce-amount-input label {
          display: block;
          margin-bottom: var(--ce-space-sm);
          font-weight: 500;
          color: var(--ce-text-primary);
        }
        
        .ce-input-group {
          position: relative;
          display: flex;
          align-items: center;
        }
        
        .ce-input-group input {
          flex: 1;
          padding: var(--ce-space-sm);
          border: 1px solid var(--ce-border-light);
          border-radius: var(--ce-radius-md);
          font-size: var(--ce-font-size-base);
          background: var(--ce-bg-primary);
          color: var(--ce-text-primary);
        }
        
        .ce-input-suffix {
          position: absolute;
          right: var(--ce-space-sm);
          color: var(--ce-text-secondary);
          font-size: var(--ce-font-size-sm);
          pointer-events: none;
        }
        
        .ce-quick-amounts {
          display: flex;
          gap: var(--ce-space-sm);
          margin-bottom: var(--ce-space-lg);
          flex-wrap: wrap;
        }
        
        .ce-quick-amount {
          padding: var(--ce-space-xs) var(--ce-space-sm);
          background: var(--ce-bg-secondary);
          border: 1px solid var(--ce-border-light);
          border-radius: var(--ce-radius-md);
          font-size: var(--ce-font-size-sm);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .ce-quick-amount:hover {
          background: var(--ce-bg-tertiary);
        }
        
        .ce-tip-submit {
          width: 100%;
          padding: var(--ce-space-md);
          background: var(--ce-color-primary);
          color: white;
          border: none;
          border-radius: var(--ce-radius-md);
          font-size: var(--ce-font-size-base);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .ce-tip-submit:hover:not(:disabled) {
          background: var(--ce-color-primary-dark);
        }
        
        .ce-tip-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .ce-tip-history,
        .ce-tip-leaderboard {
          border-top: 1px solid var(--ce-border-light);
          padding: var(--ce-space-lg);
        }
        
        .ce-tip-history h4,
        .ce-tip-leaderboard h4 {
          margin: 0 0 var(--ce-space-md) 0;
          font-size: var(--ce-font-size-base);
          color: var(--ce-text-primary);
        }
        
        .ce-tip-list,
        .ce-leaderboard-list {
          display: flex;
          flex-direction: column;
          gap: var(--ce-space-sm);
          max-height: 200px;
          overflow-y: auto;
        }
        
        .ce-tip-item,
        .ce-leaderboard-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--ce-space-sm);
          background: var(--ce-bg-secondary);
          border-radius: var(--ce-radius-md);
        }
        
        .ce-tip-item-info {
          display: flex;
          align-items: center;
          gap: var(--ce-space-sm);
        }
        
        .ce-tip-from {
          color: var(--ce-text-secondary);
          font-size: var(--ce-font-size-sm);
        }
        
        .ce-tip-time {
          color: var(--ce-text-tertiary);
          font-size: var(--ce-font-size-xs);
        }
        
        .ce-leaderboard-item {
          align-items: center;
        }
        
        .ce-rank {
          font-weight: 600;
          color: var(--ce-color-primary);
          min-width: 32px;
        }
        
        .ce-tipper-name {
          flex: 1;
          font-weight: 500;
        }
        
        .ce-tipper-tokens {
          display: flex;
          gap: var(--ce-space-xs);
        }
        
        .ce-token-badge {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 2px var(--ce-space-xs);
          background: var(--ce-bg-tertiary);
          border-radius: var(--ce-radius-sm);
          font-size: var(--ce-font-size-xs);
        }
        
        @keyframes ce-float-up {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          20% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -150%) scale(1);
          }
        }
        
        @keyframes ce-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes ce-slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @media (max-width: 768px) {
          .ce-tip-modal {
            width: 95%;
            margin: var(--ce-space-md);
          }
          
          .ce-token-options {
            justify-content: center;
          }
          
          .ce-quick-amounts {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default EnhancedTippingSystem;