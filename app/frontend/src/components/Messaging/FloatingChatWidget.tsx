/**
 * FloatingChatWidget Component - Facebook Messenger-style floating chat interface
 * Provides a lightweight, accessible messaging experience that doesn't take over the screen
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Bell, Minimize2, Maximize2, Send, Plus, Search, MoreVertical } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useChatHistory } from '@/hooks/useChatHistory';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Conversation, Message } from '@/types/messaging';
import notificationService from '@/services/notificationService';

interface FloatingChatWidgetProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

const FloatingChatWidget: React.FC<FloatingChatWidgetProps> = ({
  className = '',
  position = 'bottom-right'
}) => {
  const { address, isConnected } = useAccount();
  const { walletInfo } = useWalletAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [activeTab, setActiveTab] = useState<'conversations' | 'chat'>('conversations');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [newRecipientAddress, setNewRecipientAddress] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  const { 
    conversations: hookConversations, 
    loadConversations,
    sendMessage: sendChatMessage
  } = useChatHistory();

  const { socket, isConnected: isWebSocketConnected, joinConversation, leaveConversation } = useWebSocket({
    walletAddress: walletInfo.address || '',
    autoConnect: true
  });

  // Check if mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate unread messages
  useEffect(() => {
    if (!hookConversations || !address) {
      setUnreadCount(0);
      return;
    }
    
    const total = hookConversations.reduce((sum, conv) => {
      return sum + (conv.unreadCounts?.[address] || 0);
    }, 0);
    
    setUnreadCount(total);
  }, [hookConversations, address]);

  // Load conversations on mount and when wallet connects
  useEffect(() => {
    if (address) {
      loadConversations();
    }
  }, [address, loadConversations]);

  // WebSocket message handling
  useEffect(() => {
    if (socket && isWebSocketConnected) {
      const handleNewMessage = (message: Message) => {
        setHasNewMessage(true);
        // Show browser notification if widget is closed or minimized
        if (!isOpen || isMinimized) {
          // Find the conversation for this message to determine the recipient
          const conversation = hookConversations.find(conv => conv.id === message.conversationId);
          const toAddress = conversation 
            ? conversation.participants.find(p => p !== message.fromAddress) || ''
            : '';

          notificationService.showMessageNotification({
            id: message.id,
            fromAddress: message.fromAddress,
            toAddress: toAddress,
            content: message.content,
            messageType: message.contentType,
            timestamp: message.timestamp,
            conversationId: message.conversationId
          });
        }

        setTimeout(() => setHasNewMessage(false), 3000);
      };

      const handleConversationUpdate = (updatedConversation: Conversation) => {
        // Update conversation list with new message
        // This would be handled by the useChatHistory hook
      };

      socket.on('new_message', handleNewMessage);
      socket.on('conversation_updated', handleConversationUpdate);
      
      return () => {
        socket.off('new_message', handleNewMessage);
        socket.off('conversation_updated', handleConversationUpdate);
      };
    }
  }, [socket, isWebSocketConnected, isOpen, isMinimized]);

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-right': return 'bottom-4 right-4';
      case 'bottom-left': return 'bottom-4 left-4';
      case 'top-right': return 'top-4 right-4';
      case 'top-left': return 'top-4 left-4';
      default: return 'bottom-4 right-4';
    }
  };

  const toggleChat = () => {
    if (!isOpen) {
      setIsOpen(true);
      setIsMinimized(false);
    } else {
      setIsMinimized(!isMinimized);
    }
  };

  const closeChat = () => {
    setIsOpen(false);
    setIsMinimized(false);
    setSelectedConversation(null);
    setActiveTab('conversations');
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setActiveTab('chat');
    
    // Join conversation room
    if (isWebSocketConnected && conversation.id) {
      joinConversation(conversation.id);
    }
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    setActiveTab('conversations');
    
    // Leave conversation room
    if (isWebSocketConnected && selectedConversation?.id) {
      leaveConversation(selectedConversation.id);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !selectedConversation || !address) return;
    
    try {
      await sendChatMessage({
        conversationId: selectedConversation.id,
        fromAddress: address,
        content,
        contentType: 'text',
        deliveryStatus: 'sent'
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const startNewConversation = async () => {
    if (!newRecipientAddress.trim() || !address) return;
    
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${address}`,
        },
        body: JSON.stringify({
          participants: [address, newRecipientAddress.trim()],
        }),
      });

      if (response.ok) {
        const newConversation = await response.json();
        setSelectedConversation(newConversation);
        setActiveTab('chat');
        setShowNewConversationModal(false);
        setNewRecipientAddress('');
        loadConversations(); // Refresh conversation list
      }
    } catch (error) {
      console.error('Failed to start new conversation:', error);
    }
  };

  const getOtherParticipant = (conversation: Conversation) => {
    if (!address) return 'Unknown';
    return conversation.participants.find(p => p !== address) || 'Unknown';
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isConnected) return null;

  return (
    <>
      {/* Floating Chat Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={`fixed z-50 ${getPositionClasses()} ${className}`}
          >
            <motion.button
              onClick={toggleChat}
              className={`
                relative w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 
                rounded-full shadow-lg hover:shadow-xl transition-all duration-200
                flex items-center justify-center
                ${hasNewMessage ? 'animate-pulse' : ''}
              `}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Open chat"
            >
              <MessageCircle size={24} className="text-white" />
              
              {/* Unread Badge */}
              {unreadCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </motion.div>
              )}

              {hasNewMessage && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"
                />
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className={`fixed z-50 ${getPositionClasses()}`}
            style={{ 
              width: '380px',
              height: isMinimized ? '60px' : '580px',
              maxWidth: '90vw',
              maxHeight: '80vh'
            }}
          >
            <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col h-full">
              {/* Chat Header */}
              <div className="bg-gray-800 border-b border-gray-700 p-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <MessageCircle size={16} className="text-white" />
                  </div>
                  <h3 className="font-semibold text-white">Messages</h3>
                </div>
                
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                    aria-label={isMinimized ? "Maximize chat" : "Minimize chat"}
                  >
                    {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                  </button>
                  <button
                    onClick={closeChat}
                    className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                    aria-label="Close chat"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Chat Content */}
              {!isMinimized && (
                <div className="flex-1 flex flex-col">
                  {/* Tabs */}
                  <div className="flex border-b border-gray-700">
                    <button
                      onClick={() => setActiveTab('conversations')}
                      className={`flex-1 py-3 px-4 text-center text-sm font-medium ${
                        activeTab === 'conversations'
                          ? 'text-blue-400 border-b-2 border-blue-400'
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      Conversations
                    </button>
                    <button
                      onClick={() => setActiveTab('chat')}
                      className={`flex-1 py-3 px-4 text-center text-sm font-medium ${
                        activeTab === 'chat'
                          ? 'text-blue-400 border-b-2 border-blue-400'
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                      disabled={!selectedConversation}
                    >
                      Chat
                    </button>
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 overflow-hidden">
                    {activeTab === 'conversations' ? (
                      <ConversationList 
                        conversations={hookConversations || []}
                        onSelectConversation={handleConversationSelect}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        onShowNewConversation={() => setShowNewConversationModal(true)}
                        currentUserAddress={address || ''}
                      />
                    ) : selectedConversation ? (
                      <ChatPanel 
                        conversation={selectedConversation}
                        onSendMessage={handleSendMessage}
                        onBackToList={handleBackToList}
                        currentUserAddress={address || ''}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
                        <MessageCircle size={48} className="mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No conversation selected</p>
                        <p className="text-sm text-center">Select a conversation to start chatting</p>
                        <button
                          onClick={handleBackToList}
                          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Back to Conversations
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Conversation Modal */}
      <AnimatePresence>
        {showNewConversationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 border border-gray-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                Start New Conversation
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Recipient Wallet Address or ENS
                </label>
                <input
                  type="text"
                  value={newRecipientAddress}
                  onChange={(e) => setNewRecipientAddress(e.target.value)}
                  placeholder="0x... or name.eth"
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg
                           bg-gray-700 text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowNewConversationModal(false)}
                  className="flex-1 px-4 py-2 text-gray-300 border border-gray-600 
                           rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={startNewConversation}
                  disabled={!newRecipientAddress.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Start Chat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Conversation List Component
const ConversationList: React.FC<{
  conversations: Conversation[];
  onSelectConversation: (conversation: Conversation) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onShowNewConversation: () => void;
  currentUserAddress: string;
}> = ({ conversations, onSelectConversation, searchQuery, setSearchQuery, onShowNewConversation, currentUserAddress }) => {
  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conversation => {
    const otherParticipant = conversation.participants.find(p => p !== currentUserAddress);
    const lastMessageContent = conversation.lastMessage?.content || '';
    
    return (
      otherParticipant?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lastMessageContent.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find(p => p !== currentUserAddress) || 'Unknown';
  };

  const getUnreadCount = (conversation: Conversation) => {
    return conversation.unreadCounts?.[currentUserAddress] || 0;
  };

  const formatLastMessageTime = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search and New Chat Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center space-x-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg 
                       text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={onShowNewConversation}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
            title="Start new conversation"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
            <MessageCircle size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No conversations yet</p>
            <p className="text-sm text-center mb-4">Start a new conversation to begin chatting</p>
            <button
              onClick={onShowNewConversation}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start New Chat
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filteredConversations.map((conversation) => {
              const otherParticipant = getOtherParticipant(conversation);
              const unreadCount = getUnreadCount(conversation);

              return (
                <motion.div
                  key={conversation.id}
                  whileHover={{ backgroundColor: 'rgba(55, 65, 81, 0.5)' }}
                  className="p-3 hover:bg-gray-800 cursor-pointer"
                  onClick={() => onSelectConversation(conversation)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">
                          {otherParticipant.slice(0, 2).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-white truncate">
                          {truncateAddress(otherParticipant)}
                        </p>
                        {conversation.lastMessage && (
                          <span className="text-xs text-gray-400">
                            {formatLastMessageTime(new Date(conversation.lastMessage.timestamp))}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-gray-400 truncate">
                          {conversation.lastMessage?.content || 'No messages yet'}
                        </p>
                        {unreadCount > 0 && (
                          <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Chat Panel Component
const ChatPanel: React.FC<{
  conversation: Conversation;
  onSendMessage: (content: string) => void;
  onBackToList: () => void;
  currentUserAddress: string;
}> = ({ conversation, onSendMessage, onBackToList, currentUserAddress }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const { messages: hookMessages, loadMessages } = useChatHistory();

  // Load messages when conversation changes
  useEffect(() => {
    if (conversation.id) {
      loadMessages({ conversationId: conversation.id });
    }
  }, [conversation.id, loadMessages]);

  // Update messages when hookMessages changes
  useEffect(() => {
    setMessages(hookMessages);
    setLoading(false);
  }, [hookMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    onSendMessage(newMessage);
    setNewMessage('');
  };

  const getOtherParticipant = () => {
    return conversation.participants.find(p => p !== currentUserAddress) || 'Unknown';
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-3 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToList}
            className="p-1.5 text-gray-300 hover:bg-gray-700 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {getOtherParticipant().slice(0, 2).toUpperCase()}
            </span>
          </div>

          <div className="flex-1">
            <h3 className="font-medium text-white">
              {truncateAddress(getOtherParticipant())}
            </h3>
            <p className="text-xs text-gray-400">Online</p>
          </div>

          <button className="p-1.5 text-gray-300 hover:bg-gray-700 rounded-lg">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageCircle size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No messages yet</p>
            <p className="text-sm text-center">Send a message to start the conversation</p>
          </div>
        ) : (
          [...messages].reverse().map((message) => (
            <div 
              key={message.id} 
              className={`flex ${message.fromAddress === currentUserAddress ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                message.fromAddress === currentUserAddress 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-gray-700 text-white rounded-bl-none'
              }`}>
                <p className="text-sm">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-3 border-t border-gray-700">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-white transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FloatingChatWidget;