import { useCallback } from 'react';
import { useNavigation } from '@/context/NavigationContext';
import { useToast } from '@/context/ToastContext';

export const usePostNavigation = () => {
  const { navigateToPost } = useNavigation();
  const { addToast } = useToast();

  const sharePost = useCallback(async (postId: string, communityId?: string) => {
    try {
      const baseUrl = window.location.origin;
      const postUrl = communityId 
        ? `${baseUrl}/dashboard/community/${communityId}?post=${postId}`
        : `${baseUrl}/dashboard/post/${postId}`;

      if (navigator.share) {
        // Use native sharing if available
        await navigator.share({
          title: 'Check out this post',
          url: postUrl,
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(postUrl);
        addToast('Post link copied to clipboard!', 'success');
      }
    } catch (error) {
      console.error('Error sharing post:', error);
      addToast('Failed to share post', 'error');
    }
  }, [addToast]);

  const openPost = useCallback((postId: string, communityId?: string) => {
    navigateToPost(postId, communityId);
  }, [navigateToPost]);

  const getPostUrl = useCallback((postId: string, communityId?: string) => {
    const baseUrl = window.location.origin;
    return communityId 
      ? `${baseUrl}/dashboard/community/${communityId}?post=${postId}`
      : `${baseUrl}/dashboard/post/${postId}`;
  }, []);

  return {
    sharePost,
    openPost,
    getPostUrl,
  };
};