import { useState, useEffect, useCallback } from 'react';
import { ProfileService } from '../services/profileService';
import { UserProfile, CreateUserProfileInput, UpdateUserProfileInput } from '../../../backend/src/models/UserProfile';

/**
 * Custom hook to fetch a profile by wallet address
 * @param address - Wallet address to fetch profile for
 * @returns Object containing profile data, loading state, and error
 */
export const useProfile = (address: string | undefined) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setProfile(null);
      return;
    }

    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedProfile = await ProfileService.getProfileByAddress(address);
        setProfile(fetchedProfile);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [address]);

  return { profile, isLoading, error };
};

/**
 * Custom hook to create a new profile
 * @returns Object containing create function, loading state, and error
 */
export const useCreateProfile = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const createProfile = useCallback(async (data: CreateUserProfileInput) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const profile = await ProfileService.createProfile(data);
      setSuccess(true);
      return profile;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { createProfile, isLoading, error, success };
};

/**
 * Custom hook to update an existing profile
 * @returns Object containing update function, loading state, and error
 */
export const useUpdateProfile = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const updateProfile = useCallback(async (id: string, data: UpdateUserProfileInput) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const profile = await ProfileService.updateProfile(id, data);
      setSuccess(true);
      return profile;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { updateProfile, isLoading, error, success };
};