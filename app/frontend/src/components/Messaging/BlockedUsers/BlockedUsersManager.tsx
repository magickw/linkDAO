/**
 * Blocked Users Manager Component
 * Display and manage list of blocked users
 */

import React, { useState } from 'react';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { Trash2, AlertCircle, Loader2 } from 'lucide-react';

interface BlockedUsersManagerProps {
  onBlockingChange?: () => void;
}

export function BlockedUsersManager({ onBlockingChange }: BlockedUsersManagerProps) {
  const { blockedUsers, loading, unblockUser } = useBlockedUsers();
  const [unblocking, setUnblocking] = useState<Set<string>>(new Set());
  const [confirmUnblock, setConfirmUnblock] = useState<string | null>(null);

  const handleUnblock = async (address: string) => {
    setUnblocking(prev => new Set(prev).add(address));
    try {
      const success = await unblockUser(address);
      if (success) {
        setConfirmUnblock(null);
        onBlockingChange?.();
      }
    } finally {
      setUnblocking(prev => {
        const next = new Set(prev);
        next.delete(address);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
      </div>
    );
  }

  if (blockedUsers.length === 0) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-gray-600 dark:text-gray-400">No blocked users</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          Users you block won't be able to message you
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {blockedUsers.map(blockedUser => (
        <div
          key={blockedUser.blockedAddress}
          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
        >
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 dark:text-white truncate">
              {blockedUser.blockedAddress}
            </div>
            {blockedUser.reason && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Reason: {blockedUser.reason}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Blocked on {new Date(blockedUser.createdAt).toLocaleDateString()}
            </p>
          </div>

          {confirmUnblock === blockedUser.blockedAddress ? (
            <div className="flex gap-2 ml-4">
              <button
                onClick={() =>
                  handleUnblock(blockedUser.blockedAddress)
                }
                disabled={unblocking.has(blockedUser.blockedAddress)}
                className="px-3 py-1 text-sm text-white bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
              >
                {unblocking.has(blockedUser.blockedAddress) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Confirm'
                )}
              </button>
              <button
                onClick={() => setConfirmUnblock(null)}
                className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmUnblock(blockedUser.blockedAddress)}
              className="ml-4 p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              title="Unblock user"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
