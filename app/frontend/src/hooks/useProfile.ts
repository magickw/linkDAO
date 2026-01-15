import { useState, useEffect, useCallback } from 'react';
import { UserProfile, CreateUserProfileInput, UpdateUserProfileInput } from '@/models/UserProfile';
import { ProfileService } from '@/services/profileService';
import { optimizedProfileService } from '@/services/optimizedProfileService';

interface UseProfileReturn {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createProfile: (data: CreateUserProfileInput) => Promise<UserProfile>;
  updateProfile: (data: UpdateUserProfileInput) => Promise<void>;
  saveProfile: (data: UpdateUserProfileInput, walletAddress: string) => Promise<void>;
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

      // Use optimized profile service with caching and deduplication
      const userProfile = await optimizedProfileService.getProfileByAddress(walletAddress);
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
        } else if ('error' in err && typeof (err as any).error === 'object' && (err as any).error?.message) {
          errorMessage = (err as any).error.message;
        } else {
          // Better stringify the error object to show meaningful information
          try {
            errorMessage = JSON.stringify(err, null, 2);
          } catch (stringifyError) {
            errorMessage = 'Failed to update profile due to an unknown error';
          }
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      setError(errorMessage);
      throw new Error(errorMessage); // Throw the formatted error message
    }
  }, [profile]);

  const createProfile = useCallback(async (data: CreateUserProfileInput): Promise<UserProfile> => {
    try {
      setError(null);
      const newProfile = await ProfileService.createProfile(data);
      setProfile(newProfile);
      return newProfile;
    } catch (err) {
      let errorMessage = 'Failed to create profile';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        if ('message' in err && typeof (err as any).message === 'string') {
          errorMessage = (err as any).message;
        } else if ('error' in err && typeof (err as any).error === 'string') {
          errorMessage = (err as any).error;
        } else {
          try {
            errorMessage = JSON.stringify(err, null, 2);
          } catch {
            errorMessage = 'Failed to create profile due to an unknown error';
          }
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const saveProfile = useCallback(async (data: UpdateUserProfileInput, address: string): Promise<void> => {
    try {
      setError(null);
      if (profile) {
        // Profile exists, update it
        const updatedProfile = await ProfileService.updateProfile(profile.id, data);
        setProfile(updatedProfile);
      } else {
        // Profile doesn't exist, create it
        const createData: CreateUserProfileInput = {
          walletAddress: address,
          handle: data.handle || address.slice(0, 10),
          ens: data.ens,
          avatarCid: data.avatarCid,
          bannerCid: data.bannerCid,
          bioCid: data.bioCid,
          socialLinks: data.socialLinks,
          website: data.website,
          displayName: data.displayName,
        };
        const newProfile = await ProfileService.createProfile(createData);
        setProfile(newProfile);
      }
    } catch (err) {
      let errorMessage = 'Failed to save profile';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        if ('message' in err && typeof (err as any).message === 'string') {
          errorMessage = (err as any).message;
        } else if ('error' in err && typeof (err as any).error === 'string') {
          errorMessage = (err as any).error;
        } else {
          try {
            errorMessage = JSON.stringify(err, null, 2);
          } catch {
            errorMessage = 'Failed to save profile due to an unknown error';
          }
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      setError(errorMessage);
      throw new Error(errorMessage);
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
    createProfile,
    updateProfile,
    saveProfile
  };
}