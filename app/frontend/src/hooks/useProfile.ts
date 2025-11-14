import { useState, useEffect, useCallback } from 'react';
import { UserProfile, UpdateUserProfileInput } from '@/models/UserProfile';
import { ProfileService } from '@/services/profileService';

interface UseProfileReturn {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateProfile: (data: UpdateUserProfileInput) => Promise<void>;
}

export function useProfile(walletAddress?: string): UseProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!walletAddress) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const userProfile = await ProfileService.getProfileByAddress(walletAddress);
      setProfile(userProfile);
    } catch (err) {
      // Handle error objects properly to avoid [object Object] display
      let errorMessage = 'Failed to fetch profile';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        // Try to extract a meaningful message from the error object
        if ('message' in err && typeof (err as any).message === 'string') {
          errorMessage = (err as any).message;
        } else if ('error' in err && typeof (err as any).error === 'string') {
          errorMessage = (err as any).error;
        } else {
          errorMessage = JSON.stringify(err);
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      setError(errorMessage);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  const updateProfile = useCallback(async (data: UpdateUserProfileInput) => {
    if (!profile) {
      throw new Error('No profile to update');
    }

    try {
      setError(null);
      const updatedProfile = await ProfileService.updateProfile(profile.id, data);
      setProfile(updatedProfile);
    } catch (err) {
      // Handle error objects properly to avoid [object Object] display
      let errorMessage = 'Failed to update profile';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        // Try to extract a meaningful message from the error object
        if ('message' in err && typeof (err as any).message === 'string') {
          errorMessage = (err as any).message;
        } else if ('error' in err && typeof (err as any).error === 'string') {
          errorMessage = (err as any).error;
        } else {
          errorMessage = JSON.stringify(err);
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      setError(errorMessage);
      throw err;
    }
  }, [profile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    error,
    refetch: fetchProfile,
    updateProfile
  };
}