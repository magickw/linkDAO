/**
 * Post Modal Manager Hook
 * Handles URL state management for post modals
 * Supports both quick posts and community posts
 */

import { useRouter } from 'next/router';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Status } from '@/models/Status';
import { useToast } from '@/context/ToastContext';

interface PostModalState {
  isOpen: boolean;
  post: Status | null;
  type: 'status' | 'community_post' | null;
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

  // Track whether the modal was opened by a pushState (so close should call history.back())
  const lastOpenedWithPushRef = useRef(false);
  // When we programmatically call history.back(), ignore the next popstate to avoid loops
  const ignoreNextPopstateRef = useRef(false);

  // Check URL for post parameter on mount and route changes
  useEffect(() => {
    const checkUrlForPost = async () => {
      const { post, p, cp } = router.query;

      // Handle different URL patterns
      if (p && typeof p === 'string') {
        // Quick post share URL: /p/:shareId
        await openPostByShareId(p, 'status');
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
  const openPostByShareId = useCallback(async (shareId: string, type?: 'status' | 'community_post') => {
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
          isStatus: type === 'status',
          communityId: data.data.post.communityId || undefined,
        };

        setModalState({
          isOpen: true,
          post: postData,
          type: type || (data.data.post.communityId ? 'community_post' : 'status'),
          isLoading: false,
        });

        // Update URL to canonical if not already there
        if (type === 'community_post') {
          const canonicalUrl = data.data.canonicalUrl || `/communities/${encodeURIComponent(data.data.owner?.handle ?? '')}/posts/${shareId}`;
          if (router.asPath !== canonicalUrl) {
            // Use the History API to update the URL to the canonical path without triggering
            // a Next.js navigation (prevents full remounts and re-triggering the router.query effect).
            // Why this: previously we used `router.replace(..., { shallow: true })` which helps avoid
            // full navigations, but shallow has caveats when changing pages and can throw router errors
            // in some versions of Next. Using replaceState here avoids unnecessary navigation while
            // keeping canonical URL in the address bar.
            window.history.replaceState({}, '', canonicalUrl);
            lastOpenedWithPushRef.current = false;
          }
        } else if (type === 'status') {
          const canonicalUrl = data.data.canonicalUrl || `/${encodeURIComponent(data.data.owner?.handle ?? '')}/posts/${shareId}`;
          if (router.asPath !== canonicalUrl) {
            window.history.replaceState({}, '', canonicalUrl);
            lastOpenedWithPushRef.current = false;
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
  const openModal = useCallback((post: Status, type: 'status' | 'community_post') => {
    setModalState({
      isOpen: true,
      post,
      type,
      isLoading: false,
    });

    // Update URL without triggering a Next.js navigation. We use pushState so that the
    // browser back button will close the modal (popstate), and we track that we used push
    // so closeModal can call history.back() instead of doing a replace.
    const shareUrl = type === 'community_post' ? `/cp/${post.shareId}` : `/p/${post.shareId}`;
    try {
      window.history.pushState({}, '', shareUrl);
      lastOpenedWithPushRef.current = true;
    } catch (err) {
      // Fallback to router.replace if History API fails for some reason
      console.warn('History pushState failed, falling back to router.replace', err);
      router.replace(shareUrl);
      lastOpenedWithPushRef.current = false;
    }
  }, [router]);

  // Close modal
  // Close modal (public API). This will either go back in history if the modal
  // was opened with pushState, or it will replace the URL to remove any post params.
  const closeModal = useCallback(() => {
    setModalState({
      isOpen: false,
      post: null,
      type: null,
      isLoading: false,
    });

    const { pathname, query } = router;
    const hasPostParams = query.post || query.p || query.cp;

    if (lastOpenedWithPushRef.current) {
      // If we opened the modal via pushState, go back in history so the browser
      // back button behavior is preserved. Ignore the next popstate to prevent
      // our popstate handler from re-closing/looping.
      ignoreNextPopstateRef.current = true;
      try {
        window.history.back();
      } catch (err) {
        // fallback: perform a replace to clear params
        const newQuery = { ...query };
        delete newQuery.post;
        delete newQuery.p;
        delete newQuery.cp;
        const newUrl = `${pathname}${Object.keys(newQuery).length ? '?' + new URLSearchParams(newQuery as any).toString() : ''}`;
        window.history.replaceState({}, '', newUrl);
      }
      lastOpenedWithPushRef.current = false;
    } else if (hasPostParams) {
      // If there were post params (user came in via a shared URL), just replace the
      // history entry to remove them without navigating.
      const newQuery = { ...query };
      delete newQuery.post;
      delete newQuery.p;
      delete newQuery.cp;
      const newUrl = `${pathname}${Object.keys(newQuery).length ? '?' + new URLSearchParams(newQuery as any).toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [router]);

  // Close modal without performing any history manipulation. Useful when responding
  // to browser back/forward events so we don't create loops by also changing history.
  const closeModalWithoutHistory = useCallback(() => {
    setModalState({
      isOpen: false,
      post: null,
      type: null,
      isLoading: false,
    });
    lastOpenedWithPushRef.current = false;
  }, []);

  // Handle browser back button
  useEffect(() => {
    const handlePopStateFromRouter = () => {
      const { post, p, cp } = router.query;
      if (!post && !p && !cp) {
        // Router-based navigation no longer has a post param — close the modal
        closeModalWithoutHistory();
      }
    };

    const handleWindowPopState = () => {
      // Ignore the next popstate if we triggered a programmatic history.back()
      if (ignoreNextPopstateRef.current) {
        ignoreNextPopstateRef.current = false;
        return;
      }

      // When user presses browser back, popstate is fired. Close the modal without
      // touching history (we're reacting to the user's action).
      closeModalWithoutHistory();
    };

    // Attach both Router and native popstate listeners so modal responds to both
    // Next.js route changes and native browser navigation (back/forward).
    router.events.on('routeChangeComplete', handlePopStateFromRouter);
    window.addEventListener('popstate', handleWindowPopState);

    return () => {
      router.events.off('routeChangeComplete', handlePopStateFromRouter);
      window.removeEventListener('popstate', handleWindowPopState);
    };
  }, [router.query, closeModalWithoutHistory, router.events]);

  return {
    ...modalState,
    openModal,
    closeModal,
    openPostByShareId,
  };
}