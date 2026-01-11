import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Reply,
  Edit3,
  Trash2,
  Pin,
  PinOff,
  Copy,
  Forward,
  Smile,
  MoreHorizontal
} from 'lucide-react';
import { unifiedMessagingService } from '@/services/unifiedMessagingService';
import { EmojiPicker } from './EmojiPicker';
import { QuickReactionBar } from './MessageReactions';

interface MessageContextMenuProps {
  messageId: string;
  conversationId: string;
  currentUserAddress: string;
  senderAddress: string;
  content: string;
  isPinned?: boolean;
  canEdit?: boolean; // Usually determined by time window (15 min)
  canDelete?: boolean;
  canPin?: boolean; // Determined by role
  position: { x: number; y: number };
  onClose: () => void;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPinToggle?: (isPinned: boolean) => void;
  onReactionAdd?: (emoji: string) => void;
  onForward?: () => void;
  className?: string;
}

export const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  messageId,
  conversationId,
  currentUserAddress,
  senderAddress,
  content,
  isPinned = false,
  canEdit = true,
  canDelete = true,
  canPin = true,
  position,
  onClose,
  onReply,
  onEdit,
  onDelete,
  onPinToggle,
  onReactionAdd,
  onForward,
  className = ''
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState(position);

  const isOwn = senderAddress.toLowerCase() === currentUserAddress.toLowerCase();

  // Adjust position if menu would overflow viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = position.x;
      let adjustedY = position.y;

      if (position.x + rect.width > viewportWidth - 10) {
        adjustedX = viewportWidth - rect.width - 10;
      }
      if (position.y + rect.height > viewportHeight - 10) {
        adjustedY = position.y - rect.height;
      }

      setMenuPosition({ x: adjustedX, y: adjustedY });
    }
  }, [position]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      onClose();
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [content, onClose]);

  const handlePinToggle = useCallback(async () => {
    setIsProcessing('pin');
    try {
      if (isPinned) {
        await unifiedMessagingService.unpinMessage(messageId);
      } else {
        await unifiedMessagingService.pinMessage(messageId);
      }
      onPinToggle?.(!isPinned);
      onClose();
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    } finally {
      setIsProcessing(null);
    }
  }, [messageId, isPinned, onPinToggle, onClose]);

  const handleDelete = useCallback(async () => {
    setIsProcessing('delete');
    try {
      await unifiedMessagingService.deleteMessage(messageId, conversationId);
      onDelete?.();
      onClose();
    } catch (err) {
      console.error('Failed to delete message:', err);
    } finally {
      setIsProcessing(null);
    }
  }, [messageId, conversationId, onDelete, onClose]);

  const handleReactionSelect = useCallback((emoji: string) => {
    if (emoji === 'more') {
      setShowEmojiPicker(true);
    } else {
      unifiedMessagingService.addReaction(messageId, emoji);
      onReactionAdd?.(emoji);
      onClose();
    }
  }, [messageId, onReactionAdd, onClose]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    unifiedMessagingService.addReaction(messageId, emoji);
    onReactionAdd?.(emoji);
    setShowEmojiPicker(false);
    onClose();
  }, [messageId, onReactionAdd, onClose]);

  const menuItems = [
    {
      id: 'reply',
      label: 'Reply',
      icon: Reply,
      onClick: () => { onReply?.(); onClose(); },
      show: true
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: Edit3,
      onClick: () => { onEdit?.(); onClose(); },
      show: isOwn && canEdit
    },
    {
      id: 'pin',
      label: isPinned ? 'Unpin' : 'Pin',
      icon: isPinned ? PinOff : Pin,
      onClick: handlePinToggle,
      show: canPin,
      loading: isProcessing === 'pin'
    },
    {
      id: 'copy',
      label: 'Copy text',
      icon: Copy,
      onClick: handleCopy,
      show: true
    },
    {
      id: 'forward',
      label: 'Forward',
      icon: Forward,
      onClick: () => { onForward?.(); onClose(); },
      show: !!onForward
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      onClick: handleDelete,
      show: isOwn && canDelete,
      danger: true,
      loading: isProcessing === 'delete'
    }
  ].filter(item => item.show);

  return (
    <div
      ref={menuRef}
      className={`
        fixed z-50 bg-gray-800 rounded-lg shadow-xl border border-gray-700
        min-w-[180px] overflow-hidden
        ${className}
      `}
      style={{
        left: menuPosition.x,
        top: menuPosition.y
      }}
    >
      {/* Quick reactions */}
      <div className="p-2 border-b border-gray-700">
        <QuickReactionBar
          messageId={messageId}
          onReactionSelect={handleReactionSelect}
        />
      </div>

      {/* Emoji picker (conditional) */}
      {showEmojiPicker && (
        <div className="absolute bottom-full left-0 mb-2">
          <EmojiPicker
            onEmojiSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        </div>
      )}

      {/* Menu items */}
      <div className="py-1">
        {menuItems.map((item, index) => (
          <button
            key={item.id}
            onClick={item.onClick}
            disabled={item.loading}
            className={`
              w-full px-4 py-2 flex items-center gap-3 text-sm text-left
              transition-colors
              ${item.danger
                ? 'text-red-400 hover:bg-red-500/20'
                : 'text-gray-200 hover:bg-gray-700'
              }
              ${item.loading ? 'opacity-50 cursor-wait' : ''}
            `}
          >
            {item.loading ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
            ) : (
              <item.icon size={16} />
            )}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// Hook for managing context menu state
export function useMessageContextMenu() {
  const [contextMenu, setContextMenu] = useState<{
    messageId: string;
    conversationId: string;
    senderAddress: string;
    content: string;
    isPinned: boolean;
    position: { x: number; y: number };
  } | null>(null);

  const openContextMenu = useCallback((
    event: React.MouseEvent,
    data: {
      messageId: string;
      conversationId: string;
      senderAddress: string;
      content: string;
      isPinned?: boolean;
    }
  ) => {
    event.preventDefault();
    setContextMenu({
      ...data,
      isPinned: data.isPinned ?? false,
      position: { x: event.clientX, y: event.clientY }
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  return {
    contextMenu,
    openContextMenu,
    closeContextMenu
  };
}

// Floating action button for mobile
interface MessageActionsButtonProps {
  onClick: () => void;
  className?: string;
}

export const MessageActionsButton: React.FC<MessageActionsButtonProps> = ({
  onClick,
  className = ''
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        p-1 text-gray-400 hover:text-gray-200 rounded-full
        hover:bg-gray-600/50 transition-colors
        ${className}
      `}
    >
      <MoreHorizontal size={16} />
    </button>
  );
};
