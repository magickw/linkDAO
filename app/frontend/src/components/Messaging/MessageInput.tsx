import React, { useRef, useEffect, useState } from 'react';
import { Send, Smile, Paperclip, X, Mic } from 'lucide-react';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { EmojiPicker } from './EmojiPicker';
import { QuickReplyPanel } from './QuickReplyPanel';
import { VoiceMessageRecorder } from './VoiceMessageRecorder';

interface MessageInputProps {
  newMessage: string;
  setNewMessage: (msg: string) => void;
  handleSendMessage: () => void;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setShowAttachmentModal: (show: boolean) => void;
  replyingTo: { messageId: string; username: string; content: string } | null;
  quotingTo: { messageId: string; username: string; content: string } | null;
  setReplyingTo: (val: any) => void;
  setQuotingTo: (val: any) => void;
  handleTyping?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  newMessage,
  setNewMessage,
  handleSendMessage,
  handleKeyPress,
  isUploading,
  fileInputRef,
  handleFileUpload,
  setShowAttachmentModal,
  replyingTo,
  quotingTo,
  setReplyingTo,
  setQuotingTo,
  handleTyping
}) => {
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const { touchTargetClasses } = useMobileOptimization();
  
  // State for advanced features
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    if (messageInputRef.current) {
      messageInputRef.current.style.height = 'auto';
      messageInputRef.current.style.height = `${Math.min(messageInputRef.current.scrollHeight, 200)}px`;
    }
  }, [newMessage]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    if (handleTyping) handleTyping();
  };

  const handleEmojiSelect = (emoji: any) => {
    setNewMessage(prev => prev + emoji.native);
    setShowEmojiPicker(false);
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };

  const handleQuickReplySelect = (reply: string) => {
    setNewMessage(reply);
    setShowQuickReplies(false);
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };

  const handleVoiceMessage = (audioBlob: Blob) => {
    // In a real implementation, this would upload the blob similarly to a file attachment
    // For now, we'll construct a synthetic file event or call a prop to handle voice
    // This assumes the parent component or file upload handler can handle blobs or we extend the interface
    const file = new File([audioBlob], "voice-message.webm", { type: "audio/webm" });
    
    // Create a synthetic event to reuse the file upload handler
    // Ideally, we would update the interface to accept a direct file/blob
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    
    const syntheticEvent = {
      target: {
        files: dataTransfer.files
      }
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    handleFileUpload(syntheticEvent);
    setIsRecording(false);
  };

  return (
    <div className="flex flex-col border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {/* Quick Replies Panel - Show when requested */}
      {showQuickReplies && (
        <QuickReplyPanel onSelect={handleQuickReplySelect} onClose={() => setShowQuickReplies(false)} />
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 right-4 z-50">
          <EmojiPicker onSelect={handleEmojiSelect} onClickOutside={() => setShowEmojiPicker(false)} />
        </div>
      )}

      <div className="p-4">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Reply/Quote Preview Banner */}
        {(replyingTo || quotingTo) && (
          <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-between border-l-4 border-blue-500">
            <div className="flex flex-col text-sm overflow-hidden">
              <span className="font-semibold text-blue-500 dark:text-blue-400">
                {replyingTo ? `Replying to ${replyingTo.username}` : `Quoting ${quotingTo?.username}`}
              </span>
              <span className="text-gray-600 dark:text-gray-300 truncate">
                {replyingTo ? replyingTo.content : quotingTo?.content}
              </span>
            </div>
            <button
              onClick={() => {
                setReplyingTo(null);
                setQuotingTo(null);
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex items-end space-x-2">
          <button
            className={`p-3 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 ${touchTargetClasses}`}
            onClick={() => setShowAttachmentModal(true)}
            disabled={isUploading}
            title="Attach file"
          >
            <Paperclip size={20} />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={messageInputRef}
              value={newMessage}
              onChange={handleChange}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-[200px]"
              rows={1}
            />
            <button 
              className="absolute right-3 bottom-3 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Add emoji"
            >
              <Smile size={20} />
            </button>
          </div>

          {/* Show Voice Recorder if input is empty, otherwise Send button */}
          {!newMessage.trim() && !isRecording ? (
            <div className="relative">
               {/* Just a trigger for voice recording, the actual component might need to be rendered conditionally or overlay */}
               <button
                className={`p-3 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 ${touchTargetClasses}`}
                onClick={() => setIsRecording(true)}
                title="Record voice message"
              >
                <Mic size={20} />
              </button>
              
              {isRecording && (
                <div className="absolute bottom-0 right-0 z-50">
                  <VoiceMessageRecorder 
                    onRecordingComplete={handleVoiceMessage}
                    onCancel={() => setIsRecording(false)}
                  />
                </div>
              )}
            </div>
          ) : (
            <button
              className={`p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-transform active:scale-95 ${touchTargetClasses}`}
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
            >
              <Send size={20} />
            </button>
          )}
        </div>
        
        {/* Quick actions bar */}
        <div className="flex mt-2 px-1">
          <button 
            className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 font-medium"
            onClick={() => setShowQuickReplies(!showQuickReplies)}
          >
            Quick Replies
          </button>
        </div>
      </div>
    </div>
  );
};