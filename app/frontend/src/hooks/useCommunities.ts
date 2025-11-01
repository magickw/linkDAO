import { useQuery } from '@tanstack/react-query';
import { CommunityService } from '@/services/communityService';

export const useCommunities = () => {
  return useQuery({ queryKey: ['communities'], queryFn: () => CommunityService.getAllCommunities() });
};
