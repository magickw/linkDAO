import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { Message } from '@/types/messaging';
import { unifiedMessagingService } from '@/services/unifiedMessagingService';

interface MessageEditModalProps {
  message: Message;
  conversationId: string;
  onClose: () => void;
  onSave: (messageId: string, newContent: string) => void;
  className?: string;
}

export const MessageEditModal: React.FC<MessageEditModalProps> = ({
  message,
  conversationId,
  onClose,
  onSave,
  className = ''
}) => {
  const [content, setContent] = useState(message.content);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Calculate time remaining for editing (15 minute window)
  useEffect(() => {
    const messageTime = new Date(message.timestamp).getTime();
    const now = Date.now();
    const editWindowMs = 15 * 60 * 1000; // 15 minutes
    const remaining = editWindowMs - (now - messageTime);

    if (remaining <= 0) {
      setError('Edit window has expired (15 minutes)');
      setTimeRemaining(0);
    } else {
      setTimeRemaining(Math.floor(remaining / 1000));

      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            setError('Edit window has expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [message.timestamp]);

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(content.length, content.length);
    }
  }, []);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
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

  const formatTimeRemaining = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSave = useCallback(async () => {
    if (!content.trim() || content === message.content || isSaving || timeRemaining === 0) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await unifiedMessagingService.editMessage(message.id, conversationId, content.trim());
      onSave(message.id, content.trim());
      onClose();
    } catch (err) {
      console.error('Failed to edit message:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [content, message, isSaving, timeRemaining, onSave, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  }, [handleSave]);

  const hasChanges = content.trim() !== message.content;
  const canSave = hasChanges && content.trim().length > 0 && timeRemaining !== 0 && !isSaving;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={modalRef}
        className={`bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">Edit Message</h3>
          <div className="flex items-center gap-3">
            {timeRemaining !== null && timeRemaining > 0 && (
              <span className={`text-sm ${
                timeRemaining < 60 ? 'text-red-400' : 'text-gray-400'
              }`}>
                {formatTimeRemaining(timeRemaining)} remaining
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Original message preview */}
          <div className="mb-3">
            <label className="block text-xs text-gray-500 mb-1">Original message</label>
            <p className="text-sm text-gray-400 p-2 bg-gray-900 rounded border border-gray-700 line-clamp-2">
              {message.content}
            </p>
          </div>

          {/* Edit textarea */}
          <div className="mb-3">
            <label className="block text-xs text-gray-500 mb-1">Edit message</label>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={timeRemaining === 0 || isSaving}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg
                       text-white placeholder-gray-500 resize-none
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       disabled:opacity-50 disabled:cursor-not-allowed"
              rows={4}
              placeholder="Enter your message..."
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm mb-3">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Help text */}
          <p className="text-xs text-gray-500">
            Press Cmd/Ctrl + Enter to save. Messages can only be edited within 15 minutes of sending.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white
                     hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Check size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Inline edit component for quick editing directly in the message bubble
interface InlineMessageEditProps {
  message: Message;
  conversationId: string;
  onSave: (content: string) => void;
  onCancel: () => void;
  className?: string;
}

export const InlineMessageEdit: React.FC<InlineMessageEditProps> = ({
  message,
  conversationId,
  onSave,
  onCancel,
  className = ''
}) => {
  const [content, setContent] = useState(message.content);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(content.length, content.length);
    }
  }, []);

  const handleSave = async () => {
    if (!content.trim() || content === message.content || isSaving) {
      onCancel();
      return;
    }

    setIsSaving(true);
    try {
      await unifiedMessagingService.editMessage(message.id, conversationId, content.trim());
      onSave(content.trim());
    } catch (err) {
      console.error('Failed to edit message:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <textarea
        ref={inputRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg
                 text-white text-sm resize-none
                 focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={2}
      />
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-500">
          Enter to save, Esc to cancel
        </span>
        <div className="flex-1" />
        <button
          onClick={onCancel}
          className="px-2 py-1 text-gray-400 hover:text-white"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || !content.trim() || content === message.content}
          className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
};
