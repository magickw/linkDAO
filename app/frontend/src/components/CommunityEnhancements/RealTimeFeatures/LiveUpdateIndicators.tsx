/**
 * Live Update Indicators Component
 * Displays subtle notification indicators for new content availability
 * Requirements: 8.1, 8.5, 8.7
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  MessageCircle, 
  Heart, 
  FileText, 
  Users, 
  Wifi, 
  WifiOff,
  RefreshCw,
  X,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { ContentUpdateIndicator } from '../../../services/communityRealTimeUpdateService';
import { useCommunityRealTimeUpdates } from '../../../hooks/useCommunityRealTimeUpdates';

interface LiveUpdateIndicatorsProps {
  contextId?: string;
  contextType?: 'post' | 'community' | 'user';
  position?: 'top' | 'bottom' | 'floating';
  showConnectionStatus?: boolean;
  onIndicatorClick?: (indicator: ContentUpdateIndicator) => void;
  className?: string;
}

/**
 * Main Live Update Indicators Component
 */
export const LiveUpdateIndicators: React.FC<LiveUpdateIndicatorsProps> = ({
  contextId,
  contextType,
  position = 'top',
  showConnectionStatus = true,
  onIndicatorClick,
  className = ''
}) => {
  const {
    indicators,
    hasNewContent,
    connectionStatus,
    isConnected,
    isOnline,
    dismissIndicator,
    clearIndicators,
    forceSyncOfflineUpdates
  } = useCommunityRealTimeUpdates({
    contextId,
    contextType,
    enableIndicators: true
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [showConnectionDetails, setShowConnectionDetails] = useState(false);

  // Auto-collapse after 10 seconds
  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  // Handle indicator click
  const handleIndicatorClick = useCallback((indicator: ContentUpdateIndicator) => {
    if (onIndicatorClick) {
      onIndicatorClick(indicator);
    }
    dismissIndicator(indicator.id);
  }, [onIndicatorClick, dismissIndicator]);

  // Handle clear all
  const handleClearAll = useCallback(() => {
    clearIndicators(contextId);
    setIsExpanded(false);
  }, [clearIndicators, contextId]);

  // Handle sync offline updates
  const handleSyncOffline = useCallback(() => {
    forceSyncOfflineUpdates();
  }, [forceSyncOfflineUpdates]);

  // Get indicator icon
  const getIndicatorIcon = (type: string) => {
    switch (type) {
      case 'new_posts':
        return FileText;
      case 'new_comments':
        return MessageCircle;
      case 'new_reactions':
        return Heart;
      case 'live_discussion':
        return Users;
      default:
        return Bell;
    }
  };

  // Get indicator color
  const getIndicatorColor = (type: string) => {
    switch (type) {
      case 'new_posts':
        return 'text-blue-500';
      case 'new_comments':
        return 'text-green-500';
      case 'new_reactions':
        return 'text-pink-500';
      case 'live_discussion':
        return 'text-purple-500';
      default:
        return 'text-gray-500';
    }
  };

  // Get connection status color
  const getConnectionStatusColor = () => {
    if (!isOnline) return 'text-red-500';
    if (!isConnected) return 'text-orange-500';
    
    switch (connectionStatus.quality) {
      case 'excellent':
        return 'text-green-500';
      case 'good':
        return 'text-blue-500';
      case 'poor':
        return 'text-orange-500';
      default:
        return 'text-red-500';
    }
  };

  // Get connection status icon
  const getConnectionStatusIcon = () => {
    if (!isOnline || !isConnected) return WifiOff;
    return Wifi;
  };

  if (!hasNewContent && isOnline && isConnected) {
    return null;
  }

  const positionClasses = {
    top: 'top-4 left-1/2 transform -translate-x-1/2',
    bottom: 'bottom-4 left-1/2 transform -translate-x-1/2',
    floating: 'top-20 right-4'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 ${className}`}>
      <AnimatePresence>
        {(hasNewContent || !isOnline || !isConnected) && (
          <motion.div
            initial={{ opacity: 0, y: position === 'bottom' ? 20 : -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: position === 'bottom' ? 20 : -20, scale: 0.9 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Main indicator bar */}
            <div className="flex items-center space-x-2 px-4 py-2">
              {/* Connection status */}
              {showConnectionStatus && (
                <button
                  onClick={() => setShowConnectionDetails(!showConnectionDetails)}
                  className={`flex items-center space-x-1 ${getConnectionStatusColor()} hover:opacity-80 transition-opacity`}
                  title={`Connection: ${connectionStatus.quality} (${isOnline ? 'online' : 'offline'})`}
                >
                  {React.createElement(getConnectionStatusIcon(), { size: 16 })}
                  {connectionStatus.queuedUpdates > 0 && (
                    <span className="text-xs bg-orange-500 text-white rounded-full px-1 min-w-[16px] h-4 flex items-center justify-center">
                      {connectionStatus.queuedUpdates}
                    </span>
                  )}
                </button>
              )}

              {/* Indicators summary */}
              {hasNewContent && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  <Bell size={16} />
                  <span className="text-sm font-medium">
                    {indicators.length} new update{indicators.length !== 1 ? 's' : ''}
                  </span>
                  <ChevronUp 
                    size={14} 
                    className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
              )}

              {/* Offline sync button */}
              {!isOnline && connectionStatus.queuedUpdates > 0 && (
                <button
                  onClick={handleSyncOffline}
                  className="flex items-center space-x-1 text-orange-500 hover:text-orange-600 transition-colors"
                  title="Sync offline updates"
                >
                  <RefreshCw size={14} />
                  <span className="text-xs">Sync</span>
                </button>
              )}

              {/* Clear all button */}
              {hasNewContent && (
                <button
                  onClick={handleClearAll}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Clear all indicators"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Connection details */}
            <AnimatePresence>
              {showConnectionDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 bg-gray-50 dark:bg-gray-900"
                >
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className={getConnectionStatusColor()}>
                        {isOnline ? (isConnected ? connectionStatus.quality : 'disconnected') : 'offline'}
                      </span>
                    </div>
                    {connectionStatus.reconnectAttempts > 0 && (
                      <div className="flex justify-between">
                        <span>Reconnect attempts:</span>
                        <span>{connectionStatus.reconnectAttempts}</span>
                      </div>
                    )}
                    {connectionStatus.queuedUpdates > 0 && (
                      <div className="flex justify-between">
                        <span>Queued updates:</span>
                        <span>{connectionStatus.queuedUpdates}</span>
                      </div>
                    )}
                    {connectionStatus.lastHeartbeat && (
                      <div className="flex justify-between">
                        <span>Last heartbeat:</span>
                        <span>{new Date(connectionStatus.lastHeartbeat).toLocaleTimeString()}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Expanded indicators */}
            <AnimatePresence>
              {isExpanded && hasNewContent && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto"
                >
                  {indicators.map((indicator) => {
                    const IconComponent = getIndicatorIcon(indicator.type);
                    const colorClass = getIndicatorColor(indicator.type);
                    
                    return (
                      <motion.button
                        key={indicator.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        onClick={() => handleIndicatorClick(indicator)}
                        className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                      >
                        <IconComponent size={16} className={colorClass} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                            {indicator.type.replace('_', ' ')}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {indicator.count} new • {new Date(indicator.lastUpdate).toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 ${colorClass}`}>
                            {indicator.count}
                          </span>
                          <X 
                            size={12} 
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissIndicator(indicator.id);
                            }}
                          />
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Floating Connection Status Indicator
 */
export const ConnectionStatusIndicator: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  const { connectionStatus, isConnected, isOnline } = useCommunityRealTimeUpdates();
  const [showDetails, setShowDetails] = useState(false);

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (!isConnected) return 'bg-orange-500';
    
    switch (connectionStatus.quality) {
      case 'excellent':
        return 'bg-green-500';
      case 'good':
        return 'bg-blue-500';
      case 'poor':
        return 'bg-orange-500';
      default:
        return 'bg-red-500';
    }
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (!isConnected) return 'Disconnected';
    return connectionStatus.quality;
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
      >
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <span>{getStatusText()}</span>
        {connectionStatus.queuedUpdates > 0 && (
          <span className="bg-orange-500 text-white rounded-full px-1 text-xs">
            {connectionStatus.queuedUpdates}
          </span>
        )}
      </button>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 min-w-48 z-50"
          >
            <div className="text-xs space-y-2">
              <div className="font-medium text-gray-900 dark:text-gray-100">
                Connection Status
              </div>
              <div className="space-y-1 text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Network:</span>
                  <span className={isOnline ? 'text-green-500' : 'text-red-500'}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>WebSocket:</span>
                  <span className={isConnected ? 'text-green-500' : 'text-red-500'}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Quality:</span>
                  <span className={`capitalize ${
                    connectionStatus.quality === 'excellent' ? 'text-green-500' :
                    connectionStatus.quality === 'good' ? 'text-blue-500' :
                    connectionStatus.quality === 'poor' ? 'text-orange-500' :
                    'text-red-500'
                  }`}>
                    {connectionStatus.quality}
                  </span>
                </div>
                {connectionStatus.reconnectAttempts > 0 && (
                  <div className="flex justify-between">
                    <span>Reconnect attempts:</span>
                    <span>{connectionStatus.reconnectAttempts}</span>
                  </div>
                )}
                {connectionStatus.queuedUpdates > 0 && (
                  <div className="flex justify-between">
                    <span>Queued updates:</span>
                    <span className="text-orange-500">{connectionStatus.queuedUpdates}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Inline Update Notification
 */
export const InlineUpdateNotification: React.FC<{
  indicator: ContentUpdateIndicator;
  onDismiss: () => void;
  onClick?: () => void;
  className?: string;
}> = ({ indicator, onDismiss, onClick, className = '' }) => {
  const IconComponent = React.useMemo(() => {
    switch (indicator.type) {
      case 'new_posts':
        return FileText;
      case 'new_comments':
        return MessageCircle;
      case 'new_reactions':
        return Heart;
      case 'live_discussion':
        return Users;
      default:
        return Bell;
    }
  }, [indicator.type]);

  const colorClass = React.useMemo(() => {
    switch (indicator.type) {
      case 'new_posts':
        return 'text-blue-500 bg-blue-50 border-blue-200';
      case 'new_comments':
        return 'text-green-500 bg-green-50 border-green-200';
      case 'new_reactions':
        return 'text-pink-500 bg-pink-50 border-pink-200';
      case 'live_discussion':
        return 'text-purple-500 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  }, [indicator.type]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center space-x-3 p-3 rounded-lg border ${colorClass} ${className}`}
    >
      <IconComponent size={16} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium capitalize">
          {indicator.type.replace('_', ' ')}
        </div>
        <div className="text-xs opacity-75">
          {indicator.count} new update{indicator.count !== 1 ? 's' : ''} • {new Date(indicator.lastUpdate).toLocaleTimeString()}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {onClick && (
          <button
            onClick={onClick}
            className="text-xs px-2 py-1 rounded bg-white bg-opacity-50 hover:bg-opacity-75 transition-colors"
          >
            View
          </button>
        )}
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
};

export default LiveUpdateIndicators;