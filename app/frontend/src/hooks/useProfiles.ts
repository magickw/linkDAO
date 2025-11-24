import { useQuery } from '@tanstack/react-query';
import { ProfileService } from '../services/profileService';
import { UserProfile } from '../models/UserProfile';

/**
 * Custom hook to fetch multiple profiles by wallet addresses using React Query
 * @param addresses - Array of wallet addresses to fetch profiles for
 * @returns Object containing profiles data, loading state, and error
 */
export const useProfiles = (addresses: string[] | undefined) => {
  return useQuery<UserProfile[], Error>({
    queryKey: ['profiles', addresses],
    queryFn: async () => {
      console.log('[useProfiles] Fetching profiles for addresses:', addresses);

      if (!addresses || addresses.length === 0) {
        console.log('[useProfiles] No addresses provided, returning empty array');
        return [];
      }

      // Fetch profiles for all addresses concurrently
      const profilePromises = addresses.map(address => {
        console.log('[useProfiles] Fetching profile for:', address);
        return ProfileService.getProfileByAddress(address)
          .then(profile => {
            console.log('[useProfiles] Profile result for', address, ':', profile);
            return profile;
          })
          .catch(error => {
            console.error('[useProfiles] Error fetching profile for', address, ':', error);
            return null;
          });
      });

      const profiles = await Promise.all(profilePromises);
      console.log('[useProfiles] All profiles fetched:', profiles);

      // Filter out null values (profiles that weren't found)
      const validProfiles = profiles.filter((profile): profile is UserProfile => profile !== null);
      console.log('[useProfiles] Valid profiles after filtering:', validProfiles);

      return validProfiles;
    },
    enabled: !!addresses && addresses.length > 0,
    staleTime: 5 * 60 * 1000, // Data is considered fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Data stays in cache for 10 minutes
    retry: 3, // Retry failed queries 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 30000), // Exponential backoff
  });
};