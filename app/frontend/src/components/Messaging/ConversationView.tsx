import React, { useState, useEffect, useRef } from 'react';
import { Conversation, Message } from '../../types/messaging';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { useWebSocket } from '../../hooks/useWebSocket';

interface ConversationViewProps {
  conversation: Conversation;
  currentUserAddress: string;
  onBackToList: () => void;
  showBackButton: boolean;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  conversation,
  currentUserAddress,
  onBackToList,
  showBackButton,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  const { socket, isConnected } = useWebSocket();

  // Load messages when conversation changes
  useEffect(() => {
    if (conversation.id) {
      loadMessages();
      markAsRead();
    }
  }, [conversation.id]);

  // WebSocket event handlers
  useEffect(() => {
    if (socket && isConnected && conversation.id) {
      // Join conversation room
      socket.emit('join_conversation', conversation.id);

      // Listen for new messages
      socket.on('new_message', handleNewMessage);
      socket.on('typing_start', handleTypingStart);
      socket.on('typing_stop', handleTypingStop);
      socket.on('message_delivered', handleMessageDelivered);
      socket.on('message_read', handleMessageRead);

      return () => {
        socket.emit('leave_conversation', conversation.id);
        socket.off('new_message', handleNewMessage);
        socket.off('typing_start', handleTypingStart);
        socket.off('typing_stop', handleTypingStop);
        socket.off('message_delivered', handleMessageDelivered);
        socket.off('message_read', handleMessageRead);
      };
    }
  }, [socket, isConnected, conversation.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/conversations/${conversation.id}/messages`, {
        headers: {
          'Authorization': `Bearer ${currentUserAddress}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await fetch(`/api/conversations/${conversation.id}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentUserAddress}`,
        },
      });
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleNewMessage = (message: Message) => {
    if (message.conversationId === conversation.id) {
      setMessages(prev => [...prev, message]);
      
      // Mark as read if message is from another user
      if (message.fromAddress !== currentUserAddress) {
        markAsRead();
      }
    }
  };

  const handleTypingStart = (data: { userId: string, conversationId: string }) => {
    if (data.conversationId === conversation.id && data.userId !== currentUserAddress) {
      setTypingUsers(prev => [...prev.filter(u => u !== data.userId), data.userId]);
    }
  };

  const handleTypingStop = (data: { userId: string, conversationId: string }) => {
    if (data.conversationId === conversation.id) {
      setTypingUsers(prev => prev.filter(u => u !== data.userId));
    }
  };

  const handleMessageDelivered = (data: { messageId: string, status: string }) => {
    setMessages(prev => prev.map(msg => 
      msg.id === data.messageId 
        ? { ...msg, deliveryStatus: data.status as any }
        : msg
    ));
  };

  const handleMessageRead = (data: { messageId: string, status: string }) => {
    setMessages(prev => prev.map(msg => 
      msg.id === data.messageId 
        ? { ...msg, deliveryStatus: data.status as any }
        : msg
    ));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content: string, contentType: 'text' | 'image' | 'file' = 'text') => {
    try {
      const response = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUserAddress}`,
        },
        body: JSON.stringify({
          content,
          contentType,
        }),
      });

      if (response.ok) {
        const newMessage = await response.json();
        // Message will be added via WebSocket event
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (socket && isConnected) {
      if (isTyping) {
        socket.emit('typing_start', { 
          conversationId: conversation.id, 
          userId: currentUserAddress 
        });
      } else {
        socket.emit('typing_stop', { 
          conversationId: conversation.id, 
          userId: currentUserAddress 
        });
      }
    }
  };

  const getOtherParticipant = () => {
    return conversation.participants.find(p => p !== currentUserAddress) || 'Unknown';
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="conversation-view h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center space-x-3">
          {showBackButton && (
            <button
              onClick={onBackToList}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Participant Avatar */}
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
            {getOtherParticipant().slice(2, 4).toUpperCase()}
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {truncateAddress(getOtherParticipant())}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              {conversation.isEncrypted && (
                <>
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-green-600 dark:text-green-400">End-to-end encrypted</span>
                </>
              )}
              {!isConnected && (
                <span className="text-yellow-600 dark:text-yellow-400">Offline</span>
              )}
            </div>
          </div>

          {/* Options Menu */}
          <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">👋</div>
              <p>Start the conversation!</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.fromAddress === currentUserAddress}
                showAvatar={
                  index === 0 || 
                  messages[index - 1].fromAddress !== message.fromAddress
                }
                showTimestamp={
                  index === messages.length - 1 ||
                  messages[index + 1].fromAddress !== message.fromAddress ||
                  new Date(messages[index + 1].timestamp).getTime() - new Date(message.timestamp).getTime() > 300000 // 5 minutes
                }
              />
            ))}
            
            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <TypingIndicator users={typingUsers} />
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <MessageInput
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          disabled={!isConnected}
          placeholder={isConnected ? "Type a message..." : "Connecting..."}
        />
      </div>
    </div>
  );
};