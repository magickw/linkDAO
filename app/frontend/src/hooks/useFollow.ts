import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FollowService } from '../services/followService';

/**
 * Custom hook to follow/unfollow users using React Query Mutations
 * @returns Object containing follow/unfollow functions, loading state, and error
 */
export const useFollow = () => {
  const queryClient = useQueryClient();

  const followMutation = useMutation<
    boolean,
    Error,
    { follower: string, following: string },
    { previousFollowStatus: boolean | undefined }
  >({
    mutationFn: ({ follower, following }) => FollowService.follow(follower, following),
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['followStatus', variables.follower, variables.following] });

      // Snapshot previous value
      const previousFollowStatus = queryClient.getQueryData<boolean>(['followStatus', variables.follower, variables.following]);

      // Optimistically update to the new value
      queryClient.setQueryData(['followStatus', variables.follower, variables.following], true);

      // Return context with previous value
      return { previousFollowStatus };
    },
    onError: (err, variables, context) => {
      // Rollback to previous value on error
      if (context?.previousFollowStatus !== undefined) {
        queryClient.setQueryData(['followStatus', variables.follower, variables.following], context.previousFollowStatus);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate follow counts for both users
      queryClient.invalidateQueries({ queryKey: ['followCount', variables.follower] });
      queryClient.invalidateQueries({ queryKey: ['followCount', variables.following] });
      queryClient.invalidateQueries({ queryKey: ['followers', variables.following] });
      queryClient.invalidateQueries({ queryKey: ['following', variables.follower] });
    },
    onSettled: (_, __, variables) => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({ queryKey: ['followStatus', variables.follower, variables.following] });
    },
  });

  const unfollowMutation = useMutation<
    boolean,
    Error,
    { follower: string, following: string },
    { previousFollowStatus: boolean | undefined }
  >({
    mutationFn: ({ follower, following }) => FollowService.unfollow(follower, following),
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['followStatus', variables.follower, variables.following] });

      // Snapshot previous value
      const previousFollowStatus = queryClient.getQueryData<boolean>(['followStatus', variables.follower, variables.following]);

      // Optimistically update to the new value
      queryClient.setQueryData(['followStatus', variables.follower, variables.following], false);

      // Return context with previous value
      return { previousFollowStatus };
    },
    onError: (err, variables, context) => {
      // Rollback to previous value on error
      if (context?.previousFollowStatus !== undefined) {
        queryClient.setQueryData(['followStatus', variables.follower, variables.following], context.previousFollowStatus);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate follow counts for both users
      queryClient.invalidateQueries({ queryKey: ['followCount', variables.follower] });
      queryClient.invalidateQueries({ queryKey: ['followCount', variables.following] });
      queryClient.invalidateQueries({ queryKey: ['followers', variables.following] });
      queryClient.invalidateQueries({ queryKey: ['following', variables.follower] });
    },
    onSettled: (_, __, variables) => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({ queryKey: ['followStatus', variables.follower, variables.following] });
    },
  });

  return {
    follow: followMutation.mutateAsync,
    unfollow: unfollowMutation.mutateAsync,
    isLoading: followMutation.isPending || unfollowMutation.isPending,
    error: followMutation.error || unfollowMutation.error,
    success: followMutation.isSuccess || unfollowMutation.isSuccess,
  };
};

/**
 * Custom hook to check if one user is following another using React Query
 * @param follower - Address of the follower
 * @param following - Address of the user being followed
 * @returns Object containing follow status, loading state, and error
 */
export const useFollowStatus = (follower: string | undefined, following: string | undefined) => {
  return useQuery<boolean, Error>({
    queryKey: ['followStatus', follower, following],
    queryFn: async () => {
      if (!follower || !following) return false;
      return FollowService.isFollowing(follower, following);
    },
    enabled: !!follower && !!following,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 30000),
  });
};

/**
 * Custom hook to get followers of a user using React Query
 * @param address - Address of the user
 * @returns Object containing followers data, loading state, and error
 */
export const useFollowers = (address: string | undefined) => {
  return useQuery<string[], Error>({
    queryKey: ['followers', address],
    queryFn: async () => {
      if (!address) return [];
      return FollowService.getFollowers(address);
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 30000),
  });
};

/**
 * Custom hook to get users that a user is following using React Query
 * @param address - Address of the user
 * @returns Object containing following data, loading state, and error
 */
export const useFollowing = (address: string | undefined) => {
  return useQuery<string[], Error>({
    queryKey: ['following', address],
    queryFn: async () => {
      if (!address) return [];
      return FollowService.getFollowing(address);
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 30000),
  });
};

/**
 * Custom hook to get follow counts for a user using React Query
 * @param address - Address of the user
 * @returns Object containing follow counts, loading state, and error
 */
export const useFollowCount = (address: string | undefined) => {
  return useQuery<{ followers: number, following: number }, Error>({
    queryKey: ['followCount', address],
    queryFn: async () => {
      if (!address) return { followers: 0, following: 0 };
      return FollowService.getFollowCount(address);
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 30000),
  });
};