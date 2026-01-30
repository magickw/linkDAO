/**
 * Offline Status Indicator Component
 * Shows offline mode status, pending message count, and manual sync trigger
 */

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { syncStatusService, QueueHealth } from '@/services/syncStatusService';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAccount } from 'wagmi';

interface OfflineStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const OfflineStatusIndicator: React.FC<OfflineStatusIndicatorProps> = ({
  className = '',
  showDetails = false
}) => {
  const { address } = useAccount();
  const { isConnected, connectionState } = useWebSocket({
    walletAddress: address || '',
    autoConnect: true
  });
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueHealth, setQueueHealth] = useState<QueueHealth | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial status
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update queue health periodically
  useEffect(() => {
    if (!address) return;
    
    const updateHealth = async () => {
      try {
        const health = await syncStatusService.getQueueHealth();
        setQueueHealth(health);
        setSyncError(null);
      } catch (error) {
        console.error('Error fetching queue health:', error);
        setSyncError('Failed to fetch sync status');
      }
    };

    updateHealth();
    const interval = setInterval(updateHealth, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, [address]);

  // Subscribe to sync status changes
  useEffect(() => {
    if (!address) return;

    const unsubscribe = syncStatusService.subscribe((statuses) => {
      // Check if any conversation is syncing
      const isAnySyncing = Array.from(statuses.values()).some(
        status => status.status === 'syncing'
      );
      setIsSyncing(isAnySyncing);
    });

    return unsubscribe;
  }, [address]);

  // Manual sync trigger
  const handleManualSync = async () => {
    if (!address) return;
    
    setIsSyncing(true);
    setSyncError(null);
    
    try {
      await syncStatusService.retryFailedSyncs();
      
      // Trigger a refresh of conversations/messages
      window.dispatchEvent(new CustomEvent('manual_sync_requested'));
      
      // Show success feedback
      setTimeout(() => {
        setIsSyncing(false);
      }, 2000);
    } catch (error) {
      console.error('Manual sync failed:', error);
      setSyncError('Sync failed. Please try again.');
      setIsSyncing(false);
    }
  };

  // Determine overall status
  const getStatus = () => {
    if (!isOnline) {
      return { icon: WifiOff, color: 'text-red-500', text: 'Offline' };
    }
    
    if (!isConnected || connectionState.status === 'disconnected') {
      return { icon: AlertCircle, color: 'text-orange-500', text: 'Reconnecting' };
    }
    
    if (isSyncing || (queueHealth && queueHealth.totalPending > 0)) {
      return { icon: RefreshCw, color: 'text-yellow-500', text: 'Syncing' };
    }
    
    return { icon: CheckCircle, color: 'text-green-500', text: 'Online' };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  // Calculate pending count
  const pendingCount = queueHealth?.totalPending || 0;
  const failedCount = queueHealth?.failedMessages || 0;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Status Indicator */}
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${
        !isOnline ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
        !isConnected ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' :
        isSyncing ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
        'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      }`}>
        <StatusIcon className={`w-4 h-4 ${status.color}`} />
        <span className={`text-sm font-medium ${
          !isOnline ? 'text-red-700 dark:text-red-300' :
          !isConnected ? 'text-orange-700 dark:text-orange-300' :
          isSyncing ? 'text-yellow-700 dark:text-yellow-300' :
          'text-green-700 dark:text-green-300'
        }`}>
          {status.text}
        </span>
        
        {/* Pending count badge */}
        {(pendingCount > 0 || failedCount > 0) && (
          <span className="ml-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-bold rounded-full">
            {pendingCount + failedCount}
          </span>
        )}
      </div>

      {/* Manual sync button */}
      {showDetails && (pendingCount > 0 || failedCount > 0 || !isOnline) && (
        <button
          onClick={handleManualSync}
          disabled={isSyncing || !isOnline}
          className={`p-2 rounded-lg border transition-all ${
            isSyncing || !isOnline
              ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 opacity-50 cursor-not-allowed'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20'
          }`}
          title={pendingCount > 0 ? `Sync ${pendingCount} pending messages` : 'Sync now'}
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''} ${
            syncError ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'
          }`} />
        </button>
      )}

      {/* Detailed status */}
      {showDetails && queueHealth && (
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {queueHealth.totalPending > 0 && (
            <span>{queueHealth.totalPending} pending</span>
          )}
          {queueHealth.failedMessages > 0 && (
            <span className="ml-2 text-red-600 dark:text-red-400">
              {queueHealth.failedMessages} failed
            </span>
          )}
          {queueHealth.estimatedTimeToSync > 0 && (
            <span className="ml-2">
              ~{Math.ceil(queueHealth.estimatedTimeToSync)}s remaining
            </span>
          )}
        </div>
      )}

      {/* Error message */}
      {syncError && (
        <div className="text-xs text-red-600 dark:text-red-400">
          {syncError}
        </div>
      )}
    </div>
  );
};

export default OfflineStatusIndicator;