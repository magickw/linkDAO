/**
 * Hook for Blocked Users Management
 */

import { useEffect, useState, useCallback } from 'react';
import { blockingService, BlockedUser } from '@/services/blockingService';

interface UseBlockedUsersReturn {
  blockedUsers: BlockedUser[];
  loading: boolean;
  error: string | null;
  blockUser: (userAddress: string, reason?: string) => Promise<boolean>;
  unblockUser: (userAddress: string) => Promise<boolean>;
  isUserBlocked: (userAddress: string) => boolean;
  refresh: () => Promise<void>;
}

export function useBlockedUsers(): UseBlockedUsersReturn {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBlockedUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await blockingService.getBlockedUsers();
      setBlockedUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load blocked users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBlockedUsers();
  }, [loadBlockedUsers]);

  const handleBlockUser = useCallback(async (userAddress: string, reason?: string) => {
    try {
      const success = await blockingService.blockUser(userAddress, reason);
      if (success) {
        // Refresh list
        await loadBlockedUsers();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to block user');
      return false;
    }
  }, [loadBlockedUsers]);

  const handleUnblockUser = useCallback(async (userAddress: string) => {
    try {
      const success = await blockingService.unblockUser(userAddress);
      if (success) {
        setBlockedUsers(prev =>
          prev.filter(u => u.blockedAddress.toLowerCase() !== userAddress.toLowerCase())
        );
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unblock user');
      return false;
    }
  }, []);

  const isUserBlocked = useCallback((userAddress: string) => {
    return blockedUsers.some(
      u => u.blockedAddress.toLowerCase() === userAddress.toLowerCase()
    );
  }, [blockedUsers]);

  return {
    blockedUsers,
    loading,
    error,
    blockUser: handleBlockUser,
    unblockUser: handleUnblockUser,
    isUserBlocked,
    refresh: loadBlockedUsers,
  };
}
