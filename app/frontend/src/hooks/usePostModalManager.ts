/**
 * Post Modal Manager Hook
 * Handles URL state management for post modals
 * Supports both quick posts and community posts
 */

import { useRouter } from 'next/router';
import { useState, useEffect, useCallback } from 'react';
import { QuickPost } from '@/models/QuickPost';
import { useToast } from '@/context/ToastContext';

interface PostModalState {
  isOpen: boolean;
  post: QuickPost | null;
  type: 'quick_post' | 'community_post' | null;
  isLoading: boolean;
}

export function usePostModalManager() {
  const router = useRouter();
  const { addToast } = useToast();

  const [modalState, setModalState] = useState<PostModalState>({
    isOpen: false,
    post: null,
    type: null,
    isLoading: false,
  });

  // Check URL for post parameter on mount and route changes
  useEffect(() => {
    const checkUrlForPost = async () => {
      const { post, p, cp } = router.query;

      // Handle different URL patterns
      if (p && typeof p === 'string') {
        // Quick post share URL: /p/:shareId
        await openPostByShareId(p, 'quick_post');
      } else if (cp && typeof cp === 'string') {
        // Community post share URL: /cp/:shareId
        await openPostByShareId(cp, 'community_post');
      } else if (post && typeof post === 'string') {
        // Direct post parameter: /?post=shareId
        await openPostByShareId(post);
      }
    };

    checkUrlForPost();
  }, [router.query]);

  // Open post by share ID
  const openPostByShareId = useCallback(async (shareId: string, type?: 'quick_post' | 'community_post') => {
    try {
      setModalState(prev => ({ ...prev, isOpen: true, isLoading: true }));

      // Determine API endpoint based on type - using relative paths
      const endpoint = type === 'community_post'
        ? `/cp/${shareId}`
        : `/p/${shareId}`;

      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error('Post not found');
      }

      const data = await response.json();

      if (data.success && data.data) {
        const postData = {
          ...data.data.post,
          isQuickPost: type === 'quick_post',
          communityId: data.data.post.communityId || undefined,
        };

        setModalState({
          isOpen: true,
          post: postData,
          type: type || (data.data.post.communityId ? 'community_post' : 'quick_post'),
          isLoading: false,
        });

        // Update URL to canonical if not already there
        if (type === 'community_post') {
          const canonicalUrl = data.data.canonicalUrl || `/communities/${data.data.owner?.handle}/posts/${shareId}`;
          if (router.asPath !== canonicalUrl) {
            router.replace(canonicalUrl);
          }
        } else if (type === 'quick_post') {
          const canonicalUrl = data.data.canonicalUrl || `/${data.data.owner?.handle}/posts/${shareId}`;
          if (router.asPath !== canonicalUrl) {
            router.replace(canonicalUrl);
          }
        }
      } else {
        throw new Error('Failed to load post');
      }
    } catch (error) {
      console.error('Error loading post:', error);
      addToast('Failed to load post', 'error');
      closeModal();
    }
  }, [router, addToast]);

  // Open modal with post data (for in-app navigation)
  const openModal = useCallback((post: QuickPost, type: 'quick_post' | 'community_post') => {
    setModalState({
      isOpen: true,
      post,
      type,
      isLoading: false,
    });

    // Update URL without navigation
    const shareUrl = type === 'community_post' ? `/cp/${post.shareId}` : `/p/${post.shareId}`;
    router.replace(shareUrl);
  }, [router]);

  // Close modal
  const closeModal = useCallback(() => {
    setModalState({
      isOpen: false,
      post: null,
      type: null,
      isLoading: false,
    });

    // Clear post parameter from URL only if it exists
    const { pathname, query } = router;
    const hasPostParams = query.post || query.p || query.cp;

    // Only call router.replace if there are actually post parameters to clear
    // This prevents the navigation blocking loop
    if (hasPostParams) {
      const newQuery = { ...query };
      delete newQuery.post;
      delete newQuery.p;
      delete newQuery.cp;

      router.replace(
        { pathname, query: newQuery }
      );
    }
  }, [router]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      const { post, p, cp } = router.query;
      if (!post && !p && !cp) {
        closeModal();
      }
    };

    router.events.on('routeChangeComplete', handlePopState);
    return () => {
      router.events.off('routeChangeComplete', handlePopState);
    };
  }, [router.query, closeModal, router.events]);

  return {
    ...modalState,
    openModal,
    closeModal,
    openPostByShareId,
  };
}