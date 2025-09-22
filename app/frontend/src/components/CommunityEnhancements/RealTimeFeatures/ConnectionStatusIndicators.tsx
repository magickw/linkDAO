/**
 * Connection Status Indicators Component
 * Displays connection status and offline handling indicators
 * Requirements: 8.1, 8.5, 8.7
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  X,
  ChevronDown,
  Signal,
  Zap,
  CloudOff,
  Router
} from 'lucide-react';
import { useCommunityRealTimeUpdates } from '../../../hooks/useCommunityRealTimeUpdates';

interface ConnectionStatusIndicatorsProps {
  showDetails?: boolean;
  showOfflineQueue?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'inline';
  compact?: boolean;
  onRetryConnection?: () => void;
  className?: string;
}

/**
 * Main Connection Status Indicators Component
 */
export const ConnectionStatusIndicators: React.FC<ConnectionStatusIndicatorsProps> = ({
  showDetails = true,
  showOfflineQueue = true,
  position = 'top-right',
  compact = false,
  onRetryConnection,
  className = ''
}) => {
  const {
    connectionStatus,
    isConnected,
    isOnline,
    forceSyncOfflineUpdates,
    clearOfflineQueue
  } = useCommunityRealTimeUpdates();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showRetryPrompt, setShowRetryPrompt] = useState(false);
  const [lastConnectionTime, setLastConnectionTime] = useState<Date | null>(null);

  // Track connection changes
  useEffect(() => {
    if (isConnected && isOnline) {
      setLastConnectionTime(new Date());
      setShowRetryPrompt(false);
    } else if (!isConnected && isOnline) {
      // Show retry prompt after 10 seconds of disconnection
      const timer = setTimeout(() => {
        setShowRetryPrompt(true);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [isConnected, isOnline]);

  // Auto-collapse expanded view after 15 seconds
  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 15000);
      
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  // Handle retry connection
  const handleRetryConnection = useCallback(() => {
    if (onRetryConnection) {
      onRetryConnection();
    }
    setShowRetryPrompt(false);
  }, [onRetryConnection]);

  // Handle sync offline updates
  const handleSyncOffline = useCallback(() => {
    forceSyncOfflineUpdates();
  }, [forceSyncOfflineUpdates]);

  // Handle clear offline queue
  const handleClearOfflineQueue = useCallback(() => {
    clearOfflineQueue();
  }, [clearOfflineQueue]);

  // Get status color
  const getStatusColor = () => {
    if (!isOnline) return 'text-red-500 bg-red-50 border-red-200';
    if (!isConnected) return 'text-orange-500 bg-orange-50 border-orange-200';
    
    switch (connectionStatus.quality) {
      case 'excellent':
        return 'text-green-500 bg-green-50 border-green-200';
      case 'good':
        return 'text-blue-500 bg-blue-50 border-blue-200';
      case 'poor':
        return 'text-orange-500 bg-orange-50 border-orange-200';
      default:
        return 'text-red-500 bg-red-50 border-red-200';
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    if (!isOnline) return CloudOff;
    if (!isConnected) return WifiOff;
    
    switch (connectionStatus.quality) {
      case 'excellent':
        return Wifi;
      case 'good':
        return Signal;
      case 'poor':
        return Router;
      default:
        return WifiOff;
    }
  };

  // Get status text
  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (!isConnected) return 'Disconnected';
    return connectionStatus.quality.charAt(0).toUpperCase() + connectionStatus.quality.slice(1);
  };

  // Get position classes
  const getPositionClasses = () => {
    if (position === 'inline') return '';
    
    const positions = {
      'top-left': 'top-4 left-4',
      'top-right': 'top-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'bottom-right': 'bottom-4 right-4'
    };
    
    return `fixed ${positions[position]} z-50`;
  };

  const StatusIcon = getStatusIcon();
  const statusColorClasses = getStatusColor();

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <StatusIcon size={16} className={statusColorClasses.split(' ')[0]} />
        <span className={`text-xs ${statusColorClasses.split(' ')[0]}`}>
          {getStatusText()}
        </span>
        {connectionStatus.queuedUpdates > 0 && (
          <span className="text-xs bg-orange-500 text-white rounded-full px-1 min-w-[16px] h-4 flex items-center justify-center">
            {connectionStatus.queuedUpdates}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`${getPositionClasses()} ${className}`}>
      <AnimatePresence>
        {(!isOnline || !isConnected || connectionStatus.queuedUpdates > 0 || showDetails) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: position.includes('bottom') ? 20 : -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: position.includes('bottom') ? 20 : -20 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden min-w-64"
          >
            {/* Main status bar */}
            <div className={`flex items-center justify-between p-3 border ${statusColorClasses}`}>
              <div className="flex items-center space-x-3">
                <StatusIcon size={20} />
                <div>
                  <div className="font-medium text-sm">
                    {getStatusText()}
                  </div>
                  {lastConnectionTime && isConnected && (
                    <div className="text-xs opacity-75">
                      Connected at {lastConnectionTime.toLocaleTimeString()}
                    </div>
                  )}
                  {!isConnected && connectionStatus.reconnectAttempts > 0 && (
                    <div className="text-xs opacity-75">
                      Reconnecting... (attempt {connectionStatus.reconnectAttempts})
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {connectionStatus.queuedUpdates > 0 && (
                  <span className="bg-orange-500 text-white rounded-full px-2 py-1 text-xs font-medium">
                    {connectionStatus.queuedUpdates}
                  </span>
                )}
                
                {showDetails && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <ChevronDown 
                      size={16} 
                      className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                )}
              </div>
            </div>

            {/* Offline queue indicator */}
            {showOfflineQueue && connectionStatus.queuedUpdates > 0 && (
              <div className="px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border-t border-orange-200 dark:border-orange-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm text-orange-700 dark:text-orange-300">
                    <Clock size={14} />
                    <span>{connectionStatus.queuedUpdates} updates queued</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSyncOffline}
                      className="text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600 transition-colors"
                      disabled={!isOnline}
                    >
                      Sync
                    </button>
                    <button
                      onClick={handleClearOfflineQueue}
                      className="text-xs text-orange-600 hover:text-orange-800 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Retry prompt */}
            <AnimatePresence>
              {showRetryPrompt && !isConnected && isOnline && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-800"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-yellow-700 dark:text-yellow-300">
                      <AlertCircle size={14} />
                      <span>Connection lost. Retry?</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleRetryConnection}
                        className="text-xs bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 transition-colors"
                      >
                        Retry
                      </button>
                      <button
                        onClick={() => setShowRetryPrompt(false)}
                        className="text-yellow-600 hover:text-yellow-800 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Expanded details */}
            <AnimatePresence>
              {isExpanded && showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900"
                >
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Connection Details
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Network:</span>
                          <span className={isOnline ? 'text-green-500' : 'text-red-500'}>
                            {isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">WebSocket:</span>
                          <span className={isConnected ? 'text-green-500' : 'text-red-500'}>
                            {isConnected ? 'Connected' : 'Disconnected'}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Quality:</span>
                          <span className={`capitalize ${
                            connectionStatus.quality === 'excellent' ? 'text-green-500' :
                            connectionStatus.quality === 'good' ? 'text-blue-500' :
                            connectionStatus.quality === 'poor' ? 'text-orange-500' :
                            'text-red-500'
                          }`}>
                            {connectionStatus.quality}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {connectionStatus.reconnectAttempts > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Retries:</span>
                            <span className="text-orange-500">{connectionStatus.reconnectAttempts}</span>
                          </div>
                        )}
                        
                        {connectionStatus.queuedUpdates > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Queued:</span>
                            <span className="text-orange-500">{connectionStatus.queuedUpdates}</span>
                          </div>
                        )}
                        
                        {connectionStatus.lastHeartbeat && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Heartbeat:</span>
                            <span className="text-gray-500">
                              {new Date(connectionStatus.lastHeartbeat).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-2">
                        {!isConnected && isOnline && (
                          <button
                            onClick={handleRetryConnection}
                            className="flex items-center space-x-1 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                          >
                            <RefreshCw size={12} />
                            <span>Retry</span>
                          </button>
                        )}
                        
                        {connectionStatus.queuedUpdates > 0 && (
                          <button
                            onClick={handleSyncOffline}
                            className="flex items-center space-x-1 text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600 transition-colors"
                            disabled={!isOnline}
                          >
                            <Zap size={12} />
                            <span>Sync</span>
                          </button>
                        )}
                      </div>
                      
                      <button
                        onClick={() => setIsExpanded(false)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
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
 * Simple Connection Status Badge
 */
export const ConnectionStatusBadge: React.FC<{
  showText?: boolean;
  className?: string;
}> = ({ showText = true, className = '' }) => {
  const { connectionStatus, isConnected, isOnline } = useCommunityRealTimeUpdates();

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
    return 'Connected';
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      {showText && (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {getStatusText()}
        </span>
      )}
      {connectionStatus.queuedUpdates > 0 && (
        <span className="text-xs bg-orange-500 text-white rounded-full px-1 min-w-[16px] h-4 flex items-center justify-center">
          {connectionStatus.queuedUpdates}
        </span>
      )}
    </div>
  );
};

/**
 * Connection Quality Indicator
 */
export const ConnectionQualityIndicator: React.FC<{
  showBars?: boolean;
  className?: string;
}> = ({ showBars = true, className = '' }) => {
  const { connectionStatus, isConnected, isOnline } = useCommunityRealTimeUpdates();

  const getQualityLevel = () => {
    if (!isOnline || !isConnected) return 0;
    
    switch (connectionStatus.quality) {
      case 'excellent':
        return 4;
      case 'good':
        return 3;
      case 'poor':
        return 2;
      default:
        return 1;
    }
  };

  const qualityLevel = getQualityLevel();

  if (!showBars) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <Signal size={16} className={
          qualityLevel >= 3 ? 'text-green-500' :
          qualityLevel >= 2 ? 'text-orange-500' :
          'text-red-500'
        } />
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {[1, 2, 3, 4].map((bar) => (
        <div
          key={bar}
          className={`w-1 rounded-full ${
            bar <= qualityLevel 
              ? qualityLevel >= 3 ? 'bg-green-500' : qualityLevel >= 2 ? 'bg-orange-500' : 'bg-red-500'
              : 'bg-gray-300 dark:bg-gray-600'
          }`}
          style={{ height: `${bar * 3 + 2}px` }}
        />
      ))}
    </div>
  );
};

export default ConnectionStatusIndicators;