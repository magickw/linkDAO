import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BlockService } from '../services/blockService';

/**
 * Hook for blocking/unblocking users
 */
export function useBlock() {
  const queryClient = useQueryClient();

  const blockMutation = useMutation<
    boolean,
    Error,
    { blocker: string, blocked: string },
    { previousBlockStatus: boolean | undefined }
  >({
    mutationFn: ({ blocker, blocked }) => BlockService.block(blocker, blocked),
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['blockStatus', variables.blocker, variables.blocked] });

      // Snapshot previous value
      const previousBlockStatus = queryClient.getQueryData<boolean>(['blockStatus', variables.blocker, variables.blocked]);

      // Optimistically update to the new value
      queryClient.setQueryData(['blockStatus', variables.blocker, variables.blocked], true);

      // Return context with previous value
      return { previousBlockStatus };
    },
    onError: (err, variables, context) => {
      // Rollback to previous value on error
      if (context?.previousBlockStatus !== undefined) {
        queryClient.setQueryData(['blockStatus', variables.blocker, variables.blocked], context.previousBlockStatus);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['blockedUsers', variables.blocker] });
      queryClient.invalidateQueries({ queryKey: ['blockedBy', variables.blocked] });
      // Also invalidate blockStatus to ensure it's in sync with the server
      queryClient.invalidateQueries({ queryKey: ['blockStatus', variables.blocker, variables.blocked] });
    },
  });

  const unblockMutation = useMutation<
    boolean,
    Error,
    { blocker: string, blocked: string },
    { previousBlockStatus: boolean | undefined }
  >({
    mutationFn: ({ blocker, blocked }) => BlockService.unblock(blocker, blocked),
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['blockStatus', variables.blocker, variables.blocked] });

      // Snapshot previous value
      const previousBlockStatus = queryClient.getQueryData<boolean>(['blockStatus', variables.blocker, variables.blocked]);

      // Optimistically update to the new value
      queryClient.setQueryData(['blockStatus', variables.blocker, variables.blocked], false);

      // Return context with previous value
      return { previousBlockStatus };
    },
    onError: (err, variables, context) => {
      // Rollback to previous value on error
      if (context?.previousBlockStatus !== undefined) {
        queryClient.setQueryData(['blockStatus', variables.blocker, variables.blocked], context.previousBlockStatus);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['blockedUsers', variables.blocker] });
      queryClient.invalidateQueries({ queryKey: ['blockedBy', variables.blocked] });
      // Also invalidate blockStatus to ensure it's in sync with the server
      queryClient.invalidateQueries({ queryKey: ['blockStatus', variables.blocker, variables.blocked] });
    },
  });

  return {
    block: blockMutation.mutateAsync,
    unblock: unblockMutation.mutateAsync,
    isLoading: blockMutation.isPending || unblockMutation.isPending,
  };
}

/**
 * Hook for checking block status between two users
 */
export function useBlockStatus(blocker: string, blocked: string) {
  return useQuery({
    queryKey: ['blockStatus', blocker, blocked],
    queryFn: () => BlockService.isBlocked(blocker, blocked),
    enabled: !!blocker && !!blocked,
    staleTime: 0, // Always refetch when invalidated for immediate UI updates
  });
}

/**
 * Hook for getting blocked users list
 */
export function useBlockedUsers(address: string) {
  return useQuery({
    queryKey: ['blockedUsers', address],
    queryFn: () => BlockService.getBlockedUsers(address),
    enabled: !!address,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook for getting users who have blocked an address
 */
export function useBlockedBy(address: string) {
  return useQuery({
    queryKey: ['blockedBy', address],
    queryFn: () => BlockService.getBlockedBy(address),
    enabled: !!address,
    staleTime: 60000, // 1 minute
  });
}
