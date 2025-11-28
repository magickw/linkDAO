import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  description: string;
  category: string;
  modifiers?: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
  };
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  { key: 'j', description: 'Scroll down / Next post', category: 'Navigation' },
  { key: 'k', description: 'Scroll up / Previous post', category: 'Navigation' },
  { key: 'ArrowDown', description: 'Scroll down', category: 'Navigation' },
  { key: 'ArrowUp', description: 'Scroll up', category: 'Navigation' },
  { key: 'g', description: 'Go to top', category: 'Navigation', modifiers: { shift: true } },
  { key: 'G', description: 'Go to bottom', category: 'Navigation', modifiers: { shift: true } },
  
  // Actions
  { key: 'x', description: 'Expand/Collapse post', category: 'Actions' },
  { key: 'c', description: 'Create new post', category: 'Actions' },
  { key: 'r', description: 'Refresh feed', category: 'Actions' },
  { key: 's', description: 'Search', category: 'Actions', modifiers: { ctrl: true } },
  { key: '/', description: 'Focus search', category: 'Actions' },
  
  // Voting
  { key: 'u', description: 'Upvote post', category: 'Voting' },
  { key: 'd', description: 'Downvote post', category: 'Voting' },
  { key: 'v', description: 'Open vote modal', category: 'Voting' },
  
  // Other
  { key: '?', description: 'Show keyboard shortcuts', category: 'Other' },
  { key: 'Escape', description: 'Close modal / Clear selection', category: 'Other' }
];

interface UseKeyboardShortcutsOptions {
  onScrollDown?: () => void;
  onScrollUp?: () => void;
  onGoToTop?: () => void;
  onGoToBottom?: () => void;
  onExpandCollapse?: () => void;
  onCreatePost?: () => void;
  onRefresh?: () => void;
  onSearch?: () => void;
  onFocusSearch?: () => void;
  onUpvote?: () => void;
  onDownvote?: () => void;
  onOpenVoteModal?: () => void;
  onShowHelp?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export const useKeyboardShortcuts = (options: UseKeyboardShortcutsOptions) => {
  const {
    onScrollDown,
    onScrollUp,
    onGoToTop,
    onGoToBottom,
    onExpandCollapse,
    onCreatePost,
    onRefresh,
    onSearch,
    onFocusSearch,
    onUpvote,
    onDownvote,
    onOpenVoteModal,
    onShowHelp,
    onEscape,
    enabled = true
  } = options;

  const scrollStepRef = useRef(150);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const { key, ctrlKey, shiftKey, altKey, metaKey } = event;

    // Allow standard clipboard and browser shortcuts to work normally
    if ((ctrlKey || metaKey) && ['c', 'v', 'x', 'a', 'z', 'y'].includes(key.toLowerCase())) {
      return; // Let the browser handle copy, paste, cut, select all, undo, redo
    }

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow Escape to work in inputs
      if (key === 'Escape' && onEscape) {
        onEscape();
      }
      // Don't process other shortcuts when typing in inputs/textareas
      return;
    }

    // Navigation shortcuts
    if (key === 'j' || key === 'ArrowDown') {
      event.preventDefault();
      if (onScrollDown) {
        onScrollDown();
      } else {
        window.scrollBy({ top: scrollStepRef.current, behavior: 'smooth' });
      }
    } else if (key === 'k' || key === 'ArrowUp') {
      event.preventDefault();
      if (onScrollUp) {
        onScrollUp();
      } else {
        window.scrollBy({ top: -scrollStepRef.current, behavior: 'smooth' });
      }
    } else if (key === 'g' && shiftKey) {
      event.preventDefault();
      if (onGoToTop) {
        onGoToTop();
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (key === 'G' && shiftKey) {
      event.preventDefault();
      if (onGoToBottom) {
        onGoToBottom();
      } else {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
    }
    
    // Action shortcuts
    else if (key === 'x') {
      event.preventDefault();
      onExpandCollapse?.();
    } else if (key === 'c') {
      event.preventDefault();
      onCreatePost?.();
    } else if (key === 'r') {
      event.preventDefault();
      onRefresh?.();
    } else if (key === 's' && (ctrlKey || metaKey)) {
      event.preventDefault();
      onSearch?.();
    } else if (key === '/') {
      event.preventDefault();
      onFocusSearch?.();
    }
    
    // Voting shortcuts
    else if (key === 'u') {
      event.preventDefault();
      onUpvote?.();
    } else if (key === 'd') {
      event.preventDefault();
      onDownvote?.();
    } else if (key === 'v') {
      event.preventDefault();
      onOpenVoteModal?.();
    }
    
    // Other shortcuts
    else if (key === '?' && shiftKey) {
      event.preventDefault();
      onShowHelp?.();
    } else if (key === 'Escape') {
      event.preventDefault();
      onEscape?.();
    }
  }, [
    enabled,
    onScrollDown,
    onScrollUp,
    onGoToTop,
    onGoToBottom,
    onExpandCollapse,
    onCreatePost,
    onRefresh,
    onSearch,
    onFocusSearch,
    onUpvote,
    onDownvote,
    onOpenVoteModal,
    onShowHelp,
    onEscape
  ]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [enabled, handleKeyPress]);
};
