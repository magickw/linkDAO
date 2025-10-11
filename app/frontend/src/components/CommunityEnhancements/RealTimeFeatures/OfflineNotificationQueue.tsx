/**
 * Offline Notification Queue Component
 * Displays offline notification queue and sync status
 * Requirements: 8.7, 10.7
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CloudOff, 
  Cloud, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  Wifi,
  WifiOff,
  Trash2,
  Settings,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { useOfflineSync, useOfflineActions } from '../../../hooks/useOfflineSync';
import { useToast } from '@/context/ToastContext';
import { OfflineAction, ConflictResolutionStrategy } from '../../../services/offlineSyncService';

interface OfflineNotificationQueueProps {
  showDetails?: boolean;
  showActions?: boolean;
  showConflicts?: boolean;
  position?: 'top' | 'bottom' | 'inline';
  onActionClick?: (action: OfflineAction) => void;
  className?: string;
}

/**
 * Main Offline Notification Queue Component
 */
export const OfflineNotificationQueue: React.FC<OfflineNotificationQueueProps> = ({
  showDetails = true,
  showActions = true,
  showConflicts = true,
  position = 'inline',
  onActionClick,
  className = ''
}) => {
  const {
    queueStatus,
    isOnline,
    isSyncing,
    hasQueuedItems,
    syncNow,
    clearQueue,
    failedActions,
    conflictedActions,
    resolveConflict
  } = useOfflineSync();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState<OfflineAction | null>(null);

  // Handle sync now
  const handleSyncNow = useCallback(async () => {
    try {
      await syncNow();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  }, [syncNow]);

  // Handle clear queue
  const handleClearQueue = useCallback(() => {
    if (window.confirm('Are you sure you want to clear the offline queue? This will remove all pending actions.')) {
      clearQueue();
    }
  }, [clearQueue]);

  // Handle conflict resolution
  const handleResolveConflict = useCallback((
    action: OfflineAction, 
    strategy: ConflictResolutionStrategy,
    customData?: any
  ) => {
    const success = resolveConflict(action.id, strategy, customData);
    if (success) {
      setShowConflictModal(null);
    }
  }, [resolveConflict]);

  // Get status color
  const getStatusColor = () => {
    if (!isOnline) return 'text-red-500 bg-red-50 border-red-200';
    if (isSyncing) return 'text-blue-500 bg-blue-50 border-blue-200';
    if (conflictedActions.length > 0) return 'text-orange-500 bg-orange-50 border-orange-200';
    if (failedActions.length > 0) return 'text-yellow-500 bg-yellow-50 border-yellow-200';
    if (hasQueuedItems) return 'text-purple-500 bg-purple-50 border-purple-200';
    return 'text-green-500 bg-green-50 border-green-200';
  };

  // Get status icon
  const getStatusIcon = () => {
    if (!isOnline) return WifiOff;
    if (isSyncing) return RefreshCw;
    if (conflictedActions.length > 0) return AlertTriangle;
    if (failedActions.length > 0) return XCircle;
    if (hasQueuedItems) return Clock;
    return CheckCircle;
  };

  // Get status text
  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isSyncing) return 'Syncing...';
    if (conflictedActions.length > 0) return `${conflictedActions.length} conflicts`;
    if (failedActions.length > 0) return `${failedActions.length} failed`;
    if (hasQueuedItems) return `${getTotalQueuedItems()} queued`;
    return 'All synced';
  };

  // Get total queued items
  const getTotalQueuedItems = () => {
    return queueStatus.notifications + 
           queueStatus.updates + 
           queueStatus.actions.pending + 
           queueStatus.actions.failed + 
           queueStatus.actions.conflicts;
  };

  const StatusIcon = getStatusIcon();
  const statusColorClasses = getStatusColor();

  if (!hasQueuedItems && isOnline && !showDetails) {
    return null;
  }

  const positionClasses = {
    top: 'fixed top-4 right-4 z-50',
    bottom: 'fixed bottom-4 right-4 z-50',
    inline: ''
  };

  return (
    <div className={`${positionClasses[position]} ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden min-w-80">
        {/* Header */}
        <div className={`flex items-center justify-between p-3 border ${statusColorClasses}`}>
          <div className="flex items-center space-x-3">
            <StatusIcon 
              size={20} 
              className={isSyncing ? 'animate-spin' : ''}
            />
            <div>
              <div className="font-medium text-sm">
                Offline Queue
              </div>
              <div className="text-xs opacity-75">
                {getStatusText()}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {hasQueuedItems && (
              <span className="bg-white bg-opacity-50 text-xs px-2 py-1 rounded-full font-medium">
                {getTotalQueuedItems()}
              </span>
            )}
            
            {showDetails && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-white bg-white bg-opacity-20 hover:bg-opacity-30 rounded p-1 transition-colors"
              >
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        {hasQueuedItems && (
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSyncNow}
                disabled={!isOnline || isSyncing}
                className="flex items-center space-x-1 text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                <span>Sync Now</span>
              </button>
              
              <button
                onClick={handleClearQueue}
                className="flex items-center space-x-1 text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors"
              >
                <Trash2 size={12} />
                <span>Clear</span>
              </button>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              Last sync: {queueStatus.lastSync.toLocaleTimeString()}
            </div>
          </div>
        )}

        {/* Expanded Details */}
        <AnimatePresence>
          {isExpanded && showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-200 dark:border-gray-700"
            >
              <QueueDetails
                queueStatus={queueStatus}
                failedActions={failedActions}
                conflictedActions={conflictedActions}
                showActions={showActions}
                showConflicts={showConflicts}
                onActionClick={onActionClick}
                onConflictClick={setShowConflictModal}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Conflict Resolution Modal */}
      <AnimatePresence>
        {showConflictModal && (
          <ConflictResolutionModal
            action={showConflictModal}
            onResolve={handleResolveConflict}
            onClose={() => setShowConflictModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Queue Details Component
 */
const QueueDetails: React.FC<{
  queueStatus: any;
  failedActions: OfflineAction[];
  conflictedActions: OfflineAction[];
  showActions: boolean;
  showConflicts: boolean;
  onActionClick?: (action: OfflineAction) => void;
  onConflictClick: (action: OfflineAction) => void;
}> = ({
  queueStatus,
  failedActions,
  conflictedActions,
  showActions,
  showConflicts,
  onActionClick,
  onConflictClick
}) => {
  return (
    <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
      {/* Queue Statistics */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Notifications:</span>
            <span className="font-medium">{queueStatus.notifications}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Updates:</span>
            <span className="font-medium">{queueStatus.updates}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Pending:</span>
            <span className="font-medium">{queueStatus.actions.pending}</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Synced:</span>
            <span className="font-medium text-green-600">{queueStatus.actions.synced}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Failed:</span>
            <span className="font-medium text-red-600">{queueStatus.actions.failed}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Conflicts:</span>
            <span className="font-medium text-orange-600">{queueStatus.actions.conflicts}</span>
          </div>
        </div>
      </div>

      {/* Failed Actions */}
      {showActions && failedActions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center space-x-2">
            <XCircle size={16} className="text-red-500" />
            <span>Failed Actions</span>
          </h4>
          <div className="space-y-2">
            {failedActions.slice(0, 5).map((action) => (
              <ActionItem
                key={action.id}
                action={action}
                onClick={onActionClick}
                statusColor="text-red-500 bg-red-50 border-red-200"
              />
            ))}
            {failedActions.length > 5 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                +{failedActions.length - 5} more failed actions
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conflicted Actions */}
      {showConflicts && conflictedActions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center space-x-2">
            <AlertTriangle size={16} className="text-orange-500" />
            <span>Conflicts</span>
          </h4>
          <div className="space-y-2">
            {conflictedActions.map((action) => (
              <ActionItem
                key={action.id}
                action={action}
                onClick={() => onConflictClick(action)}
                statusColor="text-orange-500 bg-orange-50 border-orange-200"
                showResolveButton
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Action Item Component
 */
const ActionItem: React.FC<{
  action: OfflineAction;
  onClick?: (action: OfflineAction) => void;
  statusColor: string;
  showResolveButton?: boolean;
}> = ({ action, onClick, statusColor, showResolveButton }) => {
  const getActionDescription = (action: OfflineAction) => {
    switch (action.type) {
      case 'vote':
        return `Vote ${action.data.vote} on proposal`;
      case 'tip':
        return `Tip ${action.data.amount} ${action.data.token}`;
      case 'comment':
        return `Comment: "${action.data.content.slice(0, 30)}..."`;
      case 'reaction':
        return `React with ${action.data.emoji}`;
      case 'follow':
        return `${action.data.follow ? 'Follow' : 'Unfollow'} user`;
      case 'join_community':
        return `${action.data.join ? 'Join' : 'Leave'} community`;
      case 'create_post':
        return `Create post: "${action.data.title?.slice(0, 30)}..."`;
      default:
        return `${action.type} action`;
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${statusColor} cursor-pointer hover:opacity-80 transition-opacity`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">
            {getActionDescription(action)}
          </div>
          <div className="text-xs opacity-75 mt-1">
            {action.timestamp.toLocaleString()}
            {action.retryCount > 0 && ` • ${action.retryCount} retries`}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-3">
          <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50 capitalize">
            {action.priority}
          </span>
          
          {showResolveButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onClick) onClick(action);
              }}
              className="text-xs bg-white bg-opacity-50 hover:bg-opacity-75 px-2 py-1 rounded transition-colors"
            >
              Resolve
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Conflict Resolution Modal
 */
const ConflictResolutionModal: React.FC<{
  action: OfflineAction;
  onResolve: (action: OfflineAction, strategy: ConflictResolutionStrategy, customData?: any) => void;
  onClose: () => void;
}> = ({ action, onResolve, onClose }) => {
  const [selectedStrategy, setSelectedStrategy] = useState<ConflictResolutionStrategy>('server_wins');
  const [customData, setCustomData] = useState('');

  const handleResolve = () => {
    let resolveData;
    if (selectedStrategy === 'manual' && customData) {
      try {
        resolveData = JSON.parse(customData);
      } catch (error) {
        const { addToast } = useToast();
        addToast('Invalid JSON in custom data', 'error');
        return;
      }
    }
    
    onResolve(action, selectedStrategy, resolveData);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Resolve Conflict
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XCircle size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Action Details
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded">
              <div>Type: {action.type}</div>
              <div>Time: {action.timestamp.toLocaleString()}</div>
              <div>Retries: {action.retryCount}</div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Conflict Data
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded max-h-32 overflow-y-auto">
              <pre>{JSON.stringify(action.conflictData, null, 2)}</pre>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Resolution Strategy
            </div>
            <div className="space-y-2">
              {[
                { value: 'server_wins', label: 'Use Server Data', description: 'Discard local changes' },
                { value: 'client_wins', label: 'Use Local Data', description: 'Force local changes' },
                { value: 'merge', label: 'Merge Data', description: 'Combine both versions' },
                { value: 'manual', label: 'Manual Resolution', description: 'Provide custom data' }
              ].map((strategy) => (
                <label key={strategy.value} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="strategy"
                    value={strategy.value}
                    checked={selectedStrategy === strategy.value}
                    onChange={(e) => setSelectedStrategy(e.target.value as ConflictResolutionStrategy)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {strategy.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {strategy.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {selectedStrategy === 'manual' && (
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Custom Data (JSON)
              </div>
              <textarea
                value={customData}
                onChange={(e) => setCustomData(e.target.value)}
                placeholder='{"key": "value"}'
                className="w-full h-24 text-sm border border-gray-200 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleResolve}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Resolve
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default OfflineNotificationQueue;