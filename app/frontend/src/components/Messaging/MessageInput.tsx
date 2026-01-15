import React, { useState, useRef, useCallback } from 'react';
import { EmojiPicker } from './EmojiPicker';
import { QuickReplyPanel } from './QuickReplyPanel';
import { VoiceMessageRecorder } from './VoiceMessageRecorder';
import { Mic } from 'lucide-react';

// Helper function to get the backend URL
const getBackendUrl = (): string => {
  let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'www.linkdao.io' || hostname === 'linkdao.io' || hostname === 'app.linkdao.io') {
      backendUrl = 'https://api.linkdao.io';
    }
  }
  return backendUrl;
};

interface Attachment {
  id: string;
  type: string;
  mimeType: string;
  filename: string;
  size: number;
  url: string;
  cid: string;
}

interface MessageInputProps {
  onSendMessage: (content: string, contentType?: 'text' | 'image' | 'file' | 'voice', attachments?: Attachment[]) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder = "Type a message...",
}) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<{ file: File; preview: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle message input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
    
    // Handle typing indicators
    if (value.trim()) {
      onTyping(true);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 1000);
    } else {
      onTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }, [onTyping]);

  // Handle sending message
  const handleSendMessage = useCallback(() => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSendMessage(trimmedMessage);
      setMessage('');
      onTyping(false);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }, [message, disabled, onSendMessage, onTyping]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Handle emoji selection
  const handleEmojiSelect = useCallback((emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage = message.slice(0, start) + emoji + message.slice(end);
      
      setMessage(newMessage);
      
      // Set cursor position after emoji
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    }
    
    setShowEmojiPicker(false);
  }, [message]);

  // Handle quick reply selection
  const handleQuickReplySelect = useCallback((content: string) => {
    setMessage(content);
    setShowQuickReplies(false);
    
    // Focus textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview for images
    if (file.type.startsWith('image/')) {
      const preview = URL.createObjectURL(file);
      setAttachmentPreview({ file, preview });
      return;
    }

    setIsUploading(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload file to messaging attachments endpoint
      const response = await fetch(`${getBackendUrl()}/api/messaging/attachments`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const attachment = result.data as Attachment;
          const contentType = file.type.startsWith('image/') ? 'image' : 'file';
          onSendMessage(attachment.filename, contentType, [attachment]);
        } else {
          console.error('File upload failed:', result.message);
        }
      } else {
        console.error('File upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onSendMessage]);

  // Handle sending image with optional caption
  const handleSendImageWithCaption = useCallback(async () => {
    if (!attachmentPreview) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', attachmentPreview.file);

      const response = await fetch(`${getBackendUrl()}/api/messaging/attachments`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const attachment = result.data as Attachment;
          const caption = message.trim() || attachment.filename;
          onSendMessage(caption, 'image', [attachment]);
          setMessage('');
        }
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setIsUploading(false);
      // Clean up preview
      URL.revokeObjectURL(attachmentPreview.preview);
      setAttachmentPreview(null);
    }
  }, [attachmentPreview, message, onSendMessage]);

  // Handle canceling attachment preview
  const handleCancelAttachment = useCallback(() => {
    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview.preview);
      setAttachmentPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [attachmentPreview]);

  // Handle voice message recording complete
  const handleVoiceRecordingComplete = useCallback(async (audioBlob: Blob) => {
    setIsUploading(true);
    setShowVoiceRecorder(false);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice_message.webm');

      const response = await fetch('/api/messaging/voice-messages', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const voiceMessage = result.data as Attachment;
          onSendMessage('Voice message', 'voice', [voiceMessage]);
        }
      }
    } catch (error) {
      console.error('Error uploading voice message:', error);
    } finally {
      setIsUploading(false);
    }
  }, [onSendMessage]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (attachmentPreview) {
        URL.revokeObjectURL(attachmentPreview.preview);
      }
    };
  }, [attachmentPreview]);

  // Show voice recorder
  if (showVoiceRecorder) {
    return (
      <div className="message-input p-4">
        <VoiceMessageRecorder
          onSend={handleVoiceRecordingComplete}
          onCancel={() => setShowVoiceRecorder(false)}
        />
      </div>
    );
  }

  return (
    <div className="message-input">
      {/* Attachment Preview */}
      {attachmentPreview && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative inline-block">
            <img
              src={attachmentPreview.preview}
              alt="Preview"
              className="max-h-48 rounded-lg"
            />
            <button
              onClick={handleCancelAttachment}
              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full
                       hover:bg-red-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-2 flex items-center space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a caption..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            <button
              onClick={handleSendImageWithCaption}
              disabled={isUploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {/* Quick Reply Panel */}
      {showQuickReplies && (
        <QuickReplyPanel
          onSelectReply={handleQuickReplySelect}
          className="border-b border-gray-200 dark:border-gray-700"
        />
      )}

      <div className="p-4">
        <div className="flex items-end space-x-2">
          {/* Quick Replies Toggle */}
          <button
            onClick={() => setShowQuickReplies(!showQuickReplies)}
            disabled={disabled}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
                     hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
            title="Quick replies"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </button>

          {/* File Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
                     hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
            title="Attach file"
          >
            {isUploading ? (
              <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </button>

          {/* Voice Message Button */}
          <button
            onClick={() => setShowVoiceRecorder(true)}
            disabled={disabled || isUploading}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
                     hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
            title="Voice message"
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Message Input Container */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className="w-full px-4 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-2xl
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       disabled:opacity-50 disabled:cursor-not-allowed
                       resize-none overflow-hidden"
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />

            {/* Emoji Button */}
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={disabled}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1
                       text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
                       hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
              title="Add emoji"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-2">
                <EmojiPicker
                  onEmojiSelect={handleEmojiSelect}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={disabled || !message.trim() || isUploading}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Send message"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>

        {/* Hidden File Input - expanded to support more file types */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,video/*"
          className="hidden"
        />
      </div>
    </div>
  );
};