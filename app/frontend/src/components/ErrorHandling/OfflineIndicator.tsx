/**
 * Offline Indicator Component
 * Shows offline status and queued actions to users
 */

import React, { useState } from 'react';
import { useOfflineSupport } from '../../hooks/useOfflineSupport';

export const OfflineIndicator: React.FC = () => {
  const {
    isOnline,
    queuedActions,
    syncInProgress,
    lastSyncTime,
    syncNow,
    clearQueue,
    getQueueStats
  } = useOfflineSupport();
  
  const [showDetails, setShowDetails] = useState(false);
  const stats = getQueueStats();

  if (isOnline && queuedActions.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`p-3 rounded-lg shadow-lg border ${
        isOnline 
          ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-orange-50 border-orange-200 text-orange-800'
      }`}>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-green-500' : 'bg-orange-500'
          }`} />
          <span className="font-medium">
            {isOnline ? 'Online' : 'Offline'}
          </span>
          
          {queuedActions.length > 0 && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {queuedActions.length} queued
            </span>
          )}
          
          {syncInProgress && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
              Syncing...
            </span>
          )}
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs underline hover:no-underline"
          >
            {showDetails ? 'Hide' : 'Details'}
          </button>
        </div>

        {showDetails && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="space-y-2 text-sm">
              {!isOnline && (
                <p className="text-orange-700">
                  You're offline. Actions will be saved and synced when you're back online.
                </p>
              )}
              
              {queuedActions.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Queued Actions:</p>
                  <ul className="text-xs space-y-1">
                    <li>High priority: {stats.byPriority.high}</li>
                    <li>Medium priority: {stats.byPriority.medium}</li>
                    <li>Low priority: {stats.byPriority.low}</li>
                  </ul>
                  
                  {stats.oldestAction && (
                    <p className="text-xs text-gray-600 mt-1">
                      Oldest: {stats.oldestAction.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              )}
              
              {lastSyncTime && (
                <p className="text-xs text-gray-600">
                  Last sync: {lastSyncTime.toLocaleTimeString()}
                </p>
              )}
              
              <div className="flex space-x-2 mt-2">
                {isOnline && queuedActions.length > 0 && (
                  <button
                    onClick={syncNow}
                    disabled={syncInProgress}
                    className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    {syncInProgress ? 'Syncing...' : 'Sync Now'}
                  </button>
                )}
                
                {queuedActions.length > 0 && (
                  <button
                    onClick={clearQueue}
                    className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                  >
                    Clear Queue
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const OfflineQueueViewer: React.FC = () => {
  const { queuedActions, removeAction, syncNow, isOnline } = useOfflineSupport();

  if (queuedActions.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No queued actions
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Queued Actions</h3>
        {isOnline && (
          <button
            onClick={syncNow}
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
          >
            Sync All
          </button>
        )}
      </div>
      
      {queuedActions.map((action) => (
        <div
          key={action.id}
          className="p-3 border border-gray-200 rounded-lg flex justify-between items-start"
        >
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-medium">{action.type}</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                action.priority === 'high' 
                  ? 'bg-red-100 text-red-800'
                  : action.priority === 'medium'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {action.priority}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mt-1">
              Created: {action.timestamp.toLocaleString()}
            </p>
            
            {action.retryCount > 0 && (
              <p className="text-sm text-orange-600">
                Retries: {action.retryCount}/{action.maxRetries}
              </p>
            )}
            
            <details className="mt-2">
              <summary className="text-sm cursor-pointer text-blue-600">
                View payload
              </summary>
              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(action.payload, null, 2)}
              </pre>
            </details>
          </div>
          
          <button
            onClick={() => removeAction(action.id)}
            className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
};

export const OfflineBanner: React.FC = () => {
  const { isOnline, queuedActions } = useOfflineSupport();

  if (isOnline) {
    return null;
  }

  return (
    <div className="bg-orange-100 border-b border-orange-200 px-4 py-2">
      <div className="flex items-center justify-center space-x-2 text-orange-800">
        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
        <span className="text-sm font-medium">
          You're offline. {queuedActions.length} actions queued for sync.
        </span>
      </div>
    </div>
  );
};