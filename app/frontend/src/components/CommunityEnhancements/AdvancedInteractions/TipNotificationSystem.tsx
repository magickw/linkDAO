/**
 * Tip Notification System
 * Handles tip notifications with celebration effects and real-time updates
 */

import React, { useState, useEffect, useRef } from 'react';
import { TipData } from './EnhancedTippingSystem';

export interface TipNotification {
  id: string;
  type: 'tip_received' | 'tip_sent' | 'milestone_reached';
  tip: TipData;
  message: string;
  timestamp: Date;
  isRead: boolean;
  celebratory?: boolean;
}

export interface TipNotificationSystemProps {
  notifications: TipNotification[];
  onMarkAsRead?: (notificationId: string) => void;
  onClearAll?: () => void;
  showCelebrations?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxVisible?: number;
  autoHideDelay?: number;
  className?: string;
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

const CELEBRATION_EMOJIS = ['🎉', '✨', '💰', '🚀', '⭐', '💎', '🔥', '🎊'];

const TipNotificationSystem: React.FC<TipNotificationSystemProps> = ({
  notifications,
  onMarkAsRead,
  onClearAll,
  showCelebrations = true,
  position = 'top-right',
  maxVisible = 5,
  autoHideDelay = 5000,
  className = '',
}) => {
  const [visibleNotifications, setVisibleNotifications] = useState<TipNotification[]>([]);
  const [celebrationParticles, setCelebrationParticles] = useState<Array<{
    id: string;
    emoji: string;
    x: number;
    y: number;
    delay: number;
  }>>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Update visible notifications
  useEffect(() => {
    const unreadNotifications = notifications
      .filter(n => !n.isRead)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxVisible);
    
    setVisibleNotifications(unreadNotifications);
  }, [notifications, maxVisible]);

  // Auto-hide notifications
  useEffect(() => {
    visibleNotifications.forEach(notification => {
      if (!timeoutRefs.current.has(notification.id)) {
        const timeout = setTimeout(() => {
          handleMarkAsRead(notification.id);
        }, autoHideDelay);
        
        timeoutRefs.current.set(notification.id, timeout);
      }
    });

    // Cleanup removed notifications
    const visibleIds = new Set(visibleNotifications.map(n => n.id));
    timeoutRefs.current.forEach((timeout, id) => {
      if (!visibleIds.has(id)) {
        clearTimeout(timeout);
        timeoutRefs.current.delete(id);
      }
    });
  }, [visibleNotifications, autoHideDelay]);

  // Trigger celebrations for new celebratory notifications
  useEffect(() => {
    const newCelebratoryNotifications = visibleNotifications.filter(
      n => n.celebratory && showCelebrations
    );

    if (newCelebratoryNotifications.length > 0) {
      triggerCelebration();
    }
  }, [visibleNotifications, showCelebrations]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  // Handle marking notification as read
  const handleMarkAsRead = (notificationId: string) => {
    onMarkAsRead?.(notificationId);
    
    // Clear timeout
    const timeout = timeoutRefs.current.get(notificationId);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(notificationId);
    }
  };

  // Trigger celebration animation
  const triggerCelebration = () => {
    const particles = Array.from({ length: 12 }, (_, i) => ({
      id: `particle-${Date.now()}-${i}`,
      emoji: CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)],
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 0.5,
    }));

    setCelebrationParticles(particles);

    // Clear particles after animation
    setTimeout(() => {
      setCelebrationParticles([]);
    }, 3000);
  };

  // Format tip amount
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

  // Get notification icon based on type
  const getNotificationIcon = (notification: TipNotification) => {
    switch (notification.type) {
      case 'tip_received':
        return '💰';
      case 'tip_sent':
        return '🚀';
      case 'milestone_reached':
        return '🎯';
      default:
        return '💡';
    }
  };

  // Get position classes
  const getPositionClasses = () => {
    const [vertical, horizontal] = position.split('-');
    return `ce-notifications-${vertical} ce-notifications-${horizontal}`;
  };

  if (visibleNotifications.length === 0 && celebrationParticles.length === 0) {
    return null;
  }

  return (
    <div 
      className={`ce-tip-notification-system ${getPositionClasses()} ${className}`}
      ref={containerRef}
    >
      {/* Celebration Particles */}
      {celebrationParticles.length > 0 && (
        <div className="ce-celebration-overlay">
          {celebrationParticles.map(particle => (
            <div
              key={particle.id}
              className="ce-celebration-particle"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                animationDelay: `${particle.delay}s`,
              }}
            >
              {particle.emoji}
            </div>
          ))}
        </div>
      )}

      {/* Notifications */}
      <div className="ce-notifications-container">
        {visibleNotifications.map((notification, index) => (
          <div
            key={notification.id}
            className={`ce-notification ${notification.celebratory ? 'ce-celebratory' : ''}`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="ce-notification-content">
              <div className="ce-notification-header">
                <span className="ce-notification-icon">
                  {getNotificationIcon(notification)}
                </span>
                <div className="ce-notification-info">
                  <div className="ce-notification-message">
                    {notification.message}
                  </div>
                  <div className="ce-notification-details">
                    <span 
                      className="ce-token-icon"
                      style={{ color: getTokenColor(notification.tip.token) }}
                    >
                      {getTokenIcon(notification.tip.token)}
                    </span>
                    <span className="ce-tip-amount">
                      {formatTipAmount(notification.tip.amount, notification.tip.token)} {notification.tip.token}
                    </span>
                    <span className="ce-notification-time">
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <button
                  className="ce-notification-close"
                  onClick={() => handleMarkAsRead(notification.id)}
                  aria-label="Dismiss notification"
                >
                  ×
                </button>
              </div>
              
              {notification.tip.tipperName && (
                <div className="ce-notification-footer">
                  <span className="ce-tipper-info">
                    from {notification.tip.tipperName}
                  </span>
                  {notification.tip.transactionHash && (
                    <a
                      href={`https://etherscan.io/tx/${notification.tip.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ce-transaction-link"
                    >
                      View Transaction
                    </a>
                  )}
                </div>
              )}
            </div>
            
            {notification.celebratory && (
              <div className="ce-notification-glow"></div>
            )}
          </div>
        ))}
      </div>

      {/* Clear All Button */}
      {visibleNotifications.length > 1 && onClearAll && (
        <button
          className="ce-clear-all-button"
          onClick={onClearAll}
        >
          Clear All
        </button>
      )}

      <style jsx>{`
        .ce-tip-notification-system {
          position: fixed;
          z-index: var(--ce-z-notification, 1000);
          pointer-events: none;
          max-width: 400px;
          width: 100%;
        }
        
        .ce-notifications-top {
          top: var(--ce-space-lg);
        }
        
        .ce-notifications-bottom {
          bottom: var(--ce-space-lg);
        }
        
        .ce-notifications-right {
          right: var(--ce-space-lg);
        }
        
        .ce-notifications-left {
          left: var(--ce-space-lg);
        }
        
        .ce-celebration-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          overflow: hidden;
        }
        
        .ce-celebration-particle {
          position: absolute;
          font-size: 1.5rem;
          animation: ce-celebrate 3s ease-out forwards;
          pointer-events: none;
        }
        
        .ce-notifications-container {
          display: flex;
          flex-direction: column;
          gap: var(--ce-space-sm);
          pointer-events: auto;
        }
        
        .ce-notification {
          background: var(--ce-bg-primary);
          border: 1px solid var(--ce-border-light);
          border-radius: var(--ce-radius-lg);
          box-shadow: var(--ce-shadow-lg);
          overflow: hidden;
          animation: ce-slideIn 0.3s ease-out;
          position: relative;
        }
        
        .ce-notification.ce-celebratory {
          border-color: var(--ce-color-success);
          animation: ce-slideIn 0.3s ease-out, ce-pulse 2s ease-in-out infinite;
        }
        
        .ce-notification-content {
          padding: var(--ce-space-md);
        }
        
        .ce-notification-header {
          display: flex;
          align-items: flex-start;
          gap: var(--ce-space-sm);
        }
        
        .ce-notification-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }
        
        .ce-notification-info {
          flex: 1;
          min-width: 0;
        }
        
        .ce-notification-message {
          font-weight: 500;
          color: var(--ce-text-primary);
          margin-bottom: var(--ce-space-xs);
          line-height: 1.4;
        }
        
        .ce-notification-details {
          display: flex;
          align-items: center;
          gap: var(--ce-space-sm);
          font-size: var(--ce-font-size-sm);
          color: var(--ce-text-secondary);
        }
        
        .ce-token-icon {
          font-weight: bold;
        }
        
        .ce-tip-amount {
          font-weight: 600;
          color: var(--ce-text-primary);
        }
        
        .ce-notification-time {
          color: var(--ce-text-tertiary);
          font-size: var(--ce-font-size-xs);
        }
        
        .ce-notification-close {
          background: none;
          border: none;
          font-size: 1.25rem;
          color: var(--ce-text-secondary);
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--ce-radius-sm);
          flex-shrink: 0;
        }
        
        .ce-notification-close:hover {
          background: var(--ce-bg-secondary);
          color: var(--ce-text-primary);
        }
        
        .ce-notification-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: var(--ce-space-sm);
          padding-top: var(--ce-space-sm);
          border-top: 1px solid var(--ce-border-light);
        }
        
        .ce-tipper-info {
          font-size: var(--ce-font-size-xs);
          color: var(--ce-text-secondary);
        }
        
        .ce-transaction-link {
          font-size: var(--ce-font-size-xs);
          color: var(--ce-color-primary);
          text-decoration: none;
        }
        
        .ce-transaction-link:hover {
          text-decoration: underline;
        }
        
        .ce-notification-glow {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            45deg,
            transparent,
            var(--ce-color-success-light, rgba(34, 197, 94, 0.1)),
            transparent
          );
          animation: ce-glow 2s ease-in-out infinite;
          pointer-events: none;
        }
        
        .ce-clear-all-button {
          margin-top: var(--ce-space-sm);
          padding: var(--ce-space-xs) var(--ce-space-sm);
          background: var(--ce-bg-secondary);
          border: 1px solid var(--ce-border-light);
          border-radius: var(--ce-radius-md);
          color: var(--ce-text-secondary);
          font-size: var(--ce-font-size-sm);
          cursor: pointer;
          width: 100%;
          pointer-events: auto;
        }
        
        .ce-clear-all-button:hover {
          background: var(--ce-bg-tertiary);
          color: var(--ce-text-primary);
        }
        
        @keyframes ce-celebrate {
          0% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          20% {
            opacity: 1;
            transform: scale(1) rotate(180deg);
          }
          100% {
            opacity: 0;
            transform: scale(0.5) rotate(360deg) translateY(-100px);
          }
        }
        
        @keyframes ce-slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .ce-notifications-left .ce-notification {
          animation: ce-slideInLeft 0.3s ease-out;
        }
        
        @keyframes ce-slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes ce-pulse {
          0%, 100% {
            box-shadow: var(--ce-shadow-lg);
          }
          50% {
            box-shadow: var(--ce-shadow-lg), 0 0 20px var(--ce-color-success-light, rgba(34, 197, 94, 0.3));
          }
        }
        
        @keyframes ce-glow {
          0%, 100% {
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
        }
        
        @media (max-width: 768px) {
          .ce-tip-notification-system {
            left: var(--ce-space-md) !important;
            right: var(--ce-space-md) !important;
            max-width: none;
          }
          
          .ce-notification-details {
            flex-wrap: wrap;
            gap: var(--ce-space-xs);
          }
          
          .ce-notification-footer {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--ce-space-xs);
          }
        }
        
        @media (prefers-reduced-motion: reduce) {
          .ce-celebration-particle {
            animation: none;
          }
          
          .ce-notification {
            animation: none;
          }
          
          .ce-notification.ce-celebratory {
            animation: none;
          }
          
          .ce-notification-glow {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
};

export default TipNotificationSystem;