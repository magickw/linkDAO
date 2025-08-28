import { useState, useEffect, useCallback } from 'react';
import { FollowService } from '../services/followService';

/**
 * Custom hook to follow/unfollow users
 * @returns Object containing follow/unfollow functions, loading state, and error
 */
export const useFollow = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const follow = useCallback(async (follower: string, following: string) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      await FollowService.follow(follower, following);
      setSuccess(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to follow user');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unfollow = useCallback(async (follower: string, following: string) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      await FollowService.unfollow(follower, following);
      setSuccess(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unfollow user');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { follow, unfollow, isLoading, error, success };
};

/**
 * Custom hook to check if one user is following another
 * @param follower - Address of the follower
 * @param following - Address of the user being followed
 * @returns Object containing follow status, loading state, and error
 */
export const useFollowStatus = (follower: string | undefined, following: string | undefined) => {
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!follower || !following) {
      setIsFollowing(false);
      return;
    }

    const checkFollowStatus = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const status = await FollowService.isFollowing(follower, following);
        setIsFollowing(status);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check follow status');
      } finally {
        setIsLoading(false);
      }
    };

    checkFollowStatus();
  }, [follower, following]);

  return { isFollowing, isLoading, error };
};

/**
 * Custom hook to get followers of a user
 * @param address - Address of the user
 * @returns Object containing followers data, loading state, and error
 */
export const useFollowers = (address: string | undefined) => {
  const [followers, setFollowers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setFollowers([]);
      return;
    }

    const fetchFollowers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedFollowers = await FollowService.getFollowers(address);
        setFollowers(fetchedFollowers);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch followers');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFollowers();
  }, [address]);

  return { followers, isLoading, error };
};

/**
 * Custom hook to get users that a user is following
 * @param address - Address of the user
 * @returns Object containing following data, loading state, and error
 */
export const useFollowing = (address: string | undefined) => {
  const [following, setFollowing] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setFollowing([]);
      return;
    }

    const fetchFollowing = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedFollowing = await FollowService.getFollowing(address);
        setFollowing(fetchedFollowing);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch following');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFollowing();
  }, [address]);

  return { following, isLoading, error };
};

/**
 * Custom hook to get follow counts for a user
 * @param address - Address of the user
 * @returns Object containing follow counts, loading state, and error
 */
export const useFollowCount = (address: string | undefined) => {
  const [followCount, setFollowCount] = useState<{ followers: number, following: number }>({ followers: 0, following: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setFollowCount({ followers: 0, following: 0 });
      return;
    }

    const fetchFollowCount = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const count = await FollowService.getFollowCount(address);
        setFollowCount(count);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch follow count');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFollowCount();
  }, [address]);

  return { followCount, isLoading, error };
};