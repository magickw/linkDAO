import React, { useState, useEffect } from 'react';
import { useEnhancedOfflineSupport } from '../hooks/useOfflineSupport';

interface OfflineIndicatorProps {
  className?: string;
  showQueueSize?: boolean;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  className = '', 
  showQueueSize = true 
}) => {
  const { isOnline, queueSize, syncNow } = useEnhancedOfflineSupport();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show indicator when offline or when there are queued actions
    setIsVisible(!isOnline || queueSize > 0);
  }, [isOnline, queueSize]);

  useEffect(() => {
    setIsVisible(!isOnline || queueSize > 0);
  }, [isOnline, queueSize]);

  const handleSyncClick = async () => {
    try {
      await syncNow();
    } catch (error) {
      console.error('Failed to sync offline actions:', error);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`offline-indicator ${className}`}>
      <div className={`indicator-content ${isOnline ? 'online' : 'offline'}`}>
        <div className="status-icon">
          {isOnline ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm3.707 5.293a1 1 0 0 1 0 1.414L9.414 9l2.293 2.293a1 1 0 0 1-1.414 1.414L8 10.414l-2.293 2.293a1 1 0 0 1-1.414-1.414L6.586 9 4.293 6.707a1 1 0 0 1 1.414-1.414L8 7.586l2.293-2.293a1 1 0 0 1 1.414 0z"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/>
              <path d="M8 4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1s1-.45 1-1V5c0-.55-.45-1-1-1zm0 8c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
            </svg>
          )}
        </div>
        
        <div className="status-text">
          {isOnline ? (
            queueSize > 0 ? (
              <span>Syncing {queueSize} action{queueSize !== 1 ? 's' : ''}...</span>
            ) : (
              <span>Connected</span>
            )
          ) : (
            <span>You're offline</span>
          )}
        </div>

        {showQueueSize && queueSize > 0 && (
          <div className="queue-info">
            <span className="queue-count">{queueSize}</span>
            {isOnline && (
              <button 
                onClick={handleSyncClick}
                className="sync-button"
                title="Sync now"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                  <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .offline-indicator {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .indicator-content {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }

        .indicator-content.online {
          background: rgba(34, 197, 94, 0.9);
          color: white;
        }

        .indicator-content.offline {
          background: rgba(239, 68, 68, 0.9);
          color: white;
        }

        .status-icon {
          display: flex;
          align-items: center;
        }

        .status-text {
          white-space: nowrap;
        }

        .queue-info {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-left: 4px;
          padding-left: 8px;
          border-left: 1px solid rgba(255, 255, 255, 0.3);
        }

        .queue-count {
          background: rgba(255, 255, 255, 0.2);
          padding: 2px 6px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .sync-button {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          padding: 2px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          transition: background-color 0.2s ease;
        }

        .sync-button:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .sync-button:active {
          transform: scale(0.95);
        }

        @media (max-width: 768px) {
          .offline-indicator {
            top: 10px;
            right: 10px;
          }

          .indicator-content {
            padding: 6px 10px;
            font-size: 13px;
          }

          .status-text {
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
      `}</style>
    </div>
  );
};

export { OfflineIndicator as EnhancedOfflineIndicator };
export default OfflineIndicator;