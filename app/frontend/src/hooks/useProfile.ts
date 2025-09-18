import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProfileService } from '../services/profileService';
import { UserProfile, CreateUserProfileInput, UpdateUserProfileInput } from '../models/UserProfile';

/**
 * Custom hook to fetch a profile by wallet address using React Query
 * @param address - Wallet address to fetch profile for
 * @returns Object containing profile data, loading state, and error
 */
export const useProfile = (address: string | undefined) => {
  return useQuery<UserProfile | null, Error>({
    queryKey: ['profile', address],
    queryFn: async () => {
      if (!address) return null;
      return ProfileService.getProfileByAddress(address);
    },
    enabled: !!address, // Only run query if address is available
    staleTime: 5 * 60 * 1000, // Data is considered fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Data stays in cache for 10 minutes
    retry: 3, // Retry failed queries 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 30000), // Exponential backoff
  });
};

/**
 * Custom hook to create a new profile using React Query Mutations
 * @returns Object containing mutate function, loading state, and error
 */
export const useCreateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation<UserProfile, Error, CreateUserProfileInput>({
    mutationFn: (data: CreateUserProfileInput) => ProfileService.createProfile(data),
    onSuccess: (newProfile) => {
      // Invalidate and refetch the profile query for the new address
      queryClient.invalidateQueries({ queryKey: ['profile', newProfile.walletAddress] });
      // Optionally, set the new profile data directly in the cache
      queryClient.setQueryData(['profile', newProfile.walletAddress], newProfile);
    },
  });
};

/**
 * Custom hook to update an existing profile using React Query Mutations
 * @returns Object containing mutate function, loading state, and error
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation<UserProfile, Error, { id: string; data: UpdateUserProfileInput }>({
    mutationFn: ({ id, data }) => ProfileService.updateProfile(id, data),
    onSuccess: (updatedProfile) => {
      // Invalidate and refetch the profile query for the updated address
      queryClient.invalidateQueries({ queryKey: ['profile', updatedProfile.walletAddress] });
      // Optionally, set the updated profile data directly in the cache
      queryClient.setQueryData(['profile', updatedProfile.walletAddress], updatedProfile);
    },
  });
};